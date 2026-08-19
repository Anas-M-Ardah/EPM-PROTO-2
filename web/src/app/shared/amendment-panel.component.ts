import { Component, EventEmitter, Input, Output, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import * as fmt from '../core/format';
import { IconComponent } from '../core/icon.component';
import { LangService } from '../core/lang';
import { DrawerComponent } from './drawer.component';

/**
 * One step of the chain, in the shape both owners send it.
 *
 * A BOQ line moves QUANTITIES and an activity moves DAYS, so `from`/`to` are
 * the primary pair and `secondaryFrom`/`secondaryTo` the money or the finish
 * date. Two owners, one drawer — `04 §6` asks for the same disclosure of both
 * and the reference gives them one component.
 */
export interface AmendmentStepView {
  no: string;
  at: string | null;
  isApplied: boolean;
  from: string;
  to: string;
  secondary: string;
  /** BR-05's re-priced portion, when this order introduced one. */
  excess: string | null;
}

export interface AmendmentBandView {
  label: string;
  sourceNo: string | null;
  qty: string;
  rate: string;
  amount: string;
  isExcess: boolean;
  isTotal: boolean;
}

/** One «الوضع النافذ» row. */
export interface AmendmentFactView {
  key: string;
  value: string;
  sub?: string | null;
}

/**
 * <epm-amd-panel [title]="…" [code]="…" [facts]="…" [chain]="…" (closed)="…" />
 *
 * Ported from DAmdPanel — `app/contract-amendments.jsx:240`. ROADMAP 4.5's
 * «identical for BOQ items and activities»: the two callers translate their own
 * figures into `AmendmentStepView` and this draws them, so SCR-W4 and SCR-W5
 * cannot end up disclosing the same fact two different ways.
 *
 * ── THE PENDING GROUP IS SEPARATE AND SAYS SO ────────────────────────────
 * Applied steps and approved-unapplied ones are two lists under two labels,
 * with a standing note on the second saying it is excluded from the effective
 * figures. Interleaving them by date would put an unsettled number in the
 * middle of a settled chain, which is the error `02 §9` exists to prevent.
 *
 * `.d-amd-steps`, `.d-amd-step`, `.d-amd-bands` and `.d-drawer.wide` are all
 * already in `web/src/styles/desktop.css`; nothing here adds CSS.
 */
@Component({
  selector: 'epm-amd-panel',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [DrawerComponent, IconComponent],
  template: `
    <epm-drawer [title]="title" [sub]="code" [wide]="true" [hasFooter]="true"
                [closeLabel]="lang.t('amd_close')" (closed)="closed.emit()">
      <div class="d-drawer-grp">
        <span class="lbl">{{ lang.t('amd_effective_now') }}</span>
        <div class="d-form-grid">
          @for (f of facts; track f.key) {
            <div class="d-form-i">
              <span class="k">{{ f.key }}</span>
              <span class="v mono"><bdi>{{ f.value }}</bdi></span>
              @if (f.sub) { <span class="d-cell-sub"><bdi>{{ f.sub }}</bdi></span> }
            </div>
          }
        </div>
      </div>

      <div class="d-drawer-grp">
        <span class="lbl">{{ lang.t('amd_applied_chain') }}</span>
        <div class="d-amd-steps">
          @for (s of applied(); track s.no) {
            <div class="d-amd-step">
              <span class="no mono"><bdi>{{ s.no }}</bdi></span>
              <span class="dt d-cell-sub mono"><bdi>{{ s.at ?? '—' }}</bdi></span>
              <span class="fig mono"><bdi>{{ s.from }} → {{ s.to }}</bdi></span>
              <span class="sec mono d-cell-sub"><bdi>{{ s.secondary }}</bdi></span>
              @if (s.excess) {
                <span class="d-pill suspended">{{ lang.t('amd_new_rate') }} <bdi>{{ s.excess }}</bdi></span>
              }
            </div>
          } @empty {
            <div class="d-cell-sub">{{ lang.t('amd_none_applied') }}</div>
          }
        </div>
      </div>

      @if (pending().length) {
        <div class="d-drawer-grp">
          <span class="lbl">{{ lang.t('amd_pending_chain') }}</span>
          <div class="d-amd-steps">
            @for (s of pending(); track s.no) {
              <div class="d-amd-step pend">
                <span class="no mono"><bdi>{{ s.no }}</bdi></span>
                <span class="dt d-cell-sub mono"><bdi>{{ s.at ?? '—' }}</bdi></span>
                <span class="fig mono"><bdi>{{ s.from }} → {{ s.to }}</bdi></span>
                <span class="sec mono d-cell-sub"><bdi>{{ s.secondary }}</bdi></span>
                @if (s.excess) {
                  <span class="d-pill suspended">{{ lang.t('amd_new_rate') }} <bdi>{{ s.excess }}</bdi></span>
                }
              </div>
            }
          </div>
          <div class="d-vow-note warn" style="margin-top: 8px">
            <epm-icon name="warning" [size]="15" />
            <span>{{ lang.t('amd_pending_note') }}</span>
          </div>
        </div>
      }

      @if (bands.length) {
        <div class="d-drawer-grp">
          <span class="lbl">{{ lang.t('amd_bands') }}</span>
          <div class="d-amd-bands">
            @for (b of bands; track $index) {
              <div class="bd" [class.ex]="b.isExcess" [class.tot]="b.isTotal">
                <span class="l">{{ b.label }}@if (b.sourceNo) { <em class="mono"> <bdi>{{ b.sourceNo }}</bdi></em> }</span>
                <span class="mono q"><bdi>{{ b.qty }}</bdi></span>
                <span class="mono r">× <bdi>{{ b.rate }}</bdi></span>
                <span class="mono a"><bdi>{{ b.amount }}</bdi></span>
              </div>
            }
          </div>
          <div class="d-vow-note" style="margin-top: 8px">
            <epm-icon name="info" [size]="15" />
            <span>{{ lang.t('amd_bands_note') }}</span>
          </div>
        </div>
      }

      <ng-container footer>
        <button type="button" class="d-btn" (click)="closed.emit()">{{ lang.t('amd_close') }}</button>
      </ng-container>
    </epm-drawer>
  `,
})
export class AmendmentPanelComponent {
  lang = inject(LangService);
  fmt = fmt;

  @Input({ required: true }) title = '';
  @Input() code = '';
  @Input() facts: readonly AmendmentFactView[] = [];
  @Input() bands: readonly AmendmentBandView[] = [];
  @Input() set chain(v: readonly AmendmentStepView[] | null) { this.steps.set(v ?? []); }

  @Output() closed = new EventEmitter<void>();

  private steps = signal<readonly AmendmentStepView[]>([]);

  applied = computed(() => this.steps().filter(s => s.isApplied));
  pending = computed(() => this.steps().filter(s => !s.isApplied));
}
