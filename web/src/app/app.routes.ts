import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ShellComponent } from './shell/shell.component';
import { AuthService } from './core/auth';

/**
 * The sign-in gate. It keeps the SCREENS behind the form, which is what the
 * reference does — it is not a security boundary and does not pretend to be
 * one: the API is still reachable directly (P-05, and see AuthService).
 */
const signedIn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isSignedIn() ? true : router.createUrlTree(['/login']);
};

/**
 * The inverse, and it guards ONE route: `/`. In the reference, `/` is the
 * landing page — the front door, before any session. Here `/` has to be two
 * things, because the app also has a signed-in home: the landing when there is
 * no session, the portfolio when there is. This guard is that fork.
 *
 * It is not a security boundary either. It exists so that signing in and then
 * pressing Home does not drop you back onto a marketing page.
 */
const signedOut = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isSignedIn() ? router.createUrlTree(['/portfolio']) : true;
};

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
  // SCR-P0 · features/auth — the landing page, and the reference's front door.
  // `pathMatch: 'full'` so it claims ONLY `/`; the shell route below has the
  // same empty path and takes every child path under it. Order matters: this
  // one has to be first, and when there IS a session its guard hands `/` on to
  // the portfolio rather than falling through.
  {
    path: '',
    pathMatch: 'full',
    canActivate: [signedOut],
    loadComponent: () => import('./features/auth/landing.page').then(m => m.LandingPage),
  },

  // SCR-P1 · features/auth — the public route. Outside the shell: it has its
  // own chrome and must not render a sidebar for a session that has not
  // started.
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then(m => m.LoginPage),
  },

  {
    path: '',
    component: ShellComponent,
    canActivate: [signedIn],
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

      // المسار 1 · features/projects · Features/Projects · [EP-PRJ-02]
      // CREATE ONLY. There is no project yet, so there is no project workspace
      // to render it in — it is an ordinary enterprise page.
      //
      // EDITING an existing project is NOT here and is not a route at all:
      // الشكل 5 edits its own card in place, inside «مساحة المشروع › معلومات
      // المشروع». See features/information.
      //
      // THIS MUST PRECEDE `projects/:id` below. That route has a `**` child
      // that redirects an unknown segment to `overview`, so if it matched
      // first, `/projects/new` would load the project workspace for a project
      // called "new" — the exact dead-end the wildcard exists to prevent.
      {
        path: 'projects/new',
        loadComponent: () =>
          import('./features/projects/project-form.page').then(m => m.ProjectFormPage),
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
          // الشكل 5 «معلومات المشروع — التفاصيل».
          {
            path: 'information',
            loadComponent: () =>
              import('./features/information/information.page').then(m => m.InformationPage),
          },

          // NO `information/edit` ROUTE. الشكل 5 edits IN PLACE — «تعديل» flips
          // the card's cells to controls without leaving the screen, as the
          // prototype does. A route would put the editor somewhere the
          // breadcrumb does not go and give the same six sections a second
          // template. The write still goes through `EP-PRJ-03`.

          // SCR-W3 · features/contract-tab · Features/ContractTab · [EP-CON-01] [EP-CON-02]
          // The selected contract is a URL segment, not component state: a
          // contract is a record and a link to one has to survive being pasted.
          // The FEATURE is `contract-tab` because a .NET namespace `Contract`
          // shadows the entity type of the same name — see P-43.
          // المسار 2 · [EP-CON-03…05] — ONE component for both, the same shape
          // the project form takes for المسار 1.
          //
          // `contract/new` MUST precede `contract/:contractId`: that route
          // consumes exactly two segments, so it would otherwise match and open
          // the contract card for a contract called "new". `contract/:id/edit`
          // is three segments and cannot collide, but it is kept beside its
          // sibling so the pair reads as one decision.
          {
            path: 'contract/new',
            loadComponent: () =>
              import('./features/contract-tab/contract-form.page').then(m => m.ContractFormPage),
          },
          {
            path: 'contract/:contractId/edit',
            loadComponent: () =>
              import('./features/contract-tab/contract-form.page').then(m => m.ContractFormPage),
          },
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

          // SCR-W8 record · features/change-orders · [EP-CHG-02]
          // The order number is a URL segment for the same reason the contract
          // is on SCR-W3: a change order is an official record, and a link to
          // one has to survive being pasted into a letter.
          {
            path: 'changeorders/:no',
            loadComponent: () =>
              import('./features/change-orders/change-order.page').then(m => m.ChangeOrderPage),
          },

          // SCR-W9 · features/risks · Features/Risks · [EP-RSK-01]
          {
            path: 'risk',
            loadComponent: () => import('./features/risks/risks.page').then(m => m.RisksPage),
          },

          // SCR-W11 · features/meetings · Features/Meetings · [EP-MTG-01]
          {
            path: 'meetings',
            loadComponent: () => import('./features/meetings/meetings.page').then(m => m.MeetingsPage),
          },

          // SCR-W12 · features/documents · Features/Documents · [EP-DOC-01]
          {
            path: 'documents',
            loadComponent: () => import('./features/documents/documents.page').then(m => m.DocumentsPage),
          },

          // SCR-W10 · features/model · Features/Model · [EP-MDL-01]
          {
            path: 'model',
            loadComponent: () => import('./features/model/model.page').then(m => m.ModelPage),
          },

          // SCR-W13 · features/project-alerts · Features/ProjectAlerts · [EP-PAL-01]
          {
            path: 'alerts',
            loadComponent: () =>
              import('./features/project-alerts/project-alerts.page').then(m => m.ProjectAlertsPage),
          },

          // SCR-W14 · features/project-reports · Features/ProjectReports · [EP-PRP-01]
          {
            path: 'reports',
            loadComponent: () =>
              import('./features/project-reports/project-reports.page')
                .then(m => m.ProjectReportsPage),
          },

          // SCR-W15 · features/audit · Features/Audit · [EP-AUD-01]
          {
            path: 'audit',
            loadComponent: () => import('./features/audit/audit.page').then(m => m.AuditPage),
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
