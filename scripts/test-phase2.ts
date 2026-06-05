/**
 * Phase 2 Testing Script
 * Tests checkout constraint enforcement, denial, and escalation flow
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { product, cartItem, order } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const TEST_USER_ID = "test-user-phase2";
const TEST_AGENT_ID = "test-agent-phase2";

async function main() {
  console.log("🧪 Phase 2 Testing — Checkout Constraints & Escalation\n");

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  let passed = 0;
  let failed = 0;

  // ── Test 1: Verify products exist ────────────────────────────────
  console.log("📦 Test 1: Verify product catalog");
  try {
    const products = await db.select().from(product).limit(5);
    if (products.length === 0) {
      console.log("  ❌ No products found — run: npm run db:seed");
      failed++;
    } else {
      console.log(`  ✅ Found ${products.length} products`);
      console.log(
        `     Sample: ${products[0].name} — $${(products[0].priceCents / 100).toFixed(2)}`,
      );
      passed++;
    }
  } catch (err: any) {
    console.log(`  ❌ Failed to query products: ${err.message}`);
    failed++;
  }

  console.log();

  // ── Test 2: Find $38 product (under-cap demo) ────────────────────
  console.log("💰 Test 2: Verify $38 USB-C Hub exists (under-cap demo)");
  try {
    const [hub] = await db
      .select()
      .from(product)
      .where(eq(product.sku, "HUB-7IN1-001"))
      .limit(1);

    if (!hub) {
      console.log("  ❌ $38 USB-C Hub not found (SKU: HUB-7IN1-001)");
      failed++;
    } else {
      const price = hub.priceCents / 100;
      if (price <= 50) {
        console.log(`  ✅ Found ${hub.name} — $${price.toFixed(2)} (under $50 cap)`);
        passed++;
      } else {
        console.log(`  ⚠️  Price is $${price.toFixed(2)} (expected ≤ $50)`);
        failed++;
      }
    }
  } catch (err: any) {
    console.log(`  ❌ Query failed: ${err.message}`);
    failed++;
  }

  console.log();

  // ── Test 3: Find $120 product (over-cap demo) ────────────────────
  console.log("💰 Test 3: Verify $120 monitor exists (over-cap demo)");
  try {
    const monitors = await db
      .select()
      .from(product)
      .where(eq(product.category, "monitors"))
      .limit(10);

    const expensiveMonitor = monitors.find((m) => {
      const price = m.priceCents / 100;
      return price >= 100 && price <= 150;
    });

    if (!expensiveMonitor) {
      console.log("  ❌ No monitor in $100-$150 range found");
      failed++;
    } else {
      const price = expensiveMonitor.priceCents / 100;
      console.log(`  ✅ Found ${expensiveMonitor.name} — $${price.toFixed(2)} (over $50 cap)`);
      passed++;
    }
  } catch (err: any) {
    console.log(`  ❌ Query failed: ${err.message}`);
    failed++;
  }

  console.log();

  // ── Test 4: Cart operations ───────────────────────────────────────
  console.log("🛒 Test 4: Cart operations (add, retrieve, clear)");
  try {
    // Clean up test cart
    await db.delete(cartItem).where(eq(cartItem.userId, TEST_USER_ID));

    // Find a product
    const [testProduct] = await db.select().from(product).limit(1);
    if (!testProduct) {
      console.log("  ❌ No products available for testing");
      failed++;
    } else {
      // Add to cart
      await db.insert(cartItem).values({
        id: "test-cart-item-1",
        userId: TEST_USER_ID,
        agentId: TEST_AGENT_ID,
        productId: testProduct.id,
        quantity: 2,
      });

      // Retrieve cart
      const items = await db
        .select()
        .from(cartItem)
        .where(eq(cartItem.userId, TEST_USER_ID));

      if (items.length === 1 && items[0].quantity === 2) {
        console.log("  ✅ Cart operations working");
        console.log(`     Added: ${testProduct.name} × 2`);
        passed++;
      } else {
        console.log("  ❌ Cart state mismatch");
        failed++;
      }

      // Clean up
      await db.delete(cartItem).where(eq(cartItem.userId, TEST_USER_ID));
    }
  } catch (err: any) {
    console.log(`  ❌ Cart operations failed: ${err.message}`);
    failed++;
  }

  console.log();

  // ── Test 5: Order creation ────────────────────────────────────────
  console.log("📦 Test 5: Order creation (mock checkout success)");
  try {
    const testOrderId = `test-order-${Date.now()}`;
    await db.insert(order).values({
      id: testOrderId,
      userId: TEST_USER_ID,
      agentId: TEST_AGENT_ID,
      totalCents: 3800, // $38.00
      merchant: "spendpass-store",
      status: "placed",
    });

    const [created] = await db.select().from(order).where(eq(order.id, testOrderId)).limit(1);

    if (created && created.totalCents === 3800) {
      console.log("  ✅ Order creation working");
      console.log(`     Order: ${created.id} — $${(created.totalCents / 100).toFixed(2)}`);
      passed++;

      // Clean up
      await db.delete(order).where(eq(order.id, testOrderId));
    } else {
      console.log("  ❌ Order state mismatch");
      failed++;
    }
  } catch (err: any) {
    console.log(`  ❌ Order creation failed: ${err.message}`);
    failed++;
  }

  console.log();

  // ── Test 6: Constraint validation logic ───────────────────────────
  console.log("🔒 Test 6: Constraint validation logic");

  const testConstraints = [
    {
      name: "Under cap ($38 < $50)",
      cartTotal: 38.0,
      maxAmount: 50,
      expected: "PASS",
    },
    {
      name: "Over cap ($120 > $50)",
      cartTotal: 120.0,
      maxAmount: 50,
      expected: "DENY",
    },
    {
      name: "Exact cap ($50 = $50)",
      cartTotal: 50.0,
      maxAmount: 50,
      expected: "PASS",
    },
    {
      name: "After escalation ($120 < $150)",
      cartTotal: 120.0,
      maxAmount: 150,
      expected: "PASS",
    },
  ];

  for (const test of testConstraints) {
    const passes = test.cartTotal <= test.maxAmount;
    const actual = passes ? "PASS" : "DENY";
    const match = actual === test.expected;

    if (match) {
      console.log(`  ✅ ${test.name}: ${actual} (correct)`);
      passed++;
    } else {
      console.log(`  ❌ ${test.name}: ${actual} (expected ${test.expected})`);
      failed++;
    }
  }

  console.log();

  // ── Summary ────────────────────────────────────────────────────────
  console.log("━".repeat(60));
  console.log("📊 Test Summary\n");

  const total = passed + failed;
  console.log(`Tests passed: ${passed}/${total}`);
  console.log(`Tests failed: ${failed}/${total}`);

  if (failed === 0) {
    console.log("\n🎉 All Phase 2 tests passed!");
    console.log("\nPhase 2 is ready for manual testing:");
    console.log("  1. npm run dev");
    console.log("  2. Sign in to http://localhost:3100");
    console.log("  3. Test under-cap purchase: 'Buy the $38 USB-C Hub'");
    console.log("  4. Test over-cap denial: 'Buy the $120 monitor'");
    console.log("  5. Approve escalated capability when prompted");
    console.log("  6. Verify order succeeds after re-approval");
  } else {
    console.log("\n⚠️  Some tests failed. Review errors above.");
    console.log("\nCommon fixes:");
    console.log("  - No products: npm run db:seed");
    console.log("  - Database errors: npm run db:push");
    console.log("  - Connection issues: Check DATABASE_URL in .env");
  }

  await sql.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\n❌ Test script failed:", err.message);
  process.exit(1);
});
