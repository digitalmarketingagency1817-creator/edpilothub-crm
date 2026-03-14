/**
 * Clay (Thrillshare), Martin (Thrillshare), Walton (Thrillshare),
 * Santa Rosa, Citrus, Highlands, Putnam county school imports
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

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(
      /\b(elementary|middle|high|school|senior|junior|academy|charter|magnet|center|k-8|k8|of|the|and|at|for|county|virtual|instruction|program|franchise)\b/g,
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
function slug(name: string) {
  const skip = new Set([
    "elementary",
    "middle",
    "high",
    "school",
    "senior",
    "junior",
    "academy",
    "charter",
    "magnet",
    "center",
    "k8",
    "of",
    "the",
    "and",
    "at",
    "for",
    "county",
    "jr",
    "sr",
  ]);
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !skip.has(w))
    .join("-");
}
function slugFull(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function fetchPage(url: string): Promise<{ title: string; html: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });
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

async function probeBySlug(county: string, baseUrl: string, slugFn: (s: any) => string[]) {
  const schools = await p.school.findMany({
    where: { county, website: null },
    select: { id: true, name: true },
  });
  console.log(`\n=== ${county}: ${schools.length} schools ===`);
  let found = 0;
  const BATCH = 10;

  const candidates: Array<{ school: any; url: string }> = [];
  for (const s of schools) {
    for (const sl of slugFn(s)) {
      candidates.push({ school: s, url: `${baseUrl}${sl}` });
    }
  }

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ school, url }) => {
        if (school.website) return;
        const result = await fetchPage(url);
        if (!result || !result.title) return;
        const normTitle = normalize(result.title);
        if (!normTitle || normTitle.length < 2) return;
        const score = similarity(normalize(school.name), normTitle);
        if (score >= 0.4) {
          const platform = detectPlatform(result.html);
          await p.school.update({
            where: { id: school.id },
            data: { website: url, websitePlatform: platform },
          });
          console.log(`✅ ${school.name} → ${url} [${platform}] (${score.toFixed(2)})`);
          school.website = url;
          found++;
        }
      })
    );
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`  → ${county}: ${found} found`);
  return found;
}

async function probeFromTitleMatch(county: string, urls: string[]) {
  const schools = await p.school.findMany({
    where: { county, website: null },
    select: { id: true, name: true },
  });
  console.log(`\n=== ${county} (title-match): ${schools.length} schools, ${urls.length} URLs ===`);
  let found = 0;
  const BATCH = 8;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (url) => {
        const result = await fetchPage(url);
        if (!result || !result.title) return;
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
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`  → ${county}: ${found} found`);
  return found;
}

async function main() {
  // CLAY — Thrillshare: claycountysdfl.sites.thrillshare.com/o/{slug}
  await probeBySlug("Clay", "https://claycountysdfl.sites.thrillshare.com/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
    s.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 10),
  ]);

  // MARTIN — Thrillshare: martincountyfl.sites.thrillshare.com/o/{slug}
  await probeBySlug("Martin", "https://martincountyfl.sites.thrillshare.com/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // WALTON — Thrillshare: waltoncountysdfl.id.thrillshare.com/o/{slug}
  await probeBySlug("Walton", "https://waltoncountysdfl.id.thrillshare.com/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // SANTA ROSA — try /o/ pattern on santarosa.k12.fl.us or sref.us
  await probeBySlug("Santa Rosa", "https://www.santarosa.k12.fl.us/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // CITRUS — check citrus.k12.fl.us school pages
  await probeBySlug("Citrus", "https://www.citrus.k12.fl.us/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // HIGHLANDS
  await probeBySlug("Highlands", "https://hcsb.org/o/", (s) => [slug(s.name), slugFull(s.name)]);

  // PUTNAM
  await probeBySlug("Putnam", "https://www.putnamschools.com/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // FLAGLER — Finalsite /o/{slug}
  await probeBySlug("Flagler", "https://www.flaglerschools.com/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // COLUMBIA
  await probeBySlug("Columbia", "https://columbia.k12.fl.us/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // GADSDEN
  await probeBySlug("Gadsden", "https://www.gcps.k12.fl.us/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // HENDRY
  await probeBySlug("Hendry", "https://hcsb.org/o/", (s) => [slug(s.name), slugFull(s.name)]);

  // NASSAU
  await probeBySlug("Nassau", "https://nassauschools.org/o/", (s) => [
    slug(s.name),
    slugFull(s.name),
  ]);

  // Run detect-platforms for any new sites without platform
  console.log("\n=== Running platform detection for new URLs ===");
  const newSites = await p.school.findMany({
    where: { website: { not: null }, websitePlatform: null },
    select: { id: true, website: true },
  });
  console.log(`${newSites.length} schools need platform detection`);

  console.log("\n✅ Done!");
  await (prisma as any).$disconnect();
}
main().catch(console.error);
