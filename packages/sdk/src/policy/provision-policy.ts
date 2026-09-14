export interface ProvisionPolicy {
  readonly refreshManagedFiles: boolean;
  readonly pruneOwnedStaleFiles: boolean;
  readonly cleanManagedState: boolean;
  readonly reinstallDependencies: boolean;
  readonly overwriteGlobalInstructions: boolean;
}

export const NORMAL_PROVISION_POLICY: ProvisionPolicy = Object.freeze({
  refreshManagedFiles: true,
  pruneOwnedStaleFiles: true,
  cleanManagedState: false,
  reinstallDependencies: false,
  overwriteGlobalInstructions: false,
});
