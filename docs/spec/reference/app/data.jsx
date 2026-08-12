/* ============================================================
   EPM Prototype — mock data, i18n strings, helpers
   Exposed on window for other babel scripts.
   ============================================================ */

// ---------- i18n ----------
const STR = {
  // chrome
  app_name:        { ar: 'EPM', en: 'EPM' },
  app_title:       { ar: 'نظام إدارة المشاريع الهندسية', en: 'Engineering Projects Management System' },
  app_full:        { ar: 'إدارة المشاريع الهندسية', en: 'Engineering Projects Management' },
  ministry:        { ar: 'وزارة التعليم العالي و البحث العلمي', en: 'Ministry of Higher Education & Scientific Research' },
  dept:            { ar: 'دائرة الإعمار و المشاريع — القسم الهندسي', en: 'Dept. of Reconstruction & Projects — Engineering Section' },
  search_ph:       { ar: 'ابحث في المشاريع، العقود، اللجان…', en: 'Search projects, contracts, committees…' },
  // nav
  nav_overview:    { ar: 'النظرة العامة', en: 'Overview' },
  nav_projects:    { ar: 'المشاريع', en: 'Projects' },
  nav_contracts:   { ar: 'العقود و الملاحق', en: 'Contracts & Addendums' },
  nav_committees:  { ar: 'اللجان', en: 'Committees' },
  nav_corr:        { ar: 'المخاطبات', en: 'Correspondence' },
  nav_schedules:   { ar: 'جداول الشُعب و الأقسام', en: 'Branch & Section Schedules' },
  nav_attach:      { ar: 'المرفقات', en: 'Attachments' },
  nav_stats:       { ar: 'الإحصائيات', en: 'Statistics' },
  nav_admin:       { ar: 'وحدة الإدارة', en: 'Administration' },
  nav_section_ops: { ar: 'العمليات', en: 'Operations' },
  nav_section_gov: { ar: 'الحوكمة', en: 'Governance' },
  // actions
  signin:          { ar: 'تسجيل الدخول', en: 'Sign in' },
  signout:         { ar: 'تسجيل الخروج', en: 'Sign out' },
  enter:           { ar: 'الدخول إلى النظام', en: 'Enter the system' },
  new_project:     { ar: 'مشروع جديد', en: 'New project' },
  filter:          { ar: 'تصفية', en: 'Filter' },
  export:          { ar: 'تصدير', en: 'Export' },
  view_all:        { ar: 'عرض الكل', en: 'View all' },
  open:            { ar: 'فتح', en: 'Open' },
  save:            { ar: 'حفظ', en: 'Save' },
  cancel:          { ar: 'إلغاء', en: 'Cancel' },
  back:            { ar: 'رجوع', en: 'Back' },
  // landing
  land_kicker:     { ar: 'منصّة الوزارة الموحّدة', en: 'Unified ministry platform' },
  land_h:          { ar: 'إدارة المشاريع الهندسية، من الوزارة إلى المشروع.', en: 'Engineering projects, from enterprise to project.' },
  land_sub:        { ar: 'منصّة واحدة تُدار عبر ثلاث طبقات: الوزارة ← مساحات العمل (الجامعات و الوحدات) ← المشاريع. عقود، لجان، مخاطبات، مواقف مالية، و تدقيق — بصلاحيات دقيقة و سجلّ كامل.', en: 'One platform across three tiers: Enterprise (the Ministry) → Workspaces (universities & units) → Projects. Contracts, committees, correspondence, financials and audit — with precise permissions and a full trail.' },
  land_cta:        { ar: 'الدخول إلى النظام', en: 'Enter the system' },
  land_explore:    { ar: 'استكشاف القدرات', en: 'Explore capabilities' },
  // login
  login_h:         { ar: 'تسجيل الدخول', en: 'Sign in' },
  login_sub:       { ar: 'هوية واحدة على مستوى الوزارة. صلاحياتك تُحدّد ما تراه.', en: 'One enterprise identity. Your permissions decide what you see.' },
  username:        { ar: 'اسم المستخدم', en: 'Username' },
  password:        { ar: 'كلمة السر', en: 'Password' },
  remember:        { ar: 'إبقني مسجّلاً', en: 'Keep me signed in' },
  forgot:          { ar: 'نسيت كلمة السر؟', en: 'Forgot password?' },
  login_note:      { ar: 'الوصول مقيّد بشبكة الوزارة الداخلية. كل عملية دخول تُسجَّل.', en: 'Access is restricted to the ministry network. Every sign-in is logged.' },
  // dashboard
  welcome:         { ar: 'مرحباً', en: 'Welcome' },
  your_workspaces: { ar: 'مساحات العمل المتاحة لك', en: 'Your workspaces' },
  ws_sub:          { ar: 'اختر مساحة عمل للانتقال إلى مشاريعها. وصولك هو اتحاد تكليفاتك حسب الدور و النطاق.', en: 'Choose a workspace to view its projects. Your access is the union of your role-and-scope assignments.' },
  kpi_active:      { ar: 'مشاريع نشطة', en: 'Active projects' },
  kpi_workspaces:  { ar: 'مساحات عمل', en: 'Workspaces' },
  kpi_due:         { ar: 'مهام تنتهي قريباً', en: 'Items due soon' },
  kpi_completion:  { ar: 'متوسط الإنجاز', en: 'Avg. completion' },
  recent:          { ar: 'نشاط حديث', en: 'Recent activity' },
  enter_ws:        { ar: 'دخول', en: 'Enter' },
  projects_count:  { ar: 'مشروعاً', en: 'projects' },
  ws_search_ph:    { ar: 'ابحث في مساحات العمل بالاسم أو الرمز…', en: 'Search workspaces by name or code…' },
  ws_all_kinds:    { ar: 'الكل', en: 'All' },
  ws_showing:      { ar: 'مساحة عمل', en: 'workspaces' },
  ws_of:           { ar: 'من', en: 'of' },
  ws_sort_active:  { ar: 'الأكثر نشاطاً', en: 'Most active' },
  ws_sort_comp:    { ar: 'الأعلى إنجازاً', en: 'Highest completion' },
  ws_sort_name:    { ar: 'الاسم (أ–ي)', en: 'Name (A–Z)' },
  ws_sort_label:   { ar: 'ترتيب', en: 'Sort' },
  ws_view_grid:    { ar: 'بطاقات', en: 'Cards' },
  ws_view_list:    { ar: 'قائمة', en: 'List' },
  ws_no_results:   { ar: 'لا توجد مساحات عمل مطابقة', en: 'No matching workspaces' },
  ws_clear:        { ar: 'مسح البحث', en: 'Clear search' },
  ws_active_short: { ar: 'نشط', en: 'active' },
  // workspace
  ws_projects:     { ar: 'المشاريع', en: 'Projects' },
  all:             { ar: 'الكل', en: 'All' },
  ongoing:         { ar: 'مستمر', en: 'Ongoing' },
  completed:       { ar: 'منجز', en: 'Completed' },
  stalled:         { ar: 'متأخر', en: 'Delayed' },
  suspended:       { ar: 'متوقف', en: 'Suspended' },
  withdrawn:       { ar: 'ملغي', en: 'Cancelled' },
  col_id:          { ar: 'المعرّف', en: 'ID' },
  col_project:     { ar: 'المشروع', en: 'Project' },
  col_status:      { ar: 'الحالة', en: 'Status' },
  col_tech:        { ar: 'الإنجاز الفني', en: 'Technical %' },
  col_cost:        { ar: 'الكلفة (IQD)', en: 'Cost (IQD)' },
  col_branch:      { ar: 'الشعبة', en: 'Branch' },
  col_executor:    { ar: 'الجهة المنفذة', en: 'Executor' },
  col_updated:     { ar: 'آخر تحديث', en: 'Updated' },
  // profile
  profile:         { ar: 'الملف الشخصي', en: 'Profile' },
  account:         { ar: 'الحساب', en: 'Account' },
  my_access:       { ar: 'صلاحياتي', en: 'My access' },
  activity_log:    { ar: 'سجل نشاطي', en: 'My activity' },
  role:            { ar: 'الدور', en: 'Role' },
  org_unit:        { ar: 'الوحدة التنظيمية', en: 'Org unit' },
  email:          { ar: 'البريد الإلكتروني', en: 'Email' },
  assignments:     { ar: 'التكليفات (دور × نطاق)', en: 'Assignments (role × scope)' },
  // admin
  admin_h:         { ar: 'وحدة الإدارة', en: 'Administration' },
  admin_sub:       { ar: 'المستوى الإداري — الحوكمة و الإعداد. منفصل تماماً عن بيانات المشاريع.', en: 'Administrative plane — governance & setup. Fully separate from project data.' },
  adm_users:       { ar: 'المخوّلون', en: 'Authorized users' },
  adm_roles:       { ar: 'مستويات الصلاحية', en: 'Roles' },
  adm_matrix:      { ar: 'مصفوفة الصلاحيات', en: 'Permission matrix' },
  adm_orgs:        { ar: 'الهيكل التنظيمي', en: 'Org structure' },
  adm_lookups:     { ar: 'القوائم المرجعية', en: 'Lookups' },
  adm_ws:          { ar: 'مساحات العمل', en: 'Workspaces' },
  adm_audit:       { ar: 'سجل التدقيق', en: 'Audit log' },
  adm_deleg:       { ar: 'الإدارة المفوّضة', en: 'Delegated admin' },
  lazy_note:       { ar: 'تُحمّل وحدة الإدارة كوحدة Angular منفصلة (lazy-loaded) بحارس canMatch — لا يُنزّلها المستخدم العادي.', en: 'The admin console loads as a separate lazy-loaded Angular module behind a canMatch guard — regular users never download it.' },
  // navigation (workspace context)
  nav_home:        { ar: 'الرئيسية', en: 'Home' },
  // project drill-down
  open_project:    { ar: 'فتح المشروع', en: 'Open project' },
  back_projects:   { ar: 'كل المشاريع', en: 'All projects' },
  select_project:  { ar: 'اختر مشروعاً لعرض وحداته', en: 'Select a project to view its modules' },
  no_access:       { ar: 'لا تملك صلاحية لهذه الوحدة', en: 'You don’t have permission for this module' },
  gated_by:        { ar: 'مقيّد بمصفوفة الصلاحيات', en: 'Gated by the permission matrix' },
  // module names
  mod_overview:    { ar: 'نظرة عامة', en: 'Overview' },
  mod_contract:    { ar: 'العقود', en: 'Contracts' },
  mod_committees:  { ar: 'اللجان', en: 'Committees' },
  mod_corr:        { ar: 'المخاطبات', en: 'Correspondence' },
  mod_financials:  { ar: 'الموقف المالي', en: 'Financial Position' },
  mod_periods:     { ar: 'مدد الإنجاز', en: 'Completion Periods' },
  mod_attach:      { ar: 'المخططات و الصور', en: 'Plans & Images' },
  mod_audit:       { ar: 'سجل التدقيق', en: 'Audit History' },
  // project detail labels
  pd_tech:         { ar: 'الإنجاز الفني', en: 'Technical' },
  pd_fin:          { ar: 'الإنجاز المالي', en: 'Financial' },
  pd_cost:         { ar: 'الكلفة التعاقدية', en: 'Contractual cost' },
  pd_beneficiary:  { ar: 'الجهة المستفيدة', en: 'Beneficiary' },
  pd_designer:     { ar: 'الجهة المصممة', en: 'Designer' },
  pd_executor:     { ar: 'الجهة المنفذة', en: 'Executor' },
  pd_consultant:   { ar: 'الجهة الإستشارية', en: 'Consultant' },
  pd_disbursed:    { ar: 'المبالغ المصروفة', en: 'Disbursed' },
  pd_due:          { ar: 'المستحق للشركة', en: 'Due to company' },
  pd_remaining:    { ar: 'المتبقي', en: 'Remaining' },
  pd_advances:     { ar: 'السلف التشغيلية', en: 'Operational advances' },
  add_record:      { ar: 'إضافة', en: 'Add' },
  // enterprise vs workspace context
  all_workspaces:  { ar: 'المساحة الرئيسية', en: 'Master space' },
  enterprise_ctx:  { ar: 'الوزارة', en: 'Enterprise — Ministry' },
  master_sub:      { ar: 'نظرة شاملة عبر كل مساحات العمل.', en: 'Enterprise-wide view across all workspaces.' },
  ws_scoped_sub:   { ar: 'كل ما يلي ضمن سياق مساحة العمل المختارة.', en: 'Everything below is scoped to the selected workspace.' },
  back_all:        { ar: 'العودة إلى كل مساحات العمل', en: 'Back to all workspaces' },
  view_projects:   { ar: 'عرض كل المشاريع', en: 'View all projects' },
  status_breakdown:{ ar: 'توزيع الحالات', en: 'Status breakdown' },
  top_projects:    { ar: 'أحدث المشاريع', en: 'Recent projects' },
  ws_overview:     { ar: 'نظرة عامة', en: 'Overview' },
  // admin — confirmed scope (ADRs)
  adm_assign:      { ar: 'الأعضاء و التكليفات', en: 'Members & assignments' },
  adm_enterprise:  { ar: 'إعدادات النظام', en: 'System settings' },
  adm_workspace:   { ar: 'إعدادات مساحة العمل', en: 'Workspace settings' },
  adm_projects:    { ar: 'المشاريع', en: 'Projects' },
  adm_groups:      { ar: 'المجموعات و الهيكل', en: 'Groups & structure' },
  scope_enterprise:{ ar: 'النظام', en: 'Enterprise' },
  scope_workspace: { ar: 'مساحة عمل', en: 'Workspace' },
  scope_project:   { ar: 'مشروع', en: 'Project' },
  principal_user:  { ar: 'مستخدم', en: 'User' },
  principal_group: { ar: 'مجموعة', en: 'Group' },
  col_principal:   { ar: 'المُكلَّف', en: 'Principal' },
  col_role:        { ar: 'الدور', en: 'Role' },
  col_scope:       { ar: 'النطاق', en: 'Scope' },
  col_target:      { ar: 'الهدف', en: 'Target' },
  col_plane:       { ar: 'المستوى', en: 'Plane' },
  new_assignment:  { ar: 'تكليف جديد', en: 'New assignment' },
  assign_note:     { ar: 'الوصول الفعّال = اتحاد تكليفات المستخدم و مجموعاته الأصل، مقيّداً بمصفوفة الإجراءات. النطاق الأعلى بشري فقط (لا تمنحه مجموعة).', en: 'Effective access = union of the user’s and ancestor-group assignments, gated by the action matrix. Enterprise scope is human-only (no group confers it).' },
  groups_note:     { ar: 'الهيكل التنظيمي شجرة مجموعات عامة (دائرة › قسم › شعبة) مُصنّفة بنوع الوحدة. مفتاح الرؤية owning_workspace.', en: 'OBS is a generic GROUP tree (Dept › Section › Branch) typed by unit type. Visibility key = owning_workspace.' },
  plane_ops:       { ar: 'تشغيلي', en: 'Operational' },
  plane_admin:     { ar: 'إداري', en: 'Administrative' },
  owner_ent:       { ar: 'النظام (المدير الرئيسي)', en: 'Enterprise (master)' },
  members:         { ar: 'عضو', en: 'members' },
  // reports & analytics
  nav_reports:     { ar: 'التقارير و الإحصائيات', en: 'Reports & analytics' },
  reports_sub:     { ar: 'مؤشرات الأداء عبر المحفظة و مساحات العمل.', en: 'Performance indicators across the portfolio and workspaces.' },
  period_month:    { ar: 'هذا الشهر', en: 'This month' },
  period_quarter:  { ar: 'هذا الربع', en: 'This quarter' },
  period_year:     { ar: 'هذه السنة', en: 'This year' },
  rep_trend:       { ar: 'اتجاه الإنجاز', en: 'Completion trend' },
  rep_by_status:   { ar: 'حسب الحالة', en: 'By status' },
  rep_by_ws:       { ar: 'الأداء حسب مساحة العمل', en: 'Performance by workspace' },
  rep_by_branch:   { ar: 'التوزيع حسب الشعبة', en: 'Distribution by branch' },
  rep_at_risk:     { ar: 'المشاريع المتعثرة', en: 'At-risk projects' },
  // notifications
  notifications:   { ar: 'الإشعارات', en: 'Notifications' },
  notif_mark_all:  { ar: 'تعليم الكل كمقروء', en: 'Mark all read' },
  notif_empty:     { ar: 'لا إشعارات جديدة', en: 'You’re all caught up' },
  notif_today:     { ar: 'اليوم', en: 'Today' },
  notif_earlier:   { ar: 'أقدم', en: 'Earlier' },
  unread:          { ar: 'غير مقروء', en: 'unread' },
  // new project modules (Business Vision Phase 1 §6)
  mod_profile:     { ar: 'ملف المشروع', en: 'Profile' },
  mod_entity:      { ar: 'الجهة', en: 'Entity' },
  mod_consultant:  { ar: 'الاستشاري', en: 'Consultant' },
  mod_contractor:  { ar: 'المقاول', en: 'Contractor' },
  mod_schedule:    { ar: 'الجدول الزمني', en: 'Schedule' },
  mod_progress:    { ar: 'الإنجاز', en: 'Progress' },
  mod_boq:         { ar: 'جدول الكميات', en: 'BOQ' },
  mod_vo:          { ar: 'الأوامر التغييرية', en: 'Variation Orders' },
  mod_information: { ar: 'معلومات المشروع', en: 'Project Information' },
  mod_changeorders:{ ar: 'الأوامر التغييرية', en: 'Change Orders' },
  mod_model:       { ar: 'النموذج ثلاثي الأبعاد', en: '3D Model' },
  mod_documents:   { ar: 'الوثائق والمخططات', en: 'Documents & Drawings' },
  mod_alerts:      { ar: 'التنبيهات', en: 'Alerts' },
  mod_reports:     { ar: 'التقارير والتحليلات', en: 'Reports & Analytics' },
  mod_risk:        { ar: 'إدارة المخاطر', en: 'Risk Management' },
  readiness:       { ar: 'جاهزية المرحلة', en: 'Readiness' },
  next_action:     { ar: 'الإجراء التالي المطلوب', en: 'Next required action' },
  coming_phase:    { ar: 'ضمن نطاق المرحلة الأولى — قيد البناء', en: 'Within Phase 1 scope — under construction' },
  demo_data:       { ar: 'بيانات تجريبية للعرض', en: 'Demonstration data' },
  mod_meetings:    { ar: 'محاضر الاجتماعات', en: 'Meetings' },
  mod_drawings:    { ar: 'المخططات والوثائق', en: 'Drawings' },
  mod_supplyitems: { ar: 'الفقرات التجهيزية', en: 'Supply Line Items' },
  mod_receipts:    { ar: 'الاستلامات', en: 'Receipts' },
  mod_inquiry:     { ar: 'استعلام الفقرات', en: 'Item Inquiry' },
  proposed_badge:  { ar: 'مقترح', en: 'Proposed' },
  approve:         { ar: 'اعتماد', en: 'Approve' },
  reject:          { ar: 'رفض', en: 'Reject' },
  add_boq_row:     { ar: 'إضافة بند', en: 'Add item' },
  new_vo:          { ar: 'أمر تغييري جديد', en: 'New variation order' },
  upload_revision: { ar: 'رفع مراجعة جديدة', en: 'Upload new revision' },
  revisions:       { ar: 'المراجعات', en: 'Revisions' },
  vo_recalc_note:  { ar: 'أُعيد حساب الكلفة المعدلة تلقائياً بعد الاعتماد.', en: 'Revised cost recalculated automatically after approval.' },
  dash_portfolio_title: { ar: 'لوحة متابعة المشاريع والعقود', en: 'Projects & Contracts Dashboard' },
  kpi_planned_cost:     { ar: 'كلفة المشاريع المقررة', en: 'Planned project cost' },
  kpi_revised_cost:     { ar: 'كلفة المشاريع المعدلة', en: 'Revised project cost' },
  kpi_cumulative_spend: { ar: 'المصروف التراكمي', en: 'Cumulative spend' },
  kpi_physical_pct:     { ar: 'نسبة الإنجاز المادي', en: 'Physical completion' },
  kpi_financial_pct:    { ar: 'نسبة الإنجاز المالي', en: 'Financial completion' },
  chart_contract_status:{ ar: 'توزيع حالة العقود', en: 'Contract status distribution' },
  chart_cost_compare:   { ar: 'مقارنة الكلف', en: 'Cost comparison' },
  chart_annual_spend:   { ar: 'المصروف السنوي', en: 'Annual spending' },
  chart_timeline:       { ar: 'الجدول الزمني للمشاريع', en: 'Project timelines' },
  nav_schedule_control: { ar: 'ضبط الجداول الزمنية', en: 'Schedule Control' },
  nav_alerts_center:    { ar: 'مركز التنبيهات', en: 'Alerts Center' },
  sc_avg_delay:         { ar: 'متوسط التأخر', en: 'Avg. delay' },
  sc_delayed:           { ar: 'مشاريع متأخرة', en: 'Delayed projects' },
  sc_critical:          { ar: 'أنشطة حرجة', en: 'Critical activities' },
  sc_ontrack:           { ar: 'ضمن الجدول', en: 'On track' },
  sc_import_status:     { ar: 'حالة الاستيراد', en: 'Import status' },
  nav_projects_all:     { ar: 'كل المشاريع', en: 'Projects' },
  nav_contracts_all:    { ar: 'العقود', en: 'Contracts' },
};

