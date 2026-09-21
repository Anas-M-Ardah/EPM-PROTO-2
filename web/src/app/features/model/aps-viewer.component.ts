import {
  AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy,
  Output, EventEmitter, SimpleChanges, ViewChild, inject, signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { LangService } from '../../core/lang';
import { ModelApi } from './model.api';
import { ViewerGroupSummary, ViewerMetadataSummary } from './model.types';

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
  @Input() group = 'all';
  @Output() metadataReady = new EventEmitter<ViewerMetadataSummary>();
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  loading = signal(false);
  error = signal<string | null>(null);

  private viewer: any = null;
  private ready = false;
  private generation = 0;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;
  private groupDbIds = new Map<string, number[]>();
  private geometryHandler: ((event: any) => void) | null = null;

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
    else if (this.ready && changes['group']) this.applyGroupFilter();
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
        this.fitWhenGeometryIsReady(this.viewer.model);
        try {
          const summary = await this.readMetadata();
          if (generation !== this.generation) return;
          this.metadataReady.emit(summary);
          this.applyGroupFilter();
        } catch {
          // A missing property tree must not hide otherwise valid geometry.
          this.metadataReady.emit({ elementCount: 0, groups: [] });
        }
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
        // PPlus stores these derivatives in its EMEA bucket. Pointing an EMEA
        // URN at the default US stream leaves the hierarchy available but the
        // geometry download stalled indefinitely.
        api: 'streamingV2_EU',
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
    this.groupDbIds.clear();
    if (this.geometryHandler) {
      this.viewer?.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.geometryHandler);
      this.geometryHandler = null;
    }
    if (this.viewer?.model) this.viewer.unloadModel(this.viewer.model);
  }

  /** Progressive NWD streams can finish their hierarchy before any fragments
   * are drawable. Re-fit once geometry arrives so the initial camera cannot
   * remain pointed at the empty pre-load bounds. */
  private fitWhenGeometryIsReady(model: any) {
    let onGeometry: (event: any) => void;
    const fit = () => {
      if (this.viewer?.model !== model) return;
      this.viewer.fitToView();
      this.viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, onGeometry);
      this.geometryHandler = null;
    };
    onGeometry = (event: any) => {
      if (!event.model || event.model === model) fit();
    };
    if (model?.isLoadDone?.()) fit();
    else {
      this.geometryHandler = onGeometry;
      this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, onGeometry);
    }
  }

  /**
   * APS already downloads an instance tree with every viewable. Reading that
   * tree keeps the statistics tied to the actual derivative without shipping
   * thousands of property rows through our API. The category names in the
   * immediate parent is retained as its real model group. We intentionally do
   * not infer disciplines from names: an inference is not model metadata.
   */
  private async readMetadata(): Promise<ViewerMetadataSummary> {
    const model = this.viewer?.model;
    if (!model) return { elementCount: 0, groups: [] };

    const tree = await this.waitForObjectTree(model);
    const ids = new Map<string, number[]>();

    const visit = (dbId: number, ancestry: string[]) => {
      const name = String(tree.getNodeName(dbId) ?? '');
      const path = [...ancestry, name];
      if (tree.getChildCount(dbId) === 0) {
        const label = this.modelGroup(path);
        if (label) {
          const group = ids.get(label);
          if (group) group.push(dbId);
          else ids.set(label, [dbId]);
        }
        return;
      }
      tree.enumNodeChildren(dbId, (childId: number) => visit(childId, path), false);
    };
    tree.enumNodeChildren(tree.getRootId(), (id: number) => visit(id, []), false);

    const groups: ViewerGroupSummary[] = [...ids.entries()]
      .map(([label, dbIds]) => ({ key: label, label, count: dbIds.length, dbIds }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    for (const item of groups) this.groupDbIds.set(item.key, item.dbIds);
    return {
      elementCount: groups.reduce((total, item) => total + item.count, 0),
      groups,
    };
  }

  private waitForObjectTree(model: any): Promise<any> {
    const existing = model.getData?.()?.instanceTree;
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeout: number | null = null;
      const cleanup = () => {
        if (timeout !== null) clearTimeout(timeout);
        this.viewer?.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, onCreated);
      };
      const finish = (tree: any) => {
        if (settled || !tree) return;
        settled = true;
        cleanup();
        resolve(tree);
      };
      const onCreated = (event: any) => {
        if (!event.model || event.model === model) finish(model.getData?.()?.instanceTree);
      };
      timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('APS object tree was not available'));
      }, 30_000);

      this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, onCreated);
      model.getObjectTree((created: any) => finish(created), () => undefined);
    });
  }

  private modelGroup(ancestry: string[]): string | null {
    // The final name is the leaf itself; its direct parent is the grouping APS
    // exposes in the model browser (for example Doors, Windows, or Rooms).
    const label = ancestry.at(-2)?.trim();
    return label || null;
  }

  private applyGroupFilter() {
    if (!this.viewer?.model) return;
    if (this.group === 'all') {
      this.viewer.showAll();
      return;
    }
    const dbIds = this.groupDbIds.get(this.group) ?? [];
    if (dbIds.length) this.viewer.isolate(dbIds, this.viewer.model);
    else this.viewer.showAll();
  }
}
