import { NextRequest, NextResponse } from "next/server";
import { apiBaseUrl, TOKEN_COOKIE } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  const target = new URL(`${apiBaseUrl()}/api/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  let response: Response;
  try {
    response = await fetch(target, { method, headers, body, cache: "no-store" });
  } catch {
    return NextResponse.json({ detail: "The Vantage API is unavailable." }, { status: 502 });
  }

  const responseHeaders = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) responseHeaders.set("Content-Type", responseType);
  const disposition = response.headers.get("content-disposition");
  if (disposition) responseHeaders.set("Content-Disposition", disposition);
  responseHeaders.set("Cache-Control", "no-store");

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
