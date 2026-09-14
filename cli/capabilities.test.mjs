import test from 'node:test';
import assert from 'node:assert/strict';
import { selectAvailableCapabilities } from './capabilities.mjs';

test('capability selection resolves semantic intent from the live snapshot', () => {
  const result = selectAvailableCapabilities('repository git files', {
    capabilities: [
      { id: 'a', name: 'source control', description: 'Git operations', tags: ['git'], availability: 'available' },
      { id: 'b', name: 'dead tool', description: 'Git', tags: [], availability: 'failed' },
    ],
  });
  assert.deepEqual(result.map((item) => item.id), ['a']);
});
