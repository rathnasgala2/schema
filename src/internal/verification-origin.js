import { utf8Bytes } from './bytes.js';
import { validateCanonicalAsciiDomain17 } from './idna.js';
import { requirePublicIpv4, requirePublicIpv6 } from './network-boundary.js';

/**
 * Raise the closed origin-shape diagnostic.
 *
 * @returns {never}
 */
function invalidOrigin() {
  throw new TypeError('VERIFICATION_ORIGIN_INVALID');
}

/**
 * Parse an optional canonical origin port.
 *
 * @param {string} source source including an optional leading colon
 * @returns {number} effective port
 */
function parsePort(source) {
  if (source === '') return 443;
  if (!/^:(?:[1-9][0-9]{0,4})$/u.test(source)) return invalidOrigin();
  const port = Number.parseInt(source.slice(1), 10);
  if (port > 65_535 || port === 443) return invalidOrigin();
  return port;
}

/**
 * Validate and parse one exact DEC-097 verification origin.
 *
 * @param {string} input stored origin
 * @returns {{ origin: string, host: string, hostKind: 'dns' | 'ipv4' | 'ipv6', port: number }} parsed origin
 */
export function parseVerificationOrigin(input) {
  if (
    typeof input !== 'string' ||
    utf8Bytes(input).length !== input.length ||
    !input.startsWith('https://')
  ) {
    return invalidOrigin();
  }
  const authority = input.slice('https://'.length);
  if (!authority || /[/?#@%\s]/u.test(authority) || authority.endsWith(':')) {
    return invalidOrigin();
  }

  if (authority.startsWith('[')) {
    const closing = authority.indexOf(']');
    if (closing <= 1 || authority.indexOf(']', closing + 1) >= 0) {
      return invalidOrigin();
    }
    const host = authority.slice(1, closing);
    const port = parsePort(authority.slice(closing + 1));
    requirePublicIpv6(host);
    return { origin: input, host, hostKind: 'ipv6', port };
  }

  const separator = authority.indexOf(':');
  if (separator !== authority.lastIndexOf(':')) return invalidOrigin();
  const host = separator < 0 ? authority : authority.slice(0, separator);
  const port = parsePort(separator < 0 ? '' : authority.slice(separator));
  if (!host) return invalidOrigin();
  if (/^[0-9.]+$/u.test(host)) {
    requirePublicIpv4(host);
    return { origin: input, host, hostKind: 'ipv4', port };
  }
  validateCanonicalAsciiDomain17(host);
  return { origin: input, host, hostKind: 'dns', port };
}

/**
 * Require a value to be an exact canonical verification origin.
 *
 * @param {string} input stored origin
 * @returns {void}
 */
export function validateVerificationOrigin(input) {
  parseVerificationOrigin(input);
}
