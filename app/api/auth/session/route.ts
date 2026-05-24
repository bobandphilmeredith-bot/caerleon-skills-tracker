import { NextResponse } from "next/server";

const accessTokenCookie = "caerleon-supabase-access-token";
const refreshTokenCookie = "caerleon-supabase-refresh-token";

type SessionPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as SessionPayload;

  if (!payload.access_token) {
    return NextResponse.json({ ok: false, message: "Missing access token." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const maxAge = Math.max(60, payload.expires_in ?? 3600);

  response.cookies.set(accessTokenCookie, payload.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  });

  if (payload.refresh_token) {
    response.cookies.set(refreshTokenCookie, payload.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(accessTokenCookie);
  response.cookies.delete(refreshTokenCookie);
  return response;
}
