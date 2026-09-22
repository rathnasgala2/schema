import {
  asciiBytes,
  bytesEqual,
  bytesFromHex,
  compareBytes,
  concatBytes,
  decodeLatin1,
  hexFromBytes,
  indexOfAscii,
  readUint32BigEndian,
  utf8Bytes,
} from './bytes.js';
import {
  canonicalizeJcs,
  canonicalizeJcsBytes,
  decodeTaggedSha256,
  parseDuplicateFreeIJson,
  sha256Tagged,
} from './canonical-jcs.js';
import { sha256 } from './sha256.js';
import {
  ACTIVE_DIGEST_PROFILES,
  derivePublicProbeRetryDelay,
} from './digest-profiles.js';
import { toAsciiDomain17 } from './idna.js';
import { parseCanonicalIpv4, parseCanonicalOriginIpv6 } from './ip-address.js';
import {
  isGloballyReachableAddress,
  NETWORK_BOUNDARY_PROFILE_DIGEST,
} from './network-boundary.js';
import { validateRfc3339 } from './portable-scalars.js';
import { SemanticValidationError } from './semver.js';
import { normalizeNfc17 } from './unicode17.js';
import { parseVerificationOrigin } from './verification-origin.js';

const FATAL_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const INT64_MAXIMUM = 9_223_372_036_854_775_807n;
const PUBLIC_VERIFICATION_PROBE_SLOT_CEILING = 900n;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const STABLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const NONNEGATIVE_INT64_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const UNRESERVED_BYTE_PATTERN = /^[A-Za-z0-9._~-]$/u;
const CONTENT_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,62}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,62}(?:; charset=utf-8)?$/u;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9a-z-]{1,64}$/u;
const HEADER_VALUE_PATTERN = /^(?:$|[!-~](?:[ -~]{0,1022}[!-~])?)$/u;
const PROBE_REGION_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SERIAL_HEX_PATTERN = /^(?!00)(?:[0-9a-f]{2}){1,20}$/u;
const REDIRECT_STATUSES = Object.freeze([301, 302, 303, 307, 308]);

export const FORBIDDEN_VERIFICATION_HEADERS = Object.freeze([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'www-authenticate',
  'proxy-authenticate',
  'authentication-info',
  'proxy-authentication-info',
  'connection',
  'keep-alive',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'location',
  'content-length',
]);

const FORBIDDEN_HEADER_SET = new Set(FORBIDDEN_VERIFICATION_HEADERS);

export const PUBLIC_TLS_PROFILE_CONSTANTS = Object.freeze({
  profile: 'gala-public-tls-v2',
  versions: Object.freeze(['TLSv1.3', 'TLSv1.2']),
  cipherSuites: Object.freeze([
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
    'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
    'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
  ]),
  maximumHandshakeBytes: 524_288,
  maximumPresentedCertificates: 8,
  maximumCertificateBytes: 65_536,
  maximumCertificateChainBytes: 262_144,
  maximumCertificateExtensions: 64,
});

export const PUBLIC_HTTP_LIMITS = Object.freeze({
  maximumStatusLineBytes: 1_024,
  maximumHeaderFields: 128,
  maximumHeaderFieldLineBytes: 8_192,
  maximumResponseHeadBytes: 32_768,
  maximumInformationalHeads: 4,
  maximumLocationBytes: 2_048,
});

export const PUBLIC_VERIFIER_REQUEST_PROFILE = Object.freeze({
  requestProfile: 'gala-public-verifier-v2',
  retryProfile: 'gala-public-probe-retry-v2',
  method: 'GET',
  httpVersion: 'HTTP/1.1',
  headers: Object.freeze([
    Object.freeze({ name: 'Accept', value: '*/*' }),
    Object.freeze({ name: 'Accept-Encoding', value: 'identity' }),
    Object.freeze({
      name: 'User-Agent',
      value: 'gala-public-verifier/2.0.0',
    }),
    Object.freeze({ name: 'Connection', value: 'close' }),
  ]),
});

/**
 * Live facts deliberately outside this byte-semantic module.
 *
 * These are context boundaries, not members of any wire or evidence record.
 */
export const LIVE_PUBLIC_VERIFICATION_BOUNDARIES = Object.freeze([
  'strict DER parsing and leaf-first certificate extraction',
  'RFC 5280 path construction, constraints, key usage, and inclusive validity evaluation',
  'shortest-then-certificate-digest chain selection',
  'certificate signature algorithm, curve, and RSA key-size enforcement',
  'SAN extraction from the selected leaf certificate',
  'issuer SPKI and positive serial extraction from each selected non-root certificate',
  'TLS feature negotiation, byte counters, limit-plus-one connection closure, and shared non-resetting deadlines',
  'DNS resolver completeness, truncation, elapsed-time, and CNAME-link evidence acquisition',
  'bounded HTTP response-head parsing and unsafe raw-field disposal',
  'redirect URI-reference resolution before normalized-location retention',
  'ambient credential, proxy, cookie, cache, HSTS, Alt-Svc, and connection-reuse suppression',
]);

const TLS_PROFILE_KEYS = Object.freeze([
  'profile',
  'trustStoreDigest',
  'revocationSetDigest',
  'revocationValidUntil',
  'versions',
  'cipherSuites',
  'maximumHandshakeBytes',
  'maximumPresentedCertificates',
  'maximumCertificateBytes',
  'maximumCertificateChainBytes',
  'maximumCertificateExtensions',
]);
const REVOCATION_SET_KEYS = Object.freeze([
  'validFrom',
  'validUntil',
  'entries',
]);
const REVOCATION_ENTRY_KEYS = Object.freeze(['issuerSpkiDigest', 'serialHex']);
const DNS_EVIDENCE_KEYS = Object.freeze([
  'complete',
  'truncated',
  'elapsedMilliseconds',
  'cnameChain',
  'addresses',
]);
const DNS_ADDRESS_KEYS = Object.freeze(['family', 'addressBytes']);
const EXPECTED_HEADER_KEYS = Object.freeze(['name', 'value']);
const OBSERVED_HEADER_REQUIRED_KEYS = Object.freeze(['name', 'state']);
const OBSERVED_HEADER_OPTIONAL_KEYS = Object.freeze(['value']);
const REDIRECT_HOP_KEYS = Object.freeze([
  'hopNumber',
  'requestUrl',
  'expectedStatus',
  'expectedLocation',
]);
const PRIOR_CONTRACT_KEYS = Object.freeze([
  'generationId',
  'redirectChain',
  'terminalRequestUrl',
  'expectedTerminalStatus',
  'expectedByteLength',
  'expectedHeaders',
  'expectedDigest',
]);
const PLAN_TARGET_KEYS = Object.freeze([
  'targetId',
  'origin',
  'route',
  'requiredProbeRegions',
  'redirectChain',
  'terminalRequestUrl',
  'expectedTerminalStatus',
  'expectedByteLength',
  'maximumResponseBytes',
  'maximumResponseWireBytes',
  'requestTimeoutSeconds',
  'requestProfile',
  'retryProfile',
  'maximumAttempts',
  'maximumConcurrentStreams',
  'expectedHeaders',
  'expectedCandidateDigest',
  'recognizedPriorContracts',
]);
const PROBE_REQUIRED_KEYS = Object.freeze([
  'targetId',
  'attemptNumber',
  'hopNumber',
  'origin',
  'route',
  'requestUrl',
  'probeRegion',
  'requestStartedAt',
  'observedAt',
  'expectedCandidateDigest',
  'responseHeadState',
  'observedLocationState',
  'observedHeaders',
  'bodyState',
  'classification',
  'evidenceDigest',
]);
const PROBE_OPTIONAL_KEYS = Object.freeze([
  'contractGenerationId',
  'precedingProbeEvidenceDigest',
  'observedStatus',
  'observedLocation',
  'observedByteLength',
  'observedDigest',
  'observedGenerationId',
]);
const ACTIVATION_DETECTION_PROBE_REQUIRED_KEYS = Object.freeze(
  PROBE_REQUIRED_KEYS.filter((key) => key !== 'attemptNumber'),
);
const ACTIVATION_DETECTION_PROBE_OPTIONAL_KEYS = Object.freeze([
  ...PROBE_OPTIONAL_KEYS.filter(
    (key) => key !== 'precedingProbeEvidenceDigest',
  ),
  'precedingDetectionProbeEvidenceDigest',
]);
const ACTIVATION_DETECTION_OBSERVATION_KEYS = Object.freeze([
  'profile',
  'operationId',
  'attemptId',
  'planDigest',
  'detectionAttemptNumber',
  'eligibleAt',
  'probes',
  'receivedAt',
  'evidenceDigest',
]);
const ACTIVATION_DETECTION_PLAN_KEYS = Object.freeze([
  'profile',
  'operationId',
  'attemptId',
  'artifactId',
  'proposedGenerationId',
  'target',
  'probeRegion',
  'firstEligibleAt',
  'lastEligibleAt',
  'maximumAttempts',
  'intervalSeconds',
  'requestTimeoutSeconds',
  'maximumRedirectHops',
  'reservedProbeSlots',
  'planDigest',
]);
const PRIOR_ATTEMPT_KEYS = Object.freeze([
  'attemptNumber',
  'requestStartedAt',
  'terminalClassification',
  'observedAt',
  'terminalEvidenceDigest',
]);
const DETECTION_WATCH_AUTHORITY_KEYS = Object.freeze([
  'operationId',
  'attemptId',
  'planDigest',
  'authorityId',
  'authorityEpoch',
  'currentAuthorityId',
  'currentAuthorityEpoch',
  'authorityState',
  'activationBasisAbsent',
  'cancelled',
  'superseded',
]);
const ORDINARY_LEASE_AUTHORITY_KEYS = Object.freeze([
  'operationId',
  'attemptId',
  'verificationPlanDigest',
  'targetId',
  'probeRegion',
  'attemptNumber',
  'leaseCurrent',
  'cancelled',
  'superseded',
  'terminalIntegrityMismatch',
]);
const AUTHORITATIVE_TARGET_KEYS = Object.freeze(
  PLAN_TARGET_KEYS.filter(
    (key) =>
      ![
        'targetId',
        'maximumResponseBytes',
        'maximumResponseWireBytes',
        'requestTimeoutSeconds',
        'requestProfile',
        'retryProfile',
        'maximumAttempts',
        'maximumConcurrentStreams',
      ].includes(key),
  ),
);
const MARKER_AUTHORITY_KEYS = Object.freeze(['origin', 'basePath', 'value']);
const PUBLIC_GENERATION_MARKER_KEYS = Object.freeze([
  'schemaId',
  'schemaVersion',
  'artifactId',
  'artifactDigest',
  'generationId',
]);

/**
 * Throw one stable semantic diagnostic.
 *
 * @param {string} code diagnostic code
 * @returns {never} never returns
 */
function invalid(code) {
  throw new SemanticValidationError(code);
}

/**
 * Require a plain object.
 *
 * @param {unknown} value candidate value
 * @param {string} code diagnostic code
 * @returns {Record<string, unknown>} validated object
 */
function asObject(value, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return invalid(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return invalid(code);
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Require an exact closed ledger.
 *
 * @param {unknown} value candidate value
 * @param {readonly string[]} required required keys
 * @param {readonly string[]} optional optional keys
 * @param {string} code diagnostic code
 * @returns {Record<string, unknown>} validated ledger
 */
function assertLedger(value, required, optional, code) {
  const object = asObject(value, code);
  const admitted = new Set([...required, ...optional]);
  const keys = Object.keys(object);
  if (
    required.some((key) => !Object.hasOwn(object, key)) ||
    keys.some((key) => !admitted.has(key))
  ) {
    return invalid(code);
  }
  return object;
}

/**
 * Require an integer in an inclusive range.
 *
 * @param {unknown} value candidate value
 * @param {number} minimum inclusive minimum
 * @param {number} maximum inclusive maximum
 * @param {string} code diagnostic code
 * @returns {number} validated integer
 */
function assertInteger(value, minimum, maximum, code) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    return invalid(code);
  }
  return value;
}

/**
 * Require a tagged SHA-256 digest.
 *
 * @param {unknown} value candidate value
 * @param {string} code diagnostic code
 * @returns {string} validated digest
 */
function assertDigest(value, code) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    return invalid(code);
  }
  return value;
}

/**
 * Require a UUIDv7 stable identifier.
 *
 * @param {unknown} value candidate value
 * @param {string} code diagnostic code
 * @returns {string} validated identifier
 */
function assertStableId(value, code) {
  if (typeof value !== 'string' || !STABLE_ID_PATTERN.test(value)) {
    return invalid(code);
  }
  return value;
}

/**
 * Require a canonical non-negative int64 string.
 *
 * @param {unknown} value candidate value
 * @param {string} code diagnostic code
 * @returns {bigint} parsed value
 */
function assertNonnegativeInt64(value, code) {
  if (
    typeof value !== 'string' ||
    value.length > 19 ||
    !NONNEGATIVE_INT64_PATTERN.test(value)
  ) {
    return invalid(code);
  }
  const parsed = BigInt(value);
  if (parsed > INT64_MAXIMUM) return invalid(code);
  return parsed;
}

/**
 * Require one canonical UTC-millisecond timestamp.
 *
 * @param {unknown} value candidate value
 * @param {string} code diagnostic code
 * @returns {string} validated timestamp
 */
function assertTimestamp(value, code) {
  if (typeof value !== 'string') return invalid(code);
  try {
    validateRfc3339(value);
  } catch {
    return invalid(code);
  }
  return value;
}

/**
 * Convert one validated canonical timestamp to an exact millisecond index.
 * The owned Gregorian conversion deliberately admits year 0000 and never uses
 * a host date parser.
 *
 * @param {unknown} value candidate timestamp
 * @param {string} code diagnostic code
 * @returns {number} exact proleptic-Gregorian milliseconds
 */
function timestampMilliseconds(value, code) {
  const timestamp = assertTimestamp(value, code);
  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(5, 7));
  const day = Number(timestamp.slice(8, 10));
  const hour = Number(timestamp.slice(11, 13));
  const minute = Number(timestamp.slice(14, 16));
  const second = Number(timestamp.slice(17, 19));
  const millisecond = Number(timestamp.slice(20, 23));
  /**
   * @param {number} candidateYear year in the owned calendar
   * @returns {number} days before January 1 of the candidate year
   */
  const daysBeforeYear = (candidateYear) =>
    365 * candidateYear +
    Math.floor((candidateYear + 3) / 4) -
    Math.floor((candidateYear + 99) / 100) +
    Math.floor((candidateYear + 399) / 400);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const elapsedMonthDays = monthLengths
    .slice(0, month - 1)
    .reduce((sum, length) => sum + length, 0);
  const days =
    daysBeforeYear(year) - daysBeforeYear(1970) + elapsedMonthDays + day - 1;
  return (
    (((days * 24 + hour) * 60 + minute) * 60 + second) * 1_000 + millisecond
  );
}