function makeT(getLang) { return (k) => (STR[k] ? STR[k][getLang()] : k); }

// ---------- mock domain data ----------
const KIND_PUBLIC = { ar:'جامعة حكومية', en:'Public university' };
const KIND_TECH   = { ar:'جامعة تقنية',  en:'Technical university' };
const KIND_UNIT   = { ar:'وحدة مركزية',  en:'Central unit' };
const KIND_SUPPLY = { ar:'مديرية تجهيز', en:'Procurement directorate' };

// Reduced sample set (was 19 workspaces / 231 projects) to keep the stored
// dataset small. `projects`/`active`/`completion` are recomputed from the
// generated project records below (see WS_STATS), so these are seed hints only.
const WORKSPACES = [
  { id: 'ub',  ar: 'جامعة بغداد',                  en: 'University of Baghdad',      code: 'UOB', projects: 5, active: 3, completion: 71, color: '#0e6b47', kind: KIND_PUBLIC },
  { id: 'nu',  ar: 'الجامعة المستنصرية',           en: 'Al-Mustansiriyah University', code: 'MU', projects: 4, active: 2, completion: 64, color: '#1d4e89', kind: KIND_PUBLIC },
  { id: 'tu',  ar: 'الجامعة التكنولوجية',          en: 'University of Technology',   code: 'UOT', projects: 4, active: 3, completion: 58, color: '#7d611d', kind: KIND_TECH },
  { id: 'cu',  ar: 'الوحدة المركزية — مركز الوزارة', en: 'Central Unit — Ministry Center', code: 'CU', projects: 3, active: 2, completion: 80, color: '#8c2f3a', kind: KIND_UNIT },
  { id: 'sp',  ar: 'المديرية العامة للتجهيز والمشتريات', en: 'Directorate for Supply & Procurement', code: 'SPD', projects: 3, active: 2, completion: 62, color: '#2f5d8c', kind: KIND_SUPPLY },
];

// Full ministry formations catalogue (§2.2.4) — the ~35 government universities plus
// the ministry center & research authority. The four WORKSPACES above carry the seeded
// sample data; this list is the reference lookup for the Formation dropdown & admin.
const FORMATIONS = [
  {ar:'جامعة بغداد',en:'University of Baghdad'},{ar:'الجامعة المستنصرية',en:'Al-Mustansiriyah University'},{ar:'الجامعة التكنولوجية',en:'University of Technology'},{ar:'جامعة البصرة',en:'University of Basrah'},{ar:'جامعة الموصل',en:'University of Mosul'},{ar:'جامعة الكوفة',en:'University of Kufa'},{ar:'جامعة النهرين',en:'Al-Nahrain University'},{ar:'جامعة القادسية',en:'University of Al-Qadisiyah'},{ar:'جامعة بابل',en:'University of Babylon'},{ar:'جامعة تكريت',en:'Tikrit University'},{ar:'جامعة ديالى',en:'University of Diyala'},{ar:'جامعة واسط',en:'University of Wasit'},{ar:'جامعة كربلاء',en:'University of Kerbala'},{ar:'جامعة المثنى',en:'Al-Muthanna University'},{ar:'جامعة ذي قار',en:'University of Thi-Qar'},{ar:'جامعة ميسان',en:'University of Misan'},{ar:'جامعة الأنبار',en:'University of Anbar'},{ar:'جامعة تلعفر',en:'University of Tal Afar'},{ar:'جامعة نينوى',en:'University of Nineveh'},{ar:'الجامعة العراقية',en:'Iraqia University'},{ar:'جامعة كركوك',en:'University of Kirkuk'},{ar:'جامعة الفلوجة',en:'University of Fallujah'},{ar:'جامعة الحمدانية',en:'Al-Hamdaniya University'},{ar:'جامعة القاسم الخضراء',en:'Al-Qasim Green University'},{ar:'جامعة البصرة للنفط والغاز',en:'Basrah University for Oil & Gas'},{ar:'جامعة الكرخ للعلوم',en:'Al-Karkh University of Science'},{ar:'جامعة جابر بن حيان الطبية',en:'Jabir ibn Hayyan Medical University'},{ar:'جامعة ابن سينا للعلوم الطبية',en:'Ibn Sina University of Medical Sciences'},{ar:'جامعة تكنولوجيا المعلومات والاتصالات',en:'University of Information Technology & Communications'},{ar:'جامعة سومر',en:'University of Sumer'},{ar:'جامعة الشطرة',en:'University of Shatra'},{ar:'جامعة الفرات الأوسط التقنية',en:'Middle Euphrates Technical University'},{ar:'الجامعة التقنية الجنوبية',en:'Southern Technical University'},{ar:'الجامعة التقنية الوسطى',en:'Middle Technical University'},{ar:'الجامعة التقنية الشمالية',en:'Northern Technical University'},{ar:'مركز الوزارة',en:'Ministry Center'},{ar:'هيئة البحث والتطوير',en:'Research & Development Authority'},
];

const STATUS = {
  ongoing:   { ar: 'مستمر',   en: 'Ongoing',   cls: 'pill-info' },
  completed: { ar: 'منجز',    en: 'Completed', cls: 'pill-success' },
  stalled:   { ar: 'متأخر',   en: 'Delayed',   cls: 'pill-danger' },
  suspended: { ar: 'متوقف',   en: 'Suspended', cls: 'pill-warning' },
  withdrawn: { ar: 'ملغي',    en: 'Cancelled', cls: 'pill-neutral' },
};

const BRANCHES = { ar: ['الأبنية','الكهرباء','الميكانيك','الطرق','الصيانة'], en: ['Buildings','Electrical','Mechanical','Roads','Maintenance'] };
const EXECUTORS = { ar: ['شركة الفرات','مقاولات الرشيد','دار الهندسة','شركة بابل','الإعمار الحديثة'], en: ['Al-Furat Co.','Al-Rashid Constr.','Dar Al-Handasa','Babel Co.','Modern Reconstruction'] };
// party pools so contractor / consultant / MEP contractor vary per project
const CONTRACTORS = [
  { ar:'شركة الفرات للمقاولات', en:'Al-Furat Contracting', ent:{ar:'شركة الفرات العامة',en:'Al-Furat General Co.'} },
  { ar:'شركة الرشيد للمقاولات', en:'Al-Rashid Contracting', ent:{ar:'شركة الرشيد العامة',en:'Al-Rashid General Co.'} },
  { ar:'شركة بابل للإنشاءات', en:'Babel Construction', ent:{ar:'شركة بابل العامة',en:'Babel General Co.'} },
  { ar:'شركة الإعمار الحديثة', en:'Modern Reconstruction Co.', ent:{ar:'الإعمار الحديثة العامة',en:'Modern Reconstruction General'} },
  { ar:'شركة دجلة للمقاولات', en:'Dijla Contracting', ent:{ar:'شركة دجلة العامة',en:'Dijla General Co.'} },
  { ar:'شركة النهرين للإنشاءات', en:'Al-Nahrain Construction', ent:{ar:'شركة النهرين العامة',en:'Al-Nahrain General Co.'} },
];
const CONSULTANTS = [
  { ar:'المكتب الاستشاري الهندسي', en:'Engineering Consultancy Bureau' },
  { ar:'دار الهندسة للاستشارات', en:'Dar Al-Handasa Consultants' },
  { ar:'مكتب الرافدين الاستشاري', en:'Al-Rafidain Consulting Office' },
  { ar:'بيت الخبرة الهندسي', en:'Engineering House of Expertise' },
  { ar:'المركز الاستشاري للتصاميم', en:'Design Consultancy Center' },
];
const MEP_CONTRACTORS = [
  { ar:'شركة النور للأنظمة الكهروميكانيكية', en:'Al-Noor Electromechanical', ent:{ar:'شركة النور العامة',en:'Al-Noor General Co.'} },
  { ar:'شركة الطاقة المتقدمة', en:'Advanced Power Systems', ent:{ar:'شركة الطاقة العامة',en:'Advanced Power General'} },
  { ar:'شركة بغداد للكهروميكانيك', en:'Baghdad Electromechanical', ent:{ar:'بغداد للكهروميكانيك العامة',en:'Baghdad EM General'} },
];
// equipment-supply vendors — for supply (تجهيز) projects instead of works contractors
const SUPPLIERS = [
  { ar:'شركة الرافدين للتجهيزات العلمية', en:'Al-Rafidain Scientific Supplies', ent:{ar:'الرافدين العامة للتجهيز',en:'Al-Rafidain General Supply'} },
  { ar:'شركة بغداد للتوريدات', en:'Baghdad Supplies Co.', ent:{ar:'بغداد للتوريدات العامة',en:'Baghdad Supplies General'} },
  { ar:'شركة النخبة للأجهزة المختبرية', en:'Elite Lab Equipment Co.', ent:{ar:'النخبة العامة',en:'Elite General Co.'} },
  { ar:'شركة الشرق للتكنولوجيا', en:'Al-Sharq Technology', ent:{ar:'الشرق العامة للتكنولوجيا',en:'Al-Sharq Technology General'} },
];

const PROJECT_NAMES = [
  { ar: 'إنشاء مكتبة كلية الهندسة',      en: 'Engineering College Library' },
  { ar: 'تأهيل مختبرات الحاسوب',         en: 'Computer Labs Rehabilitation' },
  { ar: 'صيانة شبكة المياه',             en: 'Water Network Maintenance' },
  { ar: 'توسعة قاعة المؤتمرات',          en: 'Conference Hall Expansion' },
  { ar: 'بناء قسم داخلي للطلبة',         en: 'Student Dormitory Construction' },
  { ar: 'تأهيل المنظومة الكهربائية',     en: 'Electrical System Upgrade' },
  { ar: 'إعادة تأهيل الملعب الرياضي',    en: 'Sports Field Rehabilitation' },
  { ar: 'إنشاء مجمع المختبرات العلمية',  en: 'Science Labs Complex' },
  { ar: 'صيانة الطرق الداخلية',          en: 'Internal Roads Maintenance' },
  { ar: 'تطوير شبكة الحرم الرقمية',      en: 'Campus Network Development' },
  { ar: 'بناء كلية طب الأسنان',          en: 'Dentistry College Building' },
  { ar: 'تأهيل قاعات المحاضرات',         en: 'Lecture Halls Rehabilitation' },
];

// procurement / equipment-supply project names (used by the 'sp' workspace)
const SUPPLY_PROJECT_NAMES = [
  { ar: 'تجهيز مختبرات الحاسوب للجامعات', en: 'Computer Lab Equipment Supply' },
  { ar: 'تجهيز الأجهزة المختبرية العلمية', en: 'Scientific Lab Devices Supply' },
  { ar: 'تجهيز الأثاث والمعدات الصفّية', en: 'Classroom Furniture & Equipment Supply' },
  { ar: 'تجهيز أجهزة الطاقة والمولدات', en: 'Power & Generator Units Supply' },
  { ar: 'تجهيز معدات المكتبات الرقمية', en: 'Digital Library Equipment Supply' },
];

function rng(seed){ let s = seed; return () => (s = (s*9301+49297)%233280) / 233280; }
function buildProjects(wsId, count) {
  const r = rng(wsId.charCodeAt(0)*7 + wsId.charCodeAt(1)*13 + count);
  const keys = Object.keys(STATUS);
  // per-workspace id base so project ids are UNIQUE across workspaces (no two
  // workspaces share a PRJ-xxxx); digits stay varied for the per-project seeds.
  const wi = Math.max(0, WORKSPACES.findIndex(w => w.id === wsId));
  const out = [];
  for (let i = 0; i < count; i++) {
    const namePool = wsId === 'sp' ? SUPPLY_PROJECT_NAMES : PROJECT_NAMES;
    // unique within a workspace: consecutive indices from a per-workspace offset,
    // so no two projects under the same formation share a name. A throwaway r()
    // keeps the RNG stream position identical (other seeded values unchanged).
    const nameOffset = (wi * 3 + wsId.charCodeAt(1)) % namePool.length;
    r();
    const nm = namePool[(nameOffset + i) % namePool.length];
    const stKey = keys[Math.floor(r()*keys.length)];
    const tech = stKey === 'completed' ? 100 : Math.floor(r()*92)+4;
    const cost = (Math.floor(r()*28)+3) * 50000000;
    const bi = Math.floor(r()*5), ei = Math.floor(r()*5);
    const d = Math.floor(r()*27)+1, mo = Math.floor(r()*5)+1;
    const plannedCost = Math.round(cost / (1.03 + r()*0.15));
    const financialPct = Math.max(0, Math.min(100, Math.round(tech * (0.88 + r() * 0.27))));
    out.push({
      id: `PRJ-${(137 + wi*70 + i*11).toString().padStart(4,'0')}`,
      name: nm, status: stKey, tech, cost, plannedCost, financialPct,
      branchIdx: bi, executorIdx: ei, type: wsId === 'sp' ? 'supply' : 'construction', ws: wsId,
      updated: `2026-0${mo}-${d.toString().padStart(2,'0')}`,
    });
  }
  return out;
}

