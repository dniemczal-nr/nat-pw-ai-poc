// cucumber.js — Cucumber for non-UI only (SSH)

module.exports = {
  default: {
    require: [
      "src/support/**/*.js",
      "src/steps/**/*.js",
    ],
    paths: [
      "features/ssh/**/*.feature",
    ],
    publishQuiet: true,
  },
};
