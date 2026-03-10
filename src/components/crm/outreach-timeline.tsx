"use client";

import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Linkedin, MessageSquare } from "lucide-react";

const TYPE_ICONS = {
  CALL: Phone,
  EMAIL: Mail,
  LINKEDIN: Linkedin,
  OTHER: MessageSquare,
};

const TYPE_COLORS = {
  CALL: "bg-blue-900/40 text-blue-400 border-blue-800",
  EMAIL: "bg-purple-900/40 text-purple-400 border-purple-800",
  LINKEDIN: "bg-cyan-900/40 text-cyan-400 border-cyan-800",
  OTHER: "bg-slate-800 text-slate-400 border-slate-700",
};

const OUTCOME_COLORS: Record<string, string> = {
  NO_ANSWER: "bg-slate-800 text-slate-400",
  LEFT_VOICEMAIL: "bg-blue-900/50 text-blue-300",
  SPOKE_TO_GATEKEEPER: "bg-yellow-900/50 text-yellow-300",
  CONNECTED: "bg-emerald-900/50 text-emerald-300",
  MEETING_BOOKED: "bg-green-900/50 text-green-300",
  NOT_INTERESTED: "bg-red-900/50 text-red-300",
  CALLBACK_SCHEDULED: "bg-indigo-900/50 text-indigo-300",
  EMAIL_SENT: "bg-purple-900/50 text-purple-300",
  EMAIL_OPENED: "bg-violet-900/50 text-violet-300",
  EMAIL_REPLIED: "bg-pink-900/50 text-pink-300",
};

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

interface Log {
  id: string;
  type: string;
  direction: string;
  subject: string | null;
  notes: string | null;
  outcome: string | null;
  createdAt: Date;
  contact: { id: string; name: string } | null;
  scheduledFollowUp?: Date | null;
}

export function OutreachTimeline({ logs }: { logs: Log[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 p-12 text-center text-slate-500">
        No outreach logged yet.
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-0">
      {/* Timeline line */}
      <div className="absolute top-4 bottom-4 left-[22px] w-px bg-slate-800" />

      {logs.map((log) => {
        const Icon = TYPE_ICONS[log.type as keyof typeof TYPE_ICONS] ?? MessageSquare;
        const typeColor = TYPE_COLORS[log.type as keyof typeof TYPE_COLORS] ?? TYPE_COLORS.OTHER;

        return (
          <div key={log.id} className="relative flex gap-4 py-4 pl-2">
            {/* Icon */}
            <div
              className={`z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border ${typeColor}`}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {log.type} · {log.direction}
                  </span>
                  {log.outcome != null && (
                    <Badge
                      className={`text-xs ${OUTCOME_COLORS[String(log.outcome)] ?? "bg-slate-800 text-slate-400"}`}
                    >
                      {OUTCOME_LABELS[String(log.outcome)] ?? String(log.outcome)}
                    </Badge>
                  )}
                  {log.contact && (
                    <span className="text-xs text-slate-400">with {log.contact.name}</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {log.subject && (
                <p className="mt-1 text-sm font-medium text-slate-300">{log.subject}</p>
              )}
              {log.notes && <p className="mt-2 text-sm text-slate-400">{log.notes}</p>}
              {log.scheduledFollowUp && (
                <p className="mt-2 text-xs text-blue-400">
                  📅 Follow-up: {new Date(log.scheduledFollowUp).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
