import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

/**
 * The closed set of camelCase `x-gala-*` JSON Schema assertion keywords
 * (SCH-M10). These are schema-authoring keywords with implementations in
 * `src/internal/gala-keywords.js` / `codegen/generate-contracts.ts`, carried
 * over from JSON Schema's own camelCase keyword convention.
 */
const CLOSED_JSON_SCHEMA_X_GALA_KEYWORDS = new Set([
  'x-gala-asciiByteLength',
  'x-gala-decision-phase',
  'x-gala-graphemeLength',
  'x-gala-maxCanonicalBytes',
  'x-gala-maximum',
  'x-gala-utf8ByteLength',
]);

/**
 * The closed set of `x-gala-*` extensions the OpenAPI bundle carries
 * (SCH-M10). Two of these (`x-gala-asciiByteLength`, `x-gala-graphemeLength`,
 * `x-gala-maximum`, `x-gala-utf8ByteLength`) are the JSON-Schema-side
 * camelCase assertion keywords surfacing unchanged in the bundle; the rest
 * are kebab-case OpenAPI-only metadata extensions with no JSON Schema
 * equivalent. Unifying the two conventions (or documenting the intended
 * per-keyword mapping) is deliberately deferred -- SCH-M10 calls it out as
 * a naming-convention cleanup, not a behavior bug, and this repository's own
 * compatibility gate would treat some of that unification as a breaking
 * `format`/keyword-shaped change. This is the closed list either way: a new
 * `x-gala-*` extension must be added here deliberately.
 */
const CLOSED_OPENAPI_X_GALA_EXTENSIONS = new Set([
  'x-gala-action-grant',
  'x-gala-activation-gate',
  'x-gala-activation-guards',
  'x-gala-asciiByteLength',
  'x-gala-assurance-class',
  'x-gala-capability-key',
  'x-gala-capability-resolution',
  'x-gala-concurrency',
  'x-gala-conditional-capabilities',
  'x-gala-conditional-capability-keys',
  'x-gala-const',
  'x-gala-contract-id',
  'x-gala-example-profile',
  'x-gala-graphemeLength',
  'x-gala-maximum',
  'x-gala-nullability',
  'x-gala-problem-codes',
  'x-gala-purpose',
  'x-gala-query-constraints',
  'x-gala-reachable-problems',
  'x-gala-replay-identity',
  'x-gala-source-design-revision',
  'x-gala-state-guards',
  'x-gala-success-category',
  'x-gala-tenant-scope',
  'x-gala-utf8ByteLength',
]);

test('the JSON Schema roots use exactly the closed x-gala-* keyword vocabulary (SCH-M10)', async () => {
  const files = (await readdir('schemas')).filter((file) =>
    file.endsWith('.schema.json'),
  );
  const used = new Set();
  for (const file of files) {
    const matches = (await readFile(`schemas/${file}`, 'utf8')).matchAll(
      /"(x-gala-[a-zA-Z0-9-]+)"\s*:/gu,
    );
    for (const match of matches) used.add(match[1]);
  }
  assert.deepEqual(
    [...used].sort(),
    [...CLOSED_JSON_SCHEMA_X_GALA_KEYWORDS].sort(),
  );
});

test('the OpenAPI bundle uses exactly the closed x-gala-* extension vocabulary (SCH-M10)', async () => {
  const source = await readFile('openapi/openapi.yaml', 'utf8');
  const used = new Set(
    [...source.matchAll(/\bx-gala-[a-zA-Z0-9-]+\b/gu)].map((match) => match[0]),
  );
  assert.deepEqual(
    [...used].sort(),
    [...CLOSED_OPENAPI_X_GALA_EXTENSIONS].sort(),
  );
});
