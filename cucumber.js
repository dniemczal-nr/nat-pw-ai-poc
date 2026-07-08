// cucumber.js - Cucumber configuration for Phase 1 (CommonJS)

module.exports = {
  default: {
    require: [
      // Support and step definitions will be added in later phases
      // "src/support/**/*.js",
      "src/steps/**/*.js",
    ],
    paths: [
      "features/**/*.feature",
    ],
    // Tags, formatters, and other options will be expanded later.
  },
};
