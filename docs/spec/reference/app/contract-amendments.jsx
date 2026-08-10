// Contract amendments driven by change orders.
//
// An approved change order does not itself change the contract — APPLYING it does.
// So the contract is versioned: العقد الأصلي plus one ملحق per applied order. The
// last applied version is the effective contract; approved-but-unapplied orders are
// listed as pending and never folded into the effective figures.
//
// Applying an order also moves quantities, activities and the penalty baseline:
//   value    → revised contract value      (delay penalty per day is a % of it)
//   duration → revised contractual finish  (delay days are measured against it)
//   BOQ      → approved quantities/rates become the effective quantities
//   schedule → approved activity dates become the effective dates

const PENALTY = { rate: 0.001, capPct: 10 };   // 0.1%/day of contract value, capped at 10%

const AMD_STATE = {
  original: { ar: 'العقد الأصلي', en: 'Original contract', cls: '' },
  superseded: { ar: 'مُستبدَل', en: 'Superseded', cls: '' },
  effective: { ar: 'النافذ', en: 'Effective', cls: 'completed' },
  pending: { ar: 'معتمد — بانتظار التطبيق', en: 'Approved — awaiting application', cls: 'suspended' },
  partial: { ar: 'قيد التطبيق', en: 'Applying', cls: 'ongoing' },
};

const addDays = (iso, n) => { const x = new Date(iso); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const dayDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);

// a change order belongs to the contract its affected BOQ lines belong to
function voContractKey(v, contracts) {
  const first = (v.affectedBOQ || [])[0];
  if (!first || !window.contractKeyOfBoq) return (contracts && contracts[0] && contracts[0].key) || 'main';
  return window.contractKeyOfBoq({ code: first.code }, contracts);
}

// delay penalty at a given contract value against a given contractual finish
function penaltyOf(value, contractualFinish, forecastFinish) {
  const days = Math.max(0, dayDiff(forecastFinish, contractualFinish));
  const perDay = Math.round(value * PENALTY.rate);
  const cap = Math.round(value * PENALTY.capPct / 100);
  const gross = perDay * days;
  return { days, perDay, cap, amount: Math.min(gross, cap), capped: gross > cap };
}

function contractAmendments(c, d, lang, p) {
  const AR = lang === 'ar';
  const contracts = d.contracts || [];
  const raw = c.raw || {};
  const origValue = raw.contractCost || 0;
  // dates come from the same builder the schedule, wizard and VO record use —
  // reading them off c.raw put contract dates (2021→2023) and activity dates
  // (2026) in the same table
  const sd = p && window.EPM && window.EPM.buildScheduleData ? window.EPM.buildScheduleData(p, lang) : null;
  const origFinish = (sd && sd.baselineFinish) || raw.finish;
  const origStart = (sd && sd.origin) || raw.start;
  const origDuration = origStart && origFinish ? Math.max(1, dayDiff(origFinish, origStart)) : 0;
  const forecastFinish = (sd && sd.forecastFinish) || raw.finish;

  // only this contract's orders, oldest first
  const all = (d.variationOrders || []);
  const mine = all.map((v, i) => ({ v, i }))
    .filter(x => voContractKey(x.v, contracts) === c.key)
    .sort((a, b) => String(a.v.inDate).localeCompare(String(b.v.inDate)));

  const versions = [{
    no: 0, label: AR ? 'العقد الأصلي' : 'Original contract', source: null,
    date: origStart, value: origValue, duration: origDuration, finish: origFinish,
    dValue: 0, dDays: 0, state: 'original', boqCount: 0, actCount: 0,
  }];
  const pending = [];
  let value = origValue, finish = origFinish, duration = origDuration;

  mine.forEach(({ v, i }) => {
    if (v.status !== 'approved') return;
    const rec = window.voRecord ? window.voRecord(v, d, lang, i, p) : null;
    const dv = rec && rec.appValue != null ? rec.appValue : v.net;
    const dd = rec && rec.appDays != null ? rec.appDays : (v.appExt || 0);
    const applied = rec ? rec.appliedAll : false;
    const row = {
      no: versions.length, label: (AR ? 'ملحق عقد رقم ' : 'Amendment no. ') + versions.length,
      source: v.no, sourceTitle: v.reason, date: v.date || v.inDate,
      dValue: dv, dDays: dd,
      value: value + dv, duration: duration + dd, finish: addDays(finish, dd),
      boqCount: rec ? rec.lines.length : (v.affectedBOQ || []).length,
      actCount: rec ? rec.activities.length : (v.affectedActivities || []).length,
      state: applied ? 'effective' : (rec && rec.lifecycle === 'applied_partial' ? 'partial' : 'pending'),
      lines: rec ? rec.lines : [], activities: rec ? rec.activities : [],
    };
    if (applied) { value = row.value; finish = row.finish; duration = row.duration; versions.push(row); }
    else pending.push(row);
  });
  versions.forEach((x, k) => { if (x.state === 'effective' && k < versions.length - 1) x.state = 'superseded'; });
  if (versions.length > 1) versions[versions.length - 1].state = 'effective';

  const effective = versions[versions.length - 1];
  // what the contract would become if every approved-but-unapplied order were applied
  const projected = pending.reduce((a, x) => ({ value: a.value + x.dValue, days: a.days + x.dDays }), { value, days: 0 });

  const before = penaltyOf(origValue, origFinish, forecastFinish);
  const after = penaltyOf(effective.value, effective.finish, forecastFinish);

  // effective quantity / activity changes, from applied amendments only
  const boqEffect = [];
  const actEffect = [];
  versions.slice(1).forEach(x => {
    (x.lines || []).forEach(l => boqEffect.push({ ...l, src: x.source, amd: x.label }));
    (x.activities || []).forEach(a => actEffect.push({ ...a, src: x.source, amd: x.label }));
  });

  return { versions, effective, original: versions[0], pending, projected, forecastFinish,
    penalty: { before, after, waived: before.amount - after.amount, rate: PENALTY.rate, capPct: PENALTY.capPct },
    boqEffect, actEffect, orders: mine.map(x => x.v) };
}

