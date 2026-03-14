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
      /\b(elementary|middle|high|school|senior|junior|charter|magnet|academy|k-8|k8|center|technical|community|preparatory|prep|of|and|the|at|for|a|an|county|district)\b/g,
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
  for (let i = 0; i < codes.length; i += 8) {
    const batch = codes.slice(i, i + 8);
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

  const NASSAU = [
    "bes",
    "ces",
    "cis",
    "cms",
    "elhes",
    "fbhs",
    "fbms",
    "hes",
    "hmshs",
    "nccs",
    "nvs",
    "ses",
    "wes",
  ];
  await importCodes("Nassau", "nassau.k12.fl.us", NASSAU, all);

  // Seminole SmartSites - try probing school pages by slug
  console.log(`\n${"═".repeat(50)}`);
  console.log("🏫 Seminole (scps.k12.fl.us) - SmartSites platform");
  const semSchools = all.filter((s: any) => s.county === "Seminole" && !s.website);
  console.log(`   Missing: ${semSchools.length}`);
  // SmartSites uses /page/ paths - try common school page paths
  const slugify = (n: string) =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, "-")
      .trim();
  const SKIP2 = new Set([
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
  ]);
  const slugSig = (n: string) =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length > 1 && !SKIP2.has(w))
      .join("-");
  let found = 0;
  for (const school of semSchools) {
    const slugs = [...new Set([slugify(school.name), slugSig(school.name)])].filter(
      (s: string) => s.length >= 3
    );
    for (const slug of slugs) {
      const url = `https://www.scps.k12.fl.us/${slug}`;
      const d = await fetch2(url);
      if (!d) continue;
      const score = Math.max(sim(d.t, school.name), sim(d.h1, school.name));
      if (score >= 0.4) {
        const plat = det(d.html);
        await p.school.update({
          where: { id: school.id },
          data: { website: url, websitePlatform: plat },
        });
        school.website = url;
        console.log(`  ✅ ${school.name} → ${url} [${plat}] (${score.toFixed(2)})`);
        found++;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  console.log(`  Seminole found: ${found}`);

  const end = await p.school.count({ where: { website: { not: null } } });
  console.log(`\n📊 DONE: ${end}/4146 (+${end - start})`);
}
main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
