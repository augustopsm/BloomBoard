// Minimal signed-cookie session. The Bloom Growth access token lives ONLY in an
// httpOnly cookie so it never reaches client-side JavaScript. The cookie value
// is `<base64url(payload)>.<hmac>` — tamper-evident, not encrypted (the token
// is already opaque, and httpOnly + signature is enough to stop client/tamper
// access). Bloom tokens expire in ~2 weeks; we mirror that as the cookie maxAge.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "bloom_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure-secret";

export interface Session {
  token: string;
  userName: string;
  /** Bloom user ID — stored at login to avoid extra round-trips. */
  userId?: string;
  /** Epoch ms when the Bloom token expires. */
  expiresAt: number;
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

function encode(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value: string): Session | null {
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  // Constant-time compare to avoid leaking signature validity via timing.
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  cookies().set(COOKIE_NAME, encode(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
  });
}

export function getSession(): Session | null {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const session = decode(raw);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) return null;
  return session;
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}
