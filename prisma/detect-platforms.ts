import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const SIGNATURES: Array<{ platform: string; patterns: string[] }> = [
  { platform: "Finalsite", patterns: ["finalsite"] },
  { platform: "Blackboard", patterns: ["schoolwires", "blackboard.com"] },
  { platform: "Edlio", patterns: ["edlio.com", "edlio"] },
  { platform: "Apptegy", patterns: ["apptegy", "thrillshare"] },
  { platform: "WordPress", patterns: ["wp-content", "wp-includes"] },
  { platform: "Wix", patterns: ["wixsite.com", "static.wixstatic"] },
  { platform: "Squarespace", patterns: ["squarespace.com", "squarespace-cdn"] },
  { platform: "Drupal", patterns: ["drupal.js", "/sites/default/files"] },
  { platform: "Joomla", patterns: ["joomla"] },
  { platform: "Weebly", patterns: ["weebly.com"] },
  { platform: "Revize", patterns: ["revize.com"] },
  { platform: "CivicPlus", patterns: ["civicplus.com"] },
  { platform: "SchoolMessenger", patterns: ["schoolmessenger"] },
  { platform: "PowerSchool", patterns: ["powerschool"] },
];

async function detectPlatform(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });
    clearTimeout(timer);
    const html = await res.text();
    const lower = html.toLowerCase();
    for (const { platform, patterns } of SIGNATURES) {
      if (patterns.some((p) => lower.includes(p))) return platform;
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

async function main() {
  const schools = await (
    prisma as unknown as {
      school: {
        findMany: (
          args: unknown
        ) => Promise<Array<{ id: string; name: string; website: string | null }>>;
        update: (args: unknown) => Promise<unknown>;
      };
    }
  ).school.findMany({
    where: { website: { not: null }, websitePlatform: null },
    select: { id: true, name: true, website: true },
  });

  console.log(`🔍 Detecting platforms for ${schools.length} schools…\n`);

  const BATCH = 10;
  const summary: Record<string, number> = {};
  const db = prisma as unknown as {
    school: {
      update: (args: unknown) => Promise<unknown>;
    };
  };

  for (let i = 0; i < schools.length; i += BATCH) {
    const batch = schools.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (school) => {
        try {
          const platform = await detectPlatform(school.website!);
          await db.school.update({ where: { id: school.id }, data: { websitePlatform: platform } });
          summary[platform] = (summary[platform] ?? 0) + 1;
          console.log(`✅ ${school.name} → ${platform}`);
        } catch (err) {
          console.log(`❌ ${school.name}: ${(err as Error).message}`);
        }
      })
    );
    if (i + BATCH < schools.length) await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n📊 Platform Summary:");
  const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]);
  for (const [platform, count] of sorted) {
    console.log(`  ${platform}: ${count}`);
  }
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  console.log(`  TOTAL: ${total}`);

  await (prisma as unknown as { $disconnect: () => Promise<void> }).$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
