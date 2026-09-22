import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NETWORK_BOUNDARY_PROFILE,
  NETWORK_BOUNDARY_PROFILE_DIGEST,
  isGloballyReachableAddress,
  requirePublicIpv4,
  requirePublicIpv6,
} from '../src/internal/network-boundary.js';
import { parseCanonicalIpv4, parseIpv6 } from '../src/internal/ip-address.js';

test('the exact frozen network profile has a stable domain-separated digest', () => {
  assert.deepEqual(NETWORK_BOUNDARY_PROFILE.additionalDeniedCidrs, [
    '224.0.0.0/4',
    '::/96',
    '64:ff9b::/96',
    '64:ff9b:1::/48',
    'ff00::/8',
  ]);
  assert.equal(
    NETWORK_BOUNDARY_PROFILE_DIGEST,
    'sha256:5785ea60f7ce28f2945ebd9034a56bae5dafb27d4025438893a1f2cc92e4ca8b',
  );
});

test('IPv4 classification uses the most-specific frozen IANA row', () => {
  const accepted = ['8.8.8.8', '192.0.0.9', '192.31.196.1'];
  const rejected = [
    '0.0.0.0',
    '10.0.0.1',
    '127.0.0.1',
    '192.0.0.8',
    '192.0.2.1',
    '255.255.255.255',
  ];
  for (const value of accepted) {
    assert.equal(
      isGloballyReachableAddress(4, parseCanonicalIpv4(value).value),
      true,
    );
    assert.doesNotThrow(() => requirePublicIpv4(value));
  }
  for (const value of rejected) {
    assert.equal(
      isGloballyReachableAddress(4, parseCanonicalIpv4(value).value),
      false,
    );
    assert.throws(() => requirePublicIpv4(value), /NETWORK_BOUNDARY_REJECTED/u);
  }
});

test('the explicit IPv4 multicast deny does not create an IPv4 catch-all', () => {
  assert.equal(
    isGloballyReachableAddress(4, parseCanonicalIpv4('1.1.1.1').value),
    true,
  );
  assert.equal(
    isGloballyReachableAddress(4, parseCanonicalIpv4('224.0.0.1').value),
    false,
  );
});

test('IPv6 classification applies registry specificity and explicit denies', () => {
  const accepted = ['2606:4700:4700::1111', '2001:1::1'];
  const rejected = [
    '::',
    '::1',
    '::ffff:8.8.8.8',
    '64:ff9b::1',
    '64:ff9b:1::1',
    '2001:db8::1',
    'ff00::1',
  ];
  for (const value of accepted) {
    assert.equal(isGloballyReachableAddress(6, parseIpv6(value).value), true);
    assert.doesNotThrow(() => requirePublicIpv6(value));
  }
  for (const value of rejected) {
    assert.equal(isGloballyReachableAddress(6, parseIpv6(value).value), false);
    assert.throws(() => requirePublicIpv6(value), /NETWORK_BOUNDARY_REJECTED/u);
  }
});

test('out-of-width numeric addresses reject before classification', () => {
  assert.throws(
    () => isGloballyReachableAddress(4, -1n),
    /IP_ADDRESS_INVALID/u,
  );
  assert.throws(
    () => isGloballyReachableAddress(4, 1n << 32n),
    /IP_ADDRESS_INVALID/u,
  );
  assert.throws(
    () => isGloballyReachableAddress(6, 1n << 128n),
    /IP_ADDRESS_INVALID/u,
  );
});
