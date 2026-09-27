# Voice2Flow

## How to use

1. Create an empty project folder and open it in Antigravity.
2. Put the full spec (`voice2flow_antigravity_prompt.md`) in the folder as `docs/SPEC.md`.
3. Paste **Prompt 0** first. It saves the working rules and scaffolds the project.
4. Then paste the phase prompts **in order, one per session/conversation turn**. Do not paste the next one until the current phase's gate passes and you have tried it in the browser yourself.
5. If Antigravity loses context or you start a new session, paste the **Resume prompt** at the bottom.
6. If a phase produces bugs, paste the **Fix prompt** instead of moving on.

Heavy phases are split (2A/2B and 5A/5B) because they are where generation most often goes wrong.

| Prompt | What you get | You can test |
|---|---|---|
| 0 | Scaffold, tooling, DB, theme | App boots, `/health` works |
| 1 | Auth, tasks, app shell | Register, login, task CRUD |
| 2A | Parsing brain (dates, rules parser, task matching) | Unit tests on golden commands |
| 2B | Command pipeline, engine, text commands, history | Type a command, task is created |
| 3 | Voice UI | Speak a command |
| 4 | LLM providers, clarification, Hinglish | Multi-turn talk, Hindi input |
| 5A | Reminders, scheduler, notifications | Reminder fires in the bell |
| 5B | Multi-step workflow engine | DBMS workflow runs |
| 6 | Workflow builder, Workflows page, Calendar | Visual graph, calendar |
| 7 | Dashboard, search, analytics | Charts and NL search |
| 8 | Landing page, polish, accessibility | Responsive and polished |
| 9 | Seed data, tests, docs, deployment | Demo-ready |

---

## PROMPT 0 — Working rules + scaffold (Phase 0)

```text
You are building Voice2Flow, a 3rd-year B.Tech CSE mini-project. The complete
specification is in docs/SPEC.md. It is the single source of truth. Read it fully now.

STEP 1 — Save working rules
Create docs/WORKING_RULES.md containing exactly these rules, and re-read it at the
start of every future phase:
1. Implement ONLY the phase I ask for. Do not build ahead. Do not leave stubs for
   later phases unless the phase says so.
2. Before coding each phase: write a short plan (files to create/change, risks).
3. No fake functionality: no canned AI replies, no dead buttons, no hardcoded chart data.
4. TypeScript strict, no `any` without a comment, Zod at every trust boundary,
   no empty catch blocks.
5. Never expose API keys to the client. The LLM never touches the database.
6. After each phase run: npm run typecheck && npm run lint && npm test && npm run build.
   Fix everything before finishing. Then start the app and verify the phase's
   features in the browser.
7. At the end of each phase, update docs/PROGRESS.md with: what was built, how to
   test it, known gaps, decisions made (also add one-liners to docs/DECISIONS.md).
8. Do not ask me questions. Where the spec is silent, choose the simplest option
   and record it in docs/DECISIONS.md.

STEP 2 — Phase 0: Scaffold (spec §1.4, §12, §13 Phase 0, §16)
Build:
- npm workspaces monorepo: client (React + Vite + TS + Tailwind), server
  (Node + Express + TS), shared (Zod schemas/constants/types).
- tsconfig.base.json, ESLint (incl. no-empty rule), Prettier, Vitest in all workspaces.
- server: Zod-validated env config (fail fast), pino logger with redaction,
  AppError + central error middleware, requestId middleware, Prisma set up with
  PostgreSQL, docker-compose.yml with a Postgres service, GET /api/v1/health
  (checks DB).
- client: React Router, TanStack Query, Zustand, theme system (system/light/dark,
  no flash), design tokens in styles/tokens.css exactly as in spec §3.2,
  @fontsource fonts (no CDN), a placeholder home page showing the theme toggle.
- Vite dev proxy from client to server (/api).
- Root scripts: dev, build, start, test, lint, typecheck, check, db:migrate,
  db:seed, db:reset.
- .env.example with every variable from spec §16, README with a <=8-line local setup.
- docs/DECISIONS.md and docs/PROGRESS.md started.

GATE: `docker compose up -d db && npm i && npm run db:migrate && npm run dev`
starts both apps; /api/v1/health returns ok; theme toggle works; npm run check passes.
Update docs/PROGRESS.md and STOP. Do not start Phase 1.
```

