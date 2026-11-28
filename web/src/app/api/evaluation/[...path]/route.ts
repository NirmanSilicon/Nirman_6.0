import { proxy, safeSegments } from "../../../../lib/proxy";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const approvedAsset = path.length === 2 && path[0] === "assets" && ["workflow.js", "workflow.css"].includes(path[1]);
  if (!approvedAsset && !safeSegments(path)) return Response.json({ detail: "Invalid path" }, { status: 400 });
  const destination = path.join("/") === "view" ? "/" : "/api/evaluation/" + path.join("/");
  return proxy(request, process.env.AGENT_X_EVALUATION_URL || "http://127.0.0.1:18082", destination);
}
export { handle as GET, handle as POST, handle as DELETE };
