module.exports = function(config) {
  config.set({
    mutator: "typescript",
    packageManager: "npm",
    reporters: ["html", "progress"],
    testRunner: "mocha",
    transpilers: ["babel"],
    testFramework: "mocha",
    coverageAnalysis: "off",
    tsconfigFile: "tsconfig.json",
    mutate: ["src/**/*.ts"],
    babel: {
      optionsFile: ".babelrc"
    }
  });
};
