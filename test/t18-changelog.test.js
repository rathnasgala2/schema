import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('every CHANGELOG version heading has a link reference definition (SCH-M4)', async () => {
  const text = await readFile('CHANGELOG.md', 'utf8');
  const headings = [...text.matchAll(/^## \[([^\]]+)\]/gmu)].map(
    (match) => match[1],
  );
  assert.ok(headings.length > 0);
  const definedLabels = new Set(
    [...text.matchAll(/^\[([^\]]+)\]: https:\/\/\S+/gmu)].map(
      (match) => match[1],
    ),
  );
  for (const heading of headings) {
    assert.ok(
      definedLabels.has(heading),
      `## [${heading}] has no matching "[${heading}]: https://..." link reference definition`,
    );
  }
});

test('the CHANGELOG has exactly one Unreleased section (SCH-M3)', async () => {
  const text = await readFile('CHANGELOG.md', 'utf8');
  const unreleasedHeadings = text.match(/^## \[Unreleased\]/gmu) ?? [];
  assert.equal(unreleasedHeadings.length, 1);
});

test('every CHANGELOG version heading below Unreleased is a distinct, valid SemVer', async () => {
  const text = await readFile('CHANGELOG.md', 'utf8');
  const headings = [...text.matchAll(/^## \[([^\]]+)\]/gmu)].map(
    (match) => match[1],
  );
  const versionHeadings = headings.filter(
    (heading) => heading !== 'Unreleased',
  );
  for (const heading of versionHeadings) {
    assert.match(/** @type {string} */ (heading), /^\d+\.\d+\.\d+$/u);
  }
  assert.equal(versionHeadings.length, new Set(versionHeadings).size);
});
