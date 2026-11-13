import { Component, inject, signal } from '@angular/core';
import { UpdateService } from './update.service';
import { AccessService } from './access.service';

@Component({
  selector: 'app-about-page',
  template: `
    <main class="page narrow-page about-page">
      <div class="about-heading"><div><h1>About Sniper Hunter</h1><p class="muted">Created by Guardian Seeker to review Fortnite matches and recognize repeat opponents.</p></div>
        <div class="about-links">
          <a href="https://streamlabs.com/guardianseeker/tip" target="_blank" rel="noopener noreferrer" class="about-link"><span aria-hidden="true">♥</span>Donate</a>
          @if (githubUrl()) { <a [href]="githubUrl()" target="_blank" rel="noopener noreferrer" class="about-link" title="Open GitHub repository"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="17" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10M8 6c7 0 8 2 8 9"/></svg>GitHub</a> }
          @else { <span class="about-link disabled" title="Set githubRepositoryUrl in release-config.json"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="17" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10M8 6c7 0 8 2 8 9"/></svg>GitHub</span> }
          <a href="https://discord.gg/vw6Rh6J" target="_blank" rel="noopener noreferrer" class="about-link">Discord</a>
        </div>
      </div>
      <section class="panel prose">
        <p>
          <strong>Sniper Hunter is created and maintained by Guardian Seeker.</strong>
          <br />
          It keeps your match history on your computer and serves it in your browser. Review eliminations, teams, and players who appear in multiple games.
        </p>
        <h2>Links and credits</h2>
        <p>The replay reader uses <a href="https://github.com/Shiqan/FortniteReplayDecompressor" target="_blank" rel="noopener noreferrer">FortniteReplayDecompressor</a>. 
        <br />
        Missing cosmetics come from <a href="https://fortnite-api.com/" target="_blank" rel="noopener noreferrer">Fortnite-API</a>.
        <br />Development assistance from ChatGPT Codex.</p>
        @if (!access.readOnly()) { <button type="button" class="toolbar-action" (click)="checkUpdates()">Check for updates</button> }
        @if (updateService.message()) { <p class="muted about-update-message" role="status">{{ updateService.message() }}</p> }
        <h2>Features</h2>
        <ul>
          <li>Latest match statistics, team rosters, platform counts, and an elimination feed.</li>
          <li>Replay analysis runs in the background so match pages remain usable while a replay imports.</li>
          <li><strong>Movement map</strong>
            <ul>
              <li><strong>Playback:</strong> replay-time slider, speed control, arrow-key time steps, Space to play or pause, and optional camera follow for a selected player. Double-click a player icon to jump to their team card.</li>
              <li><strong>Map view:</strong> storm shading, an estimated owner visibility area, five-second past and future trails, directional player icons with elevation labels, drag panning, and up to 10× zoom. Double-click zooms in by one step; Shift + double-click zooms out.</li>
              <li><strong>Alignment:</strong> named maps with independent three-point calibration and time offset. Rotation saves separately.</li>
              <li><strong>Replay loading:</strong> older matches can reload movement from Fortnite Demos. Movement is not stored in the database.</li>
            </ul>
          </li>
          <li>Click a player or team to filter the feed; use the <strong>i</strong> on a player card to open their profile.</li>
          <li>Repeat opponents in each match, with a configurable appearance threshold.</li>
          <li>Search, date and placement filters, clickable game totals, wins, kills, KD, deletion, and old database import in Recent Games.</li>
          <li>Snipers List with fast search, platform filters, platform icons, AI visibility, and player histories.</li>
          <li>Replay navigation follows the Recent Games list or a filtered player's game list.</li>
          <li>Player profiles with shared games, placement filters, creative encounter counts, teammate incidents, and Fortnite Tracker links.</li>
          <li>Drag and drop replay imports, a local picker that opens in Fortnite Demos, automatic detection of new replays, retries while Fortnite is still writing, batch progress, and errors. File changes wake pending replays promptly. Decoded replay data populates match and player tables; temporary copies and JSON are removed after reading.</li>
          <li>Local network access from another computer and optional automatic Last match navigation.</li>
          <li>Optional read-only access through a reverse proxy for sharing match and player views.</li>
          <li>System tray controls to show the page or close the program.</li>
          <li>A fixed replay progress bar with a pulse on click and a shutdown button, plus a live Console in Settings.</li>
          <li>Two themed cursors and a configurable left or right Back to top button.</li>
          <li>Custom SQL with schema browsing, saved queries, and CSV export.</li>
          <li>Skin icons stored beside the executable, automatic missing-icon downloads, and database recovery prompts.</li>
          <li>Portable release storage beside the executable: database.db, one config.json for settings, saved queries, map alignment, and update dismissals, plus skins. Search caches keep large player lists responsive.</li>
          <li>Optional GitHub release checks with ignore and dismiss controls.</li>
        </ul>
      </section>
    </main>
  `,
})
export class AboutPage {
  readonly access = inject(AccessService);
  readonly updateService = inject(UpdateService);
  readonly githubUrl = signal('');
  constructor() { void this.loadConfig(); }
  private async loadConfig(): Promise<void> {
    try { const response = await fetch('/api/config'); if (response.ok) this.githubUrl.set((await response.json()).githubRepositoryUrl || ''); }
    catch { /* leave the GitHub button disabled */ }
  }
  checkUpdates(): void { this.updateService.check(); }
}
