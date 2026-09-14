#!/usr/bin/env bash
# install.sh — BizarHarness OS dependencies installer
# Usage:
#   ./install.sh [--non-interactive|--dry-run]
#   curl -fsSL https://raw.githubusercontent.com/PolderLabsVOF/BizarHarness/v10.33.0/install.sh | bash
set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
note() { echo -e "  ${G}✓${N} $1"; }
warn() { echo -e "  ${Y}⚠${N} $1"; }
err()  { echo -e "  ${R}✗${N} $1"; }
cmd()  { command -v "$1" >/dev/null 2>&1; }
node_22_or_newer() { cmd node && node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; }
dry()  { [ "${DRY:-0}" -eq 0 ] && "$@" || echo "  would $*" >&2; }
sudo_if_needed() { [ "$(id -u)" -ne 0 ] && cmd sudo && SUDO="sudo" || SUDO=""; }

readonly BIZAR_GITHUB_REPOSITORY="PolderLabsVOF/BizarHarness"
readonly BIZAR_DEFAULT_REF="latest"

is_bizar_package_root() {
  local root="$1"
  [ -f "$root/package.json" ] \
    && [ ! -L "$root/package.json" ] \
    && [ -f "$root/install.sh" ] \
    && [ ! -L "$root/install.sh" ] \
    && [ -f "$root/cli/provision.mjs" ] \
    && [ ! -L "$root/cli/provision.mjs" ] \
    && grep -Eq '"name"[[:space:]]*:[[:space:]]*"@polderlabs/bizar"' "$root/package.json"
}

local_package_root() {
  local source_path="${BASH_SOURCE[0]:-}"
  local candidate
  [ -n "$source_path" ] || return 1
  candidate="$(cd -- "$(dirname -- "$source_path")" 2>/dev/null && pwd -P)" || return 1
  is_bizar_package_root "$candidate" || return 1
  printf '%s\n' "$candidate"
}

validate_install_ref() {
  local ref="$1"
  case "$ref" in
    ''|*[^A-Za-z0-9._-]*|.*|*..*)
      err "Invalid BIZAR_INSTALL_REF: $ref"
      return 1
      ;;
  esac
}

archive_root_name() {
  local archive="$1"
  local root
  root="$(tar -tzf "$archive" | awk -F/ 'NR == 1 { print $1; exit }')"
  case "$root" in
    ''|*[^A-Za-z0-9._-]*) return 1 ;;
  esac

  tar -tzf "$archive" | awk -F/ -v root="$root" '
    $0 ~ /^\// || $1 != root { exit 1 }
    { for (i = 1; i <= NF; i++) if ($i == "..") exit 1 }
  ' || return 1

  # The installer never needs archive links or special files. Reject them so
  # extraction cannot redirect a later write outside the temporary directory.
  tar -tvzf "$archive" | awk '
    substr($1, 1, 1) ~ /[lhcbps]/ { exit 1 }
  ' || return 1

  printf '%s\n' "$root"
}

bootstrap_public_package() {
  local ref="${BIZAR_INSTALL_REF:-$BIZAR_DEFAULT_REF}"
  local version commit package_spec

  case "$(uname -s)" in
    Linux) linux ;;
    Darwin) macos ;;
    *) err "Unsupported OS. Install with: npm install --global @polderlabs/bizar@<version> && bizar install"; return 1 ;;
  esac
  cmd curl || { err "curl is required for a piped installation"; return 1; }
  cmd npm || { err "npm is required for a piped installation"; return 1; }
  if [ "$ref" = "latest" ]; then
    version="$(curl -fsSL --retry 3 --connect-timeout 10 \
      -H 'Accept: application/vnd.github+json' \
      "https://api.github.com/repos/${BIZAR_GITHUB_REPOSITORY}/releases/latest" \
      | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v\{0,1\}\([0-9][0-9.]*\)".*/\1/p' | head -1)"
  else
    version="${ref#v}"
  fi
  echo "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { err "Could not resolve an immutable Bizar release version"; return 1; }
  commit="$(git ls-remote "https://github.com/${BIZAR_GITHUB_REPOSITORY}.git" "refs/tags/v${version}" | awk 'NR==1 {print $1}')"
  [ -n "$commit" ] || { err "Could not resolve release tag v${version}"; return 1; }
  package_spec="@polderlabs/bizar@${version}"
  local integrity
  integrity="$(npm view "${package_spec}" dist.integrity 2>/dev/null || true)"
  [ -n "$integrity" ] || { err "Could not verify npm integrity for ${package_spec}"; return 1; }
  note "Installing immutable ${package_spec} (${commit}; ${integrity}) from npm..."
  if [ "${DRY:-0}" -eq 1 ]; then
    echo "  would npm install --global ${package_spec}"
    return 0
  fi
  npm install --global "$package_spec"
  command -v bizar >/dev/null 2>&1 || { err "npm install completed but bizar is not on PATH"; return 1; }
  [ "$(bizar --version 2>/dev/null)" = "$version" ] || { err "active bizar version does not match ${version}"; return 1; }
  exec bizar install --non-interactive "$@"
}

