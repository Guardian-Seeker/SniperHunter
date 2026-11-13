import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  readonly requests = signal(0);
  readonly message = signal('');
  check(): void { this.message.set('Checking for updates…'); this.requests.update(value => value + 1); }
}
