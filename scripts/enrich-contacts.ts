/**
 * enrich-contacts.ts
 * Cost-effective school contact enrichment via Hunter.io domain cache + Gemini name lookup.
 *
 * Flow:
 *   1. Load 60 schools from DB
 *   2. Extract Hunter domains (deduplicated)
 *   3. Fetch Hunter domain data → stored in domain-cache.json ONLY (never bulk-written to DB)
 *   4. Gemini confirms the specific person at each school (principal / tech coordinator)
 *   5. Cross-reference that name in Hunter cache to find their email
 *   6. Insert ONLY the Gemini-confirmed decision makers into the DB Contact table
 *
 * NOTE: Without a Gemini key the cache is still built, but NO contacts are inserted.
 * The Hunter cache is a lookup tool — not a source of bulk DB inserts.
 *
 * Run: npx tsx scripts/enrich-contacts.ts
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

// ─── Env ────────────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const HUNTER_API_KEY = process.env.HUNTER_API_KEY ?? "";
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
const CACHE_FILE = path.resolve(process.cwd(), "scripts/domain-cache.json");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCHOOL_LIMIT = 25;
const GEMINI_CONCURRENCY = 8; // parallel Gemini calls per batch

// ─── Types ───────────────────────────────────────────────────────────────────
interface HunterEmail {
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  linkedin: string;
}

interface DomainCacheEntry {
  fetchedAt: string;
  pattern: string;
  emails: HunterEmail[];
}

type DomainCache = Record<string, DomainCacheEntry>;

interface ContactToInsert {
  name: string;
  title: string;
  email: string | null;
  linkedinUrl: string | null;
  source: "direct" | "constructed" | "name-only";
}

// ─── Decision-maker filter ────────────────────────────────────────────────────
// These roles control website / tech / communications purchasing decisions.
const DECISION_MAKER_KEYWORDS = [
  "principal",
  "assistant principal",
  "vice principal",
  "technology coordinator",
  "technology director",
  "director of technology",
  "director of information",
  "director of instructional technology",
  "instructional technology",
  "it director",
  "director of it",
  "communications director",
  "director of communications",
  "web manager",
  "webmaster",
  "superintendent",
  "chief information officer",
  "chief technology officer",
  " cio",
  " cto",
  "network administrator",
];

// Explicitly NOT decision makers — reject even when they contain a DM keyword
const NON_DECISION_MAKER_KEYWORDS = [
  "child care",
  "risk management",
  "guidance",
  "human resources",
  "finance",
  "food service",
  "custodian",
  "librarian",
  "coach",
  "teacher",
  "counselor",
  "secretary",
  "receptionist",
  "accounting",
  "payroll",
  "transportation",
  "facilities",
];

/**
 * Returns true only for roles that make or heavily influence
 * website / EdTech / communications purchasing decisions.
 */
function isDecisionMakerTitle(title: string): boolean {
  const lower = title.toLowerCase();
  for (const kw of NON_DECISION_MAKER_KEYWORDS) {
    if (lower.includes(kw)) return false;
  }
  for (const kw of DECISION_MAKER_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

// ─── Bad contact name filter ──────────────────────────────────────────────────
const BAD_NAME_PREFIXES = [
  "school",
  "email",
  "portal",
  "focus",
  "national",
  "office",
  "the",
  "at",
  "west gate",
  "citrus high",
];

function isBadContactName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length < 2) return true;
  for (const prefix of BAD_NAME_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  return false;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
function loadCache(): DomainCache {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as DomainCache;
  } catch {
    return {};
  }
}

function saveCache(cache: DomainCache): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + "\n");
}

function isCacheFresh(entry: DomainCacheEntry): boolean {
  return Date.now() - new Date(entry.fetchedAt).getTime() < CACHE_TTL_MS;
}

