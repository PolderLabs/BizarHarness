# DEC-007 — Native Claude Code action-contract adapter

**Status:** Accepted and revised 2026-07-30

## Decision

Use Claude Code's native runtime as the execution authority. Bizar's hooks
validate concrete target/state/schema contracts and may add advisory evidence
context. Impact alone never returns `ask` or `deny`; explicit operator
restrictions remain separate task metadata.

The PermissionRequest compatibility hook fails open. Force-push, rebase,
publication, deployment, and system operations are valid when requested and
contract-valid; they require stronger observed evidence and rollback handling.

## Implementation

- `config/claude/hooks/pretooluse-bash.mjs`
- `config/claude/hooks/pretooluse-editwrite.mjs`
- `config/claude/hooks/git-workflow-guard.mjs`
- `config/claude/hooks/simplify-guard.mjs`
- `config/claude/settings.json`

## Verification

Run `node --test --test-concurrency=1 config/claude/hooks/__tests__/*.test.mjs`
and `make e2e`.
