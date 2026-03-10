import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
async function main() {
  const p = prisma as any;
  const schools = await p.school.findMany({
    where: {
      website: null,
      studentCount: { gte: 500 },
      NOT: [
        { name: { contains: "VIRTUAL" } },
        { name: { contains: "HOSPITAL" } },
        { name: { contains: "PROGRAM" } },
      ],
    },
    select: { id: true, name: true, city: true },
    take: 50,
    orderBy: { studentCount: "desc" },
  });
  console.log(JSON.stringify(schools));
}
main().finally(async () => {
  await prisma.$disconnect();
});
