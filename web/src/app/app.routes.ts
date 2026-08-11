import { Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';

/**
 * ── APPEND ONE ENTRY PER PAGE ─────────────────────────────────────────────
 * A route exists only when its page exists. Adding a route that lands on a
 * blank pane is worse than not having it — 04 §9 requires every screen to say
 * what to do, and a stub says nothing.
 *
 * The path matches the Angular feature folder, which matches the .NET Features
 * folder:  /projects → features/projects/ → Features/Projects/
 */
export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'portfolio' },

      // SCR-E1 · features/portfolio · Features/Portfolio · [EP-PRT-01]
      {
        path: 'portfolio',
        loadComponent: () => import('./features/portfolio/portfolio.page').then(m => m.PortfolioPage),
      },

      // SCR-E2 · features/projects · Features/Projects · [EP-PRJ-01]
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/projects.page').then(m => m.ProjectsPage),
      },

      // SCR-E3 · features/contracts · Features/Contracts · [EP-CNT-01]
      {
        path: 'contracts',
        loadComponent: () => import('./features/contracts/contracts.page').then(m => m.ContractsPage),
      },

      // SCR-E4 · features/entities · Features/Entities · [EP-ENT-01]
      // The WORKSPACE REGISTER (ملحق الشكل 1) — where a workspace is entered.
      {
        path: 'entities',
        loadComponent: () => import('./features/entities/entities.page').then(m => m.EntitiesPage),
      },

      // SCR-E8 · features/workspaces · Features/Workspaces · [EP-WSP-01]
      // «مساحة العمل › نظرة عامة» (ملحق الشكل 2) — where entering a workspace
      // LANDS. It requires `?ws=`; without one the page sends you to the
      // register, because there is no workspace overview without a workspace.
      //
      // `workspaces` (plural) is the enterprise workspace. `projects/:id`
      // below is the PROJECT workspace. Different screens, different scope.
      {
        path: 'workspace',
        loadComponent: () => import('./features/workspaces/workspaces.page').then(m => m.WorkspacesPage),
      },

      // SCR-E5 · features/schedule-control · Features/ScheduleControl · [EP-SCT-01]
      {
        path: 'schedule-control',
        loadComponent: () =>
          import('./features/schedule-control/schedule-control.page').then(m => m.ScheduleControlPage),
      },

      // SCR-E6 · features/alerts · Features/Alerts · [EP-ALR-01] [EP-ALR-02]
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alerts.page').then(m => m.AlertsPage),
      },

      // SCR-E7 · features/reports · Features/Reports · [EP-RPT-01]
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.page').then(m => m.ReportsPage),
      },

      // ── PHASE 3 · the project workspace ───────────────────────────────
      // `/projects/:id/:module`. It must come AFTER the `projects` route
      // above: a terminal route only matches when it consumes the whole URL,
      // so `/projects` lands on the register and `/projects/PRJ-0148` here.
      //
      // ONLY MODULES THAT EXIST HAVE A ROUTE. features/workspace/
      // project-modules.ts renders the other thirteen disabled, and the two
      // halves have to agree: a `built: true` module with no route here would
      // be exactly the dead link that list exists to prevent.
      {
        path: 'projects/:id',
        loadComponent: () =>
          import('./features/workspace/workspace.page').then(m => m.WorkspacePage),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },

          // SCR-W1 · features/overview · Features/Overview · [EP-OVW-01]
          {
            path: 'overview',
            loadComponent: () =>
              import('./features/overview/overview.page').then(m => m.OverviewPage),
          },

          // SCR-W2 · features/information · Features/Information · [EP-INF-01]
          {
            path: 'information',
            loadComponent: () =>
              import('./features/information/information.page').then(m => m.InformationPage),
          },

          // SCR-W3 · features/contract-tab · Features/ContractTab · [EP-CON-01] [EP-CON-02]
          // The selected contract is a URL segment, not component state: a
          // contract is a record and a link to one has to survive being pasted.
          // The FEATURE is `contract-tab` because a .NET namespace `Contract`
          // shadows the entity type of the same name — see P-43.
          {
            path: 'contract',
            loadComponent: () =>
              import('./features/contract-tab/contract.page').then(m => m.ContractPage),
          },
          {
            path: 'contract/:contractId',
            loadComponent: () =>
              import('./features/contract-tab/contract.page').then(m => m.ContractPage),
          },

          // SCR-W4 · features/boq · Features/Boq · [EP-BOQ-01…08]
          // Same two-route shape as the contract tab, for the same reason and
          // one more: `04 §4` gates this screen behind a contract, so the
          // contract-less path is not a stub — it IS the gate.
          {
            path: 'boq',
            loadComponent: () => import('./features/boq/boq.page').then(m => m.BoqPage),
          },
          {
            path: 'boq/:contractId',
            loadComponent: () => import('./features/boq/boq.page').then(m => m.BoqPage),
          },

          // SCR-W5 · features/schedule · Features/Schedule · [EP-SCD-01] [EP-SCD-02]
          // Gated on a contract for the same reason as the BOQ tab: an activity
          // belongs to exactly one contract (01 §1).
          {
            path: 'schedule',
            loadComponent: () => import('./features/schedule/schedule.page').then(m => m.SchedulePage),
          },
          {
            path: 'schedule/:contractId',
            loadComponent: () => import('./features/schedule/schedule.page').then(m => m.SchedulePage),
          },

          // SCR-W6 · features/progress · Features/Progress · [EP-PRG-01] [EP-PRG-02]
          // NOT gated on a contract, unlike SCR-W4 and SCR-W5: `02 §4` rolls
          // physical % up across every contract the project has, so a gate here
          // would hide the project's own headline figure (P-55).
          {
            path: 'progress',
            loadComponent: () => import('./features/progress/progress.page').then(m => m.ProgressPage),
          },

          // SCR-W7 · features/financials · Features/Financials · [EP-FIN-01]
          // The route segment is `financial` — the module id the rail uses.
          {
            path: 'financial',
            loadComponent: () =>
              import('./features/financials/financials.page').then(m => m.FinancialsPage),
          },

          // SCR-W8 · features/change-orders · Features/ChangeOrders · [EP-CHG-01]
          // Project-scoped: an order belongs to one contract (`01 §1`) but the
          // register spans every contract the project has, and each row names
          // its own.
          {
            path: 'changeorders',
            loadComponent: () =>
              import('./features/change-orders/change-orders.page').then(m => m.ChangeOrdersPage),
          },

          // An unknown module segment is a typed URL, not a state — send it to
          // the one module every project has.
          { path: '**', redirectTo: 'overview' },
        ],
      },

      // ── next pages append their route here ────────────────────────────
    ],
  },
  { path: '**', redirectTo: '' },
];
