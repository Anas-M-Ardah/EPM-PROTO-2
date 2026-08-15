import { StrKey } from '../../core/lang';

/**
 * The fifteen modules of the project workspace, and which of them exist.
 *
 * PORTED from PROJECT_MODULES + MOD_GROUPS — the v1.1 branch,
 * ../epm@design/system-revamp app/data.jsx:445 and app/desktop-workspace.jsx:112.
 * Ids, icons and group membership are the reference's; the order inside each
 * group is the reference's order.
 *
 * ── WHY THE UNBUILT ONES ARE STILL HERE ───────────────────────────────────
 * ROADMAP Phase 3 says "only tabs that exist appear". Followed literally at
 * this point in the build that leaves a rail of two entries and four empty
 * group headings, which is not the screen — the rail's grouping IS how the
 * workspace tells you what a project consists of, and a reviewer needs to see
 * that whole before any of it is built.
 *
 * So the rail renders all fifteen and each unbuilt one says which phase builds
 * it. That is the same answer SCR-E7 gives for a report whose table does not
 * exist yet (P-38) and SCR-E1/SCR-E5 give for a figure they cannot derive
 * (P-09): show it, disable it, and state the reason. The one thing never done
 * is a link that lands on a blank pane — `built: false` is not routable.
 *
 * `built` is the ONE field to change when a module lands. Nothing else in the
 * rail needs touching, and the route table is the other half — a module with
 * `built: true` and no route would be exactly the dead link this avoids.
 */
export interface ProjectModule {
  /** Route segment under `/projects/:id/` and the reference's own module id. */
  id: string;
  /** Icon name from core/icons.ts — the reference's choice for this module. */
  icon: string;
  /** Label key in core/lang.ts. */
  key: StrKey;
  /** Whether the module has a page. False renders it disabled, never linked. */
  built: boolean;
  /** ROADMAP phase that builds it. Shown on the disabled entry. */
  phase: string;
}

export interface ModuleGroup {
  /** Label key in core/lang.ts — `mod_group_*`. */
  key: StrKey;
  modules: ProjectModule[];
}

/**
 * Overview sits ABOVE the groups, ungrouped, as in the reference: it is not one
 * of the four kinds of thing a project consists of, it is the answer to all
 * four at once.
 */
export const OVERVIEW_MODULE: ProjectModule = {
  id: 'overview', icon: 'dashboard', key: 'mod_overview', built: true, phase: '3',
};

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    key: 'mod_group_definition',
    modules: [
      { id: 'information',  icon: 'badge',          key: 'mod_information',  built: true,  phase: '3' },
      { id: 'contract',     icon: 'description',    key: 'mod_contract',     built: true,  phase: '4.1' },
      { id: 'boq',          icon: 'list_alt',       key: 'mod_boq',          built: true,  phase: '4.2' },
      { id: 'financial',    icon: 'payments',       key: 'mod_financials',   built: true,  phase: '4.4' },
    ],
  },
  {
    key: 'mod_group_execution',
    modules: [
      { id: 'schedule',     icon: 'calendar_month', key: 'mod_schedule',     built: true,  phase: '4.3' },
      { id: 'progress',     icon: 'trending_up',    key: 'mod_progress',     built: true,  phase: '4.4' },
      { id: 'changeorders', icon: 'sync_alt',       key: 'mod_changeorders', built: true,  phase: '5.1' },
      { id: 'risk',         icon: 'warning',        key: 'mod_risk',         built: true,  phase: '6' },
    ],
  },
  {
    key: 'mod_group_records',
    modules: [
      { id: 'model',        icon: 'deployed_code',  key: 'mod_model',        built: false, phase: '6' },
      { id: 'meetings',     icon: 'groups',         key: 'mod_meetings',     built: false, phase: '6' },
      { id: 'documents',    icon: 'folder_open',    key: 'mod_documents',    built: false, phase: '6' },
    ],
  },
  {
    key: 'mod_group_oversight',
    modules: [
      { id: 'alerts',       icon: 'notifications',  key: 'mod_alerts',       built: false, phase: '6' },
      { id: 'reports',      icon: 'assessment',     key: 'mod_reports',      built: false, phase: '6' },
      { id: 'audit',        icon: 'history',        key: 'mod_audit',        built: false, phase: '6' },
    ],
  },
];

/** Every module, flat — overview first, then the groups in rail order. */
export const ALL_MODULES: ProjectModule[] = [
  OVERVIEW_MODULE,
  ...MODULE_GROUPS.flatMap(g => g.modules),
];

export function moduleById(id: string): ProjectModule | undefined {
  return ALL_MODULES.find(m => m.id === id);
}
