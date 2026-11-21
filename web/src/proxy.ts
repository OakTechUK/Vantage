import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/api";

export default function proxy(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const isLogin = request.nextUrl.pathname === "/login";

  if (!token && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (token && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cases/:path*",
    "/people/:path*",
    "/reports/:path*",
    "/cawns/:path*",
    "/login",
  ],
};
