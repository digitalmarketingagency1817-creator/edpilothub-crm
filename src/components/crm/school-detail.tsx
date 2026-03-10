"use client";

import type { Prisma } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  Activity,
  Clock,
  ChevronRight,
} from "lucide-react";
import { PipelineStage } from "@/generated/prisma";
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

  const { data: _school } = useSuspenseQuery(trpc.school.getById.queryOptions({ id }));
  const school = _school as unknown as SchoolWithDetails;

  const { mutate: upsertPipeline, isPending: isPipelinePending } = useMutation(
    trpc.pipeline.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("Pipeline stage updated");
        void queryClient.invalidateQueries({ queryKey: trpc.school.getById.queryKey({ id }) });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const currentStage = school.pipelineStatus?.stage ?? "UNCONTACTED";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link href="/schools">
          <Button variant="ghost" size="sm" className="gap-1 text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Schools
          </Button>
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-600" />
        <span className="text-sm text-slate-400">{school.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{school.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            {school.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {school.city}
                {school.county ? `, ${school.county} County` : ""}
              </span>
            )}
            {school.district && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {school.district.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          {/* Pipeline stage selector */}
          <Select
            value={currentStage}
            onValueChange={(stage) =>
              upsertPipeline({ schoolId: id, stage: stage as PipelineStage })
            }
            disabled={isPipelinePending}
          >
            <SelectTrigger className="w-48 border-slate-700 bg-slate-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800">
              {Object.entries(PIPELINE_STAGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-white">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: details + contacts */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* School info card */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase">
              School Info
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {school.gradeRange && (
                <div className="flex items-center gap-2 text-slate-300">
                  <GraduationCap className="h-4 w-4 text-slate-500" />
                  <span>Grades {school.gradeRange}</span>
                </div>
              )}
              {school.studentCount && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span>{school.studentCount.toLocaleString()} students</span>
                </div>
              )}
              {school.phone && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <a href={`tel:${school.phone}`} className="hover:text-blue-400">
                    {school.phone}
                  </a>
                </div>
              )}
              {school.email && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <a href={`mailto:${school.email}`} className="truncate hover:text-blue-400">
                    {school.email}
                  </a>
                </div>
              )}
              {school.website && (
                <div className="col-span-2 flex items-center gap-2 text-slate-300">
                  <Globe className="h-4 w-4 flex-shrink-0 text-slate-500" />
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-blue-400"
                  >
                    {school.website}
                  </a>
                </div>
              )}
              {school.address && (
                <div className="col-span-2 flex items-center gap-2 text-slate-300">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-slate-500" />
                  <span>
                    {school.address}
                    {school.zipCode ? ` ${school.zipCode}` : ""}
                  </span>
                </div>
              )}
            </div>

            {school.techStack && (
              <>
                <Separator className="my-4 bg-slate-800" />
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Tech Stack
                  </p>
                  <span className="text-sm text-emerald-400">{school.techStack}</span>
                </div>
              </>
            )}
          </div>

          {/* Contacts */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase">
              Contacts ({school.contacts.length})
            </h2>
            {school.contacts.length === 0 ? (
              <p className="text-sm text-slate-600">No contacts yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {school.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start justify-between rounded-md bg-slate-800/50 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{contact.name}</span>
                        {contact.isPrimary && (
                          <Badge className="h-4 bg-blue-900 px-1.5 text-[10px] text-blue-300">
                            Primary
                          </Badge>
                        )}
                      </div>
                      {contact.title && <p className="text-xs text-slate-400">{contact.title}</p>}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="hover:text-blue-400">
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="hover:text-blue-400">
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outreach log */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase">
              Outreach Log ({school.outreachLogs.length})
            </h2>
            {school.outreachLogs.length === 0 ? (
              <p className="text-sm text-slate-600">No outreach recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {school.outreachLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-md bg-slate-800/50 p-3 text-sm"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white capitalize">
                          {log.type.toLowerCase()}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-4 border-slate-700 px-1.5 text-[10px] text-slate-400"
                        >
                          {log.outcome != null
                            ? (OUTREACH_OUTCOME_LABELS[String(log.outcome)] ?? String(log.outcome))
                            : "—"}
                        </Badge>
                        {log.contact && (
                          <span className="text-slate-400">with {log.contact.name}</span>
                        )}
                      </div>
                      {log.subject && <p className="mt-0.5 text-slate-400">{log.subject}</p>}
                      {log.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{log.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1 text-xs text-slate-600">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: pipeline status */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase">
              Pipeline Status
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1 text-xs text-slate-500">Current Stage</p>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                    PIPELINE_STAGE_COLORS[currentStage] ?? ""
                  }`}
                >
                  {PIPELINE_STAGE_LABELS[currentStage]}
                </span>
              </div>

              {school.pipelineStatus?.lastContactedAt && (
                <div>
                  <p className="mb-1 text-xs text-slate-500">Last Contacted</p>
                  <p className="flex items-center gap-1 text-sm text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    {new Date(school.pipelineStatus.lastContactedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {school.pipelineStatus?.nextFollowUpAt && (
                <div>
                  <p className="mb-1 text-xs text-slate-500">Next Follow-up</p>
                  <p className="flex items-center gap-1 text-sm text-slate-300">
                    <Activity className="h-3.5 w-3.5 text-slate-500" />
                    {new Date(school.pipelineStatus.nextFollowUpAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {school.pipelineStatus?.notes && (
                <div>
                  <p className="mb-1 text-xs text-slate-500">Notes</p>
                  <p className="text-sm text-slate-400">{school.pipelineStatus.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wider text-slate-400 uppercase">
              Quick Stats
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Contacts</span>
                <span className="font-medium text-white">{school.contacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outreach Logs</span>
                <span className="font-medium text-white">{school.outreachLogs.length}</span>
              </div>
              {school.ncesId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">NCES ID</span>
                  <span className="font-mono text-xs text-slate-300">{school.ncesId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Added</span>
                <span className="text-slate-300">
                  {new Date(school.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
