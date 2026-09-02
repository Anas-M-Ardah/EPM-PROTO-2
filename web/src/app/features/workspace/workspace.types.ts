import { OverviewModule, OverviewProgress } from '../overview/overview.types';

/**
 * `[EP-OVW-02]` — الشكل 4's «نقاط حالة ملوّنة لكل وحدة», for the module rail.
 *
 * Members are IDENTICAL to `ModulesResponse` in
 * api/Epm.Api/Features/Overview/OverviewDto.cs.
 *
 * The rows are the SAME `OverviewModule` the overview's «خط سير المراحل»
 * carries, from the same server method — re-exported rather than re-declared,
 * so the rail and the strip cannot drift apart in the type system either.
 */
export interface ModulesResponse {
  modules: OverviewModule[];
  progress: OverviewProgress;
}

export type { OverviewModule, OverviewProgress };
