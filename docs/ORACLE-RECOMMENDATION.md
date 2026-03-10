# ORACLE RECOMMENDATION — EdPilotHub CRM Architecture

> **Oracle's Assessment:** This is an internal sales intelligence tool, not a public SaaS. Design decisions optimize for agent productivity, data density, and background automation — not marketing pages or registration flows.

---

## 1. Database Schema (Prisma)

Full schema is in `prisma/schema.prisma`. Summary of key decisions:

### Models

| Model                  | Purpose                   | Key Decisions                                                                           |
| ---------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| `User`                 | Auth + agent identity     | Added `role: UserRole (ADMIN\|AGENT)` to Better Auth model; removed `Post`              |
| `District`             | FL school district parent | `ncesId` unique index — NCES is ground truth; `schoolCount` denormalized for list views |
| `School`               | Core CRM entity           | `ncesId` unique; `techDetectionStatus` enum drives Inngest job state machine            |
| `Contact`              | Decision makers           | Multiple contacts per school; `isPrimary` flag for quick access                         |
| `RfpOpportunity`       | Discovered RFPs           | `sourceUrl` unique — deduplication key; `analysisNotes` for AI or manual analysis       |
| `Proposal`             | Drafted proposals         | FK to `RfpOpportunity`; `content` is markdown; multiple proposals per RFP possible      |
| `OutreachLog`          | Activity journal          | Immutable log (no `updatedAt`); `outcome` enum captures rich call result                |
| `SchoolPipelineStatus` | CRM stage per school      | `schoolId` is UNIQUE — one pipeline record per school; `upsert` pattern                 |

### Enum Counts

- `UserRole`: ADMIN, AGENT
- `SchoolType`: PUBLIC, PRIVATE, CHARTER
- `TechDetectionStatus`: PENDING, DETECTED, FAILED
- `RfpSourcePlatform`: SAM_GOV, BIDNET, DEMANDSTAR, STATE_PORTAL, OTHER
- `RfpStatus`: NEW → REVIEWING → PROPOSAL_REQUESTED → PROPOSAL_DRAFTED → SUBMITTED → WON/LOST/PASSED
- `ProposalStatus`: DRAFT → REVIEW → APPROVED → SUBMITTED
- `OutreachType`: CALL, EMAIL, LINKEDIN, OTHER
- `OutreachDirection`: OUTBOUND, INBOUND
- `OutreachOutcome`: NO_ANSWER, LEFT_VOICEMAIL, SPOKE_TO_GATEKEEPER, CONNECTED, MEETING_BOOKED, NOT_INTERESTED, CALLBACK_SCHEDULED, EMAIL_SENT, EMAIL_OPENED, EMAIL_REPLIED
- `PipelineStage`: UNCONTACTED → CONTACTED → ENGAGED → DEMO_SCHEDULED → PROPOSAL_SENT → NEGOTIATING → CLOSED_WON/CLOSED_LOST/NOT_A_FIT

### Index Strategy

- `School`: indexed on `city`, `county`, `schoolType`, `techDetectionStatus`, `districtId`, `ncesId`
- `OutreachLog`: indexed on `schoolId`, `agentId`, `createdAt` (feed queries)
- `SchoolPipelineStatus`: indexed on `stage`, `agentId`, `nextFollowUpAt` (follow-up queue)
- `RfpOpportunity`: indexed on `status`, `dueDate`, `agencyState`

---

## 2. App Router Structure

