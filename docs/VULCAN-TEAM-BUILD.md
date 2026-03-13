# VULCAN-TEAM-BUILD.md

## Features Built

### Feature 1: User Roles + Schema Changes

- Renamed `UserRole` enum: `AGENT` → `APPOINTMENT_SETTER`
- Used raw SQL (`ALTER TYPE "UserRole" RENAME VALUE`) to rename existing DB enum value before Prisma push
- Added `assignedToId / assignedTo` relation to `SchoolPipelineStatus` with `@relation("PipelineAssignments")`
- Added back-relation `pipelineAssignments` on User model
- Added `@@index([assignedToId])` to SchoolPipelineStatus
- Ran `prisma db push` + `prisma generate` successfully

### Feature 2: Team Management Page

- Route: `/team` added to sidebar nav (after Playbook, `Users` icon)
- `src/app/[locale]/(dashboard)/team/page.tsx` — server component
- `src/components/crm/team-client.tsx` — client component
  - Table showing all users: name/initials, email, role badge, joined date
  - Role dropdown (ADMIN only, can't change own role)
  - Delete button (ADMIN only, can't delete self)
  - "Add Team Member" button → AddUserDialog
- `src/trpc/routers/user.ts` — tRPC router with list/create/delete/updateRole
  - Used bcryptjs fallback (Better Auth admin plugin not enabled)
  - Registered in `_app.ts` as `user: userRouter`

### Feature 3: Pipeline Card Assignment + Filter

- `pipeline.upsert` input: added `assignedToId?: string | null`
- `school.list` input: added `assignedToId` and `myCards` filter params
- `school.list` pipelineStatus select: added `assignedToId`
- `pipeline-client.tsx` updates:
  - Fetches users via `trpc.user.list`
  - AssigneePopover component: click circle badge → popover with team list + Unassign option
  - Calls `trpc.pipeline.upsert` with `assignedToId` on assignment change
  - "My Cards" toggle button (filters to current user's assigned cards)
  - "Agent" dropdown (filters by specific team member)
  - Both filters use AND logic; mutually deactivate each other

## Deploy

- Live: https://edpilothub-crm.vercel.app
- GitHub: https://github.com/digitalmarketingagency1817-creator/edpilothub-crm
