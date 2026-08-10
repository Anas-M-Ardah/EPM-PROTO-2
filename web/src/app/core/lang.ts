import { Injectable, signal, effect } from '@angular/core';

export type Lang = 'ar' | 'en';

/**
 * ARABIC IS PRIMARY, not a translation layer (05 §5.1, handoff non-negotiable #7).
 * `ar` is the default and the document starts in RTL.
 *
 * Strings live here as { ar, en } pairs — the same shape as STR in the reference
 * prototype's data.jsx, so a label can be copied across verbatim.
 *
 * Enum and lookup labels do NOT belong here — those come from the Lookups table
 * with NameAr/NameEn columns (06), because business people maintain them.
 * This map is UI chrome only.
 */
const STR = {
  app_name:        { ar: 'EPM',                            en: 'EPM' },
  app_title:       { ar: 'نظام إدارة المشاريع الهندسية',   en: 'Engineering Projects Management' },
  ministry:        { ar: 'وزارة التعليم العالي و البحث العلمي', en: 'Ministry of Higher Education & Scientific Research' },
  dept:            { ar: 'دائرة الإعمار و المشاريع',        en: 'Reconstruction & Projects Dept.' },

  // navigation
  nav_portfolio:   { ar: 'النظرة العامة',                  en: 'Portfolio' },
  nav_projects:    { ar: 'المشاريع',                       en: 'Projects' },
  /** Enterprise scope (no workspace selected). Verbatim from data.jsx:245. */
  nav_projects_all:{ ar: 'كل المشاريع',                    en: 'Projects' },
  nav_contracts:   { ar: 'العقود و الملاحق',               en: 'Contracts & Addendums' },
  nav_schedule:    { ar: 'ضبط الجدولة',                    en: 'Schedule Control' },
  nav_alerts:      { ar: 'مركز التنبيهات',                 en: 'Alerts Center' },
  nav_reports:     { ar: 'التقارير و التحليلات',           en: 'Reports & Analytics' },
  nav_group_ops:   { ar: 'العمليات',                       en: 'Operations' },
  nav_group_gov:   { ar: 'الحوكمة',                        en: 'Governance' },

  // projects list — labels ported from DProjectsAll (enterprise-areas.jsx:112)
  projects_sub:    { ar: 'كل المشاريع عبر التشكيلات والجامعات', en: 'All projects across entities & universities' },
  search_projects: { ar: 'بحث في المشاريع…',               en: 'Search projects…' },
  col_project:     { ar: 'المشروع',                        en: 'Project' },
  col_workspace:   { ar: 'مساحة العمل',                    en: 'Workspace' },
  col_branch:      { ar: 'الفرع',                          en: 'Branch' },
  col_status:      { ar: 'الحالة',                         en: 'Status' },
  col_physical:    { ar: 'الإنجاز',                        en: 'Physical' },
  col_cost:        { ar: 'الكلفة',                         en: 'Cost' },
  col_updated:     { ar: 'آخر تحديث',                      en: 'Updated' },
  all:             { ar: 'الكل',                           en: 'All' },
  showing:         { ar: 'مشروع',                          en: 'projects' },

  // states (04 §9 — every screen needs these)
  empty_projects_t:{ ar: 'لا توجد مشاريع بعد',             en: 'No projects yet' },
  empty_projects_b:{ ar: 'قاعدة البيانات فارغة. حمّل بيانات العرض للبدء.', en: 'The database is empty. Load the demo fixture to begin.' },
  empty_filter_t:  { ar: 'لا نتائج مطابقة',                en: 'No matching projects' },
  empty_filter_b:  { ar: 'جرّب مصطلحاً آخر أو امسح المرشّحات.', en: 'Try another term or clear the filters.' },
  clear_filters:   { ar: 'مسح المرشّحات',                  en: 'Clear filters' },
  load_fixture:    { ar: 'تحميل بيانات العرض',             en: 'Load demo fixture' },
  loading:         { ar: 'جارٍ التحميل…',                  en: 'Loading…' },
  error_t:         { ar: 'تعذّر تحميل البيانات',           en: 'Could not load data' },
  retry:           { ar: 'إعادة المحاولة',                 en: 'Retry' },

  // chrome
  persona:         { ar: 'العرض بصفة',                     en: 'Viewing as' },
  language:        { ar: 'English',                        en: 'العربية' },
} as const;

export type StrKey = keyof typeof STR;

@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>((localStorage.getItem('epm_lang') as Lang) ?? 'ar');

  constructor() {
    effect(() => {
      const l = this.lang();
      localStorage.setItem('epm_lang', l);
      document.documentElement.setAttribute('lang', l);
      document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    });
  }

  /** t('col_status') */
  t = (key: StrKey): string => STR[key][this.lang()];

  /** Picks the right side of any { ar, en } pair coming from the API. */
  pick = (ar: string, en: string): string => (this.lang() === 'ar' ? ar : en) || ar || en;

  isAr = () => this.lang() === 'ar';

  toggle() {
    this.lang.set(this.lang() === 'ar' ? 'en' : 'ar');
  }
}
