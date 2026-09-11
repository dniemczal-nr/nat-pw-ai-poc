# Project: UNIQA (NetReveal 9.6 QA)

Long-lived branch: **`project/uniqa`**.  
Core template stays on `main` — this branch holds the UNIQA overlay **template** only. Real passwords stay in local `.env` (never committed).

## Setup

```bash
git checkout project/uniqa
git pull

npm ci
npx playwright install chromium

cp config/projects/uniqa.example.properties config/local.properties
cp projects/uniqa/env.example .env
# edit .env — set USER_DATA_ADMIN_PASSWORD (and other secrets from 1Password)
```

## Smoke

```bash
npm run config:print
npm run test:smoke
```

Expected UI: `https://nr-qa-uniqa.symphonyai.dev/netreveal/login.do`

## Agent plans (this branch)

| Spec | Purpose |
|------|---------|
| `specs/uniqa-admin-menu-screens.md` | Smoke wszystkich screenów z menu Admin |
| `specs/uniqa-group-work-all-alerts.md` | Group Work → All Alerts — elementy / dropdowny (Organization Unit) |

Generator: seed `tests/seed.spec.ts` + `storageState`; **pomiń** Services Manager → Reload Configuration.

## Sync from core

```bash
git checkout project/uniqa
git fetch origin
git merge origin/main
# resolve conflicts if any — keep uniqa overlay files
```

## Do not

- Commit `.env` or `config/local.properties`
- Merge real secrets into `main`
- Run change-password against shared QA `admin`
