# Voice2Flow - Progress Tracking

## Current Status: Phase 1 (Authentication, Workspace & Tasks) — COMPLETE ✅

### What was built

1. **Database & Schema**:
   - Complete Prisma schema for **ALL 10 tables** in spec §8: `User`, `UserSettings`, `RefreshToken`, `Task`, `Reminder`, `Workflow`, `WorkflowExecution`, `ExecutionStep`, `Notification`, `ConversationSession`, and `ActivityLog`.
   - All enums (`Category`, `Priority`, `TaskStatus`, `Source`, `ReminderType`, `ReminderStatus`, `WorkflowStatus`, `ExecutionStatus`, `NotificationType`, `NotificationChannel`) and indexes defined upfront.
   - Migration `20260927174517_init` applied cleanly to PostgreSQL.

2. **Server Architecture & Endpoints**:
   - **Auth Module (`/api/v1/auth`)**:
     - `POST /register`: Registers user with password validation, hashes with `bcryptjs` (cost 12), seeds `UserSettings`, creates initial session, returns access JWT and sets `httpOnly`, `SameSite=Strict`, `Secure` refresh cookie.
     - `POST /login`: Validates credentials, issues 15-minute access JWT and new refresh token.
     - `POST /refresh`: Refresh token rotation with **reuse detection** (if a revoked token is reused, all active user sessions are immediately revoked for security).
     - `POST /logout`: Revokes the refresh token and clears cookie.
     - `GET /me`: Authenticated user identity and settings.
   - **Users Module (`/api/v1/users`)**:
     - `GET /me` & `PATCH /me`: Read and update profile name/timezone.
     - `POST /me/password`: Current password verification and update with token invalidation.
     - `GET /me/settings` & `PATCH /me/settings`: Workspace preference management.
     - `GET /me/sessions` & `DELETE /me/sessions/:id`: Active device sessions list and revocation.
     - `DELETE /me`: Account deletion requiring password confirmation.
   - **Tasks Module (`/api/v1/tasks`)**:
     - Full CRUD: `GET /tasks`, `POST /tasks`, `GET /tasks/:id`, `PATCH /tasks/:id`.
     - State transitions: `POST /tasks/:id/complete`, `POST /tasks/:id/reopen`.
     - Deletion lifecycle: `DELETE /tasks/:id` (soft delete), `POST /tasks/:id/restore`, `DELETE /tasks/:id/permanent`.
     - `POST /tasks/bulk`: Bulk complete, delete, restore, priority, or category updates.
     - **Strict User Isolation**: Every database operation is scoped by `userId`; requesting another user's task returns `404 Not Found` (never leaking existence).
     - Filtering (`status`, `category`, `priority`, `dueFrom`, `dueTo`, `q`, `tab`), sorting, and cursor pagination.
   - **Activity Logging**: Structured logging of all auth events and task mutations into `ActivityLog`.
   - **Security & Rate Limiting**: Global limiter (300 req/15 min) and auth limiter (10 attempts/15 min per IP+email) with Helmet and CORS.

3. **Client Architecture & UI**:
   - **API Client (`client/src/lib/api/`)**: Typed client storing access JWT strictly in memory, automatically performing a single transparent refresh on 401, and standardizing errors into `AppError`.
   - **Auth Store (`client/src/stores/auth.ts`)**: Zustand store managing authentication state and silent session restore on application load.
   - **Responsive AppShell (`client/src/components/layout/`)**:
     - Desktop (1440px): Full collapsible sidebar with brand, navigation, and user details.
     - Tablet (768px): Icon rail with quick access.
     - Mobile (360px): Bottom navigation with a raised center microphone placeholder ("Coming in the voice phase" per spec).
   - **Tasks View (`client/src/pages/tasks/TasksPage.tsx`)**:
     - Tabs: **Active**, **Completed**, **Overdue**, **Trash** with live count badges.
     - Real-time search, category/priority/sort filters.
     - Dynamic date grouping (Overdue, Today, Tomorrow, This Week, Later, No Date).
     - Create & Edit Task Drawer (bottom sheet on mobile) supporting title, description, category, priority, due date & time, all-day toggle, estimated minutes, person, location, and recurrence presets.
     - Multi-select floating bulk action bar.
     - Optimistic updates with interactive Sonner **Undo** toast for task completion and deletion.
     - Shimmering skeletons and empty state placeholders.
   - **Settings View (`client/src/pages/settings/SettingsPage.tsx`)**: Theme selection (System, Light, Dark), timezone, week start, and default reminder offset.
   - **Profile View (`client/src/pages/profile/ProfilePage.tsx`)**: User profile info, password change, active sessions management with per-device revoke, and delete account modal.

4. **Testing Suite**:
   - Unit tests (`server/src/__tests__/auth.unit.test.ts`):
     - Cost 12 bcryptjs password hashing and verification.
     - Refresh token rotation and automatic reuse detection revocation.
   - Integration tests (`server/src/__tests__/integration.test.ts`):
     - End-to-end Supertest suite executing full registration, login, refresh, profile fetch, task CRUD lifecycle, and verifying cross-user isolation returns 404.
   - **All 29 tests passing** across `shared`, `server`, and `client`.

---

### How to test

1. **Run Automated Quality Gate**:
   ```bash
   npm run check
   ```
   Runs `typecheck` (all 3 workspaces), `lint` (zero errors or warnings), `test` (29 passing tests), and `build` (production bundles).

2. **Run Dev Environment**:
   ```bash
   npm run dev
   ```
   - Client: `http://localhost:5173`
   - Server: `http://localhost:4000`

3. **Verify in Browser**:
   - Navigate to `http://localhost:5173`. Unauthenticated users are redirected to `/login`.
   - Click "Use demo account" or register a new user on `/register`.
   - On `/app/tasks`, click "New Task" to create tasks with priorities, categories, and due dates.
   - Complete a task and test the "Undo" button on the bottom toast.
   - Delete a task to move it to the Trash tab, then restore or permanently delete it.
   - Reload the browser page to verify silent session restore keeps you logged in.
   - Toggle theme (Light / Dark) on `/app/settings` and inspect sessions on `/app/profile`.

---

### Known gaps / planned next

- Phase 1 complete.
- **Phase 2 (Command Pipeline, Basic & Smart Parser, Execution Graph & History)** will implement text command processing, Gemini LLM fallback parser, confirmation/clarification dialogue, and workflow orchestration.

---

### Decisions made

- Recorded in `docs/DECISIONS.md`.
