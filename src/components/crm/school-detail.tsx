"use client";

import type { Prisma } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Users,
  GraduationCap,
  Building2,
  Clock,
  ExternalLink,
  Pencil,
  X,
  Check,
  Trash2,
  DollarSign,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallGuide } from "./call-guide";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/server/auth/client";
import { useRouter } from "next/navigation";
import { PipelineStage } from "@/generated/prisma";
import { toast } from "sonner";
import { useState } from "react";
import { useMemo } from "react";
import { LogOutreachDialog } from "./log-outreach-dialog";
import { AddContactDialog } from "./add-contact-dialog";

type SchoolWithDetails = Prisma.SchoolGetPayload<{
  include: {
    district: true;
    contacts: true;
    pipelineStatus: true;
    outreachLogs: {
      include: {
        contact: { select: { id: true; name: true } };
      };
    };
  };
}>;

const PIPELINE_STAGES = [
  { value: "UNCONTACTED", label: "Uncontacted" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ENGAGED", label: "Engaged" },
  { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "CLOSED_WON", label: "Closed Won ✅" },
  { value: "CLOSED_LOST", label: "Closed Lost" },
  { value: "NOT_A_FIT", label: "Not a Fit" },
];

const OUTREACH_OUTCOME_LABELS: Record<string, string> = {
  NO_ANSWER: "No Answer",
  LEFT_VOICEMAIL: "Left Voicemail",
  SPOKE_TO_GATEKEEPER: "Spoke to Gatekeeper",
  CONNECTED: "Connected",
  MEETING_BOOKED: "Meeting Booked",
  NOT_INTERESTED: "Not Interested",
  CALLBACK_SCHEDULED: "Callback Scheduled",
  EMAIL_SENT: "Email Sent",
  EMAIL_OPENED: "Email Opened",
  EMAIL_REPLIED: "Email Replied",
};

interface SchoolDetailProps {
  id: string;
}

export function SchoolDetail({ id }: SchoolDetailProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const { data: _school } = useSuspenseQuery(trpc.school.getById.queryOptions({ id }));
  const school = _school as unknown as SchoolWithDetails;

  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showLogOutreach, setShowLogOutreach] = useState(false);
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [websiteValue, setWebsiteValue] = useState(school.website ?? "");
  const [currentStage, setCurrentStage] = useState<PipelineStage>(
    school.pipelineStatus?.stage ?? PipelineStage.UNCONTACTED
  );

  const [dealValue, setDealValue] = useState<string>(
    school.pipelineStatus?.dealValue != null ? String(school.pipelineStatus.dealValue) : ""
  );
  const [closeDate, setCloseDate] = useState<string>(
    school.pipelineStatus?.closeDate
      ? new Date(school.pipelineStatus.closeDate).toISOString().split("T")[0]
      : ""
  );
  const [rfpReference, setRfpReference] = useState<string>(
    school.pipelineStatus?.rfpReference ?? ""
  );
  const [probability, setProbability] = useState<string>(
    school.pipelineStatus?.probability != null ? String(school.pipelineStatus.probability) : ""
  );

  const { mutate: savePipeline, isPending: isSavingDeal } = useMutation(
    trpc.pipeline.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("Stage updated");
        void queryClient.invalidateQueries({ queryKey: trpc.school.getById.queryKey({ id }) });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleStageChange = (stage: PipelineStage) => {
    setCurrentStage(stage);
    savePipeline({ schoolId: id, stage });
  };

  const handleSaveDealInfo = () => {
    savePipeline({
      schoolId: id,
      stage: currentStage,
      dealValue: dealValue !== "" ? parseFloat(dealValue) : undefined,
      closeDate: closeDate !== "" ? new Date(closeDate) : null,
      rfpReference: rfpReference !== "" ? rfpReference : null,
      probability: probability !== "" ? parseInt(probability, 10) : null,
    });
    toast.success("Deal info saved");
  };

  const { mutate: updateSchool, isPending: isUpdatingWebsite } = useMutation(
    trpc.school.update.mutationOptions({
      onSuccess: () => {
        toast.success("Website updated");
        setIsEditingWebsite(false);
        void queryClient.invalidateQueries({ queryKey: trpc.school.getById.queryKey({ id }) });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleSaveWebsite = () => {
    const trimmed = websiteValue.trim();
    updateSchool({ id, website: trimmed || null });
  };

  const handleCancelWebsite = () => {
    setWebsiteValue(school.website ?? "");
    setIsEditingWebsite(false);
  };

  const { mutate: deleteSchool, isPending: isDeleting } = useMutation(
    trpc.school.delete.mutationOptions({
      onSuccess: () => {
        toast.success("School deleted");
        router.push("/schools");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-[#E4E4E7] bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/schools">
            <button className="rounded-md p-1.5 text-[#374151] hover:bg-[#F3F4F6] hover:text-[#09090B]">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-[#09090B]">{school.name}</h1>
            <p className="text-xs text-[#374151]">
              {school.city}
              {school.county ? `, ${school.county}` : ""} ·{" "}
              {(school as unknown as { state: string }).state ?? "FL"} · {school.schoolType}
            </p>
          </div>
          {/* Inline stage selector */}
          <Select value={currentStage} onValueChange={(v) => handleStageChange(v as PipelineStage)}>
            <SelectTrigger className="h-8 w-40 border-[#E4E4E7] bg-white text-xs text-[#09090B]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[#E4E4E7] bg-white">
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-sm text-[#09090B]">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setShowQuickLog(true)}
            className="rounded-md bg-[#435EBD] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3B52A8]"
          >
            Log Activity
          </button>
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#E4E4E7] px-2 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete School</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure? This will permanently delete this school and all related data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteSchool({ id })}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="px-4 py-6 md:px-6">
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger
              value="details"
              className="text-xs data-[state=active]:bg-[#435EBD] data-[state=active]:text-white"
            >
              School Details
            </TabsTrigger>
            <TabsTrigger
              value="call-guide"
              className="gap-1.5 text-xs data-[state=active]:bg-[#435EBD] data-[state=active]:text-white"
            >
              <Phone className="h-3.5 w-3.5" />
              Call Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Section: School Info */}
            <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold tracking-wider text-[#4B5563] uppercase">
                School Info
              </h2>

              {/* Stat cards */}
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {school.studentCount != null && (
                  <div className="rounded-lg border border-[#E4E4E7] bg-white p-3">
                    <div className="flex items-center gap-1.5 text-[#374151]">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">Enrollment</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-[#09090B]">
                      {school.studentCount.toLocaleString()}
                    </p>
                  </div>
                )}
                {school.gradeRange && (
                  <div className="rounded-lg border border-[#E4E4E7] bg-white p-3">
                    <div className="flex items-center gap-1.5 text-[#374151]">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span className="text-xs">Grades</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-[#09090B]">{school.gradeRange}</p>
                  </div>
                )}
                <div className="rounded-lg border border-[#E4E4E7] bg-white p-3">
                  <div className="flex items-center gap-1.5 text-[#374151]">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Type</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#09090B]">{school.schoolType}</p>
                </div>
                {school.district && (
                  <div className="rounded-lg border border-[#E4E4E7] bg-white p-3">
                    <div className="flex items-center gap-1.5 text-[#374151]">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="text-xs">District</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-[#09090B]">
                      {school.district.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Detail rows */}
              <div className="flex flex-col gap-2 text-sm">
                {school.address && (
                  <div className="flex items-start gap-2 text-[#09090B]">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#374151]" />
                    <span>
                      {school.address}
                      {school.zipCode ? ` ${school.zipCode}` : ""}
                    </span>
                  </div>
                )}
                {school.phone && (
                  <div className="flex items-center gap-2 text-[#09090B]">
                    <Phone className="h-4 w-4 flex-shrink-0 text-[#374151]" />
                    <a href={`tel:${school.phone}`} className="hover:text-[#435EBD]">
                      {school.phone}
                    </a>
                  </div>
                )}
                {school.email && (
                  <div className="flex items-center gap-2 text-[#09090B]">
                    <Mail className="h-4 w-4 flex-shrink-0 text-[#374151]" />
                    <a href={`mailto:${school.email}`} className="truncate hover:text-[#435EBD]">
                      {school.email}
                    </a>
                  </div>
                )}
                {/* Website — editable */}
                <div className="flex items-center gap-2 text-[#09090B]">
                  <Globe className="h-4 w-4 flex-shrink-0 text-[#374151]" />
                  {isEditingWebsite ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={websiteValue}
                        onChange={(e) => setWebsiteValue(e.target.value)}
                        placeholder="https://school.example.com"
                        className="h-7 flex-1 border-[#E4E4E7] bg-white text-sm text-[#09090B] placeholder:text-[#374151]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveWebsite();
                          if (e.key === "Escape") handleCancelWebsite();
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveWebsite}
                        disabled={isUpdatingWebsite}
                        className="h-7 w-7 p-0 text-green-400 hover:text-green-300"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelWebsite}
                        className="h-7 w-7 p-0 text-[#374151] hover:text-[#09090B]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : school.website ? (
                    <div className="flex flex-1 items-center gap-2">
                      <a
                        href={school.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 truncate hover:text-[#435EBD]"
                      >
                        {school.website}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setWebsiteValue(school.website ?? "");
                          setIsEditingWebsite(true);
                        }}
                        className="h-6 w-6 p-0 text-[#374151] hover:text-[#09090B]"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[#374151]">—</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setWebsiteValue("");
                          setIsEditingWebsite(true);
                        }}
                        className="h-6 px-2 text-xs text-[#374151] hover:text-[#435EBD]"
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Add website
                      </Button>
                    </div>
                  )}
                </div>
                {school.techStack && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs tracking-wider text-[#4B5563] uppercase">
                      Tech Stack:
                    </span>
                    <span className="text-sm text-emerald-400">{school.techStack}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Section: Deal Info */}
            <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider text-[#4B5563] uppercase">
                <DollarSign className="h-3.5 w-3.5" />
                Deal Info
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#374151]">Deal Value</label>
                  <div className="relative">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#374151]">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder="e.g. 14400"
                      value={dealValue}
                      onChange={(e) => setDealValue(e.target.value)}
                      className="h-8 border-[#E4E4E7] bg-white pl-6 text-sm text-[#09090B] placeholder:text-[#9CA3AF]"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#374151]">Close Date</label>
                  <Input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="h-8 border-[#E4E4E7] bg-white text-sm text-[#09090B]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#374151]">RFP Reference</label>
                  <Input
                    type="text"
                    placeholder="e.g. RFP-2026-001"
                    value={rfpReference}
                    onChange={(e) => setRfpReference(e.target.value)}
                    className="h-8 border-[#E4E4E7] bg-white text-sm text-[#09090B] placeholder:text-[#9CA3AF]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#374151]">Probability</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0–100"
                      value={probability}
                      onChange={(e) => setProbability(e.target.value)}
                      className="h-8 border-[#E4E4E7] bg-white pr-7 text-sm text-[#09090B] placeholder:text-[#9CA3AF]"
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[#374151]">
                      %
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={handleSaveDealInfo}
                  disabled={isSavingDeal}
                  className="bg-[#435EBD] text-white hover:bg-[#3B52A8]"
                >
                  Save Deal Info
                </Button>
              </div>
            </section>

            {/* Section: Contacts */}
            <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wider text-[#4B5563] uppercase">
                  Contacts
                  {school.contacts.length > 0 && (
                    <span className="ml-2 text-[#435EBD] normal-case">
                      ({school.contacts.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowAddContact(true)}
                  className="text-xs text-[#435EBD] hover:text-[#6247AA]"
                >
                  + Add
                </button>
              </div>
              {school.contacts.length === 0 ? (
                <p className="text-sm text-[#374151]">No contacts yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {school.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-lg border border-[#E4E4E7] bg-white p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#09090B]">{contact.name}</span>
                        {contact.isPrimary && (
                          <Badge className="h-4 bg-[#EEF2FF] px-1.5 text-[10px] text-[#435EBD]">
                            Primary
                          </Badge>
                        )}
                      </div>
                      {contact.title && <p className="text-xs text-[#374151]">{contact.title}</p>}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#374151]">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="hover:text-[#435EBD]">
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="hover:text-[#435EBD]">
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            {/* Section: Outreach History */}
            <section className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wider text-[#4B5563] uppercase">
                  Outreach History
                  {school.outreachLogs.length > 0 && (
                    <span className="ml-2 text-[#435EBD] normal-case">
                      ({school.outreachLogs.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setShowLogOutreach(true)}
                  className="text-xs text-[#435EBD] hover:text-[#6247AA]"
                >
                  + Log
                </button>
              </div>
              {school.outreachLogs.length === 0 ? (
                <p className="text-sm text-[#374151]">No outreach recorded yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {school.outreachLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-[#E4E4E7] bg-white p-3 text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-[#09090B] capitalize">
                              {log.type.toLowerCase()}
                            </span>
                            <Badge
                              variant="outline"
                              className="h-4 border-[#E4E4E7] px-1.5 text-[10px] text-[#374151]"
                            >
                              {log.outcome != null
                                ? (OUTREACH_OUTCOME_LABELS[String(log.outcome)] ??
                                  String(log.outcome))
                                : "—"}
                            </Badge>
                            {log.contact && (
                              <span className="text-[#374151]">with {log.contact.name}</span>
                            )}
                          </div>
                          {log.subject && <p className="mt-0.5 text-[#374151]">{log.subject}</p>}
                          {log.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-[#374151]">{log.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1 text-xs text-[#374151]">
                          <Clock className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="call-guide" className="space-y-4">
            <CallGuide school={school} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {showQuickLog && <LogOutreachDialog schoolId={id} onClose={() => setShowQuickLog(false)} />}
      {showLogOutreach && (
        <LogOutreachDialog schoolId={id} onClose={() => setShowLogOutreach(false)} />
      )}
      {showAddContact && (
        <AddContactDialog schoolId={id} onClose={() => setShowAddContact(false)} />
      )}
    </div>
  );
}
