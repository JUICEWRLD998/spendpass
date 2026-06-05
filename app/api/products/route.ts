import { auth } from "@/lib/auth";
import { countProducts, searchProducts } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? undefined;
  const query = url.searchParams.get("q") ?? undefined;

  const [products, total] = await Promise.all([
    searchProducts({ category, query, limit: 50 }),
    countProducts(),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      priceDollars: p.priceCents / 100,
      category: p.category,
      merchant: p.merchant,
      sku: p.sku,
    })),
    total,
  });
}
