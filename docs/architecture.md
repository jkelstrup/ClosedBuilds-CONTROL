# Current architecture

This describes the legacy implementation, not the target layout in [PLAN.md](../PLAN.md). Evidence is source inspection; runtime verification is tracked in [testing.md](testing.md). Use [features.md](features.md) to find a workflow and [contracts.md](contracts.md) before changing shared data or event names.

## Runtime map

```text
package.json main → index.js (Electron main process)
  ├─ Express static app/ + HTTP routes
  ├─ HTTP + HTTPS servers ← Socket.IO → desktop/browser/mobile clients
  ├─ one shared machine status, G-code queue, sent buffer, connection
  │    └─ SerialPort (USB) or net.connect (TCP port 23)
  │         └─ ReadlineParser → firmware/reply parsing → queue progression
  ├─ Electron window/tray/dialogs, updates, system information
  └─ uploads, firmware downloads, flashing subprocesses, USB file copies

app/index.html (desktop and full browser UI)
  └─ ordered global scripts in app/js/ and app/wizards/
       ├─ websocket.js → status display, event delivery, commands
       ├─ main.js → editor, files, initialization
       └─ viewer.js + lib/3dview/3dview.js
            └─ workers/verylitegcodeviewer.js → parsed preview data

app/jog/index.html (mobile jog)
  └─ shares main.js, websocket.js, ui.js, jog.js, settings scripts
       + mobilejog.js; does not have an independent machine connection
```

### Startup and shutdown

`npm run run-local` builds assets and invokes Electron, which loads `index.js` via `package.json.main`. At module load, the implementation constructs Express/Socket.IO, reads root TLS files, starts HTTPS on 3001 and HTTP on the selected port, configures updater listeners, creates the upload directory, lists serial ports, and installs polling. This happens before the Electron single-instance/ready handling later in the file. Requiring this file in a test is not safe isolation. The separate unsigned packaging config embeds `cbcUnsignedVerification: true`; only that variant skips electron-updater initialization, and update socket handlers do nothing without an updater. This does not disable firmware/network activity or change machine behavior.

HTTP initially uses `WEB_PORT` or the fallback list in `config.webPorts`; `httpServerError` retries through `config.nextWebPort`. HTTP explicitly binds `0.0.0.0`. HTTPS has no explicit host restriction. Both carry the same Socket.IO server. Express serves `app/` as its static root, so `/` loads the full UI, `/jog/` loads mobile jog, and `/socket.io/socket.io.js` comes from Socket.IO.

Electron `ready` handlers create the tray/menu and show the window on macOS/Linux; Windows normally starts in the tray and enables login startup. `createJogWindow` loads the local HTTP origin, with `nodeIntegration: true` and `contextIsolation: false`. The desktop uses native OS window controls; legacy window-control socket listeners remain available. Exit handlers terminate the app; cleanup of machine timers/connections is not represented by a single session lifecycle.

