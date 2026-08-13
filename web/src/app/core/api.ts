import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PersonaService } from './persona';
import { environment } from '../../environments/environment';

/**
 * The ONE place an HTTP call is made. Every feature's `*.api.ts` injects this
 * and calls get/post — nothing else touches HttpClient.
 *
 * It attaches the X-Epm-User header on every request. That header IS the
 * identity in this prototype (see Program.cs) — there is no login.
 *
 * The API base URL is read from the environment config so the app can switch
 * between dev (localhost:5080) and production (RunASP deployment) without
 * code changes.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private persona = inject(PersonaService);
  private apiUrl = environment.apiUrl;

  private buildUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return this.apiUrl + url;
  }

  get<T>(url: string, params?: Record<string, string | number | undefined>): Observable<T> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return this.http.get<T>(this.buildUrl(url), { params: p, headers: this.headers() });
  }

  post<T>(url: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.buildUrl(url), body ?? {}, { headers: this.headers() });
  }

  put<T>(url: string, body?: unknown): Observable<T> {
    return this.http.put<T>(this.buildUrl(url), body ?? {}, { headers: this.headers() });
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(url), { headers: this.headers() });
  }

  private headers(): Record<string, string> {
    return { 'X-Epm-User': this.persona.currentId() };
  }
}