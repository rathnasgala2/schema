import spdxData from './generated/spdx-3.28.0.json' with { type: 'json' };

import { compareBytes, utf8Bytes } from './bytes.js';
import { canonicalizeJcs } from './canonical-jcs.js';
import { SemanticValidationError } from './semver.js';

/**
 * @typedef {{ type: 'License', id: string }} SpdxLicenseNode
 */

/**
 * @typedef {{ type: 'With', id: string, exceptionId: string }} SpdxWithNode
 */

/**
 * @typedef {{ type: 'And' | 'Or', left: SpdxExpressionNode, right: SpdxExpressionNode }} SpdxBinaryNode
 */

/**
 * @typedef {SpdxLicenseNode | SpdxWithNode | SpdxBinaryNode} SpdxExpressionNode
 */

/**
 * @typedef {{ source: string, cursor: number }} ParserState
 */

/**
 * @typedef {{ kind: 'license' | 'exception', id: string, text: string }} SpdxCatalogEntry
 */

const SPDX_VERSION = '3.28.0';
const SPDX_DIGEST =
  'sha256:293418a03e6692c44332a12eb17889af99e20a4d571adfaca4408b203f75686b';

const table = /** @type {{
  version: string,
  digest: string,
  licenses: [string, string][],
  exceptions: [string, string][],
  deprecatedLicenses: string[],
  deprecatedExceptions: string[]
}} */ (spdxData);

/**
 * Throw one stable SPDX expression diagnostic.
 *
 * @returns {never} never returns
 */
function invalidExpression() {
  throw new SemanticValidationError('SPDX_EXPRESSION_INVALID');
}

/**
 * Throw one stable SPDX catalog-evidence diagnostic.
 *
 * @returns {never} never returns
 */
function invalidCatalogEvidence() {
  throw new SemanticValidationError('SPDX_CATALOG_EVIDENCE_INVALID');
}

/**
 * Test whether an unknown value is a plain JSON object.
 *
 * @param {unknown} value candidate value
 * @returns {value is Record<string, unknown>} whether the value is a plain object
 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Test whether an object has exactly the named members.
 *
 * @param {Record<string, unknown>} value candidate object
 * @param {readonly string[]} expected expected member names
 * @returns {boolean} exact member equality
 */
function hasExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

/**
 * Verify and project one generated active identifier/text table.
 *
 * @param {[string, string][]} rows generated active rows
 * @param {string[]} deprecated generated deprecated identifiers
 * @param {number} expectedTotal accepted active-plus-deprecated count
 * @returns {Map<string, string>} active text by exact identifier
 */
function buildCatalog(rows, deprecated, expectedTotal) {
  if (rows.length + deprecated.length !== expectedTotal) {
    throw new TypeError('SPDX_GENERATED_DATA_INVALID');
  }
  const catalog = new Map();
  let previous = '';
  for (const row of rows) {
    if (
      !Array.isArray(row) ||
      row.length !== 2 ||
      typeof row[0] !== 'string' ||
      row[0].length === 0 ||
      typeof row[1] !== 'string' ||
      catalog.has(row[0]) ||
      (previous !== '' &&
        compareBytes(utf8Bytes(previous), utf8Bytes(row[0])) >= 0)
    ) {
      throw new TypeError('SPDX_GENERATED_DATA_INVALID');
    }
    catalog.set(row[0], row[1]);
    previous = row[0];
  }
  const deprecatedSet = new Set();
  previous = '';
  for (const id of deprecated) {
    if (
      typeof id !== 'string' ||
      id.length === 0 ||
      deprecatedSet.has(id) ||
      catalog.has(id) ||
      (previous !== '' && compareBytes(utf8Bytes(previous), utf8Bytes(id)) >= 0)
    ) {
      throw new TypeError('SPDX_GENERATED_DATA_INVALID');
    }
    deprecatedSet.add(id);
    previous = id;
  }
  return catalog;
}

if (table.version !== SPDX_VERSION || table.digest !== SPDX_DIGEST) {
  throw new TypeError('SPDX_GENERATED_DATA_INVALID');
}

const LICENSE_TEXTS = buildCatalog(
  table.licenses,
  table.deprecatedLicenses,
  727,
);
const EXCEPTION_TEXTS = buildCatalog(
  table.exceptions,
  table.deprecatedExceptions,
  84,
);
for (const id of EXCEPTION_TEXTS.keys()) {
  if (LICENSE_TEXTS.has(id)) throw new TypeError('SPDX_GENERATED_DATA_INVALID');
}

