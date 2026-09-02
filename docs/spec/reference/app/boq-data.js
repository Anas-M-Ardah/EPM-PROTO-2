/* ============================================================
   BOQ Register & BOQ↔Activity Assignment — demo dataset + pure
   derivation helpers (design handoff: PRJ-0356, University of
   Baghdad electrical rehabilitation).

   Plain JS, loaded before the JSX screens. This module is the
   MOCK DATA LAYER: static reference data (project, contract, BOQ,
   WBS/activities) + a seed for `alloc`, plus pure functions that
   DERIVE everything on demand. `alloc` ({ [boqCode]: [{act,pct}] })
   is the single source of truth and lives in component state
   (usePersistedState) — nothing derived is ever stored.

   Swapping to a real API is a one-function change: replace
   BOQDEMO.load() with fetches to the endpoints in the README.
   ============================================================ */
(function (w) {
  // ---- project / contract identity ------------------------------------
  var PROJECT = {
    id: 'PRJ-0356',
    program: { ar: 'وزارة التعليم العالي والبحث العلمي', en: 'Ministry of Higher Education & Scientific Research' },
    name: { ar: 'تأهيل المنظومة الكهربائية — جامعة بغداد', en: 'Electrical System Rehabilitation — University of Baghdad' },
    entity: { ar: 'جامعة بغداد', en: 'University of Baghdad' },
    stage: { ar: 'التنفيذ', en: 'Execution' },
    status: 'ongoing',
    dataDate: '2026-07-31',
  };
  var CONTRACT = {
    id: 'CNT-0356',
    value: 410500240,          // Σ item amounts, exact
    revised: 406000000,
    revision: 'R2',
    scope: { ar: 'أعمال مدنية + كهربائية', en: 'Civil + electrical works' },
  };

  // ---- divisions (6) --------------------------------------------------
  var DIVISIONS = [
    { code: 'ق.01', key: '01', ar: 'الأعمال المدنية والإنشائية', en: 'Civil & structural works' },
    { code: 'ق.02', key: '02', ar: 'محطات التحويل والمولدات', en: 'Substations & generators' },
    { code: 'ق.03', key: '03', ar: 'الكابلات وشبكات التوزيع', en: 'Cables & distribution networks' },
    { code: 'ق.04', key: '04', ar: 'لوحات التوزيع والسيطرة', en: 'Distribution & control panels' },
    { code: 'ق.05', key: '05', ar: 'الإنارة والتأريض', en: 'Lighting & earthing' },
    { code: 'ق.06', key: '06', ar: 'الفحص والتشغيل والمناولة', en: 'Testing, commissioning & handover' },
  ];

  // ---- BOQ items (13) — amounts sum to 410,500,240 --------------------
  // source: 'imported' (from the BOQ dictionary) | 'manual' (entered on site)
  var U = {
    m3: { ar: 'م³', en: 'm³' }, m2: { ar: 'م²', en: 'm²' }, lm: { ar: 'م.ط', en: 'l.m' },
    no: { ar: 'عدد', en: 'no.' }, ls: { ar: 'مقطوعية', en: 'L.S.' },
  };
  var ITEMS = [
    { code: 'BOQ-01-010', div: '01', ar: 'حفر وردم لأسس المحطات وغرف التوزيع', en: 'Excavation & backfill for substation foundations and distribution rooms', unit: U.m3, qty: 4200, rate: 8750, amount: 36750000, source: 'imported', progress: 100 },
    { code: 'BOQ-01-020', div: '01', ar: 'خرسانة مسلحة للأسس وغرف الكابلات', en: 'Reinforced concrete for foundations and cable rooms', unit: U.m3, qty: 1150, rate: 22220, amount: 25553000, source: 'imported', progress: 100 },
    { code: 'BOQ-02-010', div: '02', ar: 'محطة تحويل 11kV/0.4kV سعة 1000kVA', en: '11kV/0.4kV transformer substation, 1000kVA', unit: U.no, qty: 4, rate: 21500000, amount: 86000000, source: 'imported', progress: 88 },
    { code: 'BOQ-02-020', div: '02', ar: 'مولدة ديزل احتياطية 500kVA مع لوحة تزامن', en: '500kVA standby diesel generator with synchronization panel', unit: U.no, qty: 3, rate: 14600000, amount: 43800000, source: 'imported', progress: 92 },
    { code: 'BOQ-02-030', div: '02', ar: 'أعمال العزل والحماية الحرارية للمحطات', en: 'Thermal insulation & protection works for substations', unit: U.m2, qty: 860, rate: 21200, amount: 18232000, source: 'manual', progress: 0 },
    { code: 'BOQ-03-010', div: '03', ar: 'كابل ضغط متوسط 11kV مقطع 3×185مم²', en: '11kV medium-voltage cable, 3×185mm²', unit: U.lm, qty: 6400, rate: 9850, amount: 63040000, source: 'imported', progress: 74 },
    { code: 'BOQ-03-020', div: '03', ar: 'كابل ضغط واطئ 0.4kV مقطع 4×95مم²', en: '0.4kV low-voltage cable, 4×95mm²', unit: U.lm, qty: 8900, rate: 3180, amount: 28302000, source: 'imported', progress: 81 },
    { code: 'BOQ-03-030', div: '03', ar: 'مجاري ومداخل الكابلات الخرسانية', en: 'Concrete cable ducts and entries', unit: U.lm, qty: 2100, rate: 2450, amount: 5145000, source: 'imported', progress: 0 },
    { code: 'BOQ-04-010', div: '04', ar: 'لوحة توزيع رئيسية MDB مع قواطع رئيسية', en: 'Main distribution board (MDB) with main breakers', unit: U.no, qty: 6, rate: 6850000, amount: 41100000, source: 'imported', progress: 69 },
    { code: 'BOQ-04-020', div: '04', ar: 'لوحات توزيع فرعية SMDB للطوابق', en: 'Sub-distribution boards (SMDB) for floors', unit: U.no, qty: 14, rate: 1240000, amount: 17360000, source: 'imported', progress: 35 },
    { code: 'BOQ-05-010', div: '05', ar: 'منظومة إنارة LED للمباني والساحات', en: 'LED lighting system for buildings and yards', unit: U.m2, qty: 12400, rate: 1950, amount: 24180000, source: 'imported', progress: 52 },
    { code: 'BOQ-05-020', div: '05', ar: 'منظومة تأريض ومانعات صواعق', en: 'Earthing system and lightning arresters', unit: U.no, qty: 22, rate: 355000, amount: 7810000, source: 'manual', progress: 0 },
    { code: 'BOQ-06-010', div: '06', ar: 'الفحص والتشغيل التجريبي والمناولة', en: 'Testing, trial operation and handover', unit: U.ls, qty: 1, rate: 13228240, amount: 13228240, source: 'imported', progress: 15 },
  ];

  // ---- WBS + activities ----------------------------------------------
  // kind: 'wbs' (non-selectable container) | 'act' (assignable leaf)
  var WBS = [
    { code: 'WBS-1', ar: 'تأهيل المنظومة الكهربائية', en: 'Electrical system rehabilitation', level: 0, kind: 'wbs' },
    { code: 'WBS-1.1', ar: 'الأعمال التحضيرية والمدنية', en: 'Preliminary & civil works', level: 1, kind: 'wbs' },
    { code: 'ACT-1010', ar: 'أعمال الحفر والأسس الخرسانية للمحطات', en: 'Excavation and concrete foundations for substations', level: 2, kind: 'act', absWt: 15.17, manHours: 18400 },
    { code: 'WBS-1.2', ar: 'محطات التحويل والمولدات', en: 'Substations & generators', level: 1, kind: 'wbs' },
    { code: 'ACT-1050', ar: 'توريد وتركيب محطات التحويل 11kV', en: 'Supply & install 11kV transformer substations', level: 2, kind: 'act', absWt: 20.95, manHours: 26800 },
    { code: 'ACT-1075', ar: 'تركيب المولدات الاحتياطية ولوحات التزامن', en: 'Install standby generators and synchronization panels', level: 2, kind: 'act', absWt: 10.67, manHours: 12300 },
    { code: 'WBS-1.3', ar: 'شبكات التوزيع واللوحات', en: 'Distribution networks & boards', level: 1, kind: 'wbs' },
    { code: 'ACT-1120', ar: 'تمديد كابلات الضغط المتوسط والواطئ', en: 'MV & LV cable laying', level: 2, kind: 'act', absWt: 23.51, manHours: 31200 },
    { code: 'ACT-1160', ar: 'تركيب لوحات التوزيع الرئيسية والفرعية', en: 'Install main & sub distribution boards', level: 2, kind: 'act', absWt: 14.24, manHours: 16900 },
    { code: 'WBS-1.4', ar: 'الإنارة والفحص والتشغيل', en: 'Lighting, testing & commissioning', level: 1, kind: 'wbs' },
    { code: 'ACT-1210', ar: 'الإنارة والتأريض والفحص والتشغيل التجريبي', en: 'Lighting, earthing, testing and trial operation', level: 2, kind: 'act', absWt: 11.01, manHours: 14100 },
  ];

  // ---- seed for `alloc` (the single source of truth) ------------------
  // BOQ-02-030, BOQ-03-030, BOQ-05-020 intentionally unassigned.
  // BOQ-03-010 over-allocates (112%); BOQ-04-010 lists ACT-1160 twice.
  var SEED_ALLOC = {
    'BOQ-01-010': [{ act: 'ACT-1010', pct: 100 }],
    'BOQ-01-020': [{ act: 'ACT-1010', pct: 100 }],
    'BOQ-02-010': [{ act: 'ACT-1050', pct: 45 }, { act: 'ACT-1075', pct: 20 }],
    'BOQ-02-020': [{ act: 'ACT-1075', pct: 100 }],
    'BOQ-03-010': [{ act: 'ACT-1120', pct: 70 }, { act: 'ACT-1160', pct: 30 }, { act: 'ACT-1210', pct: 12 }],
    'BOQ-03-020': [{ act: 'ACT-1120', pct: 100 }],
    'BOQ-04-010': [{ act: 'ACT-1160', pct: 60 }, { act: 'ACT-1160', pct: 40 }],
    'BOQ-04-020': [{ act: 'ACT-1160', pct: 40 }],
    'BOQ-05-010': [{ act: 'ACT-1210', pct: 100 }],
    'BOQ-06-010': [{ act: 'ACT-1210', pct: 100 }],
  };

  var USER = { ar: 'م. عمر الجبوري', en: 'Eng. Omar Al-Jubouri', roleAr: 'مهندس ضبط المشاريع', roleEn: 'Project Controls Engineer', initAr: 'م.ع', initEn: 'OA' };

  // ==================== pure derivation helpers =======================
  var CONTRACT_TOTAL = ITEMS.reduce(function (a, x) { return a + x.amount; }, 0); // 410,500,240

  // item weight = share of contract value, 2dp, largest-remainder so Σ = 100.00
  function itemWeights() {
    var raw = ITEMS.map(function (x) { return x.amount / CONTRACT_TOTAL * 100; });
    var floor = raw.map(function (v) { return Math.floor(v * 100) / 100; });
    var short = Math.round((100 - floor.reduce(function (a, b) { return a + b; }, 0)) * 100);
    var order = raw.map(function (v, i) { return [i, v - floor[i]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var out = floor.slice();
    for (var k = 0; k < short && k < order.length; k++) out[order[k][0]] = +(out[order[k][0]] + 0.01).toFixed(2);
    var m = {}; ITEMS.forEach(function (x, i) { m[x.code] = +out[i].toFixed(2); });
    return m;
  }
  var WEIGHTS = itemWeights();

  // tolerance bands — floating-point sums must not flip a balanced item
  var TOL = { OVER: 100.05, FULL: 99.95 };

  // item allocation % = Σ shares, rounded to 0.1%
  function allocPct(rows) {
    if (!rows || !rows.length) return 0;
    return +rows.reduce(function (a, r) { return a + (Number(r.pct) || 0); }, 0).toFixed(1);
  }
  // allocation state from the % (never colour alone downstream — this is the token key)
  function allocState(pct) {
    if (pct <= 0) return 'none';        // Unassigned
    if (pct > TOL.OVER) return 'over';  // Over-allocated
    if (pct >= TOL.FULL) return 'full'; // Fully allocated
    return 'partial';                    // Partial
  }
  // a row is a duplicate if its activity appears more than once in the item
  function dupSet(rows) {
    var seen = {}, dup = {};
    (rows || []).forEach(function (r) { if (seen[r.act]) dup[r.act] = true; seen[r.act] = true; });
    return dup;
  }
  var itemOf = {}; ITEMS.forEach(function (x) { itemOf[x.code] = x; });
  var actOf = {}; WBS.forEach(function (x) { if (x.kind === 'act') actOf[x.code] = x; });

  // absolute weight a row contributes to the contract = itemWeight × share, 3dp
  function absWt(code, pct) { return +((WEIGHTS[code] || 0) * (Number(pct) || 0) / 100).toFixed(3); }
  // assigned amount = item amount × share
  function assignedAmount(code, pct) { return Math.round((itemOf[code] ? itemOf[code].amount : 0) * (Number(pct) || 0) / 100); }

  w.BOQDEMO = {
    PROJECT: PROJECT, CONTRACT: CONTRACT, DIVISIONS: DIVISIONS, ITEMS: ITEMS, WBS: WBS,
    SEED_ALLOC: SEED_ALLOC, USER: USER, CONTRACT_TOTAL: CONTRACT_TOTAL, WEIGHTS: WEIGHTS, TOL: TOL,
    itemOf: itemOf, actOf: actOf,
    allocPct: allocPct, allocState: allocState, dupSet: dupSet, absWt: absWt, assignedAmount: assignedAmount,
    // deep clone of the seed for fresh state
    seedClone: function () { var o = {}; Object.keys(SEED_ALLOC).forEach(function (k) { o[k] = SEED_ALLOC[k].map(function (r) { return { act: r.act, pct: r.pct }; }); }); return o; },
  };
})(window);
