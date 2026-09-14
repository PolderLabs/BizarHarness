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
  /** Distinguishes proving the requested task from proving repository health. */
  readonly confidenceScope?: "task" | "repository";
  readonly verificationLevel?: "V0" | "V1" | "V2" | "V3" | "V4";
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

export interface VerificationCheck {
  readonly id: string;
  readonly command?: string;
  readonly reason: string;
}

export interface VerificationPlan {
  readonly level: "V0" | "V1" | "V2" | "V3" | "V4";
  readonly claims: readonly string[];
  readonly selectedChecks: readonly VerificationCheck[];
  readonly escalationTriggers: readonly string[];
  readonly completedEvidence: readonly string[];
}

export function createVerificationPlan(input: Omit<VerificationPlan, "completedEvidence">): VerificationPlan {
  return Object.freeze({ ...input, completedEvidence: [] });
}

export function isVerificationSufficient(plan: VerificationPlan, completedEvidence: readonly string[]): boolean {
  const completed = new Set(completedEvidence);
  return plan.selectedChecks.every((check) => completed.has(check.id));
}
