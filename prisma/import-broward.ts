import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|high|school|center|academy|k-8|k8|preparatory|prep|magnet|charter)\b/g,
      ""
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
  const urls = fs.readFileSync("/tmp/broward_school_urls.txt", "utf-8").trim().split("\n");
  const schoolUrls = urls.map((url) => {
    const slug = new URL(url).hostname.split(".")[0];
    const nameHint = slug
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([a-z]{2,})/g, (m) => m + " ")
      .trim();
    return { url, nameHint };
  });

  const dbSchools = await (prisma as any).school.findMany({
    where: { district: { name: { contains: "BROWARD", mode: "insensitive" } }, website: null },
    select: { id: true, name: true },
  });
  console.log(`Broward schools without website: ${dbSchools.length}`);

  let updated = 0;
  const matched = new Set<string>();
  for (const db of dbSchools) {
    let best = "",
      bestScore = 0;
    for (const { url, nameHint } of schoolUrls) {
      if (matched.has(url)) continue;
      const s = similarity(db.name, nameHint);
      if (s > bestScore) {
        bestScore = s;
        best = url;
      }
    }
    if (best && bestScore >= 0.5) {
      await (prisma as any).school.update({ where: { id: db.id }, data: { website: best } });
      matched.add(best);
      updated++;
    }
  }
  console.log(`✅ Broward: updated ${updated}`);

  const total = await (prisma as any).school.count({ where: { website: { not: null } } });
  console.log(`📊 Total with website: ${total}/4146`);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