---

## PROMPT 1 — Auth, database, tasks, app shell (Phase 1)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 1.
Read spec sections: §3 (UI direction), §4 (Tasks, Login, Register, Settings, Profile),
§5 (primitives, layout, tasks components), §8 (database), §9 (auth, user, tasks
endpoints), §10 (security), §11 (error handling).

Build:
DATABASE
- Complete Prisma schema for ALL tables in spec §8 (so later phases need no
  schema redesign), enums, indexes, migrations.

SERVER
- Auth: register, login, refresh, logout, me. bcryptjs cost 12. Access JWT 15 min.
  Refresh token httpOnly/Secure/SameSite=Strict cookie, stored hashed, rotation
  with reuse detection. Password policy from spec §10.
- Users: GET/PATCH /users/me, change password, settings GET/PATCH, sessions list
  and revoke, delete account (with password).
- Tasks: full CRUD, soft delete, restore, reopen, complete, permanent delete,
  bulk endpoint, filters, sorting, cursor pagination. Every query scoped by userId;
  other users' resources return 404.
- ActivityLog entries for auth events and task mutations.
- Rate limiting (global + auth) and helmet/CORS as in spec §10.
- Shared Zod schemas for auth and tasks in the shared workspace.

CLIENT
- Typed API client that keeps the access token in memory, refreshes once on 401,
  and maps errors to AppError.
- Login and Register pages, ProtectedRoute, silent session restore on load.
- AppShell: desktop sidebar, tablet icon rail, mobile bottom nav with a raised
  center mic button (the mic can be a disabled-looking placeholder that says
  "Coming in the voice phase" ONLY in this phase; remove that in Phase 3).
- Tasks page: Active/Completed/Overdue/Trash tabs, filters, sorting, grouping,
  create/edit drawer (bottom sheet on mobile), bulk actions, optimistic updates
  with Undo toast, skeletons, empty states, priority/category chips.
- Settings page (theme, timezone, week start, default reminder offset only;
  other settings are added in later phases) and Profile page (incl. sessions).
- Everything responsive at 360 / 768 / 1440 px, light and dark.

TESTS
- Unit: password hashing, refresh rotation and reuse detection.
- Integration (Supertest, real test DB): register/login/refresh/logout, task CRUD,
  cross-user isolation returns 404.

GATE: register, login, reload (stays logged in), create/edit/complete/delete/restore
tasks, all responsive, npm run check green. Update docs/PROGRESS.md and STOP.
```

---

## PROMPT 2A — Parsing brain (Phase 2, part A)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 2 part A:
the deterministic language-understanding core. No endpoints or UI yet.
Read spec sections: §1.4 (rows 3-5, 17), §6.2, §6.3, §6.6, §6.8 (time-of-day
assumptions), §6.10, §6.11, §14 (unit + golden tests).

Build in the shared workspace:
- Zod schemas: Intent enum, ParsedCommand (exactly as spec §6.3), Entities, filters.
- Constants: confidence thresholds.

Build in server/src:
- lib/clock.ts (injectable Clock).
- nlp/dateResolver.ts: pure functions, chrono-node + luxon, forward-date rule,
  Monday week start, day-part words, "in 2 hours", explicit dates, recurrence
  expressions -> RRULE using floating-local-time then luxon conversion, all
  assumptions recorded. Handle all-day vs timed.
- nlp/taskResolver.ts: Fuse.js matching scoped by userId, single/ambiguous/none
  decisions with configurable thresholds, deleted/completed scopes, stopword
  handling that KEEPS words like "assignment".
- nlp/confidence.ts: finalConfidence formula and decision table from spec §6.8.
- ai/AIService.ts interface (spec §6.4) and ai/providers/rules/: a REAL
  deterministic RulesProvider for English: intent rules, title cleaning,
  category and priority keyword maps, date/time extraction via dateResolver,
  isMultiStep detection (detection only; workflow generation comes in 5B),
  confidence heuristic, destructive scope detection ("delete all").
- ai/languages/index.ts with the LanguagePack interface and the `en` pack only.

TESTS (must be thorough):
- dateResolver: at least 40 cases incl. DST in America/New_York and IST.
- Golden set server/src/tests/golden/commands.json with at least 40 English
  entries (create, complete, delete, reminder, reschedule, queries, gibberish,
  destructive) + a test runner that checks intent and key entities.
- taskResolver: single, ambiguous, none, typo, cross-user isolation.
- The three examples in spec §6.3 must pass exactly.

GATE: npm test green, golden set passes, typecheck/lint green. Update
docs/PROGRESS.md (include the golden-set pass rate) and STOP.
```

