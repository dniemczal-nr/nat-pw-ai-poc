# Phase 1 – Project Scaffold & Config Layer

## Goals

- Create the initial NodeJS project scaffold.
- Establish directory structure consistent with the target architecture.
- Implement properties-based configuration with ENV-based overrides.
- Prepare the foundation for capabilities, UI, and BDD layers.

## Scope

This phase covers **project setup** and **configuration layer** implementation. It should produce a runnable, but functionally minimal, project.

## Outcomes

By the end of Phase 1:

- The repository contains a `package.json` with baseline dependencies and scripts.
- Base directories for config, capabilities, UI, steps, features, and reporting exist.
- A config loader reads properties files and ENV variables and exposes configuration to later layers.
- Simple validation can confirm that config resolution works for multiple environments.

## Directory Structure (Initial Scaffold)

Indicative directories and key files:

- Root:
  - `package.json` – dependencies and npm scripts.
  - `.gitignore` – node modules, reports, temporary files.
  - `cucumber.js` – Cucumber configuration (may be stub in this phase).

- Config:
  - `config/default.properties`
  - `config/dev.properties`
  - `config/stage.properties`
  - `config/prod.properties`

- Source:
  - `src/config/index.js` – main config loader.
  - `src/support/` – reserved for World and hooks (implemented later).
  - `src/capabilities/` – reserved for technical capability modules (later).
  - `src/ui/` – reserved for Playwright setup and page objects (later).
  - `src/steps/` – reserved for step definitions (later).

- Tests & Features:
  - `features/` – feature files (may only contain placeholders in this phase).

- Reporting:
  - `reports/` directory for Allure and screenshots (used in later phases).

## package.json & Tooling

### Dependencies (conceptual)

Phase 1 primarily needs:

- Core:
  - `cucumber` / `@cucumber/cucumber` (for BDD; actual step/regression will come later).

- Configuration:
  - A properties-file parser (e.g. `properties-reader`, or minimal custom parser).

- Utility:
  - Optional: small helper libraries (e.g. `dotenv`) if we decide to blend `.env` with properties.

Additional dependencies for Playwright, Allure, DB, SSH, MQ are added in later phases.

### Scripts (conceptual)

- `npm test` – default test runner, eventually delegated to Cucumber.
- `npm run test:e2e` – dedicated E2E runner.
- Potential `npm run lint` once governance is added.

In this phase, scripts may be simple stubs preparing for later expansion.

## Config Loader Design

### Inputs

- Properties files under `config/`:
  - `default.properties` – baseline for all environments.
  - `<env>.properties` – additional overrides per environment.

- Environment variables via `process.env`.

### Selection of Environment

- Primary ENV variable: e.g. `TEST_ENV` (or `ENV` if preferred). We will finalize naming in iteration.
- If `TEST_ENV` is not set, default to `dev` or `default` (to be agreed).

### Resolution Rules

Conceptual precedence hierarchy:

1. Load `default.properties`.
2. If `TEST_ENV` is set and corresponding `<env>.properties` exists, load and overlay.
3. Overlay `process.env` onto the resulting configuration object.

Result:

- Single configuration object (e.g. `config`) exported by `src/config/index.js`.

### Example Configuration Keys

- Application URLs:
  - `app.baseUrl`
  - `api.baseUrl`

- DB:
  - `db.host`
  - `db.port`
  - `db.user`
  - `db.password` (ideally from ENV only)
  - `db.name`

- SSH/SFTP:
  - `ssh.host`
  - `ssh.port`
  - `ssh.user`

- MQ:
  - `mq.host`
  - `mq.port`
  - `mq.topic`

Phase 1 focus: structure, not exhaustive coverage. We will extend keys as needed in later phases.

## Usage Pattern

Once implemented, other modules will:

```js
const config = require('../config');

// Example usage
const baseUrl = config.get('app.baseUrl');
```

We may use simple accessor semantics:

- `config.get(key)`
- Or direct property access if we transform keys into nested objects.

We will finalize the exact API during implementation.

## Simple Validation Strategy for Phase 1

After implementation, validation steps will include:

- Run a Node script (or basic test) to log selected config values for different `TEST_ENV` settings:
  - `TEST_ENV=dev node scripts/printConfig.js`
  - `TEST_ENV=stage node scripts/printConfig.js`

- Confirm:
  - Values change according to environment-specific properties.
  - ENV variables override properties when set.

Later phases will rely on this config module from World, capabilities, and Playwright setup.

## Risks & Considerations

- Handling of sensitive data:
  - DB passwords, SSH keys, MQ credentials should prefer ENV variables over properties.
- Error handling:
  - Missing environment files should produce clear errors.
  - Misconfigured keys should be surfaced early.

## Agent Ownership (for implementation phase)

When we implement Phase 1, responsibilities will be:

- **@scaffolder**
  - Create `package.json`, `.gitignore`, base directory structure.
  - Add initial npm scripts.

- **@config-engineer**
  - Implement properties-based loader in `src/config/index.js`.
  - Define ENV resolution rules.

- **@quality-gate-reviewer**
  - Review configuration patterns for clarity, security, and reuse.

## Commit Boundaries (when implemented)

Phase 1 should be delivered as small, reviewable commits:

1. **Commit A – Project Scaffold**
   - `package.json`, `.gitignore`, basic directory structure.
   - No functional config yet.

2. **Commit B – Config Loader & Properties Files**
   - `config/*.properties` and `src/config/index.js` implementation.
   - Minimal validation script or test.

3. **Commit C – Documentation & Cleanup**
   - Update docs (if needed) and small refactors.

These boundaries ensure we can review configuration independently from project scaffolding.
