import { and, count, desc, eq, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "./db/index";
import { cartItem, eventLog, order, product } from "./db/schema";

export { db } from "./db/index";
export * as schema from "./db/schema";

export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export interface ProductRow {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  merchant: string;
  sku: string;
  inStock: boolean;
  createdAt: Date;
}

export interface CartLineRow {
  id: string;
  productId: string;
  quantity: number;
  name: string;
  priceCents: number;
  merchant: string;
  lineTotalCents: number;
}

export async function insertLog(
  type: string | null,
  actorId: string | null,
  actorType: string | null,
  agentId: string | null,
  hostId: string | null,
  orgId: string | null,
  data: string | null,
): Promise<void> {
  await db.insert(eventLog).values({
    type: type ?? "unknown",
    actorId,
    actorType,
    agentId,
    hostId,
    orgId,
    data,
  });
}

export async function searchProducts(params: {
  query?: string;
  category?: string;
  maxPriceCents?: number;
  limit?: number;
}): Promise<ProductRow[]> {
  const conditions = [eq(product.inStock, true)];

  if (params.query?.trim()) {
    const term = `%${params.query.trim()}%`;
    conditions.push(or(ilike(product.name, term), ilike(product.description, term))!);
  }

  if (params.category?.trim()) {
    conditions.push(eq(product.category, params.category.trim()));
  }

  if (params.maxPriceCents !== undefined) {
    conditions.push(lte(product.priceCents, params.maxPriceCents));
  }

  const limit = Math.min(params.limit ?? 20, 50);

  return db
    .select()
    .from(product)
    .where(and(...conditions))
    .orderBy(product.priceCents)
    .limit(limit);
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const rows = await db
    .select()
    .from(product)
    .where(and(eq(product.id, id), eq(product.inStock, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCart(params: {
  userId: string;
  agentId?: string;
}): Promise<{ items: CartLineRow[]; totalCents: number }> {
  const conditions = [eq(cartItem.userId, params.userId)];
  if (params.agentId) {
    conditions.push(eq(cartItem.agentId, params.agentId));
  }

  const rows = await db
    .select({
      id: cartItem.id,
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      name: product.name,
      priceCents: product.priceCents,
      merchant: product.merchant,
    })
    .from(cartItem)
    .innerJoin(product, eq(cartItem.productId, product.id))
    .where(and(...conditions))
    .orderBy(desc(cartItem.updatedAt));

  const items: CartLineRow[] = rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    name: row.name,
    priceCents: row.priceCents,
    merchant: row.merchant,
    lineTotalCents: row.priceCents * row.quantity,
  }));

  const totalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  return { items, totalCents };
}

export async function addToCart(params: {
  userId: string;
  agentId?: string;
  productId: string;
  quantity?: number;
}): Promise<CartLineRow> {
  const qty = Math.max(1, Math.min(params.quantity ?? 1, 10));
  const prod = await getProduct(params.productId);
  if (!prod) throw new Error("Product not found");

  const existing = await db
    .select()
    .from(cartItem)
    .where(
      and(
        eq(cartItem.userId, params.userId),
        eq(cartItem.productId, params.productId),
        params.agentId ? eq(cartItem.agentId, params.agentId) : sql`${cartItem.agentId} IS NULL`,
      ),
    )
    .limit(1);

  if (existing[0]) {
    const newQty = Math.min(existing[0].quantity + qty, 10);
    const [updated] = await db
      .update(cartItem)
      .set({ quantity: newQty })
      .where(eq(cartItem.id, existing[0].id))
      .returning();
    return {
      id: updated.id,
      productId: prod.id,
      quantity: updated.quantity,
      name: prod.name,
      priceCents: prod.priceCents,
      merchant: prod.merchant,
      lineTotalCents: prod.priceCents * updated.quantity,
    };
  }

  const [created] = await db
    .insert(cartItem)
    .values({
      id: generateId(),
      userId: params.userId,
      agentId: params.agentId ?? null,
      productId: params.productId,
      quantity: qty,
    })
    .returning();

  return {
    id: created.id,
    productId: prod.id,
    quantity: created.quantity,
    name: prod.name,
    priceCents: prod.priceCents,
    merchant: prod.merchant,
    lineTotalCents: prod.priceCents * created.quantity,
  };
}

export async function clearCart(params: { userId: string; agentId?: string }): Promise<void> {
  const conditions = [eq(cartItem.userId, params.userId)];
  if (params.agentId) {
    conditions.push(eq(cartItem.agentId, params.agentId));
  }
  await db.delete(cartItem).where(and(...conditions));
}

export async function countProducts(): Promise<number> {
  const [row] = await db.select({ count: count() }).from(product);
  return row?.count ?? 0;
}

export async function createOrder(params: {
  userId: string;
  agentId?: string;
  totalCents: number;
  merchant: string;
}): Promise<{ id: string; totalCents: number; merchant: string; createdAt: Date }> {
  const id = generateId();
  const [row] = await db
    .insert(order)
    .values({
      id,
      userId: params.userId,
      agentId: params.agentId ?? null,
      totalCents: params.totalCents,
      merchant: params.merchant,
    })
    .returning();
  return row;
}
