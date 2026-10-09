import "dotenv/config";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./server/schema.ts", out: "./server/migrations", dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/loket_konferensi" }
});