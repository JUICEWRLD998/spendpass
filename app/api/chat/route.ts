import { createGroq } from "@ai-sdk/groq";
import { getAgentAuthTools, toAISDKTools } from "@auth/agent";
import { streamText, type ToolSet } from "ai";
import { getAgentClient, SPENDPASS_SYSTEM_PROMPT } from "@/lib/agent/client";

export const maxDuration = 120;

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY is not configured. Add it to your .env file." }),
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

  const groq = createGroq({ apiKey });

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: SPENDPASS_SYSTEM_PROMPT,
    messages,
    tools: tools as ToolSet,
    maxSteps: 12,
  });

  return result.toDataStreamResponse();
}
