/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// src/db/drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!sqlHost) {
  console.warn("SQL_HOST must be set in environment variables at runtime.");
}
if (!sqlDbName) {
  console.warn("SQL_DB_NAME must be set in environment variables at runtime.");
}
if (!user) {
  console.warn("SQL_ADMIN_USER must be set in environment variables at runtime.");
}
if (!password) {
  console.warn("SQL_ADMIN_PASSWORD must be set in environment variables at runtime.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle", // Output directory for migrations.
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost || "localhost",
    user: user || "postgres",
    password: password || "",
    database: sqlDbName || "postgres",
    ssl: false, // Typically false when connecting via Cloud SQL Auth Proxy.
  },
  verbose: true, // Enable verbose output.
});
