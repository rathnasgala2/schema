import assert from 'node:assert/strict';
import test from 'node:test';

import { diffSchema } from '../scripts/check-backward-compatibility.mjs';

/**
 * Diff two schema fragments and return the findings.
 *
 * @param {unknown} before baseline fragment
 * @param {unknown} after current fragment
 * @returns {import('../scripts/check-backward-compatibility.mjs').CompatibilityFinding[]}
 *   the findings
 */
function diff(before, after) {
  /** @type {import('../scripts/check-backward-compatibility.mjs').CompatibilityFinding[]} */
  const findings = [];
  diffSchema('#', before, after, findings);
  return findings;
}

/**
 * @param {import('../scripts/check-backward-compatibility.mjs').CompatibilityFinding[]} findings findings
 * @param {'additive' | 'breaking'} kind kind to require
 * @returns {void}
 */
function assertHasKind(findings, kind) {
  assert.ok(
    findings.some((finding) => finding.kind === kind),
    `expected a ${kind} finding, got ${JSON.stringify(findings)}`,
  );
}

test('type narrowing (string -> number) is breaking', () => {
  assertHasKind(diff({ type: 'string' }, { type: 'number' }), 'breaking');
});

test('type narrowing (drop a member of a union) is breaking', () => {
  assertHasKind(
    diff({ type: ['string', 'null'] }, { type: 'string' }),
    'breaking',
  );
});

test('type widening (add a union member) is additive, not breaking', () => {
  const findings = diff({ type: 'string' }, { type: ['string', 'null'] });
  assertHasKind(findings, 'additive');
  assert.ok(!findings.some((finding) => finding.kind === 'breaking'));
});

test('identical type is not reported', () => {
  assert.deepEqual(diff({ type: 'string' }, { type: 'string' }), []);
});

test('adding format to a property that had none is breaking', () => {
  assertHasKind(
    diff({ type: 'string' }, { type: 'string', format: 'date-time' }),
    'breaking',
  );
});

test('changing format to a different one is breaking', () => {
  assertHasKind(
    diff({ format: 'gala-int64' }, { format: 'gala-uint64' }),
    'breaking',
  );
});

test('removing format is additive', () => {
  const findings = diff({ format: 'date-time' }, {});
  assertHasKind(findings, 'additive');
  assert.ok(!findings.some((finding) => finding.kind === 'breaking'));
});

test('items type change is breaking (recurses into items)', () => {
  assertHasKind(
    diff(
      { type: 'array', items: { type: 'string' } },
      { type: 'array', items: { type: 'number' } },
    ),
    'breaking',
  );
});

test('minimum raised is breaking (tightening)', () => {
  assertHasKind(diff({ minimum: 0 }, { minimum: 5 }), 'breaking');
});

test('minimum lowered is additive (relaxing)', () => {
  const findings = diff({ minimum: 5 }, { minimum: 0 });
  assertHasKind(findings, 'additive');
  assert.ok(!findings.some((finding) => finding.kind === 'breaking'));
});

test('maximum lowered is breaking (tightening)', () => {
  assertHasKind(diff({ maximum: 10 }, { maximum: 5 }), 'breaking');
});

test('maximum raised is additive (relaxing)', () => {
  const findings = diff({ maximum: 5 }, { maximum: 10 });
  assertHasKind(findings, 'additive');
  assert.ok(!findings.some((finding) => finding.kind === 'breaking'));
});

test('additionalProperties true -> false is breaking', () => {
  assertHasKind(
    diff({ additionalProperties: true }, { additionalProperties: false }),
    'breaking',
  );
});

test('additionalProperties false -> schema is additive', () => {
  const findings = diff(
    { additionalProperties: false },
    { additionalProperties: { type: 'string' } },
  );
  assertHasKind(findings, 'additive');
  assert.ok(!findings.some((finding) => finding.kind === 'breaking'));
});

test('removing a oneOf branch is breaking, even from the middle of the list', () => {
  const before = {
    oneOf: [{ const: 'a' }, { const: 'b' }, { const: 'c' }],
  };
  const after = { oneOf: [{ const: 'a' }, { const: 'c' }] };
  assertHasKind(diff(before, after), 'breaking');
});

test('adding a oneOf branch is additive', () => {
  const before = { oneOf: [{ const: 'a' }] };
  const after = { oneOf: [{ const: 'a' }, { const: 'b' }] };
  const findings = diff(before, after);
  assertHasKind(findings, 'additive');
  assert.ok(!findings.some((finding) => finding.kind === 'breaking'));
});

test('removing an anyOf branch is breaking', () => {
  const before = { anyOf: [{ type: 'string' }, { type: 'number' }] };
  const after = { anyOf: [{ type: 'string' }] };
  assertHasKind(diff(before, after), 'breaking');
});

test('reordering oneOf branches with no set change is not reported', () => {
  const before = { oneOf: [{ const: 'a' }, { const: 'b' }] };
  const after = { oneOf: [{ const: 'b' }, { const: 'a' }] };
  assert.deepEqual(diff(before, after), []);
});