/**
 * Compare ASCII/native byte strings without locale state.
 *
 * @param {string} left left value
 * @param {string} right right value
 * @returns {-1 | 0 | 1} byte comparison
 */
function compareAscii(left, right) {
  const comparison = compareBytes(asciiBytes(left), asciiBytes(right));
  return comparison;
}

/**
 * Require exact RFC 8785 equality.
 *
 * @param {unknown} left left value
 * @param {unknown} right right value
 * @param {string} code diagnostic code
 * @returns {void}
 */
function assertJcsEqual(left, right, code) {
  if (canonicalizeJcs(left) !== canonicalizeJcs(right)) invalid(code);
}

/**
 * Convert one route segment to its exact public-route spelling.
 *
 * @param {string} source encoded route segment
 * @returns {string} canonical segment
 */
function canonicalizeRouteSegment(source) {
  /** @type {number[]} */
  const bytes = [];
  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (character && UNRESERVED_BYTE_PATTERN.test(character)) {
      bytes.push(character.charCodeAt(0));
      index += 1;
      continue;
    }
    if (
      character !== '%' ||
      !/^[0-9A-F]{2}$/u.test(source.slice(index + 1, index + 3))
    ) {
      return invalid('CANONICAL_ROUTE_INVALID');
    }
    bytes.push(Number.parseInt(source.slice(index + 1, index + 3), 16));
    index += 3;
  }
  let decoded;
  try {
    decoded = FATAL_UTF8_DECODER.decode(Uint8Array.from(bytes));
  } catch {
    return invalid('CANONICAL_ROUTE_INVALID');
  }
  if (normalizeNfc17(decoded) !== decoded) {
    return invalid('CANONICAL_ROUTE_INVALID');
  }
  return [...utf8Bytes(decoded)]
    .map((byte) => {
      const character = String.fromCharCode(byte);
      return UNRESERVED_BYTE_PATTERN.test(character)
        ? character
        : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    })
    .join('');
}

/**
 * Validate one canonical public route used by verification URLs.
 *
 * @param {unknown} value candidate route
 * @returns {string} validated route
 */
export function validateCanonicalVerificationRoute(value) {
  if (
    typeof value !== 'string' ||
    utf8Bytes(value).length !== value.length ||
    !value.startsWith('/') ||
    value.includes('//') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    return invalid('CANONICAL_ROUTE_INVALID');
  }
  const segments = value.split('/');
  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined) return invalid('CANONICAL_ROUTE_INVALID');
    if (segment === '' && index === segments.length - 1) continue;
    if (
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      canonicalizeRouteSegment(segment) !== segment
    ) {
      return invalid('CANONICAL_ROUTE_INVALID');
    }
  }
  return value;
}

/**
 * Join an exact verification origin and canonical route by byte concatenation.
 *
 * @param {unknown} origin candidate verification origin
 * @param {unknown} route candidate canonical route
 * @returns {string} exact verification URL
 */
export function joinVerificationUrl(origin, route) {
  if (typeof origin !== 'string') return invalid('VERIFICATION_URL_INVALID');
  try {
    parseVerificationOrigin(origin);
  } catch {
    return invalid('VERIFICATION_URL_INVALID');
  }
  const canonicalRoute = validateCanonicalVerificationRoute(route);
  const result = `${origin}${canonicalRoute}`;
  if (result.length > 2_048 || utf8Bytes(result).length !== result.length) {
    return invalid('VERIFICATION_URL_INVALID');
  }
  return result;
}

/**
 * Split and validate a stored absolute HTTPS verification URL.
 *
 * @param {unknown} value candidate URL
 * @returns {{origin: string, route: string}} validated parts
 */
function parseVerificationUrl(value) {
  if (typeof value !== 'string' || value.length > 2_048) {
    return invalid('VERIFICATION_URL_INVALID');
  }
  const routeOffset = value.indexOf('/', 'https://'.length);
  if (routeOffset < 0) return invalid('VERIFICATION_URL_INVALID');
  const origin = value.slice(0, routeOffset);
  const route = value.slice(routeOffset);
  if (joinVerificationUrl(origin, route) !== value) {
    return invalid('VERIFICATION_URL_INVALID');
  }
  return { origin, route };
}

/**
 * Parse a canonical port for a normalized observed redirect origin.
 *
 * @param {string} source optional colon-prefixed port
 * @param {number} defaultPort scheme default
 * @returns {number} effective port
 */
function parseObservedPort(source, defaultPort) {
  if (source === '') return defaultPort;
  if (!/^:[1-9][0-9]{0,4}$/u.test(source)) {
    return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
  }
  const port = Number.parseInt(source.slice(1), 10);
  if (port > 65_535 || port === defaultPort) {
    return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
  }
  return port;
}

/**
 * Validate one retained normalized HTTP/HTTPS redirect location.
 *
 * @param {unknown} value candidate absolute location
 * @returns {string} validated location
 */
export function validateObservedRedirectLocation(value) {
  if (
    typeof value !== 'string' ||
    value.length > 2_048 ||
    utf8Bytes(value).length !== value.length
  ) {
    return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
  }
  const scheme = value.startsWith('https://')
    ? 'https'
    : value.startsWith('http://')
      ? 'http'
      : invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
  const authorityStart = `${scheme}://`.length;
  const routeOffset = value.indexOf('/', authorityStart);
  if (routeOffset < 0) return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
  const authority = value.slice(authorityStart, routeOffset);
  const route = value.slice(routeOffset);
  if (!authority || /[/?#@%\s]/u.test(authority) || authority.endsWith(':')) {
    return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
  }
  const defaultPort = scheme === 'https' ? 443 : 80;
  if (authority.startsWith('[')) {
    const closing = authority.indexOf(']');
    if (closing <= 1 || authority.indexOf(']', closing + 1) >= 0) {
      return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
    }
    const host = authority.slice(1, closing);
    parseObservedPort(authority.slice(closing + 1), defaultPort);
    try {
      parseCanonicalOriginIpv6(host);
    } catch {
      return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
    }
  } else {
    const separator = authority.indexOf(':');
    if (separator !== authority.lastIndexOf(':')) {
      return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
    }
    const host = separator < 0 ? authority : authority.slice(0, separator);
    parseObservedPort(
      separator < 0 ? '' : authority.slice(separator),
      defaultPort,
    );
    if (!host) return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
    if (/^[0-9.]+$/u.test(host)) {
      try {
        parseCanonicalIpv4(host);
      } catch {
        return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
      }
    } else {
      try {
        if (toAsciiDomain17(host) !== host) {
          return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
        }
      } catch {
        return invalid('OBSERVED_REDIRECT_LOCATION_INVALID');
      }
    }
  }
  validateCanonicalVerificationRoute(route);
  return value;
}

/**
 * Construct the exact credential-free HTTP/1.1 request bytes.
 *
 * Suppression of ambient headers, credentials, redirects, proxies and state is
 * a live transport boundary enumerated above.
 *
 * @param {unknown} origin exact verification origin
 * @param {unknown} route exact canonical route
 * @returns {Uint8Array} request head with no body
 */
export function createPublicVerifierRequest(origin, route) {
  const url = joinVerificationUrl(origin, route);
  const parsed = parseVerificationUrl(url);
  const authority = parsed.origin.slice('https://'.length);
  return asciiBytes(
    `GET ${parsed.route} HTTP/1.1\r\nHost: ${authority}\r\nAccept: */*\r\nAccept-Encoding: identity\r\nUser-Agent: gala-public-verifier/2.0.0\r\nConnection: close\r\n\r\n`,
  );
}

/**
 * Parse the exact bounded trust-store framing.
 *
 * Certificate DER/PKIX validity is intentionally delegated to the enumerated
 * live certificate-verifier boundary.
 *
 * @param {unknown} input exact trust-store bytes
 * @returns {{source: Uint8Array, trustStoreDigest: string, anchors: {der: Uint8Array, digest: string}[]}} parsed store
 */
export function parsePublicTlsTrustStore(input) {
  if (!(input instanceof Uint8Array)) return invalid('TRUST_STORE_INVALID');
  const source = new Uint8Array(
    input.buffer,
    input.byteOffset,
    input.byteLength,
  );
  if (source.length < 4 || source.length > 16_777_216) {
    return invalid('TRUST_STORE_INVALID');
  }
  let offset = 0;
  const readU32 = () => {
    if (offset > source.length - 4) return invalid('TRUST_STORE_INVALID');
    const value = readUint32BigEndian(source, offset);
    offset += 4;
    return value;
  };
  const certificateCount = readU32();
  if (certificateCount < 1 || certificateCount > 512) {
    return invalid('TRUST_STORE_INVALID');
  }
  /** @type {{der: Uint8Array, digest: string, digestBytes: Uint8Array}[]} */
  const anchors = [];
  for (let index = 0; index < certificateCount; index += 1) {
    const byteCount = readU32();
    if (
      byteCount < 1 ||
      byteCount > 65_536 ||
      offset > source.length - byteCount
    ) {
      return invalid('TRUST_STORE_INVALID');
    }
    const der = source.slice(offset, offset + byteCount);
    offset += byteCount;
    const digestBytes = sha256(der);
    anchors.push({
      der,
      digest: `sha256:${hexFromBytes(digestBytes)}`,
      digestBytes,
    });
  }
  if (offset !== source.length) return invalid('TRUST_STORE_INVALID');
  for (let index = 1; index < anchors.length; index += 1) {
    if (
      compareBytes(
        anchors[index - 1]?.digestBytes ?? new Uint8Array(0),
        anchors[index]?.digestBytes ?? new Uint8Array(0),
      ) >= 0
    ) {
      return invalid('TRUST_STORE_INVALID');
    }
  }
  return {
    source: source.slice(),
    trustStoreDigest: sha256Tagged(source),
    anchors: anchors.map(({ der, digest }) => ({ der, digest })),
  };
}

/**
 * Compare two revocation entries by raw issuer digest then serial bytes.
 *
 * @param {Record<string, unknown>} left left entry
 * @param {Record<string, unknown>} right right entry
 * @returns {-1 | 0 | 1} raw-byte order
 */
function compareRevocationEntries(left, right) {
  const issuerComparison = compareBytes(
    decodeTaggedSha256(/** @type {string} */ (left.issuerSpkiDigest)),
    decodeTaggedSha256(/** @type {string} */ (right.issuerSpkiDigest)),
  );
  if (issuerComparison !== 0) return issuerComparison < 0 ? -1 : 1;
  const serialComparison = compareBytes(
    bytesFromHex(/** @type {string} */ (left.serialHex)),
    bytesFromHex(/** @type {string} */ (right.serialHex)),
  );
  return serialComparison < 0 ? -1 : serialComparison > 0 ? 1 : 0;
}

/**
 * Parse duplicate-free compact JCS TLS revocation-set bytes.
 *
 * @param {unknown} input exact source bytes
 * @returns {{source: Uint8Array, value: {validFrom: string, validUntil: string, entries: {issuerSpkiDigest: string, serialHex: string}[]}, revocationSetDigest: string}} parsed set
 */
export function parsePublicTlsRevocationSet(input) {
  if (!(input instanceof Uint8Array))
    return invalid('TLS_REVOCATION_SET_INVALID');
  const source = new Uint8Array(
    input.buffer,
    input.byteOffset,
    input.byteLength,
  );
  if (source.length === 0 || source.length > 16_777_216) {
    return invalid('TLS_REVOCATION_SET_INVALID');
  }
  let parsed;
  try {
    parsed = parseDuplicateFreeIJson(source);
  } catch {
    return invalid('TLS_REVOCATION_SET_INVALID');
  }
  const record = assertLedger(
    parsed,
    REVOCATION_SET_KEYS,
    [],
    'TLS_REVOCATION_SET_INVALID',
  );
  const validFrom = assertTimestamp(
    record.validFrom,
    'TLS_REVOCATION_SET_INVALID',
  );
  const validUntil = assertTimestamp(
    record.validUntil,
    'TLS_REVOCATION_SET_INVALID',
  );
  if (
    validFrom > validUntil ||
    !Array.isArray(record.entries) ||
    record.entries.length > 100_000
  ) {
    return invalid('TLS_REVOCATION_SET_INVALID');
  }
  const entries = record.entries.map((candidate) => {
    const entry = assertLedger(
      candidate,
      REVOCATION_ENTRY_KEYS,
      [],
      'TLS_REVOCATION_SET_INVALID',
    );
    const issuerSpkiDigest = assertDigest(
      entry.issuerSpkiDigest,
      'TLS_REVOCATION_SET_INVALID',
    );
    if (
      typeof entry.serialHex !== 'string' ||
      !SERIAL_HEX_PATTERN.test(entry.serialHex)
    ) {
      return invalid('TLS_REVOCATION_SET_INVALID');
    }
    return { issuerSpkiDigest, serialHex: entry.serialHex };
  });
  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (
      !previous ||
      !current ||
      compareRevocationEntries(previous, current) >= 0
    ) {
      return invalid('TLS_REVOCATION_SET_INVALID');
    }
  }
  const value = { validFrom, validUntil, entries };
  if (!bytesEqual(source, canonicalizeJcsBytes(value))) {
    return invalid('TLS_REVOCATION_SET_INVALID');
  }
  const profile = ACTIVE_DIGEST_PROFILES.tlsRevocationSet;
  if (!profile) throw new TypeError('TLS_REVOCATION_DIGEST_PROFILE_MISSING');
  return {
    source: source.slice(),
    value,
    revocationSetDigest: profile.digest(value),
  };
}

/**
 * Require a parsed revocation set to be current and exactly policy-bound.
 *
 * @param {ReturnType<typeof parsePublicTlsRevocationSet>} revocationSet parsed set
 * @param {{connectionStartedAt: string, expectedDigest: string, expectedValidUntil: string}} context retained connection/policy context
 * @returns {void}
 */
export function validatePublicTlsRevocationWindow(revocationSet, context) {
  const connectionStartedAt = assertTimestamp(
    context.connectionStartedAt,
    'TLS_REVOCATION_SET_INVALID',
  );
  if (
    revocationSet.revocationSetDigest !== context.expectedDigest ||
    revocationSet.value.validUntil !== context.expectedValidUntil ||
    connectionStartedAt < revocationSet.value.validFrom ||
    connectionStartedAt > revocationSet.value.validUntil ||
    connectionStartedAt > context.expectedValidUntil
  ) {
    invalid('TLS_REVOCATION_SET_INVALID');
  }
}

