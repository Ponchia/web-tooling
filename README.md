# Web tooling

Small, public, reusable **CI checks for static Node.js websites**. Each site's
source, deployment, domain, secrets, and release process stay in that site's
own repository. There is no website monorepo and no deployment automation here.

## Current scope

The [`static-site-quality.yml`](.github/workflows/static-site-quality.yml)
reusable GitHub Actions workflow checks a lockfile-backed npm project on a
GitHub-hosted Ubuntu runner with Node.js 22 by default:

- `npm ci` with lockfile-aware npm caching
- `npm audit --omit=dev` **and** `npm audit` (both fail on the configured severity)
- `npm run check` and `npm run build` by default
- Optional `npm test` and `npm run format:check`

It never deploys, publishes packages, needs cloud tokens, or accesses shared
self-hosted runners. The caller's `GITHUB_TOKEN` is scoped to `contents: read`,
and checkout does not persist Git credentials.

## Use from a website

Create `.github/workflows/quality.yml` **in the website repository**:

```yaml
name: Quality
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  quality:
    uses: Ponchia/web-tooling/.github/workflows/static-site-quality.yml@FULL_40_CHARACTER_COMMIT_SHA
    permissions:
      contents: read
    with:
      run-tests: true # enable only when package.json has a test script
```

**Replace the placeholder with a reviewed 40-character commit SHA**, not
`@main`. Pinning prevents a shared-workflow change from automatically
executing inside other repositories. Review and explicitly update the SHA
when adopting future versions. Do not pass secrets to this workflow.

Optional inputs:

| Input | Default | Effect |
| --- | --- | --- |
| `working-directory` | `.` | Directory containing `package.json` and `package-lock.json` |
| `node-version` | `'22'` | Node.js version |
| `run-check` | `true` | Require and execute `npm run check` |
| `run-build` | `true` | Require and execute `npm run build` |
| `run-tests` | `false` | Execute `npm test` |
| `run-format` | `false` | Execute `npm run format:check` |
| `run-audit` | `true` | Audit production and all dependencies |
| `audit-level` | `'high'` | Fail at this severity or greater (`info`, `low`, `moderate`, `high`, `critical`) |

For packages in nested folders, set `working-directory: site`; the npm cache
uses that folder's lockfile. If a site has additional browser, accessibility,
end-to-end, or Lighthouse tests, **keep them in its own workflow** until a
shared pattern demonstrably applies to multiple sites.

## Security / boundaries

The reusable workflow runs in the **caller's** GitHub Actions context, using
the caller's source code and GitHub-hosted runner. The GitHub-hosted minutes are
billed to the caller; a private site's CI does **not** become free just because
it uses this public workflow. Do not use `pull_request_target` to run untrusted
PR code or pass cloud deployment credentials to a validation job.

All workflows are validated with `actionlint`, and this repository's own CI
calls the shared workflow on a minimal fixture with a real lockfile, build,
and tests. See [SECURITY.md](SECURITY.md).

## What isn't included

No starter template yet; no generic deployment abstraction, browser audits,
shared Astro package, project-wide lint configurations, or dependency on any
particular hosting provider. Add one only once real independent sites need it.

## Development

```sh
actionlint .github/workflows/*.yml
cd test/fixture
npm ci
npm run check
npm run build
npm test
npm audit
```

MIT licensed. Contributions via pull requests are welcome.
