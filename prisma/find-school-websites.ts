/**
 * School Website Finder
 * Uses DuckDuckGo HTML search (free, no API key) to find school websites
 * Processes schools in batches with rate limiting
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import * as urllib from "url";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Domains that are NOT school websites
const BLOCKED_DOMAINS = [
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "yelp.com",
  "greatschools.org",
  "niche.com",
  "schooldigger.com",
  "publicschoolreview.com",
  "usnews.com",
  "wikipedia.org",
  "youtube.com",
  "linkedin.com",
  "nces.ed.gov",
  "fldoe.org",
  "ratemyteachers.com",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchUrl(url: string, opts: { timeout?: number } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(opts.timeout ?? 10000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function checkUrlReachable(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    return await new Promise((resolve) => {
      const req = lib.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 400);
        res.resume();
      });
      req.on("error", () => resolve(false));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function findSchoolWebsite(schoolName: string, city: string): Promise<string | null> {
  const query = encodeURIComponent(`"${schoolName}" ${city} Florida official school website`);
  const url = `https://html.duckduckgo.com/html/?q=${query}`;

  try {
    const html = await fetchUrl(url, { timeout: 12000 });

    // Extract URLs from DuckDuckGo results
    const urlRegex = /href="\/\/duckduckgo\.com\/l\/\?([^"]+)"/g;
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(html)) !== null) {
      const params = new urllib.URLSearchParams(match[1]);
      const uddg = params.get("uddg");
      if (uddg) {
        try {
          const decoded = decodeURIComponent(uddg);
          const parsed = new URL(decoded);
          const domain = parsed.hostname.replace(/^www\./, "");

          // Skip blocked domains
          if (BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked))) continue;

          // Prefer .edu, .k12.fl.us, school district domains
          urls.push(decoded);
        } catch {
          // invalid URL, skip
        }
      }
    }

    if (urls.length === 0) return null;

    // Score and pick best URL
    const scored = urls.map((u) => {
      let score = 0;
      const domain = new URL(u).hostname.toLowerCase();
      if (domain.endsWith(".edu")) score += 10;
      if (domain.includes("k12.fl.us")) score += 15;
      if (domain.includes("dadeschools")) score += 8;
      if (domain.includes("browardschools")) score += 8;
      if (domain.includes("palmbeach")) score += 8;
      if (domain.includes("ocps")) score += 8;
      if (domain.includes("sdhc")) score += 8;
      if (domain.includes("school")) score += 5;
      if (domain.includes("academy")) score += 3;
      if (domain.includes("charter")) score += 3;
      return { url: u, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].url;
  } catch {
    return null;
  }
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = prisma as any;

  const BATCH_ARG = process.argv[2] ?? "100";
  const limit = parseInt(BATCH_ARG, 10);

  // Get real K-12 schools without websites (skip virtual/alternative programs)
  const schools = await p.school.findMany({
    where: {
      website: null,
      studentCount: { gte: 100 },
      gradeRange: { not: null },
      NOT: [
        { name: { contains: "VIRTUAL" } },
        { name: { contains: "HOSPITAL" } },
        { name: { contains: "HOMEBOUND" } },
        { name: { contains: "JAIL" } },
        { name: { contains: "TECHNICAL COLLEGE" } },
        { name: { contains: "CONTRACTED" } },
        { name: { contains: "HEAD START" } },
        { name: { contains: "FRANCHISE" } },
        { name: { contains: "PROGRAM" } },
        { name: { contains: "DEPT OF JUVENILE" } },
      ],
    },
    select: { id: true, name: true, city: true, ncesId: true },
    take: limit,
    orderBy: { studentCount: "desc" },
  });

  const total = await p.school.count({ where: { website: null } });
  console.log(`🔍 Found ${total} schools without websites`);
  console.log(`📋 Processing ${schools.length} schools this run (largest first)\n`);

  let found = 0;
  let notFound = 0;
  let checked = 0;

  for (const school of schools) {
    checked++;
    const name = school.name as string;
    const city = (school.city as string) ?? "Florida";

    process.stdout.write(`[${checked}/${schools.length}] ${name} (${city})... `);

    const website = await findSchoolWebsite(name, city);

    if (website) {
      // Quick reachability check
      const reachable = await checkUrlReachable(website);
      if (reachable) {
        await p.school.update({
          where: { id: school.id },
          data: { website },
        });
        console.log(`✅ ${website}`);
        found++;
      } else {
        console.log(`⚠️  Found but unreachable: ${website}`);
        notFound++;
      }
    } else {
      console.log(`❌ Not found`);
      notFound++;
    }

    // Rate limit: 1.5s between requests to be polite
    await sleep(1500);
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Found: ${found}`);
  console.log(`   ❌ Not found: ${notFound}`);
  console.log(`   📋 Remaining: ${total - found} schools still need websites`);
  console.log(`\nRun again to process more schools.`);
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
