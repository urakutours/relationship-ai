import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 静的ファイル・API・認証ページはスキップ
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Cookieで認証チェック
  const authCookie = request.cookies.get("beta-auth");
  if (authCookie?.value !== "authenticated") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
