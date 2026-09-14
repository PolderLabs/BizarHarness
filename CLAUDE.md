# AGENTS.md — Bizar Harness

Bizar Harness is an Agent Orchestrator (AO)-first, guarded-autonomy worker harness for Codex and Claude Code. AO owns multi-agent coordination, isolated worktrees, sessions, branches, PRs, review feedback, previews, and browser state; Bizar supplies repository policy, skills, hooks, CLI utilities, and verification. OpenKan remains a standalone planning, progression, task, and PRD-goal option through `.ok/` and its supported CLI boundary.

If `AO_SESSION_ID` or `AO_PROJECT_ID` is present, this is an AO worker session: inspect AO session context, run `make check` before changing code, and do not start a second team/worktree/task lifecycle. Otherwise, inspect `.ok/` with `ok task list` and `ok prd list`, then run `make check` before changing code.

## Commands

```sh
make setup                    # install Claude Code and project dependencies
make check                    # TypeScript gate
make test                     # retained SDK, CLI, hook, and harness tests
make e2e                      # real SDK/MCP/Claude Code integration smoke test
make check-arch               # architectural and removed-surface checks
make verify-removed-surfaces  # prove deleted subsystems are absent
make verify-repo-structure    # prove tracked/package paths are clean
make clean-check              # debug-artifact/static hygiene gate
ok task list               # OpenKan task progression
ok plan list               # OpenKan plans
ok prd list              # OpenKan PRD goals
make session-start            # lifecycle compatibility target
make session-end              # lifecycle compatibility target
```

## Hard constraints

- **MUST** treat AO as the durable task, session, worktree, branch, PR, CI/review, preview, and browser authority when `AO_SESSION_ID` or `AO_PROJECT_ID` is present. Do not update `.ok/` from an AO worker unless the assigned task explicitly requires it and AO has serialized that shared-state operation.
- **MUST** keep the scoped OpenKan task current in standalone Bizar mode: claim before implementation, update status/evidence at each durable handoff, and complete only with verification evidence.
- **MUST** use OpenKan PRDs and plans for standalone Bizar durable goals and progression; `PROGRESS.md` and `feature_list.json` are legacy historical records, not live control state.
- **MUST** keep one logical operation per commit and keep its docs in the same commit.
- **MUST** run targeted tests, then `make check`; run `make e2e` for cross-component changes.
- **MUST** verify evidence before claiming completion.
- **MUST NOT** commit `console.log`, `debugger`, `.only()`, credentials, generated secrets, or runtime logs.
- **MUST NOT** use a persistent Claude daemon. Claude Code and the Agent SDK run in-process; background work uses Claude Code's Agent tool.
- **MUST NOT** rebase or force-push unless an explicit operator restriction or
  host/runtime contract forbids it; Bizar itself does not gate high-impact
  actions by impact.

### Worktree discipline

Every code-writing Agent call dispatched by an orchestrator MUST pass
`isolation: "worktree"`. Read-only agents stay foreground. Dispatched
worktrees branch from HEAD as `wt/<agent_type>-<short-task-id>`. The
SubagentStart hook (`config/claude/hooks/worktree-bootstrap.mjs`) bootstraps
the worktree; the SubagentStop hook (`config/claude/hooks/worktree-archive.mjs`)
records the branch into `~/.config/bizar/worktree-queue.json`. The
orchestrator merges the queue with `bizar worktree-merge --all` (or one
branch at a time with `bizar worktree-merge <branch>`); the sequencer
tags each source tip as `merge-archive/<branch>-<sha>` before
`git merge --no-ff` and surfaces conflicts instead of silently dropping
work. Conflicts MUST be reported to the user for resolution; never silently
force a resolution you do not understand.

## Autonomy and parallelism

When running under AO, the AO orchestrator is the only multi-agent coordinator. A Bizar worker works only in its assigned AO worktree, uses `ao send` for real blockers or cross-session coordination, and asks AO to create further workers when parallel work is necessary. It must not invoke Bizar/Claude/Codex teams, create a separate worktree, manipulate AO internals, or treat `.ok/` as a second source of assignment state.

Agents execute clear, local, reversible work autonomously — they inspect,
edit, test, and iterate without pausing for routine decisions. Routine
decisions (file layout, naming, scope of a single commit, choosing between
two equivalent stdlib calls, picking a verification command from the Makefile,
or completing an OpenKan task after `make check` is green) do NOT require
human coordination and MUST NOT trigger a permission handoff. PreToolUse hooks may
classify high-impact actions and add evidence guidance, but they must not deny
or ask solely because an action is externally visible, irreversible, or
powerful. Invalid target/schema/state is a typed contract error, not a
permission handoff.

Mike performs bounded read-only orientation, then chooses the smallest capable
execution surface for the requested outcome. Direct work is the default when
one agent can safely complete and verify the task; native Agent teams are used
only when independent lanes materially improve throughput or correctness. Ask one
concise clarification question only when a material choice, acceptance
criterion, safety boundary, or unresolved constraint would change the work;
otherwise continue autonomously. The team is host-side state under
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, and per
Anthropic's docs `team_name` is deprecated and ignored. Every editing dispatch
uses an explicit configured model and call-level `isolation: "worktree"`.
When two or more subtasks have non-overlapping writable scopes and no data
dependency, dispatch them concurrently; serialize only dependencies and
integration.

