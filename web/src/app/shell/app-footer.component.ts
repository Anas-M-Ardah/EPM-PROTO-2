import { Component, ViewEncapsulation, inject } from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { RouterLink } from '@angular/router';
import { LangService } from '../core/lang';

/**
 * <epm-app-footer /> — the `.d-appfoot` band across the bottom of the shell.
 *
 * Ported from v1.1 DAppFooter —
 * ../epm@design/system-revamp app/desktop-shell.jsx:716.
 *
 * ── THE ENVIRONMENT BADGE IS THE POINT ────────────────────────────────────
 * «بيئة تجريبية» / PROTOTYPE is not decoration. Every figure in this system
 * comes from an illustrative fixture (Fixture.cs says so at the top), and this
 * is the only place on screen that says so to the person reading it. A
 * screenshot of this app without that badge is a screenshot that can be
 * mistaken for ministry data.
 *
 * The support number and address are the reference's own placeholders and are
 * carried verbatim; they are not verified contact details.
 */
@Component({
  selector: 'epm-app-footer',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent, RouterLink],
  template: `
    <footer class="d-appfoot">
      <span class="org">
        <epm-icon name="account_balance" [size]="13" />
        <b>{{ lang.t('ministry') }}</b>
        <span class="hide-sm">{{ lang.isAr() ? '— نظام إدارة المشاريع الهندسية' : '— Engineering Projects Management' }}</span>
      </span>

      <span class="sp"></span>

      <span class="it"><span class="env">{{ lang.t('env_prototype') }}</span></span>

      <!--
        The reference asks for the "support_agent" icon, which its OWN icons.js
        does not define — so the reference itself renders a fallback glyph here.
        Same defect class as P-25. "help" is defined, reads as support, and is
        not a broken box. Worth reporting upstream.
      -->
      <span class="it hide-sm">
        <epm-icon name="help" [size]="13" />
        {{ lang.t('support') }}
        <a href="tel:+9647701002440"><bdi>2440</bdi></a>
        <a href="mailto:support@mohe.gov.iq"><bdi>support&#64;mohe.gov.iq</bdi></a>
      </span>

      <!--
        The rules reference, reachable without inventing a nav entry the
        reference's own rail does not have. It belongs beside the version for
        the same reason the version does: this is the band a reviewer reads
        when they want to know what they are looking at.
      -->
      <span class="it hide-sm">
        <epm-icon name="functions" [size]="13" />
        <a routerLink="/docs">{{ lang.t('doc_r_title') }}</a>
      </span>

      <span class="it">
        {{ lang.t('version') }}<span class="ver num"><bdi>{{ version }}</bdi></span>
      </span>
    </footer>
  `,
})
export class AppFooterComponent {
  lang = inject(LangService);

  /** Matches the reference prototype's own version line. */
  readonly version = '1.4.0';
}
