import packageJSON from "./package.json";
import { generateRollupConfiguration } from "vis-dev-utils";

export default generateRollupConfiguration({
  globals: {
    uuid: "uuidv4",
    "vis-util": "vis",
    moment: "moment"
  },
  header: { name: "vis-data" },
  libraryFilename: "vis-data",
  entryPoints: "./src",
  packageJSON,
  tsconfig: "tsconfig.code.json"
});
