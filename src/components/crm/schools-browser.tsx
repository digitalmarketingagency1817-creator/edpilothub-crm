"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Search, ChevronLeft, ChevronRight, Plus, ExternalLink } from "lucide-react";
import { SchoolType, PipelineStage } from "@/generated/prisma";
import { useSession } from "@/server/auth/client";
import { AddSchoolDialog } from "./add-school-dialog";
import { useState } from "react";

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
  UNCONTACTED: "bg-slate-700 text-slate-300",
  CONTACTED: "bg-blue-900 text-blue-300",
  ENGAGED: "bg-indigo-900 text-indigo-300",
  DEMO_SCHEDULED: "bg-purple-900 text-purple-300",
  PROPOSAL_SENT: "bg-yellow-900 text-yellow-300",
  NEGOTIATING: "bg-orange-900 text-orange-300",
  CLOSED_WON: "bg-green-900 text-green-300",
  CLOSED_LOST: "bg-red-900 text-red-300",
  NOT_A_FIT: "bg-slate-700 text-slate-500",
};

export function SchoolsBrowser() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const [showAdd, setShowAdd] = useState(false);

  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [schoolType, setSchoolType] = useQueryState("type", parseAsString.withDefault(""));
  const [pipelineStage, setPipelineStage] = useQueryState("stage", parseAsString.withDefault(""));

  const { data } = useSuspenseQuery(
    trpc.school.list.queryOptions({
      limit: 50,
      page,
      search: search || undefined,
      schoolType: (schoolType as SchoolType) || undefined,
      pipelineStage: (pipelineStage as PipelineStage) || undefined,
    })
  );

  const { schools, total, pages } = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Schools</h1>
          <p className="text-sm text-slate-400">{total.toLocaleString()} schools in database</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1" style={{ minWidth: "260px" }}>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, city, county…"
            value={search}
            onChange={(e) => {
              void setSearch(e.target.value || null);
              void setPage(1);
            }}
            className="border-slate-700 bg-slate-800 pl-9 text-white placeholder:text-slate-500"
          />
        </div>

        <Select
          value={schoolType || "all"}
          onValueChange={(v) => {
            void setSchoolType(v === "all" ? null : v);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-44 border-slate-700 bg-slate-800 text-white">
            <SelectValue placeholder="School Type" />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800">
            <SelectItem value="all" className="text-white">
              All Types
            </SelectItem>
            <SelectItem value="PUBLIC" className="text-white">
              Public
            </SelectItem>
            <SelectItem value="PRIVATE" className="text-white">
              Private
            </SelectItem>
            <SelectItem value="CHARTER" className="text-white">
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
          <SelectTrigger className="w-48 border-slate-700 bg-slate-800 text-white">
            <SelectValue placeholder="Pipeline Stage" />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800">
            <SelectItem value="all" className="text-white">
              All Stages
            </SelectItem>
            {Object.entries(PIPELINE_STAGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-white">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">City</TableHead>
              <TableHead className="text-slate-400">County</TableHead>
              <TableHead className="text-slate-400">Type</TableHead>
              <TableHead className="text-slate-400">Tech Stack</TableHead>
              <TableHead className="text-slate-400">Pipeline</TableHead>
              <TableHead className="text-slate-400">Last Contact</TableHead>
              <TableHead className="text-slate-400"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-slate-500">
                  No schools found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => (
                <TableRow
                  key={school.id}
                  className="cursor-pointer border-slate-800 hover:bg-slate-800/50"
                >
                  <TableCell className="font-medium text-white">
                    <Link href={`/schools/${school.id}` as Parameters<typeof Link>[0]["href"]}>
                      <span className="hover:text-blue-400">{school.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-300">{school.city ?? "—"}</TableCell>
                  <TableCell className="text-slate-300">{school.county ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        school.schoolType === "PUBLIC"
                          ? "border-blue-800 text-blue-400"
                          : school.schoolType === "PRIVATE"
                            ? "border-purple-800 text-purple-400"
                            : "border-green-800 text-green-400"
                      }
                    >
                      {school.schoolType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {school.techStack ? (
                      <span className="text-sm text-emerald-400">{school.techStack}</span>
                    ) : (
                      <span className="text-sm text-slate-600">Unknown</span>
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
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {school.pipelineStatus?.lastContactedAt
                      ? new Date(school.pipelineStatus.lastContactedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/schools/${school.id}` as Parameters<typeof Link>[0]["href"]}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-slate-400 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
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
          <span className="text-slate-400">
            Page {page} of {pages} ({total.toLocaleString()} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page - 1)}
              disabled={page <= 1}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page + 1)}
              disabled={page >= pages}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showAdd && <AddSchoolDialog onClose={() => setShowAdd(false)} />}
    </div>
  );
}
