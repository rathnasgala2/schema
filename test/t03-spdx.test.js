import assert from 'node:assert/strict';
import test from 'node:test';

import { SemanticValidationError } from '../src/internal/semver.js';
import {
  parseSpdxExpression,
  serializeSpdxExpression,
  validateSpdxCatalogEvidence,
  validateSpdxExpression,
} from '../src/internal/spdx.js';

const SPDX_DIGEST =
  'sha256:293418a03e6692c44332a12eb17889af99e20a4d571adfaca4408b203f75686b';

const EXACT_CATALOG_ENTRIES = [
  {
    kind: 'exception',
    id: 'GNOME-examples-exception',
    text: 'As a special exception, the copyright holders give you permission to copy, modify, and distribute the example code contained in this document under the terms of your choosing, without restriction.\n',
  },
  {
    kind: 'license',
    id: 'diffmark',
    text: '1. you can do what you want with it\n2. I refuse any responsibility for the consequences\n',
  },
];

/**
 * Assert one normalized semantic diagnostic.
 *
 * @param {() => unknown} action operation expected to fail
 * @param {string} code expected diagnostic code
 * @returns {void}
 */
function assertDiagnostic(action, code) {
  assert.throws(
    action,
    (error) => error instanceof SemanticValidationError && error.code === code,
  );
}

/**
 * Construct exact short-catalog evidence with selected overrides.
 *
 * @param {Record<string, unknown>} [overrides] field replacements
 * @returns {Record<string, unknown>} evidence record
 */
function catalogEvidence(overrides = {}) {
  return {
    licenseListVersion: '3.28.0',
    licenseListDigest: SPDX_DIGEST,
    catalogEntries: structuredClone(EXACT_CATALOG_ENTRIES),
    ...overrides,
  };
}

/**
 * Read one required mutable fixture entry.
 *
 * @param {{ kind: string, id: string, text: string }[]} entries fixture entries
 * @param {number} index required offset
 * @returns {{ kind: string, id: string, text: string }} required entry
 */
function requiredEntry(entries, index) {
  const entry = entries[index];
  if (!entry) throw new Error('invalid SPDX test fixture');
  return entry;
}

test('the exact SPDX grammar, precedence, and canonical serializer are enforced', () => {
  const accepted = [
    'MIT',
    '(GPL-2.0-only WITH Classpath-exception-2.0)',
    '(MIT OR Apache-2.0)',
    '((MIT OR Apache-2.0) AND BSD-3-Clause)',
    '(MIT AND (Apache-2.0 OR BSD-3-Clause))',
    '(Apache-2.0 OR MIT)',
  ];
  for (const source of accepted) {
    const expression = validateSpdxExpression(source);
    assert.equal(serializeSpdxExpression(expression), source);
  }

  assert.equal(
    serializeSpdxExpression(
      parseSpdxExpression('MIT OR Apache-2.0 AND BSD-3-Clause'),
    ),
    '(MIT OR (Apache-2.0 AND BSD-3-Clause))',
  );
  assert.equal(
    serializeSpdxExpression(
      parseSpdxExpression('MIT OR Apache-2.0 OR BSD-3-Clause'),
    ),
    '((MIT OR Apache-2.0) OR BSD-3-Clause)',
  );
  assert.notEqual('(MIT OR Apache-2.0)', '(Apache-2.0 OR MIT)');
  assert.notEqual(
    '((MIT OR Apache-2.0) OR BSD-3-Clause)',
    '(MIT OR (Apache-2.0 OR BSD-3-Clause))',
  );
});

test('valid trees with noncanonical source bytes receive the dedicated diagnostic', () => {
  for (const source of [
    '(MIT)',
    '((MIT))',
    'MIT OR Apache-2.0',
    'MIT AND Apache-2.0 AND BSD-3-Clause',
    'MIT WITH Classpath-exception-2.0',
    '((MIT WITH Classpath-exception-2.0))',
  ]) {
    assertDiagnostic(
      () => validateSpdxExpression(source),
      'SPDX_EXPRESSION_NOT_CANONICAL',
    );
  }
});

