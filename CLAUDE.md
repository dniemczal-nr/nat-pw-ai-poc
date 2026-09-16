# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Universal **NetReveal (NR)** test core: Playwright Test + TypeScript, UI + SSH.
One repo shape → many NR customer projects via config overlays.

Architecture lives in `docs/architecture.md`. This file is guardrails only.

## Commands

```bash
npm ci && npx playwright install chromium
npm run lint            # tsc --noEmit — run before declaring work done
npm run config:print    # dump resolved config (first stop when anything looks unset)
npm run test:smoke      # @smoke UI: seed, login, shell, logout
npm run test:ui         # project chromium (depends on setup)
npm run test:ssh        # project ssh only
```

Running a subset:

```bash
npx playwright test --project=chromium tests/ui/menu/my-work-screens.spec.ts
npx playwright test --project=chromium --grep "worklist"
npx playwright test --project=ssh tests/ssh/batch-status.spec.ts
npx playwright test --project=chromium --debug tests/ui/<file>.spec.ts
npx playwright test --list              # no browser, no env — safe sanity check
```

## Layout

| Path | Contents |
|---|---|
| `tests/ui/**.spec.ts` | UI specs (project `chromium`) |
| `tests/ssh/**.spec.ts` | Non-UI SSH specs (project `ssh`) |
| `tests/fixtures.ts` | Fixture registry — every spec imports `test` / `expect` from here |
| `tests/auth.setup.ts` | Produces `.auth/user.json` storageState |
| `src/ui/pages/*.ts` | Page objects — all locators live here |
| `src/capabilities/*.ts` | Cross-cutting behaviour (auth, SSH) |
| `src/config/` | Config resolution (`get`, `has`, `getOrDefault`) |
| `specs/*.md` | Agent test plans |

Playwright projects: `setup` → `chromium` (storageState, ignores `/ssh/`) and `ssh` (standalone, no auth).

## Session model

1. `tests/auth.setup.ts` logs in once and writes `.auth/user.json`.
2. Project `chromium` loads that storageState, so every UI spec starts authenticated.
3. `tests/seed.spec.ts` is the reference pattern: authenticated shell assertion, nothing more.

Filtering by file or `--grep` preserves the `setup` dependency, so a single UI spec still authenticates correctly without passing `--project`. Pass `--project` to pick the UI/SSH lane explicitly, not to fix auth.

CI (`.github/workflows/ci.yml`) runs only `npm run lint` and `playwright test --list` — no browser or SSH execution, because live runs need customer environments and secrets. Green CI does not mean the specs pass against a real environment.

## Hard rules

**Test code**
- Import `test` / `expect` from `tests/fixtures.ts`, never from `@playwright/test` directly. Only `tests/fixtures.ts` and `tests/auth.setup.ts` import the raw module.
- Locators belong in `src/ui/pages/*.ts` or `src/capabilities` — never inline CSS/XPath in a spec.
- Prefer role / label / `data-testid`. Avoid absolute XPath and index-based chains.
- Reuse `storageState`; do not re-login inside tests. Dedicated login/logout specs are the only exception and clear it on purpose.
- Register new page objects as fixtures in `tests/fixtures.ts` rather than instantiating them in specs.
- Never `waitForLoadState('networkidle')` or other discouraged/deprecated APIs.
- Keep UI and SSH concerns in their own projects. No Cucumber — it was migrated away from.

**Secrets**
- Never commit `.env`, `config/local.properties`, or `config/projects/<customer>.properties`. Only `*.example.properties` and `.env.example` are tracked.
- Never write a password, token, or host credential into a spec, plan, page object, or tracked properties file. Reference a config/ENV key instead.
- `.env.example` and `config/projects/example.properties` hold placeholders only — no real URLs or hosts.

**Shared QA environments**
- Never run change-password flows against a shared admin account — neither as a test nor as a "fix".
- Do not trigger global actions that disrupt other users (e.g. Services Manager → Reload Configuration).
- Treat data as shared: prefer read-only assertions, and make anything that writes uniquely keyed and self-cleaning.

## Config resolution

`config/default.properties` → `config/local.properties` → `APPLICATION_ENVIRONMENT` → matching ENV / env-file keys → `${…}` interpolation.

The env file itself is picked in this order: `ENV_FILE` (absolute, or relative to the repo root) → `.env` → a single `<name>.env` in the repo root. Two or more `<name>.env` files at once is an error — set `ENV_FILE` to disambiguate. `npm run config:print` reports which file was loaded, and `config.ENV_FILE_LOADED` exposes it. This lets a project branch keep its own `<name>.env` beside the core `.env` instead of swapping files; every `*.env` is gitignored, so only `.env.example` is ever tracked.

Read config through `src/config` (`get` / `has` / `getOrDefault`), never `process.env` scattered through specs. Unresolved `${…}` reaching a test is a config bug — check `npm run config:print`, don't hardcode a fallback.

## Core vs customer project

`main` is the template: placeholders only, no customer URLs or credentials.

Customer work goes on a private fork or a long-lived `project/<name>` branch carrying:
- `config/projects/<name>.example.properties` — overlay template
- `projects/<name>/env.example` + `projects/<name>/README.md`
- extra `specs/` and `tests/` for that customer

Sync core into a project branch with `git merge origin/main`. **Never merge customer credentials or customer-specific overlays back into `main`.** When adding to the core, keep it customer-agnostic.

## Agents

Planner → `specs/*.md` · Generator → `tests/**/*.spec.ts` · Healer → page objects and specs under review.

Definitions live in `.github/agents/*.agent.md`. That is the Copilot / Playwright-MCP agent format and is **not** auto-loaded by Claude Code, which is why their guardrails are mirrored above — keep the two in sync when either changes.

When healing a failure: fix the page object or locator, not the assertion. Do not weaken or delete a check, and do not touch `.env` / `local.properties` to make a test pass. If a test is genuinely correct but the app is broken, mark it `test.fixme()` with a comment describing the actual behaviour.

## Conventions

- Plans go in `specs/`, one plan per feature area, seed reference `tests/seed.spec.ts`.
- Every spec opens with a JSDoc block linking it back to its plan section:
  ```ts
  /**
   * @plan specs/<plan>.md §3
   * @seed tests/seed.spec.ts
   */
  ```
- One `test.describe` per top-level plan item; test titles match scenario names.
- Tests must be order-independent and assume a fresh authenticated session.
