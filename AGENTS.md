# Agent guidance for Ponchia/web-tooling

This project contains reusable GitHub Actions checks for independent static
Node.js websites and public URL smoke tests. Its workflows execute inside
other repositories, so the trust boundary is important.

- Read README.md, CONTRIBUTING.md and SECURITY.md before editing.
- Do not introduce deployment, publishing, secrets inheritance, or privileged
  tokens into the reusable validation workflow.
- Keep caller permissions read-only and do not use pull_request_target to run
  untrusted pull-request code.
- Pin external workflow and Action dependencies to reviewed SHAs, where
  feasible; never weaken existing integrity verification for actionlint.
- Reusable workflow inputs and defaults are a public interface. Review
  compatibility and adjust the fixture/tests when changing them.
- Keep each site's private deployment configuration in its own repository.
- The public-site probe must only read the explicit URL allowlist. It is
  not an uptime SLA, source security scan, or browser rendering test.
- For changes, use a branch and pull request; main requires existing CI.
- Verify workflow syntax with actionlint and run the fixture commands from
  CONTRIBUTING.md. Run offline probe tests before network-dependent checks.
