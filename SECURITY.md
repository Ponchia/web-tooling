# Security

The workflows in this repository run against the **caller's source code**.
Please privately report suspected workflow vulnerabilities using GitHub's
**Report a vulnerability** option under the repository's Security tab, where
available. Do not open public issues for exploitable security problems.

Consumers should pin a reviewed commit SHA, use minimal permissions, and never
pass `secrets: inherit` to the quality workflow. A change in this public repo
must not silently change the code executed inside a private repository.

`npm audit` is a dependency gate, not an exhaustive security audit. Website
owners remain responsible for dependency upgrades, secrets, hosting settings,
headers, supply-chain reviews, and verifying their final deployments.
