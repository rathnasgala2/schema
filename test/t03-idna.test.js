import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodePunycode,
  encodePunycode,
  toAsciiDomain17,
  validateCanonicalAsciiDomain17,
} from '../src/internal/idna.js';

/**
 * Require one operation to reject with the exact portable diagnostic.
 *
 * @param {() => unknown} operation operation under test
 * @param {string} diagnostic expected diagnostic
 * @returns {void}
 */
function rejectsWith(operation, diagnostic) {
  assert.throws(operation, (error) => {
    if (!(error instanceof TypeError)) return false;
    assert.equal(error.message, diagnostic);
    return true;
  });
}

test('RFC 3492 Punycode examples encode and decode byte-exactly', () => {
  /** @type {[string, string][]} */
  const examples = [
    ['bücher', 'bcher-kva'],
    ['mañana', 'maana-pta'],
    ['例え', 'r8jz45g'],
    ['مثال', 'mgbh0fb'],
  ];
  for (const [unicode, ascii] of examples) {
    assert.equal(encodePunycode(unicode), ascii);
    assert.equal(decodePunycode(ascii), unicode);
  }
});

test('Unicode 17 UTS #46 uses nontransitional mapping and canonical ACE output', () => {
  assert.equal(toAsciiDomain17('BÜCHER.Example'), 'xn--bcher-kva.example');
  assert.equal(toAsciiDomain17('faß.de'), 'xn--fa-hia.de');
  assert.equal(toAsciiDomain17('Ａ.example'), 'a.example');
  assert.equal(toAsciiDomain17('例え.example'), 'xn--r8jz45g.example');
  assert.equal(
    toAsciiDomain17('xn--bcher-kva.example'),
    'xn--bcher-kva.example',
  );
});

test('canonical stored DNS names reject alternate and fake spellings', () => {
  for (const value of ['example.com', 'xn--bcher-kva.example']) {
    assert.doesNotThrow(() => validateCanonicalAsciiDomain17(value));
  }
  for (const value of [
    'Example.com',
    'bücher.example',
    'XN--BCHER-KVA.EXAMPLE',
    'xn--abc-.example',
    'example。com',
  ]) {
    rejectsWith(() => validateCanonicalAsciiDomain17(value), 'IDNA_INVALID');
  }
});

test('label syntax and DNS byte bounds fail closed', () => {
  const maxDomain = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
  assert.equal(toAsciiDomain17(maxDomain), maxDomain);
  for (const value of [
    '',
    '.example',
    'example.',
    'a..example',
    '-a.example',
    'a-.example',
    'ab--cd.example',
    '_service.example',
    '\u0301a.example',
    `${'a'.repeat(64)}.example`,
    `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}`,
  ]) {
    rejectsWith(() => toAsciiDomain17(value), 'IDNA_INVALID');
  }
});

test('Unicode 17 CheckJoiners distinguishes contextual failures', () => {
  assert.equal(toAsciiDomain17('क्‍ष.example'), 'xn--11b2ezcw70k.example');
  assert.equal(toAsciiDomain17('क्‌ष.example'), 'xn--11b2ezcs70k.example');
  assert.equal(toAsciiDomain17('ب‌ت.example'), 'xn--ngbe199q.example');
  for (const value of ['a‍b.example', 'a‌ب.example', 'a‌.b']) {
    rejectsWith(() => toAsciiDomain17(value), 'IDNA_CONTEXTJ_INVALID');
  }
});

test('RFC 5893 Bidi validation applies to every label in a Bidi domain', () => {
  assert.equal(toAsciiDomain17('مثال.example'), 'xn--mgbh0fb.example');
  for (const value of ['1مثال.example', 'مثال.123', 'ب1١.example']) {
    rejectsWith(() => toAsciiDomain17(value), 'IDNA_INVALID');
  }
});