---

## PROMPT 2B — Pipeline, engine, text commands, history (Phase 2, part B)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 2 part B.
Read spec sections: §1.2, §1.4 (rows 4-6, 12-13), §2 (F2-F5), §6.1, §6.8, §7.1-7.5
(single-action parts only), §9 (Commands, Executions endpoints), §4.5, §5
(voice/history components used by text), §11.

Build server:
- workflow/nodeCatalog.ts, validator.ts (rules that apply to single-action graphs
  now; structure it so 5B extends it), compiler.ts (intent -> START->ACTION->END),
  describe.ts, engine.ts, expressions.ts (can be minimal), and the action registry:
  createTask, updateTask, deleteTask, completeTask, restoreTask, queryTasks.
  Engine uses one DB transaction per node, originKey idempotency, ExecutionSteps
  for every pipeline stage and node.
- modules/commands: CommandProcessor implementing the pipeline in spec §6.1 using
  the RulesProvider through a ResilientAIService shell (fallback logic can be
  trivial for now, but the import path must be final).
- Endpoints: POST /commands, /commands/:id/confirm, /cancel, /resolve;
  GET /executions, GET /executions/:id, POST /executions/:id/cancel.
- Behavior: clarification when ambiguous, ALWAYS-confirm for deletes with real
  counts, stale-preview 409 on confirm, expiry of pending previews (10 min).
- ActivityLog for every mutation; UserSettings autoExecute + threshold respected.

Build client:
- Global command palette (Cmd/Ctrl+K) and a text-command input on a new
  /app/voice page (mic UI comes in Phase 3, leave the orb area out for now).
- ActionPreviewCard (editable key fields), ClarificationCard with options,
  ConfirmationCard, ResultCard with Undo, ConfidencePill, UnderTheHood panel.
- History page: list + filters + detail timeline with steps (spec §4.5).
- Settings: add auto-execute toggle, threshold slider, show-confidence toggle.

TESTS: integration tests for /commands per intent, confirm flow, stale preview 409,
destructive-always-confirm, clarification round trip, cross-user isolation, and the
"no API key" example command producing 5 successful steps.

GATE: with no AI key, typing "Create a high priority task to finish my DBMS
assignment tomorrow at 6 PM" creates the right task; "Complete my assignment" with
3 matches asks which; "Delete all my tasks" shows the count and confirms; history
shows steps. npm run check green. Update docs/PROGRESS.md and STOP.
```

---

## PROMPT 3 — Voice experience (Phase 3)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 3: voice.
Read spec sections: §1.4 row 2, §2 (F2, F12), §3.4, §3.5, §5 (Voice components),
§11 (mic error rows).

Build client:
- lib/speech/SpeechProvider interface + webSpeechProvider (Web Speech API):
  interim + final results, sttConfidence, locale from settings, clean start/stop.
- hooks: useSpeechRecognition, useAudioLevel (getUserMedia + AudioContext +
  AnalyserNode with full cleanup), useVoiceCommandMachine (explicit finite-state
  machine with a transition table for IDLE, LISTENING, PROCESSING, UNDERSTANDING,
  READY, EXECUTING, SUCCESS, ERROR; ignore illegal transitions and log in dev).
- MicOrb (gradient orb, pulse rings driven by live volume via a CSS variable),
  Waveform (canvas, 60fps, reduced-motion aware, CSS fallback if audio-level
  capture can't run in parallel), TranscriptView (interim vs final),
  PipelineStepper, VoiceStatusLabel, MicPermissionHelp, ExampleChips.
- Voice page: full-focus layout, language toggle (en-IN / hi-IN, persisted),
  text input under the mic using the same pipeline, ConversationThread showing
  turns and clarifications, preview/confirm/result cards from Phase 2.
- Keyboard: Space toggles mic when not typing, Enter submits, Esc cancels.
- Wire the mobile raised center mic button and remove the Phase 1 placeholder.
- Handle: permission denied, no mic, unsupported browser (banner + text fallback),
  no speech, speech network error, offline. Every error has a human message and
  actions ("Try again", "Type instead").
- Send inputMode: 'voice' and sttConfidence to POST /commands so history shows it.

TESTS: state machine transitions; useSpeechRecognition with a mocked API covering
permission denied, no-speech, network error, unsupported.

GATE: in Chrome, click the mic, speak the example command, watch the waveform and
live transcript, see the preview, confirm, see success. Denied-permission and
Firefox paths show clear fallbacks. npm run check green.
Update docs/PROGRESS.md and STOP.
```

