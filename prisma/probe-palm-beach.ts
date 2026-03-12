/**
 * Probe Palm Beach County school subdomains via HTTP
 * Pattern: {initials}.palmbeachschools.org where initials = first letter of each significant word + es/ms/hs
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/probe-palm-beach.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const SKIP_WORDS = new Set([
  "of",
  "the",
  "and",
  "a",
  "an",
  "at",
  "for",
  "in",
  "on",
  "to",
  "school",
  "elementary",
  "middle",
  "high",
  "community",
  "center",
  "academy",
  "charter",
  "magnet",
  "preparatory",
  "prep",
  "virtual",
  "instruction",
  "program",
  "services",
  "education",
  "k8",
  "k-8",
]);

function nameToSlugCandidates(name: string): string[] {
  const candidates: string[] = [];
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(" ").filter((w) => w.length > 0);

  // Determine school type suffix
  const isHigh = name.match(/\bHIGH\b/i);
  const isMiddle = name.match(/\bMIDDLE\b/i);
  const suffix = isHigh ? "hs" : isMiddle ? "ms" : "es";

  // Get significant words (not in skip list)
  const sigWords = words.filter((w) => !SKIP_WORDS.has(w) && w.length > 1);

  if (sigWords.length === 0) return [];

  // Pattern 1: first letter of each sig word + suffix
  const initials = sigWords.map((w) => w[0]).join("");
  candidates.push(initials + suffix);
  candidates.push(initials); // no suffix

  // Pattern 2: first 2 letters of first word + first letter of rest + suffix
  if (sigWords.length >= 2) {
    const p2 =
      sigWords[0].slice(0, 2) +
      sigWords
        .slice(1)
        .map((w) => w[0])
        .join("");
    candidates.push(p2 + suffix);
    candidates.push(p2 + "s"); // sometimes just 's'
  }

  // Pattern 3: first 3-4 letters of first sig word + suffix
  if (sigWords[0].length >= 3) {
    candidates.push(sigWords[0].slice(0, 3) + suffix);
    candidates.push(sigWords[0].slice(0, 4) + suffix);
    candidates.push(sigWords[0].slice(0, 4));
  }

  // Pattern 4: first word + second word initials
  if (sigWords.length >= 2) {
    const p4 =
      sigWords[0] +
      sigWords
        .slice(1)
        .map((w) => w[0])
        .join("");
    candidates.push(p4);
    if (p4.length <= 8) {
      candidates.push(p4 + suffix);
    }
  }

  // Pattern 5: abbreviation of full name (keep only consonants or initials)
  if (sigWords.length >= 3) {
    const p5 = sigWords
      .slice(0, 3)
      .map((w) => w[0])
      .join("");
    candidates.push(p5 + suffix);
  }

  return [...new Set(candidates)].filter((s) => s.length >= 2 && s.length <= 12);
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
  const db = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: "PALM BEACH", mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  console.log(`Palm Beach schools without website: ${db.length}`);

  let updated = 0;

  // Process in batches to avoid overwhelming the server
  for (const school of db) {
    const candidates = nameToSlugCandidates(school.name);
    let found = "";

    for (const slug of candidates) {
      const url = `https://${slug}.palmbeachschools.org`;
      const ok = await checkUrl(url);
      if (ok) {
        found = url;
        break;
      }
    }

    if (found) {
      await (prisma as any).school.update({
        where: { id: school.id },
        data: { website: found },
      });
      updated++;
      console.log(`  ✅ ${school.name} → ${found}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`\n✅ Palm Beach probe: updated ${updated}`);
  const total = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`📊 Total: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
