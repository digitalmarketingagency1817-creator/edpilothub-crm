/**
 * Orange County — 218 subdomains from ocps.net/schools
 * Pattern: {slug}.ocps.net — Blackboard/SchoolWires platform
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config({ path: require("path").resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const PLATFORM_SIGS: [string,string][] = [
  ["finalsite","Finalsite"],["schoolwires","Blackboard"],["blackboard.com","Blackboard"],
  ["edlio","Edlio"],["apptegy","Apptegy"],["thrillshare","Apptegy"],
  ["wp-content","WordPress"],["wixsite.com","Wix"],["squarespace.com","Squarespace"],
  ["drupal.js","Drupal"],["schoolmessenger","SchoolMessenger"],["powerschool","PowerSchool"],
];
function detectPlatform(html: string): string {
  const h = html.toLowerCase();
  for (const [sig,name] of PLATFORM_SIGS) if (h.includes(sig)) return name;
  return "Unknown";
}
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g," ")
    .replace(/\b(elementary|middle|high|school|senior|junior|academy|charter|magnet|center|k-8|k8|of|the|and|at|for|orange|county|ocps|exceptional|virtual|gifted|technical|home|pk)\b/g," ")
    .replace(/\s+/g," ").trim();
}
function similarity(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  const inter = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa,...wb]).size;
  return union === 0 ? 0 : inter / union;
}

const SLUGS = fs.readFileSync("/tmp/orange_slugs.txt","utf8").trim().split("\n").filter(Boolean);

async function fetchTitle(url: string): Promise<{title:string;html:string}|null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, headers: {"User-Agent":"Mozilla/5.0"} });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<title>([^<]+)<\/title>/i);
    let title = m ? m[1].trim() : "";
    // Handle "Home - School Name" or "School Name - OCPS" formats
    title = title.replace(/^home\s*[-–]\s*/i,"").replace(/\s*[-–|]\s*(?:ocps|orange county|home).*$/i,"").trim();
    return { title, html };
  } catch { return null; }
}

async function main() {
  const schools = await p.school.findMany({
    where: { county: "Orange", website: null },
    select: { id:true, name:true },
  });
  console.log(`Orange: ${schools.length} missing, probing ${SLUGS.length} URLs`);
  let found = 0;
  const BATCH = 12;
  for (let i = 0; i < SLUGS.length; i += BATCH) {
    await Promise.all(SLUGS.slice(i,i+BATCH).map(async (slug) => {
      const url = `https://${slug}.ocps.net`;
      const result = await fetchTitle(url);
      if (!result || !result.title || result.title.length < 3) return;
      const normTitle = normalize(result.title);
      if (!normTitle || normTitle.length < 2) return;
      let best = 0, bestSchool: any = null;
      for (const s of schools) {
        if (s.website) continue;
        const score = similarity(normalize(s.name), normTitle);
        if (score > best) { best = score; bestSchool = s; }
      }
      if (bestSchool && best >= 0.4) {
        const platform = detectPlatform(result.html);
        await p.school.update({ where:{id:bestSchool.id}, data:{website:url, websitePlatform:platform} });
        console.log(`✅ ${bestSchool.name} → ${url} [${platform}] (${best.toFixed(2)})`);
        bestSchool.website = url;
        found++;
      }
    }));
    await new Promise(r => setTimeout(r, 250));
    process.stdout.write(`\r  ${Math.min(i+BATCH,SLUGS.length)}/${SLUGS.length} (${found} found)`);
  }
  console.log(`\n✅ Orange: ${found} updated`);
  await (prisma as any).$disconnect();
}
main().catch(console.error);
