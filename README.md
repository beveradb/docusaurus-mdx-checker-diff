# docusaurus-mdx-checker-diff

A CLI to report MDX v3 parsing errors found in any content modified between two `git` SHAs, using the same setup as Docusaurus v3 uses.

Run this command in a CI workflow job for your repo, passing in a valid git range to the `-r` parameter:

```bash
npx docusaurus-mdx-checker-diff -r $SHA1..$SHA2
```

The command will return success if all modified Markdown/MDX documents are compatible with MDX v3 (Docusaurus flavor), or return (and print) an error if any are not compatible.

This tool was created to help Docusaurus v3+ users prevent content with broken Markdown/MDX from getting into repositories.

If all content files are valid for the Docusaurus MDX parser, you should see output similar to the below:

```bash
npx docusaurus-mdx-checker-diff -r 4000e3b5355c6ee1eb0691dded9d449b9a4c2313..8e2641cb8f7bc3d732870184efd1a8add147fb1d

Getting relevant files for git range: 4000e3b5355c6ee1eb0691dded9d449b9a4c2313..8e2641cb8f7bc3d732870184efd1a8add147fb1d

Found 8 modified files in the git range 4000e3b5355c6ee1eb0691dded9d449b9a4c2313..8e2641cb8f7bc3d732870184efd1a8add147fb1d in dir /Users/andrewbeveridge/Projects/docusaurus-mdx-checker-diff, filtering for relevant files

[SUCCESS] All 1 MDX files compiled successfully!
```

## Usage

This is a minimal CLI tool with no mandatory options.
If you run it without a `-r` / `--gitRange` parameter, it will validate all files in the current directory.
If you pass in a `-c` / `--cwd` parameter, it will only process files within that directory (and will use that for the `git diff` as well).

```bash
Usage: docusaurus-mdx-checker-diff [options]

Check MDX files changed in a git range or all files if not specified

Options:
  -c, --cwd <cwd>            the CWD dir containing your MDX files
  -r, --gitRange <gitRange>  the git range to check modified files
  -v --verbose               enables more verbose logging
  -g --globals               Attempt to report usage of unknown global variables in MDX
  -h, --help                 display help for command
```

### Github Actions Workflow Example

The primary use case for this tool is to implement a CI job which validates any changed content files.

Here is an example Github Actions workflow to achieve this:

```yaml
name: Markdown MDX Validation

on:
  workflow_call:

jobs:
  markdown-mdx-validation:
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Validate MDX files
        run: |
          npx docusaurus-mdx-checker-diff -r ${{ github.event.pull_request.base.sha }}..${{ github.sha }}

      - name: Check validation results
        run: |
          if [ $? -eq 0 ]; then
            echo "All Markdown and MDX files are valid."
          else
            echo "Some Markdown and MDX files are not valid for the MDX parser. Please check the validation output above."
            exit 1
          fi
```

You could also clone the repo and run the CLI with `yarn run`, e.g.

```bash
yarn run cli -r 4000e3b5355c6ee1eb0691dded9d449b9a4c2313..705934e3f07645a697f9f3eeb2c5425d9a015a63
```

You should see output similar to the below if any validation errors occur:

```bash
Getting relevant files for git range: 4000e3b5355c6ee1eb0691dded9d449b9a4c2313..705934e3f07645a697f9f3eeb2c5425d9a015a63

Found 8 modified files in the git range 4000e3b5355c6ee1eb0691dded9d449b9a4c2313..705934e3f07645a697f9f3eeb2c5425d9a015a63 in dir /tmp/test, filtering for relevant files

[ERROR] 1/1 MDX files couldn't compile!
---
Error while compiling file README.md
Details: Expected a closing tag for `<TestInvalidMDXElement>` (15:1-15:24)
---
```
