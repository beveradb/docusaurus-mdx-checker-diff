#!/usr/bin/env node

import { program } from "commander";
import process from "node:process";
import main from "./main.js";

program
  .description(
    "Check MDX files changed in a git range or all files if not specified"
  )
  .option("-c, --cwd <cwd>", "the CWD dir containing your MDX files")
  .option("-r, --gitRange <gitRange>", "the git range to check modified files")
  .option("-v --verbose", "enables more verbose logging")
  .option(
    "-g --globals",
    "Attempt to report usage of unknown global variables in MDX"
  );

program.parse(process.argv);

const options = program.opts();
const {
  cwd = process.cwd(),
  verbose = false,
  checkUnknownGlobals: globals = undefined,
  gitRange,
} = options;

if (verbose) {
  console.log("Options: ", options);
}

try {
  const result = await main({
    gitRange,
    cwd,
    verbose,
    globals,
  });
  console.log(result);
  process.exit(0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
