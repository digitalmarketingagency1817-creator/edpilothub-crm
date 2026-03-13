"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PipelineStage,
  OutreachType,
  OutreachDirection,
  OutreachOutcome,
} from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma";
import { toast } from "sonner";
import { UserRound, Monitor, GraduationCap, Copy, Check } from "lucide-react";

type PersonaKey = "principal" | "it" | "admissions";

type SchoolWithPipeline = Prisma.SchoolGetPayload<{
  include: { pipelineStatus: true };
}>;

interface CallGuideProps {
  school: SchoolWithPipeline;
}

// ─── Static Data ────────────────────────────────────────────────────────────

const personas: Record<
  PersonaKey,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bestFor: string;
    opening: string;
    hooks: string[];
    questions: string[];
  }
> = {
  principal: {
    label: "Principal",
    icon: UserRound,
    bestFor: "Decision maker, budget owner, enrollment growth focus",
    opening:
      "Hi [Name], this is [Your Name] from EdPilotHub — we help K-12 schools in Florida attract more students through their website and digital presence. I'm not calling to sell you anything today — I'd love to ask you a couple questions to see if what we do is even relevant for you. Do you have 2 minutes?",
    hooks: [
      "\"I was looking at [School Name]'s site and noticed your events page hasn't been updated recently.\"",
      "\"I saw [School Name] offers [program] — that's a great differentiator, but it's hard to find on your current site.\"",
      "\"[School Name] doesn't rank on the first page for '[city] elementary school' — that's something we fix.\"",
    ],
    questions: [
      "When a prospective family finds your school online, what's the first thing they see?",
      "What percentage of new enrollments come from families who found you through your website?",
      "If a parent searches 'K-12 school in [city]' right now, where does your school show up?",
      "Who handles website updates — and how long does a typical change take?",
      "Are you happy with the number of enrollment inquiries your website generates each month?",
    ],
  },
  it: {
    label: "IT Director",
    icon: Monitor,
    bestFor: "Infrastructure owner, ticket queue pain, website maintenance burden",
    opening:
      "Hi [Name], this is [Your Name] from EdPilotHub. We help K-12 IT teams simplify their website infrastructure — putting everything in one place so website requests stop landing in your queue.",
    hooks: [
      '"I\'m guessing website update requests from staff end up in your ticket system pretty regularly?"',
      '"I noticed [School Name] is running [CMS] — I can imagine that creates some maintenance overhead."',
      '"How many tools are you managing right now for the school\'s web presence?"',
    ],
    questions: [
      "How many website-related support requests does your team handle per month?",
      "When a teacher or admin needs to update the site, what's that process look like?",
      "What does your current website stack look like — separate tools for site, admissions, communication?",
      "What would it mean for your workload if staff could handle all content updates themselves?",
    ],
  },
  admissions: {
    label: "Admissions Director",
    icon: GraduationCap,
    bestFor: "Enrollment tracking, inquiry conversion, CRM need",
    opening:
      "Hi [Name], this is [Your Name] from EdPilotHub. We help K-12 admissions teams get more inquiries from their website and track them all the way through enrollment — in one place.",
    hooks: [
      "\"I noticed there's no way for a parent to express interest or start an application directly from [School Name]'s site — that's typically where schools lose the most leads.\"",
      '"I was looking at [School Name]\'s admissions page — how do parents currently take that first step to enroll?"',
      '"What does your inquiry-to-enrollment tracking look like right now?"',
    ],
    questions: [
      "What percentage of inquiries come through the website vs. other channels?",
      "When a parent finds your school online and wants to learn more, what's their next step?",
      "Do you have visibility into how many visit your admissions page but don't take action?",
      "Are you using a separate tool to track applicants, or spreadsheets?",
    ],
  },
};

const painBridges: Record<string, { label: string; emoji: string; script: string }> = {
  enrollment: {
    label: "Low enrollment / website not converting",
    emoji: "📉",
    script:
      '"So parents are out there looking for a school like yours, but finding competitors first — or landing on your site and not taking action. That\'s the enrollment leak we fix."',
  },
  staff: {
    label: "Staff time / too hard to update",
    emoji: "⏱️",
    script:
      '"So your team spends hours on something that should take minutes, pulling them from what actually matters. That\'s exactly the problem we were built to solve."',
  },
  tools: {
    label: "Too many tools / too expensive",
    emoji: "💸",
    script:
      "\"So you're paying multiple vendors for things that should be in one place. We consolidate all of that at a fraction of what you're currently paying.\"",
  },
};

const preCallItems = [
  "Visited school website",
  "Noted what's outdated or missing",
  "Checked Google ranking for school name",
  "Identified the right contact (Principal / IT / Admissions)",
  "Looked up contact name on school website or LinkedIn",
];

const STEPS = [
  "Pre-Call Research",
  "Choose Persona",
  "Opening",
  "Discovery",
  "Identify Pain",
  "Log Outcome",
];

