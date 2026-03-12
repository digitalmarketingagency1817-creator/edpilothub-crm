/**
 * Import Polk County school websites
 * Pattern: https://{slug}.polkschoolsfl.com
 * Slug = name lowercased, spaces removed, "senior" → "high" in some cases
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-polk-websites.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Known Polk County school slugs (verified from search results / citations)
const POLK_SCHOOLS: Array<{ name: string; slug: string }> = [
  // High Schools
  { name: "AUBURNDALE SENIOR HIGH SCHOOL", slug: "auburndalehigh" },
  { name: "BARTOW SENIOR HIGH SCHOOL", slug: "bartowhigh" },
  { name: "CHAIN OF LAKES COLLEGIATE HIGH", slug: "chainoflakescollegiate" },
  { name: "DAVENPORT HIGH SCHOOL", slug: "davenport" },
  { name: "GEORGE JENKINS HIGH SCHOOL", slug: "georgejenkinshigh" },
  { name: "HAINES CITY SENIOR HIGH SCHOOL", slug: "hainescityhigh" },
  { name: "KATHLEEN SENIOR HIGH SCHOOL", slug: "kathleenhigh" },
  { name: "LAKE GIBSON SENIOR HIGH SCHOOL", slug: "lakegibson" },
  { name: "LAKE WALES SENIOR HIGH SCHOOL", slug: "lakewaleshigh" },
  { name: "LAKELAND SENIOR HIGH SCHOOL", slug: "lakelandhigh" },
  { name: "MULBERRY SENIOR HIGH SCHOOL", slug: "mulberryhigh" },
  { name: "RIDGE COMMUNITY SENIOR HIGH", slug: "ridgecommunityhigh" },
  { name: "TENOROC SENIOR HIGH SCHOOL", slug: "tenorochigh" },
  { name: "WINTER HAVEN SENIOR HIGH SCHOOL", slug: "winterhavenhigh" },
  // Middle Schools
  { name: "BARTOW MIDDLE SCHOOL", slug: "bartowmiddle" },
  { name: "BERKLEY ACCELERATED MIDDLE SCHOOL", slug: "berkleymiddle" },
  { name: "DENISON MIDDLE SCHOOL", slug: "denisonmiddle" },
  { name: "DISCOVERY MIDDLE SCHOOL", slug: "discoverymiddle" },
  { name: "EDGAR L PADGETT ELEMENTARY SCHOOL", slug: "edgarlpadgett" },
  { name: "GEORGE W JENKINS MIDDLE SCHOOL", slug: "georgewjenkinsmiddle" },
  { name: "HAINES CITY MIDDLE SCHOOL", slug: "hainescitymiddle" },
  { name: "JERE STAMBAUGH MIDDLE SCHOOL", slug: "jerestambaugh" },
  { name: "KATHLEEN MIDDLE SCHOOL", slug: "kathleenmiddle" },
  { name: "LAWTON CHILES MIDDLE ACADEMY", slug: "lawtonchilesmiddle" },
  { name: "LAKE ALFRED ADDAIR MIDDLE SCHOOL", slug: "lakealfredaddair" },
  { name: "LAKE GIBSON MIDDLE SCHOOL", slug: "lakegibsonmiddle" },
  { name: "LAKE WALES MIDDLE SCHOOL", slug: "lakewalesmiddle" },
  { name: "LINCOLN MIDDLE SCHOOL", slug: "lincolnmiddle" },
  { name: "MCLAUGHLIN MIDDLE SCHOOL", slug: "mclaughlin" },
  { name: "MULBERRY MIDDLE SCHOOL", slug: "mulberrymiddle" },
  { name: "SLEEPY HILL MIDDLE SCHOOL", slug: "sleepyhillmiddle" },
  { name: "UNION ACADEMY", slug: "unionacademy" },
  { name: "WESTWOOD MIDDLE SCHOOL", slug: "westwoodmiddle" },
  { name: "WINTER HAVEN MIDDLE SCHOOL", slug: "winterhavenmiddle" },
  // Elementary Schools
  { name: "ALTA VISTA ELEMENTARY SCHOOL", slug: "altavista" },
  { name: "ALTURAS ELEMENTARY SCHOOL", slug: "alturas" },
  { name: "AUBURNDALE CENTRAL ELEMENTARY SCHOOL", slug: "auburndalecentral" },
  { name: "BARTOW ELEMENTARY ACADEMY", slug: "bartowacademy" },
  { name: "BERKLEY ELEMENTARY SCHOOL", slug: "berkley" },
  { name: "BETHUNE ACADEMY", slug: "bethune" },
  { name: "CARLTON PALMORE ELEMENTARY SCHOOL", slug: "carltonpalmore" },
  { name: "CHAIN OF LAKES ELEMENTARY SCHOOL", slug: "chainoflakes" },
  { name: "CITRUS RIDGE A CIVICS ACADEMY", slug: "citrusridge" },
  { name: "CLARENCE BOSWELL ELEMENTARY SCHOOL", slug: "clarenceboswell" },
  { name: "CLEVELAND COURT ELEMENTARY SCHOOL", slug: "clevelandcourt" },
  { name: "COMBEE ACADEMY OF DESIGN AND ENGINEERING", slug: "combeeacademy" },
  { name: "CRYSTAL LAKE ELEMENTARY SCHOOL", slug: "crystallake" },
  { name: "DAVENPORT ELEMENTARY", slug: "davenportelementary" },
  { name: "DAVENPORT SCHOOL OF THE ARTS", slug: "davenportarts" },
  { name: "DEPRESSION ERA ELEMENTARY SCHOOL", slug: "depressionera" },
  { name: "DIXIELAND ELEMENTARY SCHOOL", slug: "dixieland" },
  { name: "DORIS A SANDERS LEARNING CENTER", slug: "dorisasanders" },
  { name: "DR N E ROBERTS ELEMENTARY SCHOOL", slug: "drneroberts" },
  { name: "DUNDEE ELEMENTARY SCHOOL", slug: "dundee" },
  { name: "DUNDEE RIDGE MIDDLE ACADEMY", slug: "dundeeridge" },
  { name: "EAGLE LAKE ELEMENTARY SCHOOL", slug: "eaglelake" },
  { name: "EAST AREA ADULT AND COMMUNITY SCHOOL", slug: "eastarea" },
  { name: "EASTSIDE ELEMENTARY SCHOOL", slug: "eastside" },
  { name: "ELBERT ELEMENTARY SCHOOL", slug: "elbert" },
  { name: "FLORAL AVENUE ELEMENTARY SCHOOL", slug: "floralavenue" },
  { name: "FRANK E BRIGHAM ACADEMY", slug: "frankebrigham" },
  { name: "FROSTPROOF ELEMENTARY SCHOOL", slug: "frostproof" },
  { name: "FROSTPROOF MIDDLE SENIOR HIGH", slug: "frostproofmiddle" },
  { name: "GARDEN GROVE ELEMENTARY SCHOOL", slug: "gardengrove" },
  { name: "GIBBONS STREET ELEMENTARY SCHOOL", slug: "gibbonsstreet" },
  { name: "GRIFFIN ELEMENTARY SCHOOL", slug: "griffin" },
  { name: "HAINES CITY ELEMENTARY SCHOOL", slug: "hainescityelementary" },
  { name: "HIGHLANDS GROVE ELEMENTARY SCHOOL", slug: "highlandsgrove" },
  { name: "HIGHLAND CITY ELEMENTARY SCHOOL", slug: "highlandcity" },
  { name: "HORIZONS ELEMENTARY SCHOOL", slug: "horizons" },
  { name: "INWOOD ELEMENTARY SCHOOL", slug: "inwood" },
  { name: "JAMES E STEPHENS ELEMENTARY SCHOOL", slug: "jamesestephens" },
  { name: "JEAN ODELL LEARNING CENTER", slug: "jeaneodell" },
  { name: "JEWETT MIDDLE ACADEMY", slug: "jewettmiddle" },
  { name: "JEWETT SCHOOL OF THE ARTS", slug: "jewettarts" },
  { name: "JOHN SNIVELY ELEMENTARY SCHOOL", slug: "johnsnively" },
  { name: "JANIE HOWARD WILSON ELEMENTARY", slug: "janiehowardwilson" },
  { name: "KAREN M SIEGEL ACADEMY", slug: "karensiegel" },
  { name: "KATHLEEN ELEMENTARY SCHOOL", slug: "kathleenelementary" },
  { name: "LAKE ALFRED ELEMENTARY SCHOOL", slug: "lakealfredelementary" },
  { name: "LAKE MARION CREEK SCHOOL", slug: "lakemarioncreek" },
  { name: "LAKE SHIPP ELEMENTARY SCHOOL", slug: "lakeshipp" },
  { name: "LAKE WALES ARTS CENTER", slug: "lakewalesarts" },
  { name: "LAKELAND HIGHLANDS MIDDLE SCHOOL", slug: "lakelandhighlandsmiddle" },
  { name: "LENA VISTA ELEMENTARY SCHOOL", slug: "lenavista" },
  { name: "LINCOLN AVENUE ACADEMY", slug: "lincolnavenue" },
  { name: "LOUGHMAN OAKS ELEMENTARY SCHOOL", slug: "loughmaноaks" },
  { name: "MEDULLA ELEMENTARY SCHOOL", slug: "medulla" },
  { name: "MULBERRY ELEMENTARY SCHOOL", slug: "mulberryelementary" },
  { name: "NORTH LAKELAND ELEMENTARY SCHOOL", slug: "northlakeland" },
  { name: "OSCAR J POPE ELEMENTARY SCHOOL", slug: "oscarjpope" },
  { name: "PALMETTO ELEMENTARY SCHOOL", slug: "palmetto" },
  { name: "PHYLLIS WHEATLEY ELEMENTARY SCHOOL", slug: "phylliswheatley" },
  { name: "PINEWOOD ELEMENTARY SCHOOL", slug: "pinewood" },
  { name: "POLK AVENUE ELEMENTARY SCHOOL", slug: "polkavenue" },
  { name: "ROCHELLE SCHOOL OF THE ARTS", slug: "rochelleschoolofarts" },
  { name: "R W BLAKE ACADEMY", slug: "rwblake" },
  { name: "SANDHILL ELEMENTARY SCHOOL", slug: "sandhill" },
  { name: "SCOTT LAKE ELEMENTARY SCHOOL", slug: "scottlake" },
  { name: "SLEEPY HILL ELEMENTARY SCHOOL", slug: "sleepyhillelementary" },
  { name: "SNIVELY ELEMENTARY SCHOOL", slug: "snively" },
  { name: "SOCRUM ELEMENTARY SCHOOL", slug: "socrum" },
  { name: "SOUTH CENTRAL ELEMENTARY SCHOOL", slug: "southcentral" },
  { name: "SOUTH POINTE ELEMENTARY SCHOOL", slug: "southpointe" },
  { name: "SOUTHWEST ELEMENTARY SCHOOL", slug: "southwest" },
  { name: "SPESSARD L HOLLAND ELEMENTARY", slug: "spessardholland" },
  { name: "STEPHENS ACADEMY", slug: "stephensacademy" },
  { name: "SUMMIT RIDGE MIDDLE SCHOOL", slug: "summitridge" },
  { name: "SWIFT CREEK MIDDLE SCHOOL", slug: "swiftcreek" },
  { name: "TED DANIELS ELEMENTARY SCHOOL", slug: "teddaniels" },
  { name: "VALLEYVIEW ELEMENTARY SCHOOL", slug: "valleyview" },
  { name: "WAHNETA ELEMENTARY SCHOOL", slug: "wahneta" },
  { name: "WALTER CALDWELL ELEMENTARY", slug: "waltercaldwell" },
  { name: "WENDELL WATSON ELEMENTARY", slug: "wendellwatson" },
  { name: "WESTWOOD ELEMENTARY SCHOOL", slug: "westwoodelementary" },
  { name: "WINSTON ACADEMY OF ENGINEERING", slug: "winstonacademy" },
  { name: "FLORAL AVENUE ELEM SCHOOL", slug: "floralavenue" },
  { name: "HARRISON SCHOOL FOR THE ARTS", slug: "harrisonarts" },
  { name: "SUMMERLIN ACADEMY", slug: "summerlinacademy" },
  { name: "TENOROC SENIOR HIGH", slug: "tenorochigh" },
  { name: "BOK ACADEMY", slug: "bokacademy" },
  { name: "DANIEL JENKINS ACADEMY OF TECHNOLOGY MIDDLE", slug: "danieljenkins" },
  { name: "COMPASS MIDDLE CHARTER SCHOOL", slug: "compassmiddle" },
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|high|school|center|academy|k-8|k8|magnet|charter|preparatory|prep|of|the|and|a|for|at)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wa = new Set(na.split(" ").filter((w) => w.length > 2));
  const wb = new Set(nb.split(" ").filter((w) => w.length > 2));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 ? inter / union : 0;
}

async function main() {
  const schoolUrls = POLK_SCHOOLS.map(({ name, slug }) => ({
    url: `https://${slug}.polkschoolsfl.com`,
    nameHint: name,
  }));

  const dbSchools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: "POLK", mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });
  console.log(`Polk schools without website: ${dbSchools.length}`);

  let updated = 0;
  const matched = new Set<string>();

  for (const db of dbSchools) {
    let best = "";
    let bestScore = 0;
    for (const { url, nameHint } of schoolUrls) {
      if (matched.has(url)) continue;
      const s = similarity(db.name, nameHint);
      if (s > bestScore) {
        bestScore = s;
        best = url;
      }
    }
    if (best && bestScore >= 0.55) {
      await (prisma as any).school.update({
        where: { id: db.id },
        data: { website: best },
      });
      matched.add(best);
      updated++;
    }
  }

  console.log(`✅ Polk: updated ${updated}`);
  const total = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`📊 Total with website: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
