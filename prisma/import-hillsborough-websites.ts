/**
 * Import Hillsborough County school websites
 * Pattern: https://www.hillsboroughschools.org/o/{slug}
 * Slug = first meaningful word(s) of school name, lowercased
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-hillsborough-websites.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Known Hillsborough school slugs from research
const HCPS_SCHOOLS: Array<{ name: string; slug: string }> = [
  // High Schools
  { name: "Alonso High School", slug: "alonso" },
  { name: "Armwood High School", slug: "armwood" },
  { name: "Blake High School", slug: "blake" },
  { name: "Bloomingdale High School", slug: "bloomingdale" },
  { name: "Brandon High School", slug: "brandon" },
  { name: "Chamberlain High School", slug: "chamberlain" },
  { name: "Durant High School", slug: "durant" },
  { name: "East Bay High School", slug: "eastbay" },
  { name: "Freedom High School", slug: "freedom" },
  { name: "Gaither High School", slug: "gaither" },
  { name: "Hillsborough High School", slug: "hillsborough" },
  { name: "Jefferson High School", slug: "jefferson" },
  { name: "King High School", slug: "king" },
  { name: "Lennard High School", slug: "lennard" },
  { name: "Leto High School", slug: "leto" },
  { name: "Middleton High School", slug: "middleton" },
  { name: "Newsome High School", slug: "newsome" },
  { name: "Plant High School", slug: "plant" },
  { name: "Plant City High School", slug: "plantcity" },
  { name: "Riverview High School", slug: "riverview" },
  { name: "Robinson High School", slug: "robinson" },
  { name: "Sickles High School", slug: "sickles" },
  { name: "Spoto High School", slug: "spoto" },
  { name: "Steinbrenner High School", slug: "steinbrenner" },
  { name: "Strawberry Crest High School", slug: "strawberrycrest" },
  { name: "Sumner High School", slug: "sumner" },
  { name: "Tampa Bay Technical High School", slug: "tampabaytechnical" },
  { name: "Wharton High School", slug: "wharton" },
  // Middle Schools
  { name: "Adams Middle School", slug: "adams" },
  { name: "Barrington Middle School", slug: "barrington" },
  { name: "Benito Middle School", slug: "benito" },
  { name: "Buchanan Middle School", slug: "buchanan" },
  { name: "Burnett Middle School", slug: "burnett" },
  { name: "Burns Middle School", slug: "burns" },
  { name: "Coleman Middle School", slug: "coleman" },
  { name: "Davidsen Middle School", slug: "davidsen" },
  { name: "Dowdell Middle School", slug: "dowdell" },
  { name: "Eisenhower Middle School", slug: "eisenhower" },
  { name: "Farnell Middle School", slug: "farnell" },
  { name: "Giunta Middle School", slug: "giunta" },
  { name: "Greco Middle School", slug: "greco" },
  { name: "Hill Middle School", slug: "hill" },
  { name: "Jennings Middle School", slug: "jennings" },
  { name: "Liberty Middle School", slug: "liberty" },
  { name: "Madison Middle School", slug: "madison" },
  { name: "Mann Middle School", slug: "mann" },
  { name: "Martinez Middle School", slug: "martinez" },
  { name: "Memorial Middle School", slug: "memorial" },
  { name: "Monroe Middle School", slug: "monroe" },
  { name: "Mulrennan Middle School", slug: "mulrennan" },
  { name: "Pierce Middle School", slug: "pierce" },
  { name: "Randall Middle School", slug: "randall" },
  { name: "Turkey Creek Middle School", slug: "turkeycreek" },
  { name: "Walker Middle Magnet School", slug: "walker" },
  { name: "Webb Middle School", slug: "webb" },
  { name: "Wilson Middle School", slug: "wilson" },
  { name: "Young Middle Magnet School", slug: "young" },
  // Elementary Schools
  { name: "Alafia Elementary", slug: "alafia" },
  { name: "Alexander Elementary", slug: "alexander" },
  { name: "Anderson Elementary", slug: "anderson" },
  { name: "Bailey Elementary", slug: "bailey" },
  { name: "Ballast Point Elementary", slug: "ballastpoint" },
  { name: "Bay Crest Elementary", slug: "baycrest" },
  { name: "Bellamy Elementary", slug: "bellamy" },
  { name: "Bevis Elementary", slug: "bevis" },
  { name: "Boyette Springs Elementary", slug: "boyettesprings" },
  { name: "Brooker Elementary", slug: "brooker" },
  { name: "Broward Elementary", slug: "broward" },
  { name: "Bryan Elementary", slug: "bryan" },
  { name: "Chiles Elementary", slug: "chiles" },
  { name: "Clark Elementary", slug: "clark" },
  { name: "Cypress Creek Elementary", slug: "cypresscreek" },
  { name: "Deer Park Elementary", slug: "deerpark" },
  { name: "Dover Elementary", slug: "dover" },
  { name: "Dunbar Elementary", slug: "dunbar" },
  { name: "Edison Elementary", slug: "edison" },
  { name: "Egypt Lake Elementary", slug: "egyptlake" },
  { name: "Essrig Elementary", slug: "essrig" },
  { name: "Fishhawk Creek Elementary", slug: "fishhawkcreek" },
  { name: "Folsom Elementary", slug: "folsom" },
  { name: "Forest Hills Elementary", slug: "foresthills" },
  { name: "Foster Elementary", slug: "foster" },
  { name: "Frost Elementary", slug: "frost" },
  { name: "Gibsonton Elementary", slug: "gibsonton" },
  { name: "Gorrie Elementary", slug: "gorrie" },
  { name: "Grady Elementary", slug: "grady" },
  { name: "Graham Elementary", slug: "graham" },
  { name: "Hammond Elementary", slug: "hammond" },
  { name: "Heritage Elementary", slug: "heritage" },
  { name: "Hunters Green Elementary", slug: "huntersgreen" },
  { name: "Ippolito Elementary", slug: "ippolito" },
  { name: "Kenly Elementary", slug: "kenly" },
  { name: "Kingswood Elementary", slug: "kingswood" },
  { name: "Knights Elementary", slug: "knights" },
  { name: "Lake Magdalene Elementary", slug: "lakemagdalene" },
  { name: "Lamb Elementary", slug: "lamb" },
  { name: "Lanier Elementary", slug: "lanier" },
  { name: "Lewis Elementary", slug: "lewis" },
  { name: "Limona Elementary", slug: "limona" },
  { name: "Lincoln Elementary", slug: "lincoln" },
  { name: "Lithia Springs Elementary", slug: "lithiasprings" },
  { name: "Lomax Elementary", slug: "lomax" },
  { name: "Lopez Elementary", slug: "lopez" },
  { name: "Lowry Elementary", slug: "lowry" },
  { name: "Mabry Elementary", slug: "mabry" },
  { name: "Macfarlane Park Elementary", slug: "macfarlanepark" },
  { name: "Mango Elementary", slug: "mango" },
  { name: "Mckitrick Elementary", slug: "mckitrick" },
  { name: "Mendenhall Elementary", slug: "mendenhall" },
  { name: "Miles Elementary", slug: "miles" },
  { name: "Mitchell Elementary", slug: "mitchell" },
  { name: "Morgan Woods Elementary", slug: "morganwoods" },
  { name: "Mort Elementary", slug: "mort" },
  { name: "Nelson Elementary", slug: "nelson" },
  { name: "Northwest Elementary", slug: "northwest" },
  { name: "Oak Grove Elementary", slug: "oakgrove" },
  { name: "Oak Park Elementary", slug: "oakpark" },
  { name: "Palm River Elementary", slug: "palmriver" },
  { name: "Pinecrest Elementary", slug: "pinecrest" },
  { name: "Potter Elementary", slug: "potter" },
  { name: "Reddick Elementary", slug: "reddick" },
  { name: "Robinson Elementary", slug: "robinson-es" },
  { name: "Roosevelt Elementary", slug: "roosevelt" },
  { name: "Schwarzkopf Elementary", slug: "schwarzkopf" },
  { name: "Seffner Elementary", slug: "seffner" },
  { name: "Stowers Elementary", slug: "stowers" },
  { name: "Tampa Palms Elementary", slug: "tampapalms" },
  { name: "Temple Terrace Elementary", slug: "templeterrace" },
  { name: "Trapnell Elementary", slug: "trapnell" },
  { name: "Valrico Elementary", slug: "valrico" },
  { name: "Westchase Elementary", slug: "westchase" },
  { name: "Yates Elementary", slug: "yates" },
  { name: "Apollo Beach K-8", slug: "apollobeach" },
  { name: "Lutz K-8", slug: "lutz" },
  { name: "Pizzo K-8", slug: "pizzo" },
  { name: "Washington Elementary", slug: "washington" },
  { name: "Bing Elementary", slug: "bing" },
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|high|school|center|academy|k-8|k8|magnet|charter|preparatory|prep)\b/g,
      ""
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
  const schoolUrls = HCPS_SCHOOLS.map(({ name, slug }) => ({
    url: `https://www.hillsboroughschools.org/o/${slug}`,
    nameHint: name,
  }));

  const dbSchools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: "HILLSBOROUGH", mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });
  console.log(`Hillsborough schools without website: ${dbSchools.length}`);

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
    if (best && bestScore >= 0.6) {
      await (prisma as any).school.update({
        where: { id: db.id },
        data: { website: best },
      });
      matched.add(best);
      updated++;
    }
  }

  console.log(`✅ Hillsborough: updated ${updated}`);
  const total = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`📊 Total with website: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
