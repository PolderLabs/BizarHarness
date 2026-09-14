export type ObservedStatus = "verified" | "failed" | "skipped" | "unverified" | "partial";

export interface ObservedOutcome {
  readonly actionId: string;
  readonly intendedOutcome: string;
  readonly observedOutcome: string;
  readonly status: ObservedStatus;
  readonly evidenceRefs: readonly string[];
  readonly error?: string;
  readonly changedState?: readonly string[];
}

export interface CompletionContract {
  readonly requiredDeliverables: readonly string[];
  readonly requiredVerification: readonly string[];
  readonly explicitRestrictions?: readonly string[];
}

export interface CompletionState {
  readonly deliverables: ReadonlySet<string>;
  readonly verification: ReadonlySet<string>;
  readonly outcomes: readonly ObservedOutcome[];
  readonly openRequiredTasks?: readonly string[];
  readonly unresolvedRestrictions?: readonly string[];
  readonly integrationStateClean?: boolean;
}

export function canComplete(contract: CompletionContract, state: CompletionState): boolean {
  const hasAll = (items: readonly string[], values: ReadonlySet<string>) => items.every((item) => values.has(item));
  return hasAll(contract.requiredDeliverables, state.deliverables)
    && hasAll(contract.requiredVerification, state.verification)
    && state.outcomes.every((outcome) => outcome.status !== "failed" && outcome.status !== "unverified")
    && (state.openRequiredTasks?.length ?? 0) === 0
    && (state.unresolvedRestrictions?.length ?? 0) === 0
    && state.integrationStateClean !== false;
}
