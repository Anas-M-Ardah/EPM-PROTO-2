import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PersonaService } from './persona';

/**
 * The ONE place an HTTP call is made. Every feature's `*.api.ts` injects this
 * and calls get/post — nothing else touches HttpClient.
 *
 * It attaches the X-Epm-User header on every request. That header IS the
 * identity in this prototype (see Program.cs) — there is no login.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private persona = inject(PersonaService);

  get<T>(url: string, params?: Record<string, string | number | undefined>): Observable<T> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return this.http.get<T>(url, { params: p, headers: this.headers() });
  }

  post<T>(url: string, body?: unknown): Observable<T> {
    return this.http.post<T>(url, body ?? {}, { headers: this.headers() });
  }

  private headers(): Record<string, string> {
    return { 'X-Epm-User': this.persona.currentId() };
  }
}
