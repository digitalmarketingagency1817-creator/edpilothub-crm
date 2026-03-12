"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { OpportunityStage } from "@/generated/prisma";
type OpportunityItem = {
  id: string;
  title: string;
  stage: OpportunityStage;
  value: number | null;
  closeDate: Date | null;
  notes: string | null;
  schoolId: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  school: { id: string; name: string; city: string | null };
  owner: { id: string; name: string };
};
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, Target, DollarSign } from "lucide-react";

// ─── Stage config ────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<OpportunityStage, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

const STAGE_COLORS: Record<OpportunityStage, string> = {
  NEW: "bg-gray-100 text-gray-600 border border-gray-200",
  QUALIFIED: "bg-blue-50 text-blue-700 border border-blue-200",
  PROPOSAL: "bg-purple-50 text-purple-700 border border-purple-200",
  NEGOTIATION: "bg-orange-50 text-orange-700 border border-orange-200",
  WON: "bg-green-50 text-green-700 border border-green-200",
  LOST: "bg-red-50 text-red-700 border border-red-200",
};

// ─── Create form schema ───────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  schoolName: z.string().min(1, "School name is required"),
  stage: z.nativeEnum(OpportunityStage),
  value: z.string().optional(),
  closeDate: z.string().optional(),
  notes: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;

// ─── Add Opportunity Dialog ────────────────────────────────────────────────────

