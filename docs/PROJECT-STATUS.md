# PROJECT-STATUS.md

## Status: Template Complete (v1.0.0)

## Implemented Features

| #   | Category         | Feature                                                                         | Status |
| --- | ---------------- | ------------------------------------------------------------------------------- | ------ |
| 1   | Foundation       | Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui                            | Done   |
| 2   | DX Tooling       | Prettier, ESLint (flat config), Husky, commitlint, cspell, lint-staged          | Done   |
| 3   | Database         | Prisma 7 + Neon adapter (`@prisma/adapter-neon`)                                | Done   |
| 4   | Env Validation   | T3 Env (`@t3-oss/env-nextjs`) - build-time validation                           | Done   |
| 5   | Authentication   | Better Auth (email/password, conditional email verification, database sessions) | Done   |
| 6   | Email            | Resend + React Email templates (graceful fallback when API key missing)         | Done   |
| 7   | API Layer        | tRPC v11 + TanStack Query 5 (`@trpc/tanstack-react-query`)                      | Done   |
| 8   | State Management | nuqs 2 (URL state) + Zustand 5 (client state)                                   | Done   |
| 9   | i18n             | next-intl - full integration across all pages, forms, components (EN + SR)      | Done   |
| 10  | AI               | Vercel AI SDK v6 (`ai` + `@ai-sdk/openai`) + chat streaming                     | Done   |
| 11  | File Uploads     | Vercel Blob + upload component + post image upload                              | Done   |
| 12  | Background Jobs  | Inngest (durable functions, cron, retries, email, AI, file processing)          | Done   |
| 13  | Layout & Polish  | Providers, marketing layout, dashboard layout, theme toggle, error boundaries   | Done   |
| 14  | Documentation    | README.md, AGENTS.md, PROJECT-STATUS.md                                         | Done   |
| 15  | Locale Switcher  | Client-side locale switching dropdown (EN/SR)                                   | Done   |
| 16  | Post Images      | Optional image upload for posts via Vercel Blob (schema, API, UI)               | Done   |
| 17  | Create Post      | Post creation dialog with drag-and-drop image upload                            | Done   |
| 18  | Build Config     | Prisma migrations (dev/deploy), removed db push from build                      | Done   |

## Template Info

- **Version:** 1.0.0
- **Created:** 2026-02-27
- **Package Manager:** npm
- **Node.js:** 20+
- **Repo:** [ivanmeda/nextjs-fullstack-template](https://github.com/ivanmeda/nextjs-fullstack-template)

## Known Considerations

- T3 Env validation runs at build time - set `SKIP_ENV_VALIDATION=1` for CI/Docker builds
- Prisma generated client goes to `src/generated/prisma/` (gitignored, auto-generates on `npm install`)
- Better Auth uses database sessions with 5-min cookie cache
- Email verification is only enforced when `RESEND_API_KEY` is set
- Image uploads require `BLOB_READ_WRITE_TOKEN` and Vercel Blob configuration
- i18n uses cookie-based locale detection (no URL prefix)
- Route protection is in `src/proxy.ts`, not `middleware.ts` (Next.js 16)
- `HydrateClient` wraps HydrationBoundary + Suspense + QueryErrorBoundary via `loadingFallback` prop

## Future / TODO

- [ ] OAuth providers (Google, GitHub) via Better Auth plugins
- [ ] Role-based access control (RBAC)
- [ ] E2E tests (Playwright)
- [ ] Unit/integration tests (Vitest)
- [ ] Rate limiting on API routes
- [ ] OpenTelemetry / monitoring integration
- [ ] PWA support
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker setup
- [ ] Stripe/payment integration example
- [ ] Admin panel example
