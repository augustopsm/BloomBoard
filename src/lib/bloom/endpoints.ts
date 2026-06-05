// ─────────────────────────────────────────────────────────────────────────
// Bloom Growth API endpoint map.
//
// Every path the app hits lives here so that if Bloom's routes differ from
// what's assumed below, there is exactly ONE place to fix it. The public docs
// only confirm two things:
//
//   • Auth:  POST https://app.bloomgrowth.com/token
//   • A sample read: GET /api/v1/scorecard/items/
//     (https://help.bloomgrowth.com/en/all-about-the-bloom-growth-api)
//
// The remaining v1 resource paths below follow that same `/api/v1/<resource>`
// convention. Verify them against the live Swagger
// (https://app.bloomgrowth.com/swagger/index.html) with your token and adjust
// here if needed — nothing else in the codebase hardcodes a path.
// ─────────────────────────────────────────────────────────────────────────

export const BLOOM_BASE_URL =
  process.env.BLOOM_API_BASE_URL?.replace(/\/$/, "") ??
  "https://app.bloomgrowth.com";

export const endpoints = {
  /** OAuth-style token endpoint (form-encoded body). */
  token: "/token",

  /** The authenticated user. */
  me: "/api/v1/users/mine",

  /** Quarterly priorities. */
  rocks: "/api/v1/rocks",
  rock: (id: string) => `/api/v1/rocks/${id}`,

  /** Milestones, optionally scoped to a rock. */
  milestones: "/api/v1/milestones",
  milestonesForRock: (rockId: string) => `/api/v1/rocks/${rockId}/milestones`,
  milestone: (id: string) => `/api/v1/milestones/${id}`,

  /** Action items. */
  todos: "/api/v1/todos",
  todo: (id: string) => `/api/v1/todos/${id}`,

  /** IDS issues. */
  issues: "/api/v1/issues",
  issue: (id: string) => `/api/v1/issues/${id}`,
} as const;
