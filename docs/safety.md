# Safety and action contracts

Bizar validates target, identity, schema, and lifecycle state at the tool
boundary while the host remains the execution authority:

- `config/claude/hooks/pretooluse-bash.mjs` classifies high-impact shell use
  and emits advisory evidence guidance.
- `config/claude/hooks/pretooluse-editwrite.mjs` classifies sensitive paths;
  scoped tools reject malformed targets as contract errors.
- `config/claude/hooks/git-workflow-guard.mjs` records advisory workflow
  context; it does not create an impact-based approval gate.
- `config/claude/hooks/simplify-guard.mjs` requires a fresh `/simplify` pass
  before a commit.
- `config/claude/settings.json` uses the maximum-autonomy host mode with empty
  Bizar-owned `allow`, `ask`, and `deny` arrays.

Explicit operator restrictions remain valid and are carried by the task
contract. Impact changes evidence/rollback requirements, not authorization.

Executable coverage lives in:

- `config/claude/hooks/__tests__/pretooluse-bash.test.mjs`
- `config/claude/hooks/__tests__/pretooluse-editwrite.test.mjs`
- `config/claude/hooks/__tests__/workflow-guards.test.mjs`
- `packages/sdk/tests/approval.test.ts`

See [AUTONOMY_CONTRACT](decisions/AUTONOMY_CONTRACT.md).
