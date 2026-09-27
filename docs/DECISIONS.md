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
| 2026-09-27 | Complete Prisma schema for all 10 spec §8 tables | Designed and migrated all tables, enums, foreign keys, and indexes in Phase 1 so subsequent phases need no schema redesign. |
| 2026-09-27 | Refresh token rotation with reuse detection | Refresh tokens stored as SHA-256 hashes in `RefreshToken` table; on refresh, old token revoked and linked to replacement; reused tokens revoke all active user sessions immediately. |
| 2026-09-27 | bcryptjs cost 12 password hashing & policy | 12 salt rounds balancing CPU security and responsiveness; strict regex requiring min 8 chars with letters & numbers. |
| 2026-09-27 | Client in-memory access token & silent refresh | Access JWT stored strictly in memory (never localStorage); transparent single refresh on 401; silent restore on app initialization. |
| 2026-09-27 | Strict multi-tenant isolation via 404 Not Found | All task queries scope `where: { id, userId }`; attempting to query, mutate, or delete another user's task returns standard 404 rather than 403 to prevent existence leakage. |
| 2026-09-27 | Responsive AppShell with raised placeholder mic | Desktop full sidebar, tablet icon rail, mobile bottom nav with disabled raised mic placeholder ("Coming in the voice phase" per spec) to be enabled in Phase 3. |
| 2026-09-27 | Optimistic task mutations with Sonner Undo toast | Completing, deleting, or restoring tasks immediately updates query cache with an interactive Undo toast that reverts the mutation. |
