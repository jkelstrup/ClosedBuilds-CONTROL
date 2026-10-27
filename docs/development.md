# Development and repository ownership

## Current setup status

The repository is an independently maintained continuation, but application identity and release infrastructure still use inherited OpenBuilds values. [PLAN.md](../PLAN.md) separates mapping from toolchain modernization; [architecture.md](architecture.md) describes what actually starts today.

- `package.json` defines `npm run run-local` as `electron .`. After dependencies are installed, this is the desktop launch entry point.
- Use Node **24.22.1** (`nvm use`, using `.nvmrc`) and npm **11.19.1**, also declared in `package.json`. Install with `npm ci` from the checked-in lockfile. Its `postinstall` runs `electron-builder install-app-deps` and may download/rebuild native dependencies. Do not use `--ignore-scripts` for a complete installation.
- Run `npm run verify:install` after installing. This loads serialport's native binding and checks split-line framing in host Node and in Electron's Node mode. It never imports the application, enumerates/opens ports, or starts servers/windows/updaters. This is an installation check, not an application behavior suite.
- The first verified combination is macOS arm64, Node 24.22.1/npm 11.19.1, Electron **23.3.13** (embedded Node 18.12.1), serialport **12.0.0**, and native bindings **12.0.1**. The native package uses Node-API; loading under both runtimes passed. Native source compilation, other platforms, desktop startup, and packaging remain unverified.
- Electron stays on the final 23.x patch within the inherited major for this bounded installation baseline, **not** as a supported/security-current Electron recommendation. Major Electron/native/build upgrades remain a dedicated milestone-2 change. Other inherited dependency ranges are resolved by the lockfile. `electron-builder-notarize` is pinned to 1.5.2 instead of `latest`; direct imports of `@electron/notarize` and `@serialport/parser-readline` are now declared. npm `overrides` replaces the previously ineffective Yarn `resolutions` for notarize 2.3.2.
- `npm audit` reports **16 affected packages (15 high, 1 critical)** in this initial lock. These include Electron, updater/build tooling, `ip`, and transitive `tar`. Do not run `npm audit fix --force` blindly or treat this baseline as release-ready. Resolve these in targeted modernization/security work with runtime evidence. Inherited Node 20 CI and release automation have not yet been modernized.
- `npm start` and `npm test` print errors but exit successfully. There is no aggregate check, controller simulator, or established automated application test suite yet. See [testing.md](testing.md).

Do not launch the app merely to inspect architecture: startup opens network listeners, polls serial ports, and can fetch upstream update data. Use a trusted isolated network, disconnected controllers, and a disposable profile for future runtime checks. Do not run `scan.js`, `pi-install.sh`, signing scripts, or publishing CI as verification; they scan networks, modify systems, or access release infrastructure.

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
| `notarize.js`, `signWin.js`, `.github/workflows/`, `.travis.yml`, `appveyor.yml`, `pi-install.sh`, `pi-shortcut.desktop` | Inherited build/release/install automation | Keep separate from ordinary verification; active platform support is not established |
| `BACKUPS OF MACROS FROM FORUM/`, `app/sample-macros/` | Historical compatibility examples / maintained samples | Samples demonstrate executable macro dependencies; historical examples are not loaded as application source |
| `app/wizards/flashingtool/`, `app/wizards/mailinglist_unused/`, root `todo`, backup-named assets | Historical/inactive candidates | Main HTML comments out old flasher; registration not loaded there. References and licensing must be checked before removal |
| `docs/` screenshots, `CHANGELOG.txt`, `api.doc` | Historical documentation/data | Screenshots/changelog reflect upstream; `api.doc` is not an executable/current contract |
| `dist/`, `node_modules/`, runtime upload data | Build/install/runtime output | Ignored; not maintained source. Do not confuse root firmware binaries with replaceable build output |

For ordinary application searches, start with `index.js`, `grblStrings.js`, `app/js/`, `app/wizards/`, `app/jog/`, `app/index.html`, `app/lib/3dview/`, and the CNC mode. Expand into vendor candidates when investigating library integration. This deliberately includes maintained code under `lib` rather than blanket-excluding the directory.

### Packaged path interface

`package.json.build` is authoritative for current packaging rules. It has broad file inclusion, `extraFiles: ["ssl"]`, and unpack rules for root `*.bin` and esptool executables. The `ssl`/`firmware` globs do not establish that those directories exist; startup currently reads TLS from root files.

Flashing code rewrites `app.asar` to `app.asar.unpacked` for tools, bootloaders, partition tables, and firmware paths. Interface images may be downloaded into the user-data upload directory. AVR `flashGrbl` retains commented-out implementation and refers to inherited tooling assumptions. A source-file move needs both reference checks and packaged-path tests; a successful TypeScript build alone cannot establish correctness.

## Independent-project configuration to migrate

No identities, endpoints, signing credentials, or stored data are changed in this baseline.

| Concern | Current sources | Migration constraint |
| --- | --- | --- |
| Package/repository/support | `package.json`; `README.md`, `CONTRIBUTING.md`, `SECURITY.md`; error dialog text in `index.js` | Confirm fork-owned support/release destinations; keep legitimate external product/documentation links distinct from project support |
| Update feed/changelog/stats | `dev-app-update.yml`; `app/js/updates.js`, `main.js`; `index.js` updater handlers | Prevent fork installations from receiving upstream binaries; test update ownership before enabling releases |
| Application identity and persistence | `package.json` name/productName/appId; `index.js` AppUserModelId and `getPath('userData')` | Renaming can select a new profile, change file associations and installed-app identity; preserve/export/migrate preferences and macros |
| macOS signing identity | `notarize.js`, `package.json.build`, `build/entitlements.mac.plist`, CI | Notarization bundle ID (`app.openbuilds.control`) differs from builder appId (`openbuilds.control`); reconcile deliberately with project-owned credentials |
| Windows signing / release publishing | `signWin.js`, `.github/workflows/build.yml`, builder publish configuration | CI currently runs on push with release requested and secret-dependent signing; separate PR checks/unsigned packages from authorized tagged releases; remove certificate-content logging |
| TLS and network exposure | Root PEM files; `index.js` listeners/CORS; renderer Node integration settings | Establish owned TLS/trust and access policy; validation schemas alone do not authorize machine operations |
| Pi and older platform automation | `pi-install.sh`, `pi-shortcut.desktop`, `.travis.yml`, `appveyor.yml`, `electron-builder/` | Upstream downloads/clone paths, machine-modifying steps and stale assumptions need review; do not present as verified setup |
| License and attribution | `LICENSE`, `package.json.license`, `build/licence.txt`, library headers, copied wizard/macro code | Retain notices and review distribution obligations before replacing assets or publishing |

Choose project identity and supported platforms in the relevant implementation milestone rather than inferring them from this directory's name. Update [features.md](features.md) when those decisions affect retained consumers.
