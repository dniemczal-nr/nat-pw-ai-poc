# Phase 3 – UI / Playwright Integration & Page Object Model

## Goals

- Integrate Playwright as the UI automation engine.
- Establish a Page Object Model (POM) for UI tests.
- Wire Playwright browser/context/page lifecycle into the Cucumber World and hooks.
- Implement screenshot-on-failure behavior for UI scenarios.

## Scope

Phase 3 focuses on the **UI capability**:

- Playwright setup and configuration.
- Page object abstractions.
- UI-oriented step definitions.
- Screenshot capture on failure.

## Outcomes

By the end of Phase 3:

- Playwright is installed and configured.
- UI capability is accessible via the World.
- Page objects represent at least one sample flow (e.g. login and dashboard).
- UI scenarios can be executed from Cucumber.
- Screenshots are captured and stored on failure for UI scenarios.

## Playwright Integration

### Dependencies

- Add Playwright dependency (e.g. `@playwright/test` or `playwright`).

Choice between importing Playwright directly vs using `@playwright/test` is a design decision; for pure Cucumber integration, direct Playwright is usually simpler.

### Configuration

- UI-related settings come from the config layer (Phase 1), for example:
  - `ui.browser` – browser type (`chromium`, `firefox`, `webkit`).
  - `ui.headless` – boolean for headless mode.
  - `ui.baseUrl` – application base URL.
  - `ui.timeout` – default timeout settings.

### Lifecycle Management

- Playwright objects (browser, context, page) must be managed via World and hooks:
  - `Before` hooks (for `@UI` scenarios):
    - Launch browser.
    - Create context and page.
    - Optionally navigate to `ui.baseUrl`.
  - `After` hooks:
    - Capture screenshot on failure.
    - Close browser/context.

- The World provides accessors like:
  - `this.browser`
  - `this.context`
  - `this.page`

## Page Object Model (POM)

### Principles

- Encapsulate UI interactions and selectors in page classes.
- Provide business-level methods (e.g. `login`, `submitForm`) rather than low-level click sequences.

### Structure

- `src/ui/pages/BasePage.js` – common helpers:
  - navigation (`goto(path)`);
  - waiting for selectors;
  - generic interactions (click, fill, etc.).

- `src/ui/pages/<Domain>Page.js` – domain-specific pages, e.g.:
  - `LoginPage` – username/password fields, login button.
  - `DashboardPage` – main dashboard elements.

### Integration

- Page objects should receive Playwright `page` instance via constructor or method parameters.
- World may hold instances of page objects to be reused by steps.

Example usage (conceptual):

- `this.pages.loginPage.loginAs(user)` in a step definition.

## UI Step Definitions

### Goals

- Provide BDD-friendly step text mapping to page object methods.

### Examples (conceptual)

- Steps file: `src/steps/uiSteps.js`.

- Gherkin:

```gherkin
@UI @SMOKE
Scenario: User can log in successfully
  Given I am on the login page
  When I log in as "standard" user
  Then I should see the dashboard
```

- Step implementations (conceptual mapping):
  - `Given I am on the login page` -> `LoginPage.open()`.
  - `When I log in as "standard" user` -> `LoginPage.loginAs(user)`.
  - `Then I should see the dashboard` -> `DashboardPage.isVisible()` or similar.

### Design Considerations

- Steps should avoid referencing selectors directly.
- Steps must rely on page objects and configuration.

## Screenshot-on-Failure Behavior

### Requirements

- When a scenario with UI interactions fails:
  - capture a screenshot from the current `page`.
  - store the screenshot under `reports/screenshots/`.

### Hooks Integration

- `After` hook for UI-tagged scenarios will:
  - check scenario result.
  - if failed:
    - call `page.screenshot({ path: ... })`.
    - store the path for later Allure attachment.

- The screenshot file naming convention should ideally include:
  - scenario name;
  - timestamp;
  - environment.

### Reporting

- Allure attachment is implemented in Phase 5.
- For now, ensure screenshot files are created correctly in the expected directory.

## Validation Strategy for Phase 3

Once implemented, validation steps include:

- Install Playwright (and run any required `npx playwright install` if needed).

- Run a sample UI scenario:
  - `npx cucumber-js --tags "@ui and @phase3"`.

- Confirm:
  - Browser launches and navigates to expected pages.
  - Page objects perform interactions as expected.
  - On a forced failure (or real failure), screenshot files appear in `reports/screenshots/`.

A sample feature is provided at `features/ui/admin-login.feature` using the `AdminAuthCapability` wired via Playwright.

## Risks & Considerations

- Playwright lifecycle must be robust:
  - ensure browsers/contexts are properly closed even when scenarios error.
- Slow UI tests or flaky selectors can reduce reliability; POM and waits must be carefully designed.
- Running in CI (Jenkins) may require headless mode and additional configuration (e.g. using xvfb on some setups).

## Agent Ownership (for implementation phase)

When we implement Phase 3, responsibilities will be:

- **@playwright-core**
  - Configure Playwright and manage lifecycle.

- **@ui-framework**
  - Design and implement Page Object Model.

- **@bdd-step-engineer**
  - Implement UI step definitions.

- **@feature-template-generator**
  - Create sample UI feature files demonstrating login or other key flows.

- **@quality-gate-reviewer**
  - Validate BDD quality and reuse patterns (steps vs pages).

## Commit Boundaries (when implemented)

Phase 3 should be delivered via:

1. **Commit G – Playwright Setup**
   - Add Playwright dependency.
   - Implement Playwright initialization and teardown.
   - Wire Playwright into World and hooks.

2. **Commit H – Page Object Model**
   - Implement `BasePage` and at least one domain-specific page (e.g. `LoginPage`).
   - Add helper utilities for UI interactions.

3. **Commit I – UI Steps & Sample Feature**
   - Implement `uiSteps.js` mapping Gherkin to page methods.
   - Add `features/ui/sample-ui.feature` for demonstration.

4. **Commit J – Screenshot-on-Failure**
   - Enhance hooks to capture screenshots.
   - Validate screenshot creation via a failing scenario.

Each commit should be tested independently where possible.
