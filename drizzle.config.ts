import { env } from "@/config/env";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/libs/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
    password: env.DATABASE_PASSWORD,
  },
} satisfies Config;
