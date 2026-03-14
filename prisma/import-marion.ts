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
      /\b(elementary|middle|high|school|senior|junior|charter|magnet|academy|k-8|k8|center|technical|community|preparatory|prep|of|and|the|at|for|a|an)\b/g,
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

const MARION_URLS = [
  "https://aye.marionschools.net/",
  "https://bhs.marionschools.net/",
  "https://bms.marionschools.net/",
  "https://bse.marionschools.net/",
  "https://bve.marionschools.net/",
  "https://bwa.marionschools.net/",
  "https://cpe.marionschools.net/",
  "https://cte.marionschools.net/",
  "https://dhs.marionschools.net/",
  "https://dms.marionschools.net/",
  "https://dne.marionschools.net/",
  "https://eme.marionschools.net/",
  "https://ems.marionschools.net/",
  "https://ese.marionschools.net/",
  "https://fde.marionschools.net/",
  "https://fel.marionschools.net/",
  "https://fhs.marionschools.net/",
  "https://fkm.marionschools.net/",
  "https://fms.marionschools.net/",
  "https://gwe.marionschools.net/",
  "https://ham.marionschools.net/",
  "https://hbe.marionschools.net/",
  "https://hce.marionschools.net/",
  "https://hms.marionschools.net/",
  "https://hve.marionschools.net/",
  "https://les.marionschools.net/",
  "https://lms.marionschools.net/",
  "https://lwh.marionschools.net/",
  "https://lwm.marionschools.net/",
  "https://moe.marionschools.net/",
  "https://mse.marionschools.net/",
  "https://mvs.marionschools.net/",
  "https://mwe.marionschools.net/",
  "https://nhj.marionschools.net/",
  "https://nmh.marionschools.net/",
  "https://nms.marionschools.net/",
  "https://oce.marionschools.net/",
  "https://oms.marionschools.net/",
  "https://ose.marionschools.net/",
  "https://rce.marionschools.net/",
  "https://roe.marionschools.net/",
  "https://rpe.marionschools.net/",
  "https://sde.marionschools.net/",
  "https://she.marionschools.net/",
  "https://sne.marionschools.net/",
  "https://soe.marionschools.net/",
  "https://sre.marionschools.net/",
  "https://swe.marionschools.net/",
  "https://vhs.marionschools.net/",
  "https://whe.marionschools.net/",
  "https://woe.marionschools.net/",
  "https://wpe.marionschools.net/",
  "https://wph.marionschools.net/",
];

async function main() {
  const schools = await p.school.findMany({
    where: { county: "Marion", website: null },
    select: { id: true, name: true, website: true },
  });
  const start = await p.school.count({ where: { website: { not: null } } });
  console.log(`📊 Starting: ${start}/4146 | Marion missing: ${schools.length}`);
  let found = 0;
  for (let i = 0; i < MARION_URLS.length; i += 10) {
    const batch = MARION_URLS.slice(i, i + 10);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(8000),
            redirect: "follow",
          });
          if (!r.ok) return;
          const html = await r.text();
          if (html.length < 500) return;
          const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || "";
          const h1 = (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1]?.trim() || "";
          let best: any = null,
            bs = 0;
          for (const name of [title, h1].filter(Boolean)) {
            for (const s of schools) {
              if (s.website) continue;
              const score = sim(name, s.name);
              if (score > bs && score >= 0.4) {
                bs = score;
                best = s;
              }
            }
          }
          if (best) {
            const plat = det(html);
            await p.school.update({
              where: { id: best.id },
              data: { website: url.replace(/\/$/, ""), websitePlatform: plat },
            });
            best.website = url;
            console.log(`  ✅ ${best.name} → ${url} [${plat}] (${bs.toFixed(2)})`);
            found++;
          }
        } catch {}
      })
    );
    await new Promise((r) => setTimeout(r, 300));
  }
  const end = await p.school.count({ where: { website: { not: null } } });
  console.log(`\n📊 DONE: Marion +${found} | Total: ${end}/4146`);
}
main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
