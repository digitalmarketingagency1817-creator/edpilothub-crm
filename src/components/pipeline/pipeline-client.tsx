"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ExternalLink, Search, Kanban, X, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PipelineStage } from "@/generated/prisma";
import { useSession } from "@/server/auth/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Stage Config ────────────────────────────────────────────────────────────

const PIPELINE_STAGES: PipelineStage[] = [
  PipelineStage.UNCONTACTED,
  PipelineStage.CONTACTED,
  PipelineStage.ENGAGED,
  PipelineStage.DEMO_SCHEDULED,
  PipelineStage.PROPOSAL_SENT,
  PipelineStage.NEGOTIATING,
  PipelineStage.CLOSED_WON,
  PipelineStage.CLOSED_LOST,
  PipelineStage.NOT_A_FIT,
];

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  UNCONTACTED: "Uncontacted",
  CONTACTED: "Contacted",
  ENGAGED: "Engaged",
  DEMO_SCHEDULED: "Demo Scheduled",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATING: "Negotiating",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
  NOT_A_FIT: "Not a Fit",
};

const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = {
  UNCONTACTED: "bg-gray-100 text-gray-600 border border-gray-200",
  CONTACTED: "bg-blue-50 text-blue-700 border border-blue-200",
  ENGAGED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  DEMO_SCHEDULED: "bg-purple-50 text-purple-700 border border-purple-200",
  PROPOSAL_SENT: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  NEGOTIATING: "bg-orange-50 text-orange-700 border border-orange-200",
  CLOSED_WON: "bg-green-50 text-green-700 border border-green-200",
  CLOSED_LOST: "bg-red-50 text-red-700 border border-red-200",
  NOT_A_FIT: "bg-gray-100 text-gray-500 border border-gray-200",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type School = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  gradeRange?: string | null;
  studentCount?: number | null;
  website?: string | null;
  district?: { id: string; name: string } | null;
  pipelineStatus?: {
    stage: PipelineStage;
    lastContactedAt?: Date | null;
    nextFollowUpAt?: Date | null;
    assignedToId?: string | null;
  } | null;
};

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="mb-2 animate-pulse rounded-lg border border-[#E4E4E7] bg-white p-3">
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-100" />
      <div className="mb-1 h-3 w-1/2 rounded bg-gray-100" />
      <div className="h-3 w-1/3 rounded bg-gray-100" />
    </div>
  );
}

// ─── Initials helper ──────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Assignee Popover ─────────────────────────────────────────────────────────

