import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = prisma as any;

  // List all users first
  const users = await p.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  });
  console.log("📋 All users:", users);

  // Set uantic@miamiartscharter.net to ADMIN
  const target = users.find((u: { email: string }) => u.email === "uantic@miamiartscharter.net");
  if (target) {
    await p.user.update({ where: { id: target.id }, data: { role: "ADMIN" } });
    console.log("✅ Set ADMIN:", target.email);
  } else {
    console.log("⚠️  User uantic@miamiartscharter.net not found");
  }

  // Delete the old script-created user
  const old = users.find((u: { email: string }) => u.email === "urosantic8@gmail.com");
  if (old) {
    await p.account.deleteMany({ where: { userId: old.id } });
    await p.user.delete({ where: { id: old.id } });
    console.log("🗑️  Deleted old user:", old.email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
