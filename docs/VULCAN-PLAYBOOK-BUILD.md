# Vulcan Build — Playbook + Call Guide

**Commit:** `feat: playbook section + per-school call guide`
**Live URL:** https://edpilothub-crm.vercel.app

## Feature 1: Global Playbook Page (`/playbook`)

- Route: `/playbook` — sidebar nav, BookOpen icon, between Pipeline and Outreach
- Files:
  - `src/app/[locale]/(dashboard)/playbook/page.tsx` — server component
  - `src/components/crm/playbook-client.tsx` — full client component
  - `src/components/ui/accordion.tsx` — added via shadcn
- 4 tabs: Value Framework | First Call Tool | Battle Cards | Objection Handling
- Value Framework: 3 cards (blue/green/purple borders) with Before/After/Discovery Qs
- First Call Tool: 3 persona sub-tabs (Principal/IT/Admissions) with 5 accordion sections each
- Battle Cards: vs. Finalsite, vs. SchoolSites, Miami Arts Charter proof points
- Objection Handling: 7 objections as accordion

## Feature 2: Per-School Call Guide Tab

- Modified: `src/components/crm/school-detail.tsx` — wrapped existing sections in Tabs; added Call Guide tab
- Created: `src/components/crm/call-guide.tsx` — 6-step interactive call workflow
- Steps: Pre-Call Research → Choose Persona → Opening → Discovery → Identify Pain → Log Outcome
- Step 6 logs via `trpc.outreach.create` and updates pipeline stage
- Notes textarea autosaves to `pipelineStatus.notes` on blur

## Notes

- Fixed unescaped double quotes in string literals (TypeScript parse error)
- `SchoolWithDetails` (superset type) is directly assignable to `SchoolWithPipeline`
- Accordion component installed via `npx shadcn@latest add accordion`
