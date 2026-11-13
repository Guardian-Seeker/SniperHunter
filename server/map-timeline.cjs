'use strict';

// The full reader JSON is transient. Keep at most four positions per second per
// player, rather than copying movement into database.db.
function estimateVisibilityRadius(players, owner) {
  if (!owner?.Locations?.length) return 28000;
  const own = owner.Locations;
  const distances = [];
  for (const player of players) {
    if (player === owner || !Array.isArray(player.Locations)) continue;
    const locations = player.Locations;
    for (let index = 1; index < locations.length; index++) {
      const current = locations[index], previous = locations[index - 1];
      const time = current.LastUpdateTime;
      if (!Number.isFinite(time) || time < 90 || time - previous.LastUpdateTime < 8) continue;
      const point = current.ReplicatedMovement?.Location;
      if (!point || !Number.isFinite(point.X) || !Number.isFinite(point.Y)) continue;
      let low = 0, high = own.length;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (own[mid].LastUpdateTime < time) low = mid + 1;
        else high = mid;
      }
      const near = [own[low - 1], own[low]].filter(Boolean).sort((a, b) =>
        Math.abs(a.LastUpdateTime - time) - Math.abs(b.LastUpdateTime - time))[0];
      const position = near?.ReplicatedMovement?.Location;
      if (!position || Math.abs(near.LastUpdateTime - time) > 1) continue;
      const distance = Math.hypot(point.X - position.X, point.Y - position.Y);
      if (distance >= 20000 && distance <= 60000) distances.push(distance);
    }
  }
  if (distances.length < 5) return 28000;
  distances.sort((a, b) => a - b);
  return Math.ceil(distances[Math.floor((distances.length - 1) * .95)] / 1000) * 1000;
}
function extractMapTimeline(replay, gameID, ownerIds = []) {
  const tracks = [];
  let minimum = Infinity;
  let maximum = -Infinity;
  const offsets = [];
  for (const player of replay.PlayerData || []) {
    for (const movement of player.Locations || []) {
      const world = movement.ReplicatedWorldTimeSecondsDouble || movement.ReplicatedWorldTimeSeconds;
      const update = movement.LastUpdateTime;
      if (Number.isFinite(world) && world > 0 && Number.isFinite(update) && update >= 0)
        offsets.push(world - update);
      if (offsets.length >= 300) break;
    }
    if (offsets.length >= 300) break;
  }
  offsets.sort((a, b) => a - b);
  const worldOffset = offsets.length ? offsets[Math.floor(offsets.length / 2)] : 0;
  let usesReplayTime = false;
  for (const player of replay.PlayerData || []) {
    const samples = [];
    let previous = -Infinity;
    for (const movement of player.Locations || []) {
      const location = movement.ReplicatedMovement?.Location;
      const update = movement.LastUpdateTime;
      const world = movement.ReplicatedWorldTimeSecondsDouble || movement.ReplicatedWorldTimeSeconds;
      const time = Number.isFinite(update) && update >= 0 ? update : world - worldOffset;
      if (!location || !Number.isFinite(time) || !Number.isFinite(location.X) || !Number.isFinite(location.Y)) continue;
      if (Number.isFinite(update) && update >= 0) usesReplayTime = true;
      if (time < previous || time - previous < .25) continue;
      previous = time;
      const rotation = movement.ReplicatedMovement.Rotation?.Yaw;
      const velocity = movement.ReplicatedMovement.LinearVelocity;
      const yaw = Number.isFinite(rotation) ? rotation : velocity && Number.isFinite(velocity.X) && Number.isFinite(velocity.Y)
        ? Math.atan2(velocity.Y, velocity.X) * 180 / Math.PI : 0;
      samples.push([Math.round(time * 100) / 100, Math.round(location.X), Math.round(location.Y),
        Math.round(location.Z || 0), Math.round(((yaw % 360) + 360) % 360)]);
    }
    if (!samples.length) continue;
    minimum = Math.min(minimum, samples[0][0]);
    maximum = Math.max(maximum, samples[samples.length - 1][0]);
    const rawTeam = Number(player.TeamIndex);
    tracks.push({ id: String(player.PlayerId || player.EpicId || player.Id || player.PlayerName || tracks.length),
      name: String(player.PlayerName || player.PlayerNameCustomOverride || 'Unknown player'),
      team: Number.isFinite(rawTeam) && rawTeam >= 2 ? rawTeam - 2 : -1, bot: !!player.IsBot, samples });
  }
  if (!usesReplayTime && Number.isFinite(minimum)) {
    for (const track of tracks) for (const sample of track.samples)
      sample[0] = Math.round((sample[0] - minimum) * 10) / 10;
    maximum -= minimum;
  }
  const stormZones = (replay.MapData?.SafeZones || []).map(zone => {
    const center = zone.NextCenter;
    return {
      start: Number(zone.StartShrinkTime) - worldOffset,
      finish: Number(zone.FinishShrinkTime) - worldOffset,
      radius: Number(zone.Radius), nextRadius: Number(zone.NextRadius),
      nextX: Number(center?.X), nextY: Number(center?.Y),
    };
  }).filter(zone => Object.values(zone).every(Number.isFinite) && zone.radius > 0 && zone.nextRadius > 0);
  const recordedLength = Number(replay.Info?.LengthInMs) / 1000;
  const players = replay.PlayerData || [];
  const replayOwners = players.filter(player => player.IsReplayOwner === true && player.PlayerId);
  const configuredIds = new Set(ownerIds.map(id => String(id).toLowerCase()));
  const configuredOwners = players.filter(player => player.PlayerId && configuredIds.has(String(player.PlayerId).toLowerCase()));
  const owner = replayOwners.length === 1 ? replayOwners[0] : replayOwners.length === 0 && configuredOwners.length === 1
    ? configuredOwners[0] : null;
  return { gameID, mapInfo: replay.GameData?.MapInfo || '',
    duration: Math.ceil(Math.max(0, maximum, Number.isFinite(recordedLength) ? recordedLength : 0)),
    worldOffset, stormZones, ownerId: owner?.PlayerId || null,
    visibilityRadius: owner ? estimateVisibilityRadius(players, owner) : null, tracks };
}

module.exports = { extractMapTimeline };
