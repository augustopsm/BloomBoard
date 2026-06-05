// Domain types for BloomBoard. These are the *normalized* shapes the UI works
// with — the raw Bloom Growth API payloads are mapped into these in
// `transform.ts`, so the rest of the app never has to care about the API's
// quirky field names or casing.

export type RockStatus = "on-track" | "off-track" | "complete" | "incomplete";

export interface Owner {
  id: string;
  name: string;
  imageUrl?: string;
}

/** A quarterly priority (EOS "Rock"). */
export interface Rock {
  id: string;
  name: string;
  status: RockStatus;
  dueDate: string | null;
  owner: Owner | null;
  /** 0–100, derived from milestone completion when the API omits it. */
  completion: number;
}

/**
 * A step toward completing a Rock. In BloomBoard, milestones are the cards on
 * the Kanban board, grouped and colored by their parent Rock.
 */
export interface Milestone {
  id: string;
  rockId: string | null;
  name: string;
  /** True when marked done in Bloom Growth. */
  complete: boolean;
  dueDate: string | null;
  owner: Owner | null;
}

/** An action item (EOS "To-Do"). */
export interface Todo {
  id: string;
  name: string;
  complete: boolean;
  dueDate: string | null;
  owner: Owner | null;
}

/** An issue to be processed via IDS (Identify, Discuss, Solve). */
export interface Issue {
  id: string;
  name: string;
  description: string | null;
  complete: boolean;
  owner: Owner | null;
}

/** Shape returned by the Bloom `/token` endpoint. */
export interface BloomToken {
  access_token: string;
  token_type?: string;
  expires_in: number;
  userName: string;
  ".issued"?: string;
  ".expires"?: string;
}
