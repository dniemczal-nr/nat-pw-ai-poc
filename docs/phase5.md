# Phase 5 – Reporting & CI (Allure + Jenkins Freestyle)

## Goals

- Integrate Allure reporting with Cucumber.
- Attach screenshots and other artefacts to Allure reports.
- Provide Jenkins Freestyle-compatible scripts and configurations.
- Ensure tag-based execution works cleanly in CI.

## Scope

Phase 5 focuses on **reporting and continuous integration**:

- Allure integration.
- Screenshot attachments.
- Jenkins-friendly run commands and artifacts handling.

## Outcomes

By the end of Phase 5:

- Allure result files are generated for each Cucumber run.
- Screenshots captured in Phase 3 are attached to Allure reports.
- Jenkins Freestyle jobs can:
  - install dependencies;
  - run tests with specified tags and environments;
  - publish Allure reports.

## Allure Integration

### Dependencies

- Add Allure Cucumber adapter/formatter (e.g. `allure-cucumberjs` or a similar package, depending on current ecosystem).

### Configuration

- Cucumber config (`cucumber.js`) must:
  - specify Allure formatter.
  - output reports to `reports/allure-results/`.

### Mapping Scenarios to Allure

- Scenario names and tags should appear in Allure as:
  - test case names;
  - labels (e.g. suites, features, severity, tags).

- Consider mapping tags to Allure labels, e.g.:
  - `@SMOKE` -> Allure suite or severity.
  - `@ENV:dev` -> Allure label `env=dev`.

### Attaching Artefacts

- From hooks, when failures occur:
  - attach screenshot files to Allure reports.

- Optionally attach:
  - REST request/response payloads;
  - DB queries or key results;
  - SSH command outputs;
  - MQ message bodies.

Implementation details depend on the chosen Allure adapter.

## Screenshot Attachments

### Requirements

- Screenshots captured in Phase 3 must be:
  - saved under `reports/screenshots/`.
  - linked to the corresponding scenario in Allure.

### Integration

- Hooks will:
  - capture screenshot path on failure;
  - call Allure adapter to attach the file to the test result.

Naming conventions must ensure clarity in Allure UI (e.g. scenario name + environment).

## Jenkins Freestyle Integration

### Goals

- Provide simple, robust Jenkins job configuration for E2E tests.

### Basic Jenkins Steps

1. **Checkout** repository.
2. **Install dependencies**:
   - `npm ci` (preferred) or `npm install`.
3. **Execute tests**:
   - `npm run test:e2e -- --tags "@SMOKE"` (or other tag sets).
   - Environment selection via Jenkins parameters, e.g. `TEST_ENV`.
4. **Collect Allure results**:
   - Jenkins Allure plugin pointed to `reports/allure-results/`.

### Jenkins Parameters

- Parameterize:
  - environment (`TEST_ENV`), e.g. `dev`, `stage`, `prod`.
  - tag expression (e.g. `@SMOKE`, `@REGRESSION`, `@UI and @API`).

### Naming and Paths

- All reporting paths must be relative to Jenkins workspace:
  - `reports/allure-results/`.
  - `reports/screenshots/`.

### Example Run Command (Conceptual)

```bash
TEST_ENV=stage npm run test:e2e -- --tags "@SMOKE"
```

## Tag-based Execution in CI

- Tags control which subset of tests is executed:
  - smoke suite (`@SMOKE`).
  - regression suite (`@REGRESSION`).
  - capability-specific suites (`@UI`, `@API`, `@DB`, `@SSH`, `@MQ`).

- Jenkins jobs may be configured to support multiple suites, each with its own tag expression.

## Validation Strategy for Phase 5

Once implemented, validation steps include:

- Local run with Allure:
  - `npx cucumber-js --tags "@SMOKE"`.
  - Check `reports/allure-results/` for generated files.

- Generate Allure report locally (using Allure CLI) to confirm:
  - scenarios appear correctly;
  - tags/labels are present;
  - screenshots and artefacts are attached.

- Jenkins job test:
  - Configure a Freestyle job with the steps described above.
  - Run smoke tests on a chosen environment.
  - Confirm Allure reports are available in Jenkins.

## Risks & Considerations

- Allure adapter compatibility:
  - Ensure the chosen Allure formatter works with current Cucumber version.

- Path handling:
  - Allure output and screenshot paths must be correct and accessible.

- Build time:
  - In large suites, Allure processing may take time; ensure Jenkins job timeouts are appropriate.

## Agent Ownership (for implementation phase)

When we implement Phase 5, responsibilities will be:

- **@reporting-ci**
  - Integrate Allure formatter.
  - Configure report paths.
  - Implement attachment behavior.

- **@quality-gate-reviewer**
  - Ensure reporting is clear, consistent, and aligned with tag strategy.

- **@scaffolder**
  - Provide Jenkins run scripts and documentation snippets.

## Commit Boundaries (when implemented)

Phase 5 should be delivered as:

1. **Commit P – Allure Integration**
   - Add Allure dependencies.
   - Configure Cucumber to output Allure results.

2. **Commit Q – Screenshot & Artefact Attachments**
   - Enhance hooks to attach screenshots and other data to Allure.

3. **Commit R – Jenkins Integration & Docs**
   - Provide Jenkins run scripts and example job configuration.
   - Document ENV and tag usage for CI.

Each commit should be verifiable via local test runs and, where possible, a Jenkins test job.
