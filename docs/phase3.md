# Phase 3 – UI / Playwright + POM (archive)

UI automation and Page Object Model; originally wired through Cucumber `@ui`.

## Outcome (current)

- Playwright projects: `setup` (auth → storageState) + `chromium`.
- POM: `src/ui/pages/*.ts` · capabilities: `*AuthCapability.ts`.
- Specs: `tests/seed.spec.ts`, `tests/ui/*.spec.ts` · fixtures: `tests/fixtures.ts`.
- Agents: seed + `specs/` for Planner → Generator → Healer.
- URL helpers: `src/ui/browserManager.ts` (no browser launch — fixtures own lifecycle).
