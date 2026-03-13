/**
 * Import Collier + Escambia school websites
 * Collier: {3-letter}.collierschools.com
 * Escambia: {slug}.escambiaschools.org
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-collier-escambia.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Collier: 3-letter code → school name keywords for fuzzy match
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

// Escambia: slug → school name (derived from slug)
const ESCAMBIA_URLS = [
  "https://baileyms.escambiaschools.org",
  "https://bellviewes.escambiaschools.org",
  "https://bellviewms.escambiaschools.org",
  "https://beulahacademycs.escambiaschools.org",
  "https://beulahes.escambiaschools.org",
  "https://beulahms.escambiaschools.org",
  "https://blueangelses.escambiaschools.org",
  "https://brattes.escambiaschools.org",
  "https://brentwoodes.escambiaschools.org",
  "https://brown-bargems.escambiaschools.org",
  "https://byrnevillees.escambiaschools.org",
  "https://cookes.escambiaschools.org",
  "https://cordovaparkes.escambiaschools.org",
  "https://ensleyes.escambiaschools.org",
  "https://ernestwardms.escambiaschools.org",
  "https://escambiahs.escambiaschools.org",
  "https://ferrypasses.escambiaschools.org",
  "https://ferrypassms.escambiaschools.org",
  "https://glaes.escambiaschools.org",
  "https://hellencaroes.escambiaschools.org",
  "https://holmes.escambiaschools.org",
  "https://jimallenes.escambiaschools.org",
  "https://kingsfieldes.escambiaschools.org",
  "https://lincolnparkes.escambiaschools.org",
  "https://lipscombes.escambiaschools.org",
  "https://longleafes.escambiaschools.org",
  "https://mcarthures.escambiaschools.org",
  "https://molinoparkes.escambiaschools.org",
  "https://montclaires.escambiaschools.org",
  "https://myrtlegrovees.escambiaschools.org",
  "https://navypointes.escambiaschools.org",
  "https://northviewhs.escambiaschools.org",
  "https://oakcrestes.escambiaschools.org",
  "https://pensacolahs.escambiaschools.org",
  "https://pineforesths.escambiaschools.org",
  "https://pinemeadowes.escambiaschools.org",
  "https://pleasantgrovees.escambiaschools.org",
  "https://ransomms.escambiaschools.org",
  "https://scenicheightses.escambiaschools.org",
  "https://semmeses.escambiaschools.org",
  "https://sherwoodes.escambiaschools.org",
  "https://suteres.escambiaschools.org",
  "https://tatehs.escambiaschools.org",
  "https://warringtones.escambiaschools.org",
  "https://washingtonhs.escambiaschools.org",
  "https://weises.escambiaschools.org",
  "https://westfloridahs.escambiaschools.org",
  "https://westpensacolaes.escambiaschools.org",
  "https://workmanms.escambiaschools.org",
];

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
  "es",
  "ms",
  "hs",
  "cs",
  "sc",
  "k8",
  "the",
  "of",
  "and",
  "for",
  "at",
  "a",
  "an",
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

// For Escambia: extract name from slug by removing level suffixes
function slugToName(slug: string): string {
  return slug
    .replace(/es$|ms$|hs$|cs$|sc$/, "")
    .replace(/-/g, " ")
    .trim();
}

async function matchAndUpdate(
  urls: string[],
  districtKeyword: string,
  urlToName: (url: string) => string,
  threshold: number
) {
  const schools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: districtKeyword, mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });

  console.log(
    `  ${districtKeyword}: ${schools.length} schools without website, ${urls.length} URLs`
  );

  let updated = 0;
  const used = new Set<string>();

  for (const url of urls) {
    const hostname = new URL(url).hostname;
    const slug = hostname.split(".")[0];
    const extractedName = urlToName(slug);
    const normExtracted = normalize(extractedName);
    if (!normExtracted) continue;

    let best = { id: "", score: 0, name: "" };
    for (const school of schools) {
      if (used.has(school.id)) continue;
      const score = similarity(normExtracted, normalize(school.name));
      if (score > best.score) best = { id: school.id, score, name: school.name };
    }

    if (best.score >= threshold && best.id) {
      await (prisma as any).school.update({ where: { id: best.id }, data: { website: url } });
      used.add(best.id);
      updated++;
      console.log(`  ✅ [${best.score.toFixed(2)}] ${extractedName} → ${best.name} → ${url}`);
    } else if (best.score > 0.2) {
      console.log(`  ❌ [${best.score.toFixed(2)}] ${extractedName} (best: ${best.name})`);
    }
  }
  return updated;
}

async function main() {
  console.log("=== Collier County ===");
  const collierUpdated = await matchAndUpdate(
    COLLIER_URLS,
    "COLLIER",
    (slug) => slug, // 3-letter code — will fuzzy match initials
    0.3
  );

  console.log("\n=== Escambia County ===");
  const escambiaUpdated = await matchAndUpdate(ESCAMBIA_URLS, "ESCAMBIA", slugToName, 0.45);

  const total = await (prisma as any).school.count({ where: { website: { not: null } } });
  console.log(`\n✅ Collier: ${collierUpdated} updated`);
  console.log(`✅ Escambia: ${escambiaUpdated} updated`);
  console.log(`📊 Total with websites: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