function AddOpportunityDialog({ onClose }: { onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: schoolsData } = useQuery(trpc.school.list.queryOptions({ limit: 200, page: 1 }));
  const schools = schoolsData?.schools ?? [];

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { stage: OpportunityStage.NEW },
  });

  const createMutation = useMutation(
    trpc.opportunity.create.mutationOptions({
      onSuccess: () => {
        toast.success("Opportunity created");
        void queryClient.invalidateQueries({ queryKey: trpc.opportunity.list.queryKey() });
        onClose();
      },
      onError: (err) => toast.error(err.message ?? "Failed to create opportunity"),
    })
  );

  const onSubmit = (data: CreateFormData) => {
    const school = schools.find((s) => s.name.toLowerCase() === data.schoolName.toLowerCase());
    if (!school) {
      form.setError("schoolName", { message: "School not found — type the exact school name" });
      return;
    }
    createMutation.mutate({
      title: data.title,
      schoolId: school.id,
      stage: data.stage,
      value: data.value ? parseFloat(data.value) : undefined,
      closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[#E4E4E7] bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#09090B]">New Opportunity</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. EdTech Platform Deal"
                      {...field}
                      className="border-[#E4E4E7]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">School</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Start typing school name…"
                      list="school-list"
                      {...field}
                      className="border-[#E4E4E7]"
                    />
                  </FormControl>
                  <datalist id="school-list">
                    {schools.slice(0, 100).map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Stage</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[#E4E4E7]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        className="border-[#E4E4E7]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="closeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Expected Close Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="border-[#E4E4E7]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any context, next steps, blockers…"
                      rows={3}
                      {...field}
                      className="resize-none border-[#E4E4E7]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-[#E4E4E7] text-[#09090B]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-[#435EBD] text-white hover:bg-[#3B52A8]"
              >
                {createMutation.isPending ? "Creating…" : "Create Opportunity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Browser ─────────────────────────────────────────────────────────────

export function OpportunitiesBrowser() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [stageFilter, setStageFilter] = useQueryState("stage", parseAsString.withDefault(""));
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data, isFetching } = useQuery({
    ...trpc.opportunity.list.queryOptions({
      limit: 50,
      page,
      search: search || undefined,
      stage: (stageFilter as OpportunityStage) || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const opportunities = (data?.opportunities ?? []) as OpportunityItem[];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const deleteMutation = useMutation(
    trpc.opportunity.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Opportunity deleted");
        setDeleteTarget(null);
        void queryClient.invalidateQueries({ queryKey: trpc.opportunity.list.queryKey() });
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to delete");
        setDeleteTarget(null);
      },
    })
  );

  // Compute totals for summary bar
  const totalValue = opportunities.reduce((sum, o) => sum + (o.value ?? 0), 0);
  const wonValue = opportunities
    .filter((o) => o.stage === OpportunityStage.WON)
    .reduce((sum, o) => sum + (o.value ?? 0), 0);

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-[#F3F4F6] p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF2FF]">
            <Target className="h-5 w-5 text-[#435EBD]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#09090B]">Opportunities</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-[#374151]">{total.toLocaleString()} total</p>
              {isFetching && (
                <div className="flex items-center gap-1.5 text-xs text-[#374151]">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  Updating…
                </div>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-[#435EBD] text-white hover:bg-[#3B52A8]"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Opportunity
        </Button>
      </div>

      {/* Summary cards */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-[#6B7280] uppercase">
              Pipeline Value
            </p>
            <p className="mt-1 text-xl font-bold text-[#09090B]">
              ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-[#6B7280] uppercase">Won Value</p>
            <p className="mt-1 text-xl font-bold text-green-600">
              ${wonValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="hidden rounded-xl border border-[#E4E4E7] bg-white p-4 shadow-sm sm:block">
            <p className="text-xs font-medium tracking-wide text-[#6B7280] uppercase">Win Rate</p>
            <p className="mt-1 text-xl font-bold text-[#09090B]">
              {opportunities.length > 0
                ? Math.round(
                    (opportunities.filter((o) => o.stage === OpportunityStage.WON).length /
                      opportunities.length) *
                      100
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1" style={{ minWidth: "240px" }}>
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#374151]" />
          <Input
            placeholder="Search by title or school…"
            value={search}
            onChange={(e) => {
              void setSearch(e.target.value || null);
              void setPage(1);
            }}
            className="border-[#E4E4E7] bg-white pl-9 text-[#09090B] placeholder:text-[#374151]"
          />
        </div>
        <Select
          value={stageFilter || "all"}
          onValueChange={(v) => {
            void setStageFilter(v === "all" ? null : v);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-44 border-[#E4E4E7] bg-white text-[#09090B]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent className="border-[#E4E4E7] bg-white">
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E4E4E7] hover:bg-transparent">
              <TableHead className="text-[#374151]">Title</TableHead>
              <TableHead className="text-[#374151]">School</TableHead>
              <TableHead className="hidden text-[#374151] md:table-cell">Stage</TableHead>
              <TableHead className="hidden text-[#374151] md:table-cell">Value</TableHead>
              <TableHead className="hidden text-[#374151] lg:table-cell">Close Date</TableHead>
              <TableHead className="hidden text-[#374151] lg:table-cell">Owner</TableHead>
              <TableHead className="text-[#374151]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-[#374151]">
                  No opportunities found.{" "}
                  <button
                    onClick={() => setShowAdd(true)}
                    className="text-[#435EBD] hover:underline"
                  >
                    Create one
                  </button>
                </TableCell>
              </TableRow>
            ) : (
              opportunities.map((opp) => (
                <TableRow key={opp.id} className="border-[#E4E4E7] hover:bg-[#FAFAFA]">
                  <TableCell className="font-medium text-[#09090B]">{opp.title}</TableCell>
                  <TableCell className="text-[#374151]">
                    <div>
                      <p className="text-sm text-[#09090B]">{opp.school.name}</p>
                      <p className="text-xs text-[#6B7280]">{opp.school.city ?? ""}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[opp.stage]}`}
                    >
                      {STAGE_LABELS[opp.stage]}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {opp.value != null ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-[#09090B]">
                        <DollarSign className="h-3.5 w-3.5 text-[#6B7280]" />
                        {opp.value.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-[#374151]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-[#374151] lg:table-cell">
                    {opp.closeDate ? new Date(opp.closeDate).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="hidden text-sm text-[#374151] lg:table-cell">
                    {opp.owner.name}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[#374151] hover:bg-red-50 hover:text-red-600"
                      onClick={() => setDeleteTarget({ id: opp.id, title: opp.title })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
              className="border-[#E4E4E7] bg-white text-[#09090B]"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page + 1)}
              disabled={page >= pages}
              className="border-[#E4E4E7] bg-white text-[#09090B]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showAdd && <AddOpportunityDialog onClose={() => setShowAdd(false)} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-[#E4E4E7] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#09090B]">Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription className="text-[#374151]">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#09090B]">{deleteTarget?.title}</span>? This
              action cannot be undone.
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
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
