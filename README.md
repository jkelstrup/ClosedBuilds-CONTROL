# ClosedBuilds CONTROL

A CNC host for Grbl-family controllers, continuing the OpenBuilds CONTROL codebase as an independently maintained project. We are moving toward typed, testable modules while initially preserving existing workflows. See [PLAN.md](PLAN.md) for the roadmap and progress.

## Development

Use Node 24.22.1 (`nvm use`) and npm 11.19.1, then `npm ci` and `npm run verify:install`. Installation/native loading and a limited launch/browser UI smoke check passed on macOS arm64 only; full desktop workflows remain unverified. The desktop entry point is `npm run run-local` (`electron .`); read the [development safety guidance](docs/development.md) before launching. `npm start` and `npm test` are still placeholders, not verification.

- [Current architecture and change navigation](docs/architecture.md)
- [Architecture decisions and ADR process](docs/adr/README.md)
- [Feature preservation inventory](docs/features.md)
- [Socket, HTTP, state, persistence, and macro contracts](docs/contracts.md)
- [Source classification, resources, and project ownership](docs/development.md#source-and-resource-classification)
- [Verification status and manual scenarios](docs/testing.md)
- [Agent instructions](AGENTS.md)

## Historical upstream downloads

The links below point to upstream OpenBuilds releases, not releases of this fork. The runtime still contains inherited update URLs; independent release configuration is tracked in the plan.

#### Latest Version
Click to download latest version:  [![Latest Version](https://img.shields.io/github/package-json/v/openbuilds/openbuilds-control.svg)](https://github.com/OpenBuilds/OpenBuilds-CONTROL/releases/latest)

#### Older Versions
Click to see all past releases:  [![Downloads](https://img.shields.io/github/downloads/openbuilds/sw-machine-drivers/total.svg)](https://github.com/OpenBuilds/OpenBuilds-CONTROL/releases)

![Screenshot](https://raw.githubusercontent.com/OpenBuilds/OpenBuilds-CONTROL/master/docs/control.PNG)

## License

See [LICENSE](LICENSE) and retained third-party notices. Project ownership changes do not remove inherited attribution or license obligations.
