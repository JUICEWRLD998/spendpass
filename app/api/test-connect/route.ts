import { NextResponse } from "next/server";
import { getAgentClient } from "@/lib/agent/client";

/**
 * TEST ENDPOINT - Manual connect_agent test
 * Visit: http://localhost:3100/api/test-connect
 */
export async function GET() {
  try {
    const client = getAgentClient();
    
    console.log("[Test] Initializing client...");
    await client.init();
    console.log("[Test] Client initialized");
    
    console.log("[Test] Calling connect_agent...");
    const result = await client.connectAgent({
      provider: "http://localhost:3100",
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
      mode: "delegated",
      name: "Test Agent",
    });
    
    console.log("[Test] Success!", result);
    
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[Test] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : String(error),
    }, { status: 500 });
  }
}
