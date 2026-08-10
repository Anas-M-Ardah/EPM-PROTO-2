import { Component, Input, computed, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { ICONS } from './icons';

/**
 * <epm-icon name="list_alt" [size]="18" />
 *
 * Renders the verbatim SVG paths from the reference prototype's icon set.
 * stroke="currentColor" so an icon always inherits the surrounding text colour —
 * never give an icon its own colour (05 §7.5: no colour carries two meanings).
 *
 * 05 §5.3 — icons that flip in RTL (chevrons, arrows, back/forward) are flipped
 * by the `flip` input, not by a global transform. Clocks, checkmarks, search and
 * logos must NOT flip.
 */
@Component({
  selector: 'epm-icon',
  standalone: true,
  template: `<span class="epm-icon" [class.epm-icon-flip]="flip" [style.width.px]="size" [style.height.px]="size" [innerHTML]="svg()"></span>`,
  styles: [`
    .epm-icon { display: inline-grid; place-items: center; line-height: 0; flex: none; }
    .epm-icon svg { display: block; }
    :host-context([dir="rtl"]) .epm-icon-flip svg { transform: scaleX(-1); }
  `],
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) set name(v: string) { this.nameSig.set(v); }
  @Input() size = 20;
  /** true for chevrons/arrows/back-forward — see 05 §5.3 */
  @Input() flip = false;

  private nameSig = signal('_fallback');

  svg = computed<SafeHtml>(() => {
    const inner = ICONS[this.nameSig()] ?? ICONS['_fallback'];
    const s = this.size;
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
    );
  });
}