// ─── Domain extraction ────────────────────────────────────────────────────────
function extractHunterDomain(websiteUrl: string): string | null {
  try {
    let url = websiteUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const parts = hostname.split(".");
    // *.fl.us → keep last 4 parts (e.g. k12.lake.fl.us)
    if (hostname.endsWith(".fl.us") && parts.length >= 4) {
      return parts.slice(-4).join(".");
    }
    // default: last 2 parts (e.g. browardschools.com)
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

// ─── Hunter API ───────────────────────────────────────────────────────────────
async function fetchHunterDomain(domain: string): Promise<DomainCacheEntry | null> {
  try {
    const url =
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}` +
      `&api_key=${HUNTER_API_KEY}&limit=100`;
    const res = await fetch(url);
    if (res.status === 429) {
      console.log(`  [Hunter] ⚠️  Rate limited for ${domain} — skipping`);
      return null;
    }
    if (!res.ok) {
      console.log(`  [Hunter] Error ${res.status} for ${domain}`);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emails: HunterEmail[] = (data.data?.emails ?? []).map((e: any) => ({
      email: e.value ?? "",
      firstName: e.first_name ?? "",
      lastName: e.last_name ?? "",
      position: e.position ?? "",
      linkedin: e.linkedin ?? "",
    }));
    return {
      fetchedAt: new Date().toISOString(),
      pattern: (data.data?.pattern as string) ?? "",
      emails,
    };
  } catch (err) {
    console.log(`  [Hunter] Exception for ${domain}:`, err);
    return null;
  }
}

async function verifyHunterEmail(email: string): Promise<boolean> {
  try {
    const url =
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}` +
      `&api_key=${HUNTER_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const status = (data.data?.status as string) ?? "";
    return status === "valid" || status === "accept_all";
  } catch {
    return false;
  }
}

// ─── Gemini lookup ────────────────────────────────────────────────────────────
async function geminiLookup(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` +
      `?key=${GEMINI_API_KEY}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 80, temperature: 0.1 },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as any;
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) return null;
    const upper = text.toUpperCase();
    if (upper.includes("NULL") || upper.includes("UNKNOWN") || upper.includes("NOT FOUND")) {
      return null;
    }
    // Extract a proper "First Last" — at least 2 capitalized words
    const match = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// ─── Email construction ───────────────────────────────────────────────────────
function constructEmail(
  pattern: string,
  firstName: string,
  lastName: string,
  domain: string
): string {
  const first = firstName.toLowerCase();
  const last = lastName.toLowerCase();
  const fi = first.charAt(0);
  const li = last.charAt(0);
  const local = pattern
    .replace("{first}", first)
    .replace("{last}", last)
    .replace("{f}", fi)
    .replace("{l}", li);
  return `${local}@${domain}`;
}

// ─── Fuzzy name match inside Hunter cache ─────────────────────────────────────
function findInHunter(
  firstName: string,
  lastName: string,
  emails: HunterEmail[]
): HunterEmail | null {
  const fn = firstName.toLowerCase();
  const ln = lastName.toLowerCase();
  // Exact first+last
  for (const e of emails) {
    if (e.firstName.toLowerCase() === fn && e.lastName.toLowerCase() === ln) return e;
  }
  // Same first name, last name shares first 4 chars (handles Mc/Mac prefix etc.)
  const ln4 = ln.substring(0, 4);
  for (const e of emails) {
    if (e.firstName.toLowerCase() === fn && e.lastName.toLowerCase().startsWith(ln4)) return e;
  }
  return null;
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== Enrich Contacts — Starting ===");
  console.log(`Hunter key: ${HUNTER_API_KEY ? "✅ loaded" : "❌ MISSING"}`);
  console.log(
    `Gemini key: ${GEMINI_API_KEY ? "✅ loaded" : "⚠️  not set — cache will build but NO DB inserts"}`
  );

  if (!HUNTER_API_KEY) {
    console.error("HUNTER_API_KEY is required. Aborting.");
    process.exit(1);
  }

  // DB connection
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Stats
  const stats = {
    schoolsProcessed: 0,
    domainsFromCache: 0,
    domainsNew: 0,
    geminiSearches: 0,
    contactsInserted: 0,
    directHunterMatch: 0,
    constructedVerified: 0,
    nameOnly: 0,
    emailsFound: 0,
    linkedinFound: 0,
    badContactsCleaned: 0,
  };

  // Load Hunter domain cache (persists between runs to save credits)
  const cache = loadCache();

  // ── STEP 0: Clean up previously-inserted non-decision-maker contacts ─────
  // Removes any contacts in the DB whose title is NOT a decision-maker role
  // (e.g. contacts bulk-inserted by accident from Hunter title iteration).
  console.log("\n[Step 0] Cleaning up non-decision-maker contacts...");
  const allContacts = await prisma.contact.findMany({
    select: { id: true, name: true, title: true },
  });
  const toDelete = allContacts.filter((c) => c.title !== null && !isDecisionMakerTitle(c.title));
  if (toDelete.length > 0) {
    await prisma.contact.deleteMany({ where: { id: { in: toDelete.map((c) => c.id) } } });
    stats.badContactsCleaned = toDelete.length;
    console.log(`  → Removed ${toDelete.length} contacts with non-decision-maker titles`);
    if (toDelete.length <= 10) {
      for (const c of toDelete) console.log(`    - "${c.name}" | ${c.title ?? "(no title)"}`);
    }
  } else {
    console.log("  → Nothing to clean");
  }

  // ── STEP 1: Load schools ──────────────────────────────────────────────────
  console.log("\n[Step 1] Loading schools from DB...");
  const schools = await prisma.school.findMany({
    where: {
      website: { not: null },
      studentCount: { gte: 200 },
      OR: [{ contacts: { none: {} } }, { contacts: { every: { email: null, linkedinUrl: null } } }],
    },
    include: { contacts: true },
    orderBy: { studentCount: "desc" },
    take: SCHOOL_LIMIT,
  });
  console.log(`  → ${schools.length} schools loaded`);

  // ── STEP 2: Extract domains (deduplicated) ────────────────────────────────
  const domainToSchools = new Map<string, typeof schools>();
  const schoolToDomain = new Map<string, string>();

  for (const school of schools) {
    const domain = extractHunterDomain(school.website!);
    if (!domain) {
      console.log(`  ⚠️  Cannot parse domain for "${school.name}" (website: ${school.website})`);
      continue;
    }
    schoolToDomain.set(school.id, domain);
    if (!domainToSchools.has(domain)) domainToSchools.set(domain, []);
    domainToSchools.get(domain)!.push(school);
  }
  console.log(`  → ${domainToSchools.size} unique Hunter domains for ${schools.length} schools`);

  // ── STEP 3: Hunter domain cache ───────────────────────────────────────────
  // Fetches ALL emails for each domain and stores them in domain-cache.json.
  // This is a lookup tool only — nothing here goes to the DB directly.
  console.log("\n[Step 3] Fetching Hunter domain data (cache = lookup tool only)...");
  for (const [domain] of domainToSchools) {
    if (cache[domain] && isCacheFresh(cache[domain])) {
      console.log(`  [cache] ${domain} → ${cache[domain].emails.length} emails`);
      stats.domainsFromCache++;
    } else {
      process.stdout.write(`  [fetch] ${domain}... `);
      const entry = await fetchHunterDomain(domain);
      if (entry) {
        cache[domain] = entry;
        console.log(`${entry.emails.length} emails, pattern="${entry.pattern || "none"}"`);
      } else {
        // Store empty entry so we don't retry until TTL expires
        cache[domain] = { fetchedAt: new Date().toISOString(), pattern: "", emails: [] };
        console.log("0 emails (error/empty)");
      }
      stats.domainsNew++;
      saveCache(cache);
      await sleep(600); // be polite to Hunter API
    }
  }
  console.log(`  Cache persisted → ${CACHE_FILE}`);

  if (!GEMINI_API_KEY) {
    console.log(
      "\n⚠️  No Gemini key — skipping school-specific enrichment (cache built successfully)."
    );
    await prisma.$disconnect();
    printSummary(stats);
    return;
  }

  // ── STEP 4–6: Per-school enrichment (parallel batches) ─────────────────
  console.log("\n[Step 4-6] School-specific enrichment via Gemini → Hunter cross-reference...");

  // Process schools in parallel batches of GEMINI_CONCURRENCY
  async function processSchool(school: (typeof schools)[0]): Promise<void> {
    const domain = schoolToDomain.get(school.id);
    if (!domain) return;

    const domainData = cache[domain];
    stats.schoolsProcessed++;

    const contactsToInsert: ContactToInsert[] = [];

    // ── Gemini lookups (run principal + tech in parallel) ────────────────
    const pQuery =
      `"${school.name}" "${school.city}" Florida principal 2025 OR 2026. ` +
      `Reply with ONLY the full name (First Last) of the current principal. If unknown, reply NULL.`;

    const needsTech = (school.studentCount ?? 0) > 1000;
    const tQuery = needsTech
      ? `"${school.name}" Florida "technology coordinator" OR "IT director" OR "instructional technology" 2025 2026. ` +
        `Reply with ONLY the full name (First Last). If unknown, reply NULL.`
      : null;

    const [principalName, techName] = await Promise.all([
      geminiLookup(pQuery).then((n) => {
        stats.geminiSearches++;
        return n;
      }),
      tQuery
        ? geminiLookup(tQuery).then((n) => {
            stats.geminiSearches++;
            return n;
          })
        : Promise.resolve(null),
    ]);

    if (principalName) console.log(`  ✓ ${school.name} → principal: ${principalName}`);
    if (techName) console.log(`  ✓ ${school.name} → tech: ${techName}`);

    // ── Cross-reference with Hunter cache ────────────────────────────────
    const lookups: Array<{ name: string; title: string }> = [];
    if (principalName) lookups.push({ name: principalName, title: "Principal" });
    if (techName) lookups.push({ name: techName, title: "Technology Coordinator" });

    for (const { name, title } of lookups) {
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length < 2) continue;
      const firstName = nameParts[0]!;
      const lastName = nameParts.slice(1).join(" ");

      const directMatch = domainData ? findInHunter(firstName, lastName, domainData.emails) : null;

      if (directMatch?.email) {
        contactsToInsert.push({
          name,
          title,
          email: directMatch.email,
          linkedinUrl: directMatch.linkedin || null,
          source: "direct",
        });
      } else if (domainData?.pattern) {
        const constructed = constructEmail(domainData.pattern, firstName, lastName, domain);
        const verified = await verifyHunterEmail(constructed);
        if (verified) {
          contactsToInsert.push({
            name,
            title,
            email: constructed,
            linkedinUrl: null,
            source: "constructed",
          });
        } else {
          contactsToInsert.push({
            name,
            title,
            email: null,
            linkedinUrl: null,
            source: "name-only",
          });
        }
      } else {
        contactsToInsert.push({ name, title, email: null, linkedinUrl: null, source: "name-only" });
      }
    }

    // ── Clean + write to DB ──────────────────────────────────────────────
    for (const c of school.contacts) {
      if (isBadContactName(c.name)) await prisma.contact.delete({ where: { id: c.id } });
    }

    for (const contact of contactsToInsert) {
      if (!isDecisionMakerTitle(contact.title)) continue;

      // Always check DB fresh (not just loaded contacts snapshot) to prevent race-condition dupes
      const existing = await prisma.contact.findFirst({
        where: { schoolId: school.id, name: { equals: contact.name, mode: "insensitive" } },
      });
      if (existing) {
        // Upgrade: if we now have an email and existing doesn't, update it
        if (!existing.email && contact.email) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              email: contact.email,
              linkedinUrl: contact.linkedinUrl ?? existing.linkedinUrl,
            },
          });
          stats.emailsFound++;
          console.log(
            `  [UP] ${school.name} \u2192 ${contact.name} upgraded with email <${contact.email}>`
          );
        }
        continue; // skip insert — already exists
      }

      await prisma.contact.create({
        data: {
          schoolId: school.id,
          name: contact.name,
          title: contact.title,
          email: contact.email,
          linkedinUrl: contact.linkedinUrl,
          isPrimary: contact.title === "Principal",
        },
      });

      stats.contactsInserted++;
      if (contact.source === "direct") stats.directHunterMatch++;
      else if (contact.source === "constructed") stats.constructedVerified++;
      else stats.nameOnly++;
      if (contact.email) stats.emailsFound++;
      if (contact.linkedinUrl) stats.linkedinFound++;

      const emailStr = contact.email ? ` <${contact.email}>` : "";
      console.log(
        `  [DB] ${school.name} → ${contact.name} (${contact.title})${emailStr} [${contact.source}]`
      );
    }
  }

  // Run in parallel batches
  for (let i = 0; i < schools.length; i += GEMINI_CONCURRENCY) {
    const batch = schools.slice(i, i + GEMINI_CONCURRENCY);
    await Promise.all(batch.map(processSchool));
  }

  await prisma.$disconnect();
  printSummary(stats);
}

function printSummary(stats: {
  schoolsProcessed: number;
  domainsFromCache: number;
  domainsNew: number;
  geminiSearches: number;
  contactsInserted: number;
  directHunterMatch: number;
  constructedVerified: number;
  nameOnly: number;
  emailsFound: number;
  linkedinFound: number;
  badContactsCleaned: number;
}) {
  const totalDomains = stats.domainsFromCache + stats.domainsNew;
  console.log("\n=== Enrich Contacts Run ===");
  console.log(`Schools processed:     ${stats.schoolsProcessed}`);
  console.log(
    `Hunter domains:        ${totalDomains} (${stats.domainsFromCache} cache, ${stats.domainsNew} new)`
  );
  console.log(`Hunter credits used:   ~${stats.domainsNew}`);
  console.log(`Gemini searches:       ${stats.geminiSearches}`);
  console.log(`Bad contacts cleaned:  ${stats.badContactsCleaned}`);
  console.log(`Contacts inserted:     ${stats.contactsInserted}`);
  console.log(`  - Direct match:      ${stats.directHunterMatch}`);
  console.log(`  - Constructed+verif: ${stats.constructedVerified}`);
  console.log(`  - Name only:         ${stats.nameOnly}`);
  console.log(`Emails found:          ${stats.emailsFound}`);
  console.log(`LinkedIn URLs:         ${stats.linkedinFound}`);
  console.log("===========================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
