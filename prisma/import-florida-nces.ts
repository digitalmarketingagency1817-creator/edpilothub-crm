/**
 * NCES Florida K-12 School Import
 * Source: Urban Institute Education Data Portal (CCD 2022)
 * ~4,337 schools
 */
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
import * as https from "https";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

interface NCESSchool {
  ncessch: string;
  school_name: string;
  leaid: string;
  lea_name: string;
  street_location: string;
  city_location: string;
  state_location: string;
  zip_location: string;
  phone: string;
  school_type: number; // 1=public, 2=public charter, 3=private, 4=other
  charter: number; // 0/1
  school_level: number; // 1=elem, 2=middle, 3=high, 4=other, 5=K-12
  lowest_grade_offered: number;
  highest_grade_offered: number;
  enrollment: number;
  teachers_fte: number;
  county_code: string;
  virtual: number;
  school_status: number; // 1=open, 2=closed, 3=new, 6=reopened
}

function fetchJSON(url: string): Promise<{ count: number; results: NCESSchool[] }> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function gradeRange(lowest: number, highest: number): string {
  const gradeLabel = (g: number) => {
    if (g === -1) return "PK";
    if (g === 0) return "K";
    return String(g);
  };
  return `${gradeLabel(lowest)}-${gradeLabel(highest)}`;
}

function schoolTypeFromNCES(type: number, charter: number): "PUBLIC" | "PRIVATE" | "CHARTER" {
  if (charter === 1) return "CHARTER";
  if (type === 1) return "PUBLIC";
  if (type === 2) return "CHARTER";
  if (type === 3) return "PRIVATE";
  return "PUBLIC";
}

// Map county codes to names
const COUNTY_CODES: Record<string, string> = {
  "12001": "Alachua",
  "12003": "Baker",
  "12005": "Bay",
  "12007": "Bradford",
  "12009": "Brevard",
  "12011": "Broward",
  "12013": "Calhoun",
  "12015": "Charlotte",
  "12017": "Citrus",
  "12019": "Clay",
  "12021": "Collier",
  "12023": "Columbia",
  "12027": "DeSoto",
  "12029": "Dixie",
  "12031": "Duval",
  "12033": "Escambia",
  "12035": "Flagler",
  "12037": "Franklin",
  "12039": "Gadsden",
  "12041": "Gilchrist",
  "12043": "Glades",
  "12045": "Gulf",
  "12047": "Hamilton",
  "12049": "Hardee",
  "12051": "Hendry",
  "12053": "Hernando",
  "12055": "Highlands",
  "12057": "Hillsborough",
  "12059": "Holmes",
  "12061": "Indian River",
  "12063": "Jackson",
  "12065": "Jefferson",
  "12067": "Lafayette",
  "12069": "Lake",
  "12071": "Lee",
  "12073": "Leon",
  "12075": "Levy",
  "12077": "Liberty",
  "12079": "Madison",
  "12081": "Manatee",
  "12083": "Marion",
  "12085": "Martin",
  "12086": "Miami-Dade",
  "12087": "Monroe",
  "12089": "Nassau",
  "12091": "Okaloosa",
  "12093": "Okeechobee",
  "12095": "Orange",
  "12097": "Osceola",
  "12099": "Palm Beach",
  "12101": "Pasco",
  "12103": "Pinellas",
  "12105": "Polk",
  "12107": "Putnam",
  "12109": "St. Johns",
  "12111": "St. Lucie",
  "12113": "Santa Rosa",
  "12115": "Sarasota",
  "12117": "Seminole",
  "12119": "Sumter",
  "12121": "Suwannee",
  "12123": "Taylor",
  "12125": "Union",
  "12127": "Volusia",
  "12129": "Wakulla",
  "12131": "Walton",
  "12133": "Washington",
};

async function main() {
  console.log("🌐 Fetching Florida K-12 schools from NCES...");

  const url =
    "https://educationdata.urban.org/api/v1/schools/ccd/directory/2022/?state_location=FL&per_page=5000";
  const response = await fetchJSON(url);
  const schools = response.results.filter((s) => s.school_status === 1); // Only open schools

  console.log(`✅ Fetched ${response.count} total, ${schools.length} open schools`);

  // Get or create districts
  const districtMap = new Map<string, string>(); // leaid → db id

  const uniqueDistricts = [...new Map(schools.map((s) => [s.leaid, s])).values()];
  console.log(`📍 Found ${uniqueDistricts.length} districts`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = prisma as any;

  let districtCount = 0;
  for (const s of uniqueDistricts) {
    const county = COUNTY_CODES[s.county_code] ?? s.city_location;
    const district = await p.district.upsert({
      where: { ncesId: s.leaid },
      update: { name: s.lea_name, city: s.city_location, county, state: "FL" },
      create: {
        name: s.lea_name,
        ncesId: s.leaid,
        city: s.city_location,
        county,
        state: "FL",
      },
    });
    districtMap.set(s.leaid, district.id);
    districtCount++;
  }
  console.log(`✅ Upserted ${districtCount} districts`);

  // Import schools in batches of 50
  let imported = 0;
  let skipped = 0;
  const batchSize = 50;

  for (let i = 0; i < schools.length; i += batchSize) {
    const batch = schools.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (s) => {
        if (!s.ncessch) {
          skipped++;
          return;
        }

        const schoolType = schoolTypeFromNCES(s.school_type, s.charter);
        const county = COUNTY_CODES[s.county_code] ?? "";
        const districtId = districtMap.get(s.leaid);

        // Format grade range
        let gradeRangeStr: string | null = null;
        if (s.lowest_grade_offered !== null && s.highest_grade_offered !== null) {
          gradeRangeStr = gradeRange(s.lowest_grade_offered, s.highest_grade_offered);
        }

        try {
          await p.school.upsert({
            where: { ncesId: s.ncessch },
            update: {
              name: s.school_name,
              address: s.street_location,
              city: s.city_location,
              county,
              zipCode: s.zip_location,
              phone: s.phone,
              schoolType,
              gradeRange: gradeRangeStr,
              studentCount: s.enrollment > 0 ? s.enrollment : null,
              teacherCount: s.teachers_fte > 0 ? Math.round(s.teachers_fte) : null,
              districtId: districtId ?? null,
            },
            create: {
              name: s.school_name,
              ncesId: s.ncessch,
              address: s.street_location,
              city: s.city_location,
              county,
              zipCode: s.zip_location,
              phone: s.phone,
              schoolType,
              gradeRange: gradeRangeStr,
              studentCount: s.enrollment > 0 ? s.enrollment : null,
              teacherCount: s.teachers_fte > 0 ? Math.round(s.teachers_fte) : null,
              districtId: districtId ?? null,
            },
          });
          imported++;
        } catch (e) {
          skipped++;
          if (skipped < 5) console.error("Skip error:", e);
        }
      })
    );

    if ((i + batchSize) % 500 === 0 || i + batchSize >= schools.length) {
      console.log(
        `  Progress: ${Math.min(imported + skipped, schools.length)}/${schools.length} (${imported} imported, ${skipped} skipped)`
      );
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`   ✅ Imported: ${imported} schools`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📍 Districts: ${districtCount}`);
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
