/**
 * School Website Finder — uses OpenClaw web_search tool via child_process
 * Since we can't call OpenClaw tools directly from scripts, this uses
 * a different approach: direct Google Custom Search via fetch
 *
 * Actually: uses the already-working DuckDuckGo but with smarter query construction
 * Run: npx tsx prisma/find-websites-gemini-tool.ts [batchSize]
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const BLOCKED_DOMAINS = [
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "youtube.com",
  "yelp.com",
  "greatschools.org",
  "niche.com",
  "schooldigger.com",
  "publicschoolreview.com",
  "usnews.com",
  "wikipedia.org",
  "linkedin.com",
  "nces.ed.gov",
  "fldoe.org",
  "ratemyteachers.com",
  "google.com",
  "maps.google.com",
  "bing.com",
  "duckduckgo.com",
  "reddit.com",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkUrlReachable(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    return resp.ok || resp.status === 405;
  } catch {
    return false;
  }
}

async function searchDuckDuckGo(query: string): Promise<string | null> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    const urlRegex = /href="\/\/duckduckgo\.com\/l\/\?([^"]+)"/g;
    const urls: { url: string; score: number }[] = [];
    let match;

    while ((match = urlRegex.exec(html)) !== null) {
      const params = new URLSearchParams(match[1]);
      const uddg = params.get("uddg");
      if (!uddg) continue;
      try {
        const decoded = decodeURIComponent(uddg);
        const parsed = new URL(decoded);
        const domain = parsed.hostname.replace(/^www\./, "");
        if (BLOCKED_DOMAINS.some((b) => domain.includes(b))) continue;

        let score = 0;
        if (domain.endsWith(".edu")) score += 10;
        if (domain.includes("k12.fl.us")) score += 15;
        if (domain.includes("dadeschools")) score += 12;
        if (domain.includes("browardschools")) score += 12;
        if (domain.includes("palmbeachschools")) score += 12;
        if (domain.includes("ocps.net")) score += 12;
        if (domain.includes("hillsboroughschools")) score += 12;
        if (domain.includes("school")) score += 5;
        if (domain.includes("academy")) score += 3;

        urls.push({ url: decoded, score });
      } catch {}
    }

    if (urls.length === 0) return null;
    urls.sort((a, b) => b.score - a.score);
    return urls[0].url;
  } catch {
    return null;
  }
}

async function findSchoolWebsite(
  schoolName: string,
  city: string,
  county: string
): Promise<string | null> {
  // Strategy 1: Specific official site query
  const q1 = `"${schoolName}" ${city} Florida official school website -site:greatschools.org -site:niche.com`;
  let url = await searchDuckDuckGo(q1);
  if (url) return url;

  await sleep(1000);

  // Strategy 2: County district pattern query
  const q2 = `${schoolName} ${county} county Florida school`;
  url = await searchDuckDuckGo(q2);
  if (url) return url;

  return null;
}

async function main() {
  const BATCH_ARG = process.argv[2] ?? "80";
  const limit = parseInt(BATCH_ARG, 10);

  const schools = await p.school.findMany({
    where: {
      website: null,
      studentCount: { gte: 50 },
      NOT: [
        { name: { contains: "VIRTUAL" } },
        { name: { contains: "HOSPITAL" } },
        { name: { contains: "HOMEBOUND" } },
        { name: { contains: "JAIL" } },
        { name: { contains: "CONTRACTED" } },
        { name: { contains: "HEAD START" } },
        { name: { contains: "FRANCHISE" } },
        { name: { contains: "DEPT OF JUVENILE" } },
      ],
    },
    select: { id: true, name: true, city: true, county: true },
    take: limit,
    orderBy: { studentCount: "desc" },
  });

  const total = await p.school.count({ where: { website: null } });
  console.log(`🔍 Schools without websites: ${total}`);
  console.log(`📋 Processing ${schools.length} schools this run\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];
    const name = school.name as string;
    const city = (school.city as string) ?? "Florida";
    const county = (school.county as string) ?? "";

    process.stdout.write(`[${i + 1}/${schools.length}] ${name} (${city})... `);

    const website = await findSchoolWebsite(name, city, county);

    if (website) {
      const reachable = await checkUrlReachable(website);
      if (reachable) {
        await p.school.update({
          where: { id: school.id },
          data: { website },
        });
        console.log(`✅ ${website}`);
        found++;
      } else {
        console.log(`⚠️  Unreachable: ${website}`);
        notFound++;
      }
    } else {
      console.log(`❌ Not found`);
      notFound++;
    }

    await sleep(2000); // 2s between requests
  }

  const newTotal = await p.school.count({ where: { website: { not: null } } });
  const allTotal = await p.school.count();

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Found: ${found}`);
  console.log(`   ❌ Not found: ${notFound}`);
  console.log(
    `   📋 Total coverage: ${newTotal}/${allTotal} (${Math.round((newTotal / allTotal) * 100)}%)`
  );
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
