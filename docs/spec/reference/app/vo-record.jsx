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
const VO_PERSONAS = (AR, T) => {
  T = T || { supply: false, reviewer: AR ? 'دائرة المهندس المقيم' : 'RE department' };
  return [
  { key: 'observer', label: AR ? 'مراقب — خارج المسار' : 'Observer — outside the workflow', party: null },
  // the reviewing body: RE department (construction) or inspection & receipt cttee (supply)
  { key: 're', label: T.reviewer, party: T.reviewer },
  { key: 'cttee', label: AR ? 'لجنة أوامر الغيار' : 'Change-order committee', party: AR ? 'لجنة أوامر الغيار' : 'Change-order committee' },
  // rate-fixing exists only in the construction flow
  ...(T.supply ? [] : [{ key: 'rate', label: AR ? 'لجنة تثبيت الأسعار' : 'Rate-fixing committee', party: AR ? 'لجنة تثبيت الأسعار' : 'Rate-fixing committee' }]),
  { key: 'pm', label: AR ? 'مدير المشروع' : 'Project manager', party: AR ? 'مدير المشروع' : 'Project manager' },
  { key: 'senior', label: AR ? 'المستوى الإداري الأعلى' : 'Senior management', party: AR ? 'المستوى الإداري الأعلى' : 'Senior management' },
  { key: 'rapporteur', label: AR ? 'مقرّر لجنة أوامر الغيار (مندوب)' : 'Committee rapporteur (delegate)', party: null, delegate: true },
];
};
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

const VO_STAGES = (AR, o, T) => {
  T = T || { supply: false, enteredBy: AR ? 'دائرة المهندس المقيم' : 'RE department',
    execOwner: AR ? 'دائرة المهندس المقيم' : 'RE department',
    stage1Note: AR ? 'يُدخل المهندس المقيم الأمر بعد ورود طلب المقاول ورأي الاستشاري، ثم يدقّقه ويعيده إلى المقاول عند وجود نقص' : 'Entered by the resident engineer after the contractor’s request and the consultant’s opinion, then reviewed',
    execNote: AR ? 'تحديث العقد وبنود الكميات والجدول الزمني' : 'Contract, BOQ and schedule updated' };
  return [
  { key: 're1', label: AR ? 'دراسة الطلب' : 'Request study',
    owner: T.enteredBy, ico: T.supply ? 'fact_check' : 'engineering',
    note: T.stage1Note,
    ext: [] },
  { key: 'cttee', label: AR ? 'لجنة أوامر الغيار' : 'Change-order committee',
    owner: AR ? 'لجنة أوامر الغيار' : 'Change-order committee', ico: 'account_tree',
    note: AR ? ('تدقيق الطلب وتنظيم الاستمارات، وإعادته إلى ' + (T.supply ? 'لجنة الفحص والاستلام' : 'المهندس المقيم') + ' عند وجود نقص') : 'Reviews the request and prepares the forms; returns it if incomplete',
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
    owner: T.execOwner, ico: 'done',
    note: T.execNote,
    ext: [] },
];
};
/* contractual ceiling per stage, in working days — a request study and a
   ministerial endorsement do not answer to the same clock */
const SLA_OF = { re1: 3, cttee: 5, rate: 7, endorse: 10, order: 14, exec: 7 };
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
  const T = (window.EPM && window.EPM.voTerms) ? window.EPM.voTerms(p || { type: v.type }, lang) : { supply: v.type === 'supply', hasRateRule: v.type !== 'supply' };
  const addD = (iso, n) => { const x = new Date(iso); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const approved = v.status === 'approved';
  const rejected = v.status === 'rejected';
  // applied/closed is a separate state from approved. Prefer the stored `applied`
  // flag (set by the Apply action / seed stamping) so applying an order really
  // closes it; fall back to the seed's index convention only when unset.
  const isApplied = v.applied != null ? !!v.applied : (i === 0 || i === 3);
  const lifecycle = approved ? (isApplied ? 'closed' : 'applied_partial') : v.status;
  const appliedAll = lifecycle === 'closed';
  const sd = p && window.EPM && window.EPM.buildScheduleData ? window.EPM.buildScheduleData(p, lang) : null;
  // weight is a share of the CONTRACT, so scope the denominator to the order's
  // contract before totalling — the register does the same, and an unscoped
  // project-wide total made the two tabs disagree on the same item
  const vck = window.voContractKey ? window.voContractKey(v, d.contracts) : null;
  const scopedBoq = (d.boq || []).filter(b => !vck || !window.contractKeyOfBoq
    || window.contractKeyOfBoq(b, d.contracts) === vck);
  // for supply, the BOQ weight denominator is the supply items' total value —
  // the supply items ARE the BOQ — not the construction boq rows
  let boqSum;
  if (T.supply) {
    const sits = (window.EPMStore && window.EPMStore.get('supply.items.' + (p && p.id), null))
      || (window.EPM.buildSupplyData ? window.EPM.buildSupplyData(p, lang).items : []);
    // fallback rate (contract value ÷ Σ contracted) for older items lacking a price —
    // mirrors voBoq so the denominator and the line rates come from one basis
    const totCq = sits.reduce((s, x) => s + (x.contracted || 0), 0) || 1;
    const fb = Math.max(1, Math.round(((d.contract && d.contract.raw && d.contract.raw.contractCost) || 0) / totCq));
    boqSum = sits.reduce((s, x) => s + (x.contracted || 0) * (x.price != null ? x.price : fb), 0);
  }
  if (!boqSum) boqSum = scopedBoq.reduce((s, b) => s + b.total, 0) || 1;
  const appDays = approved ? v.appExt : null;
  const pend = v.status === 'rejected' ? 'na' : 'todo';   // not approved yet ≠ not required

  // 20% rule: change up to 20% of the original quantity is valued at the
  // original rate; the excess carries a new rate proposed by المقاول and د.م.م
  // and fixed by لجنة تثبيت الأسعار.
  const TIER = 0.20;
  const tierOf = (b, dv, exRate) => {
    // supply prices are catalogue/LC-fixed — no 20% tier, so the whole change is
    // valued at the original rate (threshold pushed to infinity)
    const thr = T.hasRateRule ? b.qtyBefore * TIER : Infinity;
    const at = Math.min(Math.abs(dv), thr), ex = Math.max(0, Math.abs(dv) - thr);
    const sign = dv < 0 ? -1 : 1;
    const rate = exRate == null ? b.rate : exRate;
    return { thr, at, ex, exceeds: ex > 0.001, exRate: exRate,
      delta: sign * (at * b.rate + ex * rate), qtyAfter: b.qtyBefore + dv };
  };
  const linesBase = (v.affectedBOQ || []).map((b, j) => {
    const dvCon = b.qtyAfter - b.qtyBefore;
    const chg = b.chg || (dvCon > 0 ? 'inc' : dvCon < 0 ? 'dec' : 'rate');
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

  // redistribution rows: explicit redist lines take priority (wizard orders —
  // beneficiary→beneficiary for supply, BOQ→BOQ for construction); the seed
  // `v.supply` shape is the legacy fallback.
  const redistLines = (v.affectedBOQ || []).filter(b => b.chg === 'redist');
  const redistApply = approved ? (appliedAll ? 'done' : 'wip') : 'na';
  const redistribution = redistLines.length ? redistLines.reduce((acc, b) => {
    // one row per transfer (supply: beneficiary→beneficiary); a construction
    // redist has no transfers and falls back to its BOQ→BOQ target
    const txs = (b.transfers && b.transfers.length) ? b.transfers
      : (b.benFrom ? [{ from: b.benFrom, to: b.benTo, qty: b.moved }] : []);
    if (txs.length) txs.forEach(t => acc.push({ beneficiary: true, item: b.item, code: b.code,
      src: t.from || '—', tgt: t.to || '—', drawn: Number(t.qty) || 0, added: Number(t.qty) || 0, diff: 0, money: 0, apply: redistApply }));
    else acc.push({ beneficiary: false, item: b.item, code: b.code, src: b.code || '—', tgt: b.tgt || '—',
      drawn: b.moved || 0, added: b.moved || 0, diff: 0, money: 0, apply: redistApply });
    return acc;
  }, []) : v.supply ? [{
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

  // the order is entered by the reviewing body — RE dept (construction) or the
  // inspection & receipt committee (supply) — whatever party asked for it
  const enteredBy = T.enteredBy;
  const log = [
    { date: addD(v.inDate, -9) + ' 10:20', actor: T.requester, act: AR ? 'ورود طلب أمر الغيار' : 'Change-order request received', stage: AR ? 'قبل الإدخال' : 'Before entry', from: '—', to: 'IN-' + (4200 + i * 3), note: AR ? 'كتاب رسمي — يسبق إدخال الأمر' : 'Official letter, precedes entry', ver: 'v1' },
    { date: addD(v.inDate, -3) + ' 09:05', actor: T.techParty, act: T.supply ? (AR ? 'ورود الرأي الفني' : 'Technical opinion received') : (AR ? 'ورود رأي الاستشاري' : 'Consultant opinion received'), stage: AR ? 'قبل الإدخال' : 'Before entry', from: '—', to: 'IN-' + (4300 + i * 3), note: AR ? 'الموافقة على الفقرات' : 'Items approved', ver: 'v1' },
    { date: v.inDate + ' 09:14', actor: enteredBy, act: AR ? 'إنشاء الأمر' : 'Order created', stage: AR ? 'إعداد الطلب' : 'Preparation', from: '—', to: v.no, note: v.reason, ver: 'v1' },
    { date: addD(v.inDate, 1) + ' 11:02', actor: enteredBy, act: AR ? 'تعديل كميات بنود' : 'BOQ quantities edited', stage: AR ? 'إعداد الطلب' : 'Preparation',
      from: lines[0] ? window.fmtNum(lines[0].qtyBefore) : '—', to: lines[0] ? window.fmtNum(lines[0].qtyProposed) : '—', note: '—', ver: 'v1' },
    { date: addD(v.inDate, 2) + ' 08:40', actor: enteredBy, act: AR ? 'الإرسال للمراجعة' : 'Submitted for review', stage: AR ? 'التدقيق الفني' : 'Technical review', from: AR ? 'مسودة' : 'Draft', to: AR ? 'قيد الاعتماد' : 'Pending', note: '—', ver: 'v1' },
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
    /* decisions taken in the app, appended in the order they happened */
    ...(v.decisions || []).map(x => ({ date: x.date, actor: x.actor, via: x.via, act: x.act,
      stage: x.stage, from: x.from, to: x.to, note: x.note || '—', ver: 'v2' })),
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
    needsFunds: lines.reduce((a, l) => a + l.reDelta, 0) !== 0 }, T)
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
    start, doneDate,
    elapsed: doneDate ? Math.round((new Date(doneDate) - new Date(start)) / 86400000)
      : k === reached ? Math.max(0, Math.round((new Date((sd && sd.dataDate) || start) - new Date(start)) / 86400000)) : 0,
    sla: SLA_OF[s.key] != null ? SLA_OF[s.key] : 5,
    /* a breach is what the clock says, not a flag alongside it — otherwise the
       pill, the SLA bar and the escalation entry can disagree, as they did */
    get status() {
      if (rejected && k === 0) return 'rejected';
      if (k < reached) return 'done';
      if (k > reached) return 'todo';
      return this.elapsed > this.sla ? 'overdue' : 'active';
    },
    decision: rejected && k === 0 ? (AR ? 'إعادة للتعديل' : 'Returned') : k < reached ? (AR ? 'موافقة' : 'Approved') : '—',
    /* the comment left on this stage, if a decision was taken on it here */
    comment: (v.decisions || []).filter(x => x.stageKey === s.key && x.note).slice(-1)[0] || null }; });
  // inputs that precede entry of the order — not workflow stages
  const preInputs = [
    { party: T.requester, act: AR ? 'طلب إصدار أمر الغيار مع الكلفة والمدة المقترحة' : 'Request with proposed cost and time',
      letterNo: 'IN-' + (4200 + i * 3), letterDate: addD(v.inDate, -9) },
    { party: T.techParty, act: T.techAct,
      letterNo: 'IN-' + (4300 + i * 3), letterDate: addD(v.inDate, -3) },
  ];
  const skipped = VO_STAGES(AR, { needsRate: true, overQuarter: true, needsFunds: true }, T)
    .filter(s => !chain.some(c => c.key === s.key))
    // rate-fixing is not "skipped" on a supply order — it does not exist in that flow
    .filter(s => !(T.supply && s.key === 'rate'))
    .map(s => ({ label: s.label, why: s.key === 'rate' ? (AR ? 'لا كميات تتجاوز 20% ولا تعديل سعر' : 'No quantity beyond 20% and no rate change')
      : s.key === 'endorse' ? (AR ? 'لا أثر مالي ولا مدة تتجاوز ربع مدة العقد' : 'No financial impact and no duration beyond a quarter')
      : (AR ? 'غير مطلوبة لهذا الأمر' : 'Not required for this order') }));
  return { lifecycle, appliedAll, appValue, appDays, lines, activities, redistribution, weight, steps, log, attachments, anyExceeds, skipped, preInputs,
    /* a breach is whatever the stage clocks say — the register flag, the
       attention chip and the trail all read this one value */
    breached: chainStages.some(x => x.status === 'overdue'),
    chainStages, durQuarter, cDur,
    netCon, netRe,
    analysisDays: v.appExt || v.reqExt,
    finishBefore: baseFinish,
    finishForecast: addD(baseFinish, v.reqExt),
    finishApproved: approved ? addD(baseFinish, v.appExt) : null };
}

