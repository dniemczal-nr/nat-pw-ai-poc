# Phase 6 – Governance & reuse (archive)

Guidelines for maintainability, reuse, and avoiding duplication across capabilities.

## Outcome (current)

- **UI:** locators only in POM; specs orchestrate + `expect`; prefer `storageState`.
- **SSH:** thin `SshClient` + specs under `tests/ssh/` (no Gherkin).
- **Config:** one loader; per-NR project via `local.properties` / ENV — do not fork POM for hostnames.
- **Agents:** do not weaken oracles; do not commit secrets; Healer patches under review.
- **Language:** TypeScript only in `src/`, `tests/`, `scripts/` (no application `.js`).
