/**
 * Import school websites from FL district directories
 * Covers: Orange County (OCPS), Broward, Palm Beach, Hillsborough, Duval, Polk, Pinellas
 *
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-district-websites.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|high|school|center|academy|k-8|k8|preparatory|prep|magnet|charter)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function slugToName(slug: string): string {
  // Convert URL slug like "boonehs" → "boone" or "drphillipshs" → "dr phillips"
  return slug
    .replace(/hs$|ms$|es$|k8$|elem$|mid$|high$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-z]{2,})/g, (m) => m + " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.length > 4 && nb.length > 4) {
    if (na.includes(nb) || nb.includes(na)) return 0.85;
  }
  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

async function matchAndUpdate(
  districtName: string,
  schoolUrls: Array<{ url: string; nameHint: string }>
) {
  const dbSchools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: districtName, mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });

  if (dbSchools.length === 0) {
    console.log(`  No unmatched ${districtName} schools in DB`);
    return 0;
  }

  let updated = 0;
  const matched = new Set<string>();

  for (const dbSchool of dbSchools) {
    let bestUrl = "";
    let bestScore = 0;

    for (const { url, nameHint } of schoolUrls) {
      if (matched.has(url)) continue;
      const score = similarity(dbSchool.name, nameHint);
      if (score > bestScore) {
        bestScore = score;
        bestUrl = url;
      }
    }

    if (bestUrl && bestScore >= 0.55) {
      await (prisma as any).school.update({
        where: { id: dbSchool.id },
        data: { website: bestUrl },
      });
      matched.add(bestUrl);
      updated++;
    }
  }

  console.log(`  ✅ ${districtName}: updated ${updated}/${dbSchools.length}`);
  return updated;
}

async function scrapeOCPS() {
  console.log("\n📡 Scraping Orange County (OCPS) school URLs...");
  const res = await fetch("https://www.ocps.net/schools-home", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();

  const urls: Array<{ url: string; nameHint: string }> = [];
  const matches = html.matchAll(/href="(https:\/\/([^.]+)\.ocps\.net)"/g);
  for (const m of matches) {
    const url = m[1];
    const slug = m[2];
    if (!urls.find((u) => u.url === url)) {
      urls.push({ url, nameHint: slugToName(slug) + " school" });
    }
  }
  console.log(`  Found ${urls.length} OCPS school URLs`);
  return matchAndUpdate("ORANGE", urls);
}

async function scrapeBroward() {
  console.log("\n📡 Scraping Broward school URLs...");
  // Broward schools are at /domain/* paths on browardschools.com
  // They have a school finder - try fetching the accordion tabs
  const res = await fetch("https://www.browardschools.com/directory/our-schools", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();

  const urls: Array<{ url: string; nameHint: string }> = [];
  // Look for school page links within Broward domain
  const matches = html.matchAll(
    /href="(\/([a-z0-9-]+(?:elementary|middle|high|school|academy|center|k-8|prep)[a-z0-9-]*))"[^>]*>([^<]+)<\/a>/gi
  );
  for (const m of matches) {
    const url = `https://www.browardschools.com${m[1]}`;
    const nameHint = m[3].trim();
    if (nameHint.length > 3 && !urls.find((u) => u.url === url)) {
      urls.push({ url, nameHint });
    }
  }
  console.log(`  Found ${urls.length} Broward school URLs`);
  return urls.length > 0 ? matchAndUpdate("BROWARD", urls) : 0;
}

async function scrapePalmBeach() {
  console.log("\n📡 Checking Palm Beach school URLs...");
  const res = await fetch("https://www.palmbeachschools.org/schools", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await res.text();

  const urls: Array<{ url: string; nameHint: string }> = [];
  const matches = html.matchAll(/href="(https:\/\/([^.]+)\.palmbeachschools\.org)"/gi);
  for (const m of matches) {
    const url = m[1];
    const slug = m[2];
    if (!urls.find((u) => u.url === url)) {
      urls.push({ url, nameHint: slugToName(slug) + " school" });
    }
  }
  console.log(`  Found ${urls.length} Palm Beach school subdomains`);
  return urls.length > 0 ? matchAndUpdate("PALM BEACH", urls) : 0;
}

async function scrapeHillsborough() {
  console.log("\n📡 Checking Hillsborough school URLs...");
  // Hillsborough schools are typically at schoolname.mysdhc.org or hillsboroughschools.org/schoolname
  const res = await fetch("https://www.hillsboroughschools.org/find-a-school", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    console.log("  Hillsborough school directory not accessible");
    return 0;
  }
  const html = await res.text();
  const urls: Array<{ url: string; nameHint: string }> = [];
  const matches = html.matchAll(/href="(https:\/\/[^.]+\.mysdhc\.org[^"]*)"/gi);
  for (const m of matches) {
    const url = m[1];
    if (!urls.find((u) => u.url === url)) {
      const slug = new URL(url).hostname.split(".")[0];
      urls.push({ url, nameHint: slugToName(slug) });
    }
  }
  console.log(`  Found ${urls.length} Hillsborough school URLs`);
  return urls.length > 0 ? matchAndUpdate("HILLSBOROUGH", urls) : 0;
}

async function scrapeDuval() {
  console.log("\n📡 Checking Duval County school URLs...");
  const res = await fetch("https://www.duvalschools.org/page/schools-overview", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    console.log("  Duval school directory not accessible");
    return 0;
  }
  const html = await res.text();
  const urls: Array<{ url: string; nameHint: string }> = [];
  const matches = html.matchAll(/href="(https:\/\/[^.]+\.duvalschools\.org[^"]*)"/gi);
  for (const m of matches) {
    const url = m[1];
    if (!urls.find((u) => u.url === url)) {
      const slug = new URL(url).hostname.split(".")[0];
      urls.push({ url, nameHint: slugToName(slug) });
    }
  }
  console.log(`  Found ${urls.length} Duval school URLs`);
  return urls.length > 0 ? matchAndUpdate("DUVAL", urls) : 0;
}

async function main() {
  let total = 0;
  total += await scrapeOCPS();
  total += await scrapeBroward();
  total += await scrapePalmBeach();
  total += await scrapeHillsborough();
  total += await scrapeDuval();

  const withSite = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`\n🎉 Total updated in this run: ${total}`);
  console.log(`📊 Total schools with website: ${withSite}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
