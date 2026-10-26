# Agent instructions

## Git workflow

- Before editing files for a new task, create and switch to a new, descriptively named working branch. Continue related work on that task's branch.
- NEVER commit to `main`, `master` (this repository's current default branch), or any other default branch. Make all changes and commits on the working branch.
- Only commit when the user explicitly asks you to commit. Otherwise, leave changes uncommitted.

## Questions

- Whenever asking the user a question with answer options, use the built-in interactive question tool (`question`) rather than listing choices in a regular message.
