import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  canonicalizeJcs,
  canonicalizeJcsBytes,
  decodeTaggedSha256,
  domainSeparatedSha256,
  parseDuplicateFreeIJson,
  sha256Tagged,
} from '../src/internal/canonical-jcs.js';
import {
  compareSemver,
  parseSemver,
  parseSemverRange,
  satisfiesSemverRange,
  SemanticValidationError,
} from '../src/internal/semver.js';

const require = createRequire(import.meta.url);
const semverOracle =
  /** @type {{ satisfies: (candidate: string, range: string, options: {loose: boolean, includePrerelease: boolean}) => boolean }} */ (
    require('semver')
  );

test('RFC 8785 canonicalization is byte-exact and uses UTF-16 key ordering', () => {
  assert.equal(
    canonicalizeJcs({ z: 1, a: -0, n: 1e30, small: 1e-27 }),
    '{"a":0,"n":1e+30,"small":1e-27,"z":1}',
  );
  assert.equal(canonicalizeJcs({ '\uE000': 1, '😀': 2 }), '{"😀":2,"":1}');
  assert.deepEqual(
    canonicalizeJcsBytes({ a: 'é' }),
    Uint8Array.from(Buffer.from('{"a":"é"}')),
  );
});

test('JCS rejects values outside duplicate-key-free I-JSON', () => {
  assert.throws(() => canonicalizeJcs(Number.NaN), /JCS_NON_FINITE_NUMBER/u);
  assert.throws(
    () => canonicalizeJcs({ missing: undefined }),
    /JCS_NON_JSON_VALUE/u,
  );
  const sparseArray = Array(2);
  sparseArray[1] = 1;
  assert.throws(() => canonicalizeJcs(sparseArray), /JCS_SPARSE_ARRAY/u);
  assert.throws(() => canonicalizeJcs('\uD800'), /UNICODE_SCALAR_INVALID/u);
  assert.throws(
    () => parseDuplicateFreeIJson(Buffer.from('{"a":1,"\\u0061":2}')),
    /IJSON_DUPLICATE_KEY/u,
  );
  assert.throws(
    () =>
      parseDuplicateFreeIJson(
        Buffer.from([0xef, 0xbb, 0xbf, 0x6e, 0x75, 0x6c, 0x6c]),
      ),
    /IJSON_BOM_FORBIDDEN/u,
  );
  assert.throws(
    () => parseDuplicateFreeIJson(Buffer.from([0xc3, 0x28])),
    /IJSON_INVALID_UTF8/u,
  );
  assert.throws(
    () => parseDuplicateFreeIJson(Buffer.from('"\\ud800"')),
    /UNICODE_SCALAR_INVALID/u,
  );
});

test('tagged SHA-256 and domain-separated preimages match independent vectors', () => {
  assert.equal(
    sha256Tagged(Buffer.from('abc')),
    'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
  assert.equal(
    domainSeparatedSha256('GALA-TEST-V2\0', Buffer.from('{"a":1}')),
    'sha256:d553e30e93b59fae06f7045ab296c18fc0822c06cb521846c76d72fa9c5e8c53',
  );
  assert.deepEqual(
    decodeTaggedSha256(
      'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ),
    Uint8Array.from(
      Buffer.from(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        'hex',
      ),
    ),
  );
  assert.throws(() => domainSeparatedSha256('GALA-TEST-V2', Buffer.alloc(0)));
  assert.throws(() => decodeTaggedSha256('ba7816'));
});

test('the exact DEC-099 SemVer and range grammar is enforced', () => {
  for (const value of ['1.2.3', '1.2.3-alpha.1', '0.0.0-0']) {
    assert.equal(parseSemver(value).source, value);
  }
  for (const range of [
    '1.2.3',
    '1.2.3-alpha.1',
    '^1.2.3',
    '^0.2.3',
    '^0.0.3-beta',
    '>=1.2.3 <2.0.0',
    '>=1.2.3 <=1.2.3',
    '>1.2.2 <1.2.3-beta',
  ]) {
    assert.equal(parseSemverRange(range).source, range);
  }
  for (const range of [
    '',
    '*',
    'latest',
    'v1.2.3',
    '=1.2.3',
    '~1.2.3',
    '1.2',
    '1.2.3+build',
    '>=1.2.3  <2.0.0',
    '<2.0.0 >=1.2.3',
    '>=1.2.3 || <2.0.0',
  ]) {
    assert.throws(() => parseSemverRange(range), SemanticValidationError);
  }
  for (const range of ['>1.2.3 <=1.2.3', '>1.2.3-alpha <1.2.3-alpha.0']) {
    assert.throws(
      () => parseSemverRange(range),
      (error) =>
        error instanceof SemanticValidationError &&
        error.code === 'SEMVER_RANGE_EMPTY',
    );
  }
});

test('SemVer comparison and caret expansion retain arbitrary precision', () => {
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-alpha.0'), -1);
  assert.equal(compareSemver('1.0.0-1', '1.0.0-alpha'), -1);
  assert.equal(
    compareSemver(
      '90071992547409931234567890.0.0',
      '90071992547409931234567889.999.999',
    ),
    1,
  );
  assert.equal(satisfiesSemverRange('1.9.9', '^1.2.3'), true);
  assert.equal(satisfiesSemverRange('2.0.0-0', '^1.2.3'), false);
  assert.equal(satisfiesSemverRange('0.2.99', '^0.2.3'), true);
  assert.equal(satisfiesSemverRange('0.3.0-0', '^0.2.3'), false);
  assert.equal(satisfiesSemverRange('0.0.3-beta.1', '^0.0.3-beta'), true);
  assert.equal(satisfiesSemverRange('1.2.3-0', '>1.2.2 <1.2.3-beta'), true);
});

test('first-party evaluation agrees with the pinned oracle inside its domain', () => {
  /** @type {[string, string][]} */
  const vectors = [
    ['1.2.3', '1.2.3'],
    ['1.2.4', '1.2.3'],
    ['1.9.9', '^1.2.3'],
    ['2.0.0-0', '^1.2.3'],
    ['0.2.9', '^0.2.3'],
    ['0.3.0', '^0.2.3'],
    ['1.2.3', '>=1.2.3 <2.0.0'],
    ['2.0.0', '>=1.2.3 <2.0.0'],
    ['1.2.3-0', '>1.2.2 <1.2.3-beta'],
  ];
  for (const [candidate, range] of vectors) {
    assert.equal(
      satisfiesSemverRange(candidate, range),
      semverOracle.satisfies(candidate, range, {
        loose: false,
        includePrerelease: false,
      }),
      `${candidate} against ${range}`,
    );
  }
});
