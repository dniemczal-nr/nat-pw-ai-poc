# nat-pw-ai-poc

Universal **NetReveal (NR)** test **core** on **Playwright Test + TypeScript** (UI + SSH).

One repo shape → many NR projects via `.env` / `config/local.properties` (no customer secrets on `main`).

```text
UI:   @playwright/test  →  tests/ui + seed + auth.setup  (project: chromium)
SSH:  @playwright/test  →  tests/ssh                     (project: ssh)
Shared: TypeScript config + POM + capabilities
```

Agents: **Planner → Generator → Healer** (Playwright ≥ 1.56; repo uses **1.61.x**).

---

## Stack

| Layer | Technology |
|---|---|
| Runner | `@playwright/test` + TypeScript |
| UI auth | `storageState` via `tests/auth.setup.ts` |
| POM / capabilities | TypeScript (`src/ui`, `src/capabilities`) |
| SSH | `SshClient` + `tests/ssh/*.spec.ts` |
| Config | `default.properties` + `local.properties` + `.env` + `${…}` |
| Agents | `.github/agents/playwright-test-*.agent.md` |

---

## Quick start (onboarding)

```bash
npm ci
npx playwright install chromium

cp .env.example .env
cp config/projects/example.properties config/local.properties
# edit .env / local.properties — never commit either file
```

Minimum for UI smoke:

| Variable / key | Purpose |
|---|---|
| `ui.baseUrl` | Full NetReveal login URL |
| `userDataAdminUsername` | Admin user (default `admin`) |
| `USER_DATA_ADMIN_PASSWORD` | Admin password (via `.env`) |

Optional SSH:

| Variable | Purpose |
|---|---|
| `ssh.host` / `ssh.user` | Batch host |
| `SSH_KEYFILE` | Absolute path to private key |
| `BATCH_SERVICE_NAME` | systemd unit for batch status check |

```bash
npm run config:print
npm run test:smoke
```

## NAT dashboard

```bash
npm run nat            # http://127.0.0.1:4747  (NAT_PORT to change)
```

A local UI for running the suite: pick tests (per file or per test), browsers / projects, worker count and an optional `--grep`, follow the live output, then open the run report — pass rate, outcome per file and project, duration per file, failures with messages, slowest tests and a filterable table. Every run also keeps the native Playwright HTML report (traces, screenshots). Artefacts live in `.nat/runs/<id>/` (gitignored).

**Environments.** One project usually has several targets (QA, UAT, …). The Environment dropdown lists every `.env` / `<name>.env` in the repo root plus environments imported through the dashboard — a file in the `.env.example` format (download the template from the import panel), saved as `.nat/envs/<name>.env` (gitignored, mode 600). The selection is passed to Playwright as `ENV_FILE`, and the panel shows the resolved `ui.baseUrl` before you run so you never hit the wrong system. Each run's report records which environment it ran against.

Firefox and WebKit projects are defined but their browsers are optional: `npx playwright install firefox webkit`.

Resolution order: `default.properties` → `local.properties` → `APPLICATION_ENVIRONMENT` → matching ENV / `.env` keys → `${…}` interpolate.

---

## Core vs project (branch or fork?)

| Approach | When |
|---|---|
| **Private fork per customer** | Strong isolation, separate secrets/CI, different teams — **preferred for production customers** (e.g. UNIQA) |
| **Long-lived project branch** in this repo | Same team, quick experiments, still gitignore `.env` + `local.properties` |

**Core `main`:** template only — placeholder `.env.example`, no real URLs/passwords.  
**Project fork/branch:** customer `.env`, overlays, extra specs, CI secrets.

Do **not** merge UNIQA (or other) credentials back into core `main`.

---

## Layout

```text
tests/
  auth.setup.ts
  fixtures.ts
  seed.spec.ts
  ui/*.spec.ts             # login, shell header, logout, …
  ssh/*.spec.ts
specs/                     # Agent plans (e.g. netreveal-admin.md)
docs/architecture.md       # core map (phase0–6 = archive)
src/config · ui · capabilities · utils
config/default.properties
config/projects/example.properties
.env.example               # placeholders only
playwright.config.ts       # setup | chromium | ssh
.github/agents/
.github/workflows/ci.yml
```
---

## npm scripts

| Script | Purpose |
|---|---|
| `npm test` | All Playwright projects |
| `npm run test:ui` | chromium (depends on setup) |
| `npm run test:ssh` | SSH project only |
| `npm run test:smoke` | `@smoke` UI (seed, login, shell, logout) |
| `npm run lint` | `tsc --noEmit` |
| `npm run config:print` | Dump resolved config |
| `npm run test:ssh:batch` | Manual SSH smoke script |

---

## UI

```bash
npm run test:ui
```

- `auth.setup` → `.auth/user.json`
- Import `test` / `expect` from `tests/fixtures.ts`
- Login specs clear `storageState` on purpose

---

## SSH

```bash
export SSH_KEYFILE=/absolute/path/to/key.ppk
export BATCH_SERVICE_NAME=your-batch-unit
npm run test:ssh
```

No browser / auth.setup dependency.

---

## Playwright AI Agents

- Planner → `specs/*.md`
- Generator → `tests/**/*.spec.ts` (follow seed + POM)
- Healer → POM/spec under review

Guardrails (also in agent defs): use `storageState`; no secrets in specs/plans; no change-password on shared admin; prefer role/label/`data-testid`.

---

## CI

`.github/workflows/ci.yml` on `main` / PRs: `npm ci` → `tsc` → `playwright test --list`.  
Live env runs stay on project forks with Actions secrets.

---

## Extending

1. New NR project → fork or branch + `.env` / `local.properties`  
2. UI flow → POM + capability + `tests/ui`  
3. SSH check → `SshClient` + `tests/ssh`  
4. Optional plan → `specs/` → Generator  

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Unresolved `ui.baseUrl` | `.env` / `local.properties` |
| Auth fails | `USER_DATA_ADMIN_PASSWORD`, VPN / network |
| SSH key / host | `SSH_KEYFILE`, `ssh.host` |
| Batch assert | `BATCH_SERVICE_NAME` |

---

## License

UNLICENSED / internal template.
