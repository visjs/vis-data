import { generateRollupConfiguration } from "vis-dev-utils";

import packageJSON from "./package.json" with { type: "json" };

export default generateRollupConfiguration({
  globals: {
    uuid: "uuidv4",
    "vis-util": "vis",
  },
  header: { name: "vis-data" },
  libraryFilename: "vis-data",
  entryPoints: "./src",
  packageJSON,
  tsconfig: "tsconfig.code.json",
});
