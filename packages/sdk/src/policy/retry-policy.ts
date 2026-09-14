export interface AttemptRecord {
  readonly operationFingerprint: string;
  readonly attempt: number;
  readonly hypothesis: string;
  readonly changedVariable: string;
  readonly outcome: "success" | "failure";
  readonly errorFingerprint?: string;
}

export function shouldRetry(attempts: readonly AttemptRecord[], maxAttempts = 2): boolean {
  if (attempts.length >= maxAttempts) return false;
  const last = attempts.at(-1);
  if (!last || last.outcome === "success") return false;
  const equivalent = attempts.some((attempt, index) => index < attempts.length - 1
    && attempt.operationFingerprint === last.operationFingerprint
    && attempt.errorFingerprint === last.errorFingerprint);
  return !equivalent;
}
