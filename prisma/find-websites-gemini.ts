/**
 * School Website Finder — Gemini API with Google Search grounding
 * Uses gemini-2.0-flash with grounding for accurate school website lookups
 * Run: npx tsx prisma/find-websites-gemini.ts [batchSize]
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const GEMINI_API_KEY = "REDACTED_API_KEY";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
  "trulia.com",
  "zillow.com",
  "apartments.com",
  "nextdoor.com",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreUrl(url: string): number {
  let score = 0;
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.endsWith(".edu")) score += 10;
    if (domain.includes("k12.fl.us")) score += 15;
    if (domain.includes("dadeschools")) score += 12;
    if (domain.includes("browardschools")) score += 12;
    if (domain.includes("palmbeachschools")) score += 12;
    if (domain.includes("ocps.net")) score += 12;
    if (domain.includes("hillsboroughschools")) score += 12;
    if (domain.includes("pcsb.org")) score += 12;
    if (domain.includes("duvalschools")) score += 12;
    if (domain.includes("school")) score += 5;
    if (domain.includes("academy")) score += 3;
    if (domain.includes("charter")) score += 2;
  } catch {}
  return score;
}

async function findWebsiteViaGemini(
  schoolName: string,
  city: string,
  county: string
): Promise<string | null> {
  const prompt = `What is the official website URL for "${schoolName}" school in ${city}, ${county} County, Florida? Return ONLY the URL, nothing else. If you don't know, return "NOT_FOUND".`;

  try {
    const resp = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 100 },
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      if (resp.status === 429) {
        console.log("  ⏳ Rate limited, waiting 60s...");
        await sleep(60000);
        return null;
      }
      console.log(`  ⚠️ Gemini error ${resp.status}: ${err.slice(0, 100)}`);
      return null;
    }

    const data = (await resp.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!text || text === "NOT_FOUND" || text.toLowerCase().includes("not found")) return null;

    // Extract URL from response
    const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/);
    if (!urlMatch) return null;

    const url = urlMatch[0].replace(/[.,;)]+$/, "");

    // Check blocked domains
    try {
      const domain = new URL(url).hostname.toLowerCase();
      if (BLOCKED_DOMAINS.some((b) => domain.includes(b))) return null;
    } catch {
      return null;
    }

    return url;
  } catch (e: any) {
    if (e?.name === "TimeoutError") console.log("  ⏱️ Gemini timeout");
    return null;
  }
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
    return resp.ok || resp.status === 405; // 405 = method not allowed but server exists
  } catch {
    return false;
  }
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

    const website = await findWebsiteViaGemini(name, city, county);

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

    // 1s delay between requests (Gemini free: 15 req/min = 4s safe, but let's try 1.5s)
    await sleep(1500);
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
