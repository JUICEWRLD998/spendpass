import { AgentAuthClient, AgentAuthSDKError, type ApprovalInfo } from "@auth/agent";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { getAgentStorage } from "@/lib/agent/storage";
import { getProviderUrl } from "@/lib/agent/client";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";

export const maxDuration = 120;

const encoder = new TextEncoder();
const google = process.env.GEMINI_API_KEY
  ? createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Product = {
  id: string;
  name: string;
  description?: string;
  price_cents?: number;
  price_dollars?: number;
  category?: string;
  merchant?: string;
  sku?: string;
};

type SearchPayload = {
  products?: Product[];
  count?: number;
};

type CartPayload = {
  items?: Array<{
    product_id?: string;
    quantity?: number;
    merchant?: string;
  }>;
  total_dollars?: number;
  total_cents?: number;
};

type CheckoutArgs = {
  max_amount: number;
  merchants: string;
};

function streamText(controller: ReadableStreamDefaultController<Uint8Array>, text: string) {
  controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
}

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function getLatestAgentId(messages: ChatMessage[]) {
  const joined = messages.map((message) => message.content).join("\n");
  const connectedMatches = [...joined.matchAll(/Agent connected \(([A-Za-z0-9_-]+)\)/g)];
  if (connectedMatches.length > 0) {
    return connectedMatches.at(-1)?.[1] ?? null;
  }

  const prefixedMatches = joined.match(/agt_[A-Za-z0-9_-]+/g);
  return prefixedMatches?.at(-1) ?? null;
}

function getApprovalUrl(approval: ApprovalInfo) {
  return approval.verification_uri_complete ?? approval.verification_uri ?? "";
}

function parseSearchArgs(input: string): Record<string, unknown> {
  const lower = input.toLowerCase();
  const args: Record<string, unknown> = { limit: 10 };

  if (lower.includes("7-in-1") || lower.includes("7 in 1")) {
    args.query = "USB-C Hub 7-in-1";
    args.category = "hubs";
  } else if (lower.includes("4-in-1") || lower.includes("4 in 1")) {
    args.query = "USB-C Hub 4-in-1";
    args.category = "hubs";
  } else if (lower.includes("4k") && lower.includes("monitor")) {
    args.query = "4K Monitor";
    args.category = "monitors";
  } else if (lower.includes("hub")) {
    args.query = lower.includes("usb") ? "USB-C hub" : "hub";
    args.category = "hubs";
  } else if (lower.includes("monitor")) {
    args.query = "monitor";
    args.category = "monitors";
  } else if (lower.includes("cable")) {
    args.query = lower.includes("usb") ? "USB-C cable" : "cable";
    args.category = "cables";
  } else if (lower.includes("adapter")) {
    args.query = "adapter";
  } else {
    const cleaned = input
      .replace(
        /\b(find|show|search|list|get|me|all|products?|add|to|my|cart|checkout|buy|purchase|order|under|below|less than|up to|around)\b/gi,
        " ",
      )
      .replace(/\$\s*\d+(\.\d+)?/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) args.query = cleaned;
  }

  const maxMatch = input.match(/(?:under|below|less than|up to)\s*\$?\s*(\d+(?:\.\d+)?)/i);
  if (maxMatch) {
    args.max_price = Number(maxMatch[1]);
  }

  return args;
}

function isCheckoutOnlyRequest(input: string) {
  return /^\s*(checkout|place\s+(the\s+)?order|complete\s+(the\s+)?order)\s*[.!?]?\s*$/i.test(
    input,
  );
}

function isCartRequest(input: string) {
  return /\bcart\b/i.test(input) && !/\b(add|buy|purchase|order|checkout)\b/i.test(input);
}

function isShoppingRequest(input: string) {
  return /\b(find|show|search|list|cart|buy|purchase|order|checkout|hub|monitor|cable|adapter|product)\b/i.test(
    input,
  );
}

