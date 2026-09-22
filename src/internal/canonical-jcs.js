import {
  asciiBytes,
  bytesFromHex,
  concatBytes,
  hexFromBytes,
  utf8Bytes,
} from './bytes.js';
import { sha256 } from './sha256.js';

const FATAL_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const TAGGED_SHA256_PATTERN = /^sha256:([0-9a-f]{64})$/u;

/**
 * Reject UTF-16 strings that do not represent Unicode scalar values.
 *
 * @param {string} value input string
 * @returns {void}
 */
function assertUnicodeScalars(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) {
        throw new TypeError('UNICODE_SCALAR_INVALID');
      }
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TypeError('UNICODE_SCALAR_INVALID');
    }
  }
}

/**
 * Serialize one I-JSON value according to RFC 8785 JCS.
 *
 * @param {unknown} root input value
 * @returns {string} canonical JSON
 */
function serialize(root) {
  /** @type {string[]} */
  const output = [];
  /** @type {Set<object>} */
  const ancestors = new Set();
  /** @type {Array<
   *   {kind: 'value', value: unknown} |
   *   {kind: 'text', value: string} |
   *   {kind: 'leave', value: object}
   * >} */
  const stack = [{ kind: 'value', value: root }];
  while (stack.length > 0) {
    const task = stack.pop();
    if (task === undefined) throw new TypeError('JCS_INTERNAL_INVALID');
    if (task.kind === 'text') {
      output.push(task.value);
      continue;
    }
    if (task.kind === 'leave') {
      ancestors.delete(task.value);
      continue;
    }
    const value = task.value;
    if (value === null) {
      output.push('null');
    } else if (typeof value === 'boolean') {
      output.push(value ? 'true' : 'false');
    } else if (typeof value === 'string') {
      assertUnicodeScalars(value);
      output.push(JSON.stringify(value));
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new TypeError('JCS_NON_FINITE_NUMBER');
      }
      output.push(JSON.stringify(value));
    } else if (typeof value !== 'object') {
      throw new TypeError('JCS_NON_JSON_VALUE');
    } else {
      if (ancestors.has(value)) throw new TypeError('JCS_CYCLIC_VALUE');
      ancestors.add(value);
      stack.push({ kind: 'leave', value });
      if (Array.isArray(value)) {
        const entries = [];
        for (let index = 0; index < value.length; index += 1) {
          if (!Object.hasOwn(value, index)) {
            throw new TypeError('JCS_SPARSE_ARRAY');
          }
          entries.push(value[index]);
        }
        output.push('[');
        stack.push({ kind: 'text', value: ']' });
        for (let index = entries.length - 1; index >= 0; index -= 1) {
          stack.push({ kind: 'value', value: entries[index] });
          if (index > 0) stack.push({ kind: 'text', value: ',' });
        }
      } else {
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
          throw new TypeError('JCS_NON_JSON_OBJECT');
        }
        const entries = Object.keys(value)
          .sort()
          .map((key) => {
            assertUnicodeScalars(key);
            const propertyValue = /** @type {Record<string, unknown>} */ (
              value
            )[key];
            if (propertyValue === undefined) {
              throw new TypeError('JCS_NON_JSON_VALUE');
            }
            return { key: JSON.stringify(key), value: propertyValue };
          });
        output.push('{');
        stack.push({ kind: 'text', value: '}' });
        for (let index = entries.length - 1; index >= 0; index -= 1) {
          const entry = entries[index];
          if (entry === undefined) throw new TypeError('JCS_INTERNAL_INVALID');
          stack.push({ kind: 'value', value: entry.value });
          stack.push({ kind: 'text', value: ':' });
          stack.push({ kind: 'text', value: entry.key });
          if (index > 0) stack.push({ kind: 'text', value: ',' });
        }
      }
    }
  }
  return output.join('');
}

/**
 * Canonicalize an I-JSON value according to RFC 8785.
 *
 * @param {unknown} value input value
 * @returns {string} canonical JSON text
 */
export function canonicalizeJcs(value) {
  return serialize(value);
}

/**
 * Canonicalize an I-JSON value to exact UTF-8 bytes.
 *
 * @param {unknown} value input value
 * @returns {Uint8Array} canonical JSON bytes
 */
export function canonicalizeJcsBytes(value) {
  return utf8Bytes(canonicalizeJcs(value));
}

/**
 * Scan a JSON string token and return its decoded value and end offset.
 *
 * @param {string} source complete JSON source
 * @param {number} start opening-quote offset
 * @returns {{ value: string, end: number }} decoded string and exclusive end
 */
