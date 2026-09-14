import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProvisionPolicy, verificationPlan, evidenceIsSufficient, shouldDelegate } from './policies.mjs';

test('normal provisioning is refresh-only and does not reinstall dependencies', () => {
  const policy = normalizeProvisionPolicy({ force: false });
  assert.equal(policy.refreshManagedFiles, true);
  assert.equal(policy.cleanManagedState, false);
  assert.equal(policy.reinstallDependencies, false);
  assert.equal(policy.overwriteGlobalInstructions, false);
});

test('only the explicit emergency flag enables destructive reset', () => {
  const policy = normalizeProvisionPolicy({ force: true, reallyResetGlobalClaudeConfig: true });
  assert.equal(policy.cleanManagedState, true);
  assert.equal(policy.reinstallDependencies, true);
});

test('verification stops when selected evidence proves the claim', () => {
  const plan = verificationPlan({ level: 'V1', claims: ['parser fixed'], selectedChecks: [{ id: 'parser', reason: 'focused regression' }] });
  assert.equal(evidenceIsSufficient(plan, []), false);
  assert.equal(evidenceIsSufficient(plan, ['parser']), true);
});

test('delegation is value-positive, not file-count based', () => {
  assert.equal(shouldDelegate({}), false);
  assert.equal(shouldDelegate({ parallelLaneValue: 2, coordinationCost: 1 }), true);
});
