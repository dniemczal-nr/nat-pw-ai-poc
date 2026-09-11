# Phase 2 – Cucumber World & hooks (archive / superseded)

Originally introduced Cucumber.js as the primary runner (World, Before/After, tags).

## Outcome (current)

**Cucumber removed.** All tests run under Playwright Test.

- No `features/`, step defs, World, or Cucumber hooks.
- Scenario metadata / logging: Playwright fixtures + optional `src/utils/logger.ts`.
- Tags replaced by Playwright projects: `setup` · `chromium` · `ssh`.