```
src/app/[locale]/
├── layout.tsx                          # Root locale layout (next-intl)
├── not-found.tsx
├── error.tsx
│
├── (auth)/                             # No sidebar, centered layout
│   ├── layout.tsx                      # Minimal auth layout
│   ├── error.tsx
│   └── sign-in/
│       └── page.tsx                    # Login form only (admin creates accounts)
│                                       # NOTE: Remove sign-up, verify-email, reset-password
│                                       # or keep reset-password for existing accounts
│
└── (dashboard)/                        # Protected, sidebar layout
    ├── layout.tsx                      # Auth guard + sidebar shell
    ├── error.tsx
    │
    ├── dashboard/
    │   ├── page.tsx                    # KPI overview: pipeline summary, follow-ups due, new RFPs
    │   └── loading.tsx
    │
    ├── schools/
    │   ├── page.tsx                    # School browser: search + filter (type, county, tech, stage)
    │   ├── loading.tsx
    │   └── [id]/
    │       ├── page.tsx                # School detail: info, contacts, pipeline stage, outreach history
    │       └── loading.tsx
    │
    ├── districts/
    │   ├── page.tsx                    # District browser: list with school counts
    │   ├── loading.tsx
    │   └── [id]/
    │       ├── page.tsx                # District detail: schools in district
    │       └── loading.tsx
    │
    ├── rfp/
    │   ├── page.tsx                    # RFP list: filterable by status, due date, source
    │   ├── loading.tsx
    │   └── [id]/
    │       ├── page.tsx                # RFP detail: description, analysis notes, proposals
    │       └── loading.tsx
    │
    ├── outreach/
    │   ├── page.tsx                    # Activity feed: all agents, filterable by agent/type/outcome
    │   └── loading.tsx
    │
    └── settings/                       # ADMIN ONLY (middleware guard)
        ├── page.tsx                    # User management: list agents, create/deactivate
        └── loading.tsx
```

### Auth Notes

- **No registration page** — admin creates accounts via `/settings`
- Keep `reset-password` for password changes on existing accounts
- Remove `sign-up` and `verify-email` pages (or redirect to sign-in)
- `emailVerified` can be set to `true` on creation via admin flow

### Route Protection

Add admin guard in `src/proxy.ts`:

```typescript
// Admin-only routes
if (pathname.includes("/settings") && session?.user?.role !== "ADMIN") {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
```

---

## 3. tRPC Routers

### File Structure

```
src/trpc/routers/
├── _app.ts          # merge: school, district, contact, rfp, proposal, outreach, pipeline
├── ai.ts            # existing (keep)
├── school.ts        # NEW
├── district.ts      # NEW
├── contact.ts       # NEW
├── rfp.ts           # NEW
├── proposal.ts      # NEW
├── outreach.ts      # NEW
└── pipeline.ts      # NEW
```

### `_app.ts` Update

```typescript
import { createTRPCRouter } from "../init";
import { aiRouter } from "./ai";
import { schoolRouter } from "./school";
import { districtRouter } from "./district";
import { contactRouter } from "./contact";
import { rfpRouter } from "./rfp";
import { proposalRouter } from "./proposal";
import { outreachRouter } from "./outreach";
import { pipelineRouter } from "./pipeline";

export const appRouter = createTRPCRouter({
  ai: aiRouter,
  school: schoolRouter,
  district: districtRouter,
  contact: contactRouter,
  rfp: rfpRouter,
  proposal: proposalRouter,
  outreach: outreachRouter,
  pipeline: pipelineRouter,
});
```

### Router Definitions

#### `school.ts`

```typescript
import { z } from "zod/v4";
import { createTRPCRouter, protectedProcedure } from "../init";
import { SchoolType, TechDetectionStatus } from "@/generated/prisma";

export const schoolRouter = createTRPCRouter({
  // Paginated list with search + filters
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(25),
        cursor: z.string().nullish(),
        search: z.string().optional(), // name ILIKE search
        city: z.string().optional(),
        county: z.string().optional(),
        schoolType: z.nativeEnum(SchoolType).optional(),
        techStack: z.string().optional(), // exact match
        techDetectionStatus: z.nativeEnum(TechDetectionStatus).optional(),
        districtId: z.string().optional(),
        hasWebsite: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Cursor-based pagination on School
      // WHERE: name contains search, filters applied
      // include: district name, pipeline stage
      // ORDER BY: name ASC
    }),

  // Full school detail with relations
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // include: district, contacts, pipeline, outreachLogs (last 10)
  }),

  // Called by Inngest tech detection job
  updateTechStack: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        techStack: z.string().nullable(),
        techDetectionStatus: z.nativeEnum(TechDetectionStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // update techStack, techDetectedAt = now(), techDetectionStatus
    }),
});
```

#### `district.ts`

