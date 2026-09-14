export type CapabilitySource = "builtin" | "mcp" | "skill" | "agent" | "workflow" | "plugin" | "shell" | "browser" | "connector";
export type CapabilityAvailability = "available" | "pending" | "failed" | "disabled" | "unknown";

export interface CapabilityRef {
  readonly id: string;
  readonly source: CapabilitySource;
  readonly name: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly availability: CapabilityAvailability;
  readonly schemaRef?: string;
  readonly schemaHash?: string;
  readonly provenance?: string;
}

export interface RuntimeCapabilitySnapshot {
  readonly sessionId: string;
  readonly generation: number;
  readonly host: { readonly adapter: string; readonly version?: string; readonly provider?: string; readonly model?: string };
  readonly discovery: { readonly mode: "deferred" | "upfront" | "unsupported"; readonly searchTool?: string; readonly waitTool?: string };
  readonly capabilities: readonly CapabilityRef[];
  readonly mcpServers: readonly {
    readonly name: string;
    readonly status: "connected" | "cached" | "pending" | "failed" | "auth-required" | "disabled" | "unknown";
    readonly toolsKnown: boolean;
    readonly toolCount?: number;
    readonly lastErrorClass?: string;
  }[];
}

export function selectCapabilities(snapshot: RuntimeCapabilitySnapshot, intent: string): CapabilityRef[] {
  const terms = intent.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return snapshot.capabilities
    .filter((capability) => capability.availability === "available")
    .map((capability) => ({ capability, score: terms.reduce((score, term) => {
      const haystack = `${capability.name} ${capability.description ?? ""} ${(capability.tags ?? []).join(" ")}`.toLowerCase();
      return score + (haystack.includes(term) ? 1 : 0);
    }, 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ capability }) => capability);
}

export class CapabilityRegistry {
  private snapshot: RuntimeCapabilitySnapshot;
  constructor(initial: RuntimeCapabilitySnapshot) { this.snapshot = initial; }
  get(): RuntimeCapabilitySnapshot { return this.snapshot; }
  refresh(update: Omit<RuntimeCapabilitySnapshot, "generation">): RuntimeCapabilitySnapshot {
    this.snapshot = { ...update, generation: this.snapshot.generation + 1 };
    return this.snapshot;
  }
  invalidate(): void { this.snapshot = { ...this.snapshot, generation: this.snapshot.generation + 1 }; }
  select(intent: string): CapabilityRef[] { return selectCapabilities(this.snapshot, intent); }
}
