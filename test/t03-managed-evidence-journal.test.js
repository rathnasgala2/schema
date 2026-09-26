import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendManagedEvidenceHead,
  digestManagedEvidenceEntry,
  digestManagedEvidenceGenesis,
} from '../src/internal/digest-profiles.js';
import { validateManagedEvidenceJournal } from '../scripts/internal-semantics/managed-evidence-journal.js';

const OPERATION_ID = '018f0000-0000-7000-8000-000000000001';

/**
 * Build a complete digest-linked journal fixture.
 *
 * @returns {{operationId: string, runAttempt: number, entries: Record<string, unknown>[], receiptEntryCount: number, receiptHeadDigest: string}} journal context
 */
function journalFixture() {
  const wrappers = [
    {
      entryType: 'observation',
      observation: {
        observationId: '018f0000-0000-7000-8000-000000000002',
        sequence: 1,
      },
    },
    {
      entryType: 'attempt',
      attempt: {
        stageAttemptId: '018f0000-0000-7000-8000-000000000003',
        sequence: 1,
      },
    },
    {
      entryType: 'observation',
      observation: {
        observationId: '018f0000-0000-7000-8000-000000000004',
        sequence: 2,
      },
    },
  ];
  let head = digestManagedEvidenceGenesis({
    operationId: OPERATION_ID,
    runAttempt: 2,
  });
  const entries = wrappers.map((wrapper, index) => {
    const entryDigest = digestManagedEvidenceEntry(wrapper);
    const previousHeadDigest = head;
    head = appendManagedEvidenceHead(head, entryDigest);
    return {
      entryNumber: index + 1,
      previousHeadDigest,
      ...wrapper,
      entryDigest,
      headDigest: head,
    };
  });
  return {
    operationId: OPERATION_ID,
    runAttempt: 2,
    entries,
    receiptEntryCount: entries.length,
    receiptHeadDigest: head,
  };
}

/**
 * Read one required fixture entry.
 *
 * @param {ReturnType<typeof journalFixture>} fixture journal fixture
 * @param {number} index entry index
 * @returns {Record<string, unknown>} entry
 */
function requiredEntry(fixture, index) {
  const entry = fixture.entries[index];
  assert.ok(entry);
  return entry;
}

/**
 * Read one required nested fixture record.
 *
 * @param {Record<string, unknown>} entry journal entry
 * @param {string} member member name
 * @returns {Record<string, unknown>} nested record
 */
function requiredRecord(entry, member) {
  const value = entry[member];
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return /** @type {Record<string, unknown>} */ (value);
}

test('a complete mixed journal validates to its receipt-bound head', () => {
  const fixture = journalFixture();
  assert.deepEqual(validateManagedEvidenceJournal(fixture), {
    entryCount: 3,
    headDigest: fixture.receiptHeadDigest,
  });
});

test('missing, reordered, substituted and duplicated entries reject', () => {
  /** @type {((fixture: ReturnType<typeof journalFixture>) => unknown)[]} */
  const mutations = [
    (fixture) => fixture.entries.pop(),
    (fixture) => fixture.entries.reverse(),
    (fixture) => {
      requiredRecord(requiredEntry(fixture, 0), 'observation').sequence = 2;
    },
    (fixture) => {
      requiredRecord(requiredEntry(fixture, 2), 'observation').observationId =
        requiredRecord(requiredEntry(fixture, 0), 'observation').observationId;
    },
  ];
  for (const mutate of mutations) {
    const fixture = structuredClone(journalFixture());
    mutate(fixture);
    assert.throws(
      () => validateManagedEvidenceJournal(fixture),
      /MANAGED_EVIDENCE_JOURNAL_INVALID/u,
    );
  }
});

test('entry and head digests reject independent tampering', () => {
  for (const member of ['previousHeadDigest', 'entryDigest', 'headDigest']) {
    const fixture = structuredClone(journalFixture());
    requiredEntry(fixture, 1)[member] = `sha256:${'ff'.repeat(32)}`;
    assert.throws(
      () => validateManagedEvidenceJournal(fixture),
      /MANAGED_EVIDENCE_JOURNAL_INVALID/u,
      member,
    );
  }
  const fixture = structuredClone(journalFixture());
  fixture.receiptHeadDigest = `sha256:${'ee'.repeat(32)}`;
  assert.throws(
    () => validateManagedEvidenceJournal(fixture),
    /MANAGED_EVIDENCE_JOURNAL_INVALID/u,
  );
});

test('closed entries, gap-free type streams and receipt counts are mandatory', () => {
  const extra = structuredClone(journalFixture());
  requiredEntry(extra, 0).kernelSequence = 1;
  assert.throws(() => validateManagedEvidenceJournal(extra));

  const gap = structuredClone(journalFixture());
  requiredRecord(requiredEntry(gap, 2), 'observation').sequence = 3;
  assert.throws(() => validateManagedEvidenceJournal(gap));

  const wrongCount = structuredClone(journalFixture());
  wrongCount.receiptEntryCount = 2;
  assert.throws(() => validateManagedEvidenceJournal(wrongCount));
});
