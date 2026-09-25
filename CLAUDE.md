# Repository instructions

## Purpose

Own Galascribe's portable JSON Schemas, OpenAPI source and bundle, generated
validators and consumer types; never own API business behavior.

## Commands

Use Node.js 24.18.0 and npm 11.16.0. Run `npm ci`, `npm run verify`,
`npm run licenses:check`, and `npm run sbom:check` before review. Use
`npm run format` only to apply formatting and `npm run declarations:generate`
only when the runtime package surface changes. Use `npm run codegen:generate`
after a root-schema or design-revision change; `npm run codegen:check` performs
the required two-clean-build reproducibility and committed-drift gate.

## Architecture boundaries

Runtime modules under `src/` must not import repository tooling from `codegen/`,
`scripts/`, or `test/`; `.dependency-cruiser.cjs` enforces the boundary and
rejects circular dependencies.

## What never goes here

Do not add controller implementations, domain aggregates, React UI, publication
rendering, provider adapters, deployment code, infrastructure state, secrets, or
deferred-MVP contracts.

## Contract sources and generation commands

The accepted S0 slice brief and its cited decision records are authoritative.
`npm run declarations:generate` emits declarations; `npm run declarations:check`
performs an isolated emit and byte comparison. `npm run codegen:generate` emits
`generated/typescript`, `generated/java`, and the schema inventory from the 19
roots and the hash-bound DEC-091 design manifest. Never hand-edit generated
output.

## How to run locally

Activate the pinned Node version, install with `npm ci`, and run
`npm run verify`. This scaffold has no service or external runtime dependency.

## Review checklist

Confirm exact tool pins, lockfile v3, zero floating workflow references,
declaration/runtime agreement, supply-chain artifact drift checks, no secret,
and passing quality gates before approval.
