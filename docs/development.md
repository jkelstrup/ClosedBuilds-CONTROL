# Development and repository ownership

## Current setup status

This repository is CBC, an independent project rather than an upstream-tracking fork. [Project identity](../README.md#independent-project) defines how we treat the abandoned OpenBuilds baseline; inherited identifiers and release configuration are migration debt, not a dependency on upstream ownership or maintenance. [PLAN.md](../PLAN.md) separates mapping from toolchain modernization; [architecture.md](architecture.md) describes what actually starts today. User-facing changes are recorded in [CHANGELOG.txt](../CHANGELOG.txt), above the retained upstream history.

- `npm run dev` builds the TypeScript tooling and launches Electron with automatic reload/restart (see below). `npm start` and `npm run run-local` launch `electron .` without watchers. None of the verification commands launch CONTROL.
- Use Node **24.22.1** (`nvm use`, using `.nvmrc`) and npm **11.19.1**, also declared in `package.json`. Install with `npm ci` from the checked-in lockfile. Its `postinstall` runs `electron-builder install-app-deps` and may download/rebuild native dependencies. Do not use `--ignore-scripts` for a complete installation.
- Run `npm run verify:install` after installing. This loads serialport's native binding and checks split-line framing in host Node and in Electron's Node mode. It never imports the application, enumerates/opens ports, or starts servers/windows/updaters. This is an installation check, not an application behavior suite.
- The first verified combination is macOS arm64, Node 24.22.1/npm 11.19.1, Electron **23.3.13** (embedded Node 18.12.1), serialport **12.0.0**, and native bindings **12.0.1**. The native package uses Node-API; loading under both runtimes passed. A limited launch/browser UI smoke check also passed; native source compilation, other platforms, full desktop workflows, and packaging remain unverified.
- Electron stays on the final 23.x patch within the inherited major for this bounded installation baseline, **not** as a supported/security-current Electron recommendation. Major Electron/native/build upgrades remain a dedicated milestone-2 change. Other inherited dependency ranges are resolved by the lockfile. `electron-builder-notarize` is pinned to 1.5.2 instead of `latest`; direct imports of `@electron/notarize` and `@serialport/parser-readline` are now declared. npm `overrides` replaces the previously ineffective Yarn `resolutions` for notarize 2.3.2.
- `npm audit` reports **16 affected packages (15 high, 1 critical)** in this initial lock. These include Electron, updater/build tooling, `ip`, and transitive `tar`. Do not run `npm audit fix --force` blindly or treat this baseline as release-ready. Resolve these in targeted modernization/security work with runtime evidence. PR CI uses the pinned toolchain; inherited release automation has been removed, not modernized into an authorized release path.
- `npm run check` runs formatting, lint, strict type checking, deterministic toolchain tests, and the tooling build. Machine behavior tests and a controller simulator do not exist yet. See [testing.md](testing.md).

Do not launch the app merely to inspect architecture: startup opens network listeners, polls serial ports, and can fetch upstream update data. Use a trusted isolated network, disconnected controllers, and a disposable profile for future runtime checks. Do not run `scan.js`, `pi-install.sh`, signing scripts, or publishing CI as verification; they scan networks, modify systems, or access release infrastructure.

## Incremental TypeScript and local checks

### Automatic development reloads

Run `npm run dev` on a controller-free development machine. Edits under `app/` to HTML, CSS, JavaScript, JSON, images, and fonts reload the desktop window without restarting the shared server. This is a full page reload, not state-preserving HMR: unsaved editor contents and in-memory renderer state are lost. Standalone browser/mobile clients need a manual refresh.

Edits to `index.js`, `grblStrings.js`, `package.json`, or `dev-app-update.yml` quit and restart Electron, including its servers and machine state. Saves are debounced; a main-process restart takes priority over a renderer reload. Generated output, dependencies, documentation, and temporary editor files do not trigger reloads. Restart `npm run dev` manually after editing the development tooling itself or installing dependencies.

Ctrl+C stops the watcher and Electron. Quitting the app also stops the watcher. The launcher uses a private process IPC channel and `CONTROL_DEV_RELOAD=1`; the app accepts reload/quit messages only when unpackaged and launched with both. Normal startup and packaged apps do not enable this hook. The executable still launches with `electron .`, preserving application identity, profile, and origin. No reload endpoint or additional network listener is added.

Forward Electron flags with `npm run dev -- --user-data-dir=<temporary-profile>`. The launcher uses Node's recursive filesystem watcher; the pinned Node 24 host is required. Windows/Linux runtime behavior remains unverified.

### Verification commands

| Command | Current scope |
| --- | --- |
| `npm test` | Vitest in plain Node; toolchain, development watcher, and branding tests without application startup |
| `npm run typecheck` | Strict TypeScript for `scripts/**/*.ts`, `tests/toolchain/**/*.ts`, and `vitest.config.mts` |
| `npm run lint` | Type-aware ESLint for the same migrated TypeScript scope; warnings fail |
| `npm run format:check` | Prettier for migrated scripts/tests, workflows, toolchain config, and `package.json` |
| `npm run build` | Compile tooling to ignored `dist/checks/`; not a desktop package or browser bundle |
| `npm run check` | All five checks above, stopping at the first failure |
| `npm run verify:install` | Build, then run the compiled installation smoke check in host Node and Electron's Node mode |

TypeScript 5.9.3 is deliberately below the type-aware ESLint plugin's `<6.1` support ceiling. Tool versions are exact-pinned in `package.json` and the npm lock. The compiler uses `NodeNext` resolution/output and an ES2022 target; with this package's unchanged CommonJS identity, ordinary `.ts` modules emit CommonJS `.js`. `.mts` is reserved for ESM tooling configuration. `strict`, unchecked index access, and exact optional-property checks are enabled. Third-party declaration internals use `skipLibCheck`; application/tooling source is still checked. Node types target the host toolchain; code executed in Electron's embedded Node must also stay compatible with Node 18, as the installation smoke check verifies for its current imports.

`scripts/verify-install.ts` emits to `dist/checks/scripts/verify-install.js`; TypeScript copies its imported package manifest to `dist/checks/package.json`. The source is not executed directly. Existing CommonJS callers can use `require()` on emitted CommonJS modules after building; the toolchain suite exercises this with a temporary fixture. The development launcher likewise runs compiled tooling; the legacy application does not import generated output.

### Checked scope and migration exclusions

The first migrated production code is installation tooling, not a machine module. Legacy root JavaScript (`index.js`, `grblStrings.js`, scan/sign/notarize scripts), application HTML/JavaScript, maintained viewer/worker and CNC mode, vendor candidates, historical samples, shipped resources, and inherited release automation are deliberately outside the new strict/format scope. This does **not** classify maintained files as vendor or establish their correctness. `node_modules/` and generated `dist/` are excluded from linting.

When a module migrates, add its source/tests to the compiler, ESLint, Prettier, and Vitest scopes together and remove its replaced implementation. Do not mechanically format legacy files as part of unrelated behavior changes. Renderer and worker assets still use their original script tags/URLs; no browser bundler, renderer/worker output contract, Playwright suite, `dev:sim`, or packaging command exists yet. Establish those builds with their first executable consumer rather than shipping unused bundles.

### Pull-request verification and release boundary

`.github/workflows/check.yml` runs on pull requests, pushes to `main`, and manual dispatch. Each Linux (`ubuntu-24.04`), macOS (`macos-15`), and Windows (`windows-2025`) job loads Node from `.nvmrc`, verifies the npm version declared in `package.json`, and runs `npm ci`, `npm ls --depth=0`, `npm run check`, and `npm run verify:install`. Installation scripts remain enabled so native dependency loading is actually exercised. The npm cache stores download data, not `node_modules`; each job installs from the lockfile.

Jobs have read-only repository permissions, do not retain checkout credentials, and require no release secrets. They never import `index.js`, launch the application, open controller ports, sign, package, or publish. The runner matrix is a verification target, not a statement of desktop/platform support; record actual hosted results in [testing.md](testing.md). A failing command fails its job; configure required status checks in repository branch protection separately if merge blocking is desired.

The inherited push-to-release workflow, including certificate-content logging and the upstream build action, has been removed. There is intentionally **no release workflow**, including for tags. Unsigned packaging and explicitly authorized tagged releases must be established separately with project-owned destinations and credentials. Legacy builder/signing/update configuration remains in the source and must not be treated as safe release configuration.

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

`package.json.build` is authoritative for current packaging rules. It has broad file inclusion, `extraFiles: ["ssl"]`, and unpack rules for root `*.bin` and esptool executables. The `ssl`/`firmware` globs do not establish that those directories exist; startup currently reads TLS from root files.

Flashing code rewrites `app.asar` to `app.asar.unpacked` for tools, bootloaders, partition tables, and firmware paths. Interface images may be downloaded into the user-data upload directory. AVR `flashGrbl` retains commented-out implementation and refers to inherited tooling assumptions. A source-file move needs both reference checks and packaged-path tests; a successful TypeScript build alone cannot establish correctness.

## Independent-project configuration to migrate

The visible product name is **CBC** (`package.json` productName, Electron name, desktop/mobile titles, and app messages). The splash uses `app/img/CBC.svg`, supplied by the maintainer. Electron explicitly retains the `OpenBuildsCONTROL` directory under `appData` for both `userData` and `sessionData`, preserving existing uploads and browser storage; an explicit `--user-data-dir` override still takes precedence. Package name, appId, Windows AppUserModelId, origins, upstream links, attribution, signing configuration, and update endpoints remain unchanged. The supplied SVG is not yet used for packaged application/tray icons. Packaged branding remains unverified.

| Concern | Current sources | Migration constraint |
| --- | --- | --- |
| Package/repository/support | `package.json`; `README.md`, `CONTRIBUTING.md`, `SECURITY.md`; error dialog text in `index.js` | Confirm fork-owned support/release destinations; keep legitimate external product/documentation links distinct from project support |
| Update feed/changelog/stats | `dev-app-update.yml`; `app/js/updates.js`, `main.js`; `index.js` updater handlers | Prevent fork installations from receiving upstream binaries; test update ownership before enabling releases |
| Application identity and persistence | `package.json` name/productName/appId; `index.js` AppUserModelId and `getPath('userData')` | Renaming can select a new profile, change file associations and installed-app identity; preserve/export/migrate preferences and macros |
| macOS signing identity | `notarize.js`, `package.json.build`, `build/entitlements.mac.plist`, CI | Notarization bundle ID (`app.openbuilds.control`) differs from builder appId (`openbuilds.control`); reconcile deliberately with project-owned credentials |
| Windows signing / release publishing | `signWin.js`, builder publish configuration | Inherited publishing workflow and certificate-content logging removed; credential-free PR checks are separate. Unsigned packaging and project-owned authorized tagged releases remain pending |
| TLS and network exposure | Root PEM files; `index.js` listeners/CORS; renderer Node integration settings | Establish owned TLS/trust and access policy; validation schemas alone do not authorize machine operations |
| Pi and older platform automation | `pi-install.sh`, `pi-shortcut.desktop`, `.travis.yml`, `appveyor.yml`, `electron-builder/` | Upstream downloads/clone paths, machine-modifying steps and stale assumptions need review; do not present as verified setup |
| License and attribution | `LICENSE`, `package.json.license`, `build/licence.txt`, library headers, copied wizard/macro code | Retain notices and review distribution obligations before replacing assets or publishing |

Choose project identity and supported platforms in the relevant implementation milestone rather than inferring them from this directory's name. Update [features.md](features.md) when those decisions affect retained consumers.
