import assert from 'node:assert/strict';

// Network fixtures use the same explicit, authorized claim as a real player.
// Each isolated server receives distinct avatars; no test-mode bypass is needed.
export async function claimFixtureCharacter(base, userId, characterId) {
  const response = await fetch(base + '/api/world/preferences', {
    method: 'PUT',
    headers: {Cookie: 'xp_world_session=' + userId, 'Content-Type': 'application/json'},
    body: JSON.stringify({characterId})
  });
  const result = await response.json();
  assert.equal(response.status, 200, userId + ' must claim ' + characterId + ': ' + JSON.stringify(result));
  assert.equal(result.characterAvailability?.selectedId, characterId);
  assert.equal(result.characterAvailability?.needsSelection, false);
  return result;
}
