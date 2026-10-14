# Contributing to web-tooling

This repository publishes reusable quality checks for independent static
websites. Contributions should be small, demonstrably useful to more than
one site, and compatible with existing callers pinned to reviewed commits.

## Before proposing a change

- Describe the actual website or workflow problem and why it belongs in
  shared CI rather than the calling repository.
- Preserve the existing input defaults unless a change is intentionally
  breaking and documented for consumers.
- Do not add deployment credentials, access to private source repositories,
  broad GitHub token permissions, or third-party remote execution.
- Avoid large framework-specific changes until multiple independent sites
  need the same behavior.

## Development and validation

The workflows require a lockfile-backed npm fixture. With Node.js and
actionlint installed, run:

~~~sh
actionlint .github/workflows/*.yml
cd test/fixture
npm ci
npm run check
npm run build
npm test
npm audit
cd ../..
node --test tests/check-public-sites.test.mjs
~~~

When modifying the website probe or allowlist, inspect
`public-sites.json` and run the command below. Network access is necessary
for the live probe, so it is not a replacement for deterministic tests.

~~~sh
node scripts/check-public-sites.mjs public-sites.json
~~~

Pull requests should explain the behavior change, the tested caller
scenario, compatibility implications and the validation performed. Existing
branch protection requires a PR and passing CI. New reusable workflow
versions should be adopted using a reviewed commit SHA, not `@main`.

## Reporting security problems

Follow [SECURITY.md](SECURITY.md). Do not disclose exploitable workflow
issues or credentials in public issues or pull requests.
