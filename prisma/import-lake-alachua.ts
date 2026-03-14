import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const PLAT = [
  { p: "Finalsite", k: ["finalsite"] },
  { p: "Blackboard", k: ["schoolwires", "blackboard.com"] },
  { p: "Edlio", k: ["edlio"] },
  { p: "Apptegy", k: ["apptegy", "thrillshare"] },
  { p: "WordPress", k: ["wp-content", "wp-includes"] },
  { p: "SchoolMessenger", k: ["schoolmessenger"] },
];
function det(h: string) {
  const hl = h.toLowerCase();
  for (const { p, k } of PLAT) if (k.some((x) => hl.includes(x))) return p;
  return "Unknown";
}
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|charter|magnet|academy|k-8|k8|center|technical|community|preparatory|prep|of|and|the|at|for|a|an|county)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}
function sim(a: string, b: string) {
  const na = norm(a),
    nb = norm(b);
  if (na === nb) return 1;
  const wa = new Set(na.split(" ").filter(Boolean)),
    wb = new Set(nb.split(" ").filter(Boolean));
  const i = [...wa].filter((w) => wb.has(w)).length;
  const u = new Set([...wa, ...wb]).size;
  return u === 0 ? 0 : i / u;
}
async function fetch2(url: string) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!r.ok) return null;
    const html = await r.text();
    if (html.length < 800) return null;
    const t = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || "";
    const h1 = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1]?.trim() || "";
    return { html, t, h1 };
  } catch {
    return null;
  }
}

async function importCodes(county: string, domain: string, codes: string[], schools: any[]) {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`🏫 ${county} (${domain}): ${codes.length} codes`);
  const sc = schools.filter((s: any) => s.county === county && !s.website);
  console.log(`   Missing: ${sc.length}`);
  let found = 0;
  for (let i = 0; i < codes.length; i += 10) {
    const batch = codes.slice(i, i + 10);
    await Promise.all(
      batch.map(async (code) => {
        const url = `https://www.${domain}/o/${code}`;
        const d = await fetch2(url);
        if (!d) return;
        for (const name of [d.t, d.h1].filter(Boolean)) {
          let best: any = null,
            bs = 0;
          for (const s of sc) {
            if (s.website) continue;
            const score = sim(name, s.name);
            if (score > bs && score >= 0.4) {
              bs = score;
              best = s;
            }
          }
          if (best) {
            const plat = det(d.html);
            await p.school.update({
              where: { id: best.id },
              data: { website: url, websitePlatform: plat },
            });
            best.website = url;
            console.log(`  ✅ ${best.name} → /o/${code} [${plat}] (${bs.toFixed(2)})`);
            found++;
            break;
          }
        }
      })
    );
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`  → Found: ${found}`);
  return found;
}

async function main() {
  const all = await p.school.findMany({
    select: { id: true, name: true, county: true, website: true },
  });
  const start = await p.school.count({ where: { website: { not: null } } });
  console.log(`📊 Starting: ${start}/4146`);

  const LAKE = [
    "ae",
    "alhs",
    "amcaes",
    "bse",
    "cegms",
    "cms",
    "cres",
    "ees",
    "ehes",
    "ehs",
    "ems",
    "erh",
    "erm",
    "fpes",
    "ges",
    "gles",
    "lcs",
    "les",
    "lhe",
    "lhs",
    "lles",
    "lmh",
    "lpaes",
    "lpec",
    "lsa",
    "lse",
    "lves",
    "mdh",
    "mdm",
    "mha",
    "moe",
    "mse",
    "opm",
    "pres",
    "relc",
    "rle",
    "sbes",
    "sce",
    "ses",
    "slh",
    "sses",
    "taes",
    "ths",
    "tms",
    "tres",
    "twes",
    "ues",
    "umh",
    "ums",
    "vell",
    "whm",
  ];
  const ALACHUA = [
    "acps",
    "alachua",
    "aquinn",
    "archer",
    "bishop",
    "buchholz",
    "camp-crystal",
    "chiles",
    "duval",
    "eastside",
    "eschool",
    "fort-clarke",
    "foster",
    "ghs",
    "glensprings",
    "hawthorne",
    "hiddenoak",
    "highsprings",
    "idylwild",
    "irby",
    "kanapaha",
    "lakeforest",
    "lanier",
    "lincoln",
    "littlewood",
    "meadowbrook",
    "mebane",
    "metcalfe",
    "newberry-high",
    "newberryes",
    "norton",
    "oak-view",
    "oakview",
    "pamloften",
    "parker",
    "rawlings",
    "santa-fe",
    "shell",
    "talbot",
    "terwilliger",
    "westwood",
    "wiles",
    "williams",
  ];

  await importCodes("Lake", "lake.k12.fl.us", LAKE, all);
  await importCodes("Alachua", "sbac.edu", ALACHUA, all);

  const end = await p.school.count({ where: { website: { not: null } } });
  console.log(`\n📊 DONE: ${end}/4146 (+${end - start})`);
}
main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
