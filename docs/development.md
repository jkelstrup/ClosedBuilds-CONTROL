# Development and repository ownership

## Current setup status

This repository is CBC, an independent project rather than an upstream-tracking fork. [Project identity](../README.md#independent-project) defines how we treat the abandoned OpenBuilds baseline; inherited identifiers and release configuration are migration debt, not a dependency on upstream ownership or maintenance. [PLAN.md](../PLAN.md) separates mapping from toolchain modernization; [architecture.md](architecture.md) describes what actually starts today. User-facing changes are recorded in [CHANGELOG.txt](../CHANGELOG.txt), above the retained upstream history.

- `npm run dev` builds tooling and browser assets, then launches Electron with automatic rebuild/reload/restart (see below). `npm start` and `npm run run-local` build and launch `electron .` without watchers. Fast checks never launch CONTROL; the separate, explicitly gated `test:desktop` command does.
- Use Node **24.22.1** (`nvm use`, using `.nvmrc`) and npm **11.19.1**, also declared in `package.json`. Install with `npm ci` from the checked-in lockfile. Its `postinstall` runs `electron-builder install-app-deps` and may download/rebuild native dependencies. Do not use `--ignore-scripts` for a complete installation.
- Run `npm run verify:install` after installing. This loads serialport's native binding and checks split-line framing in host Node and in Electron's Node mode. It never imports the application, enumerates/opens ports, or starts servers/windows/updaters. This is an installation check, not an application behavior suite.
- The current verified combination is macOS arm64, Node 24.22.1/npm 11.19.1, Electron **45.1.0** (embedded Node 24.22.1), serialport **12.0.0**, and native bindings **12.0.1**. The native package uses Node-API; loading under both runtimes passed without a serialport upgrade. Source and unsigned directory-package startup/asset smoke checks also pass on this host; native source compilation, other platforms, installers, and full desktop workflows remain unverified. Historical Electron 23 evidence remains in [testing.md](testing.md).
- Electron is exact-pinned to 45.1.0, the registry's stable release selected for the dedicated milestone-2 runtime upgrade. Since Electron 42, its npm package no longer downloads the binary in its own postinstall. Our root `postinstall` explicitly runs `install-electron --no` before native dependency setup, so normal locked installation materializes the executable before verification/development. Electron 45 requires macOS **13 or newer** and no longer supplies Windows ia32 or Linux armv7l binaries; these are dependency limits, not a newly verified CBC support matrix. See [Electron breaking changes](https://www.electronjs.org/docs/latest/breaking-changes). Other inherited dependency ranges are resolved by the lockfile.
- electron-builder is exact-pinned to **26.18.0**. Installation/packaging now use its maintained `@electron/rebuild` dependency (locked to 4.2.1); redundant direct `electron-rebuild`, `node-gyp`, `node-abi`, and unused `electron-builder-notarize` dependencies were removed after reference inspection. The unverified historical `pi-install.sh` installs its own legacy rebuild helper and is not a supported CBC setup path. The direct `@electron/notarize` 2.3.2 import remains for the retained legacy hook, but its global override was removed so the builder can resolve its own version. Release modernization remains separate.
- Application updates are **disabled in every build**. The unused electron-updater dependency, inherited development feed, renderer release/changelog/statistics fetches, countdown and install dialog are removed; legacy download/apply requests only report that CBC automatic updates are not configured. `package.json.build.publish` is null. CBC-owned update hosting, signing and publishing remain future work, not a reason to retain an upstream binary replacement path. See [evidence](testing.md#inherited-application-updates-disabled).
- `npm audit` now reports **zero findings** after retiring `ip`, down from one after disabling inherited updates, three after the packaging-toolchain upgrade, 14 after the Electron upgrade and 16 in the original baseline. Registry audit results do not establish release security: inherited TLS material, renderer/network boundaries, deprecated dependencies and unverified release configuration remain debt. Do not run `npm audit fix --force` blindly or treat this baseline as release-ready. PR CI uses the pinned toolchain; inherited release automation has been removed, not modernized into an authorized release path.
- `npm run check` runs formatting, lint, strict type checking, deterministic tooling/title/dev-controller tests, and builds. The Dev Controller is a UI stub, not the planned machine simulator. See [testing.md](testing.md).

Do not launch the app merely to inspect architecture: startup opens network listeners, polls serial ports, and can fetch Interface firmware data. Disabling application updates is not an offline mode. Use a trusted isolated network, disconnected controllers, and a disposable profile for future runtime checks. Do not run `scan.js`, `pi-install.sh`, signing scripts, or publishing CI as verification; they scan networks, modify systems, or access release infrastructure.

## Incremental TypeScript and local checks

### Dev Controller

**Temporary development aid — remove eventually.** This stub exists only to unblock connected-state UI work before the milestone-3 simulator is available. Remove it once that simulator covers this use case, including its dropdown entry, legacy connection branch, module, build/package wiring, and stub-specific tests. Do not maintain it as a second simulator.

Run `npm run dev`, select **Dev Controller (simulated)** under **Development** in the device dropdown, and connect normally. The backend reports a connected, idle three-axis Grbl controller at zero coordinates. Disconnect normally to return to the disconnected UI. The fake device is not listed in the firmware-flashing dropdown.

This is only for connected-state UI development: commands receive acknowledgements but are ignored. Movement, probing, settings, timing, alarms and realistic job execution are not simulated. Existing job-history and macro side effects still apply. The stub opens no serial/TCP connection; normal application startup still starts servers and discovery. Keep physical controllers disconnected during development.

The checked TypeScript implementation is `src/machine/dev-controller.ts`, compiled as CommonJS to `dist/machine/dev-controller.js` by `npm run build` and included in unsigned packages. Restart `npm run dev` after editing this module; it is not live-watched.

### Automatic development reloads

Run `npm run dev` on a controller-free development machine. Edits under `app/` to HTML, CSS, JavaScript, JSON, images, and fonts reload the desktop window without restarting the shared server. This is a full page reload, not state-preserving HMR: unsaved editor contents and in-memory renderer state are lost. Standalone browser/mobile clients need a manual refresh.

Edits to `src/renderer/` rebuild the renderer bundle; changes to the legacy preview worker rebuild its worker bundle. Generated JavaScript under `app/generated/` triggers the existing frontend reload watcher. The bundler watches imported modules as well as entry points; watch mode transpiles but does not replace `npm run typecheck`. Syntax/build errors are logged and leave the last successful bundle available until corrected.

Edits to `index.js`, `grblStrings.js`, or `package.json` quit and restart Electron, including its servers and machine state. Saves are debounced; a main-process restart takes priority over a renderer reload. Tooling output under `dist/`, dependencies, documentation, source maps, and temporary editor files do not trigger reloads. Restart `npm run dev` manually after editing the development tooling itself or installing dependencies.

Ctrl+C stops the watcher and Electron. Quitting the app also stops the watcher. The launcher uses a private process IPC channel and `CONTROL_DEV_RELOAD=1`; the app accepts reload/quit messages only when unpackaged and launched with both. Normal startup and packaged apps do not enable this hook. The executable still launches with `electron .`, preserving application identity, profile, and origin. No reload endpoint or additional network listener is added.

Forward Electron flags with `npm run dev -- --user-data-dir=<temporary-profile>`. The launcher uses Node's recursive filesystem watcher; the pinned Node 24 host is required. Windows/Linux runtime behavior remains unverified.

### Verification commands

| Command | Current scope |
| --- | --- |
| `npm test` | Vitest in plain Node; toolchain, development/build watcher, title, and branding tests without application startup |
| `npm run test:e2e` | Build, then Playwright Chromium checks for generated worker/title assets with intercepted requests, without application startup |
| `npm run typecheck` | Strict TypeScript for scripts, renderer, tests, and configurations; renderer and browser tests use separate DOM-enabled configs |
| `npm run lint` | Type-aware ESLint for the same migrated TypeScript scope; warnings fail |
| `npm run format:check` | Prettier for migrated scripts/renderer/tests, workflows, toolchain config, and `package.json` |
| `npm run build` | Strict type checks, CommonJS tooling in `dist/checks/`, and browser/worker bundles in `app/generated/`; not a desktop package |
| `npm run check` | All five checks above, stopping at the first failure |
| `npm run verify:install` | Build, then run the compiled installation smoke check in host Node and Electron's Node mode |
| `npm run package` | Build an unsigned directory package for the host OS/architecture; never sign, notarize, publish, install, or launch |
| `npm run verify:package -- [app.asar]` | Inspect an existing unsigned package against current source assets, firmware/tools, Interface data and native binding layout; defaults to the sole archive under `dist/unsigned/`; no app launch |
| `npm run test:desktop` | Explicitly gated macOS source/package startup check; starts real machine-control services, requires disconnected controllers and an isolated trusted network |

TypeScript 5.9.3 is deliberately below the type-aware ESLint plugin's `<6.1` support ceiling. Tool versions are exact-pinned in `package.json` and the npm lock. The compiler uses `NodeNext` resolution/output and an ES2022 target; with this package's unchanged CommonJS identity, ordinary `.ts` modules emit CommonJS `.js`. `.mts` is reserved for ESM tooling configuration. `strict`, unchecked index access, and exact optional-property checks are enabled. Third-party declaration internals use `skipLibCheck`; application/tooling source is still checked. Node types target the host toolchain; Electron 45 also embeds Node 24. The installation smoke check verifies its imports and native loading in both runtimes.

`scripts/verify-install.ts` emits to `dist/checks/scripts/verify-install.js`; TypeScript copies its imported package manifest to `dist/checks/package.json`. The source is not executed directly. Existing CommonJS callers can use `require()` on emitted CommonJS modules after building; the toolchain suite exercises this with a temporary fixture. The development launcher likewise runs compiled tooling. Browser code uses the separate output contract below rather than CommonJS or Node globals.

### Browser and worker output

`scripts/browser-build.ts` uses exact-pinned esbuild **0.28.2** to produce classic IIFE scripts and source maps in ignored `app/generated/`, served at `/generated/` by the existing Express static root. The browser target remains Chromium 110 (the original Electron 23 baseline), deliberately unchanged by the Electron 45 upgrade because standalone browser/mobile consumers share these assets; this is not a claim of support for all browsers. `tsconfig.renderer.json` checks ESNext modules with Bundler resolution, strict settings, DOM libraries, and no ambient Node types. esbuild transpiles only after the build command's type checks pass.

- `src/renderer/legacy-entry.ts` bundles to `renderer.js`. Full and mobile HTML load it before `main.js`; the temporary `window.CBCWindowTitle` function bridges the extracted title formatter to the existing `setWindowTitle` callback. Version/file/port semantics remain in place; no persistence or socket contract changes.
- `app/lib/3dview/workers/verylitegcodeviewer.js` bundles to `preview-worker.js`, now loaded by the viewer at an absolute URL. The worker remains maintained legacy JavaScript, not a strict TypeScript migration. Its absolute `/lib/threejs/three.min.js` import remains a separate shipped resource. The bundler explicitly avoids inheriting `alwaysStrict` emission because this classic worker relies on implicit globals; migrated TypeScript still receives full strict checking.

`npm start`, `npm run run-local`, and `npm run dev` build before launching. Direct `electron .` requires a prior build. Ctrl+C/app exit disposes the development bundler along with existing watchers. Do not edit generated files. Unsigned packaging builds and includes `app/generated/` plus the external Three.js resource; delivery from the directory package is verified on macOS arm64 only, not from an installed/signed release.

### Checked scope and migration exclusions

Migrated production code includes tooling and `src/renderer/`, not machine control. Legacy root JavaScript (`index.js`, `grblStrings.js`, scan/sign/notarize scripts), application HTML/JavaScript, maintained viewer/worker and CNC mode, vendor candidates, historical samples, shipped resources, and inherited release automation are deliberately outside the new strict/format scope. Building the retained worker does not make it strict-checked. This does **not** classify maintained files as vendor or establish their correctness. Dependencies and generated `dist/`/`app/generated/` are excluded from linting.

When a module migrates, add its source/tests to the compiler, ESLint, Prettier, and appropriate test runner scopes together and remove its replaced implementation. Do not mechanically format legacy files as part of unrelated behavior changes. Most renderer assets still use original global scripts; only title formatting and the worker build use the new output path. No `dev:sim` command exists yet.

### Local network address

`src/server/local-address.ts` replaces the retired `ip` dependency using `node:os`. `npm run build` compiles it to CommonJS at `dist/server/local-address.js`, required by `index.js` and the standalone `scan.js`. The unsigned package includes and byte-checks this module. Restart development after editing it; server source is not live-watched. Run a build before using the standalone script, which performs a real network scan and is not a verification command.

The selector preserves the old no-argument lookup for OS-provided addresses: first non-loopback IPv4 in interface/address order, otherwise `127.0.0.1`. It does not prefer private addresses, filter link-local/VPN interfaces, determine the default route, or validate untrusted destinations. Each call reads a fresh interface snapshot. Socket/HTTP status fields, port formatting and Interface address generation are unchanged. Tests supply interface snapshots without network access; live LAN selection remains unverified.

### Isolated browser checks

Playwright **1.64.1** is exact-pinned. Run `npx playwright install chromium` once after installation (Linux CI uses `npx playwright install --with-deps chromium`), then `npm run test:e2e`. Browser binaries are installed separately from `npm ci`; they are not application runtime dependencies. Browser execution stays outside the fast `npm run check`, but its TypeScript, lint, and formatting checks are included.

`tests/e2e/preview.spec.ts` supplies an inert page at an intercepted `http://preview.test` origin. Only the generated worker URL and its absolute Three.js import are fulfilled from repository files; all other requests are aborted and fail the request inventory assertion. `window-title.spec.ts` checks the built renderer bridge and actual legacy title callback on inert full/mobile paths, also checking their HTML script order. No HTTP server, Electron process, application entry point, Socket.IO connection, or device discovery starts. These check real browser asset loading and narrow behavior, not the full renderer, packaged asset delivery, or controller behavior. Worker errors reject the test; Playwright's timeout bounds missing final replies, and each test disposes its browser context. Failed runs retain traces in ignored `test-results/` (inspect with `npx playwright show-trace <trace.zip>`).

### Pull-request verification and release boundary

`.github/workflows/check.yml` runs on pull requests, pushes to `main`, and manual dispatch. Each Linux (`ubuntu-24.04`), macOS (`macos-15`), and Windows (`windows-2025`) job loads Node from `.nvmrc`, verifies the npm version declared in `package.json`, and runs `npm ci`, `npm ls --depth=0`, `npm run check`, and `npm run verify:install`. Linux additionally installs Chromium and runs `npm run test:e2e`. Installation scripts remain enabled so native dependency loading is actually exercised. The npm cache stores download data, not `node_modules`; each job installs from the lockfile.

Each runner also runs `npm run package` and `npm run verify:package` to build its host-architecture unsigned directory package and inspect its resources. Archive discovery requires exactly one `app.asar` under `dist/unsigned/`, avoiding assumptions about platform-specific output paths. Missing or ambiguous output fails verification; pass an explicit archive path locally when retaining multiple builds. No package artifacts are uploaded: they contain inherited TLS material and are not distributable.

`.gitattributes` preserves LF checkout line endings for migrated source/tests/tooling, workflows and root checked configuration, including when Windows Git uses `core.autocrlf=true`. Prettier's LF requirement is unchanged. The checkout regression test uses a disposable Git repository; it does not change the developer's Git configuration. Legacy source/vendor/binary resources are outside these rules. For the first hosted results and remaining Windows gap, see [hosted verification evidence](testing.md#first-hosted-platform-verification-milestone-2).

Jobs have read-only repository permissions, do not retain checkout credentials, and require no release secrets. They never import `index.js`, launch the application, open controller ports, sign, or publish. The runner matrix is a verification target, not a statement of desktop/platform support; record actual hosted results in [testing.md](testing.md). A failing command fails its job; configure required status checks in repository branch protection separately if merge blocking is desired.

The inherited push-to-release workflow, including certificate-content logging and the upstream build action, has been removed. There is intentionally **no release workflow**, including for tags. Unsigned packaging is separate (below); tagged releases still require project-owned destinations and explicit authorization. Legacy builder/signing/update configuration remains in the source and must not be treated as safe release configuration. CI packages but does not launch the app.

### Local unsigned package and startup checks

Run `npm run package`. `scripts/package.ts` launches electron-builder with the explicit `electron-builder.unsigned.json`, `--dir`, and `--publish never`; it accepts no extra arguments. This config does not extend or merge `package.json.build`. Signing/notarization hooks and identities are disabled, signing auto-discovery is off, and the launcher removes signing/publishing credentials from its child environment. The command only writes a host-architecture directory package under ignored `dist/unsigned/`; it is not an installer. Upstream Electron downloads may be needed on the first run.

The unsigned Windows config uses builder 26's `signtoolOptions.sign: null` together with `signAndEditExecutable: false`; the removed top-level `win.sign` option is not used here. Tests check the installed builder configuration types and the explicit unsigned policy, and actual host packaging validates the configuration schema. The inherited release config in `package.json.build` is intentionally not migrated or validated as a release path (including its old Windows signing fields); do not invoke it to build a release. See [builder 26 migration notes](https://github.com/electron-userland/electron-builder/releases/tag/v26.0.0).

The unsigned config retains existing app identity and profile compatibility, but sets `cbcUnsignedVerification: true` in the packaged manifest for artifact verification. Application updates are disabled in all variants, independently of this marker. No development or generated update-feed file is shipped. Interface firmware downloads and other network activity remain; this is not an offline mode.

The runtime allowlist includes app assets/generated bundles, entry point/alarm strings, root firmware/flashing tools, licenses/history, and the inherited TLS pair required by startup. Production dependencies are supplied by electron-builder. Firmware binaries, flashing executables, and native `.node` files are explicitly unpacked. Development scripts/source/tests/docs and signing scripts are excluded. `scripts/package-resources.ts` compares representative runtime files and all root firmware/tools and Interface probe/profile files against source, verifies native/unpacked paths and the unsigned marker/version, and rejects development files/update feeds. It checks resource availability, not flashing correctness.

**Do not distribute this verification artifact.** It still contains inherited tracked TLS material and old runtime dependencies; no signing trust, update migration, installer behavior, or release security is established. On Apple Silicon, the Electron executable can retain its linker-generated ad-hoc signature; no project signing identity or notarization is applied.

For the currently verified macOS arm64 layout:

```sh
npm run package
npm run verify:package -- dist/unsigned/mac-arm64/CBC.app/Contents/Resources/app.asar
```

After disconnecting controllers, using a trusted isolated network, and quitting other CBC instances, opt in separately to real startup checks:

```sh
CBC_DESKTOP_SMOKE=1 npm run test:desktop
CBC_DESKTOP_SMOKE=1 CBC_PACKAGED_EXECUTABLE="$PWD/dist/unsigned/mac-arm64/CBC.app/Contents/MacOS/CBC" npm run test:desktop
```

The desktop check uses a disposable profile, a selected free HTTP port, and a preflight for legacy HTTPS port 3001. It refuses to launch without the explicit opt-in, on non-macOS hosts, or if port 3001 is occupied. It checks actual packaged/source identity, profile isolation, disconnected status, asset HTTP responses, a real preview-worker result, splash dismissal, and port release on close. It does not issue controller commands. Chromium external DNS is blocked during the check, but Node-side Interface firmware fetching can still access the network. Screenshots are written under ignored `test-results/desktop/`; profile directories and launched processes are cleaned up. This does not test data migration, motion, flashing, installed launch, development reloads, or complete native lifecycle behavior.

### Troubleshooting entry points

| Symptom / task | Inspect first |
| --- | --- |
| Native module load/install failures | Installed Node/Electron ABI, serialport dependency, `postinstall`; record exact OS/architecture and versions |
| App cannot start servers | `index.js` TLS reads, HTTP fallback logic, HTTPS port 3001; do not assume `WEB_PORT` changes HTTPS |
| Desktop does not appear on Windows | Tray and `ready` handlers in `index.js`; Windows intentionally starts in the tray |
| Preferences appear lost | Browser origin/HTTP fallback port and Electron user-data profile; see saved-data inventory |
| Mobile QR link fails | `app/js/widget.js` hard-coded port, actual HTTP listener, LAN/firewall access |
| Preview or CNC mode fails after file moves | Worker URLs/importScripts and Ace dynamic mode loading, not just direct HTML script references |
| Packaged flashing fails but source works | ASAR unpack rules and root resource paths in flashing functions |

`DEBUGCONTROL=true` enables main-process debug logging; `WEB_PORT` and `DRO_DECIMALS` are read by the legacy configuration. These are source-observed switches, not a complete configuration interface.

## Source and resource classification

Classification is based on code/header inspection and runtime references, not a proven byte-for-byte upstream audit. “Vendor candidate” means treat as third-party for edits, but verify version, local modifications, and license before replacing or excluding it permanently.

| Paths | Classification | Handling / references |
| --- | --- | --- |
| `index.js`, `grblStrings.js`, `scan.js` | Maintained application implementation / utility | Main runtime, alarm strings, standalone network scan |
| `app/index.html`, `app/upload.html`, `app/js/`, `app/jog/`, active `app/wizards/` | Maintained application source | Global scripts/markup and mixed source/resources; do not classify by `.min.js` alone |
| `app/lib/3dview/3dview.js`, `app/lib/3dview/workers/verylitegcodeviewer.js` | Maintained customized application code | Theme/UI coupling; worker header records inherited viewer/parser lineage and modifications. Included in source discovery and future tests |
| `app/lib/ace/src-noconflict/mode-cncpro.js` | Customized/inherited CNC editor mode | `main.js` selects `ace/mode/cncpro`; preserve Ace module format and attribution. Rebuild provenance unknown |
| `app/lib/threejs/GridRect.js` and other non-minified Three.js additions | Vendor/customization candidates | Grid/controls/renderer additions used directly by application. Local patch history not verified; inspect before exclusion or upgrade |
| Remaining `app/lib/` libraries | Vendored/distribution candidates | Ace distribution modes/workers/themes, jQuery/UI/history, Metro4, Font Awesome, Three.js, lodash, QR, YAML, icon picker. Bundled versions/patches/licenses require audit; not proven unmodified |
| `app/js/grbl-settings-defaults.js`, `grbl-settings-templates.js` | Maintained data-bearing JavaScript | Controller defaults/templates; no generation pipeline established. Treat as source, not disposable generated output |
| `app/wizards/interface/PROBE/`, `PROFILESGRBL/`, `PROFILESHAL/` | Maintained shipped data | Copied to removable media by `writeInterfaceUsbDrive`; destination directories differ from source profile names |
| Root `*.bin`, `*.hex`, `esptool-linux`, `esptool-mac`, `esptool.exe` | Shipped firmware and executable binaries | Exact build provenance/checksums not established. Preserve names and bootloader/partition offsets until tested |
| Root `privkey1.pem`, `fullchain1.pem`; `Cert Update Procedure.txt` | Inherited TLS material/procedure | Read on startup. Treat private material as sensitive and non-secret once tracked; do not copy it into docs/logs. Ownership/replacement needed before distribution; no validity/trust established |
| `app/` images/fonts/styles/affiliate assets; `build/` icons/entitlements/license | Shipped visual/installer resources | Runtime HTML/CSS references plus builder configuration. `build/` is not wholly generated |
| `build/config.gypi` | Generated-looking native build configuration | Provenance and active use unverified; investigate before deleting |
| Root `electron-builder` | Empty tracked file / historical candidate | Not a directory or established packaging configuration; inspect references before cleanup |
| `.github/workflows/check.yml` | Maintained credential-free verification | Uses local commands; hosted runner support and results are tracked in testing guidance |
| `notarize.js`, `signWin.js`, `.travis.yml`, `appveyor.yml`, `pi-install.sh`, `pi-shortcut.desktop` | Inherited build/release/install automation | Keep separate from ordinary verification; active platform support is not established |
| `BACKUPS OF MACROS FROM FORUM/`, `app/sample-macros/` | Historical compatibility examples / maintained samples | Samples demonstrate executable macro dependencies; historical examples are not loaded as application source |
| `app/wizards/flashingtool/`, `app/wizards/mailinglist_unused/`, root `todo`, backup-named assets | Historical/inactive candidates | Main HTML comments out old flasher; registration not loaded there. References and licensing must be checked before removal |
| `CHANGELOG.txt` | Maintained release notes with retained upstream history | Add CBC changes at the top; preserve historical entries |
| `docs/` screenshots, `api.doc` | Historical documentation/data | Screenshots reflect upstream; `api.doc` is not an executable/current contract |
| `dist/`, `node_modules/`, runtime upload data | Build/install/runtime output | Ignored; not maintained source. Do not confuse root firmware binaries with replaceable build output |

For ordinary application searches, start with `index.js`, `grblStrings.js`, `app/js/`, `app/wizards/`, `app/jog/`, `app/index.html`, `app/lib/3dview/`, and the CNC mode. Expand into vendor candidates when investigating library integration. This deliberately includes maintained code under `lib` rather than blanket-excluding the directory.

### Packaged path interface

`npm run package` uses the independent [unsigned configuration](../electron-builder.unsigned.json), with the runtime allowlist and explicit native/firmware/tool unpack rules described above. `package.json.build` retains historical release settings, broad file inclusion, `extraFiles: ["ssl"]`, and unpack rules for root `*.bin` and esptool executables; ordinary packaging does not use it. The inherited `ssl`/`firmware` globs do not establish that those directories exist; startup currently reads TLS from root files.

Flashing code rewrites `app.asar` to `app.asar.unpacked` for tools, bootloaders, partition tables, and firmware paths. Interface images may be downloaded into the user-data upload directory. AVR `flashGrbl` retains commented-out implementation and refers to inherited tooling assumptions. A source-file move needs both reference checks and packaged-path tests; a successful TypeScript build alone cannot establish correctness.

## Independent-project configuration to migrate

The visible product name is **CBC** (`package.json` productName, Electron name, desktop/mobile titles, and app messages). The splash uses `app/img/CBC.svg`, supplied by the maintainer. Electron explicitly retains the `OpenBuildsCONTROL` directory under `appData` for both `userData` and `sessionData`, preserving existing uploads and browser storage; an explicit `--user-data-dir` override still takes precedence. Package name, appId, Windows AppUserModelId, origins, external support/integration links, attribution and signing configuration remain unchanged. Inherited application update endpoints are removed and automatic updates are disabled; firmware downloads remain separate. The supplied SVG is not yet used for packaged application/tray icons. Packaged branding remains unverified.

| Concern | Current sources | Migration constraint |
| --- | --- | --- |
| Package/repository/support | `package.json`; `README.md`, `CONTRIBUTING.md`, `SECURITY.md`; error dialog text in `index.js` | Confirm fork-owned support/release destinations; keep legitimate external product/documentation links distinct from project support |
| Application updates | Removed upstream feed, dependency, renderer release/changelog/stats lookups and install prompt; `index.js` retains disabled-update replies | Disabled in all builds; establish and test CBC-owned hosting, signing and publishing before re-enabling |
| Application identity and persistence | `package.json` name/productName/appId; `index.js` AppUserModelId and `getPath('userData')` | Renaming can select a new profile, change file associations and installed-app identity; preserve/export/migrate preferences and macros |
| macOS signing identity | `notarize.js`, `package.json.build`, `build/entitlements.mac.plist`, CI | Notarization bundle ID (`app.openbuilds.control`) differs from builder appId (`openbuilds.control`); reconcile deliberately with project-owned credentials |
| Windows signing / release publishing | `signWin.js`, inherited builder publish configuration; separate `electron-builder.unsigned.json` | Inherited publishing workflow and certificate-content logging removed; credential-free PR checks and local unsigned packaging are separate. Windows artifact/startup evidence and project-owned tagged releases remain pending |
| TLS and network exposure | Root PEM files; `index.js` listeners/CORS; renderer Node integration settings | Establish owned TLS/trust and access policy; validation schemas alone do not authorize machine operations |
| Pi and older platform automation | `pi-install.sh`, `pi-shortcut.desktop`, `.travis.yml`, `appveyor.yml`, `electron-builder/` | Upstream downloads/clone paths, machine-modifying steps and stale assumptions need review; do not present as verified setup |
| License and attribution | `LICENSE`, `package.json.license`, `build/licence.txt`, library headers, copied wizard/macro code | Retain notices and review distribution obligations before replacing assets or publishing |

Choose project identity and supported platforms in the relevant implementation milestone rather than inferring them from this directory's name. Update [features.md](features.md) when those decisions affect retained consumers.
