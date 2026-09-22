import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatIpv4,
  formatIpv6,
  parseCanonicalCidr,
  parseCanonicalIpv4,
  parseCanonicalOriginIpv6,
  parseIpv6,
} from '../src/internal/ip-address.js';

test('IPv4 accepts only four canonical dotted-decimal octets', () => {
  for (const value of ['0.0.0.0', '1.2.3.4', '255.255.255.255']) {
    const parsed = parseCanonicalIpv4(value);
    assert.equal(formatIpv4(parsed.value), value);
  }
  for (const value of [
    '127.1',
    '127.0.1',
    '01.2.3.4',
    '1.2.3.04',
    '256.1.1.1',
    '0x7f.0.0.1',
    '2130706433',
  ]) {
    assert.throws(() => parseCanonicalIpv4(value), /IP_ADDRESS_INVALID/u);
  }
});

test('IPv6 uses lowercase longest-leftmost RFC 5952 compression', () => {
  /** @type {[string, string][]} */
  const examples = [
    ['0:0:0:0:0:0:0:0', '::'],
    ['2001:0db8:0:0:0:0:0:1', '2001:db8::1'],
    ['2001:0:0:1:0:0:1:1', '2001::1:0:0:1:1'],
    ['2001:db8:0:1:1:1:1:1', '2001:db8:0:1:1:1:1:1'],
  ];
  for (const [source, canonical] of examples) {
    assert.equal(formatIpv6(parseIpv6(source).value), canonical);
  }
});

test('origin IPv6 applies the mapped-address mixed notation rule', () => {
  assert.equal(
    formatIpv6(parseIpv6('::ffff:c000:280').value, true),
    '::ffff:192.0.2.128',
  );
  for (const value of ['2001:db8::1', '::', '::ffff:192.0.2.128']) {
    assert.doesNotThrow(() => parseCanonicalOriginIpv6(value));
  }
  for (const value of [
    '2001:0db8::1',
    '2001:DB8::1',
    '2001:db8:0:0:0:0:0:1',
    '::ffff:c000:280',
    'fe80::1%eth0',
  ]) {
    assert.throws(() => parseCanonicalOriginIpv6(value), /IP_ADDRESS_INVALID/u);
  }
});

test('pinned-registry CIDRs require canonical networks', () => {
  assert.deepEqual(parseCanonicalCidr('192.0.2.0/24'), {
    family: 4,
    network: 0xc000_0200n,
    prefix: 24,
  });
  assert.deepEqual(parseCanonicalCidr('::ffff:0:0/96'), {
    family: 6,
    network: 0x0000_0000_0000_0000_0000_ffff_0000_0000n,
    prefix: 96,
  });
  for (const value of [
    '192.0.2.1/24',
    '192.0.2.0/024',
    '2001:0db8::/32',
    '2001:db8::1/32',
    '2001:db8::/129',
  ]) {
    assert.throws(() => parseCanonicalCidr(value), /IP_ADDRESS_INVALID/u);
  }
});
