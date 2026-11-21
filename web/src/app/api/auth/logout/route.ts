import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/api";

function clearToken(response: NextResponse) {
  response.cookies.set(TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export async function POST() {
  return clearToken(NextResponse.json({ ok: true }));
}

// Used when a token is present but no longer valid (expired, force reset, or the
// officer account has been removed). Clearing it here prevents a redirect loop
// between the app layout and the login page.
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/login";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/login";
  return clearToken(NextResponse.redirect(new URL(target, request.url)));
}
