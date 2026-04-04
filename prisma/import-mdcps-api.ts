/**
 * Miami-Dade County — MDCPS JSON API
 * API: https://mainapi.dadeschools.net/api/v1/schools
 * Returns all schools with website URLs directly!
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|academy|charter|magnet|center|k-8|k8|of|the|and|at|for|miami|dade|county|es|ms|hs|k8|sr|jr|ed|education|prep|preparatory)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}
function similarity(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : inter / union;
}
function detectPlatform(url: string): string {
  if (url.includes("dadeschools.net")) return "SchoolMessenger";
  if (url.includes("externalweb.dadeschools")) return "SchoolMessenger";
  return "Unknown";
}

interface APISchool {
  name: string;
  website: string;
  number: string;
}

async function main() {
  // Fetch all MDCPS schools from their API
  console.log("Fetching MDCPS API...");
  const res = await fetch("https://mainapi.dadeschools.net/api/v1/schools?format=json", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const data = (await res.json()) as { items: APISchool[] };
  const apiSchools = data.items || [];
  console.log(`API returned ${apiSchools.length} schools with websites`);

  const dbSchools = await p.school.findMany({
    where: { county: "Miami-Dade", website: null },
    select: { id: true, name: true },
  });
  console.log(`DB: ${dbSchools.length} Miami-Dade schools without website`);

  let found = 0;
  for (const api of apiSchools) {
    if (!api.website || !api.name) continue;
    const normApi = normalize(api.name);
    let best = 0,
      bestSchool: any = null;
    for (const s of dbSchools) {
      if (s.website) continue;
      const score = similarity(normalize(s.name), normApi);
      if (score > best) {
        best = score;
        bestSchool = s;
      }
    }
    if (bestSchool && best >= 0.4) {
      const platform = detectPlatform(api.website);
      await p.school.update({
        where: { id: bestSchool.id },
        data: { website: api.website, websitePlatform: platform },
      });
      console.log(`✅ ${bestSchool.name} → ${api.website} [${platform}] (${best.toFixed(2)})`);
      bestSchool.website = api.website;
      found++;
    }
  }

  console.log(`\n✅ Miami-Dade: ${found} updated from API`);
  await (prisma as any).$disconnect();
}
main().catch(console.error);
