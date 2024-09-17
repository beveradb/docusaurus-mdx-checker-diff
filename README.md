# docusaurus-mdx-checker-diff

A CLI to report MDX v3 parsing errors found in any content modified between two `git` SHAs, using the same setup as Docusaurus v3 uses.

Run this command in a CI workflow job for your repo:

```bash
npx docusaurus-mdx-checker-diff $SHA1 $SHA2
```

The command will return success if all modified Markdown/MDX documents are compatible with MDX v3 (Docusaurus flavor), or return (and print) an error if any are not compatible.

This tool was created to help Docusaurus v3+ users prevent content with broken Markdown/MDX from getting into repositories.

<TestInvalidMDXElement>
