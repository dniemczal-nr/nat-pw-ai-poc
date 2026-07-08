# Phase 0 – Architectural Blueprint

## Goals

- Freeze high-level architecture and naming conventions.
- Decide base directory structure and layer boundaries.
- Define configuration and capability contracts.
- Establish tag and BDD strategy.

## Scope

This phase is **design-only** (no implementation code). Output is documentation that guides all subsequent phases.

## Architecture Overview

### Target Stack

- NodeJS
- JavaScript (CommonJS)
- Playwright
- Cucumber.js
- Allure
- Jenkins Freestyle

### Required Capabilities

- UI
- REST
- Database
- SSH
- SCP/SFTP
- MQ

### Conceptual Layers

- **Config Layer**
  - Centralized configuration loading.
  - Properties-based configuration files per environment.
  - ENV-based overrides (`process.env`).

- **Capability Layer**
  - Technical, reusable modules for:
    - UI (Playwright wrappers / browser lifecycle).
    - REST (HTTP client abstraction).
    - Database (connection and query helpers).
    - SSH/SCP/SFTP (remote command and file-transfer wrappers).
    - MQ (publish/consume abstractions).

- **Page Object Layer (UI)**
  - Page classes representing screens or flows.
  - Encapsulate selectors and user actions.

- **Step Layer**
  - Cucumber step definitions.
  - Use capability layer and page objects to fulfil business steps.

- **Feature Layer (BDD)**
  - Business-readable Gherkin feature files.
  - Organized by domain and/or capability.

- **Reporting Layer**
  - Allure integration.
  - Screenshots and artefact attachments.
  - Run metadata (tags, environment).

### Data & Control Flow

1. Jenkins or local CLI passes ENV/tag options to Cucumber.
2. Cucumber initializes the World with runtime parameters.
3. World loads configuration (properties + ENV overrides).
4. World (or lazy factories) instantiates capability clients (REST, DB, SSH/SFTP, MQ, Playwright).
5. Step definitions call capabilities and page objects via the World.
6. Hooks (Before/After) drive lifecycle and reporting (screenshots on failure, Allure attachments).

## Directory & Module Structure (Conceptual)

Root (indicative):

- `package.json` – project metadata, dependencies, npm scripts.
- `.gitignore` – Node, reports, artefacts.
- `cucumber.js` – Cucumber configuration file.
- `docs/` – documentation (this phase and others).

Source & Test:

- `config/` – raw property files (e.g. `default.properties`, `dev.properties`, etc.).
- `src/config/` – config loader and ENV resolution.
- `src/support/` – Cucumber world, hooks, shared utilities.
- `src/capabilities/` – REST, DB, SSH/SFTP, MQ modules.
- `src/ui/pages/` – Page objects.
- `src/ui/` – Playwright setup (browser/context/page lifecycle).
- `src/steps/` – Step definition files.
- `features/` – BDD feature files.
- `reports/` – Allure results, screenshots, logs (runtime artefacts).

These paths can be adjusted in later sessions, but the goal is to keep clear separation between:

- configuration;
- capabilities;
- UI abstractions;
- step layer;
- features;
- reporting.

## Configuration Model

### Properties-based Configuration

- Use a simple properties file (e.g. `key=value`) as a single baseline:
-   `config/default.properties` – placeholder values for all environments.
- Each property defines logical settings such as:
-   `baseUrl`, `apiBaseUrl`
-   `db.host`, `db.port`, `db.user`, `db.name`
-   `ssh.host`, `ssh.user`
-   `mq.host`, `mq.port`, `mq.topic`.

### ENV-based Resolution

- Runtime environment labelled via an ENV variable, e.g. `APPLICATION_ENVIRONMENT` (dev, stage, prod).
- Resolution hierarchy (conceptual):
-   1. `default.properties` (baseline placeholder values).
-   2. `process.env` (highest priority overrides for keys that exist in properties).
- Config layer exposes a single, immutable configuration object to the rest of the framework.

### Environment Naming

- Suggested environment keys:
  - `dev1`
  - `stg2`
  - `qa4`
  - Optional additional (e.g. `local`, `qa`).

- Tagging conventions may mirror environments (e.g. `@ENV:dev`), but environment selection for configuration is primarily via CLI/ENV rather than tags.

## Capability Contracts (Conceptual Interfaces)

The goal is to hide technical complexity and present clean, reusable interfaces.

### REST Capability

- Responsibilities:
  - Perform HTTP requests (GET/POST/PUT/DELETE/etc.).
  - Integrate with config for base URLs, headers, auth.
  - Provide structured responses (status, headers, body).

- Example interface:

```js
rest.request(method, path, options) -> { status, headers, body }
```

- Options may include:
  - query parameters;
  - request body;
  - custom headers;
  - timeout overrides.

### Database Capability

- Responsibilities:
  - Manage connections (pooling where appropriate).
  - Execute queries and return results.
  - Support transactions where needed.

- Example interface:

```js
db.query(sql, params) -> rows

db.transaction(async (tx) => { /* use tx.query(...) */ })
```

### SSH/SCP/SFTP Capability

- Responsibilities:
  - Open SSH connections to remote hosts.
  - Execute commands and capture stdout/stderr/exit code.
  - Upload/download files via SCP/SFTP.

- Example interface:

```js
ssh.exec(command) -> { stdout, stderr, code }

ssh.upload(localPath, remotePath)
ssh.download(remotePath, localPath)
```

- Config must support host, port, user, authentication method (password, key, etc.).

### MQ Capability

- Responsibilities:
  - Publish messages to topics/queues.
  - Consume messages from topics/queues (with handlers and timeouts).

- Example interface:

```js
mq.publish(topicOrQueue, message)

mq.consume(topicOrQueue, handler, options)
```

- Implementation should be pluggable (RabbitMQ, Kafka, ActiveMQ, etc.), with details configured via config layer.

### UI Capability / Playwright Wrapper

- Responsibilities:
  - Manage Playwright browser and context lifecycle.
  - Provide access to `page` instances.
  - Integrate with config for base URL, browser type, timeouts.

- Example interface:

```js
ui.launch() -> { browser, context, page }

ui.close()

ui.getPage() -> page
```

UI layer is consumed primarily by Page Objects and (indirectly) step definitions.

## Page Object Model (POM) Principles

- Each logical screen or flow in the application maps to a page object.
- Page object responsibilities:
  - Encapsulate selectors.
  - Implement user-level actions (e.g. `login(username, password)`).
  - Provide assertions or state-check helpers (e.g. `isLoggedIn()`).

- Base page may provide:
  - navigation (`goto(path)`);
  - common waits/timeouts;
  - screenshot helpers (if needed);
  - logging hooks.

Page objects must **not** contain business logic beyond representing UI interactions.

## Step Layer Design

- Step definitions are written in CommonJS modules and grouped by domain or capability.
- Steps should:
  - be business-readable (e.g. "When I sign in as 'user'");
  - delegate technical details to capabilities and page objects.

- Step files might be grouped as:
  - `src/steps/uiSteps.js`
  - `src/steps/apiSteps.js`
  - `src/steps/dbSteps.js`
  - `src/steps/sshSteps.js`
  - `src/steps/mqSteps.js`

The World object injects capabilities and pages into steps.

## Feature Layer & BDD Strategy

### Business-friendly Gherkin

- Scenarios written for business readability first:
  - Use Given/When/Then for high-level actions and outcomes.
  - Avoid technical detail in Gherkin (e.g. raw URLs, SQL) where possible.

- Organize features:
  - By business domain (preferred) – e.g. `features/auth/login.feature`, `features/orders/create-order.feature`.
  - Optionally by capability for technical tests – e.g. `features/api/health-check.feature`.

### Tag Strategy

Tags enable selective execution and suite grouping.

Suggested taxonomy:

- **By test type/capability**:
  - `@UI`
  - `@API`
  - `@DB`
  - `@SSH`
  - `@MQ`

- **By scope**:
  - `@SMOKE`
  - `@REGRESSION`
  - `@INTEGRATION`
  - `@WIP` (work in progress).

- **By environment (optional)**:
  - `@ENV:dev`
  - `@ENV:stage`
  - `@ENV:prod`

Environment tags are mostly informational; actual environment selection is via ENV/CLI.

Examples:

- A smoke UI login test:

```gherkin
@UI @SMOKE
Scenario: User can log in successfully
  Given I am on the login page
  When I log in as "standard" user
  Then I should see the dashboard
```

- An API health-check test:

```gherkin
@API @SMOKE
Scenario: API health endpoint returns 200
  When I call the "health" API endpoint
  Then the response status should be 200
```

## World & Hooks Responsibilities (Conceptual)

### World

- Holds:
  - resolved configuration object;
  - capability instances (REST, DB, SSH/SFTP, MQ, UI);
  - references to page objects.

- Provides methods or properties used by steps, e.g. `this.config`, `this.rest`, `this.db`, `this.ui`, etc.

### Hooks

- `Before` hooks
  - Setup environment (e.g. launch browser for UI scenarios).
  - Reset state as needed.

- `After` hooks
  - On scenario failure, capture screenshot if UI is involved.
  - Attach artefacts for reporting (Allure integration later).
  - Cleanup resources (close browser, connections).

Hooks must remain thin, delegating complex behavior to capabilities.

## Reporting & Jenkins Strategy (High Level)

### Allure Reporting

- Allure will be integrated with Cucumber as a formatter.
- Reporting layer responsibilities:
  - Generate Allure result files for each run.
  - Attach screenshots and relevant artefacts.
  - Use scenario names and tags to structure suites.

Allure integration is implemented in later phases, but this phase acknowledges:

- Allure results stored under `reports/allure-results/`.
- Screenshots stored under `reports/screenshots/`.

### Jenkins Freestyle

- Jenkins jobs should be able to:
  - Checkout the repository.
  - Install dependencies (`npm ci` or `npm install`).
  - Execute tests via a single command, e.g.:

    ```bash
    npm run test:e2e -- --tags "@SMOKE" --world-parameters ENV=stage
    ```

- Jenkins Allure plugin will read reports from `reports/allure-results/`.

Detailed Jenkins configuration is part of later phases, but the architecture must:

- avoid hard-coded absolute paths;
- use workspace-relative directories.

## Governance & Naming Conventions

- CommonJS modules (`module.exports` / `require`) across the framework.
- Clear naming patterns:
  - Config files: `config/<env>.properties`.
  - Capability modules: `src/capabilities/<name>Client.js`.
  - Page objects: `src/ui/pages/<Name>Page.js`.
  - Step files: `src/steps/<domain>Steps.js`.
  - Features: `features/<domain>/<name>.feature`.

- BDD naming:
  - Scenario titles should describe business intent.
  - Steps should be reusable and avoid duplication of wording.

## Open Questions for Iteration

- Exact structure and naming of ENV variables (e.g. `ENV` vs `TEST_ENV`).
- Choice of libraries for DB, SSH/SFTP, MQ (depend on system under test).
- Strategy for sharing World between scenarios (per-scenario vs per-feature lifecycles).
- Level of abstraction in MQ capability (generic, or broker-specific modules).

These will be refined in subsequent sessions before implementation.