/**
 * Test one externally extracted positive certificate serial against the set.
 *
 * @param {ReturnType<typeof parsePublicTlsRevocationSet>} revocationSet parsed set
 * @param {{issuerSpkiDer: Uint8Array, serialBytes: Uint8Array}} identity selected non-root certificate identity
 * @returns {boolean} whether the certificate is revoked
 */
export function isPublicTlsCertificateRevoked(revocationSet, identity) {
  if (
    !(identity.issuerSpkiDer instanceof Uint8Array) ||
    !(identity.serialBytes instanceof Uint8Array) ||
    identity.serialBytes.length < 1 ||
    identity.serialBytes.length > 20 ||
    identity.serialBytes[0] === 0
  ) {
    return invalid('TLS_CERTIFICATE_IDENTITY_INVALID');
  }
  const issuerSpkiDigest = sha256Tagged(identity.issuerSpkiDer);
  const serialHex = hexFromBytes(identity.serialBytes);
  return revocationSet.value.entries.some(
    (entry) =>
      entry.issuerSpkiDigest === issuerSpkiDigest &&
      entry.serialHex === serialHex,
  );
}

/**
 * Validate the exact closed public TLS policy record and source bindings.
 *
 * @param {unknown} value candidate profile
 * @param {{trustStoreDigest: string, revocationSetDigest: string, revocationValidUntil: string}} sources parsed source bindings
 * @returns {string} public TLS profile digest
 */
export function validatePublicTlsProfile(value, sources) {
  const profile = assertLedger(
    value,
    TLS_PROFILE_KEYS,
    [],
    'PUBLIC_TLS_PROFILE_INVALID',
  );
  assertDigest(profile.trustStoreDigest, 'PUBLIC_TLS_PROFILE_INVALID');
  assertDigest(profile.revocationSetDigest, 'PUBLIC_TLS_PROFILE_INVALID');
  assertTimestamp(profile.revocationValidUntil, 'PUBLIC_TLS_PROFILE_INVALID');
  for (const key of [
    'profile',
    'versions',
    'cipherSuites',
    'maximumHandshakeBytes',
    'maximumPresentedCertificates',
    'maximumCertificateBytes',
    'maximumCertificateChainBytes',
    'maximumCertificateExtensions',
  ]) {
    assertJcsEqual(
      profile[key],
      /** @type {Record<string, unknown>} */ (PUBLIC_TLS_PROFILE_CONSTANTS)[
        key
      ],
      'PUBLIC_TLS_PROFILE_INVALID',
    );
  }
  if (
    profile.trustStoreDigest !== sources.trustStoreDigest ||
    profile.revocationSetDigest !== sources.revocationSetDigest ||
    profile.revocationValidUntil !== sources.revocationValidUntil
  ) {
    return invalid('PUBLIC_TLS_PROFILE_INVALID');
  }
  const digestProfile = ACTIVE_DIGEST_PROFILES.publicTlsProfile;
  if (!digestProfile) throw new TypeError('PUBLIC_TLS_DIGEST_PROFILE_MISSING');
  return digestProfile.digest(profile);
}

/**
 * Validate live TLS negotiation and presentation bounds supplied by transport.
 *
 * The evidence object is an in-process context boundary, not a wire record.
 * Certificate meaning remains owned by the explicitly enumerated verifier.
 *
 * @param {unknown} value live transport facts
 * @returns {{presentedCertificates: {der: Uint8Array, extensionCount: number}[], negotiatedVersion: string, negotiatedCipherSuite: string}} bounded facts
 */
export function validatePublicTlsHandshakeEvidence(value) {
  const evidence = assertLedger(
    value,
    [
      'offeredVersions',
      'offeredCipherSuites',
      'offeredAlpnProtocols',
      'negotiatedVersion',
      'negotiatedCipherSuite',
      'negotiatedAlpnProtocol',
      'handshakeByteCount',
      'presentedCertificates',
      'compressionUsed',
      'renegotiationUsed',
      'earlyDataUsed',
      'sessionResumed',
      'postHandshakeAuthenticationUsed',
      'clientCertificateUsed',
    ],
    [],
    'PUBLIC_TLS_HANDSHAKE_INVALID',
  );
  assertJcsEqual(
    evidence.offeredVersions,
    PUBLIC_TLS_PROFILE_CONSTANTS.versions,
    'PUBLIC_TLS_HANDSHAKE_INVALID',
  );
  assertJcsEqual(
    evidence.offeredCipherSuites,
    PUBLIC_TLS_PROFILE_CONSTANTS.cipherSuites,
    'PUBLIC_TLS_HANDSHAKE_INVALID',
  );
  assertJcsEqual(
    evidence.offeredAlpnProtocols,
    ['http/1.1'],
    'PUBLIC_TLS_HANDSHAKE_INVALID',
  );
  if (
    typeof evidence.negotiatedVersion !== 'string' ||
    typeof evidence.negotiatedCipherSuite !== 'string' ||
    !PUBLIC_TLS_PROFILE_CONSTANTS.versions.includes(
      /** @type {never} */ (evidence.negotiatedVersion),
    ) ||
    !PUBLIC_TLS_PROFILE_CONSTANTS.cipherSuites.includes(
      /** @type {never} */ (evidence.negotiatedCipherSuite),
    ) ||
    (evidence.negotiatedAlpnProtocol !== null &&
      evidence.negotiatedAlpnProtocol !== 'http/1.1')
  ) {
    return invalid('PUBLIC_TLS_HANDSHAKE_INVALID');
  }
  const cipherIndex = PUBLIC_TLS_PROFILE_CONSTANTS.cipherSuites.indexOf(
    /** @type {never} */ (evidence.negotiatedCipherSuite),
  );
  if (
    (evidence.negotiatedVersion === 'TLSv1.3' && cipherIndex > 2) ||
    (evidence.negotiatedVersion === 'TLSv1.2' && cipherIndex < 3)
  ) {
    return invalid('PUBLIC_TLS_HANDSHAKE_INVALID');
  }
  assertInteger(
    evidence.handshakeByteCount,
    0,
    PUBLIC_TLS_PROFILE_CONSTANTS.maximumHandshakeBytes,
    'PUBLIC_TLS_HANDSHAKE_INVALID',
  );
  for (const key of [
    'compressionUsed',
    'renegotiationUsed',
    'earlyDataUsed',
    'sessionResumed',
    'postHandshakeAuthenticationUsed',
    'clientCertificateUsed',
  ]) {
    if (evidence[key] !== false) return invalid('PUBLIC_TLS_HANDSHAKE_INVALID');
  }
  if (
    !Array.isArray(evidence.presentedCertificates) ||
    evidence.presentedCertificates.length < 1 ||
    evidence.presentedCertificates.length >
      PUBLIC_TLS_PROFILE_CONSTANTS.maximumPresentedCertificates
  ) {
    return invalid('PUBLIC_TLS_HANDSHAKE_INVALID');
  }
  let chainBytes = 0;
  const presentedCertificates = evidence.presentedCertificates.map(
    (candidate) => {
      const certificate = assertLedger(
        candidate,
        ['der', 'extensionCount'],
        [],
        'PUBLIC_TLS_HANDSHAKE_INVALID',
      );
      if (
        !(certificate.der instanceof Uint8Array) ||
        certificate.der.length < 1 ||
        certificate.der.length >
          PUBLIC_TLS_PROFILE_CONSTANTS.maximumCertificateBytes
      ) {
        return invalid('PUBLIC_TLS_HANDSHAKE_INVALID');
      }
      const extensionCount = assertInteger(
        certificate.extensionCount,
        0,
        PUBLIC_TLS_PROFILE_CONSTANTS.maximumCertificateExtensions,
        'PUBLIC_TLS_HANDSHAKE_INVALID',
      );
      chainBytes += certificate.der.length;
      if (
        chainBytes > PUBLIC_TLS_PROFILE_CONSTANTS.maximumCertificateChainBytes
      ) {
        return invalid('PUBLIC_TLS_HANDSHAKE_INVALID');
      }
      return { der: certificate.der.slice(), extensionCount };
    },
  );
  return {
    presentedCertificates,
    negotiatedVersion: evidence.negotiatedVersion,
    negotiatedCipherSuite: evidence.negotiatedCipherSuite,
  };
}

/**
 * Convert one SAN DNS spelling under the pinned UTS #46 profile.
 *
 * @param {unknown} value SAN dNSName value
 * @returns {{wildcard: boolean, host: string}} normalized SAN
 */
function normalizeDnsSan(value) {
  if (typeof value !== 'string' || utf8Bytes(value).length !== value.length) {
    return invalid('TLS_PEER_IDENTITY_INVALID');
  }
  if (value.startsWith('*.')) {
    if (value.slice(2).includes('*'))
      return invalid('TLS_PEER_IDENTITY_INVALID');
    try {
      return { wildcard: true, host: toAsciiDomain17(value.slice(2)) };
    } catch {
      return invalid('TLS_PEER_IDENTITY_INVALID');
    }
  }
  if (value.includes('*')) return invalid('TLS_PEER_IDENTITY_INVALID');
  try {
    return { wildcard: false, host: toAsciiDomain17(value) };
  } catch {
    return invalid('TLS_PEER_IDENTITY_INVALID');
  }
}

/**
 * Validate externally extracted SAN evidence against the canonical origin.
 *
 * CN values are intentionally absent from this context boundary.
 *
 * @param {unknown} origin exact verification origin
 * @param {{dnsNames: unknown[], ipAddresses: unknown[]}} sans selected leaf SAN values
 * @returns {void}
 */
export function validatePublicTlsPeerIdentity(origin, sans) {
  const evidence = assertLedger(
    sans,
    ['dnsNames', 'ipAddresses'],
    [],
    'TLS_PEER_IDENTITY_INVALID',
  );
  if (
    !Array.isArray(evidence.dnsNames) ||
    !Array.isArray(evidence.ipAddresses)
  ) {
    return invalid('TLS_PEER_IDENTITY_INVALID');
  }
  let parsedOrigin;
  try {
    parsedOrigin = parseVerificationOrigin(/** @type {string} */ (origin));
  } catch {
    return invalid('TLS_PEER_IDENTITY_INVALID');
  }
  const ipAddresses = evidence.ipAddresses.map((value) => {
    if (
      !(value instanceof Uint8Array) ||
      (value.length !== 4 && value.length !== 16)
    ) {
      return invalid('TLS_PEER_IDENTITY_INVALID');
    }
    return value.slice();
  });
  const dnsNames = evidence.dnsNames.map(normalizeDnsSan);
  if (parsedOrigin.hostKind === 'dns') {
    const targetLabels = parsedOrigin.host.split('.');
    const matches = dnsNames.some((san) => {
      if (!san.wildcard) return san.host === parsedOrigin.host;
      const suffixLabels = san.host.split('.');
      return (
        targetLabels.length === suffixLabels.length + 1 &&
        !targetLabels[0]?.startsWith('xn--') &&
        targetLabels.slice(1).join('.') === san.host
      );
    });
    if (!matches) invalid('TLS_PEER_IDENTITY_INVALID');
    return;
  }
  const addressBytes =
    parsedOrigin.hostKind === 'ipv4'
      ? Uint8Array.from(parseCanonicalIpv4(parsedOrigin.host).bytes)
      : Uint8Array.from(
          parseCanonicalOriginIpv6(parsedOrigin.host).words.flatMap((word) => [
            word >> 8,
            word & 0xff,
          ]),
        );
  if (!ipAddresses.some((value) => bytesEqual(value, addressBytes))) {
    invalid('TLS_PEER_IDENTITY_INVALID');
  }
}

/**
 * Convert native network-order address bytes to an unsigned integer.
 *
 * @param {readonly number[]} bytes native bytes
 * @returns {bigint} address value
 */
