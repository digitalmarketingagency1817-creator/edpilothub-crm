import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never) as any;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SKIP_EMAILS = /noreply|donotreply|no-reply|spam|postmaster|webmaster|bounce|unsubscribe/i;

const PRINCIPAL_PATTERNS = [
  /Principal[:\s,]+(?:Dr\.\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
  /(?:Dr\.\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})[,\s]+Principal/,
  /Principal[:\s]+([A-Z][a-zA-Z.\s-]{5,40}?)(?:\s*<|\s*\n|\s*,|\s*\()/,
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractEmails(html: string): string[] {
  const matches = html.match(EMAIL_REGEX) || [];
  return [...new Set(matches.filter((e) => !SKIP_EMAILS.test(e)))];
}

function extractPrincipal(html: string): { name: string; email?: string } | null {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const pattern of PRINCIPAL_PATTERNS) {
    const m = text.match(pattern);
    if (m && m[1] && m[1].trim().length > 3) {
      return { name: m[1].trim() };
    }
  }
  return null;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SchoolBot/1.0)" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

function findContactLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /href=["']([^"']+)["']/gi;
  let m;
  const keywords = /contact|staff|administration|about|directory|principal|faculty/i;
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1];
    if (keywords.test(href)) {
      try {
        const full = href.startsWith("http") ? href : new URL(href, baseUrl).href;
        if (!links.includes(full)) links.push(full);
      } catch {
        /* skip invalid URLs */
      }
    }
  }
  return links.slice(0, 3); // max 3 subpages per school
}

async function scrapeSchool(school: { id: string; name: string; website: string }) {
  let emails: string[] = [];
  let principal: { name: string } | null = null;

  try {
    const mainHtml = await fetchWithTimeout(school.website);
    emails = extractEmails(mainHtml);
    principal = extractPrincipal(mainHtml);

    const subLinks = findContactLinks(mainHtml, school.website);
    for (const link of subLinks) {
      try {
        const subHtml = await fetchWithTimeout(link, 8000);
        const subEmails = extractEmails(subHtml);
        emails = [...new Set([...emails, ...subEmails])];
        if (!principal) {
          principal = extractPrincipal(subHtml);
        }
      } catch {
        /* skip subpage errors */
      }
    }
  } catch {
    /* skip school on main page error */
  }

  return { emails, principal };
}

async function main() {
  const schools = await prisma.school.findMany({
    where: {
      website: { not: null },
      contacts: { none: {} },
    },
    select: { id: true, name: true, website: true },
    take: 100,
    orderBy: { studentCount: "desc" },
  });

  let processed = 0;
  let contactsFound = 0;
  let emailsExtracted = 0;
  let principalsFound = 0;

  for (const school of schools) {
    try {
      const { emails, principal } = await scrapeSchool(school as any);

      if (emails.length === 0 && !principal) {
        process.stderr.write(`  ✗ ${school.name}\n`);
        processed++;
        await sleep(2000);
        continue;
      }

      // Determine what to save
      let contact: {
        name: string;
        title: string;
        email: string | null;
        isPrimary: boolean;
      } | null = null;

      if (principal) {
        // Find best email for principal (first school-domain email or any first email)
        const schoolDomain = new URL(school.website).hostname.replace("www.", "");
        const principalEmail = emails.find((e) => e.includes(schoolDomain)) || emails[0] || null;
        contact = {
          name: principal.name,
          title: "Principal",
          email: principalEmail,
          isPrimary: true,
        };
        principalsFound++;
        if (principalEmail) emailsExtracted++;
      } else if (emails.length > 0) {
        contact = { name: "Main Office", title: "Office", email: emails[0], isPrimary: true };
        emailsExtracted++;
      }

      if (contact) {
        await prisma.contact.create({
          data: {
            schoolId: school.id,
            name: contact.name,
            title: contact.title,
            email: contact.email,
            isPrimary: contact.isPrimary,
          },
        });
        contactsFound++;
        process.stderr.write(
          `  ✓ ${school.name} → ${contact.title}: ${contact.name} (${contact.email || "no email"})\n`
        );
      }
    } catch (err) {
      process.stderr.write(`  ✗ ${school.name} (DB error)\n`);
    }

    processed++;
    await sleep(2000);
  }

  // Final DB count
  const totalContacts = await prisma.contact.count();

  process.stdout.write(
    JSON.stringify({
      processed,
      total: schools.length,
      contactsFound,
      emailsExtracted,
      principalsFound,
      dbTotalContacts: totalContacts,
    })
  );
}

main().finally(() => prisma.$disconnect());
