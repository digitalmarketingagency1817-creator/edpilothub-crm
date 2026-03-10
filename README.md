# Next.js Fullstack Template

A production-ready fullstack template built with modern technologies and best practices. Batteries included — authentication, API layer, background jobs, i18n, AI integration, file uploads, and more.

**Quick Deploy** (no email verification):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fivanmeda%2Fnextjs-fullstack-template&project-name=my-app&repository-name=my-app&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D&env=BETTER_AUTH_SECRET,SKIP_ENV_VALIDATION&envDescription=BETTER_AUTH_SECRET%3A%20run%20%22openssl%20rand%20-hex%2032%22%20to%20generate.%20SKIP_ENV_VALIDATION%3A%20set%20to%201.&envLink=https%3A%2F%2Fgithub.com%2Fivanmeda%2Fnextjs-fullstack-template%23environment-variables)

**Deploy with Email** (includes email verification via Resend):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fivanmeda%2Fnextjs-fullstack-template&project-name=my-app&repository-name=my-app&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D&env=BETTER_AUTH_SECRET,SKIP_ENV_VALIDATION,RESEND_API_KEY,EMAIL_FROM&envDescription=BETTER_AUTH_SECRET%3A%20run%20%22openssl%20rand%20-hex%2032%22.%20SKIP_ENV_VALIDATION%3A%20set%20to%201.%20RESEND_API_KEY%3A%20from%20resend.com.%20EMAIL_FROM%3A%20verified%20sender%20email.&envLink=https%3A%2F%2Fgithub.com%2Fivanmeda%2Fnextjs-fullstack-template%23environment-variables)

## Tech Stack

| Layer               | Technology                                                | Version |
| ------------------- | --------------------------------------------------------- | ------- |
| **Framework**       | Next.js (App Router, Turbopack)                           | 16      |
| **Language**        | TypeScript (strict)                                       | 5       |
| **Styling**         | Tailwind CSS                                              | 4       |
| **Components**      | shadcn/ui + Radix UI + Lucide React                       | latest  |
| **API Layer**       | tRPC                                                      | v11     |
| **Data Fetching**   | TanStack Query (via `@trpc/tanstack-react-query`)         | 5       |
| **Forms**           | react-hook-form + zod                                     | 7 / 4   |
| **URL State**       | nuqs                                                      | 2       |
| **Client State**    | Zustand                                                   | 5       |
| **Auth**            | Better Auth (email/password, optional email verification) | 1.x     |
| **Database**        | Prisma + Neon (PostgreSQL, `@prisma/adapter-neon`)        | 7       |
| **Email**           | Resend + React Email                                      | latest  |
| **AI**              | Vercel AI SDK (`ai` + `@ai-sdk/openai`)                   | 6       |
| **File Storage**    | Vercel Blob                                               | 2       |
| **i18n**            | next-intl (`localePrefix: 'never'`)                       | 4       |
| **Background Jobs** | Inngest (durable functions, cron, retries)                | 3       |
| **Env Validation**  | T3 Env (`@t3-oss/env-nextjs`)                             | 0.13    |
| **Themes**          | next-themes (system/light/dark)                           | 0.4     |
| **Error Handling**  | react-error-boundary                                      | 6       |
| **Toasts**          | Sonner                                                    | 2       |

## Key Patterns

### tRPC Prefetch Pattern: `HydrateClient` + `prefetch` + `useSuspenseQuery`

This template uses a modern server-first data fetching pattern that avoids client-side loading waterfalls:

**1. Server Component (page):** Prefetch data on the server

```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function DashboardPage() {
  prefetch(trpc.post.list.queryOptions({ limit: 10 }));

  return (
    <HydrateClient loadingFallback={<PostListSkeleton />}>
      <PostList limit={10} />
    </HydrateClient>
  );
}
```

**2. Client Component:** Consume with `useSuspenseQuery` (no loading state needed)

```tsx
// src/components/dashboard/post-list.tsx
"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function PostList({ limit = 10 }: { limit?: number }) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.post.list.queryOptions({ limit }));
  // data is always available — never undefined
}
```

**How it works:**

- `prefetch()` — fires the query on the server, populates the QueryClient cache
- `HydrateClient` — wraps `HydrationBoundary` + `Suspense` + `QueryErrorBoundary`, dehydrates server cache to client
- `useSuspenseQuery` — consumes the hydrated data instantly on the client, no loading flicker

### Proxy (Not Middleware)

Next.js 16 introduced the proxy pattern. This template uses `src/proxy.ts` instead of `middleware.ts`:

```ts
// src/proxy.ts
export function proxy(request: NextRequest) {
  // Auth protection for routes
  // i18n locale detection
}
```

### i18n — No URL Prefix

Locale is detected via cookie → Accept-Language header → default (`en`). No `[locale]` segment in URLs. Messages live in `messages/en.json` and `messages/sr.json`.

### Auth — Better Auth with Database Sessions

