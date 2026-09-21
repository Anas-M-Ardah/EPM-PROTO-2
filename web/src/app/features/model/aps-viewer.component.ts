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
    <!-- dir="ltr" as PPlus does on its viewer splitter: Autodesk's panels and
         toolbar are laid out LTR, and the 3D canvas is never mirrored. -->
    <div class="epm-aps-viewer" #host dir="ltr" [attr.aria-label]="lang.t('mod_model')"></div>
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
            const root = doc.getRoot();
            const geometry = root.getDefaultGeometry()
              ?? root.search({ type: 'geometry' })[0];
            if (!geometry) {
              reject(new Error('No viewable geometry was found in this document'));
              return;
            }
            this.viewer.loadDocumentNode(doc, geometry).then(() => resolve(), reject);
          },
          (code: number, message: string) => reject(new Error(`${code}: ${message}`)),
        );
      });
      if (generation === this.generation) {
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
        // Keep these values identical to PPlus. In particular, using a
        // different streaming environment can yield a different presentation
        // of the same derivative's viewables and model tree.
        //
        // No `language` option, as in PPlus: Autodesk picks its UI strings
        // from the browser. Viewer 7 ships no Arabic locale (res/locales/ar
        // is a 404), so its chrome falls back to English on an Arabic
        // browser in both apps. Node names are not UI strings — they are
        // authored in the model file and arrive unchanged from its
        // property database, so the file (URN) decides their language.
        env: 'AutodeskProduction',
        api: 'derivativeV2',
        enableMemoryManagement: true,
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
          disableBrowserContextMenu: true,
          useConsolidation: true,
          theme: 'bim-theme',
        });
        const code = this.viewer.start();
        if (code > 0) reject(new Error(`Viewer start failed (${code})`));
        else {
          this.viewer.setSelectionMode(Autodesk.Viewing.SelectionMode.FIRST_OBJECT);
          resolve();
        }
      });
    });
  }

  private clearModel() {
    if (this.viewer?.model) this.viewer.unloadModel(this.viewer.model);
  }
}
