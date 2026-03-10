# edpilothub-crm

EdPilotHub internal sales CRM — Florida K-12 school database, RFP radar, and outreach management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **API** | tRPC v11 + TanStack Query |
| **Auth** | Better Auth (email/password) |
| **Database** | Prisma 7 + Neon (PostgreSQL) |
| **i18n** | next-intl |
| **Background Jobs** | Inngest |
| **AI** | Vercel AI SDK |
| **File Storage** | Vercel Blob |
| **Email** | Resend |

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in environment variables (see below)
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon pooled connection string |
| `DIRECT_URL` | ✅ | Neon direct connection (Prisma CLI) |
| `BETTER_AUTH_SECRET` | ✅ | Session encryption key (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | ✅ | App URL (`http://localhost:3000` in dev) |
| `RESEND_API_KEY` | ⚡ | For email functionality |
| `EMAIL_FROM` | ⚡ | Sender email address |
| `OPENAI_API_KEY` | ⚡ | For AI features |
| `BLOB_READ_WRITE_TOKEN` | ⚡ | For file uploads |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL |

✅ Required &nbsp; ⚡ Required for that feature

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:studio` | Open Prisma Studio |
| `npm run inngest:dev` | Inngest dev server |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add Neon integration for automatic `DATABASE_URL`
4. Set remaining environment variables
5. Deploy

## License

MIT
