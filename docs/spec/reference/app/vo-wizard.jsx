// Change-order creation wizard — 5 steps, table-led.
// Step 1: type + official letter. Step 2: BOQ Items / Activities tabs, each a
// multi-select table where every row picks its own change type and only the
// fields that change type needs. Nothing here mutates the record.

function DVOCreateWizard({ lang, contract, contracts, boq, acts, isSupply, onClose, onDone, onDraft }) {
  const AR = lang === 'ar';
  // the contract is the first required selection: BOQ items and activities from
  // different contracts may never share one change order
  const cList = (contracts && contracts.length) ? contracts : (contract ? [contract] : []);
  const [ckey, setCkey] = React.useState(cList.length === 1 ? cList[0].key || 'main' : null);
  const ct = cList.find(c => (c.key || 'main') === ckey) || null;
  const [step, setStep] = React.useState(0);
  const [seen, setSeen] = React.useState([0]);
  const visit = n => { setStep(n); setSeen(s => s.includes(n) ? s : [...s, n]); };
  const [tab, setTab] = React.useState('boq');
  const [kind, setKind] = React.useState(isSupply ? 'supply' : 'engineering');
  const [party, setParty] = React.useState(0);
  const [justNote, setJustNote] = React.useState('');
  const [editRow, setEditRow] = React.useState(null);
  const [capHint, setCapHint] = React.useState(null);
  const [inNo, setInNo] = React.useState('IN-5230');
  const [inDate, setInDate] = React.useState('2026-07-20');
  const [bRows, setBRows] = React.useState([]);
  const [aRows, setARows] = React.useState([]);
  const [bSel, setBSel] = React.useState([]);
  const [aSel, setASel] = React.useState([]);
  const [files, setFiles] = React.useState([]);
  const [pick, setPick] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const fileRef = React.useRef(null);

  const STEPS = AR
    ? [['النوع والكتاب الرسمي', 'description'], ['البنود والأنشطة المتأثرة', 'list_alt'],
       ['ملخص الأثر', 'difference'], ['المرفقات', 'attach_file'], ['المراجعة والإرسال', 'verified_user']]
    : [['Type & official letter', 'description'], ['Affected items & activities', 'list_alt'],
       ['Impact summary', 'difference'], ['Attachments', 'attach_file'], ['Review & submit', 'verified_user']];
  const KINDS = isSupply ? [
    ['supply', AR ? 'تجهيز — كمية / مبلغ / مدة / توزيع' : 'Supply — quantity / amount / duration / redistribution', 'inbox'],
  ] : [
    ['engineering', AR ? 'هندسي — كلفة / مدة' : 'Engineering — cost / time', 'engineering'],
    ['supply', AR ? 'تجهيز / إعادة توزيع كميات' : 'Supply / quantity redistribution', 'inbox'],
  ];
  React.useEffect(() => { setJustNote(''); }, [kind]);

  const T = window.EPM.voTerms({ type: isSupply ? 'supply' : 'construction' }, lang);
  const PARTIES = T.parties;
  // col-1 proposal label follows the selected «الجهة»; col-2 is the fixed reviewer
  // (RE department for construction, inspection & receipt committee for supply)
  const requesterLabel = PARTIES[party] || T.requester;
  const reviewerLabel = T.reviewer;
  const CHG = AR
    ? [['inc', 'زيادة كمية'], ['dec', 'نقص كمية'], ['rate', 'تعديل السعر'], ['del', 'إلغاء بند'], ['redist', 'إعادة توزيع']]
    : [['inc', 'Increase Quantity'], ['dec', 'Decrease Quantity'], ['rate', 'Change Unit Rate'], ['del', 'Cancel Item'], ['redist', 'Quantity Redistribution']];
  const CHG_L = Object.fromEntries(CHG);
  // supply orders don't re-price at a new unit rate (catalog/LC-fixed) — no 20% tier
  const CHG_USE = isSupply ? CHG.filter(c => c[0] !== 'rate') : CHG;
  const SCHG = AR
    ? [['inc', 'زيادة المدة'], ['dec', 'تقليل المدة'], ['start', 'تعديل تاريخ البداية'], ['finish', 'تعديل تاريخ النهاية'], ['both', 'تعديل تاريخي البداية والنهاية']]
    : [['inc', 'Increase Duration'], ['dec', 'Decrease Duration'], ['start', 'Change Start Date'], ['finish', 'Change Finish Date'], ['both', 'Change Start and Finish Dates']];
  const SCHG_L = Object.fromEntries(SCHG);
  const CATS = AR ? ['كتاب رسمي', 'مخطط', 'كشف كميات', 'تحليل مالي أو زمني', 'صور موقع', 'مستند داعم']
    : ['Official letter', 'Drawing', 'Quantity schedule', 'Cost or time analysis', 'Site photos', 'Supporting document'];

  // ---- source data, read from the record ----
  const DIVS = AR ? ['أعمال ترابية', 'أعمال إنشائية', 'أعمال معمارية', 'أعمال كهروميكانيكية'] : ['Earthworks', 'Structural', 'Architectural', 'MEP'];
  const BCAT = AR ? ['أعمال مدنية', 'تجهيز مواد', 'أعمال كهروميكانيكية'] : ['Civil works', 'Material supply', 'MEP works'];
  const actSrc = React.useMemo(() => (acts || []).filter(a => a.type === 'act' && !a.milestone)
    .filter(a => !ckey || window.contractKeyOfAct(a, cList) === ckey).map(a => ({
    _t: 'act', id: a.id, name: a.name, wbs: a.wbs, wbsCode: a.wbsCode, resp: a.wbs,
    start: a.curStart, finish: a.curFinish, pct: a.pct, remDur: a.remDur, origDur: a.origDur,
    status: a.pct >= 100 ? (AR ? 'منجز' : 'Completed') : a.pct > 0 ? (AR ? 'قيد التنفيذ' : 'In progress') : (AR ? 'لم يبدأ' : 'Not started'),
    crit: a.critical ? (AR ? 'حرج' : 'Critical') : (AR ? 'غير حرج' : 'Non-critical'),
  })), [acts, ckey, lang]);
  const boqSrc = React.useMemo(() => {
    // scope first, then total: weight is a share of the contract, so the
    // denominator must be the contract's own rows
    const scoped = (boq || []).filter(b => !ckey || window.contractKeyOfBoq(b, cList) === ckey);
    const sum = scoped.reduce((s, b) => s + b.total, 0) || 1;
    return scoped.map((b, i) => ({
      _t: 'boq', code: b.code, desc: b.item,
      div: isSupply ? (AR ? 'تجهيز أجهزة' : 'Equipment supply') : DIVS[i % DIVS.length],
      cat: isSupply ? (AR ? 'توريد' : 'Supply') : BCAT[i % BCAT.length], unit: b.unit,
      qty: b.contractedQty, price: b.price, executedQty: b.executedQty, weight: +(b.total / sum * 100).toFixed(2),
      beneficiaries: b.beneficiaries || [],   // carried through so supply redistribution can pick from→to
      status: b.executedQty >= b.contractedQty ? (AR ? 'منجز' : 'Completed') : b.executedQty > 0 ? (AR ? 'قيد التنفيذ' : 'In progress') : (AR ? 'لم يبدأ' : 'Not started'),
    }));
  }, [boq, ckey, lang]);
  const boqSum = boqSrc.reduce((s, b) => s + b.qty * b.price, 0) || 1;
  const uniq = (arr, k) => [...new Set(arr.map(x => x[k]).filter(Boolean))];

  // ---- maths. A blank amount means "nothing entered yet", never zero. ----
  const addD = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  // The proposed change is submitted twice: by the contractor, then by the
  // resident engineer's department (د.م.م). The د.م.م figure is the one carried
  // forward. Neither is the approved value — that comes from the pricing
  // committee's decision, entered during financial review.
  // 20% rule: a quantity change up to 20% of the original quantity is valued at
  // the original unit rate. Only the portion BEYOND 20% may carry a new rate,
  // proposed by المقاول and د.م.م — the binding rate is fixed later by
  // لجنة تثبيت الأسعار, so it is never entered here.
  const TIER = 0.20;
  const bOne = (r, raw, exRaw) => {
    const before = r.qty * r.price, dv = Number(raw) || 0;
    const blank = raw === '' || raw == null;
    const tiered = !isSupply && (r.chg === 'inc' || r.chg === 'dec');
    const thr = r.qty * TIER;
    const atRate = tiered ? Math.min(dv, thr) : 0;       // at the original rate
    const exQty = tiered ? Math.max(0, dv - thr) : 0;    // beyond 20%
    const exBlank = exRaw === '' || exRaw == null;
    const exRate = exBlank ? r.price : (Number(exRaw) || 0);
    let qtyAfter = r.qty, priceAfter = r.price, after;
    if (r.chg === 'inc') { qtyAfter = r.qty + dv; after = tiered ? before + atRate * r.price + exQty * exRate : (r.qty + dv) * r.price; }
    else if (r.chg === 'dec') { qtyAfter = Math.max(0, r.qty - dv); after = tiered ? before - atRate * r.price - exQty * exRate : qtyAfter * r.price; }
    else if (r.chg === 'redist') { qtyAfter = isSupply ? r.qty : Math.max(0, r.qty - dv); after = qtyAfter * r.price; }
    else if (r.chg === 'rate') { priceAfter = blank ? r.price : dv; after = qtyAfter * priceAfter; }
    else { qtyAfter = r.executedQty || 0; after = qtyAfter * r.price; }
    let diff = after - before;
    if (r.chg === 'redist' && r.tgt) diff = dv * (r.tgt.price - r.price);
    return { before, after, qtyAfter, priceAfter, diff, blank, dv,
      tiered, thr, atRate, exQty, exRate, exBlank, exceeds: exQty > 0.001 };
  };
  const bCalc = r => {
    const remain = Math.max(0, r.qty - (r.executedQty || 0));
    const con = bOne(r, r.delta, r.priceEx);
    const hasRe = !(r.deltaRe === '' || r.deltaRe == null);
    const re = hasRe ? bOne(r, r.deltaRe, r.priceExRe) : null;
    const gov = re || con;                       // د.م.م governs once entered
    const capped = r.chg === 'dec' || (r.chg === 'redist' && !isSupply);
    const overCon = capped && con.dv > remain;
    const overRe = capped && !!re && re.dv > remain;
    return { ...gov, con, re, hasRe, remain, diverges: hasRe && Math.abs(re.diff - con.diff) > 0.5,
      exceeds: con.exceeds || (!!re && re.exceeds),
      overCon, overRe, over: overCon || overRe };
  };
  // supply redistribution: ONE item may be re-split across MANY source→target
  // pairs. Each transfer is {from, to, qty}; the item total and contract value are
  // unchanged — only per-beneficiary allocations move. Validation is per source:
  // the sum drawn from a source may not exceed its current allocation.
  const redistOf = r => {
    const txs = (r.transfers || []).map(t => ({ from: t.from || '', to: t.to || '', qty: Number(t.qty) || 0 }));
    const alloc = {}; (r.beneficiaries || []).forEach(b => { alloc[b.name] = b.qty; });
    const bySrc = {}; txs.forEach(t => { if (t.from) bySrc[t.from] = (bySrc[t.from] || 0) + t.qty; });
    const net = {}; txs.forEach(t => { if (t.from) net[t.from] = (net[t.from] || 0) - t.qty; if (t.to) net[t.to] = (net[t.to] || 0) + t.qty; });
    const overSources = Object.keys(bySrc).filter(s => bySrc[s] > (alloc[s] || 0) + 1e-9);
    const invalid = txs.filter(t => !t.from || !t.to || t.from === t.to || t.qty <= 0);
    const totalMoved = txs.reduce((s, t) => s + t.qty, 0);
    return { txs, alloc, bySrc, net, overSources, invalid, totalMoved, count: txs.length };
  };
  const aCalc = r => {
    const dv = Number(r.days) || 0;
    let startAfter = r.start, finishAfter = r.finish;
    if (r.chg === 'inc') finishAfter = addD(r.finish, dv);
    else if (r.chg === 'dec') finishAfter = addD(r.finish, -dv);
    else if (r.chg === 'start') { startAfter = r.startDate || r.start; finishAfter = addD(r.finish, r.startDate ? dayDiff(r.start, r.startDate) : 0); }
    else if (r.chg === 'finish') finishAfter = r.finishDate || r.finish;
    else if (r.chg === 'both') { startAfter = r.startDate || r.start; finishAfter = r.finishDate || r.finish; }
    const shift = dayDiff(r.start, startAfter);
    const days = dayDiff(r.finish, finishAfter);
    return { startAfter, finishAfter, days, shift, remAfter: Math.max(0, r.remDur + (days - shift)) };
  };
  const boqNet = bRows.reduce((s, r) => s + bCalc(r).diff, 0);
  const boqNetCon = bRows.reduce((s, r) => s + bCalc(r).con.diff, 0);
  const anyExceeds = bRows.some(r => bCalc(r).exceeds);
  // submission blockers — a decrease may never exceed the remaining quantity,
  // and a redistribution needs its target
  const blockers = [
    // §2.1.1 / §2.10.1 — official incoming no. & date are the legal-counter start;
    // a change-order request cannot be submitted without them.
    ...(!inNo || !inNo.trim() ? [{ code: AR ? 'الوارد' : 'Incoming', msg: AR ? 'رقم الوارد الرسمي مطلوب' : 'Official incoming no. is required' }] : []),
    ...(!inDate || !inDate.trim() ? [{ code: AR ? 'الوارد' : 'Incoming', msg: AR ? 'تاريخ الوارد الرسمي مطلوب' : 'Official incoming date is required' }] : []),
    ...bRows.filter(r => bCalc(r).overCon).map(r => ({ code: r.code,
      msg: (AR ? 'مقترح ' + requesterLabel + ' يتجاوز الكمية المتبقية' : requesterLabel + ' proposal exceeds the remaining quantity') })),
    ...bRows.filter(r => bCalc(r).overRe).map(r => ({ code: r.code,
      msg: (AR ? 'مقترح ' + reviewerLabel + ' يتجاوز الكمية المتبقية' : reviewerLabel + ' proposal exceeds the remaining quantity') })),
    ...bRows.filter(r => r.chg === 'redist' && !isSupply && !r.tgt).map(r => ({ code: r.code,
      msg: AR ? 'لم يُحدَّد البند الهدف لإعادة التوزيع' : 'Redistribution target not selected' })),
    // supply redistribution — at least one transfer, each valid, none over-drawn
    ...bRows.filter(r => r.chg === 'redist' && isSupply && redistOf(r).count === 0).map(r => ({ code: r.code,
      msg: AR ? 'أضف تحويلاً واحداً على الأقل لإعادة التوزيع' : 'Add at least one redistribution transfer' })),
    ...bRows.filter(r => r.chg === 'redist' && isSupply && redistOf(r).count > 0 && redistOf(r).invalid.length > 0).map(r => ({ code: r.code,
      msg: AR ? 'كل تحويل يتطلب جهة مصدر وجهة هدف مختلفتين وكمية موجبة' : 'Each transfer needs a distinct source & target and a positive quantity' })),
    ...bRows.filter(r => r.chg === 'redist' && isSupply && redistOf(r).overSources.length > 0).map(r => ({ code: r.code,
      msg: (AR ? 'إجمالي المنقول من ' : 'Total moved from ') + redistOf(r).overSources.join('، ') + (AR ? ' يتجاوز المخصّص المتاح' : ' exceeds available allocation') })),
    // a change type that carries a quantity/rate must actually specify one — a blank
    // change has no effect, so it cannot be submitted
    ...bRows.filter(r => (r.chg === 'inc' || r.chg === 'dec' || r.chg === 'rate') && (r.delta === '' || r.delta == null || Number(r.delta) <= 0)).map(r => ({ code: r.code,
      msg: r.chg === 'rate' ? (AR ? 'أدخل السعر الجديد' : 'Enter the new unit rate') : (AR ? 'أدخل مقدار التغيير في الكمية' : 'Enter the change amount') })),
    ...bRows.filter(r => r.chg === 'redist' && !isSupply && (r.delta === '' || r.delta == null || Number(r.delta) <= 0)).map(r => ({ code: r.code,
      msg: AR ? 'أدخل الكمية المُعاد توزيعها' : 'Enter the redistributed quantity' })),
    // a time change must specify its days or dates
    ...aRows.filter(r => (r.chg === 'inc' || r.chg === 'dec') && (r.days === '' || r.days == null || Number(r.days) <= 0)).map(r => ({ code: r.id,
      msg: AR ? 'أدخل عدد أيام التغيير الزمني' : 'Enter the number of days' })),
    ...aRows.filter(r => r.chg === 'start' && !r.startDate).map(r => ({ code: r.id, msg: AR ? 'حدّد تاريخ البداية الجديد' : 'Set the new start date' })),
    ...aRows.filter(r => r.chg === 'finish' && !r.finishDate).map(r => ({ code: r.id, msg: AR ? 'حدّد تاريخ النهاية الجديد' : 'Set the new finish date' })),
    ...aRows.filter(r => r.chg === 'both' && (!r.startDate || !r.finishDate)).map(r => ({ code: r.id, msg: AR ? 'حدّد تاريخي البداية والنهاية' : 'Set both start and finish dates' })),
  ];
  const canSubmit = blockers.length === 0 && (bRows.length > 0 || aRows.length > 0);
  const daysReq = Math.max(0, ...aRows.map(r => aCalc(r).days), 0);
  const cCost = (ct && ct.raw && ct.raw.contractCost) || 0;
  const cName = (ct && ct.name) || (ct && ct.fields && ct.fields[0] && ct.fields[0].value) || '—';
  const wDelta = bRows.reduce((s, r) => { const c = bCalc(r); return s + Math.abs(c.after / (boqSum + boqNet) * 100 - r.weight); }, 0);
  // Actual issuing path. Branches: the endorsement-review committee only enters
  // when the added duration exceeds a quarter of the contract duration; the
  // rate-fixing committee only when quantities pass the 20% tier or a rate changes;
  // the finance directorate only when an allocation is needed.
  const cStart = ct && ct.raw && ct.raw.start, cFinish = ct && ct.raw && ct.raw.finish;
  const cDur = cStart && cFinish ? Math.max(1, Math.round((new Date(cFinish) - new Date(cStart)) / 86400000)) : 0;
  const durQuarter = Math.round(cDur / 4);
  const overQuarter = cDur > 0 && daysReq > durQuarter;
  const needsRate = !isSupply && (anyExceeds || bRows.some(r => r.chg === 'rate'));
  // Six system-owned stages. External parties are not stages — their decisions are
  // recorded inside the owning stage by a delegate, against an official letter.
  const path = [
    [AR ? 'دراسة الطلب' : 'Request study', isSupply ? 'fact_check' : 'engineering',
      (isSupply ? T.enteredBy : (AR ? 'دائرة المهندس المقيم' : 'RE department'))
        + (AR ? ' — ' : ' — ')
        + (isSupply ? (AR ? 'يُدخل الأمر بعد ورود طلب المجهز والرأي الفني' : 'entered after the supplier’s request and technical opinion')
                    : (AR ? 'يُدخل الأمر بعد ورود طلب المقاول ورأي الاستشاري' : 'entered after the contractor’s request and the consultant’s opinion'))],
    [AR ? 'لجنة أوامر الغيار' : 'Change-order committee', 'account_tree',
      AR ? 'تدقيق الطلب وتنظيم الاستمارات — وتُعاد عند وجود نقص' : 'Reviews the request and prepares the forms'],
    ...(needsRate ? [[AR ? 'تثبيت الأسعار' : 'Rate fixing', 'difference',
      AR ? 'لجنة تثبيت الأسعار — لسعر الكمية الزائدة عن 20%' : 'Rate-fixing committee — for the quantity beyond 20%']] : []),
    ...((bRows.length > 0 || overQuarter) ? [[AR ? 'المصادقة والتخصيص' : 'Endorsement & allocation', 'payments',
      (AR ? 'لجنة أوامر الغيار · أطراف خارجية: ' : 'Change-order committee · external: ')
      + ([overQuarter ? (AR ? 'لجنة المراجعة المصادقة (المدة تتجاوز ربع مدة العقد)' : 'endorsement review committee') : null,
          boqNet !== 0 ? (AR ? 'الدائرة الإدارية والمالية (التخصيص)' : 'finance directorate') : null].filter(Boolean).join(AR ? ' و' : ' & ')
         || (AR ? 'لا توجد' : 'none'))]] : []),
    [AR ? 'الأمر الوزاري وملحق العقد' : 'Ministerial order & addendum', 'verified_user',
      AR ? 'أطراف خارجية: الوزير / المفوَّض، قسم العقود الحكومية' : 'External: Minister / delegate, government contracts section'],
    [AR ? 'التنفيذ' : 'Execution', 'done',
      T.execOwner + (AR ? ' — ' : ' — ') + T.execNote],
  ];
  const stepDone = [!!ckey && !!justNote.trim(), (bRows.length > 0 || aRows.length > 0) && blockers.length === 0,
    seen.includes(2) && (bRows.length > 0 || aRows.length > 0), files.length > 0, false];

  // ---- atoms ----
  const numIn = (v, on, w) => <input className="d-form-input mono" style={{ width: w || 86, padding: '5px 8px', fontSize: 12 }} value={v || ''} onChange={e => on(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />;
  const dateIn = (v, on, ph) => <input className="d-form-input mono" style={{ width: 112, padding: '5px 8px', fontSize: 12 }} value={v || ''} onChange={e => on(e.target.value)} placeholder={ph || '2026-01-01'} />;
  const selIn = (v, on, opts, w, k) => <select key={k} className="d-form-input" style={{ width: w || 130, padding: '5px 6px', fontSize: 12 }} value={v} onChange={e => on(e.target.value)}>{opts.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>;
  const kv = (k, v, mono) => <div className="d-form-i"><span className="k">{k}</span><span className={'v' + (mono ? ' mono' : '')}>{v}</span></div>;
  const secH = (ico, txt, right) => <div className="d-vow-sech"><Icon name={ico} size={16} /><div className="d-section-title" style={{ margin: 0 }}>{txt}</div><div style={{ flex: 1 }}></div>{right}</div>;

  const addFiles = e => {
    const fs = [...(e.target.files || [])];
    const mk = x => ({ name: x.name, size: Math.max(1, Math.round(x.size / 1024)) + ' KB', cat: 0 });
    setFiles(f => [...f, ...(fs.length ? fs.map(mk) : [{ name: AR ? 'مستند.pdf' : 'document.pdf', size: '240 KB', cat: 0 }])]);
    if (e.target) e.target.value = '';
  };
  const boqPickSpec = extra => ({
    kind: 'boq', title: isSupply ? (AR ? 'اختيار الفقرات التجهيزية' : 'Select supply items') : (AR ? 'اختيار بنود من جدول الكميات' : 'Select BOQ items'),
    hint: AR ? 'ابحث بكود البند أو الوصف' : 'Search by BOQ code or description',
    keyOf: r => r.code, taken: extra && extra.mode ? [] : bRows.map(r => r.code),
    cols: [{ k: 'code', l: AR ? 'كود البند' : 'BOQ Code', mono: true, w: 96 }, { k: 'desc', l: AR ? 'وصف البند' : 'Description' },
      { k: 'div', l: 'Division', w: 130 }, { k: 'unit', l: AR ? 'الوحدة' : 'Unit', w: 58 },
      { k: 'qty', l: AR ? 'الكمية الحالية' : 'Current Quantity', mono: true, w: 116, f: r => window.fmtNum(r.qty) },
      { k: 'price', l: AR ? 'سعر الوحدة' : 'Unit Rate', mono: true, w: 104, f: r => window.fmtNum(r.price) },
      { k: 'amt', l: AR ? 'القيمة الحالية' : 'Current Amount', mono: true, w: 124, f: r => window.fmtNum(r.qty * r.price) },
      { k: 'weight', l: AR ? 'وزن البند' : 'BOQ Weight', mono: true, w: 96, f: r => r.weight + '%' }],
    filters: [{ k: 'div', l: 'Division', opts: uniq(boqSrc, 'div') },
      { k: 'cat', l: AR ? 'تصنيف البند' : 'Category', opts: uniq(boqSrc, 'cat') },
      { k: 'status', l: AR ? 'الحالة' : 'Status', opts: uniq(boqSrc, 'status') }],
    rows: boqSrc, ...extra,
  });
  const actPickSpec = {
    kind: 'act', title: AR ? 'اختيار أنشطة من الجدول الزمني' : 'Select schedule activities',
    hint: AR ? 'ابحث بمعرّف النشاط أو اسمه' : 'Search by activity ID or name',
    keyOf: r => r.id, taken: aRows.map(r => r.id),
    cols: [{ k: 'id', l: 'Activity ID', mono: true, w: 80 }, { k: 'name', l: AR ? 'اسم النشاط' : 'Activity Name' },
      { k: 'start', l: AR ? 'تاريخ البداية' : 'Start Date', mono: true, w: 104 },
      { k: 'finish', l: AR ? 'تاريخ النهاية' : 'Finish Date', mono: true, w: 104 },
      { k: 'pct', l: AR ? 'الإنجاز الحالي' : 'Current Progress', mono: true, w: 108, f: r => r.pct + '%' },
      { k: 'remDur', l: AR ? 'المدة المتبقية' : 'Remaining Duration', mono: true, w: 132, f: r => r.remDur + (AR ? ' يوم' : 'd') }],
    filters: [{ k: 'status', l: AR ? 'الحالة' : 'Status', opts: uniq(actSrc, 'status') },
      { k: 'resp', l: AR ? 'الجهة المسؤولة' : 'Responsible', opts: uniq(actSrc, 'resp') },
      { k: 'crit', l: AR ? 'المسار الحرج' : 'Critical', opts: uniq(actSrc, 'crit') }],
    rows: actSrc,
  };
  const onConfirmPick = rows => {
    if (pick.kind === 'act') setARows(rs => [...rs, ...rows.map(r => ({ ...r, chg: 'inc', days: '', startDate: '', finishDate: '' }))]);
    else if (pick.mode === 'tgt') setBRows(rs => rs.map((x, j) => j === pick.i ? { ...x, tgt: rows[0] } : x));
    else setBRows(rs => [...rs, ...rows.map(r => ({ ...r, chg: 'inc', delta: '', deltaRe: '', priceEx: '', priceExRe: '' }))]);
    setPick(null);
  };

  // proposed-change cell, per change type — only the fields that type needs
  const bProposed = (r, c, upd, party) => {
    const fld = party === 're' ? 'deltaRe' : 'delta';
    const val = party === 're' ? r.deltaRe : r.delta;
    const exFld = party === 're' ? 'priceExRe' : 'priceEx';
    const exVal = party === 're' ? r.priceExRe : r.priceEx;
    const side = party === 're' ? c.re : c.con;
    // a decrease can only give back what has not been executed
    const cap = (r.chg === 'dec' || (r.chg === 'redist' && !isSupply)) ? c.remain : null;
    const setQty = v => {
      if (cap != null && v !== '' && Number(v) > cap) {
        upd({ [fld]: String(+cap.toFixed(2)) });
        setCapHint(r.code + ':' + party);
        return;
      }
      setCapHint(null); upd({ [fld]: v });
    };
    const capped = capHint === r.code + ':' + party;
    const qtyIn = width => (
      <div className="d-vow-cap">
        {numIn(val, setQty, width)}
        {cap != null && <span className="mx">{AR ? 'الحد ' : 'max '}<b className="mono">{window.fmtNum(+cap.toFixed(2))}</b></span>}
        {capped && <span className="hint">{AR ? 'حُدَّ بالكمية المتبقية' : 'capped at remaining'}</span>}
      </div>);
    if (r.chg === 'del') return <span className="d-cell-sub">{AR ? 'إلغاء المتبقي' : 'Cancel remaining'}</span>;
    if (r.chg === 'redist' && isSupply) { const R = redistOf(r); return <div className="d-vow-f" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <span className="d-pill">{R.count} {AR ? (R.count === 1 ? 'تحويل' : 'تحويلات') : 'transfers'}</span>
      {R.count > 0 && <span className="d-cell-sub mono">Σ {window.fmtNum(R.totalMoved)} {r.unit}</span>}
      {R.count === 0 && <span className="d-cell-sub">{AR ? 'حرّر لإضافة تحويل' : 'edit to add'}</span>}</div>; }
    if (r.chg === 'redist') return <div className="d-vow-f">
      {qtyIn(76)}
      {party !== 're' && <button className="d-btn" onClick={() => setPick(boqPickSpec({ mode: 'tgt', i: r._i, title: AR ? 'اختيار البند الهدف' : 'Select target BOQ' }))}>
        {r.tgt ? r.tgt.code : (AR ? 'البند الهدف' : 'Target BOQ')}</button>}</div>;
    if ((r.chg === 'inc' || r.chg === 'dec') && side && side.exceeds) return (
      <div className="d-vow-tier">
        {qtyIn(92)}
        <span className="t"><i>{AR ? 'سعر الكمية الزائدة عن 20%' : 'Rate beyond 20%'}</i>{numIn(exVal, v => upd({ [exFld]: v }), 92)}</span>
      </div>);
    if (r.chg === 'rate') return numIn(val, v => upd({ [fld]: v }), 92);
    return qtyIn(78);
  };
  // multi-transfer editor for a supply redistribution row
  const transferEditor = (r, i, upd) => {
    const R = redistOf(r);
    const txs = (r.transfers && r.transfers.length) ? r.transfers : [{ from: '', to: '', qty: '' }];
    const setTx = (j, patch) => upd({ transfers: txs.map((t, k) => k === j ? { ...t, ...patch } : t) });
    const addTx = () => upd({ transfers: [...txs, { from: '', to: '', qty: '' }] });
    const delTx = j => upd({ transfers: txs.length > 1 ? txs.filter((_, k) => k !== j) : [{ from: '', to: '', qty: '' }] });
    // how much is still available from a source, after the OTHER transfers drawn from it
    const availFor = (src, selfJ) => (R.alloc[src] || 0) - txs.reduce((s, t, k) => s + (k !== selfJ && t.from === src ? (Number(t.qty) || 0) : 0), 0);
    return (
      <div className="d-vow-tx">
        <div className="d-vow-sech" style={{ marginBottom: 8 }}><Icon name="swap_horiz" size={16} />
          <div className="d-section-title" style={{ margin: 0 }}>{AR ? 'تحويلات إعادة التوزيع' : 'Redistribution transfers'}</div>
          <div style={{ flex: 1 }}></div>
          <span className="d-cell-sub">{AR ? 'من عدة مصادر إلى عدة جهات لنفس الفقرة' : 'Several sources → several targets for this item'}</span></div>
        <table className="d-line-table"><thead><tr>
          <th style={{ minWidth: 200 }}>{AR ? 'الجهة المصدر' : 'Source beneficiary'}</th>
          <th style={{ width: 34 }}></th>
          <th style={{ minWidth: 200 }}>{AR ? 'الجهة الهدف' : 'Target beneficiary'}</th>
          <th style={{ width: 120 }}>{AR ? 'الكمية المنقولة' : 'Moved qty'}</th>
          <th style={{ width: 44 }}></th></tr></thead>
          <tbody>{txs.map((t, j) => { const av = t.from ? availFor(t.from, j) : null; const q = Number(t.qty) || 0;
            const over = av != null && q > av + 1e-9; const dup = t.from && t.to && t.from === t.to;
            return (<tr key={j} className={over || dup ? 'on' : ''}>
              <td><select className="d-form-input" style={{ width: '100%', padding: '5px 6px', fontSize: 12 }} value={t.from || ''} onChange={e => setTx(j, { from: e.target.value })}>
                <option value="">{AR ? 'اختر المصدر…' : 'Select source…'}</option>
                {(r.beneficiaries || []).map(b => <option key={b.name} value={b.name}>{b.name} ({window.fmtNum(b.qty)})</option>)}</select></td>
              <td style={{ textAlign: 'center' }}><Icon name={AR ? 'arrow_back' : 'arrow_forward'} size={14} /></td>
              <td><select className="d-form-input" style={{ width: '100%', padding: '5px 6px', fontSize: 12 }} value={t.to || ''} onChange={e => setTx(j, { to: e.target.value })}>
                <option value="">{AR ? 'اختر الهدف…' : 'Select target…'}</option>
                {(window.EPM.FORMATIONS || []).map(f => <option key={f.en} value={f[lang]}>{f[lang]}</option>)}</select></td>
              <td>{numIn(t.qty, v => setTx(j, { qty: v }), 92)}
                {av != null && <div className={'d-cell-sub' + (over ? ' warn' : '')}>{AR ? 'المتاح ' : 'avail '}<b className="mono">{window.fmtNum(+av.toFixed(2))}</b></div>}
                {dup && <div className="d-cell-sub warn">{AR ? 'المصدر والهدف متطابقان' : 'source = target'}</div>}</td>
              <td><button className="d-icon-btn" title={AR ? 'حذف التحويل' : 'Remove transfer'} onClick={() => delTx(j)}><Icon name="delete" size={15} /></button></td>
            </tr>); })}</tbody></table>
        <button className="d-btn" style={{ marginTop: 8 }} onClick={addTx}><Icon name="add" size={14} />{AR ? 'إضافة تحويل' : 'Add transfer'}</button>
        {Object.keys(R.net).length > 0 && <div style={{ marginTop: 12 }}>
          <div className="d-cell-sub" style={{ marginBottom: 6 }}>{AR ? 'صافي التغيير في التوزيع (بعد التطبيق)' : 'Net allocation change (after apply)'}</div>
          <div className="d-vow-f" style={{ flexWrap: 'wrap', gap: 6 }}>{Object.keys(R.net).map(k => (
            <span key={k} className={'d-pill ' + (R.net[k] < 0 ? 'stalled' : 'completed')}>{k} {R.net[k] > 0 ? '+' : ''}{window.fmtNum(+R.net[k].toFixed(2))}</span>))}</div></div>}
        {R.overSources.length > 0 && <DMsgBar tone="warning" icon="warning">{(AR ? 'إجمالي المنقول من ' : 'Total moved from ') + R.overSources.join('، ') + (AR ? ' يتجاوز المخصّص المتاح لهذه الجهة.' : ' exceeds the available allocation.')}</DMsgBar>}
        <DMsgBar tone="info" icon="info">{AR ? 'إعادة التوزيع لا تغيّر إجمالي كمية الفقرة ولا قيمة العقد — تنقل المخصّصات بين الجهات المستفيدة فقط.' : 'Redistribution changes neither the item total nor the contract value — it only moves allocations between beneficiaries.'}</DMsgBar>
      </div>);
  };
  const aProposed = (r, upd) => {
    if (r.chg === 'inc' || r.chg === 'dec') return <div className="d-vow-f">{numIn(r.days, v => upd({ days: v }), 74)}<span className="d-cell-sub">{AR ? 'يوم' : 'days'}</span></div>;
    if (r.chg === 'start') return dateIn(r.startDate, v => upd({ startDate: v }));
    if (r.chg === 'finish') return dateIn(r.finishDate, v => upd({ finishDate: v }));
    return <div className="d-vow-f">{dateIn(r.startDate, v => upd({ startDate: v }))}{dateIn(r.finishDate, v => upd({ finishDate: v }))}</div>;
  };

  // Lean register: identity, current value, change type, each party's net.
  // Editing and the 20% tier breakdown live in a full-width row editor, where
  // a two-party × two-tier comparison actually has room.
  const boqTable = (ro) => (
    <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
      {!ro && <th style={{ width: 34 }}><input type="checkbox" checked={bSel.length === bRows.length && bRows.length > 0} onChange={() => setBSel(bSel.length === bRows.length ? [] : bRows.map(r => r.code))} /></th>}
      <th style={{ width: 96 }}>{AR ? 'كود البند' : 'BOQ Code'}</th><th style={{ minWidth: 190 }}>{AR ? 'وصف البند' : 'Description'}</th>
      <th style={{ width: 130 }}>{AR ? 'الحالي' : 'Current'}</th>
      <th style={{ width: 150 }}>{AR ? 'نوع التغيير' : 'Change Type'}</th>
      <th style={{ width: 128 }}>{(AR ? 'مقترح ' : '') + requesterLabel}</th>
      <th style={{ width: 128 }}>{(AR ? 'مقترح ' : '') + reviewerLabel}</th>
      <th style={{ width: 150 }}>{AR ? 'الحالة' : 'State'}</th>
      {!ro && <th style={{ width: 106 }}></th>}</tr></thead>
      <tbody>{bRows.map((r, i) => { const c = bCalc(r); const isR = r.chg === 'rate'; const on = bSel.includes(r.code);
        const upd = o => setBRows(rs => rs.map((x, j) => j === i ? { ...x, ...o } : x));
        const openEd = editRow === r.code;
        const cols = ro ? 7 : 9;
        return (<React.Fragment key={'b-' + r.code}>
          <tr className={(!ro && on ? 'on' : '') + (openEd ? ' open' : '')}>
            {!ro && <td><input type="checkbox" checked={on} onChange={() => setBSel(s => on ? s.filter(x => x !== r.code) : [...s, r.code])} /></td>}
            <td className="mono">{r.code}</td>
            <td>{r.desc}<div className="d-cell-sub">{r.div} · {AR ? 'الوزن' : 'weight'} {r.weight}%</div></td>
            <td className="mono">{window.fmtNum(r.qty)} {r.unit}<div className="d-cell-sub mono">{window.fmtNum(c.before)}</div></td>
            <td>{ro ? CHG_L[r.chg] : selIn(r.chg, v => upd({ chg: v, delta: '', deltaRe: '', priceEx: '', priceExRe: '', tgt: null }), CHG_USE, 126, 'bc-' + r.code)}</td>
            {[c.con, c.hasRe ? c.re : null].map((s, k) => (
              <td key={k} className="mono">{!s || (s.blank && !isR && r.chg !== 'del') ? <span className="d-cell-sub">{AR ? 'لم يُدخل' : 'not set'}</span>
                : <React.Fragment>{(s.diff > 0 ? '+' : '') + window.fmtNum(Math.round(s.diff))}
                  <div className="d-cell-sub mono">{isR ? window.fmtNum(s.priceAfter) : window.fmtNum(+s.qtyAfter.toFixed(2)) + ' ' + r.unit}</div>
                  {s.exceeds && s.exBlank && <div className="d-vow-prov">{AR ? 'جزئي — سعر الزائد غير مُحدَّد' : 'partial — excess unpriced'}</div>}</React.Fragment>}</td>))}
            <td>{(() => {
              const notes = [];
              if (c.exceeds) notes.push(AR ? 'كمية زائدة عن 20% تتطلب سعراً جديداً' : 'Quantity beyond 20% needs a new rate');
              if (c.diverges) notes.push(AR ? 'المقترحان مختلفان' : 'Proposals differ');
              if (!notes.length) return <span className="d-cell-sub">—</span>;
              const worst = c.exceeds ? ['suspended', AR ? 'يتجاوز 20%' : 'Beyond 20%']
                : ['', AR ? 'مقترحان مختلفان' : 'Proposals differ'];
              return <div className="d-vow-state" title={notes.join(' · ')}>
                <span className={'d-pill ' + worst[0]}>{worst[1]}</span>
                {notes.length > 1 && <em>+{notes.length - 1}</em>}</div>; })()}</td>
            {!ro && <td><div className="d-vow-ac">
              <button className={'d-icon-btn' + (openEd ? ' on' : '')} title={AR ? 'تحرير التغيير' : 'Edit change'} onClick={() => setEditRow(openEd ? null : r.code)}><Icon name={openEd ? 'expand_less' : 'edit'} size={15} /></button>
              <button className="d-icon-btn" title={AR ? 'تفاصيل البند' : 'Item detail'} onClick={() => setDetail(r)}><Icon name="info" size={15} /></button>
              <button className="d-icon-btn" title={AR ? 'حذف' : 'Remove'} onClick={() => { setBRows(rs => rs.filter((_, j) => j !== i)); setBSel(s => s.filter(x => x !== r.code)); if (openEd) setEditRow(null); }}><Icon name="delete" size={15} /></button>
            </div></td>}
          </tr>
          {!ro && openEd && <tr className="d-vow-ed"><td colSpan={cols}>
            <div className="d-vow-edh">
              <b>{CHG_L[r.chg]}</b>
              <span className="d-cell-sub">{r.code} — {r.desc}</span>
              <div style={{ flex: 1 }}></div>
              {!isSupply && (r.chg === 'inc' || r.chg === 'dec') && <span className="d-cell-sub">{AR ? 'حد 20%' : '20% limit'} <b className="mono">{window.fmtNum(+(r.qty * TIER).toFixed(2))}</b> {r.unit} {AR ? 'من' : 'of'} <b className="mono">{window.fmtNum(r.qty)}</b></span>}
              {(r.chg === 'dec' || (r.chg === 'redist' && !isSupply)) && <span className="d-cell-sub">{AR ? 'المتبقي' : 'Remaining'} <b className="mono">{window.fmtNum(c.remain)}</b> {r.unit}</span>}
            </div>
            {isSupply && r.chg === 'redist' ? transferEditor(r, i, upd) :
            <div className="d-vow-props">
              {[['con', (AR ? 'مقترح ' : '') + requesterLabel + (AR ? '' : ' proposal'), c.con], ['re', (AR ? 'مقترح ' : '') + reviewerLabel + (AR ? '' : ' proposal'), c.re]].map(([k, lbl, s]) => (
                <div key={k} className={'d-vow-prop' + (k === 're' && c.hasRe ? ' gov' : '') + ((k === 'con' ? c.overCon : c.overRe) ? ' bad' : '')}>
                  <div className="ph"><Icon name={k === 'con' ? 'person' : (isSupply ? 'fact_check' : 'engineering')} size={15} /><b>{lbl}</b>
                    {k === 're' && c.hasRe && <span className="d-pill ongoing">{AR ? 'المعتمد للمضي' : 'Carried forward'}</span>}</div>
                  <div className="pf">
                    <label>{isR ? (AR ? 'السعر الجديد' : 'New rate') : r.chg === 'del' ? (AR ? 'الكمية الملغاة' : 'Cancelled qty') : (AR ? 'مقدار التغيير' : 'Change amount')}</label>
                    {r.chg === 'del' ? <span className="mono">{window.fmtNum(c.remain)} {r.unit}</span> : bProposed({ ...r, _i: i }, c, upd, k)}
                  </div>
                  {!isSupply && (r.chg === 'inc' || r.chg === 'dec') && s && !s.blank && <div className="d-vow-tiers">
                    <div className="tr1"><i>{AR ? 'ضمن 20%' : 'Within 20%'}</i>
                      <b className="mono">{window.fmtNum(+s.atRate.toFixed(2))} {r.unit}</b>
                      <span className="mono">× {window.fmtNum(r.price)}</span>
                      <em className="mono">{(r.chg === 'dec' ? '−' : '+') + window.fmtNum(Math.round(s.atRate * r.price))}</em></div>
                    <div className={'tr1 ex' + (s.exceeds ? '' : ' none')}><i>{AR ? 'أكثر من 20%' : 'Beyond 20%'}</i>
                      <b className="mono">{window.fmtNum(+s.exQty.toFixed(2))} {r.unit}</b>
                      <span className="mono">× {s.exceeds && s.exBlank ? (AR ? 'سعر جديد؟' : 'new rate?') : window.fmtNum(s.exRate)}</span>
                      <em className="mono">{s.exceeds && !s.exBlank ? (r.chg === 'dec' ? '−' : '+') + window.fmtNum(Math.round(s.exQty * s.exRate)) : '—'}</em></div>
                  </div>}
                  {(k === 'con' ? c.overCon : c.overRe) && <div className="d-vow-inline warn"><Icon name="warning" size={14} />
                    {AR ? 'يتجاوز الكمية المتبقية' : 'Exceeds remaining'} <b className="mono">{window.fmtNum(c.remain)}</b> {r.unit}</div>}
                  <div className="pt">
                    <span><i>{isR ? (AR ? 'السعر المعدل' : 'Revised rate') : (AR ? 'الكمية المعدلة' : 'Revised qty')}</i><b className="mono">{s ? (isR ? window.fmtNum(s.priceAfter) : window.fmtNum(+s.qtyAfter.toFixed(2)) + ' ' + r.unit) : '—'}</b></span>
                    <span><i>{AR ? 'القيمة المعدلة' : 'Revised value'}</i><b className="mono">{s ? window.fmtNum(Math.round(s.after)) : '—'}</b></span>
                    <span><i>{AR ? 'الأثر المالي' : 'Impact'}</i><b className="mono">{s ? (s.diff > 0 ? '+' : '') + window.fmtNum(Math.round(s.diff)) : '—'}</b></span>
                  </div>
                </div>))}
            </div>}
            {c.over && <DMsgBar tone="warning" icon="warning">{AR ? 'كل مقترح يجب أن يبقى ضمن الكمية المتبقية ' : 'Each proposal must stay within the remaining quantity '}
                <b className="mono">{window.fmtNum(c.remain)}</b> {r.unit}
                {AR ? ' — لا يجوز إلغاء كمية منفَّذة. المخالف: ' : ' — executed quantity cannot be removed. Offending: '}
                <b>{[c.overCon && requesterLabel, c.overRe && reviewerLabel].filter(Boolean).join(AR ? ' و' : ' & ')}</b></DMsgBar>}
            {c.exceeds && <DMsgBar tone="info" icon="difference">{AR ? 'الكمية الزائدة عن 20% تُسعَّر بسعر جديد يقترحه الطرفان، ويُثبَّت السعر النهائي بقرار لجنة تثبيت الأسعار.' : 'Quantity beyond 20% is priced at a new rate proposed by both parties and fixed by the rate-fixing committee.'}</DMsgBar>}
            {r.chg === 'redist' && !isSupply && <DMsgBar tone="info" icon="info">{AR ? 'البند الهدف' : 'Target BOQ'} <b>{r.tgt ? r.tgt.code + ' — ' + r.tgt.desc : (AR ? 'لم يُحدَّد' : 'not selected')}</b></DMsgBar>}
          </td></tr>}
        </React.Fragment>); })}</tbody>
      <tfoot><tr><td colSpan={ro ? 4 : 5}>{AR ? 'صافي الأثر على قيمة العقد' : 'Net impact on contract value'}
        <div className="d-cell-sub">{AR ? 'قيمة العقد الحالية' : 'Current contract value'} <b className="mono">{window.fmtNum(cCost)}</b></div></td>
        <td className="mono">{(boqNetCon > 0 ? '+' : '') + window.fmtNum(Math.round(boqNetCon))}
          <div className="d-cell-sub mono">{window.fmtNum(Math.round(cCost + boqNetCon))}</div></td>
        <td className="mono">{(boqNet > 0 ? '+' : '') + window.fmtNum(Math.round(boqNet))}
          <div className="d-cell-sub mono">{window.fmtNum(Math.round(cCost + boqNet))}</div></td>
        <td className="d-cell-sub">{anyExceeds ? (AR ? 'بانتظار لجنة تثبيت الأسعار' : 'Awaiting rate-fixing cttee') : ''}</td>
        {!ro && <td></td>}</tr></tfoot>
    </table></div>
  );

  const actTable = (ro) => (
    <div className={'d-vow-tw' + (ro ? '' : ' wide-act')}><table className="d-line-table"><thead><tr>
      {!ro && <th style={{ width: 34 }}><input type="checkbox" checked={aSel.length === aRows.length && aRows.length > 0} onChange={() => setASel(aSel.length === aRows.length ? [] : aRows.map(r => r.id))} /></th>}
      <th style={{ width: 80 }}>Activity ID</th><th style={{ minWidth: 190 }}>{AR ? 'اسم النشاط' : 'Activity Name'}</th>
      <th style={{ width: 96 }}>{AR ? 'البداية' : 'Start'}</th><th style={{ width: 96 }}>{AR ? 'النهاية' : 'Finish'}</th>
      <th style={{ width: 76 }}>{AR ? 'الإنجاز' : 'Progress'}</th><th style={{ width: 84 }}>{AR ? 'المتبقي' : 'Remaining'}</th>
      <th style={{ width: 190 }}>{AR ? 'نوع التغيير الزمني' : 'Schedule Change Type'}</th>
      <th style={{ width: 200 }}>{AR ? 'التغيير المقترح' : 'Proposed Change'}</th>
      <th style={{ width: 210 }}>{AR ? 'القيمة المعدلة' : 'Revised Value'}</th>
      <th style={{ width: 92 }}>{AR ? 'الأثر' : 'Impact'}</th>{!ro && <th style={{ width: 76 }}></th>}</tr></thead>
      <tbody>{aRows.map((r, i) => { const c = aCalc(r); const on = aSel.includes(r.id);
        const upd = o => setARows(rs => rs.map((x, j) => j === i ? { ...x, ...o } : x));
        return (<tr key={'a-' + r.id} className={!ro && on ? 'on' : ''}>
          {!ro && <td><input type="checkbox" checked={on} onChange={() => setASel(s => on ? s.filter(x => x !== r.id) : [...s, r.id])} /></td>}
          <td className="mono">{r.id}</td><td>{r.name}<div className="d-cell-sub">{r.status} · {r.crit}</div></td>
          <td className="mono">{r.start}</td><td className="mono">{r.finish}</td>
          <td className="mono">{r.pct}%</td><td className="mono">{r.remDur}</td>
          <td>{ro ? SCHG_L[r.chg] : selIn(r.chg, v => upd({ chg: v, days: '', startDate: '', finishDate: '' }), SCHG, 182, 'ac-' + r.id)}</td>
          <td>{ro ? <span className="mono">{r.chg === 'inc' || r.chg === 'dec' ? (Number(r.days) || 0) + (AR ? ' يوم' : 'd') : [r.startDate, r.finishDate].filter(Boolean).join(' · ') || '—'}</span> : aProposed(r, upd)}</td>
          <td className="mono">{c.startAfter} → {c.finishAfter}<div className="d-cell-sub mono">{AR ? 'المتبقي' : 'Remaining'} {r.remDur} → {c.remAfter}</div></td>
          <td className="mono">{(c.days > 0 ? '+' : '') + c.days}{AR ? ' يوم' : 'd'}</td>
          {!ro && <td><div className="d-vow-ac"><button className="d-icon-btn" onClick={() => setDetail(r)}><Icon name="info" size={15} /></button>
            <button className="d-icon-btn" onClick={() => { setARows(rs => rs.filter((_, j) => j !== i)); setASel(s => s.filter(x => x !== r.id)); }}><Icon name="delete" size={15} /></button></div></td>}
        </tr>); })}</tbody>
    </table></div>
  );

  // Hand the parent a clean payload so it can persist a real order.
  const makePayload = () => ({
    kind, justNote, inNo, inDate, ckey, cCost,
    party: PARTIES[party], boqNet, boqNetCon, daysReq,
    bRows: bRows.map(r => ({ code: r.code, desc: r.desc, unit: r.unit, qty: r.qty, price: r.price,
      chg: r.chg, delta: r.delta, deltaRe: r.deltaRe, tgt: r.tgt && r.tgt.code,
      transfers: (r.transfers || []).filter(t => t.from && t.to && (Number(t.qty) || 0) > 0)
        .map(t => ({ from: t.from, to: t.to, qty: Number(t.qty) || 0 })) })),
    aRows: aRows.map(r => ({ id: r.id, name: r.name, days: r.days, crit: r.crit, chg: r.chg })),
    files: files.slice(),
  });

  return (
    <React.Fragment>
      <input type="file" multiple ref={fileRef} onChange={addFiles} style={{ display: 'none' }} />
      {pick && <DVOMultiPick lang={lang} title={pick.title} hint={pick.hint} cols={pick.cols} rows={pick.rows}
        filters={pick.filters} taken={pick.taken} keyOf={pick.keyOf} onConfirm={onConfirmPick} onClose={() => setPick(null)} />}
      {detail && <DVODetailPanel lang={lang} row={detail} onClose={() => setDetail(null)} />}

      <div className="d-modal-scrim" onClick={onClose}>
        <div className="d-modal xl" onClick={e => e.stopPropagation()}>
          <div className="d-modal-head"><b>{AR ? 'إنشاء أمر تغييري' : 'Create change order'}</b><button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
          <div className="d-stepper icons">{STEPS.map((s, i) => (
            <button key={i} className={'d-step' + (i === step ? ' on' : '') + (i < step ? ' done' : '') + (stepDone[i] && i !== step ? ' ok' : '')} onClick={() => visit(i)}>
              <span className="n">{(i < step || (stepDone[i] && i !== step)) ? <Icon name="check" size={13} /> : <Icon name={s[1]} size={14} />}</span>
              <span className="l">{s[0]}</span></button>))}</div>
          <div className="d-vow-ctx">
            <span className="k">{AR ? 'العقد المرتبط' : 'Linked contract'}</span>
            <span className="mono">{(ct && ct.code) || (AR ? '— لم يُحدَّد —' : '— not selected —')}</span><b>{cName}</b>
            <span className="d-vow-ctx-v mono">{window.fmtNum(cCost)} IQD</span>
            <span className="d-pill">{AR ? 'للقراءة فقط' : 'Read-only'}</span>
          </div>

          <div className="d-modal-body">
            <h2 className="d-vow-title">{STEPS[step][0]}</h2>

            {step === 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
              <div>
                {secH('assignment', AR ? 'العقد' : 'Contract')}
                <div className="d-form-grid" style={{ gap: '0 32px' }}>
                  <div className="d-form-field"><label>{AR ? 'اختر العقد' : 'Select contract'}</label>
                    <select className="d-form-input" value={ckey || ''}
                      onChange={e => { setCkey(e.target.value || null); setBRows([]); setARows([]); setBSel([]); setASel([]); }}>
                      <option value="">{AR ? '— اختر عقداً —' : '— select a contract —'}</option>
                      {cList.map(c => <option key={c.key || 'main'} value={c.key || 'main'}>{c.code} — {c.name}</option>)}
                    </select></div>
                  {ct && <div className="d-form-i"><span className="k">{AR ? 'قيمة العقد الحالية' : 'Current contract value'}</span><span className="v mono">{window.fmtNum(cCost)}</span></div>}
                  {ct && <div className="d-form-i"><span className="k">{AR ? 'حالة العقد' : 'Contract status'}</span><span className="v">{window.ctStatusLabel(ct.status, lang)}</span></div>}
                </div>
                <DMsgBar tone="info" icon="lock">{AR ? 'تُعرض بنود الكميات والأنشطة التابعة لهذا العقد فقط، ولا يجوز أن يشمل الأمر التغييري عقوداً مختلفة. أي تغيير مالي معتمد يُحدِّث هذا العقد، ثم يُعاد احتساب قيمة المشروع كمجموع عقوده.' : 'Only this contract’s BOQ items and activities are offered; a change order may never span contracts. An approved financial change updates this contract, then the project total is recalculated as the sum of its contracts.'}</DMsgBar>
              </div>
              <div>
                {secH('engineering', AR ? 'نوع الأمر التغييري' : 'Change-order type')}
                <div className="d-vow-types">{KINDS.map(o => (
                  <button key={o[0]} className={'d-vow-type' + (kind === o[0] ? ' on' : '')} onClick={() => setKind(o[0])}>
                    <Icon name={o[2]} size={17} /><b>{o[1]}</b>{kind === o[0] && <Icon name="check" size={15} />}</button>))}</div>
              </div>
              <div>
                {secH('verified_user', AR ? 'الأسباب الموجبة' : 'Justification')}
                <div className="d-form-field">
                  <textarea className="d-form-input" rows={4} value={justNote} onChange={e => setJustNote(e.target.value)}
                    placeholder={AR ? 'اكتب الأسباب الموجبة للأمر التغييري' : 'State the justification for this change order'}></textarea></div>
              </div>
              <div>
                {secH('description', AR ? 'الكتاب الرسمي' : 'Official letter')}
                <div className="d-form-grid" style={{ gap: '0 32px' }}>
                  <div className="d-form-field"><label>{AR ? 'الجهة' : 'Party'}</label>
                    <select className="d-form-input" value={party} onChange={e => setParty(Number(e.target.value))}>{PARTIES.map((r, i) => <option key={i} value={i}>{r}</option>)}</select></div>
                  <div className="d-form-field"><label>{AR ? 'رقم الوارد' : 'Incoming no.'}</label>
                    <input className="d-form-input mono" value={inNo} onChange={e => setInNo(e.target.value)} /></div>
                  <div className="d-form-field"><label>{AR ? 'تاريخ الوارد' : 'Incoming date'}</label>
                    <input className="d-form-input mono" value={inDate} onChange={e => setInDate(e.target.value)} /></div>
                </div>
              </div>
            </div>}

            {step === 1 && !ckey && <div className="d-vow-empty"><Icon name="description" size={22} /><b>{AR ? 'اختر العقد أولاً' : 'Select the contract first'}</b>
              <span className="d-cell-sub">{AR ? 'تُستنتج البنود والأنشطة من العقد المحدد.' : 'Items and activities are derived from the selected contract.'}</span></div>}
            {step === 1 && ckey && <div>
              {!isSupply && <DMsgBar tone="info" icon="payments">{AR ? 'قاعدة 20%: تغيير الكمية بالزيادة أو النقصان حتى 20% من الكمية الأصلية يُحتسب بسعر الوحدة الأصلي. الكمية الزائدة عن ذلك تُسعَّر بسعر جديد يقترحه المقاول ودائرة المهندس المقيم، ويُثبَّت السعر النهائي بقرار لجنة تثبيت الأسعار.' : 'The 20% rule: a quantity increase or decrease up to 20% of the original quantity is valued at the original unit rate. Anything beyond that is priced at a new rate proposed by the contractor and the resident engineer’s department, and fixed by the rate-fixing committee.'}</DMsgBar>}
              {isSupply && <DMsgBar tone="info" icon="inventory_2">{AR ? 'أسعار الفقرات التجهيزية مثبَّتة بالعقد وخطاب الاعتماد المستندي، فلا تنطبق قاعدة الـ20% ولا لجنة تثبيت الأسعار. تُراجَع مقترحات المجهز من قبل لجنة الفحص والاستلام قبل رفعها للجنة أوامر الغيار.' : 'Supply-item prices are fixed by the contract and the letter of credit, so the 20% rule and the rate-fixing committee do not apply. The supplier’s proposals are reviewed by the inspection & receipt committee before the change-order committee.'}</DMsgBar>}
              <div className="d-vow-tabs">
                <button className={'d-vow-tab' + (tab === 'boq' ? ' on' : '')} onClick={() => setTab('boq')}>
                  <Icon name="list_alt" size={15} />{isSupply ? (AR ? 'الفقرات التجهيزية' : 'Supply items') : (AR ? 'بنود جدول الكميات' : 'BOQ Items')}<span className="n">{bRows.length}</span></button>
                <button className={'d-vow-tab' + (tab === 'act' ? ' on' : '')} onClick={() => setTab('act')}>
                  <Icon name="calendar_month" size={15} />{AR ? 'الأنشطة' : 'Activities'}<span className="n">{aRows.length}</span></button>
                <div style={{ flex: 1 }}></div>
                {tab === 'boq'
                  ? <button className="d-btn primary" onClick={() => setPick(boqPickSpec())}><Icon name="add" size={15} />{AR ? 'اختيار بنود' : 'Select items'}</button>
                  : <button className="d-btn primary" onClick={() => setPick(actPickSpec)}><Icon name="add" size={15} />{AR ? 'اختيار أنشطة' : 'Select activities'}</button>}
              </div>
              {tab === 'boq' && (bRows.length ? boqTable(false)
                : <div className="d-vow-empty"><Icon name="list_alt" size={22} /><b>{AR ? 'لا بنود مختارة' : 'No items selected'}</b>
                  <span className="d-cell-sub">{AR ? 'بحث وفلاتر بالكود والقسم والتصنيف والحالة — يمكن اختيار عدة بنود دفعة واحدة' : 'Search and filter by code, division, category and status — multiple items at once'}</span></div>)}
              {tab === 'act' && (aRows.length ? <React.Fragment>{actTable(false)}
                <DMsgBar tone="info" icon="account_tree">{AR ? 'تعديل مدة النشاط لا يُعد تعديلاً لمدة المشروع. يُحدَّد الأثر النهائي على المسار الحرج وتاريخ النهاية في مرحلة تحليل الجدول.' : 'An activity duration change is not a project duration change. Final impact on the critical path and finish date is determined during Schedule Analysis.'}</DMsgBar>
              </React.Fragment>
                : <div className="d-vow-empty"><Icon name="calendar_month" size={22} /><b>{AR ? 'لا أنشطة مختارة' : 'No activities selected'}</b>
                  <span className="d-cell-sub">{AR ? 'بحث وفلاتر بالحالة والجهة المسؤولة والمسار الحرج — يمكن اختيار عدة أنشطة' : 'Search and filter by status, responsible party and critical path — multiple activities at once'}</span></div>)}
            </div>}

            {step === 2 && <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              <div className="d-form-grid">
                {kv(AR ? 'البنود المختارة' : 'Selected BOQs', bRows.length, true)}
                {kv(AR ? 'الأنشطة المختارة' : 'Selected Activities', aRows.length, true)}
                {kv(AR ? 'قيمة العقد الحالية' : 'Current Contract Value', window.fmtNum(cCost), true)}
                {kv((AR ? 'مقترح ' : '') + requesterLabel + (AR ? '' : ' proposal'), (boqNetCon > 0 ? '+' : '') + window.fmtNum(Math.round(boqNetCon)), true)}
                {kv((AR ? 'مقترح ' : '') + reviewerLabel + (AR ? '' : ' proposal'), (boqNet > 0 ? '+' : '') + window.fmtNum(Math.round(boqNet)), true)}
                {!isSupply && kv(AR ? 'بنود تجاوزت 20%' : 'Lines beyond 20%', bRows.filter(r => bCalc(r).exceeds).length, true)}
                {!isSupply && kv(AR ? 'سعر الكمية الزائدة' : 'Excess-quantity rate', anyExceeds ? (AR ? 'يُثبَّت بلجنة تثبيت الأسعار' : 'Fixed by the rate-fixing committee') : (AR ? 'لا ينطبق' : 'Not applicable'))}
                {kv(AR ? 'القيمة المعتمدة (لجنة التسعير)' : 'Approved value (pricing cttee)', AR ? 'يُحدَّد في التدقيق المالي' : 'Set at financial review')}
                {kv(AR ? 'قيمة العقد المعدلة (تقديرية)' : 'Revised Contract Value (indicative)', window.fmtNum(Math.round(cCost + boqNet)), true)}
                {kv(AR ? 'الأثر الزمني المطلوب' : 'Requested Time Impact', daysReq + (AR ? ' يوم' : ' days'), true)}
              </div>
              {bRows.length > 0 && <div className="d-vow-inline"><Icon name="difference" size={14} />
                {AR ? 'أثر أوزان البنود: تغيّر تراكمي ' : 'BOQ weight impact: cumulative shift of '}<b className="mono">{wDelta.toFixed(2)}%</b>
                {AR ? ' على ' : ' across '}<b className="mono">{bRows.length}</b>{AR ? ' بند — تُعاد الأوزان بعد الاعتماد النهائي.' : ' items — weights are recalculated after final approval.'}</div>}
              {(bRows.length > 0 || aRows.length > 0) ? <div>
                {secH('difference', AR ? 'ملخص التغييرات' : 'Change summary')}
                <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
                  <th style={{ width: 110 }}>{AR ? 'العنصر' : 'Item'}</th><th style={{ width: 120 }}>{AR ? 'نوع العنصر' : 'Item Type'}</th>
                  <th style={{ minWidth: 180 }}>{AR ? 'نوع التغيير' : 'Change Type'}</th>
                  <th style={{ width: 170 }}>{AR ? 'القيمة الحالية' : 'Current Value'}</th>
                  <th style={{ width: 170 }}>{AR ? 'القيمة المقترحة' : 'Proposed Value'}</th>
                  <th style={{ width: 130 }}>{AR ? 'الأثر' : 'Impact'}</th></tr></thead>
                  <tbody>
                    {bRows.map((r, i) => { const c = bCalc(r); const isR = r.chg === 'rate'; return (
                      <tr key={'sb' + i}><td className="mono">{r.code}</td><td>{AR ? 'بند كميات' : 'BOQ item'}</td><td>{CHG_L[r.chg]}</td>
                        <td className="mono">{isR ? window.fmtNum(r.price) : window.fmtNum(r.qty)}</td>
                        <td className="mono">{isR ? window.fmtNum(c.priceAfter) : window.fmtNum(c.qtyAfter)}</td>
                        <td className="mono">{(c.diff > 0 ? '+' : '') + window.fmtNum(Math.round(c.diff))}</td></tr>); })}
                    {aRows.map((r, i) => { const c = aCalc(r); return (
                      <tr key={'sa' + i}><td className="mono">{r.id}</td><td>{AR ? 'نشاط' : 'Activity'}</td><td>{SCHG_L[r.chg]}</td>
                        <td className="mono">{r.start} → {r.finish}</td><td className="mono">{c.startAfter} → {c.finishAfter}</td>
                        <td className="mono">{(c.days > 0 ? '+' : '') + c.days}{AR ? ' يوم' : 'd'}</td></tr>); })}
                  </tbody></table></div>
              </div> : <div className="d-vow-empty"><Icon name="difference" size={22} /><b>{AR ? 'لا عناصر متأثرة بعد' : 'No affected items yet'}</b>
                <span className="d-cell-sub">{AR ? 'ارجع للخطوة السابقة وأضف البنود أو الأنشطة' : 'Go back a step and add items or activities'}</span></div>}
            </div>}

            {step === 3 && <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="d-drop" onClick={() => fileRef.current && fileRef.current.click()} style={{ cursor: 'pointer' }}>
                <Icon name="upload_file" size={30} /><b>{AR ? 'أرفق المستندات الداعمة' : 'Attach supporting documents'}</b>
                <span className="d-cell-sub">{AR ? 'يمكن رفع أكثر من ملف — PDF / Excel / صور' : 'Multiple files — PDF / Excel / images'}</span>
              </div>
              {files.length > 0 && <table className="d-line-table"><thead><tr>
                <th style={{ minWidth: 220 }}>{AR ? 'اسم الملف' : 'File Name'}</th><th style={{ width: 220 }}>{AR ? 'التصنيف' : 'Category'}</th>
                <th style={{ width: 100 }}>{AR ? 'الحجم' : 'Size'}</th><th style={{ width: 60 }}></th></tr></thead>
                <tbody>{files.map((f, i) => (
                  <tr key={i}><td className="mono">{f.name}</td>
                    <td>{selIn(String(f.cat), v => setFiles(fs => fs.map((x, j) => j === i ? { ...x, cat: Number(v) } : x)), CATS.map((c, j) => [String(j), c]), 200, 'f-' + i)}</td>
                    <td className="mono">{f.size}</td>
                    <td><button className="d-icon-btn" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}><Icon name="delete" size={15} /></button></td></tr>))}</tbody></table>}
            </div>}

            {step === 4 && <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
              <div>
                {secH('description', AR ? 'معلومات الأمر التغييري' : 'Change Order Information')}
                <div className="d-form-grid">
                  {kv(AR ? 'النوع' : 'Type', (KINDS.find(k => k[0] === kind) || [])[1])}
                {kv(AR ? 'الأسباب الموجبة' : 'Justification', justNote.trim() || '—')}
                  {kv(AR ? 'العقد' : 'Contract', (contract && contract.code) || '—', true)}
                  {kv(AR ? 'الجهة' : 'Party', PARTIES[party])}
                  {kv(AR ? 'رقم وتاريخ الوارد' : 'Incoming no. & date', inNo + ' · ' + inDate, true)}
                </div>
              </div>
              <div>
                {secH('list_alt', (AR ? 'البنود المختارة' : 'Selected BOQs') + ' (' + bRows.length + ')')}
                {bRows.length ? boqTable(true) : <div className="d-cell-sub">{AR ? 'لا بنود متأثرة' : 'None'}</div>}
              </div>
              <div>
                {secH('calendar_month', (AR ? 'الأنشطة المختارة' : 'Selected Activities') + ' (' + aRows.length + ')')}
                {aRows.length ? actTable(true) : <div className="d-cell-sub">{AR ? 'لا أنشطة متأثرة' : 'None'}</div>}
              </div>
              <div>
                {blockers.length > 0 && <DMsgBar tone="warning" icon="warning">{AR ? 'يجب تصحيح ما يلي قبل الإرسال للمراجعة: ' : 'Resolve the following before submitting: '}
                    {blockers.map(b => b.code + ' — ' + b.msg).join(' · ')}</DMsgBar>}
                {secH('payments', AR ? 'الأثر المالي والزمني' : 'Financial & time impact')}
                <div className="d-form-grid">
                  {kv((AR ? 'مقترح ' : '') + requesterLabel + (AR ? '' : ' proposal'), (boqNetCon > 0 ? '+' : '') + window.fmtNum(Math.round(boqNetCon)), true)}
                  {kv((AR ? 'مقترح ' : '') + reviewerLabel + (AR ? '' : ' proposal'), (boqNet > 0 ? '+' : '') + window.fmtNum(Math.round(boqNet)), true)}
                  {kv(AR ? 'القيمة المعتمدة (لجنة التسعير)' : 'Approved (pricing cttee)', AR ? 'يُحدَّد في التدقيق المالي' : 'Set at financial review')}
                  {kv(AR ? 'قيمة العقد قبل' : 'Contract value before', window.fmtNum(cCost), true)}
                  {kv(AR ? 'قيمة العقد بعد (تقديرية)' : 'Contract value after (indicative)', window.fmtNum(Math.round(cCost + boqNet)), true)}
                  {kv(AR ? 'الأثر الزمني' : 'Time impact', daysReq + (AR ? ' يوم' : ' days'), true)}
                </div>
              </div>
              <div>
                {secH('attach_file', (AR ? 'المرفقات' : 'Attachments') + ' (' + files.length + ')')}
                {files.length ? <table className="d-line-table"><thead><tr>
                  <th style={{ minWidth: 220 }}>{AR ? 'اسم الملف' : 'File Name'}</th><th style={{ width: 220 }}>{AR ? 'التصنيف' : 'Category'}</th>
                  <th style={{ width: 100 }}>{AR ? 'الحجم' : 'Size'}</th></tr></thead>
                  <tbody>{files.map((f, i) => <tr key={i}><td className="mono">{f.name}</td><td>{CATS[f.cat]}</td><td className="mono">{f.size}</td></tr>)}</tbody></table>
                  : <div className="d-cell-sub">{AR ? 'لا مرفقات' : 'None'}</div>}
              </div>
              <div>
                {secH('verified_user', AR ? 'مسار الاعتماد المتوقع' : 'Expected approval path')}
                <ol className="d-vow-tl">{path.map((s, i) => (
                  <li key={i} className={i === 0 ? 'on' : ''}><span className="ic"><Icon name={s[1]} size={15} /></span>
                    <span className="tx"><b>{s[0]}</b>{s[2] && <span className="d-cell-sub">{s[2]}</span>}</span></li>))}</ol>
              </div>
              <DMsgBar tone="info" icon="lock">{AR ? 'لا يُطبَّق أي تعديل على العقد أو جدول الكميات أو الجدول الزمني قبل اكتمال المراجعة والاعتماد النهائي.' : 'No change is applied to the contract, BOQ or schedule before the workflow completes and final endorsement is granted.'}</DMsgBar>
            </div>}
          </div>

          <div className="d-modal-foot">
            {step > 0 && <button className="d-btn" onClick={() => visit(step - 1)}><Icon name={AR ? 'chevron_right' : 'chevron_left'} size={16} />{AR ? 'السابق' : 'Back'}</button>}
            <div style={{ flex: 1 }}></div>
            {step < STEPS.length - 1 ? <button className="d-btn primary" disabled={step === 0 && !ckey} onClick={() => visit(step + 1)}>{AR ? 'التالي' : 'Next'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={16} /></button>
              : <React.Fragment>
                {blockers.length > 0 && <span className="d-vow-block"><Icon name="warning" size={15} />
                  {AR ? 'لا يمكن الإرسال: ' : 'Cannot submit: '}{blockers.length}{AR ? ' مخالفة تحقّق' : ' validation issue(s)'}</span>}
                <button className="d-btn" onClick={() => (onDraft || onDone)(makePayload())}><Icon name="save" size={16} />{AR ? 'حفظ كمسودة' : 'Save as Draft'}</button>
                <button className="d-btn primary" disabled={!canSubmit} aria-disabled={!canSubmit}
                  title={canSubmit ? '' : (AR ? 'صحّح المخالفات قبل الإرسال' : 'Resolve the validation issues first')}
                  onClick={() => canSubmit && onDone(makePayload())}><Icon name="arrow_forward" size={16} />{AR ? 'إرسال للمراجعة' : 'Submit for Review'}</button>
              </React.Fragment>}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { DVOCreateWizard });