function scanString(source, start) {
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const codeUnit = source.charCodeAt(index);
    if (!escaped && codeUnit === 0x22) {
      const token = source.slice(start, index + 1);
      const value = JSON.parse(token);
      assertUnicodeScalars(value);
      return { value, end: index + 1 };
    }
    if (!escaped && codeUnit < 0x20) {
      throw new SyntaxError('IJSON_INVALID');
    }
    if (!escaped && codeUnit === 0x5c) {
      escaped = true;
    } else {
      escaped = false;
    }
  }
  throw new SyntaxError('IJSON_INVALID');
}

/**
 * Parse duplicate-key-free UTF-8 I-JSON bytes.
 *
 * @param {Uint8Array} bytes exact source bytes
 * @returns {unknown} parsed JSON value
 */
export function parseDuplicateFreeIJson(bytes) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new SyntaxError('IJSON_BOM_FORBIDDEN');
  }
  let source;
  try {
    source = FATAL_UTF8_DECODER.decode(bytes);
  } catch {
    throw new SyntaxError('IJSON_INVALID_UTF8');
  }
  if (source.startsWith('\uFEFF')) {
    throw new SyntaxError('IJSON_BOM_FORBIDDEN');
  }

  let cursor = 0;
  const skipWhitespace = () => {
    while (/\s/u.test(source[cursor] ?? '')) cursor += 1;
  };

  const parseValue = () => {
    skipWhitespace();
    const first = source[cursor];
    if (first === '{') {
      cursor += 1;
      skipWhitespace();
      const keys = new Set();
      if (source[cursor] === '}') {
        cursor += 1;
        return;
      }
      while (true) {
        if (source[cursor] !== '"') throw new SyntaxError('IJSON_INVALID');
        const token = scanString(source, cursor);
        cursor = token.end;
        if (keys.has(token.value)) throw new SyntaxError('IJSON_DUPLICATE_KEY');
        keys.add(token.value);
        skipWhitespace();
        if (source[cursor] !== ':') throw new SyntaxError('IJSON_INVALID');
        cursor += 1;
        parseValue();
        skipWhitespace();
        if (source[cursor] === '}') {
          cursor += 1;
          return;
        }
        if (source[cursor] !== ',') throw new SyntaxError('IJSON_INVALID');
        cursor += 1;
        skipWhitespace();
      }
    }
    if (first === '[') {
      cursor += 1;
      skipWhitespace();
      if (source[cursor] === ']') {
        cursor += 1;
        return;
      }
      while (true) {
        parseValue();
        skipWhitespace();
        if (source[cursor] === ']') {
          cursor += 1;
          return;
        }
        if (source[cursor] !== ',') throw new SyntaxError('IJSON_INVALID');
        cursor += 1;
      }
    }
    if (first === '"') {
      cursor = scanString(source, cursor).end;
      return;
    }
    const remainder = source.slice(cursor);
    const token = remainder.match(
      /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u,
    );
    if (!token) throw new SyntaxError('IJSON_INVALID');
    cursor += token[0].length;
  };

  parseValue();
  skipWhitespace();
  if (cursor !== source.length) throw new SyntaxError('IJSON_INVALID');
  const value = JSON.parse(source);
  canonicalizeJcs(value);
  return value;
}

/**
 * Hash exact bytes and return the portable tagged SHA-256 spelling.
 *
 * @param {Uint8Array} bytes exact preimage bytes
 * @returns {string} tagged digest
 */
export function sha256Tagged(bytes) {
  return `sha256:${hexFromBytes(sha256(bytes))}`;
}

/**
 * Hash a terminal-NUL domain followed by exact bytes.
 *
 * @param {string} domain literal domain including its terminal NUL
 * @param {Uint8Array} bytes exact projected bytes
 * @returns {string} tagged digest
 */
export function domainSeparatedSha256(domain, bytes) {
  const domainBody = domain.slice(0, -1);
  if (
    !domain.endsWith('\0') ||
    [...domainBody].some(
      (character) => character === '\0' || character.charCodeAt(0) > 0x7f,
    )
  ) {
    throw new TypeError('DIGEST_DOMAIN_INVALID');
  }
  return sha256Tagged(concatBytes([asciiBytes(domain), bytes]));
}

/**
 * Decode a portable tagged SHA-256 value to its fixed 32 octets.
 *
 * @param {string} digest tagged digest
 * @returns {Uint8Array} decoded digest bytes
 */
export function decodeTaggedSha256(digest) {
  const match = TAGGED_SHA256_PATTERN.exec(digest);
  if (!match) throw new TypeError('DIGEST_INVALID');
  const hexadecimal = match[1];
  if (!hexadecimal) throw new TypeError('DIGEST_INVALID');
  return bytesFromHex(hexadecimal);
}