---

## PROMPT 4 — LLM providers, clarification, Hinglish (Phase 4)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 4.
Read spec sections: §1.4 rows 4, 15, 16, §2 (F7, F8), §6.4, §6.5, §6.7, §6.8, §6.9,
§6.12, §14 (AI safety tests), §10 (privacy).

Build server:
- Providers: gemini.ts, openai.ts, anthropic.ts using each vendor's structured/JSON
  output mode; model from AI_MODEL env (no hardcoded model names); Zod re-validation
  always.
- ResilientAIService (final version): timeout -> one repair retry -> RulesProvider
  fallback; per-user daily quota; record parser (LLM/RULES), provider, latency,
  promptVersion and the fallback reason on the execution and as a step.
- Prompts in ai/prompts/v1/ exactly per spec §6.5, including injection-safe
  delimiters, control-character stripping and length caps.
- Language packs: `hi` (Hinglish + Devanagari) with lexicon, preNormalize,
  few-shot examples, localized clarification and summary templates. Extend
  RulesProvider so Hinglish/Devanagari works WITHOUT an API key, incl. the
  "kal" tomorrow-vs-yesterday rule with a recorded assumption.
- ConversationSession + slot filling (spec §6.9): guided mode for generic titles,
  skip/cancel words, ordinal resolution ("second one", "dusra"), topic-switch
  detection, 15-min expiry. GET /conversations/active, DELETE /conversations/:id.
- generateClarification / summarizeExecution as deterministic localized templates;
  LLM versions only behind AI_RICH_RESPONSES.
- GET /meta (Smart/Basic mode, languages).

Build client:
- "Smart mode / Basic mode" badge, first-time fallback toast.
- Conversation UI shows assistant questions and quick-reply options, language badge
  on previews, replies in Hinglish when the input was Hinglish.
- Confidence pill tooltip listing assumptions.

TESTS: the conversational example from F7 end to end; Hinglish and Devanagari
examples from spec §6.7; extend the golden set with at least 20 Hinglish/Devanagari
entries; prompt-injection suite (spec §14); provider failure tests (timeout,
invalid JSON, quota -> rules fallback recorded).

