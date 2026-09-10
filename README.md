# `@rathnasgala2/schemas`

The Galascribe schema package is the sole authority for portable JSON Schemas,
the OpenAPI contract, generated validators, and generated consumer types. It
does not contain API business behavior, UI code, publication rendering, or
infrastructure configuration.

This repository is currently at the S0-T01 scaffold stage. Contract schemas and
generated validators arrive in later S0 increments; the empty runtime entry
point deliberately exposes no provisional contract.

## Prerequisites

- Node.js 24.18.0
- npm 11.16.0

Both versions are enforced by `package.json`; `.nvmrc` and `.node-version` carry
the same Node pin.

## Commands

```sh
npm ci
npm run verify
npm run declarations:generate
npm run licenses:check
npm run sbom:check
npm pack --dry-run
```

`npm run verify` builds declarations and runs formatting, lint, type,
architecture, duplication, workflow-pin, and test gates.

## Package layout

- `src/` — JavaScript ESM runtime package surface, checked from JSDoc.
- `types/` — declaration output emitted from `src/`.
- `codegen/` — TypeScript-only deterministic generation code (introduced by
  later S0 tasks).
- `scripts/` — repository verification and supply-chain tooling.
- `test/` — Node native tests.

Future S0 tasks add `schemas/`, `openapi/`, `examples/`, `fixtures/`,
`generated/`, `docs/`, and `compatibility/` as their contracts are materialized.
Empty directories are not committed as evidence.

## Architecture sources

The controlling sources currently exist only in the enclosing eleven-repository
workspace. Their workspace-relative paths are:

- `orchestration/slice-briefs/S0-executable-contracts.md`
- `orchestration/decisions/DEC-093-eleven-repository-workspace-and-rathnasgala2-namespace.md`
- `orchestration/decisions/DEC-094-javascript-esm-public-packages.md`
- `orchestration/decisions/DEC-096-mvp-scope-fence-and-per-slice-contract-materialization.md`
- `orchestration/WORKSPACE.md`

Public immutable links will replace these paths when the product owner assigns
the orchestration corpus a canonical public location.

## License

Apache License 2.0. See `LICENSE`, `NOTICE`, and `THIRD_PARTY_LICENSES.json`.
