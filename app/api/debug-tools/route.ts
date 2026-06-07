import { NextResponse } from "next/server";
import { getAgentAuthTools } from "@auth/agent";
import { getAgentClient } from "@/lib/agent/client";

/**
 * DEBUG ENDPOINT
 * Shows what tools are available to the AI agent
 */
export async function GET() {
  try {
    const client = getAgentClient();
    const tools = getAgentAuthTools(client);
    
    return NextResponse.json({
      total_tools: tools.length,
      tool_names: tools.map(t => t.name),
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