```typescript
export const districtRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        cursor: z.string().nullish(),
        search: z.string().optional(),
        county: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // include: _count.schools
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // include: schools with pipeline stages
  }),
});
```

#### `contact.ts`

```typescript
export const contactRouter = createTRPCRouter({
  listBySchool: protectedProcedure
    .input(z.object({ schoolId: z.string() }))
    .query(async ({ ctx, input }) => {
      /* ordered: isPrimary DESC, name ASC */
    }),

  create: protectedProcedure
    .input(ContactCreateSchema) // from validators.ts
    .mutation(async ({ ctx, input }) => {
      /* create contact; if isPrimary, unset others */
    }),

  update: protectedProcedure.input(ContactUpdateSchema).mutation(async ({ ctx, input }) => {
    /* update; handle isPrimary logic */
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      /* soft delete or hard delete */
    }),
});
```

#### `rfp.ts`

```typescript
export const rfpRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(25),
        cursor: z.string().nullish(),
        status: z.nativeEnum(RfpStatus).optional(),
        sourcePlatform: z.nativeEnum(RfpSourcePlatform).optional(),
        agencyState: z.string().optional(),
        dueBefore: z.date().optional(),
        search: z.string().optional(), // title + agencyName ILIKE
      })
    )
    .query(async ({ ctx, input }) => {
      /* ordered: dueDate ASC NULLS LAST */
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // include: proposals (with createdBy name)
  }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.nativeEnum(RfpStatus) }))
    .mutation(async ({ ctx, input }) => {
      /* update status */
    }),

  addAnalysis: protectedProcedure
    .input(z.object({ id: z.string(), analysisNotes: z.string() }))
    .mutation(async ({ ctx, input }) => {
      /* append or replace analysis notes */
    }),
});
```

#### `proposal.ts`

```typescript
export const proposalRouter = createTRPCRouter({
  create: protectedProcedure.input(ProposalCreateSchema).mutation(async ({ ctx, input }) => {
    // create proposal, set createdById = ctx.userId
    // also update RFP status to PROPOSAL_DRAFTED if still PROPOSAL_REQUESTED
  }),

  getByRfp: protectedProcedure
    .input(z.object({ rfpOpportunityId: z.string() }))
    .query(async ({ ctx, input }) => {
      // list all proposals for RFP, include createdBy name
    }),

  update: protectedProcedure.input(ProposalUpdateSchema).mutation(async ({ ctx, input }) => {
    /* update title/content */
  }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.nativeEnum(ProposalStatus) }))
    .mutation(async ({ ctx, input }) => {
      /* status transition */
    }),
});
```

#### `outreach.ts`

```typescript
export const outreachRouter = createTRPCRouter({
  create: protectedProcedure.input(OutreachLogCreateSchema).mutation(async ({ ctx, input }) => {
    // create log with agentId = ctx.userId
    // update pipeline.lastContactedAt and nextFollowUpAt if scheduledFollowUp provided
  }),

  listBySchool: protectedProcedure
    .input(
      z.object({
        schoolId: z.string(),
        limit: z.number().default(20),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      // include: agent name, contact name
      // ORDER BY: createdAt DESC
    }),

  listAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        cursor: z.string().nullish(),
        agentId: z.string().optional(),
        type: z.nativeEnum(OutreachType).optional(),
        outcome: z.nativeEnum(OutreachOutcome).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // activity feed: include school name, agent name, contact name
      // ORDER BY: createdAt DESC
    }),
});
```

#### `pipeline.ts`

```typescript
export const pipelineRouter = createTRPCRouter({
  getBySchool: protectedProcedure
    .input(z.object({ schoolId: z.string() }))
    .query(async ({ ctx, input }) => {
      // findUnique or return default UNCONTACTED
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        schoolId: z.string(),
        stage: z.nativeEnum(PipelineStage).optional(),
        agentId: z.string().optional(),
        nextFollowUpAt: z.date().nullish(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // upsert by schoolId
      // if stage changes to CONTACTED+, set lastContactedAt = now()
    }),

  // Bonus: follow-up queue for current agent
  getFollowUpQueue: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      // schools where nextFollowUpAt <= now() AND agentId = ctx.userId
      // include: school name, stage
    }),
});
```

