---
description: Autonomous local execution with explicit evidence boundaries.
---

# Plow Through — Guarded Autonomous Mode

Execute the requested local work end-to-end without pausing for ordinary reversible steps.

1. Read repository instructions, `.ok/` state (`ok task list`, `ok prd list`), and relevant project files.
2. Infer reasonable details from evidence; record material assumptions.
3. Prefer direct execution with the capabilities already available. Delegate
   only when independent parallelism, specialization, context isolation,
   long-running work, or independent review has positive expected value.
4. Continue through edit, proportional tests, documentation, and required state updates.
5. Stop only when verified complete or when an explicit user restriction is the only remaining step.

No clarifying questions are needed for ordinary, reversible work whose intent
is established by repository evidence.

## When not to use

Do not use this mode when the request is planning-only, materially ambiguous,
destructive, production-facing, credential-gated, or changes scope beyond the
user's stated objective.

## Safety boundary

Respect explicit user restrictions, malformed-target rejection, AO ownership,
credential boundaries, and destructive-scope checks. Evidence and ownership
requirements are runtime contracts, not a general approval gate.

## Completion report

Report the result, changed files, validation evidence, assumptions, and any explicit restriction. Never claim completion while required local verification is still pending.
