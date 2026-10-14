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
| `runner-label` | `'ubuntu-latest'` | Hosted runner or repository-specific ARC scale-set label |
| `run-check` | `true` | Require and execute `npm run check` |
| `run-build` | `true` | Require and execute `npm run build` |
| `run-tests` | `false` | Execute `npm test` |
| `run-format` | `false` | Execute `npm run format:check` |
| `run-audit` | `true` | Audit production and all dependencies |
| `audit-level` | `'high'` | Fail at this severity or greater (`info`, `low`, `moderate`, `high`, `critical`) |

### Private repositories using self-hosted runners

The default (`ubuntu-latest`) is appropriate for public repositories. When
GitHub refuses hosted runners in a private repository because of spending limits,
set `runner-label` to **that repository's own** ephemeral ARC scale-set name,
for example `arc-vps-personal-site`. Both shared and site-specific jobs must
target self-hosted runners to avoid the same block.

Treat private runner jobs as untrusted-code execution: `npm ci` can run arbitrary
package scripts. Use isolated ephemeral runner pods, least-privilege Kubernetes
service accounts without mounted API tokens, no production credentials, and
controlled PR permissions. Do not run public fork PRs on privileged VPS runners.

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

## Live public website checks (no source access)

The [Live public sites](.github/workflows/live-sites.yml) job runs **in this
public repository** daily and on manual dispatch. Its
[`public-sites.json`](public-sites.json) allowlist currently checks the publicly
reachable personal and Podosan homepages. This job is independent of the sites'
private repositories and GitHub Actions billing, and uses no deployment
credentials or website source code.

It checks HTTPS, HTTP 200, HTML content type, a nonempty title, unexpected
cross-domain redirects and accidental `noindex` directives. Missing basic
security response headers and any `Set-Cookie` are **warnings**, not proof of
insecurity or a GDPR violation. It does not replace source-level dependency
scanning, CodeQL, browser audits, Cloudflare or Netlify build checks, or an
uptime-monitoring SLA.

```sh
node --test tests/check-public-sites.test.mjs
node scripts/check-public-sites.mjs public-sites.json
```

For private sites, GitHub bills Actions runs to the **private caller**, even
when a workflow is sourced from this public repository; account payment or
spending-limit restrictions can prevent those jobs from starting. This public
URL probe is a useful independent check while private CI is unavailable, but
cannot validate the private source code or deployments triggered by commits.
