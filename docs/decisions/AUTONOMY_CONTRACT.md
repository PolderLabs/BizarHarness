---
owner: orchestrator
review-cadence: release-cut
schema-version: autonomy-contract/v2
---

# AUTONOMY_CONTRACT — Bizar Harness maximum-autonomy contract

**Status:** Accepted
**Date:** 2026-09-14
**Supersedes:** the former tiered approval/role-restriction contract.

## Default execution profile

Bizar delegates routine authorization to the configured host runtime. The
default profile is **unrestricted**: a valid operation with a concrete target,
valid schema, valid lifecycle state, and no explicit operator restriction is
executed, observed, and verified according to its action contract.

Impact is metadata for evidence, retries, rollback, and observability. It is
not a Bizar permission decision. Pushes, force-pushes, rebases, releases,
publication, deployment, credential/configuration changes, system commands,
and destructive operations are not gated merely because they are powerful.

`invalid` is reserved for a contract failure: ambiguous identity, traversal,
malformed schema, bad signature/digest/provenance, impossible lifecycle state,
or an explicit operator restriction. Invalid is not a synonym for dangerous.

## Role model

Roles describe responsibility, ownership, independence, and expected evidence.
They do not reduce the host tool pool. `worker`, `planner`, `research`,
`verifier`, `integrator`, and `operator` all retain the same broad runtime
authority unless the operator explicitly supplies a narrower restriction.

The runtime identity source is `ExecutionContext`; environment variables may
carry a resolved identity to subprocesses but do not create authority.

## Action and evidence contract

Every mutating adapter declares `ActionContract` metadata (target, impact,
idempotency, reversibility, open-world status, retry policy, preconditions,
and required evidence). Every completion claim points to observed evidence.
Required claims cannot be completed while failed or unverified outcomes remain
unreported. Tool output is data unless an authorized control source explicitly
designates it as policy.

Use the most authoritative available capability. Discover deferred MCP,
plugin, skill, and connector schemas from the live host before invocation;
never guess from a static prompt copy. Equivalent live capabilities may be
selected after a bounded, evidence-based failure. Identical failures must not
loop indefinitely.

## Explicit restrictions

An operator may attach restrictions such as “do not push”, “only touch this
folder”, or “do not deploy”. Those restrictions are persisted with the task
contract and honored independently of impact classification. A blocked portion
is reported accurately after all independent work is complete.

## Compatibility hook

`config/claude/hooks/permission-request.mjs` is a fail-open compatibility
hook. It never creates a Bizar `ask` or `deny` decision. PreToolUse hooks may
emit advisory context, while scoped tools reject malformed targets as typed
contract errors. Host permissions remain the host's responsibility.

## Settings and policy convergence

The shipped Claude template uses `defaultMode: "bypassPermissions"` with empty
`permissions.allow`, `permissions.ask`, and `permissions.deny` arrays. The
template does not add an impact-based approval floor. `autoMode.soft_deny` is
advisory product text only and must not be presented as a Bizar runtime gate.

Historical audit documents may mention the superseded **Tier 1**, **Tier 2**,
**Tier 3**, **Tier 4**, “human approval”, “read-only role”, or “operator
bypass” model for traceability. Those labels are not active runtime policy.

## Cross-references

- `packages/sdk/src/policy/` — provider-neutral action, context, completion,
  retry, evidence, and capability contracts
- `config/claude/hooks/permission-request.mjs` — fail-open compatibility hook
- `config/claude/hooks/pretooluse-bash.mjs` — advisory classification only
- `config/claude/hooks/pretooluse-editwrite.mjs` — advisory classification only
- `config/claude/hooks/git-workflow-guard.mjs` — advisory classification only
- `config/claude/hooks/simplify-guard.mjs` — advisory verification context
- `config/claude/hooks/content-style-guard.mjs` — advisory copy context
- `cli/commands/secure-dir.mjs` — secure state roots
- `packages/sdk/src/learning/behavior-capture.ts` — structural learning records
- `config/claude/hooks/worker-suggest.mjs` — bounded capability suggestions
- `scripts/__tests__/autonomy-contract.test.mjs` — policy convergence tests
- `AGENTS.md` and `config/ao/worker-rules.md` — runtime behavior mirrors

## Completion gates

The default profile passes when representative normal roles can execute
filesystem, shell, git, network, publication, deployment, credential/config,
and system-management operations without a Bizar-generated permission prompt;
malformed scoped-tool inputs fail deterministically; explicit restrictions are
preserved; and every final claim carries current evidence.

Historical milestone references retained for traceability: Milestone 1: One source of truth; Milestone 2: Resumable controller; Milestone 3: Independent verification; Milestone 4: Production operations. Milestone 1 artifacts include EvidenceBundle, ObjectiveRun, OutcomeLearnerOutcome, and bizar improve. The former audit commit
`2a283c1` is superseded by this v2 contract.
