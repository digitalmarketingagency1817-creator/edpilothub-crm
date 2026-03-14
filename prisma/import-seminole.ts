/**
 * Seminole County (SCPS) school import via SmartSites numeric IDs
 * Pattern: https://www.scps.k12.fl.us/{id}
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const PLATFORM_SIGS: [string, string][] = [
  ["finalsite", "Finalsite"],
  ["schoolwires", "Blackboard"],
  ["blackboard.com", "Blackboard"],
  ["edlio", "Edlio"],
  ["apptegy", "Apptegy"],
  ["thrillshare", "Apptegy"],
  ["wp-content", "WordPress"],
  ["wp-includes", "WordPress"],
  ["wixsite.com", "Wix"],
  ["squarespace.com", "Squarespace"],
  ["drupal.js", "Drupal"],
  ["schoolmessenger", "SchoolMessenger"],
  ["powerschool", "PowerSchool"],
  ["smartsites", "SmartSites"],
];

function detectPlatform(html: string): string {
  const h = html.toLowerCase();
  for (const [sig, name] of PLATFORM_SIGS) if (h.includes(sig)) return name;
  return "Unknown";
}

// All SmartSites path IDs from SCPS homepage
const IDS = [
  "121825_2",
  "91008_3",
  "83650_3",
  "119449_2",
  "84061_3",
  "91039_3",
  "83664_3",
  "152829_2",
  "122996_2",
  "83647_3",
  "125721_2",
  "83246_3",
  "243006_2",
  "152828_2",
  "83240_3",
  "88035_3",
  "83243_3",
  "121801_2",
  "124384_2",
  "84060_3",
  "82609_3",
  "333214_2",
  "83648_3",
  "82608_3",
  "124370_2",
  "35783_1",
  "136155_2",
  "83651_3",
  "35782_1",
  "121800_2",
  "243008_2",
  "125723_2",
  "119445_2",
  "84050_3",
  "91390_3",
  "136424_2",
  "82726_3",
  "88510_3",
  "121792_2",
  "88036_3",
  "83239_3",
  "84064_3",
  "141202_2",
  "122003_2",
  "85979_3",
  "83249_3",
  "91037_3",
  "83241_3",
  "83247_3",
  "83242_3",
  "91010_3",
  "83248_3",
  "243007_2",
  "83235_3",
  "83245_3",
  "94228_3",
  "121798_2",
  "90188_3",
  "83649_3",
  "119447_2",
  "121793_2",
  "121823_2",
  "121826_2",
  "136154_2",
  "84063_3",
  "88037_3",
  "122994_2",
  "122992_2",
  "119451_2",
  "84066_3",
  "84069_3",
  "88039_3",
  "119443_2",
  "124430_2",
  "84065_3",
  "35780_1",
  "35356_1",
  "84062_3",
  "83622_3",
  "83234_3",
  "136156_2",
  "94227_3",
  "29076_4",
  "29075_4",
  "29073_4",
  "29074_4",
  "29986_4",
  "49763_4",
  "66923_4",
  "29077_4",
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|academy|charter|magnet|center|k-8|k8|of|the|and|at|for|seminole|county)\b/g,
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

async function fetchTitle(url: string): Promise<{ title: string; html: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<title>([^<]+)<\/title>/i);
    return { title: m ? m[1].replace(/[-|–].*/, "").trim() : "", html };
  } catch {
    return null;
  }
}

async function main() {
  const schools = await p.school.findMany({
    where: { county: "Seminole", website: null },
    select: { id: true, name: true },
  });
  console.log(`Seminole schools without website: ${schools.length}`);

  let found = 0;
  const BATCH = 8;

  for (let i = 0; i < IDS.length; i += BATCH) {
    const batch = IDS.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (id) => {
        const url = `https://www.scps.k12.fl.us/${id}`;
        const result = await fetchTitle(url);
        if (!result || !result.title) return;

        const normTitle = normalize(result.title);
        if (!normTitle || normTitle.length < 3) return;

        let best = 0,
          bestSchool: any = null;
        for (const s of schools) {
          if (s.website) continue;
          const score = similarity(normalize(s.name), normTitle);
          if (score > best) {
            best = score;
            bestSchool = s;
          }
        }

        if (bestSchool && best >= 0.4) {
          const platform = detectPlatform(result.html);
          await p.school.update({
            where: { id: bestSchool.id },
            data: { website: url, websitePlatform: platform },
          });
          console.log(`✅ ${bestSchool.name} → ${url} [${platform}] (${best.toFixed(2)})`);
          bestSchool.website = url;
          found++;
        }
      })
    );
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ Seminole: ${found} updated`);
  await (prisma as any).$disconnect();
}
main().catch(console.error);