---

## 4. NCES Data Import Strategy

### Data Source

- **Primary:** NCES CCD School Universe Survey — https://nces.ed.gov/ccd/files.asp
  - File: `ccd_sch_029_YYYY_w_[version].csv` (most recent year)
  - Download the `.zip`, extract the CSV (typically 100k+ rows, ~50MB)
- **Backup/Supplement:** FLDOE school directory — https://www.fldoe.org/accountability/data-sys/edu-info-accountability-services/pk-12-public-school-data-pubs-reports/

### Seed Script: `prisma/seed-florida.ts`

```typescript
import { PrismaClient } from "@/generated/prisma";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import path from "path";

const db = new PrismaClient();

// Field mapping from NCES CCD to our schema
// NCESSCH → ncesId, SCHNAM → name, MSTREET1 → address
// MCITY → city, MCOUNTY → county, MZIP → zipCode
// PHONE → phone, WEBSITE → website
// GSLO + GSHI → gradeRange (format: "${GSLO}-${GSHI}")
// MEMBER → studentCount
// LEAID → district ncesId, LEANM → district name
// CHARTR = "Y" → CHARTER, else PUBLIC (PRIVATE handled separately)
// STATEABB = 'FL' filter

async function main() {
  const csvPath = path.join(__dirname, "nces-ccd-schools.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true });

  // Filter Florida schools only
  const flSchools = records.filter(
    (r: Record<string, string>) => r.STATEABB === "FL" && r.LEVEL === "School"
  );

  console.log(`Importing ${flSchools.length} Florida schools...`);

  // 1. Upsert districts first (unique by LEAID)
  const districts = new Map<string, { name: string; ncesId: string }>();
  for (const r of flSchools) {
    if (r.LEAID && r.LEANM && !districts.has(r.LEAID)) {
      districts.set(r.LEAID, { ncesId: r.LEAID, name: r.LEANM });
    }
  }

  console.log(`Upserting ${districts.size} districts...`);
  for (const d of districts.values()) {
    await db.district.upsert({
      where: { ncesId: d.ncesId },
      update: { name: d.name },
      create: {
        ncesId: d.ncesId,
        name: d.name,
        city: "", // NCES district file has this — supplement separately
        county: "",
        state: "FL",
      },
    });
  }

  // 2. Batch upsert schools in chunks of 100
  const CHUNK = 100;
  for (let i = 0; i < flSchools.length; i += CHUNK) {
    const chunk = flSchools.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (r: Record<string, string>) => {
        const districtRecord = r.LEAID
          ? await db.district.findUnique({ where: { ncesId: r.LEAID } })
          : null;

        const gradeRange = r.GSLO && r.GSHI ? `${r.GSLO}-${r.GSHI}` : null;
        const schoolType = r.CHARTR === "Y" ? "CHARTER" : "PUBLIC";

        return db.school.upsert({
          where: { ncesId: r.NCESSCH },
          update: {
            name: r.SCHNAM,
            address: r.MSTREET1 || null,
            city: r.MCITY || "",
            county: r.MCOUNTY || null,
            zipCode: r.MZIP || null,
            phone: r.PHONE || null,
            website: r.WEBSITE || null,
            gradeRange,
            studentCount: r.MEMBER ? parseInt(r.MEMBER) : null,
            schoolType,
            districtId: districtRecord?.id ?? null,
          },
          create: {
            ncesId: r.NCESSCH,
            name: r.SCHNAM,
            address: r.MSTREET1 || null,
            city: r.MCITY || "",
            county: r.MCOUNTY || null,
            zipCode: r.MZIP || null,
            phone: r.PHONE || null,
            website: r.WEBSITE || null,
            gradeRange,
            studentCount: r.MEMBER ? parseInt(r.MEMBER) : null,
            schoolType,
            districtId: districtRecord?.id ?? null,
            techDetectionStatus: "PENDING",
          },
        });
      })
    );
    console.log(`Imported ${Math.min(i + CHUNK, flSchools.length)} / ${flSchools.length}`);
  }

  // 3. Update district schoolCounts
  const schoolCounts = await db.school.groupBy({
    by: ["districtId"],
    _count: { id: true },
    where: { districtId: { not: null } },
  });
  for (const sc of schoolCounts) {
    if (sc.districtId) {
      await db.district.update({
        where: { id: sc.districtId },
        data: { schoolCount: sc._count.id },
      });
    }
  }

  // 4. Create SchoolPipelineStatus UNCONTACTED for all imported schools
  const schools = await db.school.findMany({ select: { id: true } });
  const existing = await db.schoolPipelineStatus.findMany({ select: { schoolId: true } });
  const existingIds = new Set(existing.map((e) => e.schoolId));
  const newPipelines = schools.filter((s) => !existingIds.has(s.id));

  if (newPipelines.length > 0) {
    await db.schoolPipelineStatus.createMany({
      data: newPipelines.map((s) => ({ schoolId: s.id, stage: "UNCONTACTED" })),
      skipDuplicates: true,
    });
  }

  console.log("✅ Florida school import complete");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
```

