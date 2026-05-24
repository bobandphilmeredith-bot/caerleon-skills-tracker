import { NextResponse, type NextRequest } from "next/server";

const accessTokenCookie = "caerleon-supabase-access-token";
const refreshTokenCookie = "caerleon-supabase-refresh-token";

const publicPathPrefixes = ["/login", "/auth/callback", "/reset-password", "/api/auth"];
const publicFilePattern = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const accessToken = request.cookies.get(accessTokenCookie)?.value;
  const refreshToken = request.cookies.get(refreshTokenCookie)?.value;

  if (accessToken && (await hasAuthenticatedSupabaseUser(accessToken))) {
    return NextResponse.next();
  }

  const refreshedSession = refreshToken ? await refreshSupabaseSession(refreshToken) : null;
  if (refreshedSession?.access_token) {
    const response = NextResponse.next();
    setSessionCookies(response, {
      access_token: refreshedSession.access_token,
      refresh_token: refreshedSession.refresh_token,
      expires_in: refreshedSession.expires_in
    });
    return response;
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  loginUrl.searchParams.set("session", "expired");
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(accessTokenCookie);
  response.cookies.delete(refreshTokenCookie);
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

async function refreshSupabaseSession(refreshToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) return null;
    return (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  } catch {
    return null;
  }
}

function setSessionCookies(response: NextResponse, session: { access_token: string; refresh_token?: string; expires_in?: number }) {
  response.cookies.set(accessTokenCookie, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(60, session.expires_in ?? 3600)
  });

  if (session.refresh_token) {
    response.cookies.set(refreshTokenCookie, session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
}

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    publicFilePattern.test(pathname) ||
    publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