// Every approved order, indexed by BOQ code and activity id, so the BOQ register
// and the schedule can show the EFFECTIVE figure without losing the original.
// Applied orders move the effective value; approved-but-unapplied ones are pending.
function amendmentIndex(d, lang, p) {
  const boq = {}, acts = {};
  (d.variationOrders || []).forEach((v, i) => {
    if (v.status !== 'approved' || !window.voRecord) return;
    const rec = window.voRecord(v, d, lang, i, p);
    const applied = rec.appliedAll;
    (rec.lines || []).forEach(l => {
      const to = l.qtyApproved != null ? l.qtyApproved : l.qtyProposed;
      // several orders can hit the same item — each applies to the RUNNING
      // effective figure and appends its own bands; the chain is the history
      const e = boq[l.code] || (boq[l.code] = { orig: l.qtyBefore, eff: l.qtyBefore,
        pendingQty: null, applied: false, srcs: [], chain: [],
        bands: [{ qty: l.qtyBefore, rate: l.rate, kind: 'base', src: null }],
        effValue: l.valBefore, effRate: l.rate, banded: false });
      const t = l.app || l.re || null;        // approved tier split, else د.م.م's
      const dQty = to - l.qtyBefore;
      const dVal = Math.round(l.valAfter - l.valBefore);
      if (applied) {
        const qFrom = e.eff, vFrom = e.effValue;
        e.eff = qFrom + dQty; e.effValue = vFrom + dVal; e.applied = true;
        if (t && Math.abs(t.at) > 0.001) e.bands.push({ qty: t.at, rate: l.rate, kind: 'tier', src: v.no, thr: t.thr });
        if (t && t.exceeds) e.bands.push({ qty: t.ex, rate: t.exRate, kind: 'excess', src: v.no, thr: t.thr });
        e.effRate = e.eff ? Math.round(e.effValue / e.eff) : l.rate;
        e.banded = e.bands.some(b => b.rate !== l.rate);
        e.chain.push({ no: v.no, date: v.date || v.inDate, applied: true,
          qtyFrom: qFrom, qtyTo: e.eff, valFrom: vFrom, valTo: e.effValue,
          exQty: t && t.exceeds ? t.ex : 0, exRate: t && t.exceeds ? t.exRate : null });
      } else {
        e.pendingQty = e.eff + dQty;
        e.chain.push({ no: v.no, date: v.date || v.inDate, applied: false,
          qtyFrom: e.eff, qtyTo: e.eff + dQty, valFrom: e.effValue, valTo: e.effValue + dVal,
          exQty: t && t.exceeds ? t.ex : 0, exRate: t && t.exceeds ? t.exRate : null });
      }
      e.srcs.push({ no: v.no, applied, from: l.qtyBefore, to,
        rate: l.rateApproved != null ? l.rateApproved : l.rate,
        weight: l.wApplied != null ? l.wApplied : l.wApproved, value: l.valAfter });
    });
    (rec.activities || []).forEach(a => {
      const rem = a.remApproved != null ? a.remApproved : a.remProposed;
      const e = acts[a.id] || (acts[a.id] = { origRem: a.remBefore, effRem: a.remBefore,
        origFinish: a.finishBefore, effFinish: a.finishBefore, pendingRem: null, applied: false, srcs: [], chain: [] });
      const dDays = rem - a.remBefore;
      if (applied) {
        const from = e.effRem, fFrom = e.effFinish;
        e.effRem = from + dDays; e.applied = true;
        e.effFinish = addDays(fFrom, dDays);
        e.chain.push({ no: v.no, date: v.date || v.inDate, applied: true, remFrom: from, remTo: e.effRem, finishFrom: fFrom, finishTo: e.effFinish });
      } else {
        e.pendingRem = e.effRem + dDays;
        e.chain.push({ no: v.no, date: v.date || v.inDate, applied: false,
          remFrom: e.effRem, remTo: e.effRem + dDays, finishFrom: e.effFinish, finishTo: addDays(e.effFinish, dDays) });
      }
      e.srcs.push({ no: v.no, applied, remFrom: a.remBefore, remTo: rem, finishFrom: a.finishBefore, finishTo: a.finishApproved });
    });
  });
  return { boq, acts };
}

