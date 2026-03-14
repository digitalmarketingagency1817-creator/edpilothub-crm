import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  const p = prisma as any;
  const total = await p.school.count();
  const withSite = await p.school.count({ where: { website: { not: null } } });
  console.log(`TOTAL: ${total} | WITH WEBSITE: ${withSite} | MISSING: ${total - withSite}\n`);

  const rows = await p.$queryRaw`
    SELECT 
      county,
      COUNT(*) as total,
      COUNT(CASE WHEN website IS NULL THEN 1 END) as missing
    FROM "School"
    GROUP BY county
    HAVING COUNT(CASE WHEN website IS NULL THEN 1 END) > 0
    ORDER BY missing DESC
    LIMIT 40
  `;

  for (const r of rows) {
    const pct = Math.round(((Number(r.total) - Number(r.missing)) / Number(r.total)) * 100);
    const d = (r.county || "Unknown").substring(0, 25).padEnd(26);
    console.log(
      `${d} | ${String(r.total).padStart(4)} total | ${String(r.missing).padStart(4)} missing | ${pct}%`
    );
  }
}
main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
