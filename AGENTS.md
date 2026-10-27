# Agent instructions

## Navigation and verification

- For implementation order and milestone completion criteria, read `PLAN.md`.
- For runtime ownership or controller/streaming changes, read `docs/architecture.md`.
- Before architectural changes, consult `docs/adr/README.md` and relevant accepted ADRs. For consequential new decisions or reversals, follow its proposal and maintainer-approval process.
- For feature entry points and retained consumers, read `docs/features.md`.
- For socket/HTTP, status, saved-data, or macro changes, read `docs/contracts.md`.
- For setup, packaging, vendor exclusions, or resource moves, read `docs/development.md`.
- For selecting checks and reporting verification gaps, read `docs/testing.md`. `npm run check` covers migrated tooling only; `npm start` launches infrastructure, not verification.
- Importing `index.js` starts infrastructure; inspect it statically until a callable test seam exists. Application startup can expose machine control over the network. Keep physical controllers disconnected during development checks.

## Git workflow

- Before editing files for a new task, create and switch to a new, descriptively named working branch. Continue related work on that task's branch.
- NEVER commit to `main` (the default branch). Make all changes and commits on the working branch.
- Only commit when the user explicitly asks you to commit. Otherwise, leave changes uncommitted.

## Questions

- Whenever asking the user a question with answer options, use the built-in interactive question tool (`question`) rather than listing choices in a regular message.
