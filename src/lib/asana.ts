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

export interface AsanaSection {
  gid: string;
  name: string;
}

/** Fetch all sections in the configured project. Throws AsanaError on failure. */
export async function getProjectSections(): Promise<AsanaSection[]> {
  const token = process.env.ASANA_ACCESS_TOKEN;
  const projectId = process.env.ASANA_PROJECT_ID;
  if (!token || !projectId) throw new AsanaError("Asana is not configured on the server.", 503);

  const res = await fetch(
    `${ASANA_BASE}/projects/${projectId}/sections?opt_fields=gid,name`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AsanaError(`Could not fetch Asana sections (${res.status}). ${body.slice(0, 200)}`, res.status);
  }
  const json = (await res.json()) as { data?: { gid: string; name: string }[] };
  return (json.data ?? []).map((s) => ({ gid: s.gid, name: s.name }));
}

/** Move a task into a section (adds task to the section within its project). */
export async function moveTaskToSection(taskGid: string, sectionGid: string): Promise<void> {
  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token) throw new AsanaError("Asana is not configured on the server.", 503);

  const res = await fetch(`${ASANA_BASE}/sections/${sectionGid}/addTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { task: taskGid } }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AsanaError(`Could not move Asana task (${res.status}). ${body.slice(0, 200)}`, res.status);
  }
}

export interface AsanaProject {
  gid: string;
  name: string;
  url: string;
}

/** Fetch the configured project's name and permalink. */
export async function getProjectInfo(): Promise<AsanaProject> {
  const token = process.env.ASANA_ACCESS_TOKEN;
  const projectId = process.env.ASANA_PROJECT_ID;
  if (!token || !projectId) throw new AsanaError("Asana is not configured on the server.", 503);

  const res = await fetch(
    `${ASANA_BASE}/projects/${projectId}?opt_fields=gid,name,permalink_url`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AsanaError(`Could not fetch Asana project (${res.status}). ${body.slice(0, 200)}`, res.status);
  }
  const json = (await res.json()) as { data?: { gid: string; name: string; permalink_url: string } };
  return {
    gid: json.data?.gid ?? projectId,
    name: json.data?.name ?? "Asana Project",
    url: json.data?.permalink_url ?? "",
  };
}

/** Check whether a task still exists in Asana. Returns false on 404 (deleted). */
export async function taskExists(taskGid: string): Promise<boolean> {
  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token) throw new AsanaError("Asana is not configured on the server.", 503);

  const res = await fetch(`${ASANA_BASE}/tasks/${taskGid}?opt_fields=gid`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AsanaError(`Could not check Asana task (${res.status}). ${body.slice(0, 200)}`, res.status);
  }
  return true;
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
