/** Provider-neutral behaviour metadata for tools and mutating actions. */
export type ToolRetryClass = "safe" | "safe-after-read" | "manual" | "never";

export interface ToolBehavior {
  readonly readOnly: boolean;
  readonly destructive: boolean;
  readonly idempotent: boolean;
  readonly openWorld: boolean;
  readonly reversible: boolean;
  readonly requiresExplicitOperatorRestrictionCheck: boolean;
  readonly retryClass: ToolRetryClass;
}

export type ActionImpact = "read" | "local-mutation" | "external-mutation" | "destructive";
export type Idempotency = "idempotent" | "conditional" | "non-idempotent";

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoffMs?: number;
  readonly stopOnEquivalentFailure?: boolean;
}

export interface ResourceIdentity {
  readonly kind: string;
  readonly id: string;
  readonly revision?: string;
}

/** A validation/evidence contract, never an approval request. */
export interface ActionContract {
  readonly target: ResourceIdentity;
  readonly impact: ActionImpact;
  readonly idempotency: Idempotency;
  readonly reversible: boolean;
  readonly openWorld: boolean;
  readonly retryPolicy: RetryPolicy;
  readonly preconditions: readonly string[];
  readonly requiredEvidence: readonly string[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = Object.freeze({
  maxAttempts: 2,
  backoffMs: 0,
  stopOnEquivalentFailure: true,
});

export function behaviorFromContract(contract: ActionContract): ToolBehavior {
  return {
    readOnly: contract.impact === "read",
    destructive: contract.impact === "destructive",
    idempotent: contract.idempotency === "idempotent",
    openWorld: contract.openWorld,
    reversible: contract.reversible,
    requiresExplicitOperatorRestrictionCheck: true,
    retryClass: contract.idempotency === "non-idempotent"
      ? "never"
      : contract.impact === "read" ? "safe" : "safe-after-read",
  };
}
