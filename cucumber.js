// cucumber.js - Cucumber configuration for Phase 2 (CommonJS)

module.exports = {
  default: {
    // Load support files (World, hooks, parameter types) and step definitions.
    require: [
      "src/support/**/*.js",
      "src/steps/**/*.js",
    ],

    // Default feature file locations.
    paths: [
      "features/**/*.feature",
    ],

    // Keep tag handling flexible; prefer passing tags via CLI (e.g. --tags @smoke).
    // Example: npx cucumber-js --tags "@smoke and not @wip"

    // Keep output quiet by default for CI logs while still allowing manual publish.
    publishQuiet: true,
  },
};
