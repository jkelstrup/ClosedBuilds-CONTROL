import { Duplex } from 'node:stream';

// UI-development stub only: commands are acknowledged, never executed.
export class DevController extends Duplex {
  readonly path = 'Dev Controller';
  private pending = '';

  get isOpen(): boolean {
    return !this.destroyed;
  }

  constructor() {
    super();
    queueMicrotask(() => {
      if (!this.destroyed) this.emit('open');
    });
  }

  override _read(): void {}

  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    // Reply asynchronously: the legacy sender records outstanding commands
    // after writing, so synchronous acknowledgements would race its accounting.
    const input = chunk.toString();
    queueMicrotask(() => {
      if (this.destroyed) return;
      for (const byte of input) {
        if (byte === '?') {
          this.push(
            '<Idle|MPos:0.000,0.000,0.000|WCO:0.000,0.000,0.000|FS:0,0|Ov:100,100,100>\r\n',
          );
        } else if (byte === '\x18') {
          this.pending = '';
        } else if (byte === '\n') {
          const command = this.pending.trim();
          this.pending = '';
          if (command === '$I') {
            this.push(
              '[VER:1.1h.20261028:Dev Controller]\r\n[OPT:V,15,128]\r\n',
            );
          } else if (command === '$G') {
            this.push('[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]\r\n');
          }
          if (command) this.push('ok\r\n');
        } else if (
          byte !== '\r' &&
          byte !== '!' &&
          byte !== '~' &&
          byte.charCodeAt(0) < 128
        ) {
          this.pending += byte;
        }
      }
    });
    callback();
  }
}
