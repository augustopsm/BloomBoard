// ─────────────────────────────────────────────────────────────────────────
// Bloom Growth API endpoint map — sourced from the live Swagger spec.
//
// Verified against a live account (2026-06):
//
//   • Auth:                 POST /Token                            (form-encoded)
//   • Current user:         GET  /api/v1/users/mine               → 200
//   • My rocks:             GET  /api/v1/rocks/user/mine          → 200 (array)
//   • A rock's milestones:  GET  /api/v1/rocks/{id}/milestones    → 200 (array)
//   • My to-dos:            GET  /api/v1/todo/users/mine          → 200 (array)
//   • Complete a to-do:     POST /api/v1/todo/{id}/complete?status=bool
//   • My issues (IDS):      GET  /api/v1/issues/users/mine        → 200 (array)
//   • Complete an issue:    POST /api/v1/issues/{id}/complete     body: { complete: bool }
//
// Note: /api/v1/todos/* (plural) are NOT real API paths — they route to the
// SPA. The real paths use singular /api/v1/todo/*.
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
  myTodos: "/api/v1/todo/users/mine",
  todo: (id: string) => `/api/v1/todo/${id}`,
  todoComplete: (id: string, complete: boolean) =>
    `/api/v1/todo/${id}/complete?status=${complete}`,

  /** The current user's IDS issues. */
  myIssues: "/api/v1/issues/users/mine",
  issue: (id: string) => `/api/v1/issues/${id}`,
  issueComplete: (id: string) => `/api/v1/issues/${id}/complete`,

  /** The current user's scorecard (KPI metrics). */
  myScorecard: "/api/v1/scorecard/user/mine",

  // ── Per-user variants (multi-user board) ──────────────────────────────
  /** Rocks owned by a specific user. */
  rocksForUser: (userId: string) => `/api/v1/rocks/user/${userId}`,
  /** To-dos owned by a specific user (singular "todo" is the real path). */
  todosForUser: (userId: string) => `/api/v1/todo/user/${userId}`,
  /** Issues owned by a specific user. */
  issuesForUser: (userId: string) => `/api/v1/issues/users/${userId}`,

  // ── Meeting / L10 ─────────────────────────────────────────────────────
  /** All attendees of an L10 meeting — used to discover team members. */
  meetingAttendees: (meetingId: string | number) =>
    `/api/v1/L10/${meetingId}/attendees`,
  /** All open to-dos for an L10 meeting (all owners). */
  meetingTodos: (meetingId: string | number) =>
    `/api/v1/L10/${meetingId}/todos`,

  // Notes / details pads. Each returns a { URL } pointing at the note's
  // HTML content (no plain-text field exists on the entities themselves).
  notesForTodo: (id: string) => `/api/v1/todo/notes/${id}`,
  notesForIssue: (id: string) => `/api/v1/issues/notes/${id}`,
  notesForRock: (id: string) =>
    `/api/v1/rocks/notes/${id}?showControls=false&readOnly=true`,
} as const;
