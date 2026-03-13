"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TrendingUp, Clock, Layers, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Value Framework Data ──────────────────────────────────────────────────

const valueDrivers = [
  {
    id: "attract",
    color: "border-blue-500",
    titleColor: "text-blue-700",
    bgColor: "bg-blue-50",
    icon: TrendingUp,
    title: "Attract More Students",
    before: [
      "Website looks outdated — parents form negative first impression before visiting",
      "Poor Google ranking — can't be found by parents searching 'best school near me'",
      "No clear call-to-action — visitors don't know how to apply or who to contact",
      "Mobile experience is broken — 70% of parents search on phone",
    ],
    after: [
      "Site optimized for local search — parents in your area find you first",
      "Mobile-first design — excellent experience on any device",
      "Clear enrollment CTA on every page — inquiry rate increases 20–35%",
      "Modern, credible design builds trust before the first school visit",
    ],
    questions: [
      "\"If a parent Googles 'K-12 school in [city],' where does your school show up?\"",
      '"When a parent visits your website, what do you want them to do — and is the site set up to make that happen?"',
      '"How often do new families say they found you through your website?"',
      '"Have enrollment numbers changed over the last 2–3 years? What do you think is driving that?"',
    ],
  },
  {
    id: "time",
    color: "border-green-500",
    titleColor: "text-green-700",
    bgColor: "bg-green-50",
    icon: Clock,
    title: "Save Staff Time",
    before: [
      "Simple update (new event, staff photo) requires IT ticket or web agency",
      "Staff spend 5–10 hours/week on website tasks that should take 20 minutes",
      "Events, news, and blogs are always out of date",
      "Every small change costs agency hourly fees",
    ],
    after: [
      "Any admin updates news, events, staff bios in under 5 minutes — no IT needed",
      "8–12 hours/week saved across admin staff",
      "Content stays fresh, parents stay engaged",
      "$6,000–$15,000/year saved in agency update fees",
    ],
    questions: [
      '"Who handles website updates day-to-day, and how long does a typical change take?"',
      '"Has your school ever waited on an agency to make a change that should take 10 minutes?"',
      '"How many website-related requests hit your IT team each month?"',
      '"If any staff member could update the site without touching IT, how would that change things?"',
    ],
  },
  {
    id: "platform",
    color: "border-purple-500",
    titleColor: "text-purple-700",
    bgColor: "bg-purple-50",
    icon: Layers,
    title: "One Platform, Not Four",
    before: [
      "Separate vendors for website, admissions portal, communication, chatbot",
      "Each tool has its own login, invoice, support contract",
      "Data doesn't flow between systems — inquiry from website doesn't appear in admissions",
      "Total spend: $15,000–$35,000/year across fragmented tools",
    ],
    after: [
      "One platform: website + CRM + admissions + AI chatbot",
      "One login, one vendor, one invoice",
      "Inquiry → automatically tracked → admissions team notified",
      "All-in cost: $4,000–$9,000/year (save $6,000–$26,000/year)",
    ],
    questions: [
      '"How many separate vendors are you currently paying for that touch your website or admissions?"',
      '"Does a new website inquiry automatically appear in your admissions system?"',
      '"What does your current website stack cost per year — across all vendors and maintenance?"',
      '"What would it mean for your team if all of this was in one place?"',
    ],
  },
];

// ─── First Call Tool Data ──────────────────────────────────────────────────

const painBridge = [
  {
    label: "📉 Low enrollment",
    script:
      '"So parents are out there looking for a school like yours, but finding competitors first — or landing on your site and not taking action. That\'s the enrollment leak we fix."',
  },
  {
    label: "⏱️ Staff time",
    script:
      '"So your team spends hours on something that should take minutes, pulling them from what actually matters. That\'s exactly the problem we were built to solve."',
  },
  {
    label: "💸 Multiple tools",
    script:
      "\"So you're paying multiple vendors for things that should be in one place. We consolidate all of that at a fraction of what you're currently paying.\"",
  },
];