test('invalid syntax, membership, deprecation, and identifier forms fail without rewrite', () => {
  for (const source of [
    '',
    '()',
    '(MIT',
    'MIT)',
    '(MIT XOR Apache-2.0)',
    '(MIT or Apache-2.0)',
    '(mit OR Apache-2.0)',
    '(MIT  OR Apache-2.0)',
    '(MIT\tOR\tApache-2.0)',
    '(MIT OR  Apache-2.0)',
    'GPL-2.0',
    'GPL-2.0+',
    'LicenseRef-private',
    'DocumentRef-doc:LicenseRef-private',
    'Not-A-License',
    'Classpath-exception-2.0',
    '(MIT WITH MIT)',
    '(MIT WITH Unknown-exception)',
    '(MIT WITH Nokia-Qt-exception-1.1)',
    '((MIT OR Apache-2.0) WITH Classpath-exception-2.0)',
    '(MIT WITH Classpath-exception-2.0 WITH LLVM-exception)',
    'MÍT',
  ]) {
    assertDiagnostic(
      () => parseSpdxExpression(source),
      'SPDX_EXPRESSION_INVALID',
    );
  }
});

test('SPDX expressions enforce the ASCII byte ceiling before parsing', () => {
  let admitted = 'MIT';
  while (`(${admitted} OR MIT)`.length <= 128) {
    admitted = `(${admitted} OR MIT)`;
  }
  assert.equal(admitted.length, 120);
  assert.equal(
    serializeSpdxExpression(validateSpdxExpression(admitted)),
    admitted,
  );

  const oversized = `(${admitted} OR MIT)`;
  assert.equal(oversized.length, 129);
  assertDiagnostic(
    () => parseSpdxExpression(oversized),
    'SPDX_EXPRESSION_INVALID',
  );
});

test('catalog evidence is the exact active identifier/text closure in canonical set order', () => {
  const expression = '(diffmark WITH GNOME-examples-exception)';
  assert.doesNotThrow(() =>
    validateSpdxCatalogEvidence(expression, catalogEvidence()),
  );
  assert.doesNotThrow(() =>
    validateSpdxCatalogEvidence([expression, expression], catalogEvidence()),
  );

  const alteredText = structuredClone(EXACT_CATALOG_ENTRIES);
  requiredEntry(alteredText, 0).text += 'changed';
  const alteredKind = structuredClone(EXACT_CATALOG_ENTRIES);
  requiredEntry(alteredKind, 0).kind = 'license';
  const alteredId = structuredClone(EXACT_CATALOG_ENTRIES);
  requiredEntry(alteredId, 0).id = 'LLVM-exception';
  const extraMember = structuredClone(EXACT_CATALOG_ENTRIES);
  /** @type {Record<string, unknown>} */ (requiredEntry(extraMember, 0))[
    'unexpected'
  ] = true;

  for (const evidence of [
    catalogEvidence({ licenseListVersion: '3.27.0' }),
    catalogEvidence({ licenseListDigest: `sha256:${'0'.repeat(64)}` }),
    catalogEvidence({ catalogEntries: [] }),
    catalogEvidence({ catalogEntries: [EXACT_CATALOG_ENTRIES[0]] }),
    catalogEvidence({
      catalogEntries: [...EXACT_CATALOG_ENTRIES].reverse(),
    }),
    catalogEvidence({
      catalogEntries: [...EXACT_CATALOG_ENTRIES, EXACT_CATALOG_ENTRIES[1]],
    }),
    catalogEvidence({ catalogEntries: alteredText }),
    catalogEvidence({ catalogEntries: alteredKind }),
    catalogEvidence({ catalogEntries: alteredId }),
    catalogEvidence({ catalogEntries: extraMember }),
  ]) {
    assertDiagnostic(
      () => validateSpdxCatalogEvidence(expression, evidence),
      'SPDX_CATALOG_EVIDENCE_INVALID',
    );
  }

  assertDiagnostic(
    () => validateSpdxCatalogEvidence('diffmark', catalogEvidence()),
    'SPDX_CATALOG_EVIDENCE_INVALID',
  );
});

test('catalog validation preserves expression diagnostics', () => {
  assertDiagnostic(
    () => validateSpdxCatalogEvidence('GPL-2.0', catalogEvidence()),
    'SPDX_EXPRESSION_INVALID',
  );
  assertDiagnostic(
    () =>
      validateSpdxCatalogEvidence(
        'diffmark WITH GNOME-examples-exception',
        catalogEvidence(),
      ),
    'SPDX_EXPRESSION_NOT_CANONICAL',
  );
});