- Email/password with optional email verification (enabled when `RESEND_API_KEY` is set)
- Database sessions (not JWT), 5-min cookie cache
- Cookie-based route protection via `proxy.ts`
- Server-side session check in protected pages

### Forms — react-hook-form + zod

All forms use `useForm()` with zod schema validation. Shared schemas between tRPC input and form validation.

### Error Boundaries

Every route group (`(auth)`, `(dashboard)`, `(marketing)`) has its own `error.tsx`. The `HydrateClient` component includes `QueryErrorBoundary` for tRPC/query errors.

## Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** (not pnpm/yarn)
- A [Neon](https://neon.tech) PostgreSQL database

### Setup

```bash
# 1. Create your project from template
gh repo create my-app --template ivanmeda/nextjs-fullstack-template --public --clone
cd my-app

# 2. Install dependencies
npm install

# 3. Customize for your project (updates package.json, README, docs)
npm run setup -- --name my-app --description "My awesome app"

# 4. Set up environment variables
cp .env.example .env.local
# Fill in all required values (see Environment Variables section below)

# 5. Push database schema to Neon
npx prisma db push

# 6. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: Inngest Dev Server

```bash
npm run inngest:dev
```

Opens the Inngest dashboard at [http://localhost:8288](http://localhost:8288) for monitoring background jobs.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable                | Required | Description                                                       |
| ----------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`          | ✅       | Neon pooled connection string (has `-pooler` in hostname)         |
| `DIRECT_URL`            | ✅       | Neon direct connection (for Prisma CLI migrations, no `-pooler`)  |
| `BETTER_AUTH_SECRET`    | ✅       | Random 32+ char string for session encryption                     |
| `BETTER_AUTH_URL`       | ✅       | App URL (`http://localhost:3000` in dev)                          |
| `RESEND_API_KEY`        | ⚡       | Resend API key — enables email verification + transactional email |
| `EMAIL_FROM`            | ⚡       | Sender email address (e.g., `noreply@yourdomain.com`)             |
| `OPENAI_API_KEY`        | ⚡       | OpenAI API key (Option A — direct)                                |
| `AI_GATEWAY_API_KEY`    | ⚡       | Vercel AI Gateway key (Option B — via gateway)                    |
| `BLOB_READ_WRITE_TOKEN` | ⚡       | Vercel Blob token for file uploads                                |
| `INNGEST_EVENT_KEY`     | 🔄       | Inngest event key (auto-set on Vercel)                            |
| `INNGEST_SIGNING_KEY`   | 🔄       | Inngest signing key (auto-set on Vercel)                          |
| `NEXT_PUBLIC_APP_URL`   | ✅       | Public app URL (used client-side)                                 |
| `SKIP_ENV_VALIDATION`   | —        | Set to `1` to bypass T3 Env validation (Docker/CI)                |

✅ = Required ⚡ = Required for that feature 🔄 = Auto-set by Vercel integration

## Folder Structure

```
src/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Auth pages (sign-in, sign-up, verify-email, reset-password)
│   │   └── error.tsx            # Auth error boundary
│   ├── (dashboard)/             # Protected pages with sidebar layout
│   │   ├── dashboard/           # Main dashboard (prefetch example)
│   │   │   ├── page.tsx         # Server Component with prefetch
│   │   │   └── loading.tsx      # Loading UI
│   │   ├── settings/            # Settings page
│   │   ├── layout.tsx           # Sidebar + header layout
│   │   └── error.tsx            # Dashboard error boundary
│   ├── (marketing)/             # Public pages (landing, pricing)
│   │   ├── page.tsx             # Landing page (homepage)
│   │   ├── pricing/             # Pricing page
│   │   ├── layout.tsx           # Marketing header + footer
│   │   └── error.tsx            # Marketing error boundary
│   ├── api/                     # API routes
│   │   ├── trpc/[trpc]/         # tRPC HTTP handler
│   │   ├── auth/[...all]/       # Better Auth catch-all
│   │   ├── chat/                # AI chat streaming endpoint
│   │   ├── upload/              # Vercel Blob upload endpoint
│   │   └── inngest/             # Inngest webhook handler
│   ├── layout.tsx               # Root layout (Providers, fonts, i18n)
│   ├── error.tsx                # Root error boundary
│   └── globals.css              # Tailwind + theme tokens
├── components/
│   ├── ui/                      # shadcn/ui components (20+ components)
│   ├── forms/                   # Form components (sign-in, sign-up, reset-password)
│   ├── layout/                  # Layout components (header, sidebar)
│   ├── dashboard/               # Dashboard-specific (post-list, create-post-form)
│   ├── providers/               # Providers wrapper (Theme, tRPC, nuqs, Tooltip, Toaster)
│   └── shared/                  # Shared components:
│       ├── error-boundary.tsx   # Generic error boundary
│       ├── query-error-boundary.tsx  # TanStack Query error boundary
│       ├── loading-fallback.tsx # Loading spinner component
│       ├── loading-skeleton.tsx # Skeleton loaders
│       ├── theme-toggle.tsx     # Dark/light/system toggle
│       ├── locale-switcher.tsx  # Locale switcher dropdown
│       ├── file-upload.tsx      # File upload component
│       └── chat-window.tsx      # AI chat component
├── server/
│   ├── db/                      # Prisma client singleton + schema
│   ├── auth/                    # Better Auth config + client helper
│   └── email/                   # Resend email service
├── trpc/
│   ├── init.ts                  # tRPC initialization, context, procedures
│   ├── client.tsx               # Client-side tRPC + QueryClient provider
│   ├── server.tsx               # Server-side: HydrateClient, prefetch, trpc proxy
│   ├── query-client.ts          # Shared QueryClient factory
│   └── routers/                 # tRPC routers
│       ├── _app.ts              # Root router (merges all sub-routers)
│       ├── post.ts              # Post CRUD router
│       └── ai.ts                # AI router
├── inngest/
│   ├── client.ts                # Inngest client instance
│   ├── index.ts                 # Functions barrel export
│   └── functions/               # Background functions
│       ├── email.ts             # Email sending functions
│       ├── cron.ts              # Scheduled/cron jobs
│       ├── ai-tasks.ts          # Background AI processing
│       └── file-processing.ts   # File processing pipeline
├── i18n/
│   ├── routing.ts               # Locale routing config
│   ├── request.ts               # Server request locale resolution
│   └── navigation.ts            # Typed navigation helpers
├── stores/
│   └── ui-store.ts              # Zustand UI store (sidebar state, etc.)
├── hooks/
│   └── use-media-query.ts       # Responsive media query hook
├── lib/
│   ├── utils.ts                 # cn() utility (clsx + tailwind-merge)
│   ├── validators.ts            # Shared zod schemas
│   └── constants.ts             # App-wide constants
├── types/
│   └── index.ts                 # Global TypeScript types
├── env.ts                       # T3 Env validation schema
├── proxy.ts                     # Route proxy (auth + i18n, replaces middleware.ts)
└── generated/
    └── prisma/                  # Generated Prisma client (gitignored)
```

## Scripts

| Script              | Command                     | Description                                      |
| ------------------- | --------------------------- | ------------------------------------------------ |
| `dev`               | `npm run dev`               | Start dev server with Turbopack                  |
| `build`             | `npm run build`             | Production build (prisma generate + next build)  |
| `start`             | `npm run start`             | Start production server                          |
| `lint`              | `npm run lint`              | Run ESLint                                       |
| `lint:fix`          | `npm run lint:fix`          | Run ESLint with auto-fix                         |
| `format`            | `npm run format`            | Format all files with Prettier                   |
| `format:check`      | `npm run format:check`      | Check formatting without modifying               |
| `typecheck`         | `npm run typecheck`         | TypeScript type checking (`tsc --noEmit`)        |
| `spellcheck`        | `npm run spellcheck`        | Run cspell on source files                       |
| `db:push`           | `npm run db:push`           | Push Prisma schema to database                   |
| `db:migrate:dev`    | `npm run db:migrate:dev`    | Run Prisma migrations in development             |
| `db:migrate:deploy` | `npm run db:migrate:deploy` | Run Prisma migrations in production              |
| `db:studio`         | `npm run db:studio`         | Open Prisma Studio GUI                           |
| `db:generate`       | `npm run db:generate`       | Regenerate Prisma client                         |
| `inngest:dev`       | `npm run inngest:dev`       | Start Inngest Dev Server                         |
| `setup`             | `npm run setup`             | Customize template for your project (name, docs) |
| `prepare`           | `npm run prepare`           | Set up Husky git hooks (runs on install)         |
| `postinstall`       | -                           | Auto-generates Prisma client after `npm install` |

## DX Tooling

| Tool                        | Purpose                      | Config                                                       |
| --------------------------- | ---------------------------- | ------------------------------------------------------------ |
| **Prettier**                | Code formatting              | `.prettierrc` + `prettier-plugin-tailwindcss`                |
| **ESLint**                  | Linting                      | `eslint.config.mjs` (flat config) + `eslint-config-prettier` |
| **Husky**                   | Git hooks                    | `.husky/pre-commit` (lint-staged)                            |
| **lint-staged**             | Run linters on staged files  | `package.json` config                                        |
| **commitlint**              | Enforce conventional commits | `commitlint.config.ts` (`@commitlint/config-conventional`)   |
| **cspell**                  | Spell checking               | `cspell.config.yaml`                                         |
| **TypeScript**              | Type safety                  | `tsconfig.json` (strict mode)                                |
| **TanStack Query Devtools** | Query debugging              | Dev-only, auto-included via provider                         |

### Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add user profile page
fix: resolve auth redirect loop
refactor: extract form validation schemas
docs: update API documentation
test: add unit tests for post router
chore: bump dependencies
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set all environment variables
4. Deploy — Vercel auto-detects Next.js

Inngest keys are auto-set by the Vercel Inngest integration.

### Manual

```bash
npm run build
npm start
```

## License

MIT
