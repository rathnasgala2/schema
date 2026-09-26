# Security policy

Do not open a public issue for a suspected vulnerability or exposed secret. Use
GitHub's private vulnerability reporting for this repository. Include the
affected contract or tool version, reproduction steps, and observed impact; do
not include live credentials or personal data.

## Supported versions

`@rathnasgala2/schemas` is published on the `2.x` line. Only the latest
published `2.x` version is supported; there is no long-term-support line and no
back-port policy. Consumers should pin an exact version (this package does not
use SemVer ranges for its own dependencies and recommends the same discipline of
its consumers) and upgrade to the latest `2.x` release to pick up a fix.

## Response commitments

Reports are acknowledged within 5 business days. A confirmed vulnerability is
fixed and published as a new `2.x` version; the fix's timeline depends on
severity, and the reporter is credited in the release's `CHANGELOG.md` entry
unless they ask not to be.

## Advisory channel

Use GitHub's private vulnerability reporting for this repository (see above) to
report, and GitHub Security Advisories for this repository to track a published
fix.
