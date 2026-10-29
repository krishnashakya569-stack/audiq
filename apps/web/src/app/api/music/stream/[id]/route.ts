import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIUS_STREAM_BASE_URL = "https://discoveryprovider.audius.co/v1/tracks";
const FORWARDED_RESPONSE_HEADERS = [
  "accept-ranges",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
];

async function proxyAudiusStream(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new Response("Invalid Audius track id", { status: 400 });
  }

  const upstreamUrl = new URL(
    AUDIUS_STREAM_BASE_URL + "/" + encodeURIComponent(id) + "/stream",
  );
  upstreamUrl.searchParams.set(
    "app_name",
    process.env.AUDIUS_APP_NAME || "Audiq",
  );

  const requestHeaders = new Headers();
  for (const name of ["range", "if-range"]) {
    const value = request.headers.get(name);
    if (value) requestHeaders.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: requestHeaders,
      cache: "no-store",
      redirect: "follow",
    });
  } catch {
    return new Response("Audius stream is temporarily unavailable", {
      status: 502,
    });
  }

  const headers = new Headers({
    "Cache-Control": "private, no-store",
  });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return proxyAudiusStream(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return proxyAudiusStream(request, context);
}
