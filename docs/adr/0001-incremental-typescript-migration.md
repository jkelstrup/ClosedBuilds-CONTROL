# 0001: Migrate to TypeScript in working increments

Status: Accepted

## Context

The legacy application relies on shared JavaScript globals across machine control, server handlers, renderer scripts, and macros. Changes require reconstructing implicit contracts. We want explicit, checkable module interfaces without losing existing workflows. During maintainability planning, the maintainer explicitly chose TypeScript modules and initial feature preservation.

## Decision

Use TypeScript for new and extracted modules, migrating in working, feature-preserving increments. Establish strict checking for migrated code while legacy JavaScript remains runnable. Keep compatibility adapters where existing consumers still depend on global functions or legacy event/status shapes, and remove them when those consumers migrate.

This records the agreed language and migration direction, not a choice of bundler, UI framework, runtime versions, or final machine-control interface. Those choices remain implementation work or separate decisions if they meet the ADR threshold.

## Alternatives

- **Modern JavaScript with JSDoc and type checking:** Less source-language migration, but TypeScript was preferred for expressing and checking module contracts directly.
- **An all-at-once rewrite:** Avoids a mixed-language transition, but puts feature preservation and regression diagnosis at greater risk before reliable verification exists.
- **Keeping implicit global scripts:** Avoids immediate migration work but leaves the navigation and change-verification problems unresolved.

## Consequences

The project needs explicit build outputs for Electron, browser scripts, and workers, plus a deliberate JavaScript/TypeScript interoperability strategy. Migration temporarily carries both languages and compatibility adapters. Types help reveal contract mismatches but do not replace runtime payload validation, behavioral tests, or physical-controller verification. User macros and saved data need tested migration paths rather than silent breakage.

Implementation sequence and progress remain in [PLAN.md](../../PLAN.md), beginning with trustworthy installation/checks before machine-control extraction.
