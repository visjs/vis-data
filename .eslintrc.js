module.exports = {
  extends: [require.resolve("vis-dev-utils/eslint-shareable-config")],
  overrides: [
    {
      files: ["./test/**/*.test.js"],
      rules: {
        "no-redeclare": "off",
        "no-unused-vars": "off",
        "no-var": "off",
      },
    },
  ],
};
