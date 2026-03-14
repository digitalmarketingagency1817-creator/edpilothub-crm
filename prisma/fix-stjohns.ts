import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

async function main() {
  // Remove wrong St. Johns CTE URL - these are not individual school websites
  const result = await p.school.updateMany({
    where: {
      county: "St. Johns",
      website: {
        in: [
          "https://cte.stjohns.k12.fl.us/academies/",
          "https://www.stjohns.k12.fl.us/best-school-district-in-florida/",
        ],
      },
    },
    data: { website: null, websitePlatform: null },
  });
  console.log(`Cleared ${result.count} false St. Johns matches`);
}
main()
  .catch(console.error)
  .finally(() => (p as any).$disconnect());
