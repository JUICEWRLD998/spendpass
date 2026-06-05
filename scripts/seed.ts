import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { product } from "../lib/db/schema";
import { SEED_PRODUCTS } from "../lib/seed/products";
import { generateId } from "../lib/db";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = postgres(url);
  const db = drizzle(sql);

  console.log(`Seeding ${SEED_PRODUCTS.length} products...`);

  for (const item of SEED_PRODUCTS) {
    await db
      .insert(product)
      .values({
        id: generateId(),
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        category: item.category,
        sku: item.sku,
        merchant: item.merchant ?? "spendpass-store",
        inStock: true,
      })
      .onConflictDoNothing({ target: product.sku });
  }

  console.log("Seed complete.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
