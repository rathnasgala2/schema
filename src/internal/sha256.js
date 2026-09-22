/**
 * Pure-JS synchronous SHA-256 (FIPS 180-4), with no runtime dependency and no
 * `node:*` imports, for use where the package must stay browser-safe and
 * callers require a synchronous digest (Web Crypto's `crypto.subtle.digest`
 * is Promise-based only).
 *
 * This produces byte-identical output to Node's `createHash('sha256')`; see
 * `test/sha256.test.js` for the exhaustive parity check against `node:crypto`.
 *
 * @module
 */

// Round constants: first 32 bits of the fractional parts of the cube roots
// of the first 64 primes.
const K = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

// Initial hash values: first 32 bits of the fractional parts of the square
// roots of the first 8 primes.
const INITIAL_H = Object.freeze([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
]);

/**
 * Rotate a 32-bit unsigned value right by `amount` bits.
 *
 * @param {number} value 32-bit unsigned value
 * @param {number} amount rotation amount, 0-31
 * @returns {number} rotated 32-bit unsigned value
 */
function rotr(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

/**
 * Pad exact message bytes per FIPS 180-4 section 5.1.1 and split into
 * 64-byte (16 x 32-bit word) blocks.
 *
 * @param {Uint8Array} message exact message bytes
 * @returns {Uint32Array} padded message as big-endian 32-bit words
 */
function padMessage(message) {
  const bitLength = BigInt(message.length) * 8n;
  // 1 byte for 0x80, then zero-pad to 56 mod 64, then 8 bytes of length.
  const zeroPadCount = (((55 - message.length) % 64) + 64) % 64;
  const totalLength = message.length + 1 + zeroPadCount + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(message, 0);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setBigUint64(totalLength - 8, bitLength, false);

  const wordCount = totalLength / 4;
  const words = new Uint32Array(wordCount);
  for (let index = 0; index < wordCount; index += 1) {
    words[index] = view.getUint32(index * 4, false);
  }
  return words;
}

/**
 * Compute the SHA-256 digest of exact bytes.
 *
 * @param {Uint8Array} message exact preimage bytes
 * @returns {Uint8Array} 32-byte digest
 */
export function sha256(message) {
  const words = padMessage(message);
  let [h0, h1, h2, h3, h4, h5, h6, h7] = INITIAL_H;

  const w = new Uint32Array(64);
  for (let blockStart = 0; blockStart < words.length; blockStart += 16) {
    for (let index = 0; index < 16; index += 1) {
      w[index] = /** @type {number} */ (words[blockStart + index]);
    }
    for (let index = 16; index < 64; index += 1) {
      const w15 = /** @type {number} */ (w[index - 15]);
      const w2 = /** @type {number} */ (w[index - 2]);
      const w16 = /** @type {number} */ (w[index - 16]);
      const w7 = /** @type {number} */ (w[index - 7]);
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[index] = (w16 + s0 + w7 + s1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = [
      /** @type {number} */ (h0),
      /** @type {number} */ (h1),
      /** @type {number} */ (h2),
      /** @type {number} */ (h3),
      /** @type {number} */ (h4),
      /** @type {number} */ (h5),
      /** @type {number} */ (h6),
      /** @type {number} */ (h7),
    ];

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 =
        (h +
          s1 +
          ch +
          /** @type {number} */ (K[index]) +
          /** @type {number} */ (w[index])) |
        0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    const priorH0 = /** @type {number} */ (h0);
    const priorH1 = /** @type {number} */ (h1);
    const priorH2 = /** @type {number} */ (h2);
    const priorH3 = /** @type {number} */ (h3);
    const priorH4 = /** @type {number} */ (h4);
    const priorH5 = /** @type {number} */ (h5);
    const priorH6 = /** @type {number} */ (h6);
    const priorH7 = /** @type {number} */ (h7);
    h0 = (priorH0 + a) | 0;
    h1 = (priorH1 + b) | 0;
    h2 = (priorH2 + c) | 0;
    h3 = (priorH3 + d) | 0;
    h4 = (priorH4 + e) | 0;
    h5 = (priorH5 + f) | 0;
    h6 = (priorH6 + g) | 0;
    h7 = (priorH7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  const finalWords = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let index = 0; index < 8; index += 1) {
    outView.setUint32(
      index * 4,
      /** @type {number} */ (finalWords[index]) >>> 0,
      false,
    );
  }
  return out;
}
