import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const PAGES = ['terms', 'privacy'];

/** A default page stays shorter than this many words. */
const MAXIMUM_WORDS = 450;

/**
 * Load the default policy text through the package's own export, the way a
 * consumer resolves it, so the exports map and the file cannot drift apart.
 *
 * @returns {Promise<Record<string, {title: string, markdown: string}>>} parsed defaults
 */
async function loadDefaults() {
  const require = createRequire(import.meta.url);
  const resolved =
    require.resolve('@rathnasgala2/schemas/site-policy-defaults');
  return JSON.parse(await readFile(resolved, 'utf8'));
}

test('the site-policy-defaults export loads and names exactly two pages', async () => {
  const defaults = await loadDefaults();
  assert.deepEqual(Object.keys(defaults), PAGES);
  for (const page of PAGES) {
    assert.deepEqual(Object.keys(defaults[page] ?? {}), ['title', 'markdown']);
  }
});

test('each default page has a title and non-empty markdown that stays plain', async () => {
  const defaults = await loadDefaults();
  for (const page of PAGES) {
    const { title, markdown } = defaults[page] ?? { title: '', markdown: '' };
    assert.equal(typeof title, 'string');
    assert.ok(title !== '' && title === title.trim(), `${page} title`);
    assert.equal(typeof markdown, 'string');
    assert.ok(markdown.trim() !== '', `${page} markdown is empty`);
    // No HTML and no template placeholder can be carried by the text.
    assert.ok(!markdown.includes('<'), `${page} contains '<'`);
    assert.ok(!markdown.includes('{{'), `${page} contains '{{'`);
    assert.ok(
      markdown.split(/\s+/u).filter(Boolean).length < MAXIMUM_WORDS,
      `${page} is ${MAXIMUM_WORDS} words or longer`,
    );
  }
});

test('the default text never speaks for Galascribe', async () => {
  const defaults = await loadDefaults();
  for (const page of PAGES) {
    assert.doesNotMatch(
      defaults[page]?.markdown ?? '',
      /galascribe|rathnas/iu,
      `${page} mentions the platform; the template appends that section`,
    );
  }
});
