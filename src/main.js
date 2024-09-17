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

////////////////////////////////////////
// Script

export default async function main({
  sha1,
  sha2,
  include = DefaultInclude,
  exclude = DefaultExclude,
  remarkPlugins = DefaultRemarkPlugins,
  rehypePlugins = DefaultRehypePlugins,
  format = "mdx",
  verbose = false,
  globals = DefaultGlobals,
}) {
  const modifiedFiles = await getModifiedFiles(sha1, sha2);
  console.log(
    "Found " +
      modifiedFiles.length +
      " modified files between ${sha1} and ${sha2}, filtering for relevant files"
  );

  const relevantFiles = await filterRelevantFiles(
    modifiedFiles,
    include,
    exclude
  );

  if (relevantFiles.length === 0) {
    throw new Error(
      `${ErrorPrefix} No relevant modified MDX files found between ${sha1} and ${sha2}`
    );
  }

  if (verbose) {
    console.log(
      "Found " +
        relevantFiles.length +
        " relevant modified files to compile with MDX"
    );
    console.log("List of files:\n", JSON.stringify(relevantFiles, null, 2));
  }

  const allResults = await Promise.all(relevantFiles.map(processFilePath));

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
      } relevant modified MDX files couldn't compile!${outputSeparator}${allErrors
        .map((error) => error.errorMessage)
        .join(outputSeparator)}${outputSeparator}`
    );
  } else {
    return `${SuccessPrefix} All ${relevantFiles.length} relevant modified MDX files compiled successfully!`;
  }
}

async function getModifiedFiles(sha1, sha2) {
  const { exec } = await import("child_process");
  return new Promise((resolve, reject) => {
    exec(`git diff --name-only ${sha1} ${sha2}`, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout.trim().split("\n").filter(Boolean));
    });
  });
}

async function filterRelevantFiles(files, include, exclude) {
  const { minimatch } = await import("minimatch");
  return files.filter(
    (file) =>
      include.some((pattern) => minimatch(file, pattern)) &&
      !exclude.some((pattern) => minimatch(file, pattern))
  );
}

//////////////////////////////////////
// Functions

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

    /*
    // const fileToDebug = "docs/introduction.md";
    const fileToDebug = undefined;
    if (relativeFilePath === fileToDebug) {
      console.log({
        relativeFilePath,
        fileContent,
        contentPreprocessed,
        result: result.toString(),
        compilerOptions,
      });
    }
     */

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