GATE: works both with and without an API key. The three Hinglish/Devanagari
examples and the F7 conversation succeed. Injection strings never delete anything
without confirmation. npm run check green. Update docs/PROGRESS.md and STOP.
```

---

## PROMPT 5A — Reminders, scheduler, notifications (Phase 5, part A)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 5 part A.
Read spec sections: §1.4 rows 7, 18, §2 (F9), §7.6, §7.7, §7.8, §9 (Reminders,
Notifications), §5 (notification components), §8 (Reminder, Notification).

Build server:
- Reminder CRUD + snooze. Types ONE_TIME, RECURRING (RRULE), DEADLINE (auto from a
  task's due date minus the user's default offset), WORKFLOW (used in 5B).
  Editing a task's due date updates its deadline reminder; completing/deleting a
  task cancels its pending non-workflow reminders.
- CREATE_REMINDER intent wired end to end through the existing pipeline and a
  createReminder action.
- Recurring tasks: completing one creates the next occurrence.
- workflow/scheduler.ts: in-process poller, claim with FOR UPDATE SKIP LOCKED
  (parameterised raw SQL via tagged templates only), fire reminders, compute the
  next occurrence for recurring ones, stuck-claim reset, heartbeat in /health,
  catch-up on boot, daily purge job (trash >30 days, expired previews/sessions,
  old read notifications). Use the injectable Clock.
- Notification channels: inApp (always), email via nodemailer if SMTP is configured
  else logged, browser channel data for the client.
- Notifications endpoints (list, read, read-all).

Build client:
- NotificationBell with unread badge, list, mark read, Snooze 10 min, Mark done.
- Poll every 30 s and on window focus; toast on new notification; browser
  Notification API when permitted and the tab is hidden; permission button in
  Settings (add notification settings).
- Reminders visible on the Tasks drawer and a simple reminders list in Settings or
  the Tasks page (keep it minimal; the Calendar comes in Phase 6).

TESTS: scheduler tick with fake clock fires due reminders once (no double-fire with
two concurrent ticks), recurring reminder reschedules correctly including DST,
catch-up after simulated downtime, snooze, cancellation on task completion.

GATE: "Remind me every Monday at 8 AM to revise DSA" creates a recurring reminder;
a reminder set 1 minute ahead fires into the bell, toast and browser notification;
restarting the server does not lose it. npm run check green.
Update docs/PROGRESS.md and STOP.
```

---

## PROMPT 5B — Multi-step workflow engine (Phase 5, part B)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 5 part B.
Read spec sections: §1.4 rows 5, 6, 8, 9, §2 (F6), §6.6 (multi-step rule), §6.12,
§7 (all), §9 (Workflows endpoints).

Build server:
- Full nodeCatalog and Zod param schemas for every node type in spec §7.2.
- Full validator with every rejection rule in §7.3 (cycles, missing END, condition
  edges, unreachable, upstream taskRef check, WAIT in the past at creation -> a
  clarification, limits).
- expressions.ts: whitelisted CONDITION expression evaluator. NEVER use eval.
- Engine extensions: WAIT (persist resumeAt, status WAITING), CHECK_STATUS,
  CONDITION branching, REMINDER (immediate, skipIfCompleted), NOTIFICATION, resume
  from currentNodeId, cancel of waiting executions, limits (100 node executions,
  30-day max wait), transient retry.
- Scheduler resumes WAITING executions whose resumeAt is due.
- generateWorkflow in all providers + a deterministic template-based version in
  RulesProvider for the "create + reminder + conditional re-reminder" pattern;
  repair pass; describeWorkflow steps text.
- taskRef handling: NODE and QUERY kinds from the model; server injects ID kind
  after ownership check.
- Workflows CRUD, POST /workflows/validate, POST /workflows/:id/run,
  GET /workflows/node-catalog.

Build client (minimal for this phase):
- Multi-step preview: numbered text steps + a simple read-only graph view (a basic
  React Flow render is fine; the full builder is Phase 6). Confirm/cancel.
- History detail shows node steps and WAITING status.

TESTS: validator (every rule), expression evaluator (unknown var rejected),
engine with fake clock (WAIT pause/resume, both condition branches, reminder skip,
idempotent re-run, failure, limits), and an integration test where the spec §7.9
DBMS command runs to completion through both branches using an injected clock.

