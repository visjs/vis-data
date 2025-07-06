#!/usr/bin/env node

// Ideally this would be just a Shell script but Windows exists and I don't want
// to force Windows users to install Shell and configure it to be used to run
// npm scripts (and break their Windows only projects?).

import { spawnSync } from "child_process";

const { status } = spawnSync(
  "npx",
  [
    "test-e2e-interop",
    // This is the shared stuff used in all of our projects.
    "--config",
    "./node_modules/vis-dev-utils/dist/interop/base-config.json",
    // This is specific to this project.
    "--project",
    "vis-charts https://github.com/visjs/vis-charts.git",
    "--project",
    "vis-data ./vis-data-0.0.0-no-version.tgz",
    "--project",
    "vis-graph3d https://github.com/visjs/vis-graph3d.git",
    "--project",
    "vis-network https://github.com/visjs/vis-network.git",
    "--project",
    "vis-timeline https://github.com/visjs/vis-timeline.git",
    // Any additional options passed from the command line (e.g. a fail command
    // for debugging).
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
process.exitCode = status;