function shouldBuy(input: string) {
  return /\b(buy|purchase|order|checkout)\b/i.test(input);
}

function shouldAddToCart(input: string) {
  return /\b(add|cart)\b/i.test(input) || shouldBuy(input);
}

function formatDollars(value: number | undefined) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatProducts(products: Product[]) {
  if (products.length === 0) {
    return "No matching products found.";
  }

  return products
    .map((product) => {
      const price =
        product.price_dollars ??
        (typeof product.price_cents === "number" ? product.price_cents / 100 : undefined);
      return `- ${product.name} - ${formatDollars(price)} (product_id: ${product.id})`;
    })
    .join("\n");
}

function checkoutArgsFromCart(cart: CartPayload, fallbackMerchant?: string): CheckoutArgs {
  const total =
    cart.total_dollars ??
    (typeof cart.total_cents === "number" ? cart.total_cents / 100 : undefined);
  const merchant = cart.items?.[0]?.merchant ?? fallbackMerchant;

  if (total === undefined || !merchant) {
    throw new Error("Unable to determine cart total and merchant for checkout");
  }

  return {
    max_amount: total,
    merchants: merchant,
  };
}

function escalationLimit(total: number) {
  return Math.max(150, Math.ceil(total / 10) * 10);
}

function parseConstraints(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function activeCheckoutGrantCovers(
  constraintsValue: unknown,
  checkoutArgs: CheckoutArgs,
) {
  const constraints = parseConstraints(constraintsValue);
  if (!constraints) return true;

  const amountConstraint = constraints.max_amount;
  const merchantConstraint = constraints.merchants;

  const maxAmount =
    amountConstraint &&
    typeof amountConstraint === "object" &&
    !Array.isArray(amountConstraint) &&
    typeof (amountConstraint as Record<string, unknown>).max === "number"
      ? ((amountConstraint as Record<string, unknown>).max as number)
      : undefined;

  if (maxAmount !== undefined && checkoutArgs.max_amount > maxAmount) {
    return false;
  }

  if (
    merchantConstraint &&
    typeof merchantConstraint === "object" &&
    !Array.isArray(merchantConstraint) &&
    Array.isArray((merchantConstraint as Record<string, unknown>).in)
  ) {
    const allowed = (merchantConstraint as { in: unknown[] }).in.map(String);
    if (!allowed.includes(checkoutArgs.merchants)) {
      return false;
    }
  }

  return true;
}

async function hasActiveCheckoutGrant(agentId: string, checkoutArgs: CheckoutArgs) {
  const grants = await db
    .select({ constraints: schema.agentCapabilityGrant.constraints })
    .from(schema.agentCapabilityGrant)
    .where(
      and(
        eq(schema.agentCapabilityGrant.agentId, agentId),
        eq(schema.agentCapabilityGrant.capability, "checkout"),
        eq(schema.agentCapabilityGrant.status, "active"),
      ),
    );

  return grants.some((grant) => activeCheckoutGrantCovers(grant.constraints, checkoutArgs));
}

async function clearPendingCheckoutEscalations(agentId: string) {
  const pendingCheckoutGrants = await db
    .select({ id: schema.agentCapabilityGrant.id })
    .from(schema.agentCapabilityGrant)
    .where(
      and(
        eq(schema.agentCapabilityGrant.agentId, agentId),
        eq(schema.agentCapabilityGrant.capability, "checkout"),
        eq(schema.agentCapabilityGrant.status, "pending"),
      ),
    );

  if (pendingCheckoutGrants.length === 0) return;

  for (const grant of pendingCheckoutGrants) {
    await db
      .delete(schema.agentCapabilityGrant)
      .where(eq(schema.agentCapabilityGrant.id, grant.id));
  }

  await db
    .delete(schema.approvalRequest)
    .where(
      and(
        eq(schema.approvalRequest.agentId, agentId),
        eq(schema.approvalRequest.method, "device_authorization"),
        eq(schema.approvalRequest.status, "pending"),
      ),
    );
}

async function waitForActiveCheckoutGrant(
  agentId: string,
  checkoutArgs: CheckoutArgs,
  timeoutMs = 90_000,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await hasActiveCheckoutGrant(agentId, checkoutArgs)) {
      return;
    }
    await delay(1_000);
  }

  throw new Error(
    `Escalation approval timed out before an active ${formatDollars(
      checkoutArgs.max_amount,
    )} checkout grant was available.`,
  );
}

