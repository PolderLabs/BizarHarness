export {
  behaviorFromContract,
  DEFAULT_RETRY_POLICY,
  type ActionContract,
  type ActionImpact,
  type Idempotency,
  type ResourceIdentity,
  type RetryPolicy,
} from "./tool-behavior.js";

/** Invalid means the contract cannot be satisfied, never merely dangerous. */
export type ActionDecision = { readonly decision: "allow" } | { readonly decision: "invalid"; readonly reason: string };

export function validateActionTarget(target: { kind?: unknown; id?: unknown }): ActionDecision {
  if (typeof target.kind !== "string" || !target.kind.trim() || typeof target.id !== "string" || !target.id.trim()) {
    return { decision: "invalid", reason: "target identity must include non-empty kind and id" };
  }
  return { decision: "allow" };
}
