import assert from 'node:assert/strict';
import test from 'node:test';

import { validateArrayCardinality } from '../src/internal/schema-validator.js';

test('repeated cardinality checks against the same shape stay correct (SCH-M7)', () => {
  // Exercises the cached-compile path (src/internal/validator-core.js caches
  // the compiled validator per distinct {minItems, maxItems, uniqueItems}
  // shape instead of calling ajv.compile() on every call) across many
  // repeated calls with the same and different shapes, to confirm caching
  // never returns a stale or cross-contaminated result.
  const shapeA = { minItems: 2, maxItems: 5 };
  const shapeB = { minItems: 0, maxItems: 3, uniqueItems: true };

  for (let index = 0; index < 25; index += 1) {
    assert.equal(validateArrayCardinality(shapeA, 3).valid, true);
    assert.equal(validateArrayCardinality(shapeA, 1).valid, false);
    assert.equal(validateArrayCardinality(shapeA, 9).valid, false);
    assert.equal(validateArrayCardinality(shapeB, 2).valid, true);
    assert.equal(validateArrayCardinality(shapeB, 4).valid, false);
  }
});
