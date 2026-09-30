# Architecture — NetReveal Playwright core

Short map of the **core** template (`main`). Phase docs (`docs/phase0–6.md`) are archive only.

## Runtime

| Concern | Location |
|---|---|
| Runner | Playwright Test + TypeScript (`playwright.config.ts`) |
| Projects | `setup` (auth) → `chromium` / `firefox` / `webkit` (UI) · `ssh` (non-UI) |
| NAT dashboard | `dashboard/` — local runner UI + run reports, artefacts in `.nat/runs/` |
| Config | `config/default.properties` + `local.properties` + `.env` + `${…}` |
| UI POM | `src/ui/pages/*.ts` |
| Capabilities | `src/capabilities/*` (auth, SSH) |
| Specs | `tests/ui`, `tests/ssh`, `tests/seed.spec.ts` |
| Agent plans | `specs/*.md` |
| Agents | `.github/agents/playwright-test-*.agent.md` |

## Session model

1. `tests/auth.setup.ts` logs in once → `.auth/user.json`
2. `chromium` loads `storageState` — specs must not re-login (except login/logout tests)
3. Seed (`tests/seed.spec.ts`) is the Agent pattern: authenticated shell assertion

## Multi-project

- **Core `main`:** no customer secrets (`.env.example` placeholders only)
- **Customer work:** private **fork** (preferred) or long-lived project branch + gitignored `.env` / `local.properties`

## Scripts

| Script | Role |
|---|---|
| `test:smoke` | `@smoke` UI (seed, login, shell, logout) |
| `test:ui` / `test:ssh` | Full UI or SSH project |
| `lint` | `tsc --noEmit` |
| `config:print` | Resolved config dump |
| `nat` | NAT dashboard on `127.0.0.1:4747` — select tests / projects / workers, live output, HTML report |

## Conventions

- Locators in POM; specs orchestrate + `expect`
- Import `test`/`expect` from `tests/fixtures.ts`
- Prefer role / label / `data-testid`; heal POM, not secrets
- Change-password on shared QA admin: out of scope / `test.skip`
