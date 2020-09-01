module.exports = {
  env: {
    browser: true,
    es6: true,
    mocha: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "prettier/@typescript-eslint",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2019,
    project: "./tsconfig.lint.json",
  },
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",

    // @TODO: Forces overloaded methods to have docs between overloads and the implementation.
    // I don't like it but it doesn't seem to break anything.
    // Keeping for now.
    // @TODO: Deprecated, anything like this for tsdoc?
    "require-jsdoc": [
      "error",
      {
        require: {
          ArrowFunctionExpression: false,
          ClassDeclaration: true,
          FunctionDeclaration: true,
          FunctionExpression: false,
          MethodDefinition: true,
        },
      },
    ],

    // @TODO: Seems to mostly work just fine but I'm not 100 % sure.
    // @TODO: Deprecated, anything like this for tsdoc?
    "valid-jsdoc": [
      "error",
      {
        prefer: {
          arg: "param",
          argument: "param",
          return: "returns",
        },
        requireParamDescription: true,
        requireParamType: false,
        requireReturn: false, // Requires return for void functions.
        requireReturnDescription: true,
        requireReturnType: false,
      },
    ],

    "sort-imports": [
      "error",
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
      },
    ],

    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "memberLike",
        modifiers: ["private", "protected"],
        format: null,
        leadingUnderscore: "require",
      },
      {
        selector: "memberLike",
        modifiers: ["public"],
        format: null,
        leadingUnderscore: "forbid",
      },
    ],

    "@typescript-eslint/member-ordering": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-useless-constructor": "error",
    "@typescript-eslint/prefer-includes": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "@typescript-eslint/prefer-regexp-exec": "error",
    "@typescript-eslint/require-await": "error",

    // Not yet
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    // This is usually good to follow but not always.
    "@typescript-eslint/ban-types": "off",
    // False positives for overloading, also tsc compiles with errors anyway.
    "no-dupe-class-members": "off",
    // Blocks typesafe exhaustive switch (switch (x) { … default: const never: never = x }).
    "no-case-declarations": "off",
    // Reports typeof bigint as an error, tsc validates this anyway so no problem turning this off.
    "valid-typeof": "off",
    // Why?
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-parameter-properties": "off",
  },
  overrides: [
    {
      // Config files
      files: ["./*.js"],
      rules: {
        // Config files may not be transpiled, don't report the use of require.
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    {
      // Test specs.
      files: ["test/**/*.ts"],
      rules: {
        // This is useful to ignore private property access in a test.
        "@typescript-eslint/ban-ts-comment": "off",
      },
    },
  ],
};