GATE: the DBMS multi-step command produces exactly the §7.9 graph shape, previews
it, and after confirm runs across simulated time: 8 AM reminder, 6 PM check, and
10 PM reminder only if the task is still pending. npm run check green.
Update docs/PROGRESS.md and STOP.
```

---

## PROMPT 6 — Workflow Builder, Workflows page, Calendar (Phase 6)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 6.
Read spec sections: §1.4 row 19, §4 (Workflows, Builder, Calendar), §5 (workflow
and calendar components), §9 (Calendar endpoint).

Build client:
- Workflows page: workflow cards (status, node count, last run, next wake-up),
  actions open/run/duplicate/archive, "Running & waiting" strip.
- Workflow Builder with @xyflow/react: custom node components per type (icon,
  colour, status), dagre auto-layout (the AI never outputs positions), minimap,
  zoom/fit, node palette from GET /workflows/node-catalog, NodeInspector that
  generates forms from param schemas, Condition node with True/False handles,
  ValidationPanel highlighting offending nodes using POST /workflows/validate,
  save (same server validator), run, duplicate, archive. Inspect mode read-only
  by default with an Edit toggle. ExecutionOverlay showing per-node state when
  opened from History. Mobile: inspect + edit parameters, pan/zoom.
- Calendar: custom month and week views with luxon, mobile agenda list, day
  drawer, filter toggles per kind, Today button, keyboard nav.

Build server:
- calendar/CalendarProvider interface + LocalCalendarProvider (tasks/deadlines,
  reminders, workflow milestones from WAITING executions),
  GoogleCalendarProvider skeleton that throws NotImplementedError and is not wired
  to any UI.
- GET /calendar/events?from&to&kinds returning the normalised CalendarEvent.
- Settings: disabled "Google Calendar - Coming soon" card.

TESTS: calendar events endpoint (kinds, ranges, timezone boundaries, isolation);
builder: validation error mapping to nodes; save round trip.

GATE: open the DBMS workflow in the builder, see the graph laid out with a
branching Condition node, edit a Wait time, validate, save, run. Calendar shows
tasks, deadlines, reminders and workflow milestones in month and week views and on
mobile. npm run check green. Update docs/PROGRESS.md and STOP.
```

---

## PROMPT 7 — Dashboard, search, analytics (Phase 7)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 7.
Read spec sections: §1.4 row 14, §2 (F10), §4.1, §4.6, §9 (Dashboard, Search,
Analytics), §6.2 (query intents).

Build server:
- TaskQueryService shared by QUERY_TASKS, SEARCH_TASKS, LIST_TODAY_TASKS,
  LIST_UPCOMING_TASKS and GET /search: NL query -> structured filters via the
  parser -> Prisma query + Fuse keyword matching with synonym expansion.
  Response includes interpretedFilters.
- GET /dashboard/summary (one call): greeting data, today's focus, counts,
  productivity % per the spec definition, 7-day series, upcoming tasks and
  reminders, recent executions, recent activity.
- Analytics endpoints (overview, productivity by day/week/month, distribution)
  computed in the user's timezone with luxon bucketing over bounded data, using
  the exact metric definitions in spec §4.6 (completion rate, workflow success
  rate, most productive day, most productive hour).

Build client:
- Dashboard per spec §4.1 with skeletons and empty states, quick-complete
  checkboxes, compact voice card.
- NL search box on Tasks page and inside the command palette, with
  InterpretedFilters chips and SearchResults reused for voice/text query intents.
- Analytics page with Recharts: KPIs, weekly/monthly productivity, category donut,
  priority bar, weekday bars, hour strip, workflow outcomes, deterministic insight
  sentence (only when >= 10 completions), accessible text summaries, theme-aware.

TESTS: analytics against a fixed fixture dataset (known expected numbers, timezone
boundary cases), search interpretation cases from spec §2/F10, dashboard summary
isolation.

GATE: "Show my overdue project tasks", "What's due this week?", "What did I complete
yesterday?" all work by voice/text and via the search box with visible interpreted
filters; dashboard and analytics show real data. npm run check green.
Update docs/PROGRESS.md and STOP.
```

---

## PROMPT 8 — Landing, polish, accessibility (Phase 8)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 8.
Read spec sections: §3 (all), §4 (Landing), §11.

Build:
- Landing page: headline "Turn Your Voice Into Action.", subtitle "Speak
  naturally. Voice2Flow understands your intent, builds the workflow, and gets it
  done.", CTAs "Try Voice2Flow" (-> Register) and "View Demo" (scrolls to the
  interactive example). Interactive example with 3 selectable sample commands that
  animate: typed command -> entity chips -> intent badge -> workflow graph drawing
  itself -> execution log ticking. Fixtures must validate against the shared Zod
  schemas and be labelled "Example". Also the 8-stage pipeline section, feature
  grid, Hinglish highlight, privacy note, footer. Login page "Use demo account".
- Polish pass across the whole app: consistent empty states and skeletons,
  micro-interactions with framer-motion (respecting reduced motion), toast
  consistency, focus management in modals/sheets, offline banner, error boundaries
  per route, 404 page.
- Responsive audit at 360, 768, 1440 px in light and dark; fix every overflow,
  cramped layout and tap target under 44px.
- Accessibility audit against spec §3.5: keyboard-only walkthrough of the full app,
  aria-live on transcript/status, contrast AA both themes, labels and error
  association. Fix what you find.
- Performance: lazy-load Workflow Builder and Analytics, check bundle size, add
  sensible cache headers plan for production.

GATE: Lighthouse accessibility >= 95 on Landing, Dashboard and Voice pages; no
horizontal scroll at 360px; keyboard-only walkthrough works; npm run check green.
Update docs/PROGRESS.md with before/after notes and STOP.
```