const ACTIVITY = [
  { who:{ar:'أحمد فؤاد',en:'Ahmed Fouad'}, act:{ar:'حدّث الموقف المالي لـ',en:'updated financials for'}, tgt:'PRJ-0148', t:{ar:'قبل ١٢ دقيقة',en:'12 min ago'} },
  { who:{ar:'ليلى حسن',en:'Layla Hasan'}, act:{ar:'أضافت لجنة فنية إلى',en:'added a technical committee to'}, tgt:'PRJ-0170', t:{ar:'قبل ساعة',en:'1 hr ago'} },
  { who:{ar:'مصطفى علي',en:'Mustafa Ali'}, act:{ar:'رفع ملحق عقد على',en:'uploaded a contract addendum on'}, tgt:'PRJ-0218', t:{ar:'قبل ٣ ساعات',en:'3 hrs ago'} },
  { who:{ar:'سارة كريم',en:'Sara Karim'}, act:{ar:'سجّلت مخاطبة واردة في',en:'logged inbound correspondence in'}, tgt:'PRJ-0288', t:{ar:'أمس',en:'Yesterday'} },
];

const ROLES = [
  { key:'min', ar:'الوزارة',                 en:'Ministry',              users: 4,  plane:'both'  },
  { key:'sys', ar:'مدير النظام المركزي',   en:'Central system admin',  users: 2,  plane:'both'  },
  { key:'dg',  ar:'مدير عام الاعمار والمشاريع', en:'DG Reconstruction & Projects', users: 1, plane:'both' },
  { key:'dep', ar:'مستخدمو الدائرة',       en:'Department users',      users: 18, plane:'ops'   },
  { key:'fh',  ar:'رئيس التشكيل',        en:'Formation head',        users: 19, plane:'both'  },
  { key:'fu',  ar:'مستخدم التشكيل',       en:'Formation user',        users: 74, plane:'ops'   },
  { key:'fin', ar:'العضو المالي',          en:'Financial member',      users: 12, plane:'ops'   },
];

const MATRIX_ENTITIES = {
  ar: ['ملف المشروع','الجهة','العقد','الاستشاري','المقاول','المالية','الجدول الزمني','الإنجاز','إدارة المخاطر','جدول الكميات','الأوامر التغييرية','محاضر الاجتماعات','الوثائق والمخططات','التنبيهات','التقارير','المخوّلين','مستويات الصلاحية','سجل التدقيق'],
  en: ['Project profile','Entity','Contract','Consultant','Contractor','Financial','Schedule','Progress','Risk management','BOQ','Change orders','Meeting minutes','Documents & drawings','Alerts','Reports','Authorized users','Roles','Audit log'],
};
const MATRIX_ACTIONS = {
  ar: ['إضافة','حذف','تعديل','استعراض','بحث','استيراد','اعتماد','مشرف'],
  en: ['Add','Delete','Edit','Browse','Search','Import','Approve','Super'],
};

const AUDIT = [
  { user:{ar:'أحمد فؤاد',en:'Ahmed Fouad'}, action:{ar:'تعديل',en:'Edit'}, entity:{ar:'العقد',en:'Contract'}, tgt:'CNT-0148', ip:'10.4.12.7', t:'2026-06-08 09:41' },
  { user:{ar:'admin',en:'admin'},          action:{ar:'إضافة مستخدم',en:'Create user'}, entity:{ar:'المخوّلين',en:'Users'}, tgt:'USR-241', ip:'10.4.12.2', t:'2026-06-08 09:12' },
  { user:{ar:'ليلى حسن',en:'Layla Hasan'},  action:{ar:'حذف',en:'Delete'}, entity:{ar:'مرفق',en:'Attachment'}, tgt:'ATT-5521', ip:'10.4.13.9', t:'2026-06-07 16:50' },
  { user:{ar:'مصطفى علي',en:'Mustafa Ali'}, action:{ar:'تسجيل دخول',en:'Sign-in'}, entity:{ar:'الجلسة',en:'Session'}, tgt:'—', ip:'10.4.12.31', t:'2026-06-07 08:03' },
  { user:{ar:'سارة كريم',en:'Sara Karim'},  action:{ar:'تعديل صلاحيات',en:'Permission change'}, entity:{ar:'صلاحيات المستخدمين',en:'User permissions'}, tgt:'USR-188', ip:'10.4.12.2', t:'2026-06-06 14:22' },
];

const CURRENT_USER = {
  name: { ar: 'أحمد فؤاد جواد', en: 'Ahmed Fouad Jawad' },
  initials: { ar: 'أ', en: 'A' },
  role: { ar: 'مدير', en: 'Director' },
  email: 'ahmed.fouad@mohesr.gov.iq',
  unit: { ar: 'دائرة الإعمار و المشاريع › القسم الهندسي', en: 'Reconstruction & Projects › Engineering Section' },
  isAdmin: true,
  assignments: [
    { role:{ar:'مدير',en:'Director'}, scope:{ar:'الوزارة',en:'Enterprise (Ministry)'}, plane:'both' },
    { role:{ar:'عضو',en:'Member'},   scope:{ar:'مشروع HQ — الوحدة المركزية',en:'HQ project — Central Unit'}, plane:'ops' },
  ],
};

const ADMIN_GROUPS = [
  { id:'g1', name:{ar:'دائرة الإعمار و المشاريع',en:'Reconstruction & Projects Dept.'}, type:{ar:'دائرة',en:'Department'}, level:0, owner:'ent', members:34 },
  { id:'g2', name:{ar:'القسم الهندسي',en:'Engineering Section'}, type:{ar:'قسم',en:'Section'}, level:1, owner:'ent', members:21 },
  { id:'g3', name:{ar:'شعبة الأبنية',en:'Buildings Branch'}, type:{ar:'شعبة',en:'Branch'}, level:2, owner:'ent', members:8 },
  { id:'g4', name:{ar:'شعبة الكهرباء',en:'Electrical Branch'}, type:{ar:'شعبة',en:'Branch'}, level:2, owner:'ent', members:6 },
  { id:'g5', name:{ar:'شعبة الميكانيك',en:'Mechanical Branch'}, type:{ar:'شعبة',en:'Branch'}, level:2, owner:'ent', members:5 },
  { id:'g6', name:{ar:'قسم المشاريع — جامعة بغداد',en:'Projects Section — UoB'}, type:{ar:'قسم',en:'Section'}, level:1, owner:'ub', members:12 },
  { id:'g7', name:{ar:'لجنة تدقيق فنية (مشتركة)',en:'Technical Audit Cmte (cross-unit)'}, type:{ar:'لجنة',en:'Committee'}, level:2, owner:'ent', members:4 },
];

const ADMIN_PROJECTS = [
  { id:'PRJ-0148', name:{ar:'إنشاء مكتبة كلية الهندسة',en:'Engineering Library'}, ws:'ub', members:7, status:'ongoing' },
  { id:'PRJ-0159', name:{ar:'تأهيل مختبرات الحاسوب',en:'Computer Labs Rehab'}, ws:'ub', members:4, status:'completed' },
  { id:'PRJ-0207', name:{ar:'صيانة شبكة المياه',en:'Water Network Maintenance'}, ws:'nu', members:5, status:'stalled' },
  { id:'PRJ-0277', name:{ar:'توسعة قاعة المؤتمرات',en:'Conference Hall Expansion'}, ws:'tu', members:6, status:'suspended' },
  { id:'PRJ-0347', name:{ar:'مجمع المختبرات العلمية — مشترك',en:'Science Labs (shared)'}, ws:'cu', members:9, status:'ongoing', shared:true },
];

const ASSIGNMENTS = [
  { principal:{ar:'أحمد فؤاد جواد',en:'Ahmed Fouad'}, ptype:'user', role:{ar:'مدير',en:'Director'}, scope:'enterprise', target:{ar:'النظام',en:'Enterprise'}, plane:'both' },
  { principal:{ar:'القسم الهندسي',en:'Engineering Section'}, ptype:'group', role:{ar:'موظف',en:'Employee'}, scope:'workspace', target:{ar:'جامعة بغداد',en:'University of Baghdad'}, plane:'ops' },
  { principal:{ar:'ليلى حسن محمود',en:'Layla Hasan'}, ptype:'user', role:{ar:'مشرف قسم',en:'Section supervisor'}, scope:'workspace', target:{ar:'جامعة بغداد',en:'University of Baghdad'}, plane:'both' },
  { principal:{ar:'مصطفى علي كريم',en:'Mustafa Ali'}, ptype:'user', role:{ar:'عضو',en:'Member'}, scope:'project', target:{ar:'PRJ-0347 (مشترك)',en:'PRJ-0347 (shared)'}, plane:'ops' },
  { principal:{ar:'شعبة الأبنية',en:'Buildings Branch'}, ptype:'group', role:{ar:'موظف',en:'Employee'}, scope:'project', target:{ar:'PRJ-0148',en:'PRJ-0148'}, plane:'ops' },
  { principal:{ar:'سارة كريم عبد',en:'Sara Karim'}, ptype:'user', role:{ar:'مشرف دائرة',en:'Dept. supervisor'}, scope:'workspace', target:{ar:'الجامعة المستنصرية',en:'Al-Mustansiriyah'}, plane:'both' },
];

const PROJECT_MODULES = [
  { id:'overview',     key:'mod_overview',     icon:'dashboard',      perm:true },
  { id:'information',  key:'mod_information',  icon:'badge',          perm:true },
  { id:'contract',     key:'mod_contract',     icon:'description',    perm:true },
  { id:'boq',          key:'mod_boq',          icon:'list_alt',       perm:true },
  { id:'schedule',     key:'mod_schedule',     icon:'calendar_month', perm:true },
  { id:'progress',     key:'mod_progress',     icon:'trending_up',    perm:true },
  { id:'risk',         key:'mod_risk',         icon:'warning',        perm:true },
  { id:'financial',    key:'mod_financials',   icon:'payments',       perm:true },
  { id:'changeorders', key:'mod_changeorders', icon:'sync_alt',       perm:true },
  { id:'model',        key:'mod_model',        icon:'deployed_code',  perm:true },
  { id:'meetings',     key:'mod_meetings',     icon:'groups',         perm:true },
  { id:'documents',    key:'mod_documents',    icon:'folder_open',    perm:true },
  { id:'alerts',       key:'mod_alerts',       icon:'notifications',  perm:true },
  { id:'reports',      key:'mod_reports',      icon:'assessment',     perm:true },
  { id:'audit',        key:'mod_audit',        icon:'history',        perm:true },
];

// ---------- readiness states (IA §4) ----------
const READINESS = {
  notstarted: { ar:'لم يبدأ',            en:'Not Started',    cls:'r-neutral', icon:'radio_button_unchecked' },
  inprogress: { ar:'قيد الإنجاز',        en:'In Progress',    cls:'r-info',    icon:'pending' },
  ready:      { ar:'جاهز للمراجعة',    en:'Ready for Review',cls:'r-warn',   icon:'rate_review' },
  approved:   { ar:'معتمد',              en:'Approved',       cls:'r-ok',      icon:'verified' },
  returned:   { ar:'مُعاد بملاحظات', en:'Returned',      cls:'r-ret',     icon:'undo' },
  blocked:    { ar:'محجوب',              en:'Blocked',        cls:'r-block',   icon:'block' },
  na:         { ar:'غير منطبق',         en:'Not Applicable', cls:'r-na',      icon:'remove' },
};

// deterministic per-module readiness for a project (demo)
function buildReadiness(p) {
  const r = rng((p ? p.id.charCodeAt(6) : 1) * 13 + 5);
  const tech = p ? p.tech : 60, st = p ? p.status : 'ongoing';
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const flow = tech >= 90 ? 'approved' : tech >= 40 ? 'inprogress' : tech > 0 ? 'ready' : 'notstarted';
  return {
    overview:     'approved',
    information:  st === 'withdrawn' ? 'blocked' : 'approved',
    contract:     st === 'suspended' ? 'returned' : 'approved',
    boq:          tech > 0 ? 'approved' : 'ready',
    schedule:     st === 'stalled' ? 'returned' : flow,
    progress:     flow,
    risk:         st === 'stalled' || st === 'suspended' ? 'ready' : 'inprogress',
    financial:    tech >= 30 ? 'inprogress' : 'ready',
    changeorders: st === 'stalled' ? 'ready' : pick(['approved','inprogress','na']),
    model:        pick(['inprogress','notstarted','ready']),
    meetings:     'inprogress',
    documents:    'inprogress',
    alerts:       st === 'stalled' || st === 'suspended' ? 'blocked' : 'inprogress',
    reports:      'approved',
    audit:        'approved',
  };
}

// ---------- lookups for the unified data dictionary (Business Vision Phase 1 §8) ----------
const FUNDING_TYPES = [{ar:'الموازنة الاستثمارية',en:'Investment budget'},{ar:'الموازنة الجارية',en:'Operating budget'},{ar:'صندوق التعليم العالي',en:'Higher-education fund'},{ar:'تنمية الأقاليم',en:'Regional development'},{ar:'البرنامج الحكومي',en:'Government programme'},{ar:'المنح والقروض الدولية',en:'Intl. grants & loans'},{ar:'الاتفاقيات الدولية',en:'Intl. agreements'},{ar:'مجالس المحافظات',en:'Provincial councils'},{ar:'التنفيذ المباشر',en:'Direct execution'},{ar:'التنفيذ أمانة',en:'Trust execution'}];
const PROJECT_TYPES = [{ar:'تجهيز أجهزة ومعدات',en:'Equipment supply'},{ar:'مشروع تشغيلي',en:'Operational'},{ar:'بنى تحتية',en:'Infrastructure'},{ar:'تصاميم ودراسات فنية',en:'Design & studies'},{ar:'تنفيذ وبناء وتشييد',en:'Execution & construction'},{ar:'استثماري وتنموي',en:'Investment & development'},{ar:'تطوير قدرات بحثية ومختبرات',en:'Research & labs'},{ar:'تنفيذ أمانة',en:'Trust execution'}];
const PROJECT_STAGES = [{ar:'دراسة',en:'Study'},{ar:'تصميم',en:'Design'},{ar:'إعلان وإحالة',en:'Tender & award'},{ar:'لم يباشر به',en:'Not started'},{ar:'تنفيذ',en:'Execution'},{ar:'استلام أولي',en:'Preliminary handover'},{ar:'استلام نهائي',en:'Final handover'},{ar:'منجز',en:'Completed'},{ar:'سحب عمل',en:'Work withdrawn'},{ar:'متوقف',en:'Suspended'},{ar:'تجميد',en:'Frozen'},{ar:'تسوية حسابات',en:'Accounts settlement'}];
const CONTRACT_STATUS_LIST = [{ar:'إعلان وإحالة',en:'Tender & award'},{ar:'لم يباشر به',en:'Not started'},{ar:'تنفيذ مستمر',en:'In execution'},{ar:'موقوف مؤقتاً بأمر إداري',en:'Suspended by admin order'},{ar:'سحب عمل',en:'Work withdrawn'},{ar:'متوقف',en:'Halted'},{ar:'تجميد',en:'Frozen'},{ar:'تسوية حسابات',en:'Accounts settlement'},{ar:'منجز',en:'Completed'}];
// progress-ordered stages only (no administrative states) — used to derive the
// execution stage from % complete; administrative stages come from project status
const PROGRESS_STAGES = [{ar:'دراسة',en:'Study'},{ar:'تصميم',en:'Design'},{ar:'إعلان وإحالة',en:'Tender & award'},{ar:'لم يباشر به',en:'Not started'},{ar:'تنفيذ',en:'Execution'},{ar:'استلام أولي',en:'Preliminary handover'},{ar:'استلام نهائي',en:'Final handover'},{ar:'منجز',en:'Completed'}];
// equipment-supply execution stages (§2.2.1 adapted for تجهيز)
const SUPPLY_STAGES = [{ar:'إعلان وإحالة',en:'Tender & award'},{ar:'فتح الاعتماد المستندي',en:'LC opened'},{ar:'قيد التوريد والتجهيز',en:'Supplying'},{ar:'الاستلام المخزني',en:'Warehouse receipt'},{ar:'الاستلام الأولي',en:'Preliminary receipt'},{ar:'التوزيع على الجهات',en:'Distribution'},{ar:'منجز',en:'Completed'}];
const PROJECT_STATUS3 = [{ar:'قيد التنفيذ',en:'In progress'},{ar:'منجز',en:'Completed'},{ar:'متوقف',en:'Suspended'}];
const SPEND_CATS = [{ar:'تشغيلي',en:'Operational'},{ar:'استثماري',en:'Capital'},{ar:'صيانة',en:'Maintenance'}];
const PRIORITIES = [{ar:'عالية',en:'High'},{ar:'متوسطة',en:'Medium'},{ar:'منخفضة',en:'Low'}];
const REGIONS = { ar:['بغداد','البصرة','نينوى','ديالى','الأنبار','كربلاء','بابل','واسط','القادسية','ذي قار','كركوك'], en:['Baghdad','Basrah','Nineveh','Diyala','Anbar','Kerbala','Babylon','Wasit','Al-Qadisiyah','Thi-Qar','Kirkuk'] };
const COMPONENTS = [{ar:'المكوّن الإنشائي',en:'Structural component'},{ar:'المكوّن الكهربائي',en:'Electrical component'},{ar:'المكوّن الميكانيكي',en:'Mechanical component'}];
const DELAY_REASONS = [{ar:'تأخر تجهيز المواد',en:'Material supply delay'},{ar:'ظروف مناخية',en:'Weather conditions'},{ar:'تغييرات تصميمية',en:'Design changes'},{ar:'تأخر الدفعات المالية',en:'Payment delays'}];
const DOC_TYPES = [{ar:'مخطط إنشائي',en:'Structural drawing'},{ar:'مخطط كهربائي',en:'Electrical drawing'},{ar:'مخطط ميكانيكي',en:'Mechanical drawing'}];
/* the classification a document register is filed under — the tree in L18 */
const DOC_DISCIPLINES = [
  { key:'arch',  ar:'معماري',          en:'Architectural', pfx:'AR', tyAr:'مخطط معماري',   tyEn:'Architectural drawing' },
  { key:'struc', ar:'إنشائي',          en:'Structural',    pfx:'ST', tyAr:'مخطط إنشائي',   tyEn:'Structural drawing' },
  { key:'elec',  ar:'كهربائي',         en:'Electrical',    pfx:'EL', tyAr:'مخطط كهربائي',  tyEn:'Electrical drawing' },
  { key:'mech',  ar:'ميكانيكي',        en:'Mechanical',    pfx:'ME', tyAr:'مخطط ميكانيكي', tyEn:'Mechanical drawing' },
  { key:'civil', ar:'مدني وبنى تحتية', en:'Civil & infrastructure', pfx:'CV', tyAr:'مخطط مدني', tyEn:'Civil drawing' },
  /* a report is not a drawing, and calling it one is the kind of thing a
     ministry reviewer notices before anything else on the page */
  { key:'doc',   ar:'تقارير ومراسلات', en:'Reports & correspondence', pfx:'DC', tyAr:'وثيقة فنية', tyEn:'Technical document' },
];
const DOC_TITLES = {
  arch:  [['مخطط الطوابق العامة','General floor plans'],['الواجهات والمقاطع','Elevations & sections'],['تفاصيل التشطيبات','Finishes details']],
  struc: [['مخطط الأساسات','Foundation layout'],['تفاصيل الأعمدة والجسور','Column & beam details'],['مخطط الأسقف','Slab layout']],
  elec:  [['مخطط التغذية الرئيسية','Main power distribution'],['مخطط الإنارة','Lighting layout'],['أنظمة الإنذار والاتصالات','Alarm & communications']],
  mech:  [['مخطط التكييف والتهوية','HVAC layout'],['مخطط التمديدات الصحية','Plumbing layout'],['مكافحة الحريق','Fire fighting']],
  civil: [['مخطط الموقع العام','Site layout'],['شبكات الخدمات الخارجية','External services network'],['أعمال الطرق والساحات','Roads & paving works']],
  doc:   [['تقرير الفحص الموقعي','Site inspection report'],['كتاب إحالة مخططات','Drawing transmittal letter'],['محضر اجتماع فني','Technical meeting minutes']],
};
const DOC_STATUS = { draft:{ar:'مسوّدة',en:'Draft'}, approved:{ar:'معتمد',en:'Approved'}, rejected:{ar:'مرفوض',en:'Rejected'} };
const VO_STATUS = { pending:{ar:'قيد الاعتماد',en:'Pending'}, approved:{ar:'معتمد',en:'Approved'}, rejected:{ar:'مرفوض',en:'Rejected'} };
const GUARANTEE_TYPES = [{ar:'ضمان حسن التنفيذ',en:'Performance guarantee'},{ar:'ضمان الدفعة المقدمة',en:'Advance payment guarantee'}];

