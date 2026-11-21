import { NextRequest, NextResponse } from "next/server";
import { apiBaseUrl, TOKEN_COOKIE } from "@/lib/api";

export async function POST(request: NextRequest) {
  let payload: { tenantCode?: string; email?: string; password?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid sign-in request." }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(body, { status: response.status });
  }

  const result = NextResponse.json({ officer: body.officer });
  result.cookies.set(TOKEN_COOKIE, body.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return result;
}