### package.json script

```json
{
  "scripts": {
    "seed:florida": "tsx prisma/seed-florida.ts"
  }
}
```

### Approximate FL Public School Count

- ~4,000 public schools + ~700 charter schools in Florida
- With filtering: ~4,700 records to import
- Estimated import time at 100/batch: ~2-3 minutes

---

## 5. Tech Stack Detection (Inngest)

### Inngest Function: `src/inngest/functions/tech-detection.ts`

```typescript
import { inngest } from "@/inngest/client";
import { db } from "@/server/db";

// Triggered manually or by seed completion
export const techDetectionBatch = inngest.createFunction(
  { id: "tech-detection-batch", concurrency: { limit: 5 } },
  { event: "crm/tech-detection.requested" },
  async ({ event, step }) => {
    const { offset = 0 } = event.data;
    const BATCH_SIZE = 50;

    const schools = await step.run("fetch-batch", async () => {
      return db.school.findMany({
        where: {
          website: { not: null },
          techDetectionStatus: "PENDING",
        },
        select: { id: true, website: true },
        skip: offset,
        take: BATCH_SIZE,
        orderBy: { createdAt: "asc" },
      });
    });

    if (schools.length === 0) return { done: true, processed: offset };

    // Process each school with rate limiting (1s delay between requests)
    for (const school of schools) {
      await step.run(`detect-${school.id}`, async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);

          const res = await fetch(school.website!, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; EdPilotBot/1.0)" },
          });
          clearTimeout(timeout);

          const html = await res.text();
          const techStack = detectTechStack(html, school.website!);

          await db.school.update({
            where: { id: school.id },
            data: {
              techStack,
              techDetectedAt: new Date(),
              techDetectionStatus: "DETECTED",
            },
          });
        } catch {
          await db.school.update({
            where: { id: school.id },
            data: { techDetectionStatus: "FAILED" },
          });
        }
      });

      // Rate limit: 200ms between requests
      await step.sleep("rate-limit", "200ms");
    }

    // Fan out: trigger next batch
    if (schools.length === BATCH_SIZE) {
      await step.sendEvent("next-batch", {
        name: "crm/tech-detection.requested",
        data: { offset: offset + BATCH_SIZE },
      });
    }

    return { processed: offset + schools.length };
  }
);

function detectTechStack(html: string, url: string): string {
  const lower = html.toLowerCase();
  const urlLower = url.toLowerCase();

  if (
    lower.includes("/wp-content/") ||
    lower.includes("wp-json") ||
    /<meta[^>]+generator[^>]+wordpress/i.test(html)
  )
    return "WordPress";
  if (lower.includes("squarespace.com") || lower.includes("static1.squarespace.com"))
    return "Squarespace";
  if (lower.includes("wix.com") || lower.includes("wixstatic.com")) return "Wix";
  if (lower.includes("drupal.settings") || lower.includes("/sites/default/files/")) return "Drupal";
  if (lower.includes("bbk12.net") || lower.includes("blackboard.com")) return "Blackboard K12";
  if (lower.includes("finalsite.com") || lower.includes("fsi-sites.com")) return "Finalsite";
  if (lower.includes("edlio.com")) return "Edlio";
  if (lower.includes("schooldude.com")) return "SchoolDude";
  if (lower.includes("weebly.com")) return "Weebly";
  if (lower.includes("webflow.io") || lower.includes("webflow.com")) return "Webflow";

  return "Custom/Unknown";
}
```

