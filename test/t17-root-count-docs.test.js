import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const NUMBER_WORDS = {
  17: 'seventeen',
  18: 'eighteen',
  19: 'nineteen',
  20: 'twenty',
  21: 'twenty-one',
};

/**
 * Prose files that state the total root count in words or digits, and the
 * exact substring that must be present for the *current* count (checked
 * literally, not by absence of a stale one -- SCH-M1 asks that the count be
 * derived and every mention checked, not that one previous typo be fixed).
 */
const DOC_ASSERTIONS = [
  { file: 'README.md', mustContain: ['all 20 S0-T04 JSON Schema roots'] },
  {
    file: 'CLAUDE.md',
    mustContain: ['20 roots and the hash-bound DEC-091 design manifest'],
  },
];

test('the repository has exactly twenty schema roots (derived, SCH-M1)', async () => {
  const files = (await readdir('schemas')).filter((file) =>
    file.endsWith('.schema.json'),
  );
  const count = files.length;
  assert.equal(
    count,
    20,
    'the root count changed; update every doc mention this test checks, ' +
      'and the ones it does not (grep for "nineteen"/"twenty" roots)',
  );

  for (const { file, mustContain } of DOC_ASSERTIONS) {
    const text = await readFile(file, 'utf8');
    for (const phrase of mustContain) {
      assert.ok(
        text.includes(phrase),
        `${file} no longer contains ${JSON.stringify(phrase)}; it must state the current root count (${NUMBER_WORDS[count] ?? count})`,
      );
    }
  }
});

test('no doc claims the stale nineteen-root count for the total (SCH-M1)', async () => {
  const files = [
    'README.md:8',
    'README.md:41',
    'README.md:215',
    'README.md:479',
    'CLAUDE.md',
  ];
  for (const entry of files) {
    const file = /** @type {string} */ (entry.split(':')[0]);
    const text = await readFile(file, 'utf8');
    assert.ok(
      !/nineteen (JSON Schema )?roots\b/u.test(text) &&
        !/has (nineteen|19) roots\b/u.test(text),
      `${file} claims the package has nineteen roots; it has twenty`,
    );
  }
});