// the badge both registers use to mark an amended row
function DAmdMark({ lang, e, onOpen }) {
  const AR = lang === 'ar';
  if (!e || !e.srcs.length) return null;
  const n = e.srcs.length, np = e.srcs.filter(s => !s.applied).length;
  const state = np === 0 ? 'on' : np === n ? 'pend' : 'mix';
  const title = e.srcs.map(s => s.no + (s.applied ? (AR ? ' — نافذ' : ' — effective') : (AR ? ' — بانتظار التطبيق' : ' — pending'))).join(' · ');
  const Tag = onOpen ? 'button' : 'span';
  return <Tag className={'d-amd-mark ' + state} title={title} onClick={onOpen ? (ev => { ev.stopPropagation(); onOpen(); }) : undefined}>
    <Icon name="history" size={11} />{n}
    {state === 'mix' && <i className="dot" />}
  </Tag>;
}

// a compact signed delta for a register cell — colour follows settled vs pending
function DAmdDelta({ lang, from, to, pending, unit }) {
  const AR = lang === 'ar';
  const d = to - from;
  if (!d) return null;
  return <span className={'d-amd-delta' + (pending ? ' pend' : '')}>
    {(d > 0 ? '+' : '') + window.fmtNum(Math.round(d * 100) / 100)}{unit ? ' ' + unit : ''}
    {pending ? <em>{AR ? ' معلّق' : ' pending'}</em> : null}</span>;
}

// the rate bands of one amended item — quantity at the original rate, and the
// portion beyond the 20% tier at the rate fixed by لجنة تثبيت الأسعار
function DAmdBands({ lang, e, unit }) {
  const AR = lang === 'ar';
  if (!e || !e.bands) return null;
  const L = { base: AR ? 'الكمية التعاقدية' : 'Contracted quantity',
    tier: AR ? 'ضمن 20% — بالسعر الأصلي' : 'Within 20% — original rate',
    excess: AR ? 'ما يزيد على 20% — سعر جديد' : 'Beyond 20% — new rate' };
  return (
    <div className="d-amd-bands">
      {e.bands.map((b, k) => (
        <div key={k} className={'bd' + (b.kind === 'excess' ? ' ex' : '')}>
          <span className="l">{L[b.kind]}{b.src ? <em className="mono"> {b.src}</em> : null}</span>
          <span className="mono q">{window.fmtNum(Math.round(b.qty * 100) / 100)} {unit}</span>
          <span className="mono r">× {window.fmtNum(b.rate)}</span>
          <span className="mono a">{window.fmtNum(Math.round(b.qty * b.rate))}</span>
        </div>))}
      <div className="bd tot">
        <span className="l">{AR ? 'السعر المكافئ للوحدة' : 'Blended unit rate'}</span>
        <span className="mono q">{window.fmtNum(Math.round(e.eff * 100) / 100)} {unit}</span>
        <span className="mono r">× {window.fmtNum(e.effRate)}</span>
        <span className="mono a">{window.fmtNum(e.effValue)}</span>
      </div>
    </div>);
}

