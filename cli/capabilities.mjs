import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BIZAR_HOME } from './provision.mjs';

export function readCapabilitySnapshot() {
  try { return JSON.parse(readFileSync(join(BIZAR_HOME(), 'capabilities.json'), 'utf8')); } catch { return null; }
}

export function selectAvailableCapabilities(intent, snapshot = readCapabilitySnapshot()) {
  if (!snapshot) return [];
  const terms = String(intent || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return (snapshot.capabilities || [])
    .filter((capability) => capability.availability === 'available')
    .map((capability) => ({ capability, score: terms.reduce((score, term) => {
      const haystack = `${capability.name} ${capability.description || ''} ${(capability.tags || []).join(' ')}`.toLowerCase();
      return score + (haystack.includes(term) ? 1 : 0);
    }, 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ capability }) => capability);
}