function addressBytesToBigInt(bytes) {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

/**
 * Canonicalize one complete fresh DNS answer and require every address public.
 *
 * Evidence acquisition is a live resolver boundary; this function validates
 * its bounded retained context without using host address predicates.
 *
 * @param {unknown} origin canonical DNS verification origin
 * @param {unknown} value fresh resolver evidence
 * @returns {{cnameChain: string[], addresses: {family: 4 | 6, addressBytes: number[]}[], selected: {family: 4 | 6, addressBytes: number[]}}} canonical safe answer
 */
export function canonicalizePublicDnsResolution(origin, value) {
  let parsedOrigin;
  try {
    parsedOrigin = parseVerificationOrigin(/** @type {string} */ (origin));
  } catch {
    return invalid('DNS_RESOLUTION_INVALID');
  }
  if (parsedOrigin.hostKind !== 'dns') return invalid('DNS_RESOLUTION_INVALID');
  const evidence = assertLedger(
    value,
    DNS_EVIDENCE_KEYS,
    [],
    'DNS_RESOLUTION_INVALID',
  );
  if (evidence.complete !== true || evidence.truncated !== false) {
    return invalid('DNS_RESOLUTION_INVALID');
  }
  assertInteger(
    evidence.elapsedMilliseconds,
    0,
    5_000,
    'DNS_RESOLUTION_INVALID',
  );
  if (!Array.isArray(evidence.cnameChain) || evidence.cnameChain.length > 8) {
    return invalid('DNS_RESOLUTION_INVALID');
  }
  const cnameChain = evidence.cnameChain.map((candidate) => {
    if (typeof candidate !== 'string') return invalid('DNS_RESOLUTION_INVALID');
    try {
      if (toAsciiDomain17(candidate) !== candidate) {
        return invalid('DNS_RESOLUTION_INVALID');
      }
    } catch {
      return invalid('DNS_RESOLUTION_INVALID');
    }
    return candidate;
  });
  if (
    new Set([parsedOrigin.host, ...cnameChain]).size !==
    cnameChain.length + 1
  ) {
    return invalid('DNS_RESOLUTION_INVALID');
  }
  if (!Array.isArray(evidence.addresses) || evidence.addresses.length === 0) {
    return invalid('DNS_RESOLUTION_INVALID');
  }
  const distinct = new Map();
  for (const candidate of evidence.addresses) {
    const entry = assertLedger(
      candidate,
      DNS_ADDRESS_KEYS,
      [],
      'DNS_RESOLUTION_INVALID',
    );
    if (entry.family !== 4 && entry.family !== 6) {
      return invalid('DNS_RESOLUTION_INVALID');
    }
    if (!Array.isArray(entry.addressBytes))
      return invalid('DNS_RESOLUTION_INVALID');
    const expectedLength = entry.family === 4 ? 4 : 16;
    if (
      entry.addressBytes.length !== expectedLength ||
      entry.addressBytes.some(
        (byte) =>
          typeof byte !== 'number' ||
          !Number.isInteger(byte) ||
          byte < 0 ||
          byte > 255,
      )
    ) {
      return invalid('DNS_RESOLUTION_INVALID');
    }
    const addressBytes = /** @type {number[]} */ (entry.addressBytes);
    const family = /** @type {4 | 6} */ (entry.family);
    const key = `${family}:${hexFromBytes(Uint8Array.from(addressBytes))}`;
    distinct.set(key, { family, addressBytes: [...addressBytes] });
  }
  if (distinct.size > 16) return invalid('DNS_RESOLUTION_INVALID');
  const addresses = [...distinct.values()].sort((left, right) => {
    if (left.family !== right.family) return left.family - right.family;
    return compareBytes(
      Uint8Array.from(left.addressBytes),
      Uint8Array.from(right.addressBytes),
    );
  });
  if (
    addresses.some(
      (entry) =>
        !isGloballyReachableAddress(
          entry.family,
          addressBytesToBigInt(entry.addressBytes),
        ),
    )
  ) {
    return invalid('DNS_RESOLUTION_INVALID');
  }
  const selected = addresses[0];
  if (!selected) return invalid('DNS_RESOLUTION_INVALID');
  return { cnameChain, addresses, selected };
}

/**
 * Validate the exact verification content-type grammar.
 *
 * @param {unknown} value candidate value
 * @returns {string} validated value
 */
export function validateVerificationContentType(value) {
  if (
    typeof value !== 'string' ||
    value.length < 3 ||
    value.length > 128 ||
    utf8Bytes(value).length !== value.length ||
    !CONTENT_TYPE_PATTERN.test(value)
  ) {
    return invalid('VERIFICATION_CONTENT_TYPE_INVALID');
  }
  return value;
}

/**
 * Validate an expected verification header name.
 *
 * @param {unknown} value candidate name
 * @returns {string} validated name
 */
export function validateVerificationHeaderName(value) {
  if (
    typeof value !== 'string' ||
    !HEADER_NAME_PATTERN.test(value) ||
    FORBIDDEN_HEADER_SET.has(value)
  ) {
    return invalid('VERIFICATION_HEADER_INVALID');
  }
  return value;
}

/**
 * Validate a safely retainable verification header value.
 *
 * @param {unknown} value candidate value
 * @returns {string} validated value
 */
export function validateVerificationHeaderValue(value) {
  if (
    typeof value !== 'string' ||
    utf8Bytes(value).length !== value.length ||
    !HEADER_VALUE_PATTERN.test(value)
  ) {
    return invalid('VERIFICATION_HEADER_INVALID');
  }
  return value;
}

/**
 * Validate one unique ASCII-sorted expected-header array.
 *
 * @param {unknown} value candidate expectation array
 * @returns {{name: string, value: string}[]} validated rows
 */
export function validateVerificationHeaderExpectations(value) {
  if (!Array.isArray(value) || value.length > 32) {
    return invalid('VERIFICATION_HEADER_INVALID');
  }
  const rows = value.map((candidate) => {
    const row = assertLedger(
      candidate,
      EXPECTED_HEADER_KEYS,
      [],
      'VERIFICATION_HEADER_INVALID',
    );
    return {
      name: validateVerificationHeaderName(row.name),
      value: validateVerificationHeaderValue(row.value),
    };
  });
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    if (
      !previous ||
      !current ||
      compareAscii(previous.name, current.name) >= 0
    ) {
      return invalid('VERIFICATION_HEADER_INVALID');
    }
  }
  return rows;
}

/**
 * Derive the exact pre-request retained-header union and feasibility bound.
 *
 * @param {unknown[]} expectationSets candidate followed by eligible prior arrays
 * @returns {{names: string[], maximumRequiredHeadBytes: number}} derived closure
 */
export function deriveMaximumRequiredHeadBytes(expectationSets) {
  const greatestLengths = new Map();
  for (const expectations of expectationSets) {
    for (const { name, value } of validateVerificationHeaderExpectations(
      expectations,
    )) {
      greatestLengths.set(
        name,
        Math.max(greatestLengths.get(name) ?? 0, value.length),
      );
    }
  }
  const names = [...greatestLengths.keys()].sort(compareAscii);
  if (names.length > 32) return invalid('VERIFICATION_HEADER_CLOSURE_INVALID');
  let maximumRequiredHeadBytes = 1_024 + 2 + Math.max(14 + 2 + 19 + 2, 28);
  for (const name of names) {
    maximumRequiredHeadBytes +=
      name.length + 2 + (greatestLengths.get(name) ?? 0) + 2;
    if (maximumRequiredHeadBytes > 32_768) {
      return invalid('VERIFICATION_HEADER_CLOSURE_INVALID');
    }
  }
  return { names, maximumRequiredHeadBytes };
}

/**
 * Select one exact admitted HTTP/1.1 terminal-body framing branch.
 *
 * Inputs are already case-folded raw field values from the bounded head parser;
 * this in-process context is not persisted.
 *
 * @param {{contentLength: string[], transferEncoding: string[], trailer: string[], contentEncoding: string[]}} fields parsed framing fields
 * @returns {{kind: 'content-length', length: bigint} | {kind: 'chunked'}} framing
 */
export function selectPublicHttpBodyFraming(fields) {
  if (
    !Array.isArray(fields.contentLength) ||
    !Array.isArray(fields.transferEncoding) ||
    !Array.isArray(fields.trailer) ||
    !Array.isArray(fields.contentEncoding) ||
    fields.trailer.length !== 0 ||
    fields.contentEncoding.length > 1 ||
    (fields.contentEncoding.length === 1 &&
      fields.contentEncoding[0] !== 'identity')
  ) {
    return invalid('HTTP_RESPONSE_FRAMING_INVALID');
  }
  if (
    fields.contentLength.length === 1 &&
    fields.transferEncoding.length === 0
  ) {
    const match = /^[ \t]*(0|[1-9][0-9]*)[ \t]*$/u.exec(
      fields.contentLength[0] ?? '',
    );
    if (!match?.[1]) return invalid('HTTP_RESPONSE_FRAMING_INVALID');
    const length = assertNonnegativeInt64(
      match[1],
      'HTTP_RESPONSE_FRAMING_INVALID',
    );
    return { kind: 'content-length', length };
  }
  if (
    fields.contentLength.length === 0 &&
    fields.transferEncoding.length === 1
  ) {
    if (!/^[ \t]*chunked[ \t]*$/iu.test(fields.transferEncoding[0] ?? '')) {
      return invalid('HTTP_RESPONSE_FRAMING_INVALID');
    }
    return { kind: 'chunked' };
  }
  return invalid('HTTP_RESPONSE_FRAMING_INVALID');
}

/**
 * Decode one complete canonical HTTP/1.1 entity under retained bounds.
 *
 * Timeout/cancellation versus clean-EOF incomplete classification remains a
 * live transport fact; this function accepts only a complete supplied buffer.
 *
 * @param {ReturnType<typeof selectPublicHttpBodyFraming>} framing admitted framing
 * @param {unknown} input exact wire-body bytes
 * @param {{maximumResponseBytes: string, maximumResponseWireBytes: string}} limits retained target limits
 * @returns {{entity: Uint8Array, observedByteLength: string, observedDigest: string}} decoded entity
 */
export function decodePublicHttpEntity(framing, input, limits) {
  if (!(input instanceof Uint8Array))
    return invalid('HTTP_RESPONSE_FRAMING_INVALID');
  const wire = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const maximumResponseBytes = assertNonnegativeInt64(
    limits.maximumResponseBytes,
    'HTTP_RESPONSE_FRAMING_INVALID',
  );
  const maximumResponseWireBytes = assertNonnegativeInt64(
    limits.maximumResponseWireBytes,
    'HTTP_RESPONSE_FRAMING_INVALID',
  );
  if (BigInt(wire.length) > maximumResponseWireBytes) {
    return invalid('HTTP_RESPONSE_LIMIT_EXCEEDED');
  }
  let entity;
  if (framing.kind === 'content-length') {
    if (framing.length > maximumResponseBytes) {
      return invalid('HTTP_RESPONSE_LIMIT_EXCEEDED');
    }
    if (BigInt(wire.length) !== framing.length) {
      return invalid('HTTP_RESPONSE_FRAMING_INVALID');
    }
    entity = wire.slice();
  } else {
    if (framing.kind !== 'chunked') {
      return invalid('HTTP_RESPONSE_FRAMING_INVALID');
    }
    /** @type {Uint8Array[]} */
    const chunks = [];
    let entityLength = 0n;
    let offset = 0;
    while (true) {
      const lineEnd = indexOfAscii(wire, '\r\n', offset);
      if (lineEnd < 0) return invalid('HTTP_RESPONSE_FRAMING_INVALID');
      const sizeSource = decodeLatin1(wire, offset, lineEnd);
      offset = lineEnd + 2;
      if (sizeSource === '0') {
        if (
          offset + 2 !== wire.length ||
          wire[offset] !== 0x0d ||
          wire[offset + 1] !== 0x0a
        ) {
          return invalid('HTTP_RESPONSE_FRAMING_INVALID');
        }
        break;
      }
      if (!/^[1-9a-f][0-9a-f]{0,15}$/u.test(sizeSource)) {
        return invalid('HTTP_RESPONSE_FRAMING_INVALID');
      }
      const chunkLength = BigInt(`0x${sizeSource}`);
      entityLength += chunkLength;
      if (
        entityLength > maximumResponseBytes ||
        chunkLength > BigInt(Number.MAX_SAFE_INTEGER)
      ) {
        return invalid('HTTP_RESPONSE_LIMIT_EXCEEDED');
      }
      if (
        wire.length - offset < 2 ||
        chunkLength > BigInt(wire.length - offset - 2)
      ) {
        return invalid('HTTP_RESPONSE_FRAMING_INVALID');
      }
      const end = offset + Number(chunkLength);
      if (wire[end] !== 0x0d || wire[end + 1] !== 0x0a) {
        return invalid('HTTP_RESPONSE_FRAMING_INVALID');
      }
      chunks.push(wire.slice(offset, end));
      offset = end + 2;
    }
    entity = concatBytes(chunks);
  }
  return {
    entity,
    observedByteLength: String(entity.length),
    observedDigest: sha256Tagged(entity),
  };
}

/**
 * Require one canonical probe-region identifier.
 *
 * @param {unknown} value candidate value
 * @param {string} code diagnostic code
 * @returns {string} validated region
 */
function assertProbeRegion(value, code) {
  if (
    typeof value !== 'string' ||
    value.length > 32 ||
    !PROBE_REGION_PATTERN.test(value)
  ) {
    return invalid(code);
  }
  return value;
}

/**
 * Validate one redirect contract from initial request through terminal URL.
 *
 * @param {Record<string, unknown>} contract contract-bearing record
 * @param {string} initialRequestUrl target initial URL
 * @param {number} maximumRedirectHops accepted policy limit
 * @param {string} code diagnostic code
 * @returns {{requestUrls: string[], redirectChain: Record<string, unknown>[]}} validated path
 */
function validateRedirectContract(
  contract,
  initialRequestUrl,
  maximumRedirectHops,
  code,
) {
  if (!Array.isArray(contract.redirectChain)) return invalid(code);
  if (
    contract.redirectChain.length > 10 ||
    contract.redirectChain.length > maximumRedirectHops ||
    typeof contract.terminalRequestUrl !== 'string'
  ) {
    return invalid(code);
  }
  const redirectChain = contract.redirectChain.map((candidate, index) => {
    const hop = assertLedger(candidate, REDIRECT_HOP_KEYS, [], code);
    if (
      hop.hopNumber !== index ||
      typeof hop.requestUrl !== 'string' ||
      typeof hop.expectedLocation !== 'string' ||
      !REDIRECT_STATUSES.includes(/** @type {number} */ (hop.expectedStatus))
    ) {
      return invalid(code);
    }
    parseVerificationUrl(hop.requestUrl);
    parseVerificationUrl(hop.expectedLocation);
    return hop;
  });
  parseVerificationUrl(contract.terminalRequestUrl);
  const requestUrls = [
    ...redirectChain.map((hop) => /** @type {string} */ (hop.requestUrl)),
    contract.terminalRequestUrl,
  ];
  if (
    requestUrls[0] !== initialRequestUrl ||
    new Set(requestUrls).size !== requestUrls.length
  ) {
    return invalid(code);
  }
  for (let index = 0; index < redirectChain.length; index += 1) {
    const hop = redirectChain[index];
    if (!hop || hop.expectedLocation !== requestUrls[index + 1])
      return invalid(code);
  }
  return { requestUrls, redirectChain };
}

/**
 * Validate one terminal contract's common values.
 *
 * @param {Record<string, unknown>} contract contract
 * @param {string} digestKey expected digest member
 * @param {string} code diagnostic code
 * @returns {{expectedByteLength: bigint, expectedHeaders: {name: string, value: string}[], expectedDigest: string}} values
 */
function validateTerminalContract(contract, digestKey, code) {
  if (
    contract.expectedTerminalStatus !== 200 &&
    contract.expectedTerminalStatus !== 404
  ) {
    return invalid(code);
  }
  const expectedByteLength = assertNonnegativeInt64(
    contract.expectedByteLength,
    code,
  );
  const expectedHeaders = validateVerificationHeaderExpectations(
    contract.expectedHeaders,
  );
  const contentType = expectedHeaders.find(
    ({ name }) => name === 'content-type',
  );
  if (!contentType) return invalid(code);
  validateVerificationContentType(contentType.value);
  const expectedDigest = assertDigest(contract[digestKey], code);
  return { expectedByteLength, expectedHeaders, expectedDigest };
}

/**
 * Validate the immutable marker authority and derive its unique plan route and
 * exact candidate entity facts.
 *
 * @param {unknown} value retained marker authority
 * @param {string[]} origins admitted verification origins
 * @returns {{origin: string, route: string, generationId: string, byteLength: string, digest: string}} derived marker facts
 */
