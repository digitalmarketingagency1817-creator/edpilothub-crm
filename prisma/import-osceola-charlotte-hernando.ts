/**
 * Import school websites from Osceola, Charlotte, and Hernando counties
 * URLs scraped directly from district homepages
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
  { platform: "Wix", patterns: ["wixsite.com", "static.wixstatic"] },
  { platform: "Squarespace", patterns: ["squarespace.com"] },
  { platform: "Drupal", patterns: ["drupal.js", "/sites/default/files"] },
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

async function fetchTitle(url: string): Promise<{ title: string; html: string } | null> {
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
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    return { title, html };
  } catch {
    return null;
  }
}

async function processCounty(county: string, urls: string[], allSchools: any[]) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🏫 ${county}: ${urls.length} URLs to process`);

  const schools = allSchools.filter((s: any) => s.county === county && !s.website);
  console.log(`   Schools without websites: ${schools.length}`);

  let found = 0;

  // Process in batches of 10
  for (let i = 0; i < urls.length; i += 10) {
    const batch = urls.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (url) => {
        const data = await fetchTitle(url);
        return { url, data };
      })
    );

    for (const { url, data } of results) {
      if (!data) continue;
      const { title, html } = data;

      // Try to match title to a school
      let bestMatch: any = null;
      let bestScore = 0;
      for (const school of schools) {
        if (school.website) continue; // already matched this session
        const score = similarity(title, school.name);
        if (score > bestScore && score >= 0.4) {
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
        bestMatch.website = url; // mark as matched
        console.log(
          `  ✅ ${bestMatch.name} → ${url} [${platform}] (score: ${bestScore.toFixed(2)})`
        );
        found++;
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`  → Found: ${found}`);
  return found;
}

async function main() {
  const allSchools = await p.school.findMany({
    select: { id: true, name: true, county: true, website: true },
  });

  const OSCEOLA_URLS = [
    "https://alco.osceolaschools.net",
    "https://bces.osceolaschools.net",
    "https://bela.osceolaschools.net",
    "https://caes.osceolaschools.net",
    "https://cck8.osceolaschools.net",
    "https://ck8s.osceolaschools.net",
    "https://clhs.osceolaschools.net",
    "https://cnes.osceolaschools.net",
    "https://cpk8.osceolaschools.net",
    "https://cyes.osceolaschools.net",
    "https://djms.osceolaschools.net",
    "https://dscv.osceolaschools.net",
    "https://dwes.osceolaschools.net",
    "https://eles.osceolaschools.net",
    "https://fres.osceolaschools.net",
    "https://gwhs.osceolaschools.net",
    "https://hles.osceolaschools.net",
    "https://hrcs.osceolaschools.net",
    "https://hrhs.osceolaschools.net",
    "https://hrms.osceolaschools.net",
    "https://htes.osceolaschools.net",
    "https://hzms.osceolaschools.net",
    "https://ives.osceolaschools.net",
    "https://kmes.osceolaschools.net",
    "https://kmms.osceolaschools.net",
    "https://koae.osceolaschools.net",
    "https://kpk8.osceolaschools.net",
    "https://lbhs.osceolaschools.net",
    "https://lves.osceolaschools.net",
    "https://maes.osceolaschools.net",
    "https://mces.osceolaschools.net",
    "https://nbec.osceolaschools.net",
    "https://nces.osceolaschools.net",
    "https://ncms.osceolaschools.net",
    "https://neoc.osceolaschools.net",
    "https://npes.osceolaschools.net",
    "https://npms.osceolaschools.net",
    "https://ochs.osceolaschools.net",
    "https://ocsa.osceolaschools.net",
    "https://otech.osceolaschools.net",
    "https://ovss.osceolaschools.net",
    "https://pafa.osceolaschools.net",
    "https://path.osceolaschools.net",
    "https://phes.osceolaschools.net",
    "https://pmwc.osceolaschools.net",
    "https://pnhs.osceolaschools.net",
    "https://pses.osceolaschools.net",
    "https://pwms.osceolaschools.net",
    "https://rces.osceolaschools.net",
    "https://sces.osceolaschools.net",
    "https://schs.osceolaschools.net",
    "https://scms.osceolaschools.net",
    "https://sres.osceolaschools.net",
    "https://taes.osceolaschools.net",
    "https://tkhs.osceolaschools.net",
    "https://vnes.osceolaschools.net",
    "https://vyk8.osceolaschools.net",
    "https://wk8s.osceolaschools.net",
    "https://zenp.osceolaschools.net",
  ];

  const HERNANDO_URLS = [
    "https://bes.hernandoschools.org",
    "https://ces.hernandoschools.org",
    "https://chs.hernandoschools.org",
    "https://ck8.hernandoschools.org",
    "https://des.hernandoschools.org",
    "https://dspms.hernandoschools.org",
    "https://ees.hernandoschools.org",
    "https://ek8.hernandoschools.org",
    "https://fcms.hernandoschools.org",
    "https://fwshs.hernandoschools.org",
    "https://hes.hernandoschools.org",
    "https://hhs.hernandoschools.org",
    "https://jdfes.hernandoschools.org",
    "https://mes.hernandoschools.org",
    "https://ncth.hernandoschools.org",
    "https://pges.hernandoschools.org",
    "https://pms.hernandoschools.org",
    "https://ses.hernandoschools.org",
    "https://shes.hernandoschools.org",
    "https://taed.hernandoschools.org",
    "https://wes.hernandoschools.org",
    "https://whms.hernandoschools.org",
    "https://wstc.hernandoschools.org",
    "https://wwhs.hernandoschools.org",
    "https://wwk8.hernandoschools.org",
  ];

  const CHARLOTTE_URLS = [
    "https://academy.yourcharlotteschools.net",
    "https://ainger.yourcharlotteschools.net",
    "https://baker.yourcharlotteschools.net",
    "https://chc.yourcharlotteschools.net",
    "https://chs.yourcharlotteschools.net",
    "https://ctc.yourcharlotteschools.net",
    "https://dces.yourcharlotteschools.net",
    "https://east.yourcharlotteschools.net",
    "https://kes.yourcharlotteschools.net",
    "https://lbhs.yourcharlotteschools.net",
    "https://les.yourcharlotteschools.net",
    "https://mms.yourcharlotteschools.net",
    "https://mpes.yourcharlotteschools.net",
    "https://mres.yourcharlotteschools.net",
    "https://nae.yourcharlotteschools.net",
    "https://pchs.yourcharlotteschools.net",
    "https://pcms.yourcharlotteschools.net",
    "https://pgms.yourcharlotteschools.net",
    "https://pres.yourcharlotteschools.net",
    "https://sje.yourcharlotteschools.net",
    "https://ves.yourcharlotteschools.net",
  ];

  const startTotal = await p.school.count({ where: { website: { not: null } } });
  console.log(`📊 Starting: ${startTotal}/4146 schools with websites\n`);

  await processCounty("Osceola", OSCEOLA_URLS, allSchools);
  await processCounty("Hernando", HERNANDO_URLS, allSchools);
  await processCounty("Charlotte", CHARLOTTE_URLS, allSchools);

  const endTotal = await p.school.count({ where: { website: { not: null } } });
  console.log(`\n📊 DONE: ${endTotal}/4146 (+${endTotal - startTotal})`);
}

main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