// ─── Stepper ────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div className="mb-6 flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i === current
                  ? "bg-[#435EBD] text-white"
                  : i < current
                    ? "bg-[#435EBD]/30 text-[#435EBD]"
                    : "bg-[#E4E4E7] text-[#9CA3AF]"
              )}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={cn(
                "mt-1 hidden text-[10px] sm:block",
                i === current ? "font-semibold text-[#435EBD]" : "text-[#9CA3AF]"
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-1 mb-4 h-0.5 w-6 sm:w-10",
                i < current ? "bg-[#435EBD]/40" : "bg-[#E4E4E7]"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CallGuide({ school }: CallGuideProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [observations, setObservations] = useState("");
  const [persona, setPersona] = useState<PersonaKey | null>(null);
  const [selectedHook, setSelectedHook] = useState<number>(0);
  const [checkedQs, setCheckedQs] = useState<Record<number, boolean>>({});
  const [callNotes, setCallNotes] = useState("");
  const [pain, setPain] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentPersona = persona ? personas[persona] : null;

  const { mutate: upsertPipeline } = useMutation(
    trpc.pipeline.upsert.mutationOptions({
      onSuccess: () =>
        void queryClient.invalidateQueries({
          queryKey: trpc.school.getById.queryKey({ id: school.id }),
        }),
    })
  );

  const { mutate: logOutreach } = useMutation(
    trpc.outreach.create.mutationOptions({
      onSuccess: () => {
        toast.success("Call logged! Pipeline updated.");
        void queryClient.invalidateQueries({
          queryKey: trpc.school.getById.queryKey({ id: school.id }),
        });
        setDone(true);
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const saveObservations = () => {
    if (!observations.trim()) return;
    upsertPipeline({
      schoolId: school.id,
      stage: school.pipelineStatus?.stage ?? PipelineStage.UNCONTACTED,
      notes: observations,
    });
  };

  const handleCopy = async () => {
    if (!currentPersona) return;
    const hook = currentPersona.hooks[selectedHook] ?? "";
    const text = `${currentPersona.opening}\n\nHook: ${hook}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOutcome = (outcome: OutreachOutcome, stage: PipelineStage) => {
    upsertPipeline({
      schoolId: school.id,
      stage,
      nextFollowUpAt: followUpDate ? new Date(followUpDate) : undefined,
    });
    logOutreach({
      schoolId: school.id,
      type: OutreachType.CALL,
      direction: OutreachDirection.OUTBOUND,
      outcome,
      notes: callNotes,
      scheduledFollowUp: followUpDate ? new Date(followUpDate) : undefined,
    });
  };

  const reset = () => {
    setStep(0);
    setChecked({});
    setObservations("");
    setPersona(null);
    setSelectedHook(0);
    setCheckedQs({});
    setCallNotes("");
    setPain(null);
    setFollowUpDate("");
    setDone(false);
  };

  // ── Success Screen ──
  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl">
          ✅
        </div>
        <h3 className="text-lg font-bold text-[#09090B]">Call logged! Pipeline updated.</h3>
        <Button onClick={reset} variant="outline" className="mt-2">
          Start Over
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Stepper current={step} />

      {/* Step 1: Pre-Call Research */}
      {step === 0 && (
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#09090B]">Pre-Call Research</h3>
          <ul className="mb-4 space-y-2">
            {preCallItems.map((item, i) => (
              <li
                key={i}
                className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]"
                onClick={() => setChecked((p) => ({ ...p, [i]: !p[i] }))}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                    checked[i] ? "border-[#435EBD] bg-[#435EBD] text-white" : "border-[#D1D5DB]"
                  )}
                >
                  {checked[i] && <span className="text-[10px]">✓</span>}
                </span>
                <span className={checked[i] ? "line-through opacity-50" : ""}>{item}</span>
              </li>
            ))}
          </ul>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#374151]">
              Your observations about {school.name}&apos;s website:
            </span>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              onBlur={saveObservations}
              rows={3}
              className="w-full rounded-lg border border-[#E4E4E7] bg-[#F9FAFB] p-2 text-sm text-[#09090B] outline-none focus:border-[#435EBD] focus:ring-1 focus:ring-[#435EBD]"
              placeholder="e.g. Events page last updated 2022, no mobile CTA, no enrollment form..."
            />
          </label>
          <Button
            className="mt-3 bg-[#435EBD] text-white hover:bg-[#3B52A8]"
            onClick={() => setStep(1)}
          >
            Ready to Call →
          </Button>
        </div>
      )}

      {/* Step 2: Choose Persona */}
      {step === 1 && (
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#09090B]">Choose Persona</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["principal", "it", "admissions"] as PersonaKey[]).map((key) => {
              const p = personas[key];
              const Icon = p.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setPersona(key);
                    setStep(2);
                  }}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all hover:border-[#435EBD]",
                    persona === key ? "border-[#435EBD] bg-[#EEF2FF]" : "border-[#E4E4E7] bg-white"
                  )}
                >
                  <Icon className="mb-2 h-5 w-5 text-[#435EBD]" />
                  <p className="font-semibold text-[#09090B]">{p.label}</p>
                  <p className="mt-1 text-xs text-[#374151]">Best for: {p.bestFor}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Opening Statement */}
      {step === 2 && currentPersona && (
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#09090B]">Opening Statement</h3>
          <div className="mb-4 rounded-lg bg-[#F3F4F6] p-4">
            <p className="text-sm text-[#374151] italic">"{currentPersona.opening}"</p>
          </div>

          <p className="mb-2 text-xs font-semibold text-[#374151]">Choose a hook:</p>
          <div className="mb-4 space-y-2">
            {currentPersona.hooks.map((h, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-start gap-2 text-sm text-[#374151]"
              >
                <input
                  type="radio"
                  name="hook"
                  checked={selectedHook === i}
                  onChange={() => setSelectedHook(i)}
                  className="mt-0.5 accent-[#435EBD]"
                />
                <span>{h}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleCopy()}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Script"}
            </Button>
            <Button
              className="bg-[#435EBD] text-white hover:bg-[#3B52A8]"
              onClick={() => setStep(3)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Discovery Questions */}
      {step === 3 && currentPersona && (
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#09090B]">Discovery Questions</h3>
          <ul className="mb-4 space-y-2">
            {currentPersona.questions.map((q, i) => (
              <li
                key={i}
                className="flex cursor-pointer items-start gap-2 text-sm text-[#374151]"
                onClick={() => setCheckedQs((p) => ({ ...p, [i]: !p[i] }))}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                    checkedQs[i] ? "border-[#435EBD] bg-[#435EBD] text-white" : "border-[#D1D5DB]"
                  )}
                >
                  {checkedQs[i] && <span className="text-[10px]">✓</span>}
                </span>
                <span className={checkedQs[i] ? "line-through opacity-50" : ""}>{q}</span>
              </li>
            ))}
          </ul>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#374151]">
              Key things they said:
            </span>
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#E4E4E7] bg-[#F9FAFB] p-2 text-sm text-[#09090B] outline-none focus:border-[#435EBD] focus:ring-1 focus:ring-[#435EBD]"
              placeholder="What resonated? Any objections? Key context..."
            />
          </label>
          <Button
            className="mt-3 bg-[#435EBD] text-white hover:bg-[#3B52A8]"
            onClick={() => setStep(4)}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Step 5: Identify Pain */}
      {step === 4 && (
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#09090B]">Identify Pain</h3>
          <p className="mb-3 text-xs font-semibold text-[#374151]">Main pain identified:</p>
          <div className="mb-4 space-y-2">
            {Object.entries(painBridges).map(([key, val]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]"
              >
                <input
                  type="radio"
                  name="pain"
                  checked={pain === key}
                  onChange={() => setPain(key)}
                  className="accent-[#435EBD]"
                />
                <span>
                  {val.emoji} {val.label}
                </span>
              </label>
            ))}
          </div>
          {pain && (
            <div className="mb-4 rounded-lg bg-[#EEF2FF] p-4">
              <p className="mb-1 text-xs font-semibold text-[#435EBD]">Pain Bridge Script:</p>
              <p className="text-sm text-[#374151] italic">{painBridges[pain]?.script}</p>
            </div>
          )}
          <Button className="bg-[#435EBD] text-white hover:bg-[#3B52A8]" onClick={() => setStep(5)}>
            Next →
          </Button>
        </div>
      )}

      {/* Step 6: Log Outcome */}
      {step === 5 && (
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-[#09090B]">Log Outcome</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                handleOutcome(OutreachOutcome.MEETING_BOOKED, PipelineStage.DEMO_SCHEDULED);
              }}
              className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-left transition-all hover:border-green-400"
            >
              <span className="text-2xl">✅</span>
              <p className="mt-1 font-semibold text-green-800">Demo Booked</p>
            </button>
            <button
              onClick={() => {
                handleOutcome(OutreachOutcome.CALLBACK_SCHEDULED, PipelineStage.CONTACTED);
              }}
              className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-left transition-all hover:border-blue-400"
            >
              <span className="text-2xl">🔄</span>
              <p className="mt-1 font-semibold text-blue-800">Follow-up Scheduled</p>
            </button>
            <button
              onClick={() => handleOutcome(OutreachOutcome.NOT_INTERESTED, PipelineStage.NOT_A_FIT)}
              className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-left transition-all hover:border-red-400"
            >
              <span className="text-2xl">❌</span>
              <p className="mt-1 font-semibold text-red-800">Not Interested</p>
            </button>
            <button
              onClick={() => handleOutcome(OutreachOutcome.NO_ANSWER, PipelineStage.CONTACTED)}
              className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-left transition-all hover:border-gray-400"
            >
              <span className="text-2xl">📵</span>
              <p className="mt-1 font-semibold text-gray-700">No Answer</p>
            </button>
          </div>

          <div className="mt-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#374151]">
                Follow-up date (optional):
              </span>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="rounded-lg border border-[#E4E4E7] bg-[#F9FAFB] px-3 py-1.5 text-sm text-[#09090B] outline-none focus:border-[#435EBD] focus:ring-1 focus:ring-[#435EBD]"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
