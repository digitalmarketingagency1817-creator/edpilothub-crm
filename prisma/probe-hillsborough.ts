/**
 * Probe Hillsborough County schools via hillsboroughschools.org/o/{slug}
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/probe-hillsborough.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const SKIP = new Set([
  "elementary",
  "middle",
  "high",
  "school",
  "senior",
  "junior",
  "center",
  "academy",
  "charter",
  "magnet",
  "k",
  "k8",
  "of",
  "and",
  "the",
  "a",
  "an",
  "for",
  "at",
  "preparatory",
  "prep",
  "community",
  "technical",
  "program",
  "international",
]);

function nameToCandidates(name: string): string[] {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
  const allWords = clean.split(/\s+/).filter((w) => w.length > 1);
  const sigWords = allWords.filter((w) => !SKIP.has(w));
  const candidates: string[] = [];

  // Full name slug (all words)
  candidates.push(allWords.join("-"));
  // Significant words only
  if (sigWords.length > 0) candidates.push(sigWords.join("-"));
  // First 2 significant words
  if (sigWords.length >= 2) candidates.push(sigWords.slice(0, 2).join("-"));
  // First significant word only
  if (sigWords.length > 0) candidates.push(sigWords[0]);
  // First 3 all words
  if (allWords.length >= 3) candidates.push(allWords.slice(0, 3).join("-"));

  return [...new Set(candidates)].filter((s) => s.length >= 3);
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function main() {
  const schools = await (prisma as any).school.findMany({
    where: { district: { name: { contains: "HILLSBOROUGH", mode: "insensitive" } }, website: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  console.log(`Hillsborough schools without website: ${schools.length}`);
  let updated = 0;

  for (const school of schools) {
    const candidates = nameToCandidates(school.name);
    let found = "";
    for (const slug of candidates) {
      const url = `https://www.hillsboroughschools.org/o/${slug}`;
      if (await checkUrl(url)) {
        found = url;
        break;
      }
    }
    if (found) {
      await (prisma as any).school.update({ where: { id: school.id }, data: { website: found } });
      updated++;
      console.log(`  ✅ ${school.name} → ${found}`);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  const total = await (prisma as any).school.count({ where: { website: { not: null } } });
  console.log(`\n✅ Hillsborough: ${updated} updated`);
  console.log(`📊 Total: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