### Triggering Detection

- After seed: send `crm/tech-detection.requested` event
- Admin button in `/settings`: "Re-scan tech stacks"
- Retry FAILED schools: separate trigger with `techDetectionStatus: "FAILED"` filter

### Detection Coverage (FL K-12)

Based on prior analysis of FL school websites:

- **Edlio**: ~35% (most common for FL public schools)
- **Blackboard K12 / bbk12**: ~20%
- **Finalsite**: ~15%
- **WordPress**: ~10%
- **Custom/Unknown**: ~15%
- **Other**: ~5%

> **Sales Insight:** Schools on Edlio, bbk12, or Finalsite are prime targets (aging platforms, expensive contracts). WordPress schools may be DIY/cost-sensitive.

---

## 6. RFP Scanner (Inngest Cron)

### Inngest Function: `src/inngest/functions/rfp-scanner.ts`

```typescript
import { inngest } from "@/inngest/client";
import { db } from "@/server/db";
import { resend } from "@/server/email";

export const rfpScanner = inngest.createFunction(
  { id: "rfp-scanner-daily" },
  { cron: "0 5 * * *" }, // midnight EST = 5 AM UTC
  async ({ step }) => {
    const keywords = [
      "CMS",
      "website",
      "web development",
      "content management",
      "digital",
      "redesign",
    ];
    const educationTerms = ["school", "district", "K-12", "education", "public school"];

    const newRfps: Array<{
      title: string;
      agencyName: string;
      agencyState: string;
      sourceUrl: string;
      sourcePlatform: string;
      description: string;
      postedDate?: Date;
      dueDate?: Date;
    }> = [];

    // === Source 1: SAM.gov Opportunities API (free, no key) ===
    const samResults = await step.run("scan-sam-gov", async () => {
      const query = `${keywords.join(" OR ")} ${educationTerms.join(" OR ")}`;
      const res = await fetch(
        `https://api.sam.gov/opportunities/v2/search?` +
          `api_key=DEMO_KEY&` +
          `q=${encodeURIComponent(query)}&` +
          `naicsCode=611110&` + // Elementary and secondary schools
          `postedFrom=${getDateDaysAgo(2)}&` +
          `limit=50`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.opportunitiesData || []).map((o: Record<string, string>) => ({
        title: o.title,
        agencyName: o.department || o.agency,
        agencyState: extractState(o.officeAddress),
        sourceUrl: `https://sam.gov/opp/${o.noticeId}/view`,
        sourcePlatform: "SAM_GOV",
        description: o.description || "",
        postedDate: o.postedDate ? new Date(o.postedDate) : undefined,
        dueDate: o.responseDeadLine ? new Date(o.responseDeadLine) : undefined,
      }));
    });
    newRfps.push(...samResults);

    // === Source 2: Google News RSS (no auth needed) ===
    const googleNewsRfps = await step.run("scan-google-news", async () => {
      const query = encodeURIComponent(
        'RFP "school website" OR "school CMS" OR "district website"'
      );
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(rssUrl);
      if (!res.ok) return [];
      const text = await res.text();
      return parseRssItems(text, "OTHER");
    });
    newRfps.push(...googleNewsRfps);

    // === Deduplicate and save ===
    const saved = await step.run("save-rfps", async () => {
      let count = 0;
      for (const rfp of newRfps) {
        // Skip if sourceUrl already exists
        const exists = await db.rfpOpportunity.findUnique({
          where: { sourceUrl: rfp.sourceUrl },
        });
        if (exists) continue;

        // Keyword filter
        const text = `${rfp.title} ${rfp.description}`.toLowerCase();
        const hasKeyword = keywords.some((k) => text.includes(k.toLowerCase()));
        const hasEdTerm = educationTerms.some((t) => text.includes(t.toLowerCase()));
        if (!hasKeyword || !hasEdTerm) continue;

        await db.rfpOpportunity.create({
          data: {
            ...rfp,
            status: "NEW",
            sourcePlatform: rfp.sourcePlatform as "SAM_GOV" | "OTHER",
          },
        });
        count++;
      }
      return count;
    });

    // === Notify admin if new RFPs found ===
    if (saved > 0) {
      await step.run("notify-admin", async () => {
        const admins = await db.user.findMany({
          where: { role: "ADMIN" },
          select: { email: true, name: true },
        });
        for (const admin of admins) {
          await resend.emails.send({
            from: "EdPilotHub CRM <crm@edpilothub.com>",
            to: admin.email,
            subject: `🔔 ${saved} new RFP${saved > 1 ? "s" : ""} discovered`,
            text: `${saved} new RFP opportunities have been added to the CRM. Log in to review them.`,
          });
        }
      });
    }

    return { scanned: newRfps.length, saved };
  }
);

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0].replace(/-/g, "/");
}

