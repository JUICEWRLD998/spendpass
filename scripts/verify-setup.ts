/**
 * Setup verification script for SpendPass Phase 1
 * Checks environment configuration and database connectivity
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { product } from "../lib/db/schema";
import { count } from "drizzle-orm";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
];

const EXPECTED_PACKAGES = [
  "@auth/agent",
  "@better-auth/agent-auth",
  "better-auth",
  "drizzle-orm",
];

async function main() {
  console.log("🔍 SpendPass Phase 1 Setup Verification\n");

  let errors = 0;
  let warnings = 0;

  // ── Check Environment Variables ────────────────────────────────────
  console.log("📋 Checking environment variables...");
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value || value.trim() === "") {
      console.log(`  ❌ ${envVar} is not set`);
      errors++;
    } else {
      // Mask sensitive values
      const display =
        envVar.includes("KEY") || envVar.includes("SECRET")
          ? `${value.substring(0, 8)}...`
          : value;
      console.log(`  ✅ ${envVar} = ${display}`);
    }
  }

  // Check optional env vars
  const optional = process.env.AGENT_AUTH_ENCRYPTION_KEY;
  if (!optional) {
    console.log(`  ⚠️  AGENT_AUTH_ENCRYPTION_KEY not set (optional, but recommended)`);
    warnings++;
  }

  console.log();

  // ── Check Package Installation ─────────────────────────────────────
  console.log("📦 Checking package installation...");
  try {
    const packageJson = await import("../package.json");
    const allDeps: Record<string, string> = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const pkg of EXPECTED_PACKAGES) {
      if (allDeps[pkg]) {
        console.log(`  ✅ ${pkg}@${allDeps[pkg]}`);
      } else {
        console.log(`  ❌ ${pkg} not installed`);
        errors++;
      }
    }
  } catch (err) {
    console.log(`  ❌ Could not read package.json`);
    errors++;
  }

  console.log();

  // ── Check Database Connection ──────────────────────────────────────
  console.log("🗄️  Checking database connection...");
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.log(`  ❌ DATABASE_URL not set, skipping connection test`);
      errors++;
    } else {
      const sql = postgres(url, { max: 1, connect_timeout: 10, idle_timeout: 5 });
      const db = drizzle(sql);

      // Test connection
      await sql`SELECT 1 as health`;
      console.log(`  ✅ Connected to database`);

      // Check if tables exist
      try {
        const [result] = await db.select({ count: count() }).from(product);
        const productCount = result?.count ?? 0;
        console.log(`  ✅ Found ${productCount} products in catalog`);

        if (productCount === 0) {
          console.log(`  ⚠️  No products found — run: npm run db:seed`);
          warnings++;
        } else if (productCount < 20) {
          console.log(`  ⚠️  Expected 20 products, found ${productCount}`);
          warnings++;
        }
      } catch (err) {
        console.log(
          `  ❌ Could not query product table — run: npm run db:push`,
        );
        errors++;
      }

      await sql.end();
    }
  } catch (err: any) {
    console.log(`  ❌ Database connection failed: ${err.message}`);
    errors++;
  }

  console.log();

  // ── Check URLs ─────────────────────────────────────────────────────
  console.log("🌐 Checking URL configuration...");
  const authUrl = process.env.BETTER_AUTH_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (authUrl !== appUrl) {
    console.log(
      `  ⚠️  BETTER_AUTH_URL (${authUrl}) !== NEXT_PUBLIC_APP_URL (${appUrl})`,
    );
    console.log(`     These should match for local development`);
    warnings++;
  } else {
    console.log(`  ✅ URLs match: ${authUrl}`);
  }

  if (authUrl && !authUrl.startsWith("http")) {
    console.log(`  ❌ BETTER_AUTH_URL must start with http:// or https://`);
    errors++;
  }

  console.log();

  // ── Summary ────────────────────────────────────────────────────────
  console.log("━".repeat(60));
  console.log("📊 Summary\n");

  if (errors === 0 && warnings === 0) {
    console.log("🎉 All checks passed! Phase 1 setup is complete.");
    console.log("\nNext steps:");
    console.log("  1. npm run dev");
    console.log("  2. Open http://localhost:3100");
    console.log("  3. Sign up and test agent chat");
    console.log("\nSee QUICK_START.md for testing instructions.");
  } else {
    if (errors > 0) {
      console.log(`❌ Found ${errors} error(s) — setup incomplete`);
    }
    if (warnings > 0) {
      console.log(`⚠️  Found ${warnings} warning(s) — review recommended`);
    }

    console.log("\nTo fix issues:");
    console.log("  - Missing env vars: Copy .env.example to .env and fill in");
    console.log("  - Missing packages: Run npm install");
    console.log("  - Database errors: Run npm run db:push");
    console.log("  - No products: Run npm run db:seed");
    console.log("\nSee SUPABASE_SETUP.md for detailed setup instructions.");

    if (errors > 0) {
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Verification script failed:", err.message);
  process.exit(1);
});
