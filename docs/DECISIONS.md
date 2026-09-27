# Voice2Flow - Architectural Decisions Log

This document records resolved design decisions and choices made during implementation.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-22 | npm workspaces monorepo (`client`, `server`, `shared`) | Clean separation of concerns with shared TypeScript types and Zod schemas without code duplication. |
| 2026-09-22 | ESLint flat configuration (`eslint.config.mjs`) | Standard for ESLint v9+ ensuring unified rules (including strict `no-empty` blocks) across all workspaces. |
| 2026-09-22 | PostgreSQL via Prisma ORM | Strong schema typing, automatic migrations, and native JSONB column support for execution context/definitions. |
| 2026-09-22 | Centralized `AppError` and requestId propagation | Standardized API error format `{ error: { code, message, details?, requestId } }` ensuring no raw stacks leak to clients. |
| 2026-09-22 | CSS variable design tokens in `client/src/styles/tokens.css` | Spec §3.2 exact tokens with Tailwind CSS integration, zero CSS-in-JS runtime overhead, and instant no-flash theme switching. |
| 2026-09-22 | Local fonts via `@fontsource` | Eliminates external CDN dependencies for UI fonts (`@fontsource/inter`) and monospace code fonts (`@fontsource/jetbrains-mono`). |
| 2026-09-22 | Fail-fast environment variable validation with Zod | Server immediately halts at boot with clear diagnostics if required variables are missing or misconfigured. |
| 2026-09-22 | Development proxy (`/api` -> `http://localhost:4000`) | Seamless local development avoiding cross-origin cookies or CORS complexity. |
