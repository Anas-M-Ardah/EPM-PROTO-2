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
  /** Breadcrumb root (v1.1 Z2). The full ministry name is too long for a crumb. */
  ministry_short:  { ar: 'الوزارة',                          en: 'Ministry' },
  dept:            { ar: 'دائرة الإعمار و المشاريع',        en: 'Reconstruction & Projects Dept.' },

  // navigation
  nav_portfolio:   { ar: 'النظرة العامة',                  en: 'Portfolio' },
  nav_projects:    { ar: 'المشاريع',                       en: 'Projects' },
  /** Enterprise scope (no workspace selected). Verbatim from data.jsx:245. */
  nav_projects_all:{ ar: 'كل المشاريع',                    en: 'Projects' },
  /** The WORKSPACE contract tab (SCR-W3) — a project's contracts and their addendums. */
  nav_contracts:   { ar: 'العقود و الملاحق',               en: 'Contracts & Addendums' },
  /** Enterprise scope (SCR-E3), the cross-portfolio list. Verbatim from data.jsx.
   *  Same split as nav_projects / nav_projects_all — the enterprise screen has
   *  its own shorter label and `DContractsAll` uses it for the title, the
   *  breadcrumb AND the nav item (desktop-shell.jsx:166). */
  nav_contracts_all:{ ar: 'العقود',                        en: 'Contracts' },
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

  // contracts list — ported from DContractsAll (v1.1, enterprise-areas.jsx:299)
  contracts_sub:   { ar: 'كل العقود عبر المحفظة',          en: 'All contracts across the portfolio' },
  search_contracts:{ ar: 'بحث في العقود…',                 en: 'Search contracts…' },
  col_code:        { ar: 'الرمز',                          en: 'Code' },
  col_contract:    { ar: 'العقد',                          en: 'Contract' },
  col_contractor:  { ar: 'المقاول',                        en: 'Contractor' },
  col_start:       { ar: 'المباشرة',                       en: 'Start' },
  col_finish:      { ar: 'الإنجاز',                        en: 'Finish' },
  col_financial:   { ar: 'الإنجاز المالي',                 en: 'Financial' },
  col_value:       { ar: 'قيمة العقد (د.ع)',               en: 'Value (IQD)' },
  /** Prefix for the superseded contractual finish — never a strikethrough (04 §6). */
  was:             { ar: 'كان',                            en: 'was' },
  /** Signed delta of the APPLIED amendments against the awarded value. */
  amended:         { ar: 'ملاحق مطبَّقة',                   en: 'amended' },
  /** 02 §9 — approved but NOT applied. A projection, never part of the value. */
  pending_apply:   { ar: 'بانتظار التطبيق',                en: 'awaiting application' },
  empty_contracts_t:{ ar: 'لا توجد عقود بعد',              en: 'No contracts yet' },
  empty_contracts_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // entities list — ported from DSpaces (v1.1, desktop-views.jsx:375).
  // `adm_ws` / `ws_sub` / `ws_showing` in the reference; renamed to the
  // screen's own name here since 04 §2 calls it Entities.
  nav_entities:    { ar: 'مساحات العمل',                   en: 'Workspaces' },
  entities_sub:    { ar: 'الجامعات و التشكيلات التي تملك المشاريع', en: 'The universities and units that own the projects' },
  search_entities: { ar: 'ابحث بالاسم أو الرمز…',          en: 'Search by name or code…' },
  entities_showing:{ ar: 'مساحة عمل',                      en: 'workspaces' },
  col_entity:      { ar: 'مساحة العمل',                    en: 'Workspace' },
  col_type:        { ar: 'النوع',                          en: 'Type' },
  col_active:      { ar: 'النشطة',                         en: 'Active' },
  col_completion:  { ar: 'نسبة الإنجاز',                   en: 'Completion' },
  empty_entities_t:{ ar: 'لا توجد مساحات عمل بعد',         en: 'No workspaces yet' },
  empty_entities_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // executive portfolio — ported from DDashboard (v1.1, desktop-views.jsx:45)
  portfolio_sub:   { ar: 'الوضع التعاقدي عبر المحفظة',      en: 'The contractual position across the portfolio' },
  kpi_projects:    { ar: 'المشاريع',                        en: 'Projects' },
  kpi_active_suffix:{ ar: 'قيد التنفيذ',                    en: 'running' },
  kpi_contracts:   { ar: 'العقود',                          en: 'Contracts' },
  kpi_effective_value:{ ar: 'القيمة النافذة (د.ع)',         en: 'Effective value (IQD)' },
  kpi_effective_foot:{ ar: 'الأصلية + الملاحق المطبَّقة',    en: 'original + applied amendments' },
  kpi_delayed:     { ar: 'المتأخرة',                        en: 'Delayed' },
  kpi_applied_amd: { ar: 'ملاحق مطبَّقة',                    en: 'Applied amendments' },
  portfolio_by_status:{ ar: 'المشاريع حسب الحالة',          en: 'Projects by status' },
  portfolio_by_entity:{ ar: 'القيمة النافذة حسب مساحة العمل', en: 'Effective value by workspace' },
  /** 02 §9 — stated as a projection, never folded into any figure. */
  portfolio_pending_note:{ ar: 'معتمد بانتظار التطبيق — غير مضاف إلى القيمة النافذة:', en: 'Approved and awaiting application — NOT included in the effective value:' },
  portfolio_unavailable:{ ar: 'مؤشرات غير متوفرة بعد',      en: 'Indicators not available yet' },
  unavailable:     { ar: 'غير متوفر',                       en: 'Unavailable' },
  kpi_physical:    { ar: 'الإنجاز المادي',                  en: 'Physical progress' },
  kpi_financial:   { ar: 'الإنجاز المالي',                  en: 'Financial progress' },
  kpi_spi:         { ar: 'مؤشر أداء الجدول (SPI)',          en: 'Schedule performance (SPI)' },
  kpi_cpi:         { ar: 'مؤشر أداء الكلفة (CPI)',          en: 'Cost performance (CPI)' },
  empty_portfolio_t:{ ar: 'لا توجد بيانات بعد',             en: 'No data yet' },
  empty_portfolio_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

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
