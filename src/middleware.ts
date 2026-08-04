import { NextRequest, NextResponse } from "next/server";

function isAuthorized(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Basic ")) return false;
  const decoded = atob(authHeader.slice(6));
  const password = decoded.slice(decoded.indexOf(":") + 1);
  return password === process.env.APP_PASSWORD;
}

export function middleware(request: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return NextResponse.next();

  if (isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.next();
  }

  return new NextResponse("Zugriff geschützt.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Process AI Navigator"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
