# Feature requests

Ideas for future work, separate from the maintainability roadmap in [PLAN.md](PLAN.md). These are not implemented features or approved architectural decisions.

## Pre-run Z-depth sanity check

**Status:** Proposed.

### Problem

An incorrectly set Z reference can cause the tool to cut much deeper than intended, ruining the workpiece and potentially pulling the machine out of alignment. Make the loaded job's intended depth visible before motion starts so the operator can catch a mistaken Z setup.

### Proposed behavior

Analyze the loaded G-code and present a pre-run depth summary containing:

- Current tool Z in work coordinates.
- Lowest Z the tool is expected to reach in the job.
- Maximum downward displacement from the current position to that lowest point.
- A reminder to confirm that Z0 matches the intended physical reference, such as the stock surface or spoilboard.

For example:

> **Check cutting depth**
>
> - Current work Z: **+15.0 mm**
> - Deepest programmed Z: **−8.0 mm**
> - Maximum descent from here: **23.0 mm**
>
> Confirm that Z0 is set to the intended reference.

Show both the deepest work-coordinate Z and the descent from the current position: a large descent alone may simply mean the tool is parked high above the stock. The exact presentation—persistent display, warning, or confirmation before Run—remains to be decided.

An optional maximum intended depth could provide a meaningful warning threshold, for example: “Warn if this job goes below −6 mm.”

### Correctness and safety requirements

- Interpret motion and modal state rather than searching for the smallest literal `Z` value. Account for units, absolute/relative positioning, coordinate systems and offsets, and supported motion types, including intermediate path extrema where relevant.
- Base the assessment on the loaded job and the applicable controller state. Invalidate or recompute it when the job, position, Z reference, or relevant modal state changes; reassess before starting.
- Treat unsupported commands, unresolved state, or incomparable coordinate references as **depth unknown**, never as evidence that the job is safe.
- Distinguish a calculated lowest position from any claim of physical clearance or safety. The application cannot independently detect an incorrectly set physical zero; this is an operator sanity check, not collision prevention.

### Future verification

- Test absolute and relative moves, unit changes, offsets and coordinate changes, supported arcs, and jobs with no Z motion.
- Verify that the summary updates after jogging, zeroing/probing, editing/reloading the job, and relevant controller-state changes.
- Verify unknown-depth behavior for unsupported or unresolved programs.
- Verify that an optional intended-depth threshold warns when exceeded and that the displayed values use clear, consistent units and coordinate references.
