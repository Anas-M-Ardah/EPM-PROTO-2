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
  /** Workspace codes this persona is assigned to (BR-15). */
  workspaces: string[];
  /** §7 — a ministry-centre user, whose scope is the whole portfolio. */
  ministryWide: boolean;
}

/**
 * There is NO authentication. The chosen CAPACITY is sent as X-Epm-User on
 * every request and the API trusts it (Program.cs).
 *
 * ── ONE USER, MANY CAPACITIES ─────────────────────────────────────────────
 * Every row in `all` carries the same person's name and differs only in
 * `party`, `roleAr` and scope. The switcher is «العرض بصفة» — *viewing as* —
 * and it changes what you may do, never who you are. Reading the list as a set
 * of different employees was the confusion the single identity removes.
 *
 * The permission MODEL from 03 §7 is real and resolved server-side — the viewer
 * relation (awaiting · recorder · acted · upcoming · none) decides which actions
 * render. Only the identity is fake. Switching capacity is the fastest way to
 * review the whole permission model, which is why 03 §7 asks for the switcher.
 */
@Injectable({ providedIn: 'root' })
export class PersonaService {
  private http = inject(HttpClient);

  readonly all = signal<Persona[]>([]);
  /**
   * The CAPACITY in effect, not a choice of person — there is one user (see
   * Personas.MasterNameAr) and every entry in `all` carries their name.
   * Defaults to the المسار 1 actor, matching Personas.DefaultId; a stale id
   * from an earlier build falls through to the server's own default.
   */
  readonly currentId = signal<string>(localStorage.getItem('epm_persona') ?? 'user.univ-specialist');

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

/**
 * §23 — «إدخال البيانات في مصدرها: تعريف المشروع» belongs to المستخدم المختص,
 * whom §7 places at the الجامعة/التشكيل level.
 *
 * MIRRORS Personas.CanDefineProjects in api/Epm.Api/Features/Dev/Personas.cs,
 * and the SERVER is the enforcement — this only keeps the UI honest so nobody
 * fills twenty fields to be refused at the end. One function rather than the
 * same string compared in three components.
 */
export function canDefineProjects(p: Persona | null | undefined): boolean {
  return p?.party === 'الجامعة / التشكيل';
}
