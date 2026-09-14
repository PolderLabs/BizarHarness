#!/usr/bin/env bash
# Idempotent five-dimension clock-out verifier.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0

check() {
  local label="$1"
  local output_file
  shift
  echo "▶ $label"
  output_file="$(mktemp "${TMPDIR:-/tmp}/bizar-clean-check.XXXXXX")"
  set +e
  "$@" >"$output_file" 2>&1
  RC=$?
  set -e
  if [[ $RC -eq 0 ]]; then
    echo "  PASS"
    PASS=$((PASS + 1))
  else
    echo "  FAIL"
    # Surface the test failure context. TAP puts individual `not ok`
    # lines mid-stream and only `tail` shows the truncated summary,
    # which is exactly the part GitHub compresses to "...". Dump
    # every `not ok` line first (no truncation) so inner describe
    # failures surface; then dump the summary footer so the operator
    # sees both the specific test names and the totals in one block.
    echo "  ── failures ──"
    grep -E "^\s*not ok " "$output_file" | sed 's/^/  /'
    echo "  ── summary ──"
    grep -E "^# (fail|pass|tests|suites)" "$output_file" | sed 's/^/  /'
    FAIL=$((FAIL + 1))
  fi
  rm -f -- "$output_file"
}

echo "═══════════════════════════════════════"
echo "  Clean-State Check"
echo "═══════════════════════════════════════"

if [[ "${1:-}" == "--cleanliness-only" ]]; then
  # `console.log` is an intentional CLI output primitive throughout Bizar.
  # Detect debugger statements and obvious temporary trace logging instead of
  # rejecting every user-facing command message.
  check "Whitespace and debug artifact hygiene" bash -c 'git diff --check && ! rg -n --glob "*.mjs" --glob "*.js" --glob "*.ts" --glob "*.tsx" --glob "*.jsx" "(^|[[:space:]])debugger([[:space:];]|$)" . && ! rg -n --glob "*.mjs" --glob "*.js" --glob "*.ts" --glob "*.tsx" --glob "*.jsx" "console\\.log\\([[:space:]]*(debug|trace|todo|temporary)\\b" .'
  echo "Summary: $PASS passed, $FAIL failed"
  [[ $FAIL -eq 0 ]] && exit 0
  exit 1
fi

check "1. Build and typecheck" make check
check "2. Retained unit tests" make test
check "3. OpenKan workspace present" test -d .ok
check "4. Architecture and removed surfaces" make check-arch
check "5. Claude Code startup path" make e2e

echo "Summary: $PASS passed, $FAIL failed"
if [[ $FAIL -ne 0 ]]; then
  echo "Session is NOT clean."
  exit 1
fi
echo "Session is clean."