function buildSchedule(p) {
  const r = rng((p ? p.id.charCodeAt(6) : 1) * 11 + 7);
  const awardYear = 2025 + Math.floor(r()*2);  // recent starts so projects straddle the 2026 data date (varied, real mid-flight progress)
  const start = `${awardYear}-0${1+Math.floor(r()*8)}-${(3+Math.floor(r()*24)).toString().padStart(2,'0')}`;
  const plannedFinish = `${awardYear+1+Math.floor(r()*2)}-0${1+Math.floor(r()*8)}-${(3+Math.floor(r()*24)).toString().padStart(2,'0')}`;
  const expectedFinish = `${awardYear+1+Math.floor(r()*2)}-1${Math.floor(r()*2)}-${(3+Math.floor(r()*24)).toString().padStart(2,'0')}`;
  return { awardYear, start, plannedFinish, expectedFinish };
}

function buildProjectDetail(p, lang) {
  const r = rng((p ? p.id.charCodeAt(6) : 1) * 11 + 7);
  const F = (ar, en, value, opt) => { opt = opt || {}; return { label: { ar, en }, value, required: !!opt.required, proposed: !!opt.proposed, mono: !!opt.mono, unit: opt.unit || '', options: opt.options || null, auto: !!opt.auto }; };
  const O = list => list.map(x => x[lang]);
  // ---- per-project parties (derived, not static) ----
  const wsId2 = p && p.ws ? (typeof p.ws === 'string' ? p.ws : p.ws.id) : null;
  const wsRec = wsId2 ? WORKSPACES.find(w => w.id === wsId2) : null;
  const isSupplyProj = p && p.type === 'supply';
  // beneficiary = the project's own formation/university (supply projects serve many)
  const benefObj = isSupplyProj ? { ar: 'جهات مستفيدة متعددة (توزيع)', en: 'Multiple beneficiaries (distributed)' }
    : wsRec ? { ar: wsRec.ar, en: wsRec.en } : { ar: 'جامعة بغداد', en: 'University of Baghdad' };
  const benef = benefObj[lang];
  const cIdx = p ? (p.executorIdx + p.id.charCodeAt(7)) % CONTRACTORS.length : 0;
  const conIdx = p ? (p.branchIdx + p.id.charCodeAt(6)) % CONSULTANTS.length : 0;
  const mepIdx = p ? (p.id.charCodeAt(7) + p.id.charCodeAt(6)) % MEP_CONTRACTORS.length : 0;
  // supply projects contract with equipment vendors + a technical inspection committee,
  // not works contractors / engineering consultants
  const contractorRec = isSupplyProj ? SUPPLIERS[cIdx % SUPPLIERS.length] : CONTRACTORS[cIdx];
  const consultantRec = isSupplyProj ? { ar:'لجنة الفحص والاستلام الفني', en:'Technical inspection & receipt committee' } : CONSULTANTS[conIdx];
  const mepRec = isSupplyProj ? SUPPLIERS[(mepIdx + 1) % SUPPLIERS.length] : MEP_CONTRACTORS[mepIdx];
  // contract package names & components differ by project nature
  const c1Meta = isSupplyProj ? { ar:'عقد التجهيز الرئيسي', en:'Main supply contract' } : { ar:'عقد الأعمال المدنية', en:'Civil works contract' };
  const c2Meta = isSupplyProj ? { ar:'عقد التركيب والتشغيل', en:'Installation & commissioning contract' } : { ar:'عقد الأعمال الكهروميكانيكية', en:'Electromechanical works contract' };
  const c1Comp = isSupplyProj ? { ar:'مكوّن التوريد والتجهيز', en:'Supply & equipping component' } : null;
  const c2Comp = isSupplyProj ? { ar:'مكوّن التركيب والتشغيل', en:'Installation & commissioning component' } : COMPONENTS[1][lang];
  const phoneOf = (base) => '+964 7' + (70 + (cIdx % 3)) + ' ' + (100 + cIdx * 37 % 900) + ' ' + (1000 + conIdx * 111 % 9000);
  const cost = p ? p.cost : 1000000000;
  /* one project, one story: the money spent is the money the delivered work
     accounts for. Drawing it independently put 62% paid against 17% built. */
  const finPct0 = p && p.financialPct != null ? p.financialPct : Math.max(0, (p ? p.tech : 60) - 8);
  const disbursed = Math.round(cost * finPct0 / 100);
  const due = Math.round(cost * (0.05 + r()*0.15));
  const remaining = cost - disbursed;
  const plannedCost = p && p.plannedCost ? p.plannedCost : Math.round(cost / 1.08);
  const financialPct = finPct0;
  const { awardYear, start: startDate, plannedFinish, expectedFinish } = buildSchedule(p);
  // execution stage: administrative states come from status; otherwise derive from
  // % complete over the PROGRESS stages (supply projects use supply stages).
  const stageList = isSupplyProj ? SUPPLY_STAGES : PROGRESS_STAGES;
  const stage = (p && p.status === 'suspended') ? { ar:'متوقف', en:'Suspended' }
    : (p && p.status === 'withdrawn') ? { ar:'سحب عمل', en:'Work withdrawn' }
    : stageList[Math.min(stageList.length - 1, Math.max(0, Math.round((p?p.tech:60) / 100 * (stageList.length - 1))))];
  const regionIdx = Math.floor(r()*REGIONS.ar.length);
  // a distributed supply project isn't tied to one region/coordinates
  const region = isSupplyProj ? { ar:'متعدد المواقع (توزيع)', en:'Multiple locations (distributed)' } : { ar: REGIONS.ar[regionIdx], en: REGIONS.en[regionIdx] };
  const projStatus3 = p && p.status === 'completed' ? PROJECT_STATUS3[1] : p && p.status === 'suspended' ? PROJECT_STATUS3[2] : PROJECT_STATUS3[0];

  const profile = {
    fields: [
      F('اسم المشروع','Project name', p ? p.name[lang] : '—', {required:true}),
      F('رمز المشروع','Project code', 'PC-' + (p?p.id.slice(4):'0000'), {proposed:true, mono:true}),
      F('نوع المشروع','Project type', isSupplyProj ? PROJECT_TYPES[0][lang] : PROJECT_TYPES[(p?p.id.charCodeAt(6):0) % PROJECT_TYPES.length][lang], {required:true, options:O(PROJECT_TYPES)}),
      F('نوع التمويل','Funding type', FUNDING_TYPES[Math.floor(r()*FUNDING_TYPES.length)][lang], {required:true, options:O(FUNDING_TYPES)}),
      F('سنة الإدراج','Award year', awardYear, {required:true, mono:true}),
      F('مرحلة تنفيذ المشروع','Execution stage', stage[lang], {required:true, options: isSupplyProj ? O(SUPPLY_STAGES) : O(PROJECT_STAGES)}),
      F('حالة المشروع','Project status', projStatus3[lang], {required:true, options:O(PROJECT_STATUS3)}),
      F('إحداثيات الموقع','Coordinates', isSupplyProj ? (lang==='ar'?'غير مرتبط بموقع واحد':'Not tied to one site') : ('33.3' + (regionIdx%9) + '°N, 44.3' + (regionIdx%7) + '°E'), {mono:!isSupplyProj}),
      F('المنطقة الجغرافية','Region', region[lang], {proposed:true, options: isSupplyProj ? [region[lang]] : REGIONS[lang]}),
      F('أولوية المشروع','Priority', PRIORITIES[Math.floor(r()*PRIORITIES.length)][lang], {proposed:true, options:O(PRIORITIES)}),
      F('الفئة الإنفاقية','Spending category', SPEND_CATS[Math.floor(r()*SPEND_CATS.length)][lang], {proposed:true, options:O(SPEND_CATS)}),
      F('رقم اعتماد الموازنة','Budget approval no.', 'BA-'+(2000+Math.floor(r()*900)), {proposed:true, mono:true}),
    ],
    description: isSupplyProj
      ? (lang==='ar' ? 'مشروع تجهيز أجهزة ومعدات يشمل عدة فقرات مستقلة تُوزَّع كمياتها على جامعات وجهات مستفيدة متعددة، مع متابعة التوريد والاستلام المخزني والأولي.' : 'An equipment-supply project of several independent line items whose quantities are distributed across multiple universities, tracking supply and warehouse/preliminary receipt.')
      : (lang==='ar' ? 'مشروع ضمن خطة تطوير البنية التحتية للجامعة، يشمل أعمال إنشائية وتجهيزات فنية.' : 'A project within the university infrastructure plan, covering structural works and technical fit-out.'),
    editLog: [
      { by: 'أحمد فؤاد', date: '2026-05-02', changes: [
        { field: lang==='ar'?'مرحلة التنفيذ':'Execution stage', from: stageList[Math.max(0, stageList.findIndex(sx=>sx.en===stage.en) - 1)][lang], to: stage[lang] },
        { field: lang==='ar'?'حالة المشروع':'Project status', from: PROJECT_STATUS3[0][lang], to: projStatus3[lang] },
      ]},
      { by: 'ليلى حسن', date: '2026-03-19', changes: [
        { field: lang==='ar'?'أولوية المشروع':'Priority', from: lang==='ar'?'منخفضة':'Low', to: PRIORITIES[Math.floor(r()*PRIORITIES.length)][lang] },
        { field: lang==='ar'?'الفئة الإنفاقية':'Spending category', from: SPEND_CATS[0][lang], to: SPEND_CATS[Math.floor(r()*SPEND_CATS.length)][lang] },
      ]},
      { by: 'سارة كريم', date: '2026-01-27', changes: [
        { field: lang==='ar'?'المنطقة الجغرافية':'Region', from: REGIONS[lang][(regionIdx+1)%REGIONS[lang].length], to: region[lang] },
      ]},
    ],
  };

  const entity = {
    fields: [
      F('اسم التشكيل','Formation', lang==='ar'?'وزارة التعليم العالي والبحث العلمي':'Ministry of Higher Education & Scientific Research', {required:true}),
      F('الجامعة / الجهة المستفيدة','University / Beneficiary', benef, {required:true}),
      F('الهيكل التنظيمي','Org hierarchy', isSupplyProj ? (lang==='ar'?'دائرة الإعمار والمشاريع › قسم التجهيز والمشتريات':'Reconstruction & Projects Dept. › Supply & Procurement Section') : ((lang==='ar'?'دائرة الإعمار والمشاريع › القسم الهندسي › ':'Reconstruction & Projects Dept. › Engineering Section › ') + window.EPM.BRANCHES[lang][p?p.branchIdx:0]), {required:true}),
    ],
    editLog: [
      { by: 'مصطفى علي', date: '2026-02-14', changes: [
        { field: lang==='ar'?'الجامعة / الجهة المستفيدة':'University / Beneficiary', from: lang==='ar'?'جامعة الموصل':'University of Mosul', to: benef },
      ]},
    ],
  };

  const contractCost = cost;
  const awardAmt = Math.round(contractCost * (0.9 + r()*0.05));
  const spentAward = Math.round(awardAmt * (financialPct/100));
  const reserveAmt = Math.round(contractCost * 0.05);
  const spentReserve = Math.round(reserveAmt * (financialPct/120));
  const supervisionAmt = Math.round(contractCost * (0.02 + r() * 0.02));
  const spentSupervision = Math.round(supervisionAmt * (financialPct / 100));
  const totalSpent = spentAward + spentReserve + spentSupervision;
  const contractCostTotal = awardAmt + reserveAmt + supervisionAmt;
  const cumulativeContractSpend = spentAward + spentReserve;
  const durationDays = Math.max(1, Math.round((new Date(plannedFinish) - new Date(startDate)) / 86400000));
  // Liquidated-damages rate fixed per contract in the tender conditions — statutory
  // band 10%–25% of contract value (Gov. Contract Regs 2/2014, revised 2017). Most
  // contracts adopt the 10% floor; a few carry a higher agreed rate.
  const penaltyRate = [0.10, 0.10, 0.15, 0.10, 0.20, 0.10, 0.12, 0.10][(p ? (p.id.charCodeAt(6) + p.id.charCodeAt(7)) : 0) % 8];
  const dailyPenalty = Math.round(contractCostTotal * penaltyRate / durationDays);
  const extensionsCount = p && p.status === 'stalled' ? 1 + Math.floor(r()*2) : Math.floor(r()*2);
  const contract = {
    status: p ? p.status : 'ongoing',
    code: 'CNT-' + (p ? p.id.slice(4) : '0001'),
    raw: { start: startDate, finish: plannedFinish, contractCost: contractCostTotal, awardAmt, spentAward, reserveAmt, spentReserve, supervisionAmt, spentSupervision, totalSpent, physicalPct: (p?p.tech:0), financialPct, penaltyRate },
    fields: [
      F('اسم العقد','Contract name', (isSupplyProj ? (lang==='ar'?'عقد تجهيز ':'Supply contract — ') : (lang==='ar'?'عقد تنفيذ ':'Execution contract — ')) + (p?p.name[lang]:''), {required:true}),
      F('رمز العقد','Contract code', 'CNT-'+(p?p.id.slice(4):'0001'), {mono:true, auto:true}),
      F('تاريخ المباشرة','Start date', startDate, {required:true, mono:true}),
      F('رقم الوارد الرسمي','Official incoming no.', 'IN-'+(4800+Math.floor(r()*400)), {required:true, mono:true}),
      F('تاريخ الوارد الرسمي','Official incoming date', startDate, {required:true, mono:true}),
      F('تاريخ الإنجاز','Finish date', plannedFinish, {required:true, mono:true}),
      F('المكوّن','Component', isSupplyProj ? c1Comp[lang] : COMPONENTS[Math.floor(r()*COMPONENTS.length)][lang], {options: isSupplyProj ? [c1Comp[lang], c2Comp[lang]] : O(COMPONENTS)}),
      F('مبلغ الإحالة','Award amount', window.fmtNum(awardAmt), {unit:'IQD', mono:true}),
      F('المصروف من الإحالة','Spent from award', window.fmtNum(spentAward), {unit:'IQD', mono:true, auto:true}),
      F('مبلغ الاحتياط','Reserve amount', window.fmtNum(reserveAmt), {unit:'IQD', mono:true}),
      F('المصروف من الاحتياط','Spent from reserve', window.fmtNum(spentReserve), {unit:'IQD', mono:true, auto:true}),
      F('مبلغ الإشراف والمراقبة','Supervision & monitoring amount', window.fmtNum(supervisionAmt), {unit:'IQD', mono:true}),
      F('المصروف من الإشراف والمراقبة','Spent from supervision & monitoring', window.fmtNum(spentSupervision), {unit:'IQD', mono:true, auto:true}),
      F('كلفة العقد الكلي','Total spent (contract)', window.fmtNum(totalSpent), {unit:'IQD', mono:true, auto:true}),
      F('المصروف التراكمي للعقد','Cumulative contract spend', window.fmtNum(cumulativeContractSpend), {unit:'IQD', mono:true, auto:true}),
      F('نسبة الإنجاز المادي للعقد','Contract physical %', (p?p.tech:0)+'%', {mono:true}),
      F('نسبة الإنجاز المالي للعقد','Contract financial %', financialPct+'%', {mono:true}),
      F('مدة العقد بالأيام','Duration (days)', durationDays, {proposed:true, mono:true}),
      F('نسبة الغرامة التأخيرية','Delay-penalty rate', (penaltyRate*100).toFixed(0)+'%', {required:true, mono:true, options:['10%','12%','15%','20%','25%']}),
      F('الغرامة اليومية','Daily delay penalty', window.fmtNum(dailyPenalty), {unit:(lang==='ar'?'IQD/يوم':'IQD/day'), proposed:true, mono:true, auto:true}),
      F('التمديدات الزمنية','Time extensions', extensionsCount + (lang==='ar'?' تمديد':' extension(s)'), {proposed:true}),
      F('حالة العقد (الموسّعة)','Contract status (extended)', CONTRACT_STATUS_LIST[(p&&p.status==='suspended')?3:(p&&p.status==='stalled')?5:2][lang], {proposed:true, options:O(CONTRACT_STATUS_LIST)}),
      F('الضمانات','Guarantees', GUARANTEE_TYPES[0][lang] + ' — ' + window.fmtNum(Math.round(contractCost*0.03)) + (lang==='ar'?' د.ع':' IQD'), {proposed:true}),
    ],
    editLog: [
      { by: 'أحمد فؤاد', date: '2026-04-06', changes: [
        { field: lang==='ar'?'التمديدات الزمنية':'Time extensions', from: Math.max(0,extensionsCount-1) + (lang==='ar'?' تمديد':' extension(s)'), to: extensionsCount + (lang==='ar'?' تمديد':' extension(s)') },
        { field: lang==='ar'?'مبلغ الإحالة':'Award amount', from: window.fmtNum(Math.round(awardAmt*0.97)), to: window.fmtNum(awardAmt) },
      ]},
      { by: 'ليلى حسن', date: '2026-01-11', changes: [
        { field: lang==='ar'?'المكوّن':'Component', from: COMPONENTS[0][lang], to: COMPONENTS[Math.floor(r()*COMPONENTS.length)][lang] },
      ]},
    ],
  };

  const consultant = {
    fields: [
      F('اسم الشركة الاستشارية','Consultant name', consultantRec[lang], {required:true}),
      F('مبلغ الإشراف والمراقبة','Supervision amount', window.fmtNum(Math.round(contractCost*(0.02+r()*0.02))), {unit:'IQD', mono:true}),
      F('المصروف من الإشراف','Spent from supervision', window.fmtNum(Math.round(contractCost*(0.02+r()*0.02)*(financialPct/100))), {unit:'IQD', mono:true}),
    ],
    editLog: [
      { by: 'سارة كريم', date: '2026-03-02', changes: [
        { field: lang==='ar'?'مبلغ الإشراف والمراقبة':'Supervision amount', from: window.fmtNum(Math.round(contractCost*0.019)), to: window.fmtNum(Math.round(contractCost*(0.02+r()*0.02))) },
      ]},
    ],
  };

  const contractor = {
    fields: [
      F('اسم المقاول','Contractor name', contractorRec[lang], {required:true}),
      F('الجهة المنفذة','Executing entity', contractorRec.ent[lang], {required:true}),
      F('بيانات التواصل','Contact info', phoneOf(), {mono:true}),
    ],
    editLog: [
      { by: 'أحمد فؤاد', date: '2026-02-27', changes: [
        { field: lang==='ar'?'بيانات التواصل':'Contact info', from: '+964 770 111 2222', to: '+964 770 000 0000' },
      ]},
    ],
  };

  // ---- multiple contracts per project (civil + electromechanical packages) ----
  const c2cost = Math.round(contractCost * 0.34);
  const c2award = Math.round(c2cost * 0.94);
  const c2fin = Math.max(0, financialPct - 12);
  const c2phys = Math.max(0, (p?p.tech:0) - 10);
  const c2spent = Math.round(c2award * (c2fin/100));
  const c2reserve = Math.round(c2cost * 0.05);
  const c2spentReserve = Math.round(c2reserve*(c2fin/140));
  const c2supervision = Math.round(c2cost * 0.03);
  const c2spentSupervision = Math.round(c2supervision * (c2fin/100));
  const c2totalSpent = c2spent + c2spentReserve + c2spentSupervision;
  const c2costTotal = c2award + c2reserve + c2supervision;
  const contract2 = {
    key: 'mep',
    name: c2Meta[lang],
    status: p && p.status === 'completed' ? 'completed' : p && p.status === 'suspended' ? 'suspended' : 'ongoing',
    code: 'CNT-' + (p ? p.id.slice(4) : '0001') + '-EM',
    raw: { start: startDate, finish: plannedFinish, contractCost: c2costTotal, awardAmt: c2award, spentAward: c2spent, reserveAmt: c2reserve, spentReserve: c2spentReserve, supervisionAmt: c2supervision, spentSupervision: c2spentSupervision, totalSpent: c2totalSpent, physicalPct: c2phys, financialPct: c2fin, penaltyRate },
    fields: [
      F('اسم العقد','Contract name', (isSupplyProj ? (lang==='ar'?'التركيب والتشغيل — ':'Installation — ') : (lang==='ar'?'الأعمال الكهروميكانيكية — ':'Electromechanical — ')) + (p?p.name[lang]:''), {required:true}),
      F('رمز العقد','Contract code', 'CNT-'+(p?p.id.slice(4):'0001')+'-EM', {mono:true, auto:true}),
      F('المكوّن','Component', isSupplyProj ? c2Comp[lang] : COMPONENTS[1][lang], {options: isSupplyProj ? [c1Comp[lang], c2Comp[lang]] : O(COMPONENTS)}),
      F('تاريخ المباشرة','Start date', startDate, {required:true, mono:true}),
      F('تاريخ الإنجاز','Finish date', plannedFinish, {required:true, mono:true}),
      F('مبلغ الإحالة','Award amount', window.fmtNum(c2award), {unit:'IQD', mono:true}),
      F('المصروف من الإحالة','Spent from award', window.fmtNum(c2spent), {unit:'IQD', mono:true, auto:true}),
      F('مبلغ الاحتياط','Reserve amount', window.fmtNum(c2reserve), {unit:'IQD', mono:true}),
      F('المصروف من الاحتياط','Spent from reserve', window.fmtNum(c2spentReserve), {unit:'IQD', mono:true, auto:true}),
      F('مبلغ الإشراف والمراقبة','Supervision & monitoring amount', window.fmtNum(c2supervision), {unit:'IQD', mono:true}),
      F('المصروف من الإشراف والمراقبة','Spent from supervision & monitoring', window.fmtNum(c2spentSupervision), {unit:'IQD', mono:true, auto:true}),
      F('كلفة العقد الكلي','Total spent (contract)', window.fmtNum(c2totalSpent), {unit:'IQD', mono:true, auto:true}),
      F('حالة العقد (الموسّعة)','Contract status (extended)', CONTRACT_STATUS_LIST[2][lang], {options:O(CONTRACT_STATUS_LIST)}),
    ],
    contractor: { fields: [
      F('اسم المقاول','Contractor name', mepRec[lang], {required:true}),
      F('الجهة المنفذة','Executing entity', mepRec.ent[lang], {required:true}),
      F('بيانات التواصل','Contact info', '+964 771 222 3333', {mono:true}),
    ]},
  };
  const contracts = [
    { key:'main', name: c1Meta[lang], status: contract.status, code: contract.code, raw: contract.raw, fields: contract.fields, contractor },
    contract2,
  ];

  const revisedCost = Math.round(contractCost * (1 + extensionsCount*0.015));
  const startYear = new Date(startDate).getFullYear();
  const curYear = 2026;
  const yearlyAllocations = [];
  for (let y = startYear; y <= curYear; y++) {
    const alloc = Math.round(revisedCost * (0.18 + r()*0.08));
    const isCurrent = y === curYear;
    // A realistic minority of projects run hot near year-end (≥90% of allocation,
    // occasionally a minor overrun) — deterministic per project so it's stable.
    const heavy = p && (parseInt(p.id.slice(4), 10) % 5 === 2);
    const spend = Math.round(alloc * (isCurrent ? (heavy ? (0.92+r()*0.13) : (0.4+r()*0.32)) : (0.85+r()*0.15)));
    yearlyAllocations.push({ year: y, allocation: alloc, spend, current: isCurrent });
  }
  const annualAllocation = yearlyAllocations[yearlyAllocations.length-1].allocation;
  const annualSpend = yearlyAllocations[yearlyAllocations.length-1].spend;
  const financial = {
    fields: [
      F('كلفة المشروع المقررة','Planned cost', window.fmtNum(plannedCost), {required:true, unit:'IQD', mono:true}),
      F('كلفة المشروع المعدلة','Revised cost', window.fmtNum(revisedCost), {unit:'IQD', mono:true}),
      F('التخصيص السنوي (للسنة الحالية)','Annual allocation (current year)', window.fmtNum(annualAllocation), {unit:'IQD', mono:true}),
      F('المصروف السنوي (للسنة الحالية)','Annual spend (current year)', window.fmtNum(annualSpend), {unit:'IQD', mono:true}),
      F('المصروف التراكمي','Cumulative spend', window.fmtNum(disbursed), {unit:'IQD', mono:true}),
      F('مبلغ الأمانات','Deposits (retention) held', window.fmtNum(Math.round(disbursed*0.05)), {proposed:true, unit:'IQD', mono:true}),
      F('حالة المناقلة','Reallocation (transfer) status', (p && (p.status==='stalled'||p.status==='suspended')) ? (lang==='ar'?'قيد المناقلة':'Under reallocation') : (lang==='ar'?'لا يوجد':'None'), {proposed:true, options:[lang==='ar'?'لا يوجد':'None', lang==='ar'?'قيد المناقلة':'Under reallocation', lang==='ar'?'مناقلة معتمدة':'Reallocation approved']}),
      F('نسبة الإنجاز المخطط','Planned progress %', Math.min(100,(p?p.tech:0)+8)+'%', {proposed:true, mono:true}),
    ],
    // yearly financial-history timeline (§2.1.5, §2.8.1): a per-year record of
    // allocation vs spend from award to completion.
    history: yearlyAllocations.map(y => ({ year: y.year, allocation: y.allocation, spend: y.spend, current: y.current })),
    payments: Array.from({length:3}).map((_,i) => {
      const amt = Math.round(disbursed/3*(0.8+r()*0.4));
      const items = lang==='ar' ? ['الإحالة','الاحتياط','الإشراف والمراقبة'] : ['Award','Reserve','Supervision & monitoring'];
      const civilShare = Math.round(amt*0.68), mepShare = amt - civilShare;
      const splitAmt = (tot) => { const a1=Math.round(tot*0.7), a2=Math.round(tot*0.22); return [a1, a2, tot-a1-a2]; };
      const [c1a,c1b,c1c] = splitAmt(civilShare), [c2a,c2b,c2c] = splitAmt(mepShare);
      return {
        no: 'PAY-' + (100+i), date: `202${4+i}-0${2+i*3}-1${i}`, amount: amt,
        by: [lang==='ar'?'سارة كريم — قسم الحسابات':'Sara Kareem — Accounts dept.', lang==='ar'?'مصطفى علي — قسم الحسابات':'Mustafa Ali — Accounts dept.', lang==='ar'?'ليلى حسن — قسم الحسابات':'Layla Hassan — Accounts dept.'][i%3],
        financeLetter: { no: 'FIN-'+(7100+i*13), date: `202${4+i}-0${2+i*3}-0${i+8}` },
        allocations: [
          { contractKey:'main', contractName: c1Meta[lang], amount: civilShare, items:[{name:items[0],value:c1a},{name:items[1],value:c1b},{name:items[2],value:c1c}] },
          { contractKey:'mep', contractName: c2Meta[lang], amount: mepShare, items:[{name:items[0],value:c2a},{name:items[1],value:c2b},{name:items[2],value:c2c}] },
        ],
        attachments: [
          { name: lang==='ar'?'ذرعة الأعمال المنجزة':'Work measurement certificate', file:'PAY-'+(100+i)+'-measurement.pdf', kind:'pdf', size:'310 KB', contractKey:'main', type:'certificate' },
          { name: lang==='ar'?'ذرعة الأعمال المنجزة':'Work measurement certificate', file:'PAY-'+(100+i)+'-mep-measurement.pdf', kind:'pdf', size:'188 KB', contractKey:'mep', type:'certificate' },
          { name: lang==='ar'?'كتاب المالية':'Finance letter', file:'PAY-'+(100+i)+'-fin-letter.pdf', kind:'pdf', size:'96 KB', type:'letter' },
        ],
      };
    }),
    raw: { cost, disbursed, due, remaining, plannedCost, revisedCost, financialPct, annualAllocation, annualSpend, yearlyAllocations },
    editLog: [
      { by: lang==='ar'?'سارة كريم — قسم الحسابات':'Sara Kareem — Accounts dept.', date: '2026-05-18', changes: [
        { field: lang==='ar'?'كلفة المشروع المعدلة':'Revised cost', from: window.fmtNum(Math.round(revisedCost*0.985)), to: window.fmtNum(revisedCost) },
        { field: lang==='ar'?'التخصيص السنوي':'Annual allocation', from: window.fmtNum(Math.round(annualAllocation*0.9)), to: window.fmtNum(annualAllocation) },
      ]},
      { by: lang==='ar'?'مصطفى علي — قسم الحسابات':'Mustafa Ali — Accounts dept.', date: '2026-03-09', changes: [
        { field: lang==='ar'?'كلفة المشروع المقررة':'Planned cost', from: window.fmtNum(Math.round(plannedCost*0.97)), to: window.fmtNum(plannedCost) },
      ]},
    ],
  };

  const schedule = {
    fields: [
      F('تاريخ المباشرة','Project start', startDate, {required:true, mono:true}),
      F('تاريخ الإنجاز المخطط','Planned finish', plannedFinish, {required:true, mono:true}),
      F('تاريخ الإنجاز المتوقع','Expected finish', expectedFinish, {mono:true}),
      F('الانحراف الزمني','Schedule deviation', Math.max(0, Math.round((new Date(expectedFinish)-new Date(plannedFinish))/86400000)) + (lang==='ar'?' يوم':' days'), {proposed:true, mono:true}),
    ],
    editLog: [
      { by: 'مصطفى علي', date: '2026-04-20', changes: [
        { field: lang==='ar'?'تاريخ الإنجاز المتوقع':'Expected finish', from: plannedFinish, to: expectedFinish },
      ]},
    ],
  };

  const history = Array.from({length:4}).map((_,i) => {
    const phys = Math.min(100, Math.max(0, Math.round((p?p.tech:60) * (0.4 + i*0.2))));
    const finPct = Math.max(0, phys - Math.round(3+r()*8));
    return { date: `2026-0${2+i}-1${i+2}`, physical: phys, financial: finPct, by: ['أحمد فؤاد','ليلى حسن','سارة كريم','مصطفى علي'][i%4] };
  });
  const progress = {
    fields: [
      F('نسبة الإنجاز المادي','Physical %', (p?p.tech:0)+'%', {required:true, mono:true}),
      F('نسبة الإنجاز المالي','Financial %', financialPct+'%', {required:true, mono:true}),
      F('تاريخ آخر تحديث','Last update date', history[history.length-1].date, {proposed:true, mono:true}),
      F('المستخدم المحدِّث','Updated by', history[history.length-1].by, {proposed:true}),
      F('سبب التأخر','Delay reason', p && p.status==='stalled' ? DELAY_REASONS[Math.floor(r()*DELAY_REASONS.length)][lang] : (lang==='ar'?'لا يوجد':'None'), {proposed:true, options:[...O(DELAY_REASONS), (lang==='ar'?'لا يوجد':'None')]}),
      F('المخاطر المسجّلة','Logged risks', p && p.status==='stalled' ? (lang==='ar'?'خطر تأخر تجهيز المواد':'Supply-chain delay risk') : (lang==='ar'?'لا يوجد':'None'), {proposed:true}),
    ],
    history,
  };

  const boqNames = lang==='ar' ? ['أعمال حفريات','أعمال خرسانية','أعمال بناء','تكسيات وتشطيبات','أعمال كهربائية'] : ['Excavation works','Concrete works','Masonry works','Finishes & cladding','Electrical works'];
  const boqUnits = lang==='ar' ? ['م³','م³','م²','م²','نقطة'] : ['m³','m³','m²','m²','pt'];
  // BOQ division (قسم) per item — groups the register into an expandable
  // division→item hierarchy. Added as a label only; row count/codes/values unchanged.
  const boqDivs = lang==='ar'
    ? [{key:'D1',name:'الأعمال المدنية والإنشائية'},{key:'D2',name:'التكسيات والتشطيبات'},{key:'D3',name:'الأعمال الكهروميكانيكية'}]
    : [{key:'D1',name:'Civil & structural works'},{key:'D2',name:'Finishes & cladding'},{key:'D3',name:'Electromechanical works'}];
  const boqDivIdx = [0,0,0,1,2];   // excavation/concrete/masonry→civil · finishes→finishes · electrical→EM
  /* The DIVISION decides the contract — civil and finishes are the civil
     contract's scope, electromechanical is the MEP contract's. The contract
     used to be inferred from the code's parity, which put the electrical
     item under the civil contract and concrete under the MEP one. */
  const DIV_CONTRACT = { D1: 'main', D2: 'main', D3: 'mep' };
  const boq = boqNames.map((nm,i) => {
    const contractedQty = 100 + Math.floor(r()*900);
    const executedQty = Math.min(contractedQty, Math.round(contractedQty * ((p?p.tech:60)/100) * (0.85+r()*0.25)));
    const price = 15000 + Math.floor(r()*60000);
    const dv = boqDivs[boqDivIdx[i]];
    return { no: i+1, code: 'BQ-'+String(i+1).padStart(3,'0'), item: nm, unit: boqUnits[i], contractedQty, executedQty, price, total: contractedQty*price, div: dv.key, divName: dv.name, contractKey: DIV_CONTRACT[dv.key] || 'main' };
  });

  const voReasons = (p && p.type==='supply')
    ? (lang==='ar' ? ['زيادة كمية الأجهزة المتعاقد عليها','تمديد مدة التوريد','إعادة توزيع الكميات بين الجامعات','زيادة تجهيزات مختبرية إضافية','تأخر الشحنة لظروف قاهرة','تعديل مواصفات الأجهزة المجهّزة'] : ['Increase in contracted device quantity','Supply period extension','Redistribute quantities between universities','Additional lab equipment','Shipment delay — force majeure','Change to supplied device specs'])
    : (lang==='ar' ? ['زيادة كميات أعمال الكهرباء','تمديد مدة الإنجاز','تعديل تصميم الواجهة','زيادة كميات أعمال التشطيبات','ظروف غير متوقعة في الموقع','تعديل مواصفات مواد التشطيب'] : ['Increase in electrical quantities','Completion time extension','Facade design change','Increase in finishing quantities','Unforeseen site conditions','Finishing material specification change']);
  const voEvBy = lang==='ar' ? ['المقاول','المهندس المقيم','سارة كريم \u2014 قسم الحسابات'] : ['Contractor','Resident engineer','Sara Kareem \u2014 Accounts dept.'];
  // change-order approval stages per meeting minutes §2.3.3.1 — each with an electronic time cap (SLA) and escalation.
  const VO_STAGE_DEFS = lang==='ar' ? [
    { key:'priced', label:'إعداد الكشف المسعّر', owner:'المهندس المقيم', sla:5 },
    { key:'technical', label:'التدقيق الفني', owner:'قسم المشاريع', sla:7 },
    { key:'financial', label:'التدقيق المالي', owner:'الدائرة المالية', sla:7 },
    { key:'schedule', label:'تحليل أثر الجدول', owner:'مراقبة الجدولة', sla:3 },
    { key:'endorse', label:'المصادقة', owner:'الجهة المخوّلة', sla:5 },
  ] : [
    { key:'priced', label:'Priced estimate', owner:'Resident engineer', sla:5 },
    { key:'technical', label:'Technical review', owner:'Projects dept.', sla:7 },
    { key:'financial', label:'Financial review', owner:'Finance dept.', sla:7 },
    { key:'schedule', label:'Schedule-impact review', owner:'Schedule control', sla:3 },
    { key:'endorse', label:'Endorsement', owner:'Authorized party', sla:5 },
  ];
  const addDays = (iso, n) => { const dt = new Date(iso); dt.setDate(dt.getDate()+n); return dt.toISOString().slice(0,10); };
  // the project's own "today": start + elapsed share of the duration, matching
  // The change-order clock has to be the SAME clock the schedule runs on, or
  // every "days elapsed" figure on the record is measured against a date the
  // rest of the app has never heard of. The old formula (start + 330 * tech%)
  // claimed to match buildScheduleData and did not — it drifted ~40 days,
  // which is why an order raised 5 days ago showed 17 days at its stage.
  // buildScheduleData: dataDate = origin + clamp(0, maxFinish, today - origin),
  // i.e. today, but never past the schedule's own end.
  const NOW_DATE = (window.EPM && window.EPM.DATA_DATE) || '2026-07-22';
  const NOW_ISO = (function () {
    const s0 = new Date(startDate), t0 = new Date(NOW_DATE), f0 = new Date(plannedFinish);
    if (t0 < s0) return startDate;
    return (t0 > f0 ? plannedFinish : NOW_DATE);
  })();
  const voType = p && p.type === 'supply' ? 'supply' : 'engineering';
  // ---- supply-specific change-order seeds (match the live supply model) ----
  const isSupplyP = p && p.type === 'supply';
  const supEvBy = (lang==='ar') ? ['المجهز','لجنة الفحص والاستلام','سارة كريم — قسم الحسابات']
                                 : ['Supplier','Inspection & receipt cttee','Sara Kareem — Accounts dept.'];
  const evBy = isSupplyP ? supEvBy : voEvBy;
  const supItems = (isSupplyP && window.EPM && window.EPM.buildSupplyData) ? (window.EPM.buildSupplyData(p, lang).items || []) : [];
  const FORMS = (window.EPM && window.EPM.FORMATIONS) || [];
  const uniName = (n, fb) => (FORMS[n] && FORMS[n][lang]) || fb;
  // real فقرات تجهيزية (ITM-*) as change-order lines; the redistribution order
  // (i=2) carries MULTIPLE source→target transfers — the new redistribution model
  const supplyAffected = (i) => {
    if (!supItems.length) return [];
    const it0 = supItems[0], it1 = supItems[1] || it0;
    if (i === 2) {
      const bens = it0.beneficiaries || [];
      const b0 = bens[0] || { name: uniName(0, 'جامعة بغداد'), qty: 20 };
      const b1 = bens[1] || { name: uniName(1, 'الجامعة المستنصرية'), qty: 15 };
      const transfers = [
        { from: b0.name, to: uniName(5, lang==='ar'?'جامعة نينوى':'Univ. of Ninevah'), qty: Math.max(1, Math.round((b0.qty||10)*0.3)) },
        { from: b0.name, to: uniName(8, lang==='ar'?'جامعة البصرة':'Univ. of Basrah'), qty: Math.max(1, Math.round((b0.qty||10)*0.2)) },
        { from: b1.name, to: uniName(11, lang==='ar'?'جامعة كربلاء':'Univ. of Kerbala'), qty: Math.max(1, Math.round((b1.qty||8)*0.25)) },
      ];
      const moved = transfers.reduce((a,t)=>a+t.qty,0);
      return [{ code: it0.code, item: it0.item, unit: it0.unit, rate: it0.price,
        qtyBefore: it0.contracted, qtyAfter: it0.contracted, total: it0.total,
        chg: 'redist', transfers: transfers, moved: moved, benFrom: transfers[0].from, benTo: transfers[0].to }];
    }
    if (i === 0 || i === 3) {
      const it = i === 0 ? it0 : it1;
      const add = Math.max(2, Math.round(it.contracted * (i===0 ? 0.15 : 0.10)));
      return [{ code: it.code, item: it.item, unit: it.unit, rate: it.price,
        qtyBefore: it.contracted, qtyAfter: it.contracted + add, total: it.total, chg: 'inc' }];
    }
    return [];
  };
  const variationOrders = voReasons.map((rs,i) => {
    // i=0 approved+applied · i=1 pending · i=2 returned · i=3 approved+applied
    // (second amendment on the same items) · i=4 approved but NOT yet applied
    // i=1 pending and past its SLA · i=5 pending but still inside it, so
    // "متأخرة" and "قيد الاعتماد" are demonstrably different sets
    const status = (i===1 || i===5) ? 'pending' : i===2 ? 'rejected' : 'approved';
    // raised inside the contract term (55/70/85% through it), not a fixed year
    // Days before the data date. The stuck order has to be genuinely stuck:
    // the stages before the ministerial one consume ~18 days of contractual
    // ceiling, so 22 days left it INSIDE its limit while the seed claimed it
    // was escalated. At 95 days it sits ~77 days against a 14-day ceiling —
    // which is the shape the design doc's own example describes.
    const inDate = addDays(NOW_ISO, -[180, 95, 60, 120, 9, 5][i]);
    const additional = Math.round(contractCost*(0.012+r()*0.03));
    const deduction = i===2 ? Math.round(additional*0.35) : Math.round(additional*(r()*0.12));
    const net = additional - deduction;
    // i=2 exceeds a quarter of the contract duration and so needs the endorsement committee
    const reqExt = i===1 ? 45 : i===0 ? 30 : i===2 ? Math.round(durationDays * 0.3) : i===3 ? 18 : i===4 ? 12 : 7;
    const appExt = status==='approved' ? Math.round(reqExt*0.7) : status==='rejected' ? 0 : null;
    // build stages: how many are done depends on status; pending has one active (i===1 overdue → escalated)
    const doneCount = status==='approved' ? 5 : status==='rejected' ? (i===2?2:1) : 3;
    let cursor = addDays(inDate, 1);
    const stages = VO_STAGE_DEFS.map((sd,si) => {
      const start = cursor;
      let st, doneDate=null, decision='';
      if (si < doneCount) {
        const took = Math.max(1, Math.round(sd.sla*(0.5+r()*0.8)));
        doneDate = addDays(start, took);
        cursor = addDays(doneDate, 0);
        st='done';
        decision = (si===doneCount-1 && status==='rejected') ? (lang==='ar'?'أُعيد للمقاول لاستكمال المستندات':'Returned to contractor for documents') : (lang==='ar'?'مدقّق ومُمرّر':'Reviewed & forwarded');
        if (si===doneCount-1 && status==='rejected') st='rejected';
      } else if (si === doneCount && status==='pending') {
        const overdue = i===1; // second order is stuck/escalated
        st = overdue ? 'overdue' : 'active';
        decision = overdue ? (lang==='ar'?'تجاوزت السقف الزمني — تصعيد للمستوى الأعلى':'SLA exceeded — escalated to senior') : (lang==='ar'?'قيد التدقيق':'Under review');
      } else { st='pending'; }
      return { key:sd.key, label:sd.label, owner:sd.owner, sla:sd.sla, start, doneDate, status:st, decision,
        elapsed: st==='done' ? Math.round((new Date(doneDate)-new Date(start))/864e5) : (st==='active'||st==='overdue') ? Math.round((new Date(NOW_ISO)-new Date(start))/864e5) : 0 };
    });
    const activeStage = stages.find(s=>s.status==='active'||s.status==='overdue');
    const revisedCompletion = plannedFinish ? addDays(plannedFinish, appExt!=null?appExt:reqExt) : '';
    const affectsCP = i!==2;
    return {
      no: 'VO-'+(i+1).toString().padStart(2,'0'), date: addDays(inDate, 3),
      inNo: 'IN-'+(5200+i*7), inDate,
      value: net, reason: rs, status, type: voType,
      responsible: evBy[i%3],
      // value breakdown §14
      original: Math.round(contractCost*0.04), additional, deduction, net,
      revisedContract: contractCost + net,
      // time extension §14
      reqExt, appExt, revisedCompletion,
      // critical-path effect §2.3.3.2
      affectsCP, cpDelayDays: affectsCP ? (i===1?18:9) : 0,
      // workflow §2.3.3.1
      stages, activeStage: activeStage ? activeStage.key : null,
      slaExceeded: !!(activeStage && activeStage.status==='overdue'),
      // affected BOQ items
      // i=0 exceeds the 20% tier; i=1 stays inside it; i=2 is a time-only order.
      // Lines must be REAL rows of d.boq (same codes the register shows) and must
      // all belong to one contract — BQ-002 and BQ-004 both map to the EM package.
      // supply seed orders are amount/date/redistribution (no construction BOQ lines);
      // new supply orders pick real فقرات تجهيزية through the wizard.
      affectedBOQ: isSupplyP ? supplyAffected(i) : ((i===2) ? [] : [2, 4].map(n => {
        const b = boq[n-1];
        const factor = [1.55, 1.15, 1.30, 1.22, 1.12, 1.18][i] || 1.15;   // >20% except i=1 and i=4
        return { code: b.code, desc: b.item, unit: b.unit, qtyBefore: b.contractedQty,
          qtyAfter: Math.round(b.contractedQty * factor), rate: b.price, executedQty: b.executedQty };
      })),
      // affected schedule activities — supply orders touch delivery activities;
      // the redistribution order (supply i=2) is time-neutral
      affectedActivities: (isSupplyP ? [
        { id:'S4', name: lang==='ar'?'الشحن الدولي':'International shipping', slip: i===1?18:9, critical:true },
        { id:'S8', name: lang==='ar'?'التوزيع على الجامعات':'Distribution to universities', slip: i===1?12:6, critical:true },
      ] : [
        { id:'A6', name: lang==='ar'?'الأعمال الكهربائية':'Electrical works', slip: i===1?18:9, critical:true },
        { id:'A8', name: lang==='ar'?'التشطيبات النهائية':'Final finishes', slip: i===1?12:6, critical:true },
      ]).slice(0, isSupplyP ? ((i===1||i===4) ? 2 : 0) : (i===2?1:2)),
      // legacy single-transfer supply field retired — supply redistribution is now
      // an affectedBOQ redist line with multi source→target transfers (see supplyAffected)
      supply: null,
      // decision history
      history: [
        { date: inDate, actor: evBy[0], action: lang==='ar'?'تقديم الطلب':'Request submitted', note: rs },
        ...stages.filter(s=>s.status==='done'||s.status==='rejected').map(s=>({ date:s.doneDate, actor:s.owner, action: s.status==='rejected'?(lang==='ar'?'إعادة':'Returned'):(lang==='ar'?'اعتماد المرحلة':'Stage approved')+' — '+s.label, note:s.decision })),
        ...(status==='approved' ? [{ date: addDays(inDate,20), actor: VO_STAGE_DEFS[4].owner, action: lang==='ar'?'المصادقة النهائية':'Final endorsement', note: (lang==='ar'?'قيمة صافية معتمدة ':'Net approved ')+window.fmtNum(net)+' IQD' }] : []),
      ],
      attachments: [
        { name: isSupplyP ? (lang==='ar'?'طلب المجهز الرسمي':'Supplier formal request') : (lang==='ar'?'طلب المقاول الرسمي':'Contractor formal request'), file: 'VO-'+(i+1)+'-request.pdf', kind:'pdf', size:'240 KB', by: evBy[0], date: inDate },
        { name: isSupplyP ? (lang==='ar'?'كشف الفقرات التجهيزية المسعّر':'Priced supply-items schedule') : (lang==='ar'?'كشف تسعير الأعمال المستحدثة':'Priced estimate of new works'), file: 'VO-'+(i+1)+'-boq.xlsx', kind:'sheet', size:'56 KB', by: evBy[1], date: addDays(inDate,3) },
        ...(i===0 && !isSupplyP ? [{ name: lang==='ar'?'صور الموقع':'Site photos', file: 'VO-1-site.jpg', kind:'image', size:'1.2 MB', by: voEvBy[1], date: addDays(inDate,4) }] : []),
        ...(i===0 && isSupplyP ? [{ name: lang==='ar'?'الكتالوغ والمواصفات الفنية':'Catalog & technical specs', file: 'VO-1-catalog.pdf', kind:'pdf', size:'1.2 MB', by: evBy[1], date: addDays(inDate,4) }] : []),
      ],
    };
  });

  const meetings = [
    { date:'2026-04-11', subject: lang==='ar'?'الكشف على نسب الإنجاز':'Progress inspection', decisions: lang==='ar'?'تكليف المقاول بتسريع أعمال الكهرباء خلال أسبوعين':'Contractor tasked to accelerate electrical works within two weeks', hasAttachment:true },
    { date:'2026-02-27', subject: lang==='ar'?'تدقيق السلف التشغيلية':'Audit of operational advances', decisions: lang==='ar'?'اعتماد تسوية السلفة رقم 3':'Advance #3 settlement approved', hasAttachment:true },
    { date:'2026-01-09', subject: lang==='ar'?'دراسة طلب التمديد':'Extension request review', decisions: lang==='ar'?'الموافقة المبدئية على تمديد 30 يوماً':'Preliminary approval for a 30-day extension', hasAttachment:false },
  ];

  /* A real document register spans the disciplines, carries a title a reader
     can recognise, and traces every issue to the transmittal that sent it.
     Derived from the project seed so two projects never share a register. */
  /* read the whole id, not two characters of it — with two, any pair of
     projects sharing the last two digits got a byte-identical register */
  const dwgSeed = (p ? String(p.id).split('').reduce(function (a2, c) { return (a2 * 31 + c.charCodeAt(0)) % 100000; }, 7) : 17) + 3;
  const dwgR = rng(dwgSeed);
  const dwgIssuers = lang === 'ar'
    ? ['دار الهندسة', 'المكتب الاستشاري الهندسي', 'قسم التصميم — الجامعة', 'المقاول المنفّذ']
    : ['Dar Al-Handasah', 'Engineering consultancy office', 'University design dept.', 'Executing contractor'];
  const dwgReasons = lang === 'ar'
    ? ['الإصدار الأولي', 'تعديل بعد الكشف الموقعي', 'تحديث بناءً على ملاحظات المراجعة', 'مطابقة للمنفَّذ', 'تعديل ناتج عن أمر تغييري']
    : ['Initial issue', 'Revised after site survey', 'Updated per review comments', 'As-built alignment', 'Revision arising from a change order'];
  const drawings = (function () {
    const out = [];
    DOC_DISCIPLINES.forEach(function (dis, di) {
      const titles = DOC_TITLES[dis.key];
      const howMany = 2 + Math.floor(dwgR() * (titles.length - 1));   // 2–3 per discipline
      for (let i = 0; i < howMany; i++) {
        const seq = out.length + 1;
        const nRev = 1 + Math.floor(dwgR() * 3);                       // 1–3 revisions
        const st = dwgR();
        /* ordered widest-last: the old chain tested 0.72 first, so `rejected`
           could never be produced — and the documents readiness state that
           depends on it was unreachable too */
        const status = st > 0.90 ? 'rejected' : st > 0.68 ? 'draft' : 'approved';
        /* one drawing is issued by ONE office; design houses do not hand a
           drawing to each other revision by revision */
        const issuedBy = dwgIssuers[Math.floor(dwgR() * dwgIssuers.length)];
        const revisions = [];
        for (let r0 = nRev; r0 >= 1; r0--) {
          /* the gap between revisions has to dominate the jitter, or R1 can
             carry a newer date than the R2 that superseded it */
          const back = (nRev - r0) * 120 + Math.floor(dwgR() * 45);
          const isAsBuilt = r0 === nRev && nRev > 2;
          revisions.push({ rev: 'R' + r0,
            date: addDays(NOW_ISO, -(30 + back)),
            reason: r0 === 1 ? dwgReasons[0] : dwgReasons[1 + Math.floor(dwgR() * (dwgReasons.length - 1))],
            /* only an as-built revision legitimately changes hands, to the
               party that actually built it */
            by: isAsBuilt ? dwgIssuers[dwgIssuers.length - 1] : issuedBy,
            transmittal: 'TR-' + (2400 + out.length * 4 + (nRev - r0)) });
        }
        out.push({ id: dis.pfx + '-DR-' + String(i + 1).padStart(3, '0'),
          title: titles[i % titles.length][lang === 'ar' ? 0 : 1],
          discipline: dis.key, disciplineLabel: dis[lang],
          type: lang === 'ar' ? dis.tyAr : dis.tyEn,
          status, revisions });
      }
    });
    return out;
  })();

  const parties = {
    beneficiary: benefObj,
    consultant:  { ar: consultantRec.ar, en: consultantRec.en },
    contractor:  { ar: contractorRec.ar, en: contractorRec.en },
  };

  // ---- EVM indicators (team minutes §2.1.6 KPIs) ----
  // Planned value comes from how much of the CONTRACT TERM has elapsed, on the
  // same S-shape the baseline follows. It used to be `tech + 8`, which made
  // every project in the portfolio exactly 8 points behind and made SPI a pure
  // function of % complete — no project could ever be ahead of schedule.
  const plannedProgPct = (function () {
    const s0 = new Date(startDate), f0 = new Date(plannedFinish), t0 = new Date(NOW_ISO);
    const span = (f0 - s0) / 86400000;
    if (!(span > 0)) return Math.min(100, (p ? p.tech : 60) + 8);
    const f = Math.max(0, Math.min(1, (t0 - s0) / 86400000 / span));
    return Math.round(f * f * (3 - 2 * f) * 100);
  })();
  const pv = Math.round(contractCost * plannedProgPct / 100);
  const ev = Math.round(contractCost * (p ? p.tech : 60) / 100);
  // Actual cost must describe the SAME work earned value describes. `disbursed`
  // is drawn independently of physical progress, so reading it as AC gave a
  // routine project a CPI of 0.27 and an EAC of 3.6x its budget — which the
  // L04 rebuild then promoted to a headline tile. Cost efficiency is instead a
  // stable per-project trait in a believable band.
  const eff = 0.88 + ((p ? (p.id.charCodeAt(6) + p.id.charCodeAt(7)) % 10 : 5) / 10) * 0.30;
  const ac = Math.max(1, Math.round(ev / eff));
  const cpi = ac ? +(ev / ac).toFixed(2) : 1;
  const spi = pv ? +(ev / pv).toFixed(2) : 1;
  const eac = cpi ? Math.round(contractCost / cpi) : contractCost;
  const vac = contractCost - eac;
  const evm = { pv, ev, ac, cpi, spi, eac, vac, budget: contractCost };

  // ---- Risk register (team minutes §2.1.6) ----
  const riskTypes = lang==='ar' ? ['زمني','مالي','تشغيلي','قانوني','تقني','جودة','سلامة'] : ['Schedule','Financial','Operational','Legal','Technical','Quality','Safety'];
  const riskSeed = lang==='ar'
    ? [['تأخر تجهيز المواد الكهربائية','زمني'],['تجاوز الكلفة التقديرية','مالي'],['نقص الأيدي العاملة الماهرة','تشغيلي'],['نزاع تعاقدي حول التمديد','قانوني'],['تعارض في المخططات التنفيذية','تقني'],['عدم مطابقة خرسانة الأساس','جودة'],['مخاطر السلامة في أعمال الارتفاعات','سلامة']]
    : [['Electrical material supply delay','Schedule'],['Cost overrun vs estimate','Financial'],['Shortage of skilled labor','Operational'],['Contractual dispute over extension','Legal'],['Shop-drawing clash','Technical'],['Foundation concrete non-conformance','Quality'],['Work-at-height safety exposure','Safety']];
  const probs = lang==='ar' ? ['منخفض','متوسط','عالي'] : ['Low','Medium','High'];
  const risks = riskSeed.map((rk, i) => {
    const pr = 1 + Math.floor(r()*3), im = 1 + Math.floor(r()*3);
    const sevScore = pr * im;
    const sev = sevScore >= 6 ? 'high' : sevScore >= 3 ? 'med' : 'low';
    return { no: 'RSK-'+(i+1).toString().padStart(2,'0'), desc: rk[0], type: rk[1],
      prob: probs[pr-1], impact: probs[im-1], sev,
      plan: lang==='ar'?'خطة معالجة وقائية وتصحيحية':'Preventive & corrective action plan',
      owner: lang==='ar'?['مدير المشروع','القسم المالي','القسم الهندسي','المقاول'][i%4]:['Project manager','Finance dept.','Engineering dept.','Contractor'][i%4],
      date: `2026-0${3+i}-0${2+i}`, status: i===riskSeed.length-1 ? (lang==='ar'?'مفتوح':'Open') : (i%2? (lang==='ar'?'تحت المعالجة':'Mitigating') : (lang==='ar'?'مغلق':'Closed')),
      kpi: ['SPI','CPI','VAC','EAC'][i%4] };
  });

  return { profile, entity, contract, contracts, consultant, contractor, financial, schedule, progress, boq, variationOrders, meetings, drawings, parties, evm, risks };
}

