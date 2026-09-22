import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchRepositoryGlob,
  parseRepositoryGlob,
  selectRepositoryPaths,
  validateRfc3339,
} from '../src/internal/portable-scalars.js';

test('the canonical Gala UTC-millisecond subset validates Gregorian dates', () => {
  for (const value of [
    '0000-02-29T00:00:00.000Z',
    '2000-02-29T23:59:59.999Z',
    '2026-09-13T08:59:00.001Z',
    '9999-12-31T23:59:59.999Z',
  ]) {
    assert.doesNotThrow(() => validateRfc3339(value));
  }
  for (const value of [
    '1900-02-29T00:00:00.000Z',
    '2025-02-29T00:00:00.000Z',
    '2026-04-31T00:00:00.000Z',
    '10000-01-01T00:00:00.000Z',
    '2026-01-01T00:00:60.000Z',
    '2026-01-01T24:00:00.000Z',
    '2026-01-01t00:00:00.000z',
    '2026-01-01T00:00:00Z',
    '2026-01-01T00:00:00.00Z',
    '2026-01-01T00:00:00.000+00:00',
  ]) {
    assert.throws(() => validateRfc3339(value), /RFC3339_INVALID/u);
  }
});

test('repository globs implement the exact DEC-099 matching vectors', () => {
  /** @type {[string, string, boolean][]} */
  const vectors = [
    ['**/*.md', 'post.md', true],
    ['**/*.md', 'a/post.md', true],
    ['**/*.md', '.draft.md', false],
    ['**/*.md', 'a/.draft.md', false],
    ['**/*.md', '.hidden/post.md', false],
    ['.*/**/*.md', '.hidden/post.md', true],
    ['a/**/b', 'a/b', true],
    ['a/**/b', 'a/x/y/b', true],
    ['a/*/b', 'a/x/y/b', false],
    ['?.md', '😀.md', true],
    ['?.md', 'a\u0316.md', false],
    ['??.md', 'a\u0316.md', true],
    ['[a].md', '[a].md', true],
    ['a/**', 'a', true],
    ['a/~/b', 'a/~/b', true],
    ['a/~/b', 'a/x/b', false],
  ];
  for (const [pattern, candidate, expected] of vectors) {
    assert.equal(
      matchRepositoryGlob(pattern, candidate),
      expected,
      `${pattern} against ${candidate}`,
    );
  }
});

test('repository globs reject every excluded syntax family', () => {
  for (const pattern of [
    '',
    '/absolute',
    'trailing/',
    'a//b',
    '.',
    '..',
    'a/../b',
    'a\\b',
    'a%2fb',
    'C:/b',
    '~',
    '~/b',
    '~user/b',
    '~notes/*.md',
    '!a',
    '{a,b}',
    '@(a)',
    '+(a)',
    '?(a)',
    '*(a)',
    '!(a)',
    'a**b',
    '***',
    '**x',
    'e\u0301.md',
  ]) {
    assert.throws(
      () => parseRepositoryGlob(pattern),
      /REPOSITORY_GLOB_INVALID/u,
      pattern,
    );
  }
});

test('include/exclude selection deduplicates and sorts by unsigned UTF-8 bytes', () => {
  assert.deepEqual(
    selectRepositoryPaths(
      ['**/*.md'],
      ['drafts/**'],
      ['z.md', 'é.md', 'a.md', 'drafts/no.md', 'z.md'],
    ),
    ['a.md', 'z.md', 'é.md'],
  );
});
