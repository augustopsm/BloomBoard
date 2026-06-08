// Server-side Asana client. Imported ONLY from API routes so the Personal
// Access Token is never bundled to the browser.
//
// Configuration (environment variables):
//   ASANA_ACCESS_TOKEN  – a Personal Access Token (Asana → Settings → Apps →
//                         Developer apps → Manage Personal Access Tokens).
//   ASANA_PROJECT_ID    – the gid of the project new tasks are added to.
//   ASANA_WORKSPACE_ID  – (optional) used only if no project id is set.
//
// A task needs at least a project or a workspace; we prefer the project.

const ASANA_BASE = "https://app.asana.com/api/1.0";

export class AsanaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AsanaError";
  }
}

export function asanaConfigured(): boolean {
  return Boolean(
    process.env.ASANA_ACCESS_TOKEN &&
      (process.env.ASANA_PROJECT_ID || process.env.ASANA_WORKSPACE_ID),
  );
}

export interface CreateTaskInput {
  name: string;
  notes: string;
  /** ISO date; only the YYYY-MM-DD part is sent to Asana as due_on. */
  dueDate?: string | null;
}

export interface CreatedTask {
  gid: string;
  url: string;
}

/** Create a task in the configured Asana project/workspace. */
export async function createAsanaTask(
  input: CreateTaskInput,
): Promise<CreatedTask> {
  const token = process.env.ASANA_ACCESS_TOKEN;
  const projectId = process.env.ASANA_PROJECT_ID;
  const workspaceId = process.env.ASANA_WORKSPACE_ID;

  if (!token || (!projectId && !workspaceId)) {
    throw new AsanaError("Asana is not configured on the server.", 503);
  }

  const data: Record<string, unknown> = {
    name: input.name,
    notes: input.notes,
  };
  if (projectId) data.projects = [projectId];
  else data.workspace = workspaceId;

  // Asana wants due_on as a plain date.
  if (input.dueDate) {
    const d = new Date(input.dueDate);
    if (!Number.isNaN(d.getTime())) {
      data.due_on = d.toISOString().slice(0, 10);
    }
  }

  const res = await fetch(`${ASANA_BASE}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AsanaError(
      `Asana task creation failed (${res.status}). ${body.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    data?: { gid?: string; permalink_url?: string };
  };
  return {
    gid: json.data?.gid ?? "",
    url: json.data?.permalink_url ?? "",
  };
}
