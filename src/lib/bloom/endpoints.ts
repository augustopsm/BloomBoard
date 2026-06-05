// ─────────────────────────────────────────────────────────────────────────
// Bloom Growth API endpoint map.
//
// Every path the app hits lives here so that if Bloom's routes differ from
// what's assumed below, there is exactly ONE place to fix it.
//
// Verified against a live account (2026-06):
//
//   • Auth:                 POST /Token                       (form-encoded)
//   • Current user:         GET  /api/v1/users/mine           → 200
//   • My rocks:             GET  /api/v1/rocks/user/mine      → 200 (array)
//   • A rock's milestones:  GET  /api/v1/rocks/{id}/milestones → 200 (array)
//   • My to-dos:            GET  /api/v1/todos/user/mine      → 200
//   • My issues (IDS):      GET  /api/v1/issues/user/mine     → 200
//
// Milestones do NOT come embedded in the rocks list — they're fetched per rock
// from the path above (see service.ts). The milestone completion field on read
// is a string `Status` ("Done"); the write contract for toggling it is the one
// piece still being confirmed (see setMilestoneComplete in service.ts).
// ─────────────────────────────────────────────────────────────────────────

export const BLOOM_BASE_URL =
  process.env.BLOOM_API_BASE_URL?.replace(/\/$/, "") ??
  "https://app.bloomgrowth.com";

export const endpoints = {
  /** OAuth-style token endpoint (form-encoded body). */
  token: "/Token",

  /** The authenticated user. */
  me: "/api/v1/users/mine",

  /** The current user's quarterly priorities. */
  myRocks: "/api/v1/rocks/user/mine",
  rock: (id: string) => `/api/v1/rocks/${id}`,

  /** A rock's milestones (the only place milestones are listed). */
  milestonesForRock: (rockId: string) =>
    `/api/v1/rocks/${rockId}/milestones`,

  /** Milestone completion toggle. */
  milestone: (id: string) => `/api/v1/milestones/${id}`,

  /** The current user's action items. */
  myTodos: "/api/v1/todos/user/mine",
  todo: (id: string) => `/api/v1/todos/${id}`,

  /** The current user's IDS issues. */
  myIssues: "/api/v1/issues/user/mine",
  issue: (id: string) => `/api/v1/issues/${id}`,
} as const;
