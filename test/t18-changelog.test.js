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

test('no CHANGELOG version heading claims an invented pre-publish date (SCH-M3 follow-up)', async () => {
  // npm view @rathnasgala2/schemas time --json shows exactly one publish:
  // 2.11.0 at 2026-09-22T11:03:42Z. Nothing between 2.0.0 and 2.5.0 was ever
  // independently published, so none of them may carry a "## [x.y.z] - date"
  // heading, which asserts a real release date Keep a Changelog readers would
  // reasonably trust. That history is kept, but only as unstamped "### x.y.z"
  // subsections inside one collapsed, explicitly-labeled section.
  const text = await readFile('CHANGELOG.md', 'utf8');
  assert.ok(
    text.includes('## Pre-release history (never published)'),
    'the collapsed pre-publish history section is missing',
  );
  assert.ok(
    /2\.11\.0[^\n]*2026-09-22/u.test(text),
    'the pre-release history section must state the real, single npm publish date',
  );
  const datedHeadings = [
    ...text.matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/gmu),
  ].map((match) => match[1]);
  for (const version of [
    '2.0.0',
    '2.1.0',
    '2.2.0',
    '2.2.1',
    '2.2.2',
    '2.4.0',
    '2.4.1',
    '2.4.2',
    '2.5.0',
  ]) {
    assert.ok(
      !datedHeadings.includes(version),
      `"${version}" must not carry an invented "## [x.y.z] - date" heading`,
    );
  }
});