main() {
  local ni=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --help|-h) cat <<'EOF'
install.sh — BizarHarness OS-dependencies installer
  ./install.sh --non-interactive   CI safe
  ./install.sh --dry-run           print actions, no changes
EOF
        exit 0;;
      --dry-run) export DRY=1;;
      --non-interactive|-y) ni=1;;
      *) warn "ignoring: $1";;
    esac; shift
  done
  echo "Installing OS dependencies..."
  case "$(uname -s)" in
    Linux)  linux;;
    Darwin) macos;;
    *) err "Unsupported OS. Install with: npm install --global @polderlabs/bizar@<version> && bizar install"; exit 1;;
  esac
  if [ "${DRY:-0}" -eq 0 ] && ! node_22_or_newer; then
    err "OpenKan requires Node.js 22 or newer — found $(node --version 2>/dev/null || echo 'no Node.js')"
    exit 1
  fi
  # Auto-install the repo-local git hooks (pre-commit, pre-push, commit-msg).
  # The commit-msg hook strips Claude/agent co-author trailers from commits
  # so the human author identity is the only one on every Bizar commit.
  if [ "${DRY:-0}" -eq 0 ] && [ -f "$(dirname "$0")/scripts/install-hooks.sh" ]; then
    note "Installing git hooks (commit-msg + pre-commit + pre-push)..."
    bash "$(dirname "$0")/scripts/install-hooks.sh" || warn "git hook install failed — run ./scripts/install-hooks.sh manually"
  fi
  local a=(--mode=install)
  [ "$ni" -eq 1 ] && a+=(--yes)
  [ "${DRY:-0}" -eq 1 ] && a+=(--dry-run)
  exec node "$(dirname "$0")/cli/provision.mjs" "${a[@]}"
}

linux() {
  [ ! -f /etc/os-release ] && { err "no /etc/os-release"; exit 1; }
  . /etc/os-release
  note "Detected Linux ($ID)"
  sudo_if_needed
  case "$ID" in
    ubuntu|debian|pop|linuxmint|elementary)
      dry $SUDO apt-get update
      dry $SUDO apt-get install -y ca-certificates curl gnupg
      node_22_or_newer || dry curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
      dry $SUDO apt-get install -y nodejs
      dry $SUDO apt-get install -y --no-install-recommends python3 jq git curl
      ;;
    fedora|rhel|rocky|almalinux|centos)
      node_22_or_newer || dry $SUDO dnf install -y https://rpm.nodesource.com/pub_22.x/nodesource-release-nodesource-1.noarch.rpm
      node_22_or_newer || dry $SUDO dnf install -y nodejs
      dry $SUDO dnf install -y python3 jq git curl gh
      ;;
    arch|manjaro|endeavouros)
      dry $SUDO pacman -Sy --noconfirm --needed nodejs npm python jq git curl
      ;;
    opensuse*|sles)
      dry $SUDO zypper install -y nodejs22 npm22 python3 jq git curl gh
      ;;
    alpine)  dry $SUDO apk add --no-cache nodejs npm python3 jq git curl ;;
    void)    dry $SUDO xbps-install -S nodejs python3 jq git curl ;;
    nixos)
      note "NixOS — manual setup required"
      warn "nix-shell -p nodejs python3 jq gh git"
      warn "node cli/provision.mjs --mode=install"
      exit 0
      ;;
    *) err "Unsupported distro: $ID"; exit 1;;
  esac
  cmd uv || { note "Installing uv..."; dry curl -LsSf https://astral.sh/uv/install.sh | sh; }
  note "OS dependencies ready"
}

macos() {
  note "Detected macOS"
  cmd brew || { err "Homebrew not found — install from https://brew.sh"; exit 1; }
  if ! node_22_or_newer; then
    note "Installing Node.js 22 (required by OpenKan)..."
    dry brew install node@22
    dry brew link --overwrite --force node@22
  fi
  dry brew install uv jq gh
  note "OS dependencies ready"
}

if PACKAGE_ROOT="$(local_package_root)"; then
  cd "$PACKAGE_ROOT"
  main "$@"
else
  bootstrap_public_package "$@"
fi
