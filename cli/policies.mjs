/** Small, explicit policy objects used by installer and verification paths. */

export function normalizeProvisionPolicy({ force = false, reallyResetGlobalClaudeConfig = false } = {}) {
  return Object.freeze({
    refreshManagedFiles: true,
    pruneOwnedStaleFiles: true,
    cleanManagedState: Boolean(reallyResetGlobalClaudeConfig),
    reinstallDependencies: Boolean(force && reallyResetGlobalClaudeConfig),
    overwriteGlobalInstructions: false,
  });
}

export function verificationPlan({ level = 'V1', claims = [], selectedChecks = [], escalationTriggers = [] } = {}) {
  if (!/^V[0-4]$/.test(level)) throw new TypeError(`invalid verification level: ${level}`);
  return Object.freeze({
    level,
    claims: [...claims],
    selectedChecks: selectedChecks.map((check) => ({ ...check })),
    escalationTriggers: [...escalationTriggers],
    completedEvidence: [],
  });
}

export function evidenceIsSufficient(plan, completedEvidence = []) {
  const required = new Set(plan?.selectedChecks?.map((check) => check.id) || []);
  const completed = new Set(completedEvidence);
  return [...required].every((id) => completed.has(id));
}

export function shouldDelegate({
  parallelLaneValue = 0,
  specializationValue = 0,
  contextIsolationValue = 0,
  independentReviewValue = 0,
  longRunningValue = 0,
  coordinationCost = 0,
  integrationCost = 0,
  startupCost = 0,
} = {}) {
  return parallelLaneValue + specializationValue + contextIsolationValue
    + independentReviewValue + longRunningValue - coordinationCost
    - integrationCost - startupCost > 0;
}
