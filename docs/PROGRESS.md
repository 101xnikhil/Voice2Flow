# Voice2Flow - Progress Tracking

## Current Status: Phase 2 Part B (Single-Action Execution & Text Command Pipeline) — COMPLETE ✅

### What was built

#### Phase 1: Authentication, Workspace & Tasks
- Complete Prisma schema for all 10 tables, auth module with refresh token rotation and reuse detection, full task CRUD, optimistic mutations with Undo, responsive AppShell.

#### Phase 2 Part A: Deterministic NLP Core
- Shared Zod schemas (`Intent`, `ParsedCommand`, `Entities`, `CommandResponse`, `WorkflowDefinition`, etc.).
- Injectable `Clock` (`defaultClock`, `FixedClock`).
- Pure date resolver (`nlp/dateResolver.ts`): Chrono-node + Luxon, Monday week-start, explicit day-part assumptions, RRULE recurrence generator.
- Task resolver (`nlp/taskResolver.ts`): Scoped Fuse.js matching with academic stopword preservation, single/ambiguous/none resolution.
- Rules-based parser (`ai/providers/rules/`): 100% deterministic command parser for all 6 core task intents.
- Golden tests: 60+ benchmark command assertions verifying parsing precision.

#### Phase 2 Part B: Single-Action Execution & Text Command Pipeline
1. **Workflow Engine & Actions (`server/src/workflow/`)**:
   - `nodeCatalog.ts`: Catalog of node types, labels, and parameters.
   - `validator.ts`: Graph topology validator (single START, ACTION, END; DAG cycle prevention).
   - `compiler.ts`: Compiles `ParsedCommand` and `ResolvedDate` into executable 3-node workflows.
   - `describe.ts`: Generates human-readable preview steps for UI.
   - `expressions.ts`: Evaluates safe whitelisted condition expressions.
   - Action Registry (`actions/`): `createTask`, `updateTask`, `deleteTask`, `completeTask`, `restoreTask`, `queryTasks`.
     - One DB transaction per node.
     - `originKey = ${executionId}:${nodeId}` for execution idempotency.
     - Every mutation writes an audit entry to `ActivityLog`.
     - `ExecutionStep` recorded for every pipeline stage and workflow node.
   - `engine.ts`: Sequential workflow executor updating `WorkflowExecution` and recording detailed step telemetry.

2. **Command Processing Pipeline (`server/src/modules/commands/processor.ts`)**:
   - Resilient 10-stage command pipeline matching spec §6.1.
   - Resilient AI shell (`server/src/ai/ResilientAIService.ts`) with timeout and deterministic fallback to `RulesProvider`.
   - Ambiguity detection: returns `NEEDS_CLARIFICATION` with option pills when multiple matching tasks are found.
   - Destructive safety: ALWAYS requires confirmation for deletions and bulk actions with verified affected counts, even if `autoExecute: true`.
   - Concurrency safety: Stale-preview 409 Conflict detection and 10-minute expiry on pending previews.
   - Settings integration: Respects `autoExecute` toggle and `autoExecuteThreshold` (0.75 - 0.95).

3. **REST Endpoints (`server/src/modules/`)**:
   - `POST /api/v1/commands`: Submits command text, returns `EXECUTED`, `NEEDS_CONFIRMATION`, or `NEEDS_CLARIFICATION`.
   - `POST /api/v1/commands/:id/confirm`: Confirms pending preview with optional field overrides.
   - `POST /api/v1/commands/:id/cancel`: Cancels pending preview or clarification.
   - `POST /api/v1/commands/:id/resolve`: Resolves ambiguous choice and completes execution.
   - `GET /api/v1/executions`: List user executions with status filters, search, and cursor pagination.
   - `GET /api/v1/executions/:id`: Detailed execution view with full vertical `ExecutionStep` timeline.
   - `POST /api/v1/executions/:id/cancel`: Cancels running or waiting execution.

4. **Client UI Components (`client/src/components/voice/` & `pages/`)**:
   - **Global Command Palette (`CommandPalette.tsx`)**: Global `Cmd/Ctrl+K` modal with instant command submission, preview, clarification, and result cards.
   - **Voice Page (`VoicePage.tsx` at `/app/voice`)**: Conversational command turn feed with natural language text input, example chips, and interactive cards.
   - **Action Preview Card (`ActionPreviewCard.tsx`)**: Displays confidence pill, parsed steps, editable title/category/priority fields, and "Execute Now" / "Cancel" buttons.
   - **Confirmation Card (`ConfirmationCard.tsx`)**: High-contrast destructive warning card with exact affected task counts.
   - **Clarification Card (`ClarificationCard.tsx`)**: Prompts user with selectable option pills and write-in text fallback.
   - **Result Card (`ResultCard.tsx`)**: Action summary with interactive **Undo** button and toggleable **Under The Hood** telemetry drawer.
   - **Confidence Pill (`ConfidencePill.tsx`)**: Score badge with color scale and assumption tooltip, respecting settings toggle.
   - **History Page (`HistoryPage.tsx` at `/app/history`)**: Filterable executions audit log with vertical step-by-step progress timeline.
   - **Settings Page (`SettingsPage.tsx`)**: Added controls for `autoExecute`, `autoExecuteThreshold` slider (75%-95%), and `showConfidence`.

---

### How to test

1. **Automated Quality Gate**:
   ```bash
   npm run check
   ```
   Runs `typecheck` (shared, server, client), `lint` (0 errors, 0 warnings), `test` (10 test files, 113 passing tests), and `build` (production bundles).

2. **GATE Verification Suite**:
   ```bash
   npx tsx scratch/test_gate_e2e.ts
   ```
   Verifies all 4 GATE scenarios against a live database:
   - **GATE 1**: "Create a high priority task to finish my DBMS assignment tomorrow at 6 PM" -> creates task with `priority: HIGH`, `category: ACADEMIC`, `dueAt: tomorrow 18:00 IST`, and records 7 execution steps.
   - **GATE 2**: "Complete my assignment" with 3 matches asks which, presents 3 choices, resolves selection, and marks completed.
   - **GATE 3**: "Delete all my tasks" prompts with exact count (3) and destructive confirmation styling before deleting.
   - **GATE 4**: History endpoint returns execution logs with vertical timeline of steps.

3. **Interactive Testing**:
   - Start the app with `npm run dev`.
   - Open `http://localhost:5173/app/voice`.
   - Press `Cmd/Ctrl+K` to launch the global Command Palette from anywhere in the app.
   - Type commands and inspect the "Under The Hood" step diagnostics and Undo actions.
   - Visit `http://localhost:5173/app/history` to view the execution timeline.

---

### Known gaps / planned next

- Phase 2 complete.
- **Phase 3 (Voice Input, Real-time Speech-to-Text & Audio Feedback)**: Mic capture, Web Audio API level monitoring, Web Speech API / Whisper STT integration, TTS audio feedback, and audio orb animation.

---

### Decisions made

- Recorded in `docs/DECISIONS.md`.

---

### Previous Milestones Completed
- **Phase 1 (Authentication, Workspace & Tasks)**: Complete 10-table Prisma schema, JWT auth with rotation & reuse detection, full task CRUD, optimistic UI with Undo, responsive AppShell, 29 passing tests.
- **Phase 2 Part A (Deterministic NLP Core)**: Shared Zod schemas, injectable clock, pure chrono+luxon date resolver with RRULE, Fuse.js task resolver with academic stopwords, rules parser, 60+ golden benchmark tests.

