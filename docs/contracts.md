# Legacy contracts and migration constraints

Source-inspection baseline. These are existing interfaces to preserve or deliberately migrate, not validated schemas. Runtime behavior, external consumers, and malformed-input handling are unverified. `api.doc` contains historical example data: the current initializer and mutations in `index.js` take precedence.

## HTTP

All application routes are registered in `index.js`; static files come from `app/`. Socket.IO is attached to both HTTP and HTTPS. CORS/private-network headers are permissive; there is no established authorization seam for machine commands. Run development on a trusted, isolated network with controllers disconnected.

| Method/path | Input / behavior | Known consumer |
| --- | --- | --- |
| `GET /api/version` | JSON string with `application: "OMD"`, version, IP and selected HTTP port | Integration discovery; external callers unknown |
| `GET /activate` | Shows/focuses desktop UI, later broadcasts `activate` with hostname | External integration; no matching literal renderer listener found |
| `GET /upload` | Serves `app/upload.html` | Browser/manual integration |
| `POST /upload` | Formidable multipart upload; file is read by `readFile`, may populate G-code or workspace | Upload page / CAM integrations |
| `GET /gcode` | In-memory uploaded G-code; handler only sends when content does not start with `$` | `app/js/main.js` |
| `GET /workspace` | In-memory CAM workspace | Integration callers; local use must be checked before changes |
| `POST /runjob` | Multer multipart field `file`; reads file and invokes `runJob({isJob: true, data})` | External job execution; responds before job completion |
| `POST /uploadCustomFirmware` | Multer field `firmwareBin`; records uploaded path and returns it | Current flashing UI |

Responses are not a uniform success/error contract. Characterize them before replacing them; a successful upload response is not proof of job acceptance or completion.

## Socket events

Every application command listener below is in the `io.on('connection')` block in `index.js`. Main/mobile clients share `app/js/websocket.js`; additional emitters live in HTML, jogging/keyboard/servo scripts, wizards, and sample macros. Names are case-sensitive.

### Client → host listeners

| Group | Events | Existing payload conventions / implementation |
| --- | --- | --- |
| Connection/discovery | `scannetwork`, `connectTo`, `closePort` | Scan range; `{type, port, baud}` for USB, `{type, ip}` for telnet, or `{type: "dev"}` for the in-memory UI stub; closes shared port |
| Jobs/commands | `runJob`, `runCommand`, `pause`, `resume`, `stop` | Job `{data, isJob, completedMsg}`; command text; stop object `{stop, jog, abort}` (some callers send `false`) |
| Movement | `jog`, `jogXY`, `jogTo`, `setZero`, `gotoZero`, `setPosition`, `probe` | Jog comma-separated axis/distance/feed; XY object; jogTo coordinates/mode/feed; axis strings; coordinate object; probe direction/offset |
| Overrides and recovery | `feedOverride`, `spindleOverride`, `laserTest`, `clearAlarm`, `resetMachine` | Numeric/coercible overrides; laser object; alarm mode; reset. Inspect handler for exact conventions |
| Low-level/debug/SD | `saveToSd`, `setqueuePointer`, `forceQueue`, `serialInject`, `dump` | Datapack passed to `saveToSd` (no implementation found); direct pointer assignment; queue step; raw real-time write; console dump |
| Firmware | `flashGrbl`, `flashGrblHal`, `flashInterface`, `flashBLOX` | Port/file and variant-specific custom-image/erase options; inspect current flasher's emitted object before changing |
| Interface drive | `openInterfaceDir`, `writeInterfaceUsbDrive` | Native directory selection; `{drive, controller, ssid, psk}` copies resources and optional Wi-Fi configuration |
| Desktop | `openFile`, `gpuinfo`, `minimisetotray`, `minimize`, `maximize`, `fullscreen`, `quit` | Native dialogs/window/process operations, not independent browser implementations |
| Updater | `applyUpdate`, `downloadUpdate` | Quit/install or check/download; desktop updater instance. Both are no-ops in unsigned verification packages, which do not initialize an updater |
| External links | `openbuilds`, `openbuildspartstore`, `carveco`, `fabber`, `lightburn`, `vectric`, `opencam`, `opendocs`, `openforum` | Electron external browser actions |

