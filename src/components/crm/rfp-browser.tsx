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
// import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, ExternalLink, Calendar } from "lucide-react";
import { RfpStatus } from "@/generated/prisma";
import { toast } from "sonner";

const RFP_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  REVIEWING: "Reviewing",
  PROPOSAL_REQUESTED: "Proposal Requested",
  PROPOSAL_DRAFTED: "Proposal Drafted",
  SUBMITTED: "Submitted",
  WON: "Won",
  LOST: "Lost",
  PASSED: "Passed",
};

const RFP_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-900 text-[#435EBD] border-[#435EBD]/40",
  REVIEWING: "bg-yellow-900 text-yellow-300 border-yellow-800",
  PROPOSAL_REQUESTED: "bg-orange-900 text-orange-300 border-orange-800",
  PROPOSAL_DRAFTED: "bg-indigo-900 text-indigo-300 border-indigo-800",
  SUBMITTED: "bg-purple-900 text-purple-300 border-purple-800",
  WON: "bg-green-900 text-green-300 border-green-800",
  LOST: "bg-red-900 text-red-300 border-red-800",
  PASSED: "bg-white text-[#1F2937] border-[#E4E4E7]",
};

export function RFPBrowser() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault(""));

  const { data, isFetching } = useQuery({
    ...trpc.rfp.list.queryOptions({
      limit: 50,
      page,
      search: search || undefined,
      status: (status as RfpStatus) || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const rfps = data?.rfps ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const { mutate: updateStatus } = useMutation(
    trpc.rfp.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("RFP status updated");
        void queryClient.invalidateQueries({ queryKey: trpc.rfp.list.queryKey() });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">RFP Radar</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#374151]">{total.toLocaleString()} opportunities tracked</p>
            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-[#374151]">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                Updating…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1" style={{ minWidth: "260px" }}>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#374151]" />
          <Input
            placeholder="Search by title or agency…"
            value={search}
            onChange={(e) => {
              void setSearch(e.target.value || null);
              void setPage(1);
            }}
            className="border-[#E4E4E7] bg-white pl-9 text-white placeholder:text-[#374151]"
          />
        </div>
        <Select
          value={status || "all"}
          onValueChange={(v) => {
            void setStatus(v === "all" ? null : v);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-52 border-[#E4E4E7] bg-white text-white">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="border-[#E4E4E7] bg-white">
            <SelectItem value="all" className="text-white">
              All Statuses
            </SelectItem>
            {Object.entries(RFP_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-white">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#E4E4E7]">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E4E4E7] hover:bg-transparent">
              <TableHead className="text-[#374151]">Title</TableHead>
              <TableHead className="text-[#374151]">Agency</TableHead>
              <TableHead className="text-[#374151]">State</TableHead>
              <TableHead className="text-[#374151]">Due Date</TableHead>
              <TableHead className="text-[#374151]">Value</TableHead>
              <TableHead className="text-[#374151]">Proposals</TableHead>
              <TableHead className="text-[#374151]">Status</TableHead>
              <TableHead className="text-[#374151]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-[#374151]">
                  No RFP opportunities found.
                </TableCell>
              </TableRow>
            ) : (
              rfps.map((rfp) => (
                <TableRow key={rfp.id} className="border-[#E4E4E7] hover:bg-white/50">
                  <TableCell className="max-w-xs">
                    <p className="truncate font-medium text-white">{rfp.title}</p>
                    <p className="text-xs text-[#374151]">{rfp.sourcePlatform}</p>
                  </TableCell>
                  <TableCell className="text-[#09090B]">{rfp.agencyName}</TableCell>
                  <TableCell className="text-[#09090B]">{rfp.agencyState || "—"}</TableCell>
                  <TableCell className="text-[#09090B]">
                    {rfp.dueDate ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-[#374151]" />
                        {new Date(rfp.dueDate).toLocaleDateString()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-[#09090B]">{rfp.estimatedValue || "—"}</TableCell>
                  <TableCell className="text-center text-[#09090B]">
                    {rfp._count.proposals}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rfp.status}
                      onValueChange={(s) => updateStatus({ id: rfp.id, status: s as RfpStatus })}
                    >
                      <SelectTrigger
                        className={`h-7 w-40 border px-2 text-xs ${RFP_STATUS_COLORS[rfp.status] ?? ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[#E4E4E7] bg-white">
                        {Object.entries(RFP_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs text-white">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {rfp.sourceUrl && (
                      <a
                        href={rfp.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#374151] hover:text-[#435EBD]"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
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
    </div>
  );
}
