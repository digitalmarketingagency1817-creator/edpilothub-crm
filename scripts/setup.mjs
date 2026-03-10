#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import { basename, join } from "path";

const ROOT = join(import.meta.dirname, "..");

const args = process.argv.slice(2);

function getFlag(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function replaceInFile(filePath, replacements) {
  if (!existsSync(filePath)) return false;
  let content = readFileSync(filePath, "utf-8");
  for (const [search, replace] of replacements) {
    content = content.replaceAll(search, replace);
  }
  writeFileSync(filePath, content);
  return true;
}

function generateReadme(name, description) {
  return `# ${name}

${description}

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

\`\`\`bash
npm install
cp .env.example .env.local
# Fill in environment variables (see below)
npx prisma db push
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy \`.env.example\` to \`.env.local\` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| \`DATABASE_URL\` | ✅ | Neon pooled connection string |
| \`DIRECT_URL\` | ✅ | Neon direct connection (Prisma CLI) |
| \`BETTER_AUTH_SECRET\` | ✅ | Session encryption key (\`openssl rand -hex 32\`) |
| \`BETTER_AUTH_URL\` | ✅ | App URL (\`http://localhost:3000\` in dev) |
| \`RESEND_API_KEY\` | ⚡ | For email functionality |
| \`EMAIL_FROM\` | ⚡ | Sender email address |
| \`OPENAI_API_KEY\` | ⚡ | For AI features |
| \`BLOB_READ_WRITE_TOKEN\` | ⚡ | For file uploads |
| \`NEXT_PUBLIC_APP_URL\` | ✅ | Public app URL |

✅ Required &nbsp; ⚡ Required for that feature

## Scripts

| Script | Description |
|--------|-------------|
| \`npm run dev\` | Start dev server (Turbopack) |
| \`npm run build\` | Production build |
| \`npm run lint\` | ESLint |
| \`npm run format\` | Prettier |
| \`npm run typecheck\` | TypeScript check |
| \`npm run db:push\` | Push Prisma schema to DB |
| \`npm run db:studio\` | Open Prisma Studio |
| \`npm run inngest:dev\` | Inngest dev server |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add Neon integration for automatic \`DATABASE_URL\`
4. Set remaining environment variables
5. Deploy

## License

MIT
`;
}

function printUsage() {
  console.log(`
🚀 Project Setup — Customize this template for your project

Usage:
  npm run setup -- --name my-app [--description "My app"] [--author "Name"]

Options:
  --name         Project name (required)
  --description  Project description (default: "A fullstack Next.js application")
  --author       Author name (optional)

Example:
  npm run setup -- --name my-saas --description "A SaaS platform for teams"
`);
}

const name = getFlag("name") || args[0];
const description = getFlag("description") || "A fullstack Next.js application";
const author = getFlag("author") || "";

if (!name) {
  printUsage();
  process.exit(1);
}

console.log(`\n🚀 Setting up project: ${name}\n`);

console.log("📦 Updating package.json...");
const pkg = readJson(join(ROOT, "package.json"));
pkg.name = name;
pkg.description = description;
pkg.version = "0.1.0";
if (author) pkg.author = author;
delete pkg.templateVersion;
delete pkg.templateRepo;
writeJson(join(ROOT, "package.json"), pkg);

console.log("📝 Generating README.md...");
writeFileSync(join(ROOT, "README.md"), generateReadme(name, description));

console.log("📋 Updating AGENTS.md...");
replaceInFile(join(ROOT, "AGENTS.md"), [
  ["nextjs-fullstack-template", name],
  ["Next.js Fullstack Template", name],
]);

const projectStatusPath = join(ROOT, "docs", "PROJECT-STATUS.md");
if (existsSync(projectStatusPath)) {
  console.log("📊 Resetting PROJECT-STATUS.md...");
  writeFileSync(
    projectStatusPath,
    `# ${name} — Project Status\n\n## Done\n\n- [x] Project initialized from template\n\n## In Progress\n\n## TODO\n\n## Changelog\n`
  );
}

console.log(`\n✅ Setup complete!\n`);
console.log("Next steps:");
console.log("  1. cp .env.example .env.local");
console.log("  2. Fill in environment variables");
console.log("  3. npx prisma db push");
console.log("  4. npm run dev\n");
