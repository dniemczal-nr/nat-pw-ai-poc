# Phase 6 – Governance, Reuse, and Optimization

## Goals

- Improve code quality, reuse, and maintainability across the framework.
- Establish governance rules (linting, naming conventions, contribution patterns).
- Refine capabilities, steps, and features to reduce duplication and improve clarity.

## Scope

Phase 6 focuses on **quality and optimization**:

- Governance (linting, style, naming conventions).
- Refactoring for reuse.
- Documentation of best practices and extension patterns.

## Outcomes

By the end of Phase 6:

- The framework has basic static analysis tooling (linting) configured.
- Naming conventions and directory structure are consistently applied.
- Common patterns are extracted into shared utilities where appropriate.
- Documentation exists for how to extend the framework with new features and capabilities.

## Governance & Quality Gates

### Linting & Style

- Introduce ESLint with rules tailored for:
  - NodeJS and CommonJS.
  - Asynchronous test code.

- Example rules (to be refined):
  - no unused variables.
  - consistent return in functions.
  - no implicit globals.

### Commit & PR Guidelines

- Encourage small, focused commits.
- Prefer PRs that:
  - focus on one capability or feature set at a time;
  - include tests and documentation updates.

### Naming Conventions

- Enforce previously defined naming patterns:
  - capability modules as `*Client.js`.
  - page objects as `*Page.js`.
  - steps grouped by domain/capability.
  - feature files grouped by domain and tagged appropriately.

### Tag Governance

- Ensure consistent tag usage:
  - `@SMOKE` for quick, critical checks.
  - `@REGRESSION` for broader suites.
  - capability tags `@UI`, `@API`, `@DB`, `@SSH`, `@MQ`.
   - avoid over-tagging with redundant labels.

## Refactoring for Reuse

### Duplicate Step Patterns

- Identify duplicate or near-duplicate step definitions.
- Consolidate into more generic, parameterized steps where appropriate.

Example:

- Replace multiple variants of "When I log in as X" with one parameterized step.

### Shared Helpers

- Extract common logic into shared utilities, e.g.:
  - HTTP response handling.
  - DB result normalization.
  - SSH command formatting.
  - MQ message serialization/deserialization.

### Capability Interfaces

- Review each capability for consistency:
  - similar error-handling patterns.
  - similar naming for methods.
  - ensure configuration usage is consistent.

## Documentation & Best Practices

### Extension Guides

Create documentation for:

- **Adding a new feature**
  - Where to place new `.feature` files.
  - How to structure scenarios and tags.
  - How to map steps to existing capabilities.

- **Adding a new capability**
  - Where to add new modules under `src/capabilities/`.
  - How to integrate with config and World.
  - How to add steps and features for the new capability.

- **Integrating with CI**
  - How to add new tag-based suites to Jenkins jobs.

### Code Comments & Inline Docs

- Prefer concise inline comments explaining complex logic.
- Avoid outdated comments by tying them closely to implementation.

## Validation Strategy for Phase 6

Once implemented, validation steps include:

- Run linting:
  - `npm run lint`.

- Run core E2E suites:
  - `npm run test:e2e -- --tags "@SMOKE"`.

- Review sample features and step files:
  - confirm naming and structure align with governance docs.

- Check documentation:
  - new contributors can follow extension guides to add a basic feature or capability without confusion.

## Risks & Considerations

- Over-engineering governance can slow down development; aim for pragmatic rules.
- Refactoring may introduce regressions; ensure tests are robust before and after changes.

## Agent Ownership (for implementation phase)

When we implement Phase 6, responsibilities will be:

- **@quality-gate-reviewer**
  - Design linting and governance rules.
  - Review refactorings.

- **@architect**
  - Ensure architectural consistency in refactoring and extensions.

- **@bdd-step-engineer**
  - Refactor step definitions for reuse.

## Commit Boundaries (when implemented)

Phase 6 should be delivered via:

1. **Commit S – Linting & Governance Setup**
   - Add ESLint configuration.
   - Document contribution guidelines.

2. **Commit T – Refactoring for Reuse**
   - Targeted refactors of duplicated patterns in steps and capabilities.
   - Ensure tests remain passing.

3. **Commit U – Documentation Enhancements**
   - Add or update docs for extension patterns and best practices.

Each commit should keep behavior unchanged where possible, with refactors validated by existing test suites.