function AssigneePopover({
  school,
  users,
  onAssign,
}: {
  school: School;
  users: TeamUser[];
  onAssign: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const assignedToId = school.pipelineStatus?.assignedToId;
  const assignee = assignedToId ? users.find((u) => u.id === assignedToId) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title={
            assignee ? `Assigned to ${assignee.name ?? assignee.email}` : "Assign to team member"
          }
          className="flex-shrink-0 focus:outline-none"
        >
          {assignee ? (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: "#435EBD" }}
            >
              {getInitials(assignee.name)}
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[#9CA3AF] text-[#9CA3AF] opacity-0 transition-opacity group-hover:opacity-100">
              <UserCheck className="h-3 w-3" />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" onClick={(e) => e.stopPropagation()} align="end">
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#6B7280] hover:bg-[#F4F4F5]"
          onClick={() => {
            onAssign(null);
            setOpen(false);
          }}
        >
          Unassign
        </button>
        <div className="my-1 border-t border-[#F4F4F5]" />
        {users.map((u) => (
          <button
            key={u.id}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[#F4F4F5]"
            onClick={() => {
              onAssign(u.id);
              setOpen(false);
            }}
          >
            <div
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: "#435EBD" }}
            >
              {getInitials(u.name)}
            </div>
            <span className="truncate text-[#09090B]">{u.name ?? u.email}</span>
            <span
              className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                u.role === "ADMIN" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
              }`}
            >
              {u.role === "ADMIN" ? "Admin" : "AS"}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── School Card ─────────────────────────────────────────────────────────────

function SchoolCard({
  school,
  users,
  onAssign,
  onRemoved,
}: {
  school: School;
  users: TeamUser[];
  onAssign: (schoolId: string, userId: string | null) => void;
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const stage = school.pipelineStatus?.stage ?? PipelineStage.UNCONTACTED;

  const { mutate: removeFromPipeline, isPending: isRemoving } = useMutation(
    trpc.pipeline.remove.mutationOptions({
      onSuccess: () => {
        toast.success(`${school.name} removed from pipeline`);
        void queryClient.invalidateQueries({ queryKey: trpc.school.list.queryKey() });
        onRemoved?.();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleClick = () => {
    router.push(`/schools/${school.id}`);
  };

  const handleWebsite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (school.website) {
      window.open(school.website, "_blank", "noopener,noreferrer");
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromPipeline({ schoolId: school.id });
  };

  return (
    <div
      onClick={handleClick}
      className="group mb-2 cursor-pointer rounded-lg border border-[#E4E4E7] bg-white p-3 transition-all hover:border-[#435EBD]/30 hover:shadow-md"
    >
      {/* School name */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm leading-tight font-semibold text-[#09090B]">{school.name}</p>
        <div className="mt-0.5 flex flex-shrink-0 items-center gap-1">
          {school.website && (
            <button
              onClick={handleWebsite}
              className="text-[#6B7280] hover:text-[#435EBD]"
              title="Open website"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            title="Remove from pipeline"
            className="text-[#9CA3AF] opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* District */}
      {school.district && <p className="mb-1 text-xs text-[#6B7280]">{school.district.name}</p>}

      {/* City + State */}
      {(school.city || school.state) && (
        <p className="mb-1.5 text-xs text-[#6B7280]">
          {[school.city, school.state].filter(Boolean).join(", ")}
        </p>
      )}

      {/* Grade range + student count + stage badge + assignee */}
      <div className="flex flex-wrap items-center gap-1.5">
        {school.gradeRange && (
          <span className="rounded bg-[#F4F4F5] px-1.5 py-0.5 text-[10px] font-medium text-[#374151]">
            {school.gradeRange}
          </span>
        )}
        {school.studentCount != null && (
          <span className="rounded bg-[#F4F4F5] px-1.5 py-0.5 text-[10px] font-medium text-[#374151]">
            {school.studentCount.toLocaleString()} students
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PIPELINE_STAGE_COLORS[stage]}`}
        >
          {PIPELINE_STAGE_LABELS[stage]}
        </span>
        <div className="ml-auto">
          <AssigneePopover
            school={school}
            users={users}
            onAssign={(uid) => onAssign(school.id, uid)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ───────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  schools,
  users,
  isLoading,
  onAssign,
}: {
  stage: PipelineStage;
  schools: School[];
  users: TeamUser[];
  isLoading: boolean;
  onAssign: (schoolId: string, userId: string | null) => void;
}) {
  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-[#E4E4E7] bg-white shadow-sm">
      {/* Column header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-[#E4E4E7] bg-[#FAFAFA] px-4 py-3">
        <span className="text-sm font-semibold text-[#09090B]">{PIPELINE_STAGE_LABELS[stage]}</span>
        <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-xs font-medium text-[#435EBD]">
          {schools.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : schools.length === 0 ? (
          <p className="py-4 text-center text-xs text-[#9CA3AF]">No schools</p>
        ) : (
          schools.map((s) => <SchoolCard key={s.id} school={s} users={users} onAssign={onAssign} />)
        )}
      </div>
    </div>
  );
}

// ─── Mobile Stage Section ─────────────────────────────────────────────────────

function MobileStageSection({
  stage,
  schools,
  isLoading,
}: {
  stage: PipelineStage;
  schools: School[];
  isLoading: boolean;
}) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-[#E4E4E7] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAFA] px-4 py-3">
        <span className="text-sm font-semibold text-[#09090B]">{PIPELINE_STAGE_LABELS[stage]}</span>
        <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-xs font-medium text-[#435EBD]">
          {schools.length}
        </span>
      </div>
      <div className="p-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : schools.length === 0 ? (
          <p className="py-3 text-center text-xs text-[#9CA3AF]">No schools</p>
        ) : (
          schools.slice(0, 5).map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/schools/${s.id}`)}
              className="mb-2 cursor-pointer rounded-lg border border-[#E4E4E7] bg-white p-3 transition-all hover:border-[#435EBD]/30 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-[#09090B]">{s.name}</p>
              {s.district && <p className="text-xs text-[#6B7280]">{s.district.name}</p>}
              {(s.city || s.state) && (
                <p className="text-xs text-[#6B7280]">
                  {[s.city, s.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          ))
        )}
        {!isLoading && schools.length > 5 && (
          <p className="text-center text-xs text-[#6B7280]">+{schools.length - 5} more</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PipelineClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  const [search, setSearch] = useState("");
  const [myCards, setMyCards] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    ...trpc.school.list.queryOptions({ limit: 5000, page: 1 }),
    placeholderData: keepPreviousData,
  });

  const { data: usersData } = useQuery(trpc.user.list.queryOptions());
  const users: TeamUser[] = (usersData ?? []) as TeamUser[];

  const { mutate: upsertPipeline } = useMutation(
    trpc.pipeline.upsert.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.school.list.queryKey() });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleAssign = (schoolId: string, userId: string | null) => {
    const school = allSchools.find((s) => s.id === schoolId);
    const stage = school?.pipelineStatus?.stage ?? PipelineStage.UNCONTACTED;
    upsertPipeline({ schoolId, stage, assignedToId: userId });
  };

  const allSchools = (data?.schools ?? []) as School[];

  // Group by pipeline stage with search + filter
  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();

    let filtered = q ? allSchools.filter((s) => s.name.toLowerCase().includes(q)) : allSchools;

    // "My Cards" filter
    if (myCards && currentUserId) {
      filtered = filtered.filter((s) => s.pipelineStatus?.assignedToId === currentUserId);
    }

    // Agent filter (AND with myCards)
    if (agentFilter !== "all") {
      filtered = filtered.filter((s) => s.pipelineStatus?.assignedToId === agentFilter);
    }

    const map: Record<PipelineStage, School[]> = {} as Record<PipelineStage, School[]>;
    for (const stage of PIPELINE_STAGES) {
      map[stage] = [];
    }

    for (const school of filtered) {
      const stage = school.pipelineStatus?.stage ?? PipelineStage.UNCONTACTED;
      if (map[stage]) {
        map[stage].push(school);
      }
    }

    return map;
  }, [allSchools, search, myCards, agentFilter, currentUserId]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F4F6]">
      {/* Page header */}
      <div className="border-b border-[#E4E4E7] bg-white px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF2FF]">
              <Kanban className="h-5 w-5 text-[#435EBD]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#09090B]">Pipeline</h1>
              <p className="text-sm text-[#6B7280]">School stages at a glance</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* My Cards toggle */}
            <Button
              variant={myCards ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => {
                setMyCards((v) => !v);
                if (!myCards) setAgentFilter("all"); // reset agent filter when enabling my cards
              }}
            >
              My Cards
            </Button>

            {/* Agent filter */}
            <Select
              value={agentFilter}
              onValueChange={(v) => {
                setAgentFilter(v);
                if (v !== "all") setMyCards(false); // reset myCards when selecting specific agent
              }}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by school name…"
                className="pl-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Kanban */}
      <div className="hidden flex-1 overflow-x-auto p-6 md:block">
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              schools={grouped[stage] ?? []}
              users={users}
              isLoading={isLoading}
              onAssign={handleAssign}
            />
          ))}
        </div>
      </div>

      {/* Mobile stacked */}
      <div className="flex flex-col gap-4 p-4 md:hidden">
        {PIPELINE_STAGES.map((stage) => (
          <MobileStageSection
            key={stage}
            stage={stage}
            schools={grouped[stage] ?? []}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
