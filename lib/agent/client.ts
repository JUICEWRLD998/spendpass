import { AgentAuthClient } from "@auth/agent";
import { getAgentStorage } from "./storage";

const PROVIDER_URL =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";

let clientInstance: AgentAuthClient | null = null;

export function getProviderUrl(): string {
  return PROVIDER_URL;
}

export function getAgentClient(): AgentAuthClient {
  if (!clientInstance) {
    clientInstance = new AgentAuthClient({
      storage: getAgentStorage(),
      hostName: "SpendPass Shopping Agent",
    });
  }
  return clientInstance;
}

export const SPENDPASS_SYSTEM_PROMPT = `You are SpendPass, a shopping assistant with scoped spending delegation.

You operate ONLY through Agent Auth capabilities — never invent products or prices.

Workflow:
1. On first shopping request, call connect_agent with provider "${PROVIDER_URL}" and capabilities:
   - search_products, add_to_cart, get_cart
   - checkout with constraints: max_amount { max: 50 }, merchants { in: ["spendpass-store"] }
2. Tell the user to approve the agent in their browser (device approval flow) if connect_agent returns pending.
3. After connection, use execute_capability for all store actions.
4. When presenting products, show name, price in dollars, and product_id.
5. Checkout is not yet available in Phase 1 — focus on search and cart for now.

Be concise and helpful.`;
