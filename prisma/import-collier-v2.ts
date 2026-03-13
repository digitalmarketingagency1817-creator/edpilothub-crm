/**
 * Import Collier schools by fetching page titles + fix remaining Escambia compound slugs
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-collier-v2.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const COLLIER_URLS = [
  "https://aes.collierschools.com",
  "https://arh.collierschools.com",
  "https://ave.collierschools.com",
  "https://bce.collierschools.com",
  "https://bch.collierschools.com",
  "https://bcr.collierschools.com",
  "https://bus.collierschools.com",
  "https://ces.collierschools.com",
  "https://cpe.collierschools.com",
  "https://cpm.collierschools.com",
  "https://ees.collierschools.com",
  "https://enm.collierschools.com",
  "https://epe.collierschools.com",
  "https://evg.collierschools.com",
  "https://gch.collierschools.com",
  "https://gge.collierschools.com",
  "https://ggh.collierschools.com",
  "https://ggm.collierschools.com",
  "https://gte.collierschools.com",
  "https://gvm.collierschools.com",
  "https://hce.collierschools.com",
  "https://hle.collierschools.com",
  "https://ihs.collierschools.com",
  "https://ims.collierschools.com",
  "https://les.collierschools.com",
  "https://lge.collierschools.com",
  "https://lhs.collierschools.com",
  "https://loe.collierschools.com",
  "https://lpe.collierschools.com",
  "https://lte.collierschools.com",
  "https://lwh.collierschools.com",
  "https://mde.collierschools.com",
  "https://mes.collierschools.com",
  "https://mms.collierschools.com",
  "https://nhs.collierschools.com",
  "https://nnm.collierschools.com",
  "https://npe.collierschools.com",
  "https://oes.collierschools.com",
  "https://oms.collierschools.com",
  "https://pes.collierschools.com",
  "https://ple.collierschools.com",
  "https://pme.collierschools.com",
  "https://prh.collierschools.com",
  "https://prm.collierschools.com",
  "https://pse.collierschools.com",
  "https://sge.collierschools.com",
  "https://sle.collierschools.com",
  "https://spe.collierschools.com",
  "https://tbe.collierschools.com",
  "https://ves.collierschools.com",
  "https://vme.collierschools.com",
  "https://voe.collierschools.com",
];

// Escambia compound slug fixes (slug → keywords to match)
const ESCAMBIA_FIXES: Record<string, string> = {
  blueangels: "blue angels",
  cordovapark: "cordova park",
  ernestward: "ernest ward",
  ferrypass: "ferry pass",
  hellencaro: "hellen caro",
  jimallen: "jim allen",
  lincolnpark: "lincoln park",
  molinopark: "molino park",
  myrtlegrove: "myrtle grove",
  navypoint: "navy point",
  pineforest: "pine forest",
  pinemeadow: "pine meadow",
  pleasantgrove: "pleasant grove",
  scenicheights: "scenic heights",
  westflorida: "west florida",
  westpensacola: "west pensacola",
};

const ESCAMBIA_FIX_URLS: Record<string, string> = {
  blueangels: "https://blueangelses.escambiaschools.org",
  cordovapark: "https://cordovaparkes.escambiaschools.org",
  ernestward: "https://ernestwardms.escambiaschools.org",
  ferrypass: "https://ferrypasses.escambiaschools.org",
  hellencaro: "https://hellencaroes.escambiaschools.org",
  jimallen: "https://jimallenes.escambiaschools.org",
  lincolnpark: "https://lincolnparkes.escambiaschools.org",
  molinopark: "https://molinoparkes.escambiaschools.org",
  myrtlegrove: "https://myrtlegrovees.escambiaschools.org",
  navypoint: "https://navypointes.escambiaschools.org",
  pineforest: "https://pineforesths.escambiaschools.org",
  pinemeadow: "https://pinemeadowes.escambiaschools.org",
  pleasantgrove: "https://pleasantgrovees.escambiaschools.org",
  scenicheights: "https://scenicheightses.escambiaschools.org",
  westflorida: "https://westfloridahs.escambiaschools.org",
  westpensacola: "https://westpensacolaes.escambiaschools.org",
};

async function fetchTitle(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!resp.ok) return "";
    const html = await resp.text();
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!m) return "";
    // Strip "Home - " or "Welcome to " prefixes
    return m[1]
      .replace(/^home\s*[-–|]\s*/i, "")
      .replace(/^welcome to\s*/i, "")
      .trim();
  } catch {
    return "";
  }
}

const LEVEL_WORDS = new Set([
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
  "preparatory",
  "community",
  "comprehensive",
  "technical",
  "the",
  "of",
  "and",
  "for",
  "a",
]);

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !LEVEL_WORDS.has(w))
    .join(" ")
    .trim();
}

function similarity(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let matches = 0;
  for (const w of wa) {
    if (wb.has(w)) matches++;
    else for (const bw of wb) if (bw.startsWith(w) || w.startsWith(bw)) matches += 0.7;
  }
  return matches / Math.max(wa.size, wb.size);
}

async function main() {
  // === COLLIER ===
  console.log("=== Collier County (fetching titles) ===");
  const collierSchools = await (prisma as any).school.findMany({
    where: { district: { name: { contains: "COLLIER", mode: "insensitive" } }, website: null },
    select: { id: true, name: true },
  });
  console.log(`  ${collierSchools.length} schools without website`);

  let collierUpdated = 0;
  for (const url of COLLIER_URLS) {
    const title = await fetchTitle(url);
    if (!title) {
      console.log(`  ⚠️  No title: ${url}`);
      continue;
    }

    const normTitle = normalize(title);
    let best = { id: "", score: 0, name: "" };
    for (const school of collierSchools) {
      const score = similarity(normTitle, normalize(school.name));
      if (score > best.score) best = { id: school.id, score, name: school.name };
    }

    if (best.score >= 0.5 && best.id) {
      await (prisma as any).school.update({ where: { id: best.id }, data: { website: url } });
      collierUpdated++;
      console.log(`  ✅ [${best.score.toFixed(2)}] "${title}" → ${best.name}`);
    } else {
      console.log(`  ❌ [${best.score.toFixed(2)}] "${title}" (best: ${best.name})`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  // === ESCAMBIA FIXES ===
  console.log("\n=== Escambia Compound Fixes ===");
  const escambiaSchools = await (prisma as any).school.findMany({
    where: { district: { name: { contains: "ESCAMBIA", mode: "insensitive" } }, website: null },
    select: { id: true, name: true },
  });
  console.log(`  ${escambiaSchools.length} schools without website`);

  let escambiaUpdated = 0;
  for (const [slug, keywords] of Object.entries(ESCAMBIA_FIXES)) {
    const url = ESCAMBIA_FIX_URLS[slug];
    const normKeywords = normalize(keywords);
    let best = { id: "", score: 0, name: "" };
    for (const school of escambiaSchools) {
      const score = similarity(normKeywords, normalize(school.name));
      if (score > best.score) best = { id: school.id, score, name: school.name };
    }
    if (best.score >= 0.45 && best.id) {
      await (prisma as any).school.update({ where: { id: best.id }, data: { website: url } });
      escambiaUpdated++;
      console.log(`  ✅ [${best.score.toFixed(2)}] ${slug} → ${best.name}`);
    } else {
      console.log(`  ❌ [${best.score.toFixed(2)}] ${slug} (best: ${best.name})`);
    }
  }

  const total = await (prisma as any).school.count({ where: { website: { not: null } } });
  console.log(`\n✅ Collier: ${collierUpdated} | Escambia fixes: ${escambiaUpdated}`);
  console.log(`📊 Total: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
