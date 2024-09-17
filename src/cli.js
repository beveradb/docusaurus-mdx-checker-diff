#!/usr/bin/env node

import { program } from "commander";
import process from "node:process";
import main from "./main.js";

program
  .requiredOption("-s1, --sha1 <sha1>", "First git SHA")
  .requiredOption("-s2, --sha2 <sha2>", "Second git SHA")
  .option("-v --verbose", "enables more verbose logging")
  .option(
    "-g --globals",
    "Attempt to report usage of unknown global variables in MDX"
  );

program.parse();

const options = program.opts();
if (options.verbose) {
  console.log("Options: ", options);
}

const {
  sha1,
  sha2,
  verbose = false,
  checkUnknownGlobals: globals = undefined,
} = options;

try {
  const result = await main({
    sha1,
    sha2,
    verbose,
    globals,
  });
  console.log(result);
  process.exit(0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
