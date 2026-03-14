/**
 * Comprehensive FL school website probe — all remaining counties
 * Run: npx tsx prisma/probe-all-counties.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);
const p = prisma as any;

const SKIP = new Set([
  "elementary",
  "middle",
  "high",
  "school",
  "senior",
  "junior",
  "center",
  "academy",
  "charter",
  "magnet",
  "k",
  "k8",
  "of",
  "and",
  "the",
  "a",
  "an",
  "for",
  "at",
  "preparatory",
  "prep",
  "community",
  "technical",
  "program",
  "international",
  "sciences",
  "arts",
  "stem",
  "steam",
  "global",
  "virtual",
  "online",
  "district",
  "campus",
  "institute",
  "collegiate",
  "studies",
  "learning",
  "education",
]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, "-")
    .trim()
    .replace(/^-|-$/g, "");
}

function slugifySig(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !SKIP.has(w));
  return words.join("-");
}

function initials(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("");
}

function abbrev3(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => !SKIP.has(w));
  if (words.length === 0) return name.substring(0, 3).toLowerCase();
  if (words.length === 1) return words[0].substring(0, 3);
  return words
    .map((w) => w[0])
    .join("")
    .substring(0, 3);
}

function candidates(name: string): string[] {
  const full = slugify(name);
  const sig = slugifySig(name);
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !SKIP.has(w));
  const allWords = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const set = new Set<string>();
  [full, sig].forEach((s) => s && s.length >= 2 && set.add(s));
  if (words.length >= 2) set.add(words.slice(0, 2).join("-"));
  if (words.length >= 1) set.add(words[0]);
  if (allWords.length >= 2) set.add(allWords.slice(0, 2).join("-"));
  return [...set].filter((s) => s.length >= 2);
}

function detectPlatform(html: string): string {
  const h = html.toLowerCase();
  if (h.includes("finalsite")) return "Finalsite";
  if (h.includes("schoolwires") || h.includes("blackboard.com")) return "Blackboard";
  if (h.includes("edlio")) return "Edlio";
  if (h.includes("apptegy") || h.includes("thrillshare")) return "Apptegy";
  if (h.includes("wp-content") || h.includes("wp-includes")) return "WordPress";
  if (h.includes("wixsite.com")) return "Wix";
  if (h.includes("squarespace.com")) return "Squarespace";
  if (h.includes("drupal.js")) return "Drupal";
  if (h.includes("schoolmessenger")) return "SchoolMessenger";
  if (h.includes("powerschool")) return "PowerSchool";
  return "Unknown";
}

async function checkUrl(
  url: string,
  getHtml = false
): Promise<{ ok: boolean; html?: string; finalUrl?: string }> {
  try {
    const method = getHtml ? "GET" : "HEAD";
    const resp = await fetch(url, {
      method,
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      },
    });
    if (!resp.ok) return { ok: false };
    const html = getHtml ? await resp.text() : undefined;
    return { ok: true, html, finalUrl: resp.url };
  } catch {
    return { ok: false };
  }
}

async function probeAndSave(
  school: { id: string; name: string },
  urlCandidates: string[],
  label: string
): Promise<boolean> {
  for (const url of urlCandidates) {
    const { ok, html } = await checkUrl(url, true);
    if (ok) {
      const platform = html ? detectPlatform(html) : "Unknown";
      await p.school.update({
        where: { id: school.id },
        data: { website: url, websitePlatform: platform },
      });
      console.log(`  ✅ ${school.name} → ${url} [${platform}]`);
      return true;
    }
  }
  return false;
}

async function batchProcess(
  schools: { id: string; name: string }[],
  urlBuilder: (school: { id: string; name: string }) => string[],
  label: string,
  batchSize = 15,
  delayMs = 300
): Promise<number> {
  let found = 0;
  for (let i = 0; i < schools.length; i += batchSize) {
    const batch = schools.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((s) => probeAndSave(s, urlBuilder(s), label)));
    found += results.filter(Boolean).length;
    if (i + batchSize < schools.length) await new Promise((r) => setTimeout(r, delayMs));
  }
  return found;
}

async function getSchools(county: string): Promise<{ id: string; name: string }[]> {
  return p.school.findMany({
    where: { county, website: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─── KNOWN PATTERN COUNTIES ─────────────────────────────────────────────────

async function probeHillsborough() {
  const schools = await getSchools("Hillsborough");
  console.log(`\n🏫 Hillsborough: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => {
      const base = "https://www.hillsboroughschools.org/o/";
      return candidates(s.name).map((slug) => base + slug);
    },
    "Hillsborough"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeOrange() {
  const schools = await getSchools("Orange");
  console.log(`\n🏫 Orange: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => candidates(s.name).map((slug) => `https://${slug}.ocps.net`),
    "Orange"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeBroward() {
  const schools = await getSchools("Broward");
  console.log(`\n🏫 Broward: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => candidates(s.name).map((slug) => `https://${slug}.browardschools.com`),
    "Broward"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probePalmBeach() {
  const schools = await getSchools("Palm Beach");
  console.log(`\n🏫 Palm Beach: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => {
      const init = initials(s.name);
      const slugs = candidates(s.name);
      return [...new Set([init, ...slugs])].map((x) => `https://${x}.palmbeachschools.org`);
    },
    "Palm Beach"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeMiamiDade() {
  const schools = await getSchools("Miami-Dade");
  console.log(`\n🏫 Miami-Dade: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => candidates(s.name).map((slug) => `https://${slug}.dadeschools.net`),
    "Miami-Dade"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probePinellas() {
  const schools = await getSchools("Pinellas");
  console.log(`\n🏫 Pinellas: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => candidates(s.name).map((slug) => `https://${slug}.pcsb.org`),
    "Pinellas"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probePolk() {
  const schools = await getSchools("Polk");
  console.log(`\n🏫 Polk: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => candidates(s.name).map((slug) => `https://${slug}.polkschoolsfl.com`),
    "Polk"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probePasco() {
  const schools = await getSchools("Pasco");
  console.log(`\n🏫 Pasco: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => {
      const clean = s.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .trim();
      const words = clean.split(/\s+/).filter((w) => w.length > 0);
      const abbr = words
        .map((w) => w[0])
        .join("")
        .substring(0, 4);
      const abbr3 = words
        .map((w) => w[0])
        .join("")
        .substring(0, 3);
      const first3 = words[0] ? words[0].substring(0, 3) : "";
      return [...new Set([abbr, abbr3, first3, ...candidates(s.name)])].map(
        (x) => `https://${x}.pasco.k12.fl.us`
      );
    },
    "Pasco"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeBrevard() {
  const schools = await getSchools("Brevard");
  console.log(`\n🏫 Brevard: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => candidates(s.name).map((slug) => `https://${slug}.brevardschools.org`),
    "Brevard"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeDuval() {
  const schools = await getSchools("Duval");
  console.log(`\n🏫 Duval: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => {
      const pathCandidates = candidates(s.name).map(
        (slug) => `https://www.duvalschools.org/o/${slug}`
      );
      const subdomainCandidates = candidates(s.name).map(
        (slug) => `https://${slug}.duvalschools.org`
      );
      return [...pathCandidates, ...subdomainCandidates];
    },
    "Duval"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeLee() {
  const schools = await getSchools("Lee");
  console.log(`\n🏫 Lee: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => {
      const a3 = abbrev3(s.name);
      const init = initials(s.name).substring(0, 4);
      const slugs = candidates(s.name);
      return [...new Set([a3, init, ...slugs])].map((x) => `https://${x}.leeschools.net`);
    },
    "Lee"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeVolusia() {
  const schools = await getSchools("Volusia");
  console.log(`\n🏫 Volusia: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => candidates(s.name).map((slug) => `https://${slug}.vcsedu.org`),
    "Volusia"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeCollier() {
  const schools = await getSchools("Collier");
  console.log(`\n🏫 Collier: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => {
      const a3 = abbrev3(s.name);
      const init = initials(s.name).substring(0, 4);
      return [...new Set([a3, init, ...candidates(s.name)])].map(
        (x) => `https://${x}.collierschools.com`
      );
    },
    "Collier"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

async function probeEscambia() {
  const schools = await getSchools("Escambia");
  console.log(`\n🏫 Escambia: ${schools.length} missing`);
  const found = await batchProcess(
    schools,
    (s) => candidates(s.name).map((slug) => `https://${slug}.escambiaschools.org`),
    "Escambia"
  );
  console.log(`  → Found: ${found}`);
  return found;
}

// ─── NEW COUNTIES via district scraping ─────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(elementary|middle|senior|high|school|center|academy|k-8|k8|prep|magnet|charter|academies|institute|stem|steam|arts|sciences|collegiate|learning|education|campus|global|virtual|online|program|community|international|technical|preparatory|studies)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wa = new Set(na.split(/\s+/).filter((w) => w.length > 2));
  const wb = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : intersection / union;
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      },
    });
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

function extractLinks(
  html: string,
  baseUrl: string,
  patterns: RegExp[]
): { name: string; url: string }[] {
  const results: { name: string; url: string }[] = [];
  const linkRe = /<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    if (!text || text.length < 3) continue;
    if (!patterns.some((p) => p.test(href))) continue;
    let url = href;
    if (url.startsWith("/")) url = new URL(url, baseUrl).href;
    else if (!url.startsWith("http")) url = new URL(url, baseUrl).href;
    results.push({ name: text, url });
  }
  return results;
}

async function scrapeDistrictAndMatch(
  county: string,
  urls: string[],
  linkPatterns: RegExp[],
  threshold = 0.6
): Promise<number> {
  const schools = await getSchools(county);
  console.log(`\n🏫 ${county}: ${schools.length} missing`);
  if (schools.length === 0) return 0;

  const allLinks: { name: string; url: string }[] = [];
  for (const url of urls) {
    const html = await fetchHtml(url);
    if (html) {
      const links = extractLinks(html, url, linkPatterns);
      allLinks.push(...links);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`  → Found ${allLinks.length} links to match against ${schools.length} schools`);
  let found = 0;
  for (const school of schools) {
    let best = { score: 0, url: "", name: "" };
    for (const link of allLinks) {
      const score = similarity(school.name, link.name);
      if (score > best.score) best = { score, url: link.url, name: link.name };
    }
    if (best.score >= threshold && best.url) {
      const { ok, html } = await checkUrl(best.url, true);
      if (ok) {
        const platform = html ? detectPlatform(html) : "Unknown";
        await p.school.update({
          where: { id: school.id },
          data: { website: best.url, websitePlatform: platform },
        });
        console.log(
          `  ✅ ${school.name} → ${best.url} [${platform}] (score: ${best.score.toFixed(2)})`
        );
        found++;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  console.log(`  → Found: ${found}`);
  return found;
}

// ─── DISTRICT PAGE SCRAPERS ──────────────────────────────────────────────────

async function probeSeminole() {
  return scrapeDistrictAndMatch(
    "Seminole",
    [
      "https://www.scps.k12.fl.us/domain/30",
      "https://www.scps.k12.fl.us/schools",
      "https://www.scps.k12.fl.us/domain/",
    ],
    [/scps\.k12\.fl\.us\/domain\/\d+/, /scps\.k12\.fl\.us\/\w/]
  );
}

async function probeManatee() {
  return scrapeDistrictAndMatch(
    "Manatee",
    ["https://www.manateeschools.net/schools", "https://www.manateeschools.net/domain/"],
    [/manateeschools\.net\/domain\/\d+/, /manateeschools\.net\/\w/]
  );
}

async function probeOsceola() {
  return scrapeDistrictAndMatch(
    "Osceola",
    ["https://www.osceolaschools.net/schools", "https://www.osceolaschools.net/domain/"],
    [/osceolaschools\.net\/domain\/\d+/, /osceolaschools\.net\/\w/]
  );
}

async function probeAlachua() {
  return scrapeDistrictAndMatch(
    "Alachua",
    ["https://www.sbac.edu/schools", "https://www.sbac.edu/domain/"],
    [/sbac\.edu\/domain\/\d+/, /sbac\.edu\/\w/]
  );
}

async function probeSarasota() {
  return scrapeDistrictAndMatch(
    "Sarasota",
    [
      "https://www.sarasotacountyschools.net/schools",
      "https://www.sarasotacountyschools.net/domain/",
    ],
    [/sarasotacountyschools\.net\/domain\/\d+/, /sarasotacountyschools\.net\/\w/]
  );
}

async function probeLake() {
  return scrapeDistrictAndMatch(
    "Lake",
    ["https://www.lake.k12.fl.us/schools", "https://www.lake.k12.fl.us/domain/"],
    [/lake\.k12\.fl\.us\/domain\/\d+/, /lake\.k12\.fl\.us\/\w/]
  );
}

async function probeMarion() {
  return scrapeDistrictAndMatch(
    "Marion",
    ["https://www.marion.k12.fl.us/schools", "https://www.marion.k12.fl.us/domain/"],
    [/marion\.k12\.fl\.us\/domain\/\d+/, /marion\.k12\.fl\.us\/\w/]
  );
}

async function probeLeon() {
  return scrapeDistrictAndMatch(
    "Leon",
    ["https://www.leonschools.net/schools", "https://www.leonschools.net/domain/"],
    [/leonschools\.net\/domain\/\d+/, /leonschools\.net\/\w/]
  );
}

async function probeStJohns() {
  return scrapeDistrictAndMatch(
    "St. Johns",
    ["https://www.stjohns.k12.fl.us/schools", "https://www.stjohns.k12.fl.us/domain/"],
    [/stjohns\.k12\.fl\.us\/domain\/\d+/, /stjohns\.k12\.fl\.us\/\w/]
  );
}

async function probeStLucie() {
  return scrapeDistrictAndMatch(
    "St. Lucie",
    ["https://www.stlucieschools.org/schools", "https://www.stlucieschools.org/domain/"],
    [/stlucieschools\.org\/domain\/\d+/, /stlucieschools\.org\/\w/]
  );
}

async function probeOkaloosa() {
  return scrapeDistrictAndMatch(
    "Okaloosa",
    ["https://www.okaloosaschools.com/schools", "https://www.okaloosaschools.com/domain/"],
    [/okaloosaschools\.com\/domain\/\d+/, /okaloosaschools\.com\/\w/]
  );
}

async function probeClay() {
  return scrapeDistrictAndMatch(
    "Clay",
    ["https://www.clay.k12.fl.us/schools", "https://www.clay.k12.fl.us/domain/"],
    [/clay\.k12\.fl\.us\/domain\/\d+/, /clay\.k12\.fl\.us\/\w/]
  );
}

async function probeBay() {
  return scrapeDistrictAndMatch(
    "Bay",
    ["https://www.bay.k12.fl.us/schools", "https://www.bay.k12.fl.us/domain/"],
    [/bay\.k12\.fl\.us\/domain\/\d+/, /bay\.k12\.fl\.us\/\w/]
  );
}

async function probeSantaRosa() {
  return scrapeDistrictAndMatch(
    "Santa Rosa",
    ["https://www.santarosa.k12.fl.us/schools", "https://www.santarosa.k12.fl.us/domain/"],
    [/santarosa\.k12\.fl\.us\/domain\/\d+/, /santarosa\.k12\.fl\.us\/\w/]
  );
}

async function probeHernando() {
  return scrapeDistrictAndMatch(
    "Hernando",
    ["https://www.hernandoschools.org/schools", "https://www.hernandoschools.org/domain/"],
    [/hernandoschools\.org\/domain\/\d+/, /hernandoschools\.org\/\w/]
  );
}

async function probeCitrus() {
  return scrapeDistrictAndMatch(
    "Citrus",
    ["https://www.citrus.k12.fl.us/schools", "https://www.citrus.k12.fl.us/domain/"],
    [/citrus\.k12\.fl\.us\/domain\/\d+/, /citrus\.k12\.fl\.us\/\w/]
  );
}

async function probeIndianRiver() {
  return scrapeDistrictAndMatch(
    "Indian River",
    ["https://www.indianriverschools.org/schools", "https://www.indianriverschools.org/domain/"],
    [/indianriverschools\.org\/domain\/\d+/, /indianriverschools\.org\/\w/]
  );
}

async function probeCharlotte() {
  return scrapeDistrictAndMatch(
    "Charlotte",
    [
      "https://www.yourcharlotteschools.net/schools",
      "https://www.yourcharlotteschools.net/domain/",
    ],
    [/yourcharlotteschools\.net\/domain\/\d+/, /yourcharlotteschools\.net\/\w/]
  );
}

async function probeMartin() {
  return scrapeDistrictAndMatch(
    "Martin",
    ["https://www.martinschools.org/schools", "https://www.martinschools.org/domain/"],
    [/martinschools\.org\/domain\/\d+/, /martinschools\.org\/\w/]
  );
}

async function probeMonroe() {
  return scrapeDistrictAndMatch(
    "Monroe",
    [
      "https://www.keysschools.com/schools",
      "https://www.keysschools.com/domain/",
      "https://monroe.k12.fl.us/schools",
    ],
    [/keysschools\.com\/domain\/\d+/, /keysschools\.com\/\w/, /monroe\.k12\.fl\.us/]
  );
}

async function probeNassau() {
  return scrapeDistrictAndMatch(
    "Nassau",
    ["https://www.nassau.k12.fl.us/schools", "https://www.nassau.k12.fl.us/domain/"],
    [/nassau\.k12\.fl\.us\/domain\/\d+/, /nassau\.k12\.fl\.us\/\w/]
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const startTotal = await p.school.count({ where: { website: { not: null } } });
  console.log(`\n📊 Starting: ${startTotal}/4146 schools with websites\n`);
  console.log("═".repeat(60));

  const results: { county: string; found: number }[] = [];

  const run = async (county: string, fn: () => Promise<number>) => {
    const n = await fn();
    results.push({ county, found: n });
  };

  // Known patterns
  await run("Hillsborough", probeHillsborough);
  await run("Orange", probeOrange);
  await run("Broward", probeBroward);
  await run("Palm Beach", probePalmBeach);
  await run("Miami-Dade", probeMiamiDade);
  await run("Pinellas", probePinellas);
  await run("Polk", probePolk);
  await run("Pasco", probePasco);
  await run("Brevard", probeBrevard);
  await run("Duval", probeDuval);
  await run("Lee", probeLee);
  await run("Volusia", probeVolusia);
  await run("Collier", probeCollier);
  await run("Escambia", probeEscambia);

  // District scrape counties
  await run("Seminole", probeSeminole);
  await run("Manatee", probeManatee);
  await run("Osceola", probeOsceola);
  await run("Alachua", probeAlachua);
  await run("Sarasota", probeSarasota);
  await run("Lake", probeLake);
  await run("Marion", probeMarion);
  await run("Leon", probeLeon);
  await run("St. Johns", probeStJohns);
  await run("St. Lucie", probeStLucie);
  await run("Okaloosa", probeOkaloosa);
  await run("Clay", probeClay);
  await run("Bay", probeBay);
  await run("Santa Rosa", probeSantaRosa);
  await run("Hernando", probeHernando);
  await run("Citrus", probeCitrus);
  await run("Indian River", probeIndianRiver);
  await run("Charlotte", probeCharlotte);
  await run("Martin", probeMartin);
  await run("Monroe", probeMonroe);
  await run("Nassau", probeNassau);

  const endTotal = await p.school.count({ where: { website: { not: null } } });
  const gained = endTotal - startTotal;

  console.log("\n" + "═".repeat(60));
  console.log("📊 FINAL RESULTS");
  console.log("═".repeat(60));
  for (const r of results) {
    if (r.found > 0) console.log(`  ${r.county.padEnd(20)} +${r.found}`);
  }
  console.log("─".repeat(60));
  console.log(`  Total gained: +${gained}`);
  console.log(`  Total with websites: ${endTotal}/4146`);
  console.log(`  Coverage: ${Math.round((endTotal / 4146) * 100)}%`);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
