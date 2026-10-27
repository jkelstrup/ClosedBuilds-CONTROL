# Verification status and selection

## Current evidence

The milestone-1 baseline is documentation from source inspection. Milestone 2 now has locked installation/native loading, a limited launch/browser UI smoke check, and real tooling checks (below). Full desktop/browser workflows, packaging, controller connection, movement, and flashing remain unverified. `npm test` now runs deterministic toolchain tests; there is no machine behavior suite or controller simulator yet. `npm start` now launches the app, rather than acting as a verification placeholder.

For documentation changes, use `git diff --check`, verify relative links against files, and cross-check named symbols, events, routes, and keys against source. These checks establish documentation consistency, not application correctness. Milestone 2 is establishing reproducible installation and real checks; milestone 3 adds controller-free machine verification.

Record evidence as: commit, exact command/scenario, OS/architecture, toolchain, controller/firmware or simulator, outcome, and remaining gap. Keep source inspection, simulated behavior, packaged behavior, and physical-controller evidence distinct in [features.md](features.md).

### Locked installation slice (milestone 2)

Evidence recorded on the `build/reproducible-install` branch in the locked-installation change:

| Check | Environment and result | Scope / remaining gap |
| --- | --- | --- |
| `npm ci` | macOS arm64; Node 24.22.1, npm 11.19.1; passed, including `electron-builder install-app-deps` | Clean dependency replacement from lockfile; not a clean-checkout desktop/package check or native source compilation test |
| `npm ls --depth=0` | Same host; passed with no missing/invalid direct dependencies | Dependency tree only |
| `npm run verify:install` | Same host; passed in Node 24.22.1 and Electron 23.3.13 / embedded Node 18.12.1 | Native binding load, unopened SerialPort construction, and split-input readline parsing; no devices, application import, network services, or UI |
| `npm audit` | Failed: 15 high and 1 critical affected packages | Known inherited-stack security debt; see [development guidance](development.md#current-setup-status). No forced major fixes applied |
| `npm run run-local -- --user-data-dir=<temporary-profile>` | Same host; Electron process started and browser UI loaded at `http://localhost:3000`, showing v1.0.390 and `Port: Not Connected` | User confirmed controllers disconnected/trusted network. Logged missing temporary-profile `upload/firmware.bin` but continued serving UI. Native window contents could not be inspected because macOS denied assistive access. No controller commands or packaging checks |

Run `npm ci` and `npm run verify:install` when changing dependencies. The smoke check fails on mismatched host Node/Electron versions, failed child execution, native-load failure, or incorrect parser output. It is not a substitute for future deterministic machine tests, TypeScript checks, or startup/packaging checks.

### Strict tooling checks (milestone 2)

Evidence recorded in the `build/typescript-checks` working branch, on macOS arm64 with Node 24.22.1/npm 11.19.1:

- `npm run check`: formatting, type-aware lint, strict type checking, five Vitest toolchain tests, and CommonJS tooling compilation pass. Tests run in a plain Node process, use temporary compiler fixtures, and never import `index.js`. They verify CommonJS loading plus rejection/no emission for type mismatch, nullability, unchecked array access, and implicit `any`.
- Temporary failure probes: adding an invalid typed assignment made `npm run typecheck` exit **2** with TS2322; adding a failing assertion made `npm test` exit **1**. Both probes were removed afterward. The strict-compilation negative cases remain permanent tests.
- `npm run verify:install`: compiled TypeScript installation check passes in host Node and Electron's Node mode, without launching CONTROL or opening/listing ports.
- `npm ci` and `npm ls --depth=0`: passed with the updated lockfile; the same 16 inherited audit findings remain. After checks, `npm run dev -- --user-data-dir=<temporary-profile>` started successfully, HTTP on port 3000 returned 200, and the user confirmed the app appeared to work. This is a limited startup smoke check, not machine or full desktop workflow verification.

See [commands, output format, and exclusions](development.md#incremental-typescript-and-local-checks) before selecting checks. These results are tooling evidence only, not controller/application characterization. Playwright, renderer/worker builds, CI execution/failure probes, packaging, and the broader platform matrix remain pending.

## Scenario selection for future implementation

These are verification requirements, not instructions to operate connected machinery during ordinary development. Use simulation or recording adapters first. Hardware/motion/flashing checks require a separate controlled setup and an operator; passing software tests does not establish machine safety.

| Change area | Minimum targeted scenario once the required test seam exists |
| --- | --- |
| Desktop lifecycle | Start, show/hide/restore tray window, second instance, file association, quit; platform differences and complete cleanup |
| Browser/HTTP integration | Discover version, activate, upload G-code/workspace, fetch contents, run job through simulated controller; characterize response timing and invalid input |
| Mobile/multiple clients | Connect full and mobile UI to the same session, observe status and controls, disconnect/reconnect; verify actual port and QR link |
| Connection/transport | Open/close/error, partial/multiple framed replies, delayed input, reconnect, listener/timer cleanup, USB/TCP parity |
| Controller parser | Grbl/grblHAL/FluidNC identification and representative reports; offsets/work coordinates, units, fourth axis, overrides, pins, malformed replies; explicitly assess partial Smoothieware support |
| Streaming/jobs | Buffer accounting including terminators, queued versus real-time bytes, acknowledgements/errors, pause/resume/stop/reset, disconnect mid-job, completion semantics |
| Manual movement/settings | Exact generated commands, units/modes, numeric validation, settings/profile defaults, firmware-specific differences, backup/import/export |
| Recovery/history/tool change | Reload saved marker/history, wrong/short file, restored modal/coordinate assumptions, tool-change interruption and ordering; no automatic physical recovery claim |
| Probing/calibration/surfacing | Geometry/units/input fixtures, generated command sequence, success/failure probe reports, cancellation, remembered values |
| Macros | Import/export sample records, button/keyboard/autorun, sample JS globals and DOM interactions, event-listener disposal; use trusted fixtures only |
| Viewer/editor | CNC mode loading, worker URL/imports, arcs/units/axes, progress/results, large-file responsiveness and packaged paths |
| Persistence/theme/shortcuts | Existing keys, missing/malformed values, round trips, schema migration; changed origin/profile behavior |
| Flashing/USB preparation | Record process arguments without execution; bundled/unpacked path checks; fake drive contents including profiles/probe files/Wi-Fi config; real devices separately |
| Updater/packaging/install | Fork-owned feed, no upstream binary replacement, unsigned packaging without credentials, installed resources on retained platform matrix; signed releases separately authorized |

## Remaining baseline gaps

- Node/npm are pinned; installation/native loading is verified only on macOS arm64. Startup/packaging and the retained OS/architecture support matrix remain unestablished. Inherited CI/build targets are intentions, not test results.
- Local UI flows have been located, but out-of-repo CAM, socket, HTTP, and macro consumers are unknown.
- Library versions/local patches and firmware build provenance are not fully established.
- Mobile PWA registration/cache paths and non-Electron/Pi startup are unverified.
- Protocol branches and firmware UI choices can outlive working implementations. Preserve them until characterization or an explicit retirement decision resolves them.

Do not clear these gaps solely because a broad smoke test succeeds. Close each with targeted evidence or a recorded scope decision.
