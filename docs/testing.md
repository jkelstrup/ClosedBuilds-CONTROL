# Verification status and selection

## Current evidence

The milestone-1 baseline is documentation from source inspection. Milestone 2 now has locked installation/native loading, real tooling/browser checks, and source/unsigned directory-package startup checks on macOS arm64 (below). Full desktop/browser workflows, installers, other platforms, controller connection, movement, and flashing remain unverified. `npm test` runs tooling, packaging-boundary, watcher, and title tests; there is no machine behavior suite or controller simulator yet. `npm start` launches the app, rather than acting as a verification placeholder.

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

See [commands, output format, and exclusions](development.md#incremental-typescript-and-local-checks) before selecting checks. These results are tooling evidence only, not controller/application characterization. Hosted CI execution/failure probes, installed/signed packaging, and the broader platform matrix remain pending. Subsequent browser/build/package slices are recorded below.

### Isolated browser checks (milestone 2)

Evidence on `build/playwright-preview-check`, macOS arm64, Node 24.22.1/npm 11.19.1, Playwright 1.64.1, bundled Chromium, no controllers:

- `npx playwright install chromium` and `npm run test:e2e` pass. A real web worker loads the existing preview script and its Three.js import using the production URLs; `G21`/`G90` plus a linear move produces a 5-unit path ending at X3/Y4/Z0. Requests are intercepted from a two-asset allowlist; no application startup or listening network services are involved.
- `npm run check` passes all 18 existing tests and the expanded formatting/lint/type checks. Browser execution is separate from this fast aggregate. Linux CI now installs Chromium and runs `test:e2e`; hosted execution remains unverified.
- `npm ci`, `npm ls --depth=0`, and `npm run verify:install` pass with the updated lockfile; native loading passes in host Node and Electron's Node mode. The same 16 inherited audit findings remain.
- This is narrow preview-worker evidence, not full viewer/UI, server delivery, packaged paths, arcs/large-file behavior, simulation, or physical-machine verification. See [browser setup and isolation](development.md#isolated-browser-checks).

### Browser runtime builds (milestone 2)

Evidence on `build/browser-runtime-assets`, macOS arm64, Node 24.22.1/npm 11.19.1, esbuild 0.28.2, Playwright 1.64.1/bundled Chromium, no controllers:

- `npm run check` passes 22 tests, strict tooling/renderer/browser-test checks, CommonJS tooling compilation, and browser builds. New tests cover title formatting and isolated build/watch updates for both renderer/worker entries; the legacy callback branding test now uses the extracted formatter.
- `npm run test:e2e` passes two browser checks against generated assets: the worker's Three.js import and 5-unit linear path, plus title formatting through the actual legacy callback on inert full/mobile paths with script-order checks. An initial bundler attempt inherited strict-mode emission and failed the worker check with `GCodeParser is not defined`; preserving classic-worker emission fixes that compatibility regression without editing the parser.
- `npm ci`, `npm ls --depth=0`, and `npm run verify:install` pass with the esbuild lockfile update, including native loading in host Node and Electron's Node mode. Installation still reports the same 16 inherited audit findings.
- The app's HTML/worker consumers now reference generated assets; startup commands build before launching. No application startup, real HTTP delivery, native desktop rebuild/reload session, packaging, broad parser characterization, or machine behavior was exercised in this slice. Those remain separate evidence gaps.

See [browser output contracts](development.md#browser-and-worker-output). The subsequent unsigned-package slice adds local startup/packaging evidence; broader platform support and project-owned release configuration remain pending.

### Unsigned directory package and desktop startup (milestone 2)

Evidence on `build/unsigned-package-verification`, macOS arm64 (host reports Darwin 27), Node 24.22.1/npm 11.19.1, Electron 23.3.13, electron-builder 24.13.3, Playwright 1.64.1. The maintainer explicitly confirmed disconnected controllers and a trusted isolated network. No machine commands were sent.

- `npm run package` builds `dist/unsigned/mac-arm64/CBC.app`. Builder logs confirm the independent config and skipped macOS signing because identity is explicitly null; no signing/notarization hook or publishing occurs. `codesign -dv` shows the retained Electron linker-generated **ad-hoc** signature, no TeamIdentifier and no sealed resources, not project signing trust.
- `npm run verify:package -- dist/unsigned/mac-arm64/CBC.app/Contents/Resources/app.asar` passes: generated assets, Three.js, Ace CNC mode, HTML/icons, licenses/history, inherited TLS files, root firmware/tools, Interface probe/profile files, and unpacked native bindings are present. Required bytes match current source. Development directories/update feeds are absent and the manifest has the unsigned marker/current version. Inspection initially exposed missing explicit native unpacking; `**/*.node` now makes that layout deliberate.
- `CBC_DESKTOP_SMOKE=1 npm run test:desktop` and the same command with `CBC_PACKAGED_EXECUTABLE="$PWD/dist/unsigned/mac-arm64/CBC.app/Contents/MacOS/CBC"` pass. Source/package identity and disposable profile paths are checked, status reports connection state 0, required assets return HTTP 200, the served worker produces the 5-unit linear path, the splash disappears, and closing the app releases its HTTP/HTTPS ports. A first attempt correctly refused to launch while an existing instance occupied port 3001; the maintainer closed it before retrying.
- `npm run check` includes 30 deterministic tests and strict checks for the new scripts/desktop tests/config. Unit checks verify credential filtering, explicit unsigned policy, rejection of development/update-feed/non-verification artifacts, and the packaged updater guard without importing the app. The separately gated desktop test is not run by `check`, normal browser tests, or CI.
- `npm ci`, `npm ls --depth=0`, `npm run verify:install` (host Node and Electron's Node mode), and `npm run test:e2e` (two isolated browser checks) pass. The same 16 inherited audit findings remain. Running the desktop Playwright config without `CBC_DESKTOP_SMOKE=1` exits 1 before app launch, as intended.
- Gaps: no installed/signed/notarized application, installer, Windows/Linux/x64 artifact/runtime, complete desktop lifecycle, existing-data round trip, development rebuild/reload, motion, or flashing evidence. Native window icon code still references an inherited missing `app/favicon.png`; the actual shipped favicon is `.ico`. No full branding claim is made. The package retains tracked legacy TLS material and security debt and is **not distributable**; source/renderer update endpoints and Node-side firmware fetching remain migration debt. Firmware/tool byte verification does not prove that flashing works.

See [commands, safety gate and artifact boundary](development.md#local-unsigned-package-and-startup-checks). Milestone 2 remains open for platform/support evidence, modernization/security work, hosted CI results, and project-owned release configuration.

### Pull-request CI slice (milestone 2)

Evidence recorded on `build/pr-verification`, macOS arm64, Node 24.22.1/npm 11.19.1, Electron 23.3.13, no controllers:

- `npm ci`, `npm ls --depth=0`, `npm run check` (18 tests), and `npm run verify:install` pass. Native loading passes in host Node and Electron's Node mode. Installation still reports the same 16 inherited security findings; this change does not resolve them.
- The new `.github/workflows/check.yml` runs those commands on pull requests, `main` pushes, and manual dispatch using Linux/macOS/Windows runners. Workflow YAML is included in `npm run format:check`; Prettier successfully parses and checks it. The workflow has read-only repository permissions and no signing/publishing steps or release-secret references. The inherited push-to-release workflow is removed.
- Hosted jobs have **not** run from this working branch. Runner compatibility, actual CI failure propagation, and branch-protection requirements remain unverified. The previous local test/type-error failure probes establish local command behavior only. No application startup, unsigned package, tagged release, or physical-controller evidence is claimed.

See [the CI/release boundary](development.md#pull-request-verification-and-release-boundary). Keep the milestone's CI/packaging/release checklist item open until its remaining scope has evidence.

## CBC 0.1.0 development checks

Evidence recorded with the CBC 0.1.0 changes, macOS arm64, Node 24.22.1/npm 11.19.1, Electron 23.3.13, no controllers. User-facing changes are listed in [CHANGELOG.txt](../CHANGELOG.txt); watcher usage and storage compatibility are documented in [development.md](development.md).

- `npm run check` passes all 18 tests, covering tooling, watcher reload/restart priority and cleanup, development IPC guards, dynamic CBC titles, and default/overridden profile paths. Tests do not import the application entry point.
- Native `npm run dev` smoke checks: frontend edits send reload requests without replacing Electron; main edits restart it; SIGTERM stops the launcher and Electron. HTTP serves the CBC title and supplied SVG, and `/api/version` reports `0.1.0`.
- Remaining gaps: native visual workflows, existing-data round trips, Windows/Linux runtime behavior, and packaging. Reloads discard unsaved renderer state; these checks do not establish machine behavior or state-preserving HMR.

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

- Node/npm are pinned; installation/native loading and source/unsigned directory-package startup are verified only on macOS arm64. Installed/signed releases and the retained OS/architecture support matrix remain unestablished. Inherited CI/build targets are intentions, not test results.
- Local UI flows have been located, but out-of-repo CAM, socket, HTTP, and macro consumers are unknown.
- Library versions/local patches and firmware build provenance are not fully established.
- Mobile PWA registration/cache paths and non-Electron/Pi startup are unverified.
- Protocol branches and firmware UI choices can outlive working implementations. Preserve them until characterization or an explicit retirement decision resolves them.

Do not clear these gaps solely because a broad smoke test succeeds. Close each with targeted evidence or a recorded scope decision.
