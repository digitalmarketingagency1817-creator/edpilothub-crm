/**
 * Import Duval County school websites from sitemap slugs
 * Run: npx dotenv-cli -e .env.local -- npx tsx prisma/import-duval-websites.ts
 */
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
      /\b(elementary|middle|senior|high|school|center|academy|k-8|k8|prep|magnet|charter|academies)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function slugToNameHint(slug: string): string {
  // Expand common abbreviations for Duval schools
  const abbrevMap: Record<string, string> = {
    ajhs: "andrew jackson high",
    achs: "atlantic coast high",
    ewhs: "edward white high",
    ehs: "englewood high",
    fchs: "first coast high",
    dfhs: "duncan fletcher high",
    fhp: "frank peterson",
    hms: "highlands middle",
    haes: "hendricks avenue",
    hsges: "hogan spring glen",
    aares: "andrew robinson",
    bies: "biltmore",
    cces: "chets creek",
    cpes: "crown point",
    bses: "bartram springs",
    abes: "atlantic beach",
    ares: "arlington",
    aaes: "alimacani",
    ches: "cedar hills",
    bces: "beauclerc",
    fces: "fort caroline",
    fcms: "fort caroline middle",
    aprtech: "philip randolph",
  };
  if (abbrevMap[slug]) return abbrevMap[slug];
  // Convert slug to readable name
  return slug
    .replace(/hs$|ms$|es$|k8$|elem$/, "")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/\B([A-Z])/g, " $1")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wa = new Set(na.split(" ").filter((w) => w.length > 2));
  const wb = new Set(nb.split(" ").filter((w) => w.length > 2));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 ? inter / union : 0;
}

async function main() {
  const rawUrls = fs
    .readFileSync("/tmp/duval_urls.txt", "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean);

  const schoolUrls = rawUrls.map((url) => {
    const slug = url.split("/o/")[1] || "";
    return { url, nameHint: slugToNameHint(slug) };
  });

  console.log(`Loaded ${schoolUrls.length} Duval school URLs`);

  // Get Duval schools from DB that still need websites
  const dbSchools = await (prisma as any).school.findMany({
    where: {
      district: { name: { contains: "DUVAL", mode: "insensitive" } },
      website: null,
    },
    select: { id: true, name: true },
  });
  console.log(`Duval schools without website: ${dbSchools.length}`);

  let updated = 0;
  const matched = new Set<string>();

  for (const db of dbSchools) {
    let best = "";
    let bestScore = 0;

    for (const { url, nameHint } of schoolUrls) {
      if (matched.has(url)) continue;
      const s = similarity(db.name, nameHint);
      if (s > bestScore) {
        bestScore = s;
        best = url;
      }
    }

    if (best && bestScore >= 0.45) {
      await (prisma as any).school.update({
        where: { id: db.id },
        data: { website: best },
      });
      matched.add(best);
      updated++;
    }
  }

  console.log(`✅ Duval: updated ${updated}`);
  const total = await (prisma as any).school.count({
    where: { website: { not: null } },
  });
  console.log(`📊 Total with website: ${total}/4146`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
