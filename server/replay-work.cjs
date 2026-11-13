'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { parentPort, workerData } = require('node:worker_threads');

function loadModule(source) {
  const module = { exports: {} };
  new Function('module', 'exports', source)(module, module.exports);
  return module.exports;
}

const { importReplay, replayIdentity } = loadModule(workerData.importSource);
const { extractMapTimeline } = loadModule(workerData.mapSource);
const { rebuildPlayerCounts } = loadModule(workerData.cacheSource);

let db;
try {
  const job = workerData.job;
  const replay = JSON.parse(fs.readFileSync(job.jsonPath, 'utf8'));
  if (!replay || Array.isArray(replay) || typeof replay !== 'object')
    throw new Error('Reader output must be a JSON object.');
  if (typeof replay.error === 'string' && replay.error) throw new Error(replay.error);
  db = new DatabaseSync(workerData.databasePath, { readOnly: job.action === 'map' });
  db.exec('PRAGMA busy_timeout = 5000');
  if (job.action === 'map') {
    const { gameID: decodedID, fromHeader } = replayIdentity(replay);
    const legacyMatch = fromHeader && db.prepare('SELECT 1 FROM GameStats WHERE gameID = ? AND replayName = ?')
      .get(job.gameID, path.basename(job.input));
    if (decodedID.toLowerCase() !== String(job.gameID).toLowerCase() && !legacyMatch) {
      const error = new Error('The replay file has a different gameID from this match.');
      error.code = 'replay_mismatch';
      throw error;
    }
    parentPort.postMessage({ result: extractMapTimeline(replay, job.gameID, job.ownerIds) });
  } else if (job.action === 'import') {
    const imported = importReplay(db, replay, job.name, job.ownerIds);
    let warning = null;
    if (!imported.duplicate) {
      try { rebuildPlayerCounts(db); }
      catch (error) {
        db.prepare("DELETE FROM PlayerCacheMeta WHERE key IN ('sourceRows', 'sourcePlayers')").run();
        warning = `Player search cache could not refresh: ${error.message}`;
      }
    }
    let timeline = null;
    const newest = !imported.duplicate && db.prepare('SELECT gameID FROM GameStats ORDER BY timestamp DESC LIMIT 1').get();
    if (newest?.gameID === imported.gameID) {
      try { timeline = extractMapTimeline(replay, imported.gameID, job.ownerIds); }
      catch (error) { warning = `Map movement could not load: ${error.message}`; }
    }
    const skinIds = [...new Set((replay.PlayerData || []).map(player => player?.Cosmetics?.Character).filter(Boolean))];
    parentPort.postMessage({ result: { imported, timeline, skinIds, warning } });
  } else throw new Error('Invalid replay worker action.');
} catch (error) {
  parentPort.postMessage({ error: { message: error.message || String(error), code: error.code || null } });
} finally {
  db?.close();
}
