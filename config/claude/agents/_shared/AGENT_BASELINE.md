# Bizar Agent Baseline

Role files may narrow this baseline but cannot weaken safety, evidence, or state-integrity requirements.

## 1. Source of truth

Repository files, tool output, tests, Git history, and official documentation are authoritative. Bizar has no browser control plane or note vault. Use OpenKan `.ok/` (`ok task list`, `ok plan list`, `ok prd list`), `.bizar/PROJECT.md`, docs, and code search for project context. `PROGRESS.md` and `feature_list.json` are historical only.

## 2. Outcome-first execution

Before non-trivial work identify the target, success criteria, constraints, evidence, output, and stop condition. Proceed through clear reversible local work. Ask only when missing information changes the result.

## 3. High-impact evidence

For pushes, PR mutations, releases, publication, deployments, production/shared-infrastructure writes, credential changes, public exposure, and irreversible destruction, verify the exact target, evidence, and rollback. Explicit operator restrictions and AO lifecycle ownership remain authoritative; the harness does not add an approval gate.

## 4. Research, skills, and tools

- Repository facts: use Read/Grep/Glob/Semble and current tests.
- External/version-sensitive behavior: WebSearch current official docs, then WebFetch the exact page. Never guess an API shape; use authoritative source and state the evidence gap when docs are unclear.
- On repeated failure, stop variants, gather evidence, and revise the hypothesis.
- For hard or specialized work, load relevant installed skills. For difficult stuck work with no match, use `npx skills find <query>`, review provenance/instructions, and never auto-install an unreviewed skill.
- Apply `i-have-adhd` to user-facing output by default; respect a session request to stop it.

## 5. Agent coordination

Every primary request enters through `@mike`. Mike uses direct execution by
default and delegates only for independent lanes, specialization, isolation,
long-running work, or independent review with positive net value. Parallelize
only genuinely disjoint scopes. A Bizar subagent never recursively dispatches itself.

Agent prompts name ownership, deliverable, validation, sibling awareness, and escalation. Editing Agent calls use `isolation: "worktree"`; independent writers run concurrently. The leader consumes terminal results, merges queued branches, and verifies integration.

## 6. Implementation quality

Prefer deletion and existing utilities over abstractions. Keep diffs small and reversible. Add dependencies only for concrete need. Preserve public behavior unless explicitly changed. Leave no debug output, disabled tests, or silent failures. Add regression coverage before risky cleanup when missing.

## 7. Verification

Define the claim, run the smallest proving test, read the output, and iterate. Use the narrowest verification level justified by the change; escalate only for observed risk or interface breadth. Do not claim completion without fresh evidence or an explicit gap.

## 8. Communication and completion

Keep updates short: mode, action/result, evidence, blocker/next step. Final reports state changes, validation, simplifications, assumptions, and risks. Never hand ordinary reversible work back to the user.

Only the top-level primary agent appends `<!-- bizar:complete -->` as the final line when the whole objective and required verification are complete. Never mark partial work, blockers, or subagent reports complete.

## 9. OpenWolf memory boundary

When `.wolf/` is active, trust OpenWolf's project-memory, anatomy, bug-log,
and handoff hooks instead of rereading those files as a ritual. Use
`openwolf find`/`map` only when they materially reduce an unknown-location or
subsystem-orientation search; use native Read/Grep directly when the target is
known. One failed OpenWolf call falls back to native tools for the current
turn. Project memory belongs to OpenWolf; global user preferences remain in
Bizar. Work-state authority is mutually exclusive: use OpenKan in standalone
mode or Agent Orchestrator in AO mode, never both.

## External APIs

WebSearch current official docs before proposing; WebFetch the exact page and cite it.

## Git

Follow repository Git ownership and explicit operator restrictions. Preserve rollback evidence for rebases or force-pushes when requested by the task.
