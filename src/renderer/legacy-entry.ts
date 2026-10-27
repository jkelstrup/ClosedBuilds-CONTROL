import { formatWindowTitle } from './window-title.js';

declare global {
  interface Window {
    CBCWindowTitle: typeof formatWindowTitle;
  }
}

// Temporary bridge for ordered legacy scripts, not an application entry point.
window.CBCWindowTitle = formatWindowTitle;