/**
 * Read one identifier token without interpreting or rewriting its bytes.
 *
 * @param {ParserState} state parser state
 * @returns {string} exact identifier bytes represented as ASCII
 */
function readIdentifier(state) {
  const start = state.cursor;
  while (state.cursor < state.source.length) {
    const character = state.source[state.cursor];
    if (character === ' ' || character === '(' || character === ')') break;
    state.cursor += 1;
  }
  if (state.cursor === start) invalidExpression();
  return state.source.slice(start, state.cursor);
}

/**
 * Parse an SPDX atom, including the only admitted WITH production.
 *
 * @param {ParserState} state parser state
 * @returns {SpdxExpressionNode} parsed atom
 */
function parseAtom(state) {
  if (state.source[state.cursor] === '(') {
    state.cursor += 1;
    const expression = parseOrExpression(state);
    if (state.source[state.cursor] !== ')') invalidExpression();
    state.cursor += 1;
    return expression;
  }

  const id = readIdentifier(state);
  if (!LICENSE_TEXTS.has(id)) invalidExpression();
  if (!state.source.startsWith(' WITH ', state.cursor)) {
    return { type: 'License', id };
  }

  state.cursor += ' WITH '.length;
  const exceptionId = readIdentifier(state);
  if (!EXCEPTION_TEXTS.has(exceptionId)) invalidExpression();
  return { type: 'With', id, exceptionId };
}

/**
 * Parse the left-associative AND production.
 *
 * @param {ParserState} state parser state
 * @returns {SpdxExpressionNode} parsed AND expression
 */
function parseAndExpression(state) {
  let expression = parseAtom(state);
  while (state.source.startsWith(' AND ', state.cursor)) {
    state.cursor += ' AND '.length;
    expression = {
      type: 'And',
      left: expression,
      right: parseAtom(state),
    };
  }
  return expression;
}

/**
 * Parse the left-associative OR production with AND precedence.
 *
 * @param {ParserState} state parser state
 * @returns {SpdxExpressionNode} parsed expression
 */
function parseOrExpression(state) {
  let expression = parseAndExpression(state);
  while (state.source.startsWith(' OR ', state.cursor)) {
    state.cursor += ' OR '.length;
    expression = {
      type: 'Or',
      left: expression,
      right: parseAndExpression(state),
    };
  }
  return expression;
}

/**
 * Parse the exact DEC-099 SPDX expression grammar and active 3.28.0 IDs.
 *
 * This step intentionally does not enforce serializer equality so callers can
 * distinguish invalid syntax from a valid but noncanonical expression.
 *
 * @param {string} source authored SPDX expression
 * @returns {SpdxExpressionNode} parsed expression tree
 */
export function parseSpdxExpression(source) {
  if (typeof source !== 'string' || source.length < 1 || source.length > 128) {
    invalidExpression();
  }
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) > 0x7f) invalidExpression();
  }
  const state = { source, cursor: 0 };
  const expression = parseOrExpression(state);
  if (state.cursor !== source.length) invalidExpression();
  return expression;
}

/**
 * Serialize and validate one expression node recursively.
 *
 * @param {unknown} node candidate node
 * @param {Set<object>} ancestors active nodes for cycle rejection
 * @returns {string} exact canonical expression
 */
function serializeNode(node, ancestors) {
  if (!isPlainObject(node) || ancestors.has(node)) invalidExpression();
  ancestors.add(node);
  try {
    if (node.type === 'License') {
      if (
        !hasExactKeys(node, ['type', 'id']) ||
        typeof node.id !== 'string' ||
        !LICENSE_TEXTS.has(node.id)
      ) {
        invalidExpression();
      }
      return node.id;
    }
    if (node.type === 'With') {
      if (
        !hasExactKeys(node, ['type', 'id', 'exceptionId']) ||
        typeof node.id !== 'string' ||
        typeof node.exceptionId !== 'string' ||
        !LICENSE_TEXTS.has(node.id) ||
        !EXCEPTION_TEXTS.has(node.exceptionId)
      ) {
        invalidExpression();
      }
      return `(${node.id} WITH ${node.exceptionId})`;
    }
    if (node.type === 'And' || node.type === 'Or') {
      if (!hasExactKeys(node, ['type', 'left', 'right'])) invalidExpression();
      const operator = node.type === 'And' ? 'AND' : 'OR';
      return `(${serializeNode(node.left, ancestors)} ${operator} ${serializeNode(node.right, ancestors)})`;
    }
    return invalidExpression();
  } finally {
    ancestors.delete(node);
  }
}

