# Sniper Hunter

**Created and maintained by Guardian Seeker.**  
A free, local Fortnite replay viewer for streamers and players who want to recognize repeat opponents, review matches, and investigate possible stream sniping.

Sniper Hunter reads completed replay files, stores match and player history in a local SQLite database, and serves the interface at **http://sniperhunter.localhost/**. An earlier version was used by SypherPK while investigating stream snipers. This version replaces the original desktop interface with Angular and a local Node.js server.

> **Development status:** Version 4.0 is a fresh foundation for the redesigned interface. The external replay reader must be supplied separately; see [Replay reader](#replay-reader).

## Screenshots

> **Last match — screenshot placeholder**  
> Add `docs/screenshots/last-match.png` here to show match statistics, the movement map, the elimination feed, and teams.

> **Recent games — screenshot placeholder**  
> Add `docs/screenshots/recent-games.png` here to show search, date filters, and match history.

> **Snipers List and player profile — screenshot placeholders**  
> Add `docs/screenshots/snipers-list.png` and `docs/screenshots/player-profile.png` here.

> **Add replay — screenshot placeholder**  
> Add `docs/screenshots/add-replay.png` here to show drag and drop import and progress.

Replace each callout with a Markdown image after adding its file, for example `![Last match](docs/screenshots/last-match.png)`.

## Features

- **Match review:** placement, eliminations, assists, accuracy, damage, distance, platform distribution, searchable elimination feed, and sortable team rosters.
- **Match maps:** a collapsible, initially closed map with replay-time movement, shaded storm circles, an estimated owner visibility radius, short past and future trails, playback speed and up to 10× zoom, double-click zoom, drag-to-pan navigation, and team-colored directional player icons. Upload a top-down map image and align it with up to three known player positions. Rotation, points, and a millisecond time offset are saved together. Movement is never written to SQLite. Older matches can reload movement on demand if their matching `.replay` file still exists in Fortnite's Demos folder.
- **Player tracking:** repeat opponents, skin icons, platform filters, player profiles, shared games, and head-to-head encounters, including creative matches.
- **Replay intake:** drag and drop multiple `.replay` files or use the local Fortnite Demos picker. A watcher tracks each new replay and retries while Fortnite is still writing or the replay remains encrypted. The queue reports progress and parsing errors; unreadable replays are flagged when a newer game starts or an incomplete file stays unchanged. Games already stored by `gameID` are skipped.
- **History tools:** recent-game search, date and placement filters, aggregate statistics, old database import, and match deletion.
- **Local control:** automatically saved settings, a live console, update checks, and optional tray controls. Launching Sniper Hunter again opens the already running page, including when it uses a custom port. Custom SQL, saved queries, and CSV export are available to local users.
- **Sharing:** direct local-network access and optional read-only match and player views through a reverse proxy. Public viewers cannot use Settings, Add Replay, Custom SQL, deletion, or shutdown. Disable proxy views in Settings to show a blank denial page instead.

The interface works in a browser, but the database and settings stay on the computer running Sniper Hunter. No cloud account is required.

## Download and run

When releases are available, download the Sniper Hunter ZIP from this repository's **Releases** page, extract it to a writable folder, and launch `SniperHunter.exe`. A desktop shortcut is optional. The release folder should contain:

```text
SniperHunter.exe
SniperHunterParser.exe    # separately compiled parser
skins/                    # supplied skin PNGs, including epic.png and sniper.png
database.db               # optional existing database; created if absent
maps/                     # optional named map PNGs, each with its own alignment
config.json               # settings, saved SQL queries, map alignment, and dismissed updates
```

Install the **[.NET 10 Runtime for Windows x64](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)** for the external reader. The ASP.NET Core Runtime alone is not sufficient. Sniper Hunter checks for `Microsoft.NETCore.App 10.x` at launch and exits with an explanation if it is missing.

The default URL is `http://sniperhunter.localhost/` on port 80. To choose another port, run `SniperHunter.exe -port 8080`; the URL becomes `http://sniperhunter.localhost:8080/`. If port 80 is occupied or hostname setup fails, the program reports the problem and exits. Most installations can run without administrator rights; a machine that needs a hosts-file entry may require one administrator launch.

**Keep `database.db`, `config.json`, and `skins/` beside the executable.** They are deliberately outside the EXE so your history, settings, and downloaded icons survive an update. No Sniper Hunter AppData folder is needed. On first launch after upgrading, Sniper Hunter merges legacy `settings.json`, `saved-queries.json`, `map-calibration.json`, and `dismissed-update.json` into `config.json`, then removes the old files after the combined file is written. The EXE can be shared, while each person's database and settings remain their own.

## Replay reader

Sniper Hunter does not include or compile C# code. Build `SniperHunterParser.exe` separately using [FortniteReplayDecompressor](https://github.com/Shiqan/FortniteReplayDecompressor), then place it beside `SniperHunter.exe`. A starting point is [the parser example](replay/SniperHunterParser.cs).

The server starts the reader with one absolute `.replay` path. The reader writes one `replay.json` file in its working directory, then exits. A Node worker thread reads the JSON, imports it into SQLite, refreshes player search data, and prepares map movement while the server continues serving pages. Sniper Hunter processes replays one at a time and removes the JSON and any temporary uploaded replay. The temporary `reader/` directory appears only while needed and is removed when empty. Watched replays remain in Fortnite's Demos folder; Sniper Hunter does not move or retain them.

The watcher uses `%LOCALAPPDATA%\FortniteGame\Saved\Demos`. If that folder does not exist, the status bar says the watcher is unavailable. You can still add a replay manually.

### Aligning the Last Match map

Use **Select map** on a match to add and name a top-down PNG. Sniper Hunter copies it to `maps/` beside the executable (the repository root during development). The picker also lets you rename, delete, or switch maps; the arrows beside it switch to the adjacent saved map. Your last selection loads next time. Each map has independent alignment stored in `config.json`. An existing `map.png` and its calibration are migrated automatically on first launch.

Open **Map alignment and synchronization**, rotate the coordinate overlay in 90° steps if needed, scrub to a moment when you know a player's position, select that player, and click the matching place on the image. Repeat at **three distinct points**, ideally near three corners of the map. The three-point alignment and millisecond time offset save together only when all three points are valid. Rotation saves immediately, so you can turn the coordinates now and finish calibration later. Partial points remain on the current page but are not saved. The image's top-left is pixel `(0, 0)`; the replay's `(0, 0)` is the level world origin and need not be the center of the map image.

Map names save when you finish editing the field. Double-click the map to zoom in by 1×, or Shift + double-click to zoom out by 1×.

The reader's `PlayerData[].Locations` contains Unreal world positions: X and Y are the map plane and Z is height, in approximately centimeter-scale units. A measured 25 m movement across 2,556 replay units currently sets the scale for elevation labels. The map shows approximate, centered player positions before calibration so movement is visible immediately; three alignment points provide full calibration. Team-colored arrow icons use the replay's recorded yaw to show facing direction. The map aligns `LastUpdateTime` with elimination time; world time is offset from replay time. It samples movement at up to four positions per second and interpolates between them. Small colored dots mark the five seconds before and after each visible player. While the map has keyboard focus, arrow keys step by the selected playback speed and Space plays or pauses. Storm rings use the replay's safe-zone stages; purple shading marks the region outside the active circle and a dashed purple line marks the next circle. The reader does not report a precise owner visibility radius, so Sniper Hunter estimates one from when other players re-enter the recorded area and darkens the rest of the map by 30%. This shadow is shown only when the replay identifies its owner or exactly one configured owner account appears in the match, and disappears when the owner's position is unavailable. Replay updates can be sparse or missing for some players, so the map only shows a player when a recent recorded position is available. The example reader uses `ParseMode.Full` and preserves those samples in the single `replay.json` output.

Platform groups and their oldest-to-newest code order are defined in `server/index.cjs` for developers. The defaults are PC (WIN), PlayStation (PSN, PS5), Xbox (XBL, XSX), Switch (SWT, SWT2), Android (AND), and iOS (IOS). A new code that is not listed appears under its own code; Unknown is reserved for missing platform data.

Opening a match checks `%LOCALAPPDATA%\FortniteGame\Saved\Demos` for the exact filename saved with that match. Sniper Hunter decodes it in a temporary folder, checks that its `GameSessionId` matches the database `gameID`, and removes the temporary JSON after loading the map. If Fortnite removed the replay, place your copy in Demos under the saved filename and use **Try again** on the match page.

## Build from source

On Windows, install Node.js 24.15 or newer and npm. Then run:

```powershell
npm install
npm run dev
```

`npm run dev` builds Angular, watches for changes, and serves the app at the local URL. Use `npm run dev -- -port 8080` for another port or `npm run dev -- --no-browser` to keep it from opening a tab.

For a release build, run `npm run build`. It creates `release/SniperHunter.exe` with the Angular app and Node.js server embedded. The build **does not embed skin PNGs** or compile the replay parser. Attach `release/skins/` and your separately compiled `SniperHunterParser.exe` to the release ZIP.

Development uses `database.db` in the repository root and the skin collection in `release/skins/`. A blank development database is created if the file is absent. To test with an existing database, copy it to the root yourself or set `SNIPER_HUNTER_DATABASE` to an absolute path. `database.db`, settings, generated output, and skin PNGs are Git-ignored. The release uses files beside `SniperHunter.exe` instead.

For replay imports during development, place `SniperHunterParser.exe` in the repository root or set `SNIPER_HUNTER_PARSER_EXE` to its absolute path.

Set `version` and `githubRepositoryUrl` in [release-config.json](release-config.json) before publishing. The build embeds those values; end users do not need that JSON file. Publish numeric release tags such as `v4.1` so the update check can compare versions.

## Data and privacy

The SQLite database retains the original `GameStats`, `GamePlayers`, `GameEliminations`, and `Players` structures for older data. Additional indexes and cached player summaries speed up large histories. Importing an old `database.db` matches shared columns and skips games already present. If the core database structure is missing or corrupt, the app offers to back up that file and create a fresh database.

Direct LAN access has the same local controls as the host computer. A reverse-proxied public domain is read-only, but **anyone with that URL can view the match and player data exposed there**. Choose whether to publish that URL accordingly.

## Credits and support

Sniper Hunter is **made by Guardian Seeker**. Development assistance for this version came from ChatGPT Codex. Replay decoding is based on [FortniteReplayDecompressor](https://github.com/Shiqan/FortniteReplayDecompressor), and missing cosmetic icons are fetched from [Fortnite-API](https://fortnite-api.com/). The original project also credited xNocken's replay reader and Alex Kozack's Vite Electron boilerplate.

The program is free. If it helps you, an optional tip is welcome through [Streamlabs](https://streamlabs.com/guardianseeker/tip). For bugs and suggestions, use this repository's Issues page once the repository is published.

Sniper Hunter does not modify Fortnite gameplay. It reads replay files after matches finish and is not affiliated with or endorsed by Epic Games. See [LICENSE](LICENSE) for the repository license.
