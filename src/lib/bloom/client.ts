// Server-side Bloom Growth API client. This module is imported ONLY from API
// routes (server runtime) so the bearer token is never bundled to the browser.

import { BLOOM_BASE_URL, endpoints } from "./endpoints";
import type { BloomToken } from "./types";

export class BloomApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "BloomApiError";
  }
}

/**
 * Exchange Bloom Growth credentials for a bearer token.
 * Mirrors the documented `POST /token` with a form-encoded body.
 */
export async function login(
  userName: string,
  password: string,
): Promise<BloomToken> {
  const body = new URLSearchParams({
    grant_type: "password",
    userName,
    password,
  });

  const res = await fetch(`${BLOOM_BASE_URL}${endpoints.token}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BloomApiError(
      res.status === 400
        ? "Invalid email or password."
        : `Bloom Growth login failed (${res.status}).`,
      res.status,
      text,
    );
  }

  return (await res.json()) as BloomToken;
}

/** Authenticated request against the Bloom API, returning parsed JSON. */
export async function bloomFetch<T = unknown>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BLOOM_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BloomApiError(
      `Bloom API ${init.method ?? "GET"} ${path} failed (${res.status}).`,
      res.status,
      text,
    );
  }

  // Some endpoints return 204 / empty / whitespace-only bodies.
  if (res.status === 204) return undefined as T;
  const text = (await res.text()).trim();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // A 2xx with a non-JSON body (e.g. an HTML error page) shouldn't crash the
    // caller; treat it as no data.
    throw new BloomApiError(
      `Bloom API ${init.method ?? "GET"} ${path} returned non-JSON (${res.status}).`,
      res.status,
      text.slice(0, 200),
    );
  }
}
