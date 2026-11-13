import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AccessService {
  readonly readOnly = signal(true);
  private pending?: Promise<void>;

  load(): Promise<void> {
    return this.pending ??= fetch('/api/access')
      .then(async response => {
        if (!response.ok) throw new Error('Access check failed.');
        const value = await response.json() as { readOnly: boolean };
        this.readOnly.set(value.readOnly !== false);
      })
      .catch(() => this.readOnly.set(true));
  }
}

export const localOnly: CanActivateFn = async () => {
  const access = inject(AccessService);
  const router = inject(Router);
  await access.load();
  return access.readOnly() ? router.parseUrl('/lastmatch') : true;
};
