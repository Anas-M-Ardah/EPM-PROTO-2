import {
  AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output,
  ViewChild, ViewEncapsulation, computed, inject, signal,
} from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { LangService } from '../core/lang';

export interface CommandAction {
  id: string;
  /** The heading this action sits under. Actions are grouped in array order. */
  group: string;
  icon: string;
  label: string;
  /** Second line — what it is, not a repeat of the label. */
  sub?: string;
  /** Right-aligned hint, e.g. a route or a code. Monospaced. */
  meta?: string;
  run: () => void;
}

/**
 * <epm-command-palette [actions]="…" (closed)="…" /> — the ⌘K palette.
 *
 * Ported from v1.1 DCommandPalette —
 * ../epm@design/system-revamp app/desktop-shell.jsx:105.
 *
 * ── IT ONLY OFFERS WHAT EXISTS ────────────────────────────────────────────
 * The action list is built by the shell from the routes that are actually
 * registered plus the workspaces actually loaded. A palette that lists a
 * screen you cannot open is worse than no palette — it is a menu of
 * disappointments. That is the same rule app.routes.ts and the nav follow.
 *
 * ── KEYBOARD IS THE POINT ─────────────────────────────────────────────────
 * ↑/↓ move, Enter runs, Esc closes, and the highlighted row follows the mouse
 * so the two never disagree about what Enter will do.
 */
@Component({
  selector: 'epm-command-palette',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <div class="d-cmdk-scrim" (click)="closed.emit()">
      <div class="d-cmdk" role="dialog" aria-modal="true"
           [attr.aria-label]="lang.isAr() ? 'لوحة الأوامر' : 'Command palette'"
           (click)="$event.stopPropagation()">

        <div class="d-cmdk-input">
          <epm-icon name="search" [size]="20" />
          <input #box
                 type="text"
                 [placeholder]="lang.isAr() ? 'ابحث أو نفّذ أمراً…' : 'Search or run a command…'"
                 [value]="q()"
                 (input)="onQuery($any($event.target).value)"
                 [attr.aria-activedescendant]="activeId()"
                 role="combobox"
                 aria-expanded="true"
                 aria-controls="epm-cmdk-list" />
          <span class="epm-kbd-esc">ESC</span>
        </div>

        <div class="d-cmdk-list" id="epm-cmdk-list" role="listbox">
          @if (flat().length === 0) {
            <div class="d-empty" style="padding:32px">
              <span class="d-empty-ico"><epm-icon name="search_off" [size]="26" /></span>
              <b>{{ lang.isAr() ? 'لا نتائج' : 'No results' }}</b>
            </div>
          }
          @for (g of groups(); track g.name) {
            <div class="d-cmdk-grp">{{ g.name }}</div>
            @for (a of g.items; track a.id) {
              <div class="d-cmdk-i"
                   [id]="'epm-cmdk-' + a.id"
                   role="option"
                   [class.on]="flat()[index()]?.id === a.id"
                   [attr.aria-selected]="flat()[index()]?.id === a.id"
                   (mouseenter)="focusOn(a.id)"
                   (click)="run(a)">
                <span class="ico"><epm-icon [name]="a.icon" [size]="17" /></span>
                <span class="lab">{{ a.label }}@if (a.sub) { <small>{{ a.sub }}</small> }</span>
                @if (a.meta) { <span class="meta"><bdi>{{ a.meta }}</bdi></span> }
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class CommandPaletteComponent implements AfterViewInit {
  lang = inject(LangService);

  @Input({ required: true }) set actions(v: CommandAction[]) { this.all.set(v); }
  @Output() closed = new EventEmitter<void>();

  @ViewChild('box') box?: ElementRef<HTMLInputElement>;

  /** Opened by a keystroke, so it takes the caret — typing must go straight in. */
  ngAfterViewInit() { this.box?.nativeElement.focus(); }

  private all = signal<CommandAction[]>([]);
  q = signal('');
  index = signal(0);

  flat = computed(() => {
    const needle = this.q().trim().toLowerCase();
    if (!needle) return this.all();
    return this.all().filter(a =>
      a.label.toLowerCase().includes(needle)
      || (a.sub ?? '').toLowerCase().includes(needle)
      || (a.meta ?? '').toLowerCase().includes(needle)
      || a.group.toLowerCase().includes(needle));
  });

  /** Same order as `flat()`, so the index and the rendering cannot disagree. */
  groups = computed(() => {
    const out: { name: string; items: CommandAction[] }[] = [];
    for (const a of this.flat()) {
      let g = out.find(x => x.name === a.group);
      if (!g) { g = { name: a.group, items: [] }; out.push(g); }
      g.items.push(a);
    }
    return out;
  });

  activeId = computed(() => {
    const a = this.flat()[this.index()];
    return a ? `epm-cmdk-${a.id}` : null;
  });

  onQuery(v: string) {
    this.q.set(v);
    this.index.set(0);
  }

  focusOn(id: string) {
    const i = this.flat().findIndex(a => a.id === id);
    if (i >= 0) this.index.set(i);
  }

  run(a: CommandAction) {
    a.run();
    this.closed.emit();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { this.closed.emit(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.index.set(Math.min(this.index() + 1, this.flat().length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.index.set(Math.max(this.index() - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const a = this.flat()[this.index()];
      if (a) this.run(a);
    }
  }
}
