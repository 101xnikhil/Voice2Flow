# Voice2Flow

> Natural language voice & text task orchestration. 3rd-year B.Tech CSE mini-project.

## Quickstart (Local Setup)

```bash
docker compose up -d db
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Backend runs on [http://localhost:4000](http://localhost:4000).

---

## Architecture Overview

Voice2Flow is structured as an npm workspaces monorepo:

```
Voice2Flow/
├── shared/   # Universal Zod schemas, constants, and TypeScript types
├── server/   # Node.js + Express + Prisma (PostgreSQL) + Pino + AI service engine
└── client/   # React 18 + Vite + Tailwind CSS + TanStack Query + Zustand
```

- **Client Dev Server:** Runs on port `5173`, automatically proxying `/api` requests to `http://localhost:4000`.
- **Server:** Runs on port `4000`, validating all inputs and environment configurations via Zod.
- **Database:** PostgreSQL managed via Prisma ORM (`server/prisma/schema.prisma`).

---

## Key Scripts

- `npm run dev`: Start server and client concurrently in development mode
- `npm run check`: Run typecheck, linting, tests, and production build
- `npm run typecheck`: Run TypeScript checks across all workspaces
- `npm run lint`: Run ESLint checks (strict no-empty rules)
- `npm test`: Run Vitest across all workspaces
- `npm run build`: Build production bundles for shared, server, and client
- `npm run db:migrate`: Run Prisma migrations
- `npm run db:seed`: Seed the database with demo fixtures
- `npm run db:reset`: Reset database schema and reload seed