// One panel answers "how was this amended?" for a BOQ item or an activity, so
// the register cells can stay a single number and the three tabs stop each
// inventing their own disclosure.
function DAmdPanel({ lang, e, kind, code, name, unit, onClose }) {
  const AR = lang === 'ar';
  if (!e) return null;
  const isBoq = kind === 'boq';
  const F = (k, v, mono, sub) => <div className="d-form-i"><span className="k">{k}</span>
    <span className={'v' + (mono ? ' mono' : '')}>{v}</span>{sub ? <span className="d-cell-sub">{sub}</span> : null}</div>;
  const applied = e.chain.filter(x => x.applied), pend = e.chain.filter(x => !x.applied);
  const sign = n => (n > 0 ? '+' : '') + window.fmtNum(Math.round(n));
  const step = (x, k) => (
    <div key={k} className={'d-amd-step' + (x.applied ? '' : ' pend')}>
      <span className="no mono">{x.no}</span>
      <span className="dt d-cell-sub mono">{x.date}</span>
      <span className="fig mono">{isBoq
        ? window.fmtNum(Math.round(x.qtyFrom)) + ' → ' + window.fmtNum(Math.round(x.qtyTo)) + ' ' + (unit || '')
        : x.remFrom + ' → ' + x.remTo + (AR ? ' يوم' : 'd')}</span>
      <span className="sec mono d-cell-sub">{isBoq ? sign(x.valTo - x.valFrom) : x.finishFrom + ' → ' + x.finishTo}</span>
      {x.exQty > 0 ? <span className="d-pill suspended">{AR ? 'سعر جديد ' : 'new rate '}{window.fmtNum(x.exRate)}</span> : null}
    </div>);
  return (
    <React.Fragment>
      <div className="d-drawer-scrim" onClick={onClose}></div>
      <div className="d-drawer wide">
        <div className="d-drawer-head"><div className="tx"><b>{name}</b><span className="mono">{code}</span></div>
          <button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-drawer-body">
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'الوضع النافذ' : 'Effective now'}</span>
            <div className="d-form-grid">
              {isBoq ? <React.Fragment>
                {F(AR ? 'الكمية الأصلية' : 'Original quantity', window.fmtNum(e.orig) + ' ' + (unit || ''), true)}
                {F(AR ? 'الكمية النافذة' : 'Effective quantity', window.fmtNum(Math.round(e.eff)) + ' ' + (unit || ''), true, sign(e.eff - e.orig))}
                {F(AR ? 'القيمة النافذة' : 'Effective value', window.fmtNum(e.effValue), true)}
                {F(AR ? 'السعر المكافئ' : 'Blended rate', window.fmtNum(e.effRate), true,
                  e.banded ? (AR ? 'أكثر من سعر واحد' : 'more than one rate') : null)}
              </React.Fragment> : <React.Fragment>
                {F(AR ? 'المتبقي الأصلي' : 'Original remaining', e.origRem + (AR ? ' يوم' : 'd'), true)}
                {F(AR ? 'المتبقي النافذ' : 'Effective remaining', e.effRem + (AR ? ' يوم' : 'd'), true, sign(e.effRem - e.origRem))}
                {F(AR ? 'النهاية قبل التعديل' : 'Finish before', e.origFinish, true)}
                {F(AR ? 'النهاية النافذة' : 'Effective finish', e.effFinish, true)}
              </React.Fragment>}
            </div></div>

          <div className="d-drawer-grp"><span className="lbl">{AR ? 'تسلسل التعديلات المطبَّقة' : 'Applied amendments'}</span>
            <div className="d-amd-steps">{applied.length ? applied.map(step)
              : <div className="d-cell-sub">{AR ? 'لا تعديلات مطبَّقة.' : 'None applied.'}</div>}</div></div>

          {pend.length > 0 && <div className="d-drawer-grp"><span className="lbl">{AR ? 'معتمدة بانتظار التطبيق' : 'Approved, awaiting application'}</span>
            <div className="d-amd-steps">{pend.map(step)}</div>
            <div className="d-vow-note warn" style={{ marginTop: 8 }}><Icon name="warning" size={15} />
              <span>{AR ? 'لم تُدرج في الأرقام النافذة — تُطبَّق بعد إصدار ملحق العقد.' : 'Excluded from the effective figures — applied once the contract amendment issues.'}</span></div></div>}

          {isBoq && e.banded && <div className="d-drawer-grp"><span className="lbl">{AR ? 'تفصيل الأسعار' : 'Rate breakdown'}</span>
            <DAmdBands lang={lang} e={e} unit={unit} />
            <div className="d-vow-note" style={{ marginTop: 8 }}><Icon name="info" size={15} />
              <span>{AR ? 'الكمية حتى 20% من الأصلية بالسعر التعاقدي، وما يزيد عليها بسعر تثبته لجنة تثبيت الأسعار — لذلك للبند أكثر من سعر.' : 'Quantity up to 20% of the original stays at the contract rate; the excess is priced by the rate-fixing committee — so the item carries more than one rate.'}</span></div></div>}
        </div>
        <div className="d-drawer-foot"><button className="d-btn" onClick={onClose}>{AR ? 'إغلاق' : 'Close'}</button></div>
      </div>
    </React.Fragment>);
}

