import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Simple bcrypt-compatible hash using scrypt (built-in Node.js)
async function hashPassword(password: string): Promise<string> {
  // Better Auth uses scrypt by default
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
  return hash;
}

async function main() {
  const email = "urosantic8@gmail.com";
  const password = "EdPilot2026!";
  const name = "Uroš Antić";

  // Check if user already exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).user.findUnique({ where: { email } });
  if (existing) {
    console.log("⚠️  User already exists:", email);
    return;
  }

  const hashedPassword = await hashPassword(password);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma as any).user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      name,
      role: "ADMIN",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create account record for email/password auth (Better Auth format)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).account.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("✅ User created successfully!");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role: ADMIN`);
  console.log("");
  console.log("🔐 Login at: https://edpilothub-crm.vercel.app/sign-in");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
