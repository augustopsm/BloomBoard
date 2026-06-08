# 🌸 BloomBoard

A Kanban board for [Bloom Growth](https://bloomgrowth.com). BloomBoard pulls
your **Rocks**, **Milestones**, **To-Dos** and **Issues (IDS)** from the
[Bloom Growth API](https://help.bloomgrowth.com/en/all-about-the-bloom-growth-api)
and lays your milestones out as draggable cards across workflow columns.

Built with **Next.js (App Router) + TypeScript + Tailwind + dnd-kit**.

---

## How rocks, milestones, todos & IDS are modeled

Bloom organizes work as **Rocks** (quarterly priorities) that contain
**Milestones**, plus standalone **To-Dos** and **Issues** processed via IDS
(Identify · Discuss · Solve). That nesting is awkward to see at a glance in
Bloom itself, so BloomBoard flattens it into a board:

| Bloom concept | In BloomBoard |
| --- | --- |
| **Rock** | A color + entry in the left sidebar. Click to filter. |
| **Milestone** | A **card** on the board, colored by its parent Rock. |
| **To-Do** | A **card** on the board, grouped under a synthetic "To-Dos" lane (they have no parent Rock). |
| **Issue (IDS)** | Available via `/api/issues` (board view planned). |

### The columns

```
┌──────────┬──────────────┬──────────┬────────────┐
│  To Do   │ In Progress  │ Blocked  │  Complete  │
└──────────┴──────────────┴──────────┴────────────┘
```

Bloom milestones only store a `complete` boolean (plus a due date), so a true
multi-stage Kanban needs states Bloom doesn't track. BloomBoard bridges this:

- **Complete** is authoritative — dragging a card here `PATCH`es the
  milestone's `complete` flag in Bloom, syncing for everyone.
- **To Do / In Progress / Blocked** are a **local workflow overlay** stored in
  your browser's `localStorage`. They're a planning aid layered on top of
  Bloom and never change Bloom data. Drag freely between them.

Cards show the owner, due date (with an **Overdue** badge), and a colored dot
matching the parent Rock.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit SESSION_SECRET
npm run dev
```

Open <http://localhost:3000> and sign in with your Bloom Growth email +
password. Credentials are POSTed to Bloom's `/token` endpoint; the returned
bearer token is stored only in a signed, `httpOnly` cookie — it never reaches
client-side JavaScript.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `BLOOM_API_BASE_URL` | Bloom API host. Defaults to `https://app.bloomgrowth.com`. |
| `SESSION_SECRET` | Secret signing the session cookie. `openssl rand -base64 32`. |
| `ASANA_ACCESS_TOKEN` | _(optional)_ Asana Personal Access Token. Enables the "+ Asana" button that turns a card into an Asana task. |
| `ASANA_PROJECT_ID` | _(optional)_ Project gid new Asana tasks are added to (from the project URL). |
| `ASANA_WORKSPACE_ID` | _(optional)_ Fallback workspace gid if no project is set. |

When the Asana variables are set, every card shows a **+ Asana** button that
creates a task named after the card. The task description records its type
(Milestone / To-Do / IDS Issue), the parent Rock (for milestones), the owner,
and a link back to Bloom. Without the variables the button is hidden.

### Deploy to Vercel

This is a standard Next.js app — Vercel auto-detects it.

1. **vercel.com → Add New → Project → Import** the `augustopsm/bloomboard`
   repository. The only branch is the production branch, so it deploys as-is.
2. Framework preset is detected as **Next.js** (build `next build`, no extra
   config needed).
3. Add **Environment Variables** (Production scope):
   - `SESSION_SECRET` — generate with `openssl rand -base64 32` (required;
     without it the cookie signature falls back to an insecure default).
   - `ASANA_ACCESS_TOKEN`, `ASANA_PROJECT_ID` — for the Asana button.
   - `BLOOM_API_BASE_URL` — optional; defaults to `https://app.bloomgrowth.com`.
4. **Deploy**, then open the URL and sign in with your Bloom credentials.

Env vars are read at runtime, so changing them only requires a redeploy — not
a rebuild. `.env.local` is gitignored and never reaches Vercel; the dashboard
values are the source of truth in production.

---

## Architecture

```
src/
├─ app/
│  ├─ login/page.tsx            Login form (client)
│  ├─ page.tsx                  Board page (redirects to /login if no session)
│  └─ api/
│     ├─ auth/{login,logout,session}/   Token exchange + cookie session
│     ├─ board/                 GET rocks + their nested milestones (1 call)
│     ├─ rocks/                 GET normalized rocks
│     ├─ milestones/            GET list, PATCH [id] to toggle complete
│     ├─ todos/                 GET normalized to-dos
│     └─ issues/                GET normalized issues (IDS)
├─ lib/
│  ├─ bloom/
│  │  ├─ endpoints.ts           ⭐ ALL Bloom API paths live here
│  │  ├─ client.ts              Server-only fetch wrapper + login
│  │  ├─ service.ts             High-level fetchers returning domain types
│  │  ├─ transform.ts           Defensive raw → normalized mappers
│  │  └─ types.ts               Normalized domain types
│  ├─ board.ts                  Columns, stage overlay, rock colors
│  ├─ session.ts                Signed httpOnly cookie session
│  └─ api-helpers.ts            requireSession / errorResponse
└─ components/                  BoardApp, Board, Column, MilestoneCard, …
```

### API endpoints (verified against a live account, 2026-06)

| What | Method & path |
| --- | --- |
| Auth | `POST /Token` (form-encoded) |
| Current user | `GET /api/v1/users/mine` |
| My rocks | `GET /api/v1/rocks/user/mine` |
| A rock's milestones | `GET /api/v1/rocks/{rockId}/milestones` |
| My to-dos | `GET /api/v1/todos/user/mine` |
| My issues (IDS) | `GET /api/v1/issues/user/mine` |

Notes from the live payloads:

- Fields are **PascalCase** (`Id`, `Name`, `Owner`, `DueDate`); ids are numbers.
- **Milestones are not embedded in rocks** — they're fetched per rock and
  stamped with their parent `RockId`.
- A milestone's completion is a **string `Status`** (`"Done"`).
- A rock's `Completion` is a **status enum** (`2` = complete), *not* a
  percentage — the board derives real progress % from milestone completion.

All paths live in [`src/lib/bloom/endpoints.ts`](src/lib/bloom/endpoints.ts),
and the probe scripts under [`scripts/`](scripts/) let you re-verify them:
`test-bloom-api.sh` (read endpoints), `test-milestones.sh` (milestone
location), and `test-milestone-write.sh` (confirms the completion-toggle write
contract — the one piece still being finalized).

---

## Roadmap

- [x] To-Dos on the board (synthetic "To-Dos" group)
- [ ] Issues (IDS) on the board
- [ ] Create / edit milestones from the board
- [ ] Owner avatars from Bloom user images
- [ ] Quarter / due-date filtering
