import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root. Deliberately empty — the shell lives in shell/shell.component.ts and is
 * mounted by the router so that a future full-screen route (a print view, say)
 * can opt out of it.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {}