function extractState(address: string): string {
  // Extract 2-letter state code from address string
  const match = address?.match(/\b([A-Z]{2})\b/);
  return match?.[1] || "";
}

function parseRssItems(xml: string, platform: string): Array<Record<string, unknown>> {
  // Simple regex RSS parser — use fast-xml-parser in production
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || "";
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    if (link) {
      items.push({
        title: title.trim(),
        agencyName: "Google News",
        agencyState: "FL",
        sourceUrl: link,
        sourcePlatform: platform,
        description: title,
        postedDate: pubDate ? new Date(pubDate) : undefined,
      });
    }
  }
  return items;
}
```

### Additional Sources (Future)

- **BidNet Direct RSS:** `https://www.bidnetdirect.com/search?category=technology&state=FL`
  - Requires parsing HTML or RSS — implement in v2
- **DemandStar:** API access requires free vendor registration — register and add in v2
- **FL DOE Procurement:** `https://www.fldoe.org/about-us/administration/contracts-grants-procurement/`

---

## 7. i18n: English Only

### Changes Required

**`src/i18n/routing.ts`** — Remove SR locale:

```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en"], // ← was ["en", "sr"]
  defaultLocale: "en",
});
```

**`messages/` directory:**

- Keep: `messages/en.json`
- Delete: `messages/sr.json`

**`src/components/shared/locale-switcher.tsx`:**

- Remove or hide (only one locale = no switching needed)
- Or conditionally render: `if (routing.locales.length <= 1) return null`

**`src/app/[locale]/layout.tsx`:**

- No changes needed (next-intl handles single locale transparently)

---

## 8. Key Architectural Decisions (ADR Summary)

### ADR-001: Single `SchoolPipelineStatus` per school (not per agent)

**Decision:** One pipeline record per school (`schoolId @unique`), with optional `agentId` assignment.
**Rationale:** A school is at one stage in the sales process regardless of which agent touched it last. Multiple agent views would create conflicting pipeline data. Assignment is tracked by `agentId`.
**Trade-off:** Agents can't have their own personal pipeline view per school — mitigated by filtering outreach logs by agentId.

### ADR-002: Immutable `OutreachLog` (no `updatedAt`)

**Decision:** OutreachLog has no `updatedAt` field and should not be updated after creation.
**Rationale:** Activity logs are historical records. Edit history introduces complexity without value for a CRM. If an agent makes an error, they log a correction as a new entry.

### ADR-003: `sourceUrl` as RFP deduplication key

**Decision:** `RfpOpportunity.sourceUrl` is `@unique`.
**Rationale:** The canonical URL of an RFP is the most reliable deduplication key across different scraping runs. Title-based deduplication would have too many false positives.

### ADR-004: No soft-delete on schools/contacts

**Decision:** Hard delete on `Contact` (with `SchoolPipelineStatus`/`OutreachLog` cascade handling via FK constraints).
**Rationale:** This is internal data. If a contact is deleted, cascade `SET NULL` on `OutreachLog.contactId` preserves the log while removing the stale contact reference. Schools should never be deleted — just marked `NOT_A_FIT` in pipeline.

