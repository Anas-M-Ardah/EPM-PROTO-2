import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { LangService } from '../../core/lang';
import { ThemeService } from '../../core/theme';
import { AuthService } from '../../core/auth';
import { MinistryLockupComponent } from '../../shared/ministry-lockup.component';
import { HeroSceneDirective } from './hero-scene.directive';

/**
 * SCR-P1 — sign-in. PORTED from the design-revamp prototype's `Login`
 * (screens-public.jsx), the build at infinite-azaiton.github.io/epm.
 *
 * ── IT IS A SCREEN, NOT A SECURITY BOUNDARY ───────────────────────────────
 * The reference accepts any credentials after an 800ms pause and so does this.
 * See AuthService for why that is deliberate rather than unfinished. The
 * fields are prefilled exactly as the reference prefills them, because the
 * point of the screen in a review is to be walked past, not filled in.
 *
 * ── THE USERNAME PICKS THE PERSONA, SILENTLY ──────────────────────────────
 * `ahmed.fouad` signs you in as د. أحمد فؤاد, who is ministry-wide — which is
 * why the reference's own default lands on the full portfolio. Typing another
 * persona's name signs you in as them, so the workspace assignment rule
 * (BR-15) can be demonstrated from the front door rather than only from the
 * account switcher.
 *
 * The screen used to SAY so, in a hint under the username field naming the
 * matched persona and their role. That line is gone: it is not in the
 * reference, its `.au-hint` class is not in the sheets, and a sign-in screen
 * should not read someone's role back to them before they have signed in.
 * The behaviour is unchanged — only the announcement is.
 */
@Component({
  selector: 'epm-login-page',
  standalone: true,
  imports: [IconComponent, MinistryLockupComponent, HeroSceneDirective],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './login.page.html',
})
export class LoginPage {
  private router = inject(Router);
  private auth = inject(AuthService);
  lang = inject(LangService);
  theme = inject(ThemeService);

  username = signal('ahmed.fouad');
  password = signal('demo1234');
  showPassword = signal(false);
  remember = signal(true);
  busy = signal(false);


  /** The reference's `onBack` — back to SCR-P0, the front door. */
  home() {
    this.router.navigate(['/']);
  }

  submit(e?: Event) {
    e?.preventDefault();
    if (this.busy()) return;
    this.busy.set(true);

    // The reference's own 800ms — long enough to read as "verifying", short
    // enough not to feel broken. Kept so the two products behave the same.
    setTimeout(() => {
      this.auth.signIn(this.username());
      this.busy.set(false);
      this.router.navigate(['/portfolio']);
    }, 800);
  }
}
