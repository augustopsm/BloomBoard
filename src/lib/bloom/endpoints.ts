// ─────────────────────────────────────────────────────────────────────────
// Bloom Growth API endpoint map.
//
// Every path the app hits lives here so that if Bloom's routes differ from
// what's assumed below, there is exactly ONE place to fix it.
//
// Confirmed from Bloom's docs
// (https://help.bloomgrowth.com/en/all-about-the-bloom-growth-api):
//
//   • Auth:  POST https://app.bloomgrowth.com/Token   (form-encoded body)
//   • "My items" reads use a `/user/mine` suffix, e.g.
//       GET /api/v1/scorecard/user/mine
//
// The resource paths below follow that same `/api/v1/<resource>/user/mine`
// convention. They should be verified against the live Swagger
// (https://app.bloomgrowth.com/swagger/index.html) with your token, but the
// `/user/mine` shape is taken straight from the documented metrics example.
//
// NOTE on milestones: in Bloom, milestones live *inside* rocks, so there is no
// top-level milestones list — they're extracted from each rock's payload (see
// service.ts / transform.ts). The per-milestone path here is only used for the
// completion toggle (PUT).
// ─────────────────────────────────────────────────────────────────────────

export const BLOOM_BASE_URL =
  process.env.BLOOM_API_BASE_URL?.replace(/\/$/, "") ??
  "https://app.bloomgrowth.com";

export const endpoints = {
  /** OAuth-style token endpoint (form-encoded body). */
  token: "/Token",

  /** The authenticated user. */
  me: "/api/v1/users/mine",

  /** The current user's quarterly priorities (milestones come embedded). */
  myRocks: "/api/v1/rocks/user/mine",
  rock: (id: string) => `/api/v1/rocks/${id}`,

  /** Milestone completion toggle. Milestones are read via their parent rock. */
  milestone: (id: string) => `/api/v1/milestones/${id}`,

  /** The current user's action items. */
  myTodos: "/api/v1/todos/user/mine",
  todo: (id: string) => `/api/v1/todos/${id}`,

  /** The current user's IDS issues. */
  myIssues: "/api/v1/issues/user/mine",
  issue: (id: string) => `/api/v1/issues/${id}`,
} as const;
