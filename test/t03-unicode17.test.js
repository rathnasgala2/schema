import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  assertUnicodeScalarString,
  checkJoiners17,
  graphemeBoundaries17,
  graphemeLength17,
  joiningType17,
  normalizeNfc17,
  unicodeCollisionKey17,
} from '../src/internal/unicode17.js';

test('Unicode 17 NFC and default case folding use generated pinned data', () => {
  assert.equal(normalizeNfc17('e\u0301'), 'é');
  assert.equal(normalizeNfc17('\u212B'), 'Å');
  assert.equal(normalizeNfc17('\u1100\u1161\u11A8'), '각');
  assert.equal(normalizeNfc17('a\u0315\u0300'), 'à\u0315');
  assert.equal(unicodeCollisionKey17('Straße'), 'strasse');
  assert.notEqual('\uA7CE', '\uA7CF');
  assert.equal(unicodeCollisionKey17('\uA7CE'), '\uA7CF');
  assert.equal(unicodeCollisionKey17('\uA7CF'), '\uA7CF');
});

test('Unicode scalar validation rejects every lone-surrogate position', () => {
  for (const value of ['\uD800', '\uDC00', `a\uD800`, `\uDC00a`, `a\uD800b`]) {
    assert.throws(
      () => assertUnicodeScalarString(value),
      /UNICODE_SCALAR_INVALID/u,
    );
  }
  assert.doesNotThrow(() => assertUnicodeScalarString('a😀z'));
});

test('the complete Unicode 17 GraphemeBreakTest boundary corpus passes', async () => {
  const source = await readFile(
    'codegen/source-data/unicode/17.0.0/ucd/auxiliary/GraphemeBreakTest.txt',
    'utf8',
  );
  let rows = 0;
  for (const line of source.split('\n')) {
    const body = line.split('#', 1)[0]?.trim();
    if (!body) continue;
    const codePoints = [];
    const expected = [];
    for (const token of body.split(/\s+/u)) {
      if (token === '÷') expected.push(codePoints.length);
      else if (token !== '×') codePoints.push(Number.parseInt(token, 16));
    }
    const value = String.fromCodePoint(...codePoints);
    assert.deepEqual(graphemeBoundaries17(value), expected, body);
    rows += 1;
  }
  assert.equal(rows, 766);
});

test('Unicode 17 grapheme sentinels have their exact cluster counts', () => {
  /** @type {[string, number][]} */
  const vectors = [
    ['', 0],
    ['a', 1],
    ['a\u0308', 1],
    ['\r\n', 1],
    ['\u1100\u1161\u11A8', 1],
    ['🇦🇧🇨', 2],
    ['🛑\u200D🛑', 1],
    ['\u0915\u094D\u0924', 1],
    ['\u0915\u094D\u200D\u0924', 1],
    ['\u{1FAEA}\u200D\u{1FAEF}', 1],
  ];
  for (const [value, count] of vectors) {
    assert.equal(graphemeLength17(value), count, JSON.stringify(value));
  }
});

test('DEC-099 CheckJoiners uses CCC and complete joining-type scans', () => {
  assert.equal(joiningType17(0x0628), 'D');
  assert.equal(joiningType17(0x064b), 'T');
  assert.equal(joiningType17(0x0041), 'U');
  assert.doesNotThrow(() => checkJoiners17('\u0915\u094D\u200C'));
  assert.doesNotThrow(() => checkJoiners17('\u0915\u094D\u200D'));
  assert.doesNotThrow(() => checkJoiners17('\u0628\u064B\u200C\u064B\u0628'));
  for (const label of ['\u200C', '\u200D', '\u0628\u200C.', '\u200D\u0628']) {
    assert.throws(() => checkJoiners17(label), /IDNA_CONTEXTJ_INVALID/u);
  }
});
