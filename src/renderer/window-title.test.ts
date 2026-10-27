import { describe, expect, it } from 'vitest';
import { formatWindowTitle } from './window-title.js';

describe('window title', () => {
  it('starts with only the product name before status or a file is available', () => {
    expect(formatWindowTitle({ filename: '' })).toEqual({
      title: 'CBC',
      detail: '',
    });
  });

  it('retains version, filename and active port', () => {
    expect(
      formatWindowTitle({
        version: '0.1.0',
        filename: 'example.nc',
        activePort: '/dev/example',
      }),
    ).toEqual({
      title: 'CBC v0.1.0 / example.nc / connected to /dev/example',
      detail: ' v0.1.0 / example.nc / connected to /dev/example',
    });
  });

  it('omits the connection suffix for an empty or disconnected port', () => {
    for (const activePort of ['', false] as const) {
      expect(
        formatWindowTitle({ filename: 'example.nc', activePort }).title,
      ).toBe('CBC / example.nc');
    }
  });
});
