/**
 * Import school websites for:
 * - St. Lucie (42 direct URLs from district site)
 * - Indian River, Monroe, Walton, Alachua, Lake (Finalsite /o/{slug} pattern)
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const PLATFORM_SIGS = [
  { platform: "Finalsite", patterns: ["finalsite"] },
  { platform: "Blackboard", patterns: ["schoolwires", "blackboard.com"] },
  { platform: "Edlio", patterns: ["edlio"] },
  { platform: "Apptegy", patterns: ["apptegy", "thrillshare"] },
  { platform: "WordPress", patterns: ["wp-content", "wp-includes"] },
  { platform: "SchoolMessenger", patterns: ["schoolmessenger"] },
  { platform: "PowerSchool", patterns: ["powerschool"] },
];

function detectPlatform(html: string): string {
  const h = html.toLowerCase();
  for (const { platform, patterns } of PLATFORM_SIGS) {
    if (patterns.some((p) => h.includes(p))) return platform;
  }
  return "Unknown";
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|charter|magnet|academy|k-8|k8|center|preparatory|prep|community|technical|international|sciences|arts|stem|steam|learning|education|institute|collegiate|campus)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const wa = new Set(na.split(" ").filter(Boolean));
  const wb = new Set(nb.split(" ").filter(Boolean));
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : intersection / union;
}

async function fetchPage(url: string): Promise<{ title: string; html: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 500) return null; // bot challenge
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    return { title, html };
  } catch {
    return null;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, "-")
    .trim()
    .replace(/^-|-$/g, "");
}

const SKIP_WORDS = new Set([
  "elementary",
  "middle",
  "high",
  "school",
  "senior",
  "junior",
  "charter",
  "magnet",
  "academy",
  "k-8",
  "k8",
  "center",
  "preparatory",
  "prep",
  "community",
  "technical",
  "international",
  "of",
  "and",
  "the",
  "at",
  "for",
  "a",
  "an",
]);

function slugifySig(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !SKIP_WORDS.has(w));
  return words.join("-");
}

function getCandidates(name: string): string[] {
  const full = slugify(name);
  const sig = slugifySig(name);
  const set = new Set<string>();
  [full, sig].forEach((s) => s && s.length >= 2 && set.add(s));
  return [...set];
}

async function importDirectUrls(county: string, urls: string[], schools: any[]) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🏫 ${county}: ${urls.length} URLs`);
  const countySchools = schools.filter((s: any) => s.county === county && !s.website);
  console.log(`   Schools without websites: ${countySchools.length}`);

  let found = 0;
  for (let i = 0; i < urls.length; i += 10) {
    const batch = urls.slice(i, i + 10);
    await Promise.all(
      batch.map(async (url) => {
        const data = await fetchPage(url);
        if (!data) return;
        const { title, html } = data;

        let bestMatch: any = null;
        let bestScore = 0;
        for (const school of countySchools) {
          if (school.website) continue;
          const score = similarity(title, school.name);
          if (score > bestScore && score >= 0.35) {
            bestScore = score;
            bestMatch = school;
          }
        }
        if (bestMatch) {
          const platform = detectPlatform(html);
          await p.school.update({
            where: { id: bestMatch.id },
            data: { website: url, websitePlatform: platform },
          });
          bestMatch.website = url;
          console.log(`  ✅ ${bestMatch.name} → ${url} [${platform}] (${bestScore.toFixed(2)})`);
          found++;
        }
      })
    );
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeFinalsite(county: string, domain: string, schools: any[]) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🏫 ${county} (Finalsite): ${domain}`);
  const countySchools = schools.filter((s: any) => s.county === county && !s.website);
  console.log(`   Schools without websites: ${countySchools.length}`);

  let found = 0;
  for (const school of countySchools) {
    if (school.website) continue;
    const candidates = getCandidates(school.name);
    let matched = false;
    for (const slug of candidates) {
      if (matched) break;
      const url = `https://www.${domain}/o/${slug}`;
      const data = await fetchPage(url);
      if (!data) continue;
      const { title, html } = data;
      const score = similarity(title, school.name);
      if (score >= 0.4) {
        const platform = detectPlatform(html);
        await p.school.update({
          where: { id: school.id },
          data: { website: url, websitePlatform: platform },
        });
        school.website = url;
        console.log(`  ✅ ${school.name} → ${url} [${platform}] (${score.toFixed(2)})`);
        found++;
        matched = true;
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`  → Found: ${found}`);
  return found;
}

async function main() {
  const allSchools = await p.school.findMany({
    select: { id: true, name: true, county: true, website: true },
  });
  const startTotal = await p.school.count({ where: { website: { not: null } } });
  console.log(`📊 Starting: ${startTotal}/4146 schools with websites`);

  // St. Lucie — 42 direct URLs
  const ST_LUCIE_URLS = [
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=apf",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=bay",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=caa",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=cam",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=dcs",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=dmm",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=fgm",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=fks",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=fln",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=flo",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=fpc",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=fpw",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=lhs",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=lpa",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=lwe",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=lwp",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=man",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=mar",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=mda",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=mse",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=npk",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=oak",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=pbp",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=phs",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=pkw",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=ppk",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=ree",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=sga",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=sle",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=slk",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=slv",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=som",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=spm",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=sre",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=swc",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=tch",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=tlk",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=vge",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=wbe",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=wce",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=wgk",
    "https://www.stlucie.k12.fl.us/our-schools/profile/?sch=wmp",
  ];

  await importDirectUrls("St. Lucie", ST_LUCIE_URLS, allSchools);

  // Finalsite districts
  await probeFinalsite("Indian River", "indianriverschools.org", allSchools);
  await probeFinalsite("Monroe", "keysschools.com", allSchools);
  await probeFinalsite("Walton", "walton.k12.fl.us", allSchools);
  await probeFinalsite("Alachua", "sbac.edu", allSchools);
  await probeFinalsite("Lake", "lake.k12.fl.us", allSchools);

  const endTotal = await p.school.count({ where: { website: { not: null } } });
  console.log(`\n📊 DONE: ${endTotal}/4146 (+${endTotal - startTotal})`);
}

main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
