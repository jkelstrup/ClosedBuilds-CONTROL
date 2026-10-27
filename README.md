# ClosedBuilds CONTROL

A CNC host for Grbl-family controllers, developed independently from the OpenBuilds CONTROL codebase. We are moving toward typed, testable modules while initially preserving existing workflows. See [PLAN.md](PLAN.md) for the roadmap and progress.

## Independent project

ClosedBuilds CONTROL (CBC) is its own project, not an upstream-tracking fork or an official OpenBuilds release. We treat upstream OpenBuilds CONTROL as an abandoned historical baseline: development does not depend on upstream maintenance, fixes, releases, or future synchronization. Development, support, and release decisions belong to this project; compatibility with future upstream changes is not a goal.

Inherited attribution and licensing remain in force. Remaining OpenBuilds identifiers, links, and update configuration are legacy migration work, not evidence of shared ownership or support. In particular, runtime update URLs still point upstream and must be replaced before independent releases are enabled.

## Development

Use Node 24.22.1 (`nvm use`) and npm 11.19.1, then `npm ci`, `npm run check`, and `npm run verify:install`. Installation/native loading and a limited launch/browser UI smoke check passed on macOS arm64 only; full desktop workflows remain unverified. Launch with `npm run dev` (`electron .`); read the [development safety guidance](docs/development.md) first. Checks currently cover migrated tooling, not machine behavior.

- [Current architecture and change navigation](docs/architecture.md)
- [Architecture decisions and ADR process](docs/adr/README.md)
- [Feature preservation inventory](docs/features.md)
- [Socket, HTTP, state, persistence, and macro contracts](docs/contracts.md)
- [Source classification, resources, and project ownership](docs/development.md#source-and-resource-classification)
- [Verification status and manual scenarios](docs/testing.md)
- [Agent instructions](AGENTS.md)

## Historical upstream reference

[OpenBuilds CONTROL releases](https://github.com/OpenBuilds/OpenBuilds-CONTROL/releases) are historical upstream artifacts, not CBC downloads or updates.

Historical upstream screenshot:
![Screenshot](https://raw.githubusercontent.com/OpenBuilds/OpenBuilds-CONTROL/master/docs/control.PNG)

## License

See [LICENSE](LICENSE) and retained third-party notices. Project ownership changes do not remove inherited attribution or license obligations.
