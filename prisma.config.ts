import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");
const isDevelopment = process.env.NODE_ENV !== "production";
const preferredEnvPath = isDevelopment && existsSync(envLocalPath) ? envLocalPath : envPath;

if (existsSync(preferredEnvPath)) {
  loadEnv({ path: preferredEnvPath });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
