# Compatibility policy

`@rathnasgala2/schemas` versions the _package_, not the schema `$id`s. Every
root's `$id`/`schemaId` is pinned at `…:2.0.0` and never changes (enforced at
`src/internal/validator-core.js`'s `IMMUTABLE_SCHEMA_VERSION`); a contract's
content moves forward in the npm package version instead (`package.json`'s
`version`, 2.0.0 → 2.11.0 and beyond). A consumer that pins an exact package
version and re-validates the same document against a later one must get the same
accept/reject outcome unless the change it picked up is one of the additive
kinds below.

This document is the policy `npm run compatibility:check`
(`scripts/check-backward-compatibility.mjs`) enforces mechanically against the
committed baseline in `compatibility/baseline-schemas/` (one file per root,
refreshed to the current `schemas/*.schema.json` on every release -- see
"Updating the baseline" below). The gate classifies every structural difference
between a root's baseline and its current committed schema, then fails unless
every difference found is on the additive list.

## Additive (does not require special care beyond this gate passing)

A change is additive when every document that validated before still validates
the same way, and nothing that was rejected before becomes newly accepted for a
reason other than one of these:

- Removing a member from `required` (a field becomes optional).
- Adding a new optional property.
- Adding a new `$defs` entry.
- Widening a `pattern`, or removing one.
- Adding a member to an `enum`.
- Relaxing (raising or removing) a `maxLength`/`maxItems`/`maxProperties`/
  `x-gala-maximum`/`x-gala-*ByteLength` bound, or a `minLength`/`minItems`/
  `minProperties` floor being lowered or removed.
- Turning `additionalProperties: false` into a schema (opening a previously
  closed object), or widening an existing `additionalProperties` schema.
- Widening `type` to accept a strictly larger set of JSON types (for example
  `"string"` -> `["string","null"]`).
- Removing a `format` assertion, or removing a `type` constraint entirely.
- Relaxing `minimum` (lowering or removing it) or `maximum` (raising or removing
  it), and the same for `exclusiveMinimum`/`exclusiveMaximum`.
- Adding a branch to `oneOf`/`anyOf`.

## Breaking (the gate fails; requires a deliberate, reviewed release note)

Everything else that changes a root's validation behavior is breaking,
including:

- Adding a member to `required`.
- Removing an optional property, an `enum`/`const` member, or a `$defs` entry.
- Narrowing a `pattern`, or adding one where none existed.
- Tightening any bound in the relaxing list above in the other direction.
- Turning an open `additionalProperties` schema into `false`.
- Changing a root's `$id`/`schemaId` (this must never happen; see above).
- Narrowing `type` (dropping a member of a union, or changing to an unrelated
  type outright), or adding a `type` constraint where none existed.
- Adding a `format` assertion to a property that had none, or changing an
  existing `format` to a different one.
- Tightening `minimum` (raising it) or `maximum` (lowering it), and the same for
  `exclusiveMinimum`/`exclusiveMaximum`.
- Removing a branch from `oneOf`/`anyOf`, even from the middle of the list.

A breaking change is not forbidden -- DEC-097-class contracts have shipped
deliberate breaking narrowings before (SCH-C3's `positiveInt64`/
`githubPositiveDecimal`/`destinationIdentity.baseUrl` reconciliation is one:
some roots gained a real upper bound they previously lacked). It means the
gate's failure is expected for that change, and the release notes in
`CHANGELOG.md` must say so explicitly, citing which roots and which members. The
gate does not currently block a release on a breaking change by itself (see
"What the gate does not do"); it exists so a breaking change is never _silent_.

## What the gate does not do

- It does not require a SemVer major bump for a breaking change. This package
  has shipped breaking-shaped schema tightenings inside a minor release before
  this gate existed (see `CHANGELOG.md`'s SCHEMA-2.9.0/2.10.0 entries), and
  retroactively renumbering history is not this gate's job. What it guarantees
  going forward is that a breaking change is _reported_ at build time, not
  discovered by a consumer at runtime.
- It does not compare against the npm registry's last published tarball. The
  committed `compatibility/baseline-schemas/` snapshot is the baseline instead,
  so the gate has no network dependency and works the same in CI and locally.
- It does not understand semantic equivalence across a `$defs` rename. If a
  reconciliation (SCH-C3) renames a `$defs` entry, the gate sees the old name
  disappear and the new one appear; whether that is additive or breaking depends
  on whether anything outside this repository ever referenced the internal
  `$defs` name directly (nothing should -- see SCH-C3's commit for why a `$defs`
  rename is not compatibility-relevant on its own).

## Updating the baseline

`compatibility/baseline-schemas/` is refreshed to the current
`schemas/*.schema.json` as part of every release that changes schema content
(`npm run compatibility:baseline:update`, run once a release is prepared and its
CHANGELOG entry is written). Refreshing it before the release's CHANGELOG entry
exists would erase the very diff the entry is supposed to describe.

## Which roots this gate diffs

The gate does not `readdir(schemas/)` to decide which roots to check; it reads
`docs/catalogs/schema-inventory.json` (generated by `npm run codegen:generate`,
gated by `npm run codegen:check`) and diffs exactly the `JSON_SCHEMA`-kind
contracts it lists. That listing is then cross-checked against both
`compatibility/baseline-schemas/` and `schemas/`: a root present in one but not
all three (an inventory not regenerated after a new root was added, a baseline
snapshot never refreshed, a schema file deleted without touching the inventory)
is reported as its own breaking finding rather than silently skipped. This is
what gives the schema inventory a real consumer instead of being a generated,
shipped file nobody reads (SCH-M12).
