/**
 * Website scraper — uses web_search via Gemini (already available in main process)
 * This script uses DuckDuckGo HTML scraping + pattern matching
 * Run: npx ts-node --esm prisma/scrape-websites-batch.ts
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
  "maps.google.com",
  "zillow.com",
  "trulia.com",
  "apartments.com",
  "indeed.com",
  "glassdoor.com",
  "duckduckgo.com",
  "google.com",
  "bing.com",
  "yahoo.com",
  "amazon.com",
  "reddit.com",
];

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = urllib.parse(url);
    const lib = parsedUrl.protocol === "https:" ? https : http;
    const req = lib.get(
      { ...parsedUrl, headers: { "User-Agent": "Mozilla/5.0 (compatible; SchoolBot/1.0)" } },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          resolve(fetchUrl(res.headers.location ?? url));
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isValidSchoolUrl(url: string, schoolName: string, city: string): boolean {
  try {
    const parsed = new urllib.URL(url);
    const domain = parsed.hostname.toLowerCase();
    if (BLOCKED_DOMAINS.some((d) => domain.includes(d))) return false;
    if (!domain.includes(".")) return false;
    // Must have .org, .net, .edu, .com, .us, .k12
    if (!/\.(org|net|edu|com|us|k12\.[a-z]{2}\.us|gov)/.test(domain)) return false;
    return true;
  } catch {
    return false;
  }
}

async function searchDDG(query: string): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(query);
    const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${encoded}`);
    const urls: string[] = [];
    const re = /href="(https?:\/\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const url = m[1];
      if (!url.includes("duckduckgo.com") && !url.includes("duck.co")) {
        urls.push(url);
      }
    }
    return [...new Set(urls)].slice(0, 10);
  } catch {
    return [];
  }
}

async function findWebsite(school: {
  name: string;
  city: string;
  state: string;
}): Promise<string | null> {
  const query = `"${school.name}" ${school.city} ${school.state} official school website`;
  const urls = await searchDDG(query);
  for (const url of urls) {
    if (isValidSchoolUrl(url, school.name, school.city)) return url;
  }
  // Try simpler query
  const query2 = `${school.name} ${school.city} school site`;
  const urls2 = await searchDDG(query2);
  for (const url of urls2) {
    if (isValidSchoolUrl(url, school.name, school.city)) return url;
  }
  return null;
}

async function main() {
  const BATCH = parseInt(process.argv[2] ?? "100");
  const SKIP_PATTERNS = [
    "VIRTUAL",
    "DETENTION",
    "HOSPITAL",
    "HOMEBOUND",
    "TECHNICAL COLLEGE",
    "CORRECTIONAL",
    "ADULT",
    "DISTRICT PROVIDED",
    "FRANCHISE",
    "ACADEMY AT ",
    "SERVICE CENTER",
    "INSTRUCTIONAL CENTER",
  ];

  // Only real schools: has students, name contains school keywords
  const SCHOOL_KEYWORDS = [
    "ELEMENTARY",
    "MIDDLE",
    "HIGH SCHOOL",
    "SENIOR HIGH",
    "K-8",
    "K8",
    "PRIMARY",
    "PREP",
    "SCHOOL",
    "ACADEMY",
    "MAGNET",
  ];

  const allSchools = await prisma.school.findMany({
    where: {
      website: null,
      studentCount: { gt: 150 },
      schoolType: { in: ["PUBLIC", "PRIVATE", "CHARTER"] },
    },
    orderBy: { studentCount: "desc" },
    take: BATCH * 3,
    select: { id: true, name: true, city: true },
  });

  const schools = allSchools
    .filter((s) => {
      const upper = s.name.toUpperCase();
      const hasKeyword = SCHOOL_KEYWORDS.some((k) => upper.includes(k));
      const isSkipped = SKIP_PATTERNS.some((p) => upper.includes(p));
      return hasKeyword && !isSkipped;
    })
    .slice(0, BATCH);

  console.log(`🔍 Processing ${schools.length} schools (largest first)`);
  let found = 0;

  for (let i = 0; i < schools.length; i++) {
    const s = schools[i]!;
    process.stdout.write(`[${i + 1}/${schools.length}] ${s.name} (${s.city})... `);
    try {
      const url = await findWebsite({ ...s, state: "FL" });
      if (url) {
        await prisma.school.update({ where: { id: s.id }, data: { website: url } });
        console.log(`✅ ${url}`);
        found++;
      } else {
        console.log("❌ Not found");
      }
    } catch (e) {
      console.log(`⚠️  Error: ${(e as Error).message}`);
    }
    await sleep(1500); // polite rate limit
  }

  console.log(`\n✨ Done. Found ${found}/${schools.length} websites.`);
  await prisma.$disconnect();
}

main().catch(console.error);