/**
 * Serialize one SPDX tree to DEC-099's fully parenthesized canonical form.
 *
 * @param {SpdxExpressionNode} expression parsed expression tree
 * @returns {string} exact canonical expression
 */
export function serializeSpdxExpression(expression) {
  return serializeNode(expression, new Set());
}

/**
 * Validate one canonical 1..128-byte ASCII SPDX expression.
 *
 * @param {string} source authored SPDX expression
 * @returns {SpdxExpressionNode} validated expression tree
 */
export function validateSpdxExpression(source) {
  const expression = parseSpdxExpression(source);
  if (serializeSpdxExpression(expression) !== source) {
    throw new SemanticValidationError('SPDX_EXPRESSION_NOT_CANONICAL');
  }
  return expression;
}

/**
 * Add the exact identifier closure of one tree to an entry map.
 *
 * @param {SpdxExpressionNode} expression validated expression
 * @param {Map<string, SpdxCatalogEntry>} entries closure destination
 * @returns {void}
 */
function collectCatalogEntries(expression, entries) {
  if (expression.type === 'License') {
    const text = LICENSE_TEXTS.get(expression.id);
    if (text === undefined) invalidExpression();
    entries.set(`license\0${expression.id}`, {
      kind: 'license',
      id: expression.id,
      text,
    });
    return;
  }
  if (expression.type === 'With') {
    const licenseText = LICENSE_TEXTS.get(expression.id);
    const exceptionText = EXCEPTION_TEXTS.get(expression.exceptionId);
    if (licenseText === undefined || exceptionText === undefined) {
      invalidExpression();
    }
    entries.set(`license\0${expression.id}`, {
      kind: 'license',
      id: expression.id,
      text: licenseText,
    });
    entries.set(`exception\0${expression.exceptionId}`, {
      kind: 'exception',
      id: expression.exceptionId,
      text: exceptionText,
    });
    return;
  }
  collectCatalogEntries(expression.left, entries);
  collectCatalogEntries(expression.right, entries);
}

/**
 * Compare two catalog rows by their RFC 8785 member bytes.
 *
 * @param {SpdxCatalogEntry} left left row
 * @param {SpdxCatalogEntry} right right row
 * @returns {number} byte comparison
 */
function compareCatalogEntries(left, right) {
  return compareBytes(
    utf8Bytes(canonicalizeJcs(left)),
    utf8Bytes(canonicalizeJcs(right)),
  );
}

/**
 * Compute the exact unique catalog closure for canonical expressions.
 *
 * @param {string | readonly string[]} expressions canonical expression or expressions
 * @returns {SpdxCatalogEntry[]} canonical catalog rows
 */
function expectedCatalogEntries(expressions) {
  const sources = typeof expressions === 'string' ? [expressions] : expressions;
  if (!Array.isArray(sources) || sources.length === 0) {
    invalidCatalogEvidence();
  }
  /** @type {Map<string, SpdxCatalogEntry>} */
  const entries = new Map();
  for (const source of sources) {
    if (typeof source !== 'string') invalidExpression();
    collectCatalogEntries(validateSpdxExpression(source), entries);
  }
  return [...entries.values()].sort(compareCatalogEntries);
}

/**
 * Validate exact SPDX 3.28.0 catalog evidence for one expression closure.
 *
 * Enclosing schemas own unrelated evidence members. This validator owns the
 * exact catalog version/digest and the ordered `{kind,id,text}` closure only.
 *
 * @param {string | readonly string[]} expressions canonical expression or expressions
 * @param {unknown} evidence catalog evidence record
 * @returns {void}
 */
export function validateSpdxCatalogEvidence(expressions, evidence) {
  const expected = expectedCatalogEntries(expressions);
  if (
    !isPlainObject(evidence) ||
    evidence.licenseListVersion !== SPDX_VERSION ||
    evidence.licenseListDigest !== SPDX_DIGEST ||
    !Array.isArray(evidence.catalogEntries) ||
    evidence.catalogEntries.length !== expected.length
  ) {
    invalidCatalogEvidence();
  }

  for (let index = 0; index < expected.length; index += 1) {
    const actual = evidence.catalogEntries[index];
    const wanted = expected[index];
    if (
      !isPlainObject(actual) ||
      !wanted ||
      !hasExactKeys(actual, ['kind', 'id', 'text']) ||
      actual.kind !== wanted.kind ||
      actual.id !== wanted.id ||
      actual.text !== wanted.text
    ) {
      invalidCatalogEvidence();
    }
  }
}
