# nat-pw-ai-poc

NetReveal test framework built on **Playwright Test + TypeScript** (UI + AI Agents) and **Cucumber** (non-UI / SSH).

```text
UI:      @playwright/test + TypeScript  →  tests/  +  specs/  +  seed + src/ui
Non-UI:  cucumber-js                    →  features/ssh/  (@SSH)
Shared:  config (CJS) + TS POM/capabilities
```

UI direction: **Planner → Generator → Healer** (Playwright AI Agents ≥ 1.56; this repo uses Playwright **1.61.x**).

---

## Stack

| Layer | Technology |
|---|---|
| UI runner | `@playwright/test` + TypeScript |
| UI auth | `storageState` (`.auth/user.json`) via `tests/auth.setup.ts` |
| POM / capabilities | TypeScript (`src/ui/pages`, `src/capabilities/*Auth*.ts`) |
| Non-UI | `@cucumber/cucumber` + `ssh2` (JS) |
| Config | `config/default.properties` + ENV overlay |
| Agents | `.github/agents/playwright-test-*.agent.md` (`init-agents --loop=vscode`) |

---

## Prerequisites

- Node.js LTS + npm
- Playwright browsers (`npx playwright install`)
- Access to the target UI / SSH environment (private key kept locally, **not** in git)

---

## Installation

```bash
npm install
npx playwright install chromium
```

---

## Configuration

Baseline: `config/default.properties`.

Resolution order:

1. `default.properties`
2. `process.env` (exact key match, e.g. `ui.baseUrl`)
3. `APPLICATION_ENVIRONMENT` → `application.environment`

Example (hostname from properties + env):

```bash
export APPLICATION_ENVIRONMENT=qa2
```

Direct UI URL (local / lab):

```bash
# zsh: dotted env keys via env, not export
env APPLICATION_ENVIRONMENT=zkb-82 \
  ui.baseUrl='http://10.222.83.97:8080/netreveal/login.do' \
  npm run test:ui
```

UI credentials:

- `userDataAdminUsername` / `userDataAdminPassword` (admin / auth setup)
- `userDataDefaultPassword` (other users in `loginAs(user)`)

Keep secrets in ENV or a local overlay — do not commit passwords.

Print resolved config:

```bash
APPLICATION_ENVIRONMENT=qa2 npm run config:print
```

---

## Layout

```text
tests/
  auth.setup.ts          # login → .auth/user.json
  fixtures.ts            # test/expect + POM/capability fixtures
  seed.spec.ts           # Agent seed (session from storageState)
  ui/
    admin-login.spec.ts
    check-login.spec.ts
specs/                   # Planner Markdown plans
src/
  ui/pages/              # POM (TypeScript)
  ui/browserManager.ts   # resolveBaseUrl / origin / headless
  capabilities/          # auth (TS) + sshClient (JS)
  config/                # properties loader (CJS, shared)
  support/               # Cucumber World/hooks (SSH only)
features/
  ssh/                   # Cucumber @SSH
playwright.config.ts
cucumber.js              # paths: features/ssh only
.github/agents/          # Planner / Generator / Healer
```

**UI convention:** locators live in POM; specs orchestrate + `expect`. Do not re-login in every test — use `storageState` (except tests that verify login itself).

---

## npm scripts

| Script | Purpose |
|---|---|
| `npm run test:ui` | Playwright Test (UI) |
| `npm run test:ssh` | Cucumber `@SSH` |
| `npm test` | UI + SSH |
| `npm run test:e2e` | Alias of `test:ssh` (non-UI) |
| `npm run config:print` | Dump resolved config |

---

## UI — Playwright Test

### Auth setup + seed

```bash
env APPLICATION_ENVIRONMENT=qa2 \
  ui.baseUrl='https://…/netreveal/login.do' \
  npx playwright test tests/seed.spec.ts
```

- Project `setup` writes `.auth/user.json`
- `seed.spec.ts` assumes an authenticated session and asserts the shell header (Generator pattern)

### Login specs (fresh session)

```bash
npx playwright test tests/ui/admin-login.spec.ts tests/ui/check-login.spec.ts
```

These specs intentionally clear `storageState` (they verify login/logout).

### HTML report

```bash
npx playwright test
npx playwright show-report
```

Artifacts: `playwright-report/`, `test-results/` (gitignored).

### Fixtures

Import from `tests/fixtures.ts`, not raw `@playwright/test`:

```ts
import { test, expect } from '../fixtures';
```

---

## Playwright AI Agents

Initialized with `npx playwright init-agents --loop=vscode`:

- Planner → `specs/*.md`
- Generator → `tests/**/*.spec.ts` (follow `seed.spec.ts`, capabilities/POM)
- Healer → POM/spec patches under review

Guardrails:

- do not regenerate auth in every test (`storageState`)
- prefer role/label/`data-testid` when available
- do not weaken business oracles
- do not commit secrets or rewrite passwords in properties

Suggested loop:

1. Planner: plan a flow (e.g. logout) → `specs/…`
2. Generator: specs under `tests/ui/`
3. Run `npm run test:ui`, Healer on failures
4. Review diffs before commit

---

## SSH — Cucumber

```bash
export APPLICATION_ENVIRONMENT=QA1
export SSH_KEYFILE=./config/PRJ-ISP-Key.ppk   # local path, not in git

npm run test:ssh
```

Feature: `features/ssh/batch-status.feature`  
Capability: `src/capabilities/sshClient.js`

---

## CI (recommended)

- PR: `npm run test:ui` (seed + login smoke)
- Nightly: full UI + `npm run test:ssh`
- Keep Cucumber World and Playwright `page` fixtures in separate jobs/scripts

---

## Extending UI

1. Locators / actions → `src/ui/pages/*.ts`
2. Orchestration → `src/capabilities/*.ts`
3. Spec → `tests/ui/*.spec.ts` via fixtures
4. (Optional) Agent plan → `specs/` → Generator

Do not duplicate CSS selectors in Spec and Page.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Wrong host / port | `APPLICATION_ENVIRONMENT`, `ui.baseUrl` (unresolved `${…}` placeholders) |
| Auth setup fails | credentials in properties/ENV, `ignoreHTTPSErrors`, VPN |
| Missing browser | `npx playwright install` |
| zsh + `ui.baseUrl=…` | use `env ui.baseUrl='…' command` (dotted keys cannot `export`) |

---

## License

UNLICENSED / internal PoC.
