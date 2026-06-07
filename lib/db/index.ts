import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export { schema };

// Configure postgres-js with proper connection settings for Supabase
// Increased timeouts to handle intermittent connection issues
export const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  max: 10,
  idle_timeout: 30,
  connect_timeout: 30, // Increased from 10 to 30 seconds
  max_lifetime: 60 * 30, // 30 minutes
  connection: {
    application_name: 'spendpass',
  },
});

export const db = drizzle(sql, { schema });
