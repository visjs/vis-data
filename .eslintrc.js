module.exports = {
  env: {
    browser: true,
    es6: true,
    mocha: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2019,
    project: './tsconfig.json',
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',

    // @TODO: Forces overloaded methods to have docs between overloads and the implementation.
    // I don't like it but it doesn't seem to break anything.
    // Keeping for now.
    // @TODO: Deprecated, anything like this for tsdoc?
    'require-jsdoc': [
      'error',
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
    'valid-jsdoc': [
      'error',
      {
        prefer: {
          arg: 'param',
          argument: 'param',
          return: 'returns',
        },
        requireParamDescription: true,
        requireParamType: false,
        requireReturn: false, // Requires return for void functions.
        requireReturnDescription: true,
        requireReturnType: false,
      },
    ],

    'sort-imports': [
      'error',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
      },
    ],
    '@typescript-eslint/member-naming': [
      'error',
      { private: '^_', protected: '^_', public: '^[^_]' },
    ],

    '@typescript-eslint/member-ordering': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-useless-constructor': 'error',
    '@typescript-eslint/prefer-includes': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-regexp-exec': 'error',
    // '@typescript-eslint/require-await': 'error',

    // Not yet
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    // These are hoisted, I have no idea why it reports them by default.
    '@typescript-eslint/no-use-before-define': [
      'error',
      { functions: false, classes: false, typedefs: false },
    ],
    // False positives for overloading, also tsc compiles with errors anyway.
    'no-dupe-class-members': 'off',
    // Blocks typesafe exhaustive switch (switch (x) { … default: const never: never = x }).
    'no-case-declarations': 'off',
    // Reports typeof bigint as an error, tsc validates this anyway so no problem turning this off.
    'valid-typeof': 'off',
    // Why?
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
  },
}