No literal active UI emitters were found for some listeners (including `jogTo`, `setZero`, `gotoZero`, `setPosition`, `probe`, debug/SD commands, `resetMachine`, and `quit`). Their presence is not proof of a supported UI path; macros or external consumers may still rely on them. Current UI often generates equivalent G-code through `runCommand`/`runJob` instead.

### Host → clients

All listed emissions are in `index.js` via `io.sockets.emit`, broadcasting to clients, not scoped per requester.

| Group | Events | Payload / consumer |
| --- | --- | --- |
| State | `status`, `sysinfo` | Shared status object; system information. `websocket.js` listens; status broadcasts every 100 ms after a client connects |
| Firmware/settings | `grbl`, `features`, `machinename`, `fluidncConfig` | Firmware object, feature information, name, collected configuration; `websocket.js` |
| Job/file | `gcodeupload`, `queueCount`, `jobComplete` | File data/name; `[remaining, total]`; completion metadata/timestamps. `websocket.js` updates UI/history/recovery marker |
| Controller feedback | `data`, `ok`, `prbResult`, `laserTest`, `errorsCleared` | Log response object, acknowledgement, probe result, laser state, alarm-clear notification. `prbResult` used by holefinder/sample macro; not all events have an in-repo listener |
| Notifications | `toastError`, `toastErrorAlarm`, `interfaceDrive`, `interfaceOutdated`, `progStatus` | Error messages, selected drive, firmware notice, flashing port/string/code; `websocket.js` |
| Updates | `updatedata`, `updateprogress`, `updateready` | Update log/progress/version; `websocket.js` |
| Activation | `activate` | Request hostname; no matching literal in-repo listener found |

The renderer also listens for Socket.IO lifecycle `connect`/`disconnect`, and an `integrationpopup` event for which no matching literal host emission was found. Those asymmetries need characterization, not automatic deletion.

## Status snapshot

Authoritative owner: `status` initializer and mutations in `index.js`. Renderer copy: `laststatus` in `app/js/websocket.js`. Values are not consistently typed: initialized numbers/arrays/strings can become strings or `false` after parsing/disconnect.

| Path | Fields / source |
| --- | --- |
| Root | `login`, `driver`, `machine`, `comms`, `interface` |
| `driver` | `version`, `ipaddress`, `operatingsystem`, `powersettings.{usbselectiveAC,usbselectiveDC}`; package, OS and power diagnostics |
| `machine` | `name`, `has4thAxis`, `inputs`; identification/status reports |
| `machine.overrides` | `feedOverride`, `spindleOverride`, `realFeed`, `realSpindle`; `rapidOverride` added by feedback parsing |
| `machine.tool.nexttool` | `number`, `line`; tracked from outgoing tool commands |
| `machine.modals` | `coordinatesys`, `plane`, `distancemode`, `arcdistmode`, `feedratemode`, `unitsmode`, `radiuscomp`, `tlomode`, `spindlestate`, `coolantstate`, `homedRecently`; `gotModals` and command lifecycle |
| `machine.probe` | `x`, `y`, `z`, `state`; probe reports |
| `machine.position` | `work.{x,y,z,a,e}`, `offset.{x,y,z,a,e}`; feedback parsing; initialized axes are not proof all are updated |
| `machine.firmware` | `type`, `platform`, `version`, `date`, `buffer`, `features`, `blockBufferSize`, `rxBufferSize` |
| `comms` | `connectionStatus`, `runStatus`, `queue`, `blocked`, `paused`, `controllerBuffer`, `interfaces`, `alarm` |
| `comms.interfaces` | `type`, `ports`, `networkDevices`, `activePort`; `activeBaud` added on connection; port entries gain `img`/`note` from `friendlyPort` |
| `interface` | `diskdrive`, `firmware.{availVersion,installedVersion}`, `connected` |

