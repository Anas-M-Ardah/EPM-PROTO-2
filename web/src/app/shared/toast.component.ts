import { Component, ViewEncapsulation, inject } from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { ToastService } from './toast.service';

/**
 * <epm-toast /> — mounted once, in the shell.
 *
 * role="status" + aria-live="polite": the toast is the only feedback some
 * actions give, so it has to reach a screen reader too. `polite` rather than
 * `assertive` because none of these interrupt anything.
 */
@Component({
  selector: 'epm-toast',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    @for (t of toast.items(); track t.id) {
      <div class="d-toast" role="status" aria-live="polite">
        <span class="ico" aria-hidden="true"><epm-icon name="check" [size]="14" /></span>
        <span>{{ t.text }}</span>
      </div>
    }
  `,
})
export class ToastComponent {
  toast = inject(ToastService);
}