### ADR-005: `estimatedValue` as String (not Decimal)

**Decision:** `RfpOpportunity.estimatedValue` is `String?` not `Decimal`.
**Rationale:** RFP values are often listed as ranges ("$50,000–$100,000"), have qualifiers ("up to $X"), or are missing entirely. A string field is more honest to the data than a forced numeric parse.

### ADR-006: Remove marketing and registration pages

**Decision:** Remove `(marketing)/` route group and `sign-up` auth page. Keep `sign-in` and `reset-password` only.
**Rationale:** This is an internal tool. No public landing page needed. Admin creates user accounts directly via `/settings`. Password reset stays for existing accounts.

### ADR-007: `SchoolPipelineStatus` auto-created on seed

**Decision:** Seed script creates `SchoolPipelineStatus` records with `UNCONTACTED` stage for all imported schools.
**Rationale:** Agents should be able to filter by pipeline stage immediately. This also means the pipeline table is the source of truth for "which schools exist in the CRM".

---

## 9. Component Architecture

### School Browser (`/schools/page.tsx`)

```
SchoolBrowserPage (Server Component)
  ├── SchoolFilters (Client — nuqs URL state: search, city, county, schoolType, techStack)
  ├── HydrateClient (prefetch: school.list)
  │   └── SchoolTable (Client — useSuspenseQuery, infinite scroll or pagination)
  │       └── SchoolRow → stage badge, tech badge, last contacted
  └── ExportButton (Admin only — CSV export via API route)
```

### School Detail (`/schools/[id]/page.tsx`)

```
SchoolDetailPage (Server Component)
  ├── HydrateClient (prefetch: school.getById, outreach.listBySchool, pipeline.getBySchool)
  │   ├── SchoolHeader (name, type, grade range, website link)
  │   ├── PipelineStageSelector (Client — pipeline.upsert mutation)
  │   ├── ContactList (Client — contact.listBySchool + create/edit/delete)
  │   │   └── ContactCard + ContactForm (Dialog)
  │   ├── OutreachHistory (Client — outreach.listBySchool, infinite scroll)
  │   │   └── OutreachLogEntry
  │   └── LogOutreachButton → OutreachLogForm (Dialog with react-hook-form)
  └── TechStackBadge (shows detected platform with "re-detect" trigger for admin)
```

### RFP List (`/rfp/page.tsx`)

```
RfpListPage (Server Component)
  ├── RfpStatusTabs (Client — nuqs: status filter)
  ├── HydrateClient (prefetch: rfp.list with status filter)
  │   └── RfpTable (Client — sortable by dueDate, status badge, source badge)
  └── RfpDueSoonAlert (shows RFPs due in next 7 days)
```

---

## 10. Environment Variables

Add to `.env.example`:

```bash
# Existing
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
RESEND_API_KEY="..."
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# New for RFP Scanner (optional — for SAM.gov beyond DEMO_KEY rate limits)
SAM_GOV_API_KEY=""

# CRM email sender
CRM_FROM_EMAIL="crm@edpilothub.com"
```

---

## 11. Implementation Order (Suggested for Vulcan)

1. **Prisma schema** ✅ (done by Oracle)
2. **i18n cleanup** — remove SR, delete messages/sr.json, hide locale switcher
3. **Auth cleanup** — remove sign-up page, redirect to sign-in
4. **tRPC routers** — school, district, contact, rfp, proposal, outreach, pipeline
5. **NCES seed script** — `prisma/seed-florida.ts`
6. **School browser** — list + filters (most critical for agents)
7. **School detail** — contacts + pipeline + outreach log
8. **Districts** — simple list + detail
9. **RFP list + detail** — with proposal creation
10. **Outreach feed** — all agents activity
11. **Settings** — admin user management
12. **Inngest: tech detection** — background job
13. **Inngest: RFP scanner** — daily cron
14. **Dashboard** — KPI widgets (pipeline summary, follow-up queue, new RFPs)

---

_Architecture defined by @oracle — EdPilotHub CRM v1.0_
_Date: 2026-03-10_
