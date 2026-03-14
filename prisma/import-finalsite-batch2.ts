/**
 * Import: Monroe, Okaloosa, Indian River, Bay (Finalsite /o/{code})
 * + Walton, Sarasota, Manatee (Apptegy - try /o/ slugs)
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const PLAT_SIGS = [
  { p: "Finalsite", k: ["finalsite"] },
  { p: "Blackboard", k: ["schoolwires", "blackboard.com"] },
  { p: "Edlio", k: ["edlio"] },
  { p: "Apptegy", k: ["apptegy", "thrillshare"] },
  { p: "WordPress", k: ["wp-content", "wp-includes"] },
  { p: "SchoolMessenger", k: ["schoolmessenger"] },
];
function detectPlatform(h: string) {
  const hl = h.toLowerCase();
  for (const { p, k } of PLAT_SIGS) if (k.some((x) => hl.includes(x))) return p;
  return "Unknown";
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|charter|magnet|academy|k-8|k8|center|technical|community|preparatory|prep|of|and|the|at|for|a|an)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}
function sim(a: string, b: string) {
  const na = normalize(a),
    nb = normalize(b);
  if (na === nb) return 1;
  const wa = new Set(na.split(" ").filter(Boolean)),
    wb = new Set(nb.split(" ").filter(Boolean));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : inter / union;
}

async function fetchPage(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 800) return null;
    const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || "";
    const h1 = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1]?.trim() || "";
    return { html, title, h1 };
  } catch {
    return null;
  }
}

async function importCodes(county: string, domain: string, codes: string[], schools: any[]) {
  console.log(`\n${"═".repeat(55)}`);
  console.log(`🏫 ${county}: ${codes.length} codes → ${domain}`);
  const sc = schools.filter((s: any) => s.county === county && !s.website);
  console.log(`   Missing: ${sc.length}`);
  let found = 0;
  for (let i = 0; i < codes.length; i += 10) {
    const batch = codes.slice(i, i + 10);
    await Promise.all(
      batch.map(async (code) => {
        const url = `https://www.${domain}/o/${code}`;
        const data = await fetchPage(url);
        if (!data) return;
        // Try matching title AND h1
        for (const name of [data.title, data.h1].filter(Boolean)) {
          let best: any = null,
            bestS = 0;
          for (const s of sc) {
            if (s.website) continue;
            const score = sim(name, s.name);
            if (score > bestS && score >= 0.4) {
              bestS = score;
              best = s;
            }
          }
          if (best) {
            const plat = detectPlatform(data.html);
            await p.school.update({
              where: { id: best.id },
              data: { website: url, websitePlatform: plat },
            });
            best.website = url;
            console.log(`  ✅ ${best.name} → /o/${code} [${plat}] (${bestS.toFixed(2)})`);
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

function slugify(n: string) {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, "-")
    .trim();
}
const SKIP = new Set([
  "elementary",
  "middle",
  "high",
  "school",
  "senior",
  "junior",
  "charter",
  "magnet",
  "academy",
  "of",
  "and",
  "the",
  "at",
  "for",
  "a",
  "an",
  "center",
  "technical",
  "community",
  "preparatory",
]);
function slugSig(n: string) {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !SKIP.has(w))
    .join("-");
}

async function probeFinalsiteBySlug(county: string, domain: string, schools: any[]) {
  console.log(`\n${"═".repeat(55)}`);
  console.log(`🏫 ${county} (Finalsite slug probe): ${domain}`);
  const sc = schools.filter((s: any) => s.county === county && !s.website);
  console.log(`   Missing: ${sc.length}`);
  let found = 0;
  for (const school of sc) {
    if (school.website) continue;
    const slugs = [
      ...new Set([slugify(school.name), slugSig(school.name)].filter((s) => s.length >= 3)),
    ];
    for (const slug of slugs) {
      const url = `https://www.${domain}/o/${slug}`;
      const data = await fetchPage(url);
      if (!data) continue;
      const score = Math.max(sim(data.title, school.name), sim(data.h1, school.name));
      if (score >= 0.4) {
        const plat = detectPlatform(data.html);
        await p.school.update({
          where: { id: school.id },
          data: { website: url, websitePlatform: plat },
        });
        school.website = url;
        console.log(`  ✅ ${school.name} → /o/${slug} [${plat}] (${score.toFixed(2)})`);
        found++;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
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

  const MONROE_CODES = [
    "cshs",
    "gaes",
    "hobs",
    "kls",
    "kwhs",
    "mcs",
    "mmhs",
    "pes",
    "pks",
    "sls",
    "sses",
  ];
  const OKALOOSA_CODES = [
    "antioch",
    "baker",
    "bluewater",
    "bobsikes",
    "bruner",
    "choctaw",
    "collegiate",
    "crestview",
    "davidson",
    "destines",
    "destinms",
    "edge",
    "edwins",
    "eglin",
    "elliottpoint",
    "florosa",
    "fwb",
    "kenwood",
    "laurelhill",
    "lewis",
    "lizajackson",
    "longwood",
    "maryesther",
    "meigs",
    "niceville",
    "northwood",
    "nwfba",
    "oa",
    "opsf",
    "otc",
    "pineview",
    "plew",
    "pryor",
    "richbourg",
    "riverside",
    "ruckel",
    "shalimar",
    "shoalriver",
    "silversands",
    "southside",
    "stemm",
    "walker",
    "wright",
  ];
  const IR_CODES = [
    "ace",
    "bes",
    "ces",
    "des",
    "fes",
    "ges",
    "gms",
    "lmes",
    "omes",
    "oms",
    "pie",
    "rmes",
    "ses",
    "sgms",
    "srhs",
    "srms",
    "tce",
    "tctc",
    "vbe",
    "vbhs",
    "virtual",
    "ws",
  ];

  await importCodes("Monroe", "keysschools.com", MONROE_CODES, all);
  await importCodes("Okaloosa", "okaloosaschools.com", OKALOOSA_CODES, all);
  await importCodes("Indian River", "indianriverschools.org", IR_CODES, all);

  // Bay uses Finalsite too (HTTP 200 on /o/)
  await probeFinalsiteBySlug("Bay", "bay.k12.fl.us", all);
  // Walton, Sarasota, Manatee — Apptegy pattern (similar /o/ with slugs)
  await probeFinalsiteBySlug("Walton", "walton.k12.fl.us", all);
  await probeFinalsiteBySlug("Sarasota", "sarasotacountyschools.net", all);
  await probeFinalsiteBySlug("Manatee", "manateeschools.net", all);

  const end = await p.school.count({ where: { website: { not: null } } });
  console.log(`\n📊 DONE: ${end}/4146 (+${end - start})`);
}
main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
