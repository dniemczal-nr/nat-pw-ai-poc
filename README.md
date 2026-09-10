# nat-pw-ai-poc

Universal **NetReveal (NR)** test template on **Playwright Test + TypeScript** (UI and SSH).

One repo shape → many NR projects via config overlay / ENV (no customer DNS in code).

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
| Config | template + `config/local.properties` + ENV + `${…}` |
| Agents | `.github/agents/playwright-test-*.agent.md` |

---

## Multi-project setup

```bash
npm install
npx playwright install chromium

cp config/projects/example.properties config/local.properties
# edit ProjectName, dns.domain, environment, hosts

export APPLICATION_ENVIRONMENT=qa1
export USER_DATA_ADMIN_PASSWORD='…'
export USER_DATA_DEFAULT_PASSWORD='…'
export SSH_KEYFILE=/absolute/path/to/key.ppk
export BATCH_SERVICE_NAME=your-batch-unit
```

Resolution: `default.properties` → `local.properties` → `APPLICATION_ENVIRONMENT` → matching ENV keys → `${…}` interpolate.

```bash
npm run config:print
```

---

## Layout

```text
tests/
  auth.setup.ts
  fixtures.ts              # UI + ssh fixtures
  seed.spec.ts
  ui/*.spec.ts
  ssh/*.spec.ts
specs/                     # Agent plans
src/
  config/index.ts
  ui/pages/*.ts
  capabilities/*Auth*.ts
  capabilities/sshClient.ts
  utils/logger.ts
config/default.properties
config/projects/example.properties
playwright.config.ts       # projects: setup | chromium | ssh
.github/agents/
```

---

## npm scripts

| Script | Purpose |
|---|---|
| `npm test` | All Playwright projects |
| `npm run test:ui` | setup + chromium (UI) |
| `npm run test:ssh` | SSH project only |
| `npm run lint` | `tsc --noEmit` |
| `npm run config:print` | Dump resolved config |
| `npm run test:ssh:batch` | Manual SSH smoke script |

---

## UI

```bash
npm run test:ui
```

- `auth.setup` → `.auth/user.json`
- Specs import `test` / `expect` from `tests/fixtures.ts`
- Login specs clear `storageState` on purpose

---

## SSH

```bash
export SSH_KEYFILE=/absolute/path/to/key.ppk
export BATCH_SERVICE_NAME=your-batch-unit
npm run test:ssh
```

Migrated from former Cucumber `@SSH` feature. No browser/auth dependency.

---

## Playwright AI Agents

- Planner → `specs/*.md`
- Generator → `tests/**/*.spec.ts`
- Healer → POM/spec under review

Guardrails: `storageState` (no re-login); prefer role/label/`data-testid`; no secret commits.

---

## Extending

1. New NR project → `config/local.properties` / ENV only  
2. UI flow → `src/ui/pages` + capability + `tests/ui`  
3. SSH check → `SshClient` + `tests/ssh`  
4. Optional plan → `specs/` → Generator  

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Unresolved `ui.baseUrl` | `dns.domain`, env, `local.properties` |
| Auth fails | passwords ENV, VPN |
| SSH key / host | `SSH_KEYFILE`, `ssh.host` |
| Batch assert | `BATCH_SERVICE_NAME` |

---

## License

UNLICENSED / internal template.
