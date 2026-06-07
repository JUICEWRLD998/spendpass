import { auth } from "@/lib/auth";

// Debug endpoint to see exactly what the agent register endpoint returns
export async function POST(req: Request) {
  try {
    // Forward the request to Better Auth's agent register endpoint
    const body = await req.json();
    console.log("[Debug] Register request body:", JSON.stringify(body, null, 2));

    const response = await fetch("http://localhost:3100/api/auth/agent/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(req.headers),
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    console.log("[Debug] Register response status:", response.status);
    console.log("[Debug] Register response body:", text);

    return Response.json({
      status: response.status,
      body: text,
    });
  } catch (error) {
    console.error("[Debug] Error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

// Also GET to check what the register endpoint expects
export async function GET() {
  // Make a test request with minimal body to see validation error
  const response = await fetch("http://localhost:3100/api/auth/agent/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test: true }),
  });

  const text = await response.text();
  return Response.json({
    status: response.status,
    body: text,
    message: "This shows what happens with invalid body",
  });
}
