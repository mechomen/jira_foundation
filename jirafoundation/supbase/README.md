# Jirah — Agile project tracking

A Jira-inspired project tracker with projects, Kanban board (drag & drop), backlog, sprints, roadmap, members, comments and issue details.

## Stack
- TanStack Start (React 19) + TanStack Router + TanStack Query
- Tailwind CSS v4 + shadcn/ui
- Lovable Cloud (Postgres + Auth) under the hood

> Note: the brief mentioned MERN. This template uses TanStack Start with Lovable Cloud (Postgres) instead — same end-to-end full-stack capability with auth, DB and RLS managed for you.

## Features
- Email/password authentication with auto-created profile
- Projects with auto-generated issue keys (e.g. `MOB-1`)
- Kanban board: To Do → In Progress → In Review → Done with HTML5 drag-and-drop
- Backlog with sprint creation, start/complete sprint, move issues between sprints
- Roadmap: epic progress + sprint timeline
- Members: invite by email, role management (lead/admin/member/viewer)
- Rich issue detail dialog: inline edit, status/assignee/type/priority/sprint/points, comments
- Row-level security: members only see their own projects' data

## Run locally
```bash
bun install
bun run dev
```

Environment variables are provisioned automatically by Lovable Cloud (`.env`).

## Project structure
```
src/
  routes/
    __root.tsx           # root layout
    login.tsx, signup.tsx
    _app.tsx             # authenticated layout (sidebar + header)
    _app/
      projects.tsx                          # /projects
      your-work.tsx                         # /your-work
      projects.$projectKey.tsx              # tabs layout
      projects.$projectKey.board.tsx        # Kanban
      projects.$projectKey.backlog.tsx      # Sprints + backlog
      projects.$projectKey.roadmap.tsx
      projects.$projectKey.members.tsx
  components/jira/       # AppSidebar, KanbanBoard, IssueDetailDialog, ...
  hooks/use-auth.tsx
  lib/jira-types.ts
```