Agent roles are model-agnostic. Mike selects the cheapest sufficient enabled
configured-tier model for each dispatch, with explicit user picks taking
precedence. It never omits `model` merely because live discovery is unavailable:
an omitted override would let Claude Code select an unconfigured provider
default. If no enabled configured candidate exists, dispatch fails with an
actionable configuration error. Bizar never retries a failed dispatch by cycling
aliases, providers, or tiers.

The authoritative default is maximum autonomy; pushes, pull-request
mutations, releases, package publication, deployments, production/shared-
infrastructure writes, credential changes, public exposure, irreversible
destruction proceed when explicitly requested and contract-valid. Stronger
evidence and rollback handling are required; a permission prompt is not.

The default maximum-autonomy profile is implemented by the host runtime;
`permission-request.mjs` is a fail-open compatibility hook. The workflow and
PreToolUse hooks may emit advisory evidence guidance but never create a Bizar
approval gate.
Historical F-176 approval-floor wording is retained only in superseded audit
records. Operators may configure their host independently, but Bizar does not
reintroduce an impact-based or role-based gate.

> Note: `disableAutoCompact: false` is shipped by default so Claude Code can
> compact automatically before the context limit. Hook `precompact-priorities.sh`
> snapshots bounded state and preserves evidence and decisions on compaction.
Local and external mutations follow the same action-contract path; hooks add
evidence guidance only.

Agents fetch current official documentation via WebSearch + WebFetch before
acting on an external API, library, framework, CLI, configuration format, or
version-sensitive behavior, and whenever such uncertainty appears. Purely
repository-local fixes use source and tests directly; speculative
guess-and-try remains prohibited.

## Execution model

The autonomy and approval policy above governs this execution model. The project defaults to `acceptEdits`; eligible operators may opt into Claude Code Auto mode.

Every non-empty primary request enters Bizar through `office-manager` (`@mike`).
The installer sets Claude Code's global `agent` setting to Mike's frontmatter
name (`mike`),
and the routing hook supplies the coordination policy. Mike gathers bounded
read-only context, selects direct execution or a narrowly scoped Agent team
based on coordination value, and continues autonomously. It asks one concise
clarification only when a material choice or unresolved constraint would
change the work. Mike owns integration and final verification.
A Bizar custom agent already executing its assigned role does not recursively
dispatch itself.

Every shipped agent has `WebSearch` access. Before proposing, explaining,
troubleshooting, or implementing behavior from an external API, library,
framework, CLI, configuration format, or version-sensitive dependency, the
agent must WebSearch for current official documentation and WebFetch the exact
relevant page. Guess-and-try integration work is prohibited. When official
documentation is unavailable or ambiguous, inspect authoritative source code
and report the evidence gap.

For a workflow or team, `office-manager` uses only phases and members that
reduce a known risk:

1. Research: `greg` (`research-analyst.md`) plus an implementation-context specialist.
2. Plan: `planner` drafts; `qa-reviewer` challenges assumptions and test shape.
3. Implement: engineering agents edit and test; review and verification follow before `commit-staged` asks for the final human commit confirmation.

Additional Agent fan-out remains bounded to scopes that materially improve
speed, quality, or safety; concurrent writers always use call-level worktree
isolation.

## Architecture

- `config/ao/` — versioned Agent Orchestrator worker-rule template; `bizar ao setup` materializes it at `.ao/bizar-worker-rules.md` in each registered repository.
- `config/claude/` — standalone Claude Code agents, skills, commands, hooks, and settings.
- `packages/sdk/` — typed autonomy primitives and the 14-tool stdio MCP surface: plans, loops, graph queries, learning reads, tasks, workflows, control, audits, and model inventory.
- `cli/` — AO bridge, install/provision, audit, validation, backup, OpenKan control, sandbox, and repair utilities.
- `scripts/` + `.harness/` + `templates/` — verification, feature/eval state, audit output, and reusable contracts.

The harness has no embedded browser/server UI layer or local web editor.
In AO mode, AO's documented daemon CLI is the machine-readable control boundary
for session, worktree, PR, review, preview, and browser state. `bizar control`
and OpenKan remain standalone compatibility surfaces. Session handoff, control
inbox, and learning logs are bounded operational records for autonomy; they are
not a general note vault, semantic search service, or knowledge-base API.

## State and evidence

- AO project/session/PR state — authoritative whenever this is an AO worker session.
- `.ok/` — authoritative OpenKan tasks, plans, PRDs, progression, evidence, and scoped ownership in standalone Bizar mode.
- `PROGRESS.md` and `feature_list.json` — legacy historical records; do not use them for new work.
- `DECISIONS.md` and `docs/decisions/` — current architecture decisions.
- `.harness/evals/` — feature evaluation records.
- `~/.config/bizar/telemetry/` — local correlation and rejected-action feedback.
- `.bizar/session-state.json` — bounded SessionEnd→SessionStart handoff.

## Definition of done

1. Behavior is implemented with a regression test.
2. Documentation and OpenKan task/plan/PRD state describe the actual code.
3. `make verify-removed-surfaces`, `make verify-repo-structure`, `make check-arch`, `make test`, `make e2e`, `make clean-check`, and `make check` pass as applicable.
4. The OpenKan task records fresh verification evidence and no required work remains.
5. `/simplify` reviews the staged diff before the evidence-backed commit.

<!-- openwolf:begin -->
# OpenWolf

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md at session start. Check .wolf/cerebrum.md before generating code. Grep .wolf/anatomy.md for a file's path before reading it (never read the whole index).
<!-- openwolf:end -->
