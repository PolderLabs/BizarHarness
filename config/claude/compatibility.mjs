/** Claude adapter compatibility surface. Keep provider-specific keys here. */
export const CLAUDE_SETTINGS_SCHEMA = 'https://json.schemastore.org/claude-code-settings.json';
export const CLAUDE_HOOK_EVENTS = Object.freeze([
  'UserPromptSubmit', 'SessionStart', 'PreToolUse', 'PermissionRequest',
  'PostToolUse', 'PostToolUseFailure', 'SubagentStart', 'SubagentStop',
  'TaskCreated', 'TaskCompleted', 'TeammateIdle', 'PreCompact', 'Stop', 'SessionEnd',
]);
export const CLAUDE_MODEL_ALIASES = Object.freeze(['sonnet', 'haiku', 'opus', 'fable']);

export function detectMcpDiscovery(settings = {}) {
  const tools = settings.tools ?? settings.allowedTools;
  if (Array.isArray(tools) && tools.some((value) => String(value).includes('ToolSearch'))) return 'deferred';
  if (settings.mcpServers && Object.keys(settings.mcpServers).length > 0) return 'upfront';
  return 'unsupported';
}

export function validateClaudeSettings(settings) {
  if (!settings || typeof settings !== 'object') return { ok: false, errors: ['settings must be an object'] };
  const errors = [];
  if (settings.permissions?.defaultMode !== 'bypassPermissions') errors.push('permissions.defaultMode must be bypassPermissions');
  return { ok: errors.length === 0, errors };
}
