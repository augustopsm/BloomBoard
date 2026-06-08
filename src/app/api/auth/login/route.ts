import { NextResponse } from "next/server";
import { BloomApiError, bloomFetch, login } from "@/lib/bloom/client";
import { endpoints } from "@/lib/bloom/endpoints";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  let email: unknown, password: unknown;
  try {
    ({ email, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const token = await login(email, password);

    // Fetch the user's Bloom ID so the client can switch between team members.
    let userId: string | undefined;
    try {
      const me = await bloomFetch<{ Id?: string; id?: string }>(
        token.access_token,
        endpoints.me,
      );
      userId = String(me?.Id ?? me?.id ?? "").trim() || undefined;
    } catch {
      // Non-fatal — multi-user picker just won't know which is "you".
    }

    setSession({
      token: token.access_token,
      userName: token.userName ?? email,
      userId,
      expiresAt: Date.now() + (token.expires_in ?? 0) * 1000,
    });
    return NextResponse.json({ userName: token.userName ?? email, userId });
  } catch (err) {
    if (err instanceof BloomApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Could not reach Bloom Growth. Try again." },
      { status: 502 },
    );
  }
}
