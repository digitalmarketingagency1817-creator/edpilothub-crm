/**
 * Broward v2 - explicit slug → school name mapping for hard cases
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-broward-v2.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Explicit hard mappings: slug → keyword(s) that appear in the DB school name
const EXPLICIT_MAP: Record<string, string> = {
  acperry: "annabel perry",
  attucks: "crispus attucks",
  bair: "bair",
  blancheely: "blanche ely",
  blvdheights: "boulevard heights",
  boydanderson: "boyd anderson",
  brighthorizons: "bright horizons",
  colbert: "colbert",
  collins: "collins",
  cresthaven: "cresthaven",
  dillard612: "dillard 6",
  dillardelem: "dillard elementary",
  driftwoodelem: "driftwood elementary",
  driftwoodmid: "driftwood middle",
  endeavourprimarylearning: "endeavour primary",
  evergladeselem: "everglades elementary",
  evergladeshigh: "everglades high",
  fairway: "fairway",
  flamingo: "flamingo",
  flanagan: "flanagan",
  floranada: "floranada",
  glades: "glades middle",
  griffin: "griffin",
  hallandalehigh: "hallandale high",
  harbordale: "harbordale",
  horizon: "horizon",
  hunt: "james hunt",
  lakeside: "lakeside",
  larkdale: "larkdale",
  lauderhill612: "lauderhill 6",
  liberty: "liberty",
  maplewood: "maplewood",
  markham: "james markham",
  mcarthur: "mcarthur",
  mcnab: "mcnab",
  mcnicol: "mcnicol",
  meadowbrook: "meadowbrook",
  millennium: "millennium",
  mlking: "martin luther king",
  monarch: "monarch",
  morrow: "morrow",
  norcrest: "norcrest",
  northeast: "northeast",
  novahigh: "nova high",
  novamid: "nova middle",
  oakridge: "oakridge",
  olsen: "olsen",
  oriole: "oriole",
  palmview: "palmview",
  parkside: "parkside",
  parkway: "parkway",
  pembrokepines: "pembroke pines charter elementary",
  perryeducation: "henry perry education",
  peters: "walter c young",
  pines: "pines middle",
  pinewood: "pinewood elementary",
  pioneer: "pioneer",
  piper: "j.p. taravella",
  ramblewoodelem: "ramblewood elementary",
  ramblewoodmid: "ramblewood middle",
  rickards: "rickards",
  riverglades: "river glades",
  riverland: "riverland",
  riverside: "riverside",
  sandpiper: "sandpiper",
  sawgrass: "sawgrass elementary",
  seagull: "seagull",
  seminole: "seminole middle",
  stirling: "stirling",
  stranahan: "stranahan",
  tamarac: "tamarac elementary",
  taravella: "taravella",
  tedder: "tedder",
  tradewinds: "tradewinds",
  tropical: "tropical",
  village: "village",
  walker: "walker",
  watkins: "watkins",
  welleby: "welleby",
  westchester: "westchester",
  western: "western",
  westglades: "westglades",
  westpine: "west pine",
  cypress: "cypress elementary",
  dania: "dania",
  davie: "davie elementary",
  discovery: "discovery",
  horizon2: "horizon elementary",
  stonemandouglas: "marjory stoneman douglas",
  gulfstreamacademy: "gulfstream academy hallandale",
  gulfstreamearlylearningcenter: "gulfstream early childhood",
  mcfattertechhigh: "mcfatter technical",
  novablancheforman: "nova blanche forman",
  novaeisenhower: "nova eisenhower",
  sheridantechhigh: "sheridan technical",
  waltercyoung: "walter young middle",
  whiddonrogers: "whiddon rodgers",
  whisperingpines: "whispering pines",
  atlantictechhigh: "atlantic technical",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|junior|high|school|center|academy|k-8|k8|magnet|charter|prep|jr|sr|of|the|and|a|for|at|pk)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function slugToHint(slug: string): string {
  if (EXPLICIT_MAP[slug]) return EXPLICIT_MAP[slug];
  // Convert slug to readable: camelCase → words, abbrevs expand
  return slug
    .replace(/elem$/, " elementary")
    .replace(/mid$/, " middle")
    .replace(/high$/, " high")
    .replace(/k8$/, " k8")
    .replace(/612$/, " 6-12")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function similarity(a: string, b: string): number {
  const na = normalize(a),
    nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wa = new Set(na.split(" ").filter((w) => w.length > 2));
  const wb = new Set(nb.split(" ").filter((w) => w.length > 2));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 ? inter / union : 0;
}

async function main() {
  const rawUrls = fs
    .readFileSync("/tmp/broward_school_urls.txt", "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean);

  const schoolUrls = rawUrls.map((url) => {
    const slug = url.replace("https://", "").replace(".browardschools.com", "");
    return { url, nameHint: slugToHint(slug), slug };
  });

  const dbSchools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: "BROWARD", mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });
  console.log(`Broward without website: ${dbSchools.length}`);

  let updated = 0;
  const matched = new Set<string>();

  for (const db of dbSchools) {
    let best = "",
      bestScore = 0;
    for (const { url, nameHint, slug } of schoolUrls) {
      if (matched.has(url)) continue;
      const s = similarity(db.name, nameHint);
      // Also try direct slug match
      const slugMatch = normalize(db.name).includes(slug.replace(/elem$|mid$|high$|k8$/, ""));
      const score = slugMatch ? Math.max(s, 0.65) : s;
      if (score > bestScore) {
        bestScore = score;
        best = url;
      }
    }
    if (best && bestScore >= 0.45) {
      await (prisma as any).school.update({
        where: { id: db.id },
        data: { website: best },
      });
      matched.add(best);
      updated++;
      // console.log(`  ${db.name} → ${best} (${bestScore.toFixed(2)})`);
    }
  }

  console.log(`✅ Broward v2: updated ${updated}`);
  const total = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`📊 Total: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
