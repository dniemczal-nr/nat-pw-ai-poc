# Phase 0 – Architecture (archive)

Original blueprint for a multi-capability NR test framework (UI + REST + DB + SSH + MQ).

## Outcome (current)

- **Runner:** Playwright Test + TypeScript only (UI + SSH).
- **Layout:** `tests/` · `src/ui` · `src/capabilities` · `src/config` · `specs/` (agents).
- **Config:** `config/default.properties` + optional `local.properties` + ENV + `${…}` interpolation.
- **Out of scope for now:** REST/DB/MQ clients, Allure, Jenkins Freestyle (see later phases).

## Naming (kept)

| Area | Convention |
|------|------------|
| UI pages | `*Page.ts` under `src/ui/pages` |
| Capabilities | `*Capability.ts` / `sshClient.ts` |
| Specs | `tests/**/*.spec.ts` + `tests/auth.setup.ts` |
| Agent plans | `specs/*.md` |
