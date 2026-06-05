import { agentAuth } from "@better-auth/agent-auth";
import type { Capability } from "@better-auth/agent-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  db,
  schema,
  searchProducts,
  getCart,
  addToCart,
  insertLog,
} from "./db";

const BASE_URL =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";

const capabilities: Capability[] = [
  {
    name: "search_products",
    description:
      "Search the SpendPass mock store catalog by keyword, category, and maximum price.",
    input: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term (e.g. 'USB-C hub', 'monitor')",
        },
        category: {
          type: "string",
          description: "Product category: hubs, monitors, cables, accessories",
        },
        max_price: {
          type: "number",
          description: "Maximum price in dollars (e.g. 40 for $40)",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 20)",
        },
      },
    },
    output: {
      type: "object",
      properties: {
        products: { type: "array" },
        count: { type: "number" },
      },
    },
  },
  {
    name: "add_to_cart",
    description: "Add a product to the shopping cart by product ID.",
    input: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Product ID from search_products" },
        quantity: { type: "number", description: "Quantity (default 1, max 10)" },
      },
      required: ["product_id"],
    },
    output: {
      type: "object",
      properties: {
        item: { type: "object" },
        message: { type: "string" },
      },
    },
  },
  {
    name: "get_cart",
    description: "Get the current shopping cart with line items and running total.",
    input: { type: "object", properties: {} },
    output: {
      type: "object",
      properties: {
        items: { type: "array" },
        total_cents: { type: "number" },
        total_dollars: { type: "number" },
      },
    },
  },
  {
    name: "checkout",
    description:
      "Place an order from the current cart. Requires user approval with spending constraints (max_amount, merchants).",
    approvalStrength: "session",
    requiredConstraints: ["max_amount", "merchants"],
    constrainable_fields: {
      max_amount: {
        type: "number",
        description: "Maximum order total in dollars (use max operator, e.g. { max: 50 })",
        required: true,
        operators: ["max"],
      },
      merchants: {
        type: "string",
        description: "Allowed merchant IDs (use in operator, e.g. { in: ['spendpass-store'] })",
        required: true,
        operators: ["in"],
      },
    },
    input: { type: "object", properties: {} },
    output: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        total_cents: { type: "number" },
        total_dollars: { type: "number" },
        merchant: { type: "string" },
        status: { type: "string" },
      },
    },
  },
];

const BROWSE_CAPABILITIES = ["search_products", "get_cart"];
const SHOP_CAPABILITIES = ["search_products", "add_to_cart", "get_cart", "checkout"];

function formatProduct(p: {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  merchant: string;
  sku: string;
}) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price_cents: p.priceCents,
    price_dollars: p.priceCents / 100,
    category: p.category,
    merchant: p.merchant,
    sku: p.sku,
  };
}

export const auth = betterAuth({
  baseURL: BASE_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    agentAuth({
      providerName: "SpendPass",
      freshSessionWindow: 0,
      providerDescription:
        "Scoped spending delegation for AI commerce agents. Search products, manage a cart, and checkout with enforced spending caps and merchant allowlists.",
      capabilities,
      defaultHostCapabilities: ({ mode }) =>
        mode === "autonomous" ? SHOP_CAPABILITIES : BROWSE_CAPABILITIES,
      modes: ["delegated"],
      approvalMethods: ["ciba", "device_authorization"],
      resolveApprovalMethod: ({ preferredMethod, supportedMethods }) => {
        const method = preferredMethod ?? "device_authorization";
        return supportedMethods.includes(method) ? method : "device_authorization";
      },
      allowDynamicHostRegistration: true,
      onExecute: async ({ capability, arguments: args, agentSession }) => {
        const userId = agentSession.user.id;
        const agentId = agentSession.agent.id;

        switch (capability) {
          case "search_products": {
            const maxPriceCents =
              args?.max_price !== undefined ? Math.round(Number(args.max_price) * 100) : undefined;
            const products = await searchProducts({
              query: args?.query ? String(args.query) : undefined,
              category: args?.category ? String(args.category) : undefined,
              maxPriceCents,
              limit: args?.limit ? Number(args.limit) : undefined,
            });
            return {
              products: products.map(formatProduct),
              count: products.length,
            };
          }

          case "get_cart": {
            const cart = await getCart({ userId, agentId });
            return {
              items: cart.items.map((item) => ({
                id: item.id,
                product_id: item.productId,
                name: item.name,
                quantity: item.quantity,
                price_cents: item.priceCents,
                price_dollars: item.priceCents / 100,
                line_total_cents: item.lineTotalCents,
                merchant: item.merchant,
              })),
              total_cents: cart.totalCents,
              total_dollars: cart.totalCents / 100,
            };
          }

          case "add_to_cart": {
            if (!args?.product_id) throw new Error("Missing required argument: product_id");
            const item = await addToCart({
              userId,
              agentId,
              productId: String(args.product_id),
              quantity: args.quantity ? Number(args.quantity) : undefined,
            });
            return {
              item: {
                id: item.id,
                product_id: item.productId,
                name: item.name,
                quantity: item.quantity,
                price_dollars: item.priceCents / 100,
                line_total_dollars: item.lineTotalCents / 100,
              },
              message: `Added ${item.quantity}x ${item.name} to cart`,
            };
          }

          case "checkout": {
            throw new Error(
              "CHECKOUT_NOT_READY: Checkout constraint enforcement ships in Phase 2. Use search_products and get_cart for now.",
            );
          }

          default:
            throw new Error(`Unknown capability: ${capability}`);
        }
      },
      onEvent: (event) => {
        try {
          const { type, actorId, actorType, agentId, hostId, orgId, ...rest } =
            event as unknown as Record<string, unknown>;
          insertLog(
            (type as string) ?? null,
            (actorId as string) ?? null,
            (actorType as string) ?? null,
            (agentId as string) ?? null,
            (hostId as string) ?? null,
            (orgId as string) ?? null,
            JSON.stringify(rest),
          ).catch(() => {});
        } catch {
          // never let logging break the flow
        }
      },
    }),
  ],
});
