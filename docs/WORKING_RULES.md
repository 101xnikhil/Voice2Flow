# Voice2Flow Working Rules

These rules are non-negotiable and must be re-read at the start of every future phase:

1. Implement ONLY the phase I ask for. Do not build ahead. Do not leave stubs for later phases unless the phase says so.
2. Before coding each phase: write a short plan (files to create/change, risks).
3. No fake functionality: no canned AI replies, no dead buttons, no hardcoded chart data.
4. TypeScript strict, no `any` without a comment, Zod at every trust boundary, no empty catch blocks.
5. Never expose API keys to the client. The LLM never touches the database.
6. After each phase run: npm run typecheck && npm run lint && npm test && npm run build. Fix everything before finishing. Then start the app and verify the phase's features in the browser.
7. At the end of each phase, update docs/PROGRESS.md with: what was built, how to test it, known gaps, decisions made (also add one-liners to docs/DECISIONS.md).
8. Do not ask me questions. Where the spec is silent, choose the simplest option and record it in docs/DECISIONS.md.
