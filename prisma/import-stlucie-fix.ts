import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|charter|magnet|academy|k-8|k8|center|technical|community|preparatory|prep)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const wa = new Set(na.split(" ").filter(Boolean));
  const wb = new Set(nb.split(" ").filter(Boolean));
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : intersection / union;
}

const CODES = [
  "apf",
  "bay",
  "caa",
  "cam",
  "dcs",
  "dmm",
  "fgm",
  "fks",
  "fln",
  "flo",
  "fpc",
  "fpw",
  "lhs",
  "lpa",
  "lwe",
  "lwp",
  "man",
  "mar",
  "mda",
  "mse",
  "npk",
  "oak",
  "pbp",
  "phs",
  "pkw",
  "ppk",
  "ree",
  "sga",
  "sle",
  "slk",
  "slv",
  "som",
  "spm",
  "sre",
  "swc",
  "tch",
  "tlk",
  "vge",
  "wbe",
  "wce",
  "wgk",
  "wmp",
];

async function main() {
  const schools = await p.school.findMany({
    where: { county: "St. Lucie", website: null },
    select: { id: true, name: true, website: true },
  });
  console.log(`St. Lucie schools without website: ${schools.length}`);

  let found = 0;
  for (let i = 0; i < CODES.length; i += 8) {
    const batch = CODES.slice(i, i + 8);
    await Promise.all(
      batch.map(async (code) => {
        const url = `https://www.stlucie.k12.fl.us/our-schools/profile/?sch=${code}`;
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return;
          const html = await res.text();
          // Extract H2 (school name)
          const h2 = html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
          if (!h2) return;
          const schoolName = h2[1].trim();

          let bestMatch: any = null;
          let bestScore = 0;
          for (const school of schools) {
            if (school.website) continue;
            const score = similarity(schoolName, school.name);
            if (score > bestScore && score >= 0.4) {
              bestScore = score;
              bestMatch = school;
            }
          }
          if (bestMatch) {
            const platform = html.toLowerCase().includes("wp-content") ? "WordPress" : "Unknown";
            await p.school.update({
              where: { id: bestMatch.id },
              data: { website: url, websitePlatform: platform },
            });
            bestMatch.website = url;
            console.log(
              `  ✅ ${bestMatch.name} → ${url} [H2: "${schoolName}"] (${bestScore.toFixed(2)})`
            );
            found++;
          } else {
            console.log(`  ❓ No match for H2: "${schoolName}" (code: ${code})`);
          }
        } catch {}
      })
    );
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`\nFound: ${found}`);
}
main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
