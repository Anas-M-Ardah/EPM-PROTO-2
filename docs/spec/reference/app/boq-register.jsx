/* ============================================================
   BOQ Register — hierarchical enterprise grid + record detail
   panel, driven by the PROJECT'S REAL data. `alloc`
   ({ [boqCode]: [{act,pct}] }) is the single source of truth for
   BOQ↔activity allocation, owned by DBoqWorkspace; everything
   (Activities / Assigned wt / state / executed% / totals) is
   derived on render. All the old module's capabilities are kept:
   contract select, add / edit / delete, batch import, quantity
   distribution, beneficiaries, amendment-aware quantities.
   ============================================================ */

// state → { key, ar, en, icon } for the allocation badge (shape + label + colour)
const BOQ_STATE = {
  full: { cls: 'full', ar: 'مُخصَّص بالكامل', en: 'Fully allocated', icon: 'check_circle' },
  partial: { cls: 'partial', ar: 'جزئي', en: 'Partial', icon: 'pending' },
  over: { cls: 'over', ar: 'تجاوز التخصيص', en: 'Over-allocated', icon: 'warning' },
  none: { cls: 'none', ar: 'غير مُخصَّص', en: 'Unassigned', icon: 'radio_button_unchecked' },
};
const BOQ_TOL = { OVER: 100.05, FULL: 99.95 };
function boqAllocPct(rows) { return rows && rows.length ? +rows.reduce((a, r) => a + (Number(r.pct) || 0), 0).toFixed(1) : 0; }
function boqAllocState(pct) { return pct <= 0 ? 'none' : pct > BOQ_TOL.OVER ? 'over' : pct >= BOQ_TOL.FULL ? 'full' : 'partial'; }
function boqDupSet(rows) { const seen = {}, dup = {}; (rows || []).forEach(r => { if (seen[r.act]) dup[r.act] = true; seen[r.act] = true; }); return dup; }
function cur(lang) { return lang === 'ar' ? 'د.ع' : 'IQD'; }
/* money and status go through the shared renderers — the module used to
   ship its own of each, which is why BOQ never looked like the rest. */
function Money({ n, lang }) { return <DMoney v={n} lang={lang} size="sm" />; }
/* allocation state is a BOQ vocabulary, but it wears the shared pill */
const BOQ_PILL = { full: 'completed', partial: 'ongoing', over: 'delayed', none: 'cancelled' };
function BoqStateBadge({ state, lang }) {
  const s = BOQ_STATE[state] || BOQ_STATE.none;
  return <span className={'d-pill ' + BOQ_PILL[state || 'none']}>{lang === 'ar' ? s.ar : s.en}</span>;
}

// ---- largest-remainder weights so the column sums to exactly 100.00 ----
function boqWeightMap(items) {
  const total = items.reduce((a, x) => a + x.amount, 0) || 1;
  const raw = items.map(x => x.amount / total * 100);
  const floor = raw.map(v => Math.floor(v * 100) / 100);
  let short = Math.round((100 - floor.reduce((a, b) => a + b, 0)) * 100);
  const order = raw.map((v, i) => [i, v - floor[i]]).sort((a, b) => b[1] - a[1]);
  const out = floor.slice();
  for (let k = 0; k < short && k < order.length; k++) out[order[k][0]] = +(out[order[k][0]] + 0.01).toFixed(2);
  const m = {}; items.forEach((x, i) => m[x.code] = +out[i].toFixed(2)); return m;
}

// ---- derive the register model from REAL rows + alloc + real activities ----
// rows: [{no,code,item,unit,contractedQty,executedQty,price,total}]  (contract-scoped)
// alloc: { [code]: [{act,pct}] }   acts: real schedule activities [{id,name,wbs,wCostAbs,wMHAbs,pct}]
// opts: { effQty, effVal, effRate, amdOf, dist }
function boqDeriveReal(rows, alloc, acts, lang, opts) {
  opts = opts || {};
  const AR = lang === 'ar';
  const actById = {}; (acts || []).forEach(a => actById[a.id] = a);
  const eff = r => ({ qty: opts.effQty ? opts.effQty(r) : r.contractedQty, val: opts.effVal ? opts.effVal(r) : r.total, rate: opts.effRate ? opts.effRate(r) : r.price });
  const base = rows.map(r => { const e = eff(r); return { code: r.code, no: r.no, item: r.item, unit: r.unit, qty: e.qty, rate: e.rate, amount: e.val, raw: r }; });
  const wmap = boqWeightMap(base);
  const items = base.map(b => {
    const arows = alloc[b.code] || [];
    const pct = boqAllocPct(arows), state = boqAllocState(pct);
    // executed% = Σ share × linked activity progress ; earned = amount × that
    const prog = arows.reduce((s, r) => { const a = actById[r.act]; return s + (Number(r.pct) || 0) / 100 * (a && a.pct != null ? a.pct : 0); }, 0);
    const dsum = opts.dist ? window.distSummary({ ...b.raw, contractedQty: b.qty }, opts.dist[b.code]) : null;
    return { ...b, weight: wmap[b.code] || 0, rows: arows, pct, state, dup: Object.keys(boqDupSet(arows)).length > 0,
      links: arows.length, assignedWt: +((wmap[b.code] || 0) * pct / 100).toFixed(3),
      progress: Math.round(prog), earned: Math.round(b.amount * prog / 100),
      amd: opts.amdOf ? opts.amdOf(b.code) : null, dist: dsum };
  });
  const byCode = {}; items.forEach(d => byCode[d.code] = d);
  const counts = { all: items.length, full: 0, partial: 0, over: 0, none: 0 };
  items.forEach(d => counts[d.state]++);
  const contractTotal = items.reduce((a, x) => a + x.amount, 0);
  // group into an expandable division→item hierarchy when rows carry a division
  const hasDiv = items.some(x => x.raw && x.raw.div);
  let divisions = null;
  if (hasDiv) {
    const order = [], map = {};
    items.forEach(x => { const k = (x.raw && x.raw.div) || '—'; if (!map[k]) { map[k] = { key: k, name: (x.raw && x.raw.divName) || k, kids: [] }; order.push(k); } map[k].kids.push(x); });
    divisions = order.map(k => { const dv = map[k]; const amount = dv.kids.reduce((a, x) => a + x.amount, 0);
      return { key: dv.key, name: dv.name, kids: dv.kids, amount, earned: dv.kids.reduce((a, x) => a + x.earned, 0),
        weight: +dv.kids.reduce((a, x) => a + x.weight, 0).toFixed(2), links: dv.kids.reduce((a, x) => a + x.links, 0),
        progress: amount ? Math.round(dv.kids.reduce((a, x) => a + x.amount * x.progress, 0) / amount) : 0,
        hasOver: dv.kids.some(x => x.state === 'over') }; });
  }
  return { items, byCode, counts, contractTotal, actById, divisions };
}

