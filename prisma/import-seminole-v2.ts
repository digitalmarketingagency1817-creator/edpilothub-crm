/**
 * Seminole County (SCPS) — subdomain pattern: {slug}.scps.k12.fl.us
 * URLs extracted from district school directory pages
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
  ["parentsquare", "SmartSites"],
];

function detectPlatform(html: string): string {
  const h = html.toLowerCase();
  for (const [sig, name] of PLATFORM_SIGS) if (h.includes(sig)) return name;
  return "Unknown";
}

const SCHOOL_URLS = [
  // Elementary
  "https://altamonte.scps.k12.fl.us",
  "https://bearlake.scps.k12.fl.us",
  "https://bentley.scps.k12.fl.us",
  "https://carillon.scps.k12.fl.us",
  "https://casselberry.scps.k12.fl.us",
  "https://cles.scps.k12.fl.us",
  "https://eastbrook.scps.k12.fl.us",
  "https://englishestates.scps.k12.fl.us",
  "https://evans.scps.k12.fl.us",
  "https://forestcity.scps.k12.fl.us",
  "https://geneva.scps.k12.fl.us",
  "https://goldsboro.scps.k12.fl.us",
  "https://hamilton.scps.k12.fl.us",
  "https://heathrow.scps.k12.fl.us",
  "https://highlands.scps.k12.fl.us",
  "https://idyllwilde.scps.k12.fl.us",
  "https://keeth.scps.k12.fl.us",
  "https://lakemaryelem.scps.k12.fl.us",
  "https://lakeorienta.scps.k12.fl.us",
  "https://lawton.scps.k12.fl.us",
  "https://layer.scps.k12.fl.us",
  "https://lwes.scps.k12.fl.us",
  "https://midway.scps.k12.fl.us",
  "https://partin.scps.k12.fl.us",
  "https://pinecrest.scps.k12.fl.us",
  "https://rainbow.scps.k12.fl.us",
  "https://redbug.scps.k12.fl.us",
  "https://sim.scps.k12.fl.us",
  "https://springlake.scps.k12.fl.us",
  "https://stenstrom.scps.k12.fl.us",
  "https://sterlingpark.scps.k12.fl.us",
  "https://walker.scps.k12.fl.us",
  "https://wdes.scps.k12.fl.us",
  "https://wicklow.scps.k12.fl.us",
  "https://wilson.scps.k12.fl.us",
  "https://wses.scps.k12.fl.us",
  // Middle
  "https://greenwoodlakes.scps.k12.fl.us",
  "https://indiantrails.scps.k12.fl.us",
  "https://jhms.scps.k12.fl.us",
  "https://lakehowell.scps.k12.fl.us",
  "https://lcms.scps.k12.fl.us",
  "https://millennium.scps.k12.fl.us",
  "https://milwee.scps.k12.fl.us",
  "https://mwms.scps.k12.fl.us",
  "https://rocklakemiddle.scps.k12.fl.us",
  "https://ssms.scps.k12.fl.us",
  "https://teague.scps.k12.fl.us",
  "https://tuskawilla.scps.k12.fl.us",
  // High
  "https://cait.scps.k12.fl.us",
  "https://hagertyhigh.scps.k12.fl.us",
  "https://lakemaryhs.scps.k12.fl.us",
  "https://lyman.scps.k12.fl.us",
  "https://oviedo.scps.k12.fl.us",
  "https://sanford.scps.k12.fl.us",
  "https://seminolehs.scps.k12.fl.us",
  "https://winterspringshs.scps.k12.fl.us",
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|academy|charter|magnet|center|k-8|k8|of|the|and|at|for|seminole|county|scps)\b/g,
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

async function fetchPage(url: string): Promise<{ title: string; html: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<title>([^<]+)<\/title>/i);
    const title = m ? m[1].replace(/\s*[-|–|·].*$/, "").trim() : "";
    return { title, html };
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
  for (let i = 0; i < SCHOOL_URLS.length; i += BATCH) {
    const batch = SCHOOL_URLS.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (url) => {
        const result = await fetchPage(url);
        if (!result || !result.title) {
          console.log(`❌ ${url}`);
          return;
        }

        const normTitle = normalize(result.title);
        if (!normTitle || normTitle.length < 2) return;

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

        if (bestSchool && best >= 0.35) {
          const platform = detectPlatform(result.html);
          await p.school.update({
            where: { id: bestSchool.id },
            data: { website: url, websitePlatform: platform },
          });
          console.log(`✅ ${bestSchool.name} → ${url} [${platform}] (${best.toFixed(2)})`);
          bestSchool.website = url;
          found++;
        } else {
          console.log(
            `❓ "${result.title}" → no match (best: ${bestSchool?.name} @ ${best.toFixed(2)})`
          );
        }
      })
    );
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ Seminole: ${found} / ${SCHOOL_URLS.length} URLs matched`);
  await (prisma as any).$disconnect();
}
main().catch(console.error);
