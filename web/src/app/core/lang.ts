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
  /** VERBATIM (data.jsx:13). The port had shortened it; `MinistryLockup` is
   *  the only thing that renders it, and it renders the reference's full one. */
  dept:            { ar: 'دائرة الإعمار و المشاريع — القسم الهندسي', en: 'Dept. of Reconstruction & Projects — Engineering Section' },

  // navigation
  /** The RAIL's first item. VERBATIM (data.jsx:115 `nav_home`) — the reference
   *  calls it «الرئيسية», not «النظرة العامة». `nav_portfolio` below is the
   *  PAGE's own title, which is a different string doing a different job: the
   *  reference's dashboard heads itself with a greeting, so there is nothing
   *  to copy for it and ours stays. */
  nav_home:        { ar: 'الرئيسية',                       en: 'Home' },
  nav_portfolio:   { ar: 'النظرة العامة',                  en: 'Portfolio' },
  nav_projects:    { ar: 'المشاريع',                       en: 'Projects' },
  /** Enterprise scope (no workspace selected). Verbatim from data.jsx:245. */
  nav_projects_all:{ ar: 'كل المشاريع',                    en: 'Projects' },
  /** The WORKSPACE contract tab (SCR-W3). Currently unreferenced — the rail and
   *  the breadcrumb both read `mod_contract`. Kept in step with it so the two
   *  cannot drift if a screen picks this one up. */
  nav_contracts:   { ar: 'العقود',                         en: 'Contracts' },
  /** Enterprise scope (SCR-E3), the cross-portfolio list. Verbatim from data.jsx.
   *  `DContractsAll` uses it for the title, the breadcrumb AND the nav item
   *  (desktop-shell.jsx:166). Same Arabic as the workspace tab now that الشكل 6
   *  names that one «العقود» too; they never appear in the same list. */
  nav_contracts_all:{ ar: 'العقود',                        en: 'Contracts' },
  /** Verbatim from data.jsx:235 — was 'ضبط الجدولة', which is not the
   *  reference's wording. */
  nav_schedule:    { ar: 'ضبط الجداول الزمنية',            en: 'Schedule Control' },
  nav_alerts:      { ar: 'مركز التنبيهات',                 en: 'Alerts Center' },
  /** VERBATIM (data.jsx:178). Was «التقارير و التحليلات», which is not the
   *  reference's wording — it says «الإحصائيات». */
  nav_reports:     { ar: 'التقارير و الإحصائيات',          en: 'Reports & analytics' },
  //
  // `nav_group_ops` / `nav_group_gov` are gone. The reference's rail is a FLAT
  // list (desktop-shell.jsx:247) — its only `.d-nav-grp` is «الحوكمة», and that
  // one heads the ADMIN entry, which this app does not have because it has no
  // admin screen. We were printing «العمليات» over the whole rail, a heading
  // the reference never shows.

  // projects list — labels ported from DProjectsAll (enterprise-areas.jsx:112)
  projects_sub:    { ar: 'كل المشاريع عبر التشكيلات والجامعات', en: 'All projects across entities & universities' },
  search_projects: { ar: 'بحث في المشاريع…',               en: 'Search projects…' },
  col_project:     { ar: 'المشروع',                        en: 'Project' },
  col_workspace:   { ar: 'مساحة العمل',                    en: 'Workspace' },
  col_branch:      { ar: 'الفرع',                          en: 'Branch' },
  col_status:      { ar: 'الحالة',                         en: 'Status' },
  col_physical:    { ar: 'الإنجاز',                        en: 'Physical' },
  /** الشكل 3 names the unit in the header: «الكلفة (د.ع)». */
  col_cost:        { ar: 'الكلفة (د.ع)',                   en: 'Cost (IQD)' },
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
  // Strings below are VERBATIM from the design-revamp prototype's own string
  // table (data.jsx STR). `entities_sub` in particular is the reference's
  // `ws_sub`, and it states BR-15 in the ministry's own words — which is a
  // better sentence than the one we had invented for it.
  nav_entities:    { ar: 'مساحات العمل',                   en: 'Workspaces' },
  entities_sub:    { ar: 'اختر مساحة عمل للانتقال إلى مشاريعها. وصولك هو اتحاد تكليفاتك حسب الدور و النطاق.', en: 'Choose a workspace to view its projects. Your access is the union of your role-and-scope assignments.' },
  search_entities: { ar: 'ابحث في مساحات العمل بالاسم أو الرمز…', en: 'Search workspaces by name or code…' },
  entities_showing:{ ar: 'مساحة عمل',                      en: 'workspaces' },
  col_entity:      { ar: 'مساحة العمل',                    en: 'Workspace' },
  col_type:        { ar: 'النوع',                          en: 'Type' },
  /** VERBATIM — the reference's `kpi_active` / `kpi_completion` (data.jsx:57,
   *  :60), which is what DSpaces puts in these two headers. Ours said «النشطة»
   *  and «نسبة الإنجاز». Used by this register only. */
  col_active:      { ar: 'مشاريع نشطة',                    en: 'Active projects' },
  col_completion:  { ar: 'متوسط الإنجاز',                  en: 'Avg. completion' },
  /** VERBATIM (data.jsx:74) — DSpaces' own filtered-empty title. The register
   *  used the generic `empty_filter_t` («لا نتائج مطابقة»); the reference names
   *  the thing that is missing. Its body is inline there, so it is here too. */
  ws_no_results:   { ar: 'لا توجد مساحات عمل مطابقة',      en: 'No matching workspaces' },
  ws_no_results_b: { ar: 'جرّب اسماً أو رمزاً أو نوعاً آخر', en: 'Try another name, code or type' },
  empty_entities_t:{ ar: 'لا توجد مساحات عمل بعد',         en: 'No workspaces yet' },
  empty_entities_b:{ ar: 'حمّل بيانات العرض من شاشة المشاريع.', en: 'Load the demo fixture from the Projects screen.' },
  /** BR-15 — assigned to nothing is a real state, not an empty database. */
  empty_ws_assigned_t:{ ar: 'لا توجد مساحات عمل مسندة إليك', en: 'No workspaces assigned to you' },
  empty_ws_assigned_b:{ ar: 'نطاق رؤيتك هو اتحاد تكليفاتك. راجع مدير النظام لإسنادك إلى مساحة عمل.', en: 'Your visibility is the union of your assignments. Ask an administrator to assign you a workspace.' },
  // ── EP-WSP-02 «إنشاء مساحة جديدة» (ملحق الشكل 1) ──────────────────────
  ws_create_name_ph:{ ar: 'مثال: جامعة البصرة',            en: 'e.g. University of Basrah' },
  ws_create_name_en:{ ar: 'الاسم بالإنجليزية',             en: 'Name in English' },
  ws_create_badge: { ar: 'رمز الشارة',                     en: 'Badge code' },
  ws_create_badge_hint:{ ar: 'حرفان إلى خمسة — يظهر على الشارة الملوّنة.', en: 'Two to five letters — shown on the coloured emblem.' },
  ws_create_code_hint:{ ar: 'يظهر في الرابط. أحرف لاتينية وأرقام.', en: 'Appears in the URL. Latin letters and digits.' },
  ws_create_submit:{ ar: 'إضافة مساحة العمل',              en: 'Add workspace' },
  cancel:          { ar: 'إلغاء',                          en: 'Cancel' },
  saving:          { ar: 'جارٍ الحفظ…',                    en: 'Saving…' },

  ws_enter:        { ar: 'دخول',                           en: 'Open' },
  ws_enter_full:   { ar: 'الدخول إلى مساحة العمل',         en: 'Open workspace' },
  open_project:    { ar: 'فتح المشروع',                    en: 'Open project' },
  /** Scoped register: the workspace has no projects, which is not "no data". */
  empty_ws_projects_t:{ ar: 'لا توجد مشاريع في هذه المساحة', en: 'No projects in this workspace' },
  empty_ws_projects_b:{ ar: 'اختر مساحة أخرى أو عد إلى المركز لعرض المحفظة كاملة.', en: 'Pick another workspace, or return to the ministry for the whole portfolio.' },
  empty_ws_contracts_t:{ ar: 'لا توجد عقود في هذه المساحة', en: 'No contracts in this workspace' },

  // ── SCR-E8 workspace overview — «مساحة العمل › نظرة عامة» (ملحق الشكل 2)
  ws_overview:     { ar: 'نظرة عامة',                      en: 'Overview' },
  ws_overview_sub: { ar: 'موقف مشاريع الجهة قبل النزول إلى مشروع بعينه', en: 'The entity’s position, before descending into one project' },
  ws_view_projects:{ ar: 'عرض المشاريع',                   en: 'View projects' },
  ws_view_all:     { ar: 'عرض الكل',                       en: 'View all' },
  ws_watchlist:    { ar: 'قائمة المتابعة — مشاريع خارج المسار', en: 'Watchlist — projects off track' },
  ws_watchlist_ok: { ar: 'كل المشاريع ضمن الخطة.',         en: 'Every project is on plan.' },
  ws_recent:       { ar: 'آخر ما جرى تحديثه',              en: 'Recently updated' },
  ws_by_status:    { ar: 'المشاريع حسب الحالة',            en: 'Projects by status' },
  ws_open_alerts:  { ar: 'تنبيهات مفتوحة',                 en: 'Open alerts' },
  ws_critical_short:{ ar: 'حرجة',                          en: 'critical' },
  ws_no_projects_t:{ ar: 'لا توجد مشاريع في هذه المساحة',  en: 'No projects in this workspace' },
  ws_no_projects_b:{ ar: 'مساحة العمل معرّفة ولم يُدرَج فيها مشروع بعد.', en: 'The workspace exists; no project has been added to it yet.' },
  /** The 403 the API returns when `?ws=` names a workspace outside the assignment. */
  ws_denied_t:     { ar: 'مساحة عمل غير مسندة إليك',       en: 'Workspace not assigned to you' },
  ws_denied_b:     { ar: 'لا يرى المستخدم بيانات خارج تشكيله. أُعيد النطاق إلى مساحاتك.', en: 'A user sees no data outside their own entity. The scope has been reset.' },

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
  /** A lookup with nothing chosen — and the row in <epm-select> that clears one. */
  unset:           { ar: 'غير محدّد',                       en: 'Not set' },
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

  // ── PHASE 3 · the project workspace ────────────────────────────────────
  // Module rail labels and groups — ported from PROJECT_MODULES + MOD_GROUPS,
  // ../epm@design/system-revamp app/data.jsx:445, app/desktop-workspace.jsx:112.
  mod_overview:    { ar: 'نظرة عامة',                      en: 'Overview' },
  mod_information: { ar: 'معلومات المشروع',                en: 'Project Information' },
  /** الشكل 6 names the module «العقود» — the rail entry, the breadcrumb's last
   *  crumb and the Z6 header all read this one key. The addendums are a TAB of
   *  a contract (الشكل 10), not a second thing the module is about. */
  mod_contract:    { ar: 'العقود',                         en: 'Contracts' },
  mod_boq:         { ar: 'جدول الكميات',                   en: 'BOQ' },
  mod_financials:  { ar: 'الموقف المالي',                  en: 'Financials' },
  mod_schedule:    { ar: 'الجدول الزمني',                  en: 'Schedule' },
  mod_progress:    { ar: 'الإنجاز',                        en: 'Progress' },
  mod_changeorders:{ ar: 'الأوامر التغييرية',              en: 'Change Orders' },
  mod_risk:        { ar: 'المخاطر',                        en: 'Risk' },
  // ملحق الشكل 44 titles the screen «النموذج ثلاثي الأبعاد», and the rail's
  // own group («السجلات والوثائق») lists it under that name.
  mod_model:       { ar: 'النموذج ثلاثي الأبعاد',          en: '3D Model' },
  mod_meetings:    { ar: 'الاجتماعات و الإجراءات',         en: 'Meetings & Actions' },
  mod_documents:   { ar: 'الوثائق و المخططات',             en: 'Documents & Drawings' },
  mod_alerts:      { ar: 'التنبيهات',                      en: 'Alerts' },
  mod_reports:     { ar: 'التقارير',                       en: 'Reports' },
  mod_audit:       { ar: 'سجل التدقيق',                    en: 'Audit History' },
  mod_group_definition: { ar: 'التعريف',                   en: 'Definition' },
  mod_group_execution:  { ar: 'التنفيذ و المتابعة',        en: 'Execution' },
  mod_group_records:    { ar: 'السجلات و الوثائق',         en: 'Records' },
  mod_group_oversight:  { ar: 'الرقابة',                   en: 'Oversight' },
  select_project:  { ar: 'اختر مشروعاً',                   en: 'Select a project' },

  // SCR-W1 Overview — ported from DModOverview (project-modules.jsx:2512)
  ovw_contracts:   { ar: 'عقود المشروع',                   en: 'Project contracts' },
  ovw_contracts_sub:{ ar: 'قيمة المشروع هي مجموع القيم النافذة لعقوده', en: 'Project value is the sum of its contracts\' effective values' },
  /** SCR-E3's `col_value` is the awarded figure; this column is the one in
   *  force (BR-09), and calling them the same thing would hide the difference
   *  this screen exists to show. */
  col_effective_value:{ ar: 'القيمة النافذة',              en: 'Effective value' },
  col_delay:       { ar: 'التأخر',                         en: 'Delay' },
  /** The awarded figure, shown BESIDE the effective one — never struck through. */
  ovw_awarded:     { ar: 'المحالة',                        en: 'awarded' },
  ovw_was:         { ar: 'كانت',                           en: 'was' },
  ovw_pending:     { ar: 'ملاحق معتمدة غير مطبَّقة:',       en: 'approved, not applied:' },
  ovw_projection:  { ar: 'إسقاط القيمة عند التطبيق:',       en: 'Value if applied:' },
  ovw_projection_note:{ ar: 'ملاحق معتمدة لم تُطبَّق بعد — غير مضافة إلى القيمة النافذة', en: 'approved amendments not yet applied — not included in the effective value' },
  ovw_no_contracts_t:{ ar: 'لا يوجد عقد لهذا المشروع',      en: 'This project has no contract' },
  ovw_no_contracts_b:{ ar: 'يُسجَّل المشروع قبل الإحالة؛ لا قيمة تعاقدية له حتى ذلك الحين.', en: 'A project is registered before it is awarded; until then it has no contractual value.' },
  ovw_beneficiaries:{ ar: 'الجهات المستفيدة',              en: 'Beneficiaries' },
  ovw_beneficiaries_sub:{ ar: 'الجهات المخوّلة باستلام الكميات', en: 'The bodies entitled to receive quantity' },
  ovw_no_beneficiaries_t:{ ar: 'لا جهات مستفيدة مسجَّلة',   en: 'No beneficiaries recorded' },
  ovw_no_beneficiaries_b:{ ar: 'لا يمكن توزيع الكميات حتى تُسجَّل جهة مستفيدة واحدة على الأقل.', en: 'Quantity cannot be distributed until at least one is recorded.' },
  ovw_inactive:    { ar: 'غير نشطة',                       en: 'Inactive' },
  ovw_alerts:      { ar: 'التنبيهات المفتوحة',             en: 'Open alerts' },
  ovw_alerts_sub:  { ar: 'التنبيهات غير المُقَرّة لهذا المشروع', en: 'Unacknowledged alerts on this project' },
  ovw_no_alerts:   { ar: 'لا توجد تنبيهات مفتوحة.',        en: 'No open alerts.' },

  // الشكل 4 — «خط سير المراحل». The four states are NOT the document's approval
  // vocabulary (معتمد · جاهز للمراجعة · مُعاد بملاحظات): nothing in this system
  // can say those truthfully. See Domain/ModuleReadiness.cs.
  ovw_track:       { ar: 'خط سير المراحل',                 en: 'Module track' },
  ovw_track_started:{ ar: 'وحدات بدأت',                    en: 'modules started' },
  ovw_next_action: { ar: 'الإجراء التالي المطلوب',         en: 'Next required action' },
  ovw_no_next_action:{ ar: 'لا يوجد إجراء مطلوب حالياً.',  en: 'Nothing is waiting on you right now.' },
  ovw_waiting:     { ar: 'بانتظار إجراء',                  en: 'awaiting action' },
  ovw_state_not_started:{ ar: 'لم تبدأ',                   en: 'Not started' },
  ovw_state_in_progress:{ ar: 'قيد الإنجاز',               en: 'In progress' },
  ovw_state_needs_attention:{ ar: 'يتطلب إجراء',           en: 'Needs action' },

  // SCR-W2 Information — field labels. The GROUPING is the endpoint's; only
  // the labels are here, because a label is chrome (see information.page.ts).
  // GROUP TITLES AND CAPTIONS ARE الشكل 5's OWN. The six section headings are
  // quoted in the appendix («هوية المشروع · الموقع · التمويل والموازنة · الوصف ·
  // الجهة · الاستشاري»); the captions beside them are read off الشكل 5's screen.
  inf_group_identity: { ar: 'هوية المشروع',                en: 'Project identity' },
  inf_group_identity_sub:{ ar: 'البيانات التعريفية الأساسية', en: 'Core identifying data' },
  inf_group_location: { ar: 'الموقع',                      en: 'Location' },
  inf_group_location_sub:{ ar: 'الموقع الجغرافي وحدود العمل', en: 'Geography and work boundary' },
  inf_group_funding:  { ar: 'التمويل والموازنة',           en: 'Funding & budget' },
  inf_group_funding_sub:{ ar: 'مصدر التمويل وتصنيف الصرف', en: 'Funding source and spend class' },
  inf_id:          { ar: 'رقم المشروع',                    en: 'Project number' },
  inf_nameAr:      { ar: 'اسم المشروع',                    en: 'Project name' },
  inf_nameEn:      { ar: 'اسم المشروع (بالإنجليزية)',      en: 'Project name (English)' },
  inf_type:        { ar: 'نوع المشروع',                    en: 'Project type' },
  inf_status:      { ar: 'حالة المشروع',                   en: 'Project status' },
  inf_executionStage:{ ar: 'مرحلة تنفيذ المشروع',          en: 'Execution stage' },
  inf_updatedAt:   { ar: 'آخر تحديث',                      en: 'Last updated' },
  inf_workspaceCode:{ ar: 'مساحة العمل',                   en: 'Workspace' },
  inf_region:      { ar: 'المنطقة الجغرافية',              en: 'Geographic region' },
  inf_branch:      { ar: 'الفرع',                          en: 'Branch' },
  inf_fundingType: { ar: 'نوع التمويل',                    en: 'Funding type' },
  inf_priority:    { ar: 'أولوية المشروع',                 en: 'Project priority' },
  /** D-06 — the project's own "now". Every date on its screens is measured
   *  against it, and this is the only screen that states what it is. */
  inf_dataDate:    { ar: 'تاريخ البيانات',                 en: 'Data date' },
  inf_executor:    { ar: 'الجهة المنفّذة',                 en: 'Executor' },
  inf_designerParty:{ ar: 'الجهة المصمِّمة',               en: 'Designer' },
  inf_consultantParty:{ ar: 'اسم الشركة الاستشارية',       en: 'Consultancy firm' },

  // المسار 1 · الشكل 5 — the rest of the definition card. Same `inf_` prefix as
  // the labels above ON PURPOSE: SCR-W2 reads these fields and the project form
  // writes them, and one label set is what stops the two screens calling the
  // same column different things. Wording is الشكل 5's own.
  inf_group_description:{ ar: 'الوصف',                     en: 'Description' },
  inf_group_description_sub:{ ar: 'نطاق العمل كما ورد في العقد', en: 'Scope of work as contracted' },
  inf_group_entity: { ar: 'الجهة',                         en: 'Entity' },
  inf_group_entity_sub:{ ar: 'الجهة المستفيدة والمالكة',   en: 'Beneficiary and owning entity' },
  inf_group_consultant:{ ar: 'الاستشاري',                  en: 'Consultant' },
  inf_group_consultant_sub:{ ar: 'المكتب الاستشاري المشرف', en: 'Supervising consultancy' },
  inf_code:        { ar: 'رمز المشروع',                    en: 'Project code' },
  inf_registrationYear:{ ar: 'سنة الإدراج',                en: 'Registration year' },
  inf_plannedCost: { ar: 'الكلفة المقررة',                 en: 'Planned cost' },
  inf_expenditureCategory:{ ar: 'الفئة الإنفاقية',         en: 'Expenditure category' },
  inf_budgetApprovalNumber:{ ar: 'رقم اعتماد الموازنة',    en: 'Budget approval no.' },
  inf_coordinates: { ar: 'إحداثيات الموقع',                en: 'Coordinates' },
  inf_formation:   { ar: 'اسم التشكيل',                    en: 'Formation' },
  inf_beneficiaryCodes:{ ar: 'الجامعة / الجهة المستفيدة',  en: 'University / beneficiary' },
  inf_orgStructure:{ ar: 'الهيكل التنظيمي',                en: 'Organisational structure' },
  inf_description: { ar: 'وصف المشروع',                    en: 'Project description' },

  // The project form (المسار 1). One component serves create and edit, so the
  // title is the one thing that differs between them.
  prj_new_title:   { ar: 'تعريف مشروع جديد',               en: 'Define a new project' },
  prj_edit_title:  { ar: 'تعديل تعريف المشروع',            en: 'Edit project definition' },
  prj_new_sub:     { ar: 'يُحفظ المشروع ضمن مساحة العمل الحالية.', en: 'The project is saved in the current workspace.' },
  prj_save:        { ar: 'حفظ المشروع',                    en: 'Save project' },
  prj_save_changes:{ ar: 'حفظ التعديلات',                  en: 'Save changes' },
  prj_saved:       { ar: 'حُفظ المشروع',                   en: 'Project saved' },
  prj_updated:     { ar: 'حُفظت التعديلات',                en: 'Changes saved' },
  prj_required_note:{ ar: 'الحقول المعلَّمة بنجمة إلزامية.', en: 'Fields marked with a star are required.' },
  /** الشكل 5 — «وسم مقترح على القيم التي يقترحها النظام». */
  prj_suggested:   { ar: 'مقترح',                          en: 'Suggested' },
  prj_suggested_hint:{ ar: 'قيمة اقترحها النظام — يمكن تعديلها.', en: 'Suggested by the system — you may change it.' },
  prj_fix_errors:  { ar: 'تعذّر الحفظ. راجع الحقول أدناه.', en: 'Could not save. Review the fields below.' },
  prj_no_workspace:{ ar: 'اختر مساحة عمل قبل تعريف مشروع.', en: 'Choose a workspace before defining a project.' },
  prj_edit:        { ar: 'تعديل',                          en: 'Edit' },
  /** سجل النشاط — الشكل 5's second tab. */
  prj_activity:    { ar: 'سجل النشاط',                     en: 'Activity log' },
  prj_details:     { ar: 'التفاصيل',                       en: 'Details' },
  prj_act_created: { ar: 'أنشأ التعريف',                   en: 'created the definition' },
  prj_act_updated: { ar: 'عدّل التعريف',                   en: 'updated the definition' },
  /** 04 §9 — an empty state states what it is AND what fills it. */
  prj_no_activity_t:{ ar: 'لا نشاط مسجَّل على هذا المشروع', en: 'No activity recorded on this project' },
  prj_no_activity_b:{ ar: 'يُسجَّل حدث عند تعريف المشروع وعند كل تعديل على بياناته.', en: 'An entry is recorded when the project is defined and on every edit to its data.' },
  prj_no_permission_t:{ ar: 'تعريف المشاريع غير متاح بصفتك الحالية.', en: 'Defining projects is not available in your current capacity.' },
  prj_no_permission_b:{ ar: '§23 يسند تعريف المشروع إلى المستخدم المختص في الجهة. بدّل «العرض بصفة» للمتابعة.', en: '§23 assigns project definition to the university specialist. Switch «العرض بصفة» to continue.' },
  inf_coordinates_hint:{ ar: 'خط العرض ثم خط الطول، مفصولين بفاصلة.', en: 'Latitude then longitude, comma separated.' },

  // المسار 2 — the contract form. One component serves create and edit, so the
  // title and the save verb are the only things that differ between them.
  con_new_title:   { ar: 'إضافة عقد جديد',                 en: 'Add a new contract' },
  con_edit_title:  { ar: 'تعديل بيانات العقد',             en: 'Edit contract details' },
  con_save:        { ar: 'حفظ العقد',                      en: 'Save contract' },
  con_save_changes:{ ar: 'حفظ التعديلات',                  en: 'Save changes' },
  con_saved:       { ar: 'حُفظ العقد',                     en: 'Contract saved' },
  con_updated:     { ar: 'حُفظت التعديلات',                en: 'Changes saved' },
  con_fix_errors:  { ar: 'تعذّر الحفظ. راجع الحقول أدناه.', en: 'Could not save. Review the fields below.' },
  con_group_identity:{ ar: 'هوية العقد',                   en: 'Contract identity' },
  con_group_amounts:{ ar: 'المبالغ',                       en: 'Amounts' },
  con_group_dates: { ar: 'التواريخ',                       en: 'Dates' },
  con_group_parties:{ ar: 'المقاول و الأطراف',             en: 'Contractor & parties' },
  con_group_letter:{ ar: 'كتاب الإحالة',                   en: 'Award letter' },
  con_code:        { ar: 'رمز العقد',                      en: 'Contract code' },
  con_code_locked: { ar: 'الرمز هو مفتاح العقد ولا يقبل التعديل بعد الحفظ.', en: 'The code is the contract key and cannot be changed after saving.' },
  con_component:   { ar: 'المكوّن',                        en: 'Component' },
  con_component_ph:{ ar: 'المكوّن المدني',                 en: 'Civil works' },
  con_award:       { ar: 'مبلغ الإحالة',                   en: 'Award amount' },
  con_award_locked:{ ar: 'القيمة المُحالة لا تُعدَّل — يحرّكها أمر تغييري.', en: 'The awarded value is never edited — an amendment moves it.' },
  con_reserve:     { ar: 'مبلغ الاحتياط',                  en: 'Reserve amount' },
  con_supervision: { ar: 'مبلغ الإشراف',                   en: 'Supervision amount' },
  con_monitoring:  { ar: 'مبلغ المراقبة',                  en: 'Monitoring amount' },
  /** `01 §2.3` lists three expense items; المسار 2 asks for four. See Contract.cs. */
  con_monitoring_hint:{ ar: 'يطلبه المسار 1 ضمن المبالغ الأربعة.', en: 'Requested by المسار 2 as the fourth amount.' },
  con_start:       { ar: 'تاريخ المباشرة',                 en: 'Start date' },
  con_finish:      { ar: 'تاريخ الإنجاز التعاقدي',         en: 'Contractual finish' },
  con_finish_locked:{ ar: 'الإنجاز التعاقدي لا يُعدَّل — يحرّكه أمر تغييري.', en: 'The contractual finish is never edited — an amendment moves it.' },
  con_contractor:  { ar: 'اسم المقاول',                    en: 'Contractor' },
  con_executing_party:{ ar: 'الجهة المنفّذة',              en: 'Executing party' },
  con_contact:     { ar: 'بيانات التواصل',                 en: 'Contact details' },
  con_incoming_no: { ar: 'رقم الكتاب',                     en: 'Letter number' },
  con_incoming_date:{ ar: 'تاريخ الكتاب',                  en: 'Letter date' },
  /** SCR-E3's «عقد جديد» — the cross-portfolio register has no project to inherit. */
  con_pick_project_t:{ ar: 'اختر المشروع',                 en: 'Choose the project' },
  con_pick_project_go:{ ar: 'متابعة',                      en: 'Continue' },
  // ── الشكل 11 — سجل النشاط ──────────────────────────────────────────────
  // One verb per action. An edit row states the FIELD and the two values
  // instead of a sentence, so «عدّل بيانات العقد» is only the fallback for an
  // update that carries no diff.
  con_act_created: { ar: 'أضاف العقد',                     en: 'added the contract' },
  con_act_progress:{ ar: 'تحديث الإنجاز المادي إلى',        en: 'physical progress updated to' },
  con_act_order:   { ar: 'أمر تغييري',                      en: 'Change order' },
  /** The automatic half of the log — the plate attributes it to «النظام». */
  con_act_system:  { ar: 'حدث آلي',                         en: 'Automatic event' },
  con_act_updated: { ar: 'عدّل بيانات العقد',              en: 'updated the contract' },
  con_no_permission_t:{ ar: 'إدخال العقود غير متاح بصفتك الحالية.', en: 'Entering contracts is not available in your current capacity.' },
  con_no_permission_b:{ ar: '§23 يسند إدخال العقود إلى المستخدم المختص في الجهة. بدّل «العرض بصفة» للمتابعة.', en: '§23 assigns contract entry to the university specialist. Switch «العرض بصفة» to continue.' },

  // SCR-W3 Contract — ported from DModContractNew + DContractAmendments.
  // The amendment STATE labels are not here: they are stored codes and come
  // from the `amendment-state` lookup, like every other enum (06 §8).
  con_register:    { ar: 'سجل عقود المشروع',                en: 'Project contract register' },
  con_add:         { ar: 'إضافة عقد',                       en: 'Add contract' },
  con_original_value:{ ar: 'القيمة الأصلية',                en: 'Original value' },
  con_addenda_impact:{ ar: 'أثر الملاحق',                   en: 'Addenda impact' },
  con_effective_value:{ ar: 'القيمة النافذة',               en: 'Effective value' },
  con_addenda:     { ar: 'ملاحق مطبَّقة',                    en: 'applied addenda' },
  con_pending_short:{ ar: 'بانتظار التطبيق',                en: 'awaiting application' },
  /** PAID only — a certified certificate with no money released is not spend. */
  con_disbursed:   { ar: 'المصروف',                         en: 'Disbursed' },
  con_retention:   { ar: 'الضمان المحتجز',                  en: 'Retention withheld' },
  con_period:      { ar: 'فترة العقود',                     en: 'Contract period' },
  con_days:        { ar: 'يوم',                             en: 'days' },
  con_day:         { ar: 'يوم',                             en: 'day' },
  con_consultant:  { ar: 'المكتب الاستشاري',                en: 'Consultant' },
  con_incoming:    { ar: 'الكتاب الرسمي',                   en: 'Official letter' },
  con_tab_overview:{ ar: 'نظرة عامة',                       en: 'Overview' },
  con_tab_details: { ar: 'التفاصيل',                        en: 'Details' },
  con_tab_payments:{ ar: 'الدفعات',                         en: 'Payments' },
  con_tab_amend:   { ar: 'الملاحق والتعديلات',              en: 'Addenda & amendments' },
  con_tab_activity:{ ar: 'سجل النشاط',                      en: 'Activity log' },

  // ── الشكل 8 — the five collapsible sections and their fields ───────────
  // Titles and captions are the document's own, read off its screen.
  con_grp_identity:{ ar: 'هوية العقد',                      en: 'Contract identity' },
  con_grp_identity_sub:{ ar: 'التعريف والمكوّن',            en: 'Identification & component' },
  con_grp_dates:   { ar: 'التواريخ والمدة',                 en: 'Dates & duration' },
  con_grp_dates_sub:{ ar: 'المباشرة والإنجاز والمراسلات الرسمية', en: 'Start, finish & official correspondence' },
  con_grp_amounts: { ar: 'المبالغ التعاقدية',               en: 'Contract amounts' },
  con_grp_amounts_sub:{ ar: 'الإحالة والاحتياط والإشراف',   en: 'Award, reserve & supervision' },
  con_grp_spend:   { ar: 'المصروف',                         en: 'Spend' },
  con_grp_spend_sub:{ ar: 'المنصرف مقابل كل بند',           en: 'Disbursed against each item' },
  con_grp_contractor:{ ar: 'المقاول',                       en: 'Contractor' },
  con_grp_contractor_sub:{ ar: 'بيانات المقاول المنفّذ',     en: 'Executing contractor details' },

  con_f_nameAr:    { ar: 'اسم العقد',                       en: 'Contract name' },
  con_f_id:        { ar: 'رمز العقد',                       en: 'Contract code' },
  con_f_component: { ar: 'المكوّن',                          en: 'Component' },
  con_f_status:    { ar: 'حالة العقد (الموسّعة)',            en: 'Contract status (extended)' },
  con_f_start:     { ar: 'تاريخ المباشرة',                  en: 'Start date' },
  con_f_finish:    { ar: 'تاريخ الإنجاز',                   en: 'Finish date' },
  con_f_awardAmount:{ ar: 'مبلغ الإحالة',                   en: 'Award amount' },
  con_f_reserveAmount:{ ar: 'مبلغ الاحتياط',                en: 'Reserve amount' },
  con_f_supervisionAmount:{ ar: 'مبلغ الإشراف والمراقبة',   en: 'Supervision & monitoring amount' },
  con_f_spentAward:{ ar: 'المصروف من الإحالة',              en: 'Spent from award' },
  con_f_spentReserve:{ ar: 'المصروف من الاحتياط',           en: 'Spent from reserve' },
  con_f_spentSupervision:{ ar: 'المصروف من الإشراف والمراقبة', en: 'Spent from supervision' },
  con_f_spentTotal:{ ar: 'كلفة العقد الكلي',                en: 'Total contract cost' },
  con_f_contractor:{ ar: 'اسم المقاول',                     en: 'Contractor name' },
  con_f_executingParty:{ ar: 'الجهة المنفذة',               en: 'Executing party' },
  con_f_contactInfo:{ ar: 'بيانات التواصل',                 en: 'Contact details' },

  // ── الشكل 6 — the register card ────────────────────────────────────────
  con_card_value:  { ar: 'قيمة العقد',                      en: 'Contract value' },
  con_card_unamended:{ ar: 'القيمة الأصلية دون تعديل',       en: 'Original value, unamended' },
  con_card_over:   { ar: 'عن الأصلية',                      en: 'over the original' },
  con_physical:    { ar: 'الإنجاز المادي',                  en: 'Physical progress' },
  con_no_addenda:  { ar: 'بلا ملاحق',                       en: 'No addenda' },
  con_open:        { ar: 'فتح العقد',                       en: 'Open contract' },
  con_weighted_physical:{ ar: 'الإنجاز المادي المرجّح',      en: 'Weighted physical progress' },
  con_weighted_sub:{ ar: 'مرجّح بقيمة كل عقد · العلامة = نسبة الصرف', en: 'Weighted by contract value · the marker is the spend %' },
  con_spend_of_effective:{ ar: 'الصرف من القيمة النافذة',    en: 'Spend of effective value' },
  con_contracts_n: { ar: 'عقود',                            en: 'contracts' },
  con_asof:        { ar: 'البيانات حتى',                    en: 'Data as of' },
  /** The footer strip's own label — definite, where the count chip is not. */
  con_contracts_f: { ar: 'العقود',                          en: 'Contracts' },
  con_card_period: { ar: 'المدة',                           en: 'Duration' },
  /**
   * The badge and the equation's sub-line say the SAME words on الشكل 6 —
   * «2 ملحق · 1 قيد الاعتماد» — so they read one pair of keys, not two.
   * `con_addenda` / `con_pending_short` are the register TABLE's longer
   * wording and are not used by the card.
   */
  con_addenda_n:   { ar: 'ملحق',                            en: 'addenda' },
  con_pending_n:   { ar: 'قيد الاعتماد',                    en: 'awaiting approval' },
  /** Indefinite, as the plate prints them under the spend bar. */
  con_spent_short: { ar: 'مصروف',                           en: 'spent' },
  con_remaining_short:{ ar: 'متبقٍ',                        en: 'remaining' },
  /** P-09 — a bar with no measurable input says so instead of drawing 0%. */
  con_no_physical: { ar: 'لا إنجاز قابل للقياس بعد',        en: 'No measurable progress yet' },

  // ── الشكل 9 — the payment panel ────────────────────────────────────────
  con_pay_no:      { ar: 'رقم الدفعة',                      en: 'Payment no.' },
  con_pay_letter:  { ar: 'كتاب التمويل',                    en: 'Finance letter' },
  con_pay_date:    { ar: 'التاريخ',                         en: 'Date' },
  con_pay_items:   { ar: 'البنود',                          en: 'Items' },
  con_pay_amount:  { ar: 'المبلغ',                          en: 'Amount' },
  con_pay_total:   { ar: 'الإجمالي',                        en: 'Total' },
  con_pay_split:   { ar: 'تفصيل الدفعة لهذا العقد',          en: 'Payment split for this contract' },
  con_pay_files:   { ar: 'المرفقات',                        en: 'Attachments' },
  con_pay_export:  { ar: 'تصدير الدفعة',                    en: 'Export payment' },
  con_pay_item:    { ar: 'البند',                           en: 'Item' },
  /** «رقم الدفعة» is the column; the cell prints «دفعة 1» — the fixture has a
   *  sequential `no` and no payment code, and inventing a PAY-100 format to
   *  match the plate's screenshot would be inventing ministry data. */
  con_pay_no_short:{ ar: 'دفعة',                            en: 'Payment' },
  con_pay_close:   { ar: 'إغلاق اللوحة',                    en: 'Close panel' },
  con_pay_minimise:{ ar: 'تصغير اللوحة',                    en: 'Minimise panel' },
  con_pay_expand:  { ar: 'توسيع اللوحة',                    en: 'Expand panel' },
  con_pay_no_files:{ ar: 'لا مرفقات مسجَّلة على هذه الدفعة — يُرفَق كتاب المالية وذرعة الأعمال المنجزة عند التسجيل.', en: 'No attachments recorded on this payment — the finance letter and the measurement sheet are attached when it is recorded.' },
  con_payments_n:  { ar: 'الدفعات',                         en: 'Payments' },
  con_no_payments_t:{ ar: 'لا دفعات مسجَّلة على هذا العقد',  en: 'No payments recorded on this contract' },
  con_no_payments_b:{ ar: 'تُسجَّل الدفعة عند صدور كتاب التمويل ومصادقة الذرعة.', en: 'A payment is recorded when the finance letter is issued and the measurement certified.' },

  // ── الشكل 11 — the contract activity log ───────────────────────────────
  con_no_activity_t:{ ar: 'لا نشاط مسجَّل على هذا العقد',    en: 'No activity recorded on this contract' },
  con_no_activity_b:{ ar: 'يُسجَّل حدث عند إضافة العقد وعند كل تعديل على بياناته.', en: 'An entry is recorded when the contract is added and on every edit to its data.' },

  // ── الشكل 10 — العقد النافذ ────────────────────────────────────────────
  con_effective_grp:{ ar: 'العقد النافذ',                    en: 'The contract in force' },
  con_effective_after:{ ar: 'بعد {n} ملحق مطبَّق',           en: 'after {n} applied addenda' },
  con_effective_none:{ ar: 'لا ملاحق مطبَّقة',               en: 'No applied addenda' },
  con_f_effVersion:{ ar: 'الإصدار النافذ',                  en: 'Version in force' },
  con_f_effValue:  { ar: 'قيمة العقد النافذة',              en: 'Effective contract value' },
  con_f_effFinish: { ar: 'تاريخ الإنجاز التعاقدي',          en: 'Contractual finish date' },
  con_f_effDuration:{ ar: 'مدة العقد',                      en: 'Contract duration' },
  con_f_netApplied:{ ar: 'صافي التعديل المطبَّق',            en: 'Net applied change' },
  con_f_awaiting:  { ar: 'ملاحق بانتظار التطبيق',           en: 'Addenda awaiting application' },
  con_original_label:{ ar: 'الأصلية',                       en: 'original' },
  con_unapplied_t: { ar: 'أوامر معتمدة لم تُطبَّق بعد',       en: 'Approved orders not yet applied' },
  con_identity:    { ar: 'هوية العقد',                      en: 'Contract identity' },
  con_dates:       { ar: 'التواريخ والمدة',                 en: 'Dates & duration' },
  con_dates_sub:   { ar: 'المباشرة والإنجاز والمراسلات الرسمية', en: 'Start, finish & official correspondence' },
  con_original_finish:{ ar: 'الإنجاز الأصلي',               en: 'Original finish' },
  // ── الشكل 7 — بطاقة العقد: نظرة عامة ───────────────────────────────────
  // The header strip's own labels, read off the plate. «العقد» and «المقاول
  // المنفّذ» are its wording and not the register's («المقاول»), so they are
  // their own keys rather than a shared column label pulled out of shape.
  con_hd_contract: { ar: 'العقد',                           en: 'Contract' },
  con_hd_contractor:{ ar: 'المقاول المنفّذ',                 en: 'Executing contractor' },
  con_hd_finish:   { ar: 'الإنجاز التعاقدي',                en: 'Contractual finish' },
  /** كلفة العقد الكلية = الإحالة + الاحتياط + الإشراف — Domain/ContractRollup. */
  con_total_cost:  { ar: 'كلفة العقد الكلية',               en: 'Total contract cost' },
  /** The headline's second half: «22 % من كلفة العقد الكلية». */
  con_of_total_cost:{ ar: 'من كلفة العقد الكلية',           en: 'of the total contract cost' },
  /** The same percentage as the headline — `02 §4`'s denominator, fixed by الشكل 7. */
  con_financial:   { ar: 'الإنجاز المالي',                  en: 'Financial progress' },
  con_physical_sub:{ ar: 'نسبة تنفيذ الأعمال · العلامة = الإنجاز المالي', en: 'Share of works executed · the marker is financial progress' },

  con_cost_breakdown:{ ar: 'تفصيل كلفة العقد',              en: 'Contract cost breakdown' },
  con_cost_breakdown_sub:{ ar: 'الإحالة · الاحتياط · الإشراف', en: 'Award · reserve · supervision' },
  con_cost_award:  { ar: 'الإحالة',                         en: 'Award' },
  con_cost_reserve:{ ar: 'الاحتياط',                        en: 'Reserve' },
  con_cost_supervision:{ ar: 'الإشراف والمراقبة',           en: 'Supervision & monitoring' },
  con_pay_kind:    { ar: 'النوع',                           en: 'Kind' },
  con_finance_letter:{ ar: 'كتاب التمويل',                  en: 'Finance letter' },
  con_gross:       { ar: 'المبلغ الإجمالي',                 en: 'Gross' },
  con_net:         { ar: 'الصافي',                          en: 'Net' },
  con_chain:       { ar: 'سجل التعديلات التعاقدية',          en: 'Record of contractual amendments' },
  con_chain_sub:   { ar: 'العقد الأصلي، ثم الملاحق المطبَّقة بالترتيب، ثم ما ينتظر التطبيق', en: 'The original contract, then the applied amendments in order, then those awaiting application' },
  con_version:     { ar: 'الإصدار',                         en: 'Version' },
  con_source:      { ar: 'الأمر التغييري',                  en: 'Change order' },
  con_delta_value: { ar: 'فرق القيمة',                      en: 'Δ value' },
  con_delta_days:  { ar: 'فرق المدة',                       en: 'Δ days' },
  con_value_after: { ar: 'القيمة بعده',                     en: 'Value after' },
  con_finish_after:{ ar: 'الإنجاز بعده',                    en: 'Finish after' },
  con_pending_title:{ ar: 'ملاحق معتمدة لم تُطبَّق',          en: 'Approved, not yet applied' },
  con_pending_sub: { ar: 'الاعتماد لا يغيّر العقد — هذه الأرقام غير مضافة إلى أي مجموع أعلاه', en: 'Approving changes nothing — these figures are in none of the totals above' },
  con_would_be:    { ar: 'القيمة لو طُبِّق',                 en: 'Value if applied' },
  con_finish_would:{ ar: 'الإنجاز لو طُبِّق',                en: 'Finish if applied' },
  // ── الشكل 10 — الملاحق والتعديلات ──────────────────────────────────────
  // Five collapsible sections, and the plate names each one. «الرمز» and
  // «تاريخ الإنجاز» are shared column labels (col_code · con_f_finish) and are
  // not repeated here.
  con_chain_code:  { ar: 'الأمر التغييري',                  en: 'Change order' },
  con_chain_value: { ar: 'قيمة العقد',                      en: 'Contract value' },
  con_chain_change:{ ar: 'التغيير',                         en: 'Change' },
  con_chain_lines: { ar: 'بنود',                            en: 'Items' },
  con_chain_acts:  { ar: 'أنشطة',                           en: 'Activities' },
  con_addenda_f:   { ar: 'الملاحق',                         en: 'Addenda' },

  /** Section 1 field labels. The sub-lines carry the ORIGINAL beside each
   *  effective figure — الشكل 10 prints both, never one (02 §9). */
  con_eff_pending: { ar: 'ملاحق بانتظار التطبيق',            en: 'Addenda awaiting application' },
  con_eff_orig_v:  { ar: 'الأصلية',                         en: 'original' },
  con_eff_orig_f:  { ar: 'الأصلي',                          en: 'original' },

  /** Section 3.  stays the group title; these are its own
   *  headline figures and the قبل/بعد/الفرق table. */
  con_pen_grp_sub: { ar: 'تُحسب من القيمة والمدة النافذتين',  en: 'Computed from the value and duration in force' },
  con_pen_rate:    { ar: 'نسبة الغرامة التأخيرية',           en: 'Delay penalty rate' },
  con_pen_perday:  { ar: 'الغرامة اليومية النافذة',          en: 'Daily penalty in force' },
  con_pen_cap:     { ar: 'الحد الأقصى للغرامة',              en: 'Penalty ceiling' },
  con_pen_cap_sub: { ar: 'النسبة القصوى × قيمة العقد النافذة', en: 'Cap % × the contract value in force' },
  con_pen_forecast:{ ar: 'تاريخ الإنجاز المتوقع',            en: 'Forecast finish' },
  con_pen_how:     { ar: 'كيف تُحتسب الغرامة',               en: 'How the penalty is computed' },
  /** OUR rule, stated on screen (02 §10 · D-02) — deliberately NOT the plate
   *  formula «(القيمة ÷ المدة) × النسبة», which is a different rule and would
   *  contradict every figure beside it. See P-81. */
  con_pen_how_b:   { ar: 'غرامة اليوم = قيمة العقد النافذة × ٠٫١٪ · بحد أقصى ١٠٪ من قيمة العقد — ولذلك يُعاد الاحتساب تلقائيًا عند كل ملحق يغيّر المبلغ أو المدة.', en: 'Daily penalty = the contract value in force × 0.1%, capped at 10% of the contract value — so it is recomputed on every amendment that moves the amount or the duration.' },
  con_pen_item:    { ar: 'البند',                           en: 'Item' },
  con_pen_diff:    { ar: 'الفرق',                           en: 'Difference' },
  con_pen_row_days:{ ar: 'أيام التأخير',                    en: 'Days late' },
  con_pen_row_perday:{ ar: 'الغرامة اليومية',               en: 'Daily penalty' },
  con_pen_row_cap: { ar: 'الحد الأقصى للغرامة',             en: 'Penalty ceiling' },
  con_pen_row_due: { ar: 'الغرامة المستحقة',                en: 'Penalty due' },
  con_pen_none_t:  { ar: 'لا غرامة مستحقة',                 en: 'No penalty due' },
  con_pen_none_b:  { ar: 'لا غرامة مستحقة على تاريخ الإنجاز التعاقدي النافذ.', en: 'No penalty is due against the contractual finish in force.' },

  /** Sections 4 and 5 — real sections with a printed reason, not omissions. */
  con_eff_qty:     { ar: 'الكميات النافذة بعد التعديل',      en: 'Quantities in force after amendment' },
  con_eff_qty_sub: { ar: 'ما غيّره كل ملحق من كميات البنود',  en: 'What each amendment changed in the bill quantities' },
  con_eff_act:     { ar: 'الأنشطة النافذة بعد التعديل',      en: 'Activities in force after amendment' },
  con_eff_act_sub: { ar: 'ما غيّره كل ملحق من مدد الأنشطة',   en: 'What each amendment changed in the activity durations' },

  con_penalty:     { ar: 'أثر التعديلات على الغرامات التأخيرية', en: 'Amendment impact on delay penalties' },
  con_penalty_sub: { ar: 'قبل الملاحق وبعدها — والفرق هو ما اشترته التمديدات', en: 'Before and after the amendments — the difference is what the extensions bought' },
  con_penalty_before:{ ar: 'قبل التعديلات',                   en: 'Before amendments' },
  con_penalty_after:{ ar: 'بعد التعديلات',                    en: 'After amendments' },
  con_penalty_rule:{ ar: 'القاعدة:',                        en: 'Rule:' },
  con_capped_at:   { ar: 'بحد أقصى',                        en: 'capped at' },
  con_penalty_na:  { ar: 'لا يوجد إنجاز متوقع مسجَّل لهذا العقد — لا يمكن قياس التأخر ولا احتساب الغرامة.', en: 'No forecast finish is recorded for this contract — lateness cannot be measured and no penalty can be computed.' },

  // states (04 §9 — every screen needs these)
  empty_projects_t:{ ar: 'لا توجد مشاريع بعد',             en: 'No projects yet' },
  empty_projects_b:{ ar: 'قاعدة البيانات فارغة. حمّل بيانات العرض للبدء.', en: 'The database is empty. Load the demo fixture to begin.' },
  empty_filter_t:  { ar: 'لا نتائج مطابقة',                en: 'No matching projects' },
  empty_filter_b:  { ar: 'جرّب مصطلحاً آخر أو امسح المرشّحات.', en: 'Try another term or clear the filters.' },
  clear_filters:   { ar: 'مسح المرشّحات',                  en: 'Clear filters' },
  /** The register toolbar's own clear button is just «مسح» with a close icon
   *  in the reference (desktop-views.jsx:432) — the long form is for the
   *  empty-state button, where there is room for it. */
  clear:           { ar: 'مسح',                            en: 'Clear' },
  load_fixture:    { ar: 'تحميل بيانات العرض',             en: 'Load demo fixture' },
  loading:         { ar: 'جارٍ التحميل…',                  en: 'Loading…' },
  error_t:         { ar: 'تعذّر تحميل البيانات',           en: 'Could not load data' },
  retry:           { ar: 'إعادة المحاولة',                 en: 'Retry' },

  // ── SCR-P0 landing + SCR-P1 sign-in. Strings marked VERBATIM are the
  // reference's own (data.jsx STR); the rest are lifted from the two screens'
  // inline `lang === 'ar' ? … : …` ternaries in screens-public.jsx, which is
  // where the reference keeps most of this copy.
  /** VERBATIM (data.jsx:11 `app_full`) — the nav brand's second line. */
  app_tagline:     { ar: 'إدارة المشاريع الهندسية',        en: 'Engineering Projects Management' },
  /** The reference's own h1 on both public screens — «…System» in English,
   *  which is one word longer than the shell's `app_title`. */
  app_title_full:  { ar: 'نظام إدارة المشاريع الهندسية',   en: 'Engineering Projects Management System' },
  signin:          { ar: 'تسجيل الدخول',                   en: 'Sign in' },
  /** The landing's access panel says «الدخول إلى النظام»; the login's says
   *  «تسجيل الدخول». Two different headings in the reference, kept apart. */
  signin_access:   { ar: 'الدخول إلى النظام',              en: 'System access' },
  signin_sub:      { ar: 'هوية موحّدة على مستوى الوزارة',   en: 'Unified enterprise identity' },
  signin_portal:   { ar: 'بوابة الدخول المؤسسية',          en: 'Institutional access portal' },
  /** screens-public.jsx:199 — the SAME paragraph on the landing and the login
   *  hero. The port had shortened it, dropping the second sentence, which is
   *  the one that states the access rule. */
  signin_blurb:    { ar: 'المنصّة الموحّدة لوزارة التعليم العالي لإدارة المشاريع الهندسية عبر الجامعات و الوحدات. الدخول مخصّص للموظّفين المخوّلين وفق الأدوار و النطاقات.', en: 'The unified platform of the Ministry of Higher Education for managing engineering projects across universities and units. Access is restricted to authorized personnel, by role and scope.' },
  /** The landing's access panel — the divider and its two notes. */
  secure_access:   { ar: 'الدخول الآمن',                   en: 'Secure access' },
  note_network:    { ar: 'متاح داخل شبكة الوزارة فقط',      en: 'Available on the ministry network only' },
  note_audited:    { ar: 'كل عملية دخول تُسجّل و تُدقّق',     en: 'Every sign-in is logged and audited' },
  home:            { ar: 'الرئيسية',                       en: 'Home' },
  /** The landing footer's three claims (screens-public.jsx:221). */
  lp_integration:  { ar: 'تكامل على مستوى الوزارة',        en: 'Ministry-wide integration' },
  lp_integration_b:{ ar: 'ربط الجامعات و الوحدات و المشاريع.', en: 'Links universities, units and projects.' },
  lp_effective:    { ar: 'إدارة فعّالة و شفافة',            en: 'Effective, transparent management' },
  lp_effective_b:  { ar: 'لمتابعة المشاريع و الموارد و الميزانيات.', en: 'Tracks projects, resources and budgets.' },
  lp_secure:       { ar: 'نظام آمن و معتمد',               en: 'Secure, accredited system' },
  lp_secure_b:     { ar: 'وفق معايير الحوكمة و الأمن السيبراني.', en: 'Per governance and cybersecurity standards.' },
  username:        { ar: 'اسم المستخدم',                   en: 'Username' },
  password:        { ar: 'كلمة المرور',                    en: 'Password' },
  show_password:   { ar: 'إظهار كلمة المرور',              en: 'Show password' },
  hide_password:   { ar: 'إخفاء كلمة المرور',              en: 'Hide password' },
  remember:        { ar: 'تذكّرني',                        en: 'Remember me' },
  forgot:          { ar: 'نسيت كلمة المرور؟',              en: 'Forgot password?' },
  enter:           { ar: 'الدخول إلى النظام',              en: 'Enter the system' },
  verifying:       { ar: 'جارٍ التحقق…',                   en: 'Verifying…' },
  /** VERBATIM (data.jsx:52). */
  login_note:      { ar: 'الوصول مقيّد بشبكة الوزارة الداخلية. كل عملية دخول تُسجَّل.', en: 'Access is restricted to the ministry network. Every sign-in is logged.' },
  signout:         { ar: 'تسجيل الخروج',                   en: 'Sign out' },

  // chrome
  persona:         { ar: 'العرض بصفة',                     en: 'Viewing as' },
  persona_where:   { ar: 'تُبدَّل من سجل الأوامر التغييرية أو من بطاقة الأمر',
                     en: 'Switched from the change-order register or an order record' },
  persona_note:    { ar: 'تُحسم الصفة على الخادم: العلاقة بالأمر والإجراءات المتاحة ونطاق مساحات العمل كلها تُقرأ من هذه الصفة، لا من هذه الشاشة. التبديل يعيد تحميل الصفحة بصفتها الجديدة.',
                     en: 'The capacity is resolved on the server: the viewer relation, the available actions and the workspace scope are all read from it, not from this screen. Switching reloads the page under the new capacity.' },
  language:        { ar: 'English',                        en: 'العربية' },

  // shell chrome — ported from v1.1 DSidebar / DTopbar / DAppFooter.
  // Keys keep the reference's own names (data.jsx STR) so a label can be
  // copied across verbatim.
  search_ph:       { ar: 'ابحث في المشاريع، العقود، اللجان…', en: 'Search projects, contracts, committees…' },
  all_workspaces:  { ar: 'المساحة الرئيسية',               en: 'Master space' },
  enterprise_ctx:  { ar: 'الوزارة',                        en: 'Ministry-wide' },
  your_workspaces: { ar: 'مساحات العمل المتاحة لك',        en: 'Your workspaces' },
  ws_active_short: { ar: 'نشط',                            en: 'active' },
  ws_current:      { ar: 'مساحة العمل الحالية',            en: 'Current workspace' },
  ws_back_to_ministry:{ ar: 'العودة إلى المركز',           en: 'Back to the ministry' },
  //
  // Workspace KIND labels are NOT here. They are a business-maintained value
  // list (`workspace-kind` in the Lookups table) like every other enum, and
  // this map is UI chrome only. The old ws_kind_* keys were a second, drifting
  // copy of that list and are gone.
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
  /** The page-head ACTION. VERBATIM from the live DSpaces
   *  (desktop-views.jsx:419): «مساحة عمل» / «Workspace» — the `add` icon beside
   *  it already says "new", so the word was doing the icon's job twice. */
  new_workspace:   { ar: 'مساحة عمل',                      en: 'Workspace' },
  /** The DRAWER's title, where there is no icon and the sentence has to stand
   *  on its own. The reference has no such drawer to copy. */
  ws_create_title: { ar: 'إنشاء مساحة عمل',                en: 'Create a workspace' },

  // ── SCR-W4 BOQ (04 §4) — chrome only. Coverage and distribution STATE
  // labels are not here: they are 06 §10 and §11 value lists and come from
  // the Lookups table like every other enum (P-11).
  boq_gate_t:      { ar: 'اختر عقداً للبدء',               en: 'Select a contract to start' },
  boq_gate_b:      { ar: 'البنود والأنشطة تنتمي إلى عقد واحد.', en: 'Items and activities belong to one contract.' },
  boq_contract:    { ar: 'العقد',                          en: 'Contract' },
  boq_change_contract: { ar: 'تغيير العقد',                en: 'Change contract' },
  boq_tab_register:{ ar: 'السجل',                          en: 'Register' },
  boq_tab_assign:  { ar: 'الربط بالأنشطة',                 en: 'Activity assignment' },
  boq_title:       { ar: 'بنود جدول الكميات',              en: 'Bill of quantities' },
  boq_search:      { ar: 'بحث بالرمز أو الوصف…',           en: 'Search by code or description…' },
  boq_columns:     { ar: 'الأعمدة',                        en: 'Columns' },
  boq_items:       { ar: 'بند',                            en: 'items' },
  boq_totals:      { ar: 'الإجمالي',                       en: 'Totals' },
  boq_calc_note:   { ar: 'الأوزان من قيمة العقد؛ نسبة التنفيذ من الأنشطة المرتبطة.',
                     en: 'Weights from contract value; executed % from the linked activities.' },
  boq_manual:      { ar: 'يدوي',                           en: 'manual' },
  boq_banded:      { ar: 'سعر مركّب',                      en: 'blended rate' },

  // columns — the reference's own order and wording
  boq_col_code:    { ar: 'الرمز',                          en: 'Code' },
  boq_col_desc:    { ar: 'الوصف',                          en: 'Description' },
  boq_col_unit:    { ar: 'الوحدة',                         en: 'Unit' },
  boq_col_qty:     { ar: 'الكمية',                         en: 'Quantity' },
  boq_col_rate:    { ar: 'سعر الوحدة',                     en: 'Unit rate' },
  boq_col_amount:  { ar: 'القيمة',                         en: 'Amount' },
  boq_col_weight:  { ar: 'الوزن %',                        en: 'Weight %' },
  boq_col_links:   { ar: 'الأنشطة',                        en: 'Activities' },
  boq_col_assigned_wt: { ar: 'الوزن المُخصَّص',             en: 'Assigned wt' },
  boq_col_progress:{ ar: 'التنفيذ',                        en: 'Executed' },
  boq_col_distribution: { ar: 'التوزيع',                   en: 'Distribution' },
  boq_col_coverage:{ ar: 'حالة التخصيص',                   en: 'Allocation state' },
  boq_col_actions: { ar: 'إجراءات',                        en: 'Actions' },

  // row actions
  boq_edit:        { ar: 'تعديل',                          en: 'Edit' },
  boq_delete:      { ar: 'حذف',                            en: 'Delete' },
  boq_distribute:  { ar: 'توزيع الكميات',                  en: 'Distribute' },
  boq_assign_row:  { ar: 'الربط بالأنشطة',                 en: 'Assign activities' },
  boq_save:        { ar: 'حفظ',                            en: 'Save' },
  boq_cancel:      { ar: 'إلغاء',                          en: 'Cancel' },
  boq_saved:       { ar: 'حُفظ البند',                      en: 'Item saved' },
  boq_deleted:     { ar: 'حُذف البند وتوزيعه وتخصيصاته',    en: 'Item, distribution and links deleted' },
  boq_delete_q:    { ar: 'حذف هذا البند وتوزيعه وتخصيصاته المرتبطة؟',
                     en: 'Delete this item with its distribution and its links?' },

  // empty states (04 §9) — empty-because-empty and empty-because-filtered
  boq_empty_t:     { ar: 'لا بنود كميات لهذا العقد',        en: 'No BOQ for this contract' },
  boq_empty_b:     { ar: 'يُستورد كشف الكميات مع العقد. حمّل بيانات العرض للبدء.',
                     en: 'The bill of quantities arrives with the contract. Load the demo fixture to begin.' },
  boq_nofilter_t:  { ar: 'لا بنود مطابقة',                 en: 'No matching items' },
  boq_nofilter_b:  { ar: 'جرّب مصطلحاً آخر أو امسح المرشّحات.', en: 'Try another term or clear the filters.' },

  // the distribution drawer (02 §8)
  boq_dist_title:  { ar: 'توزيع الكميات على الجهات المستفيدة', en: 'Distribute quantity to beneficiaries' },
  boq_dist_ben:    { ar: 'الجهة المستفيدة',                en: 'Beneficiary' },
  boq_dist_site:   { ar: 'الموقع',                         en: 'Site' },
  boq_dist_qty:    { ar: 'الكمية',                         en: 'Quantity' },
  boq_dist_total:  { ar: 'كمية البند',                     en: 'Item quantity' },
  boq_dist_done:   { ar: 'الموزّعة',                        en: 'Distributed' },
  boq_dist_left:   { ar: 'المتبقية',                       en: 'Remaining' },
  boq_dist_over:   { ar: 'الزائدة',                        en: 'Excess' },
  boq_dist_add:    { ar: 'إضافة جهة',                      en: 'Add a beneficiary' },
  boq_dist_remove: { ar: 'إزالة الجهة',                    en: 'Remove beneficiary' },
  boq_dist_saved:  { ar: 'حُفظ التوزيع',                    en: 'Distribution saved' },
  boq_dist_capped: { ar: 'الحقل مقيَّد بالكمية المتبقية للبند.', en: 'The field is capped at the item’s remaining quantity.' },
  boq_dist_cap_note: { ar: 'كل حقل مقيَّد بما تبقّى من كمية البند بعد بقية الجهات، فلا يمكن إدخال كمية غير صحيحة.',
                     en: 'Each field is capped at what is left of the item’s quantity after the other rows, so an invalid figure cannot be entered.' },
  boq_dist_over_b: { ar: 'التوزيع يتجاوز كمية البند — عدّل الكميات قبل الحفظ.',
                     en: 'The distribution exceeds the item quantity — revise it before saving.' },
  boq_dist_none_t: { ar: 'لم توزَّع الكمية بعد',            en: 'Not yet distributed' },
  boq_dist_none_b: { ar: 'وزّع كمية البند على الجهات المستفيدة لتتبّع التسليم لكل جهة.',
                     en: 'Allocate the item’s quantity to beneficiaries to track delivery per entity.' },
  boq_dist_no_ben: { ar: 'لا جهات مستفيدة مرتبطة بهذا المشروع.', en: 'No beneficiaries are assigned to this project.' },

  // the activity-assignment view (02 §2, 02 §3)
  boq_asn_queue:   { ar: 'بنود الكميات (المصدر)',          en: 'BOQ items (source)' },
  boq_asn_target:  { ar: 'الأنشطة المرتبطة (الهدف)',       en: 'Linked activities (target)' },
  boq_asn_pick:    { ar: 'اختر بنداً من القائمة',           en: 'Pick an item from the list' },
  boq_asn_pick_b:  { ar: 'ابدأ من البنود ذات المشاكل لحلّها أولاً.', en: 'Start from the flagged items first.' },
  boq_asn_basis:   { ar: 'أساس الوزن',                     en: 'Weight basis' },
  boq_asn_cost:    { ar: 'الكلفة',                         en: 'Cost' },
  boq_asn_mh:      { ar: 'ساعات العمل',                    en: 'Man-hours' },
  boq_asn_auto:    { ar: 'توزيع تلقائي',                   en: 'Auto-distribute' },
  boq_asn_add:     { ar: 'إضافة نشاط',                     en: 'Add activity' },
  boq_asn_activity:{ ar: 'النشاط',                         en: 'Activity' },
  boq_asn_its_wt:  { ar: 'وزن النشاط',                     en: 'Activity wt' },
  boq_asn_share:   { ar: 'الحصة',                          en: 'Share' },
  boq_asn_assigned:{ ar: 'القيمة المُخصَّصة',               en: 'Assigned' },
  boq_asn_abs_wt:  { ar: 'وزن مطلق',                       en: 'abs. wt' },
  boq_asn_total:   { ar: 'المجموع',                        en: 'Total' },
  boq_asn_remaining:{ ar: 'المتبقي',                       en: 'Remaining' },
  boq_asn_none_t:  { ar: 'لا أنشطة مرتبطة',                en: 'No linked activities' },
  boq_asn_none_b:  { ar: 'أضف نشاطاً لبدء الإسناد — القيمة غير المُسنَدة لا تُكتسب أبداً.',
                     en: 'Add an activity to start — an unallocated amount is never earned.' },
  boq_asn_no_acts: { ar: 'لا أنشطة في هذا العقد بعد — يُستورد الجدول الزمني في المرحلة 4.3.',
                     en: 'This contract has no activities yet — the schedule is imported in Phase 4.3.' },
  boq_asn_method:  { ar: 'الحصة المحسوبة = وزن النشاط المطلق ÷ مجموع أوزان الأنشطة المرتبطة. كل قيمة قابلة للتجاوز يدوياً، والاستعادة تُرجع المحسوبة.',
                     en: 'The computed share is the activity’s absolute weight over the sum of the linked activities’ weights. Every value is overridable, and reset restores the computed one.' },
  boq_asn_whatif:  { ar: 'أساس ساعات العمل عرض استكشافي — لا يصبح ملزماً إلا بالتوزيع التلقائي ثم الحفظ.',
                     en: 'The man-hours basis is a what-if — it becomes binding only through auto-distribute and a save.' },
  boq_asn_manual:  { ar: 'حصص هذا البند مُدخلة يدوياً',     en: 'This item’s shares were entered by hand' },
  boq_asn_reset:   { ar: 'استعادة المحسوبة',               en: 'Restore computed' },
  boq_asn_over_b:  { ar: 'مجموع الحصص يتجاوز 100% — صحّحه قبل الحفظ.',
                     en: 'The shares total more than 100% — fix it before saving.' },
  boq_asn_dup:     { ar: 'مكرَّر',                          en: 'duplicate' },
  boq_alloc_saved: { ar: 'حُفظ التخصيص',                    en: 'Allocation saved' },
  boq_alloc_reset: { ar: 'استُعيدت الحصص المحسوبة',         en: 'Computed shares restored' },
  boq_alloc_discarded: { ar: 'أُلغيت التعديلات غير المحفوظة', en: 'Unsaved changes discarded' },
  boq_alloc_no_weight: { ar: 'لا أوزان للأنشطة المرتبطة — لا يمكن التوزيع التلقائي.',
                     en: 'The linked activities carry no weight — auto-distribute has nothing to divide.' },

  // the Z10 status bar
  // ── الشكل 12 — بطاقة البند ─────────────────────────────────────────────
  // The six tabs the plate names, and the fields each one shows. Column
  // labels are NOT repeated here: the card reads `boq_col_*`, so a field is
  // named the same in the table and in the card that opens off it.
  boq_card_general:{ ar: 'عام',                            en: 'General' },
  boq_card_alloc:  { ar: 'التخصيص',                        en: 'Allocation' },
  boq_card_dist:   { ar: 'التوزيع',                        en: 'Distribution' },
  boq_card_prog:   { ar: 'الإنجاز',                        en: 'Progress' },
  boq_card_cost:   { ar: 'الكلفة',                         en: 'Cost' },
  boq_card_log:    { ar: 'السجل',                          en: 'Log' },

  boq_card_identity:{ ar: 'الهوية',                        en: 'Identity' },
  boq_card_division:{ ar: 'المجموعة',                      en: 'Division' },
  boq_card_source: { ar: 'المصدر',                         en: 'Source' },
  boq_card_imported:{ ar: 'مستورد',                        en: 'Imported' },
  boq_card_weight: { ar: 'وزن العقد',                      en: 'Contract weight' },
  boq_card_close:  { ar: 'إغلاق البطاقة',                  en: 'Close card' },
  boq_card_edit:   { ar: 'تعديل البند',                    en: 'Edit item' },
  boq_card_open:   { ar: 'فتح بطاقة البند',                en: 'Open item card' },
  boq_card_left:   { ar: 'يتبقى',                          en: 'remaining' },

  /** الكمية التعاقدية vs النافذة — D-01 measures the 20% against the first. */
  boq_card_orig_qty:{ ar: 'الكمية التعاقدية',              en: 'Contracted quantity' },
  boq_card_eff_qty:{ ar: 'الكمية النافذة',                 en: 'Quantity in force' },
  boq_card_banded_b:{ ar: 'أُعيد تسعير الكمية الزائدة عن ٢٠٪ بسعر تثبّته لجنة تثبيت الأسعار، فالسعر المعروض مركّب من شريحتين.', en: 'The quantity beyond 20% was re-priced at a rate fixed by the pricing committee, so the rate shown blends two bands.' },

  boq_card_shares: { ar: 'مجموع الحصص',                    en: 'Total shares' },
  boq_card_open_assign:{ ar: 'فتح الربط بالأنشطة',         en: 'Open activity assignment' },
  boq_card_distributed:{ ar: 'الموزَّع',                    en: 'Distributed' },
  boq_card_achieved_qty:{ ar: 'الكمية المنفَّذة',           en: 'Executed quantity' },
  boq_card_achieved:{ ar: 'القيمة المكتسبة',               en: 'Earned value' },
  /** BR-04 — this screen CONSUMES progress; it is not a source (الشكل 12). */
  boq_card_prog_note:{ ar: 'نسبة التنفيذ محسوبة من الأنشطة المرتبطة بهذا البند، ولا تُدخَل هنا.', en: 'Progress is rolled up from the activities linked to this item and is never entered here.' },

  /** The one tab with no table behind it yet. Named, not drawn empty (04 §9). */
  boq_card_log_na: { ar: 'لا يوجد سجل نشاط للبند بعد — لم يُبنَ جدول أحداث بنود الكميات، والتعديلات تُقيَّد حاليًا على مستوى العقد في سجل نشاطه.', en: 'No item activity log yet — a BOQ item event table does not exist, and edits are currently recorded on the contract\'s own activity log.' },

  /** The screen own caveat, printed under the table by the plate. */
  boq_basis_note:  { ar: 'الأوزان من قيمة العقد؛ نسبة التنفيذ من الأنشطة المرتبطة.', en: 'Weights are of the contract value; execution % comes from the linked activities.' },

  /** The three Z6 actions the plate lists. */
  // ── الشكل 13 — استيراد جدول الكميات (Excel) ────────────────────────────
  // The five step names are the document’s own, in its order.
  boq_imp_title:   { ar: 'استيراد جدول الكميات (Excel)',    en: 'Import bill of quantities (Excel)' },
  boq_imp_s1:      { ar: 'رفع الملف',                       en: 'Upload' },
  boq_imp_s2:      { ar: 'تحليل Excel',                     en: 'Parse' },
  boq_imp_s3:      { ar: 'التحقق',                          en: 'Validate' },
  boq_imp_s4:      { ar: 'المقارنة',                        en: 'Compare' },
  boq_imp_s5:      { ar: 'تأكيد وربط',                      en: 'Confirm & link' },

  boq_imp_file:    { ar: 'ملف جدول الكميات',                en: 'Bill of quantities file' },
  boq_imp_rows:    { ar: 'صفوف',                            en: 'rows' },
  boq_imp_row:     { ar: 'الصف',                            en: 'Row' },
  boq_imp_more:    { ar: 'وبقية الصفوف:',                   en: 'and further rows:' },
  /** No .xlsx parser in this build — see P-86. The message says what to do. */
  boq_imp_xlsx:    { ar: 'قراءة ملفات Excel (.xlsx) غير متاحة في هذه النسخة. احفظ الورقة بصيغة CSV من Excel («حفظ باسم» ← CSV UTF-8) ثم أعد الرفع.', en: 'Reading .xlsx workbooks is not available in this build. Save the sheet as CSV from Excel (Save As → CSV UTF-8) and upload again.' },
  boq_imp_empty:   { ar: 'الملف لا يحتوي على صف عناوين وصف بيانات واحد على الأقل.', en: 'The file needs a header row and at least one data row.' },
  boq_imp_unreadable:{ ar: 'تعذّرت قراءة الملف.',            en: 'The file could not be read.' },
  boq_imp_cols_t:  { ar: 'الأعمدة المطلوبة',                en: 'Columns required' },
  boq_imp_cols_b:  { ar: 'الرمز والوصف والقسم والوحدة والكمية وسعر الوحدة — بأي ترتيب، وتُطابَق الأعمدة في الخطوة التالية.', en: 'Code, description, division, unit, quantity and unit rate — in any order; the columns are mapped in the next step.' },

  boq_imp_map_b:   { ar: 'اختر العمود المقابل لكل حقل. الحقول المعلَّمة بنجمة إلزامية.', en: 'Choose the column for each field. Starred fields are required.' },
  boq_imp_unmapped:{ ar: '— غير مطابَق —',                  en: '— not mapped —' },

  boq_imp_ok_t:    { ar: 'لا ملاحظات على الملف',            en: 'No findings' },
  boq_imp_ok_b:    { ar: 'الكميات والأسعار صحيحة، ومجموع الأوزان', en: 'Quantities and rates are valid, and the weights sum to' },
  boq_imp_bad_t:   { ar: 'الملف يحتاج معالجة قبل التقديم',   en: 'The file needs fixing before it can be submitted' },
  boq_imp_bad_b:   { ar: 'ملاحظة — عالِجها في الملف وأعد الرفع.', en: 'findings — fix them in the file and upload again.' },
  boq_imp_field:   { ar: 'الحقل',                           en: 'Field' },
  boq_imp_finding: { ar: 'الملاحظة',                        en: 'Finding' },
  boq_imp_file_level:{ ar: 'الملف',                         en: 'File' },

  /** The violation `field` values, named as the register names its columns. */
  boq_f_code:      { ar: 'الرمز',                           en: 'Code' },
  boq_f_description:{ ar: 'الوصف',                          en: 'Description' },
  boq_f_unit:      { ar: 'الوحدة',                          en: 'Unit' },
  boq_f_qty:       { ar: 'الكمية',                          en: 'Quantity' },
  boq_f_rate:      { ar: 'سعر الوحدة',                      en: 'Unit rate' },

  boq_imp_added:   { ar: 'مضاف',                            en: 'Added' },
  boq_imp_removed: { ar: 'محذوف',                           en: 'Removed' },
  boq_imp_changed: { ar: 'معدَّل',                           en: 'Changed' },
  boq_imp_unchanged:{ ar: 'دون تغيير',                      en: 'Unchanged' },
  boq_imp_change:  { ar: 'التغيير',                         en: 'Change' },
  boq_imp_before:  { ar: 'الإصدار القائم',                  en: 'Version in force' },
  boq_imp_after:   { ar: 'بعد الاستيراد',                   en: 'After import' },
  boq_imp_delta:   { ar: 'الفرق',                           en: 'Difference' },
  boq_imp_nochange:{ ar: 'لا فرق بين الملف والإصدار القائم.', en: 'The file matches the version in force.' },

  /** «نوع الجدول» — the plate’s own field, and its own default. */
  boq_imp_type:    { ar: 'نوع الجدول',                      en: 'Sheet type' },
  boq_imp_type_initial:{ ar: 'إصدار أول',                   en: 'First issue' },
  boq_imp_type_replace:{ ar: 'تحديث حالي',                  en: 'Update of current' },
  boq_imp_type_revision:{ ar: 'مراجعة تعاقدية',             en: 'Contractual revision' },
  /** Printed inside the dialog by الشكل 13, and enforced by EP-BOQ-10. */
  boq_imp_note:    { ar: 'يُقدَّم للاعتماد ولا يُستبدل الجدول السابق — يُحفَظ كإصدار.', en: 'Submitted for approval; the previous sheet is not replaced — it is kept as a version.' },

  boq_imp_back:    { ar: 'السابق',                          en: 'Back' },
  boq_imp_next:    { ar: 'التالي',                          en: 'Next' },
  boq_imp_checking:{ ar: 'جارٍ التحقق…',                    en: 'Checking…' },
  boq_imp_submit:  { ar: 'تقديم للاعتماد',                  en: 'Submit for approval' },
  boq_imp_done_t:  { ar: 'قُدِّمت النسخة للاعتماد',           en: 'Version submitted for approval' },
  boq_imp_done_b:  { ar: 'إصدار رقم',                       en: 'Version no.' },
  /** The register bar: a submitted version is waiting and the bill is unchanged. */
  boq_imp_pending: { ar: 'نسخة مقدَّمة للاعتماد',             en: 'A version is awaiting approval' },
  boq_imp_pending_b:{ ar: 'الجدول المعروض هو الإصدار النافذ ولم يتغيّر.', en: 'The sheet shown is the version in force and has not changed.' },

  boq_manual_add:  { ar: 'إدخال يدوي',                     en: 'Manual entry' },
  boq_import:      { ar: 'استيراد',                        en: 'Import' },
  boq_beneficiaries:{ ar: 'الجهات المستفيدة',              en: 'Beneficiaries' },

  boq_stat_items:  { ar: 'البنود',                         en: 'Items' },
  boq_stat_contract:{ ar: 'قيمة العقد',                    en: 'Contract value' },
  boq_stat_project:{ ar: 'قيمة المشروع',                   en: 'Project value' },
  boq_stat_acts:   { ar: 'الأنشطة',                        en: 'Activities' },
  boq_stat_balanced:{ ar: 'مطابق',                         en: 'Balanced' },
  boq_asof:        { ar: 'بيانات حتى',                     en: 'Data as of' },
  /** The unit a money column is stated in, once in its header — the reference's
   *  own `cur(lang)` (boq-register.jsx:23). D-11: IQD, always an integer. */
  cur_iqd:         { ar: 'د.ع',                            en: 'IQD' },

  // ── SCR-W5 Schedule (04 §5) — chrome only. Activity STATUS labels come
  // from the `activity-status` lookup (06 §9), like every other enum.
  scd_gate_t:      { ar: 'اختر عقداً لعرض الجدول الزمني',   en: 'Select a contract to see its schedule' },
  scd_gate_b:      { ar: 'الأنشطة تنتمي إلى عقد واحد.',     en: 'Activities belong to one contract.' },
  scd_tab_gantt:   { ar: 'المخطط الزمني',                  en: 'Gantt' },
  scd_tab_table:   { ar: 'الجدول',                         en: 'Table' },
  scd_wbs_activity:{ ar: 'هيكل التجزئة / النشاط',          en: 'WBS / Activity' },
  scd_critical:    { ar: 'المسار الحرج',                   en: 'Critical path' },
  scd_level:       { ar: 'المستوى',                        en: 'Level' },
  scd_basis:       { ar: 'أساس الوزن',                     en: 'Weight basis' },
  scd_cost:        { ar: 'الكلفة',                         en: 'Cost' },
  scd_mh:          { ar: 'ساعات العمل',                    en: 'Man-hours' },
  scd_cols_all:    { ar: 'كل الأعمدة (9)',                 en: 'All columns (9)' },
  scd_cols_few:    { ar: 'أعمدة أساسية (4)',               en: 'Essential columns (4)' },
  scd_resize:      { ar: 'اسحب لتغيير عرض العمود',         en: 'Drag to resize the column' },

  // the nine info columns (04 §5), headers WRAP rather than truncate
  scd_col_dur:     { ar: 'المدة',                          en: 'Duration' },
  scd_col_bl_start:{ ar: 'بداية الأساس',                   en: 'Baseline start' },
  scd_col_bl_fin:  { ar: 'إنجاز الأساس',                   en: 'Baseline finish' },
  scd_col_act_start:{ ar: 'البداية الفعلية',               en: 'Actual start' },
  scd_col_act_fin: { ar: 'الإنجاز الفعلي',                 en: 'Actual finish' },
  scd_col_float:   { ar: 'العوم الكلي',                    en: 'Total float' },
  scd_col_pct:     { ar: 'الإنجاز',                        en: '% Complete' },
  scd_col_rel:     { ar: 'الوزن النسبي',                   en: 'Rel. weight' },
  scd_col_abs:     { ar: 'الوزن المطلق',                   en: 'Abs. weight' },
  scd_col_id:      { ar: 'المعرّف',                        en: 'Activity ID' },
  scd_col_status:  { ar: 'الحالة',                         en: 'Status' },
  scd_col_cost:    { ar: 'الكلفة',                         en: 'Cost' },
  scd_col_slip:    { ar: 'الانزياح',                       en: 'Slip' },
  scd_col_forecast:{ ar: 'الإنجاز المتوقع',                en: 'Forecast finish' },

  // the record pane
  scd_rec_calendar:{ ar: 'التقويم',                        en: 'Calendar' },
  scd_rec_preds:   { ar: 'السوابق',                        en: 'Predecessors' },
  scd_rec_dur:     { ar: 'المدة الأصلية / المتبقية',       en: 'Original / remaining duration' },
  scd_rec_wbs:     { ar: 'هيكل التجزئة',                   en: 'WBS' },
  scd_rec_close:   { ar: 'إغلاق',                          en: 'Close' },
  scd_days:        { ar: 'يوم',                            en: 'd' },
  scd_early:       { ar: 'مبكّر',                          en: 'early' },
  scd_late:        { ar: 'متأخر',                          en: 'late' },
  scd_ontime:      { ar: 'ضمن الأساس',                     en: 'on baseline' },
  scd_progress_ro: { ar: 'تحديث الإنجاز يتم من شاشة الإنجاز (المرحلة 4.4)، حيث ينعكس مباشرةً على بنود الكميات.',
                     en: 'Progress is updated on the Progress screen (Phase 4.4), where it reflects straight onto the BOQ.' },

  // the legend — every mark on the chart, named
  scd_legend_bl:   { ar: 'خط الأساس',                      en: 'Baseline' },
  scd_legend_cur:  { ar: 'الوضع الحالي (اللون = الحالة)',  en: 'Current (colour = status)' },
  scd_legend_crit: { ar: 'المسار الحرج (إطار)',            en: 'Critical path (ring)' },
  scd_legend_ms:   { ar: 'حَدَث فارق',                      en: 'Milestone' },
  scd_legend_dd:   { ar: 'تاريخ البيانات',                 en: 'Data date' },

  // states
  scd_empty_t:     { ar: 'لا جدول زمني لهذا العقد',        en: 'No schedule for this contract' },
  scd_empty_b:     { ar: 'يُستورد الجدول الزمني من Primavera P6. حمّل بيانات العرض للبدء.',
                     en: 'The schedule is imported from Primavera P6. Load the demo fixture to begin.' },
  scd_nocrit_t:    { ar: 'لا أنشطة على المسار الحرج',      en: 'No activities on the critical path' },
  scd_nocrit_b:    { ar: 'ألغِ مرشّح المسار الحرج لعرض الجدول كاملاً.',
                     en: 'Clear the critical-path filter to see the whole schedule.' },

  // summary strip — the client module spec's own five figures
  scd_stat_activities:{ ar: 'الأنشطة',                     en: 'Activities' },
  scd_stat_critical:  { ar: 'حرجة',                        en: 'Critical' },
  scd_stat_delayed:   { ar: 'متأخرة',                      en: 'Delayed' },
  scd_stat_progress:  { ar: 'متوسط الإنجاز',               en: 'Avg. progress' },
  scd_stat_milestones:{ ar: 'أحداث فارقة',                 en: 'Milestones' },
  /** Stated under the grid, because two weights with two denominators is the
   *  single thing most likely to be misread on this screen (02 §2). */
  scd_weights_note:{ ar: 'الوزن النسبي = حصة النشاط داخل بند هيكل التجزئة الذي يتبعه؛ الوزن المطلق = حصته من العقد كاملاً. المطلق هو ما يقود التخصيص والقيمة المكتسبة.',
                     en: "Relative weight is the activity's share of the WBS node it sits in; absolute weight is its share of the whole contract. Absolute is what drives allocation and earned value." },
  scd_crit_note:   { ar: 'العوم صفر — أي تأخير في هذا النشاط يؤخّر إنجاز العقد بالكامل. يُعرَض بإطار لا بلون؛ اللون محجوز للحالة.',
                     en: 'Zero float — any delay here delays the whole contract. Shown as a ring, not a colour; the colour channel belongs to status.' },

  // ── SCR-W6 Progress (Phase 4.4) ────────────────────────────────────────
  prg_asof:        { ar: 'حتى',                            en: 'as at' },
  prg_tab_summary: { ar: 'الملخص',                         en: 'Summary' },
  prg_tab_activities: { ar: 'إدخال الإنجاز',                en: 'Report progress' },
  prg_tab_boq:     { ar: 'الانعكاس على الكميات',            en: 'Reflection on the BOQ' },

  prg_physical:    { ar: 'الإنجاز المادي',                  en: 'Physical' },
  prg_planned:     { ar: 'المخطط',                          en: 'Planned' },
  prg_financial:   { ar: 'الإنجاز المالي',                  en: 'Financial' },
  prg_gap:         { ar: 'الفجوة',                          en: 'Gap' },
  prg_pts:         { ar: 'نقطة',                            en: 'pts' },
  prg_delay:       { ar: 'التأخر',                          en: 'Delay' },
  prg_budget:      { ar: 'الموازنة',                        en: 'Budget' },
  prg_executed:    { ar: 'المنجَز',                         en: 'Executed' },
  prg_activities:  { ar: 'الأنشطة',                         en: 'Activities' },
  prg_boq_lines:   { ar: 'بنود الكميات',                    en: 'BOQ lines' },
  prg_reported:    { ar: 'الإنجاز المُبلَّغ',                en: 'Reported' },
  prg_actions:     { ar: 'إجراءات',                         en: 'Actions' },

  prg_planned_note: { ar: 'ما يفرضه خط الأساس عند تاريخ البيانات',
                      en: 'what the baseline requires at the data date' },
  prg_physical_note: { ar: 'مرجّح بأوزان بنود الكميات',
                       en: 'weighted by BOQ item weights' },
  prg_gap_note:     { ar: 'موجب يعني تقدّماً على الخطة',
                      en: 'positive means ahead of plan' },

  prg_by_contract: { ar: 'الإنجاز حسب العقود',              en: 'Progress by contract' },
  prg_by_contract_sub: { ar: 'محسوب صعوداً من بنود الكميات، لا يُدخَل يدوياً',
                         en: 'rolled up from the BOQ lines, never entered by hand' },

  prg_evm:         { ar: 'مؤشرات الأداء',                   en: 'Performance indices' },
  prg_evm_sub:     { ar: 'مؤشرات تشخيصية — لا تُقرأ كعناوين',
                     en: 'diagnostics — not headline figures' },
  prg_evm_note:    { ar: 'SPI = المكتسب ÷ المخطط · CPI = المكتسب ÷ الفعلي · EAC = الموازنة ÷ CPI · VAC = الموازنة − EAC. المخطط مشتق من خط الأساس على أوزان الكلفة نفسها (P-53).',
                     en: 'SPI = earned ÷ planned · CPI = earned ÷ actual · EAC = budget ÷ CPI · VAC = budget − EAC. Planned is derived from the baseline on the same cost weights (P-53).' },
  prg_spi_behind:  { ar: 'دون الخطة',                       en: 'behind plan' },
  prg_spi_on:      { ar: 'على الخطة',                       en: 'on plan' },
  prg_cpi_over:    { ar: 'تجاوز في الكلفة',                 en: 'over cost' },
  prg_cpi_within:  { ar: 'الكلفة ضمن الحدود',               en: 'cost within limits' },

  prg_edit_t:      { ar: 'الإنجاز يُدخَل هنا، وينعكس مباشرةً على بنود الكميات',
                     en: 'Progress is entered here, and reflects straight onto the BOQ' },
  prg_edit_b:      { ar: 'كل صف يذكر البنود التي يغذّيها قبل تعديله — التفصيل في تبويب الانعكاس.',
                     en: 'Each row names the lines it feeds before you touch it — the detail is in the reflection tab.' },
  prg_feeds:       { ar: 'يغذّي البنود',                     en: 'Feeds' },
  prg_feeds_none:  { ar: 'غير مرتبط ببند',                  en: 'linked to no line' },

  prg_boq_progress: { ar: 'إنجاز البند',                    en: 'Line progress' },
  prg_achieved_qty: { ar: 'الكمية المنجَزة',                en: 'Achieved qty' },
  prg_achieved_amount: { ar: 'المبلغ المنجَز',              en: 'Achieved amount' },
  prg_remaining_value: { ar: 'القيمة المتبقية',             en: 'Remaining value' },
  prg_contribution: { ar: 'المساهمة',                       en: 'Contribution' },
  prg_no_contributors: { ar: 'لا نشاط مرتبط بهذا البند — لا يمكن كسب قيمته.',
                         en: 'No activity is linked to this line — its value can never be earned.' },
  prg_unlinked_t:  { ar: '{n} من بنود الكميات غير مرتبطة بأي نشاط',
                     en: '{n} BOQ line(s) are linked to no activity' },
  prg_unlinked_b:  { ar: 'قيمتها لا يمكن كسبها حتى تُربَط في شاشة جدول الكميات.',
                     en: 'Their value can never be earned until they are linked on the BOQ screen.' },

  prg_err_required: { ar: 'أدخل نسبة الإنجاز.',             en: 'Enter a progress percentage.' },
  prg_err_number:  { ar: 'القيمة يجب أن تكون رقماً.',        en: 'The value must be a number.' },
  prg_err_range:   { ar: 'نسبة الإنجاز بين صفر ومئة.',       en: 'Progress is between 0 and 100.' },
  prg_err_milestone: { ar: 'الحَدَث الفارق إمّا متحقق (100) أو غير متحقق (0).',
                       en: 'A milestone is either reached (100) or not (0).' },
  prg_err_save:    { ar: 'تعذّر حفظ الإنجاز.',              en: 'Could not save the progress.' },
  prg_saved_reflected: { ar: 'انعكس على {n} من بنود الكميات',
                         en: 'reflected onto {n} BOQ line(s)' },
  prg_saved_unlinked: { ar: 'حُفظ — لا بند مرتبط به',        en: 'saved — no line is linked to it' },

  // ── SCR-W7 Financials (Phase 4.4) ──────────────────────────────────────
  // ── الشكل 14 — جدول الكلف ──────────────────────────────────────────────
  // The six tabs are الأشكال 14 · 15 · 16 · 17 · 18 · 19 — this screen is the
  // first of them, and the other five are named on its own strip.
  fin_tab_alloc:   { ar: 'التخصيص السنوي',                  en: 'Annual allocation' },
  fin_tab_sla:     { ar: 'مهل التدقيق',                     en: 'Audit lead times' },
  fin_tab_records: { ar: 'البيانات المسجّلة',                en: 'Recorded data' },
  fin_tab_changes: { ar: 'سجل التغييرات',                   en: 'Change log' },
  /** Each unbuilt tab names its own figure, so the gap is legible (04 §9). */
  fin_tab_alloc_needs:{ ar: 'الشكل 15 — يتطلب جدول التخصيصات السنوية للوزارة، ولا يسجّله هذا النموذج بعد.', en: 'الشكل 15 — needs the ministry’s yearly allocation table, which this data model does not record yet.' },
  fin_tab_sla_needs:{ ar: 'الشكل 17 — يتطلب تواريخ مراحل تدقيق المستخلص، ولا تسجّلها جداول الدفعات بعد.', en: 'الشكل 17 — needs the per-stage audit dates of a certificate, which the payment tables do not record yet.' },
  fin_tab_records_needs:{ ar: 'الشكل 18 — يعرض البيانات المالية المسجّلة يدويًا، ولم تُبنَ شاشتها بعد.', en: 'الشكل 18 — shows the manually recorded financial data; its screen is not built yet.' },
  fin_tab_changes_needs:{ ar: 'الشكل 19 — سجل التغييرات المالية، ولم يُبنَ جدول أحداثه بعد.', en: 'الشكل 19 — the financial change log; its event table is not built yet.' },

  // ── الشكل 15 — التخصيص السنوي ──────────────────────────────────────────
  // ── الشكل 16 — سجل الدفعات وتفاصيل الدفعة ──────────────────────────────
  // The row is a FUNDING LETTER, which can cover more than one contract.
  // ── الشكل 17 — مهل التدقيق ──────────────────────────────────────────────
  fin_sla_card:    { ar: 'مهلة تدقيق السلفة الجارية',        en: 'Audit lead time — certificate in flight' },
  fin_sla_within:  { ar: 'ضمن المهلة',                      en: 'Within the limit' },
  fin_sla_over:    { ar: 'تجاوز المهلة',                    en: 'Past the limit' },
  fin_sla_current: { ar: 'المرحلة الحالية',                 en: 'Current stage' },
  fin_sla_cap:     { ar: 'السقف',                           en: 'Cap' },
  fin_sla_days:    { ar: 'يوم',                             en: 'days' },
  fin_sla_done:    { ar: 'منجز',                            en: 'done' },
  fin_sla_elapsed: { ar: 'يوم مضت',                         en: 'days elapsed' },
  fin_sla_waiting: { ar: 'لم تبدأ',                         en: 'not started' },
  fin_sla_due:     { ar: 'الموعد القانوني للصرف',            en: 'Legal disbursement date' },
  fin_sla_in:      { ar: 'خلال',                            en: 'in' },
  fin_sla_past:    { ar: 'مضى على الموعد',                  en: 'past due by' },
  fin_sla_none_t:  { ar: 'لا سلفة جارية على هذا المشروع',    en: 'No certificate in flight on this project' },
  fin_sla_none_b:  { ar: 'تُتابَع المهل للمستخلص المصادق عليه الذي لم يُصرف بعد.', en: 'Lead times are tracked for a certificate that has been certified and not yet paid.' },
  fin_pay_register:{ ar: 'سجل الدفعات',                     en: 'Payments register' },
  fin_pay_count:   { ar: 'دفعة',                            en: 'payments' },
  fin_pay_letter:  { ar: 'كتاب التمويل',                    en: 'Funding letter' },
  fin_pay_date:    { ar: 'التاريخ',                         en: 'Date' },
  fin_pay_contracts:{ ar: 'العقود',                         en: 'Contracts' },
  fin_pay_amount:  { ar: 'المبلغ',                          en: 'Amount' },
  fin_pay_split:   { ar: 'توزيع الدفعة على العقود',          en: 'Distribution across contracts' },
  /** الشكل 16 names who registered the payment; nothing records that yet. */
  fin_pay_recorder_na:{ ar: 'لا يُسجَّل منفّذ قيد الدفعة بعد — تلتقطه شاشة «تسجيل دفعة» (الشكل 20) ولم تُبنَ بعد.', en: 'Who registered the payment is not recorded yet — the «تسجيل دفعة» screen (الشكل 20) captures it and is not built.' },
  fin_no_pay_t:    { ar: 'لا دفعات مسجَّلة على هذا المشروع',  en: 'No payments recorded on this project' },
  fin_no_pay_b:    { ar: 'تُسجَّل الدفعة عند صدور كتاب التمويل ومصادقة الذرعة.', en: 'A payment is recorded when the funding letter is issued and the measurement certified.' },
  fin_alloc_card:  { ar: 'التخصيص السنوي',                  en: 'Annual allocation' },
  fin_alloc_current:{ ar: 'السنة الحالية',                  en: 'current year' },
  fin_alloc_all:   { ar: 'كل السنوات المسجّلة',              en: 'all recorded years' },
  fin_alloc_pct:   { ar: 'نسبة الاستهلاك',                  en: 'Consumption' },
  fin_alloc_amount:{ ar: 'التخصيص',                         en: 'Allocated' },
  fin_alloc_spent: { ar: 'المصروف',                         en: 'Spent' },
  fin_alloc_left:  { ar: 'المتبقي',                         en: 'Remaining' },
  fin_alloc_col_year:{ ar: 'السنة',                         en: 'Year' },
  fin_alloc_closed:{ ar: 'مقفلة',                           en: 'closed' },
  fin_alloc_total: { ar: 'الإجمالي',                        en: 'Total' },
  /** «أين تُحرَّر هذه القيم» — the plate’s own box, and the rule it states. */
  fin_alloc_where_t:{ ar: 'أين تُحرَّر هذه القيم',            en: 'Where these values are edited' },
  fin_alloc_where_b:{ ar: 'تخصيص السنة الحالية ومصروفها يُحرَّران في تبويب «البيانات المسجّلة» — وهو تبويب التحرير الوحيد في هذه الصفحة. السنوات السابقة سجلّ مقفل، ويغيّرها إجراء مناقلة معتمد لا التحرير المباشر.', en: 'The current year’s allocation and spend are edited in «البيانات المسجّلة» — the only editing tab on this page. Earlier years are a closed record and move only through an approved transfer, never by editing in place.' },
  /** No allocation recorded is a state, not zero (P-09). */
  fin_alloc_none_t:{ ar: 'لا تخصيص سنوي مسجَّل لهذا المشروع', en: 'No annual allocation recorded for this project' },
  fin_alloc_none_b:{ ar: 'يُسجَّل التخصيص لكل سنة مالية في تبويب «البيانات المسجّلة».', en: 'An allocation is recorded per fiscal year in the «البيانات المسجّلة» tab.' },

  fin_year:        { ar: 'السنة',                           en: 'Year' },
  fin_all_years:   { ar: 'كل السنوات',                      en: 'All years' },

  /** The plate’s three column groups. */
  fin_evm_sub:     { ar: 'مؤشرات تشخيصية — لا تُقرأ منفردة (02 §11)', en: 'Diagnostic indices — never read alone (02 §11)' },
  fin_grp_budget:  { ar: 'الموازنة',                        en: 'Budget' },
  fin_grp_actual:  { ar: 'الفعلي',                          en: 'Actual' },
  fin_grp_forecast:{ ar: 'التنبؤ',                          en: 'Forecast' },
  fin_spent_year:  { ar: 'مصروف السنة',                     en: 'Spent this year' },
  fin_spent_todate:{ ar: 'مصروف تراكمي',                    en: 'Spent to date' },
  fin_at_completion:{ ar: 'عند الإنجاز',                    en: 'At completion' },
  fin_variance:    { ar: 'الفرق',                           en: 'Variance' },

  /** «أساسا القياس» — the note box under the table. */
  fin_basis_t:     { ar: 'أساسا القياس: الموازنة المعتمدة مقابل الالتزامات التعاقدية', en: 'Two bases: approved budget vs contracted commitments' },
  fin_basis_budget:{ ar: 'الكلفة المعدلة المسجّلة',           en: 'The recorded revised cost' },
  fin_basis_vs:    { ar: 'هي الموازنة المعتمدة للمشروع، بينما إجمالي العقود', en: 'is the project’s approved budget, while the contracts total' },
  fin_basis_gap:   { ar: 'هو قيمة ما التُزم به تعاقديًا — الفرق', en: 'which is what has been contractually committed — the gap is' },
  fin_basis_over:  { ar: 'أي أن الالتزامات تتجاوز الموازنة وتستوجب تعديل الكلفة أو مناقلة.', en: 'The commitments exceed the budget and need a cost revision or a transfer.' },
  fin_basis_under: { ar: 'أي أن الموازنة تغطي الالتزامات التعاقدية.', en: 'The budget covers the contracted commitments.' },
  fin_basis_none:  { ar: 'لا موازنة معتمدة مسجّلة لهذا المشروع، فلا يمكن قياس الالتزامات التعاقدية عليها.', en: 'No approved budget is recorded for this project, so the commitments cannot be measured against one.' },

  fin_tab_sheet:   { ar: 'جدول الكلف',                      en: 'Cost sheet' },
  fin_tab_payments: { ar: 'الدفعات',                        en: 'Payments' },
  fin_tab_evm:     { ar: 'المؤشرات',                        en: 'Indices' },

  fin_approved:    { ar: 'الكلفة المقررة',                  en: 'Approved cost' },
  fin_approved_changes: { ar: 'تغييرات معتمدة ومنفَّذة',     en: 'Applied changes' },
  fin_applied_only: { ar: 'المنفَّذة وحدها تدخل الكلفة',     en: 'applied orders only' },
  fin_revised:     { ar: 'الكلفة المعدلة',                  en: 'Revised cost' },
  fin_disbursed:   { ar: 'المصروف',                         en: 'Disbursed' },
  fin_certified_unpaid: { ar: 'مصادق ولم يُصرَف',            en: 'Certified, unpaid' },
  fin_retention:   { ar: 'الضمانات المحتجزة',               en: 'Retention held' },
  fin_advance_out: { ar: 'رصيد السلف',                      en: 'Advance outstanding' },
  fin_balance:     { ar: 'المتبقي',                         en: 'Balance' },
  fin_cost_item:   { ar: 'بند الكلفة',                      en: 'Cost item' },
  fin_total_contracts: { ar: 'إجمالي العقود',               en: 'Total — contracts' },
  fin_total_paid:  { ar: 'الإجمالي المصروف',                en: 'Total disbursed' },
  fin_positions:   { ar: 'المراكز المالية القائمة',          en: 'Outstanding positions' },
  fin_positions_note: { ar: 'الضمانات المحتجزة التزام على الوزارة، ورصيد السلف التزام على المقاول. لا يدخل أيٌّ منهما في «المتبقي»، وكلاهما يُحتسب من الدفعات المصروفة فقط.',
                        en: 'Retention held is owed BY the ministry; the advance balance is owed TO it. Neither is in the balance, and both count paid certificates only.' },

  fin_pending_t:   { ar: 'أوامر معتمدة لم تُنفَّذ بعد',       en: 'Approved orders not yet applied' },
  fin_pending_b:   { ar: 'الاعتماد لا يغيّر شيئاً — هذه القيمة ليست في أي من المجاميع أعلاه:',
                     en: 'Approving changes nothing — this figure is in none of the totals above:' },

  fin_col_no:      { ar: 'المستخلص',                        en: 'Cert.' },
  fin_col_kind:    { ar: 'النوع',                           en: 'Kind' },
  fin_col_letter:  { ar: 'كتاب التمويل',                    en: 'Finance letter' },
  fin_col_gross:   { ar: 'المصادق عليه',                    en: 'Gross' },
  fin_col_retention: { ar: 'الضمان',                        en: 'Retention' },
  fin_col_recovery: { ar: 'استرداد السلفة',                 en: 'Advance recovery' },
  fin_col_net:     { ar: 'الصافي',                          en: 'Net' },
  fin_col_certified: { ar: 'تاريخ المصادقة',                en: 'Certified' },
  fin_col_paid:    { ar: 'تاريخ الصرف',                     en: 'Paid' },
  fin_unpaid:      { ar: 'لم يُصرَف',                        en: 'not paid' },
  fin_unpaid_t:    { ar: 'مصادق عليه ولم يُصرَف',            en: 'Certified and not yet paid' },
  fin_unpaid_b:    { ar: 'المبلغ مستحق ولم يغادر الخزينة، فلا يدخل المصروف ولا يُحتسب منه ضمان ولا استرداد سلفة.',
                     en: 'The amount is owed and has not left the treasury, so it enters neither the disbursed total nor the retention and advance balances.' },
  fin_note:        { ar: 'ملاحظة',                          en: 'Note' },
  fin_net_note:    { ar: 'الصافي = المصادق عليه − الضمان − استرداد السلفة.',
                     en: 'Net = gross − retention − advance recovery.' },
  fin_evm_note:    { ar: 'الكلفة الفعلية هنا هي المصروف — المدفوع فعلاً، لا المصادق عليه.',
                     en: 'Actual cost here is the disbursed figure — what was paid, not what was certified.' },

  fin_expense_items: { ar: 'بنود الصرف التعاقدية',           en: 'Contract expense items' },
  fin_expense_items_sub: { ar: 'إلى جانب قيمة العقد، لا ضمنها',
                           en: 'beside the contract value, not inside it' },
  fin_expense_items_note: { ar: 'قيمة العقد هي مبلغ الإحالة نفسه (01 §2.3)، فالاحتياط والإشراف مخصصان إضافيان لا جزءان منها — ولذلك لا تُجمَع هذه البنود مع صف العقد. الأمر التغييري المنفَّذ يحرّك الإحالة وحدها.',
                            en: 'The contract value IS the award amount (01 §2.3), so the reserve and the supervision allowance sit beside it rather than inside it — which is why these do not add up to the contract row. An applied change order moves the award alone.' },
  // ── SCR-W8 Change orders — the register (Phase 5.1) ────────────────────
  chg_grp_all:     { ar: 'الكل',                            en: 'All' },
  chg_grp_draft:   { ar: 'مسودة',                           en: 'Draft' },
  chg_grp_pending: { ar: 'قيد الاعتماد',                    en: 'In approval' },
  chg_grp_returned: { ar: 'معاد للتعديل',                   en: 'Returned' },
  chg_grp_applying: { ar: 'معتمد — بانتظار التطبيق',        en: 'Approved — applying' },
  chg_grp_closed:  { ar: 'مطبَّق ومغلق',                     en: 'Applied & closed' },
  chg_grp_rejected: { ar: 'مرفوض',                          en: 'Rejected' },

  // BR-14's five relations (03 §7).
  chg_rel_awaiting: { ar: 'بانتظار إجرائك',                 en: 'Awaiting you' },
  chg_rel_recorder: { ar: 'تسجيل نيابة عن جهة خارجية',      en: 'Record for an external party' },
  chg_rel_acted:   { ar: 'تم إجراؤك',                       en: 'You have acted' },
  chg_rel_upcoming: { ar: 'سيصلك لاحقاً',                   en: 'Reaches you later' },
  chg_rel_none:    { ar: 'للاطلاع',                         en: 'For information' },

  chg_kpi_net:     { ar: 'صافي المعتمد',                    en: 'Net approved' },
  chg_kpi_net_foot: { ar: 'المعتمد وحده — لا المقترح',      en: 'approved only, never proposed' },
  chg_kpi_pending: { ar: 'قيد الاعتماد',                    en: 'In approval' },
  chg_kpi_needs:   { ar: 'تجاوزت السقف الزمني',             en: 'SLA exceeded' },
  chg_kpi_overdue: { ar: 'متأخرة',                          en: 'Overdue' },
  chg_kpi_cycle:   { ar: 'متوسط دورة الاعتماد',             en: 'Avg approval cycle' },

  chg_search:      { ar: 'بحث بالرقم أو السبب أو رقم الوارد…',
                     en: 'Search by number, reason or letter…' },
  chg_f_mine:      { ar: 'بانتظار إجرائي',                  en: 'Awaiting me' },
  chg_f_sla:       { ar: 'تجاوزت السقف',                    en: 'SLA exceeded' },
  chg_f_overdue:   { ar: 'متأخرة',                          en: 'Overdue' },
  chg_f_stage:     { ar: 'المرحلة',                          en: 'Stage' },
  chg_f_stage_all: { ar: 'كل المراحل',                      en: 'All stages' },
  chg_ff_type:     { ar: 'نوع الأمر',                       en: 'Order type' },
  chg_ff_type_all: { ar: 'كل الأنواع',                      en: 'All types' },

  chg_awaiting_t:  { ar: '{n} من الأوامر بانتظار إجرائك',    en: '{n} order(s) await your action' },
  chg_awaiting_b:  { ar: 'بصفة',                            en: 'as' },
  chg_awaiting_none_t: { ar: 'لا أوامر بانتظار إجرائك',      en: 'No orders await your action' },

  chg_col_no:      { ar: 'الرمز',                           en: 'Code' },
  chg_col_order:   { ar: 'الأمر التغييري',                  en: 'Change order' },
  chg_col_value:   { ar: 'القيمة',                          en: 'Value' },
  chg_col_days:    { ar: 'المدة',                           en: 'Time' },
  chg_col_status:  { ar: 'الحالة والمرحلة',                 en: 'Status & stage' },
  chg_col_owner:   { ar: 'الجهة المسؤولة',                  en: 'Owner' },
  chg_col_files:   { ar: 'مرفقات',                          en: 'Files' },
  chg_total:       { ar: 'الإجمالي',                        en: 'Total' },
  chg_of:          { ar: 'من',                              en: 'of' },

  chg_approved_fig: { ar: 'معتمد',                          en: 'approved' },
  chg_proposed_fig: { ar: 'مقترح',                          en: 'proposed' },
  chg_approved_note: { ar: 'صافي المعتمد يجمع الأوامر المعتمدة وحدها. الاعتماد لا يغيّر شيئاً في قيمة العقد — التطبيق هو ما ينشئ الملحق ويحرّك الأرقام (02 §9).',
                       en: 'Net approved sums approved orders only. Approving changes nothing in the contract value — applying is what creates the amendment and moves the figures (02 §9).' },

  chg_empty_t:     { ar: 'لا أوامر تغييرية على هذا المشروع',  en: 'No change orders on this project' },
  chg_empty_b:     { ar: 'يُنشأ أمر الغيار بعد ورود طلب الجهة المنفِّذة ورأي الجهة الفنية.',
                     en: 'A change order is raised once the executing party requests it and the technical party has given its opinion.' },
  chg_nomatch_t:   { ar: 'لا أوامر مطابقة للفلاتر',          en: 'No orders match the filters' },
  chg_nomatch_b:   { ar: 'غيّر الحالة أو الصفة، أو امسح الفلاتر لعرض كل الأوامر.',
                     en: 'Change the status or the relation, or clear the filters to see every order.' },

  chg_open:        { ar: 'فتح بطاقة الأمر',                  en: 'Open the order record' },
  chg_record_soon_t: { ar: 'اضغط أي أمر لفتح بطاقته',
                       en: 'Select an order to open its record' },
  chg_record_soon_b: { ar: 'بطاقة الأمر تعرض الملخص والكميات والأثر الزمني والمسار والمرفقات والسجل. اتخاذ القرار وتطبيق الأمر يأتيان مع محرّك المراحل.',
                       en: 'The record carries the summary, the quantities, the time impact, the path, the attachments and the log. Taking a decision and applying the order arrive with the stage machine.' },

  // ── SCR-W8 · بطاقة الأمر التغييري — ملحق الأشكال 30–34, `03 §9` ──────
  chg_back:        { ar: 'السجل',                           en: 'Register' },
  chg_picker:      { ar: 'منتقي الأمر',                      en: 'Order picker' },
  chg_print:       { ar: 'طباعة',                           en: 'Print' },
  chg_export:      { ar: 'تصدير',                           en: 'Export' },

  chg_tab_summary: { ar: 'الملخص',                          en: 'Summary' },
  chg_tab_cost:    { ar: 'الكميات والكلفة',                 en: 'Quantities & cost' },
  chg_tab_time:    { ar: 'الأثر الزمني',                    en: 'Time impact' },
  chg_tab_flow:    { ar: 'المسار',                          en: 'Path' },
  chg_tab_files:   { ar: 'المرفقات',                        en: 'Attachments' },
  chg_tab_log:     { ar: 'السجل',                           en: 'Log' },

  chg_sec_info:    { ar: 'معلومات الأمر',                   en: 'Order information' },
  chg_sec_preinputs: { ar: 'مدخلات سابقة لإدخال الأمر',      en: 'Inputs preceding entry' },
  chg_preinputs_note: { ar: 'تمّت قبل إدخال الأمر في النظام — ليست مراحل في المسار',
                        en: 'Completed before the order was entered — not stages in the path' },
  chg_preinputs_none_t: { ar: 'لم تُسجَّل مدخلات سابقة لهذا الأمر',   en: 'No preceding inputs recorded for this order' },
  chg_preinputs_none_b: { ar: 'يُسجَّل كتاب المقاول ورأي الاستشاري عند ورودهما؛ معالج الإنشاء يلتقط كتاب الأمر نفسه فقط.',
                          en: 'The contractor’s letter and the consultant’s opinion are recorded when they arrive; the creation wizard captures only the order’s own letter.' },
  chg_sec_impact:  { ar: 'ملخص الأثر',                      en: 'Impact summary' },
  chg_sec_contract: { ar: 'أثر الأمر على العقد',            en: 'Effect on the contract' },
  chg_sec_decision: { ar: 'ملخص القرار',                    en: 'Decision summary' },
  chg_sec_apply:   { ar: 'حالة تطبيق الأمر التغييري',       en: 'Application status' },
  chg_sec_lines:   { ar: 'بنود الكميات والكلفة',            en: 'Quantities & cost' },
  chg_sec_weights: { ar: 'أثر الأوزان',                     en: 'Weight impact' },
  chg_sec_redist:  { ar: 'إعادة توزيع الكميات',             en: 'Quantity redistribution' },
  chg_sec_time:    { ar: 'ملخص الأثر الزمني',               en: 'Time impact summary' },
  chg_sec_acts:    { ar: 'الأنشطة المتأثرة',                en: 'Affected activities' },
  chg_sec_path:    { ar: 'مسار الاعتماد',                   en: 'Approval path' },
  chg_sec_decision_panel: { ar: 'القرار',                   en: 'Decision' },
  chg_sec_transaction: { ar: 'حالة المعاملة',               en: 'Transaction state' },

  chg_f_type:      { ar: 'النوع',                           en: 'Type' },
  chg_f_justification: { ar: 'الأسباب الموجبة',             en: 'Justification' },
  chg_f_party:     { ar: 'الجهة المسؤولة',                  en: 'Responsible party' },
  chg_f_contract:  { ar: 'العقد',                           en: 'Contract' },
  chg_f_in_no:     { ar: 'رقم الوارد',                      en: 'Incoming no.' },
  chg_f_in_date:   { ar: 'تاريخ الوارد',                    en: 'Incoming date' },
  chg_f_approved_val: { ar: 'القيمة المعتمدة (لجنة التسعير)', en: 'Approved value (pricing cttee)' },
  chg_f_over_tier: { ar: 'بنود تجاوزت 20%',                 en: 'Lines beyond 20%' },
  chg_f_excess_rate: { ar: 'سعر الكمية الزائدة',            en: 'Excess-quantity rate' },
  chg_f_days_req:  { ar: 'الأيام المطلوبة',                 en: 'Days requested' },
  chg_f_days_analysis: { ar: 'الأيام الناتجة عن التحليل',   en: 'Days from the analysis' },
  chg_f_days_app:  { ar: 'الأيام المعتمدة',                 en: 'Days approved' },
  chg_f_lines:     { ar: 'البنود المتأثرة',                 en: 'Affected BOQ lines' },
  chg_f_activities: { ar: 'الأنشطة المتأثرة',               en: 'Affected activities' },
  chg_f_value_before: { ar: 'قيمة العقد قبل الأمر',         en: 'Contract value before' },
  chg_f_order_value: { ar: 'قيمة الأمر المعتمدة',           en: 'Approved order value' },
  chg_f_value_after: { ar: 'قيمة العقد بعد الأمر',          en: 'Contract value after' },
  chg_f_amendment: { ar: 'ملحق العقد',                      en: 'Contract amendment' },
  chg_f_finish_after: { ar: 'تاريخ الإنجاز التعاقدي بعد التمديد', en: 'Contractual finish after extension' },
  chg_f_penalty:   { ar: 'الغرامات التأخيرية',              en: 'Delay penalties' },
  chg_f_difference: { ar: 'الفرق عن مقترح دائرة المهندس المقيم', en: 'Difference vs the RE department' },
  chg_f_diff_reason: { ar: 'سبب الفرق',                     en: 'Reason for the difference' },
  chg_f_decision_date: { ar: 'تاريخ القرار',                en: 'Decision date' },
  chg_f_authority: { ar: 'الجهة المعتمدة',                  en: 'Approving authority' },
  chg_f_rate_authority: { ar: 'تثبيت سعر الزائد',           en: 'Excess rate fixed by' },
  chg_f_finish_before: { ar: 'نهاية المشروع قبل الأمر',     en: 'Project finish before' },
  chg_f_finish_forecast: { ar: 'النهاية المتوقعة',          en: 'Forecast finish' },
  chg_f_finish_approved: { ar: 'النهاية المعتمدة',          en: 'Approved finish' },
  chg_f_critical:  { ar: 'أثر على المسار الحرج',            en: 'Affects the critical path' },
  chg_f_affects_finish: { ar: 'أثر على تاريخ الإنجاز',      en: 'Affects the completion date' },
  chg_f_sent:      { ar: 'تاريخ الإرسال',                   en: 'Sent on' },
  chg_f_actioned:  { ar: 'تاريخ الإجراء',                   en: 'Actioned on' },
  chg_f_elapsed:   { ar: 'المدة المستغرقة',                 en: 'Duration' },
  chg_f_ceiling:   { ar: 'السقف الزمني',                    en: 'SLA' },
  chg_f_decision:  { ar: 'القرار',                          en: 'Decision' },
  chg_f_referred:  { ar: 'تاريخ الإحالة',                   en: 'Referred on' },
  chg_f_age:       { ar: 'عدد الأيام',                      en: 'Days elapsed' },
  chg_f_breached:  { ar: 'تجاوزت السقف؟',                   en: 'SLA breached?' },
  chg_f_leadtime:  { ar: 'معدل دوران المعاملة',             en: 'Transaction lead time' },

  chg_party_contractor: { ar: 'مقترح المقاول',              en: 'Contractor proposal' },
  chg_party_redept: { ar: 'مقترح دائرة المهندس المقيم',     en: 'RE department proposal' },
  chg_party_approved: { ar: 'المعتمد',                      en: 'Approved' },
  chg_applied:     { ar: 'المطبق',                          en: 'Applied' },
  chg_proposed:    { ar: 'المقترح',                         en: 'Proposed' },
  chg_before:      { ar: 'قبل',                             en: 'Before' },
  chg_original:    { ar: 'الأصلية',                         en: 'original' },
  chg_original_rate: { ar: 'السعر الأصلي',                  en: 'original rate' },
  chg_before_change: { ar: 'قبل التغيير',                   en: 'before' },
  chg_unit:        { ar: 'الوحدة',                          en: 'unit' },
  chg_tier_limit:  { ar: 'حد 20% =',                        en: '20% limit =' },
  chg_within_tier: { ar: 'ضمن حد 20%',                      en: 'Within the 20% limit' },
  chg_within_20:   { ar: 'ضمن 20%:',                        en: 'Within 20%:' },
  chg_beyond_20:   { ar: 'أكثر من 20%:',                    en: 'beyond 20%:' },
  chg_rate_change_note: { ar: 'تعديل سعر — لا ينطبق حد 20%', en: 'Rate change — no 20% tier applies' },
  chg_redist_note: { ar: 'إعادة توزيع كمية — لا أثر على القيمة',
                     en: 'Quantity redistribution — no effect on the value' },
  chg_awaiting_decision: { ar: 'بانتظار القرار',            en: 'Awaiting the decision' },
  chg_awaiting_pricing: { ar: 'يُحدَّد في التدقيق المالي',  en: 'Set at the financial review' },
  chg_rate_committee: { ar: 'لجنة تثبيت الأسعار',           en: 'Rate-fixing committee' },
  chg_excess_fixed: { ar: 'مثبَّت',                         en: 'Fixed' },
  chg_excess_awaiting: { ar: 'بانتظار لجنة تثبيت الأسعار',  en: 'Awaiting the rate-fixing committee' },
  chg_excess_na:   { ar: 'لا ينطبق',                        en: 'Not applicable' },

  chg_col_item_party: { ar: 'البند / الجهة',                en: 'Item / party' },
  chg_col_desc_detail: { ar: 'الوصف / التفصيل',             en: 'Description / detail' },
  chg_col_qty:     { ar: 'الكمية',                          en: 'Quantity' },
  chg_col_excess_rate: { ar: 'سعر الزائد',                  en: 'Excess rate' },
  chg_col_excess_rate_t: { ar: 'سعر الوحدة للكمية الزائدة عن 20% فقط',
                           en: 'Unit rate for the quantity beyond 20% only' },
  chg_col_impact:  { ar: 'الأثر',                           en: 'Impact' },
  chg_col_weight:  { ar: 'الوزن',                           en: 'Weight' },
  chg_col_applied: { ar: 'حالة التطبيق',                    en: 'Applied' },
  chg_col_code:    { ar: 'الكود',                           en: 'Code' },
  chg_col_desc:    { ar: 'الوصف',                           en: 'Description' },
  chg_col_delta:   { ar: 'الفرق',                           en: 'Delta' },
  chg_col_source:  { ar: 'البند المصدر',                    en: 'Source item' },
  chg_col_target:  { ar: 'البند الهدف',                     en: 'Target item' },
  chg_col_drawn:   { ar: 'المسحوبة',                        en: 'Drawn' },
  chg_col_added:   { ar: 'المضافة',                         en: 'Added' },
  chg_col_actid:   { ar: 'معرّف النشاط',                    en: 'Activity ID' },
  chg_col_actname: { ar: 'اسم النشاط',                      en: 'Activity name' },
  chg_col_change:  { ar: 'نوع التغيير',                     en: 'Change type' },
  chg_col_progress: { ar: 'الإنجاز',                        en: 'Progress' },
  chg_col_requested: { ar: 'المطلوب',                       en: 'Requested' },
  chg_col_file:    { ar: 'اسم الملف',                       en: 'File name' },
  chg_col_category: { ar: 'التصنيف',                        en: 'Category' },
  chg_col_version: { ar: 'الإصدار',                         en: 'Version' },
  chg_col_uploaded: { ar: 'تاريخ الرفع',                    en: 'Uploaded' },
  chg_col_user:    { ar: 'المستخدم',                        en: 'User' },
  chg_col_stage:   { ar: 'المرحلة',                         en: 'Stage' },
  chg_col_at:      { ar: 'التاريخ والوقت',                  en: 'Date & time' },
  chg_col_action:  { ar: 'الإجراء',                         en: 'Action' },
  chg_col_prev:    { ar: 'القيمة السابقة',                  en: 'Previous value' },
  chg_col_new:     { ar: 'القيمة الجديدة',                  en: 'New value' },
  chg_col_note:    { ar: 'الملاحظة',                        en: 'Note' },

  chg_grp_remaining: { ar: 'المدة المتبقية',                en: 'Remaining duration' },
  chg_grp_finish:  { ar: 'تاريخ الإنجاز',                   en: 'Finish' },

  chg_net_contractor: { ar: 'صافي أثر مقترح المقاول',       en: 'Net — contractor proposal' },
  chg_net_redept:  { ar: 'صافي أثر مقترح دائرة المهندس المقيم', en: 'Net — RE department proposal' },
  chg_net_approved: { ar: 'الصافي المعتمد',                 en: 'Net — approved' },

  chg_w_before:    { ar: 'مجموع الأوزان قبل',               en: 'Sum before' },
  chg_w_after:     { ar: 'مجموع الأوزان بعد',               en: 'Sum after' },
  chg_w_check:     { ar: 'التحقق من 100%',                  en: '100% validation' },
  chg_w_valid:     { ar: 'مطابق',                           en: 'Valid' },
  chg_w_invalid:   { ar: 'غير مطابق',                       en: 'Invalid' },
  chg_w_last:      { ar: 'آخر إعادة احتساب',                en: 'Last recalculation' },
  chg_w_state:     { ar: 'الحالة',                          en: 'State' },

  chg_stages:      { ar: 'مرحلة',                           en: 'stages' },
  chg_stage_complete: { ar: 'مكتملة',                       en: 'Complete' },
  chg_stage_skipped: { ar: 'غير مطلوبة',                    en: 'Not required' },
  chg_st_done:     { ar: 'مكتملة',                          en: 'Complete' },
  chg_st_active:   { ar: 'قيد الإجراء',                     en: 'In progress' },
  chg_st_pending:  { ar: 'لم تبدأ',                         en: 'Not started' },
  chg_st_returned: { ar: 'أُعيدت',                          en: 'Returned' },
  chg_external:    { ar: 'أطراف خارجية',                    en: 'External parties' },
  chg_ext_note:    { ar: 'أطراف خارجية — تُسجَّل قراراتها بموجب كتاب رسمي',
                     en: 'External parties — their decisions recorded against an official letter' },
  chg_recorded_by: { ar: 'يُسجِّل نيابةً:',                 en: 'Recorded by:' },
  chg_no_letter:   { ar: 'لا كتاب بعد',                     en: 'no letter yet' },
  chg_stalled_at:  { ar: 'متوقفة عند',                      en: 'stalled at' },
  chg_complete:    { ar: 'مكتملة',                          en: 'complete' },
  chg_yours:       { ar: 'بعهدتك',                          en: 'yours to take' },
  chg_view_only:   { ar: 'للاطلاع',                         en: 'view only' },
  chg_affected:    { ar: 'متأثر',                           en: 'Affected' },
  chg_unaffected:  { ar: 'غير متأثر',                       en: 'Unaffected' },
  chg_unchanged:   { ar: 'دون تغيير',                       en: 'Unchanged' },

  chg_amend_issued: { ar: 'صدر وأصبح نافذاً',               en: 'Issued and effective' },
  chg_amend_pending: { ar: 'لم يصدر — الأمر لم يُطبَّق بعد', en: 'Not issued — the order is not applied yet' },
  chg_amend_none:  { ar: 'لا ملحق',                         en: 'No amendment' },
  chg_penalty_recalculated: { ar: 'تُعاد احتسابها على التاريخ الجديد',
                              en: 'Recalculated against the new date' },
  chg_penalty_unchanged: { ar: 'دون تغيير',                 en: 'Unchanged' },

  chg_approval_note_t: { ar: 'الاعتماد وحده لا يغيّر العقد', en: 'Approval alone does not change the contract' },
  chg_approval_note_b: { ar: 'قيمة العقد ومدته تبقيان على حالهما حتى يُطبَّق الأمر ويصدر ملحق العقد. حتى ذلك الحين لا يُرحَّل أي مبلغ إلى الموقف المالي.',
                         en: 'The contract value and duration stay as they are until the order is applied and the addendum is issued. Until then nothing posts to the financial position.' },
  chg_actdur_t:    { ar: 'مدة النشاط ليست مدة المشروع',     en: 'An activity’s duration is not the project’s' },
  chg_actdur_b:    { ar: 'تمديد نشاط لا يمدّد المشروع بالضرورة — الأثر النهائي على تاريخ الإنجاز يُحدَّد في مرحلة تحليل الجدول بحسب العوم المتاح والمسار الحرج.',
                     en: 'Extending an activity does not necessarily extend the project — the final effect on the completion date is settled during schedule analysis, against the available float and the critical path.' },
  chg_redist_zero: { ar: 'الأثر المالي صفر لأن الكمية تنتقل بالسعر نفسه — إعادة توزيع تغيّر القيمة ليست إعادة توزيع.',
                     en: 'The cost impact is zero because the quantity moves at the same rate — a redistribution that changed the value would not be one.' },
  chg_versions_note: { ar: 'الإصدارات تتراكم ولا يُستبدل أي ملف — ظهور المستند نفسه بإصدارين هو السجل، لا تكرار.',
                       en: 'Versions accumulate and no file is replaced — the same document at two versions is the record, not a duplicate.' },

  chg_decide_soon_t: { ar: 'القرار بعهدتك',                 en: 'The decision is yours' },
  chg_decide_soon_b: { ar: 'الموافقة والرفض والإعادة للتعديل وتسجيل قرار جهة خارجية تُفعَّل مع محرّك المراحل.',
                       en: 'Approve, reject, return for revision and recording an external party’s decision arrive with the stage machine.' },
  chg_locked_t:    { ar: 'لا إجراءات متاحة لهذه الصفة',     en: 'No actions for this capacity' },
  chg_locked_b:    { ar: 'البتّ في هذه المرحلة من صلاحية الجهة المالكة لها:',
                     en: 'This stage is decided by the party that owns it:' },
  chg_locked_done: { ar: 'اكتمل المسار — لا قرار مفتوح على هذا الأمر.',
                     en: 'The path is complete — no decision is open on this order.' },

  chg_timeonly_t:  { ar: 'أمر تغييري زمني فقط',             en: 'Time-only change order' },
  chg_timeonly_b:  { ar: 'لا يشمل هذا الأمر أي بند من جدول الكميات — الأثر زمني فقط، ولا أثر على قيمة العقد.',
                     en: 'This order touches no BOQ line — the impact is on time only, with no effect on the contract value.' },
  chg_noacts_t:    { ar: 'لا أنشطة متأثرة',                 en: 'No affected activities' },
  chg_noacts_b:    { ar: 'لا يمسّ هذا الأمر أي نشاط في الجدول الزمني — الأثر على الكميات والكلفة وحدها.',
                     en: 'This order touches no schedule activity — the impact is on quantities and cost alone.' },
  chg_no_analysis: { ar: 'لم يُجرَ التحليل الزمني بعد',      en: 'The schedule analysis has not run yet' },
  chg_nofiles_t:   { ar: 'لا مرفقات على هذا الأمر',         en: 'No attachments on this order' },
  chg_nofiles_b:   { ar: 'تُرفع الوثائق المؤيدة داخل المرحلة التي تطلبها، ويُسجَّل لكل ملف إصداره ومرحلته.',
                     en: 'Supporting documents are uploaded inside the stage that asks for them, each recording its version and stage.' },
  chg_nolog_t:     { ar: 'لا حركة مسجّلة على هذا الأمر',    en: 'No recorded activity on this order' },
  chg_nolog_b:     { ar: 'يُكتب سجل التدقيق مع كل إنشاء وتعديل وقرار — ولم يحدث أي منها بعد.',
                     en: 'The audit trail is written on every creation, edit and decision — none has happened yet.' },

  chg_act_create:  { ar: 'إنشاء الأمر',                     en: 'Order created' },
  chg_act_edit:    { ar: 'تعديل',                           en: 'Edited' },
  chg_act_submit:  { ar: 'الإرسال للمراجعة',                en: 'Submitted for review' },
  chg_act_approve: { ar: 'موافقة',                          en: 'Approved' },
  chg_act_return:  { ar: 'إعادة للتعديل',                   en: 'Returned for revision' },
  chg_act_reject:  { ar: 'رفض',                             en: 'Rejected' },
  chg_act_cancel:  { ar: 'إلغاء الموضوع',                   en: 'Cancelled' },
  chg_act_apply:   { ar: 'تطبيق الأمر',                     en: 'Order applied' },
  chg_act_close:   { ar: 'إغلاق الأمر',                     en: 'Order closed' },
  'chg_act_apply-failed': { ar: 'فشل التطبيق',              en: 'Apply failed' },
  'chg_act_record-external': { ar: 'تسجيل قرار جهة خارجية', en: 'External decision recorded' },

  chg_col_unit_rate: { ar: 'سعر الوحدة',                    en: 'Unit rate' },
  chg_col_unit:    { ar: 'الوحدة',                          en: 'Unit' },
  chg_line_hint:   { ar: 'اضغط أي بند لعرض تفاصيله الكاملة.', en: 'Select a line to see its full detail.' },
  chg_line_open:   { ar: 'عرض تفاصيل البند',                en: 'Open the line detail' },
  chg_line_basis:  { ar: 'أساس الاحتساب',                   en: 'Basis of the calculation' },
  chg_line_contracted: { ar: 'الكمية التعاقدية الأصلية',     en: 'Original contracted quantity' },
  chg_line_before: { ar: 'الكمية قبل الأمر',                en: 'Quantity before the order' },
  chg_tier_threshold: { ar: 'حد 20% من الكمية الأصلية',      en: '20% of the original quantity' },
  chg_line_proposals: { ar: 'المقترحات والمعتمد',            en: 'Proposals and the approved figure' },
  chg_line_at_rate: { ar: 'ضمن 20%',                        en: 'Within 20%' },
  chg_line_excess: { ar: 'أكثر من 20%',                     en: 'Beyond 20%' },
  chg_tier_t:      { ar: 'الكمية الزائدة عن 20% وحدها هي ما يُعاد تسعيره',
                     en: 'Only the quantity beyond 20% may be re-priced' },
  chg_tier_b:      { ar: 'ما دون الحد يُحتسب بالسعر الأصلي مهما بلغت الزيادة، والسعر المُلزم للزائد تثبّته لجنة تثبيت الأسعار — لا المقاول ولا دائرة المهندس المقيم.',
                     en: 'Everything up to the limit is valued at the original rate however large the change, and the binding rate for the excess is fixed by the rate-fixing committee — not by the contractor and not by the RE department.' },
  // ── المسار 9 · معالج إنشاء أمر تغييري — ملحق الأشكال 37–42, `03 §8` ──
  chg_w_title:     { ar: 'إنشاء أمر تغييري',                en: 'Create a change order' },
  chg_w_step1:     { ar: 'النوع والكتاب الرسمي',            en: 'Type & official letter' },
  chg_w_step2:     { ar: 'البنود والأنشطة المتأثرة',        en: 'Affected items & activities' },
  chg_w_step3:     { ar: 'ملخص الأثر',                      en: 'Impact summary' },
  chg_w_step4:     { ar: 'المرفقات',                        en: 'Attachments' },
  chg_w_step5:     { ar: 'المراجعة والإرسال',               en: 'Review & submit' },

  chg_w_contract:  { ar: 'العقد المرتبط',                   en: 'Linked contract' },
  chg_w_no_contract: { ar: '— لم يُحدَّد —',                 en: '— not selected —' },
  chg_w_readonly:  { ar: 'للقراءة فقط',                     en: 'Read-only' },
  chg_w_sec_contract: { ar: 'العقد',                        en: 'Contract' },
  chg_w_pick_contract: { ar: 'اختر العقد',                  en: 'Select the contract' },
  chg_w_pick_contract_ph: { ar: '— اختر عقداً —',           en: '— select a contract —' },
  chg_w_current_value: { ar: 'قيمة العقد الحالية',          en: 'Current contract value' },
  chg_w_contract_finish: { ar: 'الإنجاز التعاقدي',          en: 'Contractual finish' },
  chg_w_scope_t:   { ar: 'العقد يحدّد كل ما يليه',          en: 'The contract scopes everything after it' },
  chg_w_scope_b:   { ar: 'تُعرض بنود الكميات والأنشطة التابعة لهذا العقد وحده، ولا يجوز أن يشمل الأمر عقدين. تغيير العقد يمسح ما اخترته.',
                     en: 'Only this contract’s BOQ lines and activities are offered, and one order may never span two contracts. Changing the contract clears the selection.' },
  chg_w_sec_type:  { ar: 'نوع الأمر التغييري',              en: 'Change-order type' },
  chg_w_type_eng:  { ar: 'هندسي — كلفة / مدة',              en: 'Engineering — cost / time' },
  chg_w_type_sup:  { ar: 'تجهيز / إعادة توزيع كميات',       en: 'Supply / quantity redistribution' },
  chg_w_just_ph:   { ar: 'اكتب الأسباب الموجبة للأمر التغييري',
                     en: 'State the justification for this change order' },
  chg_w_sec_letter: { ar: 'الكتاب الرسمي',                  en: 'Official letter' },
  chg_w_letter_note: { ar: 'تاريخ الوارد هو نقطة بدء العدّ القانوني — تُقاس منه مهل المراحل والتأخر (BR-12).',
                       en: 'The incoming date starts the legal clock — every stage SLA and overdue figure is measured from it (BR-12).' },

  chg_w_pick_first_t: { ar: 'اختر العقد أولاً',             en: 'Select the contract first' },
  chg_w_pick_first_b: { ar: 'تُستنتج البنود والأنشطة من العقد المحدد.',
                        en: 'The items and activities are derived from the selected contract.' },
  chg_w_tier_t:    { ar: 'قاعدة 20%',                       en: 'The 20% rule' },
  chg_w_tier_b:    { ar: 'تغيير الكمية زيادةً أو نقصاناً حتى 20% من الكمية الأصلية يُحتسب بسعر الوحدة الأصلي. الكمية الزائدة عن ذلك تُسعَّر بسعر جديد يقترحه المقاول ودائرة المهندس المقيم، ويُثبَّت السعر النهائي بقرار لجنة تثبيت الأسعار.',
                     en: 'A quantity increase or decrease up to 20% of the original quantity is valued at the original unit rate. Anything beyond that is priced at a new rate proposed by the contractor and the RE department, and fixed by the rate-fixing committee.' },
  chg_w_tier_supply: { ar: 'أسعار الفقرات التجهيزية مثبَّتة بالعقد وخطاب الاعتماد، فلا تنطبق قاعدة الـ20% ولا لجنة تثبيت الأسعار.',
                       en: 'Supply-item prices are fixed by the contract and the letter of credit, so neither the 20% rule nor the rate-fixing committee applies.' },
  chg_w_tab_boq:   { ar: 'بنود جدول الكميات',               en: 'BOQ items' },
  chg_w_tab_act:   { ar: 'الأنشطة',                         en: 'Activities' },
  chg_w_pick_lines: { ar: 'اختيار بنود',                    en: 'Select items' },
  chg_w_pick_acts: { ar: 'اختيار أنشطة',                    en: 'Select activities' },
  chg_w_nolines_t: { ar: 'لا بنود مختارة',                  en: 'No items selected' },
  chg_w_nolines_b: { ar: 'اختر بنداً أو أكثر من بنود هذا العقد — لكل بند نوع تغييره ومقترحاه.',
                     en: 'Pick one or more of this contract’s lines — each carries its own change type and two proposals.' },
  chg_w_noacts_t:  { ar: 'لا أنشطة مختارة',                 en: 'No activities selected' },
  chg_w_noacts_b:  { ar: 'يُضاف النشاط حين يكون للأمر أثر زمني؛ الأثر النهائي يُحدَّد في تحليل الجدول.',
                     en: 'Add an activity when the order has a time impact; the final effect is settled during schedule analysis.' },
  chg_w_noacts_review: { ar: 'لا أنشطة متأثرة',             en: 'No affected activities' },
  chg_w_current:   { ar: 'الحالي',                          en: 'Current' },
  chg_w_not_entered: { ar: 'لم يُدخل',                      en: 'Not entered' },
  chg_w_over_tier: { ar: 'يتجاوز 20%',                      en: 'Beyond 20%' },
  chg_w_edit_line: { ar: 'تحرير البند',                     en: 'Edit the line' },
  chg_w_drop_line: { ar: 'حذف البند من الأمر',              en: 'Remove the line' },
  chg_w_drop_act:  { ar: 'حذف النشاط من الأمر',             en: 'Remove the activity' },
  chg_w_drop_file: { ar: 'حذف المرفق',                      en: 'Remove the attachment' },
  chg_w_of:        { ar: 'من',                              en: 'of' },
  chg_w_delta:     { ar: 'مقدار التغيير',                   en: 'Change amount' },
  chg_w_new_rate:  { ar: 'السعر الجديد',                    en: 'New rate' },
  chg_w_new_rate_q: { ar: '× سعر جديد؟',                    en: '× new rate?' },
  chg_w_excess_rate: { ar: 'سعر الكمية الزائدة عن 20%',     en: 'Rate for the quantity beyond 20%' },
  chg_w_carried:   { ar: 'المعتمد للمضي',                   en: 'Carried forward' },
  chg_w_revised_qty: { ar: 'الكمية المعدلة',                en: 'Revised quantity' },
  chg_w_revised_value: { ar: 'القيمة المعدلة',              en: 'Revised value' },
  chg_w_impact:    { ar: 'الأثر المالي',                    en: 'Impact' },
  chg_w_net:       { ar: 'صافي الأثر على قيمة العقد',       en: 'Net impact on the contract value' },
  chg_w_gate_b:    { ar: 'لا يمكن إرسال الأمر قبل معالجة هذه المخالفة (02 §7).',
                     en: 'The order cannot be submitted until this is resolved (02 §7).' },

  chg_w_sel_lines: { ar: 'البنود المختارة',                 en: 'Selected items' },
  chg_w_sel_acts:  { ar: 'الأنشطة المختارة',                en: 'Selected activities' },
  chg_w_rate_by:   { ar: 'يُثبَّت بلجنة تثبيت الأسعار',      en: 'Fixed by the rate-fixing committee' },
  chg_w_revised_contract: { ar: 'قيمة العقد المعدلة',       en: 'Revised contract value' },
  chg_w_indicative: { ar: 'تقديرية — تُحسم في التدقيق المالي',
                      en: 'indicative — settled at the financial review' },
  chg_w_weight_note: { ar: 'أثر أوزان البنود: تغيّر تراكمي',  en: 'BOQ weight impact: cumulative change of' },
  chg_w_weight_on: { ar: 'على',                             en: 'across' },
  chg_w_weight_tail: { ar: 'بنداً — تُعاد الأوزان وتُعتمد بعد الاعتماد النهائي، لا قبله.',
                       en: 'line(s) — weights are recalculated and approved AFTER the final approval, not before it.' },
  chg_w_changes:   { ar: 'ملخص التغييرات',                  en: 'Summary of changes' },
  chg_w_element:   { ar: 'العنصر',                          en: 'Element' },
  chg_w_element_kind: { ar: 'نوع العنصر',                   en: 'Element type' },
  chg_w_kind_boq:  { ar: 'بند كميات',                       en: 'BOQ line' },
  chg_w_kind_act:  { ar: 'نشاط جدول',                       en: 'Schedule activity' },
  chg_w_from:      { ar: 'القيمة الحالية',                  en: 'Current' },
  chg_w_to:        { ar: 'القيمة المقترحة',                 en: 'Proposed' },

  chg_w_upload:    { ar: 'أرفق المستندات الداعمة',          en: 'Attach the supporting documents' },
  chg_w_upload_note: { ar: 'يمكن رفع أكثر من ملف — يُسجَّل الاسم والتصنيف والحجم، ولا تُحفَظ محتويات الملف في هذا النموذج.',
                       en: 'More than one file may be added — the name, category and size are recorded; the file’s contents are not stored in this prototype.' },
  chg_w_nofiles_t: { ar: 'لا مرفقات بعد',                   en: 'No attachments yet' },
  chg_w_nofiles_b: { ar: 'الكتاب الرسمي وكشف الكميات المسعّر هما ما يُعاد الأمر لنقصه غالباً.',
                     en: 'The official letter and the priced quantity schedule are what an order is most often returned for.' },
  chg_w_size:      { ar: 'الحجم',                           en: 'Size' },

  chg_w_sec_review: { ar: 'معلومات الأمر التغييري',         en: 'Change-order information' },
  chg_w_expected_path: { ar: 'مسار الاعتماد المتوقع',       en: 'Expected approval path' },
  chg_w_blocked_t: { ar: 'لا يمكن إرسال الأمر',             en: 'The order cannot be submitted' },
  chg_w_cannot_submit: { ar: 'توجد مخالفات تمنع الإرسال',   en: 'Blocking issues remain' },
  chg_w_save_draft: { ar: 'حفظ كمسودة',                     en: 'Save as a draft' },
  chg_w_submit:    { ar: 'إرسال للمراجعة',                  en: 'Submit for review' },

  chg_w_search:    { ar: 'بحث بالكود أو الوصف',             en: 'Search by code or description' },
  chg_w_add:       { ar: 'إضافة',                           en: 'Add' },
  chg_w_pool_empty: { ar: 'لا عناصر متاحة للإضافة',         en: 'Nothing left to add' },
  chg_w_done_picking: { ar: 'تم',                           en: 'Done' },
  chg_w_new:       { ar: 'أمر تغييري جديد',                 en: 'New change order' },

  // ── `03 §5` — القرار, and `03 §4` — تسجيل قرار جهة خارجية ────────────
  chg_d_action:    { ar: 'الإجراء',                         en: 'Action' },
  chg_d_pick:      { ar: '— اختر الإجراء —',                en: '— pick an action —' },
  chg_d_comment:   { ar: 'التعليق',                         en: 'Comment' },
  chg_d_note_ph:   { ar: 'اختياري',                         en: 'Optional' },
  chg_d_note_req_ph: { ar: 'اذكر ما ينقص أو سبب الرفض — يُسجَّل في سجل التدقيق',
                       en: 'State what is missing or why — it is written to the audit trail' },
  chg_d_note_err:  { ar: 'التعليق إلزامي عند الإعادة أو الرفض أو الإلغاء.',
                     en: 'A comment is required to return, reject or cancel.' },
  chg_d_next_t:    { ar: 'ماذا سيحدث بعد ذلك',              en: 'What happens next' },
  chg_d_next_b:    { ar: 'اختر إجراءً لعرض أثره قبل تنفيذه.',
                     en: 'Pick an action to see its consequence before it fires.' },
  chg_d_reset:     { ar: 'تفريغ',                           en: 'Reset' },
  chg_d_submit:    { ar: 'تنفيذ القرار',                    en: 'Submit the decision' },
  chg_d_resubmit:  { ar: 'إعادة الإرسال بعد التعديل',       en: 'Resubmit after revision' },
  chg_d_apply:     { ar: 'تطبيق الأمر وإصدار الملحق',       en: 'Apply the order and issue the addendum' },

  chg_c_forward:   { ar: 'تُحال إلى «{s}» — {o}.',           en: 'Forwarded to “{s}” — {o}.' },
  chg_c_complete:  { ar: 'يكتمل المسار ويصبح الأمر معتمداً — ولا يتغيّر العقد بعد.',
                     en: 'The path completes and the order becomes approved — the contract does not change yet.' },
  chg_c_sla_reset: { ar: 'تُقفل هذه المرحلة ويبدأ سقف المرحلة التالية من تاريخ اليوم.',
                     en: 'This stage closes and the next stage’s ceiling starts from today.' },
  chg_c_nothing_posts: { ar: 'لا يُرحَّل أي مبلغ إلى العقد قبل تطبيق الأمر وإصدار الملحق.',
                         en: 'Nothing posts to the contract until the order is applied and the addendum issued.' },
  chg_c_return_1:  { ar: 'يعود الأمر إلى مرحلة دراسة الطلب لاستكمال النواقص، ويبقى قرار الإعادة على المرحلة التي أصدرته.',
                     en: 'The order goes back to the request-study stage; the return itself stays on the stage that issued it.' },
  chg_c_note_kept: { ar: 'يُسجَّل التعليق في سجل التدقيق ولا يمكن حذفه.',
                     en: 'The comment is written to the audit trail and cannot be removed.' },
  chg_c_reject_1:  { ar: 'يُغلق الأمر نهائياً ولا يصل إلى العقد.',
                     en: 'The order closes permanently and never reaches the contract.' },
  chg_c_cancel_1:  { ar: 'يُلغى الموضوع بناءً على قرار الجهة الخارجية، ويبقى السجل كاملاً للاطلاع.',
                     en: 'The order is cancelled on an external party’s decision; the record stays readable in full.' },
  chg_c_resubmit_1: { ar: 'يعود الأمر إلى بداية المسار لدى دائرة المهندس المقيم.',
                      en: 'The order re-enters the path at the RE department.' },
  chg_c_apply_1:   { ar: 'يصدر ملحق العقد وتتغيّر قيمة العقد النافذة ومدته.',
                     en: 'The contract addendum is issued and the effective value and duration change.' },
  chg_c_apply_2:   { ar: 'تنتقل الكميات المعتمدة إلى بنود جدول الكميات، وتُسعَّر الكمية الزائدة عن 20% بشريحة مستقلة.',
                     en: 'The approved quantities move onto the BOQ lines, and the portion beyond 20% becomes a band of its own.' },
  chg_c_apply_3:   { ar: 'يُعاد احتساب الأوزان ويُتحقَّق من بلوغها 100% — وإن فشل التحقق لا يتغيّر العقد إطلاقاً.',
                     en: 'Weights are recalculated and checked against 100% — if that check fails, nothing about the contract changes.' },

  chg_d_record:    { ar: 'تسجيل',                           en: 'Record' },
  chg_d_record_t:  { ar: 'تسجيل قرار جهة خارجية',           en: 'Record an external party’s decision' },
  chg_d_record_save: { ar: 'تسجيل القرار',                  en: 'Record the decision' },
  chg_d_attribution_t: { ar: 'القرار للجهة، والتسجيل باسمك',  en: 'The decision is the party’s; you are the recorder' },
  chg_d_attribution_b: { ar: 'يُنسب القرار إلى',             en: 'Attributed to' },
  chg_d_outcome:   { ar: 'ما ورد من الجهة',                 en: 'The party’s outcome' },
  chg_d_cancels:   { ar: 'هذه الجهة تملك إلغاء الموضوع — تسجيل «أُعيد» يُنهي الأمر.',
                     en: 'This party may cancel the order — recording «returned» ends it.' },
  chg_d_letter_no: { ar: 'رقم الكتاب الرسمي',               en: 'Official letter no.' },
  chg_d_letter_date: { ar: 'تاريخ الكتاب',                  en: 'Letter date' },
  chg_d_letter_err: { ar: 'رقم الكتاب الرسمي وتاريخه إلزاميان لتسجيل قرار جهة خارجية.',
                      en: 'The official letter number and date are required to record an external party’s decision.' },

  chg_card:        { ar: 'بطاقة الأمر',                     en: 'Order facts' },
  chg_card_value:  { ar: 'القيمة',                          en: 'Value' },
  chg_card_requested: { ar: 'المطلوبة',                     en: 'Requested' },
  chg_card_approved: { ar: 'المعتمدة',                      en: 'Approved' },
  chg_card_contract_after: { ar: 'قيمة العقد بعد',          en: 'Contract after' },
  chg_card_time:   { ar: 'المدة',                           en: 'Time' },
  chg_card_finish: { ar: 'الإنجاز التعاقدي',                en: 'Contractual finish' },
  chg_card_linked: { ar: 'السجلات المرتبطة',                en: 'Linked records' },
  chg_card_parties: { ar: 'الجهات',                         en: 'Parties' },
  chg_card_owner:  { ar: 'المسؤول الحالي',                  en: 'Current owner' },

  chg_view_file:   { ar: 'عرض الملف',                       en: 'View file' },
  chg_download_file: { ar: 'تنزيل الملف',                   en: 'Download file' },

  yes:             { ar: 'نعم',                             en: 'Yes' },
  no:              { ar: 'لا',                              en: 'No' },

  // ── SCR-W9 · سجل المخاطر — ملحق الشكل 43 ─────────────────────────────
  rsk_rule:        { ar: 'الخطورة = الاحتمالية × التأثير',   en: 'Severity = probability × impact' },
  rsk_all:         { ar: 'الكل',                            en: 'All' },
  rsk_register:    { ar: 'سجل المخاطر',                     en: 'Risk register' },
  rsk_of:          { ar: 'من',                              en: 'of' },
  rsk_search:      { ar: 'بحث بالرقم أو الوصف أو الجهة…',    en: 'Search by number, description or party…' },
  rsk_col_code:    { ar: 'الرقم',                           en: 'No.' },
  rsk_col_desc:    { ar: 'الوصف',                           en: 'Description' },
  rsk_col_type:    { ar: 'النوع',                           en: 'Type' },
  rsk_col_prob:    { ar: 'الاحتمالية',                      en: 'Probability' },
  rsk_col_impact:  { ar: 'التأثير',                         en: 'Impact' },
  rsk_col_severity: { ar: 'الخطورة',                        en: 'Severity' },
  rsk_col_owner:   { ar: 'الجهة المسؤولة',                  en: 'Responsible party' },
  rsk_col_indicator: { ar: 'المؤشر',                        en: 'Indicator' },
  rsk_high_n:      { ar: 'عالية',                           en: 'high' },
  rsk_medium_n:    { ar: 'متوسطة',                          en: 'medium' },
  rsk_empty_t:     { ar: 'لا مخاطر مسجّلة على هذا المشروع',  en: 'No risks recorded on this project' },
  rsk_empty_b:     { ar: 'يُسجَّل الخطر بجهته المسؤولة ومؤشره، فتُقاس خطورته بدل تقديرها.',
                     en: 'A risk is recorded with its responsible party and its index, so its severity is measured rather than estimated.' },
  rsk_nomatch_t:   { ar: 'لا مخاطر مطابقة للفلاتر',         en: 'No risks match the filters' },
  rsk_nomatch_b:   { ar: 'جرّب درجة خطورة أخرى أو امسح البحث.',
                     en: 'Try another severity band or clear the search.' },
  rsk_readonly_t:  { ar: 'السجل للعرض في هذه المرحلة',      en: 'The register is read-only for now' },
  rsk_readonly_b:  { ar: 'تسجيل خطر جديد وتحديث المعالجة ليسا ضمن ما يرسمه الشكل 43، ولا يكتب أي مسار في هذا السجل بعد.',
                     en: 'Raising a risk and updating its mitigation are not on الشكل 43, and no flow writes to this register yet.' },

  // ── SCR-W11 · محاضر الاجتماعات وسجل الإجراءات — ملحق الشكل 45 ────────
  mtg_tab_minutes: { ar: 'محاضر الاجتماعات',                en: 'Meeting minutes' },
  mtg_tab_actions: { ar: 'سجل الإجراءات',                   en: 'Actions register' },
  mtg_minutes_sub: { ar: 'المحاضر والقرارات',               en: 'Minutes and decisions' },
  mtg_new:         { ar: 'محضر اجتماع جديد',                en: 'New meeting minute' },
  mtg_file_kind:   { ar: 'محضر اجتماع',                     en: 'Meeting minute' },
  mtg_open:        { ar: 'فتح',                             en: 'Open' },
  mtg_col_code:    { ar: 'الرقم',                           en: 'No.' },
  mtg_col_action:  { ar: 'الإجراء',                         en: 'Action' },
  mtg_col_owner:   { ar: 'المسؤول',                         en: 'Owner' },
  mtg_col_due:     { ar: 'الاستحقاق',                       en: 'Due' },
  mtg_col_priority: { ar: 'الأولوية',                       en: 'Priority' },
  mtg_overdue:     { ar: 'متأخر',                           en: 'Overdue' },
  mtg_overdue_note: { ar: 'إجراءات مؤشَّرة متأخرة في السجل — الحالة هنا يحدّدها كاتب المحضر، لا التقويم:',
                      en: 'Actions flagged late in the register — the status here is the minute-keeper’s, not the calendar’s:' },
  mtg_empty_t:     { ar: 'لا محاضر مسجّلة على هذا المشروع',  en: 'No minutes recorded on this project' },
  mtg_empty_b:     { ar: 'يُسجَّل المحضر بقراره وملفه، فتصبح الإجراءات الناتجة عنه قابلة للمتابعة.',
                     en: 'A minute is recorded with its decision and its file, which is what makes the actions it produced followable.' },
  mtg_noact_t:     { ar: 'لا إجراءات مسجّلة',               en: 'No actions recorded' },
  mtg_noact_b:     { ar: 'ينشأ الإجراء عن قرار في محضر، ويحمل مسؤوله واستحقاقه.',
                     en: 'An action comes out of a decision in a minute, and carries its owner and its due date.' },

  // ── /docs · مرجع القواعد — EP-DOCS-01 ────────────────────────────────
  doc_r_title:      { ar: 'قواعد النظام',                   en: 'System rules' },
  doc_r_n:          { ar: 'قاعدة موثَّقة',                   en: 'documented rules' },
  doc_r_rules:      { ar: 'القواعد',                        en: 'Rules' },
  doc_r_of:         { ar: 'من',                             en: 'of' },
  doc_r_all:        { ar: 'الكل',                           en: 'All' },
  doc_r_d02:        { ar: 'قواعد العمل (02)',               en: 'Business rules (02)' },
  doc_r_d03:        { ar: 'مسار الأمر التغييري (03)',       en: 'Change-order flow (03)' },
  doc_r_d07:        { ar: 'خطة البناء (07)',                en: 'Build plan (07)' },
  doc_r_search:     { ar: 'بحث بالرمز أو العنوان أو النص…', en: 'Search by code, title or text…' },
  doc_r_col_rule:   { ar: 'القاعدة',                        en: 'Rule' },
  doc_r_col_spec:   { ar: 'نص المواصفة',                    en: 'What the spec says' },
  doc_r_col_source: { ar: 'المصدر',                         en: 'Source' },
  doc_r_show:       { ar: 'المثال والنتيجة',                en: 'Example & result' },
  doc_r_hide:       { ar: 'إخفاء',                          en: 'Hide' },
  doc_r_example:    { ar: 'المدخلات',                       en: 'Inputs' },
  doc_r_expect:     { ar: 'ما تنص عليه الوثيقة',            en: 'What the document states' },
  doc_r_result:     { ar: 'ما حسبه النظام الآن',            en: 'What the system just computed' },
  doc_r_notables:   { ar: 'لا يقرأ هذا المرجع أي جدول',     en: 'This reference reads no table' },
  doc_r_norm_t:     { ar: 'توثيق لا يمكن أن يتقادم',        en: 'Documentation that cannot go stale' },
  doc_r_norm_b:     { ar: 'كل مثال هنا يُنفَّذ عند كل طلب عبر الدالة نفسها التي تستدعيها نقاط النهاية، لا عبر نسخة ثانية منها. فإن تغيّرت قاعدة ولم يتغيّر نصها، ظهر الخلاف على هذه الصفحة علناً وعند كل تحميل. القواعد نفسها مكتوبة في الشيفرة (Domain/RuleCatalog.cs)، ولذلك تعمل هذه الصفحة على قاعدة بيانات فارغة.',
                      en: 'Every example here is executed on each request through the same function the endpoints call, not through a second copy of it. If a rule changes and its text does not, the disagreement appears on this page, in public, on every load. The rules themselves are code (Domain/RuleCatalog.cs), which is why this page works on an empty database.' },
  doc_r_compare_t:  { ar: 'المقارنة على القارئ',            en: 'The comparison is the reader’s' },
  doc_r_compare_b:  { ar: 'نص «ما تنص عليه الوثيقة» عبارة بشرية، و«ما حسبه النظام» قيمة — ولا شيء في الشيفرة يقارنهما. لذلك لا تُعرض هنا علامة نجاح: علامةٌ تحسبها هذه الصفحة ستكون الادعاء الوحيد فيها الذي لا يتحقّق منه أحد.',
                      en: '“What the document states” is prose and “what the system computed” is a value; nothing in the code compares them. So no pass mark is shown here: a tick this page computed would be the one claim on it that nothing verifies.' },
  doc_r_nomatch_t:  { ar: 'لا قواعد مطابقة للبحث',          en: 'No rules match the search' },
  doc_r_nomatch_b:  { ar: 'جرّب رمز قاعدة مثل BR-05 أو كلمة من نص المواصفة.',
                      en: 'Try a rule code such as BR-05, or a word from the spec text.' },

  // ── SCR-W15 · سجل التدقيق — 04 §3 ──────────────────────────────────────
  aud_sub:          { ar: 'سجل الإجراءات على المشروع',      en: 'Trail of actions on this project' },
  aud_trail:        { ar: 'سجل الإجراءات',                  en: 'Action trail' },
  aud_all:          { ar: 'الكل',                           en: 'All' },
  aud_of:           { ar: 'من',                             en: 'of' },
  aud_s_project:    { ar: 'المشروع',                        en: 'Project' },
  aud_s_contract:   { ar: 'العقود',                         en: 'Contracts' },
  aud_s_changeorder: { ar: 'الأوامر التغييرية',             en: 'Change orders' },
  aud_a_change_order: { ar: 'أثر أمر تغييري',               en: 'Change-order effect' },
  aud_a_progress:   { ar: 'تحديث الإنجاز',                  en: 'Progress update' },
  aud_search:       { ar: 'بحث بالسجل أو المنفّذ أو الحقل…', en: 'Search by record, actor or field…' },
  aud_col_at:       { ar: 'الوقت',                          en: 'Time' },
  aud_col_source:   { ar: 'المصدر',                         en: 'Source' },
  aud_col_ref:      { ar: 'السجل',                          en: 'Record' },
  aud_col_action:   { ar: 'الإجراء',                        en: 'Action' },
  aud_col_change:   { ar: 'التغيير',                        en: 'Change' },
  aud_col_actor:    { ar: 'المنفّذ',                         en: 'Actor' },
  aud_system:       { ar: 'النظام',                         en: 'The system' },
  aud_system_sub:   { ar: 'حدث آلي',                        en: 'automatic event' },
  aud_f_system:     { ar: 'أحداث آلية',                     en: 'automatic events' },
  aud_norm_t:       { ar: 'لا يملك هذا السجل جدولاً خاصاً به', en: 'This trail has no table of its own' },
  aud_norm_b:       { ar: 'تُقرأ الصفوف من السجلات المحفوظة بجانب كل سجل: سجل نشاط المشروع (الشكل 5) وسجل نشاط العقد (الشكل 11) وسجل الأمر التغييري (03 §9). لذلك لا يمكن لهذه الشاشة أن تخالف التبويب الذي يملك السجل، ولا يُكتب فيها شيء.',
                      en: 'The rows are read from the logs kept beside each record: the project activity log (الشكل 5), the contract activity log (الشكل 11) and the change-order log (03 §9). This screen therefore cannot disagree with the tab that owns the record, and nothing is written here.' },
  aud_empty_t:      { ar: 'لا إجراءات مسجّلة على هذا المشروع', en: 'No actions recorded on this project' },
  aud_empty_b:      { ar: 'يُسجَّل الأثر عند إنشاء المشروع أو تعديله، وعند كل تغيير على عقوده وأوامره التغييرية.',
                      en: 'A trail is written when the project is created or edited, and on every change to its contracts and change orders.' },
  aud_nomatch_t:    { ar: 'لا إجراءات مطابقة للمرشّحات',    en: 'No actions match the filters' },
  aud_nomatch_b:    { ar: 'جرّب مصدراً آخر أو امسح البحث.', en: 'Try another source, or clear the search.' },

  // ── SCR-W14 · التقارير والتحليلات (تبويب المشروع) — 04 §3 ─────────────
  prp_all:          { ar: 'الكل',                           en: 'All' },
  prp_of:           { ar: 'من',                             en: 'of' },
  prp_producible:   { ar: 'قابلة للإنتاج على هذا المشروع',  en: 'producible on this project' },
  prp_library:      { ar: 'مكتبة التقارير',                 en: 'Report library' },
  prp_available_only: { ar: 'القابلة للإنتاج فقط',          en: 'Producible only' },
  prp_col_report:   { ar: 'التقرير',                        en: 'Report' },
  prp_col_category: { ar: 'الفئة',                          en: 'Category' },
  prp_col_frequency: { ar: 'الدورية',                       en: 'Frequency' },
  prp_col_sources:  { ar: 'المصادر وعدد سجلات المشروع',     en: 'Sources & this project’s rows' },
  prp_weekly:       { ar: 'أسبوعي',                         en: 'Weekly' },
  prp_monthly:      { ar: 'شهري',                           en: 'Monthly' },
  prp_ondemand:     { ar: 'عند الطلب',                      en: 'On demand' },
  prp_available:    { ar: 'قابل للإنتاج',                   en: 'Producible' },
  prp_unavailable:  { ar: 'غير متاح',                       en: 'Unavailable' },
  prp_needs:        { ar: 'ينقصه:',                         en: 'Waiting on:' },
  prp_run:          { ar: 'تشغيل',                          en: 'Run' },
  prp_f_available:  { ar: 'قابلة للإنتاج',                  en: 'producible' },
  prp_norm_t:       { ar: 'التعريف واحد، والسؤال يختلف',    en: 'One definition, a different question' },
  prp_norm_b:       { ar: 'هذه التقارير هي نفسها المعرَّفة في «التقارير والإحصائيات» على مستوى الجهة؛ الفرق أن تلك الشاشة تسأل هل يمكن إنتاج التقرير أصلاً، وهذه تسأل هل يمكن إنتاجه لهذا المشروع — أي هل يملك المشروع سجلات في كل مصدر يقرؤه. إنتاج الملف نفسه غير مبنيّ في أي مرحلة من هذا النموذج.',
                      en: 'These are the same reports the enterprise Reports & Analytics screen defines. That screen asks whether a report can be produced at all; this one asks whether it can be produced for THIS project — whether the project has rows in every source it reads. Producing the file itself is in no phase of this prototype.' },
  prp_nomatch_t:    { ar: 'لا تقارير مطابقة للمرشّحات',     en: 'No reports match the filters' },
  prp_nomatch_b:    { ar: 'جرّب فئة أخرى أو أوقف مرشّح «القابلة للإنتاج فقط».',
                      en: 'Try another category, or turn off the “producible only” filter.' },

  // ── SCR-W10 · النموذج ثلاثي الأبعاد — ملحق الشكل 44 ──────────────────
  mdl_all:          { ar: 'الكل',                           en: 'All' },
  mdl_by_status:    { ar: 'الحالة',                         en: 'Status' },
  mdl_by_discipline: { ar: 'التخصص',                        en: 'Discipline' },
  mdl_elements:     { ar: 'العناصر',                        en: 'Elements' },
  mdl_critical:     { ar: 'حرج',                            en: 'Critical' },
  mdl_code:         { ar: 'رمز العنصر',                     en: 'Element code' },
  mdl_discipline:   { ar: 'التخصص',                         en: 'Discipline' },
  mdl_level:        { ar: 'الطابق',                         en: 'Level' },
  mdl_zone:         { ar: 'المنطقة',                        en: 'Zone' },
  mdl_qty:          { ar: 'الكمية',                         en: 'Quantity' },
  mdl_revision:     { ar: 'الإصدار',                        en: 'Revision' },
  mdl_progress:     { ar: 'الإنجاز',                        en: 'Progress' },
  mdl_links:        { ar: 'روابط',                          en: 'Links' },
  mdl_contract:     { ar: 'ضمن العقد',                      en: 'Within contract' },
  mdl_unlinked:     { ar: 'غير مرتبط',                      en: 'not linked' },
  mdl_nomatch:      { ar: 'لا عناصر بهذا التخصص',           en: 'No elements in this discipline' },
  mdl_versions:     { ar: 'إصدارات النموذج',                en: 'Model versions' },
  mdl_v_code:       { ar: 'الرمز',                          en: 'Code' },
  mdl_v_label:      { ar: 'الإصدار',                        en: 'Version' },
  mdl_v_date:       { ar: 'التاريخ',                        en: 'Date' },
  mdl_v_by:         { ar: 'أصدره',                          en: 'Issued by' },
  mdl_v_current:    { ar: 'الحالي',                         en: 'Current' },
  mdl_v_previous:   { ar: 'سابق',                           en: 'Previous' },
  mdl_stub_t:       { ar: 'المشهد ثلاثي الأبعاد غير مُفعَّل',  en: 'The 3D scene is not enabled' },
  mdl_stub_b:       { ar: 'عرض نماذج BIM/IFC خارج نطاق المرحلة الأولى (07 §8): التبويب قائم والمشهد مؤجَّل. كل ما تعرضه هذه الشاشة من شجرة وعناصر وخصائص وروابط بيانات حقيقية، أمّا الهندسة الشكلية فلا تُخزَّن — ولذلك لا تظهر أدوات القياس والمقطع واللقطة.',
                      en: 'BIM/IFC rendering is out of Phase 1 (07 §8): the tab is kept and the scene is deferred. The tree, the elements, their properties and their links on this screen are real data; no geometry is stored, which is why the measure, section and snapshot tools are not drawn.' },
  mdl_stub_tag:     { ar: 'المشهد مؤجَّل — 07 §8',            en: 'Scene deferred — 07 §8' },
  mdl_ver_t:        { ar: 'الإصدارات سجل، وليست مُبدِّلاً',    en: 'The versions are a record, not a switch' },
  mdl_ver_b:        { ar: 'تنتمي العناصر إلى المشروع لا إلى إصدار بعينه، فلا يمكن عرض «كيف كان النموذج عند الإصدار 2» دون المشهد المؤجَّل. تُعرَض القائمة كسجل صريح بدل مُبدِّل يعرض عناصر اليوم تحت عنوان الأمس.',
                      en: 'Elements belong to the project rather than to one version, so “what the model looked like at version 2” cannot be shown without the deferred scene. The list is presented as a record instead of a switch that would show today’s elements under yesterday’s label.' },
  mdl_empty_t:      { ar: 'لا نموذج مرفوع لهذا المشروع',    en: 'No model uploaded for this project' },
  mdl_empty_b:      { ar: 'يُربَط كل عنصر ببند من جدول الكميات وبنشاط من الجدول الزمني، وبدون ذلك لا تُقرأ حالة التنفيذ مكانياً.',
                      en: 'Each element links to a BOQ line and a schedule activity; without them execution status cannot be read spatially.' },

  // ── SCR-W13 · التنبيهات — ملحق الشكل 47 ──────────────────────────────
  pal_need_action:  { ar: 'تحتاج إجراءً الآن',              en: 'need action now' },
  pal_nothing_overdue: { ar: 'لا شيء متأخر',                en: 'nothing overdue' },
  pal_v_inbox:      { ar: 'التنبيهات',                      en: 'Alerts' },
  pal_v_rules:      { ar: 'القواعد',                        en: 'Rules' },
  pal_all:          { ar: 'الكل',                           en: 'All' },
  pal_rules:        { ar: 'قواعد التنبيه',                  en: 'Alert rules' },
  pal_enabled_of:   { ar: 'مفعّلة من',                       en: 'enabled of' },
  pal_col_code:     { ar: 'الرمز',                          en: 'Code' },
  pal_col_rule:     { ar: 'القاعدة',                        en: 'Rule' },
  pal_col_trigger:  { ar: 'شرط الإطلاق',                    en: 'Trigger condition' },
  pal_col_severity: { ar: 'الخطورة',                        en: 'Severity' },
  pal_col_channels: { ar: 'القنوات',                        en: 'Channels' },
  pal_col_recurrence: { ar: 'التكرار',                      en: 'Recurrence' },
  pal_col_escalate: { ar: 'التصعيد بعد',                    en: 'Escalate after' },
  pal_ch_inapp:     { ar: 'داخل النظام',                    en: 'in-app' },
  pal_ch_email:     { ar: 'بريد',                           en: 'email' },
  pal_ch_sms:       { ar: 'رسالة',                          en: 'SMS' },
  pal_hours:        { ar: 'ساعة',                           en: 'hours' },
  // Arabic counts a noun by its number, and الشكل 47 uses BOTH forms on one
  // screen — «5 أيام» for a small count and «خلال 45 يوماً» for a large one.
  pal_days:         { ar: 'أيام',                           en: 'days' },
  pal_day:          { ar: 'يوم',                            en: 'day' },
  pal_d_one:        { ar: 'يوم واحد',                       en: '1 day' },
  pal_d_two:        { ar: 'يومان',                          en: '2 days' },
  pal_d_many:       { ar: 'يوماً',                           en: 'days' },
  pal_no_escalation: { ar: 'بلا تصعيد',                     en: 'no escalation' },
  pal_no_due:       { ar: 'بلا موعد',                       en: 'no deadline' },
  pal_overdue_by:   { ar: 'متأخر',                          en: 'overdue by' },
  pal_due_today:    { ar: 'يستحق اليوم',                    en: 'due today' },
  pal_within:       { ar: 'خلال',                           en: 'within' },
  pal_on:           { ar: 'مفعّلة',                          en: 'Enabled' },
  pal_off:          { ar: 'موقوفة',                         en: 'Disabled' },
  pal_ack:          { ar: 'إقرار',                          en: 'Acknowledge' },
  pal_ack_all:      { ar: 'إقرار المحدد',                   en: 'Acknowledge selected' },
  pal_ack_n:        { ar: 'أُقِرّت تنبيهات:',                 en: 'Alerts acknowledged:' },
  pal_ack_done:     { ar: 'أُقِرَّ التنبيه وسُجِّل باسمك',       en: 'Alert acknowledged and recorded in your name' },
  pal_pick:         { ar: 'تحديد التنبيه',                  en: 'Select alert' },
  pal_selected:     { ar: 'محدد',                           en: 'selected' },
  pal_clear_sel:    { ar: 'إلغاء التحديد',                  en: 'Clear selection' },
  pal_show_all:     { ar: 'عرض الكل',                       en: 'Show all' },
  pal_f_need:       { ar: 'تحتاج إجراءً',                   en: 'need action' },
  pal_f_critical:   { ar: 'حرجة',                           en: 'critical' },
  pal_rule_on_done: { ar: 'فُعِّلت القاعدة',                   en: 'Rule enabled' },
  pal_rule_off_done: { ar: 'أُوقفت القاعدة وسُحبت تنبيهاتها',  en: 'Rule disabled; its alerts are withdrawn' },
  pal_norm_t:       { ar: 'القاعدة هي مصدر التنبيه',        en: 'The rule is the source of the alert' },
  pal_norm_b:       { ar: 'إيقاف قاعدة يوقف التنبيهات التي أنتجتها فورًا — التنبيه ليس سجلًا مستقلًا يُحرَّر.',
                      en: 'Disabling a rule immediately silences the alerts it produced — an alert is not an independent record that gets edited.' },
  pal_engine_t:     { ar: 'الشروط مسجَّلة ولا تُقيَّم هنا',     en: 'The conditions are recorded, not evaluated here' },
  pal_engine_b:     { ar: 'شرط الإطلاق نصٌّ يصف متى تُطلَق القاعدة؛ ولا يعمل في هذا النموذج مجدولٌ يقيّمه، ولا تُرسَل رسائل بريد أو رسائل نصية — والتنبيهات المعروضة مسجّلة تسمّي قاعدتها. (07 §2)',
                      en: 'A trigger condition is prose describing when the rule fires. No scheduler evaluates it in this prototype and no email or SMS is dispatched; the alerts shown are recorded rows that name their rule. (07 §2)' },
  pal_norules_t:    { ar: 'لا قواعد تنبيه على هذا المشروع', en: 'No alert rules on this project' },
  pal_norules_b:    { ar: 'تُضبَط القواعد لكل مشروع على حدة، وبدونها لا يولّد النظام تنبيهًا آليًا.',
                      en: 'Rules are set per project; without them the system raises no automatic alert.' },
  pal_zero_t:       { ar: 'لا شيء ينتظر إجراءك',            en: 'Nothing is waiting on you' },
  pal_zero_b:       { ar: 'لا تنبيه مفتوح على هذا المشروع عند تاريخ البيانات — وهذه حالة سليمة، لا نتيجة فارغة.',
                      en: 'No alert is open on this project at the data date. That is a healthy state, not an empty result.' },
  pal_nomatch_t:    { ar: 'لا تنبيهات بهذه الخطورة',        en: 'No alerts at this severity' },
  pal_nomatch_b:    { ar: 'اختر «الكل» لعرض صندوق التنبيهات كاملاً.',
                      en: 'Choose “All” to see the whole inbox.' },

  // ── SCR-W12 · الوثائق والمخططات — ملحق الشكل 46 ──────────────────────
  doc_n:           { ar: 'وثيقة',                           en: 'documents' },
  doc_rev_n:       { ar: 'مراجعة',                          en: 'revisions' },
  doc_latest_only: { ar: 'آخر مراجعة فقط',                  en: 'Latest revision only' },
  doc_upload:      { ar: 'رفع وثيقة',                       en: 'Upload a document' },
  doc_upload_rev:  { ar: 'رفع مراجعة',                      en: 'Upload a revision' },
  doc_folders:     { ar: 'التصنيف',                         en: 'Classification' },
  doc_all:         { ar: 'كل الوثائق',                      en: 'All documents' },
  doc_register:    { ar: 'سجل الوثائق',                     en: 'Document register' },
  doc_search:      { ar: 'بحث بالرقم أو العنوان أو الجهة…',  en: 'Search by number, title or issuer…' },
  doc_col_code:    { ar: 'رقم الوثيقة والتخصص',             en: 'Number & discipline' },
  doc_col_title:   { ar: 'العنوان وجهة الإصدار',            en: 'Title & issuer' },
  doc_col_revision: { ar: 'المراجعة',                       en: 'Revision' },
  doc_col_status:  { ar: 'حالة الإصدار',                    en: 'Issue status' },
  doc_discipline:  { ar: 'التخصص',                          en: 'Discipline' },
  doc_issuer:      { ar: 'جهة الإصدار',                     en: 'Issuer' },
  doc_open:        { ar: 'فتح تفاصيل الوثيقة',              en: 'Open the document detail' },
  doc_current:     { ar: 'الحالية',                         en: 'Current' },
  doc_superseded:  { ar: 'ملغاة',                           en: 'Superseded' },
  doc_under_review: { ar: 'قيد المراجعة',                   en: 'under review' },
  doc_f_docs:      { ar: 'الوثائق',                          en: 'Documents' },
  doc_f_revs:      { ar: 'المراجعات',                        en: 'Revisions' },
  doc_selected:    { ar: 'محدد',                              en: 'selected' },
  doc_tab_revisions: { ar: 'المراجعات',                     en: 'Revisions' },
  doc_tab_details: { ar: 'التفاصيل',                        en: 'Details' },
  doc_rev_history: { ar: 'سجل المراجعات',                   en: 'Revision history' },
  doc_norm_t:      { ar: 'المراجعات لا تُحذف',               en: 'Revisions are never deleted' },
  doc_norm_b:      { ar: 'كل ملف جديد يُنشئ مراجعة جديدة؛ المراجعة السابقة تبقى في السجل معلَّمة كملغاة، ولا يوجد استبدال في المكان.',
                     en: 'Every new file creates a new revision; the previous one stays in the register marked superseded, and nothing is replaced in place.' },
  doc_notab_t:     { ar: 'المعاينة والتأشيرات غير مُفعَّلتين',  en: 'Preview and stamps are not enabled' },
  doc_notab_b:     { ar: 'لا تُحفَظ محتويات الملفات في هذا النموذج، ولا يسجّل أي مسار تأشيرة بعد — والشكل 46 يعرض التبويبين، فذُكرا هنا بدل تركهما فارغين.',
                     en: 'File contents are not stored in this prototype and no flow records a stamp yet — الشكل 46 shows both tabs, so they are named here rather than left empty.' },
  doc_empty_t:     { ar: 'لا وثائق مسجّلة على هذا المشروع',  en: 'No documents recorded on this project' },
  doc_empty_b:     { ar: 'تُرفَع الوثيقة برقمها وتخصصها، ثم تتراكم مراجعاتها دون أن يُستبدل أي إصدار.',
                     en: 'A document is uploaded with its number and discipline, and its revisions then accumulate without any issue being replaced.' },
  doc_nomatch_t:   { ar: 'لا وثائق مطابقة للفلاتر',         en: 'No documents match the filters' },
  doc_nomatch_b:   { ar: 'جرّب تصنيفاً آخر أو حالة إصدار أخرى أو امسح البحث.',
                     en: 'Try another folder or issue status, or clear the search.' },

  fin_alloc_t:     { ar: 'التخصيص السنوي غير متوفر',         en: 'The annual allocation is unavailable' },
  fin_sla_t:       { ar: 'مهل التدقيق غير متوفرة',           en: 'The audit SLA is unavailable' },
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
