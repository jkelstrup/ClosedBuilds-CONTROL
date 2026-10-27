# Verification status and selection

## Current evidence

The milestone-1 baseline is documentation from source inspection. No clean dependency install, Electron launch, browser workflow, package, controller connection, movement, or flashing operation has been validated. There is no automated first-party behavior suite or controller simulator yet. `npm test` and `npm start` are successful-exit placeholders and **must not be reported as passing application checks**.

For documentation changes, use `git diff --check`, verify relative links against files, and cross-check named symbols, events, routes, and keys against source. These checks establish documentation consistency, not application correctness. Milestone 2 will establish reproducible installation and real checks; milestone 3 adds controller-free machine verification.

Record evidence as: commit, exact command/scenario, OS/architecture, toolchain, controller/firmware or simulator, outcome, and remaining gap. Keep source inspection, simulated behavior, packaged behavior, and physical-controller evidence distinct in [features.md](features.md).

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

- Supported Node/npm and OS/architecture matrix are unestablished. Inherited CI/build targets are intentions, not test results.
- Local UI flows have been located, but out-of-repo CAM, socket, HTTP, and macro consumers are unknown.
- Library versions/local patches and firmware build provenance are not fully established.
- Mobile PWA registration/cache paths and non-Electron/Pi startup are unverified.
- Protocol branches and firmware UI choices can outlive working implementations. Preserve them until characterization or an explicit retirement decision resolves them.

Do not clear these gaps solely because a broad smoke test succeeds. Close each with targeted evidence or a recorded scope decision.
