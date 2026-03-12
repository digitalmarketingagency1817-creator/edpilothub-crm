/**
 * Import Lee and Brevard County school websites
 * Lee pattern: https://{3-letter-code}.leeschools.net
 * Brevard pattern: https://{slug}.brevardschools.org
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-lee-brevard-websites.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Lee County schools - from /schools page scrape (url|name format)
const LEE_PAIRS = `https://alp.leeschools.net|Allen Park Elementary School
https://ama.leeschools.net|Amanecer Elementary School
https://bay.leeschools.net|Bayshore School
https://bne.leeschools.net|Bonita Springs Elementary School
https://bnh.leeschools.net|Bonita Springs High School
https://bnm.leeschools.net|Bonita Springs Middle Center for the Arts
https://buc.leeschools.net|Buckingham Exceptional Student Center
https://coe.leeschools.net|Caloosa Elementary School
https://com.leeschools.net|Caloosa Middle School
https://cch.leeschools.net|Cape Coral High School
https://cap.leeschools.net|Cape Elementary School
https://chm.leeschools.net|Challenger Middle School
https://cnl.leeschools.net|Colonial Elementary School
https://cyh.leeschools.net|Cypress Lake High School
https://cym.leeschools.net|Cypress Lake Middle School
https://dpl.leeschools.net|Diplomat Elementary School
https://dpm.leeschools.net|Diplomat Middle School
https://lit.leeschools.net|Dr Carrie D Robinson Littleton Elementary School
https://dcs.leeschools.net|Dunbar Community School
https://dhs.leeschools.net|Dunbar High School
https://ewd.leeschools.net|Edgewood Academy
https://epe.leeschools.net|Edison Park Creative and Expressive Arts School
https://elc.leeschools.net|East Lee County High School
https://est.leeschools.net|Estero High School
https://bch.leeschools.net|Fort Myers Beach Elementary School
https://fmh.leeschools.net|Fort Myers High School
https://fmm.leeschools.net|Fort Myers Middle School
https://frk.leeschools.net|Franklin Park Elementary School
https://hpe.leeschools.net|G Weaver Hipps Elementary School
https://gty.leeschools.net|Gateway Elementary School
https://ghs.leeschools.net|Gateway High School
https://gme.leeschools.net|Green Meadow Elementary School
https://gfe.leeschools.net|Gulf Elementary School
https://gms.leeschools.net|Gulf Middle School
https://han.leeschools.net|Hancock Creek Elementary School
https://hme.leeschools.net|Harns Marsh Elementary School
https://hmm.leeschools.net|Harns Marsh Middle School
https://hac.leeschools.net|Hector A Cafferata Jr K-8 School
https://het.leeschools.net|Heights Elementary School
https://ibh.leeschools.net|Ida S Baker High School
https://ich.leeschools.net|Island Coast High School
https://jce.leeschools.net|J Colin English Elementary School
https://jsa.leeschools.net|James Stephens Community School
https://lvs.leeschools.net|Lee Virtual School
https://lhm.leeschools.net|Lehigh Acres Middle School
https://lhl.leeschools.net|Lehigh Elementary School
https://lsh.leeschools.net|Lehigh Senior High School
https://ltm.leeschools.net|Lemuel Teal Middle School
https://lxm.leeschools.net|Lexington Middle School
https://man.leeschools.net|Manatee Elementary School
https://mrh.leeschools.net|Mariner High School
https://mrm.leeschools.net|Mariner Middle School
https://mle.leeschools.net|Mirror Lakes Elementary School
https://nfa.leeschools.net|North Fort Myers Academy for the Arts
https://nfm.leeschools.net|North Fort Myers High School
https://ohm.leeschools.net|Oak Hammock Middle School
https://ore.leeschools.net|Orange River Elementary School
https://owd.leeschools.net|Orangewood Elementary School
https://pat.leeschools.net|Patriot Elementary School
https://dun.leeschools.net|Paul Laurence Dunbar Middle School
https://pel.leeschools.net|Pelican Elementary School
https://pie.leeschools.net|Pine Island Elementary School
https://pin.leeschools.net|Pinewoods Elementary School
https://rvp.leeschools.net|Ray V Pottorf Elementary School
https://rcp.leeschools.net|Rayma C Page Elementary School
https://rhe.leeschools.net|River Hall Elementary School
https://rdh.leeschools.net|Riverdale High School
https://roy.leeschools.net|Royal Palm Exceptional Center
https://sac.leeschools.net|San Carlos Park Elementary School
https://sky.leeschools.net|Skyline Elementary School
https://sfm.leeschools.net|South Fort Myers High School
https://spc.leeschools.net|Spring Creek Elementary School
https://sca.leeschools.net|Success Academy
https://sun.leeschools.net|Sunshine Elementary School
https://tan.leeschools.net|Tanglewood Elementary School
https://alv.leeschools.net|The Alva School
https://sbl.leeschools.net|The Sanibel School
https://oak.leeschools.net|Three Oaks Elementary School
https://okm.leeschools.net|Three Oaks Middle School
https://tic.leeschools.net|Tice Elementary School
https://tpe.leeschools.net|Tortuga Preserve Elementary School
https://tfe.leeschools.net|Trafalgar Elementary School
https://tfm.leeschools.net|Trafalgar Middle School
https://tre.leeschools.net|Treeline Elementary School
https://trp.leeschools.net|Tropic Isles Elementary School
https://vlm.leeschools.net|Varsity Lakes Middle School
https://vpa.leeschools.net|Veterans Park Academy for the Arts
https://vls.leeschools.net|Villas Elementary School`;

// Brevard County schools - verified via HTTP 200 checks
const BREVARD_SCHOOLS: Array<{ name: string; slug: string }> = [
  { name: "APOLLO ELEMENTARY SCHOOL", slug: "apollo" },
  { name: "ASTRONAUT HIGH SCHOOL", slug: "astronaut" },
  { name: "ATLANTIS ELEMENTARY SCHOOL", slug: "atlantis" },
  { name: "AUDUBON ELEMENTARY SCHOOL", slug: "audubon" },
  { name: "BAYSIDE HIGH SCHOOL", slug: "bayside" },
  { name: "CAMBRIDGE ELEMENTARY MAGNET SCHOOL", slug: "cambridge" },
  { name: "CAPE VIEW ELEMENTARY SCHOOL", slug: "capeview" },
  { name: "CENTRAL MIDDLE SCHOOL", slug: "central" },
  { name: "CHALLENGER 7 ELEMENTARY SCHOOL", slug: "challenger" },
  { name: "CHRISTA MCAULIFFE ELEMENTARY SCHOOL", slug: "mcauliffe" },
  { name: "COCOA HIGH SCHOOL", slug: "cocoa" },
  { name: "COLUMBIA ELEMENTARY SCHOOL", slug: "columbia" },
  { name: "COQUINA ELEMENTARY SCHOOL", slug: "coquina" },
  { name: "CROTON ELEMENTARY SCHOOL", slug: "croton" },
  { name: "DELAURA MIDDLE SCHOOL", slug: "delaura" },
  { name: "DISCOVERY ELEMENTARY SCHOOL", slug: "discovery" },
  { name: "EAU GALLIE HIGH SCHOOL", slug: "eaugallie" },
  { name: "EDGEWOOD JR SR HIGH SCHOOL", slug: "edgewood" },
  { name: "ENDEAVOUR ELEMENTARY SCHOOL", slug: "endeavour" },
  { name: "ENTERPRISE ELEMENTARY SCHOOL", slug: "enterprise" },
  { name: "FAIRGLEN ELEMENTARY SCHOOL", slug: "fairglen" },
  { name: "GEMINI ELEMENTARY SCHOOL", slug: "gemini" },
  { name: "GOLFVIEW ELEMENTARY MAGNET SCHOOL", slug: "golfview" },
  { name: "HARBOR CITY ELEMENTARY SCHOOL", slug: "harborcity" },
  { name: "HERBERT C HOOVER MIDDLE SCHOOL", slug: "hoover" },
  { name: "HERITAGE HIGH SCHOOL", slug: "heritage" },
  { name: "IMPERIAL ESTATES ELEMENTARY SCHOOL", slug: "imperial" },
  { name: "INDIALANTIC ELEMENTARY SCHOOL", slug: "indialantic" },
  { name: "ANDREW JACKSON MIDDLE SCHOOL", slug: "jackson" },
  { name: "JOHN F KENNEDY MIDDLE SCHOOL", slug: "kennedy" },
  { name: "JUPITER ELEMENTARY SCHOOL", slug: "jupiter" },
  { name: "LOCKMAR ELEMENTARY SCHOOL", slug: "lockmar" },
  { name: "LONGLEAF ELEMENTARY SCHOOL", slug: "longleaf" },
  { name: "MANATEE ELEMENTARY SCHOOL", slug: "manatee" },
  { name: "MEADOWLANE INTERMEDIATE ELEMENTARY SCHOOL", slug: "meadowlane" },
  { name: "MEADOWLANE PRIMARY ELEMENTARY SCHOOL", slug: "meadowlane" },
  { name: "MELBOURNE SENIOR HIGH SCHOOL", slug: "melbourne" },
  { name: "MILA ELEMENTARY SCHOOL", slug: "mila" },
  { name: "MIMS ELEMENTARY SCHOOL", slug: "mims" },
  { name: "OAK PARK ELEMENTARY SCHOOL", slug: "oakpark" },
  { name: "PINEWOOD ELEMENTARY SCHOOL", slug: "pinewood" },
  { name: "PORT MALABAR ELEMENTARY SCHOOL", slug: "portmalabar" },
  { name: "QUEST ELEMENTARY SCHOOL", slug: "quest" },
  { name: "RIVIERA ELEMENTARY SCHOOL", slug: "riviera" },
  { name: "ROCKLEDGE SENIOR HIGH SCHOOL", slug: "rockledge" },
  { name: "SABAL ELEMENTARY SCHOOL", slug: "sabal" },
  { name: "SATELLITE SENIOR HIGH SCHOOL", slug: "satellite" },
  { name: "SATURN ELEMENTARY SCHOOL", slug: "saturn" },
  { name: "SEA PARK ELEMENTARY SCHOOL", slug: "seapark" },
  { name: "SHERWOOD ELEMENTARY SCHOOL", slug: "sherwood" },
  { name: "SOUTH LAKE ELEMENTARY", slug: "southlake" },
  { name: "SOUTHWEST MIDDLE SCHOOL", slug: "southwest" },
  { name: "SPACE COAST JUNIOR SENIOR HIGH SCHOOL", slug: "spacecoast" },
  { name: "STONE MAGNET MIDDLE SCHOOL", slug: "stone" },
  { name: "SUNRISE ELEMENTARY SCHOOL", slug: "sunrise" },
  { name: "SUNTREE ELEMENTARY SCHOOL", slug: "suntree" },
  { name: "SURFSIDE ELEMENTARY SCHOOL", slug: "surfside" },
  { name: "TITUSVILLE HIGH SCHOOL", slug: "titusville" },
  { name: "TROPICAL ELEMENTARY SCHOOL", slug: "tropical" },
  { name: "VIERA HIGH SCHOOL", slug: "vierahigh" },
  { name: "VIERA ELEMENTARY SCHOOL", slug: "viera" },
  { name: "WEST SHORE JUNIOR SENIOR HIGH SCHOOL", slug: "westshore" },
  { name: "WESTSIDE ELEMENTARY SCHOOL", slug: "westside" },
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|junior|high|school|center|academy|k-8|k8|magnet|charter|preparatory|prep|jr|sr|of|the|and|a|for|at|park)\b/g,
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

async function importDistrict(
  districtName: string,
  schools: Array<{ nameHint: string; url: string }>,
  minScore = 0.5
) {
  const dbSchools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: districtName, mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });
  console.log(`${districtName} schools without website: ${dbSchools.length}`);

  let updated = 0;
  const matched = new Set<string>();

  for (const db of dbSchools) {
    let best = "";
    let bestScore = 0;
    for (const { url, nameHint } of schools) {
      if (matched.has(url)) continue;
      const s = similarity(db.name, nameHint);
      if (s > bestScore) {
        bestScore = s;
        best = url;
      }
    }
    if (best && bestScore >= minScore) {
      await (prisma as any).school.update({
        where: { id: db.id },
        data: { website: best },
      });
      matched.add(best);
      updated++;
    }
  }

  console.log(`✅ ${districtName}: updated ${updated}`);
  return updated;
}

async function main() {
  // Parse Lee pairs
  const leeSchools = LEE_PAIRS.split("\n")
    .filter(Boolean)
    .map((line) => {
      const [url, nameHint] = line.split("|");
      return { url, nameHint };
    });

  const brevardSchools = BREVARD_SCHOOLS.map(({ name, slug }) => ({
    url: `https://${slug}.brevardschools.org`,
    nameHint: name,
  }));

  await importDistrict("LEE", leeSchools, 0.45);
  await importDistrict("BREVARD", brevardSchools, 0.45);

  const total = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`📊 Total with website: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