// ---------- the contract tab ----------
function DContractAmendments({ lang, c, d, p, showToast }) {
  const AR = lang === 'ar';
  const a = React.useMemo(() => contractAmendments(c, d, lang, p), [c.key, d, lang, p && p.id]);
  const [openAmd, setOpenAmd] = React.useState(null);
  const kv = (k, v, mono, sub) => <div className="d-form-i"><span className="k">{k}</span>
    <span className={'v' + (mono ? ' mono' : '')}>{v}</span>{sub ? <span className="d-cell-sub">{sub}</span> : null}</div>;
  const secH = (ico, txt, right) => <div className="d-vow-sech"><Icon name={ico} size={16} />
    <div className="d-section-title" style={{ margin: 0 }}>{txt}</div><div style={{ flex: 1 }}></div>{right}</div>;
  const pill = k => { const s = AMD_STATE[k]; return <span className={'d-pill ' + s.cls}>{AR ? s.ar : s.en}</span>; };
  const sign = n => (n > 0 ? '+' : '') + window.fmtNum(Math.round(n));
  const P = a.penalty;

  return (
    <React.Fragment>
      {openAmd && <DAmendmentPanel lang={lang} amd={openAmd} onClose={() => setOpenAmd(null)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
        <div>{secH('verified_user', AR ? 'العقد النافذ' : 'Effective contract',
          <span className="d-cell-sub">{a.versions.length > 1
            ? (AR ? 'بعد ' : 'after ') + (a.versions.length - 1) + (AR ? ' ملحق مطبَّق' : ' applied amendment(s)')
            : (AR ? 'لا ملاحق مطبَّقة' : 'no applied amendments')}</span>)}
          <div className="d-form-grid">
            {kv(AR ? 'الإصدار النافذ' : 'Effective version', a.effective.label, false, a.effective.source || '—')}
            {kv(AR ? 'قيمة العقد النافذة' : 'Effective contract value', window.fmtNum(a.effective.value), true,
              a.effective.value !== a.original.value ? (AR ? 'الأصلية ' : 'original ') + window.fmtNum(a.original.value) : null)}
            {kv(AR ? 'تاريخ الإنجاز التعاقدي' : 'Contractual completion', a.effective.finish, true,
              a.effective.finish !== a.original.finish ? (AR ? 'الأصلي ' : 'original ') + a.original.finish : null)}
            {kv(AR ? 'مدة العقد' : 'Contract duration', a.effective.duration + (AR ? ' يوم' : ' days'), true,
              a.effective.duration !== a.original.duration ? sign(a.effective.duration - a.original.duration) + (AR ? ' يوم' : ' days') : null)}
            {kv(AR ? 'صافي التعديل المطبَّق' : 'Net applied change', sign(a.effective.value - a.original.value), true)}
            {kv(AR ? 'ملاحق بانتظار التطبيق' : 'Amendments awaiting application', a.pending.length, true,
              a.pending.length ? sign(a.projected.value - a.effective.value) + ' · ' + a.projected.days + (AR ? ' يوم' : 'd') : null)}
          </div>
          {a.pending.length > 0 && <div className="d-vow-note warn" style={{ marginTop: 12 }}><Icon name="warning" size={16} />
            <span>{AR ? 'توجد أوامر معتمدة لم تُطبَّق بعد — لم تُدرج قيمها في العقد النافذ. القيمة المتوقعة بعد التطبيق '
              : 'There are approved orders not yet applied — their values are excluded from the effective contract. Projected value after application '}
              <b className="mono">{window.fmtNum(a.projected.value)}</b>{AR ? ' وتاريخ إنجاز ' : ', completion '}
              <b className="mono">{addDays(a.effective.finish, a.projected.days)}</b>.</span></div>}
        </div>

        <div>{secH('history', AR ? 'سجل التعديلات التعاقدية' : 'Contract amendment history')}
          <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
            <th style={{ width: 150 }}>{AR ? 'الإصدار' : 'Version'}</th>
            <th style={{ width: 96 }}>{AR ? 'المصدر' : 'Source'}</th>
            <th style={{ width: 104 }}>{AR ? 'التاريخ' : 'Date'}</th>
            <th style={{ width: 128 }}>{AR ? 'قيمة العقد' : 'Contract value'}</th>
            <th style={{ width: 110 }}>{AR ? 'التغيير' : 'Change'}</th>
            <th style={{ width: 104 }}>{AR ? 'المدة' : 'Duration'}</th>
            <th style={{ width: 108 }}>{AR ? 'تاريخ الإنجاز' : 'Completion'}</th>
            <th style={{ width: 62 }}>{AR ? 'بنود' : 'BOQ'}</th><th style={{ width: 62 }}>{AR ? 'أنشطة' : 'Acts'}</th>
            <th style={{ width: 170 }}>{AR ? 'الحالة' : 'State'}</th></tr></thead>
            <tbody>{a.versions.concat(a.pending).map((x, k) => (
              <tr key={k} onClick={() => x.source && setOpenAmd(x)} style={{ cursor: x.source ? 'pointer' : 'default' }}>
                <td><b>{x.label}</b>{x.sourceTitle ? <div className="d-cell-sub">{x.sourceTitle}</div> : null}</td>
                <td className="mono">{x.source || '—'}</td><td className="mono">{x.date}</td>
                <td className="mono">{window.fmtNum(x.value)}</td>
                <td className={'mono' + (x.dValue ? ' chg' : '')}>{x.no === 0 ? '—' : sign(x.dValue)}</td>
                <td className="mono">{x.duration}{AR ? ' يوم' : 'd'}</td>
                <td className="mono">{x.finish}</td>
                <td className="mono">{x.no === 0 ? '—' : x.boqCount}</td><td className="mono">{x.no === 0 ? '—' : x.actCount}</td>
                <td>{pill(x.state)}</td></tr>))}</tbody></table></div>
          <div className="d-cell-sub" style={{ marginTop: 8 }}>{AR ? 'اضغط أي ملحق لعرض البنود والأنشطة التي عدّلها.' : 'Select an amendment to see the items and activities it changed.'}</div>
        </div>

        <div>{secH('difference', AR ? 'أثر التعديلات على الغرامات التأخيرية' : 'Effect on delay penalties')}
          <div className="d-form-grid" style={{ marginBottom: 12 }}>
            {kv(AR ? 'نسبة الغرامة' : 'Penalty rate', (P.rate * 100).toFixed(1) + (AR ? '% من قيمة العقد لكل يوم تأخير' : '% of contract value per day of delay'))}
            {kv(AR ? 'الحد الأقصى' : 'Cap', P.capPct + (AR ? '% من قيمة العقد' : '% of contract value'))}
            {kv(AR ? 'تاريخ الإنجاز المتوقع' : 'Forecast completion', a.forecastFinish, true)}
          </div>
          <table className="d-line-table"><thead><tr>
            <th style={{ minWidth: 190 }}></th>
            <th style={{ width: 150 }}>{AR ? 'قبل التعديلات' : 'Before amendments'}</th>
            <th style={{ width: 150 }}>{AR ? 'بعد التعديلات' : 'After amendments'}</th>
            <th style={{ width: 130 }}>{AR ? 'الفرق' : 'Difference'}</th></tr></thead>
            <tbody>
              <tr><td>{AR ? 'تاريخ الإنجاز التعاقدي' : 'Contractual completion'}</td>
                <td className="mono">{a.original.finish}</td>
                <td className={'mono' + (a.effective.finish !== a.original.finish ? ' chg' : '')}>{a.effective.finish}</td>
                <td className="mono">{sign(dayDiff(a.effective.finish, a.original.finish))}{AR ? ' يوم' : 'd'}</td></tr>
              <tr><td>{AR ? 'أيام التأخير' : 'Days of delay'}</td>
                <td className="mono">{P.before.days}</td>
                <td className={'mono' + (P.after.days !== P.before.days ? ' chg' : '')}>{P.after.days}</td>
                <td className="mono">{sign(P.after.days - P.before.days)}</td></tr>
              <tr><td>{AR ? 'الغرامة اليومية' : 'Penalty per day'}</td>
                <td className="mono">{window.fmtNum(P.before.perDay)}</td>
                <td className={'mono' + (P.after.perDay !== P.before.perDay ? ' chg' : '')}>{window.fmtNum(P.after.perDay)}</td>
                <td className="mono">{sign(P.after.perDay - P.before.perDay)}</td></tr>
              <tr><td>{AR ? 'الحد الأقصى للغرامة' : 'Penalty cap'}</td>
                <td className="mono">{window.fmtNum(P.before.cap)}</td>
                <td className="mono">{window.fmtNum(P.after.cap)}</td>
                <td className="mono">{sign(P.after.cap - P.before.cap)}</td></tr>
            </tbody>
            <tfoot><tr><td>{AR ? 'الغرامة المستحقة' : 'Penalty due'}</td>
              <td className="mono">{window.fmtNum(P.before.amount)}</td>
              <td className="mono">{window.fmtNum(P.after.amount)}</td>
              <td className="mono chg">{sign(P.after.amount - P.before.amount)}</td></tr></tfoot></table>
          <div className="d-vow-note" style={{ marginTop: 10 }}><Icon name="info" size={16} />
            <span>{P.waived > 0
              ? (AR ? 'التمديد المعتمد نقل تاريخ الإنجاز التعاقدي، فسقطت غرامة قدرها ' : 'The approved extension moved the contractual completion date, waiving a penalty of ')
                + window.fmtNum(P.waived) + (AR ? '. زيادة قيمة العقد ترفع الغرامة اليومية، لكن أثر التمديد أكبر.' : '. The contract-value increase raises the daily penalty, but the extension outweighs it.')
              : (AR ? 'لا غرامة مستحقة على تاريخ الإنجاز التعاقدي النافذ.' : 'No penalty is due against the effective contractual completion date.')}</span></div>
          {P.after.capped && <div className="d-vow-note warn" style={{ marginTop: 8 }}><Icon name="warning" size={16} />
            <span>{AR ? 'الغرامة بلغت الحد الأقصى المسموح به.' : 'The penalty has reached its contractual cap.'}</span></div>}
        </div>

        <div>{secH('list_alt', AR ? 'الكميات النافذة بعد التعديل' : 'Effective quantities after amendment',
          <span className="d-cell-sub">{a.boqEffect.length + (AR ? ' بند' : ' item(s)')}</span>)}
          {a.boqEffect.length ? <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
            <th style={{ width: 88 }}>{AR ? 'الكود' : 'Code'}</th><th style={{ minWidth: 170 }}>{AR ? 'الوصف' : 'Description'}</th>
            <th style={{ width: 52 }}>{AR ? 'الوحدة' : 'Unit'}</th>
            <th style={{ width: 106 }}>{AR ? 'الكمية الأصلية' : 'Original qty'}</th>
            <th style={{ width: 106 }}>{AR ? 'الكمية النافذة' : 'Effective qty'}</th>
            <th style={{ width: 96 }}>{AR ? 'الفرق' : 'Delta'}</th>
            <th style={{ width: 120 }}>{AR ? 'القيمة النافذة' : 'Effective value'}</th>
            <th style={{ width: 88 }}>{AR ? 'الوزن' : 'Weight'}</th>
            <th style={{ width: 96 }}>{AR ? 'الملحق' : 'Amendment'}</th></tr></thead>
            <tbody>{a.boqEffect.map((l, k) => (
              <tr key={k}><td className="mono">{l.code}</td><td>{l.desc}</td><td>{l.unit}</td>
                <td className="mono">{window.fmtNum(l.qtyBefore)}</td>
                <td className="mono chg">{window.fmtNum(l.qtyApproved != null ? l.qtyApproved : l.qtyProposed)}</td>
                <td className="mono">{sign((l.qtyApproved != null ? l.qtyApproved : l.qtyProposed) - l.qtyBefore)}</td>
                <td className="mono">{window.fmtNum(Math.round(l.valAfter))}</td>
                <td className="mono">{l.wApplied != null ? l.wApplied + '%' : (l.wApproved != null ? l.wApproved + '%' : '—')}</td>
                <td className="mono">{l.src}</td></tr>))}</tbody></table></div>
            : <div className="d-cell-sub">{AR ? 'لم تُعدَّل أي كميات بملاحق مطبَّقة.' : 'No quantities changed by an applied amendment.'}</div>}
        </div>

        <div>{secH('calendar_month', AR ? 'الأنشطة النافذة بعد التعديل' : 'Effective activities after amendment',
          <span className="d-cell-sub">{a.actEffect.length + (AR ? ' نشاط' : ' activity(ies)')}</span>)}
          {a.actEffect.length ? <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
            <th style={{ width: 78 }}>Activity ID</th><th style={{ minWidth: 180 }}>{AR ? 'اسم النشاط' : 'Activity name'}</th>
            <th style={{ width: 104 }}>{AR ? 'المتبقي قبل' : 'Remaining before'}</th>
            <th style={{ width: 104 }}>{AR ? 'المتبقي النافذ' : 'Effective remaining'}</th>
            <th style={{ width: 110 }}>{AR ? 'النهاية قبل' : 'Finish before'}</th>
            <th style={{ width: 110 }}>{AR ? 'النهاية النافذة' : 'Effective finish'}</th>
            <th style={{ width: 96 }}>{AR ? 'الملحق' : 'Amendment'}</th></tr></thead>
            <tbody>{a.actEffect.map((x, k) => (
              <tr key={k}><td className="mono">{x.id}</td><td>{x.name}</td>
                <td className="mono">{x.remBefore}</td>
                <td className="mono chg">{x.remApproved != null ? x.remApproved : x.remProposed}</td>
                <td className="mono">{x.finishBefore}</td>
                <td className="mono chg">{x.finishApproved || '—'}</td>
                <td className="mono">{x.src}</td></tr>))}</tbody></table></div>
            : <div className="d-cell-sub">{AR ? 'لم تُعدَّل أي أنشطة بملاحق مطبَّقة.' : 'No activities changed by an applied amendment.'}</div>}
        </div>
      </div>
    </React.Fragment>
  );
}

function DAmendmentPanel({ lang, amd, onClose }) {
  const AR = lang === 'ar';
  const F = (k, v, mono) => <div className="d-form-i"><span className="k">{k}</span><span className={'v' + (mono ? ' mono' : '')}>{v}</span></div>;
  const sign = n => (n > 0 ? '+' : '') + window.fmtNum(Math.round(n));
  return (
    <React.Fragment>
      <div className="d-drawer-scrim" onClick={onClose}></div>
      <div className="d-drawer">
        <div className="d-drawer-head"><div className="tx"><b>{amd.label}</b><span>{amd.source} · {amd.sourceTitle}</span></div>
          <button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-drawer-body">
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'أثر الملحق على العقد' : 'Effect on the contract'}</span>
            <div className="d-form-grid">
              {F(AR ? 'تغيير القيمة' : 'Value change', sign(amd.dValue), true)}
              {F(AR ? 'قيمة العقد بعده' : 'Contract value after', window.fmtNum(amd.value), true)}
              {F(AR ? 'تمديد المدة' : 'Duration extension', amd.dDays + (AR ? ' يوم' : ' days'), true)}
              {F(AR ? 'تاريخ الإنجاز بعده' : 'Completion after', amd.finish, true)}
              {F(AR ? 'الحالة' : 'State', AR ? AMD_STATE[amd.state].ar : AMD_STATE[amd.state].en)}
            </div></div>
          {(amd.lines || []).length > 0 && <div className="d-drawer-grp"><span className="lbl">{AR ? 'البنود المعدَّلة' : 'Amended items'}</span>
            <table className="d-line-table"><thead><tr><th>{AR ? 'الكود' : 'Code'}</th>
              <th style={{ width: 92 }}>{AR ? 'قبل' : 'Before'}</th><th style={{ width: 92 }}>{AR ? 'بعد' : 'After'}</th></tr></thead>
              <tbody>{amd.lines.map(l => (<tr key={l.code}><td className="mono">{l.code}<div className="d-cell-sub">{l.desc}</div></td>
                <td className="mono">{window.fmtNum(l.qtyBefore)}</td>
                <td className="mono chg">{window.fmtNum(l.qtyApproved != null ? l.qtyApproved : l.qtyProposed)}</td></tr>))}</tbody></table></div>}
          {(amd.activities || []).length > 0 && <div className="d-drawer-grp"><span className="lbl">{AR ? 'الأنشطة المعدَّلة' : 'Amended activities'}</span>
            <table className="d-line-table"><thead><tr><th>{AR ? 'النشاط' : 'Activity'}</th>
              <th style={{ width: 92 }}>{AR ? 'قبل' : 'Before'}</th><th style={{ width: 92 }}>{AR ? 'بعد' : 'After'}</th></tr></thead>
              <tbody>{amd.activities.map(x => (<tr key={x.id}><td className="mono">{x.id}<div className="d-cell-sub">{x.name}</div></td>
                <td className="mono">{x.finishBefore}</td><td className="mono chg">{x.finishApproved || '—'}</td></tr>))}</tbody></table></div>}
        </div>
        <div className="d-drawer-foot"><button className="d-btn" onClick={onClose}>{AR ? 'إغلاق' : 'Close'}</button></div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { contractAmendments, DContractAmendments, DAmendmentPanel, voContractKey, penaltyOf, AMD_STATE, amendmentIndex, DAmdMark, DAmdBands, DAmdPanel, DAmdDelta });
