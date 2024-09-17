#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { globby } from "globby";
import { compile } from "@mdx-js/mdx";
import chalk from "chalk";

import { getUnknownGlobals } from "./globals.js";
import { preprocess } from "./compat.js";
import {
  DefaultRemarkPlugins,
  DefaultRehypePlugins,
  DefaultInclude,
  DefaultExclude,
  DefaultGlobals,
} from "./constants.js";

const SuccessPrefix = chalk.green("[SUCCESS]");
const ErrorPrefix = chalk.red("[ERROR]");

export default async function main({
  gitRange = null, // Change this to null instead of false
  cwd = process.cwd(),
  include = DefaultInclude,
  exclude = DefaultExclude,
  remarkPlugins = DefaultRemarkPlugins,
  rehypePlugins = DefaultRehypePlugins,
  format = "mdx",
  verbose = false,
  globals = DefaultGlobals,
}) {
  console.log(
    "Getting relevant files" + (gitRange ? ` for git range: ${gitRange}` : "")
  );
  const relevantFiles = await getRelevantFiles(
    verbose,
    gitRange,
    cwd,
    include,
    exclude
  );

  if (relevantFiles.length === 0) {
    console.log(
      `${SuccessPrefix} No relevant MDX files found${
        gitRange ? ` in the git range ${gitRange}` : ""
      }`
    );
    return;
  }

  if (verbose) {
    console.log(
      "Found " +
        relevantFiles.length +
        ` relevant files to compile with MDX${
          gitRange ? ` in the git range ${gitRange}` : ""
        }`
    );
    console.log("List of files:\n", JSON.stringify(relevantFiles, null, 2));
  }

  const allResults = await Promise.all(
    relevantFiles.map((filePath) => processFilePath(filePath))
  );

  const allErrors = allResults.filter((r) => r.status === "error");
  const allSuccess = allResults.filter((r) => r.status === "success");

  if (verbose) {
    console.log(`Errors: ${allErrors.length}`);
    console.log(`Success: ${allSuccess.length}`);
  }

  if (allErrors.length > 0) {
    const outputSeparator = `\n${chalk.yellow("---")}\n`;
    throw new Error(
      `${ErrorPrefix} ${allErrors.length}/${
        relevantFiles.length
      } MDX files couldn't compile!${outputSeparator}${allErrors
        .map((error) => error.errorMessage)
        .join(outputSeparator)}${outputSeparator}`
    );
  } else {
    return `${SuccessPrefix} All ${relevantFiles.length} MDX files compiled successfully!`;
  }

  async function processFilePath(relativeFilePath) {
    const filePath = path.resolve(cwd, relativeFilePath);
    const fileFormat =
      format === "detect" ? (filePath.endsWith(".md") ? "md" : "mdx") : "mdx";
    try {
      // console.log("filePath", filePath);
      const fileContent = await fs.readFile(filePath, "utf8");
      // console.log("fileContent", fileContent);
      const contentPreprocessed = preprocess(fileContent);
      const compilerOptions = {
        format: fileFormat,
        remarkPlugins,
        rehypePlugins,
      };
      const result = await compile(contentPreprocessed, compilerOptions);

      if (globals !== null) {
        const unknownGlobals = getUnknownGlobals(result.value, globals);
        if (unknownGlobals.length > 0) {
          throw new Error(
            `These MDX global variables do not seem to be available in scope: ${unknownGlobals.join(
              " "
            )}`
          );
        }
      }

      // TODO generate warnings for compat options here?
      return { relativeFilePath, status: "success", result };
    } catch (error) {
      const errorMessage = `${chalk.red(
        "Error while compiling file"
      )} ${chalk.blue(relativeFilePath)}${formatMDXLineColumn(error)}
Details: ${error.message}`;
      return { relativeFilePath, status: "error", error, errorMessage };
    }
  }

  function formatMDXLineColumn(error) {
    if (error.line || error.column) {
      let lineColumn = "";
      if (error.line) {
        lineColumn = lineColumn + "Line=" + error.line + " ";
      }
      if (error.column) {
        lineColumn = lineColumn + "Column=" + error.column;
      }
      return ` (${lineColumn})`;
    }
    return "";
  }
}

async function getRelevantFiles(verbose, gitRange, cwd, include, exclude) {
  let files;
  if (gitRange) {
    files = await getModifiedFiles(gitRange, cwd);
    console.log(
      `Found ${files.length} modified files in the git range ${gitRange} in dir ${cwd}, filtering for relevant files`
    );

    if (verbose) {
      console.log("Modified files found: ", files);
    }
  } else {
    files = await globby(include, {
      cwd,
      ignore: exclude,
      // gitignore: true, // Does not work well with relative paths like ../docs
    });
    files.sort();

    console.log(
      `Found ${files.length} files in dir ${cwd}, filtering for relevant files`
    );

    if (verbose) {
      console.log("All files found: ", files);
    }
  }

  return filterRelevantFiles(verbose, files, include, exclude);
}

async function getModifiedFiles(gitRange, cwd) {
  const { exec } = await import("child_process");
  return new Promise((resolve, reject) => {
    exec(
      `git diff --name-only ${gitRange}`,
      { cwd },
      (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(stdout.trim().split("\n").filter(Boolean));
      }
    );
  });
}

async function filterRelevantFiles(verbose, files, include, exclude) {
  const { minimatch } = await import("minimatch");

  if (verbose) {
    console.log("Files to filter: ", files.length);
  }

  const filteredFiles = files.filter(
    (file) =>
      include.some((pattern) => minimatch(file, pattern)) &&
      !exclude.some((pattern) => minimatch(file, pattern))
  );

  if (verbose) {
    console.log("Files filtered: ", filteredFiles.length);
  }
  return filteredFiles;
}
