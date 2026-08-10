// Change-order register + record. The record is an official document: what was
// requested, what was approved, what was applied — values, quantities, weights,
// money and time. No project/WBS/relationship noise in the main tables.
// Loaded after project-modules.jsx so this DModVO replaces the earlier one.

const VO_APPLY = {
  na: { ar: 'غير مطلوب', en: 'Not required', cls: '' },
  todo: { ar: 'لم يبدأ', en: 'Not started', cls: '' },
  wip: { ar: 'قيد التنفيذ', en: 'In progress', cls: 'ongoing' },
  done: { ar: 'مكتمل', en: 'Complete', cls: 'completed' },
  fail: { ar: 'فشل', en: 'Failed', cls: 'stalled' },
};

// Six system-owned stages — one per مرحلة in the ministry flowchart. External
// parties (contractor, consultant, minister, finance directorate, contracts
// section) are not stages: they are statuses recorded INSIDE the owning stage by
// a delegated system user, against an official letter.
const VO_EXT_STATE = {
  wait: { ar: 'بانتظار الجهة', en: 'Awaiting party', cls: '' },
  in: { ar: 'وردت', en: 'Received', cls: 'completed' },
  back: { ar: 'أُعيد', en: 'Returned', cls: 'stalled' },
  na: { ar: 'غير مطلوب', en: 'Not required', cls: '' },
};
// Simulating the viewer. Every workflow party is a persona, plus an observer who
// is not in the chain at all and the rapporteur who records for external parties.
const VO_PERSONAS = AR => [
  { key: 'observer', label: AR ? 'مراقب — خارج المسار' : 'Observer — outside the workflow', party: null },
  { key: 're', label: AR ? 'دائرة المهندس المقيم' : 'RE department', party: AR ? 'دائرة المهندس المقيم' : 'RE department' },
  { key: 'cttee', label: AR ? 'لجنة أوامر الغيار' : 'Change-order committee', party: AR ? 'لجنة أوامر الغيار' : 'Change-order committee' },
  { key: 'rate', label: AR ? 'لجنة تثبيت الأسعار' : 'Rate-fixing committee', party: AR ? 'لجنة تثبيت الأسعار' : 'Rate-fixing committee' },
  { key: 'pm', label: AR ? 'مدير المشروع' : 'Project manager', party: AR ? 'مدير المشروع' : 'Project manager' },
  { key: 'senior', label: AR ? 'المستوى الإداري الأعلى' : 'Senior management', party: AR ? 'المستوى الإداري الأعلى' : 'Senior management' },
  { key: 'rapporteur', label: AR ? 'مقرّر لجنة أوامر الغيار (مندوب)' : 'Committee rapporteur (delegate)', party: null, delegate: true },
];
const VO_REL = {
  none: { ar: 'للاطلاع', en: 'View only', cls: '', ico: 'visibility' },
  awaiting: { ar: 'بانتظار إجرائك', en: 'Awaiting your action', cls: 'stalled', ico: 'pending_actions' },
  acted: { ar: 'تم إجراؤك', en: 'You have acted', cls: 'completed', ico: 'check_circle' },
  upcoming: { ar: 'سيصلك لاحقاً', en: 'Reaches you later', cls: 'ongoing', ico: 'schedule' },
  recorder: { ar: 'تسجيل نيابة عن جهة خارجية', en: 'Recording for an external party', cls: 'suspended', ico: 'edit_note' },
};
// where the viewer stands in one order's chain
function voRelation(rec, persona, AR) {
  const st = rec.chainStages || [];
  if (persona.delegate) {
    const cur = st.find(s => s.status === 'active' || s.status === 'overdue');
    const waiting = cur && (cur.pending || []).length > 0;
    return { key: waiting ? 'recorder' : 'none', stage: waiting ? cur : null };
  }
  if (!persona.party) return { key: 'none', stage: null };
  const mine = st.filter(s => s.party === persona.party);
  if (!mine.length) return { key: 'none', stage: null };
  const active = mine.find(s => s.status === 'active' || s.status === 'overdue' || s.status === 'rejected');
  if (active) return { key: 'awaiting', stage: active };
  const todo = mine.find(s => s.status === 'todo');
  const done = mine.filter(s => s.status === 'done');
  if (todo) return { key: done.length ? 'acted' : 'upcoming', stage: todo, alsoActed: done.length > 0 };
  return { key: 'acted', stage: done[done.length - 1] };
}

const VO_STAGES = (AR, o) => [
  { key: 're1', label: AR ? 'دراسة الطلب' : 'Request study',
    owner: AR ? 'دائرة المهندس المقيم' : 'RE department', ico: 'engineering',
    note: AR ? 'يُدخل المهندس المقيم الأمر بعد ورود طلب المقاول ورأي الاستشاري، ثم يدقّقه ويعيده إلى المقاول عند وجود نقص' : 'Entered by the resident engineer after the contractor’s request and the consultant’s opinion, then reviewed',
    ext: [] },
  { key: 'cttee', label: AR ? 'لجنة أوامر الغيار' : 'Change-order committee',
    owner: AR ? 'لجنة أوامر الغيار' : 'Change-order committee', ico: 'account_tree',
    note: AR ? 'تدقيق الطلب وتنظيم الاستمارات، وإعادته إلى المهندس المقيم عند وجود نقص' : 'Reviews the request and prepares the forms; returns it if incomplete',
    ext: [] },
  { key: 'rate', label: AR ? 'تثبيت الأسعار' : 'Rate fixing',
    owner: AR ? 'لجنة تثبيت الأسعار' : 'Rate-fixing committee', ico: 'difference',
    note: AR ? 'تثبيت سعر الكمية الزائدة عن 20% ثم إعادة القرار إلى لجنة أوامر الغيار' : 'Fixes the rate beyond 20% and returns the decision',
    cond: 'needsRate', ext: [] },
  { key: 'endorse', cond: 'endorse', label: AR ? 'المصادقة والتخصيص' : 'Endorsement & allocation',
    owner: AR ? 'لجنة أوامر الغيار' : 'Change-order committee', ico: 'payments',
    note: AR ? 'رفع المحضر للوزير، مع استحصال الموافقات الخارجية اللازمة' : 'Minute raised to the Minister with the required external approvals',
    ext: [
      ...(o.overQuarter ? [{ party: AR ? 'لجنة المراجعة المصادقة' : 'Endorsement review committee',
        act: AR ? 'الموافقة على المدة الإضافية — تتجاوز ربع مدة العقد' : 'Approval of added duration beyond a quarter of the contract',
        delegate: AR ? 'مقرّر لجنة أوامر الغيار' : 'Change-order committee rapporteur', cancels: true }] : []),
      ...(o.needsFunds ? [{ party: AR ? 'الدائرة الإدارية والمالية' : 'Admin & finance directorate',
        act: AR ? 'توفير التخصيص المالي' : 'Securing the allocation',
        delegate: AR ? 'مقرّر لجنة أوامر الغيار' : 'Change-order committee rapporteur', cancels: true }] : []),
    ] },
  { key: 'order', label: AR ? 'الأمر الوزاري وملحق العقد' : 'Ministerial order & addendum',
    owner: AR ? 'لجنة أوامر الغيار' : 'Change-order committee', ico: 'verified_user',
    note: AR ? 'صدور الأمر الوزاري ثم إصدار ملحق العقد' : 'Ministerial order issued, then the contract addendum',
    ext: [
      { party: AR ? 'الوزير / المفوَّض' : 'Minister / delegate', act: AR ? 'المصادقة وإصدار الأمر الوزاري' : 'Endorsement and ministerial order',
        delegate: AR ? 'مقرّر لجنة أوامر الغيار' : 'Change-order committee rapporteur' },
      { party: AR ? 'قسم العقود الحكومية' : 'Government contracts section', act: AR ? 'إصدار ملحق العقد' : 'Issuing the contract addendum',
        delegate: AR ? 'مقرّر لجنة أوامر الغيار' : 'Change-order committee rapporteur' },
    ] },
  { key: 'exec', label: AR ? 'التنفيذ' : 'Execution',
    owner: AR ? 'دائرة المهندس المقيم' : 'RE department', ico: 'done',
    note: AR ? 'تحديث العقد وبنود الكميات والجدول الزمني' : 'Contract, BOQ and schedule updated',
    ext: [] },
];
const VO_DECISIONS = [
  ['approve', { ar: 'موافقة', en: 'Approve' }],
  ['reject', { ar: 'رفض', en: 'Reject' }],
  ['return', { ar: 'إعادة للتعديل', en: 'Return for revision' }],
  ['cancel', { ar: 'إلغاء الموضوع', en: 'Cancel the order' }],
];

const VO_WSTATE = {
  none: { ar: 'لم يُحتسب', en: 'Not calculated' },
  review: { ar: 'محسوب للمراجعة', en: 'Calculated for review' },
  approved: { ar: 'معتمد', en: 'Approved' },
  applied: { ar: 'مطبق', en: 'Applied' },
  fail: { ar: 'فشل التحقق', en: 'Validation failed' },
};

