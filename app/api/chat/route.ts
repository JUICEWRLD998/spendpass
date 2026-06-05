import { openai } from "@ai-sdk/openai";
import { getAgentAuthTools, toAISDKTools } from "@auth/agent";
import { streamText, type ToolSet } from "ai";
import { getAgentClient, SPENDPASS_SYSTEM_PROMPT } from "@/lib/agent/client";

export const maxDuration = 120;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not configured. Add it to your .env file." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages } = (await req.json()) as {
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  };

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "messages are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = getAgentClient();
  const tools = await toAISDKTools(getAgentAuthTools(client));

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: SPENDPASS_SYSTEM_PROMPT,
    messages,
    tools: tools as ToolSet,
    maxSteps: 12,
  });

  return result.toDataStreamResponse();
}