// ================= Record detail panel — the shared Z8 pane =================
function DBoqRecordPanel({ lang, d, wide, onExpand, onClose, onGoAssign, onEdit, onAmd,
                          acts, alloc, setAlloc, dist, setDist, bens, notes, addNote }) {
  const AR = lang === 'ar';
  const [tab, setTab] = React.useState('general');
  React.useEffect(() => { setTab('general'); }, [d && d.code]);
  if (!d) return null;
  const kv = (k, v, calc) => (
    <div className="d-form-i"><span className="k">{k}{calc && <span className="d-proposed">calc</span>}</span>
      <span className="v">{v}</span></div>);
  const TABS = AR
    ? [{ id: 'general', label: 'عام' }, { id: 'assign', label: 'التخصيص' }, { id: 'dist', label: 'التوزيع' },
       { id: 'progress', label: 'الإنجاز' }, { id: 'cost', label: 'الكلفة' }, { id: 'history', label: 'السجل' }]
    : [{ id: 'general', label: 'General' }, { id: 'assign', label: 'Assignment' }, { id: 'dist', label: 'Distribution' },
       { id: 'progress', label: 'Progress' }, { id: 'cost', label: 'Cost' }, { id: 'history', label: 'History' }];
  const banner = {
    full: AR ? 'قيمته تُحتسب بالكامل في القيمة المكتسبة.' : 'Its full value counts toward Earned Value.',
    partial: AR ? 'خُصِّص ' + d.pct + '% فقط — الجزء غير المخصَّص لا يُكتسب أبداً.' : 'Only ' + d.pct + '% allocated — the unallocated share is never earned.',
    over: AR ? 'التخصيص ' + d.pct + '% يتجاوز 100% ويجب تصحيحه قبل الحفظ.' : 'Allocation is ' + d.pct + '%, over 100% — fix before saving.',
    none: AR ? 'غير مرتبط بأي نشاط، فلا تُكتسب قيمته.' : 'Not linked to any activity, so its value is never earned.',
  }[d.state];
  const bannerTone = { full: 'success', partial: 'warning', over: 'danger', none: 'info' }[d.state];
  const bannerTitle = { full: AR ? 'مُخصَّص بالكامل' : 'Fully allocated', partial: AR ? 'تخصيص جزئي' : 'Partially allocated',
    over: AR ? 'تجاوز التخصيص' : 'Over-allocated', none: AR ? 'غير مُخصَّص' : 'Unallocated' }[d.state];
  const DS = d.dist ? (window.DIST_STATE[d.dist.state] || {}) : {};

  /* ---- allocation, edited here rather than on the matrix screen ---- */
  const aRows = (alloc && alloc[d.code]) || [];
  const allocSum = aRows.reduce((a2, r) => a2 + (Number(r.pct) || 0), 0);
  const putAlloc = rows => setAlloc && setAlloc(prev => Object.assign({}, prev, { [d.code]: rows }));
  const setShare = (i, o) => putAlloc(aRows.map((r, j) => j === i ? Object.assign({}, r, o) : r));
  const delShare = i => putAlloc(aRows.filter((_, j) => j !== i));
  const addShare = () => {
    const used = new Set(aRows.map(r => r.act));
    const next = (acts || []).find(a => !used.has(a.id)) || (acts || [])[0];
    if (!next) return;
    /* a new link takes whatever share is still unallocated, so the common
       case needs no typing at all */
    putAlloc(aRows.concat([{ act: next.id, pct: String(Math.max(0, +(100 - allocSum).toFixed(1))) }]));
  };
  const spreadEven = () => {
    if (!aRows.length) return;
    const each = +(100 / aRows.length).toFixed(1);
    const rows = aRows.map(r => Object.assign({}, r, { pct: String(each) }));
    /* put the rounding remainder on the first row so the total is exactly 100 */
    const drift = +(100 - each * aRows.length).toFixed(1);
    if (drift) rows[0] = Object.assign({}, rows[0], { pct: String(+(each + drift).toFixed(1)) });
    putAlloc(rows);
  };

  /* ---- distribution, likewise ---- */
  const dRows = (dist && dist[d.code]) || [];
  /* a beneficiary's label lives on `ar`/`en`, and a row pointing at an entity
     outside this contract's assigned list must still show its own name */
  const benName = b => (AR ? b.ar : b.en) || b.name || b.code;
  const benOpts = (() => {
    const out = (bens || []).map(b => ({ code: b.code, label: benName(b) }));
    const known = new Set(out.map(b => b.code));
    (((dist && dist[d.code]) || [])).forEach(r => {
      if (r.ben && !known.has(r.ben)) {
        const hit = (window.BENEFICIARIES || []).find(b => b.code === r.ben);
        known.add(r.ben);
        out.push({ code: r.ben, label: (hit ? benName(hit) : r.ben) + (AR ? ' (خارج العقد)' : ' (outside this contract)') });
      }
    });
    return out;
  })();
  const distTotal = Number(d.qty) || 0;
  const distDone = dRows.reduce((a2, r) => a2 + (Number(r.qty) || 0), 0);
  const distRemain = Math.max(0, distTotal - distDone);
  const distOver = Math.max(0, distDone - distTotal);
  const putDist = rows => setDist && setDist(prev => Object.assign({}, prev, { [d.code]: rows }));
  const setBenRow = (i, o) => {
    if (o.qty !== undefined) {
      /* a beneficiary can never be given more than the item still has left */
      const others = dRows.reduce((a2, x, j) => a2 + (j === i ? 0 : (Number(x.qty) || 0)), 0);
      const cap = distTotal - others;
      if ((Number(o.qty) || 0) > cap + 0.001) o = Object.assign({}, o, { qty: cap > 0 ? String(+cap.toFixed(2)) : '0' });
    }
    putDist(dRows.map((r, j) => j === i ? Object.assign({}, r, o) : r));
  };
  const delBenRow = i => putDist(dRows.filter((_, j) => j !== i));
  const addBenRow = () => {
    const used = new Set(dRows.map(r => r.ben));
    const next = (bens || []).find(b => !used.has(b.code)) || (bens || [])[0];
    if (!next) return;
    putDist(dRows.concat([{ ben: next.code, site: '', qty: String(+distRemain.toFixed(2)) }]));
  };
  const fillRemainder = () => {
    if (!dRows.length) return;
    const last = dRows.length - 1;
    putDist(dRows.map((r, j) => j === last
      ? Object.assign({}, r, { qty: String(+((Number(r.qty) || 0) + distRemain).toFixed(2)) }) : r));
  };

  /* ---- the item's real history: what the system knows, plus what people
     have said about it. The change orders come from the amendment chain, so
     the trail and the الرمز-level indicator can never disagree. ---- */
  const [note, setNote] = React.useState('');
  React.useEffect(() => { setNote(''); }, [d && d.code]);
  const U = (window.EPM && window.EPM.CURRENT_USER) || {};
  const me = (U.name && (AR ? U.name.ar : U.name.en)) || (AR ? 'المستخدم الحالي' : 'Current user');
  const postNote = () => { if (!note.trim() || !addNote) return; addNote(d.code, note.trim()); setNote(''); };
  const myNotes = (notes && notes[d.code]) || [];
  const trail = React.useMemo(() => {
    const out = [];
    out.push({ at: (d.raw && d.raw.createdAt) || '—', by: d.raw && d.raw.source === 'manual' ? (AR ? 'إدخال يدوي' : 'Manual entry') : (AR ? 'استيراد جدول الكميات' : 'BOQ import'),
      text: AR ? 'أُنشئ البند ضمن جدول الكميات' : 'Item created in the bill of quantities', icon: 'add', kind: 'sys' });
    (d.amd && d.amd.chain || []).forEach(c => {
      out.push({ at: c.date, by: c.no,
        text: c.applied
          ? (AR ? 'طُبِّق أمر تغييري على الكمية' : 'A change order was applied to the quantity')
          : (AR ? 'أمر تغييري معتمد بانتظار التطبيق' : 'An approved change order is awaiting application'),
        meta: window.fmtNum(c.qtyFrom) + ' → ' + window.fmtNum(c.qtyTo) + ' ' + (d.unit || ''),
        icon: c.applied ? 'check_circle' : 'pending', kind: 'sys' });
    });
    myNotes.forEach(x => out.push({ at: x.at, by: x.by, text: x.text, icon: 'chat', kind: 'note' }));
    /* newest last, so the composer sits directly under the latest entry */
    return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  }, [d && d.code, d && d.amd, myNotes, lang]);

  return (
    <DRecordPane lang={lang} wide={wide}
      title={d.item}
      meta={[
        { k: AR ? 'الرمز' : 'Code', v: d.code, num: true },
        { k: AR ? 'القيمة' : 'Amount', v: d.amount, money: true },
        { k: AR ? 'حالة التخصيص' : 'Allocation', v: <BoqStateBadge state={d.state} lang={lang} /> },
        { k: AR ? 'وزن العقد' : 'Weight', v: d.weight.toFixed(2) + '%', num: true },
        d.amd ? { k: AR ? 'أوامر تغييرية' : 'Change orders',
          v: <DAmdMark lang={lang} e={d.amd} onOpen={onAmd ? () => onAmd(d) : null} /> } : null,
      ].filter(Boolean)}
      tabs={TABS} tab={tab} onTab={setTab}
      onEdit={() => onEdit(d)} onExpand={onExpand} onClose={onClose}
      footer={<React.Fragment>
        {/* allocation and distribution are edited in their own tabs above, so
            the footer states what is still owed rather than sending the user
            to another screen to do what this pane already does */}
        <span className="d-form-state">
          {Math.abs(allocSum - 100) > 0.05
            ? (AR ? 'التخصيص ' + allocSum.toFixed(1) + '%' : 'Allocation ' + allocSum.toFixed(1) + '%')
            : distOver > 0 ? (AR ? 'التوزيع يتجاوز الكمية' : 'Distribution over quantity')
            : distRemain > 0.001 ? (AR ? 'يتبقّى ' + window.fmtNum(+distRemain.toFixed(2)) + ' ' + d.unit : window.fmtNum(+distRemain.toFixed(2)) + ' ' + d.unit + ' left')
            : (AR ? 'مكتمل' : 'Complete')}
        </span>
        <span className="sp"></span>
        <button className="d-btn sm" onClick={() => onEdit(d)}>
          <Icon name="edit" size={15} />{AR ? 'تعديل البند' : 'Edit item'}</button>
      </React.Fragment>}>

      {tab === 'general' && <React.Fragment>
        <DRecordGrp label={AR ? 'الهوية' : 'Identity'}>
          <div className="d-form-grid">
            {kv(AR ? 'رمز البند' : 'Item code', <span className="mono">{d.code}</span>)}
            {kv(AR ? 'الوصف' : 'Description', d.item)}
            {kv(AR ? 'المصدر' : 'Source', d.raw && d.raw.source === 'manual' ? (AR ? 'إدخال يدوي' : 'Manual entry') : (AR ? 'مستورد' : 'Imported'))}
          </div>
        </DRecordGrp>
        <DRecordGrp label={AR ? 'التجاري' : 'Commercial'}>
          <div className="d-form-grid">
            {kv(AR ? 'الوحدة' : 'Unit', d.unit)}
            {kv(AR ? 'الكمية' : 'Quantity', <span className="num">{window.fmtNum(d.qty)}</span>, !!d.amd)}
            {kv(AR ? 'سعر الوحدة' : 'Unit rate', <DMoney v={d.rate} lang={lang} size="sm" />)}
            {kv(AR ? 'القيمة' : 'Amount', <DMoney v={d.amount} lang={lang} size="sm" />, !!d.amd)}
            {kv(AR ? 'وزن العقد' : 'Weight of contract', <span className="num">{d.weight.toFixed(2)}%</span>, true)}
          </div>
        </DRecordGrp>
        {d.amd && (
          <DMsgBar tone={d.amd.applied ? 'info' : 'warning'}
            title={AR ? 'الكمية معدَّلة بأمر تغييري' : 'Quantity adjusted by a change order'}>
            {d.amd.applied ? (AR ? 'الأمر مطبَّق، والكمية النافذة أعلاه تعكسه.' : 'The order is applied and the effective quantity above reflects it.')
              : (AR ? 'الأمر قيد الاعتماد، ولم تُدرج قيمته في العقد النافذ بعد.' : 'The order is pending approval and is not yet in the effective contract.')}
            {onAmd && <button type="button" className="d-linkbtn" style={{ marginInlineStart: 'var(--space-8)' }}
              onClick={() => onAmd(d)}>{AR ? 'تفصيل الأثر' : 'See the impact'}<Icon name="chevron_right" size={14} /></button>}
          </DMsgBar>
        )}
      </React.Fragment>}

      {tab === 'assign' && <React.Fragment>
        <DMsgBar tone={bannerTone} title={bannerTitle}>{banner}</DMsgBar>
        <DRecordGrp label={AR ? 'الأنشطة المرتبطة' : 'Linked activities'}>
          {aRows.length ? (
            <table className="d-line-table d-editgrid">
              <thead><tr>
                <th>{AR ? 'النشاط' : 'Activity'}</th>
                <th className="r" style={{ width: 78 }}>{AR ? 'الحصة' : 'Share'}</th>
                <th className="r col-amt" style={{ width: 92 }}>{AR ? 'القيمة' : 'Amount'}</th>
                <th style={{ width: 34 }}></th>
              </tr></thead>
              <tbody>{aRows.map((r, i) => (
                <tr key={i}>
                  <td><select className="d-cellinput" value={r.act}
                    aria-label={AR ? 'النشاط' : 'Activity'}
                    title={(() => { const a = (acts || []).find(x => x.id === r.act); return a ? a.id + ' · ' + a.name : r.act; })()}
                    onChange={ev => setShare(i, { act: ev.target.value })}>
                    {(acts || []).map(a => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
                  </select></td>
                  <td className="r"><span className="d-cellnum">
                    <input className="d-cellinput num" inputMode="decimal" value={r.pct}
                      aria-label={AR ? 'الحصة %' : 'Share %'}
                      onChange={ev => setShare(i, { pct: ev.target.value.replace(/[^\d.]/g, '') })} /><i>%</i></span></td>
                  <td className="r col-amt"><DMoney v={d.amount * (Number(r.pct) || 0) / 100} lang={lang} size="sm" bare /></td>
                  <td><button className="d-icon-btn sm" title={AR ? 'إزالة الربط' : 'Remove link'}
                    aria-label={AR ? 'إزالة الربط' : 'Remove link'} onClick={() => delShare(i)}>
                    <Icon name="close" size={15} /></button></td>
                </tr>))}</tbody>
              <tfoot><tr>
                <td>{AR ? 'المجموع' : 'Total'}</td>
                <td className={'r num' + (Math.abs(allocSum - 100) > 0.05 ? ' bad' : '')}>{allocSum.toFixed(1)}%</td>
                <td className="r col-amt"><DMoney v={d.amount * allocSum / 100} lang={lang} size="sm" bare /></td>
                <td></td>
              </tr></tfoot>
            </table>
          ) : (
            <div className="d-vow-empty"><Icon name="account_tree" size={22} />
              <b>{AR ? 'لا أنشطة مرتبطة بعد' : 'No activities linked yet'}</b>
              <span>{AR ? 'اربط البند بنشاط ليبدأ اكتساب قيمته مع تقدّم التنفيذ.' : 'Link the item to an activity so its value starts being earned as work progresses.'}</span></div>
          )}
          <div className="d-rowacts">
            <button className="d-btn sm" onClick={addShare} disabled={!(acts || []).length}>
              <Icon name="add" size={15} />{AR ? 'ربط بنشاط' : 'Link an activity'}</button>
            {aRows.length > 0 && <button className="d-btn sm" onClick={spreadEven}>
              <Icon name="balance" size={15} />{AR ? 'توزيع متساوٍ' : 'Split evenly'}</button>}
            <span className="sp"></span>
            <button type="button" className="d-linkbtn" onClick={() => onGoAssign(d.code)}>
              {AR ? 'مصفوفة الربط الكاملة' : 'Full linkage matrix'}<Icon name="chevron_right" size={14} /></button>
          </div>
        </DRecordGrp>
      </React.Fragment>}

      {tab === 'dist' && <React.Fragment>
        {distOver > 0
          ? <DMsgBar tone="danger" title={AR ? 'التوزيع يتجاوز كمية البند' : 'Distribution exceeds the item quantity'}>
              {AR ? 'الزائد ' : 'Over by '}<b className="num">{window.fmtNum(+distOver.toFixed(2))}</b> {d.unit}
              {AR ? ' — عدّل الكميات قبل الاعتماد.' : ' — revise the quantities before approval.'}</DMsgBar>
          : distRemain > 0.001
            ? <DMsgBar tone="warning" title={AR ? 'التوزيع غير مكتمل' : 'Distribution incomplete'}>
                {AR ? 'لم تُوزَّع بعد ' : 'Still undistributed: '}<b className="num">{window.fmtNum(+distRemain.toFixed(2))}</b> {d.unit}
                {AR ? ' من كمية البند.' : ' of the item quantity.'}</DMsgBar>
            : <DMsgBar tone="success" title={AR ? 'الكمية موزّعة بالكامل' : 'Fully distributed'}>
                {AR ? 'كامل الكمية التعاقدية موزّعة على الجهات المستفيدة.' : 'The whole contracted quantity is allocated to beneficiaries.'}</DMsgBar>}

        <DRecordGrp label={AR ? 'التوزيع على الجهات المستفيدة' : 'Distribution by beneficiary'}>
          {dRows.length ? (
            <table className="d-line-table d-editgrid">
              <thead><tr>
                <th>{AR ? 'الجهة' : 'Beneficiary'}</th>
                <th className="r" style={{ width: 84 }}>{AR ? 'الكمية' : 'Quantity'}</th>
                <th style={{ width: 34 }}></th>
              </tr></thead>
              <tbody>{dRows.map((r, i) => (
                <tr key={i}>
                  <td><select className="d-cellinput" value={r.ben}
                    aria-label={AR ? 'الجهة المستفيدة' : 'Beneficiary'}
                    title={(benOpts.find(b => b.code === r.ben) || {}).label || r.ben}
                    onChange={ev => setBenRow(i, { ben: ev.target.value })}>
                    {benOpts.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
                  </select></td>
                  <td className="r"><span className="d-cellnum">
                    <input className="d-cellinput num" inputMode="decimal" value={r.qty}
                      aria-label={AR ? 'الكمية' : 'Quantity'}
                      onChange={ev => setBenRow(i, { qty: ev.target.value.replace(/[^\d.]/g, '') })} /><i>{d.unit}</i></span></td>
                  <td><button className="d-icon-btn sm" title={AR ? 'إزالة الجهة' : 'Remove beneficiary'}
                    aria-label={AR ? 'إزالة الجهة' : 'Remove beneficiary'} onClick={() => delBenRow(i)}>
                    <Icon name="close" size={15} /></button></td>
                </tr>))}</tbody>
              <tfoot><tr>
                <td>{AR ? 'الموزّعة' : 'Distributed'}</td>
                <td className={'r num' + (distOver > 0 ? ' bad' : '')}>{window.fmtNum(+distDone.toFixed(2))}</td>
                <td></td>
              </tr>
              <tr>
                <td>{AR ? 'المتبقية' : 'Remaining'}</td>
                <td className="r num">{window.fmtNum(+(distOver > 0 ? -distOver : distRemain).toFixed(2))}</td>
                <td></td>
              </tr></tfoot>
            </table>
          ) : (
            <div className="d-vow-empty"><Icon name="apartment" size={22} />
              <b>{AR ? 'لم توزَّع الكمية بعد' : 'Not yet distributed'}</b>
              <span>{AR ? 'وزّع كمية البند على الجهات المستفيدة لتتبّع التسليم لكل جهة.' : 'Allocate the item’s quantity to beneficiaries to track delivery per entity.'}</span></div>
          )}
          <div className="d-rowacts">
            <button className="d-btn sm" onClick={addBenRow} disabled={!(bens || []).length || dRows.length >= (bens || []).length}>
              <Icon name="add" size={15} />{AR ? 'إضافة جهة' : 'Add a beneficiary'}</button>
            {distRemain > 0.001 && dRows.length > 0 && <button className="d-btn sm" onClick={fillRemainder}>
              <Icon name="playlist_add_check" size={15} />{AR ? 'إسناد المتبقي' : 'Assign the remainder'}</button>}
          </div>
        </DRecordGrp>
      </React.Fragment>}

      {tab === 'progress' && <React.Fragment>
        <DRecordGrp label={AR ? 'الإنجاز والقيمة المكتسبة' : 'Progress and earned value'}>
          <div className="d-form-grid">
            {kv(AR ? 'نسبة التنفيذ' : 'Executed %', <span className="num">{d.progress}%</span>, true)}
            {kv(AR ? 'القيمة المكتسبة' : 'Earned amount', <DMoney v={d.earned} lang={lang} size="sm" />, true)}
          </div>
        </DRecordGrp>
        <DMsgBar tone="info" icon="functions" title={AR ? 'كيف تُحتسب' : 'How this is calculated'}>
          {AR ? 'نسبة التنفيذ مشتقّة من إنجاز الأنشطة المرتبطة مرجّحاً بحصص التخصيص. القيمة المكتسبة = القيمة × نسبة التنفيذ.'
              : "Executed % is derived from the linked activities' progress weighted by allocation shares. Earned = amount × executed %."}
        </DMsgBar>
      </React.Fragment>}

      {tab === 'cost' && (
        <DRecordGrp label={AR ? 'الكلفة' : 'Cost'}>
          <div className="d-form-grid">
            {kv(AR ? 'قيمة العقد للبند' : 'Contract amount', <DMoney v={d.raw ? d.raw.total : d.amount} lang={lang} size="sm" />)}
            {kv(AR ? 'أثر أوامر التغيير' : 'Variation impact', <DMoney v={d.amount - (d.raw ? d.raw.total : d.amount)} lang={lang} size="sm" signed />)}
            {kv(AR ? 'القيمة المعدلة' : 'Revised amount', <DMoney v={d.amount} lang={lang} size="sm" />, true)}
            {kv(AR ? 'المكتسب' : 'Earned', <DMoney v={d.earned} lang={lang} size="sm" />, true)}
            {kv(AR ? 'المتبقي' : 'Remaining', <DMoney v={d.amount - d.earned} lang={lang} size="sm" />, true)}
          </div>
        </DRecordGrp>
      )}

      {tab === 'history' && <React.Fragment>
        <DRecordGrp label={AR ? 'سجل البند' : 'Item history'}>
          <div className="d-trail">
            {trail.map((h, i) => (
              <div className={'d-tstep' + (h.kind === 'note' ? ' note' : '')} key={i}>
                <span className="tdot"><Icon name={h.icon} size={11} /></span>
                <div className="th"><span>{h.by}</span><time className="tm">{h.at}</time></div>
                <div className="tb">{h.text}</div>
                {h.meta && <div className="tm2">{h.meta}</div>}
              </div>))}
          </div>
        </DRecordGrp>
        <DRecordGrp label={AR ? 'إضافة تعليق' : 'Add a comment'}>
          <div className="d-form-field f-full">
            <label htmlFor="boq-note" className="sr">{AR ? 'التعليق' : 'Comment'}</label>
            <textarea id="boq-note" rows={3} className="d-form-input" value={note}
              placeholder={AR ? 'ملاحظة على هذا البند — تُسجَّل باسمك ولا تُحذف.' : 'A note on this item — recorded under your name and never removed.'}
              onChange={ev => setNote(ev.target.value)}
              onKeyDown={ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') postNote(); }}></textarea>
          </div>
          <div className="d-rowacts">
            <span className="d-cell-sub">{AR ? 'يُنشر باسم ' : 'Posted as '}{me}</span>
            <span className="sp"></span>
            <button className="d-btn sm primary" disabled={!note.trim()} onClick={postNote}>
              <Icon name="send" size={15} />{AR ? 'نشر' : 'Post'}</button>
          </div>
        </DRecordGrp>
      </React.Fragment>}
    </DRecordPane>);
}

// ================= Register — the shared table shell =================
function DBoqRegister({ lang, shell, D, contractTotal, projectTotal, asOf, onGoAssign, onEdit, onDelete, onAdd, onImport, onAmd,
                       acts, alloc, setAlloc, dist, setDist, bens, notes, addNote }) {
  const AR = lang === 'ar';
  const [query, setQuery] = React.useState('');
  const [allocFilter, setAllocFilter] = React.useState('all');
  const [sort, setSort] = React.useState({ k: null, d: 1 });
  const [colMenu, setColMenu] = React.useState(false);
  const [cols, setCols] = React.useState({ unit: true, qty: true, rate: true, amount: true, origAmount: false, variance: false, weight: true, activities: true, assignedWt: true, progress: true, earned: true, state: true });
  const [selId, setSelId] = React.useState(null);
  const [wide, setWide] = React.useState(false);
  const [ovMenu, setOvMenu] = React.useState(null);
  const [expanded, setExpanded] = React.useState({});
  const [views, setViews] = window.usePersistedState('boq.views', []);
  const [viewMenu, setViewMenu] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { const id = setTimeout(() => setLoading(false), 340); return () => clearTimeout(id); }, []);
  const applyView = v => { setQuery(v.query || ''); setAllocFilter(v.allocFilter || 'all'); setSort(v.sort || { k: null, d: 1 }); if (v.cols) setCols(v.cols); setViewMenu(false); };
  const saveView = () => { const name = window.prompt(AR ? 'اسم العرض' : 'View name'); if (!name || !name.trim()) return; setViews(vs => [...vs.filter(x => x.name !== name.trim()), { name: name.trim(), query, allocFilter, sort, cols }]); setViewMenu(false); };
  const delView = name => setViews(vs => vs.filter(x => x.name !== name));
  const sel = selId ? D.byCode[selId] : null;
  const CHIPS = [['all', AR ? 'الكل' : 'All'], ['full', AR ? 'مُخصَّص بالكامل' : 'Fully allocated'], ['partial', AR ? 'جزئي' : 'Partial'], ['over', AR ? 'تجاوز' : 'Over-allocated'], ['none', AR ? 'غير مُخصَّص' : 'Unassigned']];
  const match = d => { if (query && !((d.code + ' ' + d.item).toLowerCase().includes(query.toLowerCase()))) return false; if (allocFilter !== 'all' && d.state !== allocFilter) return false; return true; };
  const onSort = k => setSort(s => s.k === k ? { k, d: -s.d } : { k, d: 1 });
  const sortItems = arr => { if (!sort.k) return arr; const val = d => ({ code: d.code, unit: d.unit, qty: d.qty, rate: d.rate, amount: d.amount, weight: d.weight, activities: d.links, assignedWt: d.assignedWt, progress: d.progress, earned: d.earned, state: d.state }[sort.k]); return arr.slice().sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * sort.d; }); };
  const shownCount = D.items.filter(match).length;
  const CURH = <span className="cur">({AR ? 'د.ع' : 'IQD'})</span>;

  /* every column states its own alignment and, if it is money, its unit —
     stated once in the header, exactly as the table standard requires */
  const COLS = [
    { k: 'unit', l: AR ? 'الوحدة' : 'Unit', w: 80 },
    { k: 'qty', l: AR ? 'الكمية' : 'Quantity', r: 1, w: 96 },
    { k: 'rate', l: AR ? 'سعر الوحدة' : 'Unit rate', r: 1, w: 116, cur: 1 },
    { k: 'amount', l: AR ? 'القيمة' : 'Amount', r: 1, w: 132, cur: 1 },
    { k: 'origAmount', l: AR ? 'القيمة الأصلية' : 'Original', r: 1, w: 132, cur: 1 },
    { k: 'variance', l: AR ? 'الفرق (أمر تغييري)' : 'Variance (CO)', r: 1, w: 128, cur: 1 },
    { k: 'weight', l: AR ? 'الوزن %' : 'Weight %', r: 1, w: 88 },
    { k: 'activities', l: AR ? 'الأنشطة' : 'Activities', r: 1, w: 76 },
    { k: 'assignedWt', l: AR ? 'الوزن المُخصَّص' : 'Assigned wt', r: 1, w: 104 },
    { k: 'progress', l: AR ? 'التنفيذ' : 'Executed', w: 132 },
    { k: 'earned', l: AR ? 'القيمة المكتسبة' : 'Earned amount', r: 1, w: 132, cur: 1 },
    { k: 'state', l: AR ? 'حالة التخصيص' : 'Allocation state', w: 140 },
  ];
  const shownCols = COLS.filter(c => cols[c.k]);
  const th = c => (
    <th key={c.k} className={(c.r ? 'r' : '') + (sort.k === c.k ? ' sorted' : '')} style={{ width: c.w }}
      onClick={() => onSort(c.k)}>
      {c.l}{c.cur ? <React.Fragment> {CURH}</React.Fragment> : null}
      {sort.k === c.k && <Icon name={sort.d === 1 ? 'chevron_up' : 'chevron_down'} size={13} className="srt" />}
    </th>);
  const money = v => <DMoney v={Math.round(v)} lang={lang} size="sm" bare />;
  const cellFor = (d, c) => { switch (c.k) {
    case 'unit': return <td key={c.k} className="d-cell-sub">{d.unit}</td>;
    case 'qty': return <td key={c.k} className="r num">{window.fmtNum(d.qty)}</td>;
    case 'rate': return <td key={c.k} className="r">{money(d.rate)}</td>;
    case 'amount': return <td key={c.k} className="r">{money(d.amount)}</td>;
    case 'origAmount': return <td key={c.k} className="r d-cell-sub">{money(d.raw ? d.raw.total : d.amount)}</td>;
    case 'variance': { const v = d.amount - (d.raw ? d.raw.total : d.amount);
      return <td key={c.k} className="r">{v === 0 ? <span className="d-cell-sub">—</span> : <DMoney v={v} lang={lang} size="sm" signed bare />}</td>; }
    case 'weight': return <td key={c.k} className="r num">{d.weight.toFixed(2)}</td>;
    case 'activities': return <td key={c.k} className="r num">{d.links || '—'}</td>;
    case 'assignedWt': return <td key={c.k} className={'r num boq-aw ' + d.state}>{d.assignedWt.toFixed(2)}</td>;
    case 'progress': return <td key={c.k}><span className="d-mini-bar"><span className="t"><span style={{ width: d.progress + '%' }}></span></span><span className="pc">{d.progress}%</span></span></td>;
    case 'earned': return <td key={c.k} className="r">{money(d.earned)}</td>;
    case 'state': return <td key={c.k}><BoqStateBadge state={d.state} lang={lang} /></td>;
    default: return <td key={c.k}></td>; } };
  const divCell = (dv, c) => { const dvOrig = dv.kids.reduce((a, x) => a + (x.raw ? x.raw.total : x.amount), 0); switch (c.k) {
    case 'amount': return <td key={c.k} className="r">{money(dv.amount)}</td>;
    case 'origAmount': return <td key={c.k} className="r d-cell-sub">{money(dvOrig)}</td>;
    case 'variance': { const v = dv.amount - dvOrig;
      return <td key={c.k} className="r">{v === 0 ? <span className="d-cell-sub">—</span> : <DMoney v={v} lang={lang} size="sm" signed bare />}</td>; }
    case 'weight': return <td key={c.k} className="r num">{dv.weight.toFixed(2)}</td>;
    case 'activities': return <td key={c.k} className="r num">{dv.links || '—'}</td>;
    case 'earned': return <td key={c.k} className="r">{money(dv.earned)}</td>;
    case 'progress': return <td key={c.k}><span className="d-mini-bar"><span className="t"><span style={{ width: dv.progress + '%' }}></span></span><span className="pc">{dv.progress}%</span></span></td>;
    case 'state': return <td key={c.k}>{dv.hasOver ? <BoqStateBadge state="over" lang={lang} /> : <span className="d-cell-sub">—</span>}</td>;
    default: return <td key={c.k} className="d-cell-sub">—</td>; } };

  const itemRow = d => (
    <tr key={d.code} className={selId === d.code ? 'sel' : ''} onClick={() => setSelId(d.code)} style={{ cursor: 'pointer' }}>
      <td className="mono d-cell-sub freeze">{d.code}</td>
      <td className="d-cell-strong freeze nm">
        <span className="nmx" title={d.item}>{d.item}</span>
        {d.raw && d.raw.source === 'manual' && <span className="d-proposed">{AR ? 'يدوي' : 'manual'}</span>}
        {d.amd && <DAmdMark lang={lang} e={d.amd} onOpen={onAmd ? () => onAmd(d) : null} />}
      </td>
      {shownCols.map(c => cellFor(d, c))}
      <td className="ovc">
        <button className="d-icon-btn sm" aria-label={AR ? 'إجراءات البند' : 'Row actions'} onClick={e => { e.stopPropagation(); setOvMenu(ovMenu === d.code ? null : d.code); }}><Icon name="more_horizontal" size={17} /></button>
        {ovMenu === d.code && <React.Fragment><div className="boq-menu-scrim" onClick={e => { e.stopPropagation(); setOvMenu(null); }}></div>
          <div className="boq-ovmenu" role="menu" onClick={e => e.stopPropagation()}>
            <button role="menuitem" onClick={() => { setOvMenu(null); onGoAssign(d.code); }}><Icon name="account_tree" size={15} />{AR ? 'الربط بالأنشطة' : 'Assign activities'}</button>
            <button role="menuitem" onClick={() => { setOvMenu(null); onDistribute(d); }}><Icon name="apartment" size={15} />{AR ? 'توزيع الكميات' : 'Distribute'}</button>
            <button role="menuitem" onClick={() => { setOvMenu(null); onEdit(d); }}><Icon name="edit" size={15} />{AR ? 'تعديل' : 'Edit'}</button>
            <button role="menuitem" onClick={() => { setOvMenu(null); setSelId(d.code); }}><Icon name="list_alt" size={15} />{AR ? 'فتح السجل' : 'Open record'}</button>
            <button role="menuitem" className="danger" onClick={() => { setOvMenu(null); onDelete(d); }}><Icon name="delete" size={15} />{AR ? 'حذف' : 'Delete'}</button>
          </div></React.Fragment>}
      </td>
    </tr>);

  const S = shell || {};
  const nCols = shownCols.length + 3;
  return (
    <DModuleFrame
      title={S.title} sub={S.sub}
      tabs={S.tabs} tab={S.tab} onTab={S.onTab}
      toolbar={S.toolbar}
      actions={<React.Fragment>
        {/* Z6 carries only what acts on the MODULE */}
        <button className="d-btn sm" onClick={onAdd}><Icon name="add" size={15} />{AR ? 'إدخال يدوي' : 'Manual entry'}</button>
        <button className="d-btn sm" onClick={onImport}><Icon name="upload_file" size={15} />{AR ? 'استيراد' : 'Import'}</button>
        {S.benBtn}
      </React.Fragment>}
      aside={S.editPane || (sel ? <DBoqRecordPanel lang={lang} d={sel} wide={wide} onExpand={() => setWide(w => !w)}
        onClose={() => { setSelId(null); setWide(false); }} onGoAssign={onGoAssign} onEdit={onEdit} onAmd={onAmd}
        acts={acts} alloc={alloc} setAlloc={setAlloc} dist={dist} setDist={setDist} bens={bens}
        notes={notes} addNote={addNote} /> : null)}
      asideWide={S.editPane ? S.editWide : wide}
      status={<DZ10 lang={lang} asOf={asOf} stats={[
        { k: AR ? 'البنود' : 'Items', v: shownCount + ' / ' + D.items.length },
        { k: AR ? 'قيمة العقد' : 'Contract value', v: Math.round(contractTotal), money: true },
        projectTotal ? { k: AR ? 'قيمة المشروع' : 'Project value', v: Math.round(projectTotal), money: true } : null,
      ]} />}>

      <DFGroup id="boq-reg" flush
        title={AR ? 'بنود جدول الكميات' : 'Bill of quantities'}
        sub={(S.sub ? S.sub + ' · ' : '') + D.items.length + (AR ? ' بند' : ' item(s)')}>
        <div className="d-toolbar">
          <div className="d-field">
            <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
            <input aria-label={AR ? 'بحث في البنود' : 'Search items'} placeholder={AR ? 'بحث بالرمز أو الوصف…' : 'Search by code or description…'} value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="grp">{CHIPS.map(([k, l]) => (
            <button key={k} className={'d-fchip ' + (allocFilter === k ? 'on' : '')} onClick={() => setAllocFilter(k)}>
              {k !== 'all' && <span className={'dot ' + k}></span>}{l}<span className="n">{D.counts[k]}</span></button>))}</div>
          <div className="sp"></div>
          {(allocFilter !== 'all' || query) && <button className="d-btn sm ghost" onClick={() => { setAllocFilter('all'); setQuery(''); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
          {/* grid-scoped controls stay with the grid they act on */}
          <div className="boq-colmenu-wrap">
            <button className="d-btn sm ghost" aria-haspopup="true" aria-expanded={viewMenu} onClick={() => setViewMenu(v => !v)}>
              <Icon name="view_list" size={15} />{AR ? 'العروض' : 'Views'}{views.length > 0 && <span className="n">{views.length}</span>}</button>
            {viewMenu && <React.Fragment><div className="boq-menu-scrim" onClick={() => setViewMenu(false)}></div>
              <div className="boq-colmenu" role="menu" style={{ width: 250 }}>
                {views.length ? views.map(v => (<div key={v.name} className="row viewrow"><button className="vw" onClick={() => applyView(v)}><Icon name="check_circle" size={14} />{v.name}</button><button className="del" aria-label={AR ? 'حذف' : 'Delete'} onClick={() => delView(v.name)}><Icon name="close" size={13} /></button></div>))
                  : <div className="row" style={{ color: 'var(--on-surface-variant)', cursor: 'default' }}>{AR ? 'لا عروض محفوظة' : 'No saved views'}</div>}
                <div className="row save" onClick={saveView}><Icon name="add" size={14} />{AR ? 'حفظ العرض الحالي…' : 'Save current view…'}</div>
              </div></React.Fragment>}
          </div>
          <div className="boq-colmenu-wrap">
            <button className="d-btn sm ghost" aria-haspopup="true" aria-expanded={colMenu} onClick={() => setColMenu(v => !v)}>
              <Icon name="view_column" size={15} />{AR ? 'الأعمدة' : 'Columns'}</button>
            {colMenu && <React.Fragment><div className="boq-menu-scrim" onClick={() => setColMenu(false)}></div>
              <div className="boq-colmenu" role="menu">{COLS.map(c => <label key={c.k} className="row"><input type="checkbox" checked={cols[c.k]} onChange={() => setCols(o => ({ ...o, [c.k]: !o[c.k] }))} /><span>{c.l}</span></label>)}</div></React.Fragment>}
          </div>
        </div>

        <div className="d-vow-tw wide-boq">
          <table className="d-line-table d-boqgrid">
            <thead><tr>
              <th className="freeze" style={{ width: 96 }} onClick={() => onSort('code')}>{AR ? 'الرمز' : 'Code'}{sort.k === 'code' && <Icon name={sort.d === 1 ? 'chevron_up' : 'chevron_down'} size={13} className="srt" />}</th>
              <th className="freeze nm" style={{ minWidth: 240 }}>{AR ? 'الوصف' : 'Description'}</th>
              {shownCols.map(th)}
              <th style={{ width: 44 }} aria-label={AR ? 'إجراءات' : 'Actions'}></th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={'sk' + i}><td className="freeze"><span className="boq-skel" style={{ width: '70%' }}></span></td>
                  <td className="freeze nm"><span className="boq-skel" style={{ width: (55 + (i * 7) % 30) + '%' }}></span></td>
                  {shownCols.map(c => <td key={c.k} className={c.r ? 'r' : ''}><span className="boq-skel" style={{ width: c.r ? '54px' : '70%' }}></span></td>)}<td></td></tr>))
              : D.items.length === 0 ? (
                <tr><td className="empty" colSpan={nCols}>
                  <div className="d-empty">
                    <span className="d-empty-ico"><Icon name="inbox" size={26} /></span>
                    <b>{AR ? 'لا بنود كميات لهذا العقد' : 'No BOQ imported for this contract'}</b>
                    <span>{AR ? 'استورد كشف الكميات أو أدخِل البنود يدوياً للبدء.' : 'Import the BOQ sheet or add items manually to start.'}</span>
                    <div className="acts"><button className="d-btn sm primary" onClick={onImport}><Icon name="upload_file" size={15} />{AR ? 'استيراد كشف الكميات' : 'Import BOQ'}</button>
                      <button className="d-btn sm" onClick={onAdd}><Icon name="add" size={15} />{AR ? 'إدخال يدوي' : 'Manual entry'}</button></div>
                  </div>
                </td></tr>)
              : D.divisions ? D.divisions.map(dv => {
                const kids = sortItems(dv.kids.filter(match));
                if (!kids.length && (query || allocFilter !== 'all')) return null;
                const open = expanded[dv.key] !== false;
                return (<React.Fragment key={dv.key}>
                  <tr className="lvl1" onClick={() => setExpanded(o => ({ ...o, [dv.key]: o[dv.key] === false }))} style={{ cursor: 'pointer' }}>
                    <td className="freeze"><Icon name={open ? 'expand_more' : (AR ? 'chevron_left' : 'chevron_right')} size={15} className="tw" /></td>
                    <td className="freeze nm"><b>{dv.name}</b></td>
                    {shownCols.map(c => divCell(dv, c))}
                    <td></td>
                  </tr>
                  {open && kids.map(itemRow)}
                </React.Fragment>);
              }) : sortItems(D.items.filter(match)).map(itemRow)}
              {!loading && D.items.length > 0 && !shownCount && <tr><td className="empty" colSpan={nCols}><span className="d-cell-sub">{AR ? 'لا بنود مطابقة.' : 'No matching items.'}</span></td></tr>}
            </tbody>
            {!loading && D.items.length > 0 && <tfoot><tr>
              <td className="freeze"></td>
              <td className="freeze nm">{AR ? 'الإجمالي' : 'Totals'}</td>
              {shownCols.map(c => {
                if (c.k === 'amount') return <td key={c.k} className="r">{money(contractTotal)}</td>;
                if (c.k === 'origAmount') return <td key={c.k} className="r">{money(D.items.reduce((a, x) => a + (x.raw ? x.raw.total : x.amount), 0))}</td>;
                if (c.k === 'variance') { const vv = D.items.reduce((a, x) => a + (x.amount - (x.raw ? x.raw.total : x.amount)), 0);
                  return <td key={c.k} className="r">{vv === 0 ? <span className="d-cell-sub">—</span> : <DMoney v={vv} lang={lang} size="sm" signed bare />}</td>; }
                if (c.k === 'weight') return <td key={c.k} className="r num">100.00</td>;
                if (c.k === 'earned') return <td key={c.k} className="r">{money(D.items.reduce((a, x) => a + x.earned, 0))}</td>;
                if (c.k === 'activities') return <td key={c.k} className="r num">{D.items.reduce((a, x) => a + x.links, 0)}</td>;
                return <td key={c.k}></td>;
              })}
              <td></td>
            </tr></tfoot>}
          </table>
        </div>

        <div className="d-pager calcnote">
          <Icon name="functions" size={14} />
          <span>{AR ? 'الأوزان من قيمة العقد؛ نسبة التنفيذ من الأنشطة المرتبطة.' : 'Weights from contract value; executed % from linked activities.'}</span>
        </div>
      </DFGroup>
    </DModuleFrame>);
}

Object.assign(window, { DBoqRegister, DBoqRecordPanel, boqDeriveReal, boqWeightMap, boqAllocPct, boqAllocState, boqDupSet, BOQ_STATE, BOQ_TOL, BoqStateBadge, Money, cur });
