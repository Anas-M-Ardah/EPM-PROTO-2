import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

/** Mirrors Features/Dev/Personas.cs — member names match exactly. */
export interface Persona {
  id: string;
  nameAr: string;
  nameEn: string;
  party: string;
  roleAr: string;
  roleEn: string;
  isDelegate: boolean;
}

/**
 * There is NO authentication. The chosen persona is sent as X-Epm-User on every
 * request and the API trusts it (Program.cs).
 *
 * The permission MODEL from 03 §7 is real and resolved server-side — the viewer
 * relation (awaiting · recorder · acted · upcoming · none) decides which actions
 * render. Only the identity is fake. Switching persona is the fastest way to
 * review the whole permission model, which is why 03 §7 asks for the switcher.
 */
@Injectable({ providedIn: 'root' })
export class PersonaService {
  private http = inject(HttpClient);

  readonly all = signal<Persona[]>([]);
  readonly currentId = signal<string>(localStorage.getItem('epm_persona') ?? 'user.re-dept');

  current = () => this.all().find(p => p.id === this.currentId()) ?? null;

  // [EP-DEV-03] GET /api/dev/personas → api/Features/Dev/DevEndpoints.cs
  load() {
    this.http.get<Persona[]>('/api/dev/personas').subscribe(list => this.all.set(list));
  }

  select(id: string) {
    this.currentId.set(id);
    localStorage.setItem('epm_persona', id);
  }
}
