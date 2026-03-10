"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ExternalLink, Plus, Calendar, DollarSign } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CreateProposalDialog } from "./create-proposal-dialog";
import { RfpStatus } from "@/generated/prisma";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-900/50 text-blue-300",
  REVIEWING: "bg-yellow-900/50 text-yellow-300",
  PROPOSAL_REQUESTED: "bg-orange-900/50 text-orange-300",
  PROPOSAL_DRAFTED: "bg-indigo-900/50 text-indigo-300",
  SUBMITTED: "bg-purple-900/50 text-purple-300",
  WON: "bg-green-900/50 text-green-300",
  LOST: "bg-red-900/50 text-red-300",
  PASSED: "bg-slate-800 text-slate-400",
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-800 text-slate-300",
  REVIEW: "bg-yellow-900/50 text-yellow-300",
  APPROVED: "bg-blue-900/50 text-blue-300",
  SUBMITTED: "bg-green-900/50 text-green-300",
};

export function RFPDetail({ id }: { id: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState<string>("");

  const { data: rfp } = useSuspenseQuery(trpc.rfp.getById.queryOptions({ id }));

  const { mutate: updateStatus } = useMutation(
    trpc.rfp.updateStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Status updated");
        void queryClient.invalidateQueries({ queryKey: trpc.rfp.getById.queryKey({ id }) });
      },
    })
  );

  const { mutate: saveNotes, isPending: savingNotes } = useMutation(
    trpc.rfp.updateNotes.mutationOptions({
      onSuccess: () => {
        toast.success("Notes saved");
        setEditingNotes(false);
        void queryClient.invalidateQueries({ queryKey: trpc.rfp.getById.queryKey({ id }) });
      },
    })
  );

  const startEditingNotes = () => {
    setNotesValue(rfp.analysisNotes ?? "");
    setEditingNotes(true);
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-6">
      <Link href={"/rfp" as Parameters<typeof Link>[0]["href"]}>
        <Button variant="ghost" size="sm" className="gap-1.5 text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          RFP Radar
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{rfp.title}</h1>
          <p className="mt-1 text-slate-400">
            {rfp.agencyName}
            {rfp.agencyState ? ` · ${rfp.agencyState}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {rfp.dueDate && (
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                Due {new Date(rfp.dueDate).toLocaleDateString()}
              </span>
            )}
            {rfp.estimatedValue && (
              <span className="flex items-center gap-1 text-slate-400">
                <DollarSign className="h-3.5 w-3.5" />
                {rfp.estimatedValue}
              </span>
            )}
            {rfp.sourceUrl && (
              <a
                href={rfp.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Source
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${STATUS_COLORS[rfp.status] ?? ""} px-3 py-1 text-sm`}>
            {rfp.status.replace(/_/g, " ")}
          </Badge>
          <Select
            value={rfp.status}
            onValueChange={(v) => updateStatus({ id, status: v as RfpStatus })}
          >
            <SelectTrigger className="w-44 border-slate-700 bg-slate-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800">
              {[
                "NEW",
                "REVIEWING",
                "PROPOSAL_REQUESTED",
                "PROPOSAL_DRAFTED",
                "SUBMITTED",
                "WON",
                "LOST",
                "PASSED",
              ].map((s) => (
                <SelectItem key={s} value={s} className="text-white">
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      {rfp.description && (
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base text-white">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-slate-300">{rfp.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Notes */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">Analysis Notes</CardTitle>
            {!editingNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startEditingNotes}
                className="text-slate-400 hover:text-white"
              >
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="flex flex-col gap-3">
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                className="min-h-32 border-slate-700 bg-slate-800 text-white"
                placeholder="Add analysis notes, key requirements, win probability..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveNotes({ id, analysisNotes: notesValue })}
                  disabled={savingNotes}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {savingNotes ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingNotes(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap text-slate-400">
              {rfp.analysisNotes || "No analysis notes yet. Click Edit to add."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Proposals */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white">
              Proposals ({rfp.proposals.length})
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowCreateProposal(true)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Proposal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rfp.proposals.length === 0 ? (
            <p className="text-sm text-slate-500">No proposals yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rfp.proposals.map((proposal) => (
                <div key={proposal.id} className="rounded-lg border border-slate-800 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">{proposal.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`text-xs ${PROPOSAL_STATUS_COLORS[proposal.status] ?? ""}`}>
                      {proposal.status}
                    </Badge>
                  </div>
                  {proposal.content && (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-400">{proposal.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateProposal && (
        <CreateProposalDialog
          rfpId={id}
          rfpTitle={rfp.title}
          onClose={() => setShowCreateProposal(false)}
        />
      )}
    </div>
  );
}
