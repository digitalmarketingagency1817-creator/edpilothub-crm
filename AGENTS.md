# AGENTS.md — Next.js Fullstack Template

Guidelines for AI agents working on this codebase.

## Project Overview

Production-ready fullstack template. Next.js 16 App Router with tRPC v11, Better Auth, Prisma 7 (Neon), Inngest, Vercel AI SDK, and full DX tooling.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **Components:** shadcn/ui + Radix UI + Lucide React
- **API:** tRPC v11 with `@trpc/tanstack-react-query` (NOT legacy `@trpc/react-query`)
- **Data Fetching:** TanStack Query 5 (via tRPC)
- **Forms:** react-hook-form + zod (mandatory for ALL forms)
- **URL State:** nuqs 2
- **Client State:** Zustand 5
- **Auth:** Better Auth (email/password, conditional email verification, database sessions)
- **Database:** Prisma 7 with `@prisma/adapter-neon` — import from `@/generated/prisma`
- **Email:** Resend + React Email
- **AI:** Vercel AI SDK v6 (`ai` + `@ai-sdk/openai`)
- **File Storage:** Vercel Blob
- **i18n:** next-intl (`localePrefix: 'never'`, no URL prefix)
- **Background Jobs:** Inngest (durable functions, cron, retries)
- **Env Validation:** T3 Env (`@t3-oss/env-nextjs`)
- **Themes:** next-themes (system/light/dark)
- **Error Handling:** react-error-boundary + per-route-group `error.tsx`
- **Toasts:** Sonner

## Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (sign-in, sign-up, verify-email, reset-password)
│   ├── (dashboard)/        # Protected pages with sidebar layout
│   ├── (marketing)/        # Public pages (landing, pricing)
│   └── api/                # API routes (tRPC, auth, chat, upload, inngest)
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── forms/              # Form components (react-hook-form + zod)
│   ├── layout/             # Layout (header, sidebar)
│   ├── dashboard/          # Dashboard-specific (post-list, create-post-form)
│   ├── providers/          # Root providers (Theme, tRPC, nuqs, Tooltip, Toaster)
│   └── shared/             # Shared (error-boundary, loading, theme-toggle, locale-switcher, chat, upload)
├── server/
│   ├── db/                 # Prisma client singleton
│   ├── auth/               # Better Auth config + client
│   └── email/              # Resend email service
├── trpc/
│   ├── init.ts             # tRPC initialization, context, procedures
│   ├── client.tsx          # Client-side tRPC + QueryClient provider
│   ├── server.tsx          # HydrateClient, prefetch, server trpc proxy
│   ├── query-client.ts     # Shared QueryClient factory
│   └── routers/            # tRPC routers (post, ai)
├── inngest/                # Background jobs (client, functions)
├── i18n/                   # next-intl config (routing, request, navigation)
├── stores/                 # Zustand stores
├── hooks/                  # Custom hooks
├── lib/                    # Utilities (cn, validators, constants)
├── types/                  # Global types
├── env.ts                  # T3 Env validation schema
├── proxy.ts                # Route proxy (auth + i18n) — NOT middleware.ts
└── generated/prisma/       # Generated Prisma client (gitignored)
```

## Key Patterns

### Data Fetching: HydrateClient + prefetch + useSuspenseQuery

This is the standard pattern for all data-fetching pages:

**Server Component (page.tsx):**

```tsx
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function Page() {
  prefetch(trpc.post.list.queryOptions({ limit: 10 }));
  return (
    <HydrateClient loadingFallback={<Skeleton />}>
      <ClientComponent />
    </HydrateClient>
  );
}
```

**Client Component:**

```tsx
"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function ClientComponent() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.post.list.queryOptions({ limit: 10 }));
  // data is always available — hydrated from server
}
```

**Rules:**

- ✅ `prefetch()` in Server Component → `HydrateClient` wrapper → `useSuspenseQuery` in client
- ✅ `HydrateClient` handles HydrationBoundary + Suspense + QueryErrorBoundary via `loadingFallback` prop
- ❌ NEVER use `useState` + `fetch` + `useEffect` for data fetching
- ❌ NEVER use manual loading/error state — TanStack Query + Suspense handles it

### Forms

- ✅ Always `react-hook-form` + `zod` + shadcn/ui `Form` components
- ❌ NEVER manual `useState` for form inputs
- Share zod schemas between tRPC input and form validation (`src/lib/validators.ts`)

### Proxy (Not Middleware)

- Route handling is in `src/proxy.ts` (Next.js 16 proxy pattern), **NOT** `middleware.ts`
- Handles auth protection and i18n locale detection

### Prisma

- Import from `@/generated/prisma` (NOT `@prisma/client`)
- Singleton client in `src/server/db/index.ts`
- Config in `prisma.config.ts`, schema in `prisma/schema.prisma`

### i18n

- No `[locale]` URL segment — locale via cookie → Accept-Language → default
- Messages in `messages/{locale}.json`

## Conventions

### Git Workflow

- **Feature branches** for every change: `feat/*`, `fix/*`, `refactor/*`, `docs/*`
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- **Atomic commits** — each commit does ONE thing
- **Never push directly to main** — always via PR/merge
- Husky + commitlint enforce commit format

### Code Style

- **Package manager:** npm (not pnpm/yarn)
- **Components:** Use shadcn/ui (`npx shadcn@latest add <component>`)
- **Class merging:** `cn()` utility from `src/lib/utils.ts` (clsx + tailwind-merge)
- **Icons:** Lucide React only
- **No `any`** without justification
- **No console.log** in production code
- Prettier + ESLint + cspell enforce style

### Adding New Features

1. Add tRPC router in `src/trpc/routers/`, merge in `_app.ts`
2. Add zod schemas in `src/lib/validators.ts`
3. Prefetch in page Server Component → `HydrateClient` → client component with `useSuspenseQuery`
4. Forms: `react-hook-form` + zod + shadcn `Form`
5. Background work: Add Inngest function in `src/inngest/functions/`

## Deploy

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel, set env vars
3. Auto-deploys on push to main

### Notes

- `SKIP_ENV_VALIDATION=1` for Docker/CI builds
- Prisma client auto-generates on `npm install` (postinstall hook)
- Inngest keys auto-set by Vercel integration

## Documentation

- `README.md` — project overview, setup, reference (root)
- `AGENTS.md` — AI agent guidelines (root)
- `docs/` — all other docs (PROJECT-STATUS.md, etc.)
