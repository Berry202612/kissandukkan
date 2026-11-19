import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";
import { routing } from "./i18n/routing";

const { auth } = NextAuth(authConfig);
const intl = createIntlMiddleware(routing);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (role !== "ADMIN" && role !== "STAFF") {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const m = pathname.match(/^\/(en|hi)\/account(\/|$)/);
  if (m && !req.auth?.user) {
    const url = new URL(`/${m[1]}/login`, req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return intl(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
