/**
 * Import Pasco County school websites
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-pasco-websites.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const PASCO_PAIRS = `https://acwc.pasco.k12.fl.us|Achieve Center at Wesley Chapel
https://aes.pasco.k12.fl.us|Anclote Elementary School
https://bes.pasco.k12.fl.us|Bexley Elementary School
https://cenes.pasco.k12.fl.us|Centennial Elementary School
https://chk8.pasco.k12.fl.us|Chasco K-8
https://cwtes.pasco.k12.fl.us|Chester W Taylor Elementary School
https://coes.pasco.k12.fl.us|Connerton Elementary School
https://cres.pasco.k12.fl.us|Cotee River Elementary School
https://ces.pasco.k12.fl.us|Cypress Elementary School
https://dpes.pasco.k12.fl.us|Deer Park Elementary School
https://does.pasco.k12.fl.us|Denham Oaks Elementary School
https://dbes.pasco.k12.fl.us|Double Branch Elementary School
https://fhes.pasco.k12.fl.us|Fox Hollow Elementary School
https://ghes.pasco.k12.fl.us|Gulf Highlands Elementary School
https://gtes.pasco.k12.fl.us|Gulf Trace Elementary School
https://gses.pasco.k12.fl.us|Gulfside Elementary School
https://hac.pasco.k12.fl.us|Hudson Academy
https://hpa.pasco.k12.fl.us|Hudson Primary Academy
https://jmmes.pasco.k12.fl.us|James M Marlowe Elementary School
https://krk8.pasco.k12.fl.us|Kirkland Ranch K-8
https://les.pasco.k12.fl.us|Lacoochee Elementary School
https://lmes.pasco.k12.fl.us|Lake Myrtle Elementary School
https://lles.pasco.k12.fl.us|Longleaf Elementary School
https://mges.pasco.k12.fl.us|Mary Giella Elementary School
https://mplaa.pasco.k12.fl.us|Mittye P Locke Achievement Academy
https://mles.pasco.k12.fl.us|Moon Lake Elementary School
https://nres.pasco.k12.fl.us|New River Elementary School
https://oes.pasco.k12.fl.us|Oakstead Elementary School
https://odes.pasco.k12.fl.us|Odessa Elementary School
https://pes.pasco.k12.fl.us|Pasco Elementary School
https://pves.pasco.k12.fl.us|Pine View Elementary School
https://qhes.pasco.k12.fl.us|Quail Hollow Elementary School
https://res.pasco.k12.fl.us|Richey Elementary School
https://rbces.pasco.k12.fl.us|Rodney B Cox Elementary School
https://saes.pasco.k12.fl.us|San Antonio Elementary School
https://spes.pasco.k12.fl.us|Sand Pine Elementary School
https://smes.pasco.k12.fl.us|Sanders Memorial Elementary School
https://ses.pasco.k12.fl.us|Schrader Elementary School
https://soes.pasco.k12.fl.us|Seven Oaks Elementary School
https://sses.pasco.k12.fl.us|Seven Springs Elementary School
https://shes.pasco.k12.fl.us|Shady Hills Elementary School
https://sbk8.pasco.k12.fl.us|Skybrooke K-8
https://srk8.pasco.k12.fl.us|Starkey Ranch K-8
https://sres.pasco.k12.fl.us|Sunray Elementary School
https://tes.pasco.k12.fl.us|Trinity Elementary School
https://toes.pasco.k12.fl.us|Trinity Oaks Elementary School
https://ves.pasco.k12.fl.us|Veterans Elementary School
https://wges.pasco.k12.fl.us|Watergrass Elementary School
https://wces.pasco.k12.fl.us|Wesley Chapel Elementary School
https://wzes.pasco.k12.fl.us|West Zephyrhills Elementary School
https://wres.pasco.k12.fl.us|Wiregrass Elementary School
https://wes.pasco.k12.fl.us|Woodland Elementary School`;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|junior|high|school|center|academy|k-8|k8|magnet|charter|prep|jr|sr|of|the|and|a|for|at)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a),
    nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wa = new Set(na.split(" ").filter((w) => w.length > 2));
  const wb = new Set(nb.split(" ").filter((w) => w.length > 2));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 ? inter / union : 0;
}

async function main() {
  const schools = PASCO_PAIRS.split("\n")
    .filter(Boolean)
    .map((l) => {
      const [url, nameHint] = l.split("|");
      return { url, nameHint };
    });

  const db = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: "PASCO", mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });
  console.log(`Pasco without website: ${db.length}`);

  let updated = 0;
  const matched = new Set<string>();
  for (const s of db) {
    let best = "",
      bestScore = 0;
    for (const { url, nameHint } of schools) {
      if (matched.has(url)) continue;
      const sc = similarity(s.name, nameHint);
      if (sc > bestScore) {
        bestScore = sc;
        best = url;
      }
    }
    if (best && bestScore >= 0.5) {
      await (prisma as any).school.update({
        where: { id: s.id },
        data: { website: best },
      });
      matched.add(best);
      updated++;
    }
  }

  console.log(`✅ Pasco: updated ${updated}`);
  const total = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`📊 Total: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
