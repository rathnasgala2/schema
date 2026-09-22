import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

/**
 * Run the browser-realm smoke helper as a child process with
 * `--experimental-vm-modules`, so it can build a real jsdom-backed vm
 * context and link the package's actual ESM source (including its static
 * `with { type: 'json' }` schema imports) inside it.
 *
 * @returns {{status: number, stdout: string, stderr: string}} run result
 */
function runBrowserSmokeHelper() {
  const helper = path.resolve(
    import.meta.dirname,
    '..',
    'scripts',
    'browser-smoke.mjs',
  );
  try {
    const stdout = execFileSync(
      process.execPath,
      ['--experimental-vm-modules', helper],
      { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' },
    );
    return { status: 0, stdout, stderr: '' };
  } catch (/** @type {any} */ error) {
    return {
      status: typeof error.status === 'number' ? error.status : 1,
      stdout: String(error.stdout ?? ''),
      stderr: String(error.stderr ?? ''),
    };
  }
}

test('the "." export runs cleanly inside a real browser-shaped (jsdom) global realm with no Buffer or process', () => {
  const result = runBrowserSmokeHelper();
  assert.equal(
    result.status,
    0,
    `browser smoke helper failed:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
  );
  assert.match(result.stdout, /BROWSER_SMOKE_OK/u);
});
