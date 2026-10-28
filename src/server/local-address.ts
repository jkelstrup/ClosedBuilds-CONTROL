import { networkInterfaces } from 'node:os';

// Preserve the legacy default: first non-loopback IPv4 in OS interface order.
// This is a display/discovery address, not a routing or public-address check.
export function localAddress(interfaces = networkInterfaces()): string {
  for (const addresses of Object.values(interfaces)) {
    for (const details of addresses ?? []) {
      if (details.family === 'IPv4' && !details.address.startsWith('127.')) {
        return details.address;
      }
    }
  }
  return '127.0.0.1';
}
