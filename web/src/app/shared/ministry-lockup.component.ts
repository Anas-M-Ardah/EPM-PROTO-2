import { Component, Input } from '@angular/core';
import { inject } from '@angular/core';
import { LangService } from '../core/lang';

/**
 * <epm-ministry-lockup [size]="52" />
 *
 * PORTED VERBATIM from the design-revamp prototype's `MinistryLockup`
 * (shell.jsx:203) — including its inline styles, which is where its whole
 * appearance lives. THERE IS NO CSS CLASS FOR IT. The first pass at the
 * sign-in screen wrote `.lp-lockup`, which is not in public.css and never
 * was: the element rendered unstyled, as a single line, with no department
 * line under the ministry name.
 *
 * The crest is `brand/ministry-logo.svg` at `size`; the two lines are the
 * ministry and the department (`03 §7`'s owning body and its department),
 * at 13 / 11.5 — both on the scale.
 *
 * `onDark` is the reference's own flag for placing the lockup on the navy
 * planes (`--nav-bg-2`, the footer and the mobile hero), where the token
 * colours have no contrast.
 */
@Component({
  selector: 'epm-ministry-lockup',
  standalone: true,
  template: `
    @if (variant === 'stack') {
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px">
        <img src="brand/ministry-logo.svg" [alt]="lang.t('ministry')" [width]="size" [height]="size"
             style="display:block;flex:none;object-fit:contain" />
        <div>
          <div [style.color]="nameColor" style="font-size:13px;font-weight:var(--fw-x);line-height:1.35">{{ lang.t('ministry') }}</div>
          <div [style.color]="subColor" style="font-size:11.5px;margin-top:2px">{{ lang.t('dept') }}</div>
        </div>
      </div>
    } @else {
      <div style="display:flex;align-items:center;gap:12px">
        <img src="brand/ministry-logo.svg" [alt]="lang.t('ministry')" [width]="size" [height]="size"
             style="display:block;flex:none;object-fit:contain" />
        <div style="min-width:0">
          <div [style.color]="nameColor" style="font-size:13px;font-weight:var(--fw-x);line-height:1.3">{{ lang.t('ministry') }}</div>
          <div [style.color]="subColor" style="font-size:11.5px;margin-top:1px">{{ lang.t('dept') }}</div>
        </div>
      </div>
    }
  `,
})
export class MinistryLockupComponent {
  lang = inject(LangService);

  @Input() size = 44;
  @Input() variant: 'row' | 'stack' = 'row';
  @Input() onDark = false;

  get nameColor() { return this.onDark ? '#fff' : 'var(--on-surface)'; }
  get subColor() { return this.onDark ? 'rgba(255,255,255,.7)' : 'var(--on-surface-variant)'; }
}
