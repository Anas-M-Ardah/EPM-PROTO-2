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
  /** Verbatim from data.jsx:235 — was 'ضبط الجدولة', which is not the
   *  reference's wording. */
  nav_schedule:    { ar: 'ضبط الجداول الزمنية',            en: 'Schedule Control' },
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

  // alerts center — ported from DAlertsCenter (v1.1, enterprise-areas.jsx:106).
  // The severity, kind and status LABELS are not here: they are stored codes and
  // come from the Lookups addendum (P-26), like every other enum in the app.
  alerts_sub:      { ar: 'التنبيهات والتصعيد عبر المحفظة',  en: 'Portfolio-wide alerts & escalation' },
  search_alerts:   { ar: 'بحث في التنبيهات…',               en: 'Search alerts…' },
  col_alert:       { ar: 'التنبيه',                         en: 'Alert' },
  col_source:      { ar: 'المصدر',                          en: 'Source' },
  col_severity:    { ar: 'الخطورة',                         en: 'Severity' },
  col_raised:      { ar: 'التاريخ',                         en: 'Raised' },
  /** Screen-reader name for the row-action column; the reference leaves it blank. */
  col_action:      { ar: 'إجراء',                           en: 'Action' },
  /**
   * Severity as a GROUP heading — the cards and the filter chips. Feminine
   * plural, agreeing with «تنبيهات». One alert's severity is the masculine
   * singular (حرِج) and comes from the `alert-severity` lookup instead; the
   * reference makes exactly this split (ALERT_SEV vs the inline card array).
   */
  sev_critical:    { ar: 'حرِجة',                           en: 'High' },
  sev_warning:     { ar: 'متوسطة',                          en: 'Medium' },
  sev_info:        { ar: 'منخفضة',                          en: 'Low' },
  sev_open:        { ar: 'مفتوحة',                          en: 'Open' },
  /** The CARD spells the top severity out; the chip stays short so the chip row
   *  does not wrap. Only the top one differs, and only in English — verbatim
   *  from the reference, which makes exactly this one exception. */
  sev_critical_card:{ ar: 'حرِجة',                          en: 'High severity' },
  alerts_unack:    { ar: 'غير مُقَرّة',                      en: 'Unacknowledged' },
  alerts_ack:      { ar: 'مُقَرّة',                          en: 'Acknowledged' },
  alerts_do_ack:   { ar: 'إقرار',                           en: 'Ack' },
  alerts_reopen:   { ar: 'إعادة فتح',                       en: 'Reopen' },
  /** An alert with no project belongs to the portfolio, not to nothing. */
  scope_enterprise:{ ar: 'على مستوى الوزارة',               en: 'Ministry-wide' },
  empty_alerts_t:  { ar: 'لا توجد تنبيهات',                 en: 'No alerts' },
  empty_alerts_b:  { ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // schedule control — ported from DScheduleControl (v1.1, enterprise-areas.jsx:8).
  // The sc_* keys are verbatim from the reference's own STR map (data.jsx:237).
  schedule_sub:    { ar: 'صحة الجداول الزمنية عبر المحفظة', en: 'Portfolio-wide schedule health' },
  sc_avg_delay:    { ar: 'متوسط التأخر',                    en: 'Avg. delay' },
  sc_delayed:      { ar: 'مشاريع متأخرة',                   en: 'Delayed projects' },
  sc_critical:     { ar: 'أنشطة حرجة',                      en: 'Critical activities' },
  sc_ontrack:      { ar: 'ضمن الجدول',                      en: 'On track' },
  sc_import_status:{ ar: 'حالة الاستيراد',                  en: 'Import status' },
  /** Neither delayed nor on track — no contract, or no forecast recorded. */
  sc_no_schedule:  { ar: 'بلا موقف زمني',                   en: 'No schedule position' },
  sc_no_schedule_note:{ ar: 'مشاريع بلا موقف زمني — غير محسوبة ضمن المتأخرة ولا ضمن ما هو ضمن الجدول:', en: 'Projects with no schedule position — counted in neither delayed nor on track:' },
  /** Fallback only; the real reason ships from the server beside the rule. */
  sc_critical_needs:{ ar: 'يتطلب جدول الأنشطة وعلاقات التتابع.', en: 'Needs the activity schedule and its dependencies.' },
  col_baseline_finish:{ ar: 'إنجاز مخطط',                   en: 'Baseline finish' },
  col_forecast_finish:{ ar: 'إنجاز متوقع',                  en: 'Forecast' },
  empty_schedule_t:{ ar: 'لا توجد مشاريع بعد',              en: 'No projects yet' },
  empty_schedule_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },

  // reports & analytics — ported from DReports (v1.1, desktop-reports.jsx:58).
  // The report TITLES, descriptions, categories, scopes and frequencies are NOT
  // here: they are the catalog's own definition and ship with the row from
  // Features/Reports/ReportCatalog.cs. Only the chrome around them is here.
  rpt_scheduled:   { ar: 'المجدولة',                        en: 'Scheduled' },
  rpt_custom:      { ar: 'تقرير مخصّص',                     en: 'Custom report' },
  search_reports:  { ar: 'بحث في التقارير…',                en: 'Search reports…' },
  rpt_all_projects:{ ar: 'كل المشاريع',                     en: 'All projects' },
  /** The empty-database state of the scope dropdown — stated, not a blank list. */
  rpt_no_projects: { ar: 'لا مشاريع بعد',                   en: 'No projects yet' },
  rpt_scope_to:    { ar: 'تحديد نطاق المشروع',              en: 'Scope to project' },
  rpt_scoped_to:   { ar: 'النطاق:',                         en: 'Scoped to:' },
  rpt_scoped_note: { ar: 'تُعرض التقارير القابلة للتشغيل على مستوى المشروع.', en: 'showing reports that run at project level.' },
  rpt_run:         { ar: 'تشغيل',                           en: 'Run' },
  /** The row-action cell of a report the system cannot produce yet. The reason
   *  itself ships from the server beside the catalog that owns it. */
  rpt_unavailable: { ar: 'غير متاح',                        en: 'Unavailable' },
  col_report:      { ar: 'التقرير',                         en: 'Report' },
  col_category:    { ar: 'التصنيف',                         en: 'Category' },
  col_scope:       { ar: 'النطاق',                          en: 'Scope' },
  col_format:      { ar: 'الصيغة',                          en: 'Format' },
  col_frequency:   { ar: 'الدورية',                         en: 'Frequency' },
  col_last_run:    { ar: 'آخر تشغيل',                       en: 'Last run' },
  empty_reports_t: { ar: 'لا تقارير مطابقة',                en: 'No matching reports' },
  empty_reports_b: { ar: 'جرّب تصنيفاً أو كلمة بحث أخرى.',   en: 'Try another category or search term.' },

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

  // shell chrome — ported from v1.1 DSidebar / DTopbar / DAppFooter.
  // Keys keep the reference's own names (data.jsx STR) so a label can be
  // copied across verbatim.
  search_ph:       { ar: 'ابحث في المشاريع، العقود، اللجان…', en: 'Search projects, contracts, committees…' },
  all_workspaces:  { ar: 'المساحة الرئيسية',               en: 'All workspaces' },
  enterprise_ctx:  { ar: 'الوزارة',                        en: 'Ministry-wide' },
  your_workspaces: { ar: 'مساحات العمل',                   en: 'Your workspaces' },
  ws_active_short: { ar: 'نشط',                            en: 'active' },
  /** 06 §? — Workspaces.Kind. Only four values exist; see EntitiesDto. */
  ws_kind_university:  { ar: 'جامعة',                      en: 'University' },
  ws_kind_institute:   { ar: 'معهد',                       en: 'Institute' },
  ws_kind_directorate: { ar: 'مديرية',                     en: 'Directorate' },
  ws_kind_other:       { ar: 'جهة أخرى',                   en: 'Other' },
  /** The app footer. The env badge is not decoration — see AppFooterComponent. */
  env_prototype:   { ar: 'بيئة تجريبية',                   en: 'PROTOTYPE' },
  support:         { ar: 'الدعم الفني',                    en: 'Support' },
  version:         { ar: 'الإصدار',                        en: 'Version' },

  // page-head actions. The reference wires each of these to a toast saying it
  // is a demo, and so do we — a button that silently does nothing is worse.
  export:          { ar: 'تصدير',                          en: 'Export' },
  new_project:     { ar: 'مشروع جديد',                     en: 'New project' },
  new_contract:    { ar: 'عقد جديد',                       en: 'New contract' },
  import_p6:       { ar: 'استيراد P6',                     en: 'Import P6' },
  alert_rules:     { ar: 'قواعد التنبيه',                  en: 'Alert rules' },
  new_workspace:   { ar: 'مساحة عمل جديدة',                en: 'New workspace' },
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
