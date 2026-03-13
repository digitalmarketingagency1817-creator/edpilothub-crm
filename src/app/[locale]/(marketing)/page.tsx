import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { TrendingUp, Users, BarChart3, MapPin, BookOpen, Target } from "lucide-react";

export const metadata: Metadata = {
  title: "EdPilotHub CRM — Florida K-12 Sales Intelligence",
  description:
    "The sales intelligence CRM built for K-12 ed-tech. Find schools, track your pipeline, and close more deals.",
};

const features = [
  {
    icon: MapPin,
    title: "4,000+ Florida Schools",
    description:
      "Complete K-12 database with contact info, district relationships, enrollment data, and website detection.",
  },
  {
    icon: BarChart3,
    title: "Visual Pipeline",
    description:
      "Kanban board with 9 stages. Assign cards to appointment setters and filter by agent in one click.",
  },
  {
    icon: BookOpen,
    title: "Built-in Playbook",
    description:
      "Value framework, first call scripts, competitor battle cards, and objection handling — all in one place.",
  },
  {
    icon: TrendingUp,
    title: "RFP Radar",
    description:
      "Track open government RFPs from BidNet, SAM.gov, and state portals. Never miss a bid again.",
  },
  {
    icon: Target,
    title: "Outreach Tracking",
    description:
      "Log every call, email, and meeting. See full history on each school profile with follow-up reminders.",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Add appointment setters and admins. Assign pipeline cards and track performance by rep.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Nav */}
      <nav className="border-b border-[#E4E4E7] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Image
            src="/logo.jpg"
            alt="EdPilotHub"
            width={160}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
          <Button asChild className="bg-[#435EBD] hover:bg-[#3B52A8]">
            <Link href="/sign-in">Sign In →</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-4 py-1.5 text-sm font-medium text-[#435EBD]">
          🎯 Florida K-12 · 4,146 Schools Loaded
        </div>
        <h1 className="mt-6 text-5xl leading-tight font-bold tracking-tight text-[#09090B]">
          Close more K-12 deals.
          <br />
          <span className="text-[#435EBD]">Work smarter.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-[#4B5563]">
          The sales intelligence CRM built exclusively for ed-tech teams. Find schools, run your
          outreach, track your pipeline — all in one place.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-[#435EBD] px-8 hover:bg-[#3B52A8]">
            <Link href="/sign-in">Go to CRM →</Link>
          </Button>
        </div>
        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 sm:grid-cols-3">
          {[
            { value: "4,146", label: "FL K-12 Schools" },
            { value: "75", label: "Counties & Districts" },
            { value: "9", label: "Pipeline Stages" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[#E4E4E7] bg-white p-6 shadow-sm"
            >
              <div className="text-3xl font-bold text-[#435EBD]">{stat.value}</div>
              <div className="mt-1 text-sm text-[#6B7280]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-[#09090B]">
          Everything your team needs to sell
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[#E4E4E7] bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF]">
                <f.icon className="h-5 w-5 text-[#435EBD]" />
              </div>
              <h3 className="mb-2 font-semibold text-[#09090B]">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[#6B7280]">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#E4E4E7] bg-white py-20 text-center">
        <h2 className="text-3xl font-bold text-[#09090B]">Ready to start?</h2>
        <p className="mt-3 text-[#6B7280]">Sign in with your EdPilotHub credentials.</p>
        <Button asChild size="lg" className="mt-8 bg-[#435EBD] px-10 hover:bg-[#3B52A8]">
          <Link href="/sign-in">Sign In to CRM →</Link>
        </Button>
      </section>

      <footer className="border-t border-[#E4E4E7] py-6 text-center text-xs text-[#9CA3AF]">
        © {new Date().getFullYear()} EdPilotHub. All rights reserved.
      </footer>
    </div>
  );
}
