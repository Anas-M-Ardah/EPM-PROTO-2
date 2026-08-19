import { Component, EventEmitter, Input, Output, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { LangService } from '../core/lang';

/**
 * <epm-amd-mark [count]="3" [pendingCount]="1" [sources]="row.amendment.sources"
 *               (opened)="openAmendments(row)" />
 *
 * Ported from DAmdMark — the live prototype's `app/contract-amendments.jsx:188`.
 * `.d-amd-mark` and its three states are already in
 * `web/src/styles/desktop.css:2058`; nothing here adds CSS.
 *
 * ── THE STATE IS NEVER COLOUR-ONLY (05 §7.6) ──────────────────────────────
 * The badge's label IS the count, so a reader who cannot tell the settled
 * green from the pending amber still reads «3». `mixed` adds a dot as a second
 * channel, and the tooltip names every order and its state in words.
 *
 * ── THREE STATES, NOT TWO ────────────────────────────────────────────────
 * all applied · all pending · MIXED. The third is the one that matters: a row
 * touched by an applied order AND an approved-unapplied one is showing a
 * settled figure with an unsettled one behind it, and «معتمد ≠ مطبَّق»
 * (CLAUDE.md §5.2) is exactly the fact the row has to carry.
 */
@Component({
  selector: 'epm-amd-mark',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    @if (n() > 0) {
      <button type="button" class="d-amd-mark {{ cls() }}" [title]="tip()"
              [attr.aria-label]="tip()" (click)="onClick($event)">
        <epm-icon name="history" [size]="11" /><bdi>{{ n() }}</bdi>
        @if (cls() === 'mix') { <i class="dot"></i> }
      </button>
    }
  `,
})
export class AmendmentMarkComponent {
  lang = inject(LangService);

  @Input() set count(v: number) { this.n.set(v ?? 0); }
  @Input() set pendingCount(v: number) { this.np.set(v ?? 0); }
  /** One entry per order that touched the row: its number and whether it is applied. */
  @Input() set sources(v: readonly { no: string; isApplied: boolean }[] | null) {
    this.srcs.set(v ?? []);
  }

  @Output() opened = new EventEmitter<void>();

  // Public because the template reads them: `count` and `pendingCount` are
  // SETTERS, so their names are not readable values inside the view.
  n = signal(0);
  np = signal(0);
  private srcs = signal<readonly { no: string; isApplied: boolean }[]>([]);

  /**
   * The stylesheet's own three class names, which are the reference's:
   * `on` settled · `pend` awaiting application · `mix` both.
   */
  cls = computed(() =>
    this.np() === 0 ? 'on' : this.np() === this.n() ? 'pend' : 'mix');

  /** «VO-01 — نافذ · VO-05 — بانتظار التطبيق» — the words behind the colour. */
  tip = computed(() => this.srcs()
    .map(s => `${s.no} — ${this.lang.t(s.isApplied ? 'amd_src_applied' : 'amd_src_pending')}`)
    .join(' · '));

  /**
   * The badge sits inside a row that opens something else when clicked, so it
   * has to stop the row from also reacting.
   */
  onClick(ev: Event) { ev.stopPropagation(); this.opened.emit(); }
}
