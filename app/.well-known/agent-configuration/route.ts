import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const config = await auth.api.getAgentConfiguration({ headers: req.headers });
  return Response.json(config);
}
