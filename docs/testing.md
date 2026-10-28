# Verification status and selection

## Current evidence

The milestone-1 baseline is documentation from source inspection. Milestone 2 now has hosted Linux x64/macOS arm64/Windows x64 locked installation/native loading, strict checks, unsigned package inspection, and source/unsigned directory-package startup checks, plus isolated browser checks on Linux and locally on macOS (below). Full desktop/browser workflows, installers, physical controller connection, movement, and flashing remain unverified. `npm test` runs tooling, packaging-boundary, watcher, title, and minimal Dev Controller tests. The Dev Controller is a UI stub, not the planned machine behavior simulator. `npm start` launches the app, rather than acting as a verification placeholder.

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

### CI unsigned packaging slice (milestone 2)

Evidence on `build/ci-unsigned-packages`, macOS arm64, Node 24.22.1/npm 11.19.1, Electron 23.3.13, electron-builder 24.13.3; no application startup or controller access:

- `npm run check` passes 36 tests, including archive discovery for macOS Intel/ARM, Linux and Windows layouts, rejection of missing/ambiguous archives, and existing unsafe-package rejection checks. ASAR entry separators are normalized so exclusions apply on Windows too.
- `npm run package` and argument-free `npm run verify:package` pass against the newly built macOS arm64 directory package. Builder explicitly skips signing; resources/native unpacking match current source.
- The existing CI matrix now runs those packaging commands after its checks, without signing credentials, publishing, application launch, or artifact upload. Hosted execution, Windows/Linux packaging, desktop support, installers, security modernization, and project-owned tagged publishing remain unverified. Milestone 2 remains open.

### Electron runtime modernization (milestone 2)

Evidence on `build/modernize-electron`, macOS arm64 (Darwin 27), Node 24.22.1/npm 11.19.1, Electron 45.1.0 with embedded Node 24.22.1, electron-builder 24.13.3. The maintainer explicitly confirmed disconnected controllers, a trusted isolated network, and other CBC instances closed before desktop checks. No machine commands were sent.

- `npm ci` and `npm ls --depth=0` pass with the updated lockfile. Root postinstall explicitly installs Electron's binary before running native dependency setup. `npm run verify:install` passes in host Node and Electron's Node mode: serialport 12.0.0/native bindings 12.0.1 load unchanged, unopened port construction and split-line framing pass. This is Node-API binary-load evidence, not native source compilation or physical serial behavior.
- `npm run check` passes all 41 deterministic tests, strict checks, and builds. `npm run test:e2e` passes all three isolated Chromium checks (worker, full/mobile title, Dev Controller UI); these browser checks do not themselves run Electron. The existing Chromium 110 build target is retained for shared browser assets.
- `npm run package` and `npm run verify:package` pass for the Electron 45.1.0 macOS arm64 unsigned directory package. Signing is explicitly skipped; firmware/tools, generated assets, the Dev Controller module and native unpacking remain verified. No installer, signing, publishing, or release configuration changes.
- `CBC_DESKTOP_SMOKE=1 npm run test:desktop` and `CBC_DESKTOP_SMOKE=1 CBC_PACKAGED_EXECUTABLE="$PWD/dist/unsigned/mac-arm64/CBC.app/Contents/MacOS/CBC" npm run test:desktop` both pass. The test now asserts the exact pinned Electron version for source and package, alongside profile/identity, disconnected status, HTTP assets, served worker output, splash dismissal and port cleanup.
- `npm audit` exits 1 with **14 affected packages (13 high, 1 critical)** rather than the initial 16. Electron is no longer listed; builder/updater/rebuild/node-gyp, `ip` and transitive security debt remain. This is not a security-complete or distributable release.
- Dependency compatibility limits: Electron 45 requires macOS 13+, and no longer ships Windows ia32/Linux armv7l binaries. The retained platform matrix still needs an explicit support decision and evidence. Windows/Linux/x64 startup, installed/signed releases, persisted-data migration, full desktop workflows, motion and flashing remain unverified. The legacy renderer still enables Node integration without context isolation; this runtime upgrade does not harden that boundary.

