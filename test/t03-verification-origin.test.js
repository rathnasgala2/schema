import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseVerificationOrigin,
  validateVerificationOrigin,
} from '../src/internal/verification-origin.js';

test('canonical origins parse into canonical DNS and public literal forms', () => {
  assert.deepEqual(parseVerificationOrigin('https://example.com'), {
    origin: 'https://example.com',
    host: 'example.com',
    hostKind: 'dns',
    port: 443,
  });
  assert.deepEqual(parseVerificationOrigin('https://8.8.8.8:8443'), {
    origin: 'https://8.8.8.8:8443',
    host: '8.8.8.8',
    hostKind: 'ipv4',
    port: 8443,
  });
  assert.deepEqual(
    parseVerificationOrigin('https://[2606:4700:4700::1111]:1'),
    {
      origin: 'https://[2606:4700:4700::1111]:1',
      host: '2606:4700:4700::1111',
      hostKind: 'ipv6',
      port: 1,
    },
  );
  assert.doesNotThrow(() =>
    validateVerificationOrigin('https://xn--bcher-kva.example'),
  );
});

test('scheme, authority and port alternate spellings reject', () => {
  for (const value of [
    'http://example.com',
    'HTTPS://example.com',
    'https://user@example.com',
    'https://example.com/',
    'https://example.com/path',
    'https://example.com?query',
    'https://example.com#fragment',
    'https://example.com:443',
    'https://example.com:0443',
    'https://example.com:0',
    'https://example.com:65536',
    'https://example.com:',
    'https://example%2ecom',
  ]) {
    assert.throws(() => validateVerificationOrigin(value));
  }
});

test('noncanonical or non-public IP literals reject', () => {
  for (const value of [
    'https://127.1',
    'https://0177.0.0.1',
    'https://2130706433',
    'https://10.0.0.1',
    'https://192.0.2.1',
    'https://2001:1::1',
    'https://[2001:0db8::1]',
    'https://[2001:DB8::1]',
    'https://[2001:db8::1]',
    'https://[fe80::1%25eth0]',
    'https://[::ffff:8.8.8.8]',
  ]) {
    assert.throws(() => validateVerificationOrigin(value));
  }
});

test('DNS names must already equal canonical Unicode-17 ASCII output', () => {
  for (const value of [
    'https://Example.com',
    'https://example.com.',
    'https://bücher.example',
    'https://xn--abc-.example',
    'https://a..example',
  ]) {
    assert.throws(() => validateVerificationOrigin(value));
  }
  assert.doesNotThrow(() => validateVerificationOrigin('https://localhost'));
  assert.doesNotThrow(() => validateVerificationOrigin('https://127.example'));
});
