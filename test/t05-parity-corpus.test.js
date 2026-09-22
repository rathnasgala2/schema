import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adversarialCaseId,
  createAdversarialRequest,
  createCanonicalByteParityCases,
  createCanonicalByteRequest,
  createDigestRequest,
  createDigestParityCases,
  createNetworkntStructuralRequest,
  createScalarParityCases,
  createScalarRequest,
  createStructuralParityCases,
  loadParityExpectations,
  validateAdversarialFixture,
  validateCanonicalByteParityCase,
  validateDigestParityCase,
  validateStructuralCaseWithAjv,
  validateScalarParityCase,
} from '../scripts/validator-parity.mjs';
import { validateRegisteredFragment } from '../src/internal/schema-validator.js';

test('the parity corpus includes every structural fixture without sampling', async () => {
  const corpus = await createStructuralParityCases();
  assert.equal(corpus.contracts.length, 20);
  assert.equal(corpus.omittedCaseCount, 0);
  assert.ok(corpus.cases.length >= 12_295);
  assert.equal(
    corpus.cases.filter(({ caseId }) => caseId.startsWith('sentinel:')).length,
    35,
  );
  assert.equal(
    new Set(corpus.cases.map(({ caseId }) => caseId)).size,
    corpus.cases.length,
  );
  assert.deepEqual(
    [...new Set(corpus.cases.map(({ contract }) => contract))].sort(),
    corpus.contracts,
  );
});

test('both runtimes consume the complete shared DEC-099 scalar vectors', async () => {
  const cases = await createScalarParityCases();
  const expectations = await loadParityExpectations();
  assert.equal(cases.length, 1_995);
  assert.equal(
    cases.filter(({ caseId }) =>
      caseId.startsWith('scalar:grapheme-conformance:'),
    ).length,
    766,
  );
  assert.deepEqual(
    Object.keys(expectations.scalars).sort(),
    cases.map(({ caseId }) => caseId).sort(),
  );
  for (const fixture of cases) {
    assert.deepEqual(
      validateScalarParityCase(fixture),
      expectations.scalars[fixture.caseId],
    );
    const request = createScalarRequest(fixture);
    assert.equal(request.expectedValid, undefined);
    assert.equal(request.expectedCodes, undefined);
    assert.equal(request.output, undefined);
  }
});

test('raw RFC 8785 vectors lock number and string spelling plus byte thresholds', async () => {
  const cases = await createCanonicalByteParityCases();
  const expectations = await loadParityExpectations();
  assert.equal(cases.length, 23);
  assert.deepEqual(
    Object.keys(expectations.canonicalBytes).sort(),
    cases.map(({ caseId }) => caseId).sort(),
  );
  for (const fixture of cases) {
    assert.deepEqual(
      validateCanonicalByteParityCase(fixture),
      expectations.canonicalBytes[fixture.caseId],
    );
    const request = createCanonicalByteRequest(fixture);
    assert.equal(request.expectedValid, undefined);
    assert.equal(request.expectedCodes, undefined);
    assert.equal(request.canonical, undefined);
  }
});

test('the committed snapshot locks each complete normalized result', async () => {
  const corpus = await createStructuralParityCases();
  const expectations = await loadParityExpectations();
  assert.deepEqual(
    Object.keys(expectations.structural).sort(),
    corpus.cases.map(({ caseId }) => caseId).sort(),
  );
  const caseIds = [
    'appearance:appearance-invalid-2e436a50b7903a6e:invalid',
    'appearance:appearance-unknown-e01b29a6b0d28dc0:unknownField',
    'deployment-intent:deployment-intent-invalid-1ba811a8262fc120:invalid',
  ];
  for (const caseId of caseIds) {
    const fixture = corpus.cases.find(
      (candidate) => candidate.caseId === caseId,
    );
    if (fixture === undefined) assert.fail(`${caseId} is absent`);
    const result = validateStructuralCaseWithAjv(fixture);
    assert.deepEqual(result, expectations.structural[caseId]);
    for (const code of fixture.expectedCodes) {
      assert.ok(result.codes.includes(code), `${caseId} omitted ${code}`);
    }
  }
});