// Derive the record view from the stored order + the project's BOQ/schedule.
function voRecord(v, d, lang, i, p) {
  const AR = lang === 'ar';
  const addD = (iso, n) => { const x = new Date(iso); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const approved = v.status === 'approved';
  const rejected = v.status === 'rejected';
  // applied/closed is a separate state from approved: only the first approved order got that far
  const lifecycle = approved ? ((i === 0 || i === 3) ? 'closed' : 'applied_partial') : v.status;
  const appliedAll = lifecycle === 'closed';
  const sd = p && window.EPM && window.EPM.buildScheduleData ? window.EPM.buildScheduleData(p, lang) : null;
  // weight is a share of the CONTRACT, so scope the denominator to the order's
  // contract before totalling — the register does the same, and an unscoped
  // project-wide total made the two tabs disagree on the same item
  const vck = window.voContractKey ? window.voContractKey(v, d.contracts) : null;
  const scopedBoq = (d.boq || []).filter(b => !vck || !window.contractKeyOfBoq
    || window.contractKeyOfBoq(b, d.contracts) === vck);
  const boqSum = scopedBoq.reduce((s, b) => s + b.total, 0) || 1;
  const appDays = approved ? v.appExt : null;
  const pend = v.status === 'rejected' ? 'na' : 'todo';   // not approved yet ≠ not required

  // 20% rule: change up to 20% of the original quantity is valued at the
  // original rate; the excess carries a new rate proposed by المقاول and د.م.م
  // and fixed by لجنة تثبيت الأسعار.
  const TIER = 0.20;
  const tierOf = (b, dv, exRate) => {
    const thr = b.qtyBefore * TIER;
    const at = Math.min(Math.abs(dv), thr), ex = Math.max(0, Math.abs(dv) - thr);
    const sign = dv < 0 ? -1 : 1;
    const rate = exRate == null ? b.rate : exRate;
    return { thr, at, ex, exceeds: ex > 0.001, exRate: exRate,
      delta: sign * (at * b.rate + ex * rate), qtyAfter: b.qtyBefore + dv };
  };
  const linesBase = (v.affectedBOQ || []).map((b, j) => {
    const dvCon = b.qtyAfter - b.qtyBefore;
    const chg = dvCon > 0 ? 'inc' : dvCon < 0 ? 'dec' : 'rate';
    // د.م.م reviewed the contractor's figure downward on the second line
    const dvRe = j === 1 ? Math.round(dvCon * 0.85) : dvCon;
    const exRateCon = Math.round(b.rate * 1.12), exRateRe = Math.round(b.rate * 1.06);
    const con = tierOf(b, dvCon, exRateCon);
    const re = tierOf(b, dvRe, exRateRe);
    // لجنة تثبيت الأسعار fixes the excess rate; لجنة التسعير then fixes the value
    const exRateApproved = approved && (con.exceeds || re.exceeds) ? Math.round(b.rate * 1.04) : null;
    const app = approved ? tierOf(b, dvRe, exRateApproved) : null;
    const valBefore = b.qtyBefore * b.rate;
    const qtyApproved = approved ? app.qtyAfter : null;
    const valAfter = approved ? valBefore + app.delta : valBefore + re.delta;
    return { ...b, chg, con, re, app, exRateCon, exRateRe, exRateApproved,
      exceeds: con.exceeds || re.exceeds,
      delta: dvCon, dvCon, dvRe, qtyProposed: b.qtyAfter, qtyProposedRe: re.qtyAfter, qtyApproved,
      rateApproved: approved ? b.rate : null,
      valBefore, reqDelta: con.delta, reDelta: re.delta, appDelta: approved ? app.delta : null, valAfter,
      wBefore: +(valBefore / boqSum * 100).toFixed(2),
      apply: !approved ? pend : appliedAll ? 'done' : (j === 0 ? 'done' : 'fail') };
  });
  const netCon = linesBase.reduce((a, l) => a + l.reqDelta, 0);
  const netRe = linesBase.reduce((a, l) => a + l.reDelta, 0);
  const appValue = approved ? Math.round(linesBase.reduce((a, l) => a + (l.appDelta || 0), 0)) : null;
  const lines = linesBase.map(l => {
    const wApproved = approved ? +(l.valAfter / (boqSum + (appValue || 0)) * 100).toFixed(2) : null;
    return { ...l,
      wCon: +((l.valBefore + l.reqDelta) / (boqSum + netCon) * 100).toFixed(2),
      wProposed: +((l.valBefore + l.reDelta) / (boqSum + netRe) * 100).toFixed(2),
      wApproved, wApplied: appliedAll ? wApproved : null };
  });

  const schedActs = (sd && sd.activities) || [];
  const dataDate = (sd && sd.dataDate) || v.inDate;
  const activities = (v.affectedActivities || []).map((a, j) => {
    // the real activity is the source of dates, progress and remaining duration
    const src = schedActs.find(x => x.id === a.id) || {};
    const startBefore = src.curStart || src.blStart || v.inDate;
    const finishBefore = src.curFinish || src.blFinish || addD(v.inDate, 30);
    const pct = src.pct != null ? src.pct : 55 + j * 12;
    // remaining = what is left from the data date to the forecast finish
    const remBefore = pct >= 100 ? 0 : Math.max(1, Math.round((new Date(finishBefore) - new Date(dataDate)) / 86400000));
    const reqChange = a.slip;
    const remApproved = approved ? remBefore + Math.round(reqChange * (j === 1 ? 0.7 : 1)) : null;
    return { ...a, name: src.name || a.name, chg: AR ? 'زيادة المدة' : 'Increase duration', pct, remBefore, reqChange,
      remProposed: remBefore + reqChange, remApproved,
      startBefore, startApproved: approved ? startBefore : null,
      finishBefore, finishApproved: approved ? addD(finishBefore, remApproved - remBefore) : null,
      apply: !approved ? 'na' : appliedAll ? 'done' : 'wip',
      calendar: AR ? 'دوام 6 أيام/أسبوع' : '6-Day Workweek',
      float: src.float != null ? src.float : (a.critical ? 0 : 8 + j * 3) };
  });

  const redistribution = v.supply ? [{
    src: (lines[0] || {}).code || '—', tgt: (lines[1] || {}).code || '—', drawn: v.supply.qtyBefore - v.supply.qtyAfter,
    added: v.supply.qtyBefore - v.supply.qtyAfter, diff: 0,
    money: Math.round((approved ? appValue : netRe) * 0.4), apply: approved ? (appliedAll ? 'done' : 'wip') : 'na',
  }] : [];

  const wSumBefore = 100;
  const wSumAfter = approved ? 100 : 100 + (lines.reduce((s, l) => s + (l.wProposed - l.wBefore), 0));
  const weight = {
    state: rejected ? 'none' : approved ? (appliedAll ? 'applied' : 'approved') : 'review',
    sumBefore: wSumBefore, sumAfter: +wSumAfter.toFixed(2),
    valid: Math.abs(wSumAfter - 100) < 0.05, lastCalc: approved ? addD(v.inDate, 21) : addD(v.inDate, 6),
  };

  const anyExceeds = lines.some(l => l.exceeds);
  // d.schedule does not exist; the contractual finish comes from the schedule builder
  const baseFinish = (sd && sd.baselineFinish) || (d.contract && d.contract.raw && d.contract.raw.finish) || addD(v.inDate, 200);
  const steps = [
    ['amend', AR ? 'إصدار ملحق العقد' : 'Issue contract amendment', approved ? (appliedAll ? 'done' : 'wip') : pend],
    ['contract', AR ? 'تحديث قيمة العقد النافذة' : 'Update effective contract value', approved ? 'done' : pend],
    ['qty', AR ? 'تحديث كميات البنود' : 'Update BOQ quantities', approved ? (appliedAll ? 'done' : 'wip') : pend],
    ['rate', AR ? 'تحديث أسعار الوحدات' : 'Update unit rates', anyExceeds || lines.some(l => l.chg === 'rate') ? (approved ? 'done' : pend) : 'na'],
    ['weight', AR ? 'إعادة احتساب الأوزان' : 'Recalculate weights', approved ? (appliedAll ? 'done' : 'fail') : pend],
    ['acts', AR ? 'تحديث الأنشطة' : 'Update activities', activities.length ? (approved ? (appliedAll ? 'done' : 'wip') : pend) : 'na'],
    ['sched', AR ? 'تحديث الجدول الزمني' : 'Update schedule', activities.length ? (approved ? (appliedAll ? 'done' : 'todo') : pend) : 'na'],
    ['penalty', AR ? 'إعادة احتساب الغرامات التأخيرية' : 'Recalculate delay penalties',
      (appDays || 0) > 0 ? (approved ? (appliedAll ? 'done' : 'todo') : pend) : 'na'],
    ['verify', AR ? 'التحقق النهائي' : 'Final verification', appliedAll ? 'done' : pend],
  ];

  // the order is entered by the resident engineer's department, whatever party asked for it
  const enteredBy = AR ? 'دائرة المهندس المقيم' : 'RE department';
  const respVia = null;
  const log = [
    { date: addD(v.inDate, -9) + ' 10:20', actor: AR ? 'المقاول' : 'Contractor', act: AR ? 'ورود طلب أمر الغيار' : 'Change-order request received', stage: AR ? 'قبل الإدخال' : 'Before entry', from: '—', to: 'IN-' + (4200 + i * 3), note: AR ? 'كتاب رسمي — يسبق إدخال الأمر' : 'Official letter, precedes entry', ver: 'v1' },
    { date: addD(v.inDate, -3) + ' 09:05', actor: AR ? 'الاستشاري المصمم والمدقق' : 'Designer & checking consultant', act: AR ? 'ورود رأي الاستشاري' : 'Consultant opinion received', stage: AR ? 'قبل الإدخال' : 'Before entry', from: '—', to: 'IN-' + (4300 + i * 3), note: AR ? 'الموافقة على الفقرات' : 'Items approved', ver: 'v1' },
    { date: v.inDate + ' 09:14', actor: enteredBy, via: respVia, act: AR ? 'إنشاء الأمر' : 'Order created', stage: AR ? 'إعداد الطلب' : 'Preparation', from: '—', to: v.no, note: v.reason, ver: 'v1' },
    { date: addD(v.inDate, 1) + ' 11:02', actor: enteredBy, via: respVia, act: AR ? 'تعديل كميات بنود' : 'BOQ quantities edited', stage: AR ? 'إعداد الطلب' : 'Preparation',
      from: lines[0] ? window.fmtNum(lines[0].qtyBefore) : '—', to: lines[0] ? window.fmtNum(lines[0].qtyProposed) : '—', note: '—', ver: 'v1' },
    { date: addD(v.inDate, 2) + ' 08:40', actor: enteredBy, via: respVia, act: AR ? 'الإرسال للمراجعة' : 'Submitted for review', stage: AR ? 'التدقيق الفني' : 'Technical review', from: AR ? 'مسودة' : 'Draft', to: AR ? 'قيد الاعتماد' : 'Pending', note: '—', ver: 'v1' },
    ...(activities.length ? [{ date: addD(v.inDate, 6) + ' 13:20', actor: AR ? 'مهندس التخطيط' : 'Planning engineer', act: AR ? 'تحليل الأثر الزمني' : 'Schedule impact analysed',
      stage: AR ? 'تحليل الجدول' : 'Schedule analysis', from: v.reqExt + (AR ? ' يوم مطلوب' : 'd requested'), to: (v.appExt || v.reqExt) + (AR ? ' يوم ناتج' : 'd resulting'), note: v.affectsCP ? (AR ? 'يؤثر على المسار الحرج' : 'Affects critical path') : (AR ? 'لا أثر على المسار الحرج' : 'No critical-path effect'), ver: 'v1' }] : []),
    ...(anyExceeds ? [{ date: addD(v.inDate, 12) + ' 10:40', actor: AR ? 'لجنة تثبيت الأسعار' : 'Rate-fixing committee',
      act: AR ? 'تثبيت سعر الكمية الزائدة عن 20%' : 'Excess-quantity rate fixed', stage: AR ? 'تثبيت الأسعار' : 'Rate fixing',
      from: (lines.find(l => l.exceeds) || {}).exRateCon != null ? window.fmtNum(lines.find(l => l.exceeds).exRateCon) : '—',
      to: approved && (lines.find(l => l.exceeds) || {}).exRateApproved != null ? window.fmtNum(lines.find(l => l.exceeds).exRateApproved) : (AR ? 'قيد الدراسة' : 'Under review'),
      note: AR ? 'يسري على الكمية الزائدة فقط' : 'Applies to the excess quantity only', ver: 'v1' }] : []),
    ...(approved ? [
      { date: addD(v.inDate, 18) + ' 10:05', actor: AR ? 'المستوى الإداري الأعلى' : 'Senior manager', act: AR ? 'إعادة احتساب الأوزان' : 'Weights recalculated', stage: AR ? 'التدقيق المالي' : 'Financial review',
        from: lines[0] ? lines[0].wBefore + '%' : '—', to: lines[0] && lines[0].wApproved != null ? lines[0].wApproved + '%' : '—', note: '—', ver: 'v2' },
      { date: addD(v.inDate, 20) + ' 12:30', actor: AR ? 'الوزير / المفوَّض' : 'Minister / delegate',
        via: AR ? 'مقرّر لجنة أوامر الغيار' : 'Change-order committee rapporteur',
        act: AR ? 'الاعتماد النهائي — أمر وزاري' : 'Final endorsement — ministerial order', stage: AR ? 'المصادقة' : 'Endorsement',
        from: window.fmtNum(Math.round(netRe)), to: window.fmtNum(appValue), note: Math.abs((appValue || 0) - netRe) > 1 ? (AR ? 'اعتماد جزئي' : 'Partial approval') : '—', ver: 'v2' },
      { date: addD(v.inDate, 22) + ' 09:00', actor: AR ? 'النظام' : 'System', act: appliedAll ? (AR ? 'تطبيق الأمر' : 'Order applied') : (AR ? 'فشل التطبيق' : 'Apply failed'), stage: AR ? 'التطبيق' : 'Application',
        from: AR ? 'معتمد' : 'Approved', to: appliedAll ? (AR ? 'مطبق' : 'Applied') : (AR ? 'فشل إعادة احتساب الأوزان' : 'Weight recalculation failed'), note: '—', ver: 'v2' },
      ...(appliedAll ? [{ date: addD(v.inDate, 24) + ' 15:45', actor: AR ? 'مدير المشروع' : 'Project manager', act: AR ? 'إغلاق الأمر' : 'Order closed', stage: AR ? 'الإغلاق' : 'Closure', from: AR ? 'مطبق' : 'Applied', to: AR ? 'مغلق' : 'Closed', note: '—', ver: 'v2' }] : []),
    ] : []),
    ...(rejected ? [{ date: addD(v.inDate, 9) + ' 14:10', actor: AR ? 'التدقيق الفني' : 'Technical review', act: AR ? 'إعادة للتعديل' : 'Returned for revision', stage: AR ? 'التدقيق الفني' : 'Technical review', from: AR ? 'قيد الاعتماد' : 'Pending', to: AR ? 'معاد للتعديل' : 'Returned', note: AR ? 'الكشف المسعّر غير مكتمل' : 'Priced estimate incomplete', ver: 'v1' }] : []),
  ];

  const attachments = (v.attachments || []).map((a, j) => ({ ...a, ver: j === 1 && approved ? 'v2' : 'v1',
    stage: j === 0 ? (AR ? 'إعداد الطلب' : 'Preparation') : j === 1 ? (AR ? 'التدقيق الفني' : 'Technical review') : (AR ? 'تحليل الجدول' : 'Schedule analysis') }));

  // map the stored progress onto the real chain
  const cDur = d.contract && d.contract.raw && d.contract.raw.start && d.contract.raw.finish
    ? Math.max(1, Math.round((new Date(d.contract.raw.finish) - new Date(d.contract.raw.start)) / 86400000)) : 0;
  const durQuarter = Math.round(cDur / 4);
  const chain = VO_STAGES(AR, { needsRate: anyExceeds || lines.some(l => l.chg === 'rate'),
    overQuarter: cDur > 0 && (v.appExt || v.reqExt) > durQuarter,
    needsFunds: lines.reduce((a, l) => a + l.reDelta, 0) !== 0 })
    .filter(s => !s.cond ? true
      : s.cond === 'needsRate' ? (anyExceeds || lines.some(l => l.chg === 'rate'))
      : s.cond === 'endorse' ? (lines.length > 0 || (cDur > 0 && (v.appExt || v.reqExt) > durQuarter))
      : true);
  // how far the order has travelled: returned stops at the RE review, pending sits
  // mid-chain, approved-but-applying stops before execution, closed completes it
  const idxOf = k => Math.max(0, chain.findIndex(s => s.key === k));
  const reached = rejected ? 0 : approved ? (appliedAll ? chain.length : chain.length - 1)
    // escalated orders have reached the ministerial stage (an external party);
    // the rest sit with the change-order committee
    : v.slaExceeded ? idxOf('order') : idxOf('cttee');
  // one source of truth for stage timing: each stage starts when the previous one
  // was actioned, so dates cannot overlap and durations cannot disagree with them
  const SPAN = k => 3 + (k % 3);
  let cursor = v.inDate;
  const chainStages = chain.map((s, k) => {
    const started = k <= reached;
    const start = started ? cursor : null;
    const doneDate = k < reached ? addD(cursor, SPAN(k)) : null;
    if (started) cursor = doneDate || cursor;
    // every stage is owned by a system user; external parties are statuses inside it
    const ext = (s.ext || []).map((x, j) => ({ ...x,
      state: k < reached ? 'in' : k === reached ? (j === 0 ? 'in' : 'wait') : 'wait',
      letterNo: k < reached || (k === reached && j === 0) ? 'OUT-' + (5100 + k * 7 + j) : null,
      letterDate: start && (k < reached || (k === reached && j === 0)) ? addD(start, j + 1) : null }));
    return { ...s, sys: true, party: s.owner, ext,
    pending: ext.filter(x => x.state === 'wait'),
    status: rejected && k === 0 ? 'rejected' : k < reached ? 'done' : k === reached ? (v.slaExceeded ? 'overdue' : 'active') : 'todo',
    start, doneDate,
    elapsed: doneDate ? Math.round((new Date(doneDate) - new Date(start)) / 86400000)
      : k === reached ? Math.max(0, Math.round((new Date((sd && sd.dataDate) || start) - new Date(start)) / 86400000)) : 0,
    sla: 5,
    decision: rejected && k === 0 ? (AR ? 'إعادة للتعديل' : 'Returned') : k < reached ? (AR ? 'موافقة' : 'Approved') : '—' }; });
  // inputs that precede entry of the order — not workflow stages
  const preInputs = [
    { party: AR ? 'المقاول' : 'Contractor', act: AR ? 'طلب إصدار أمر الغيار مع الكلفة والمدة المقترحة' : 'Request with proposed cost and time',
      letterNo: 'IN-' + (4200 + i * 3), letterDate: addD(v.inDate, -9) },
    { party: AR ? 'الاستشاري المصمم والمدقق' : 'Designer & checking consultant',
      act: v.type === 'supply' ? (AR ? 'الموافقة على جزء من الفقرات' : 'Approval of part of the items') : (AR ? 'الموافقة على جميع الفقرات' : 'Approval of all items'),
      letterNo: 'IN-' + (4300 + i * 3), letterDate: addD(v.inDate, -3) },
  ];
  const skipped = VO_STAGES(AR, { needsRate: true, overQuarter: true, needsFunds: true })
    .filter(s => !chain.some(c => c.key === s.key))
    .map(s => ({ label: s.label, why: s.key === 'rate' ? (AR ? 'لا كميات تتجاوز 20% ولا تعديل سعر' : 'No quantity beyond 20% and no rate change')
      : s.key === 'endorse' ? (AR ? 'لا أثر مالي ولا مدة تتجاوز ربع مدة العقد' : 'No financial impact and no duration beyond a quarter')
      : (AR ? 'غير مطلوبة لهذا الأمر' : 'Not required for this order') }));
  return { lifecycle, appliedAll, appValue, appDays, lines, activities, redistribution, weight, steps, log, attachments, anyExceeds, skipped, preInputs,
    chainStages, durQuarter, cDur,
    netCon, netRe,
    analysisDays: v.appExt || v.reqExt,
    finishBefore: baseFinish,
    finishForecast: addD(baseFinish, v.reqExt),
    finishApproved: approved ? addD(baseFinish, v.appExt) : null };
}

function DVORecordPanel({ lang, row, onClose }) {
  const AR = lang === 'ar';
  if (!row) return null;
  const F = (k, v, mono) => <div className="d-form-i"><span className="k">{k}</span><span className={'v' + (mono ? ' mono' : '')}>{v}</span></div>;
  const st = VO_APPLY[row.apply] || VO_APPLY.na;
  const isBoq = !!row.code;
  return (
    <React.Fragment>
      <div className="d-drawer-scrim" onClick={onClose}></div>
      <div className="d-drawer">
        <div className="d-drawer-head"><div className="tx"><b>{isBoq ? row.desc : row.name}</b><span>{row.code || row.id}</span></div>
          <button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-drawer-body">
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'القيم قبل وبعد' : 'Values before and after'}</span>
            <div className="d-form-grid">
              {isBoq ? <React.Fragment>
                {F(AR ? 'الوحدة' : 'Unit', row.unit)}
                {F(AR ? 'الكمية قبل' : 'Qty before', window.fmtNum(row.qtyBefore), true)}
                {F(AR ? 'الكمية المقترحة (المقاول)' : 'Qty proposed (contractor)', window.fmtNum(row.qtyProposed), true)}
                {F(AR ? 'الكمية المقترحة (د.م.م)' : 'Qty proposed (RE dept)', window.fmtNum(row.qtyProposedRe), true)}
                {F(AR ? 'الكمية المعتمدة' : 'Qty approved', row.qtyApproved != null ? window.fmtNum(row.qtyApproved) : '—', true)}
                {F(AR ? 'سعر الوحدة الأصلي' : 'Original unit rate', window.fmtNum(row.rate), true)}
                {row.exceeds && F(AR ? 'حد 20%' : '20% limit', window.fmtNum(+row.con.thr.toFixed(2)) + ' ' + row.unit, true)}
                {row.exceeds && F(AR ? 'ضمن 20% (المقاول)' : 'Within 20% (contractor)', window.fmtNum(+row.con.at.toFixed(2)) + ' × ' + window.fmtNum(row.rate), true)}
                {row.exceeds && F(AR ? 'أكثر من 20% (المقاول)' : 'Beyond 20% (contractor)', window.fmtNum(+row.con.ex.toFixed(2)) + ' × ' + window.fmtNum(row.exRateCon), true)}
                {row.exceeds && F(AR ? 'ضمن 20% (د.م.م)' : 'Within 20% (RE dept)', window.fmtNum(+row.re.at.toFixed(2)) + ' × ' + window.fmtNum(row.rate), true)}
                {row.exceeds && F(AR ? 'أكثر من 20% (د.م.م)' : 'Beyond 20% (RE dept)', window.fmtNum(+row.re.ex.toFixed(2)) + ' × ' + window.fmtNum(row.exRateRe), true)}
                {row.exceeds && F(AR ? 'السعر المثبَّت' : 'Fixed rate', row.exRateApproved != null ? window.fmtNum(row.exRateApproved) : (AR ? 'بانتظار لجنة تثبيت الأسعار' : 'Awaiting rate-fixing cttee'), true)}
                {F(AR ? 'القيمة قبل' : 'Value before', window.fmtNum(row.valBefore), true)}
                {F(AR ? 'القيمة بعد' : 'Value after', window.fmtNum(row.valAfter), true)}
                {F(AR ? 'الوزن قبل' : 'Weight before', row.wBefore + '%', true)}
                {F(AR ? 'الوزن المعتمد' : 'Weight approved', row.wApproved != null ? row.wApproved + '%' : '—', true)}
              </React.Fragment> : <React.Fragment>
                {F(AR ? 'الإنجاز' : 'Progress', row.pct + '%', true)}
                {F(AR ? 'المتبقي قبل' : 'Remaining before', row.remBefore + (AR ? ' يوم' : 'd'), true)}
                {F(AR ? 'المتبقي المقترح' : 'Remaining proposed', row.remProposed + (AR ? ' يوم' : 'd'), true)}
                {F(AR ? 'المتبقي المعتمد' : 'Remaining approved', row.remApproved != null ? row.remApproved + (AR ? ' يوم' : 'd') : '—', true)}
                {F(AR ? 'البداية قبل' : 'Start before', row.startBefore, true)}
                {F(AR ? 'النهاية قبل' : 'Finish before', row.finishBefore, true)}
                {F(AR ? 'النهاية المعتمدة' : 'Finish approved', row.finishApproved || '—', true)}
                {F(AR ? 'التقويم' : 'Calendar', row.calendar)}
                {F(AR ? 'العوم الكلي' : 'Total float', row.float + (AR ? ' يوم' : 'd'), true)}
                {F(AR ? 'المسار الحرج' : 'Critical path', row.critical ? (AR ? 'نعم' : 'Yes') : (AR ? 'لا' : 'No'))}
              </React.Fragment>}
            </div>
          </div>
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'حالة التطبيق' : 'Application status'}</span>
            <div><span className={'d-pill ' + st.cls}>{AR ? st.ar : st.en}</span></div>
            {row.apply === 'fail' && <div className="d-vow-note warn" style={{ marginTop: 8 }}><Icon name="warning" size={16} />
              <span>{AR ? 'فشلت إعادة احتساب الوزن لهذا البند — يتطلب إعادة تشغيل التطبيق.' : 'Weight recalculation failed for this item — the apply step must be re-run.'}</span></div>}
          </div>
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'ملاحظات المراجعة' : 'Review notes'}</span>
            <div className="d-cell-sub">{isBoq
              ? (row.qtyApproved != null && row.qtyApproved !== row.qtyProposed ? (AR ? 'اعتُمدت كمية أقل من المطلوب بعد التدقيق الفني.' : 'A lower quantity than requested was approved after technical review.') : (AR ? 'لا ملاحظات.' : 'No notes.'))
              : (AR ? 'تم تحليل الأثر على المسار الحرج ضمن مرحلة تحليل الجدول.' : 'Critical-path impact analysed during schedule analysis.')}</div>
          </div>
        </div>
        <div className="d-drawer-foot"><button className="d-btn" onClick={onClose}>{AR ? 'إغلاق' : 'Close'}</button></div>
      </div>
    </React.Fragment>
  );
}