const NOTIFICATIONS = [
  { icon:'payments', tone:'azure', whoAr:'أحمد فؤاد', whoEn:'Ahmed Fouad', txtAr:'حدّث الموقف المالي لـ', txtEn:'updated financials for', tgt:'PRJ-0148', tAr:'قبل ١٢ دقيقة', tEn:'12 min ago', unread:true, group:'today' },
  { icon:'warning', tone:'crimson', whoAr:'النظام', whoEn:'System', txtAr:'تنبيه تعثّر في', txtEn:'flagged a stall on', tgt:'PRJ-0137', tAr:'قبل ٤٠ دقيقة', tEn:'40 min ago', unread:true, group:'today' },
  { icon:'groups', tone:'success', whoAr:'ليلى حسن', whoEn:'Layla Hasan', txtAr:'أضافت لجنة فنية إلى', txtEn:'added a committee to', tgt:'PRJ-0170', tAr:'قبل ساعتين', tEn:'2 hrs ago', unread:true, group:'today' },
  { icon:'forward_to_inbox', tone:'azure', whoAr:'سارة كريم', whoEn:'Sara Karim', txtAr:'سجّلت مخاطبة واردة في', txtEn:'logged correspondence in', tgt:'PRJ-0218', tAr:'أمس', tEn:'Yesterday', unread:false, group:'earlier' },
  { icon:'description', tone:'azure', whoAr:'مصطفى علي', whoEn:'Mustafa Ali', txtAr:'رفع ملحق عقد على', txtEn:'uploaded an addendum on', tgt:'PRJ-0299', tAr:'أمس', tEn:'Yesterday', unread:false, group:'earlier' },
  { icon:'check_circle', tone:'success', whoAr:'النظام', whoEn:'System', txtAr:'اكتمل مشروع', txtEn:'marked complete:', tgt:'PRJ-0181', tAr:'قبل يومين', tEn:'2 days ago', unread:false, group:'earlier' },
];