test('large structural recipes preserve exact cardinality in the Java payload', async () => {
  const corpus = await createStructuralParityCases();
  const fixture = corpus.cases.find(
    ({ fixture: candidate }) =>
      Number(
        /** @type {{length?: unknown} | undefined} */ (candidate.recipe)
          ?.length ?? 0,
      ) > 100_000,
  );
  if (fixture === undefined) assert.fail('large array recipe is absent');
  const request = createNetworkntStructuralRequest(fixture);
  assert.ok(
    request.checks.every((check) => check.coveredRuleIds === undefined),
  );
  const firstCheck = request.checks[0];
  if (!firstCheck || !Array.isArray(firstCheck.instance)) {
    assert.fail('large array parity payload is absent');
  }
  const recipe = /** @type {{length: number}} */ (fixture.fixture.recipe);
  assert.equal(firstCheck.instance.length, recipe.length);
});

test('fragment diagnostics derive from Ajv schema paths, not fixture hints', async () => {
  const result = validateRegisteredFragment(
    'urn:gala:schema:author:2.0.0',
    '#/$defs/socialLink',
    { type: 'email', uri: 'https://example.com/' },
  );
  assert.deepEqual(result.codes, ['SCHEMA_PATTERN_INVALID']);
});

test('all adversarial semantic fixtures and sentinels reject with exact codes', async () => {
  const corpus = await createStructuralParityCases();
  assert.equal(corpus.adversarial.length, 32);
  assert.equal(
    new Set(corpus.adversarial.map(({ category }) => category)).size,
    14,
  );
  assert.equal(
    new Set(corpus.adversarial.map(adversarialCaseId)).size,
    corpus.adversarial.length,
  );
  for (const fixture of corpus.adversarial) {
    const expected = fixture.expectedValid
      ? { valid: true, codes: [] }
      : { valid: false, codes: [fixture.expectedCode] };
    assert.deepEqual(validateAdversarialFixture(fixture), expected);
    const request = /** @type {{fixture: Record<string, unknown>}} */ (
      createAdversarialRequest(fixture)
    );
    assert.equal(request.fixture.expectedCode, undefined);
  }
});

test('all active digest domains have accepted and tampered parity vectors', async () => {
  const cases = await createDigestParityCases();
  // 80 per-domain vectors plus the 16 SCHEMA-2.9.0/2.10.0 DEC-097 record
  // vectors (11 from 2.9.0 plus 5 SCHEMA-2.10.0 additions: spaces-website-
  // configuration root/docs-base-path, spaces-control-plane-binding,
  // spaces-region-catalog, and the realistic chained do-spaces provider
  // binding), each as one accepted and one tampered case.
  assert.equal(cases.length, 160 + 32);
  assert.equal(new Set(cases.map(({ profile }) => profile)).size, 80);
  const domainCases = cases.filter(
    ({ caseId }) => !caseId.startsWith('digest:record:'),
  );
  assert.equal(domainCases.length, 160);
  for (const profile of new Set(domainCases.map(({ profile }) => profile))) {
    assert.deepEqual(
      domainCases
        .filter((fixture) => fixture.profile === profile)
        .map(({ expectedValid }) => expectedValid)
        .sort(),
      [false, true],
    );
  }
  const recordStems = new Set(
    cases
      .filter(({ caseId }) => caseId.startsWith('digest:record:'))
      .map(({ caseId }) => caseId.replace(/:(?:valid|tampered)$/u, '')),
  );
  assert.equal(recordStems.size, 16);
  for (const fixture of cases) {
    assert.deepEqual(validateDigestParityCase(fixture), {
      valid: fixture.expectedValid,
      codes: fixture.expectedCodes,
    });
    const request = createDigestRequest(fixture);
    assert.equal(request.expectedValid, undefined);
    assert.equal(request.expectedCodes, undefined);
  }
});
