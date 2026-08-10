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
      { path: '', pathMatch: 'full', redirectTo: 'projects' },

      // SCR-E2 · features/projects · Features/Projects · [EP-PRJ-01]
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/projects.page').then(m => m.ProjectsPage),
      },

      // ── next pages append their route here ────────────────────────────
    ],
  },
  { path: '**', redirectTo: '' },
];
