/**
 * Update school websites in bulk
 * Run with: npx ts-node ... prisma/update-websites.ts
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Map: partial school name (uppercase) → website
const WEBSITES: Array<[string, string]> = [
  // Batch 1
  ["CYPRESS BAY HIGH", "https://www.cypressbay.browardschools.com"],
  ["JOHN A. FERGUSON", "https://www.fergusonhs.org"],
  ["LAKE NONA HIGH", "https://www.lakenonahs.ocps.net"],
  ["SEMINOLE HIGH SCHOOL", "https://seminolehs.scps.k12.fl.us"],
  ["TIMBER CREEK HIGH", "https://timbercreekhs.ocps.net"],
  ["WESTERN HIGH SCHOOL", "https://western.browardschools.com"],
  ["APOPKA HIGH", "https://apopkahs.ocps.net"],
  ["MARJORY STONEMAN DOUGLAS", "https://stonemandouglas.browardschools.com"],
  ["WINTER PARK HIGH", "https://winterparkhs.ocps.net"],
  ["CORAL REEF SENIOR HIGH", "https://coralreefhigh.org"],
  // Batch 2
  ["JULE F SUMNER HIGH", "https://sumner.mysdhc.org"],
  ["JOHN I. LEONARD HIGH", "https://johnilenoardhs.palmbeachschools.org"],
  ["VILLAGES CHARTER SCHOOL", "https://vcs.thevillages.com"],
  ["CYPRESS CREEK HIGH", "https://cypresscreekhs.ocps.net"],
  ["COLONIAL HIGH", "https://colonialhs.ocps.net"],
  ["DR. PHILLIPS HIGH", "https://drphillipshs.ocps.net"],
  ["NEWSOME HIGH SCHOOL", "https://newsome.mysdhc.org"],
  ["PARK VISTA COMMUNITY HIGH", "https://parkvistahs.palmbeachschools.org"],
  ["CORAL GABLES SENIOR HIGH", "https://www.coralgablescavaliers.org"],
  ["MIAMI NORLAND SENIOR HIGH", "https://norland.dadeschools.net"],
  // Batch 3 - Broward
  ["DEERFIELD BEACH HIGH", "https://deerfieldbeach.browardschools.com"],
  ["HOLLYWOOD HILLS HIGH", "https://hollywoodhills.browardschools.com"],
  ["MIRAMAR HIGH", "https://miramar.browardschools.com"],
  ["FORT LAUDERDALE HIGH", "https://fortlauderdale.browardschools.com"],
  ["CORAL SPRINGS MIDDLE", "https://coralspringsmiddle.browardschools.com"],
  // Batch 3 - Miami-Dade
  ["DR. MICHAEL M. KROP", "https://krop.dadeschools.net"],
  ["DESIGN AND ARCHITECTURE SENIOR", "https://dash.dadeschools.net"],
  ["MAST ACADEMY", "https://mast.dadeschools.net"],
  // Batch 3 - Hillsborough
  ["PLANT HIGH SCHOOL", "https://plant.mysdhc.org"],
  ["HILLSBOROUGH HIGH SCHOOL", "https://hillsborough.mysdhc.org"],
  ["BLAKE HIGH SCHOOL", "https://blake.mysdhc.org"],
  ["CHAMBERLAIN HIGH SCHOOL", "https://chamberlain.mysdhc.org"],
  ["FREEDOM HIGH SCHOOL HILLSBOROUGH", "https://freedom.mysdhc.org"],
  ["WHARTON HIGH SCHOOL", "https://wharton.mysdhc.org"],
  ["GAITHER HIGH SCHOOL", "https://gaither.mysdhc.org"],
  ["TAMPA BAY TECHNICAL HIGH", "https://tampabaytechnical.mysdhc.org"],
  // Batch 3 - Palm Beach
  ["BOCA RATON COMMUNITY HIGH", "https://bocahigh.palmbeachschools.org"],
  ["JUPITER HIGH SCHOOL", "https://jupiterhs.palmbeachschools.org"],
  ["WELLINGTON HIGH SCHOOL", "https://wellingtonhs.palmbeachschools.org"],
  ["SUNCOAST COMMUNITY HIGH", "https://suncoasths.palmbeachschools.org"],
  ["PALM BEACH LAKES HIGH", "https://pblakeshs.palmbeachschools.org"],
  ["INLET GROVE COMMUNITY HIGH", "https://inletgrove.palmbeachschools.org"],
  // Batch 4 - Orange
  ["FREEDOM HIGH SCHOOL", "https://freedomhs.ocps.net"],
  ["EVANS HIGH SCHOOL", "https://evanshs.ocps.net"],
  ["EDGEWATER HIGH SCHOOL", "https://edgewaterhs.ocps.net"],
];

async function main() {
  const p = prisma as any;
  let updated = 0;
  let notFound = 0;

  for (const [nameFragment, website] of WEBSITES) {
    const school = await p.school.findFirst({
      where: { name: { contains: nameFragment } },
      select: { id: true, name: true },
    });

    if (school) {
      await p.school.update({
        where: { id: school.id },
        data: { website },
      });
      console.log(`✅ ${school.name} → ${website}`);
      updated++;
    } else {
      console.log(`❌ Not found: ${nameFragment}`);
      notFound++;
    }
  }

  console.log(`\n📊 Updated: ${updated}, Not found: ${notFound}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
