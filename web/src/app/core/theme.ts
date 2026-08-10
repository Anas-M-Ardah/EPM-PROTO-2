import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/**
 * Light / dark, persisted, written to `data-theme` on <html>.
 *
 * The v1.1 sheets carry a complete `[data-theme="dark"]` palette — 220 lines
 * of it — and nothing in the app was setting the attribute, so half the design
 * system was unreachable. The reference exposes the toggle in its account
 * popover; so does ours (`.d-side-acct`).
 *
 * Defaults to the OS preference on first visit and remembers the choice after
 * that. It never follows the OS again once the user has chosen: an explicit
 * choice outranks an inferred one.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(initial());

  constructor() {
    effect(() => {
      const t = this.theme();
      localStorage.setItem('epm_theme', t);
      document.documentElement.setAttribute('data-theme', t);
    });
  }

  isDark = () => this.theme() === 'dark';

  toggle() {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }
}

function initial(): Theme {
  const saved = localStorage.getItem('epm_theme') as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
