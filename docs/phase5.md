# Phase 5 – Reporting & CI (archive / not done)

Planned Allure + Jenkins Freestyle integration with Cucumber formatters.

## Outcome (current)

- Playwright HTML reporter + list reporter (`playwright.config.ts`).
- Artifacts: `playwright-report/`, `test-results/` (gitignored).
- Allure / Jenkins Freestyle: **not wired** — use Playwright report or add later if needed.
- Suggested CI: PR → `npm run test:ui`; nightly → `npm test` (UI + SSH) with project secrets.