---

## PROMPT 9 — Seed, tests, docs, deployment (Phase 9)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Implement ONLY Phase 9 and then
do a final review against spec §17.
Read spec sections: §14, §15, §16, §17.

Build:
- Seed script exactly per spec §15: deterministic, relative to the current date,
  demo user demo@voice2flow.dev / Demo@1234, ~40 tasks (ambiguous DBMS/OS/CN
  assignments included), reminders, 3 workflows incl. one WAITING execution,
  ~20 past executions with steps (LLM/RULES, voice/text, en/hinglish, failed,
  cancelled, expired), notifications, activity logs. npm run demo:reset.
- Playwright E2E smoke tests from spec §14: register -> text command -> task
  appears -> history shows 5 steps; ambiguous complete -> pick option; delete all
  -> confirm -> undo; multi-step preview renders; mobile bottom nav; theme toggle.
- Fill any test gaps against the §14 lists; `npm run check` runs typecheck, lint,
  unit, integration and build.
- Multi-stage Dockerfile (non-root runtime), Express serving client/dist with SPA
  fallback, prisma migrate deploy at start, render.yaml, startup log lines for
  AI mode and scheduler.
- Verify no secrets reach the client bundle (grep the build output and document
  the check).
- README: feature list, setup, architecture diagrams in Mermaid (pipeline, engine
  state machine, ER diagram), spec-feature -> code map, 5-minute demo script,
  limitations (incl. sleeping free hosts and the browser speech service), future
  work. docs/api.md, docs/architecture.md, docs/ai-prompts.md.

FINAL REVIEW: go through every item of spec §17 (Definition of Done), mark each
PASS/FAIL in docs/PROGRESS.md with how you verified it, and fix every FAIL.

GATE: fresh clone -> docker compose + seed -> demo account works end to end;
npm run check green; Docker image builds and runs. STOP.
```

---

## FIX PROMPT (use when a phase has bugs)

```text
Read docs/WORKING_RULES.md and docs/PROGRESS.md. Do NOT start a new phase.
Problem: <describe exactly what you did, what you expected, what happened;
paste the error message or console output>.
Find the root cause (not a workaround), fix it, add a regression test, run
npm run check, verify in the browser, and add a line to docs/PROGRESS.md under
"Bugs fixed". Do not change unrelated code.
```

## RESUME PROMPT (new session or lost context)

```text
Read docs/SPEC.md, docs/WORKING_RULES.md, docs/PROGRESS.md and docs/DECISIONS.md.
Inspect the repository and tell me: (1) which phases are complete according to
their gates, (2) anything broken or incomplete, (3) the exact next phase. Run
npm run check and report the result. Do not write code yet. Wait for my next
phase prompt.
```

## Tips

- Commit to git after every passing gate (`git commit -am "phase N done"`). If a phase goes badly, you can roll back and retry with the Fix prompt.
- Test each phase yourself in the browser before moving on. The gates tell you exactly what to try.
- Add your AI key to `.env` only from Phase 4 onward (Gemini has a free tier). Phases 0-3 and 5-9 all work with no key.
- If Antigravity starts building ahead, reply: "Stop. Re-read docs/WORKING_RULES.md rule 1 and revert anything outside this phase."
