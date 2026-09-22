import assert from 'node:assert/strict';
import test from 'node:test';

import languageRegistry from '../src/internal/generated/iana-language.json' with { type: 'json' };
import {
  canonicalizeBcp47,
  validateCanonicalBcp47,
} from '../src/internal/bcp47.js';

/**
 * Assert one stable BCP-47 diagnostic.
 *
 * @param {() => unknown} operation operation expected to fail
 * @param {'BCP47_INVALID' | 'BCP47_NOT_CANONICAL'} code expected code
 * @returns {void}
 */
function assertDiagnostic(operation, code) {
  assert.throws(
    operation,
    (error) =>
      error instanceof TypeError &&
      'code' in error &&
      error.code === code &&
      error.message === code,
  );
}

test('all required DEC-099 canonical vectors are accepted', () => {
  const values = [
    'en',
    'sr-Latn-RS',
    'de-1901',
    'qaa',
    'en-Qaaa',
    'en-QM',
    'x-private',
    'en-Latn',
    'i-enochian',
    'i-default',
  ];
  for (const value of values) {
    assert.equal(canonicalizeBcp47(value), value);
    assert.equal(validateCanonicalBcp47(value), true);
  }
});

test('preferred values, casing, extlang removal, and extension sorting are exact', () => {
  /** @type {[string, string][]} */
  const vectors = [
    ['EN-us', 'en-US'],
    ['bh', 'bih'],
    ['en-BU', 'en-MM'],
    ['i-klingon', 'tlh'],
    ['I-DEFAULT', 'i-default'],
    ['zh-cmn-Hans-CN', 'cmn-Hans-CN'],
    ['en-u-foo-t-bar', 'en-t-bar-u-foo'],
    ['x-PRIVATE', 'x-private'],
    ['ja-Latn-hepburn-heploc', 'ja-Latn-hepburn-alalc97'],
  ];
  for (const [source, expected] of vectors) {
    assert.equal(canonicalizeBcp47(source), expected, source);
    assertDiagnostic(
      () => validateCanonicalBcp47(source),
      'BCP47_NOT_CANONICAL',
    );
  }
});

test('required invalid vectors fail with BCP47_INVALID', () => {
  const values = [
    'de-1901-1901',
    'en-u-foo-U-bar',
    'en-cmn',
    'zh-cmn-yue',
    'zzzz',
    'en-abcde',
    'en-a-foo',
    'en-u-a',
    'en-x',
    'x',
    '',
    '-en',
    'en-',
    'en--US',
    'en_US',
    'é',
  ];
  for (const value of values) {
    assertDiagnostic(() => canonicalizeBcp47(value), 'BCP47_INVALID');
    assertDiagnostic(() => validateCanonicalBcp47(value), 'BCP47_INVALID');
  }
});

test('private ranges, opaque private use, and extension ABNF remain bounded', () => {
  for (const value of [
    'qtz',
    'en-Qabx',
    'en-AA',
    'en-QZ',
    'en-XA',
    'en-ZZ',
    'en-419',
    'en-1606nict',
    'agp',
    'en-t-12-abcd-u-foo-x-a-u',
    'x-a-u-12345678',
  ]) {
    assert.equal(canonicalizeBcp47(value), value);
  }

  const maximumPrivateUse = `x-${Array(28).fill('aaaaaaaa').join('-')}-a`;
  assert.equal(maximumPrivateUse.length, 255);
  assert.equal(canonicalizeBcp47(maximumPrivateUse), maximumPrivateUse);
  assertDiagnostic(
    () => canonicalizeBcp47(`${maximumPrivateUse}a`),
    'BCP47_INVALID',
  );

  for (const value of [
    'en-Qaby',
    'en-u-123456789',
    'x-123456789',
    'en-0-foo',
  ]) {
    assertDiagnostic(() => canonicalizeBcp47(value), 'BCP47_INVALID');
  }
});

test('every pinned whole-tag record obeys its canonicalization rule', () => {
  const wholeTags = languageRegistry.records.filter(
    (record) => record.type === 'grandfathered' || record.type === 'redundant',
  );
  assert.equal(wholeTags.length, 93);
  for (const record of wholeTags) {
    assert.ok(record.tag);
    if (record.preferredValue !== undefined) {
      assert.equal(
        canonicalizeBcp47(record.tag),
        canonicalizeBcp47(record.preferredValue),
        record.tag,
      );
      assertDiagnostic(
        () => validateCanonicalBcp47(record.tag),
        'BCP47_NOT_CANONICAL',
      );
    } else {
      assert.equal(canonicalizeBcp47(record.tag), record.tag);
      assert.equal(validateCanonicalBcp47(record.tag), true);
    }
  }
});

test('every pinned subtag Preferred-Value is applied in its role', () => {
  const preferredRecords = languageRegistry.records.filter(
    (record) =>
      record.subtag !== undefined && record.preferredValue !== undefined,
  );
  assert.equal(preferredRecords.length, 377);
  for (const record of preferredRecords) {
    let source;
    let expected;
    if (record.type === 'language') {
      source = record.subtag;
      expected = record.preferredValue.toLowerCase();
    } else if (record.type === 'extlang') {
      assert.equal(record.prefixes?.length, 1);
      source = `${record.prefixes[0]}-${record.subtag}`;
      expected = record.preferredValue.toLowerCase();
    } else if (record.type === 'region') {
      source = `en-${record.subtag}`;
      expected = `en-${record.preferredValue.toUpperCase()}`;
    } else if (record.type === 'variant') {
      source = `en-${record.subtag}`;
      expected = `en-${record.preferredValue.toLowerCase()}`;
    } else {
      continue;
    }
    assert.equal(canonicalizeBcp47(source), expected, source);
    assertDiagnostic(
      () => validateCanonicalBcp47(source),
      'BCP47_NOT_CANONICAL',
    );
  }
});
