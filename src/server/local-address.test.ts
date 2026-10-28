import type { NetworkInterfaceInfo } from 'node:os';
import { expect, it } from 'vitest';
import { localAddress } from './local-address.js';

function ipv4(address: string): NetworkInterfaceInfo {
  return {
    address,
    family: 'IPv4',
    netmask: '255.255.255.0',
    mac: '00:00:00:00:00:00',
    internal: address.startsWith('127.'),
    cidr: `${address}/24`,
  };
}

it('selects the first IPv4 address in interface and address order', () => {
  expect(
    localAddress({
      lo: [ipv4('127.0.0.1')],
      en0: [ipv4('192.168.1.20'), ipv4('192.168.1.21')],
      en1: [ipv4('10.0.0.4')],
    }),
  ).toBe('192.168.1.20');
});

it('skips IPv6, missing interfaces and the entire IPv4 loopback range', () => {
  expect(
    localAddress({
      missing: undefined,
      empty: [],
      lo: [ipv4('127.42.0.1')],
      en0: [
        {
          address: 'fe80::1234',
          family: 'IPv6',
          netmask: 'ffff:ffff:ffff:ffff::',
          mac: '00:00:00:00:00:00',
          internal: false,
          cidr: 'fe80::1234/64',
          scopeid: 1,
        },
        ipv4('169.254.1.2'),
      ],
    }),
  ).toBe('169.254.1.2');
});

it.each([{}, { lo: [ipv4('127.0.0.1')] }])(
  'falls back to IPv4 loopback without a usable address',
  (interfaces) => {
    expect(localAddress(interfaces)).toBe('127.0.0.1');
  },
);

it('reads fresh interface snapshots without changing the supplied data', () => {
  const interfaces = { en0: [ipv4('10.0.0.2')] };
  const before = structuredClone(interfaces);
  expect(localAddress(interfaces)).toBe('10.0.0.2');
  expect(interfaces).toEqual(before);
  interfaces.en0 = [ipv4('10.0.0.3')];
  expect(localAddress(interfaces)).toBe('10.0.0.3');
});