function DModVO({ t, lang, d, p, showToast }) {
  const AR = lang === 'ar';
  const [rows, setRows] = React.useState(d.variationOrders.map(v => ({ ...v, attachments: [...(v.attachments || [])] })));
  const [openNo, setOpenNo] = React.useState(null);
  const [tab, setTab] = React.useState('summary');
  const [detail, setDetail] = React.useState(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [grp, setGrp] = React.useState('all');
  const recOf = v => voRecord(v, d, lang, rows.findIndex(r => r.no === v.no), p);
  const PERSONAS = VO_PERSONAS(AR);
  const [asKey, setAsKey] = React.useState('observer');
  const [focus, setFocus] = React.useState(false);
  const [stageF, setStageF] = React.useState(null);
  const persona = PERSONAS.find(x => x.key === asKey) || PERSONAS[0];
  const relOf = v => voRelation(recOf(v), persona, AR);
  const [openStage, setOpenStage] = React.useState(null);
  const [recDec, setRecDec] = React.useState(null);
  const [dec, setDec] = React.useState({ kind: 'approve', no: '', date: '', note: '' });
  const voActs = React.useMemo(() => (showCreate && p ? window.EPM.buildScheduleData(p, lang).activities : []), [showCreate, p && p.id, lang]);
  // the wizard only renders in the register branch, so return there when a create
  // is requested while a record is open — otherwise the action silently does nothing
  React.useEffect(() => { const h = () => { setOpenNo(null); setShowCreate(true); };
    window.addEventListener('epm:vo-create', h); return () => window.removeEventListener('epm:vo-create', h); }, []);

  // the project's own data date — a fixed literal made every order look years
  // late once inDate started deriving from the contract term
  const NOW = new Date((p && window.EPM && window.EPM.buildScheduleData
    ? (window.EPM.buildScheduleData(p, lang).dataDate || null) : null)
    || (d.contract && d.contract.raw && d.contract.raw.finish) || '2026-07-22');
  const leadOf = v => Math.max(0, Math.round((NOW - new Date(v.inDate)) / 86400000));
  const MANAGER = AR ? 'المستوى الإداري الأعلى' : 'Senior manager';
  const actorOf = v => { if (v.status !== 'pending') return null;
    const R = recOf(v); const a = R.chainStages.find(s => s.status === 'active' || s.status === 'overdue');
    return a ? a.owner : null; };

  const open = rows.find(r => r.no === openNo);
  const rec = open ? recOf(open) : null;

  const LIFE = {
    draft: { ar: 'مسودة', en: 'Draft', cls: '' },
    pending: { ar: 'قيد الاعتماد', en: 'Pending', cls: 'ongoing' },
    rejected: { ar: 'معاد للتعديل', en: 'Returned', cls: 'stalled' },
    applied_partial: { ar: 'معتمد — قيد التطبيق', en: 'Approved — applying', cls: 'suspended' },
    closed: { ar: 'مغلق', en: 'Closed', cls: 'completed' },
  };
  const lifePill = v => { const r = recOf(v); const L = LIFE[r.lifecycle] || LIFE.pending; return <span className={'d-pill ' + L.cls}>{AR ? L.ar : L.en}</span>; };

  // ---- register indicators ----
  const approvedNet = rows.filter(r => r.status === 'approved').reduce((a, r) => a + (recOf(r).appValue || 0), 0);
  const pending = rows.filter(r => r.status === 'pending');
  const needsAction = pending.filter(r => r.slaExceeded);
  const overdue = rows.filter(r => r.status === 'pending' && leadOf(r) > 14);
  const avgCycle = rows.length ? Math.round(rows.reduce((a, r) => a + leadOf(r), 0) / rows.length) : 0;
  const kv = (k, v, mono, sub) => <div className="d-form-i"><span className="k">{k}</span><span className={'v' + (mono ? ' mono' : '')}>{v}</span>{sub ? <span className="d-cell-sub mono">{sub}</span> : null}</div>;
  const secH = (ico, txt, right) => <div className="d-vow-sech"><Icon name={ico} size={16} /><div className="d-section-title" style={{ margin: 0 }}>{txt}</div><div style={{ flex: 1 }}></div>{right}</div>;

  // Lifecycle is one axis and follows the workflow order; attention is another
  // and depends on who is looking. Mixing them was why "بحاجة إلى إجراء" sat
  // next to "المعتمدة" as if they answered the same question.
  const byLife = k => rows.filter(v => recOf(v).lifecycle === k);
  const groups = [
    ['pending', AR ? 'قيد الاعتماد' : 'In approval', byLife('pending')],
    ['rejected', AR ? 'معاد للتعديل' : 'Returned', byLife('rejected')],
    ['applied_partial', AR ? 'معتمد — بانتظار التطبيق' : 'Approved — applying', byLife('applied_partial')],
    ['closed', AR ? 'مطبّق ومغلق' : 'Applied & closed', byLife('closed')],
  ];
  const mineList = rows.filter(v => ['awaiting', 'recorder'].includes(relOf(v).key));
  const mineCount = mineList.length;
  const attn = [
    ['mine', AR ? 'بانتظار إجرائي' : 'Awaiting me', mineList, 'pending_actions'],
    ['sla', AR ? 'تجاوزت السقف الزمني' : 'SLA exceeded', needsAction, 'warning'],
    ['overdue', AR ? 'متأخرة' : 'Overdue', overdue, 'schedule'],
  ];
  // which workflow stage the pending orders are sitting at
  const stageOf = v => { const s = recOf(v).chainStages.find(x => x.status === 'active' || x.status === 'overdue' || x.status === 'rejected'); return s ? s.label : null; };
  const base = grp === 'all' ? rows
    : (attn.find(x => x[0] === grp) || [])[2]
      || (groups.find(g => g[0] === grp) || [null, null, []])[2];
  const stageList = [...new Set(rows.filter(v => v.status !== 'approved').map(stageOf).filter(Boolean))];
  const shown = stageF ? base.filter(v => stageOf(v) === stageF) : base;
  const flags = v => {
    const r = recOf(v); const out = [];
    if (v.status === 'pending' && leadOf(v) > 14) out.push([AR ? 'متأخر' : 'Overdue', 'stalled']);
    if (v.status === 'pending' && v.slaExceeded) out.push([AR ? 'يحتاج إجراء' : 'Needs action', 'critical']);
    if (r.lifecycle === 'applied_partial' && r.steps.some(s => s[2] === 'fail')) out.push([AR ? 'فشل التطبيق' : 'Apply failed', 'stalled']);
    if (v.status === 'pending' && r.anyExceeds && !r.lines.some(l => l.exRateApproved != null)) out.push([AR ? 'بانتظار تثبيت الأسعار' : 'Awaiting rate fixing', 'suspended']);
    return out;
  };

  if (!open) return (
    <React.Fragment>
      {showCreate && <DVOCreateWizard lang={lang} contract={d.contract} contracts={d.contracts} boq={d.boq} acts={voActs}
        onClose={() => setShowCreate(false)}
        onDraft={() => { setShowCreate(false); showToast(AR ? 'حُفظ الأمر التغييري كمسودة' : 'Change order saved as draft'); }}
        onDone={() => { setShowCreate(false); showToast(AR ? 'أُرسل الأمر التغييري للمراجعة' : 'Change order sent for review'); }} />}
      <div className="d-model-topbar">
        <div className="d-section-title" style={{ margin: 0 }}>{t('mod_changeorders')}</div>
        <div style={{ flex: 1 }}></div>
        <label className="d-vo-as"><Icon name="visibility" size={14} />
          <span>{AR ? 'العرض بصفة' : 'Viewing as'}</span>
          <select value={asKey} onChange={e => setAsKey(e.target.value)}>
            {PERSONAS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select></label>
        <button className="d-btn primary" onClick={() => setShowCreate(true)}><Icon name="add" size={15} />{AR ? 'أمر تغييري جديد' : 'New change order'}</button>
      </div>
      <div className="d-vo-kpis">
        <div className="k-fig"><span className="k">{AR ? 'إجمالي الأوامر' : 'Total orders'}</span>
          <span className="v mono">{rows.length}</span></div>
        <div className="k-fig"><span className="k">{AR ? 'صافي الأوامر المعتمدة' : 'Net approved value'}</span>
          <span className="v mono">{window.fmtNum(approvedNet)}</span></div>
        <div className="k-fig"><span className="k">{AR ? 'متوسط دورة الاعتماد' : 'Avg approval cycle'}</span>
          <span className="v mono">{avgCycle}<small>{AR ? ' يوم' : ' d'}</small></span></div>
      </div>

      {mineCount > 0 && <div className="d-vo-focusbar">
        <Icon name="pending_actions" size={16} />
        <b>{mineCount} {AR ? (mineCount === 1 ? 'أمر بانتظار إجرائك' : 'أوامر بانتظار إجرائك') : (mineCount === 1 ? 'order awaits your action' : 'orders await your action')}</b>
        <span className="d-cell-sub">{AR ? 'بصفة ' : 'as '}{persona.label}</span>
        <div style={{ flex: 1 }}></div>
        <button className="d-btn primary" onClick={() => { setFocus(true); setOpenNo(mineList[0].no); setTab('summary'); }}>
          <Icon name="playlist_play" size={15} />{AR ? 'وضع الإنجاز' : 'Focus mode'}</button>
      </div>}
      <div className="d-vo-filters">
        <div className="grp">
          <span className="lbl">{AR ? 'تحتاج انتباهك' : 'Needs your attention'}</span>
          <div className="chips">
            {attn.map(([k, lbl, list, ico]) => (
              <button key={k} className={'d-vo-chip' + (grp === k ? ' on' : '') + (list.length ? '' : ' zero')}
                disabled={!list.length} onClick={() => { setGrp(grp === k ? 'all' : k); setStageF(null); }}>
                <Icon name={ico} size={13} />{lbl}<span className="n mono">{list.length}</span></button>))}
          </div>
        </div>
        <div className="grp">
          <span className="lbl">{AR ? 'الحالة في المسار' : 'Workflow state'}</span>
          <div className="chips">
            <button className={'d-vo-chip' + (grp === 'all' ? ' on' : '')} onClick={() => { setGrp('all'); setStageF(null); }}>
              {AR ? 'الكل' : 'All'}<span className="n mono">{rows.length}</span></button>
            {groups.map(([k, lbl, list]) => (
              <button key={k} className={'d-vo-chip' + (grp === k ? ' on' : '') + (list.length ? '' : ' zero')}
                disabled={!list.length} onClick={() => { setGrp(k); setStageF(null); }}>
                <span className={'dot ' + k}></span>{lbl}<span className="n mono">{list.length}</span></button>))}
          </div>
        </div>
        {stageList.length > 0 && <div className="grp">
          <span className="lbl">{AR ? 'المرحلة الحالية' : 'Current stage'}</span>
          <div className="chips">
            <select value={stageF || ''} onChange={e => setStageF(e.target.value || null)}>
              <option value="">{AR ? 'كل المراحل' : 'All stages'}</option>
              {stageList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {stageF && <button className="d-vo-chip clear" onClick={() => setStageF(null)}>
              <Icon name="close" size={12} />{AR ? 'مسح' : 'Clear'}</button>}
          </div>
        </div>}
      </div>

      {shown.length ? <div className="d-vow-tw"><table className="d-line-table d-vo-reg"><thead><tr>
        <th style={{ minWidth: 260 }}>{AR ? 'الأمر التغييري' : 'Change order'}</th>
        <th style={{ width: 170 }} className="num">{AR ? 'الأثر' : 'Impact'}</th>
        <th style={{ width: 190 }}>{AR ? 'الحالة والمرحلة' : 'Status & stage'}</th>
        <th style={{ width: 180 }}>{AR ? 'المسؤول وآخر إجراء' : 'Owner & last action'}</th>
        <th style={{ width: 72 }} className="num">{AR ? 'مرفقات' : 'Files'}</th></tr></thead>
        <tbody>{shown.map(v => { const R = recOf(v);
          const stg = R.chainStages.find(s => s.status === 'active' || s.status === 'overdue' || s.status === 'rejected');
          const gov = R.appValue != null ? R.appValue : R.netRe;
          const fl = flags(v);
          const urgent = v.status === 'pending' && (v.slaExceeded || leadOf(v) > 14);
          return (
          <tr key={v.no} className={urgent ? 'urgent' : ''} onClick={() => { setOpenNo(v.no); setTab('summary'); }} style={{ cursor: 'pointer' }}>
            <td>
              <div className="d-vo-title">
                <span className="no mono">{v.no}</span>
                <span className="tx">{v.reason}</span>
              </div>
              <div className="d-cell-sub">{v.type === 'supply' ? (AR ? 'تجهيز / إعادة توزيع' : 'Supply / redistribution') : (AR ? 'هندسي — كلفة / مدة' : 'Engineering — cost / time')}</div>
            </td>
            <td className="num">
              <span className="mono fig">{(gov > 0 ? '+' : '') + window.fmtNum(Math.round(gov))}</span>
              <div className="d-cell-sub mono">{(v.status === 'approved' ? v.appExt : v.reqExt) + (AR ? ' يوم' : 'd')}
                {' · '}{R.appValue != null ? (AR ? 'معتمد' : 'approved') : (AR ? 'مقترح' : 'proposed')}</div>
            </td>
            <td><div className="d-vo-state">{lifePill(v)}
                {fl.map((f, i) => <span key={i} className={'d-pill ' + f[1]}>{f[0]}</span>)}
                {(() => { const rl = relOf(v); if (rl.key === 'none') return null; const R2 = VO_REL[rl.key];
                  return <span className={'d-pill ' + R2.cls} title={rl.stage ? rl.stage.label : ''}>
                    <Icon name={R2.ico} size={11} />{AR ? R2.ar : R2.en}</span>; })()}</div>
              <div className="d-cell-sub">{v.status === 'approved' ? (AR ? 'اكتمل المسار' : 'Workflow complete')
                : stg ? stg.label + (stg.status === 'rejected' ? (AR ? ' — معادة' : ' — returned') : '') : '—'}</div></td>
            <td><span className="own">{stg ? stg.owner : (actorOf(v) || '—')}</span>
              <div className="d-cell-sub mono">{v.date}</div></td>
            <td className="num mono">{(v.attachments || []).length || '—'}</td>
          </tr>); })}</tbody></table></div>
        : <div className="d-vow-empty"><Icon name="check_circle" size={22} />
          <b>{AR ? 'لا أوامر في هذه المجموعة' : 'No orders in this group'}</b>
          <span>{AR ? 'اختر مجموعة أخرى أو اعرض الكل.' : 'Pick another group, or view all.'}</span></div>}
    </React.Fragment>
  );

  // ================= record =================
  const viewerRel = voRelation(rec, persona, AR);
  const canAct = viewerRel.key === 'awaiting' || viewerRel.key === 'recorder';
  const stg = rec.chainStages.find(s => s.status === 'active' || s.status === 'overdue' || s.status === 'rejected') || null;
  const stgLabel = open.status === 'approved' ? (AR ? 'مكتملة' : 'Complete')
    : stg ? stg.label + (stg.status === 'rejected' ? (AR ? ' (معادة)' : ' (returned)') : '') : '—';
  const lead = leadOf(open);
  const L = LIFE[rec.lifecycle] || LIFE.pending;
  const TABS = AR
    ? [['summary', 'الملخص', 'summarize'], ['cost', 'الكميات والكلفة', 'list_alt'], ['time', 'الأثر الزمني', 'calendar_month'],
       ['flow', 'المسار', 'account_tree'], ['files', 'المرفقات', 'attach_file'], ['log', 'السجل', 'history']]
    : [['summary', 'Summary', 'summarize'], ['cost', 'Quantities & cost', 'list_alt'], ['time', 'Time impact', 'calendar_month'],
       ['flow', 'Workflow', 'account_tree'], ['files', 'Attachments', 'attach_file'], ['log', 'Audit trail', 'history']];
  const act = (label, ico, fn, primary) => <button className={'d-btn' + (primary ? ' primary' : '')} onClick={fn}><Icon name={ico} size={15} />{label}</button>;
  const applyPill = k => { const s = VO_APPLY[k]; return <span className={'d-pill ' + s.cls}>{AR ? s.ar : s.en}</span>; };
  const delta = (a, b) => a == null || b == null || a === b ? '' : ' chg';

  const queue = focus ? mineList : [];
  const qIdx = queue.findIndex(x => x.no === openNo);
  const goNext = () => { const n = queue[qIdx + 1]; if (n) { setOpenNo(n.no); setTab('summary'); } };
  const goPrev = () => { const n = queue[qIdx - 1]; if (n) { setOpenNo(n.no); setTab('summary'); } };

  return (
    <React.Fragment>
      {detail && <DVORecordPanel lang={lang} row={detail} onClose={() => setDetail(null)} />}
      {recDec && <React.Fragment>
        <div className="d-drawer-scrim" onClick={() => setRecDec(null)}></div>
        <div className="d-drawer">
          <div className="d-drawer-head"><div className="tx"><b>{AR ? 'تسجيل قرار جهة خارجية' : 'Record an external decision'}</b>
            <span>{recDec.x.party} — {recDec.stage.label}</span></div>
            <button className="d-icon-btn" onClick={() => setRecDec(null)}><Icon name="close" size={18} /></button></div>
          <div className="d-drawer-body">
            <div className="d-vow-note"><Icon name="person" size={16} />
              <span>{AR ? 'يُسجَّل القرار باسم ' : 'Attributed to '}<b>{recDec.party}</b>
                {AR ? ' ويظهر ' : ', recorded by '}<b>{recDec.delegate}</b>{AR ? ' كمُسجِّل.' : '.'}</span></div>
            <div className="d-drawer-grp"><span className="lbl">{AR ? 'القرار' : 'Decision'}</span>
              <div className="d-vow-types">{VO_DECISIONS.map(([k, l]) => (
                <button key={k} className={'d-vow-type' + (dec.kind === k ? ' on' : '')} onClick={() => setDec(x => ({ ...x, kind: k }))}>
                  <b>{l[lang] || l.en}</b>{dec.kind === k && <Icon name="check" size={15} />}</button>))}</div></div>
            <div className="d-drawer-grp"><span className="lbl">{AR ? 'سند القرار' : 'Decision evidence'}</span>
              <div className="d-form-grid">
                <div className="d-form-field"><label>{AR ? 'رقم الكتاب' : 'Letter no.'}</label>
                  <input className="d-form-input mono" value={dec.no} onChange={e => setDec(x => ({ ...x, no: e.target.value }))} placeholder="OUT-0000" /></div>
                <div className="d-form-field"><label>{AR ? 'تاريخ الكتاب' : 'Letter date'}</label>
                  <input className="d-form-input mono" value={dec.date} onChange={e => setDec(x => ({ ...x, date: e.target.value }))} placeholder="2026-07-20" /></div>
              </div>
              <div className="d-form-field" style={{ marginTop: 12 }}><label>{AR ? 'ملاحظة' : 'Note'}</label>
                <textarea className="d-form-input" rows={3} value={dec.note} onChange={e => setDec(x => ({ ...x, note: e.target.value }))}></textarea></div>
              <button className="d-btn" style={{ marginTop: 12 }} onClick={() => showToast(AR ? 'إرفاق صورة الكتاب (اختياري)' : 'Attach the letter (optional)')}>
                <Icon name="attach_file" size={15} />{AR ? 'إرفاق صورة الكتاب (اختياري)' : 'Attach letter scan (optional)'}</button>
            </div>
          </div>
          <div className="d-drawer-foot">
            <button className="d-btn" onClick={() => setRecDec(null)}>{AR ? 'إلغاء' : 'Cancel'}</button>
            <button className="d-btn primary" disabled={!dec.no.trim() || !dec.date.trim()}
              title={!dec.no.trim() || !dec.date.trim() ? (AR ? 'رقم وتاريخ الكتاب إلزاميان' : 'Letter number and date are required') : ''}
              onClick={() => { setRecDec(null); showToast(AR ? 'سُجِّل قرار ' + recDec.x.party : 'Decision recorded for ' + recDec.x.party); }}>
              <Icon name="check" size={15} />{AR ? 'تسجيل القرار' : 'Record decision'}</button>
          </div>
        </div></React.Fragment>}
      <div className={'d-vo-work' + (focus ? ' split' : '')}>
      {focus && <aside className="d-vo-queue">
        <div className="d-vo-queue-h">
          <Icon name="pending_actions" size={15} />
          <b>{AR ? 'بانتظار إجرائك' : 'Awaiting you'}</b>
          <span className="n mono">{queue.length}</span>
          <div style={{ flex: 1 }}></div>
          <button className="d-icon-btn" title={AR ? 'إنهاء وضع الإنجاز' : 'Exit focus mode'}
            onClick={() => { setFocus(false); setOpenNo(null); }}><Icon name="close" size={16} /></button>
        </div>
        <div className="d-vo-queue-b">
          {queue.map(v => { const R = recOf(v); const rl = relOf(v);
            const gov = R.appValue != null ? R.appValue : R.netRe;
            return (
            <button key={v.no} className={'d-vo-qitem' + (v.no === openNo ? ' on' : '')}
              onClick={() => { setOpenNo(v.no); setTab('summary'); }}>
              <div className="t"><span className="mono no">{v.no}</span><span className="tx">{v.reason}</span></div>
              <div className="m"><span className="mono">{(gov > 0 ? '+' : '') + window.fmtNum(Math.round(gov))}</span>
                <span className="d-cell-sub">{rl.stage ? rl.stage.label : ''}</span></div>
              <div className="f">{lifePill(v)}
                <span className="d-cell-sub mono">{leadOf(v)}{AR ? ' يوم' : 'd'}</span></div>
            </button>); })}
          {!queue.length && <div className="d-cell-sub" style={{ padding: 12 }}>{AR ? 'لا شيء بانتظارك.' : 'Nothing awaits you.'}</div>}
        </div>
      </aside>}
      <div className="d-vo-rec">
        {focus && <div className="d-vo-qnav">
          <button className="d-btn sm" disabled={qIdx <= 0} onClick={goPrev}>
            <Icon name={AR ? 'chevron_right' : 'chevron_left'} size={15} />{AR ? 'السابق' : 'Previous'}</button>
          <span className="d-cell-sub mono">{qIdx + 1} / {queue.length}</span>
          <button className="d-btn sm" disabled={qIdx >= queue.length - 1} onClick={goNext}>
            {AR ? 'التالي' : 'Next'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={15} /></button>
        </div>}
        <div className="d-vo-rec-h">
          <button className="d-btn" onClick={() => setOpenNo(null)}><Icon name={AR ? 'chevron_left' : 'chevron_right'} size={16} />{AR ? 'سجل الأوامر' : 'Register'}</button>
          <div className="d-vo-rec-t"><b className="mono">{open.no}</b><span>{open.reason}</span></div>
          {lifePill(open)}
          <div style={{ flex: 1 }}></div>
          <div className="d-vo-rec-a">
            {(() => { const k = viewerRel.key;
              return k === 'awaiting' || k === 'recorder' ? null
                : <span className="d-vo-nogate"><Icon name="lock" size={14} />
                    {AR ? 'لا إجراءات متاحة لهذه الصفة' : 'No actions for this persona'}</span>; })()}
            {canAct && open.status === 'pending' && stg && stg.pending.length === 0 && act(AR ? 'اعتماد' : 'Approve', 'check_circle', () => showToast(AR ? 'تم الاعتماد' : 'Approved'), true)}
            {canAct && open.status === 'pending' && act(AR ? 'طلب تعديل' : 'Request revision', 'undo', () => showToast(AR ? 'أُعيد بملاحظات' : 'Returned with notes'))}
            {canAct && open.status === 'pending' && stg && stg.pending.length === 0 && act(AR ? 'رفض' : 'Reject', 'close', () => showToast(AR ? 'تم الرفض' : 'Rejected'))}
            {canAct && open.status === 'pending' && stg && stg.pending.length > 0 &&
              act(AR ? 'تسجيل قرار ' + stg.pending[0].party : 'Record ' + stg.pending[0].party, 'edit_note', () => setRecDec({ stage: stg, x: stg.pending[0] }), true)}
            {canAct && open.status === 'pending' && stg && act(AR ? 'تحديث المرحلة' : 'Advance stage', 'arrow_forward', () => showToast(AR ? 'حُدِّثت المرحلة الحالية' : 'Current stage advanced'))}
            {canAct && open.status === 'rejected' && act(AR ? 'إعادة إرسال' : 'Resubmit', 'arrow_forward', () => showToast(AR ? 'أُعيد الإرسال' : 'Resubmitted'), true)}
            {canAct && rec.lifecycle === 'applied_partial' && act(AR ? 'تطبيق الأمر' : 'Apply order', 'done', () => showToast(AR ? 'جارٍ التطبيق' : 'Applying'), true)}
            {rec.lifecycle === 'closed' && act(AR ? 'طباعة' : 'Print', 'summarize', () => showToast(AR ? 'تحضير الطباعة' : 'Preparing print'))}
            {act(AR ? 'تصدير' : 'Export', 'download', () => showToast(AR ? 'تصدير السجل' : 'Exporting record'))}
          </div>
        </div>
        <div className="d-vo-rec-f">
          {kv(AR ? 'القيمة المطلوبة' : 'Requested value', window.fmtNum(open.net), true)}
          {kv(AR ? 'القيمة المعتمدة' : 'Approved value', rec.appValue != null ? window.fmtNum(rec.appValue) : '—', true,
            rec.appValue != null && rec.appValue !== open.net ? (rec.appValue - open.net > 0 ? '+' : '') + window.fmtNum(rec.appValue - open.net) : null)}
          {kv(AR ? 'الأيام المطلوبة / المعتمدة' : 'Days requested / approved',
            open.reqExt + ' / ' + (rec.appDays != null ? rec.appDays : '—'), true)}
          {kv(AR ? 'المرحلة الحالية' : 'Current stage', stgLabel)}
          {kv(AR ? 'المسؤول الحالي' : 'Current owner', open.status === 'pending' ? (actorOf(open) || '—') : (AR ? 'مكتملة' : 'Complete'))}
          {kv(AR ? 'حالة التطبيق' : 'Application', AR ? L.ar : L.en)}
        </div>
        {(() => { const rl = viewerRel; const R2 = VO_REL[rl.key];
          return <div className={'d-vo-asbar ' + rl.key}>
            <Icon name={R2.ico} size={16} />
            <b>{persona.label}</b>
            <span className="d-pill">{AR ? R2.ar : R2.en}</span>
            <span className="d-cell-sub">{
              rl.key === 'awaiting' ? (AR ? 'المرحلة الحالية «' + rl.stage.label + '» بعهدتك — الإجراءات أدناه متاحة لك.'
                : 'The current stage “' + rl.stage.label + '” is yours — the actions below are available to you.')
              : rl.key === 'acted' ? (AR ? 'أنهيت دورك في هذا الأمر؛ المسار الآن لدى جهة أخرى.' : 'Your part is done; the order sits with another party.')
              : rl.key === 'upcoming' ? (AR ? 'سيصلك عند مرحلة «' + rl.stage.label + '».' : 'It reaches you at “' + rl.stage.label + '”.')
              : rl.key === 'recorder' ? (AR ? 'تسجّل قرار جهة خارجية نيابةً عنها — القرار يُنسب للجهة وأنت المُسجِّل.' : 'You record an external party’s decision on its behalf — the decision is attributed to the party.')
              : (AR ? 'لست ضمن مسار هذا الأمر — العرض للاطلاع فقط.' : 'You are not in this order’s workflow — view only.')}</span>
          </div>; })()}
        <div className="d-vow-tabs sticky">{TABS.map(x => (
          <button key={x[0]} className={'d-vow-tab' + (tab === x[0] ? ' on' : '')} onClick={() => setTab(x[0])}><Icon name={x[2]} size={15} />{x[1]}</button>))}</div>

        <div className="d-vo-rec-b">
          {tab === 'summary' && <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>{secH('description', AR ? 'معلومات الأمر' : 'Order information')}
              <div className="d-form-grid">
                {kv(AR ? 'النوع' : 'Type', open.type === 'supply' ? (AR ? 'تجهيز' : 'Supply') : (AR ? 'هندسي' : 'Engineering'))}
                {kv(AR ? 'الأسباب الموجبة' : 'Justification', open.reason)}
                {kv(AR ? 'الجهة المسؤولة' : 'Responsible party', open.responsible)}
                {kv(AR ? 'رقم الوارد' : 'Incoming no.', open.inNo, true)}
                {kv(AR ? 'تاريخ الوارد' : 'Incoming date', open.inDate, true)}
              </div></div>
            <div>{secH('description', AR ? 'مدخلات سابقة لإدخال الأمر' : 'Inputs preceding entry')}
              <div className="d-vo-ext">
                <div className="lbl">{AR ? 'تمّت قبل إدخال الأمر في النظام — ليست مراحل في المسار' : 'Completed before the order was entered — not workflow stages'}</div>
                {rec.preInputs.map((x, j) => (
                  <div key={j} className="row">
                    <div className="tx"><b>{x.party}</b><span>{x.act}</span></div>
                    <span className="mono">{x.letterNo} · {x.letterDate}</span>
                    <span className="d-pill completed">{AR ? 'وردت' : 'Received'}</span>
                  </div>))}
              </div></div>
            <div>{secH('difference', AR ? 'ملخص الأثر' : 'Impact summary')}
              <div className="d-form-grid">
                {kv(AR ? 'مقترح المقاول' : 'Contractor proposal', window.fmtNum(Math.round(rec.netCon)), true)}
                {kv(AR ? 'مقترح د.م.م' : 'RE dept proposal', window.fmtNum(Math.round(rec.netRe)), true)}
                {kv(AR ? 'القيمة المعتمدة (لجنة التسعير)' : 'Approved (pricing cttee)', rec.appValue != null ? window.fmtNum(rec.appValue) : '—', true)}
                {kv(AR ? 'بنود تجاوزت 20%' : 'Lines beyond 20%', rec.lines.filter(l => l.exceeds).length, true)}
                {kv(AR ? 'سعر الكمية الزائدة' : 'Excess-quantity rate', rec.anyExceeds
                  ? (rec.lines.some(l => l.exRateApproved != null) ? (AR ? 'مثبَّت' : 'Fixed') : (AR ? 'بانتظار لجنة تثبيت الأسعار' : 'Awaiting rate-fixing cttee'))
                  : (AR ? 'لا ينطبق' : 'Not applicable'))}
                {kv(AR ? 'الأيام المطلوبة' : 'Days requested', open.reqExt, true)}
                {kv(AR ? 'الأيام المعتمدة' : 'Days approved', rec.appDays != null ? rec.appDays : '—', true)}
                {kv(AR ? 'البنود المتأثرة' : 'Affected BOQ items', rec.lines.length, true)}
                {kv(AR ? 'الأنشطة المتأثرة' : 'Affected activities', rec.activities.length, true)}
              </div></div>
            <div>{secH('payments', AR ? 'أثر الأمر على العقد' : 'Effect on the contract')}
              <div className="d-form-grid">
                {kv(AR ? 'قيمة العقد قبل الأمر' : 'Contract value before', window.fmtNum(open.revisedContract - open.net), true)}
                {kv(AR ? 'قيمة الأمر المعتمدة' : 'Approved order value', rec.appValue != null ? window.fmtNum(rec.appValue) : '—', true)}
                {kv(AR ? 'قيمة العقد بعد الأمر' : 'Contract value after', rec.appValue != null ? window.fmtNum(open.revisedContract - open.net + rec.appValue) : '—', true)}
                {kv(AR ? 'ملحق العقد' : 'Contract amendment', rec.appValue == null ? '—'
                  : rec.appliedAll ? (AR ? 'صدر وأصبح نافذاً' : 'Issued and effective')
                  : (AR ? 'لم يصدر — الأمر لم يُطبَّق بعد' : 'Not issued — order not yet applied'))}
                {kv(AR ? 'تاريخ الإنجاز التعاقدي بعد التمديد' : 'Contractual completion after extension',
                  rec.appDays != null && rec.appDays > 0 ? rec.finishApproved || '—' : (AR ? 'دون تغيير' : 'Unchanged'), true)}
                {kv(AR ? 'الغرامات التأخيرية' : 'Delay penalties', (rec.appDays || 0) > 0
                  ? (AR ? 'تُعاد احتسابها على التاريخ الجديد' : 'Recalculated against the new date')
                  : (AR ? 'دون تغيير' : 'Unchanged'))}
              </div>
              {rec.appValue != null && !rec.appliedAll && <div className="d-vow-note warn" style={{ marginTop: 10 }}><Icon name="warning" size={16} />
                <span>{AR ? 'الاعتماد لا يغيّر العقد بذاته — يصبح التغيير نافذاً بعد تطبيق الأمر وإصدار ملحق العقد.' : 'Approval alone does not change the contract — it becomes effective once the order is applied and the amendment is issued.'}</span></div>}
            </div>
            <div>{secH('verified_user', AR ? 'ملخص القرار' : 'Decision summary')}
              <div className="d-form-grid">
                {kv(AR ? 'مقترح المقاول' : 'Contractor proposal', window.fmtNum(Math.round(rec.netCon)) + ' · ' + open.reqExt + (AR ? ' يوم' : 'd'), true)}
                {kv(AR ? 'مقترح د.م.م' : 'RE dept proposal', window.fmtNum(Math.round(rec.netRe)) + ' · ' + open.reqExt + (AR ? ' يوم' : 'd'), true)}
                {kv(AR ? 'المعتمد' : 'Approved', rec.appValue != null ? window.fmtNum(rec.appValue) + ' · ' + rec.appDays + (AR ? ' يوم' : 'd') : '—', true)}
                {kv(AR ? 'الفرق عن مقترح د.م.م' : 'Difference vs RE dept', rec.appValue != null ? window.fmtNum(Math.round(rec.appValue - rec.netRe)) + ' · ' + (rec.appDays - open.reqExt) + (AR ? ' يوم' : 'd') : '—', true)}
                {kv(AR ? 'سبب الفرق' : 'Reason for difference', rec.appValue != null && rec.appValue !== open.net ? (AR ? 'تخفيض كميات بعد التدقيق الفني' : 'Quantities trimmed after technical review') : '—')}
                {kv(AR ? 'تاريخ القرار' : 'Decision date', open.status === 'approved' ? (rec.log.find(l => /الاعتماد النهائي|Final endorsement/.test(l.act)) || {}).date || '—' : '—', true)}
                {kv(AR ? 'الجهة المعتمدة' : 'Approved by', open.status === 'approved' ? (AR ? 'الوزير / المفوَّض' : 'Minister / delegate') : '—')}
                {rec.anyExceeds && kv(AR ? 'تثبيت سعر الزائد' : 'Excess rate fixed by', AR ? 'لجنة تثبيت الأسعار' : 'Rate-fixing committee')}
              </div></div>
            <div>{secH('done', AR ? 'حالة تطبيق الأمر التغييري' : 'Change-order application status')}
              <table className="d-line-table"><tbody>{rec.steps.map(s => (
                <tr key={s[0]}><td>{s[1]}</td><td style={{ width: 150 }}>{applyPill(s[2])}</td>
                  <td className="d-cell-sub">{s[2] === 'fail' ? (AR ? 'فشل إعادة الاحتساب — يتطلب إعادة تشغيل' : 'Recalculation failed — needs a re-run') : ''}</td></tr>))}</tbody></table></div>
          </div>}

          {tab === 'cost' && <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {rec.lines.length === 0 && <div className="d-vow-empty"><Icon name="calendar_month" size={22} />
              <b>{AR ? 'أمر تغييري زمني فقط' : 'Time-only change order'}</b>
              <span className="d-cell-sub">{AR ? 'لا يشمل هذا الأمر أي بند من جدول الكميات — الأثر زمني فقط، ولا أثر على قيمة العقد.' : 'This order touches no BOQ item — the impact is on time only, with no effect on the contract value.'}</span></div>}
            {rec.lines.length > 0 && <div>{secH('list_alt', AR ? 'بنود الكميات والكلفة' : 'Quantities & cost')}
              <div className="d-vow-tw"><table className="d-line-table d-vo-cmp"><thead><tr>
                <th style={{ width: 150 }}>{AR ? 'البند / الجهة' : 'Item / party'}</th>
                <th style={{ minWidth: 170 }}>{AR ? 'الوصف / التفصيل' : 'Description / detail'}</th>
                <th style={{ width: 118 }}>{AR ? 'الكمية' : 'Quantity'}</th>
                <th style={{ width: 104 }} title={AR ? 'سعر الوحدة للكمية الزائدة عن 20% فقط' : 'Unit rate for the quantity beyond 20% only'}>{AR ? 'سعر الزائد' : 'Excess rate'}</th>
                <th style={{ width: 130 }}>{AR ? 'القيمة' : 'Value'}</th>
                <th style={{ width: 124 }}>{AR ? 'الأثر' : 'Impact'}</th>
                <th style={{ width: 76 }}>{AR ? 'الوزن' : 'Weight'}</th>
                <th style={{ width: 118 }}>{AR ? 'حالة التطبيق' : 'Applied'}</th></tr></thead>
                <tbody>{rec.lines.map(l => {
                  const chgL = l.chg === 'inc' ? (AR ? 'زيادة كمية' : 'Qty increase') : l.chg === 'dec' ? (AR ? 'نقص كمية' : 'Qty decrease') : (AR ? 'تعديل سعر' : 'Rate change');
                  const sign = v => (v > 0 ? '+' : '') + window.fmtNum(Math.round(v));
                  const tierTx = t => !l.exceeds ? (AR ? 'ضمن حد 20%' : 'Within the 20% limit')
                    : (AR ? 'ضمن 20%: ' : 'Within 20%: ') + window.fmtNum(+t.at.toFixed(2)) + ' ' + l.unit
                      + (AR ? ' · أكثر من 20%: ' : ' · beyond 20%: ') + window.fmtNum(+t.ex.toFixed(2)) + ' ' + l.unit;
                  const partyRow = (key, label, t, qty, exRate, val, impact, weight, applied, cls) => (
                    <tr key={l.code + '-' + key} className={'d-vo-p ' + (cls || '')} onClick={() => setDetail(l)} style={{ cursor: 'pointer' }}>
                      <td><span className="d-vo-party">{label}</span></td>
                      <td className="d-cell-sub">{t ? tierTx(t) : (AR ? 'بانتظار القرار' : 'Awaiting decision')}</td>
                      <td className="mono">{qty}</td><td className="mono">{exRate}</td>
                      <td className="mono">{val}</td><td className="mono">{impact}</td>
                      <td className="mono">{weight}</td><td>{applied}</td></tr>);
                  return (<React.Fragment key={l.code}>
                    <tr className="d-vo-h" onClick={() => setDetail(l)} style={{ cursor: 'pointer' }}>
                      <td className="mono"><b>{l.code}</b></td>
                      <td><b>{l.desc}</b><div className="d-cell-sub">{chgL} · {AR ? 'الوحدة' : 'unit'} {l.unit}
                        {l.exceeds && <React.Fragment> · <span className="d-vo-warn">{AR ? 'حد 20% = ' : '20% limit = '}{window.fmtNum(+l.con.thr.toFixed(2))} {l.unit}</span></React.Fragment>}</div></td>
                      <td className="mono">{window.fmtNum(l.qtyBefore)}<div className="d-cell-sub">{AR ? 'الأصلية' : 'original'}</div></td>
                      <td className="mono">{window.fmtNum(l.rate)}<div className="d-cell-sub">{AR ? 'السعر الأصلي' : 'original rate'}</div></td>
                      <td className="mono">{window.fmtNum(Math.round(l.valBefore))}<div className="d-cell-sub">{AR ? 'قبل التغيير' : 'before'}</div></td>
                      <td className="d-cell-sub">—</td>
                      <td className="mono">{l.wBefore}%<div className="d-cell-sub">{AR ? 'قبل' : 'before'}</div></td>
                      <td>{applyPill(l.apply)}</td></tr>
                    {partyRow('con', AR ? 'مقترح المقاول' : 'Contractor', l.con,
                      window.fmtNum(+l.con.qtyAfter.toFixed(2)), l.exceeds ? window.fmtNum(l.exRateCon) : '—',
                      window.fmtNum(Math.round(l.valBefore + l.reqDelta)), sign(l.reqDelta), l.wCon + '%', '')}
                    {partyRow('re', AR ? 'مقترح د.م.م' : 'RE dept', l.re,
                      window.fmtNum(+l.re.qtyAfter.toFixed(2)), l.exceeds ? window.fmtNum(l.exRateRe) : '—',
                      window.fmtNum(Math.round(l.valBefore + l.reDelta)), sign(l.reDelta), l.wProposed + '%', '')}
                    {partyRow('app', AR ? 'المعتمد' : 'Approved', l.app,
                      l.qtyApproved != null ? window.fmtNum(+l.qtyApproved.toFixed(2)) : '—',
                      l.exRateApproved != null ? window.fmtNum(l.exRateApproved) : (l.exceeds ? (AR ? 'لجنة تثبيت الأسعار' : 'rate cttee') : '—'),
                      l.appDelta != null ? window.fmtNum(Math.round(l.valAfter)) : '—',
                      l.appDelta != null ? sign(l.appDelta) : '—',
                      l.wApproved != null ? l.wApproved + '%' : '—', null, 'gov')}
                  </React.Fragment>); })}</tbody>
                <tfoot>
                  {[[AR ? 'صافي أثر مقترح المقاول' : 'Net — contractor', rec.netCon, ''],
                    [AR ? 'صافي أثر مقترح د.م.م' : 'Net — RE dept', rec.netRe, ''],
                    [AR ? 'الصافي المعتمد' : 'Net — approved', rec.appValue, 'gov']].map(([lbl, val, cls], k) => (
                    <tr key={k} className={cls}><td colSpan={5}>{lbl}</td>
                      <td className="mono">{val != null ? (val > 0 ? '+' : '') + window.fmtNum(Math.round(val)) : '—'}</td>
                      <td colSpan={2}></td></tr>))}
                </tfoot>
              </table></div>
              <div className="d-cell-sub" style={{ marginTop: 8 }}>{AR ? 'اضغط أي بند لعرض تفاصيله الكاملة.' : 'Select a line to see its full detail.'}</div>
            </div>}

            {rec.lines.length > 0 && <div>{secH('difference', AR ? 'أثر الأوزان' : 'Weight impact')}
              <div className="d-form-grid" style={{ marginBottom: 12 }}>
                {kv(AR ? 'مجموع الأوزان قبل' : 'Sum before', rec.weight.sumBefore.toFixed(2) + '%', true)}
                {kv(AR ? 'مجموع الأوزان بعد' : 'Sum after', rec.weight.sumAfter.toFixed(2) + '%', true)}
                {kv(AR ? 'التحقق من 100%' : '100% validation', rec.weight.valid ? (AR ? 'مطابق' : 'Valid') : (AR ? 'غير مطابق' : 'Invalid'))}
                {kv(AR ? 'آخر إعادة احتساب' : 'Last recalculation', rec.weight.lastCalc, true)}
                {kv(AR ? 'الحالة' : 'State', AR ? VO_WSTATE[rec.weight.state].ar : VO_WSTATE[rec.weight.state].en)}
              </div>
              <table className="d-line-table"><thead><tr>
                <th style={{ width: 100 }}>{AR ? 'الكود' : 'Code'}</th><th style={{ minWidth: 180 }}>{AR ? 'الوصف' : 'Description'}</th>
                <th style={{ width: 100 }}>{AR ? 'قبل' : 'Before'}</th><th style={{ width: 100 }}>{AR ? 'المقترح' : 'Proposed'}</th>
                <th style={{ width: 100 }}>{AR ? 'المعتمد' : 'Approved'}</th><th style={{ width: 100 }}>{AR ? 'المطبق' : 'Applied'}</th>
                <th style={{ width: 100 }}>{AR ? 'الفرق' : 'Delta'}</th></tr></thead>
                <tbody>{rec.lines.map(l => (
                  <tr key={l.code}><td className="mono">{l.code}</td><td>{l.desc}</td>
                    <td className="mono">{l.wBefore}%</td><td className="mono">{l.wProposed}%</td>
                    <td className="mono">{l.wApproved != null ? l.wApproved + '%' : '—'}</td>
                    <td className="mono">{l.wApplied != null ? l.wApplied + '%' : '—'}</td>
                    <td className="mono chg">{((l.wApproved != null ? l.wApproved : l.wProposed) - l.wBefore > 0 ? '+' : '') + ((l.wApproved != null ? l.wApproved : l.wProposed) - l.wBefore).toFixed(2)}%</td></tr>))}</tbody></table>
            </div>}

            {rec.redistribution.length > 0 && <div>{secH('compare', AR ? 'إعادة توزيع الكميات' : 'Quantity redistribution')}
              <table className="d-line-table"><thead><tr>
                <th style={{ width: 120 }}>{AR ? 'البند المصدر' : 'Source BOQ'}</th><th style={{ width: 120 }}>{AR ? 'البند الهدف' : 'Target BOQ'}</th>
                <th style={{ width: 120 }}>{AR ? 'المسحوبة' : 'Drawn'}</th><th style={{ width: 120 }}>{AR ? 'المضافة' : 'Added'}</th>
                <th style={{ width: 100 }}>{AR ? 'الفرق' : 'Difference'}</th><th style={{ width: 140 }}>{AR ? 'الأثر المالي' : 'Cost impact'}</th>
                <th style={{ width: 130 }}>{AR ? 'حالة التطبيق' : 'Applied'}</th></tr></thead>
                <tbody>{rec.redistribution.map((r, i) => (
                  <tr key={i}><td className="mono">{r.src}</td><td className="mono">{r.tgt}</td>
                    <td className="mono">{window.fmtNum(r.drawn)}</td><td className="mono">{window.fmtNum(r.added)}</td>
                    <td className="mono">{r.diff}</td><td className="mono">{(r.money > 0 ? '+' : '') + window.fmtNum(r.money)}</td>
                    <td>{applyPill(r.apply)}</td></tr>))}</tbody></table></div>}
          </div>}

          {tab === 'time' && <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>{secH('calendar_month', AR ? 'ملخص الأثر الزمني' : 'Time impact summary')}
              <div className="d-form-grid">
                {kv(AR ? 'الأنشطة المتأثرة' : 'Affected activities', rec.activities.length, true)}
                {kv(AR ? 'الأيام المطلوبة' : 'Days requested', open.reqExt, true)}
                {kv(AR ? 'الأيام الناتجة عن التحليل' : 'Days from analysis', rec.analysisDays, true)}
                {kv(AR ? 'الأيام المعتمدة' : 'Days approved', rec.appDays != null ? rec.appDays : '—', true)}
                {kv(AR ? 'نهاية المشروع قبل الأمر' : 'Project finish before', rec.finishBefore, true)}
                {kv(AR ? 'النهاية المتوقعة' : 'Forecast finish', rec.finishForecast, true)}
                {kv(AR ? 'النهاية المعتمدة' : 'Approved finish', rec.finishApproved || '—', true)}
                {kv(AR ? 'أثر على المسار الحرج' : 'Affects critical path', open.affectsCP ? (AR ? 'نعم' : 'Yes') : (AR ? 'لا' : 'No'))}
                {kv(AR ? 'أثر على تاريخ الإنجاز' : 'Affects project finish', open.cpDelayDays > 0 ? (AR ? 'نعم' : 'Yes') : (AR ? 'لا' : 'No'))}
              </div></div>
            <div>{secH('list_alt', AR ? 'الأنشطة المتأثرة' : 'Affected activities')}
              <div className="d-vow-tw wide-rec"><table className="d-line-table"><thead>
                <tr className="d-grp"><th colSpan={4}></th><th colSpan={3}>{AR ? 'المدة المتبقية' : 'Remaining duration'}</th>
                  <th colSpan={2}>Start</th><th colSpan={2}>Finish</th><th></th></tr>
                <tr><th style={{ width: 78 }}>Activity ID</th><th style={{ minWidth: 180 }}>{AR ? 'اسم النشاط' : 'Activity name'}</th>
                  <th style={{ width: 120 }}>{AR ? 'نوع التغيير' : 'Change'}</th><th style={{ width: 84 }}>{AR ? 'الإنجاز' : 'Progress'}</th>
                  <th style={{ width: 86 }}>{AR ? 'قبل' : 'Before'}</th><th style={{ width: 100 }}>{AR ? 'المطلوب' : 'Requested'}</th>
                  <th style={{ width: 100 }}>{AR ? 'المعتمدة' : 'Approved'}</th>
                  <th style={{ width: 106 }}>{AR ? 'قبل' : 'Before'}</th><th style={{ width: 106 }}>{AR ? 'المعتمد' : 'Approved'}</th>
                  <th style={{ width: 106 }}>{AR ? 'قبل' : 'Before'}</th><th style={{ width: 106 }}>{AR ? 'المعتمد' : 'Approved'}</th>
                  <th style={{ width: 120 }}>{AR ? 'حالة التطبيق' : 'Applied'}</th></tr></thead>
                <tbody>{rec.activities.map(a => (
                  <tr key={a.id} onClick={() => setDetail(a)} style={{ cursor: 'pointer' }}>
                    <td className="mono">{a.id}</td><td>{a.name}</td><td>{a.chg}</td><td className="mono">{a.pct}%</td>
                    <td className="mono">{a.remBefore}</td>
                    <td className="mono chg">{'+' + a.reqChange}</td>
                    <td className={'mono' + delta(a.remApproved, a.remProposed)}>{a.remApproved != null ? a.remApproved : '—'}</td>
                    <td className="mono">{a.startBefore}</td><td className="mono">{a.startApproved || '—'}</td>
                    <td className="mono">{a.finishBefore}</td>
                    <td className={'mono' + delta(a.finishApproved, a.finishBefore)}>{a.finishApproved || '—'}</td>
                    <td>{applyPill(a.apply)}</td></tr>))}</tbody></table></div>
              <div className="d-vow-note" style={{ marginTop: 10 }}><Icon name="account_tree" size={16} />
                <span>{AR ? 'تعديل مدة النشاط لا يُعد تعديلاً لمدة المشروع — الأثر النهائي يُحدَّد في مرحلة تحليل الجدول.' : 'An activity duration change is not a project duration change — final impact is set during schedule analysis.'}</span></div>
            </div>
          </div>}

          {tab === 'flow' && <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="d-form-grid">
              {kv(AR ? 'المرحلة الحالية' : 'Current stage', stgLabel)}
              {kv(AR ? 'المسؤول الحالي' : 'Current owner', stg ? stg.owner : (actorOf(open) || '—'))}
              {kv(AR ? 'تاريخ الإحالة' : 'Referred on', stg ? stg.start : open.inDate, true)}
              {kv(AR ? 'عدد الأيام' : 'Days elapsed', lead, true)}
              {kv(AR ? 'متأخرة؟' : 'Overdue?', open.slaExceeded ? (AR ? 'نعم' : 'Yes') : (AR ? 'لا' : 'No'))}
              {kv(AR ? 'الإجراء المطلوب' : 'Required action', open.status === 'rejected' ? (AR ? 'إعادة إرسال بعد التعديل' : 'Resubmit after revision')
                : open.status === 'pending' ? (stg && stg.pending.length ? (AR ? 'تسجيل قرار ' + stg.pending[0].party + ' بموجب كتاب' : 'Record ' + stg.pending[0].party + ' against a letter')
                  : (AR ? 'اعتماد أو إعادة بملاحظات' : 'Approve or return with notes')) : '—')}
            </div>
            {rec.skipped.length > 0 && <div className="d-vo-skip">
              <div className="lbl">{AR ? 'مراحل لا تنطبق على هذا الأمر' : 'Stages that do not apply to this order'}</div>
              {rec.skipped.map((s, i) => (
                <div key={i} className="row"><Icon name="close" size={14} /><b>{s.label}</b><span>{s.why}</span></div>))}
            </div>}
            <ol className="d-vow-tl">{rec.chainStages.map((s, i) => {
              const isOpen = openStage === s.key;
              const cls = s.status === 'done' ? 'ok' : s.status === 'rejected' ? 'bad' : (s.status === 'active' || s.status === 'overdue') ? 'on' : '';
              return (<li key={s.key} className={cls}>
                <span className="ic"><Icon name={s.status === 'done' ? 'check' : s.status === 'rejected' ? 'close' : s.ico || 'pending'} size={14} /></span>
                <div className="tx" style={{ width: '100%' }}>
                  <button className="d-vow-stg" onClick={() => setOpenStage(isOpen ? null : s.key)}>
                    <b>{s.label}</b>
                    <span className="d-pill">{s.status === 'done' ? (AR ? 'مكتملة' : 'Done') : s.status === 'rejected' ? (AR ? 'معادة' : 'Returned') : s.status === 'overdue' ? (AR ? 'متأخرة' : 'Overdue') : s.status === 'active' ? (AR ? 'جارية' : 'Active') : (AR ? 'لم تبدأ' : 'Not started')}</span>
                    <span className="d-cell-sub">{s.owner}</span>
                    {s.ext.length > 0 && <span className="d-pill" title={s.ext.map(x => x.party + ' — ' + (AR ? VO_EXT_STATE[x.state].ar : VO_EXT_STATE[x.state].en)).join(' · ')}>
                      {AR ? 'أطراف خارجية ' : 'External '}{s.ext.filter(x => x.state === 'in').length}/{s.ext.length}</span>}
                    <div style={{ flex: 1 }}></div>
                    <span className="d-cell-sub mono">{s.start ? s.elapsed + (AR ? ' يوم' : 'd') : '—'}</span>
                    <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={16} />
                  </button>
                  {isOpen && <div className="d-vow-stgb">
                    {s.note && <div className="d-cell-sub" style={{ marginBottom: 10 }}>{s.note}</div>}
                    {s.ext.length > 0 && <div className="d-vo-ext">
                      <div className="lbl">{AR ? 'أطراف خارجية — تُسجَّل قراراتها بموجب كتاب رسمي' : 'External parties — recorded against an official letter'}</div>
                      {s.ext.map((x, j) => { const st = VO_EXT_STATE[x.state]; return (
                        <div key={j} className="row">
                          <div className="tx"><b>{x.party}</b><span>{x.act}</span></div>
                          <span className="mono">{x.letterNo ? x.letterNo + ' · ' + x.letterDate : (AR ? 'لا كتاب بعد' : 'no letter yet')}</span>
                          <span className={'d-pill ' + st.cls}>{AR ? st.ar : st.en}</span>
                          {x.state === 'wait' && (s.status === 'active' || s.status === 'overdue') &&
                            <button className="d-btn" onClick={() => setRecDec({ stage: s, x })}><Icon name="edit_note" size={14} />{AR ? 'تسجيل' : 'Record'}</button>}
                        </div>); })}
                    </div>}
                    <div className="d-form-grid">
                    {kv(AR ? 'تاريخ الإرسال' : 'Sent on', s.start || '—', true)}
                    {kv(AR ? 'تاريخ الإجراء' : 'Actioned on', s.doneDate || '—', true)}
                    {kv(AR ? 'المدة المستغرقة' : 'Duration', s.start ? s.elapsed + (AR ? ' يوم' : ' days') : '—', true)}
                    {kv(AR ? 'السقف الزمني' : 'SLA', s.sla + (AR ? ' يوم' : ' days'), true)}
                    {kv(AR ? 'القرار' : 'Decision', s.decision || '—')}
                    {kv(AR ? 'الجهة المسؤولة' : 'Owner', s.owner)}
                    {kv(AR ? 'المرفقات' : 'Attachments', rec.attachments.filter(a => a.stage === s.label).length, true)}
                  </div></div>}
                </div></li>); })}</ol>
          </div>}

          {tab === 'files' && <table className="d-line-table"><thead><tr>
            <th style={{ minWidth: 200 }}>{AR ? 'اسم الملف' : 'File name'}</th><th style={{ width: 170 }}>{AR ? 'التصنيف' : 'Category'}</th>
            <th style={{ width: 70 }}>{AR ? 'الإصدار' : 'Version'}</th><th style={{ width: 110 }}>{AR ? 'تاريخ الرفع' : 'Uploaded'}</th>
            <th style={{ width: 140 }}>{AR ? 'المستخدم' : 'User'}</th><th style={{ width: 150 }}>{AR ? 'المرحلة' : 'Stage'}</th>
            <th style={{ width: 110 }}></th></tr></thead>
            <tbody>{rec.attachments.map((a, i) => (
              <tr key={i}><td className="mono">{a.file}</td><td>{a.name}</td><td className="mono">{a.ver}</td>
                <td className="mono">{a.date}</td><td className="d-cell-sub">{a.by}</td><td className="d-cell-sub">{a.stage}</td>
                <td><div className="d-vow-ac">
                  <button className="d-icon-btn" title={AR ? 'عرض' : 'View'} onClick={() => showToast(AR ? 'عرض الملف' : 'Viewing file')}><Icon name="visibility" size={15} /></button>
                  <button className="d-icon-btn" title={AR ? 'تنزيل' : 'Download'} onClick={() => showToast(AR ? 'تنزيل الملف' : 'Downloading file')}><Icon name="download" size={15} /></button>
                </div></td></tr>))}</tbody></table>}

          {tab === 'log' && <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
            <th style={{ width: 140 }}>{AR ? 'التاريخ والوقت' : 'Date & time'}</th><th style={{ width: 150 }}>{AR ? 'المستخدم' : 'User'}</th>
            <th style={{ minWidth: 180 }}>{AR ? 'الإجراء' : 'Action'}</th><th style={{ width: 140 }}>{AR ? 'المرحلة' : 'Stage'}</th>
            <th style={{ width: 130 }}>{AR ? 'القيمة السابقة' : 'Previous value'}</th><th style={{ width: 130 }}>{AR ? 'القيمة الجديدة' : 'New value'}</th>
            <th style={{ minWidth: 150 }}>{AR ? 'الملاحظة' : 'Note'}</th><th style={{ width: 70 }}>{AR ? 'الإصدار' : 'Version'}</th></tr></thead>
            <tbody>{rec.log.map((l, i) => (
              <tr key={i}><td className="mono">{l.date}</td>
                <td className="d-cell-sub">{l.actor}{l.via && <div className="d-cell-sub">{AR ? 'سُجِّل بواسطة: ' : 'recorded by: '}{l.via}</div>}</td><td>{l.act}</td>
                <td className="d-cell-sub">{l.stage}</td><td className="mono">{l.from}</td><td className="mono">{l.to}</td>
                <td className="d-cell-sub">{l.note}</td><td className="mono">{l.ver}</td></tr>))}</tbody></table></div>}
        </div>
      </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { DModVO, DVORecordPanel, voRecord });