async function executeCheckoutWithEscalation(
  client: AgentAuthClient,
  agentId: string,
  checkoutArgs: CheckoutArgs,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  try {
    return await client.executeCapability({
      agentId,
      capability: "checkout",
      arguments: checkoutArgs,
    });
  } catch (error) {
    if (
      !(error instanceof AgentAuthSDKError) ||
      error.code !== "constraint_violated" ||
      typeof checkoutArgs.max_amount !== "number"
    ) {
      throw error;
    }

    const newLimit = escalationLimit(checkoutArgs.max_amount);
    streamText(
      controller,
      `Checkout blocked: cart total ${formatDollars(checkoutArgs.max_amount)} exceeds the active grant. Requesting approval for ${formatDollars(newLimit)}...\n\n`,
    );

    await clearPendingCheckoutEscalations(agentId);

    await client.requestCapability({
      agentId,
      preferredMethod: "device_authorization",
      reason: `Approve checkout up to ${formatDollars(newLimit)} for this SpendPass order.`,
      capabilities: [
        {
          name: "checkout",
          constraints: {
            max_amount: { max: newLimit },
            merchants: { in: [checkoutArgs.merchants] },
          },
        },
      ],
    });

    await waitForActiveCheckoutGrant(agentId, checkoutArgs);
    await client.agentStatus(agentId);
    streamText(controller, "Approval received.\n\n");

    return client.executeCapability({
      agentId,
      capability: "checkout",
      arguments: checkoutArgs,
    });
  }
}

async function ensureConnectedAgent(
  client: AgentAuthClient,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  const existingAgentId = getLatestAgentId(messages);
  if (existingAgentId) {
    try {
      const status = await client.agentStatus(existingAgentId);
      if (status.status === "active" || status.status === "claimed") {
        return existingAgentId;
      }
    } catch {
      // Fall through and create a fresh connection.
    }
  }

  const connection = await client.connectAgent({
    provider: getProviderUrl(),
    mode: "delegated",
    name: "SpendPass Shopping Agent",
    reason: "Search the mock catalog and checkout only within the approved SpendPass constraints.",
    preferredMethod: "device_authorization",
    forceApproval: true,
    capabilities: [
      "search_products",
      "add_to_cart",
      "get_cart",
      {
        name: "checkout",
        constraints: {
          max_amount: { max: 50 },
          merchants: { in: ["spendpass-store"] },
        },
      },
    ],
  });

  streamText(controller, `Approval received.\n\nAgent connected (${connection.agentId}).\n\n`);
  return connection.agentId;
}

