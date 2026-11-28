import { proxy, safeSegments } from "../../../../lib/proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!safeSegments(path)) return Response.json({ detail: "Invalid path" }, { status: 400 });
  return proxy(request, process.env.AGENT_X_SANDBOX_URL || "http://127.0.0.1:18081", "/api/" + path.join("/"));
}
export { handle as GET, handle as POST };
