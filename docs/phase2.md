# Phase 2 – Cucumber Core, World, and Hooks

## Goals

- Configure Cucumber.js as the primary test runner.
- Implement the Cucumber World to provide shared context and access to configuration and capabilities.
- Add initial hooks for lifecycle management and failure handling (including screenshot support, to be finalized when UI is wired).

## Scope

Phase 2 focuses on:

- Cucumber configuration and basic runtime wiring.
- World object design and implementation.
- Hooks for setup/teardown and failure handling.

UI-specific details (Playwright integration) and capability implementations are handled in subsequent phases, but the World and hooks must be ready to host them.

## Outcomes

By the end of Phase 2:

- Cucumber is configured to run features from the `features/` directory.
- A World object exists that:
  - loads configuration via the Phase 1 config module;
  - exposes placeholders or interfaces for capabilities;
  - can be extended with Playwright and non-UI capabilities later.
- Hooks manage basic lifecycle and prepare for screenshot capture on failure.

## Cucumber Configuration

### Cucumber Config File

- A configuration file (e.g. `cucumber.js`) defines:
  - paths to feature files (`features/**/*.feature`);
  - paths to step definition files (`src/steps/**/*.js`);
  - paths to support files (world, hooks);
  - default options (e.g. formatters, strict mode).

- Key considerations:
  - CommonJS compatibility.
  - Tag-based execution via `--tags` CLI option.

### Tag-Based Execution

- Use Cucumber's tag expression syntax, e.g.:
  - `--tags "@SMOKE"`
  - `--tags "@UI and not @WIP"`.

- Cucumber config must not limit tags; the CLI should remain flexible.

## World Design

### Responsibilities

The World object represents shared state and capabilities for each scenario.

Primary responsibilities:

- Load configuration via `src/config/index.js` (Phase 1 output).
- Hold references to:
  - UI capability / Playwright context and pages (Phase 3);
  - REST client (Phase 4);
  - DB client (Phase 4);
  - SSH/SFTP client (Phase 4);
  - MQ client (Phase 4).
- Provide a single point-of-access for step definitions to use these capabilities.

### Lifecycle

- World is typically instantiated per scenario (Cucumber default).
- Each scenario gets a fresh World instance with:
  - resolved configuration (potentially cached across scenarios);
  - scenario metadata (name, tags);
  - references created in `Before` hooks or lazily.

### Structure (Conceptual)

- The World module will:
  - `require` the config module.
  - Initialize internal fields for capabilities (initially undefined or placeholders).
  - Provide methods or properties like:
    - `this.config`
    - `this.ui`
    - `this.rest`
    - `this.db`
    - `this.ssh`
    - `this.mq`

- Implementation details (CommonJS vs ES classes, etc.) will be decided when we code.

## Hooks Design

### Before Hooks

- Run before each scenario or before selected tagged scenarios.

Responsibilities:

- Read scenario tags and decide which capabilities to initialize (e.g. only start Playwright for `@UI` scenarios).
- Record scenario-level metadata (e.g. environment, tags) for reporting.

Examples (conceptual):

- `Before({ tags: "@UI" }, async function() { /* initialize Playwright */ })`
- `Before(async function() { /* common setup */ })`

### After Hooks

- Run after each scenario or selected tagged scenarios.

Responsibilities:

- On failure:
  - capture screenshots for UI scenarios;
  - collect logs or other artefacts.
- Clean up resources:
  - close Playwright browser/context;
  - close DB connections (if per-scenario);
  - close SSH/MQ clients.

The exact resource management strategy (per-scenario vs shared) will be fine-tuned in later phases.

### Failure Detection

- Hooks can inspect scenario result (e.g. `scenario.result.status`) and branch behavior:
  - if failed and UI scenario -> capture screenshot.

### Attachment Handling

- In this phase, attachments are conceptually prepared (e.g. file paths stored on the World or in a context object).
- Actual Allure integration (attaching files to reports) is handled in Phase 5.

## Integration with Config Layer

- World and hooks **must use** the Phase 1 config module:
  - Determine environment-specific settings.
  - Configure capabilities (once implemented).

Examples (conceptual):

- Use `config.get('app.baseUrl')` for base URL passed into UI/REST capabilities.
- Use `config.get('db.host')` etc. for DB connections.

## Validation Strategy for Phase 2

Once implemented, we will validate:

- Cucumber can run a simple feature with a dummy step:
  - `npx cucumber-js` (or `npm run test:e2e`).

- The World is instantiated and has a working `config` object.

- Hooks execute and can:
  - log scenario metadata (for debugging);
  - respond to tags.

Even without full capabilities, Phase 2 should prove that:

- Cucumber configuration is correct.
- World and hooks are wired into runtime.

## Risks & Considerations

- Misconfiguration of Cucumber paths can lead to missing steps or features.
- Incorrect World lifecycle can lead to resource leaks (once capabilities are added).
- Hooks must remain thin and defer to capabilities for complex behavior.

## Agent Ownership (for implementation phase)

When we implement Phase 2, responsibilities will be:

- **@world-builder**
  - Implement the Cucumber World module.
  - Integrate config into World.

- **@scaffolder**
  - Configure Cucumber (`cucumber.js` file, paths, CLI options).

- **@quality-gate-reviewer**
  - Verify BDD-friendly structure and clear separation of concerns.

## Commit Boundaries (when implemented)

Phase 2 should be delivered as small, focused commits:

1. **Commit D – Cucumber Configuration**
   - Add `cucumber.js` with feature/step/support paths.
   - Minimal example feature and step to prove execution (can be temporary).

2. **Commit E – World Implementation**
   - Add World module under `src/support/`.
   - Integrate config layer into World.
   - Provide placeholders for capabilities.

3. **Commit F – Hooks Implementation**
   - Add hooks under `src/support/`.
   - Implement lifecycle and basic failure handling.

Each commit should be reviewable independently.
