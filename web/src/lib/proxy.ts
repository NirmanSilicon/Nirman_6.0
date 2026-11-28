import "server-only";

export async function proxy(request: Request, target: string, path: string) {
  const headers = new Headers({ "Content-Type": request.headers.get("content-type") || "application/json" });
  for (const name of ["cookie", "authorization"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const limit = 8 * 1024 * 1024 + 128 * 1024;
    if (Number(request.headers.get("content-length") || 0) > limit) return Response.json({ detail: "Files are limited to 8 MB" }, { status: 413 });
    const body = request.method === "GET" ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > limit) return Response.json({ detail: "Files are limited to 8 MB" }, { status: 413 });
    const upstream = await fetch(new URL(path, target), {
      method: request.method, headers, body, cache: "no-store", redirect: "manual",
      signal: AbortSignal.timeout(180_000),
    });
    const resultHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["content-type", "set-cookie", "content-disposition"]) {
      const value = upstream.headers.get(name);
      if (value) resultHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: resultHeaders });
  } catch {
    return Response.json({ detail: "Backend unavailable. Check the presentation services." }, { status: 503 });
  }
}

export function safeSegments(segments: string[]) {
  return segments.every(segment => /^[a-zA-Z0-9_-]+$/.test(segment));
}