Selection reference: [official Electron breaking changes](https://www.electronjs.org/docs/latest/breaking-changes), including Electron 42's explicit binary installer and Electron 44's platform removals. The current startup path has no preload, renderer clipboard calls, or Electron `File.path` dependency requiring migration in this slice; broader feature compatibility remains unverified.

### Packaging toolchain modernization (milestone 2)

Evidence on `build/modernize-packaging-toolchain`, macOS arm64 (Darwin 27), Node 24.22.1/npm 11.19.1, Electron 45.1.0, electron-builder 26.18.0. The maintainer authorized stopping the running dev session, then explicitly confirmed disconnected controllers and a trusted isolated network before desktop checks. The application is left stopped; no machine commands were sent.

- `npm ci`, `npm ls --depth=0`, and `npm run verify:install` pass. Builder now uses `@electron/rebuild` 4.2.1 with node-gyp 12.4.0/tar 7.5.22 from the lockfile. Serialport 12.0.0/native bindings 12.0.1 load in host Node and Electron's Node mode without opening or enumerating devices. This is not native source compilation evidence.
- Reference inspection (`git grep` across tracked files) found no maintained runtime/build consumers for the removed direct `electron-rebuild`, `node-gyp`, `node-abi` or `electron-builder-notarize` dependencies. The historical Pi installer independently installs its legacy rebuild helper; it remains unverified and was not run. The retained notarize hook still imports its declared direct dependency; removing the global override allows builder to use its own notarize 2.5.0.
- `npm run check` passes 42 tests and strict checks/builds, including compatibility with the installed builder configuration types and assertions for the migrated unsigned Windows `signtoolOptions.sign` policy. No signing credentials or release setup are needed.
- `npm run package` and `npm run verify:package` pass for the macOS arm64 unsigned directory artifact. Actual builder schema validation passes; signing is explicitly skipped. Resources, generated assets, the Dev Controller module, firmware/tools and native unpacking pass inspection with the new builder's dependency collection/ASAR implementation.
- `CBC_DESKTOP_SMOKE=1 npm run test:desktop` and `CBC_DESKTOP_SMOKE=1 CBC_PACKAGED_EXECUTABLE="$PWD/dist/unsigned/mac-arm64/CBC.app/Contents/MacOS/CBC" npm run test:desktop` both pass. Source and newly packaged runtime match Electron 45.1.0, isolate their profiles, report disconnected status, serve assets/worker output, dismiss the splash and release ports on close.
- `npm audit` exits 1 with **three high affected packages**, down from 14 (13 high/1 critical): `electron-updater`, its nested `builder-util-runtime`, and `ip`. No forced fixes or updater behavior changes were applied; this remains a non-distributable verification artifact with inherited TLS/security debt.
- Gaps: no hosted CI results, Windows/Linux/x64 packaging/runtime, native compilation, installers, signing/publishing, persisted-data migration, full desktop workflows, or hardware evidence. The retained legacy release config was not migrated to builder 26 and is not an authorized or validated release path. Milestone 2 remains open.

### Updater dependency modernization (milestone 2)

Historical interim checks: this dependency upgrade was subsequently superseded, before commit, by the maintainer-requested removal of the inherited update path below. The compatibility test and installation import described here are no longer retained.

Evidence on `build/modernize-updater`, macOS arm64 (Darwin 27), Node 24.22.1/npm 11.19.1, Electron 45.1.0, electron-builder 26.18.0. No application startup, controller access or update feed access:

- `npm ci`, `npm ls --depth=0`, and `npm run verify:install` pass with electron-updater exact-pinned to 6.8.11. The installation check now also loads the updater's CommonJS class export in host Node and Electron's Node mode, without accessing its Electron singleton. Native serial loading and framing still pass without opening/enumerating devices.
- `npm run check` passes 47 tests, strict checks and builds after the locked reinstall. Five new tests in `scripts/updater-compatibility.test.ts` construct the installed updater with an explicit unpackaged app adapter and evaluate only legacy listener registration from `index.js` in a VM. Typed fixtures cover availability/progress, ready notifications (recorded timer only), no-update reporting, actual updater error dispatch, and the unpackaged check guard. They do not import the application or perform filesystem/network update operations. The existing unsigned initialization/apply guards remain covered. No legacy callbacks or socket payloads changed.
- `npm run package` and `npm run verify:package` pass for the macOS arm64 unsigned directory artifact. Builder explicitly skips signing; resource/native layout inspection passes. The artifact was not launched.
- `npm audit` exits 1 with **one high affected package**, `ip`, down from three. The old updater and its nested builder-util-runtime 9.1.1 findings are removed; the new updater uses builder-util-runtime 9.7.0. This does not establish release readiness or eliminate inherited TLS/renderer/network security debt.
- Gaps: no source/package desktop startup rerun, platform-specific native updater integration, real feed/download/install or signature verification, hosted CI, Windows/Linux/x64 runtime, installers, publishing, persisted-data migration, full workflows or hardware evidence. Existing update endpoints/release configuration are unchanged and remain unsafe migration debt. Browser tests were not rerun because renderer/assets are unchanged. Milestone 2 remains open.

### Inherited application updates disabled

Evidence on `fix/disable-inherited-updates`, macOS arm64 (Darwin 27), Node 24.22.1/npm 11.19.1, Electron 45.1.0, electron-builder 26.18.0. The maintainer explicitly requested disabling upstream application updates now, with CBC-owned hosting/signing/publishing deferred. No application startup or controller access:

- Removed the unused electron-updater dependency and initialization, development update feed, renderer upstream release/changelog/statistics fetches, automatic countdown, progress/ready listeners and install dialog. The existing status card explains that CBC automatic updates are not configured. Default builder publishing is null. Legacy `applyUpdate`/`downloadUpdate` requests only return the disabled-update response to their requesting socket, regardless of runtime/package marker.
- `npm ci`, `npm ls --depth=0`, and `npm run verify:install` pass. Serial/native loading and framing pass in host Node and Electron's Node mode without opening/enumerating devices. `npm audit` exits 1 with one high finding (`ip`, no registry fix available).
- `npm run check` passes 45 tests, strict checks and builds. Five disabled-update tests evaluate only actual socket registration with no updater, imports, timers, network or process access, and guard the removed dependency/feed/publishing destination, renderer release paths and status text. They replace the interim updater compatibility tests and unsigned-only runtime guards. Package inspection gains a regression test rejecting an accidentally included updater dependency. These are bounded behavior/source-policy checks, not full application network monitoring.
- `npm run test:e2e` passes all three isolated Chromium checks (worker, full/mobile title, Dev Controller controls). Title fixtures now delimit the legacy title callback using the next ready handler because the old release-statistics function has been removed.
- `npm run package` and `npm run verify:package` pass for the macOS arm64 unsigned directory artifact. Signing is explicitly skipped; resource/native layout checks pass, including absence of the updater dependency and development/generated update feeds. The artifact was not launched.
- Remaining gaps: no new source/package desktop startup, installed app, other-platform runtime, full workflows or hardware evidence. Interface firmware downloads, other network activity, inherited TLS material, renderer security and remaining identity/support/signing configuration are unchanged. Disabling application updates is not an offline mode or a release-readiness claim. CBC update hosting, signature policy, publishing and installed-user update migration must be deliberately configured and tested before re-enabling application updates; no release workflow is enabled.

### Local-address dependency retirement (milestone 2)

Evidence on `build/remove-ip-dependency`, macOS arm64 (Darwin 27), Node 24.22.1/npm 11.19.1, Electron 45.1.0, electron-builder 26.18.0. No application startup, controller access or network scan:

- Removed the sole `ip` dependency from the manifest/lockfile. `src/server/local-address.ts` uses `node:os` with the legacy default selection order and IPv4 loopback fallback; all existing runtime lookups and the standalone scan script require its compiled CommonJS output. No socket/status shapes or discovery ranges changed.
- `npm ci`, `npm ls --depth=0`, and `npm run verify:install` pass, including native serial loading/framing in host Node and Electron's Node mode without device enumeration/opening. `npm audit` exits 0 with **zero vulnerabilities**; this is registry evidence, not a security-complete claim. Installation still warns about deprecated dependencies, including Multer 1.x.
- `npm run check` passes **51 tests**, strict checks and builds. Five new address tests cover interface/address order, IPv6/loopback exclusion, missing/empty interfaces, link-local selection, fallback and fresh snapshots without mutation. Package inspection adds a regression test rejecting the retired `ip` dependency.
- `npm run package` and `npm run verify:package` pass for the unsigned macOS arm64 directory artifact, including byte verification of the new compiled module and absence of `ip`. Signing is explicitly skipped. The artifact was not launched.
- Gaps: no new source/package startup, live LAN/default-route selection, Interface download, actual network scan, other-platform runtime, hosted CI, installer, full workflow or hardware evidence. Browser tests were not rerun because browser assets are unchanged. Inherited TLS material, renderer/network security and release ownership/migration remain unresolved. Milestone 2 remains open.

### First hosted platform verification (milestone 2)

Evidence for commit `07a12383fee5a831c8106bf2917b0453fb1bfa23` on `build/hosted-platform-verification`: [verification run 40774979884](https://github.com/jkelstrup/ClosedBuilds-CONTROL/actions/runs/40774979884), triggered by draft PR #1. All runners selected the pinned Node 24.22.1/npm 11.19.1 toolchain.

- `ubuntu-24.04` and `macos-15` passed locked installation, dependency-tree validation, `npm run check` (51 tests), native loading in host Node/Electron, unsigned host packaging and resource inspection. Linux also passed the three isolated Chromium checks; macOS browser checks are intentionally skipped by this workflow.
- `windows-2025` passed installation and dependency-tree validation, then failed `format:check` on 44 files. Tests, native verification and packaging were not reached. A local reproduction using `core.autocrlf=true` in a disposable Git repository confirmed that checkout converted formatting-checked files to CRLF, which Prettier rejects.
- Commit `26af577` adds scoped LF checkout rules in `.gitattributes`, leaving legacy source/vendor/binary resources outside the policy. `tests/toolchain/checkout.test.ts` exercises an actual Git checkout with Windows-style conversion enabled: it failed before the rules and passes afterward. Local `npm run check` passes 52 tests on macOS arm64.
- [Rerun 40775575767](https://github.com/jkelstrup/ClosedBuilds-CONTROL/actions/runs/40775575767) confirms Windows now passes formatting, all 52 tests, native loading and unsigned packaging. Linux/macOS pass their entire jobs again. Windows resource inspection then fails to look up `dist/machine/dev-controller.js`: the installed ASAR reader splits directories using native `path.sep`, but the verifier passes portable `/` inventory paths. An isolated local evaluation of that reader with Windows path semantics reproduces the exact error; this is not evidence that the packaged module is absent.
- Commit `3e3bfb4` normalizes paths at ASAR extraction/stat calls while retaining portable inventory/exclusion matching and exact byte checks. A new positive archive fixture exercises nested runtime modules, Interface files and unpacked native bindings (the previous fixtures only tested early rejection). Local `npm run check` passes 53 tests and `npm run verify:package` passes on the existing macOS arm64 artifact.
- [Successful run 40776378316](https://github.com/jkelstrup/ClosedBuilds-CONTROL/actions/runs/40776378316), for commit `3e3bfb4`, passes on `ubuntu-24.04`, `macos-15` and `windows-2025`: locked installation, dependency tree, strict checks/builds, all 53 tests, native loading in host Node and Electron 45.1.0, unsigned host packaging and resource inspection. Linux also passes all three isolated Chromium checks. Windows/macOS browser checks are intentionally skipped. Job durations were 1m16s, 1m8s and 1m54s respectively. The two earlier failures and this successful rerun establish hosted failure propagation and recovery.
- Non-blocking runner annotations warn that checkout/setup-node v4 target deprecated Node 20 and are forced onto Node 24; action-version modernization remains follow-up work, not a failure of the pinned application/tooling runtime. macOS also reported runner capacity constraints.
- These jobs never launch the application or access controllers. Hosted package/resource checks are not Windows/Linux desktop startup evidence, a supported-platform decision, installed/signed release verification, or hardware evidence. CI failure propagation is now observed; milestone 2 remains open.

### Verification action runtime modernization (milestone 2)

Evidence on `build/modernize-verification-actions`, macOS arm64, Node 24.22.1/npm 11.19.1. No application startup, controller access, CI dispatch or publishing:

- Replaced checkout/setup-node v4 with [checkout 7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) and [setup-node 7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0), pinned to release commits `3d3c42e5aac5ba805825da76410c181273ba90b1` and `949feb2413d6458794dcd2491c4babbbce0c15c1`. GitHub's tag-ref API resolves both tags directly to these commits; both release `action.yml` files declare `node24` and retain the inputs used by this workflow. Checkout's new fork-checkout restriction concerns privileged `pull_request_target`/`workflow_run` triggers, neither of which CBC uses. No unsafe override is enabled.
- `npm run check` passes formatting (including workflow YAML), lint, strict types, all **53 tests**, and builds. No dependencies, lockfile, application runtime, runner targets or verification commands changed; read-only permissions, disabled credential persistence and the explicit npm cache remain intact.
- Hosted execution of these new action versions, cache restore/save and removal of the prior Node 20 annotations remain **unverified**. The earlier green three-platform run used v4; local checks cannot establish GitHub runner compatibility. No package/startup or hardware evidence is added by this change. Milestone 2 remains open for platform startup/support and release-ownership gaps.

### Cross-platform desktop startup wiring (milestone 2)

Evidence on `build/cross-platform-desktop-smoke`, macOS arm64, Node 24.22.1/npm 11.19.1. No application startup, controller access, CI dispatch, signing or publishing:

- The separate desktop check now permits opted-in macOS/Linux runs and Windows runs only on disposable GitHub-hosted runners. Windows retains its normal tray-first startup; the test opens the UI using the existing `/activate` HTTP route. No runtime implementation or socket/status contracts changed.
- CI now explicitly opts into source and unsigned-package startup on each existing runner, using Xvfb on Linux. `CBC_DESKTOP_PACKAGE=1` resolves the executable beside the sole unsigned archive and rejects absent/ambiguous packages or a missing executable. The explicit `CBC_PACKAGED_EXECUTABLE` override remains supported. No artifacts are uploaded and release publishing remains disabled.
- `npm run check` passes formatting, lint, strict types, builds and **59 tests**. Six new deterministic tests cover mandatory opt-in, supported-host policy, Windows hosted-runner restriction, and macOS/Linux/Windows executable layouts with missing-executable and ambiguous-archive failures. These tests create disposable filesystem fixtures, not application processes.
- `npx playwright test --config playwright.desktop.config.ts --list` without opt-in exits 1 with the safety message. With `CBC_DESKTOP_SMOKE=1`, the same listing command succeeds and discovers one desktop test without launching it. The compiled executable-discovery helper also resolves the existing macOS arm64 unsigned artifact without starting it. `git diff --check` passes.
- Hosted execution remains **pending**, including actual Windows activation/login-setting behavior, Linux display/native startup, source/package cleanup on those platforms, and compatibility of the newly pinned action versions. Existing macOS startup evidence is unchanged; no fresh local desktop smoke run is claimed. The matrix is still a verification target, not an approved support policy. Installed/signed release, complete desktop workflows, data migration and hardware gaps remain open; milestone 2 is not complete.

### Hosted cross-platform desktop startup results (milestone 2)

[Verification run 40777976344](https://github.com/jkelstrup/ClosedBuilds-CONTROL/actions/runs/40777976344), for commit `cd29cc53aa694cd60032b25e8153309ee1879040` on `build/cross-platform-desktop-smoke` (draft PR #2), passes on all three GitHub-hosted runners. All used Node 24.22.1/npm 11.19.1 and Electron 45.1.0.

| Runner / architecture | Source startup | Unsigned directory-package startup | Total job duration |
| --- | --- | --- | --- |
| `ubuntu-24.04` / x64, Xvfb | Passed | Passed | 2m00s |
| `macos-15` / arm64 | Passed | Passed | 1m54s |
| `windows-2025` / x64 | Passed, activated through `/activate` | Passed, activated through `/activate` | 2m21s |

- Every job passed locked installation, dependency-tree validation, `npm run check` (59 tests), native loading in Node/Electron, unsigned packaging, and resource inspection before the two `CBC_DESKTOP_SMOKE=1` startup steps. Package startup used `CBC_DESKTOP_PACKAGE=1`; Linux prefixed both startup commands with `xvfb-run --auto-servernum`. Linux also passed all three isolated Chromium checks.
- Each startup check asserts the exact Electron version, source/package identity, disposable profile, disconnected status, generated assets and retained library HTTP delivery, real preview-worker output, splash dismissal and HTTP/HTTPS port cleanup. No controller commands were issued. Windows startup's login-setting side effect is confined to disposable hosted runners; this is not a test of login startup or tray interaction.
- Checkout 7.0.1/setup-node 7.1.0 now have hosted execution evidence on all three platforms. Their setup/post steps succeeded and npm download caches were saved on each runner; cache restoration under the new actions was not observed in this run. No signing, publishing or artifact uploads occurred.
- This closes the previously missing Linux/Windows **startup smoke** evidence, not complete desktop/platform support. Installed launch, installers, signing, release ownership/update migration, persisted-data compatibility, full workflows, other OS/architecture combinations and hardware remain unverified. Milestone 2 remains open for explicit support/release scope decisions; this run does not approve those decisions.

## CBC 0.1.0 development checks

Evidence recorded with the CBC 0.1.0 changes, macOS arm64, Node 24.22.1/npm 11.19.1, Electron 23.3.13, no controllers. User-facing changes are listed in [CHANGELOG.txt](../CHANGELOG.txt); watcher usage and storage compatibility are documented in [development.md](development.md).

- `npm run check` passes all 18 tests, covering tooling, watcher reload/restart priority and cleanup, development IPC guards, dynamic CBC titles, and default/overridden profile paths. Tests do not import the application entry point.
- Native `npm run dev` smoke checks: frontend edits send reload requests without replacing Electron; main edits restart it; SIGTERM stops the launcher and Electron. HTTP serves the CBC title and supplied SVG, and `/api/version` reports `0.1.0`.
- Remaining gaps: native visual workflows, existing-data round trips, Windows/Linux runtime behavior, and packaging. Reloads discard unsaved renderer state; these checks do not establish machine behavior or state-preserving HMR.

## Minimal Dev Controller

Evidence on `feat/minimal-dev-controller`, macOS arm64, Node 24.22.1/npm 11.19.1, no application startup or controller access:

- `npm run check`: 41 tests pass, including asynchronous acknowledgements, split/batched input, fixed status, identification/modals, disconnect cleanup and reconnect. A VM evaluates only the legacy connection handler and cleanup with an in-memory stream; it never imports the application entry point or opens listeners/devices.
- `npm run test:e2e`: three isolated Chromium tests pass. The new test uses real jQuery and existing dropdown/status functions against inert markup, verifying dev selection, exclusion from flashing, simulated badge, and normal enabled/disabled jog and console controls. Backend snapshots and the Metro select adapter are supplied by the fixture; this is not a live Socket.IO or full desktop check.
- `npm run package` and `npm run verify:package`: unsigned macOS arm64 artifact builds and contains the compiled CommonJS controller module with bytes matching source. The artifact was not launched.
- No motion, probing, settings, alarms, timing or realistic job behavior is simulated or verified. Milestone 3's extracted machine module and deterministic simulator remain pending. Usage and limitations: [Dev Controller](development.md#dev-controller).

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

- Node/npm are pinned; hosted installation/native loading and source/unsigned directory-package startup pass on Linux x64, macOS arm64 and Windows x64. Installed/signed releases and an explicit supported OS/architecture policy remain unestablished. Other inherited build targets are intentions, not test results.
- Local UI flows have been located, but out-of-repo CAM, socket, HTTP, and macro consumers are unknown.
- Library versions/local patches and firmware build provenance are not fully established.
- Mobile PWA registration/cache paths and non-Electron/Pi startup are unverified.
- Protocol branches and firmware UI choices can outlive working implementations. Preserve them until characterization or an explicit retirement decision resolves them.

Do not clear these gaps solely because a broad smoke test succeeds. Close each with targeted evidence or a recorded scope decision.
