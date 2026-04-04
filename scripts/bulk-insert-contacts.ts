import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never) as any;

const results: Array<{
  schoolId: string;
  deleteFirst: boolean;
  contacts: Array<{
    name: string;
    title?: string;
    email?: string;
    isPrimary?: boolean;
    linkedinUrl?: string;
    notes?: string;
  }>;
}> = [
  // BROWARD (browardschools.com)
  {
    schoolId: "cmmmvccd600ewl2qrqnvnqot0",
    deleteFirst: true,
    contacts: [
      {
        name: "Christina Pellicer",
        title: "School Director",
        email: "christina.pellicer@browardschools.com",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcbyl00d0l2qreajnt0q1",
    deleteFirst: true,
    contacts: [
      {
        name: "Rafiki Brown",
        title: "Assistant Director",
        email: "rafiki.brown@browardschools.com",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvccd600f5l2qrf4z0e5px",
    deleteFirst: true,
    contacts: [
      {
        name: "Celeste Johnson",
        title: "Assistant Director",
        email: "celeste.johnson@browardschools.com",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvccko00g0l2qr2m11mmt1",
    deleteFirst: true,
    contacts: [
      {
        name: "Tasia Scott",
        title: "Athletic Director",
        email: "tasia.scott@browardschools.com",
        isPrimary: false,
      },
    ],
  },
  // MIAMI-DADE (dadeschools.net)
  {
    schoolId: "cmmmvcet000whl2qrjoat179n",
    deleteFirst: true,
    contacts: [
      {
        name: "Tanya Rae",
        title: "Activities Director",
        email: "trae@dadeschools.net",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcesz00vcl2qrra2ope9s",
    deleteFirst: true,
    contacts: [
      {
        name: "Audra Wright",
        title: "Director of Human Resources",
        email: "awright@dadeschools.net",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvceeb00tgl2qrn3w34tpn",
    deleteFirst: true,
    contacts: [
      {
        name: "Ellen Ford",
        title: "Executive Director",
        email: "eford@dadeschools.net",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcelg00v2l2qrhkt3bxda",
    deleteFirst: true,
    contacts: [
      {
        name: "Sebastian Singh",
        title: "Athletic Director",
        email: "ssingh@dadeschools.net",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvceeb00t2l2qrr2r0v4bp",
    deleteFirst: true,
    contacts: [
      {
        name: "Nguyen Nguyen",
        title: "Upper School Principal",
        email: "nnguyen@dadeschools.net",
        isPrimary: true,
      },
    ],
  },
  // ORANGE/OCPS (ocps.net)
  {
    schoolId: "cmmmvclni027ql2qroi0uvm2f",
    deleteFirst: true,
    contacts: [
      {
        name: "Marc Wasko",
        title: "Principal",
        isPrimary: true,
        notes: "Source: Google search 2025",
      },
      {
        name: "Marlene West",
        title: "Director of Student Services",
        email: "marlene.west@ocps.net",
        isPrimary: false,
      },
    ],
  },
  // OSCEOLA (osceolaschools.net)
  {
    schoolId: "cmmmvcmh102c4l2qrso0zncyc",
    deleteFirst: true,
    contacts: [
      {
        name: "Jennifer Ramsey",
        title: "Principal",
        isPrimary: true,
        notes: "Source: Google 2025",
      },
      {
        name: "Lisa Karcinski",
        title: "Chief Academic Officer",
        email: "lisa.karcinski@osceolaschools.net",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcmh102c5l2qrdfo369pl",
    deleteFirst: true,
    contacts: [
      {
        name: "Christopher Todd",
        title: "Principal",
        isPrimary: true,
        notes: "Source: Google 2025",
      },
      {
        name: "Scott Knoebel",
        title: "Chief Operating Officer",
        email: "scott.knoebel@osceolaschools.net",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcmh202d2l2qr5imbyi0m",
    deleteFirst: true,
    contacts: [
      { name: "George Arscott", title: "Principal", isPrimary: true, notes: "Source: Google 2025" },
      {
        name: "Jonathan Kochan",
        title: "Director of Information Technology",
        email: "jonathan.kochan@osceolaschools.net",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcm9l02bnl2qry1m8tkop",
    deleteFirst: true,
    contacts: [
      {
        name: "Jeffrey Schwartz",
        title: "Principal",
        isPrimary: true,
        notes: "Principal of the Year Osceola 2025",
      },
    ],
  },
  {
    schoolId: "cmmmvcm9k02b9l2qr59gqnlo0",
    deleteFirst: true,
    contacts: [
      { name: "Nate Fancher", title: "Principal", isPrimary: true, notes: "Source: Google 2025" },
    ],
  },
  // POLK (polk-fl.net)
  {
    schoolId: "cmmmvcoul02twl2qrv4knsppw",
    deleteFirst: true,
    contacts: [
      {
        name: "Matthew Blankenship",
        title: "Principal",
        email: "matthew.blankenship@polk-fl.net",
        isPrimary: true,
        notes: "Principal since 2025; email inferred from polk-fl.net format",
      },
    ],
  },
  {
    schoolId: "cmmmvcouk02szl2qrhry5vhmj",
    deleteFirst: true,
    contacts: [
      {
        name: "Brad Tarver",
        title: "Principal",
        email: "brad.tarver@polk-fl.net",
        isPrimary: true,
        notes: "Source: Google 2025; email inferred",
      },
    ],
  },
  {
    schoolId: "cmmmvcons02rfl2qrktyvtgo8",
    deleteFirst: true,
    contacts: [
      {
        name: "Gina Williams",
        title: "Principal",
        email: "gina.williams@polk-fl.net",
        isPrimary: true,
        notes: "Source: Google 2025; email inferred",
      },
    ],
  },
  {
    schoolId: "cmmmvcouk02t2l2qrez306lqe",
    deleteFirst: true,
    contacts: [
      {
        name: "Tom Patton",
        title: "Principal",
        email: "tom.patton@polk-fl.net",
        isPrimary: true,
        notes: "Source: Google 2025; email inferred",
      },
    ],
  },
  {
    schoolId: "cmmmvcp1m02v3l2qrgwaphodn",
    deleteFirst: true,
    contacts: [
      {
        name: "Haley Kish",
        title: "Principal",
        email: "haley.kish@polk-fl.net",
        isPrimary: true,
        notes: "Source: Google 2025; email inferred",
      },
    ],
  },
  {
    schoolId: "cmmmvcons02rzl2qrpuc4cuqb",
    deleteFirst: true,
    contacts: [
      {
        name: "Lance Lawson",
        title: "Principal",
        email: "lance.lawson@polk-fl.net",
        isPrimary: true,
        notes: "Source: Google 2025; email inferred",
      },
    ],
  },
  {
    schoolId: "cmmmvcouk02t7l2qrvw501rvw",
    deleteFirst: true,
    contacts: [
      {
        name: "Ryan Vann",
        title: "Principal",
        email: "ryan.vann@polk-fl.net",
        isPrimary: true,
        notes: "Principal of the Year finalist 2025; email inferred",
      },
    ],
  },
  {
    schoolId: "cmmmvcont02s9l2qr0n191bjd",
    deleteFirst: true,
    contacts: [
      {
        name: "Daraford Jones",
        title: "Principal",
        email: "daraford.jones@polk-fl.net",
        isPrimary: true,
        notes: "Source: Google 2025; email inferred",
      },
    ],
  },
  {
    schoolId: "cmmmvcogk02qxl2qr9ky3ujfi",
    deleteFirst: true,
    contacts: [
      {
        name: "Alain Douge",
        title: "Principal",
        email: "alain.douge@polk-fl.net",
        isPrimary: true,
        notes: "Appointed 2024, still principal 2025; email inferred",
      },
    ],
  },
  // ST. JOHNS (stjohns.k12.fl.us)
  {
    schoolId: "cmmmvcq15031rl2qrnnxql70q",
    deleteFirst: true,
    contacts: [
      {
        name: "Christopher Phelps",
        title: "Principal",
        isPrimary: true,
        notes: "Source: Google 2025",
      },
      {
        name: "Kim Bays",
        title: "Director of Guidance",
        email: "kim.bays@stjohns.k12.fl.us",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcq15031yl2qr3am0vfi9",
    deleteFirst: true,
    contacts: [
      {
        name: "Steve McCormick",
        title: "Principal",
        isPrimary: true,
        notes: "Source: Google 2025",
      },
      {
        name: "Antonio Scott",
        title: "Director of Learning and Development",
        email: "antonio.scott@stjohns.k12.fl.us",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcq140317l2qr8di0wxuh",
    deleteFirst: true,
    contacts: [
      { name: "Gina Fonseca", title: "Principal", isPrimary: true, notes: "Source: Google 2025" },
      {
        name: "Traci Hemingway",
        title: "Director of Curriculum and Instruction",
        email: "traci.hemingway@stjohns.k12.fl.us",
        isPrimary: false,
      },
    ],
  },
  // LEE (leeschools.net)
  {
    schoolId: "cmmmvcj9x01r6l2qrrimjewbw",
    deleteFirst: true,
    contacts: [
      {
        name: "Darya Grote",
        title: "Principal",
        isPrimary: true,
        notes: "Third year as principal 2025-26; Source: Google",
      },
      {
        name: "Jose Cuevas",
        title: "Director of Application Services",
        email: "josecue@leeschools.net",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcjh201rql2qrzge1rymu",
    deleteFirst: true,
    contacts: [
      {
        name: "Richard Aviles",
        title: "Director of Business Intelligence",
        email: "richarda@leeschools.net",
        isPrimary: false,
      },
    ],
  },
  // PINELLAS (pcsb.org)
  {
    schoolId: "cmmmvco9m02prl2qrzbqi8s38",
    deleteFirst: true,
    contacts: [
      {
        name: "Eric Smith",
        title: "Principal",
        isPrimary: true,
        notes: "Dr. Eric C. Smith; Source: Google 2025",
      },
      {
        name: "Dywayne Hinds",
        title: "Executive Director",
        email: "hindsd@pcsb.org",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvco2702nll2qrapc2sa8e",
    deleteFirst: true,
    contacts: [
      {
        name: "Jennifer Staten",
        title: "Principal",
        isPrimary: true,
        notes: "Source: Google 2025",
      },
      {
        name: "Eric Mcclendon",
        title: "Assistant Director",
        email: "mcclendone@pcsb.org",
        isPrimary: false,
      },
    ],
  },
  // CLAY (oneclay.net)
  {
    schoolId: "cmmmvcd6c00kol2qro0cxoo6n",
    deleteFirst: true,
    contacts: [
      { name: "Justin Fluent", title: "Principal", isPrimary: true, notes: "Source: Google 2025" },
    ],
  },
  // COLLIER (collierschools.com)
  {
    schoolId: "cmmmvcddo00lzl2qr2kgfen2v",
    deleteFirst: true,
    contacts: [
      { name: "Tim Kutz", title: "Principal", isPrimary: true, notes: "Source: Google 2025" },
      {
        name: "Patrick Woods",
        title: "Executive Director",
        email: "woodsp@collierschools.com",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcddo00mal2qr42e0grtk",
    deleteFirst: true,
    contacts: [
      {
        name: "Tobin Walcott",
        title: "Principal",
        isPrimary: true,
        notes: "Dr. Tobin R. Walcott; Source: Google 2025",
      },
      {
        name: "Lisa Garby",
        title: "Director of Guidance",
        email: "garbyl@collierschools.com",
        isPrimary: false,
      },
    ],
  },
  {
    schoolId: "cmmmvcd6c00lhl2qr1mhtqq7l",
    deleteFirst: true,
    contacts: [
      {
        name: "Daniel Boddison",
        title: "Principal",
        isPrimary: true,
        notes: "19 years Immokalee experience; Source: Google 2025",
      },
      {
        name: "Susana Capasso",
        title: "Program Director",
        email: "capassos@collierschools.com",
        isPrimary: false,
      },
    ],
  },
  // MARION (marionschools.net)
  {
    schoolId: "cmmmvckh301ycl2qr7vkyzupq",
    deleteFirst: true,
    contacts: [
      {
        name: "Dion Gary",
        title: "Principal",
        isPrimary: true,
        notes: "Dr. Dion Gary, effective July 2025; Source: Google",
      },
      {
        name: "Debbie Jenkins",
        title: "Director of Career and Adult Education",
        email: "debbie@marionschools.net",
        isPrimary: false,
      },
    ],
  },
  // MARTIN (martinschools.org)
  {
    schoolId: "cmmmvckoc01zml2qrh6hjyvdy",
    deleteFirst: true,
    contacts: [
      {
        name: "Lori Vogel",
        title: "Principal",
        isPrimary: true,
        notes: "Appointed Oct 2025; Source: Google",
      },
      {
        name: "Daniel Moore",
        title: "Director of Curriculum and Instruction",
        email: "moored@martinschools.org",
        isPrimary: false,
      },
      {
        name: "Heather Platt",
        title: "Director of Learning and Development",
        email: "platth@martinschools.org",
        isPrimary: false,
      },
    ],
  },
  // PASCO (pasco.k12.fl.us)
  {
    schoolId: "cmmmvcnv102ltl2qrvgdjoyrg",
    deleteFirst: true,
    contacts: [
      { name: "Kara Merlin", title: "Principal", isPrimary: true, notes: "Source: Google 2025" },
      {
        name: "Chris Jackson",
        title: "Director of Information Technology",
        email: "cjackson@pasco.k12.fl.us",
        isPrimary: false,
      },
    ],
  },
];

const BAD_PREFIXES = [
  "School",
  "Email",
  "Portal",
  "Focus",
  "National",
  "Office",
  "The ",
  "At ",
  "West Gate",
  "Citrus High",
];

async function main() {
  let total = 0;
  let deleted = 0;
  let skipped = 0;

  for (const school of results) {
    if (school.deleteFirst) {
      const existing = await prisma.contact.findMany({ where: { schoolId: school.schoolId } });
      for (const c of existing) {
        const words = c.name.trim().split(/\s+/);
        const isBad = words.length < 2 || BAD_PREFIXES.some((b: string) => c.name.startsWith(b));
        if (isBad) {
          await prisma.contact.delete({ where: { id: c.id } });
          deleted++;
        }
      }
    }

    for (const c of school.contacts) {
      try {
        await prisma.contact.create({
          data: { schoolId: school.schoolId, isPrimary: false, ...c },
        });
        total++;
        console.log(`  ✓ ${c.name} → ${school.schoolId.slice(-8)}`);
      } catch (e: any) {
        console.log(`  ⚠ Skip (dupe?): ${c.name} — ${e.message?.slice(0, 60)}`);
        skipped++;
      }
    }
  }

  console.log(`\nDone: ${results.length} schools processed`);
  console.log(`  Contacts inserted: ${total}`);
  console.log(`  Bad contacts deleted: ${deleted}`);
  console.log(`  Skipped (dupes): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