`npm run dev` uses the compiled `scripts/dev.ts` launcher, `scripts/browser-build.ts` bundler, and `scripts/dev-session.ts` watcher to rebuild browser assets/reload the desktop renderer for frontend edits or quit/restart Electron for main-process edits. A guarded development-only IPC hook in `index.js` accepts these messages. Normal startup builds once and has no watcher or development IPC handler; see [development reloads](development.md#automatic-development-reloads) for scope and state-loss behavior.

There are `isElectron()` and Raspberry Pi/Chrome branches, but Electron is required and used earlier without a complete non-Electron startup seam. Treat plain `node index.js` support as unverified, not a documented alternative launch command.

## State owners and command flow

| Implementation owner | State/behavior | Callers and coupling |
| --- | --- | --- |
| `index.js`: `status`, `port`, `gcodeQueue`, `queuePointer`, `sentBuffer` | Authoritative shared connection, controller status, streaming | Socket handlers and HTTP routes mutate the same state; all connected clients observe the same machine |
| `index.js`: `runJob`, `addQToEnd`, `send1Q`, `BufferSpace`, `machineSend` | Normalize/enqueue lines, insert `$G` queries, account for outstanding commands, write to transport | UI jobs, settings, macros, probing, HTTP `/runjob` all converge here |
| `index.js`: `connectTo` handler / nested `portOpened` | Construct USB/TCP transport, frame replies, identify firmware, handle acknowledgements/errors, install polling | USB and TCP are made to share a `port` object, including manually assigned TCP `isOpen` |
| `index.js`: `parseFeedback`, `gotModals`; `grblStrings.js` | Coordinates/offsets, overrides, pins, modal state, alarm/error descriptions | Shared globals and `status` mutations; some firmware reply parsing remains inside the connection handler |
| `app/js/websocket.js`: `socket`, `laststatus`, `grblParams`, `programBoard` | Client connection, last received snapshot, settings and status-driven UI | Other scripts and inline handlers read these globals directly |
| `app/js/main.js`: `editor`, `gcode`, `loadedFileName` | Editor contents, loaded-file state, initialization | Job execution, recovery, viewer, and macros |
| `app/js/jog.js`, `keyboard.js`, probe wizards | Input bindings, generated movement/probe commands | Read shared status/settings, emit `runCommand`/`runJob`/jog events |
| `app/js/viewer.js`, `app/lib/3dview/3dview.js` | Scene and preview/simulation state | Theme, loaded G-code, status display; this simulation is a visual preview, not a controller simulator |

`runJob` strips semicolon comments and queues commands; `addQToEnd` can inject modal refresh queries. `send1Q` uses outstanding string lengths and controller buffer settings; acknowledgement handling consumes `sentBuffer` and advances transmission. Real-time commands go directly through `machineSend(..., true)` rather than waiting for queued acknowledgements.

Preserve the distinction between **queued**, **sent**, **acknowledged**, and **motion finished**. The existing `jobComplete` emission is tied to host queue progression; it is not independent evidence that physical motion has completed. Connection-state numbers also combine host activity and controller conditions. Characterize these semantics before extracting the machine module.

## Renderer initialization and worker loading

The script list at the end of `app/index.html` is the current dependency map: theme/diagnostics and libraries precede the viewer; macros, main/UI/settings, websocket, jogging/keyboard, preview, and wizards install globals and ready callbacks. Inline HTML handlers also consume them. Reordering or changing script scope can break consumers even when the edited file has no explicit imports.

Mobile jog loads a subset of those same scripts. Both full/mobile HTML load `/generated/renderer.js` before `main.js`; `src/renderer/legacy-entry.ts` exposes the extracted title formatter through a temporary `window.CBCWindowTitle` bridge. Other scripts and initialization remain legacy globals. `mobilejog.js` changes widget behavior; verify this consumer when changing shared initialization. `widget.js` generates a QR link using hard-coded port 3000, regardless of HTTP fallback configuration.

`parseGcodeInWebWorker` in `app/lib/3dview/3dview.js` creates `/generated/preview-worker.js`, built from the retained `app/lib/3dview/workers/verylitegcodeviewer.js`. That classic worker still imports `/lib/threejs/three.min.js`, posts progress and JSON preview results, and the caller constructs Three.js geometry. Build output lives under the existing static root; see [output contracts](development.md#browser-and-worker-output). Absolute and relative URL paths are part of the interface when moving or bundling these files. Ace dynamically loads the customized `ace/mode/cncpro` mode selected in `main.js`.

## Persistence and external effects

- Renderer preferences, macros, job history, and recovery markers live in origin-scoped localStorage, not in one application settings file. Keys and owners are in [contracts.md](contracts.md#saved-data).
- `uploadsDir` is `electronApp.getPath('userData') + '/upload/'` in Electron. Multer uses it for job/custom-firmware uploads. Formidable `/upload` uses its own temporary file handling. `uploadedgcode` and `uploadedworkspace` are in-memory values, not durable job storage.
- Firmware operations combine root binary assets, downloaded/uploaded images, platform executables, and ASAR path rewriting. Interface preparation writes files and optional Wi-Fi credentials to a user-selected drive.
- `scanForTelnetDevices` scans a caller-provided range on port 23. `scan.js` is a separate script that immediately scans the local subnet; it is not the server's entry point.
- UI startup can fetch upstream version/changelog information and request updater downloads. No isolated, offline development mode exists yet.

## First extraction seam

Follow milestone 2 before module migration. Then introduce a callable parser seam with characterization fixtures, followed by transport/session and streaming behavior. Keep the legacy event/status interface in an adapter until its consumers migrate. The future machine module must run without Electron, DOM, HTTP listeners, or real hardware; moving globals into several files without changing ownership does not establish that interface.
