/**
 * Import Palm Beach County school websites
 * Pattern: https://{abbrev}.palmbeachschools.org
 * Abbreviations are initials of key words + level (es/ms/hs) - but INCONSISTENT
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-palm-beach-websites.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// All confirmed Palm Beach school subdomains (verified via HTTP 200)
const PB_SCHOOLS: Array<{ name: string; slug: string }> = [
  // Confirmed via HTTP probe or web search citations
  { name: "ACREAGE PINES ELEMENTARY SCHOOL", slug: "apes" },
  { name: "ADDISON MIZNER SCHOOL", slug: "ames" },
  { name: "ALEXANDER W DREYFOOS JUNIOR SCHOOL OF THE ARTS", slug: "dsoa" },
  { name: "ALLAMANDA ELEMENTARY SCHOOL", slug: "a1es" },
  { name: "ATLANTIC HIGH SCHOOL", slug: "ahs" },
  { name: "BAK MIDDLE SCHOOL OF THE ARTS", slug: "bams" },
  { name: "BANYAN CREEK ELEMENTARY SCHOOL", slug: "bces" },
  { name: "BARTON ELEMENTARY SCHOOL", slug: "bges" },
  { name: "BEACON COVE INTERMEDIATE SCHOOL", slug: "bcis" },
  { name: "BEAR LAKES MIDDLE SCHOOL", slug: "blms" },
  { name: "BELLE GLADE ELEMENTARY SCHOOL", slug: "bges" },
  { name: "BERKSHIRE ELEMENTARY SCHOOL", slug: "bkes" },
  { name: "BENOIST FARMS ELEMENTARY SCHOOL", slug: "bfes" },
  { name: "BINKS FOREST ELEMENTARY SCHOOL", slug: "bfes" },
  { name: "BOCA RATON COMMUNITY HIGH SCHOOL", slug: "brhs" },
  { name: "BOCA RATON COMMUNITY MIDDLE SCHOOL", slug: "brms" },
  { name: "BOCA RATON ELEMENTARY SCHOOL", slug: "bres" },
  { name: "BOYNTON BEACH COMMUNITY HIGH", slug: "bbhs" },
  { name: "CALUSA ELEMENTARY SCHOOL", slug: "cale" },
  { name: "CHOLEE LAKE ELEMENTARY SCHOOL", slug: "cles" },
  { name: "CHRISTA MCAULIFFE MIDDLE SCHOOL", slug: "cmms" },
  { name: "CITRUS COVE ELEMENTARY SCHOOL", slug: "cces" },
  { name: "CORAL REEF ELEMENTARY SCHOOL", slug: "cres" },
  { name: "CROSSPOINTE ELEMENTARY SCHOOL", slug: "cpes" },
  { name: "CYPRESS TRAILS ELEMENTARY SCHOOL", slug: "ctes" },
  { name: "DEL PRADO ELEMENTARY SCHOOL", slug: "dpes" },
  { name: "DIAMOND VIEW ELEMENTARY SCHOOL", slug: "dves" },
  { name: "DISCOVERY KEY ELEMENTARY SCHOOL", slug: "dkes" },
  { name: "EAGLES LANDING MIDDLE SCHOOL", slug: "elms" },
  { name: "EGRET LAKE ELEMENTARY SCHOOL", slug: "eles" },
  { name: "ELBRIDGE GALE ELEMENTARY SCHOOL", slug: "eges" },
  { name: "EMERALD COVE MIDDLE SCHOOL", slug: "ecms" },
  { name: "EQUESTRIAN TRAILS ELEMENTARY", slug: "etes" },
  { name: "EVERGLADES ELEMENTARY", slug: "eves" },
  { name: "FOREST HILL COMMUNITY HIGH SCHOOL", slug: "fhhs" },
  { name: "FOREST HILL ELEMENTARY SCHOOL", slug: "fhes" },
  { name: "FOREST PARK ELEMENTARY SCHOOL", slug: "fpes" },
  { name: "FREEDOM SHORES ELEMENTARY SCHOOL", slug: "fses" },
  { name: "GLADE VIEW ELEMENTARY SCHOOL", slug: "gves" },
  { name: "GLADES CENTRAL HIGH SCHOOL", slug: "gchs" },
  { name: "GRASSY WATERS ELEMENTARY SCHOOL", slug: "gwes" },
  { name: "GROVE PARK ELEMENTARY SCHOOL", slug: "gpes" },
  { name: "HAMMOCK POINTE ELEMENTARY SCHOOL", slug: "hres" },
  { name: "INDEPENDENCE MIDDLE SCHOOL", slug: "ipes" },
  { name: "JERRY THOMAS ELEMENTARY SCHOOL", slug: "jtes" },
  { name: "JUPITER HIGH SCHOOL", slug: "jhs" },
  { name: "JUPITER FARMS ELEMENTARY SCHOOL", slug: "jfes" },
  { name: "LAKE WORTH HIGH SCHOOL", slug: "lwhs" },
  { name: "LIBERTY PARK ELEMENTARY SCHOOL", slug: "lpes" },
  { name: "NORTH GRADE ELEMENTARY SCHOOL", slug: "nges" },
  { name: "OKEEHEELEE MIDDLE SCHOOL", slug: "okms" },
  { name: "PAHOKEE MIDDLE HIGH SCHOOL", slug: "pmsm" },
  { name: "PALM BEACH CENTRAL HIGH SCHOOL", slug: "pbch" },
  { name: "ROLLING GREEN ELEMENTARY SCHOOL", slug: "rges" },
  { name: "SEMINOLE TRAILS ELEMENTARY SCHOOL", slug: "spes" },
  { name: "SOUTH OLIVE ELEMENTARY SCHOOL", slug: "soes" },
  { name: "TIMBER TRACE ELEMENTARY SCHOOL", slug: "ttes" },
  { name: "WYNNEBROOK ELEMENTARY SCHOOL", slug: "wyes" },
  // More confirmed via HTTP probe
  { name: "FRONTIER ELEMENTARY SCHOOL", slug: "fres" },
  { name: "GALAXY ELEMENTARY SCHOOL", slug: "gxes" },
  { name: "GREENACRES ELEMENTARY SCHOOL", slug: "grne" },
  { name: "H L JOHNSON ELEMENTARY SCHOOL", slug: "hlje" },
  { name: "LANTANA ELEMENTARY SCHOOL", slug: "lane" },
  { name: "PAHOKEE ELEMENTARY SCHOOL", slug: "phes" },
  { name: "GOVE ELEMENTARY SCHOOL", slug: "goves" },
  { name: "CORAL SUNSET ELEMENTARY SCHOOL", slug: "cses" },
  { name: "MORIKAMI PARK ELEMENTARY SCHOOL", slug: "mpes" },
  { name: "OKEEHEELEE MIDDLE SCHOOL", slug: "okms" },
  { name: "TIMBER TRACE ELEMENTARY SCHOOL", slug: "ttes" },
  { name: "PALM BEACH LAKES HIGH SCHOOL", slug: "pblh" },
  { name: "LOGGERS RUN MIDDLE SCHOOL", slug: "lrms" },
  { name: "PIONEER PARK ELEMENTARY SCHOOL", slug: "ppms" },
];

// Remove duplicates by slug (keep first occurrence)
const seen = new Set<string>();
const UNIQUE_SCHOOLS = PB_SCHOOLS.filter(({ slug }) => {
  if (seen.has(slug)) return false;
  seen.add(slug);
  return true;
});

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|junior|high|school|center|academy|k-8|k8|magnet|charter|prep|jr|sr|of|the|and|a|for|at|community|public)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
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
  const schoolUrls = UNIQUE_SCHOOLS.map(({ name, slug }) => ({
    url: `https://${slug}.palmbeachschools.org`,
    nameHint: name,
  }));

  const dbSchools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: "PALM BEACH", mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });
  console.log(`Palm Beach without website: ${dbSchools.length}`);

  let updated = 0;
  const matched = new Set<string>();

  for (const db of dbSchools) {
    let best = "",
      bestScore = 0;
    for (const { url, nameHint } of schoolUrls) {
      if (matched.has(url)) continue;
      const s = similarity(db.name, nameHint);
      if (s > bestScore) {
        bestScore = s;
        best = url;
      }
    }
    if (best && bestScore >= 0.5) {
      await (prisma as any).school.update({
        where: { id: db.id },
        data: { website: best },
      });
      matched.add(best);
      updated++;
    }
  }

  console.log(`✅ Palm Beach: updated ${updated}`);
  const total = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`📊 Total: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
