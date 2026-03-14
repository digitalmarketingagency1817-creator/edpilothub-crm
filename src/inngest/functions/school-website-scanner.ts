import { inngest } from "../client";
import { db } from "@/server/db";

const BLOCKED_DOMAINS = [
  "facebook.com",
  "twitter.com",
  "instagram.com",
  "yelp.com",
  "greatschools.org",
  "niche.com",
  "schooldigger.com",
  "publicschoolreview.com",
  "usnews.com",
  "wikipedia.org",
  "youtube.com",
  "linkedin.com",
  "nces.ed.gov",
  "fldoe.org",
  "ratemyteachers.com",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findSchoolWebsite(schoolName: string, city: string): Promise<string | null> {
  const query = encodeURIComponent(`"${schoolName}" ${city} Florida official school website`);
  const url = `https://html.duckduckgo.com/html/?q=${query}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Extract URLs from DuckDuckGo results
    const urlRegex = /href="\/\/duckduckgo\.com\/l\/\?([^"]+)"/g;
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(html)) !== null) {
      const params = new URLSearchParams(match[1]);
      const uddg = params.get("uddg");
      if (uddg) {
        try {
          const decoded = decodeURIComponent(uddg);
          const parsed = new URL(decoded);
          const domain = parsed.hostname.replace(/^www\./, "");
          if (BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked))) continue;
          urls.push(decoded);
        } catch {
          // invalid URL, skip
        }
      }
    }

    if (urls.length === 0) return null;

    // Score and pick best URL
    const scored = urls.map((u) => {
      let score = 0;
      const domain = new URL(u).hostname.toLowerCase();
      if (domain.endsWith(".edu")) score += 10;
      if (domain.includes("k12.fl.us")) score += 15;
      if (domain.includes("dadeschools")) score += 8;
      if (domain.includes("browardschools")) score += 8;
      if (domain.includes("palmbeach")) score += 8;
      if (domain.includes("ocps")) score += 8;
      if (domain.includes("sdhc")) score += 8;
      if (domain.includes("school")) score += 5;
      if (domain.includes("academy")) score += 3;
      if (domain.includes("charter")) score += 3;
      return { url: u, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]!.url;
  } catch {
    return null;
  }
}

async function checkUrlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });
    return res.status < 400;
  } catch {
    return false;
  }
}

interface School {
  id: string;
  name: string;
  city: string | null;
  ncesId: string | null;
}

interface ScanEvent {
  name: "crm/school.website.scan";
  data: {
    batchSize?: number;
  };
}

export const scanSchoolWebsites = inngest.createFunction(
  {
    id: "scan-school-websites",
    retries: 1,
    concurrency: { limit: 1 },
  },
  [
    { event: "crm/school.website.scan" },
    { cron: "0 */6 * * *" },
  ],
  async ({ event, step }) => {
    const batchSize = (event as ScanEvent).data?.batchSize ?? 100;

    // Step 1: Fetch schools without websites
    const schools = await step.run("fetch-schools-without-websites", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = db as any;
      return p.school.findMany({
        where: {
          website: null,
          studentCount: { gte: 100 },
          gradeRange: { not: null },
          NOT: [
            { name: { contains: "VIRTUAL" } },
            { name: { contains: "HOSPITAL" } },
            { name: { contains: "HOMEBOUND" } },
            { name: { contains: "JAIL" } },
            { name: { contains: "TECHNICAL COLLEGE" } },
            { name: { contains: "CONTRACTED" } },
            { name: { contains: "HEAD START" } },
            { name: { contains: "FRANCHISE" } },
            { name: { contains: "PROGRAM" } },
            { name: { contains: "DEPT OF JUVENILE" } },
          ],
        },
        select: { id: true, name: true, city: true, ncesId: true },
        take: batchSize,
        orderBy: { studentCount: "desc" },
      }) as School[];
    });

    let found = 0;

    // Step 2: Process in batches of 10
    const BATCH = 10;
    for (let i = 0; i < schools.length; i += BATCH) {
      const chunk = schools.slice(i, i + BATCH);

      const chunkFound = await step.run(`process-batch-${Math.floor(i / BATCH)}`, async () => {
        let chunkFound = 0;
        for (const school of chunk) {
          try {
            const website = await findSchoolWebsite(school.name, school.city ?? "Florida");
            if (website) {
              const reachable = await checkUrlReachable(website);
              if (reachable) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = db as any;
                await p.school.update({
                  where: { id: school.id },
                  data: { website },
                });
                chunkFound++;
              }
            }
          } catch {
            // Skip failed schools
          }
          // Rate limit: 1.5s between requests
          await sleep(1500);
        }
        return chunkFound;
      });

      found += chunkFound;
    }

    // Step 3: Get final coverage stats
    const coverage = await step.run("get-coverage-stats", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = db as any;
      const withWebsite = await p.school.count({ where: { website: { not: null } } });
      const total = await p.school.count();
      const pct = total > 0 ? Math.round((withWebsite / total) * 100) : 0;
      return `${withWebsite}/${total} (${pct}%)`;
    });

    return {
      processed: schools.length,
      found,
      coverage,
    };
  }
);
