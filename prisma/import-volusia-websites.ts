import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const VOLUSIA_PAIRS = `https://beachside.vcsedu.org|Beachside Elementary
https://bluelake.vcsedu.org|Blue Lake Elementary
https://campbell.vcsedu.org|Campbell Middle
https://champion.vcsedu.org|Champion Elementary
https://chisholm.vcsedu.org|Chisholm Elementary
https://citrusgrove.vcsedu.org|Citrus Grove Elementary
https://coronadobeach.vcsedu.org|Coronado Beach Elementary
https://creekside.vcsedu.org|Creekside Middle
https://cypresscreek.vcsedu.org|Cypress Creek Elementary
https://hinson.vcsedu.org|David C Hinson Sr Middle
https://debary.vcsedu.org|DeBary Elementary
https://delandms.vcsedu.org|DeLand Middle
https://deltonalakes.vcsedu.org|Deltona Lakes Elementary
https://deltonams.vcsedu.org|Deltona Middle
https://discovery.vcsedu.org|Discovery Elementary
https://edgewaterpublic.vcsedu.org|Edgewater Public Elementary
https://starke.vcsedu.org|Edith I Starke Elementary
https://enterprise.vcsedu.org|Enterprise Elementary
https://forestlake.vcsedu.org|Forest Lake Elementary
https://freedom.vcsedu.org|Freedom Elementary
https://friendship.vcsedu.org|Friendship Elementary
https://galaxy.vcsedu.org|Galaxy Middle
https://georgemarks.vcsedu.org|George W Marks Elementary
https://heritage.vcsedu.org|Heritage Middle
https://hollyhill.vcsedu.org|Holly Hill School K-5
https://horizon.vcsedu.org|Horizon Elementary
https://indianriver.vcsedu.org|Indian River Elementary
https://mcinnis.vcsedu.org|Louise S McInnis Elementary
https://manateecove.vcsedu.org|Manatee Cove Elementary
https://newsmyrnabeachms.vcsedu.org|New Smyrna Beach Middle
https://orangecity.vcsedu.org|Orange City Elementary
https://ormondbeach.vcsedu.org|Ormond Beach Elementary
https://ormondbeachms.vcsedu.org|Ormond Beach Middle
https://osteen.vcsedu.org|Osteen Elementary
https://palmterrace.vcsedu.org|Palm Terrace Elementary
https://pathways.vcsedu.org|Pathways Elementary
https://pierson.vcsedu.org|Pierson Elementary
https://pinetrail.vcsedu.org|Pine Trail Elementary
https://portorange.vcsedu.org|Port Orange Elementary
https://pride.vcsedu.org|Pride Elementary
https://longstreet.vcsedu.org|R J Longstreet Elementary
https://readpattillo.vcsedu.org|Read-Pattillo Elementary
https://riversprings.vcsedu.org|River Springs Middle
https://silversands.vcsedu.org|Silver Sands Middle
https://southdaytona.vcsedu.org|South Daytona Elementary
https://southwestern.vcsedu.org|Southwestern Middle
https://spirit.vcsedu.org|Spirit Elementary
https://sprucecreek.vcsedu.org|Spruce Creek High School
https://sugarmill.vcsedu.org|Sugar Mill Elementary
https://sunrise.vcsedu.org|Sunrise Elementary
https://sweetwater.vcsedu.org|Sweetwater Elementary
https://timbercrest.vcsedu.org|Timbercrest Elementary
https://tomoka.vcsedu.org|Tomoka Elementary
https://ttsmall.vcsedu.org|Turie T Small Elementary
https://volusiapines.vcsedu.org|Volusia Pines Elementary
https://westside.vcsedu.org|Westside Elementary
https://woodward.vcsedu.org|Woodward Avenue Elementary`;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|junior|high|school|center|k-8|k8|magnet|charter|sr|jr|of|the|and|a|for|at|public)\b/g,
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
  const wa = new Set(na.split(" ").filter((w) => w.length > 2)),
    wb = new Set(nb.split(" ").filter((w) => w.length > 2));
  const inter = [...wa].filter((w) => wb.has(w)).length,
    union = new Set([...wa, ...wb]).size;
  return union > 0 ? inter / union : 0;
}

async function main() {
  const schools = VOLUSIA_PAIRS.split("\n")
    .filter(Boolean)
    .map((l) => {
      const [url, nameHint] = l.split("|");
      return { url, nameHint };
    });
  const db = await (prisma as any).school.findMany({
    where: { district: { name: { contains: "VOLUSIA", mode: "insensitive" } }, website: null },
    select: { id: true, name: true },
  });
  console.log(`Volusia without website: ${db.length}`);
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
      await (prisma as any).school.update({ where: { id: s.id }, data: { website: best } });
      matched.add(best);
      updated++;
    }
  }
  console.log(`✅ Volusia: updated ${updated}`);
  const total = await (prisma as any).school.count({ where: { website: { not: null } } });
  console.log(`📊 Total: ${total}/4146`);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
