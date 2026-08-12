import { Injectable, computed, inject, signal } from '@angular/core';
import { PersonaService } from './persona';

/**
 * THE SIGN-IN GATE. It is a SCREEN, not authentication.
 *
 * ── WHAT THIS IS AND IS NOT ───────────────────────────────────────────────
 * The reference prototype opens on a sign-in form and its account menu ends
 * with «تسجيل الخروج» — that flow is part of the product being reviewed, so it
 * exists here too. What it is NOT is a security boundary: the form accepts any
 * credentials, exactly as the reference's does (`setTimeout(onLogin, 800)`,
 * screens-public.jsx), and the API still trusts the X-Epm-User header (P-05).
 *
 * Signing out therefore protects nothing. It returns the app to its signed-out
 * screen, which is what a reviewer needs to see; anyone who wants the data can
 * still call the API directly. Making the identity trustworthy is a production
 * concern and is deliberately not in this prototype.
 *
 * ── WHY THE PERSONA IS THE ACCOUNT ────────────────────────────────────────
 * `03 §7` already models WHO a user is, and BR-15 hangs workspace assignment
 * off that. Introducing a second identity here — a username with its own
 * record — would mean two answers to "who am I" and only one of them wired to
 * the assignment rule. So the sign-in form selects a persona, and the account
 * menu's persona switcher stays as the fast path for reviewing the model.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private persona = inject(PersonaService);

  /**
   * Persisted, so a reload does not throw a reviewer back to the form. The
   * reference persists its route the same way (`epm_route` in localStorage).
   */
  private readonly signedIn = signal(localStorage.getItem('epm_signed_in') === '1');

  readonly isSignedIn = computed(() => this.signedIn());

  /** The display name for the account block — the persona's, since that IS the account. */
  readonly displayName = computed(() => {
    const p = this.persona.current();
    return p ? p.nameAr : '';
  });

  /**
   * Accepts anything. The username picks the persona when it matches one;
   * otherwise the current persona is kept, so a reviewer who just presses
   * Enter lands as whoever they were last time rather than as nobody.
   */
  signIn(username: string) {
    const u = username.trim().toLowerCase();
    const match = this.persona.all().find(p =>
      p.id.toLowerCase() === u
      || p.id.replace(/^user\./, '').toLowerCase() === u
      || p.nameEn.toLowerCase().replace(/\s+/g, '.') === u);

    if (match) this.persona.select(match.id);

    this.signedIn.set(true);
    localStorage.setItem('epm_signed_in', '1');
  }

  signOut() {
    this.signedIn.set(false);
    localStorage.removeItem('epm_signed_in');
  }
}
