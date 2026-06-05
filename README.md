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
| **To-Do** | Available via `/api/todos` (board view planned). |
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

---

## Architecture

```
src/
├─ app/
│  ├─ login/page.tsx            Login form (client)
│  ├─ page.tsx                  Board page (redirects to /login if no session)
│  └─ api/
│     ├─ auth/{login,logout,session}/   Token exchange + cookie session
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

### ⚠️ A note on API endpoint paths

Bloom's Swagger requires a token to inspect, so only two routes are confirmed
from the public docs: `POST /token` and `GET /api/v1/scorecard/items/`. The
remaining resource paths in [`src/lib/bloom/endpoints.ts`](src/lib/bloom/endpoints.ts)
follow Bloom's `/api/v1/<resource>` convention but **should be verified against
your account's Swagger** (`https://app.bloomgrowth.com/swagger/index.html`).
Everything funnels through that one file, so if a path differs you only fix it
in one place — the rest of the app uses normalized types and won't change.

---

## Roadmap

- [ ] Dedicated boards/tabs for To-Dos and Issues (IDS)
- [ ] Create / edit milestones from the board
- [ ] Owner avatars from Bloom user images
- [ ] Quarter / due-date filtering
