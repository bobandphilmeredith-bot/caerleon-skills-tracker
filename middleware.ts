import { NextResponse, type NextRequest } from "next/server";

const accessTokenCookie = "caerleon-supabase-access-token";

const publicPathPrefixes = ["/login", "/auth/callback", "/reset-password", "/api/auth"];
const publicExactPaths = ["/api/healthcheck"];
const publicFilePattern = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const accessToken = request.cookies.get(accessTokenCookie)?.value;

  if (accessToken && (await hasAuthenticatedSupabaseUser(accessToken))) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  loginUrl.searchParams.set("session", "expired");
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(accessTokenCookie);
  return response;
}

async function hasAuthenticatedSupabaseUser(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    publicExactPaths.includes(pathname) ||
    publicFilePattern.test(pathname) ||
    publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
