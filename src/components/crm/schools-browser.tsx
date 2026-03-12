"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { Search, ChevronLeft, ChevronRight, Plus, ExternalLink, Trash2 } from "lucide-react";
import { SchoolType, PipelineStage } from "@/generated/prisma";
import { useSession } from "@/server/auth/client";
import { AddSchoolDialog } from "./add-school-dialog";
import { useState } from "react";
import { toast } from "sonner";

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  UNCONTACTED: "Uncontacted",
  CONTACTED: "Contacted",
  ENGAGED: "Engaged",
  DEMO_SCHEDULED: "Demo Scheduled",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATING: "Negotiating",
  CLOSED_WON: "Won",
  CLOSED_LOST: "Lost",
  NOT_A_FIT: "Not a Fit",
};

const PIPELINE_STAGE_COLORS: Record<string, string> = {
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

export function SchoolsBrowser() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const deleteMutation = useMutation(
    trpc.school.delete.mutationOptions({
      onSuccess: () => {
        toast.success(`School deleted`);
        setDeleteTarget(null);
        void queryClient.invalidateQueries({ queryKey: trpc.school.list.queryKey() });
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to delete school");
        setDeleteTarget(null);
      },
    })
  );

  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [schoolType, setSchoolType] = useQueryState("type", parseAsString.withDefault(""));
  const [pipelineStage, setPipelineStage] = useQueryState("stage", parseAsString.withDefault(""));
  const [stateFilter, setStateFilter] = useQueryState("state", parseAsString.withDefault(""));

  const { data, isFetching } = useQuery({
    ...trpc.school.list.queryOptions({
      limit: 50,
      page,
      search: search || undefined,
      schoolType: (schoolType as SchoolType) || undefined,
      pipelineStage: (pipelineStage as PipelineStage) || undefined,
      state: stateFilter || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const schools = data?.schools ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-[#F3F4F6] p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#09090B]">Schools</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#374151]">{total.toLocaleString()} schools in database</p>
            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-[#374151]">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                Updating…
              </div>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-[#435EBD] text-white hover:bg-[#3B52A8]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1" style={{ minWidth: "260px" }}>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#374151]" />
          <Input
            placeholder="Search by name, city, county…"
            value={search}
            onChange={(e) => {
              void setSearch(e.target.value || null);
              void setPage(1);
            }}
            className="border-[#E4E4E7] bg-white pl-9 text-[#09090B] placeholder:text-[#374151]"
          />
        </div>

        <Select
          value={schoolType || "all"}
          onValueChange={(v) => {
            void setSchoolType(v === "all" ? null : v);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-44 border-[#E4E4E7] bg-white text-[#09090B]">
            <SelectValue placeholder="School Type" />
          </SelectTrigger>
          <SelectContent className="border-[#E4E4E7] bg-white">
            <SelectItem value="all" className="text-[#09090B]">
              All Types
            </SelectItem>
            <SelectItem value="PUBLIC" className="text-[#09090B]">
              Public
            </SelectItem>
            <SelectItem value="PRIVATE" className="text-[#09090B]">
              Private
            </SelectItem>
            <SelectItem value="CHARTER" className="text-[#09090B]">
              Charter
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={pipelineStage || "all"}
          onValueChange={(v) => {
            void setPipelineStage(v === "all" ? null : v);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-48 border-[#E4E4E7] bg-white text-[#09090B]">
            <SelectValue placeholder="Pipeline Stage" />
          </SelectTrigger>
          <SelectContent className="border-[#E4E4E7] bg-white">
            <SelectItem value="all" className="text-[#09090B]">
              All Stages
            </SelectItem>
            {Object.entries(PIPELINE_STAGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-[#09090B]">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* State filter */}
        <Select
          value={stateFilter || "all"}
          onValueChange={(v) => {
            void setStateFilter(v === "all" ? "" : v);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-32 border-[#E4E4E7] bg-white text-[#09090B]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent className="border-[#E4E4E7] bg-white">
            <SelectItem value="all" className="text-[#09090B]">
              All States
            </SelectItem>
            <SelectItem value="FL" className="text-[#09090B]">
              🌴 FL
            </SelectItem>
            <SelectItem value="TX" className="text-[#09090B]">
              ⭐ TX
            </SelectItem>
            <SelectItem value="CA" className="text-[#09090B]">
              🌞 CA
            </SelectItem>
            <SelectItem value="NY" className="text-[#09090B]">
              🗽 NY
            </SelectItem>
            <SelectItem value="GA" className="text-[#09090B]">
              🍑 GA
            </SelectItem>
            <SelectItem value="NC" className="text-[#09090B]">
              NC
            </SelectItem>
            <SelectItem value="OH" className="text-[#09090B]">
              OH
            </SelectItem>
            <SelectItem value="PA" className="text-[#09090B]">
              PA
            </SelectItem>
            <SelectItem value="IL" className="text-[#09090B]">
              IL
            </SelectItem>
            <SelectItem value="AZ" className="text-[#09090B]">
              AZ
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E4E4E7] hover:bg-transparent">
              <TableHead className="text-[#374151]">Name</TableHead>
              <TableHead className="text-[#374151]">City</TableHead>
              <TableHead className="hidden text-[#374151] md:table-cell">County</TableHead>
              <TableHead className="text-[#374151]">State</TableHead>
              <TableHead className="text-[#374151]">Type</TableHead>
              <TableHead className="hidden text-[#374151] lg:table-cell">Tech Stack</TableHead>
              <TableHead className="text-[#374151]">Pipeline</TableHead>
              <TableHead className="hidden text-[#374151] lg:table-cell">Last Contact</TableHead>
              <TableHead className="text-[#374151]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-[#374151]">
                  No schools found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => (
                <TableRow
                  key={school.id}
                  className="cursor-pointer border-[#E4E4E7] hover:bg-white/50"
                >
                  <TableCell className="font-medium text-[#09090B]">
                    <Link href={`/schools/${school.id}` as Parameters<typeof Link>[0]["href"]}>
                      <span className="hover:text-[#435EBD]">{school.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#09090B]">{school.city ?? "—"}</TableCell>
                  <TableCell className="hidden text-[#09090B] md:table-cell">
                    {school.county ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {(school as unknown as { state: string }).state ?? "FL"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        school.schoolType === "PUBLIC"
                          ? "border-[#435EBD]/40 bg-[#EEF2FF] text-[#435EBD]"
                          : school.schoolType === "PRIVATE"
                            ? "border-purple-200 bg-purple-50 text-purple-700"
                            : "border-green-200 bg-green-50 text-green-700"
                      }
                    >
                      {school.schoolType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {school.techStack ? (
                      <span className="text-sm text-emerald-400">{school.techStack}</span>
                    ) : (
                      <span className="text-sm text-[#374151]">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {school.pipelineStatus ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          PIPELINE_STAGE_COLORS[school.pipelineStatus.stage] ?? ""
                        }`}
                      >
                        {PIPELINE_STAGE_LABELS[school.pipelineStatus.stage]}
                      </span>
                    ) : (
                      <span className="text-xs text-[#374151]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[#374151]">
                    {school.pipelineStatus?.lastContactedAt
                      ? new Date(school.pipelineStatus.lastContactedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/schools/${school.id}` as Parameters<typeof Link>[0]["href"]}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-[#374151] hover:text-[#09090B]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-[#374151] hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: school.id, name: school.name });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#374151]">
            Page {page} of {pages} ({total.toLocaleString()} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page - 1)}
              disabled={page <= 1}
              className="border-[#E4E4E7] bg-white text-[#09090B] hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page + 1)}
              disabled={page >= pages}
              className="border-[#E4E4E7] bg-white text-[#09090B] hover:bg-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showAdd && <AddSchoolDialog onClose={() => setShowAdd(false)} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-[#E4E4E7] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#09090B]">Delete School</AlertDialogTitle>
            <AlertDialogDescription className="text-[#374151]">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#09090B]">{deleteTarget?.name}</span>? This will
              permanently remove the school and all associated contacts, outreach logs, and pipeline
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E4E4E7] bg-white text-[#09090B] hover:bg-[#F4F4F5]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete School"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