// ---------- Schedule / Primavera dataset (Master Prompt §11) ----------
function buildScheduleData(p, lang) {
  const r = rng((p ? p.id.charCodeAt(6) : 3) * 17 + 9);
  const tech = p ? p.tech : 60;
  const D = (base, days) => { const dt = new Date(base); dt.setDate(dt.getDate() + days); return dt.toISOString().slice(0, 10); };
  const origin = buildSchedule(p).start;
  const AR = lang === 'ar';
  // WBS → activities. bl* = baseline, cur* = current/forecast. slip pushes forecast out.
  const projName = p ? p.name[lang] : (AR ? 'المشروع' : 'Project');
  // Primavera-style WBS tree: LV1 Project · LV2 Building/Zone · LV3 Discipline · LV4 Activity.
  const AC = (id, ar, en, o, dur, slip, preds, opt) => ({ id, name: AR ? ar : en, o, dur, slip, preds: preds || [], crit: !!(opt && opt.crit), milestone: !!(opt && opt.milestone) });
  const isSupply = p && p.type === 'supply';
  // Supply projects run the SAME schedule engine (Gantt, critical path, float,
  // baseline/forecast, delay) but over procurement/delivery activities instead of
  // construction WBS — the difference is the activity set, not the component.
  const tree = isSupply ? {
    name: projName, children: [
      { name: AR ? 'التعاقد وفتح الاعتماد' : 'Contracting & LC', acts: [
        AC('S1', 'الإحالة والتعاقد', 'Award & contract', 0, 15, 0, []),
        AC('S2', 'فتح الاعتماد المستندي', 'Letter of Credit opened', 15, 30, 4, ['S1'], { crit: true }),
      ] },
      { name: AR ? 'التصنيع والشحن' : 'Manufacturing & Shipping', acts: [
        AC('S3', 'التصنيع والتجهيز', 'Manufacturing', 45, 120, 15, ['S2'], { crit: true }),
        AC('S4', 'الشحن والنقل الدولي', 'International shipping', 165, 45, 12, ['S3'], { crit: true }),
        AC('S5', 'التخليص الكمركي', 'Customs clearance', 210, 25, 10, ['S4'], { crit: true }),
      ] },
      { name: AR ? 'الاستلام والتوزيع' : 'Receipt & Distribution', acts: [
        AC('S6', 'الاستلام المخزني', 'Warehouse receipt', 235, 30, 8, ['S5'], { crit: true }),
        AC('S7', 'الفحص والاستلام الأولي', 'Inspection & preliminary receipt', 265, 25, 6, ['S6']),
        AC('S8', 'التوزيع على الجهات المستفيدة', 'Distribution to beneficiaries', 290, 40, 9, ['S7'], { crit: true }),
        AC('S9', 'الاستلام النهائي', 'Final receipt', 330, 0, 12, ['S8'], { crit: true, milestone: true }),
      ] },
    ],
  } : {
    name: projName, children: [
      { name: AR ? 'المنطقة A — المبنى الرئيسي' : 'Zone A — Main Building', children: [
        { name: AR ? 'الأعمال الإنشائية' : 'Structural', acts: [
          AC('A1', 'التجهيز والمباشرة', 'Mobilization', 0, 20, 0, []),
          AC('A2', 'أعمال الحفريات', 'Excavation works', 20, 35, 3, ['A1']),
          AC('A3', 'الأساسات', 'Foundations', 55, 45, 6, ['A2'], { crit: true }),
          AC('A4', 'الهيكل الخرساني', 'Concrete structure', 100, 90, 12, ['A3'], { crit: true }),
          AC('A5', 'الأسقف والمدرجات', 'Slabs & stairs', 160, 50, 12, ['A4'], { crit: true }),
        ] },
        { name: AR ? 'الأعمال المعمارية والإنهاءات' : 'Architectural & Finishes', acts: [
          AC('A8', 'التشطيبات النهائية', 'Final finishes', 275, 55, 16, ['A6', 'A7'], { crit: true }),
        ] },
      ] },
      { name: AR ? 'المنطقة B — الكهروميكانيك والتسليم' : 'Zone B — MEP & Handover', children: [
        { name: AR ? 'الأعمال الكهروميكانيكية' : 'MEP works', acts: [
          AC('A6', 'الأعمال الكهربائية', 'Electrical works', 200, 70, 14, ['A5'], { crit: true }),
          AC('A7', 'الأعمال الميكانيكية', 'Mechanical works', 210, 65, 10, ['A5']),
        ] },
        { name: AR ? 'التسليم والاستلام' : 'Handover', acts: [
          AC('A9', 'التسليم الابتدائي', 'Preliminary handover', 330, 0, 18, ['A8'], { crit: true, milestone: true }),
        ] },
      ] },
    ],
  };
  const allSpecs = [];
  (function collect(n) { if (n.acts) allSpecs.push(...n.acts); if (n.children) n.children.forEach(collect); })(tree);
  const totalDur = allSpecs.filter(a => !a.milestone).reduce((s2, a) => s2 + a.dur, 0) || 1;
  const budget = p ? p.cost : 1e9;
  // Data-date position: how far the project has run along its own timeline,
  // derived deterministically from the project id (NOT from a stored tech %).
  // Each activity's progress then comes from where "now" sits in its window,
  // so completion is a real bottom-up rollup, not a seeded number.
  const maxFin = Math.max.apply(null, allSpecs.map(a => a.o + a.dur).concat([1]));
  // "now" is the calendar data date; how many days the project has actually run
  // (clamped to its schedule span). Progress below is a real time-position S-curve.
  const NOW_DATE = (window.EPM && window.EPM.DATA_DATE) || '2026-07-22';
  const dataOffset = Math.max(0, Math.min(maxFin, Math.round((new Date(NOW_DATE) - new Date(origin)) / 86400000)));
  // per-project slip factor so schedules genuinely differ: some run on time
  // (0), others slip more. Drives forecast dates, delay days & negative float.
  const slipFactor = p ? [0, 0, 0.4, 0.9, 1.5, 2.2][(p.id.charCodeAt(7) + p.id.charCodeAt(6)) % 6] : 1;
  // suspended / withdrawn projects stopped BEFORE "now" — freeze their progress
  // at the stop point so a halted project never reads as complete.
  const stopFrac = (p && (p.status === 'suspended' || p.status === 'withdrawn')) ? (0.35 + (p.id.charCodeAt(6) % 5) * 0.09) : 1;
  const effOffset = Math.round(dataOffset * stopFrac);
  const acts = [];
  (function walk(node, level, code, parents) {
    acts.push({ type: 'wbs', level, name: node.name, code, parents });
    const kidParents = parents.concat(code);
    if (node.children) node.children.forEach((c, i) => walk(c, level + 1, code + '.' + (i + 1), kidParents));
    if (node.acts) node.acts.forEach(a => {
      const blStart = D(origin, a.o), blFinish = D(origin, a.o + a.dur);
      const sl = Math.round(a.slip * slipFactor);   // this project's actual slip on this activity
      const curStart = D(origin, a.o + Math.round(sl * 0.5)), curFinish = D(origin, a.o + a.dur + sl);
      // progress = where the data date falls in the activity's window (S-curve),
      // with a little per-activity variation; independent of any project tech %
      const winFrac = Math.max(0, Math.min(1, (effOffset - a.o) / (a.dur || 1)));
      const jitter = winFrac > 0 && winFrac < 1 ? Math.round(r() * 8 - 4) : 0;
      const pct = a.milestone ? (effOffset >= a.o + a.dur ? 100 : 0)
        : Math.max(0, Math.min(100, Math.round(winFrac * 100) + jitter));
      const cost = a.milestone ? 0 : Math.round(budget * 0.92 * a.dur / totalDur);
      const manHours = a.milestone ? 0 : Math.round(a.dur * (7 + r() * 10) * 8);
      acts.push({ type: 'act', level: level + 1, id: a.id, name: a.name, wbs: node.name, wbsCode: code, parents: kidParents,
        blStart, blFinish, curStart, curFinish, pct, critical: a.crit, milestone: a.milestone,
        origDur: a.dur, remDur: a.milestone ? 0 : Math.round(a.dur * (1 - pct / 100)),
        actType: a.milestone ? (AR ? 'معلم إنهاء' : 'Finish Milestone') : (AR ? 'مهمة معتمدة على المورد' : 'Task Dependent'),
        calendar: AR ? 'دوام 6 أيام/أسبوع' : '6-Day Workweek',
        cost, manHours, weight: +(a.dur / totalDur).toFixed(4),
        float: a.crit ? 0 : Math.round(r() * 18), slip: sl, preds: a.preds });
    });
  })(tree, 1, 'PRJ', []);
  // WBS weight engine (BOQ↔Activity assignment): absolute % = share of total project; relative % = share of immediate parent WBS group.
  const flatW = acts.filter(x => x.type === 'act' && !x.milestone);
  const totalCostAll = flatW.reduce((s, x) => s + x.cost, 0) || 1;
  const totalMHAll = flatW.reduce((s, x) => s + x.manHours, 0) || 1;
  const wbsCostAgg = {}, wbsMHAgg = {};
  flatW.forEach(x => { x.parents.forEach(c => { wbsCostAgg[c] = (wbsCostAgg[c] || 0) + x.cost; wbsMHAgg[c] = (wbsMHAgg[c] || 0) + x.manHours; }); });
  const parentOf = {}; acts.filter(x => x.type === 'wbs').forEach(w => { parentOf[w.code] = w.parents.length ? w.parents[w.parents.length - 1] : null; });
  acts.forEach(x => {
    if (x.type === 'act') {
      if (x.milestone) { x.wCostAbs = 0; x.wMHAbs = 0; x.wCostRel = 0; x.wMHRel = 0; return; }
      x.wCostAbs = +(x.cost / totalCostAll * 100).toFixed(2); x.wMHAbs = +(x.manHours / totalMHAll * 100).toFixed(2);
      const gC = wbsCostAgg[x.wbsCode] || 1, gM = wbsMHAgg[x.wbsCode] || 1;
      x.wCostRel = +(x.cost / gC * 100).toFixed(2); x.wMHRel = +(x.manHours / gM * 100).toFixed(2);
    } else {
      const c = wbsCostAgg[x.code] || 0, m = wbsMHAgg[x.code] || 0;
      x.wCostAbs = +(c / totalCostAll * 100).toFixed(2); x.wMHAbs = +(m / totalMHAll * 100).toFixed(2);
      const pc = parentOf[x.code], pC = pc ? (wbsCostAgg[pc] || 1) : totalCostAll, pM = pc ? (wbsMHAgg[pc] || 1) : totalMHAll;
      x.wCostRel = +(c / pC * 100).toFixed(2); x.wMHRel = +(m / pM * 100).toFixed(2);
    }
  });
  const flat = acts.filter(a => a.type === 'act');
  const dataDate = D(origin, effOffset);
  const baselineFinish = flat[flat.length - 1].blFinish;
  const forecastFinish = flat[flat.length - 1].curFinish;
  // §2.1.2 — a project suspended by administrative order freezes its contractual-
  // duration counter at the stop date, so delay stops accruing while frozen.
  const frozen = !!(p && (p.status === 'suspended' || p.status === 'withdrawn'));
  const rawDelay = Math.round((new Date(forecastFinish) - new Date(baselineFinish)) / 86400000);
  const delayDays = frozen ? Math.round(rawDelay * stopFrac) : rawDelay;
  return {
    origin, frozen, freezeDate: frozen ? dataDate : null,
    dataDate, baselineFinish, forecastFinish, delayDays,
    criticalCount: flat.filter(a => a.critical && !a.milestone).length,
    negFloatCount: flat.filter(a => a.float === 0 && a.slip > 0 && !a.milestone).length,
    totalCost: totalCostAll, totalManHours: totalMHAll,
    activities: acts,
    milestones: isSupply ? [
      { name: AR ? '\u0641\u062a\u062d \u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u064a' : 'LC opened', date: D(origin, 45), status: tech > 15 ? 'done' : 'due' },
      { name: AR ? '\u0648\u0635\u0648\u0644 \u0627\u0644\u0634\u062d\u0646\u0629 \u0648\u0627\u0644\u062a\u062e\u0644\u064a\u0635' : 'Shipment cleared', date: D(origin, 235), status: tech > 55 ? 'done' : 'due' },
      { name: AR ? '\u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0646\u0647\u0627\u0626\u064a' : 'Final receipt', date: forecastFinish, status: 'due' },
    ] : [
      { name: AR ? '\u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u062a\u0635\u0645\u064a\u0645' : 'Design approval', date: D(origin, -10), status: 'done' },
      { name: AR ? '\u0625\u0646\u062c\u0627\u0632 \u0627\u0644\u0647\u064a\u0643\u0644' : 'Structure complete', date: D(origin, 210), status: tech > 60 ? 'done' : 'due' },
      { name: AR ? '\u0627\u0644\u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a' : 'Preliminary handover', date: forecastFinish, status: 'due' },
    ],
    versions: [
      { id: 'v3', type: 'current', label: AR ? '\u0627\u0644\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u064a' : 'Current update', date: dataDate, by: '\u0623\u062d\u0645\u062f \u0641\u0624\u0627\u062f', status: 'approved', current: true, notes: AR ? '\u062a\u062d\u062f\u064a\u062b \u062a\u0645\u0648\u0632' : 'July update' },
      { id: 'v2', type: 'revised', label: AR ? '\u062c\u062f\u0648\u0644 \u0645\u0646\u0642\u0651\u062d' : 'Revised schedule', date: D(origin, 120), by: '\u0644\u064a\u0644\u0649 \u062d\u0633\u0646', status: 'approved', current: false, notes: AR ? '\u0628\u0639\u062f \u0627\u0644\u0623\u0645\u0631 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u064a 1' : 'After VO-01' },
      { id: 'v1', type: 'baseline', label: AR ? '\u0627\u0644\u062e\u0637 \u0627\u0644\u0623\u0633\u0627\u0633' : 'Baseline', date: origin, by: '\u0645\u0635\u0637\u0641\u0649 \u0639\u0644\u064a', status: 'approved', current: false, notes: AR ? '\u0627\u0644\u062e\u0637 \u0627\u0644\u0623\u0633\u0627\u0633 \u0627\u0644\u0645\u0639\u062a\u0645\u062f' : 'Approved baseline' },
    ],
    comparison: {
      added: [{ id: 'A10', name: AR ? 'أعمال تنسيق الموقع' : 'Site landscaping' }],
      deleted: [],
      changed: flat.filter(a => a.slip > 0 && !a.milestone).slice(0, 4).map(a => ({ id: a.id, name: a.name, field: AR ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u062c\u0627\u0632' : 'Finish date', from: a.blFinish, to: a.curFinish, slip: a.slip })),
      nowCritical: flat.filter(a => a.critical && a.slip > 10 && !a.milestone).slice(0, 2).map(a => ({ id: a.id, name: a.name })),
    },
  };
}

// ---------- 3D Model dataset (Requirements 04) ----------
function buildModelData(p, lang) {
  const AR = lang === 'ar';
  const { start, plannedFinish } = buildSchedule(p);
  const mk = (id, nameAr, nameEn, disc, discAr, status, level, zone, qty, unit, boqCode, boqAr, boqEn, actId, actAr, actEn, prog, crit) => ({
    id, name: AR ? nameAr : nameEn, discipline: AR ? discAr : disc, discKey: disc, status,
    level, zone, qty, unit, boqCode, boqDesc: AR ? boqAr : boqEn,
    activityId: actId, activityName: AR ? actAr : actEn, plannedStart: start, plannedFinish,
    progress: prog, critical: crit, revision: 'R2',
  });
  const objects = [
    mk('FND-01', 'الأساسات', 'Foundations', 'Structural', 'إنشائي', 'completed', 'L00', 'Zone A', 420, AR?'م3':'m3', 'ST-100', 'أعمال خرسانة الأساسات', 'Foundation concrete', 'A3', 'الأساسات', 'Foundations', 100, true),
    mk('COL-L1', 'أعمدة الطابق الأول', 'Level 1 columns', 'Structural', 'إنشائي', 'completed', 'L01', 'Zone A', 68, AR?'عمود':'ea', 'ST-120', 'أعمدة خرسانية', 'Concrete columns', 'A4', 'الهيكل الخرساني', 'Concrete structure', 100, true),
    mk('SLB-L1', 'سقف الطابق الأول', 'Level 1 slab', 'Structural', 'إنشائي', 'completed', 'L01', 'Zone A', 640, AR?'م2':'m2', 'ST-140', 'بلاطة خرسانية', 'Concrete slab', 'A5', 'الأسقف والمدرجات', 'Slabs & stairs', 100, false),
    mk('SLB-L2', 'سقف الطابق الثاني', 'Level 2 slab', 'Structural', 'إنشائي', 'inprogress', 'L02', 'Zone A', 640, AR?'م2':'m2', 'ST-140', 'بلاطة خرسانية', 'Concrete slab', 'A5', 'الأسقف والمدرجات', 'Slabs & stairs', 72, false),
    mk('DUCT-L2-01', 'مجرى هواء - ميكانيك', 'Duct run — mechanical', 'Mechanical', 'ميكانيكي', 'delayed', 'L02', 'Zone A', 85, AR?'م.ط':'lm', 'ME-210', 'مجاري تكييف', 'HVAC ductwork', 'A8', 'الأعمال الميكانيكية', 'Mechanical works', 35, true),
    mk('CND-L2-01', 'مسارات كهرباء', 'Electrical conduit', 'Electrical', 'كهربائي', 'inprogress', 'L02', 'Zone A', 120, AR?'م.ط':'lm', 'EL-205', 'مسارات ومجاري كهرباء', 'Electrical containment', 'A7', 'الأعمال الكهربائية', 'Electrical works', 48, true),
  ];
  const drawings = {
    'DUCT-L2-01': [
      { no: 'ME-DWG-021', title: AR ? 'مخطط تمديدات التكييف - ط2' : 'HVAC layout — L2', disc: AR ? 'ميكانيكي' : 'Mechanical', rev: 'R3', status: 'approved', date: '2026-04-08', current: true },
      { no: 'ME-DWG-021', title: AR ? 'مخطط تمديدات التكييف - ط2' : 'HVAC layout — L2', disc: AR ? 'ميكانيكي' : 'Mechanical', rev: 'R2', status: 'superseded', date: '2026-01-22', current: false },
      { no: 'ME-DWG-021', title: AR ? 'مخطط تمديدات التكييف - ط2' : 'HVAC layout — L2', disc: AR ? 'ميكانيكي' : 'Mechanical', rev: 'R1', status: 'superseded', date: '2025-10-05', current: false },
    ],
    'SLB-L2': [
      { no: 'ST-DWG-140', title: AR ? 'تفاصيل بلاطة ط2' : 'L2 slab details', disc: AR ? 'إنشائي' : 'Structural', rev: 'R2', status: 'approved', date: '2026-03-02', current: true },
    ],
  };
  const images = [
    { id: 'IMG1', cat: AR ? 'صورة تقدم' : 'Progress photo', title: AR ? 'تركيب مجاري الهواء' : 'Duct installation', date: '2026-06-14', by: 'م. سارة', tint: '#8aa2c8' },
    { id: 'IMG2', cat: AR ? 'صورة موقع' : 'Site reference', title: AR ? 'الطابق الثاني - عام' : 'L2 overview', date: '2026-05-30', by: 'م. أحمد', tint: '#a8b59a' },
    { id: 'IMG3', cat: AR ? 'دليل تركيب' : 'Installation photo', title: AR ? 'وصلات التكييف' : 'HVAC connections', date: '2026-06-02', by: 'م. ليلى', tint: '#c8b48a' },
  ];
  return {
    objects, drawings, images,
    versions: [
      { id: 'm3', label: AR ? 'الإصدار الحالي' : 'Current version', date: '2026-06-01', by: 'م. أحمد فؤاد', status: AR ? 'الحالي' : 'Current', current: true },
      { id: 'm2', label: AR ? 'الإصدار 2' : 'Version 2', date: '2026-02-15', by: 'م. ليلى حسن', status: AR ? 'سابق' : 'Previous', current: false },
      { id: 'm1', label: AR ? 'الإصدار 1' : 'Version 1', date: '2025-11-20', by: 'م. مصطفى', status: AR ? 'سابق' : 'Previous', current: false },
    ],
  };
}

// ---------- Alerts engine dataset (IA §17) ----------
function buildAlertsData(p, lang) {
  const AR = lang === 'ar';
  const st = p ? p.status : 'ongoing';
  const alerts = [
    { id: 'AL-091', sev: 'red', type: AR ? 'مسار حرج' : 'Critical path', title: AR ? 'نشاط حرج «الأعمال الميكانيكية» متأخر 18 يوماً' : 'Critical activity “Mechanical works” delayed 18 days', src: AR ? 'الجدول الزمني · A8' : 'Schedule · A8', tab: 'schedule', when: '2026-07-18', status: 'open', sla: AR ? 'خلال يومين' : 'in 2 days',
      esc: [{ role: AR ? 'مدير المشروع' : 'Project manager', at: '2026-07-18', done: true }, { role: AR ? 'مدير القسم الهندسي' : 'Engineering head', at: '2026-07-20', done: false }, { role: AR ? 'الوكيل الفني' : 'Technical deputy', at: '2026-07-23', done: false }] },
    { id: 'AL-088', sev: 'amber', type: AR ? 'مالي' : 'Financial', title: AR ? 'الصرف التراكمي بلغ 92% من التخصيص السنوي' : 'Cumulative spend reached 92% of annual allocation', src: AR ? 'المالية' : 'Financials', tab: 'financial', when: '2026-07-11', status: 'open', sla: AR ? 'خلال 5 أيام' : 'in 5 days',
      esc: [{ role: AR ? 'المحاسب' : 'Accountant', at: '2026-07-11', done: true }, { role: AR ? 'مدير المشروع' : 'Project manager', at: '2026-07-15', done: false }] },
    { id: 'AL-085', sev: 'amber', type: AR ? 'معلم' : 'Milestone', title: AR ? 'معلم «إنجاز الهيكل» يقترب خلال 10 أيام' : 'Milestone “Structure complete” approaching in 10 days', src: AR ? 'الجدول الزمني' : 'Schedule', tab: 'schedule', when: '2026-07-09', status: 'ack', sla: '—',
      esc: [{ role: AR ? 'مدير المشروع' : 'Project manager', at: '2026-07-09', done: true }] },
    { id: 'AL-082', sev: 'green', type: AR ? 'وثائق' : 'Documents', title: AR ? 'وثيقة إلزامية مفقودة: شهادة فحص المواد' : 'Mandatory document missing: material test certificate', src: AR ? 'الوثائق والمخططات' : 'Documents', tab: 'documents', when: '2026-07-02', status: 'snoozed', sla: AR ? 'مؤجل ليومين' : 'snoozed 2d',
      esc: [{ role: AR ? 'مسؤول الوثائق' : 'Document controller', at: '2026-07-02', done: true }] },
    { id: 'AL-079', sev: 'amber', type: AR ? 'إجراء' : 'Action', title: AR ? 'إجراء اجتماع متأخر: تسريع أعمال الكهرباء' : 'Overdue meeting action: accelerate electrical works', src: AR ? 'الاجتماعات والإجراءات' : 'Meetings & Actions', tab: 'meetings', when: '2026-06-28', status: 'open', sla: AR ? 'متأخر 3 أيام' : 'overdue 3d',
      esc: [{ role: AR ? 'المقاول' : 'Contractor', at: '2026-06-28', done: true }, { role: AR ? 'المهندس المقيم' : 'Resident engineer', at: '2026-07-01', done: false }] },
  ].filter((_, i) => (st === 'completed' ? i > 1 : true));
  const rules = [
    { id: 'R1', name: AR ? 'تأخر نشاط على المسار الحرج' : 'Critical-path activity delay', trigger: AR ? 'انزياح ≥ 5 أيام' : 'Slip ≥ 5 days', sev: 'red', channels: { inapp: true, email: true, sms: true }, recurring: AR ? 'يومي' : 'Daily', escalateAfter: AR ? '48 ساعة' : '48h', enabled: true },
    { id: 'R2', name: AR ? 'تجاوز الصرف للتخصيص' : 'Spend exceeds allocation', trigger: AR ? 'الصرف ≥ 90%' : 'Spend ≥ 90%', sev: 'amber', channels: { inapp: true, email: true, sms: false }, recurring: AR ? 'أسبوعي' : 'Weekly', escalateAfter: AR ? '5 أيام' : '5 days', enabled: true },
    { id: 'R3', name: AR ? 'اقتراب معلم' : 'Milestone approaching', trigger: AR ? 'قبل 14 يوماً' : '14 days before', sev: 'amber', channels: { inapp: true, email: false, sms: false }, recurring: AR ? 'مرة واحدة' : 'Once', escalateAfter: '—', enabled: true },
    { id: 'R4', name: AR ? 'تقرير تقدم شهري مفقود' : 'Monthly progress missing', trigger: AR ? 'بعد يوم 5 من الشهر' : 'After 5th of month', sev: 'amber', channels: { inapp: true, email: true, sms: false }, recurring: AR ? 'يومي' : 'Daily', escalateAfter: AR ? '3 أيام' : '3 days', enabled: true },
    { id: 'R5', name: AR ? 'وثيقة إلزامية مفقودة' : 'Mandatory document missing', trigger: AR ? 'عند تغيّر المرحلة' : 'On stage change', sev: 'green', channels: { inapp: true, email: false, sms: false }, recurring: AR ? 'مرة واحدة' : 'Once', escalateAfter: '—', enabled: false },
  ];
  return { alerts, rules };
}

window.EPM = { STR, makeT, WORKSPACES, FORMATIONS, STATUS, BRANCHES, EXECUTORS, buildProjects, buildSchedule, buildScheduleData, buildModelData, buildAlertsData, ACTIVITY, ROLES, MATRIX_ENTITIES, MATRIX_ACTIONS, AUDIT, CURRENT_USER, PROJECT_MODULES, READINESS, buildReadiness, buildProjectDetail, VO_STATUS, DOC_STATUS, DOC_DISCIPLINES, ADMIN_GROUPS, ADMIN_PROJECTS, ASSIGNMENTS, NOTIFICATIONS, FUNDING_TYPES, PROJECT_TYPES, PROJECT_STAGES, CONTRACT_STATUS_LIST };
