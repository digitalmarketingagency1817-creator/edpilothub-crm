/**
 * Import Miami-Dade school website URLs from MDCPS public API
 * Maps MDCPS school numbers → dadeschools.net/schools/{number} URLs
 * Matches by school name (fuzzy) within MIAMI-DADE district
 *
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-mdcps-websites.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

interface MDCPSSchool {
  number: string;
  name: string;
  eMail: string;
  type: string;
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(elementary|middle|senior|high|school|center|academy|k-8|k8)\b/g, "")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  // Count common words
  const wordsA = new Set(na.split(" ").filter(Boolean));
  const wordsB = new Set(nb.split(" ").filter(Boolean));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

async function main() {
  console.log("📡 Fetching MDCPS school list...");
  const res = await fetch("https://api.dadeschools.net/api/schools");
  const mdcpsSchools: MDCPSSchool[] = await res.json();
  console.log(`✅ Got ${mdcpsSchools.length} MDCPS schools from API`);

  // Filter to actual K-12 schools (exclude adult/vocational/virtual)
  const k12Schools = mdcpsSchools.filter(
    (s) => !["V", "NA"].includes(s.type) && s.number.length <= 4
  );
  console.log(`🏫 Filtered to ${k12Schools.length} K-12 schools`);

  // Get Miami-Dade schools from our DB
  const dbSchools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: "MIAMI-DADE", mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });
  console.log(`📊 Found ${dbSchools.length} Miami-Dade schools without website in DB`);

  const updated = 0;
  let skipped = 0;
  const updates: Array<{ id: string; website: string; name: string }> = [];

  for (const dbSchool of dbSchools) {
    let bestMatch: MDCPSSchool | null = null;
    let bestScore = 0;

    for (const mdcps of k12Schools) {
      const score = similarity(dbSchool.name, mdcps.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = mdcps;
      }
    }

    if (bestMatch && bestScore >= 0.6) {
      const url = `https://www.dadeschools.net/schools/${bestMatch.number}`;
      updates.push({ id: dbSchool.id, website: url, name: dbSchool.name });
    } else {
      skipped++;
    }
  }

  console.log(`\n🔗 Matched ${updates.length} schools, skipped ${skipped} (score < 0.6)`);

  // Batch update
  console.log("💾 Updating database...");
  let i = 0;
  for (const u of updates) {
    await (prisma as any).school.update({
      where: { id: u.id },
      data: { website: u.website },
    });
    i++;
    if (i % 50 === 0) console.log(`  ${i}/${updates.length}...`);
  }

  console.log(`\n🎉 Done! Updated ${i} Miami-Dade school websites`);

  // Also try Broward pattern: browardschools.com has school pages
  console.log("\n📡 Now trying Broward County...");
  await importBroward();
}

async function importBroward() {
  // Broward school URLs: https://www.browardschools.com/domain/{id}
  // They have a findmyschool page: https://www.browardschools.com/findmyschool
  // But simpler: each Broward school has a subdomain or path
  // Let's check their sitemap/API
  const res = await fetch(
    "https://www.browardschools.com/domain/6", // "Our Schools" page
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const html = await res.text();

  // Extract school links from their directory
  const schoolLinks: Array<{ name: string; url: string }> = [];
  const linkPattern =
    /href="(\/[a-z0-9-]+school[a-z0-9-]*|\/[a-z0-9-]*elementary[a-z0-9-]*|\/[a-z0-9-]*middle[a-z0-9-]*|\/[a-z0-9-]*high[a-z0-9-]*)"/gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const relUrl = match[1];
    const fullUrl = `https://www.browardschools.com${relUrl}`;
    if (!schoolLinks.find((l) => l.url === fullUrl)) {
      schoolLinks.push({ name: relUrl.replace(/\//g, " ").trim(), url: fullUrl });
    }
  }

  console.log(`Found ${schoolLinks.length} potential Broward school links`);
  // Broward approach is more complex - skip for now, focus on MDCPS success
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
