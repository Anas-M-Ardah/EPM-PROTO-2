import {
  AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy,
  SimpleChanges, ViewChild, inject, signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { LangService } from '../../core/lang';
import { ModelApi } from './model.api';

declare const Autodesk: any;

/** Autodesk APS Viewer host. Secrets remain in the API; this receives a URN. */
@Component({
  selector: 'epm-aps-viewer',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="epm-aps-viewer" #host></div>
    @if (!urn) {
      <div class="d-model-loading">
        <epm-icon name="deployed_code" [size]="34" />
        <b>{{ lang.t('mdl_viewer_unconfigured_t') }}</b>
        <span>{{ lang.t('mdl_viewer_unconfigured_b') }}</span>
      </div>
    } @else if (loading()) {
      <div class="d-model-loading" aria-live="polite">
        <epm-icon name="deployed_code" [size]="34" />
        <span>{{ lang.t('mdl_viewer_loading') }}</span>
      </div>
    } @else if (error()) {
      <div class="d-model-loading" role="alert">
        <epm-icon name="error" [size]="30" />
        <b>{{ lang.t('mdl_viewer_error') }}</b>
        <span><bdi>{{ error() }}</bdi></span>
        <button type="button" class="d-btn primary" (click)="load()">{{ lang.t('retry') }}</button>
      </div>
    }
  `,
})
export class ApsViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  private api = inject(ModelApi);
  lang = inject(LangService);

  @Input() urn: string | null = null;
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  loading = signal(false);
  error = signal<string | null>(null);

  private viewer: any = null;
  private ready = false;
  private generation = 0;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;

  ngAfterViewInit() {
    this.ready = true;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame !== null) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.viewer?.resize();
      });
    });
    this.resizeObserver.observe(this.host.nativeElement);
    void this.load();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.ready && changes['urn']) void this.load();
  }

  async load() {
    const generation = ++this.generation;
    this.error.set(null);

    if (!this.urn) {
      this.loading.set(false);
      this.clearModel();
      return;
    }

    if (typeof Autodesk === 'undefined' || !Autodesk.Viewing) {
      this.error.set(this.lang.t('mdl_viewer_sdk_error'));
      return;
    }

    this.loading.set(true);
    try {
      if (!this.viewer) await this.initialize();
      if (generation !== this.generation) return;

      this.clearModel();
      const documentId = this.urn.startsWith('urn:') ? this.urn : `urn:${this.urn}`;
      await new Promise<void>((resolve, reject) => {
        Autodesk.Viewing.Document.load(
          documentId,
          (doc: any) => {
            const geometry = doc.getRoot().getDefaultGeometry();
            this.viewer.loadDocumentNode(doc, geometry).then(() => resolve(), reject);
          },
          (code: number, message: string) => reject(new Error(`${code}: ${message}`)),
        );
      });
      if (generation === this.generation) {
        this.viewer.fitToView();
        this.loading.set(false);
      }
    } catch (e: any) {
      if (generation !== this.generation) return;
      this.loading.set(false);
      this.error.set(e?.error?.detail ?? e?.message ?? this.lang.t('mdl_viewer_error'));
    }
  }

  ngOnDestroy() {
    this.generation++;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeFrame !== null) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = null;
    if (this.viewer) {
      this.viewer.finish();
      this.viewer = null;
    }
  }

  private async initialize() {
    await new Promise<void>((resolve, reject) => {
      Autodesk.Viewing.Initializer({
        env: 'AutodeskProduction2',
        api: 'streamingV2',
        getAccessToken: async (callback: (token: string, expiresIn: number) => void) => {
          try {
            const token = await firstValueFrom(this.api.getViewerToken());
            callback(token.accessToken, token.expiresIn);
          } catch (e) {
            reject(e);
          }
        },
      }, () => {
        this.viewer = new Autodesk.Viewing.GuiViewer3D(this.host.nativeElement, {
          extensions: ['Autodesk.DocumentBrowser'],
        });
        const code = this.viewer.start();
        if (code > 0) reject(new Error(`Viewer start failed (${code})`));
        else resolve();
      });
    });
  }

  private clearModel() {
    if (this.viewer?.model) this.viewer.unloadModel(this.viewer.model);
  }
}
