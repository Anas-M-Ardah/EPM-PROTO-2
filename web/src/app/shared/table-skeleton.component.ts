import { Component, Input, ViewEncapsulation, computed, signal } from '@angular/core';

/**
 * <epm-table-skeleton [cols]="7" [rows]="8" />
 *
 * Ported from DTableSkeleton — docs/spec/reference/app/desktop-views.jsx:337.
 *
 * ── IT MUST MATCH THE REAL TABLE'S SHAPE (04 §9) ──────────────────────────
 * Same column count, first cell wider than the rest — so the layout does not
 * jump when the data lands. A generic spinner is not this; a skeleton whose
 * column count disagrees with the table is worse than one, because it moves
 * everything on arrival.
 *
 * aria-hidden + aria-busy on the wrapper: a screen reader should hear "loading",
 * not eight rows of empty cells.
 */
@Component({
  selector: 'epm-table-skeleton',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-tablewrap" aria-busy="true" [attr.aria-label]="loadingLabel">
      <table class="d-table" aria-hidden="true">
        <tbody>
          @for (r of rowList(); track r) {
            <tr>
              <td style="width:44px"><span class="d-skel" style="width:17px;height:17px;display:block"></span></td>
              <td><span class="d-skel" style="width:60%;height:14px;display:block"></span></td>
              @for (c of colList(); track c) {
                <td><span class="d-skel" style="width:50%;height:12px;display:block"></span></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TableSkeletonComponent {
  @Input() set cols(v: number) { this.colsSig.set(v); }
  @Input() set rows(v: number) { this.rowsSig.set(v); }
  @Input() loadingLabel = 'جارٍ التحميل…';

  private colsSig = signal(5);
  private rowsSig = signal(8);

  // The first two cells are rendered explicitly (checkbox + wide first column),
  // so the repeat covers what is left.
  colList = computed(() => Array.from({ length: Math.max(0, this.colsSig() - 1) }, (_, i) => i));
  rowList = computed(() => Array.from({ length: this.rowsSig() }, (_, i) => i));
}
