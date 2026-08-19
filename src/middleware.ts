import { NextResponse, type NextRequest } from "next/server";
import { readSessionEmail, sessionCookieName } from "@/modules/adminAuth/session";

function isPublic(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/preview/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/api/admin/login")) return true;
  return false;
}

function needsAuth(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/jobs")) return true;
  if (pathname.startsWith("/api/import")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname) || !needsAuth(pathname)) {
    return NextResponse.next();
  }
  const token = request.cookies.get(sessionCookieName())?.value;
  const email = await readSessionEmail(token);
  if (email) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
