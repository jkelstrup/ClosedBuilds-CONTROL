# Maintainability plan

## Direction

Make this repository easy for a human or AI agent to navigate, change, and verify. The target is a set of **deep modules**: substantial behavior behind small, explicit interfaces, with related implementation and tests located together.

Decisions agreed during planning:

- **Independent ownership.** CBC is its own project, not an upstream-tracking fork. Treat OpenBuilds CONTROL as an abandoned historical baseline, with no dependency on upstream maintenance or synchronization; compatibility with future upstream changes is not a constraint. See [project identity](README.md#independent-project).
- **TypeScript.** Use TypeScript for new and extracted modules, migrating in working increments.
- **Feature preservation.** Preserve existing workflows initially. Inventory features before deciding which to retire.

This is an implementation roadmap, not a description of architecture or commands already available. Milestone 1 is complete as a source-inspection baseline; milestone 2 is in progress with locked installation/native loading, strict tooling/browser builds, and source/unsigned directory-package startup smoke checks verified on macOS arm64. Milestones 3–6 are pending. Full desktop workflows, installers, broader platform support, and hardware behavior have not been validated. See [verification status](docs/testing.md) for the evidence and remaining gaps.

## What makes changes difficult today

| Observation | Evidence | Consequence |
| --- | --- | --- |
| Runtime responsibilities are intertwined | `index.js` is 4,026 lines and starts servers at module load; it owns Electron windows, Socket.IO handlers, USB/TCP connections, controller parsing, job queues, and flashing | Importing behavior for a test also starts unrelated infrastructure; changes require broad context |
| State and dependencies are implicit | `app/js/websocket.js` is 1,244 lines; `app/js/main.js`, jogging, keyboard handling, and wizards share globals | Agents must reconstruct ownership and script order before editing |
| Markup contains application behavior | `app/index.html` is 1,956 lines, with inline command generation, event handlers, and ordered script tags | A feature's behavior is scattered across HTML and JavaScript |
| Verification is not established | `package.json` has placeholder `start` and `test` scripts that exit successfully; no first-party automated test suite was found | Successful commands give no evidence of correctness |
| Installs and releases depend on inherited assumptions | `.gitignore` excludes `package-lock.json`; a dependency uses `latest`; `.github/workflows/build.yml` runs on push and requests release behavior with signing setup | Reproducing failures and validating ordinary changes is difficult |
| Source ownership is unclear | 447 of 754 tracked files live in `app/lib/`; that directory includes customized viewer code and an Ace CNC mode | Broad searches are noisy, and blanket vendor exclusions could hide maintained code |
| Orientation is sparse | `README.md` lacks setup steps; `AGENTS.md` only covers Git and questions; `api.doc` is example data | Every new session repeats architectural discovery |
| Persistent and external contracts are informal | Numeric connection states in `index.js`, string-named socket events, scattered localStorage keys, JavaScript macros, and hard-coded upstream URLs | Structural changes can break consumers or user data without an obvious type error |

File sizes and counts are a planning snapshot, not ongoing quality targets. Optimize for locality and explicit ownership rather than arbitrary file-size limits.

## Target structure and ownership

Use one package initially, with explicit TypeScript imports and enforced dependency rules. Introduce directories as their first implementation lands.

```text
src/
  desktop/               Electron lifecycle, windows, OS integration, updates
  server/                HTTP and Socket.IO adapters; application startup
  machine/               Controller session, protocol parsing, streaming, state
    transports/          Serial, TCP, and simulated controller adapters
  contracts/             Shared command/event schemas and transport-facing types
  features/              Settings, probing, macros, flashing, jobs, other workflows
  renderer/              UI entry points and feature-local views/controllers
  viewer/                Maintained G-code preview and worker implementation
resources/               Firmware, controller profiles, icons, packaged tools
vendor/                  Retained third-party code and documented local patches
scripts/                 Development, verification, and packaging commands
tests/
  fixtures/              Controller transcripts, G-code, saved-data examples
  integration/           Cross-module and adapter behavior
  e2e/                   Desktop and browser workflows using simulation
docs/
  architecture.md        Runtime map, ownership, dependency rules, vocabulary
  development.md         Setup, workflows, troubleshooting, asset provenance
  testing.md             Verification selection, simulation, hardware coverage
```

Module behavior tests live next to the implementation they exercise. The root `tests/` directory holds shared fixtures and cross-module scenarios. Feature-specific documentation belongs beside the feature when it explains invariants that types and tests cannot express.

### Interfaces that earn their place

| Module | Owns | Interface and verification |
| --- | --- | --- |
| Machine control | Connection lifecycle, controller state, command ordering, acknowledgement accounting, job lifecycle | Typed commands and state/events; callers never manipulate queue pointers or transport objects. Test through commands, received controller input, and observable output |
| Controller protocol | Parsing replies, firmware capabilities, command encoding | Parse/encode results independent of DOM, Socket.IO, and Electron; fixture-driven behavior tests |
| Transport | Byte delivery, connection events, close/error semantics | Serial, TCP, and simulation adapters satisfy one interface; preserve real-time bytes and framing explicitly |
| Application server | HTTP routes and socket delivery | Validate external payloads, invoke feature/machine interfaces, serialize results; integration tests use actual server adapters with a simulated controller |
| Desktop | Windows, file dialogs, application lifecycle, updater | Explicit startup/shutdown and desktop operations; feature logic can run without importing Electron |
| Feature workflows | Settings, probing, macros, flashing, and other user operations | Small workflow-specific interfaces; UI consumes results instead of reconstructing controller behavior |
| Renderer | Display state, user interaction, view-local state | One typed client for machine commands/events; views do not own authoritative machine state |

Dependency rules:

- `contracts` is runtime-neutral. It supplies executable payload schemas with inferred types where validation is needed, avoiding separately maintained type/schema copies.
- `machine` depends on protocol logic, contracts, and explicit transport/clock dependencies. It does not import the server, renderer, or desktop.
- Feature workflows use machine interfaces. The machine implementation does not depend on features.
- Server and desktop startup compose implementations. Renderer code depends on the client contract rather than server implementation files.
- UI-specific feature code stays in the renderer; workflow logic remains usable without a DOM. Imports across modules use their declared interface, not implementation internals.
- Add adapters where behavior actually varies: serial/TCP/simulation, browser persistence/tests, and process execution/tests. Keep ordinary deterministic code as functions rather than introducing a generic dependency-injection framework.

Retain Electron, Express, Socket.IO, and the existing UI libraries through the first extractions. Establish the runtime and language conventions in milestone 2, including explicit build outputs for Electron, browser code, and workers. Later dependency replacements become bounded changes with behavioral evidence.

## Implementation milestones

Each milestone should land as small, reviewable changes. Follow dependencies below; within a milestone, finish one working slice before expanding it.

### 1. Establish the project map and preservation baseline

**Purpose:** Give the next agent a reliable starting point and make retained behavior explicit.

- [x] Expand `README.md` with the project purpose, current development entry point (`npm run run-local`), and links to development and architecture documentation. Record prerequisites only after verifying them. See [README.md](README.md) and [setup status](docs/development.md#current-setup-status).
- [x] Document the actual startup path, HTTP/Socket.IO flow, serial/TCP flow, renderer entry points, worker loading, and persistence locations in [docs/architecture.md](docs/architecture.md).
- [x] Build a feature inventory covering desktop and browser access, mobile jog, USB/TCP, firmware variants, jobs and recovery, probing/calibration, settings, G-code/JavaScript macros, preview, flashing, Interface USB preparation, and update/install workflows. Record entry points, known consumers, and verification status. See [docs/features.md](docs/features.md).
- [x] Inventory socket events, HTTP routes, status fields, localStorage keys, macro globals, and packaged resource paths. Treat `api.doc` as an example to reconcile against code, not an authoritative specification. See [docs/contracts.md](docs/contracts.md) and [packaged paths](docs/development.md#packaged-path-interface).
- [x] Keep root `AGENTS.md` short: navigation pointers, executable verification entry points as they become available, and existing workflow rules. Add scoped instructions only where a subtree has distinct constraints. Give each pointer an explicit trigger, such as “For controller or streaming changes, read …”. See [AGENTS.md](AGENTS.md); no extra scoped files needed yet.
- [x] Classify first-party, customized third-party, unmodified vendor, generated, binary, and historical files. Specifically inspect `app/lib/3dview/`, the viewer worker, and the Ace CNC mode before configuring exclusions. See [classification and provenance gaps](docs/development.md#source-and-resource-classification); vendor candidates are not asserted to be unmodified.
- [x] Record independent-project configuration to migrate: repository/support URLs, update feeds, application identity, signing, and user-data location. Preserve inherited license and attribution requirements. See [configuration inventory](docs/development.md#independent-project-configuration-to-migrate).

**Complete when:** A fresh session can locate a feature's entry point, state owner, dependencies, and current verification method from the documentation. Every inventoried feature is explicitly retained or marked for a later decision; unknown behavior is labeled unknown.

**Baseline evidence:** Documentation links and literal socket-event/HTTP-route/localStorage inventories were cross-checked against repository files; whitespace checks passed. Application behavior is unchanged. All feature runtime/hardware checks remain explicitly unverified in `docs/features.md` and `docs/testing.md`. Next: milestone 2, starting with toolchain compatibility and a locked install.

### 2. Make installation and checks trustworthy

**Depends on:** 1.

- [x] Select and pin a supported Node/npm toolchain after checking Electron and native serial dependency compatibility. Commit the npm lockfile, remove its ignore rule, and replace floating `latest` dependencies with deliberate versions. Declare directly imported dependencies explicitly.
  - Installation slice implemented: Node 24.22.1/npm 11.19.1, lockfile added and unignored, floating `latest` pinned, and direct parser/notarize imports declared. `npm ci`, dependency-tree validation, and `npm run verify:install` passed on macOS arm64 in host Node and Electron's Node mode. See [evidence and security gaps](docs/testing.md#locked-installation-slice-milestone-2). Full desktop/platform support and security modernization remain separate work.
- [x] Establish TypeScript builds for extracted modules and a small supported toolset: strict TypeScript, ESLint, Prettier, Vitest, and Playwright for cross-process/browser workflows. Pin compatible versions when implementing. Existing JavaScript remains runnable during migration.
  - Exact-pinned strict tooling and Playwright now check tooling, an extracted renderer title module, and built preview-worker loading in isolated Chromium. esbuild produces executable browser/worker assets while the legacy app remains in place. See [tooling evidence](docs/testing.md#strict-tooling-checks-milestone-2) and [runtime-build evidence](docs/testing.md#browser-runtime-builds-milestone-2).
- [x] Define module resolution and output formats explicitly; document how legacy CommonJS code loads extracted modules and how renderer/worker assets are built and served.
  - Tooling uses NodeNext/ES2022 CommonJS in `dist/checks/`; fixture tests verify legacy `require()` compatibility. Renderer modules use ESNext/Bundler resolution and classic IIFE output targeting Chromium 110 in `app/generated/`, served by the existing static root. The built classic worker retains its external Three.js import and non-strict semantics. See [output contracts](docs/development.md#browser-and-worker-output) and [build evidence](docs/testing.md#browser-runtime-builds-milestone-2). Installed packaging remains unverified.
- [x] Replace placeholder scripts with real commands. Proposed command contract: `npm run dev` starts the app; `npm test` runs deterministic behavior tests; `npm run lint`, `npm run typecheck`, and `npm run build` verify their respective concerns; `npm run check` runs the fast aggregate. Add `npm run test:e2e`, `npm run dev:sim`, and `npm run package` when their implementations exist.
  - All applicable commands now execute real checks/builds/startup. `package` produces a host-only unsigned directory artifact with publishing/signing disabled; `verify:package` inspects resources, and gated `test:desktop` verifies source/package startup on macOS. `dev:sim` remains correctly deferred until simulation exists in milestone 3. See [packaging/startup evidence](docs/testing.md#unsigned-directory-package-and-desktop-startup-milestone-2).
- [x] Apply strict checks to migrated code immediately. Track legacy exclusions explicitly and shrink them with each migration. Format files when moving them into the checked scope, keeping mechanical formatting distinguishable from behavior changes.
  - Tooling, `src/renderer/`, and browser/desktop tests are strictly checked and formatted; legacy source/resource exclusions are explicit in [development guidance](docs/development.md#checked-scope-and-migration-exclusions). Startup, build/check, browser, and unsigned packaging commands are implemented. Simulation remains intentionally absent.
- [ ] Add PR CI using locked installs and the same local commands. Separate ordinary verification/unsigned packaging from tagged release publishing and signing. Replace inherited release configuration with configuration owned by this project.
   - Before re-enabling application updates, establish CBC-owned release hosting/feed, signing and publishing, and verify installed-user migration without any upstream binary replacement. Application updates remain disabled until that work is explicitly implemented and verified.
   - Credential-free verification workflow added for Linux/macOS/Windows using the pinned toolchain, `npm ci`, dependency-tree validation, `npm run check`, and `npm run verify:install`. Each runner now also builds and inspects a host unsigned directory package without uploading artifacts or launching the app. Inherited push-to-release/signing workflow (including certificate-content logging) removed; no release workflow is enabled. Unsigned packaging is separate from inherited release configuration. Hosted CI/package verification now passes on all three runners; project-owned tagged publishing remains deferred. See [CI boundary](docs/development.md#pull-request-verification-and-release-boundary).
- [ ] Verify local and packaged startup on the retained platform matrix. Modernize the Electron/native dependency toolchain in a dedicated change where needed, with startup and packaging evidence.
   - Hosted PR verification passes on Linux/macOS/Windows at `3e3bfb4`: locked installs, all 53 tests, native loading, unsigned packaging and resource inspection; Linux also passes three isolated browser checks. The preceding Windows CRLF and ASAR lookup failures are fixed with regression coverage, establishing CI failure propagation as well as successful verification. Desktop/platform-support and release gaps remain open. See [hosted evidence](docs/testing.md#first-hosted-platform-verification-milestone-2).
  - Initial Electron 23 source and unsigned directory-package startup/assets verified on macOS arm64, with disposable profiles, disconnected status, real HTTP/worker delivery and port cleanup. Resource inspection verifies firmware/tools, Interface data, and explicit native unpacking. No installed/signed release, Windows/Linux/x64, full workflow, or hardware evidence. See [baseline evidence and gaps](docs/testing.md#unsigned-directory-package-and-desktop-startup-milestone-2).
  - Dedicated runtime upgrade: Electron 45.1.0 replaces 23.3.13, with explicit binary installation and unchanged Node-API serial dependencies. Locked install, checks, browser tests, native loading, unsigned packaging/resource inspection, and gated source/package startup pass on macOS arm64. Desktop checks now assert the exact pinned Electron version. Builder/updater/security modernization and other platform evidence remain open; see [upgrade evidence](docs/testing.md#electron-runtime-modernization-milestone-2).
   - Packaging toolchain upgrade: electron-builder 26.18.0 uses its maintained native rebuild implementation; redundant legacy build dependencies and the global notarize override are removed. Unsigned Windows signing configuration follows the new schema. Locked install, 42 tests, native loading, unsigned packaging/resource inspection, and gated source/package startup pass on macOS arm64. Audit findings drop from 14 to three high; updater, release configuration, other platforms and remaining security work stay open. See [packaging toolchain evidence](docs/testing.md#packaging-toolchain-modernization-milestone-2).
   - Inherited application updates disabled by explicit maintainer request: removed the updater dependency/feed, upstream renderer release/changelog/statistics fetches and install prompt. Legacy update socket requests only report that CBC automatic updates are not configured; default publishing is null. CBC-owned update hosting/signing/publishing remains deferred. See [disabled-update evidence](docs/testing.md#inherited-application-updates-disabled) and the [interim dependency-upgrade checks](docs/testing.md#updater-dependency-modernization-milestone-2). Milestone 2 remains open.

   - Remaining audited dependency retired: replaced `ip.address()` with a tested Node-based local IPv4 selector, including legacy startup/status/Interface and standalone scan consumers. Locked install, 51 tests, native loading, unsigned packaging and resource inspection pass on macOS arm64; `npm audit` reports zero findings. No application startup or network scans performed. See [local-address evidence](docs/testing.md#local-address-dependency-retirement-milestone-2); platform/hosted CI and release-security gaps remain open.

**Complete when:** A clean checkout has a documented reproducible install and startup; a deliberately failing test/type error makes local checks and PR CI fail; ordinary verification requires no release credentials. Record the actual tested OS/architecture matrix and any outstanding platform gaps.

### 3. Extract machine control and add deterministic simulation

**Depends on:** 2. This is the first major architectural milestone.

The minimal selectable [Dev Controller](docs/development.md#dev-controller) unlocks connected-state UI development through the legacy adapter. It is not the behavioral simulator or machine extraction below; these checklist items remain pending.

- [ ] Remove the temporary Dev Controller stub and its integration/build/package wiring once the milestone-3 simulator supports connected-state UI development; retain that workflow through the replacement simulator.

- [ ] Establish fixture-backed characterization tests for current parsing and streaming behavior. Introduce only the minimal callable seam necessary to test legacy behavior without starting Electron or servers; capture expected outputs before changing the implementation.
- [ ] Start with controller reply parsing (`parseFeedback`, `gotModals`, firmware identification, alarm/error lookup), then extract transport lifecycle and job streaming (`machineSend`, `BufferSpace`, `send1Q`, queue operations, pause/resume/stop).
- [ ] Make state ownership explicit. Model connection, controller-reported execution, and host job lifecycle separately where they represent different facts. Translate legacy numeric status values in a compatibility adapter while existing clients still use them.
- [ ] Specify queued versus real-time commands, byte accounting including terminators, acknowledgement/error handling, disconnect cleanup, timeout behavior, and completion semantics. Distinguish host queue exhaustion, controller acknowledgement, and actual motion completion.
- [ ] Add serial and TCP adapters plus a deterministic simulated controller. Support scripted replies, partial input, delayed acknowledgements, errors/alarms, disconnect/reconnect, and controlled time. Simulation uses the same machine interface as real transports.
- [ ] Move timers, subscriptions, and cleanup into an explicit session lifecycle. Importing a module performs no startup I/O; closing a session releases listeners and timers.
- [ ] Make one vertical path work end to end: existing UI → existing socket contract → extracted machine module → simulation → status displayed in the UI. Expose it through `npm run dev:sim` and an integration test.

**Complete when:** Machine behavior tests run in a plain Node process without Electron, serial hardware, or network services. The existing app uses the extracted implementation. Scenarios cover buffer limits, real-time priority, pause/resume/stop, alarms/errors, completion, and disconnect cleanup, with fixtures for the retained firmware families.

Characterization captures observed behavior; it does not declare every legacy behavior correct. Record discrepancies separately and fix them with explicit regression tests rather than silently changing semantics during extraction. Simulator evidence and physical-controller evidence remain distinguishable in the feature inventory.

### 4. Make cross-runtime contracts and startup explicit

**Depends on:** 3.

- [ ] Extract HTTP/Socket.IO registration from `index.js` into server adapters using shared command/event schemas. Validate incoming data and define errors, ordering expectations, subscription disposal, and reconnect behavior.
- [ ] Give the renderer one typed client module; replace scattered raw event names as each feature migrates. Keep compatibility translation in one place while desktop, mobile, and browser consumers transition.
- [ ] Extract Electron windows, dialogs, tray behavior, OS integration, and updates into `desktop`. Reduce the entry point to configuration, construction, startup, and shutdown.
- [ ] Centralize runtime configuration: ports, logging, resource paths, development/simulation mode, and release endpoints. Keep controller logic independent of package layout.
- [ ] Add adapter-level integration tests for retained HTTP/socket consumers, including upload/run-job flows, reconnects, and multiple observing clients.

**Complete when:** A command/event shape change is checked against both producers and consumers. Server tests can start and stop on isolated ports without Electron. Application startup/shutdown is explicit, and the entry point contains no parsing or streaming logic.

### 5. Migrate features and renderer state in vertical slices

**Depends on:** 4.

Suggested order: connection/status and jogging → job controls → settings and persistence → probing/calibration/tool change → macros → preview → flashing/USB preparation → remaining inventoried workflows. Adjust order when the dependency map reveals a smaller complete slice.

For each feature:

- [ ] Put behavior behind a typed feature interface and move related view code into a renderer feature directory. Replace global dependencies and inline HTML command generation with explicit imports and event bindings.
- [ ] Separate authoritative machine state from view-local state. Derive display values rather than duplicating machine state across views.
- [ ] Move persistent data access behind typed, versioned read/write operations. Test migration of existing values, defaults, malformed saved data, and import/export round trips. Account for changes to browser origin and Electron user-data paths.
- [ ] Preserve desktop, browser, and mobile consumers identified in milestone 1. Add behavior tests for the feature's substantive rules and a small end-to-end scenario where cross-runtime interaction matters.
- [ ] Remove the replaced implementation and temporary compatibility code when its last consumer migrates. Update the feature inventory and architecture pointers in the same change.

Specific migration concerns:

- **JavaScript macros:** Existing macros can depend on global functions and DOM behavior. Inventory supported usage, define a documented macro interface, and retain a focused compatibility adapter until existing samples and imported macros have a tested migration path.
- **Preview:** Move maintained worker/parser code out of vendor classification; preserve worker resource loading and large-file responsiveness. Use representative arcs, units, axes, and large G-code fixtures.
- **Firmware and profiles:** Separate firmware selection and command construction from process execution. Verify arguments and bundled paths using a recording process adapter; record real flashing verification separately.
- **Settings and generated commands:** Verify units, coordinate modes, defaults, and firmware-specific settings with representative fixtures rather than tests that merely mirror implementation calls.

**Complete when:** Every retained feature has an owner, typed interface, and documented verification path. First-party renderer code uses module imports; retained macro compatibility globals are explicit. There is one active implementation per migrated workflow, and saved-data migration tests pass.

### 6. Finish repository cleanup and enforce the new structure

**Depends on:** The relevant slices in 3–5. Asset classification from 1 can be used earlier without moving files prematurely.

- [ ] Move resources and retained vendor files to their documented locations. Record origin/version/license, local modifications, and update procedures. Package dependencies where practical; keep customized code discoverable as maintained source.
- [ ] Replace broad packaging globs with an explicit runtime/resource inventory. Verify renderer assets, workers, firmware, executable tools, and unpacked paths from an installed/packaged build.
- [ ] Remove obsolete scripts, historical backup copies, unused libraries, and superseded CI configuration after checking references and packaging. Keep useful sample macros as documented examples; use Git history for retired implementations.
- [ ] Enforce dependency rules with lint/import checks and prohibit new implicit globals in first-party code. Keep vendor/generated exclusions consistent across search guidance, formatting, linting, and tests.
- [ ] Complete the move from inherited project URLs/update configuration to project-owned values, with an explicit migration path for installed users where application identity changes.
- [ ] Audit documentation against the final commands and layout. Add focused rationale records only for consequential decisions; link them from the relevant module documentation.

**Complete when:** Searches primarily find maintained source, installed builds contain the required resources, dependency checks catch forbidden imports, and the feature inventory accounts for every original workflow as migrated or explicitly retired by a separate decision.

## Verification and progress measures

Use observable outcomes rather than a blanket coverage percentage:

| Outcome | Evidence |
| --- | --- |
| An agent can orient quickly | Given a representative change, it can identify the owner, interface, and targeted check from the repo map in roughly five minutes |
| Changes have a fast feedback loop | Measure `npm run check` in CI; target under two minutes excluding dependency installation, with packaging/end-to-end checks separately visible |
| Machine behavior is independently testable | Deterministic tests import machine modules without launching processes or opening real ports |
| Important failures are exercised | Fixtures/scenarios cover queue limits, alarms, malformed input, reconnects, interrupted jobs, persistence migrations, and relevant firmware differences |
| Simulation enables end-to-end work | Desktop and browser clients can connect, jog, run/pause/stop a sample job, and display errors against simulation |
| Physical behavior is accounted for | The feature inventory distinguishes simulated coverage from tested controller/platform combinations and records gaps |
| Structural complexity is shrinking | Migrated features eliminate legacy globals, duplicate implementations, and callers reaching into module internals |

## How to execute this plan

Begin with milestone 1. The first implementation changes should establish the map, then locked installation/working checks, then the parser characterization slice. This makes subsequent architectural decisions cheaper to verify.

For each implementation task, record:

1. **Outcome:** The behavior or maintenance problem being addressed.
2. **Context:** Source paths, relevant interface, invariants, and prerequisite milestone.
3. **Change:** The smallest complete slice, including compatibility and persistent-data effects.
4. **Evidence:** Exact checks run, representative scenarios, and any remaining hardware/platform gap.
5. **Completion:** Replaced code removed where applicable, documentation updated, and the corresponding checklist item checked with a reference to the change.

Keep this file as the roadmap. Put current architecture in module documentation, commands in `package.json`, and executable behavior in tests so the plan does not become a second, stale source of truth.

For consequential architectural decisions and reversals, follow the [ADR process](docs/adr/README.md). The agreed TypeScript migration direction is recorded in [ADR 0001](docs/adr/0001-incremental-typescript-migration.md); acceptance records intent, not implementation completion.