function DVORecordPanel({ lang, row, terms, onClose }) {
  const AR = lang === 'ar';
  if (!row) return null;
  const T = terms || { requester: AR ? 'المقاول' : 'Contractor', reviewer: AR ? 'دائرة المهندس المقيم' : 'RE department' };
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
                {F((AR ? 'الكمية المقترحة (' : 'Qty proposed (') + T.requester + ')', window.fmtNum(row.qtyProposed), true)}
                {F((AR ? 'الكمية المقترحة (' : 'Qty proposed (') + T.reviewer + ')', window.fmtNum(row.qtyProposedRe), true)}
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
            {row.apply === 'fail' && <DMsgBar tone="warning" icon="warning"
              title={AR ? 'فشل إعادة احتساب الوزن' : 'Weight recalculation failed'}>
              {AR ? 'لم يكتمل احتساب وزن هذا البند بعد تطبيق الأمر — يتطلب إعادة تشغيل خطوة التطبيق.' : 'This item’s weight did not finish recalculating after the order was applied — the apply step must be re-run.'}</DMsgBar>}
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

function DModVO({ t, lang, d, p, showToast, perm }) {
  const AR = lang === 'ar';
  const pid = (p && p.id) || 'na';
  // Persisted VO list — created orders and workflow transitions survive reload.
  // Stamp the seed's applied state once so prepending new orders can't shift it.
  const [rows, setRows] = window.usePersistedState('vo.rows.' + pid, function () {
    return d.variationOrders.map(function (v, i) {
      return Object.assign({}, v, { attachments: [...(v.attachments || [])],
        applied: v.status === 'approved' ? (i === 0 || i === 3) : undefined });
    });
  });
  // Mutate one order and persist. Used by the wizard and the decision actions.
  const patchOrder = function (no, patch) { setRows(function (rs) { return rs.map(function (r) { return r.no === no ? Object.assign({}, r, patch) : r; }); }); };
  const nextVONo = function () {
    var mx = rows.reduce(function (m, r) { return Math.max(m, parseInt(String(r.no).replace(/\D/g, ''), 10) || 0); }, 0);
    return 'VO-' + String(mx + 1).padStart(2, '0');
  };
  const addOrderFromWizard = function (payload, mode) {
    var status = mode === 'draft' ? 'draft' : 'pending';
    var affectedBOQ = (payload.bRows || []).map(function (r) {
      var q = Number(r.delta) || 0;
      // redistribution keeps the contract total — only the allocation moves
      // (BOQ→BOQ for construction, beneficiary→beneficiary for supply)
      var qtyAfter = r.chg === 'inc' ? r.qty + q : r.chg === 'dec' ? Math.max(0, r.qty - q)
        : r.chg === 'del' ? 0 : r.chg === 'redist' ? r.qty : r.qty;
      var moved = (r.transfers || []).reduce(function (s, t) { return s + (Number(t.qty) || 0); }, 0);
      return { code: r.code, item: r.desc, unit: r.unit, rate: r.price, qtyBefore: r.qty, qtyAfter: qtyAfter, total: r.qty * r.price,
        chg: r.chg, tgt: r.tgt, transfers: r.transfers || [], moved: r.chg === 'redist' ? moved : 0 };
    });
    var affectedActivities = (payload.aRows || []).map(function (r) {
      return { id: r.id, name: r.name, slip: Number(r.days) || 0, critical: /حرج|Critical/.test(r.crit || '') };
    });
    var net = Math.round(payload.boqNet || 0);
    var order = {
      no: nextVONo(), date: payload.inDate, inNo: payload.inNo, inDate: payload.inDate,
      value: net, reason: payload.justNote || (AR ? 'أمر تغييري جديد' : 'New change order'),
      status: status, type: payload.kind, applied: false, responsible: payload.party,
      original: Math.round((payload.cCost || 0) * 0.04), additional: Math.max(0, net), deduction: Math.max(0, -net), net: net,
      revisedContract: (payload.cCost || 0) + net,
      reqExt: payload.daysReq || 0, appExt: null, revisedCompletion: '',
      affectsCP: true, cpDelayDays: 0, stages: [], activeStage: status === 'pending' ? 'cttee' : null, slaExceeded: false,
      affectedBOQ: affectedBOQ, affectedActivities: affectedActivities,
      attachments: (payload.files || []).map(function (f) { return { name: f.name, cat: f.cat, size: f.size }; }),
    };
    setRows(function (rs) { return [order].concat(rs); });
    return order;
  };
  const [openNo, setOpenNo] = React.useState(null);
  const [tab, setTab] = React.useState('summary');
  const [detail, setDetail] = React.useState(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [life, setLife] = React.useState('all');
  const [attnF, setAttnF] = React.useState(null);
  const [query, setQuery] = React.useState('');
  /* the two states a back end owns; the prototype has no server to fail, so
     they are held here rather than fabricated inside the render */
  const [loadErr, setLoadErr] = React.useState(false);
  const denied = perm === false;
  const recCache = React.useMemo(() => new Map(), [rows, d, lang, p && p.id]);
  const recOf = v => { const k = v.no + '|' + v.status + '|' + !!v.applied + '|' + ((v.decisions || []).length);
    let r = recCache.get(k); if (!r) { r = voRecord(v, d, lang, rows.findIndex(x => x.no === v.no), p); recCache.set(k, r); }
    return r; };
  const T = window.EPM.voTerms(p, lang);
  const PERSONAS = VO_PERSONAS(AR, T);
  const [asKey, setAsKey] = React.useState('observer');
  const [focus, setFocus] = React.useState(false);
  const [stageF, setStageF] = React.useState(null);
  const persona = PERSONAS.find(x => x.key === asKey) || PERSONAS[0];
  const relOf = v => voRelation(recOf(v), persona, AR);
  const [openStage, setOpenStage] = React.useState(null);
  const [paneTab, setPaneTab] = React.useState('facts');
  React.useEffect(() => { if (!focus) setPaneTab('facts'); }, [focus]);
  const [recDec, setRecDec] = React.useState(null);
  /* L14's decision panel: one selected action, its comment, and the
     consequence it will have. A decision never fires from a bare button —
     "no silent transitions anywhere in the product". */
  const [decK, setDecK] = React.useState(null);
  const [decNote, setDecNote] = React.useState('');
  const [decTouched, setDecTouched] = React.useState(false);
  React.useEffect(() => { setDecK(null); setDecNote(''); setDecTouched(false); }, [openNo]);
  const [dec, setDec] = React.useState({ kind: 'approve', no: '', date: '', note: '' });
  /* the form is per-party — reopening it for a different one must not inherit
     the previous party's letter number, already validated */
  React.useEffect(() => { setDec({ kind: 'approve', no: '', date: '', note: '' }); }, [recDec && recDec.x && recDec.x.party]);
  const voActs = React.useMemo(() => (showCreate && p ? window.EPM.buildScheduleData(p, lang).activities : []), [showCreate, p && p.id, lang]);
  const isSupply = !!(p && p.type === 'supply');
  // Supply projects run the SAME change-order wizard/flow, but the "items" are the
  // supply line items (فقرات تجهيزية) instead of BOQ rows. A nominal unit price is
  // derived from the contract value so amount/quantity changes still compute.
  const voBoq = React.useMemo(() => {
    if (!isSupply) return d.boq;
    const its = (window.EPMStore && window.EPMStore.get('supply.items.' + pid, null)) || window.EPM.buildSupplyData(p, lang).items;
    const totC = its.reduce((a, x) => a + (x.contracted || 0), 0) || 1;
    // fallback rate for older items that predate the inherited BOQ price attribute
    const unit = Math.max(1, Math.round(((d.contract.raw && d.contract.raw.contractCost) || 0) / totC));
    return its.map(x => { const pr = x.price != null ? x.price : unit;
      return { code: x.code, item: x.device || x.item, unit: x.unit || (AR ? 'جهاز' : 'unit'),
        contractedQty: x.contracted, executedQty: x.received, price: pr, total: (x.contracted || 0) * pr, beneficiaries: x.beneficiaries || [] }; });
  }, [isSupply, pid, lang, d.boq, showCreate]);
  // the wizard only renders in the register branch, so return there when a create
  // is requested while a record is open — otherwise the action silently does nothing
  React.useEffect(() => { const h = () => { setOpenNo(null); setShowCreate(true); };
    window.addEventListener('epm:vo-create', h); return () => window.removeEventListener('epm:vo-create', h); }, []);

  // the project's own data date — a fixed literal made every order look years
  // late once inDate started deriving from the contract term
  const NOW = React.useMemo(() => new Date((p && window.EPM && window.EPM.buildScheduleData
    ? (window.EPM.buildScheduleData(p, lang).dataDate || null) : null)
    || (d.contract && d.contract.raw && d.contract.raw.finish) || '2026-07-22'), [p && p.id, lang, d.contract]);
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
  const needsAction = pending.filter(r => recOf(r).breached);
  const overdue = rows.filter(r => r.status === 'pending' && leadOf(r) > 14);
  const avgCycle = rows.length ? Math.round(rows.reduce((a, r) => a + leadOf(r), 0) / rows.length) : 0;
  const kv = (k, v, mono, sub) => <div className="d-form-i"><span className="k">{k}</span><span className={'v' + (mono ? ' mono' : '')}>{v}</span>{sub ? <span className="d-cell-sub mono">{sub}</span> : null}</div>;

  // Lifecycle is one axis and follows the workflow order; attention is another
  // and depends on who is looking. Mixing them was why "بحاجة إلى إجراء" sat
  // next to "المعتمدة" as if they answered the same question.
  const byLife = k => rows.filter(v => recOf(v).lifecycle === k);
  const groups = [
    ['draft', AR ? 'مسودة' : 'Draft', byLife('draft')],
    ['pending', AR ? 'قيد الاعتماد' : 'In approval', byLife('pending')],
    ['rejected', AR ? 'معاد للتعديل' : 'Returned', byLife('rejected')],
    ['applied_partial', AR ? 'معتمد — بانتظار التطبيق' : 'Approved — applying', byLife('applied_partial')],
    ['closed', AR ? 'مطبّق ومغلق' : 'Applied & closed', byLife('closed')],
  ].filter(g => g[0] !== 'draft' || g[2].length);
  const mineList = rows.filter(v => ['awaiting', 'recorder'].includes(relOf(v).key));
  const mineCount = mineList.length;
  const attn = [
    ['mine', AR ? 'بانتظار إجرائي' : 'Awaiting me', mineList, 'pending_actions'],
    ['sla', AR ? 'تجاوزت السقف الزمني' : 'SLA exceeded', needsAction, 'warning'],
    ['overdue', AR ? 'متأخرة' : 'Overdue', overdue, 'schedule'],
  ];
  // which workflow stage the pending orders are sitting at
  const stageOf = v => { const s = recOf(v).chainStages.find(x => x.status === 'active' || x.status === 'overdue' || x.status === 'rejected'); return s ? s.label : null; };
  const stageList = [...new Set(rows.filter(v => v.status !== 'approved').map(stageOf).filter(Boolean))];
  /* three independent axes that compose: the Z5 status tab, the attention
     chip, the current-stage picker — plus free text over the fields a user
     would actually type (order no., justification, incoming letter) */
  const q = query.trim().toLowerCase();
  const shown = (() => {
    let out = life === 'all' ? rows : (groups.find(g => g[0] === life) || [null, null, []])[2];
    if (attnF) { const set = new Set(((attn.find(x => x[0] === attnF) || [])[2] || []).map(v => v.no));
      out = out.filter(v => set.has(v.no)); }
    if (stageF) out = out.filter(v => stageOf(v) === stageF);
    if (q) out = out.filter(v => (v.no + ' ' + v.reason + ' ' + (v.inNo || '')).toLowerCase().includes(q));
    return out;
  })();
  const filtered = !!(attnF || stageF || q || life !== 'all');
  const clearAll = () => { setLife('all'); setAttnF(null); setStageF(null); setQuery(''); };
  const LIFE_TABS = [{ id: 'all', label: AR ? 'الكل' : 'All', n: rows.length }]
    .concat(groups.map(g => ({ id: g[0], label: g[1], n: g[2].length })));
  const flags = v => {
    const r = recOf(v); const out = [];
    if (v.status === 'pending' && leadOf(v) > 14) out.push([AR ? 'متأخر' : 'Overdue', 'stalled']);
    if (v.status === 'pending' && r.breached) out.push([AR ? 'تجاوزت السقف' : 'SLA breached', 'stalled']);
    if (r.lifecycle === 'applied_partial' && r.steps.some(s => s[2] === 'fail')) out.push([AR ? 'فشل التطبيق' : 'Apply failed', 'stalled']);
    if (v.status === 'pending' && r.anyExceeds && !r.lines.some(l => l.exRateApproved != null)) out.push([AR ? 'بانتظار تثبيت الأسعار' : 'Awaiting rate fixing', 'suspended']);
    return out;
  };

  /* L05: four distinct empty states, never one generic message. Two are
     reachable from the data; `denied` and `failed` are the states a real
     back end produces, wired to the props/flags that will carry them. */
  const EMPTY = {
    none: { ico: 'sync_alt', ar: ['لا أوامر تغييرية على هذا المشروع', 'يُنشأ أمر الغيار بعد ورود طلب الجهة المنفِّذة ورأي الجهة الفنية.'],
      en: ['No change orders on this project', 'A change order is raised once the executing party requests it and the technical party has given its opinion.'],
      cta: [AR ? 'أمر تغييري جديد' : 'New change order', 'add', () => setShowCreate(true)] },
    filtered: { ico: 'filter_alt_off', ar: ['لا أوامر مطابقة للفلاتر', 'غيّر الحالة أو المرحلة، أو امسح الفلاتر لعرض كل الأوامر.'],
      en: ['No orders match the filters', 'Change the status or stage, or clear the filters to see every order.'],
      cta: [AR ? 'مسح الفلاتر' : 'Clear filters', 'close', clearAll] },
    denied: { ico: 'lock', ar: ['لا تملك صلاحية على أوامر هذا المشروع', 'الوصول إلى الأوامر التغييرية محكوم بدورك وبنطاق المشروع. راجع مسؤول النظام.'],
      en: ['You do not have permission for this project’s orders', 'Access to change orders follows your role and project scope. Contact the system administrator.'], cta: null },
    failed: { ico: 'cloud_off', ar: ['تعذّر تحميل الأوامر التغييرية', 'انقطع الاتصال بالخادم أثناء جلب السجل. البيانات المعروضة قد تكون غير مكتملة.'],
      en: ['Change orders could not be loaded', 'The connection to the server dropped while fetching the register. What is shown may be incomplete.'],
      cta: [AR ? 'إعادة المحاولة' : 'Retry', 'refresh', () => setLoadErr(false)] },
  };
  const emptyState = k => { const e = EMPTY[k]; const tx = AR ? e.ar : e.en;
    return (<div className="d-empty">
      <span className="d-empty-ico"><Icon name={e.ico} size={26} /></span>
      <b>{tx[0]}</b><span>{tx[1]}</span>
      {e.cta && <button className="d-btn sm primary" onClick={e.cta[2]}>
        <Icon name={e.cta[1]} size={15} />{e.cta[0]}</button>}
    </div>); };

  if (!open) return (
    <DModuleFrame
      title={t('mod_changeorders')}
      sub={T.subtitle}
      tabs={LIFE_TABS} tab={life} onTab={k => { setLife(k); setStageF(null); }}
      toolbar={
        <label className="d-ctxsel"><span>{AR ? 'العرض بصفة' : 'Viewing as'}</span>
          <select aria-label={AR ? 'العرض بصفة' : 'Viewing as'} value={asKey} onChange={e => setAsKey(e.target.value)}>
            {PERSONAS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select></label>}
      actions={
        <button className="d-btn sm primary" onClick={() => setShowCreate(true)}>
          <Icon name="add" size={15} />{AR ? 'أمر تغييري جديد' : 'New change order'}</button>}
      status={<DZ10 lang={lang} asOf={d.asOf} stats={[
        { k: AR ? 'الأوامر' : 'Orders', v: shown.length + ' / ' + rows.length },
        { k: AR ? 'قيد الاعتماد' : 'In approval', v: pending.length },
        { k: AR ? 'صافي المعتمد' : 'Net approved', v: approvedNet, money: true },
        /* §30: the cycle-time metric belongs in Z10, not a tile */
        { k: AR ? 'متوسط دورة الاعتماد' : 'Avg approval cycle', v: avgCycle + (AR ? ' يوم' : ' d') },
      ]} />}>

      {showCreate && <DVOCreateWizard lang={lang} contract={d.contract} contracts={d.contracts} boq={voBoq} acts={voActs} isSupply={isSupply}
        onClose={() => setShowCreate(false)}
        onDraft={(payload) => { const o = addOrderFromWizard(payload || {}, 'draft'); setShowCreate(false); showToast(AR ? 'حُفظ الأمر التغييري كمسودة — ' + o.no : 'Change order saved as draft — ' + o.no); clearAll(); setOpenNo(o.no); setTab('summary'); }}
        onDone={(payload) => { const o = addOrderFromWizard(payload || {}, 'submit'); window.EPM.pushEvent && window.EPM.pushEvent({ icon: 'sync_alt', tone: 'azure', txtAr: 'أنشأتَ وأرسلتَ أمراً تغييرياً', txtEn: 'you created & submitted change order', tgt: o.no }); setShowCreate(false); showToast(AR ? 'أُرسل الأمر التغييري للمراجعة — ' + o.no : 'Change order sent for review — ' + o.no); clearAll(); setOpenNo(o.no); setTab('summary'); }} />}

      {mineCount > 0 && <DMsgBar tone="warning" icon="pending_actions"
        title={AR ? (mineCount === 1 ? 'أمر واحد بانتظار إجرائك' : mineCount + ' أوامر بانتظار إجرائك')
                  : (mineCount === 1 ? 'One order awaits your action' : mineCount + ' orders await your action')}>
        <span>{AR ? 'بصفة ' : 'as '}{persona.label}</span>
        <button className="d-btn sm primary" style={{ marginInlineStart: 12 }}
          onClick={() => { setFocus(true); setOpenNo(mineList[0].no); setTab('flow'); }}>
          <Icon name="playlist_play" size={15} />{AR ? 'وضع الإنجاز' : 'Focus mode'}</button>
      </DMsgBar>}

      <DFGroup id="vo-reg" flush
        title={AR ? 'سجل الأوامر التغييرية' : 'Change-order register'}
        sub={shown.length + (AR ? ' من ' : ' of ') + rows.length}>
        <div className="d-toolbar">
          <div className="d-field">
            <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
            <input aria-label={AR ? 'بحث في الأوامر' : 'Search change orders'}
              placeholder={AR ? 'بحث بالرقم أو السبب أو رقم الوارد…' : 'Search by number, reason or letter…'}
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          {attn.map(([k, lbl, list, ico]) => (
            <button key={k} className={'d-fchip' + (attnF === k ? ' on' : '')} disabled={!list.length}
              aria-pressed={attnF === k} onClick={() => setAttnF(attnF === k ? null : k)}>
              <Icon name={ico} size={13} />{lbl}<span className="n">{list.length}</span></button>))}
          {stageList.length > 0 && (
            <label className="d-ctxsel"><span>{AR ? 'المرحلة' : 'Stage'}</span>
              <select aria-label={AR ? 'المرحلة الحالية' : 'Current stage'}
                value={stageF || ''} onChange={e => setStageF(e.target.value || null)}>
                <option value="">{AR ? 'كل المراحل' : 'All stages'}</option>
                {stageList.map(x => <option key={x} value={x}>{x}</option>)}
              </select></label>)}
          <div className="sp"></div>
          {filtered && <button className="d-btn sm ghost" onClick={clearAll}>
            <Icon name="close" size={13} />{AR ? 'مسح الفلاتر' : 'Clear filters'}</button>}
        </div>

        {shown.length && !denied && !loadErr ? (
        <div className="d-vow-tw wide-voreg"><table className="d-line-table d-vo-reg"><thead><tr>
          <th style={{ width: 88 }}>{AR ? 'الرمز' : 'Code'}</th>
          <th style={{ minWidth: 250 }}>{AR ? 'الأمر التغييري' : 'Change order'}</th>
          <th style={{ width: 140 }} className="r">{AR ? 'القيمة' : 'Value'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
          <th style={{ width: 92 }} className="r">{AR ? 'المدة' : 'Time'} <span className="cur">({AR ? 'يوم' : 'd'})</span></th>
          <th style={{ width: 230 }}>{AR ? 'الحالة والمرحلة' : 'Status & stage'}</th>
          <th style={{ width: 200 }}>{AR ? 'الجهة المسؤولة' : 'Owner'}</th>
          <th style={{ width: 80 }} className="r">{AR ? 'مرفقات' : 'Files'}</th></tr></thead>
          <tbody>{shown.map(v => { const R = recOf(v);
            const stg = R.chainStages.find(x => x.status === 'active' || x.status === 'overdue' || x.status === 'rejected');
            const gov = R.appValue != null ? R.appValue : R.netRe;
            const fl = flags(v);
            const rl = relOf(v);
            return (
            <tr key={v.no} tabIndex={0} role="link"
              aria-label={v.no + ' — ' + v.reason}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenNo(v.no); setTab('summary'); } }}
              onClick={() => { setOpenNo(v.no); setTab('summary'); }} style={{ cursor: 'pointer' }}>
              <td className="code">{v.no}</td>
              <td className="name wrap">{v.reason}
                <div className="d-cell-sub">{v.inNo} · {v.inDate}</div></td>
              <td className="r"><DMoney v={Math.round(gov)} lang={lang} size="sm" bare signed />
                <div className="d-cell-sub">{R.appValue != null ? (AR ? 'معتمد' : 'approved') : (AR ? 'مقترح' : 'proposed')}</div></td>
              <td className="r num">{(v.status === 'approved' ? v.appExt : v.reqExt) || 0}</td>
              <td>
                <div className="d-pillrow">{lifePill(v)}
                  {fl.map((f, i) => <span key={i} className={'d-pill ' + f[1]}>{f[0]}</span>)}
                  {rl.key !== 'none' && <span className={'d-pill ' + VO_REL[rl.key].cls} title={rl.stage ? rl.stage.label : ''}>
                    <Icon name={VO_REL[rl.key].ico} size={12} />{AR ? VO_REL[rl.key].ar : VO_REL[rl.key].en}</span>}</div>
                <div className="d-cell-sub">{v.status === 'approved' ? (AR ? 'اكتمل المسار' : 'Workflow complete')
                  : stg ? stg.label + (stg.status === 'rejected' ? (AR ? ' — معادة' : ' — returned') : '') : '—'}</div></td>
              <td className="d-cell-sub wrap">{stg ? stg.owner : (actorOf(v) || '—')}
                <div className="d-cell-sub mono">{v.date}</div></td>
              <td className="r num">{(v.attachments || []).length || '—'}</td>
            </tr>); })}</tbody>
          <tfoot><tr>
            <td className="code">{AR ? 'الإجمالي' : 'Total'}</td>
            <td className="d-cell-sub">{shown.length}{AR ? ' من ' : ' of '}{rows.length}{AR ? ' أمر' : ' orders'}</td>
            <td className="r"><DMoney lang={lang} size="sm" bare signed
              v={Math.round(shown.reduce((a, v) => { const R = recOf(v); return a + (R.appValue != null ? R.appValue : R.netRe); }, 0))} /></td>
            <td className="r num">{shown.reduce((a, v) => a + ((v.status === 'approved' ? v.appExt : v.reqExt) || 0), 0)}</td>
            <td colSpan={2} className="d-cell-sub">{AR ? 'المعتمد فعلياً ' : 'Actually approved '}
              <DMoney v={Math.round(approvedNet)} lang={lang} size="sm" /></td>
            <td className="r num">{shown.reduce((a, v) => a + ((v.attachments || []).length), 0)}</td>
          </tr></tfoot></table></div>
        ) : emptyState(denied ? 'denied' : loadErr ? 'failed' : rows.length === 0 ? 'none' : 'filtered')}
      </DFGroup>
    </DModuleFrame>
  );

  // ================= record =================
  const viewerRel = voRelation(rec, persona, AR);
  const canAct = viewerRel.key === 'awaiting' || viewerRel.key === 'recorder';
  const stg = rec.chainStages.find(s => s.status === 'active' || s.status === 'overdue' || s.status === 'rejected') || null;
  const stgLabel = open.status === 'approved' ? (AR ? 'مكتملة' : 'Complete')
    : stg ? stg.label + (stg.status === 'rejected' ? (AR ? ' (معادة)' : ' (returned)') : '') : '—';
  const lead = leadOf(open);
  const L = LIFE[rec.lifecycle] || LIFE.pending;
  // col-1 proposal label follows the party that actually submitted (open.responsible);
  // col-2 is the fixed reviewer for the project type. A supply order persisted by
  // the old wizard (or a seed) may carry a construction party like «المقاول» — fall
  // back to the type's canonical requester so no construction party leaks onto a
  // supply record.
  const reqLabel = (open.responsible && T.parties.indexOf(open.responsible) >= 0) ? open.responsible : T.requester;
  const revLabel = T.reviewer;
  const TABS = AR
    ? [['summary', 'الملخص', 'summarize'], ['cost', 'الكميات والكلفة', 'list_alt'], ['time', 'الأثر الزمني', 'calendar_month'],
       ['flow', 'المسار', 'account_tree'], ['files', 'المرفقات', 'attach_file'], ['log', 'السجل', 'history']]
    : [['summary', 'Summary', 'summarize'], ['cost', 'Quantities & cost', 'list_alt'], ['time', 'Time impact', 'calendar_month'],
       ['flow', 'Workflow', 'account_tree'], ['files', 'Attachments', 'attach_file'], ['log', 'Audit trail', 'history']];
  const act = (label, ico, fn, primary) => <button className={'d-btn' + (primary ? ' primary' : '')} onClick={fn}><Icon name={ico} size={15} />{label}</button>;
  const applyPill = k => { const s = VO_APPLY[k]; return <span className={'d-pill ' + s.cls}>{AR ? s.ar : s.en}</span>; };
  /* money in a card carries its unit; money in a table does not, because the
     column header carries it once for the whole column */
  const M = (v, o) => v == null ? '—' : <DMoney v={Math.round(v)} lang={lang} size="sm" signed={!!(o && o.signed)} />;
  const Mb = (v, o) => v == null ? '—' : <DMoney v={Math.round(v)} lang={lang} size="sm" bare signed={!!(o && o.signed)} />;
  const days = v => v == null ? '—' : <span className="num">{v}{AR ? ' يوم' : ' d'}</span>;
  const delta = (a, b) => a == null || b == null || a === b ? '' : ' chg';

  const queue = focus ? mineList : [];
  const qIdx = queue.findIndex(x => x.no === openNo);
  const goNext = () => { const n = queue[qIdx + 1]; if (n) { setOpenNo(n.no); setTab('flow'); } };
  const goPrev = () => { const n = queue[qIdx - 1]; if (n) { setOpenNo(n.no); setTab('flow'); } };

  /* ---- L14 trail: EVERY stage of the canonical chain, including the ones
     this order skips. A conditional stage shown greyed with its condition
     stated tells the reader why it is absent; omitting it silently does not. */
  const FULL_CHAIN = VO_STAGES(AR, { needsRate: true, overQuarter: true, needsFunds: true }, T)
    .filter(x => !(T.supply && x.key === 'rate'));
  const trail = FULL_CHAIN.map(f => {
    const live = rec.chainStages.find(x => x.key === f.key);
    if (live) return live;
    const sk = rec.skipped.find(x => x.label === f.label);
    return Object.assign({}, f, { ghost: true, status: 'na', ext: [], pending: [],
      why: sk ? sk.why : (AR ? 'غير مطلوبة لهذا الأمر' : 'Not required for this order') });
  });
  const ST_LBL = {
    done: { ar: 'مكتملة', en: 'Done', cls: 'completed' },
    rejected: { ar: 'معادة', en: 'Returned', cls: 'stalled' },
    overdue: { ar: 'تجاوزت السقف', en: 'SLA breached', cls: 'stalled' },
    active: { ar: 'جارية', en: 'Active', cls: 'ongoing' },
    todo: { ar: 'لم تبدأ', en: 'Not started', cls: '' },
    na: { ar: 'لا تنطبق', en: 'Not applicable', cls: '' },
  };

  /* ---- the decisions this order can actually take from where it stands ---- */
  const nextStage = (() => { const i = trail.findIndex(x => x.status === 'active' || x.status === 'overdue');
    for (let j = i + 1; j < trail.length; j++) if (!trail[j].ghost) return trail[j];
    return null; })();
  const DEC = (() => {
    if (!canAct) return [];
    /* every waiting party gets its own entry — the endorsement stage can be
       waiting on two at once, and only the first was ever reachable */
    const recs = (open.status === 'pending' && stg ? stg.pending : []).map((x, j) => ({
      k: 'record:' + j, party: x, label: AR ? 'تسجيل قرار ' + x.party : 'Record ' + x.party + '’s decision',
      cta: AR ? 'فتح نموذج التسجيل' : 'Open the recording form', ico: 'edit_note', note: false,
      why: [AR ? 'يُنسب القرار إلى ' + x.party + ' ويُسجَّل باسم ' + (x.delegate || persona.label) + ' كمُسجِّل.'
               : 'Attributed to ' + x.party + ', recorded by ' + (x.delegate || persona.label) + '.',
            AR ? 'يتطلّب رقم الكتاب الرسمي وتاريخه.' : 'Requires the official letter number and date.',
            AR ? 'لا تتقدّم المرحلة قبل ورود كل الأطراف الخارجية (' + stg.ext.filter(y => y.state === 'in').length + '/' + stg.ext.length + ').'
               : 'The stage cannot advance until every external party has responded (' + stg.ext.filter(y => y.state === 'in').length + '/' + stg.ext.length + ').'] }));
    /* returning stays open while a letter is outstanding — a defective order
       should not have to wait on a ministry reply to be sent back */
    if (open.status === 'pending' && recs.length) return recs.concat([
      { k: 'return', label: AR ? 'إعادة للتعديل' : 'Return for revision',
        cta: AR ? 'إعادة للتعديل' : 'Return for revision', ico: 'undo', note: true,
        why: [AR ? 'يعود الأمر إلى ' + reqLabel + ' لاستكمال النواقص، وتُلغى مطالبات الأطراف الخارجية المعلّقة.'
                 : 'The order goes back to ' + reqLabel + '; outstanding external requests are withdrawn.',
              AR ? 'يُسجَّل التعليق في سجل التدقيق ولا يمكن حذفه.' : 'The comment is written to the audit trail and cannot be removed.'] }]);
    if (open.status === 'pending') return [
      { k: 'approve', label: AR ? 'اعتماد وإحالة' : 'Approve and forward',
        cta: AR ? 'اعتماد وإحالة' : 'Approve and forward', ico: 'check_circle', primary: true, note: false,
        why: [nextStage ? (AR ? 'تُحال إلى «' + nextStage.label + '» — ' + nextStage.owner : 'Forwarded to “' + nextStage.label + '” — ' + nextStage.owner)
                        : (AR ? 'يكتمل المسار ويصبح الأمر معتمداً.' : 'The workflow completes and the order becomes approved.'),
              AR ? 'يُشعَر ' + reqLabel + ' و' + revLabel + '.' : 'Notifies ' + reqLabel + ' and ' + revLabel + '.',
              AR ? 'تُقفل بنود هذه المرحلة عن التعديل ويُعاد ضبط السقف الزمني للمرحلة التالية.' : 'This stage locks and the next stage’s SLA clock is reset.',
              AR ? 'لا يُرحَّل أي مبلغ إلى العقد قبل تطبيق الأمر وإصدار الملحق.' : 'Nothing posts to the contract until the order is applied and the addendum issued.'] },
      { k: 'return', label: AR ? 'إعادة للتعديل' : 'Return for revision',
        cta: AR ? 'إعادة للتعديل' : 'Return for revision', ico: 'undo', note: true,
        why: [AR ? 'يعود الأمر إلى ' + reqLabel + ' لاستكمال النواقص.' : 'The order goes back to ' + reqLabel + ' for completion.',
              AR ? 'يُفتح السجل للتعديل ويُعاد إرساله بعد التصحيح.' : 'The record reopens for editing and is resubmitted after correction.',
              AR ? 'يُسجَّل التعليق في سجل التدقيق ولا يمكن حذفه.' : 'The comment is written to the audit trail and cannot be removed.'] },
      { k: 'reject', label: AR ? 'رفض الأمر' : 'Reject the order',
        cta: AR ? 'رفض الأمر' : 'Reject the order', ico: 'close', danger: true, note: true,
        why: [AR ? 'يُغلق الأمر نهائياً ولا يُطبَّق على العقد.' : 'The order closes permanently and never reaches the contract.',
              AR ? 'يُشعَر ' + reqLabel + ' بالسبب.' : reqLabel + ' is notified with the reason.',
              AR ? 'يبقى السجل للاطلاع ضمن سجل التدقيق.' : 'The record stays readable in the audit trail.'] }];
    if (open.status === 'rejected') return [
      { k: 'resubmit', label: AR ? 'إعادة الإرسال بعد التعديل' : 'Resubmit after revision',
        cta: AR ? 'إعادة الإرسال' : 'Resubmit', ico: 'arrow_forward', primary: true, note: false,
        why: [AR ? 'يعود الأمر إلى بداية التدقيق لدى ' + revLabel + '.' : 'The order re-enters review at ' + revLabel + '.',
              AR ? 'يُعاد ضبط السقف الزمني من تاريخ الإرسال.' : 'The SLA clock restarts from the submission date.'] }];
    if (rec.lifecycle === 'applied_partial') return [
      { k: 'apply', label: AR ? 'تطبيق الأمر وإصدار الملحق' : 'Apply the order and issue the addendum',
        cta: AR ? 'تطبيق الأمر' : 'Apply the order', ico: 'done_all', primary: true, note: false,
        why: [AR ? 'تُحدَّث قيمة العقد النافذة وبنود الكميات والأوزان والجدول الزمني.' : 'The effective contract value, BOQ quantities, weights and schedule are updated.',
              AR ? 'يصدر ملحق العقد ويصبح التغيير نافذاً.' : 'The contract addendum is issued and the change becomes effective.',
              AR ? 'يُغلق الأمر ولا يمكن التراجع عنه إلا بأمر تغييري جديد.' : 'The order closes; reversing it needs a new change order.'] }];
    return [];
  })();
  const cur = DEC.find(x => x.k === decK) || null;
  const noteBad = !!(cur && cur.note && !decNote.trim());
  /* what the panel promises — "written to the audit trail and cannot be
     removed" — has to be true, so a decision writes an entry the log and the
     trail both read back */
  const stampDecision = (extra) => {
    const d0 = new Date();
    const pad = x => String(x).padStart(2, '0');
    const at = d0.getFullYear() + '-' + pad(d0.getMonth() + 1) + '-' + pad(d0.getDate())
      + ' ' + pad(d0.getHours()) + ':' + pad(d0.getMinutes());
    return [...(open.decisions || []), Object.assign({ date: at, actor: persona.label,
      stage: stg ? stg.label : stgLabel, stageKey: stg ? stg.key : null, note: decNote.trim() }, extra)];
  };
  const runDec = () => {
    if (!cur) return;
    if (cur.note && !decNote.trim()) { setDecTouched(true);
      window.requestAnimationFrame(() => { const el = document.getElementById('vo-dec-note'); if (el) el.focus(); });
      return; }
    if (cur.k.indexOf('record:') === 0) { setRecDec({ stage: stg, x: cur.party }); return; }
    if (cur.k === 'approve') { patchOrder(open.no, { status: 'approved', applied: false, slaExceeded: false,
      decisions: stampDecision({ act: AR ? 'اعتماد وإحالة' : 'Approved and forwarded',
        from: AR ? 'قيد الاعتماد' : 'Pending', to: AR ? 'معتمد' : 'Approved' }) });
      window.EPM.pushEvent && window.EPM.pushEvent({ icon: 'check_circle', tone: 'success', txtAr: 'اعتمدتَ الأمر التغييري', txtEn: 'you approved change order', tgt: open.no });
      showToast(AR ? 'تم الاعتماد — لم يُطبَّق بعد' : 'Approved — not yet applied'); }
    else if (cur.k === 'return') { patchOrder(open.no, { status: 'rejected',
      decisions: stampDecision({ act: AR ? 'إعادة للتعديل' : 'Returned for revision',
        from: AR ? 'قيد الاعتماد' : 'Pending', to: AR ? 'معاد للتعديل' : 'Returned' }) });
      showToast(AR ? 'أُعيد بملاحظات' : 'Returned with notes'); }
    else if (cur.k === 'reject') { patchOrder(open.no, { status: 'rejected',
      decisions: stampDecision({ act: AR ? 'رفض الأمر' : 'Order rejected',
        from: AR ? 'قيد الاعتماد' : 'Pending', to: AR ? 'مرفوض' : 'Rejected' }) });
      showToast(AR ? 'تم الرفض' : 'Rejected'); }
    else if (cur.k === 'resubmit') { patchOrder(open.no, { status: 'pending',
      decisions: stampDecision({ act: AR ? 'إعادة الإرسال بعد التعديل' : 'Resubmitted after revision',
        from: AR ? 'معاد للتعديل' : 'Returned', to: AR ? 'قيد الاعتماد' : 'Pending' }) });
      showToast(AR ? 'أُعيد الإرسال' : 'Resubmitted'); }
    else if (cur.k === 'apply') { patchOrder(open.no, { applied: true,
      decisions: stampDecision({ act: AR ? 'تطبيق الأمر وإصدار الملحق' : 'Order applied, addendum issued',
        from: AR ? 'معتمد' : 'Approved', to: AR ? 'مطبّق ومغلق' : 'Applied & closed' }) });
      window.EPM.pushEvent && window.EPM.pushEvent({ icon: 'sync_alt', tone: 'azure', txtAr: 'طبّقتَ الأمر التغييري وأنشأتَ ملحقاً على', txtEn: 'you applied change order & created an amendment on', tgt: open.contractId || open.no });
      showToast(AR ? 'طُبِّق الأمر وأُغلق — حُدِّث العقد وبنود الكميات' : 'Applied & closed — contract and BOQ updated'); }
    setDecK(null); setDecNote(''); setDecTouched(false);
    /* the button the user just pressed becomes disabled — move focus to the
       trail rather than dropping it on <body> */
    window.requestAnimationFrame(() => {
      const el = document.querySelector('.d-votrail .hd:not([disabled])');
      if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); }
    });
  };

  const relBar = (() => { const R2 = VO_REL[viewerRel.key];
    const tone = viewerRel.key === 'awaiting' ? 'warning' : viewerRel.key === 'acted' ? 'success'
      : viewerRel.key === 'recorder' ? 'warning' : 'info';
    const body = viewerRel.key === 'awaiting' ? (AR ? 'المرحلة الحالية «' + viewerRel.stage.label + '» بعهدتك — لوحة القرار في تبويب المسار متاحة لك.'
        : 'The current stage “' + viewerRel.stage.label + '” is yours — the decision panel on the Workflow tab is open to you.')
      : viewerRel.key === 'acted' ? (AR ? 'أنهيت دورك في هذا الأمر؛ المسار الآن لدى جهة أخرى.' : 'Your part is done; the order sits with another party.')
      : viewerRel.key === 'upcoming' ? (AR ? 'سيصلك عند مرحلة «' + viewerRel.stage.label + '».' : 'It reaches you at “' + viewerRel.stage.label + '”.')
      : viewerRel.key === 'recorder' ? (AR ? 'تسجّل قرار جهة خارجية نيابةً عنها — القرار يُنسب للجهة وأنت المُسجِّل.' : 'You record an external party’s decision on its behalf — the decision is attributed to the party.')
      : (AR ? 'لست ضمن مسار هذا الأمر — العرض للاطلاع فقط.' : 'You are not in this order’s workflow — view only.');
    return <DMsgBar tone={tone} icon={R2.ico} title={persona.label + ' — ' + (AR ? R2.ar : R2.en)}>{body}</DMsgBar>; })();

  return (
    <React.Fragment>
      {detail && <DVORecordPanel lang={lang} row={detail} terms={T} onClose={() => setDetail(null)} />}
      {recDec && <React.Fragment>
        <div className="d-drawer-scrim" onClick={() => setRecDec(null)}></div>
        <div className="d-drawer">
          <div className="d-drawer-head"><div className="tx"><b>{AR ? 'تسجيل قرار جهة خارجية' : 'Record an external decision'}</b>
            <span>{recDec.x.party} — {recDec.stage.label}</span></div>
            <button className="d-icon-btn" onClick={() => setRecDec(null)}><Icon name="close" size={18} /></button></div>
          <div className="d-drawer-body">
            <DMsgBar tone="info" icon="person" title={AR ? 'قرار جهة خارجية' : 'An external party’s decision'}>
              {AR ? 'يُنسب القرار إلى ' : 'Attributed to '}<b>{recDec.x.party}</b>
              {AR ? ' ويظهر ' : ', recorded by '}<b>{recDec.x.delegate || persona.label}</b>
              {AR ? ' كمُسجِّل — يظهر الاسمان في المسار وسجل التدقيق.' : ' — both names appear in the trail and the audit log.'}</DMsgBar>
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
            <span className="d-form-state">{!dec.no.trim() || !dec.date.trim()
              ? (AR ? 'رقم الكتاب وتاريخه إلزاميان' : 'Letter number and date are required') : ''}</span>
            <button className="d-btn primary" disabled={!dec.no.trim() || !dec.date.trim()}
              onClick={() => { setRecDec(null); showToast(AR ? 'سُجِّل قرار ' + recDec.x.party : 'Decision recorded for ' + recDec.x.party); }}>
              <Icon name="check" size={15} />{AR ? 'تسجيل القرار' : 'Record decision'}</button>
          </div>
        </div></React.Fragment>}
    <DModuleFrame
      back={<button className="d-btn sm" onClick={() => { setOpenNo(null); setFocus(false); }}>
        <Icon name={AR ? 'chevron_right' : 'chevron_left'} size={16} />{AR ? 'السجل' : 'Register'}</button>}
      title={open.no}
      sub={open.reason}
      tabs={TABS.map(x => ({ id: x[0], label: x[1], icon: x[2] }))} tab={tab} onTab={setTab}
      toolbar={<React.Fragment>
        <label className="d-ctxsel"><span>{AR ? 'العرض بصفة' : 'Viewing as'}</span>
          <select aria-label={AR ? 'العرض بصفة' : 'Viewing as'} value={asKey} onChange={e => setAsKey(e.target.value)}>
            {PERSONAS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select></label>
        {focus && <React.Fragment>
        <button className="d-btn sm" disabled={qIdx <= 0} onClick={goPrev}>
          <Icon name={AR ? 'chevron_right' : 'chevron_left'} size={15} />{AR ? 'السابق' : 'Previous'}</button>
        <span className="d-ctxnum num">{qIdx + 1} / {queue.length}</span>
        <button className="d-btn sm" disabled={qIdx >= queue.length - 1} onClick={goNext}>
          {AR ? 'التالي' : 'Next'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={15} /></button>
        </React.Fragment>}
      </React.Fragment>}
      actions={<React.Fragment>
        {rec.lifecycle === 'closed' && <button className="d-btn sm" onClick={() => showToast(AR ? 'تحضير الطباعة' : 'Preparing print')}>
          <Icon name="print" size={15} />{AR ? 'طباعة' : 'Print'}</button>}
        <button className="d-btn sm" onClick={() => showToast(AR ? 'تصدير السجل' : 'Exporting record')}>
          <Icon name="download" size={15} />{AR ? 'تصدير' : 'Export'}</button>
      </React.Fragment>}
      aside={
        /* L14 Z8 — the record's key facts, so the approver never has to leave
           the decision to look one up. In focus mode the same rail carries the
           queue, so the docked pane stays the single side surface. */
        <DRecordPane lang={lang}
          title={paneTab === 'queue' ? (AR ? 'بانتظار إجرائك' : 'Awaiting you') : (AR ? 'بطاقة الأمر' : 'Order facts')}
          tabs={focus ? [{ id: 'facts', label: AR ? 'البطاقة' : 'Facts' },
                         { id: 'queue', label: AR ? 'القائمة' : 'Queue', n: queue.length }] : null}
          tab={paneTab} onTab={setPaneTab}
          meta={paneTab === 'queue' ? null : [
            { k: AR ? 'الحالة' : 'Status', v: lifePill(open) },
            { k: AR ? 'المرحلة' : 'Stage', v: stgLabel },
            { k: AR ? 'العمر' : 'Age', v: lead + (AR ? ' يوم' : ' d'), num: true },
          ]}>
          {paneTab === 'queue' ? (
            <div className="d-vo-queue-b">
              {queue.map(v => { const R = recOf(v); const rl = relOf(v);
                const gov = R.appValue != null ? R.appValue : R.netRe;
                return (
                <button key={v.no} className={'d-vo-qitem' + (v.no === openNo ? ' on' : '')}
                  onClick={() => { setOpenNo(v.no); setTab('flow'); }}>
                  <div className="t"><span className="code">{v.no}</span><span className="tx">{v.reason}</span></div>
                  <div className="m"><DMoney v={Math.round(gov)} lang={lang} size="xs" signed />
                    <span className="d-cell-sub">{rl.stage ? rl.stage.label : ''}</span></div>
                  <div className="f">{lifePill(v)}
                    <span className="d-cell-sub num">{leadOf(v)}{AR ? ' يوم' : ' d'}</span></div>
                </button>); })}
              {!queue.length && <div className="d-cell-sub">{AR ? 'لا شيء بانتظارك.' : 'Nothing awaits you.'}</div>}
            </div>
          ) : <React.Fragment>
            <DRecordGrp label={AR ? 'القيمة' : 'Value'}>
              <div className="d-form-grid">
                {kv(AR ? 'المطلوبة' : 'Requested', <DMoney v={Math.round(open.net)} lang={lang} size="sm" />)}
                {kv(AR ? 'المعتمدة' : 'Approved', rec.appValue != null ? <DMoney v={Math.round(rec.appValue)} lang={lang} size="sm" /> : '—')}
                {rec.appValue != null && rec.appValue !== open.net &&
                  kv(AR ? 'الفرق' : 'Difference', <DMoney v={Math.round(rec.appValue - open.net)} lang={lang} size="sm" signed />)}
                {kv(AR ? 'قيمة العقد بعد' : 'Contract after', rec.appValue != null
                  ? <DMoney v={Math.round(open.revisedContract - open.net + rec.appValue)} lang={lang} size="sm" /> : '—')}
              </div>
            </DRecordGrp>
            <DRecordGrp label={AR ? 'المدة' : 'Time'}>
              <div className="d-form-grid">
                {kv(AR ? 'الأيام المطلوبة' : 'Days requested', <span className="num">{open.reqExt}</span>)}
                {kv(AR ? 'الأيام المعتمدة' : 'Days approved', rec.appDays != null ? <span className="num">{rec.appDays}</span> : '—')}
                {kv(AR ? 'الإنجاز التعاقدي' : 'Contractual finish', <span className="num">{rec.finishApproved || rec.finishBefore}</span>)}
                {kv(AR ? 'المسار الحرج' : 'Critical path', open.affectsCP ? (AR ? 'متأثر' : 'Affected') : (AR ? 'غير متأثر' : 'Unaffected'))}
              </div>
            </DRecordGrp>
            <DRecordGrp label={AR ? 'السجلات المرتبطة' : 'Linked records'}>
              <div className="d-form-grid">
                {kv(AR ? 'كتاب الوارد' : 'Incoming letter', <span className="num">{open.inNo} · {open.inDate}</span>)}
                {kv(AR ? 'بنود الكميات' : 'BOQ lines', <span className="num">{rec.lines.length}</span>)}
                {kv(AR ? 'أنشطة الجدول' : 'Schedule activities', <span className="num">{rec.activities.length}</span>)}
                {kv(AR ? 'المرفقات' : 'Attachments', <span className="num">{rec.attachments.length}</span>)}
              </div>
            </DRecordGrp>
            <DRecordGrp label={AR ? 'الجهة' : 'Parties'}>
              <div className="d-form-grid">
                {kv(AR ? 'مقدّم الطلب' : 'Requested by', reqLabel)}
                {kv(AR ? 'الجهة المدقّقة' : 'Reviewed by', revLabel)}
                {kv(AR ? 'المسؤول الحالي' : 'Current owner', open.status === 'pending' ? (actorOf(open) || '—') : (AR ? 'مكتملة' : 'Complete'))}
              </div>
            </DRecordGrp>
          </React.Fragment>}
        </DRecordPane>}
      status={<DZ10 lang={lang} asOf={d.asOf} stats={[
        { k: AR ? 'الحالة' : 'State', v: AR ? L.ar : L.en },
        { k: AR ? 'المرحلة' : 'Stage', v: stgLabel },
        { k: AR ? 'العمر' : 'Age', v: lead + (AR ? ' يوم' : ' d') },
        { k: AR ? 'الصافي' : 'Net', v: rec.appValue != null ? rec.appValue : Math.round(rec.netRe), money: true },
      ]} />}>

      {(tab === 'flow' || tab === 'summary') && relBar}
      {/* the shell hides Z8 below 1180px, and in focus mode the queue lives
          only in that rail — so it needs a home in Z7 at that width */}
      {focus && queue.length > 0 && <div className="d-vo-qfall">
        <DFGroup title={AR ? 'بانتظار إجرائك' : 'Awaiting you'} sub={(qIdx + 1) + ' / ' + queue.length}>
          <div className="d-vo-queue-b">
            {queue.map(v => { const R = recOf(v); const rl = relOf(v);
              const gov = R.appValue != null ? R.appValue : R.netRe;
              return (
              <button key={v.no} className={'d-vo-qitem' + (v.no === openNo ? ' on' : '')}
                onClick={() => { setOpenNo(v.no); setTab('flow'); }}>
                <div className="t"><span className="code">{v.no}</span><span className="tx">{v.reason}</span></div>
                <div className="m"><DMoney v={Math.round(gov)} lang={lang} size="xs" signed />
                  <span className="d-cell-sub">{rl.stage ? rl.stage.label : ''}</span></div>
                <div className="f">{lifePill(v)}
                  <span className="d-cell-sub num">{leadOf(v)}{AR ? ' يوم' : ' d'}</span></div>
              </button>); })}
          </div>
        </DFGroup>
      </div>}
          {tab === 'summary' && <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <DFGroup title={AR ? 'معلومات الأمر' : 'Order information'}>
              <div className="d-form-grid">
                {kv(AR ? 'النوع' : 'Type', T.typeLabel)}
                {kv(AR ? 'الأسباب الموجبة' : 'Justification', open.reason)}
                {kv(AR ? 'الجهة المسؤولة' : 'Responsible party', reqLabel)}
                {kv(AR ? 'رقم الوارد' : 'Incoming no.', open.inNo, true)}
                {kv(AR ? 'تاريخ الوارد' : 'Incoming date', open.inDate, true)}
              </div></DFGroup>
            <DFGroup title={AR ? 'مدخلات سابقة لإدخال الأمر' : 'Inputs preceding entry'}>
              <div className="d-vo-ext">
                <div className="lbl">{AR ? 'تمّت قبل إدخال الأمر في النظام — ليست مراحل في المسار' : 'Completed before the order was entered — not workflow stages'}</div>
                {rec.preInputs.map((x, j) => (
                  <div key={j} className="row">
                    <div className="tx"><b>{x.party}</b><span>{x.act}</span></div>
                    <span className="mono">{x.letterNo} · {x.letterDate}</span>
                    <span className="d-pill completed">{AR ? 'وردت' : 'Received'}</span>
                  </div>))}
              </div></DFGroup>
            <DFGroup title={AR ? 'ملخص الأثر' : 'Impact summary'}>
              <div className="d-form-grid">
                {kv((AR ? 'مقترح ' : '') + reqLabel + (AR ? '' : ' proposal'), M(rec.netCon, { signed: true }))}
                {kv((AR ? 'مقترح ' : '') + revLabel + (AR ? '' : ' proposal'), M(rec.netRe, { signed: true }))}
                {kv(AR ? 'القيمة المعتمدة (لجنة التسعير)' : 'Approved (pricing cttee)', M(rec.appValue, { signed: true }))}
                {!isSupply && kv(AR ? 'بنود تجاوزت 20%' : 'Lines beyond 20%', rec.lines.filter(l => l.exceeds).length, true)}
                {!isSupply && kv(AR ? 'سعر الكمية الزائدة' : 'Excess-quantity rate', rec.anyExceeds
                  ? (rec.lines.some(l => l.exRateApproved != null) ? (AR ? 'مثبَّت' : 'Fixed') : (AR ? 'بانتظار لجنة تثبيت الأسعار' : 'Awaiting rate-fixing cttee'))
                  : (AR ? 'لا ينطبق' : 'Not applicable'))}
                {kv(AR ? 'الأيام المطلوبة' : 'Days requested', days(open.reqExt))}
                {kv(AR ? 'الأيام المعتمدة' : 'Days approved', days(rec.appDays))}
                {kv(AR ? 'البنود المتأثرة' : 'Affected BOQ items', rec.lines.length, true)}
                {kv(AR ? 'الأنشطة المتأثرة' : 'Affected activities', rec.activities.length, true)}
              </div></DFGroup>
            <DFGroup title={AR ? 'أثر الأمر على العقد' : 'Effect on the contract'}>
              <div className="d-form-grid">
                {kv(AR ? 'قيمة العقد قبل الأمر' : 'Contract value before', M(open.revisedContract - open.net))}
                {kv(AR ? 'قيمة الأمر المعتمدة' : 'Approved order value', M(rec.appValue, { signed: true }))}
                {kv(AR ? 'قيمة العقد بعد الأمر' : 'Contract value after', rec.appValue != null ? M(open.revisedContract - open.net + rec.appValue) : '—')}
                {kv(AR ? 'ملحق العقد' : 'Contract amendment', rec.appValue == null ? '—'
                  : rec.appliedAll ? (AR ? 'صدر وأصبح نافذاً' : 'Issued and effective')
                  : (AR ? 'لم يصدر — الأمر لم يُطبَّق بعد' : 'Not issued — order not yet applied'))}
                {kv(AR ? 'تاريخ الإنجاز التعاقدي بعد التمديد' : 'Contractual completion after extension',
                  rec.appDays != null && rec.appDays > 0 ? rec.finishApproved || '—' : (AR ? 'دون تغيير' : 'Unchanged'), true)}
                {kv(AR ? 'الغرامات التأخيرية' : 'Delay penalties', (rec.appDays || 0) > 0
                  ? (AR ? 'تُعاد احتسابها على التاريخ الجديد' : 'Recalculated against the new date')
                  : (AR ? 'دون تغيير' : 'Unchanged'))}
              </div>
              {rec.appValue != null && !rec.appliedAll && <DMsgBar tone="warning" icon="pending"
                title={AR ? 'الاعتماد وحده لا يغيّر العقد' : 'Approval alone does not change the contract'}>
                {AR ? 'قيمة العقد ومدته تبقيان على حالهما حتى يُطبَّق الأمر ويصدر ملحق العقد. حتى ذلك الحين لا يُرحَّل أي مبلغ إلى الموقف المالي.' : 'The contract’s value and duration stay as they are until the order is applied and the addendum is issued. Until then nothing posts to the financial position.'}</DMsgBar>}
            </DFGroup>
            <DFGroup title={AR ? 'ملخص القرار' : 'Decision summary'}>
              <div className="d-form-grid">
                {kv((AR ? 'مقترح ' : '') + reqLabel + (AR ? '' : ' proposal'), <React.Fragment>{M(rec.netCon, { signed: true })} · {days(open.reqExt)}</React.Fragment>)}
                {kv((AR ? 'مقترح ' : '') + revLabel + (AR ? '' : ' proposal'), <React.Fragment>{M(rec.netRe, { signed: true })} · {days(open.reqExt)}</React.Fragment>)}
                {kv(AR ? 'المعتمد' : 'Approved', rec.appValue != null ? <React.Fragment>{M(rec.appValue, { signed: true })} · {days(rec.appDays)}</React.Fragment> : '—')}
                {kv((AR ? 'الفرق عن مقترح ' : 'Difference vs ') + revLabel, rec.appValue != null
                  ? <React.Fragment>{M(rec.appValue - rec.netRe, { signed: true })} · {days(rec.appDays - open.reqExt)}</React.Fragment> : '—')}
                {kv(AR ? 'سبب الفرق' : 'Reason for difference', rec.appValue != null && rec.appValue !== open.net ? (AR ? 'تخفيض كميات بعد التدقيق الفني' : 'Quantities trimmed after technical review') : '—')}
                {kv(AR ? 'تاريخ القرار' : 'Decision date', open.status === 'approved' ? (rec.log.find(l => /الاعتماد النهائي|Final endorsement/.test(l.act)) || {}).date || '—' : '—', true)}
                {kv(AR ? 'الجهة المعتمدة' : 'Approved by', open.status === 'approved' ? (AR ? 'الوزير / المفوَّض' : 'Minister / delegate') : '—')}
                {rec.anyExceeds && kv(AR ? 'تثبيت سعر الزائد' : 'Excess rate fixed by', AR ? 'لجنة تثبيت الأسعار' : 'Rate-fixing committee')}
              </div></DFGroup>
            <DFGroup flush title={AR ? 'حالة تطبيق الأمر التغييري' : 'Change-order application status'}>
              <table className="d-line-table"><tbody>{rec.steps.map(s => (
                <tr key={s[0]}><td>{s[1]}</td><td style={{ width: 150 }}>{applyPill(s[2])}</td>
                  <td className="d-cell-sub">{s[2] === 'fail' ? (AR ? 'فشل إعادة الاحتساب — يتطلب إعادة تشغيل' : 'Recalculation failed — needs a re-run') : ''}</td></tr>))}</tbody></table></DFGroup>
          </div>}

          {tab === 'cost' && <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {rec.lines.length === 0 && <div className="d-vow-empty"><Icon name="calendar_month" size={22} />
              <b>{AR ? 'أمر تغييري زمني فقط' : 'Time-only change order'}</b>
              <span className="d-cell-sub">{AR ? 'لا يشمل هذا الأمر أي بند من جدول الكميات — الأثر زمني فقط، ولا أثر على قيمة العقد.' : 'This order touches no BOQ item — the impact is on time only, with no effect on the contract value.'}</span></div>}
            {rec.lines.length > 0 && <DFGroup flush title={AR ? 'بنود الكميات والكلفة' : 'Quantities & cost'}>
              <div className="d-vow-tw"><table className="d-line-table d-vo-cmp"><thead><tr>
                <th style={{ width: 150 }}>{AR ? 'البند / الجهة' : 'Item / party'}</th>
                <th style={{ minWidth: 170 }}>{AR ? 'الوصف / التفصيل' : 'Description / detail'}</th>
                <th style={{ width: 118 }}>{AR ? 'الكمية' : 'Quantity'}</th>
                <th style={{ width: 112 }} className="r" title={isSupply ? (AR ? 'سعر الوحدة المثبَّت بالعقد وخطاب الاعتماد' : 'Contract/LC-fixed unit rate') : (AR ? 'سعر الوحدة للكمية الزائدة عن 20% فقط' : 'Unit rate for the quantity beyond 20% only')}>
                  {isSupply ? (AR ? 'سعر الوحدة' : 'Unit rate') : (AR ? 'سعر الزائد' : 'Excess rate')} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
                <th style={{ width: 138 }} className="r">{AR ? 'القيمة' : 'Value'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
                <th style={{ width: 132 }} className="r">{AR ? 'الأثر' : 'Impact'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
                <th style={{ width: 76 }}>{AR ? 'الوزن' : 'Weight'}</th>
                <th style={{ width: 118 }}>{AR ? 'حالة التطبيق' : 'Applied'}</th></tr></thead>
                <tbody>{rec.lines.map(l => {
                  const chgL = l.chg === 'inc' ? (AR ? 'زيادة كمية' : 'Qty increase') : l.chg === 'dec' ? (AR ? 'نقص كمية' : 'Qty decrease')
                    : l.chg === 'redist' ? (AR ? 'إعادة توزيع' : 'Redistribution') : l.chg === 'del' ? (AR ? 'إلغاء بند' : 'Cancel item') : (AR ? 'تعديل سعر' : 'Rate change');
                  const sign = v => Mb(v, { signed: true });
                  const tierTx = t => !l.exceeds ? (isSupply ? (AR ? 'السعر مثبَّت بالعقد' : 'Contract-fixed price') : (AR ? 'ضمن حد 20%' : 'Within the 20% limit'))
                    : (AR ? 'ضمن 20%: ' : 'Within 20%: ') + window.fmtNum(+t.at.toFixed(2)) + ' ' + l.unit
                      + (AR ? ' · أكثر من 20%: ' : ' · beyond 20%: ') + window.fmtNum(+t.ex.toFixed(2)) + ' ' + l.unit;
                  const partyRow = (key, label, t, qty, exRate, val, impact, weight, applied, cls) => (
                    <tr key={l.code + '-' + key} className={'d-vo-p ' + (cls || '')} onClick={() => setDetail(l)} style={{ cursor: 'pointer' }}>
                      <td><span className="d-vo-party">{label}</span></td>
                      <td className="d-cell-sub wrap">{t ? tierTx(t) : (AR ? 'بانتظار القرار' : 'Awaiting decision')}</td>
                      <td className="num">{qty}</td><td className="r">{exRate}</td>
                      <td className="r">{val}</td><td className="r">{impact}</td>
                      <td className="num">{weight}</td><td>{applied}</td></tr>);
                  return (<React.Fragment key={l.code}>
                    <tr className="d-vo-h" onClick={() => setDetail(l)} style={{ cursor: 'pointer' }}>
                      <td className="mono"><b>{l.code}</b></td>
                      <td><b>{l.desc}</b><div className="d-cell-sub">{chgL} · {AR ? 'الوحدة' : 'unit'} {l.unit}
                        {l.exceeds && <React.Fragment> · <span className="d-vo-warn">{AR ? 'حد 20% = ' : '20% limit = '}{window.fmtNum(+l.con.thr.toFixed(2))} {l.unit}</span></React.Fragment>}</div></td>
                      <td className="num">{window.fmtNum(l.qtyBefore)}<div className="d-cell-sub">{AR ? 'الأصلية' : 'original'}</div></td>
                      <td className="r">{Mb(l.rate)}<div className="d-cell-sub">{AR ? 'السعر الأصلي' : 'original rate'}</div></td>
                      <td className="r">{Mb(l.valBefore)}<div className="d-cell-sub">{AR ? 'قبل التغيير' : 'before'}</div></td>
                      <td className="r d-cell-sub">—</td>
                      <td className="num">{l.wBefore}%<div className="d-cell-sub">{AR ? 'قبل' : 'before'}</div></td>
                      <td>{applyPill(l.apply)}</td></tr>
                    {partyRow('con', (AR ? 'مقترح ' : '') + reqLabel, l.con,
                      window.fmtNum(+l.con.qtyAfter.toFixed(2)), isSupply ? Mb(l.rate) : (l.exceeds ? Mb(l.exRateCon) : '—'),
                      Mb(l.valBefore + l.reqDelta), sign(l.reqDelta), l.wCon + '%', '')}
                    {partyRow('re', (AR ? 'مقترح ' : '') + revLabel, l.re,
                      window.fmtNum(+l.re.qtyAfter.toFixed(2)), isSupply ? Mb(l.rate) : (l.exceeds ? Mb(l.exRateRe) : '—'),
                      Mb(l.valBefore + l.reDelta), sign(l.reDelta), l.wProposed + '%', '')}
                    {partyRow('app', AR ? 'المعتمد' : 'Approved', l.app,
                      l.qtyApproved != null ? window.fmtNum(+l.qtyApproved.toFixed(2)) : '—',
                      isSupply ? Mb(l.rate) : (l.exRateApproved != null ? Mb(l.exRateApproved) : (l.exceeds ? <span className="d-cell-sub">{AR ? 'لجنة تثبيت الأسعار' : 'rate cttee'}</span> : '—')),
                      l.appDelta != null ? Mb(l.valAfter) : '—',
                      l.appDelta != null ? sign(l.appDelta) : '—',
                      l.wApproved != null ? l.wApproved + '%' : '—', null, 'gov')}
                  </React.Fragment>); })}</tbody>
                <tfoot>
                  {[[(AR ? 'صافي أثر مقترح ' : 'Net — ') + reqLabel, rec.netCon, ''],
                    [(AR ? 'صافي أثر مقترح ' : 'Net — ') + revLabel, rec.netRe, ''],
                    [AR ? 'الصافي المعتمد' : 'Net — approved', rec.appValue, 'gov']].map(([lbl, val, cls], k) => (
                    <tr key={k} className={cls}><td colSpan={5}>{lbl}</td>
                      <td className="r">{val != null ? Mb(val, { signed: true }) : '—'}</td>
                      <td colSpan={2}></td></tr>))}
                </tfoot>
              </table></div>
              <div className="d-cell-sub" style={{ marginTop: 8 }}>{AR ? 'اضغط أي بند لعرض تفاصيله الكاملة.' : 'Select a line to see its full detail.'}</div>
            </DFGroup>}

            {rec.lines.length > 0 && <DFGroup title={AR ? 'أثر الأوزان' : 'Weight impact'}>
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
            </DFGroup>}

            {rec.redistribution.length > 0 && (() => {
              const ben = rec.redistribution.some(r => r.beneficiary);
              return <DFGroup flush title={ben ? (AR ? 'إعادة توزيع الكميات بين الجهات المستفيدة' : 'Redistribution between beneficiaries') : (AR ? 'إعادة توزيع الكميات' : 'Quantity redistribution')}>
              <table className="d-line-table"><thead><tr>
                <th style={{ width: 160 }}>{ben ? (AR ? 'الجهة المصدر' : 'Source beneficiary') : (AR ? 'البند المصدر' : 'Source BOQ')}</th>
                <th style={{ width: 160 }}>{ben ? (AR ? 'الجهة الهدف' : 'Target beneficiary') : (AR ? 'البند الهدف' : 'Target BOQ')}</th>
                <th style={{ width: 120 }}>{AR ? 'المسحوبة' : 'Drawn'}</th><th style={{ width: 120 }}>{AR ? 'المضافة' : 'Added'}</th>
                <th style={{ width: 100 }} className="r">{AR ? 'الفرق' : 'Difference'}</th>
                <th style={{ width: 150 }} className="r">{AR ? 'الأثر المالي' : 'Cost impact'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
                <th style={{ width: 130 }}>{AR ? 'حالة التطبيق' : 'Applied'}</th></tr></thead>
                <tbody>{rec.redistribution.map((r, i) => (
                  <tr key={i}><td className={ben ? 'wrap' : 'code'}>{r.src}</td><td className={ben ? 'wrap' : 'code'}>{r.tgt}</td>
                    <td className="num">{window.fmtNum(r.drawn)}</td><td className="num">{window.fmtNum(r.added)}</td>
                    <td className="num r">{r.diff}</td><td className="r">{Mb(r.money, { signed: true })}</td>
                    <td>{applyPill(r.apply)}</td></tr>))}</tbody></table></DFGroup>; })()}
          </div>}

          {tab === 'time' && <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <DFGroup title={AR ? 'ملخص الأثر الزمني' : 'Time impact summary'}>
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
              </div></DFGroup>
            <DFGroup title={AR ? 'الأنشطة المتأثرة' : 'Affected activities'}>
              <div className="d-vow-tw wide-rec"><table className="d-line-table"><thead>
                <tr className="d-grp"><th colSpan={4}></th><th colSpan={3}>{AR ? 'المدة المتبقية' : 'Remaining duration'}</th>
                  <th colSpan={2}>{AR ? 'تاريخ البدء' : 'Start'}</th><th colSpan={2}>{AR ? 'تاريخ الإنجاز' : 'Finish'}</th><th></th></tr>
                <tr><th style={{ width: 78 }}>{AR ? 'معرّف النشاط' : 'Activity ID'}</th><th style={{ minWidth: 180 }}>{AR ? 'اسم النشاط' : 'Activity name'}</th>
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
              <DMsgBar tone="info" icon="account_tree"
                title={AR ? 'مدة النشاط ليست مدة المشروع' : 'An activity’s duration is not the project’s'}>
                {AR ? 'تمديد نشاط لا يمدّد المشروع بالضرورة — الأثر النهائي على تاريخ الإنجاز يُحدَّد في مرحلة تحليل الجدول بحسب العوم المتاح والمسار الحرج.' : 'Extending an activity does not necessarily extend the project — the final effect on the completion date is settled during schedule analysis, against the available float and the critical path.'}</DMsgBar>
            </DFGroup>
          </div>}

          {tab === 'flow' && <div className="d-l14">
            <div className="d-l14-trail">
              <DFGroup title={AR ? 'مسار الاعتماد' : 'Approval path'}
                sub={trail.filter(x => !x.ghost && x.status === 'done').length + ' / ' + trail.filter(x => !x.ghost).length + (AR ? ' مرحلة' : ' stages')}>
              <ol className="d-votrail">{trail.map(sX => {
                const isOpen = openStage === sX.key;
                const cls = sX.ghost ? 'na' : sX.status === 'done' ? 'ok' : sX.status === 'rejected' ? 'bad'
                  : sX.status === 'overdue' ? 'late' : sX.status === 'active' ? 'on' : '';
                const SL = ST_LBL[sX.ghost ? 'na' : sX.status] || ST_LBL.todo;
                const over = sX.sla ? Math.round((sX.elapsed / sX.sla) * 100) : 0;
                return [
                <li key={sX.key} className={cls}>
                  <span className="ic"><Icon size={14} name={sX.ghost ? 'remove' : sX.status === 'done' ? 'check'
                    : sX.status === 'rejected' ? 'undo' : sX.status === 'overdue' ? 'priority_high' : sX.ico || 'pending'} /></span>
                  <div className="bd">
                    <button className="hd" aria-expanded={isOpen} disabled={sX.ghost}
                      onClick={() => setOpenStage(isOpen ? null : sX.key)}>
                      <b>{sX.label}</b>
                      <span className={'d-pill ' + SL.cls}>{AR ? SL.ar : SL.en}</span>
                      {!sX.ghost && sX.ext.length > 0 && <span className="d-pill">
                        {AR ? 'أطراف خارجية ' : 'External '}{sX.ext.filter(x => x.state === 'in').length}/{sX.ext.length}</span>}
                      <span className="sp"></span>
                      <span className="d-cell-sub num">{sX.start || '—'}</span>
                      {!sX.ghost && <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={16} />}
                    </button>
                    <div className="who">{sX.owner}{sX.decision && sX.decision !== '—' ? ' · ' + sX.decision : ''}</div>
                    {sX.ghost ? <div className="why">{sX.why}</div> : sX.start ? (
                      <div className="sla">
                        <div className="bar"><i className={over > 100 ? 'over' : over >= 80 ? 'warn' : ''} style={{ width: Math.min(100, over) + '%' }}></i></div>
                        <span className="lg num">{sX.elapsed} / {sX.sla} {AR ? 'يوم' : 'd'}</span>
                      </div>) : null}
                    {sX.comment && <div className="cmt">
                      <span className="by">{sX.comment.actor} · <span className="num">{sX.comment.date}</span></span>
                      {sX.comment.note}</div>}
                    {isOpen && !sX.ghost && <div className="stgb">
                      {sX.note && <div className="d-cell-sub">{sX.note}</div>}
                      {sX.ext.length > 0 && <div className="d-vo-ext">
                        <div className="lbl">{AR ? 'أطراف خارجية — تُسجَّل قراراتها بموجب كتاب رسمي' : 'External parties — recorded against an official letter'}</div>
                        {sX.ext.map((x, j) => { const est = VO_EXT_STATE[x.state]; return (
                          <div key={j} className="row">
                            <div className="tx"><b>{x.party}</b><span>{x.act}</span>
                              {x.delegate && <span>{AR ? 'يُسجِّل نيابةً: ' : 'Recorded by: '}{x.delegate}</span>}</div>
                            <span className="num">{x.letterNo ? x.letterNo + ' · ' + x.letterDate : (AR ? 'لا كتاب بعد' : 'no letter yet')}</span>
                            <span className={'d-pill ' + est.cls}>{AR ? est.ar : est.en}</span>
                            {x.state === 'wait' && canAct && (sX.status === 'active' || sX.status === 'overdue') &&
                              <button className="d-btn sm" onClick={() => setRecDec({ stage: sX, x })}>
                                <Icon name="edit_note" size={14} />{AR ? 'تسجيل' : 'Record'}</button>}
                          </div>); })}
                      </div>}
                      <div className="d-form-grid">
                        {kv(AR ? 'تاريخ الإرسال' : 'Sent on', sX.start || '—', true)}
                        {kv(AR ? 'تاريخ الإجراء' : 'Actioned on', sX.doneDate || '—', true)}
                        {kv(AR ? 'المدة المستغرقة' : 'Duration', sX.start ? sX.elapsed + (AR ? ' يوم' : ' d') : '—', true)}
                        {kv(AR ? 'السقف الزمني' : 'SLA', sX.sla + (AR ? ' يوم' : ' d'), true)}
                        {kv(AR ? 'القرار' : 'Decision', sX.decision || '—')}
                        {kv(AR ? 'المرفقات' : 'Attachments', rec.attachments.filter(a => a.stage === sX.label).length, true)}
                      </div>
                    </div>}
                  </div>
                </li>,
                /* the escalation is its own entry in the trail, in sequence,
                   naming the assignee it left as well as the one it reached */
                sX.status === 'overdue' ? (
                <li key={sX.key + '-esc'} className="esc">
                  <span className="ic"><Icon name="trending_up" size={14} /></span>
                  <div className="bd">
                    <div className="hd"><b>{AR ? 'تصعيد تلقائي' : 'Automatic escalation'}</b>
                      <span className="d-pill stalled">{AR ? 'تجاوز السقف' : 'SLA breached'}</span>
                      <span className="sp"></span>
                      <span className="d-cell-sub num">{sX.elapsed} / {sX.sla} {AR ? 'يوم' : 'd'}</span></div>
                    <div className="who">{AR ? 'من ' : 'from '}<b>{sX.owner}</b>{AR ? ' إلى ' : ' to '}<b>{MANAGER}</b></div>
                    <DMsgBar tone="danger" icon="gavel"
                      title={AR ? 'انتقلت صلاحية البتّ' : 'Authority moved'}>
                      {AR ? 'تجاوزت مرحلة «' + sX.label + '» سقفها البالغ ' + sX.sla + ' أيام بمرور ' + sX.elapsed + ' يوم دون إجراء، فانتقلت صلاحية البتّ من ' + sX.owner + ' إلى ' + MANAGER + '. المُحال إليه الأصلي يبقى مسجّلاً، والإجراء مثبَّت في سجل التدقيق ولا يمكن تعديله.'
                          : 'Stage “' + sX.label + '” passed its ' + sX.sla + '-day ceiling with ' + sX.elapsed + ' days elapsed, so authority moved from ' + sX.owner + ' to the ' + MANAGER + '. The original assignee stays on the record, and the escalation is written to the audit trail where it cannot be edited.'}
                    </DMsgBar>
                  </div>
                </li>) : null]; })}</ol>
              </DFGroup>
            </div>

            <aside className="d-l14-dec">
              <DFGroup title={AR ? 'القرار' : 'Decision'}
                sub={canAct && DEC.length ? (AR ? 'بعهدتك' : 'yours to take') : (AR ? 'للاطلاع' : 'view only')}>
              {!canAct ? (
                <DMsgBar tone="info" icon="lock" title={AR ? 'لا إجراءات متاحة لهذه الصفة' : 'No actions for this persona'}>
                  {open.status === 'pending'
                    ? (AR ? 'البتّ في هذه المرحلة من صلاحية ' + (actorOf(open) || '—') + '. بدّل الصفة من شريط الأدوات لتجربة المسار.'
                          : 'This stage is decided by ' + (actorOf(open) || '—') + '. Switch persona in the toolbar to walk the path.')
                    : (AR ? 'اكتمل المسار — لا قرار مفتوح على هذا الأمر.' : 'The workflow is complete — no decision is open on this order.')}
                </DMsgBar>
              ) : DEC.length === 0 ? (
                <DMsgBar tone="success" icon="check_circle" title={AR ? 'لا قرار مطلوب' : 'No decision required'}>
                  {AR ? 'لا إجراء مفتوحاً على هذا الأمر في وضعه الحالي.' : 'No action is open on this order in its current state.'}
                </DMsgBar>
              ) : <React.Fragment>
                <div className="d-form-field f-full">
                  <label htmlFor="vo-dec">{AR ? 'الإجراء' : 'Action'}<span className="req" aria-hidden="true">*</span></label>
                  <select id="vo-dec" className="d-form-input" value={decK || ''} required aria-required="true"
                    onChange={e => { setDecK(e.target.value || null); setDecTouched(false); }}>
                    <option value="">{AR ? '— اختر الإجراء —' : '— pick an action —'}</option>
                    {DEC.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                  </select>
                </div>
                <div className="d-form-field f-full">
                  <label htmlFor="vo-dec-note">{AR ? 'التعليق' : 'Comment'}
                    {cur && cur.note && <span className="req" aria-hidden="true">*</span>}</label>
                  <textarea id="vo-dec-note" rows={4} disabled={!cur}
                    className={'d-form-input' + (decTouched && noteBad ? ' bad' : '')}
                    required={!!(cur && cur.note)} aria-required={cur && cur.note ? 'true' : undefined}
                    aria-invalid={decTouched && noteBad ? 'true' : undefined}
                    aria-describedby={decTouched && noteBad ? 'vo-dec-note-e' : undefined}
                    placeholder={cur && cur.note ? (AR ? 'اذكر ما ينقص أو سبب الرفض — يُسجَّل في سجل التدقيق' : 'State what is missing or why — it is written to the audit trail')
                      : (AR ? 'اختياري' : 'Optional')}
                    value={decNote} onChange={e => setDecNote(e.target.value)}></textarea>
                  {decTouched && noteBad && <span className="d-form-err" id="vo-dec-note-e">
                    {AR ? 'التعليق إلزامي عند الإعادة أو الرفض.' : 'A comment is required to return or reject.'}</span>}
                </div>
                <DMsgBar tone={cur ? (cur.danger ? 'warning' : 'info') : 'info'} icon="alt_route"
                  title={AR ? 'ماذا سيحدث بعد ذلك' : 'What happens next'}>
                  {cur ? <ul className="d-conseq">{cur.why.map((w, j) => <li key={j}>{w}</li>)}</ul>
                       : (AR ? 'اختر إجراءً لعرض أثره قبل تنفيذه.' : 'Pick an action to see its consequence before it fires.')}
                </DMsgBar>
                <div className="d-l14-decfoot">
                  <button className="d-btn sm" disabled={!decK && !decNote}
                    onClick={() => { setDecK(null); setDecNote(''); setDecTouched(false); }}>
                    {AR ? 'تفريغ' : 'Reset'}</button>
                  <span className="sp"></span>
                  <button className={'d-btn sm primary' + (cur && cur.danger ? ' danger' : '')}
                    disabled={!cur} onClick={runDec}>
                    <Icon name={cur ? cur.ico : 'gavel'} size={15} />{cur ? cur.cta : (AR ? 'تنفيذ القرار' : 'Submit decision')}</button>
                </div>
              </React.Fragment>}

              </DFGroup>
              <div className="d-l14-z8fall">
                <DFGroup title={AR ? 'بطاقة الأمر' : 'Order facts'}>
                  <div className="d-form-grid">
                    {kv(AR ? 'القيمة المطلوبة' : 'Requested value', M(open.net))}
                    {kv(AR ? 'القيمة المعتمدة' : 'Approved value', M(rec.appValue))}
                    {kv(AR ? 'الأيام المطلوبة / المعتمدة' : 'Days requested / approved',
                      <React.Fragment>{days(open.reqExt)} / {days(rec.appDays)}</React.Fragment>)}
                    {kv(AR ? 'الإنجاز التعاقدي' : 'Contractual finish', rec.finishApproved || rec.finishBefore, true)}
                    {kv(AR ? 'كتاب الوارد' : 'Incoming letter', open.inNo + ' · ' + open.inDate, true)}
                    {kv(AR ? 'بنود / أنشطة / مرفقات' : 'Lines / activities / files',
                      rec.lines.length + ' · ' + rec.activities.length + ' · ' + rec.attachments.length, true)}
                  </div>
                </DFGroup>
              </div>
              <DFGroup title={AR ? 'حالة المعاملة' : 'Transaction state'}>
                <div className="d-form-grid">
                  {kv(AR ? 'تاريخ الإحالة' : 'Referred on', stg ? stg.start : open.inDate, true)}
                  {kv(AR ? 'عدد الأيام' : 'Days elapsed', lead, true)}
                  {kv(AR ? 'تجاوزت السقف؟' : 'SLA breached?', rec.breached ? (AR ? 'نعم' : 'Yes') : (AR ? 'لا' : 'No'))}
                  {(() => { const lt = window.EPM.transactionLeadTime && window.EPM.transactionLeadTime(open.stages);
                    return lt ? kv(AR ? 'معدل دوران المعاملة' : 'Transaction lead time',
                      lt.totalDays + (AR ? ' يوم' : ' d') + (lt.stalledAt ? ' · ' + (AR ? 'متوقفة عند ' : 'stalled at ') + lt.stalledAt : (AR ? ' · مكتملة' : ' · complete')), true) : null; })()}
                </div>
              </DFGroup>
            </aside>
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
    </DModuleFrame>
    </React.Fragment>
  );
}

Object.assign(window, { DModVO, DVORecordPanel, voRecord });
