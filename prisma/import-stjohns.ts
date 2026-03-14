/**
 * St. Johns County school website import
 * Pattern: http://www-{abbrev}.stjohns.k12.fl.us
 * URLs scraped from https://www.stjohns.k12.fl.us/schools
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
];

function detectPlatform(html: string): string {
  const h = html.toLowerCase();
  for (const [sig, name] of PLATFORM_SIGS) if (h.includes(sig)) return name;
  return "Unknown";
}

const SCHOOL_URLS = [
  "http://webster.stjohns.k12.fl.us",
  "http://www-bths.stjohns.k12.fl.us",
  "http://www-ccs.stjohns.k12.fl.us",
  "http://www-ces.stjohns.k12.fl.us",
  "http://www-chs.stjohns.k12.fl.us",
  "http://www-dce.stjohns.k12.fl.us",
  "http://www-fca.stjohns.k12.fl.us",
  "http://www-fcs.stjohns.k12.fl.us",
  "http://www-grms.stjohns.k12.fl.us",
  "http://www-hce.stjohns.k12.fl.us",
  "http://www-jce.stjohns.k12.fl.us",
  "http://www-kes.stjohns.k12.fl.us",
  "http://www-lms.stjohns.k12.fl.us",
  "http://www-lpa.stjohns.k12.fl.us",
  "http://www-mca.stjohns.k12.fl.us",
  "http://www-mes.stjohns.k12.fl.us",
  "http://www-mms.stjohns.k12.fl.us",
  "http://www-nhs.stjohns.k12.fl.us",
  "http://www-oes.stjohns.k12.fl.us",
  "http://www-ope.stjohns.k12.fl.us",
  "http://www-pbm.stjohns.k12.fl.us",
  "http://www-pce.stjohns.k12.fl.us",
  "http://www-pes.stjohns.k12.fl.us",
  "http://www-pmhs.stjohns.k12.fl.us",
  "http://www-poa.stjohns.k12.fl.us",
  "http://www-pva.stjohns.k12.fl.us",
  "http://www-pvhs.stjohns.k12.fl.us",
  "http://www-pvmkr.stjohns.k12.fl.us",
  "http://www-raider.stjohns.k12.fl.us",
  "http://www-rbh.stjohns.k12.fl.us",
  "http://www-sahs.stjohns.k12.fl.us",
  "http://www-sjths.stjohns.k12.fl.us",
  "http://www-sms.stjohns.k12.fl.us",
  "http://www-tchs.stjohns.k12.fl.us",
  "http://www-vra.stjohns.k12.fl.us",
  "http://www-wce.stjohns.k12.fl.us",
  "http://www-wdh.stjohns.k12.fl.us",
  "http://www.lms.stjohns.k12.fl.us",
  "https://www-bhs.stjohns.k12.fl.us",
  "https://www-hca.stjohns.k12.fl.us",
  "https://www-la.stjohns.k12.fl.us",
  "https://www-oo.stjohns.k12.fl.us",
  "https://www-pia.stjohns.k12.fl.us",
  "https://www-tca.stjohns.k12.fl.us",
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|academy|charter|magnet|center|k-8|k8|of|the|and|at|for)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : intersection / union;
}

async function getTitle(url: string): Promise<{ title: string; html: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<title>([^<]+)<\/title>/i);
    return { title: match ? match[1].trim() : "", html };
  } catch {
    return null;
  }
}

async function main() {
  const schools = await p.school.findMany({
    where: { county: "St. Johns", website: null },
    select: { id: true, name: true },
  });
  console.log(`St. Johns schools without website: ${schools.length}`);

  let found = 0;

  for (const url of SCHOOL_URLS) {
    const result = await getTitle(url);
    if (!result) {
      console.log(`❌ ${url}`);
      continue;
    }

    const { title, html } = result;
    const normTitle = normalize(title);

    let bestScore = 0;
    let bestSchool: any = null;

    for (const s of schools) {
      if (s.website) continue;
      const score = similarity(normalize(s.name), normTitle);
      if (score > bestScore) {
        bestScore = score;
        bestSchool = s;
      }
    }

    if (bestSchool && bestScore >= 0.35) {
      const platform = detectPlatform(html);
      await p.school.update({
        where: { id: bestSchool.id },
        data: { website: url, websitePlatform: platform },
      });
      console.log(`✅ ${bestSchool.name} → ${url} [${platform}] (${bestScore.toFixed(2)})`);
      bestSchool.website = url;
      found++;
    } else {
      console.log(
        `❓ No match for "${title}" (best: ${bestSchool?.name} @ ${bestScore.toFixed(2)})`
      );
    }
  }

  console.log(`\n✅ St. Johns: ${found} updated`);
  await (prisma as any).$disconnect();
}
main().catch(console.error);
