import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import { generateHeader } from "vis-dev-utils";

// TypeScript because Babel transpiles modules in isolation, therefore no type reexports.
// CommonJS because Babel is not 100 % ESM.

const babelConfig = {
  extensions: [".ts", ".js"],
  babelHelpers: "runtime",
  exclude: "**/node_modules/**",
};
const resolveConfig = {
  browser: true,
  mainFields: ["module", "main"],
  extensions: [...babelConfig.extensions, ".json"],
};
const banner = generateHeader();
const typescriptConfig = {
  tsconfig: "tsconfig.code.json",
};

export default [
  {
    input: "src/index.ts",
    output: [
      {
        banner,
        file: "dist/esm.js",
        format: "esm",
        sourcemap: true,
      },
      {
        banner,
        file: "dist/umd.js",
        format: "umd",
        exports: "named",
        name: "vis",
        extend: true,
        sourcemap: true,
      },
    ],
    plugins: [
      resolve(resolveConfig),
      typescript(typescriptConfig),
      commonjs(),
      babel(babelConfig),
    ],
  },
];
