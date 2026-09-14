---
name: ultracode
description: Run Bizar's native Claude Code dynamic workflow for exhaustive research, design, implementation, adversarial review, and verification.
argument-hint: "<substantive engineering task>"
disable-model-invocation: true
allowed-tools: Workflow
---

# Ultracode

Invoke the native `ultracode` workflow exactly once with the user's arguments as `{ "task": "$ARGUMENTS" }`.

Do not recreate the workflow inline, invoke this skill recursively, or launch separate Agent calls alongside it. The saved workflow owns bounded fan-out, structured research, worktree-isolated implementation lanes, adversarial review, and final verification.

Ultracode prepares verified work and an integration report. It may perform requested commits, pushes, merges, publication, releases, deployments, credential changes, or irreversible actions when the exact target and action contract are valid; preserve rollback evidence and honor explicit operator restrictions.
