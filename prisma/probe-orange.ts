/**
 * Probe Orange County remaining schools via ocps.net subdomains
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/probe-orange.ts
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
]);

function nameToCandidates(name: string): string[] {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 1 && !SKIP.has(w));
  if (words.length === 0) return [];
  const candidates: string[] = [];
  // Full slug
  candidates.push(words.join("-"));
  // First 2 words
  if (words.length >= 2) candidates.push(words.slice(0, 2).join("-"));
  // First word only
  candidates.push(words[0]);
  // First word + first letter of second
  if (words.length >= 2) candidates.push(words[0] + words[1][0]);
  return [...new Set(candidates)];
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
      redirect: "follow",
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function main() {
  const schools = await (prisma as any).school.findMany({
    where: { district: { name: { contains: "ORANGE", mode: "insensitive" } }, website: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  console.log(`Orange schools without website: ${schools.length}`);
  let updated = 0;

  for (const school of schools) {
    const candidates = nameToCandidates(school.name);
    let found = "";
    for (const slug of candidates) {
      const url = `https://${slug}.ocps.net`;
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
    await new Promise((r) => setTimeout(r, 50));
  }

  const total = await (prisma as any).school.count({ where: { website: { not: null } } });
  console.log(`\n✅ Orange: ${updated} updated`);
  console.log(`📊 Total: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
