import { describe, expect, test } from "vitest";
import {
  CapabilityRegistry,
  canComplete,
  resolveExecutionContext,
  selectCapabilities,
  validateActionTarget,
} from "../../src/policy/index.js";

describe("provider-neutral runtime contracts", () => {
  test("impact is metadata and invalid targets are typed contract failures", () => {
    expect(validateActionTarget({ kind: "git-ref", id: "main" })).toEqual({ decision: "allow" });
    expect(validateActionTarget({ kind: "git-ref", id: "" }).decision).toBe("invalid");
  });

  test("completion requires deliverables, verification, and no unverified outcome", () => {
    const contract = { requiredDeliverables: ["change"], requiredVerification: ["tests"] };
    expect(canComplete(contract, {
      deliverables: new Set(["change"]), verification: new Set(["tests"]),
      outcomes: [{ actionId: "tests", intendedOutcome: "pass", observedOutcome: "fail", status: "unverified", evidenceRefs: [] }],
    })).toBe(false);
  });

  test("capability selection uses live availability and refreshes generations", () => {
    const snapshot = {
      sessionId: "s1", generation: 0, host: { adapter: "test" },
      discovery: { mode: "upfront" as const },
      capabilities: [
        { id: "mcp:git", source: "mcp" as const, name: "git repository status", availability: "available" as const },
        { id: "mcp:down", source: "mcp" as const, name: "git repository status", availability: "failed" as const },
      ], mcpServers: [],
    };
    expect(selectCapabilities(snapshot, "repository status").map((item) => item.id)).toEqual(["mcp:git"]);
    const registry = new CapabilityRegistry(snapshot);
    registry.invalidate();
    expect(registry.get().generation).toBe(1);
  });

  test("AO context is explicit and keeps the project root", () => {
    const context = resolveExecutionContext({ AO_SESSION_ID: "s1", AO_PROJECT_ID: "p1", AO_PROJECT_ROOT: "/tmp/project" });
    expect(context.mode).toBe("ao-worker");
    expect(context.projectRoot).toBe("/tmp/project");
  });
});
