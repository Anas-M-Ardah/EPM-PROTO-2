import { Component, ViewEncapsulation, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { LangService } from '../../core/lang';
import { ThemeService } from '../../core/theme';
import { MinistryLockupComponent } from '../../shared/ministry-lockup.component';
import { HeroSceneDirective } from './hero-scene.directive';

/**
 * SCR-P0 — the landing page. PORTED from the design-revamp prototype's
 * `Landing` (screens-public.jsx:162), the desktop branch, class for class.
 *
 * It lives beside `login.page` because the two are one file in the reference
 * and one surface here: the public shell, outside the app's own chrome. There
 * is no `Features/Landing` on the API side and there should not be — nothing
 * on this screen comes from the database.
 *
 * ── THE STYLESHEETS ARE COPIED, NOT RE-DERIVED (P-07) ─────────────────────
 * Every class below — .lp, .lp-nav, .lp-hero, .lp-scene, .lp-eyebrow, .lp-dim,
 * .lp-access, .lp-foot — is already in src/styles/public.css, which was copied
 * verbatim from the reference for the sign-in screen. This page adds no CSS.
 *
 * ── WHAT IS DELIBERATELY NOT PORTED ───────────────────────────────────────
 * · The mobile branch (`MobileLanding`, `.mlp-*`). This app has no mobile
 *   shell, and that branch is one.
 * · The `gateways` and `facts` arrays. They are declared in the reference and
 *   then not rendered — the section that used them is removed, and its own
 *   comment says so («module gateways: removed per request»). Porting dead
 *   data would be porting a decision that was already reversed.
 */
@Component({
  selector: 'epm-landing-page',
  standalone: true,
  imports: [IconComponent, MinistryLockupComponent, HeroSceneDirective],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './landing.page.html',
})
export class LandingPage {
  private router = inject(Router);
  lang = inject(LangService);
  theme = inject(ThemeService);

  /** The reference's `onSignin`. The landing does not authenticate — it hands
   *  over to SCR-P1, which is the only screen that does. */
  signin() {
    this.router.navigate(['/login']);
  }
}