function deriveMarkerAuthority(value, origins) {
  const authority = assertLedger(
    value,
    MARKER_AUTHORITY_KEYS,
    [],
    'VERIFICATION_PLAN_INVALID',
  );
  if (
    typeof authority.origin !== 'string' ||
    !origins.includes(authority.origin) ||
    typeof authority.basePath !== 'string' ||
    !authority.basePath.endsWith('/')
  ) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  try {
    parseVerificationOrigin(authority.origin);
    validateCanonicalVerificationRoute(authority.basePath);
  } catch {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  const marker = assertLedger(
    authority.value,
    PUBLIC_GENERATION_MARKER_KEYS,
    [],
    'VERIFICATION_PLAN_INVALID',
  );
  if (
    marker.schemaId !== 'urn:gala:schema:public-generation-marker:2.0.0' ||
    marker.schemaVersion !== '2.0.0'
  ) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  assertStableId(marker.artifactId, 'VERIFICATION_PLAN_INVALID');
  assertDigest(marker.artifactDigest, 'VERIFICATION_PLAN_INVALID');
  const generationId = assertStableId(
    marker.generationId,
    'VERIFICATION_PLAN_INVALID',
  );
  const route = `${authority.basePath}.well-known/gala-generation.json`;
  try {
    validateCanonicalVerificationRoute(route);
  } catch {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  const bytes = canonicalizeJcsBytes(marker);
  return {
    origin: authority.origin,
    route,
    generationId,
    byteLength: String(bytes.length),
    digest: sha256Tagged(bytes),
  };
}

/**
 * Derive the complete target ledger from immutable target-specific authority
 * plus the accepted common verification policy.
 *
 * @param {unknown} value immutable target-specific authority rows
 * @param {{maximumRedirectHops: number, maximumAttempts: number, maximumConcurrentStreams: number, maximumPublicResponseBytes: bigint, requestTimeoutSeconds: number}} policy accepted common policy
 * @returns {Record<string, unknown>[]} exact sorted plan
 */
function deriveExpectedVerificationPlan(value, policy) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 900) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  const rows = value.map((candidate) =>
    assertLedger(
      candidate,
      AUTHORITATIVE_TARGET_KEYS,
      [],
      'VERIFICATION_PLAN_INVALID',
    ),
  );
  rows.sort((left, right) => {
    if (typeof left.origin !== 'string' || typeof right.origin !== 'string') {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
    const originComparison = compareAscii(left.origin, right.origin);
    if (originComparison !== 0) return originComparison;
    if (typeof left.route !== 'string' || typeof right.route !== 'string') {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
    return compareAscii(left.route, right.route);
  });
  const result = /** @type {Record<string, unknown>[]} */ (
    rows.map((row, index) => {
      if (!Array.isArray(row.recognizedPriorContracts)) {
        return invalid('VERIFICATION_PLAN_INVALID');
      }
      const expectedLengths = [
        assertNonnegativeInt64(
          row.expectedByteLength,
          'VERIFICATION_PLAN_INVALID',
        ),
        ...row.recognizedPriorContracts.map((candidate) =>
          assertNonnegativeInt64(
            asObject(candidate, 'VERIFICATION_PLAN_INVALID').expectedByteLength,
            'VERIFICATION_PLAN_INVALID',
          ),
        ),
      ];
      const maximumResponseBytes = expectedLengths.reduce(
        (maximum, current) => (current > maximum ? current : maximum),
        0n,
      );
      const maximumResponseWireBytes = 6n * maximumResponseBytes + 5n;
      if (
        maximumResponseBytes > policy.maximumPublicResponseBytes ||
        maximumResponseWireBytes > INT64_MAXIMUM
      ) {
        return invalid('VERIFICATION_PLAN_INVALID');
      }
      return {
        targetId: index + 1,
        ...row,
        maximumResponseBytes: String(maximumResponseBytes),
        maximumResponseWireBytes: String(maximumResponseWireBytes),
        requestTimeoutSeconds: policy.requestTimeoutSeconds,
        requestProfile: PUBLIC_VERIFIER_REQUEST_PROFILE.requestProfile,
        retryProfile: PUBLIC_VERIFIER_REQUEST_PROFILE.retryProfile,
        maximumAttempts: policy.maximumAttempts,
        maximumConcurrentStreams: policy.maximumConcurrentStreams,
      };
    })
  );
  for (let index = 1; index < result.length; index += 1) {
    const previous = result[index - 1];
    const current = result[index];
    if (
      !previous ||
      !current ||
      (previous.origin === current.origin && previous.route === current.route)
    ) {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
  }
  return result;
}

/**
 * Validate the complete deterministic verification plan against retained policy.
 *
 * `authoritativeTargets`, `marker`, and
 * `retainedPriorGenerationIdsByTargetId` are immutable server-owned context,
 * not plan members. Target IDs and every common policy/limit member are derived
 * here rather than trusted from a self-digested candidate plan.
 *
 * @param {unknown} value candidate target array
 * @param {{verificationOrigins: string[], verificationPlanDigest: string, maximumRedirectHops: number, maximumAttemptsPerTarget: number, maximumConcurrentStreams: number, maximumPublicResponseBytes: string, requestTimeoutSeconds: number, retainedPriorGenerationIdsByTargetId: Record<string, string[]>, authoritativeTargets?: unknown[], marker?: unknown}} context retained policy/history/target authority
 * @returns {string} verified plan digest
 */
export function validateVerificationPlan(value, context) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 900) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  const maximumRedirectHops = assertInteger(
    context.maximumRedirectHops,
    0,
    10,
    'VERIFICATION_PLAN_INVALID',
  );
  const maximumAttempts = assertInteger(
    context.maximumAttemptsPerTarget,
    1,
    10,
    'VERIFICATION_PLAN_INVALID',
  );
  const maximumConcurrentStreams = assertInteger(
    context.maximumConcurrentStreams,
    1,
    32,
    'VERIFICATION_PLAN_INVALID',
  );
  const requestTimeoutSeconds = assertInteger(
    context.requestTimeoutSeconds,
    1,
    30,
    'VERIFICATION_PLAN_INVALID',
  );
  const policyMaximumResponseBytes = assertNonnegativeInt64(
    context.maximumPublicResponseBytes,
    'VERIFICATION_PLAN_INVALID',
  );
  if (policyMaximumResponseBytes === 0n)
    return invalid('VERIFICATION_PLAN_INVALID');
  assertDigest(context.verificationPlanDigest, 'VERIFICATION_PLAN_INVALID');
  if (
    !Array.isArray(context.verificationOrigins) ||
    context.verificationOrigins.length < 1 ||
    context.verificationOrigins.length > 8
  ) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  const origins = context.verificationOrigins.map((origin) => {
    try {
      parseVerificationOrigin(origin);
    } catch {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
    return origin;
  });
  for (let index = 1; index < origins.length; index += 1) {
    if (compareAscii(origins[index - 1] ?? '', origins[index] ?? '') >= 0) {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
  }
  const expectedPlan = deriveExpectedVerificationPlan(
    context.authoritativeTargets,
    {
      maximumRedirectHops,
      maximumAttempts,
      maximumConcurrentStreams,
      maximumPublicResponseBytes: policyMaximumResponseBytes,
      requestTimeoutSeconds,
    },
  );
  assertJcsEqual(value, expectedPlan, 'VERIFICATION_PLAN_INVALID');
  const marker = deriveMarkerAuthority(context.marker, origins);
  const markerTargets = expectedPlan.filter(
    (target) =>
      target.origin === marker.origin && target.route === marker.route,
  );
  const markerTarget = markerTargets[0];
  if (
    markerTargets.length !== 1 ||
    !markerTarget ||
    markerTarget.expectedTerminalStatus !== 200 ||
    markerTarget.expectedByteLength !== marker.byteLength ||
    markerTarget.expectedCandidateDigest !== marker.digest
  ) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  const priorOrder = asObject(
    context.retainedPriorGenerationIdsByTargetId,
    'VERIFICATION_PLAN_INVALID',
  );
  let baseProbeStreamCount = 0n;
  const targets = value.map((candidate, index) => {
    const target = assertLedger(
      candidate,
      PLAN_TARGET_KEYS,
      [],
      'VERIFICATION_PLAN_INVALID',
    );
    if (target.targetId !== index + 1 || typeof target.origin !== 'string') {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
    if (!origins.includes(target.origin))
      return invalid('VERIFICATION_PLAN_INVALID');
    const initialRequestUrl = joinVerificationUrl(target.origin, target.route);
    const path = validateRedirectContract(
      target,
      initialRequestUrl,
      maximumRedirectHops,
      'VERIFICATION_PLAN_INVALID',
    );
    const terminal = validateTerminalContract(
      target,
      'expectedCandidateDigest',
      'VERIFICATION_PLAN_INVALID',
    );
    if (
      target.requestProfile !==
        PUBLIC_VERIFIER_REQUEST_PROFILE.requestProfile ||
      target.retryProfile !== PUBLIC_VERIFIER_REQUEST_PROFILE.retryProfile ||
      target.maximumAttempts !== maximumAttempts ||
      target.maximumConcurrentStreams !== maximumConcurrentStreams ||
      target.requestTimeoutSeconds !== requestTimeoutSeconds ||
      !Array.isArray(target.requiredProbeRegions) ||
      target.requiredProbeRegions.length < 1 ||
      target.requiredProbeRegions.length > 8 ||
      !Array.isArray(target.recognizedPriorContracts) ||
      target.recognizedPriorContracts.length > 6
    ) {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
    const requiredProbeRegions = target.requiredProbeRegions.map((region) =>
      assertProbeRegion(region, 'VERIFICATION_PLAN_INVALID'),
    );
    for (
      let regionIndex = 1;
      regionIndex < requiredProbeRegions.length;
      regionIndex += 1
    ) {
      if (
        compareAscii(
          requiredProbeRegions[regionIndex - 1] ?? '',
          requiredProbeRegions[regionIndex] ?? '',
        ) >= 0
      ) {
        return invalid('VERIFICATION_PLAN_INVALID');
      }
    }
    baseProbeStreamCount += BigInt(requiredProbeRegions.length);
    const priors = target.recognizedPriorContracts.map((candidatePrior) => {
      const prior = assertLedger(
        candidatePrior,
        PRIOR_CONTRACT_KEYS,
        [],
        'VERIFICATION_PLAN_INVALID',
      );
      assertStableId(prior.generationId, 'VERIFICATION_PLAN_INVALID');
      const priorPath = validateRedirectContract(
        prior,
        initialRequestUrl,
        maximumRedirectHops,
        'VERIFICATION_PLAN_INVALID',
      );
      const priorTerminal = validateTerminalContract(
        prior,
        'expectedDigest',
        'VERIFICATION_PLAN_INVALID',
      );
      return { record: prior, path: priorPath, terminal: priorTerminal };
    });
    const generationIds = priors.map(
      ({ record }) => /** @type {string} */ (record.generationId),
    );
    if (new Set(generationIds).size !== generationIds.length) {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
    const expectedOrder = priorOrder[String(index + 1)];
    if (!Array.isArray(expectedOrder))
      return invalid('VERIFICATION_PLAN_INVALID');
    assertJcsEqual(generationIds, expectedOrder, 'VERIFICATION_PLAN_INVALID');
    const maximumResponseBytes = [
      terminal.expectedByteLength,
      ...priors.map(
        ({ terminal: priorTerminal }) => priorTerminal.expectedByteLength,
      ),
    ].reduce((maximum, current) => (current > maximum ? current : maximum), 0n);
    if (
      assertNonnegativeInt64(
        target.maximumResponseBytes,
        'VERIFICATION_PLAN_INVALID',
      ) !== maximumResponseBytes ||
      maximumResponseBytes > policyMaximumResponseBytes
    ) {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
    const maximumResponseWireBytes = 6n * maximumResponseBytes + 5n;
    if (
      maximumResponseWireBytes > INT64_MAXIMUM ||
      assertNonnegativeInt64(
        target.maximumResponseWireBytes,
        'VERIFICATION_PLAN_INVALID',
      ) !== maximumResponseWireBytes
    ) {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
    deriveMaximumRequiredHeadBytes([
      target.expectedHeaders,
      ...target.recognizedPriorContracts.map(
        (prior) => asObject(prior, 'VERIFICATION_PLAN_INVALID').expectedHeaders,
      ),
    ]);
    return { record: target, path, terminal, priors };
  });
  const requiredProbeSlots =
    baseProbeStreamCount *
    BigInt(maximumAttempts) *
    (1n + BigInt(maximumRedirectHops));
  if (requiredProbeSlots > PUBLIC_VERIFICATION_PROBE_SLOT_CEILING) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  for (let index = 1; index < targets.length; index += 1) {
    const previous = targets[index - 1]?.record;
    const current = targets[index]?.record;
    if (!previous || !current) return invalid('VERIFICATION_PLAN_INVALID');
    const originComparison = compareAscii(
      /** @type {string} */ (previous.origin),
      /** @type {string} */ (current.origin),
    );
    if (
      originComparison > 0 ||
      (originComparison === 0 &&
        compareAscii(
          /** @type {string} */ (previous.route),
          /** @type {string} */ (current.route),
        ) >= 0)
    ) {
      return invalid('VERIFICATION_PLAN_INVALID');
    }
  }
  if (
    new Set(targets.map(({ record }) => record.origin)).size !==
      origins.length ||
    Object.keys(priorOrder).length !== targets.length
  ) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  const digestProfile = ACTIVE_DIGEST_PROFILES.verificationPlan;
  if (!digestProfile)
    throw new TypeError('VERIFICATION_PLAN_DIGEST_PROFILE_MISSING');
  const digest = digestProfile.digest(value);
  if (digest !== context.verificationPlanDigest) {
    return invalid('VERIFICATION_PLAN_INVALID');
  }
  return digest;
}

/**
 * Validate network/TLS/plan digest equality across policy and intent owners.
 *
 * @param {{policy: Record<string, unknown>, intent: Record<string, unknown>, tlsProfile: unknown, trustStore: ReturnType<typeof parsePublicTlsTrustStore>, revocationSet: ReturnType<typeof parsePublicTlsRevocationSet>, plan: unknown, planContext: Parameters<typeof validateVerificationPlan>[1]}} context retained authority context
 * @returns {{networkBoundaryProfileDigest: string, publicTlsProfileDigest: string, verificationPlanDigest: string}} verified digests
 */
export function validatePublicVerificationBindings(context) {
  const publicTlsProfileDigest = validatePublicTlsProfile(context.tlsProfile, {
    trustStoreDigest: context.trustStore.trustStoreDigest,
    revocationSetDigest: context.revocationSet.revocationSetDigest,
    revocationValidUntil: context.revocationSet.value.validUntil,
  });
  const verificationPlanDigest = validateVerificationPlan(
    context.plan,
    context.planContext,
  );
  for (const owner of [context.policy, context.intent]) {
    if (
      owner.networkBoundaryProfileDigest !== NETWORK_BOUNDARY_PROFILE_DIGEST ||
      owner.publicTlsProfileDigest !== publicTlsProfileDigest ||
      owner.publicTlsTrustStoreDigest !== context.trustStore.trustStoreDigest ||
      owner.publicTlsRevocationSetDigest !==
        context.revocationSet.revocationSetDigest ||
      owner.verificationPlanDigest !== verificationPlanDigest
    ) {
      return invalid('PUBLIC_VERIFICATION_BINDING_INVALID');
    }
  }
  if (
    context.policy.retryProfile !==
      PUBLIC_VERIFIER_REQUEST_PROFILE.retryProfile ||
    context.policy.maximumRedirectHops !==
      context.planContext.maximumRedirectHops ||
    context.policy.maximumAttemptsPerTarget !==
      context.planContext.maximumAttemptsPerTarget ||
    context.policy.maximumConcurrentStreams !==
      context.planContext.maximumConcurrentStreams ||
    context.policy.maximumPublicResponseBytes !==
      context.planContext.maximumPublicResponseBytes ||
    context.policy.requestTimeoutSeconds !==
      context.planContext.requestTimeoutSeconds ||
    canonicalizeJcs(context.policy.verificationOrigins) !==
      canonicalizeJcs(context.planContext.verificationOrigins) ||
    canonicalizeJcs(context.intent.verificationOrigins) !==
      canonicalizeJcs(context.planContext.verificationOrigins) ||
    context.policy.maximumPublicVerificationSeconds !==
      context.intent.maximumPublicVerificationSeconds ||
    assertInteger(
      context.policy.maximumPublicVerificationSeconds,
      1,
      3_600,
      'PUBLIC_VERIFICATION_BINDING_INVALID',
    ) !== context.intent.maximumPublicVerificationSeconds
  ) {
    return invalid('PUBLIC_VERIFICATION_BINDING_INVALID');
  }
  return {
    networkBoundaryProfileDigest: NETWORK_BOUNDARY_PROFILE_DIGEST,
    publicTlsProfileDigest,
    verificationPlanDigest,
  };
}

/**
 * Validate one safely retained observed-header row.
 *
 * @param {unknown} value candidate row
 * @returns {{name: string, state: string, value?: string}} validated row
 */
function validateObservedHeader(value) {
  const row = assertLedger(
    value,
    OBSERVED_HEADER_REQUIRED_KEYS,
    OBSERVED_HEADER_OPTIONAL_KEYS,
    'PUBLIC_PROBE_INVALID',
  );
  const name = validateVerificationHeaderName(row.name);
  if (
    !['present', 'absent', 'unsafe-omitted'].includes(
      /** @type {string} */ (row.state),
    )
  ) {
    return invalid('PUBLIC_PROBE_INVALID');
  }
  if (row.state === 'present') {
    if (!Object.hasOwn(row, 'value')) return invalid('PUBLIC_PROBE_INVALID');
    return {
      name,
      state: row.state,
      value: validateVerificationHeaderValue(row.value),
    };
  }
  if (Object.hasOwn(row, 'value')) return invalid('PUBLIC_PROBE_INVALID');
  return { name, state: /** @type {string} */ (row.state) };
}

/**
 * Require one field to be absent.
 *
 * @param {Record<string, unknown>} object source record
 * @param {string} key field name
 * @param {string} [code] diagnostic code
 * @returns {void}
 */
function requireAbsent(object, key, code = 'PUBLIC_PROBE_INVALID') {
  if (Object.hasOwn(object, key)) invalid(code);
}

/**
 * Require all named fields to be absent.
 *
 * @param {Record<string, unknown>} object source record
 * @param {readonly string[]} keys field names
 * @param {string} [code] diagnostic code
 * @returns {void}
 */
function requireAllAbsent(object, keys, code = 'PUBLIC_PROBE_INVALID') {
  for (const key of keys) requireAbsent(object, key, code);
}

/**
 * Validate one probe's schema-level conditionals and scalar forms.
 *
 * @param {unknown} value candidate probe
 * @param {{detectionAttemptNumber?: number}} [options] probe-kind context
 * @returns {Record<string, unknown>} validated probe
 */
function validateProbeRecord(value, options = {}) {
  const detection = options.detectionAttemptNumber !== undefined;
  const code = detection
    ? 'ACTIVATION_DETECTION_OBSERVATION_INVALID'
    : 'PUBLIC_PROBE_INVALID';
  const predecessorKey = detection
    ? 'precedingDetectionProbeEvidenceDigest'
    : 'precedingProbeEvidenceDigest';
  const probe = assertLedger(
    value,
    detection ? ACTIVATION_DETECTION_PROBE_REQUIRED_KEYS : PROBE_REQUIRED_KEYS,
    detection ? ACTIVATION_DETECTION_PROBE_OPTIONAL_KEYS : PROBE_OPTIONAL_KEYS,
    code,
  );
  assertInteger(probe.targetId, 1, 900, code);
  if (detection) assertInteger(options.detectionAttemptNumber, 1, 91, code);
  else assertInteger(probe.attemptNumber, 1, 10, code);
  const hopNumber = assertInteger(probe.hopNumber, 0, 10, code);
  if (hopNumber === 0) requireAbsent(probe, predecessorKey, code);
  else assertDigest(probe[predecessorKey], code);
  if (typeof probe.origin !== 'string') return invalid(code);
  try {
    joinVerificationUrl(probe.origin, probe.route);
    parseVerificationUrl(probe.requestUrl);
  } catch {
    return invalid(code);
  }
  assertProbeRegion(probe.probeRegion, code);
  if (Object.hasOwn(probe, 'contractGenerationId')) {
    assertStableId(probe.contractGenerationId, code);
  }
  if (Object.hasOwn(probe, 'observedGenerationId')) {
    assertStableId(probe.observedGenerationId, code);
  }
  const requestStartedAt = assertTimestamp(probe.requestStartedAt, code);
  const observedAt = assertTimestamp(probe.observedAt, code);
  if (requestStartedAt > observedAt) return invalid(code);
  assertDigest(probe.expectedCandidateDigest, code);
  assertDigest(probe.evidenceDigest, code);
  const responseHeadState = probe.responseHeadState;
  const locationState = probe.observedLocationState;
  const bodyState = probe.bodyState;
  const classification = probe.classification;
  if (
    !['not-received', 'complete', 'limit-exceeded', 'malformed'].includes(
      /** @type {string} */ (responseHeadState),
    ) ||
    !['absent', 'retained', 'unsafe-omitted', 'head-unavailable'].includes(
      /** @type {string} */ (locationState),
    ) ||
    ![
      'not-read',
      'incomplete',
      'complete',
      'limit-exceeded',
      'encoding-rejected',
      'framing-rejected',
    ].includes(/** @type {string} */ (bodyState)) ||
    ![
      'redirect-match',
      'candidate',
      'recognized-prior',
      'integrity-mismatch',
      'inconclusive',
    ].includes(/** @type {string} */ (classification)) ||
    !Array.isArray(probe.observedHeaders) ||
    probe.observedHeaders.length > 32
  ) {
    return invalid(code);
  }
  let observedHeaders;
  try {
    observedHeaders = probe.observedHeaders.map(validateObservedHeader);
  } catch {
    return invalid(code);
  }
  for (let index = 1; index < observedHeaders.length; index += 1) {
    if (
      compareAscii(
        observedHeaders[index - 1]?.name ?? '',
        observedHeaders[index]?.name ?? '',
      ) >= 0
    ) {
      return invalid(code);
    }
  }
  if (locationState === 'retained') {
    try {
      validateObservedRedirectLocation(probe.observedLocation);
    } catch {
      return invalid(code);
    }
  } else {
    requireAbsent(probe, 'observedLocation', code);
  }
  if (bodyState === 'complete') {
    assertNonnegativeInt64(probe.observedByteLength, code);
    assertDigest(probe.observedDigest, code);
    if (responseHeadState !== 'complete') return invalid(code);
  } else {
    requireAllAbsent(
      probe,
      ['observedByteLength', 'observedDigest', 'observedGenerationId'],
      code,
    );
  }
  if (bodyState !== 'not-read' && responseHeadState !== 'complete') {
    return invalid(code);
  }
  if (responseHeadState === 'complete') {
    const observedStatus = assertInteger(probe.observedStatus, 100, 599, code);
    if (
      (observedStatus >= 100 &&
        observedStatus < 200 &&
        observedStatus !== 101) ||
      locationState === 'head-unavailable'
    ) {
      return invalid(code);
    }
  } else if (responseHeadState === 'not-received') {
    if (
      locationState !== 'absent' ||
      bodyState !== 'not-read' ||
      classification !== 'inconclusive' ||
      observedHeaders.length !== 0
    ) {
      return invalid(code);
    }
    requireAllAbsent(
      probe,
      [
        'contractGenerationId',
        'observedStatus',
        'observedLocation',
        'observedByteLength',
        'observedDigest',
        'observedGenerationId',
      ],
      code,
    );
  } else {
    if (Object.hasOwn(probe, 'observedStatus')) {
      assertInteger(probe.observedStatus, 100, 599, code);
    }
    if (
      locationState !== 'head-unavailable' ||
      bodyState !== 'not-read' ||
      classification !== 'inconclusive' ||
      observedHeaders.length !== 0
    ) {
      return invalid(code);
    }
    requireAllAbsent(
      probe,
      [
        'contractGenerationId',
        'observedLocation',
        'observedByteLength',
        'observedDigest',
        'observedGenerationId',
      ],
      code,
    );
  }
  if (bodyState === 'incomplete') {
    if (classification !== 'inconclusive') return invalid(code);
    requireAbsent(probe, 'contractGenerationId', code);
  }
  if (
    ['limit-exceeded', 'encoding-rejected', 'framing-rejected'].includes(
      /** @type {string} */ (bodyState),
    ) &&
    classification !== 'integrity-mismatch'
  ) {
    return invalid(code);
  }
  const digestProfile = detection
    ? ACTIVE_DIGEST_PROFILES.publicActivationDetectionProbe
    : ACTIVE_DIGEST_PROFILES.publicProbeObservation;
  if (!digestProfile)
    throw new TypeError('PUBLIC_PROBE_DIGEST_PROFILE_MISSING');
  if (digestProfile.digest(probe) !== probe.evidenceDigest) {
    return invalid(code);
  }
  return probe;
}

/**
 * Build candidate/prior contract views for one validated target.
 *
 * @param {Record<string, unknown>} target plan target
 * @param {string} proposedGenerationId candidate generation
 * @returns {{generationId: string, redirectChain: Record<string, unknown>[], terminalRequestUrl: string, expectedTerminalStatus: number, expectedByteLength: string, expectedHeaders: {name: string, value: string}[], expectedDigest: string}[]} eligible contracts
 */
function probeContracts(target, proposedGenerationId) {
  const candidate = {
    generationId: proposedGenerationId,
    redirectChain: /** @type {Record<string, unknown>[]} */ (
      target.redirectChain
    ),
    terminalRequestUrl: /** @type {string} */ (target.terminalRequestUrl),
    expectedTerminalStatus: /** @type {number} */ (
      target.expectedTerminalStatus
    ),
    expectedByteLength: /** @type {string} */ (target.expectedByteLength),
    expectedHeaders: validateVerificationHeaderExpectations(
      target.expectedHeaders,
    ),
    expectedDigest: /** @type {string} */ (target.expectedCandidateDigest),
  };
  return [
    candidate,
    .../** @type {Record<string, unknown>[]} */ (
      target.recognizedPriorContracts
    ).map((prior) => ({
      generationId: /** @type {string} */ (prior.generationId),
      redirectChain: /** @type {Record<string, unknown>[]} */ (
        prior.redirectChain
      ),
      terminalRequestUrl: /** @type {string} */ (prior.terminalRequestUrl),
      expectedTerminalStatus: /** @type {number} */ (
        prior.expectedTerminalStatus
      ),
      expectedByteLength: /** @type {string} */ (prior.expectedByteLength),
      expectedHeaders: validateVerificationHeaderExpectations(
        prior.expectedHeaders,
      ),
      expectedDigest: /** @type {string} */ (prior.expectedDigest),
    })),
  ];
}

/**
 * Return a contract's complete request URL sequence.
 *
 * @param {ReturnType<typeof probeContracts>[number]} contract eligible contract
 * @returns {string[]} redirect requests followed by the terminal request
 */
function contractRequestUrls(contract) {
  return [
    ...contract.redirectChain.map(
      (hop) => /** @type {string} */ (hop.requestUrl),
    ),
    contract.terminalRequestUrl,
  ];
}

/**
 * Report whether one retained row exactly proves an expected redirect hop.
 *
 * @param {Record<string, unknown>} probe retained probe
 * @param {Record<string, unknown>} expectedHop expected redirect
 * @returns {boolean} whether every redirect fact matches
 */
function matchesRedirectFacts(probe, expectedHop) {
  return (
    probe.responseHeadState === 'complete' &&
    probe.observedStatus === expectedHop.expectedStatus &&
    probe.observedLocationState === 'retained' &&
    probe.observedLocation === expectedHop.expectedLocation &&
    Array.isArray(probe.observedHeaders) &&
    probe.observedHeaders.length === 0 &&
    probe.bodyState === 'not-read'
  );
}

/**
 * Compare retained terminal header rows with one contract's expectations.
 *
 * @param {{name: string, state: string, value?: string}[]} observedHeaders retained union rows
 * @param {{name: string, value: string}[]} expectedHeaders selected expectations
 * @returns {boolean} whether every selected expectation is present and equal
 */
function matchesExpectedHeaders(observedHeaders, expectedHeaders) {
  const observedMap = new Map(
    observedHeaders.map((header) => [header.name, header]),
  );
  return expectedHeaders.every((expected) => {
    const observed = observedMap.get(expected.name);
    return observed?.state === 'present' && observed.value === expected.value;
  });
}

/**
 * Classify terminal facts relative to one contract without trusting the stored
 * classification or contract-generation label.
 *
 * @param {Record<string, unknown>} probe terminal probe
 * @param {ReturnType<typeof probeContracts>[number]} contract eligible contract
 * @param {{name: string, state: string, value?: string}[]} observedHeaders retained header union
 * @param {boolean} markerTarget whether this is the generation-marker target
 * @returns {'match'|'inconclusive'|'mismatch'} fact relationship
 */
function classifyTerminalFacts(probe, contract, observedHeaders, markerTarget) {
  if (
    probe.responseHeadState === 'not-received' ||
    probe.responseHeadState === 'limit-exceeded' ||
    probe.responseHeadState === 'malformed'
  ) {
    return 'inconclusive';
  }
  if (probe.bodyState === 'incomplete') return 'inconclusive';
  if (
    probe.observedStatus !== contract.expectedTerminalStatus ||
    probe.observedLocationState !== 'absent' ||
    !matchesExpectedHeaders(observedHeaders, contract.expectedHeaders)
  ) {
    return 'mismatch';
  }
  if (probe.bodyState === 'not-read') return 'inconclusive';
  if (probe.bodyState !== 'complete') return 'mismatch';
  if (
    probe.observedByteLength !== contract.expectedByteLength ||
    probe.observedDigest !== contract.expectedDigest
  ) {
    return 'mismatch';
  }
  if (markerTarget && !Object.hasOwn(probe, 'observedGenerationId')) {
    return 'inconclusive';
  }
  if (
    Object.hasOwn(probe, 'observedGenerationId') &&
    probe.observedGenerationId !== contract.generationId
  ) {
    return 'mismatch';
  }
  return 'match';
}

/**
 * Classify the last emitted row against a contract whose prefix reached it.
 * A matching redirect with no following request is incomplete evidence, not a
 * successful redirect row, because selection is over the complete chain.
 *
 * @param {Record<string, unknown>} probe final emitted probe
 * @param {ReturnType<typeof probeContracts>[number]} contract eligible contract
 * @param {number} hopNumber final emitted hop number
 * @param {{name: string, state: string, value?: string}[]} observedHeaders retained header rows
 * @param {boolean} markerTarget whether this is the generation-marker target
 * @returns {'match'|'inconclusive'|'mismatch'} fact relationship
 */
function classifyAttemptEnd(
  probe,
  contract,
  hopNumber,
  observedHeaders,
  markerTarget,
) {
  const expectedRedirect = contract.redirectChain[hopNumber];
  if (expectedRedirect) {
    if (
      probe.responseHeadState === 'not-received' ||
      probe.responseHeadState === 'limit-exceeded' ||
      probe.responseHeadState === 'malformed'
    ) {
      return 'inconclusive';
    }
    return matchesRedirectFacts(probe, expectedRedirect)
      ? 'inconclusive'
      : 'mismatch';
  }
  if (hopNumber !== contract.redirectChain.length) return 'mismatch';
  return classifyTerminalFacts(probe, contract, observedHeaders, markerTarget);
}

/**
 * Locate the one authority-derived marker target in a validated plan.
 *
 * @param {Record<string, unknown>[]} plan validated plan
 * @param {Parameters<typeof validateVerificationPlan>[1]} planContext immutable plan context
 * @param {string} code diagnostic code
 * @returns {{target: Record<string, unknown>, generationId: string}} marker facts
 */
function findMarkerTarget(plan, planContext, code) {
  let marker;
  try {
    marker = deriveMarkerAuthority(
      planContext.marker,
      planContext.verificationOrigins,
    );
  } catch {
    return invalid(code);
  }
  const matches = plan.filter(
    (target) =>
      target.origin === marker.origin && target.route === marker.route,
  );
  if (matches.length !== 1 || !matches[0]) return invalid(code);
  return { target: matches[0], generationId: marker.generationId };
}

/**
 * Validate common redirect, terminal, timing, and selection semantics for an
 * ordinary or activation-detection attempt.
 *
 * @param {unknown} value atomically emitted probe rows
 * @param {{target: Record<string, unknown>, markerTarget: Record<string, unknown>, targetId: number, probeRegion: string, attemptNumber: number, proposedGenerationId: string, priorMatchDeadlineAt: string, startNotBeforeAt: number, operationDeadline: string, detection: boolean}} context validated attempt authority
 * @returns {{terminalClassification: string, terminalObservedAt: string, terminalEvidenceDigest: string}}
 */
function validateProbeBatch(value, context) {
  const code = context.detection
    ? 'ACTIVATION_DETECTION_OBSERVATION_INVALID'
    : 'PUBLIC_PROBE_INVALID';
  if (!Array.isArray(value) || value.length < 1 || value.length > 11) {
    return invalid(code);
  }
  if (
    !(
      /** @type {string[]} */ (context.target.requiredProbeRegions).includes(
        context.probeRegion,
      )
    )
  ) {
    return invalid(code);
  }
  const probes = value.map((probe) =>
    validateProbeRecord(
      probe,
      context.detection
        ? { detectionAttemptNumber: context.attemptNumber }
        : undefined,
    ),
  );
  const contracts = probeContracts(
    context.target,
    context.proposedGenerationId,
  );
  const union = deriveMaximumRequiredHeadBytes(
    contracts.map(({ expectedHeaders }) => expectedHeaders),
  ).names;
  const terminalProbe = probes.at(-1);
  if (!terminalProbe) return invalid(code);
  const claimedGenerationIds = [
    ...new Set(
      probes
        .filter((probe) => Object.hasOwn(probe, 'contractGenerationId'))
        .map((probe) => /** @type {string} */ (probe.contractGenerationId)),
    ),
  ];
  if (claimedGenerationIds.length > 1) return invalid(code);
  const claimedGenerationId = claimedGenerationIds[0];
  const claimedContract = contracts.find(
    ({ generationId }) => generationId === claimedGenerationId,
  );
  if (claimedGenerationId !== undefined && !claimedContract) {
    return invalid(code);
  }
  const priorMatchDeadline = timestampMilliseconds(
    context.priorMatchDeadlineAt,
    code,
  );
  const operationDeadline = timestampMilliseconds(
    context.operationDeadline,
    code,
  );
  const requestTimeoutMilliseconds =
    /** @type {number} */ (context.target.requestTimeoutSeconds) * 1_000;
  const predecessorKey = context.detection
    ? 'precedingDetectionProbeEvidenceDigest'
    : 'precedingProbeEvidenceDigest';
  let reachableContracts = contracts;
  let previousObservedAt;
  for (let index = 0; index < probes.length; index += 1) {
    const probe = probes[index];
    if (!probe) return invalid(code);
    const requestStartedAt = timestampMilliseconds(
      probe.requestStartedAt,
      code,
    );
    const observedAt = timestampMilliseconds(probe.observedAt, code);
    if (
      probe.targetId !== context.targetId ||
      (!context.detection && probe.attemptNumber !== context.attemptNumber) ||
      probe.hopNumber !== index ||
      probe.origin !== context.target.origin ||
      probe.route !== context.target.route ||
      probe.probeRegion !== context.probeRegion ||
      probe.expectedCandidateDigest !==
        context.target.expectedCandidateDigest ||
      requestStartedAt < (previousObservedAt ?? context.startNotBeforeAt) ||
      requestStartedAt + requestTimeoutMilliseconds > priorMatchDeadline ||
      requestStartedAt + requestTimeoutMilliseconds > operationDeadline ||
      observedAt > operationDeadline
    ) {
      return invalid(code);
    }
    if (
      index > 0 &&
      probe[predecessorKey] !== probes[index - 1]?.evidenceDigest
    ) {
      return invalid(code);
    }
    previousObservedAt = observedAt;
    reachableContracts = reachableContracts.filter(
      (contract) => contractRequestUrls(contract)[index] === probe.requestUrl,
    );
    if (reachableContracts.length === 0) return invalid(code);
    if (index < probes.length - 1) {
      reachableContracts = reachableContracts.filter((contract) => {
        const expectedHop = contract.redirectChain[index];
        return expectedHop && matchesRedirectFacts(probe, expectedHop);
      });
      if (reachableContracts.length === 0) return invalid(code);
    }
  }
  if (new Set(probes.map((probe) => probe.requestUrl)).size !== probes.length) {
    return invalid(code);
  }
  if (terminalProbe.classification === 'redirect-match') return invalid(code);
  const isActualRedirect = REDIRECT_STATUSES.includes(
    /** @type {number} */ (terminalProbe.observedStatus),
  );
  const observedHeaders =
    /** @type {{name: string, state: string, value?: string}[]} */ (
      terminalProbe.observedHeaders
    );
  if (
    terminalProbe.responseHeadState === 'complete' &&
    !isActualRedirect &&
    canonicalizeJcs(observedHeaders.map(({ name }) => name)) !==
      canonicalizeJcs(union)
  ) {
    return invalid(code);
  }
  if (
    isActualRedirect &&
    (observedHeaders.length !== 0 || terminalProbe.bodyState !== 'not-read')
  ) {
    return invalid(code);
  }
  if (
    terminalProbe.bodyState !== 'not-read' &&
    terminalProbe.observedStatus !== 200 &&
    terminalProbe.observedStatus !== 404
  ) {
    return invalid(code);
  }
  if (claimedContract && !reachableContracts.includes(claimedContract)) {
    return invalid(code);
  }
  const isMarkerTarget = context.targetId === context.markerTarget.targetId;
  const factRelationships = reachableContracts.map((contract) => ({
    contract,
    relationship: classifyAttemptEnd(
      terminalProbe,
      contract,
      probes.length - 1,
      observedHeaders,
      isMarkerTarget,
    ),
  }));
  const selectedContract = factRelationships.find(
    ({ contract, relationship }) =>
      relationship === 'match' &&
      (contract.generationId === context.proposedGenerationId ||
        timestampMilliseconds(terminalProbe.observedAt, code) <=
          priorMatchDeadline),
  )?.contract;
  if (selectedContract) {
    const expectedTerminalClassification =
      selectedContract.generationId === context.proposedGenerationId
        ? 'candidate'
        : 'recognized-prior';
    if (
      terminalProbe.classification !== expectedTerminalClassification ||
      probes.length !== contractRequestUrls(selectedContract).length ||
      probes.some(
        (probe, index) =>
          probe.contractGenerationId !== selectedContract.generationId ||
          (index < probes.length - 1 &&
            probe.classification !== 'redirect-match'),
      )
    ) {
      return invalid(code);
    }
  } else {
    if (
      probes.some((probe) =>
        ['redirect-match', 'candidate', 'recognized-prior'].includes(
          /** @type {string} */ (probe.classification),
        ),
      ) ||
      probes
        .slice(0, -1)
        .some((probe) => probe.classification !== 'inconclusive')
    ) {
      return invalid(code);
    }
    const hasStalePriorMatch = factRelationships.some(
      ({ contract, relationship }) =>
        relationship === 'match' &&
        contract.generationId !== context.proposedGenerationId,
    );
    const expectedTerminalClassification =
      !hasStalePriorMatch &&
      factRelationships.some(
        ({ relationship }) => relationship === 'inconclusive',
      )
        ? 'inconclusive'
        : 'integrity-mismatch';
    if (terminalProbe.classification !== expectedTerminalClassification) {
      return invalid(code);
    }
  }
  return {
    terminalClassification: /** @type {string} */ (
      terminalProbe.classification
    ),
    terminalObservedAt: /** @type {string} */ (terminalProbe.observedAt),
    terminalEvidenceDigest: /** @type {string} */ (
      terminalProbe.evidenceDigest
    ),
  };
}

/**
 * Validate retained stream history and derive the exact eligibility instant for
 * one ordinary public-verification attempt.
 *
 * @param {{operationId: string, attemptId: string, proposedGenerationId: string, targetId: number, probeRegion: string, attemptNumber: number, activationObservedAt: string, verificationDeadlineAt: string, operationDeadline: string, priorAttempts: unknown[], leaseAuthority: unknown}} context attempt context
 * @param {Record<string, unknown>} target selected plan target
 * @param {string} verificationPlanDigest validated plan digest
 * @returns {{eligibleAt: number, verificationDeadlineAt: string, operationDeadline: string}}
 */
function validateAttemptHistory(context, target, verificationPlanDigest) {
  const code = 'PUBLIC_PROBE_INVALID';
  assertStableId(context.operationId, code);
  assertStableId(context.attemptId, code);
  assertStableId(context.proposedGenerationId, code);
  const attemptNumber = assertInteger(context.attemptNumber, 1, 10, code);
  const leaseAuthority = assertLedger(
    context.leaseAuthority,
    ORDINARY_LEASE_AUTHORITY_KEYS,
    [],
    code,
  );
  assertStableId(leaseAuthority.operationId, code);
  assertStableId(leaseAuthority.attemptId, code);
  assertDigest(leaseAuthority.verificationPlanDigest, code);
  assertInteger(leaseAuthority.targetId, 1, 900, code);
  assertProbeRegion(leaseAuthority.probeRegion, code);
  assertInteger(leaseAuthority.attemptNumber, 1, 10, code);
  if (
    leaseAuthority.operationId !== context.operationId ||
    leaseAuthority.attemptId !== context.attemptId ||
    leaseAuthority.verificationPlanDigest !== verificationPlanDigest ||
    leaseAuthority.targetId !== context.targetId ||
    leaseAuthority.probeRegion !== context.probeRegion ||
    leaseAuthority.attemptNumber !== attemptNumber ||
    leaseAuthority.leaseCurrent !== true ||
    leaseAuthority.cancelled !== false ||
    leaseAuthority.superseded !== false ||
    leaseAuthority.terminalIntegrityMismatch !== false
  ) {
    return invalid(code);
  }
  if (attemptNumber > /** @type {number} */ (target.maximumAttempts)) {
    return invalid(code);
  }
  const activationObservedAt = timestampMilliseconds(
    context.activationObservedAt,
    code,
  );
  const verificationDeadlineAt = timestampMilliseconds(
    context.verificationDeadlineAt,
    code,
  );
  const operationDeadline = timestampMilliseconds(
    context.operationDeadline,
    code,
  );
  if (
    activationObservedAt > verificationDeadlineAt ||
    verificationDeadlineAt > operationDeadline ||
    !Array.isArray(context.priorAttempts) ||
    context.priorAttempts.length !== attemptNumber - 1
  ) {
    return invalid(code);
  }
  const requestTimeoutMilliseconds =
    /** @type {number} */ (target.requestTimeoutSeconds) * 1_000;
  let eligibleAt = activationObservedAt;
  let previousObservedAt;
  for (let index = 0; index < context.priorAttempts.length; index += 1) {
    const prior = assertLedger(
      context.priorAttempts[index],
      PRIOR_ATTEMPT_KEYS,
      [],
      code,
    );
    const priorAttemptNumber = index + 1;
    const requestStartedAt = timestampMilliseconds(
      prior.requestStartedAt,
      code,
    );
    const observedAt = timestampMilliseconds(prior.observedAt, code);
    assertDigest(prior.terminalEvidenceDigest, code);
    if (
      prior.attemptNumber !== priorAttemptNumber ||
      !['recognized-prior', 'inconclusive'].includes(
        /** @type {string} */ (prior.terminalClassification),
      ) ||
      requestStartedAt < eligibleAt ||
      requestStartedAt + requestTimeoutMilliseconds > verificationDeadlineAt ||
      requestStartedAt + requestTimeoutMilliseconds > operationDeadline ||
      observedAt < requestStartedAt ||
      observedAt > operationDeadline ||
      (previousObservedAt !== undefined && observedAt < previousObservedAt) ||
      (prior.terminalClassification === 'recognized-prior' &&
        observedAt > verificationDeadlineAt)
    ) {
      return invalid(code);
    }
    previousObservedAt = observedAt;
    const nextAttemptNumber = priorAttemptNumber + 1;
    eligibleAt =
      observedAt +
      derivePublicProbeRetryDelay({
        operationId: context.operationId,
        attemptId: context.attemptId,
        proposedGenerationId: context.proposedGenerationId,
        targetId: context.targetId,
        probeRegion: context.probeRegion,
        nextAttemptNumber,
      });
  }
  return {
    eligibleAt,
    verificationDeadlineAt: context.verificationDeadlineAt,
    operationDeadline: context.operationDeadline,
  };
}

/**
 * Validate one atomically emitted ordinary public-probe attempt batch.
 *
 * @param {unknown} value probe rows for exactly one target/region/attempt
 * @param {{plan: unknown, planContext: Parameters<typeof validateVerificationPlan>[1], operationId: string, attemptId: string, targetId: number, probeRegion: string, attemptNumber: number, proposedGenerationId: string, activationObservedAt: string, verificationDeadlineAt: string, operationDeadline: string, priorAttempts: unknown[], leaseAuthority: unknown}} context immutable plan, stream-history, lease, and timing context
 * @returns {void}
 */
export function validatePublicProbeAttempt(value, context) {
  const verificationPlanDigest = validateVerificationPlan(
    context.plan,
    context.planContext,
  );
  assertInteger(context.targetId, 1, 900, 'PUBLIC_PROBE_INVALID');
  assertProbeRegion(context.probeRegion, 'PUBLIC_PROBE_INVALID');
  const plan = /** @type {Record<string, unknown>[]} */ (context.plan);
  const target = plan.find(
    (candidate) => candidate.targetId === context.targetId,
  );
  const marker = findMarkerTarget(
    plan,
    context.planContext,
    'PUBLIC_PROBE_INVALID',
  );
  if (!target || context.proposedGenerationId !== marker.generationId) {
    return invalid('PUBLIC_PROBE_INVALID');
  }
  const timing = validateAttemptHistory(
    context,
    target,
    verificationPlanDigest,
  );
  validateProbeBatch(value, {
    target,
    markerTarget: marker.target,
    targetId: context.targetId,
    probeRegion: context.probeRegion,
    attemptNumber: context.attemptNumber,
    proposedGenerationId: context.proposedGenerationId,
    priorMatchDeadlineAt: timing.verificationDeadlineAt,
    startNotBeforeAt: timing.eligibleAt,
    operationDeadline: timing.operationDeadline,
    detection: false,
  });
}

/**
 * Validate the immutable activation-detection plan against its intent, complete
 * verification plan, and accepted public-verification policy.
 *
 * @param {unknown} value candidate activation-detection plan
 * @param {{intent: Record<string, unknown>, verificationPlan: unknown, verificationPlanContext: Parameters<typeof validateVerificationPlan>[1]}} context retained owners
 * @returns {Record<string, unknown>} validated plan
 */
export function validatePublicActivationDetectionPlan(value, context) {
  validateVerificationPlan(
    context.verificationPlan,
    context.verificationPlanContext,
  );
  const code = 'ACTIVATION_DETECTION_PLAN_INVALID';
  const plan = assertLedger(value, ACTIVATION_DETECTION_PLAN_KEYS, [], code);
  const intent = asObject(context.intent, code);
  assertStableId(plan.operationId, code);
  assertStableId(plan.attemptId, code);
  assertStableId(plan.artifactId, code);
  assertStableId(plan.proposedGenerationId, code);
  const firstEligibleAt = timestampMilliseconds(plan.firstEligibleAt, code);
  const lastEligibleAt = timestampMilliseconds(plan.lastEligibleAt, code);
  assertDigest(plan.planDigest, code);
  const verificationPlan = /** @type {Record<string, unknown>[]} */ (
    context.verificationPlan
  );
  const marker = findMarkerTarget(
    verificationPlan,
    context.verificationPlanContext,
    code,
  );
  const requiredProbeRegions = /** @type {string[]} */ (
    marker.target.requiredProbeRegions
  );
  const reservedProbeSlots =
    91 * (1 + context.verificationPlanContext.maximumRedirectHops);
  if (
    plan.profile !== 'gala-public-activation-detection-v2' ||
    plan.operationId !== intent.operationId ||
    plan.attemptId !== intent.attemptId ||
    plan.artifactId !== intent.artifactId ||
    plan.proposedGenerationId !== intent.proposedGenerationId ||
    plan.proposedGenerationId !== marker.generationId ||
    plan.firstEligibleAt !== intent.authorizedAt ||
    plan.lastEligibleAt !== intent.verificationDeadlineLimit ||
    firstEligibleAt > lastEligibleAt ||
    plan.maximumAttempts !== 91 ||
    plan.intervalSeconds !== 60 ||
    plan.requestTimeoutSeconds !==
      context.verificationPlanContext.requestTimeoutSeconds ||
    plan.maximumRedirectHops !==
      context.verificationPlanContext.maximumRedirectHops ||
    plan.reservedProbeSlots !== String(reservedProbeSlots) ||
    reservedProbeSlots > 1_001 ||
    plan.probeRegion !== requiredProbeRegions[0]
  ) {
    return invalid(code);
  }
  assertJcsEqual(plan.target, marker.target, code);
  const profile = ACTIVE_DIGEST_PROFILES.publicActivationDetectionPlan;
  if (
    !profile ||
    profile.digest(plan) !== plan.planDigest ||
    intent.activationDetectionPlanDigest !== plan.planDigest
  ) {
    return invalid(code);
  }
  return plan;
}

/**
 * Validate one activation-detection observation independently of append state.
 *
 * @param {unknown} value candidate observation
 * @param {{plan: Record<string, unknown>, markerTarget: Record<string, unknown>, operationDeadline: string, startNotBeforeAt: number}} context validated record context
 * @returns {{record: Record<string, unknown>, attemptNumber: number, scheduledEligibleAt: number, terminalClassification: string, terminalObservedAt: string, terminalEvidenceDigest: string}}
 */
function validateDetectionObservationRecord(value, context) {
  const code = 'ACTIVATION_DETECTION_OBSERVATION_INVALID';
  const observation = assertLedger(
    value,
    ACTIVATION_DETECTION_OBSERVATION_KEYS,
    [],
    code,
  );
  const attemptNumber = assertInteger(
    observation.detectionAttemptNumber,
    1,
    91,
    code,
  );
  const firstEligibleAt = timestampMilliseconds(
    context.plan.firstEligibleAt,
    code,
  );
  const lastEligibleAt = timestampMilliseconds(
    context.plan.lastEligibleAt,
    code,
  );
  const scheduledEligibleAt = firstEligibleAt + (attemptNumber - 1) * 60_000;
  if (
    observation.profile !== 'gala-public-activation-detection-observation-v2' ||
    observation.operationId !== context.plan.operationId ||
    observation.attemptId !== context.plan.attemptId ||
    observation.planDigest !== context.plan.planDigest ||
    timestampMilliseconds(observation.eligibleAt, code) !==
      scheduledEligibleAt ||
    scheduledEligibleAt > lastEligibleAt ||
    !Array.isArray(observation.probes)
  ) {
    return invalid(code);
  }
  assertStableId(observation.operationId, code);
  assertStableId(observation.attemptId, code);
  assertDigest(observation.planDigest, code);
  assertDigest(observation.evidenceDigest, code);
  const batch = validateProbeBatch(observation.probes, {
    target: context.markerTarget,
    markerTarget: context.markerTarget,
    targetId: /** @type {number} */ (context.markerTarget.targetId),
    probeRegion: /** @type {string} */ (context.plan.probeRegion),
    attemptNumber,
    proposedGenerationId: /** @type {string} */ (
      context.plan.proposedGenerationId
    ),
    priorMatchDeadlineAt: /** @type {string} */ (context.plan.lastEligibleAt),
    startNotBeforeAt: context.startNotBeforeAt,
    operationDeadline: context.operationDeadline,
    detection: true,
  });
  const receivedAt = timestampMilliseconds(observation.receivedAt, code);
  if (
    receivedAt < timestampMilliseconds(batch.terminalObservedAt, code) ||
    receivedAt > timestampMilliseconds(context.operationDeadline, code)
  ) {
    return invalid(code);
  }
  const profile = ACTIVE_DIGEST_PROFILES.publicActivationDetectionObservation;
  if (!profile || profile.digest(observation) !== observation.evidenceDigest) {
    return invalid(code);
  }
  return {
    record: observation,
    attemptNumber,
    scheduledEligibleAt,
    ...batch,
  };
}

/**
 * Validate one activation-detection observation, its immutable lease authority,
 * exact append transition, retry predecessor, and coordinate-replay behavior.
 * `leaseAuthority` is the snapshot that authorized the already-leased request;
 * a later closure may still retain that truthful observation but remains an
 * external compare-and-set boundary for installing the derived activation basis.
 *
 * @param {unknown} value candidate observation
 * @param {{detectionPlan: unknown, detectionPlanContext: Parameters<typeof validatePublicActivationDetectionPlan>[1], operationDeadline: string, retainedObservationCount: number, retainedLastEvidenceDigest?: string, previousObservation?: unknown, existingObservation?: unknown, leaseAuthority: unknown}} context immutable plan/ledger/lease context
 * @returns {{observation: Record<string, unknown>, replayed: boolean, observationCount: number, lastEvidenceDigest: string, terminalClassification: string, activationBasisCandidate?: {source: string, observedAt: string, evidenceDigest: string}}} validated append/replay result
 */
export function validatePublicActivationDetectionObservation(value, context) {
  const code = 'ACTIVATION_DETECTION_OBSERVATION_INVALID';
  const plan = validatePublicActivationDetectionPlan(
    context.detectionPlan,
    context.detectionPlanContext,
  );
  const verificationPlan = /** @type {Record<string, unknown>[]} */ (
    context.detectionPlanContext.verificationPlan
  );
  const marker = findMarkerTarget(
    verificationPlan,
    context.detectionPlanContext.verificationPlanContext,
    code,
  );
  const operationDeadline = assertTimestamp(context.operationDeadline, code);
  if (Object.hasOwn(context, 'existingObservation')) {
    const replay = validateDetectionObservationRecord(value, {
      plan,
      markerTarget: marker.target,
      operationDeadline,
      startNotBeforeAt: timestampMilliseconds(
        asObject(value, code).eligibleAt,
        code,
      ),
    });
    assertJcsEqual(value, context.existingObservation, code);
    return {
      observation: replay.record,
      replayed: true,
      observationCount: replay.attemptNumber,
      lastEvidenceDigest: /** @type {string} */ (replay.record.evidenceDigest),
      terminalClassification: replay.terminalClassification,
      ...(replay.terminalClassification === 'candidate'
        ? {
            activationBasisCandidate: {
              source: 'gala-public-marker-detection',
              observedAt: replay.terminalObservedAt,
              evidenceDigest: /** @type {string} */ (
                replay.record.evidenceDigest
              ),
            },
          }
        : {}),
    };
  }
  const retainedObservationCount = assertInteger(
    context.retainedObservationCount,
    0,
    91,
    code,
  );
  const candidate = asObject(value, code);
  const attemptNumber = assertInteger(
    candidate.detectionAttemptNumber,
    1,
    91,
    code,
  );
  if (retainedObservationCount !== attemptNumber - 1) return invalid(code);
  const leaseAuthority = assertLedger(
    context.leaseAuthority,
    DETECTION_WATCH_AUTHORITY_KEYS,
    [],
    code,
  );
  assertStableId(leaseAuthority.operationId, code);
  assertStableId(leaseAuthority.attemptId, code);
  assertStableId(leaseAuthority.authorityId, code);
  assertStableId(leaseAuthority.currentAuthorityId, code);
  assertDigest(leaseAuthority.planDigest, code);
  const authorityEpoch = assertNonnegativeInt64(
    leaseAuthority.authorityEpoch,
    code,
  );
  const currentAuthorityEpoch = assertNonnegativeInt64(
    leaseAuthority.currentAuthorityEpoch,
    code,
  );
  if (
    leaseAuthority.operationId !== plan.operationId ||
    leaseAuthority.attemptId !== plan.attemptId ||
    leaseAuthority.planDigest !== plan.planDigest ||
    leaseAuthority.authorityId !== leaseAuthority.currentAuthorityId ||
    authorityEpoch === 0n ||
    currentAuthorityEpoch !== authorityEpoch ||
    !['active', 'pages-recovery-active', 'reconciliation-required'].includes(
      /** @type {string} */ (leaseAuthority.authorityState),
    ) ||
    leaseAuthority.activationBasisAbsent !== true ||
    leaseAuthority.cancelled !== false ||
    leaseAuthority.superseded !== false
  ) {
    return invalid(code);
  }
  let startNotBeforeAt = timestampMilliseconds(candidate.eligibleAt, code);
  if (attemptNumber === 1) {
    if (
      Object.hasOwn(context, 'retainedLastEvidenceDigest') ||
      Object.hasOwn(context, 'previousObservation')
    ) {
      return invalid(code);
    }
  } else {
    const retainedLastEvidenceDigest = assertDigest(
      context.retainedLastEvidenceDigest,
      code,
    );
    if (!Object.hasOwn(context, 'previousObservation')) return invalid(code);
    const previousCandidate = asObject(context.previousObservation, code);
    const previousAttemptNumber = assertInteger(
      previousCandidate.detectionAttemptNumber,
      1,
      91,
      code,
    );
    const previousScheduledAt =
      timestampMilliseconds(plan.firstEligibleAt, code) +
      (previousAttemptNumber - 1) * 60_000;
    const previous = validateDetectionObservationRecord(
      context.previousObservation,
      {
        plan,
        markerTarget: marker.target,
        operationDeadline,
        startNotBeforeAt: previousScheduledAt,
      },
    );
    if (
      previous.attemptNumber !== attemptNumber - 1 ||
      previous.record.evidenceDigest !== retainedLastEvidenceDigest ||
      !['recognized-prior', 'inconclusive'].includes(
        previous.terminalClassification,
      )
    ) {
      return invalid(code);
    }
    startNotBeforeAt = Math.max(
      startNotBeforeAt,
      timestampMilliseconds(previous.terminalObservedAt, code),
    );
  }
  const observation = validateDetectionObservationRecord(value, {
    plan,
    markerTarget: marker.target,
    operationDeadline,
    startNotBeforeAt,
  });
  const result = {
    observation: observation.record,
    replayed: false,
    observationCount: attemptNumber,
    lastEvidenceDigest: /** @type {string} */ (
      observation.record.evidenceDigest
    ),
    terminalClassification: observation.terminalClassification,
  };
  if (observation.terminalClassification !== 'candidate') return result;
  return {
    ...result,
    activationBasisCandidate: {
      source: 'gala-public-marker-detection',
      observedAt: observation.terminalObservedAt,
      evidenceDigest: /** @type {string} */ (observation.record.evidenceDigest),
    },
  };
}
