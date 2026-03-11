"use client";

import type { Prisma } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
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
} from "lucide-react";
import { PipelineStage } from "@/generated/prisma";
import { toast } from "sonner";
import { useState } from "react";
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

const pipelineSchema = z.object({
  stage: z.nativeEnum(PipelineStage),
  notes: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  lastContactedAt: z.string().optional(),
});

type PipelineFormData = z.infer<typeof pipelineSchema>;

interface SchoolDetailProps {
  id: string;
}

export function SchoolDetail({ id }: SchoolDetailProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: _school } = useSuspenseQuery(trpc.school.getById.queryOptions({ id }));
  const school = _school as unknown as SchoolWithDetails;

  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showLogOutreach, setShowLogOutreach] = useState(false);
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [websiteValue, setWebsiteValue] = useState(school.website ?? "");

  const pipelineForm = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      stage: school.pipelineStatus?.stage ?? PipelineStage.UNCONTACTED,
      notes: school.pipelineStatus?.notes ?? "",
      nextFollowUpAt: school.pipelineStatus?.nextFollowUpAt
        ? new Date(school.pipelineStatus.nextFollowUpAt).toISOString().split("T")[0]
        : "",
      lastContactedAt: school.pipelineStatus?.lastContactedAt
        ? new Date(school.pipelineStatus.lastContactedAt).toISOString().split("T")[0]
        : "",
    },
  });

  const { mutate: savePipeline, isPending: isPipelinePending } = useMutation(
    trpc.pipeline.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("Pipeline updated");
        void queryClient.invalidateQueries({ queryKey: trpc.school.getById.queryKey({ id }) });
      },
      onError: (err) => toast.error(err.message),
    })
  );

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

  const onPipelineSubmit = (data: PipelineFormData) => {
    savePipeline({
      schoolId: id,
      stage: data.stage,
      notes: data.notes,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
      lastContactedAt: data.lastContactedAt ? new Date(data.lastContactedAt) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-[#E4E4E7] bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/schools">
            <button className="rounded-md p-1.5 text-[#71717A] hover:bg-white hover:text-[#09090B]">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-[#09090B]">{school.name}</h1>
            <p className="text-xs text-[#71717A]">
              {school.city}
              {school.county ? `, ${school.county}` : ""} · {school.schoolType}
            </p>
          </div>
          <button
            onClick={() => setShowQuickLog(true)}
            className="rounded-md bg-[#435EBD] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3B52A8]"
          >
            Log Activity
          </button>
        </div>
      </div>

      <div className="space-y-0 px-4 py-6 md:px-6">
        {/* Section: School Info */}
        <section className="pb-6">
          <h2 className="mb-4 text-xs font-semibold tracking-wider text-[#71717A] uppercase">
            School Info
          </h2>

          {/* Stat cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {school.studentCount != null && (
              <div className="rounded-lg border border-[#E4E4E7] bg-white p-3">
                <div className="flex items-center gap-1.5 text-[#71717A]">
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
                <div className="flex items-center gap-1.5 text-[#71717A]">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span className="text-xs">Grades</span>
                </div>
                <p className="mt-1 text-lg font-semibold text-[#09090B]">{school.gradeRange}</p>
              </div>
            )}
            <div className="rounded-lg border border-[#E4E4E7] bg-white p-3">
              <div className="flex items-center gap-1.5 text-[#71717A]">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-xs">Type</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-[#09090B]">{school.schoolType}</p>
            </div>
            {school.district && (
              <div className="rounded-lg border border-[#E4E4E7] bg-white p-3">
                <div className="flex items-center gap-1.5 text-[#71717A]">
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
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#71717A]" />
                <span>
                  {school.address}
                  {school.zipCode ? ` ${school.zipCode}` : ""}
                </span>
              </div>
            )}
            {school.phone && (
              <div className="flex items-center gap-2 text-[#09090B]">
                <Phone className="h-4 w-4 flex-shrink-0 text-[#71717A]" />
                <a href={`tel:${school.phone}`} className="hover:text-[#435EBD]">
                  {school.phone}
                </a>
              </div>
            )}
            {school.email && (
              <div className="flex items-center gap-2 text-[#09090B]">
                <Mail className="h-4 w-4 flex-shrink-0 text-[#71717A]" />
                <a href={`mailto:${school.email}`} className="truncate hover:text-[#435EBD]">
                  {school.email}
                </a>
              </div>
            )}
            {/* Website — editable */}
            <div className="flex items-center gap-2 text-[#09090B]">
              <Globe className="h-4 w-4 flex-shrink-0 text-[#71717A]" />
              {isEditingWebsite ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={websiteValue}
                    onChange={(e) => setWebsiteValue(e.target.value)}
                    placeholder="https://school.example.com"
                    className="h-7 flex-1 border-[#E4E4E7] bg-white text-sm text-[#09090B] placeholder:text-[#71717A]"
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
                    className="h-7 w-7 p-0 text-[#71717A] hover:text-[#09090B]"
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
                    className="h-6 w-6 p-0 text-[#71717A] hover:text-[#09090B]"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[#71717A]">—</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setWebsiteValue("");
                      setIsEditingWebsite(true);
                    }}
                    className="h-6 px-2 text-xs text-[#71717A] hover:text-[#435EBD]"
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Add website
                  </Button>
                </div>
              )}
            </div>
            {school.techStack && (
              <div className="flex items-center gap-2">
                <span className="text-xs tracking-wider text-[#71717A] uppercase">Tech Stack:</span>
                <span className="text-sm text-emerald-400">{school.techStack}</span>
              </div>
            )}
          </div>
        </section>
        <div className="border-t border-[#E4E4E7]" />

        {/* Section: Pipeline */}
        <section className="py-6">
          <h2 className="mb-4 text-xs font-semibold tracking-wider text-[#71717A] uppercase">
            Pipeline
          </h2>
          <Form {...pipelineForm}>
            <form
              onSubmit={pipelineForm.handleSubmit(onPipelineSubmit)}
              className="max-w-lg space-y-4"
            >
              <FormField
                control={pipelineForm.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#71717A]">Stage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[#E4E4E7] bg-white text-[#09090B]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-[#E4E4E7] bg-white">
                        {PIPELINE_STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-[#09090B]">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={pipelineForm.control}
                  name="lastContactedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#71717A]">Last Contacted</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="border-[#E4E4E7] bg-white text-[#09090B]"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={pipelineForm.control}
                  name="nextFollowUpAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#71717A]">Next Follow-up</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="border-[#E4E4E7] bg-white text-[#09090B]"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={pipelineForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#71717A]">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="border-[#E4E4E7] bg-white text-[#09090B] placeholder:text-[#71717A]"
                        rows={3}
                        placeholder="Pipeline notes..."
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isPipelinePending}
                className="bg-[#435EBD] text-white hover:bg-[#3B52A8]"
              >
                {isPipelinePending ? "Saving…" : "Save Pipeline"}
              </Button>
            </form>
          </Form>
        </section>
        <div className="border-t border-[#E4E4E7]" />

        {/* Section: Contacts */}
        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-[#71717A] uppercase">
              Contacts
              {school.contacts.length > 0 && (
                <span className="ml-2 text-[#435EBD] normal-case">({school.contacts.length})</span>
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
            <p className="text-sm text-[#71717A]">No contacts yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {school.contacts.map((contact) => (
                <div key={contact.id} className="rounded-lg border border-[#E4E4E7] bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#09090B]">{contact.name}</span>
                    {contact.isPrimary && (
                      <Badge className="h-4 bg-[#EEF2FF] px-1.5 text-[10px] text-[#435EBD]">
                        Primary
                      </Badge>
                    )}
                  </div>
                  {contact.title && <p className="text-xs text-[#71717A]">{contact.title}</p>}
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#71717A]">
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
        <div className="border-t border-[#E4E4E7]" />

        {/* Section: Outreach History */}
        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-[#71717A] uppercase">
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
            <p className="text-sm text-[#71717A]">No outreach recorded yet.</p>
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
                          className="h-4 border-[#E4E4E7] px-1.5 text-[10px] text-[#71717A]"
                        >
                          {log.outcome != null
                            ? (OUTREACH_OUTCOME_LABELS[String(log.outcome)] ?? String(log.outcome))
                            : "—"}
                        </Badge>
                        {log.contact && (
                          <span className="text-[#71717A]">with {log.contact.name}</span>
                        )}
                      </div>
                      {log.subject && <p className="mt-0.5 text-[#71717A]">{log.subject}</p>}
                      {log.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-[#71717A]">{log.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1 text-xs text-[#71717A]">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
