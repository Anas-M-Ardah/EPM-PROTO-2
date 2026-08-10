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
      {
        path: 'entities',
        loadComponent: () => import('./features/entities/entities.page').then(m => m.EntitiesPage),
      },

      // ── next pages append their route here ────────────────────────────
    ],
  },
  { path: '**', redirectTo: '' },
];
