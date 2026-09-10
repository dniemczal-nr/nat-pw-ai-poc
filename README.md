# nat-pw-ai-poc

Universal **NetReveal (NR)** test template: **Playwright Test + TypeScript** (UI + AI Agents) and **Cucumber** (SSH / non-UI).

One repo shape → many NR projects via config overlay / ENV (no customer DNS in code).

```text
UI:      @playwright/test + TypeScript  →  tests/  +  specs/  +  seed + src/ui
Non-UI:  cucumber-js                    →  features/ssh/  (@SSH)
Config:  default.properties (template) → local.properties / ENV (per project)
```

UI agents: **Planner → Generator → Healer** (Playwright ≥ 1.56; this repo uses **1.61.x**).

---

## Stack

| Layer | Technology |
|---|---|
| UI runner | `@playwright/test` + TypeScript |
| UI auth | `storageState` (`.auth/user.json`) via `tests/auth.setup.ts` |
| POM / capabilities | TypeScript (`src/ui/pages`, `src/capabilities/*Auth*.ts`) |
| Non-UI | `@cucumber/cucumber` + `ssh2` |
| Config | template + `config/local.properties` (gitignored) + ENV |
| Agents | `.github/agents/playwright-test-*.agent.md` |

---

## Multi-project setup

1. Install: `npm install` && `npx playwright install chromium`
2. Copy overlay:

```bash
cp config/projects/example.properties config/local.properties
# edit ProjectName, dns.domain, application.environment, ports, hosts
```

3. Secrets via ENV (preferred):

```bash
export APPLICATION_ENVIRONMENT=qa1
export USER_DATA_ADMIN_PASSWORD='…'
export USER_DATA_DEFAULT_PASSWORD='…'
export SSH_KEYFILE=/absolute/path/to/key.ppk
# optional full URL override:
# env ui.baseUrl='https://ui-lb.qa1.example.local:24200/netreveal/login.do' npm run test:ui
```

Resolution order:

1. `config/default.properties` (NR-generic template)
2. `config/local.properties` (optional, gitignored)
3. `APPLICATION_ENVIRONMENT` → `application.environment`
4. `process.env` keys that match property names
5. `${…}` interpolation (config keys, then ENV)

`ui.baseUrl` must resolve without leftover `${…}` or Playwright helpers fail fast.

Print config:

```bash
APPLICATION_ENVIRONMENT=qa1 npm run config:print
```

---

## Layout

```text
tests/                   # Playwright specs + seed + auth.setup
specs/                   # Agent plans (Markdown)
src/ui/pages/            # NR POM (product selectors — shared across projects)
src/capabilities/        # auth (TS) + sshClient (JS)
src/config/              # properties loader + interpolation
config/default.properties
config/projects/example.properties
config/local.properties  # gitignored per-project overlay
features/ssh/            # Cucumber @SSH only
playwright.config.ts
cucumber.js
.github/agents/
```

**UI convention:** locators in POM; specs orchestrate + `expect`; use `storageState` (except login/logout verification tests).

---

## npm scripts

| Script | Purpose |
|---|---|
| `npm run test:ui` | Playwright Test (UI) |
| `npm run test:ssh` | Cucumber `@SSH` |
| `npm test` | UI + SSH |
| `npm run test:e2e` | Alias of `test:ssh` |
| `npm run config:print` | Dump resolved config |

---

## UI — Playwright Test

```bash
env APPLICATION_ENVIRONMENT=qa1 \
  USER_DATA_ADMIN_PASSWORD='…' \
  npm run test:ui
```

- `auth.setup.ts` → `.auth/user.json`
- `seed.spec.ts` — authenticated shell (Generator pattern)
- `tests/ui/*-login.spec.ts` — fresh session (clears `storageState`)

```ts
import { test, expect } from '../fixtures';
```

---

## Playwright AI Agents

- Planner → `specs/*.md`
- Generator → `tests/**/*.spec.ts` (follow seed + POM)
- Healer → POM/spec under review

Guardrails: no re-login per test (`storageState`); prefer role/label/`data-testid`; do not weaken oracles; do not commit secrets.

---

## SSH — Cucumber

```bash
export APPLICATION_ENVIRONMENT=qa1
export SSH_KEYFILE=/absolute/path/to/key.ppk
export BATCH_SERVICE_NAME=your-batch-service

npm run test:ssh
```

---

## CI (recommended)

- PR: `npm run test:ui` (seed + login smoke) against a project overlay in secrets
- Nightly: full UI + `npm run test:ssh`
- Separate jobs for Playwright vs Cucumber World

---

## Extending for a new NR project

1. Add `config/local.properties` (or CI secrets) — do not fork POM for hostname differences
2. Override hosts / credentials only; keep `src/ui/pages` product-level
3. New flows → capability + `tests/ui/*.spec.ts` (+ optional `specs/` plan)

---

## Troubleshooting

| Symptom | Check |
|---|---|
| `ui.baseUrl` unresolved `${…}` | `dns.domain`, `application.environment`, `local.properties`, ENV |
| Auth setup fails | `USER_DATA_ADMIN_PASSWORD`, VPN, `ignoreHTTPSErrors` |
| SSH key missing | `SSH_KEYFILE` / `ssh.keyFile` absolute path |
| Missing browser | `npx playwright install` |

---

## License

UNLICENSED / internal template.
