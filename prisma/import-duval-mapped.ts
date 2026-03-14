/**
 * Duval County — direct name→URL mapping from browser nav menu
 * Bypasses Cloudflare by using known name→slug pairs
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const BASE = "https://www.duvalschools.org/o/";

// name → slug (from browser nav)
const NAME_SLUG: [string, string][] = [
  ["Abess Park", "apes"],
  ["Alden Road Exceptional Student Center", "aresc"],
  ["Alimacani", "aes"],
  ["Anchor Academy", "aaes"],
  ["Andrew A. Robinson", "aares"],
  ["Arlington Elementary", "ares"],
  ["Arlington Heights", "ahes"],
  ["Atlantic Beach", "abes"],
  ["Bartram Springs", "bses"],
  ["Bayview", "bes"],
  ["Beauclerc", "beaes"],
  ["Biltmore", "bies"],
  ["Biscayne", "bises"],
  ["Brookview", "bres"],
  ["Cedar Hills", "ches"],
  ["Central Riverside", "cres"],
  ["Chaffee Trail Elementary", "ctes"],
  ["Chets Creek", "cces"],
  ["Chimney Lakes", "cles"],
  ["Crown Point", "cpes"],
  ["Crystal Springs", "cses"],
  ["Dinsmore", "des"],
  ["Don Brewer", "dbes"],
  ["Duval Virtual", "dvms"],
  ["Englewood Elementary", "ees"],
  ["Enterprise Learning Academy", "elaes"],
  ["Fishweir", "fes"],
  ["Fort Caroline Elementary", "fces"],
  ["GRASP Academy", "grasp"],
  ["Garden City", "gces"],
  ["George W. Carver", "gwces"],
  ["Greenfield", "ges"],
  ["Greenland Pines", "gpes"],
  ["Gregory Drive", "gdes"],
  ["Hendricks Avenue", "haes"],
  ["Highlands Estates Academy", "hes"],
  ["Hidden Oaks", "hioes"],
  ["Hogan-Spring Glen", "hsges"],
  ["Holiday Hill", "hhes"],
  ["Hyde Grove", "hges"],
  ["Hyde Park", "hpes"],
  ["J. Allen Axson", "jaaes"],
  ["Jacksonville Beach", "jbes"],
  ["Jacksonville Heights", "jhes"],
  ["John E. Ford", "jefes"],
  ["John Love Early Learning Center", "jlelces"],
  ["John N. C. Stockton", "jncses"],
  ["Kernan Trail", "ktes"],
  ["Lake Lucina", "lles"],
  ["Lone Star", "lses"],
  ["Long Branch", "lbes"],
  ["Loretto", "les"],
  ["Louis Sheffield", "loses"],
  ["Love Grove", "lges"],
  ["Mamie Agnes Jones", "majes"],
  ["Mandarin Oaks", "moes"],
  ["Mattie V. Rutherford", "mrae"],
  ["Mayport Elementary", "mes"],
  ["Merrill Road", "mres"],
  ["Mt. Herman Exceptional Student Center", "hesc"],
  ["Neptune Beach", "nbes"],
  ["New Berlin", "nwes"],
  ["Normandy Village", "nves"],
  ["North Shore", "nses"],
  ["Northwestern Legends", "nles"],
  ["Oak Hill Academy", "ohas"],
  ["Oceanway Elementary", "oes"],
  ["Ortega", "otes"],
  ["Palm Avenue Exceptional Student Center", "phes"],
  ["Parkwood Heights", "pah"],
  ["Pickett", "pes"],
  ["Pine Forest", "pfes"],
  ["Pinedale", "pdes"],
  ["Ramona Boulevard", "rbes"],
  ["Reynolds Lane", "rles"],
  ["R. L. Brown", "rlbes"],
  ["Rufus E. Payne", "rep"],
  ["Ruth N. Upson", "rnu"],
  ["Rutledge H. Pearson", "rhp"],
  ["Sabal Palm", "spes"],
  ["Sadie T. Tillis", "stt"],
  ["Sallye B. Mathis", "sbm"],
  ["Samuel A. Hull", "shes"],
  ["San Jose", "sjes"],
  ["San Mateo", "smes"],
  ["San Pablo", "sp"],
  ["Seabreeze", "ses"],
  ["Southside Estates", "ste"],
  ["S. P. Livingston", "spl"],
  ["Spring Park", "spk"],
  ["Thomas Jefferson Elementary", "tjes"],
  ["Timucuan", "tes"],
  ["Twin Lakes Academy Elementary", "tlaes"],
  ["Venetia", "ves"],
  ["Waterleaf", "waes"],
  ["West Riverside", "wres"],
  ["Westview K-8", "wkes"],
  ["Whitehouse", "whes"],
  ["Woodland Acres", "woa"],
  // Middle
  ["Alfred I. duPont", "aims"],
  ["Arlington Middle", "ams"],
  ["Bridge to Success", "bsms"],
  ["Chaffee Trail Middle", "ctms"],
  ["Darnell-Cookman", "dchs"],
  ["Duncan Fletcher Middle", "dfms"],
  ["Fort Caroline Middle", "fc"],
  ["Highlands Middle", "hms"],
  ["Jacksonville STEM", "ymla"],
  ["James Weldon Johnson", "jwms"],
  ["Jean Ribault Middle", "jrms"],
  ["Julia Landon", "jlms"],
  ["Joseph Stilwell", "jsms"],
  ["Kernan Middle", "kms"],
  ["Lake Shore", "lsms"],
  ["Landmark", "lms"],
  ["LaVilla School of the Arts", "lavilla"],
  ["Mandarin Middle", "mms"],
  ["Matthew Gilbert", "mgms"],
  ["Mayport Coastal Sciences", "mcms"],
  ["Oceanway Middle", "oms"],
  ["Southside Middle", "sms"],
  ["Springfield", "spms"],
  ["Twin Lakes Academy Middle", "tlms"],
  ["Westside Middle", "wms"],
  // High
  ["Andrew Jackson High", "ajhs"],
  ["A. Philip Randolph", "prhs"],
  ["Atlantic Coast", "achs"],
  ["Baldwin High", "bhs"],
  ["Douglas Anderson", "dahs"],
  ["Duncan Fletcher High", "dfhs"],
  ["Edward H. White", "ewhs"],
  ["Englewood High", "ehs"],
  ["First Coast", "fchs"],
  ["Frank H. Peterson", "fhp"],
  ["Grand Park Center", "gpc"],
  ["Jean Ribault High", "jrhs"],
  ["Mandarin High", "mhs"],
  ["Marine Science Education Center", "msec"],
  ["Paxon School", "psa"],
  ["Riverside High", "rhs"],
  ["Samuel Wolfson", "swhs"],
  ["Sandalwood", "shs"],
  ["Stanton College Preparatory", "schs"],
  ["Terry Parker", "tphs"],
  ["Westside High", "wehs"],
  ["William M. Raines", "wmhs"],
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|academy|charter|magnet|center|k-8|k8|of|the|and|at|for|duval|county|exceptional|student|learning)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}
function similarity(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : inter / union;
}

async function main() {
  const schools = await p.school.findMany({
    where: { county: "Duval", website: null },
    select: { id: true, name: true },
  });
  console.log(`Duval schools without website: ${schools.length}`);

  let found = 0;
  for (const [navName, slug] of NAME_SLUG) {
    const url = `${BASE}${slug}`;
    const normNav = normalize(navName);
    let best = 0,
      bestSchool: any = null;
    for (const s of schools) {
      if (s.website) continue;
      const score = similarity(normalize(s.name), normNav);
      if (score > best) {
        best = score;
        bestSchool = s;
      }
    }
    if (bestSchool && best >= 0.35) {
      await p.school.update({
        where: { id: bestSchool.id },
        data: { website: url, websitePlatform: "Apptegy" },
      });
      console.log(`✅ ${bestSchool.name} → ${url} (${best.toFixed(2)})`);
      bestSchool.website = url;
      found++;
    }
  }

  console.log(`\n✅ Duval: ${found} updated`);
  await (prisma as any).$disconnect();
}
main().catch(console.error);