const closeScripts = [
  {
    emoji: "✅",
    label: "Interested",
    script:
      '"Great. Let me set up a 20-minute call with our school specialist — he\'ll walk through exactly how this works for a school like yours. Does [day] or [day] work?"',
  },
  {
    emoji: "🔄",
    label: "Not now",
    script:
      '"Understood. Is there a specific reason it\'s not a priority right now? [Listen] What if I followed up in 30/60/90 days?"',
  },
  {
    emoji: "💰",
    label: "Budget",
    script:
      '"What are you currently paying for your website and related tools? [Listen] Most schools we talk to are spending more than they realize — and we usually come in significantly under that. Worth a 20-minute call to compare?"',
  },
  {
    emoji: "📧",
    label: "Send info",
    script:
      "\"Of course. So I make it relevant — what's the #1 thing you'd want addressed? [Listen] I'll make sure that's front and center. Can I follow up [day]?\"",
  },
];

const personas = {
  principal: {
    label: "Principal",
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

// ─── Objections ────────────────────────────────────────────────────────────

const objections = [
  {
    q: '"We just redesigned our site"',
    a: "That's actually perfect timing — most schools redesign and realize 6 months later the platform doesn't do what they need. What CMS did you go with?",
  },
  {
    q: '"We\'re happy with our current vendor"',
    a: "Good to hear. Can I ask — what's the one thing you wish your current vendor did better?",
  },
  {
    q: '"We don\'t have budget"',
    a: "What are you currently spending on your website and related tools? [Listen] Most schools find they're actually spending more than they think, fragmented across vendors.",
  },
  {
    q: '"Send me information"',
    a: "Of course — so I can make it relevant, what's the #1 challenge you'd want us to address? [Listen] I'll make sure that's front and center.",
  },
  {
    q: '"Talk to my IT director"',
    a: "Happy to. Can you help me understand what their main concerns would be? I want to make sure I speak their language.",
  },
  {
    q: '"We use the district\'s website"',
    a: "Understood — does that give your school the flexibility to highlight what makes you unique? Some of our best clients came from district setups where they wanted more control.",
  },
  {
    q: "\"We're a small school, we can't afford it\"",
    a: "What does your current solution cost? We start at $4,000/year — less than most schools spend on a single agency update project.",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function ValueCard({ driver }: { driver: (typeof valueDrivers)[number] }) {
  const Icon = driver.icon;
  return (
    <div className={cn("rounded-xl border-l-4 bg-white p-5 shadow-sm", driver.color)}>
      <div className="mb-4 flex items-center gap-2">
        <div className={cn("rounded-lg p-2", driver.bgColor)}>
          <Icon className={cn("h-4 w-4", driver.titleColor)} />
        </div>
        <h3 className={cn("font-semibold", driver.titleColor)}>{driver.title}</h3>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">Before</p>
        <ul className="space-y-1">
          {driver.before.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-red-600">
              <span className="mt-0.5 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">After</p>
        <ul className="space-y-1">
          {driver.after.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-green-700">
              <span className="mt-0.5 flex-shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
          Discovery Questions
        </p>
        <ol className="space-y-1">
          {driver.questions.map((q, i) => (
            <li key={i} className="flex gap-2 text-sm text-indigo-700">
              <span className="flex-shrink-0 font-medium">{i + 1}.</span>
              <span>{q}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function PersonaAccordion({ persona }: { persona: (typeof personas)["principal"] }) {
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});

  const toggleQ = (i: number) => setCheckedQuestions((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <Accordion type="multiple" className="space-y-2">
      <AccordionItem value="opening" className="rounded-lg border border-[#E4E4E7] bg-white px-4">
        <AccordionTrigger className="text-sm font-semibold text-[#09090B]">
          Opening Statement
        </AccordionTrigger>
        <AccordionContent>
          <p className="rounded-lg bg-[#F3F4F6] p-3 text-sm text-[#374151] italic">
            "{persona.opening}"
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="hooks" className="rounded-lg border border-[#E4E4E7] bg-white px-4">
        <AccordionTrigger className="text-sm font-semibold text-[#09090B]">
          Hook Options
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-2">
            {persona.hooks.map((h, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#374151]">
                <span className="mt-0.5 flex-shrink-0 text-[#435EBD]">→</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="discovery" className="rounded-lg border border-[#E4E4E7] bg-white px-4">
        <AccordionTrigger className="text-sm font-semibold text-[#09090B]">
          Discovery Questions
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-2">
            {persona.questions.map((q, i) => (
              <li
                key={i}
                className="flex cursor-pointer items-start gap-2 text-sm text-[#374151]"
                onClick={() => toggleQ(i)}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                    checkedQuestions[i]
                      ? "border-[#435EBD] bg-[#435EBD] text-white"
                      : "border-[#D1D5DB]"
                  )}
                >
                  {checkedQuestions[i] && <span className="text-[10px]">✓</span>}
                </span>
                <span className={checkedQuestions[i] ? "line-through opacity-50" : ""}>{q}</span>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="bridge" className="rounded-lg border border-[#E4E4E7] bg-white px-4">
        <AccordionTrigger className="text-sm font-semibold text-[#09090B]">
          Pain → Value Bridge
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            {painBridge.map((b, i) => (
              <div key={i}>
                <p className="mb-1 text-xs font-semibold text-[#374151]">{b.label}</p>
                <p className="rounded-lg bg-[#F3F4F6] p-3 text-sm text-[#374151] italic">
                  {b.script}
                </p>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="close" className="rounded-lg border border-[#E4E4E7] bg-white px-4">
        <AccordionTrigger className="text-sm font-semibold text-[#09090B]">
          Close on Next Step
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            {closeScripts.map((c, i) => (
              <div key={i}>
                <p className="mb-1 text-xs font-semibold text-[#374151]">
                  {c.emoji} {c.label}
                </p>
                <p className="rounded-lg bg-[#F3F4F6] p-3 text-sm text-[#374151] italic">
                  {c.script}
                </p>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function PlaybookClient() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#09090B]">Sales Playbook</h1>
          <p className="mt-1 text-sm text-[#374151]">Your complete guide to EdPilotHub outreach</p>
        </div>

        <Tabs defaultValue="value-framework" className="space-y-6">
          <TabsList className="h-auto gap-1 bg-white p-1 shadow-sm">
            <TabsTrigger
              value="value-framework"
              className="text-xs data-[state=active]:bg-[#435EBD] data-[state=active]:text-white"
            >
              Value Framework
            </TabsTrigger>
            <TabsTrigger
              value="first-call"
              className="text-xs data-[state=active]:bg-[#435EBD] data-[state=active]:text-white"
            >
              First Call Tool
            </TabsTrigger>
            <TabsTrigger
              value="battle-cards"
              className="text-xs data-[state=active]:bg-[#435EBD] data-[state=active]:text-white"
            >
              Battle Cards
            </TabsTrigger>
            <TabsTrigger
              value="objections"
              className="text-xs data-[state=active]:bg-[#435EBD] data-[state=active]:text-white"
            >
              Objection Handling
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Value Framework ── */}
          <TabsContent value="value-framework" className="space-y-4">
            {valueDrivers.map((d) => (
              <ValueCard key={d.id} driver={d} />
            ))}
          </TabsContent>

          {/* ── Tab 2: First Call Tool ── */}
          <TabsContent value="first-call">
            <Tabs defaultValue="principal" className="space-y-4">
              <TabsList className="bg-white shadow-sm">
                <TabsTrigger value="principal" className="text-xs">
                  Principal
                </TabsTrigger>
                <TabsTrigger value="it" className="text-xs">
                  IT Director
                </TabsTrigger>
                <TabsTrigger value="admissions" className="text-xs">
                  Admissions Director
                </TabsTrigger>
              </TabsList>

              {(["principal", "it", "admissions"] as const).map((key) => (
                <TabsContent key={key} value={key}>
                  <PersonaAccordion persona={personas[key]} />
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* ── Tab 3: Battle Cards ── */}
          <TabsContent value="battle-cards">
            <div className="grid gap-4 md:grid-cols-2">
              {/* vs. Finalsite */}
              <div className="rounded-xl border-l-4 border-red-500 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-bold text-red-700">vs. Finalsite</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                      Their Weakness
                    </p>
                    <p className="text-[#374151]">
                      $12k–$25k/year website only, template-heavy, slow support, no built-in CRM or
                      admissions
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                      Our Angle
                    </p>
                    <p className="text-[#374151] italic">
                      "Finalsite is built for large districts with big budgets. We're built for
                      schools that want modern design + real functionality at a price that makes
                      sense."
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                      Trap Question
                    </p>
                    <p className="text-[#435EBD] italic">
                      "How long does it typically take Finalsite to make a design change for you?"
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                      Pricing Win
                    </p>
                    <p className="font-medium text-green-700">
                      "Finalsite charges what we charge for our entire platform — just for the
                      website."
                    </p>
                  </div>
                </div>
              </div>

              {/* vs. SchoolSites */}
              <div className="rounded-xl border-l-4 border-orange-500 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-bold text-orange-700">
                  vs. SchoolSites / Education Networks
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                      Their Weakness
                    </p>
                    <p className="text-[#374151]">
                      Outdated design, template-limited, no admissions, no AI features
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                      Our Angle
                    </p>
                    <p className="text-[#374151] italic">
                      "SchoolSites gets you a website. EdPilotHub gets you a school growth platform
                      — CRM, admissions, and AI built in."
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                      Trap Question
                    </p>
                    <p className="text-[#435EBD] italic">
                      "When a prospective family fills out an inquiry form on your current site,
                      where does that lead go? Who follows up, and how?"
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-[#6B7280] uppercase">
                      Pricing Win
                    </p>
                    <p className="font-medium text-green-700">
                      "Same price range, but we include tools they charge extra for — or don't offer
                      at all."
                    </p>
                  </div>
                </div>
              </div>

              {/* Proof Points */}
              <div className="rounded-xl border-l-4 border-green-500 bg-white p-5 shadow-sm md:col-span-2">
                <div className="mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-green-600" />
                  <h3 className="font-bold text-green-700">Miami Arts Charter — Proof Points</h3>
                </div>
                <ul className="mb-3 space-y-1 text-sm">
                  <li className="flex gap-2 text-green-700">
                    <span>✓</span>
                    <span>Increased website inquiry rate by 28% within 60 days of launch</span>
                  </li>
                  <li className="flex gap-2 text-green-700">
                    <span>✓</span>
                    <span>Admissions team saves 8+ hours per week on website management</span>
                  </li>
                  <li className="flex gap-2 text-green-700">
                    <span>✓</span>
                    <span>
                      Now ranks #1 for 'Miami arts charter school' and top 3 for 'arts school Miami'
                    </span>
                  </li>
                  <li className="flex gap-2 text-green-700">
                    <span>✓</span>
                    <span>Consolidated 3 separate tools into EdPilotHub — saving $11,000/year</span>
                  </li>
                </ul>
                <a
                  href="https://edpilothub.com/case-study-miami-arts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#435EBD] hover:underline"
                >
                  edpilothub.com/case-study-miami-arts →
                </a>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 4: Objection Handling ── */}
          <TabsContent value="objections">
            <div className="rounded-xl bg-white shadow-sm">
              <Accordion type="multiple" className="divide-y divide-[#E4E4E7]">
                {objections.map((obj, i) => (
                  <AccordionItem
                    key={i}
                    value={`obj-${i}`}
                    className="px-5 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <AccordionTrigger className="text-sm font-semibold text-[#09090B]">
                      {obj.q}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="rounded-lg bg-[#F3F4F6] p-3 text-sm text-[#374151]">{obj.a}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
