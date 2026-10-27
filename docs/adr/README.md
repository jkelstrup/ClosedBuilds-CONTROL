# Architecture decision records

ADRs preserve why we chose an approach, including the alternatives and trade-offs a future maintainer or agent might otherwise rediscover.

- [PLAN.md](../../PLAN.md) tracks intended work and progress.
- [Architecture documentation](../architecture.md) describes the current implementation.
- ADRs explain decisions; **accepted does not mean implemented**. Consult the plan and code for implementation status.

## Decision index

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](0001-incremental-typescript-migration.md) | Accepted | Migrate to TypeScript in working increments |

## When to write one

Use an ADR when all three apply:

1. Reversing the decision later has meaningful cost.
2. Without context, a future reader could reasonably question the approach.
3. We chose between genuine alternatives with different trade-offs.

Routine refactors, easily replaced libraries, implementation details, and task checklists belong in code, tests, or the plan. A proposed architecture in the roadmap is not automatically an accepted decision.

## Process

1. **Consult:** Read the index and relevant accepted records before architectural work. Follow replacement links on superseded records.
2. **Propose:** Copy [TEMPLATE.md](TEMPLATE.md) to `NNNN-short-title.md`, using the next number after the highest numbered record. Describe the context, decision, alternatives, and consequences concisely. Add it to the index as **Proposed**. A short paragraph per section is enough.
3. **Approve:** A maintainer explicitly approves or rejects the proposal before implementation of that decision. Agents may draft proposals, but do not accept their own proposals or treat a generic request to implement the roadmap as approval of a new architectural choice. For a decision already explicitly agreed, record it as **Accepted** and note that agreement without inventing approval metadata.
4. **Connect:** Link the accepted record from the relevant architecture/module documentation and implementation task. Record implementation evidence in the plan/tests, rather than turning the ADR into a progress log.
5. **Revisit:** Propose a new record when changing an accepted decision. Once approved, mark the old record **Superseded**, link its replacement, and update both index rows. Preserve its original reasoning. Withdrawn/rejected proposals may remain as **Rejected** with a brief reason.

Normal lifecycle: **Proposed → Accepted → Superseded**. Keep each record's status and index row consistent. Fix typos and links in accepted records freely; changes to the decision or rationale require a replacement record rather than silently rewriting history. Review ADR updates with the related change; no separate tooling or meeting is required.
