# Bizar Status Line

Customized status bar for Claude Code that displays session information in a terminal-friendly format.

> **Note (v10.29.2+):** Bizar auto-installs the statusline during `bizar install`. Use `bizar statusline install` to change the template, padding, refresh interval, or to re-install after a wipe.

## Overview

The status line runs as a shell script that receives JSON session data from Claude Code and prints formatted text. See [Claude Code Status Line Docs](https://code.claude.com/docs/en/statusline) for the official documentation.

## Quick Start

The statusline is installed automatically by `bizar install` (v10.29.2+). To re-install it manually or customize its settings, run:

```bash
# Install or re-install the statusline, optionally with template/settings flags
bizar statusline install

# Preview what it looks like
bizar statusline preview

# Remove it
bizar statusline remove
```

## Templates

Three templates are available:

### default (3 lines)

```
🤖 Sonnet 4.5  ⚡ custom-mini (custom)  🧠 Opus 4.5 (advisor)
📁 ~/projects/myapp  ⎇ main*2+1  🔗 #142
[████████░░░░░░░░░░] 35% (17.5k/50k)  💵 $0.42  ⏱ 4m12s
```

Line 1: Model name, custom model (if ANTHROPIC_CUSTOM_MODEL_OPTION is set), advisor model (if advisorModel is configured)

Line 2: Current working directory, git branch with dirty status, PR number (if in a PR)

Line 3: Context usage progress bar, percentage, tokens used/total, accumulated cost, session duration

### compact (1 line)

```
🤖 Sonnet 4.5 · 35% ctx · $0.42 · main · ~/projects/myapp
```

### git-only (1 line, no model/cost)

```
⎇ main*2+1 · 🔗 #142 · ~/projects/myapp
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--template` | Template: `default`, `compact`, `git-only` | `default` |
| `--padding` | Horizontal padding characters | `1` |
| `--refresh` | Refresh interval in seconds (min 1) | `5` |
| `--hide-vim` | Hide the Vim mode indicator | `false` |

## Bizar-Specific Notes

Claude Code reports the context window to the statusline. For gateway or
otherwise unregistered model IDs, Claude Code falls back to a 200k window
unless its context settings are overridden. Bizar's managed settings therefore
ship a 1M context ceiling, compact at 600k, and disable the unknown-model clamp:

```json
{
  "autoCompactWindow": 600000,
  "env": {
    "CLAUDE_CODE_MAX_CONTEXT_TOKENS": "1000000",
    "CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT": "1",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "600000"
  }
}
```

These are defaults. An operator's existing values are preserved during a
normal `bizar update`.

The renderer automatically reads from your `~/.claude/settings.json`:

- **Custom model**: If `env.ANTHROPIC_CUSTOM_MODEL_OPTION` is set, the `⚡ <model> (custom)` segment appears
- **Advisor**: If `advisorModel` is configured, the `🧠 <model> (advisor)` segment appears

These segments appear automatically based on your settings — no extra flags needed.

## Git Integration

- Branch name is fetched via `git rev-parse --abbrev-ref HEAD`
- Dirty status shows `*<modified>+<staged>` (only when both are non-zero)
- Git commands timeout after 2 seconds
- Results are cached for 5 seconds to avoid repeated git spawns

## Progress Bar Colors

- Green (0-50%): Normal usage
- Yellow (50-80%): Getting close to limit
- Red (80-100%): Near context limit

## Troubleshooting

```bash
# See current configuration
bizar statusline show

# Test with sample data
bizar statusline preview --template compact

# Check what Claude Code sends
bizar statusline render < /path/to/session.json
```

## Uninstall

```bash
bizar statusline remove
```

This removes the `statusLine` field from your `settings.json`. The rest of your configuration is preserved.