`connectionStatus`: 0 disconnected, 1 opening, 2 connected, 3 playing, 4 paused, 5 alarm, 6 firmware upgrade. `runStatus` is a separate string, populated both from controller feedback and host code. Preserve this legacy encoding in an adapter during migration; do not equate host queue state with physical machine state.

## Saved data

These literal localStorage keys were found in application JavaScript, including retained customized preview code and inactive registration code. Storage belongs to the browser origin: scheme/hostname/port changes, including HTTP fallback ports and localhost versus LAN IP, select different data. Electron application identity can also change the backing profile. Export/migrate data before changing either.

| Keys | Owner paths | Stored representation / caveat |
| --- | --- | --- |
| `macroButtons` | `app/js/macros.js` | JSON array of macro records, including executable JavaScript and autorun flags |
| `grblParamsBackups` | `app/js/grbl-settings.js` | JSON backup array with settings and metadata |
| `keyboardShortcuts` | `app/js/keyboard.js` | JSON shortcut assignments |
| `pastJobs` | `app/wizards/jobstats/jobstats.js` | JSON job history |
| `gcodeLineNumber` | `app/js/websocket.js`, `app/wizards/resume/resume.js` | Queue-progress-derived recovery marker; not durable G-code contents |
| `continuousJog` | `app/js/jog.js`, `keyboard.js`, `app/wizards/probe/probev2.js` | Boolean string parsed as JSON |
| `jogOverride` | `app/js/jog.js`, `websocket.js`, `grbl-settings.js` | Jog override value, read/coerced by consumers |
| `unitsMode` | `app/js/jog.js`, `viewer.js`, `app/lib/3dview/3dview.js` | Display units string |
| `lastUsedPort`, `lastip` | `app/js/websocket.js` | Last port/IP strings; no literal `lastip` read found |
| `probeType`, `z0platethickness`, `probediameterxyz`, `probeunitxyz`, `customProbe` | `app/wizards/probe/probev2.js` | Form-value strings; `customProbe` is JSON geometry |
| `servo-calibration` | `app/js/servo.js`, `grbl-settings.js`, `app/wizards/calibration/calibrate-servo.js` | JSON servo calibration |
| `lastSurfacingTool` | `app/wizards/surfacing/surfacing.js` | JSON form/tool values |
| `themeId` | `app/js/theme.js` | Theme identifier string |
| `disable3Dviewer`, `disable3Dcontrols`, `disable3Dskybox`, `disable3Drealtimepos`, `disable3Dgcodepreview`, `disableSerialLog`, `disableDROupdates` | `app/js/diagnostics.js` | Boolean strings parsed as JSON |
| `mailinglistID`, `mailinglistFirstName`, `mailinglistLastName`, `mailinglistEmail` | `app/wizards/mailinglist_unused/mailinglist_unused.js` | Historical registration strings; script not in active main script list |

Most reads have no schema version or malformed-JSON recovery. Preserve existing keys/values until a tested migration exists. `app/jog/service-worker.js` separately declares Cache Storage names `static`/`dynamic`; activation and URL correctness remain unverified.

## JavaScript macro compatibility

`executeJS` in `app/js/macros.js` constructs a strict-mode `Function` in the renderer's global environment. Macro records contain title/icon/class/tooltip, `codetype`, G-code or JavaScript text, keyboard assignment, and optional `jsrunonstartup`. Imports append JSON records; first-run rendering may execute autorun macros. Treat imported macros as executable code, not inert settings.

Repository samples demonstrate dependencies on:

- `socket.on/off/emit`, notably `runJob`, `stop`, `prbResult`;
- `laststatus.comms.connectionStatus` and `editor.getValue()`;
- `Metro.dialog`, `$`, `printLog`, browser timers and `window` globals;
- HTML inline handlers calling functions assigned to `window` by macros.

This is an observed compatibility surface, not a safe or exhaustive public macro interface. `BACKUPS OF MACROS FROM FORUM/` may contain additional usage; external user macros are unknown. Keep an explicit compatibility adapter and migration examples when introducing modules; simply hiding these globals would break retained workflows.
