/**
 * Duval County — Apptegy: duvalschools.org/o/{slug}
 * All slugs extracted from browser navigation menu
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const PLATFORM_SIGS: [string, string][] = [
  ["finalsite", "Finalsite"],
  ["schoolwires", "Blackboard"],
  ["blackboard.com", "Blackboard"],
  ["edlio", "Edlio"],
  ["apptegy", "Apptegy"],
  ["thrillshare", "Apptegy"],
  ["wp-content", "WordPress"],
  ["wp-includes", "WordPress"],
  ["wixsite.com", "Wix"],
  ["squarespace.com", "Squarespace"],
  ["drupal.js", "Drupal"],
  ["schoolmessenger", "SchoolMessenger"],
  ["powerschool", "PowerSchool"],
  ["smartsites", "SmartSites"],
  ["parentsquare", "SmartSites"],
];
function detectPlatform(html: string): string {
  const h = html.toLowerCase();
  for (const [sig, name] of PLATFORM_SIGS) if (h.includes(sig)) return name;
  return "Unknown";
}

const ALL_SLUGS = [
  // Elementary
  "apes",
  "aresc",
  "aes",
  "aaes",
  "aares",
  "ares",
  "ahes",
  "abes",
  "bses",
  "bes",
  "beaes",
  "bies",
  "bises",
  "bres",
  "ches",
  "cres",
  "ctes",
  "cces",
  "cles",
  "cpes",
  "cses",
  "des",
  "dbes",
  "ees",
  "elaes",
  "fes",
  "fces",
  "grasp",
  "gces",
  "gwces",
  "ges",
  "gpes",
  "gdes",
  "haes",
  "hes",
  "hioes",
  "hsges",
  "hhes",
  "hges",
  "hpes",
  "jaaes",
  "jbes",
  "jhes",
  "jefes",
  "jlelces",
  "jncses",
  "ktes",
  "lles",
  "lses",
  "lbes",
  "les",
  "loses",
  "lges",
  "majes",
  "moes",
  "mrae",
  "mes",
  "mres",
  "hesc",
  "nbes",
  "nwes",
  "nves",
  "nses",
  "nles",
  "ohas",
  "oes",
  "otes",
  "phes",
  "pah",
  "pes",
  "pfes",
  "pdes",
  "rbes",
  "rles",
  "rlbes",
  "rep",
  "rnu",
  "rhp",
  "spes",
  "stt",
  "sbm",
  "shes",
  "sjes",
  "smes",
  "sp",
  "ses",
  "ste",
  "spl",
  "spk",
  "tjes",
  "tes",
  "tlaes",
  "ves",
  "waes",
  "wres",
  "wkes",
  "whes",
  "woa",
  // Middle
  "aims",
  "ams",
  "bsms",
  "ctms",
  "dchs",
  "dfms",
  "dvms",
  "fc",
  "hms",
  "ymla",
  "jwms",
  "jrms",
  "jlms",
  "jsms",
  "kms",
  "lsms",
  "lms",
  "lavilla",
  "mms",
  "mgms",
  "mcms",
  "oms",
  "sms",
  "spms",
  "tlms",
  "wms",
  // High
  "ajhs",
  "prhs",
  "achs",
  "bhs",
  "bshs",
  "dahs",
  "dfhs",
  "ewhs",
  "ehs",
  "fchs",
  "fhp",
  "gpc",
  "jrhs",
  "mhs",
  "msec",
  "psa",
  "rhs",
  "swhs",
  "shs",
  "schs",
  "tphs",
  "wehs",
  "wmhs",
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|academy|charter|magnet|center|k-8|k8|of|the|and|at|for|duval|county|exceptional|student|arts|sciences)\b/g,
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

async function fetchPage(url: string): Promise<{ title: string; html: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<title>([^<]+)<\/title>/i);
    const title = m
      ? m[1]
          .replace(/\s*[-|–|·|–].*$/, "")
          .replace(/Duval County.*$/i, "")
          .trim()
      : "";
    return { title, html };
  } catch {
    return null;
  }
}

async function main() {
  const schools = await p.school.findMany({
    where: { county: "Duval", website: null },
    select: { id: true, name: true },
  });
  console.log(`Duval schools without website: ${schools.length}`);

  const urls = ALL_SLUGS.map((s) => `https://www.duvalschools.org/o/${s}`);
  let found = 0;
  const BATCH = 10;

  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (url) => {
        const result = await fetchPage(url);
        if (!result || !result.title || result.title.length < 3) return;

        const normTitle = normalize(result.title);
        if (!normTitle || normTitle.length < 2) return;

        let best = 0,
          bestSchool: any = null;
        for (const s of schools) {
          if (s.website) continue;
          const score = similarity(normalize(s.name), normTitle);
          if (score > best) {
            best = score;
            bestSchool = s;
          }
        }

        if (bestSchool && best >= 0.35) {
          const platform = detectPlatform(result.html);
          await p.school.update({
            where: { id: bestSchool.id },
            data: { website: url, websitePlatform: platform },
          });
          console.log(`✅ ${bestSchool.name} → ${url} [${platform}] (${best.toFixed(2)})`);
          bestSchool.website = url;
          found++;
        }
      })
    );
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\n✅ Duval: ${found} updated`);
  await (prisma as any).$disconnect();
}
main().catch(console.error);
