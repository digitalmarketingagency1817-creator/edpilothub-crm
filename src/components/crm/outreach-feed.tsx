"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, Phone, Mail, Linkedin, Clock } from "lucide-react";
import { OutreachType } from "@/generated/prisma";

const OUTCOME_LABELS: Record<string, string> = {
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

const OUTCOME_COLORS: Record<string, string> = {
  NO_ANSWER: "text-[#71717A]",
  LEFT_VOICEMAIL: "text-[#09090B]",
  SPOKE_TO_GATEKEEPER: "text-yellow-400",
  CONNECTED: "text-[#435EBD]",
  MEETING_BOOKED: "text-green-400",
  NOT_INTERESTED: "text-red-400",
  CALLBACK_SCHEDULED: "text-orange-400",
  EMAIL_SENT: "text-[#09090B]",
  EMAIL_OPENED: "text-[#435EBD]",
  EMAIL_REPLIED: "text-green-400",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <Phone className="h-3.5 w-3.5" />,
  EMAIL: <Mail className="h-3.5 w-3.5" />,
  LINKEDIN: <Linkedin className="h-3.5 w-3.5" />,
  OTHER: <Clock className="h-3.5 w-3.5" />,
};

export function OutreachFeed() {
  const trpc = useTRPC();

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [type, setType] = useQueryState("type", parseAsString.withDefault(""));

  const { data, isFetching } = useQuery({
    ...trpc.outreach.listAll.queryOptions({
      limit: 50,
      page,
      type: (type as OutreachType) || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Outreach Log</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#71717A]">{total.toLocaleString()} activities recorded</p>
            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                Updating…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={type || "all"}
          onValueChange={(v) => {
            void setType(v === "all" ? null : v);
            void setPage(1);
          }}
        >
          <SelectTrigger className="w-44 border-[#E4E4E7] bg-white text-white">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="border-[#E4E4E7] bg-white">
            <SelectItem value="all" className="text-white">
              All Types
            </SelectItem>
            <SelectItem value="CALL" className="text-white">
              Calls
            </SelectItem>
            <SelectItem value="EMAIL" className="text-white">
              Emails
            </SelectItem>
            <SelectItem value="LINKEDIN" className="text-white">
              LinkedIn
            </SelectItem>
            <SelectItem value="OTHER" className="text-white">
              Other
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-2">
        {logs.length === 0 ? (
          <div className="rounded-lg border border-[#E4E4E7] py-12 text-center text-[#71717A]">
            No outreach logged yet.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 rounded-lg border border-[#E4E4E7] bg-white/50 p-4"
            >
              {/* Type icon */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#71717A]">
                {TYPE_ICONS[log.type] ?? <Clock className="h-3.5 w-3.5" />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* School link */}
                  <Link
                    href={`/schools/${log.school.id}` as Parameters<typeof Link>[0]["href"]}
                    className="font-medium text-white hover:text-[#435EBD]"
                  >
                    {log.school.name}
                  </Link>
                  {log.school.city && (
                    <span className="text-xs text-[#71717A]">{log.school.city}</span>
                  )}
                  <span className="text-[#71717A]">·</span>
                  {/* Outcome */}
                  <span
                    className={`text-sm font-medium ${log.outcome != null ? (OUTCOME_COLORS[String(log.outcome)] ?? "text-[#09090B]") : "text-[#09090B]"}`}
                  >
                    {log.outcome != null
                      ? (OUTCOME_LABELS[String(log.outcome)] ?? String(log.outcome))
                      : "—"}
                  </span>
                  {log.contact && (
                    <>
                      <span className="text-[#71717A]">·</span>
                      <span className="text-sm text-[#71717A]">
                        with {log.contact.name}
                        {log.contact.title ? ` (${log.contact.title})` : ""}
                      </span>
                    </>
                  )}
                </div>
                {log.subject && <p className="mt-0.5 text-sm text-[#71717A]">{log.subject}</p>}
                {log.notes && (
                  <p className="mt-1 line-clamp-2 text-xs text-[#71717A]">{log.notes}</p>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex-shrink-0 text-xs text-[#71717A]">
                {new Date(log.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#71717A]">
            Page {page} of {pages} ({total.toLocaleString()} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page - 1)}
              disabled={page <= 1}
              className="border-[#E4E4E7] bg-white text-[#09090B] hover:bg-[#F8F8F8]"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page + 1)}
              disabled={page >= pages}
              className="border-[#E4E4E7] bg-white text-[#09090B] hover:bg-[#F8F8F8]"
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