async function handleShoppingRequest(
  input: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  const client = new AgentAuthClient({
    storage: getAgentStorage(),
    hostName: "SpendPass Shopping Agent",
    urls: [getProviderUrl()],
    allowDirectDiscovery: true,
    approvalTimeoutMs: 120_000,
    onApprovalRequired: async (approval) => {
      const url = getApprovalUrl(approval);
      streamText(
        controller,
        [
          "Approval required.",
          url ? `Open this approval page: ${url}` : "",
          approval.user_code ? `Verification code: ${approval.user_code}` : "",
          "Waiting for approval...",
          "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    },
  });

  await client.init();
  const agentId = await ensureConnectedAgent(client, messages, controller);

  if (isCheckoutOnlyRequest(input)) {
    const cart = await client.executeCapability({
      agentId,
      capability: "get_cart",
      arguments: {},
    });
    const cartPayload = (cart.data ?? {}) as CartPayload;
    const checkoutArgs = checkoutArgsFromCart(cartPayload);

    const checkout = await executeCheckoutWithEscalation(
      client,
      agentId,
      checkoutArgs,
      controller,
    );

    streamText(controller, `Order placed:\n${JSON.stringify(checkout.data, null, 2)}`);
    return;
  }

  if (isCartRequest(input)) {
    const cart = await client.executeCapability({
      agentId,
      capability: "get_cart",
      arguments: {},
    });
    streamText(controller, `Cart:\n${JSON.stringify(cart.data, null, 2)}`);
    return;
  }

  const search = await client.executeCapability({
    agentId,
    capability: "search_products",
    arguments: parseSearchArgs(input),
  });

  const payload = (search.data ?? {}) as SearchPayload;
  const products = payload.products ?? [];
  streamText(controller, `Products:\n${formatProducts(products)}\n\n`);

  if (!shouldBuy(input) || products.length === 0) {
    if (shouldAddToCart(input) && products.length > 0) {
      const selected = products[0];
      const added = await client.executeCapability({
        agentId,
        capability: "add_to_cart",
        arguments: { product_id: selected.id, quantity: 1 },
      });

      streamText(controller, `Added to cart:\n${JSON.stringify(added.data, null, 2)}`);
    }
    return;
  }

  const selected = products[0];
  const cartBeforeAdd = await client.executeCapability({
    agentId,
    capability: "get_cart",
    arguments: {},
  });
  const cartBeforeAddPayload = (cartBeforeAdd.data ?? {}) as CartPayload;
  const alreadyInCart = cartBeforeAddPayload.items?.some((item) => item.product_id === selected.id);

  if (!alreadyInCart) {
    await client.executeCapability({
      agentId,
      capability: "add_to_cart",
      arguments: { product_id: selected.id, quantity: 1 },
    });
  }

  const cart = await client.executeCapability({
    agentId,
    capability: "get_cart",
    arguments: {},
  });
  const cartPayload = (cart.data ?? {}) as CartPayload;
  const checkoutArgs = checkoutArgsFromCart(cartPayload, selected.merchant);

  const checkout = await executeCheckoutWithEscalation(client, agentId, checkoutArgs, controller);
  streamText(controller, `Order placed:\n${JSON.stringify(checkout.data, null, 2)}`);
}

function errorMessage(error: unknown) {
  if (error instanceof AgentAuthSDKError) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

async function generateAssistantReply(input: string, messages: ChatMessage[]) {
  if (!google) {
    return 'I am SpendPass, a shopping agent. I can help search products, manage your cart, and checkout through Agent Auth approvals. Try "Find USB-C hubs under $40".';
  }

  const recentMessages = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    system:
      "You are SpendPass, a concise AI shopping agent for a mock electronics store. " +
      "For general conversation, answer naturally and briefly. " +
      "Always explain that real shopping actions are handled through Agent Auth approvals and capabilities. " +
      "Do not invent products, prices, orders, carts, approvals, or checkout results. " +
      "For product search, cart, checkout, or purchase requests, tell the user you can help and suggest a concrete shopping request.",
    prompt: `Conversation:\n${recentMessages}\n\nLatest user message: ${input}`,
    temperature: 0.3,
    maxOutputTokens: 120,
  });

  return text.trim();
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages?: ChatMessage[] };
  const chatMessages = messages ?? [];
  const input = getLastUserMessage(chatMessages);

  if (!input.trim()) {
    return Response.json({ error: "messages are required" }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!isShoppingRequest(input)) {
          streamText(controller, await generateAssistantReply(input, chatMessages));
          return;
        }

        await handleShoppingRequest(input, chatMessages, controller);
      } catch (error) {
        streamText(controller, `SpendPass error: ${errorMessage(error)}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
