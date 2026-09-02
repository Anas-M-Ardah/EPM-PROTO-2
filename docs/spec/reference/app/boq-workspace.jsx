/* ============================================================
   BOQ workspace — the redesigned BOQ module, driven by the
   project's REAL data. Owns `alloc` (single source of truth for
   BOQ↔activity), the real BOQ rows, distribution, beneficiaries
   and contract selection, and reuses the existing drawers so no
   capability of the old module is lost:
     • contract selector (DContractCtx)
     • add / edit / delete items  (persisted boq.rows.<pid>)
     • batch import (DImportWizard) · import distribution (DDistImport)
     • quantity distribution per item (DBoqDistDrawer)
     • beneficiaries (DBenDrawer)
     • amendment-aware quantities (amendmentIndex → effQty/effVal)
   Two tabs: Register · Activity assignment. Distribution and
   beneficiaries are row actions / a toolbar button.
   ============================================================ */
function DBoqWorkspace({ t, lang, d, p, showToast }) {
  const AR = lang === 'ar';
  const pid = (p && p.id) || 'na';
  const contracts = d.contracts || [{ key: 'main', name: AR ? 'العقد' : 'Contract', code: d.contract.code, status: d.contract.status, raw: d.contract.raw }];
  /* open on the first contract rather than gating the page behind a picker:
     the selector in Z6 is right there, and an empty page teaches nothing */
  const [ckey, setCkey] = React.useState(contracts[0] ? contracts[0].key : null);
  const [screen, setScreen] = React.useState('register');
  const [focusCode, setFocusCode] = React.useState(null);

  // ---- persisted real state (same keys as the old module → data continuity) ----
  const [allRows, setAllRows] = window.usePersistedState('boq.rows.' + pid, function () { return d.boq; });
  const [dist, setDist] = window.usePersistedState('boq.dist.' + pid, {});
  const [assigned, setAssigned] = window.usePersistedState('boq.assigned.' + pid, function () { return window.projectBeneficiaries(p).map(b => b.code); });
  const [alloc, setAlloc] = window.usePersistedState('boq2.alloc.' + pid, {});
  const [basis, setBasis] = React.useState('cost');

  // ---- drawers / dialogs ----
  const [distOpen, setDistOpen] = React.useState(null);
  const [benOpen, setBenOpen] = React.useState(false);
  const [showImp, setShowImp] = React.useState(false);
  const [showDistImp, setShowDistImp] = React.useState(false);
  const [amdOpen, setAmdOpen] = React.useState(null);
  /* comments on a BOQ item — part of the item's record, so they persist with
     the rest of it and survive a reload like every other edit here */
  const [notes, setNotes] = window.usePersistedState('boq.notes.' + pid, {});
  const addNote = (code, text) => {
    const U = (window.EPM && window.EPM.CURRENT_USER) || {};
    const by = (U.name && (AR ? U.name.ar : U.name.en)) || (AR ? 'المستخدم الحالي' : 'Current user');
    const z = new Date(); const pad = v => String(v).padStart(2, '0');
    const at = z.getFullYear() + '-' + pad(z.getMonth() + 1) + '-' + pad(z.getDate()) + ' ' + pad(z.getHours()) + ':' + pad(z.getMinutes());
    setNotes(prev => Object.assign({}, prev, { [code]: (prev[code] || []).concat([{ at, by, text }]) }));
    showToast(AR ? 'أُضيف التعليق إلى سجل البند' : 'Comment added to the item history');
  };
  const [editItem, setEditItem] = React.useState(null);   // {mode:'add'|'edit', code, item, unit, qty, price}
  const [delItem, setDelItem] = React.useState(null);
  React.useEffect(() => { const h = () => setShowImp(true); window.addEventListener('epm:boq-import', h); return () => window.removeEventListener('epm:boq-import', h); }, []);

  const bens = window.BENEFICIARIES.filter(b => assigned.includes(b.code) && b.active);
  const rows = React.useMemo(() => allRows.filter(r => window.contractKeyOfBoq(r, contracts) === ckey), [allRows, ckey, contracts]);
  // amendment-aware effective quantity / value (applied change orders shift qty)
  const amdIdx = React.useMemo(() => (window.amendmentIndex ? window.amendmentIndex(d, lang, p) : { boq: {}, acts: {} }), [d, lang, pid]);
  const amdOf = code => (amdIdx.boq[code] && amdIdx.boq[code].srcs && amdIdx.boq[code].srcs.length) ? amdIdx.boq[code] : null;
  const effQty = r => { const e = amdOf(r.code); return e && e.applied ? e.eff : r.contractedQty; };
  const effVal = r => { const e = amdOf(r.code); return e && e.applied ? e.effValue : r.contractedQty * r.price; };
  const effRate = r => { const e = amdOf(r.code); return e && e.banded ? e.effRate : r.price; };

  // ---- real schedule activities for this contract ----
  const sd = React.useMemo(() => (p ? window.EPM.buildScheduleData(p, lang) : { activities: [] }), [pid, lang]);
  const acts = React.useMemo(() => sd.activities.filter(a => a.type === 'act' && !a.milestone).filter(a => !ckey || window.contractKeyOfAct(a, contracts) === ckey), [sd, ckey, contracts]);
  const wbsTree = React.useMemo(() => sd.activities.filter(a => !a.milestone).filter(a => a.type !== 'act' || !ckey || window.contractKeyOfAct(a, contracts) === ckey), [sd, ckey, contracts]);

  // ---- seed `alloc` from the default BOQ↔activity links (auto shares by abs weight) ----
  React.useEffect(() => {
    if (!ckey || !rows.length || !acts.length) return;
    setAlloc(prev => {
      const next = { ...prev }; let changed = false;
      const links = window.defaultBOQLinks(rows, acts);
      rows.forEach(b => {
        if (next[b.code] !== undefined) return;
        const linked = links.filter(l => l.boqNo === b.no).map(l => acts.find(a => a.id === l.activityId)).filter(Boolean);
        const sumW = linked.reduce((s, a) => s + (a.wCostAbs || 0), 0) || 1;
        next[b.code] = linked.map(a => ({ act: a.id, pct: +((a.wCostAbs || 0) / sumW * 100).toFixed(1) }));
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [ckey, rows.length, acts.length]);

  const D = React.useMemo(() => window.boqDeriveReal(rows, alloc, acts, lang, { effQty, effVal, effRate, amdOf, dist }), [rows, alloc, acts, lang, amdIdx, dist]);
  const contractTotal = D.contractTotal || 1;
  const projectTotal = React.useMemo(() => contracts.reduce((a, c) => a + allRows.filter(r => window.contractKeyOfBoq(r, contracts) === c.key).reduce((s, r) => s + r.total, 0), 0), [allRows, contracts]);
  const overCount = D.counts.over;
  const D0count = D.items.length;

  const goAssign = code => { setFocusCode(code); setScreen('assign'); };

  // ---- add / edit / delete ----
  /* the divisions already in this contract's sheet — a new item has to be
     filed under one of them or it lands in the unclassified group */
  const divisions = React.useMemo(() => {
    const seen = {}, out = [];
    /* only this contract's divisions — a division belongs to the sheet it
       was imported with, so offering another contract's would misfile the row */
    rows.forEach(r => { if (r.div && !seen[r.div]) { seen[r.div] = 1; out.push({ key: r.div, name: r.divName || r.div }); } });
    return out;
  }, [rows]);
  const startAdd = () => setEditItem({ mode: 'add', item: '', unit: '', qty: '', price: '',
    div: (divisions[0] || {}).key || '', divNew: '', executed: '0' });
  const startEdit = row => {
    /* callers pass either the stored row or the derived item — take the raw
       row when there is one, and fall back to the derived field names */
    const r = (row && row.raw) || row || {};
    const num = v => (v == null || v !== v ? '' : String(v));
    setEditItem({ mode: 'edit', code: r.code || row.code, item: r.item || row.item,
      unit: r.unit || row.unit || '',
      qty: num(r.contractedQty != null ? r.contractedQty : row.qty),
      price: num(r.price != null ? r.price : row.rate),
      div: r.div || '', divNew: '',
      executed: num(r.executedQty != null ? r.executedQty : 0),
      source: r.source });
  };
  /* '__new' means the user is naming a division that does not exist yet.
     A division has no record of its own — it lives as a label on the rows
     filed under it — so it comes into being with the first item that uses it. */
  const resolveDiv = it => {
    if (it.div !== '__new') { const dv = divisions.find(x => x.key === it.div);
      return { key: it.div || undefined, name: dv ? dv.name : undefined }; }
    const name = (it.divNew || '').trim();
    if (!name) return { key: undefined, name: undefined };
    const hit = divisions.find(x => x.name === name);
    if (hit) return { key: hit.key, name: hit.name };
    const nx = allRows.reduce((m, r) => Math.max(m, parseInt(String(r.div || '').replace(/\D/g, ''), 10) || 0), 0) + 1;
    return { key: 'D' + nx, name: name };
  };
  const saveItem = () => {
    const it = editItem; const q = parseFloat(it.qty), pr = parseFloat(it.price);
    if (!it.item.trim() || !q || !pr) { showToast(AR ? 'أكمل الحقول' : 'Fill in the fields'); return; }
    if (it.div === '__new' && !(it.divNew || '').trim()) {
      showToast(AR ? 'اكتب اسم الباب الجديد' : 'Name the new division'); return; }
    if (it.mode === 'add') {
      setAllRows(rs => {
        /* the code is now just the next number in the sheet — it no longer has
           to be juggled to make a parity rule land on the right contract */
        const nx = rs.reduce((m, x) => Math.max(m, parseInt(String(x.code).replace(/\D/g, ''), 10) || 0), 0) + 1;
        const dv = resolveDiv(it);
        return [...rs, { no: rs.length + 1, code: 'BQ-' + String(nx).padStart(3, '0'), item: it.item, unit: it.unit || '—',
          contractedQty: q, executedQty: Math.min(parseFloat(it.executed) || 0, q), price: pr, total: q * pr,
          source: 'manual', contractKey: ckey, div: dv.key, divName: dv.name }]; });
      showToast(AR ? 'أُضيف البند' : 'Item added');
    } else {
      setAllRows(rs => rs.map(r => { if (r.code !== it.code) return r;
        const dv = resolveDiv(it);
        return { ...r, item: it.item, unit: it.unit || '—', contractedQty: q, price: pr, total: q * pr,
          executedQty: Math.min(parseFloat(it.executed) || 0, q), div: dv.key, divName: dv.name }; }));
      showToast(AR ? 'حُفظ التعديل' : 'Changes saved');
    }
    setEditItem(null);
  };
  const removeItem = code => { setAllRows(rs => rs.filter(r => r.code !== code)); setDist(dd => { const o = { ...dd }; delete o[code]; return o; }); setAlloc(a => { const o = { ...a }; delete o[code]; return o; }); setDelItem(null); showToast(AR ? 'حُذف البند' : 'Item deleted'); };
  const applyDistImport = valid => { setDist(dd => { const out = { ...dd }; valid.forEach(r => { out[r.code] = [...(out[r.code] || []).filter(x => x.ben !== r.ben), { ben: r.ben, site: r.site, qty: r.qty }]; }); return out; }); setShowDistImp(false); showToast(AR ? 'طُبِّق التوزيع المستورد' : 'Imported distribution applied'); };

  /* the module's shell slots, built once and handed to whichever screen is
     showing — so Z5/Z6/Z10 are page-level bars like every other module,
     not chrome nested inside the grid card */
  const TABS = [
    { id: 'register', label: AR ? 'السجل' : 'Register', n: D0count },
    { id: 'assign', label: AR ? 'الربط بالأنشطة' : 'Activity assignment', n: overCount || null },
  ];
  const ctxToolbar = (
    <React.Fragment>
      {contracts.length > 1 && (
        <label className="d-ctxsel"><span>{AR ? 'العقد' : 'Contract'}</span>
          <select value={ckey || ''} onChange={e => setCkey(e.target.value || null)}>
            <option value="">{AR ? '— اختر عقداً —' : '— select —'}</option>
            {contracts.map(c => <option key={c.key} value={c.key}>{c.code} — {c.name}</option>)}
          </select></label>
      )}
    </React.Fragment>
  );
  const benBtn = (
    <button className="d-btn sm" onClick={() => setBenOpen(true)}>
      <Icon name="apartment" size={15} />{AR ? 'الجهات المستفيدة' : 'Beneficiaries'}</button>
  );
  /* width follows the data: a description needs the row, a quantity needs
     six digits, a unit needs three characters. `w` is the column span. */
  /* a money figure is read in thousands — show the grouping while it is
     typed, keep the raw number in state */
  const grp = v => { const t = String(v == null ? '' : v); if (!t) return '';
    const [i, d] = t.split('.'); const gi = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return d != null ? gi + '.' + d : gi; };
  const ef = (k, val, on, opts) => { const o = opts || {};
    const id = 'f-' + (o.id || k.replace(/\s/g, ''));
    const bad = o.req && touched[id] && !String(val == null ? '' : val).trim();
    return (
      <div className={'d-form-field ' + (o.w || 'f-full')}>
        <label htmlFor={id}>{k}{o.req && <span className="req" aria-hidden="true">*</span>}</label>
        <span className={'d-inp' + (o.suffix ? ' has-suffix' : '') + (bad ? ' bad' : '')}>
          <input id={id} className={'d-form-input' + (o.num ? ' num' : '')}
            value={o.money ? grp(val) : val} placeholder={o.ph}
            inputMode={o.num ? 'decimal' : undefined}
            aria-required={o.req ? 'true' : undefined} aria-invalid={bad ? 'true' : undefined}
            aria-describedby={bad ? id + '-e' : undefined}
            onBlur={() => mark(id)}
            onChange={e => on(o.num ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)} />
          {o.suffix && <i>{o.suffix}</i>}
        </span>
        {bad && <span className="d-form-err" id={id + '-e'}>{AR ? 'هذا الحقل مطلوب' : 'This field is required'}</span>}
        {o.hint && !bad && <span className="d-form-hint">{o.hint}</span>}
      </div>); };
  const sf = (k, val, on, options, opts) => { const o = opts || {};
    const id = 'f-' + (o.id || k.replace(/\s/g, ''));
    const bad = o.req && touched[id] && !String(val == null ? '' : val).trim();
    return (
      <div className={'d-form-field ' + (o.w || 'f-full')}>
        <label htmlFor={id}>{k}{o.req && <span className="req" aria-hidden="true">*</span>}</label>
        <select id={id} className={'d-form-input' + (bad ? ' bad' : '')} value={val} onBlur={() => mark(id)}
          aria-required={o.req ? 'true' : undefined} aria-invalid={bad ? 'true' : undefined}
          onChange={e => on(e.target.value)}>
          {options.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}
        </select>
        {bad && <span className="d-form-err">{AR ? 'اختر قيمة' : 'Pick a value'}</span>}
      </div>); };
  /* a read-only attribute reads as a value pair — the doc's `.kv` — not as
     an input the user will keep trying to type into */
  const rf = (k, val, w, num) => (
    <div className={'d-form-i ' + (w || 'f-half')}><span className="k">{k}</span>
      <span className={'v' + (num ? ' num' : '')}>{val}</span></div>);
  /* the units actually in use in this project, plus the standard ones, plus
     whatever the row being edited carries — a select that cannot represent
     its own value silently reads as empty */
  const UNITS = React.useMemo(() => {
    const std = AR ? ['م³', 'م²', 'م.ط', 'عدد', 'كغم', 'طن', 'نقطة', 'مقطوعية']
                   : ['m³', 'm²', 'l.m', 'no.', 'kg', 'ton', 'pt', 'L.S.'];
    const seen = {}, out = [];
    allRows.forEach(r => { const u = r.unit; if (u && u !== '—' && !seen[u]) { seen[u] = 1; out.push(u); } });
    std.forEach(u => { if (!seen[u]) { seen[u] = 1; out.push(u); } });
    if (editItem && editItem.unit && !seen[editItem.unit]) out.unshift(editItem.unit);
    return out;
  }, [allRows, editItem && editItem.unit]);
  /* Adding or editing an item is a record edit, so it opens in the page's
     docked Z8 pane like every other record — not in a drawer over the grid,
     which hid the very rows the new item has to sit among. */
  const [editWide, setEditWide] = React.useState(false);
  const [touched, setTouched] = React.useState({});
  const mark = id => setTouched(t => (t[id] ? t : Object.assign({}, t, { [id]: 1 })));
  const [editSeed, setEditSeed] = React.useState(null);
  React.useEffect(() => {
    if (!editItem) { setEditWide(false); setTouched({}); setEditSeed(null); }
    else if (!editSeed) setEditSeed(JSON.stringify(editItem));
  }, [editItem]);
  const editDirty = !!(editItem && editSeed && JSON.stringify(editItem) !== editSeed);
  const editValid = !!(editItem && String(editItem.item || '').trim() && String(editItem.unit || '').trim()
    && parseFloat(editItem.qty) > 0 && parseFloat(editItem.price) > 0
    && (editItem.div !== '__new' || String(editItem.divNew || '').trim()));
  const overExec = !!(editItem && parseFloat(editItem.executed) > parseFloat(editItem.qty));
  /* the required fields, in the order they appear — so a failed save can
     take the user to the first one rather than describing it */
  const REQ = ['f-الوصف', 'f-الوحدة', 'f-qty', 'f-rate'];
  const trySave = () => {
    if (editValid) { saveItem(); return; }
    const t = {}; REQ.forEach(id => { t[id] = 1; });
    if (editItem && editItem.div === '__new') t['f-اسمالبابالجديد'] = 1;
    setTouched(t);
    /* let the errors render, then put the caret on the first offender */
    window.requestAnimationFrame(() => {
      const bad = document.querySelector('.d-rpane [aria-invalid="true"], .d-rpane .d-form-input.bad');
      if (bad) { bad.focus(); bad.scrollIntoView({ block: 'nearest' }); }
    });
  };
  const editPane = editItem ? (
    <DRecordPane lang={lang} wide={editWide} onExpand={() => setEditWide(v => !v)}
      title={editItem.mode === 'add' ? (AR ? 'إضافة بند' : 'Add item')
        : (AR ? 'تعديل — ' : 'Edit — ') + (editItem.code || editItem.item)}
      meta={null}
      onClose={() => setEditItem(null)}
      footer={<React.Fragment>
        <span className={'d-form-state' + (editDirty ? ' dirty' : '')}>
          {editDirty ? (AR ? 'تغييرات غير محفوظة' : 'Unsaved changes') : ''}</span>
        <button className="d-btn sm" onClick={() => setEditItem(null)}>{AR ? 'إلغاء' : 'Cancel'}</button>
        <button className="d-btn sm primary" disabled={!editDirty} onClick={trySave}>
          <Icon name="check" size={15} />{AR ? 'حفظ' : 'Save'}</button>
      </React.Fragment>}>
      <DRecordGrp label={AR ? 'التصنيف' : 'Classification'}>
        <div className="d-form-grid">
          {rf(AR ? 'العقد' : 'Contract', (contracts.find(c => c.key === ckey) || {}).code || '—', 'f-ro', true)}
          {rf(AR ? 'الرمز' : 'Code', editItem.mode === 'add' ? (AR ? 'يُولَّد تلقائياً' : 'auto-generated') : editItem.code,
            'f-ro', editItem.mode !== 'add')}
          {rf(AR ? 'المصدر' : 'Source', editItem.mode === 'add' || editItem.source === 'manual'
            ? (AR ? 'إدخال يدوي' : 'Manual entry') : (AR ? 'مستورد' : 'Imported'), 'f-ro')}
          {sf(AR ? 'الباب' : 'Division', editItem.div, v => setEditItem(s2 => ({ ...s2, div: v })),
            [{ v: '', l: AR ? '— بدون باب —' : '— unclassified —' }]
              .concat(divisions.map(x => ({ v: x.key, l: x.name })))
              .concat([{ v: '__new', l: AR ? '+ باب جديد…' : '+ New division…' }]),
            { req: true })}
          {editItem.div === '__new' && ef(AR ? 'اسم الباب الجديد' : 'New division name',
            editItem.divNew, v => setEditItem(s2 => ({ ...s2, divNew: v })),
            { ph: AR ? 'مثال: الأعمال الصحية' : 'e.g. Plumbing works', req: true })}
        </div>
      </DRecordGrp>
      <DRecordGrp label={AR ? 'بيانات البند' : 'Item details'}>
        <div className="d-form-grid">
          {ef(AR ? 'الوصف' : 'Description', editItem.item, v => setEditItem(s2 => ({ ...s2, item: v })),
            { ph: AR ? 'وصف البند كما يرد في كشف الكميات' : 'Description as it reads in the BOQ', req: true })}
          {sf(AR ? 'الوحدة' : 'Unit', editItem.unit, v => setEditItem(s2 => ({ ...s2, unit: v })),
            [{ v: '', l: '—' }].concat(UNITS.map(u => ({ v: u, l: u }))), { w: 'f-third', req: true })}
          {ef(AR ? 'الكمية التعاقدية' : 'Contract quantity', editItem.qty, v => setEditItem(s2 => ({ ...s2, qty: v })),
            { ph: '0', num: true, money: true, w: 'f-third', req: true, suffix: editItem.unit || '', id: 'qty' })}
          {ef(AR ? 'الكمية المنفذة' : 'Executed quantity', editItem.executed, v => setEditItem(s2 => ({ ...s2, executed: v })),
            { ph: '0', num: true, money: true, w: 'f-third', suffix: editItem.unit || '', id: 'exec',
              hint: overExec ? (AR ? 'أكبر من الكمية التعاقدية — ستُقصَر عند الحفظ' : 'Above the contract quantity — it will be capped on save') : null })}
          {ef(AR ? 'سعر الوحدة' : 'Unit rate', editItem.price, v => setEditItem(s2 => ({ ...s2, price: v })),
            { ph: '0', num: true, money: true, req: true, suffix: AR ? 'د.ع' : 'IQD', id: 'rate' })}
        </div>
      </DRecordGrp>
      <DRecordGrp label={AR ? 'القيم المحتسبة' : 'Computed'}>
        <div className="d-form-grid">
          <div className="d-form-i f-half"><span className="k">{AR ? 'قيمة البند' : 'Amount'}<span className="d-proposed">calc</span></span>
            <span className="v"><DMoney v={(parseFloat(editItem.qty) || 0) * (parseFloat(editItem.price) || 0)} lang={lang} size="sm" /></span></div>
          <div className="d-form-i f-half"><span className="k">{AR ? 'نسبة التنفيذ' : 'Executed %'}<span className="d-proposed">calc</span></span>
            <span className="v num">{(() => { const q = parseFloat(editItem.qty) || 0, e2 = parseFloat(editItem.executed) || 0;
              return q ? Math.round(Math.min(e2, q) / q * 100) + '%' : '—'; })()}</span></div>
        </div>
      </DRecordGrp>
    </DRecordPane>
  ) : null;
  const shell = { tabs: TABS, tab: screen, onTab: setScreen, toolbar: ctxToolbar, benBtn, editPane, editWide,
    title: t('mod_boq'), sub: (contracts.find(c => c.key === ckey) || {}).code };

  return (
    <div className="boq-ws">
      {/* reused drawers / dialogs */}
      {showImp && <DImportWizard lang={lang} kind="boq" onClose={() => setShowImp(false)} onDone={() => { setShowImp(false); showToast(AR ? 'استُوردت البنود ورُبطت بالعقد' : 'Items imported and linked'); }} />}
      {showDistImp && <DDistImport lang={lang} rows={rows} bens={bens} dist={dist} onApply={applyDistImport} onClose={() => setShowDistImp(false)} />}
      {benOpen && <DBenDrawer lang={lang} assigned={assigned} onClose={() => setBenOpen(false)} onToggle={c => setAssigned(a => a.includes(c) ? a.filter(x => x !== c) : [...a, c])} />}
      {distOpen && <DBoqDistDrawer lang={lang} row={distOpen.raw || distOpen} bens={bens} list={dist[distOpen.code] || []} onChange={l => setDist(dd => ({ ...dd, [distOpen.code]: l }))} onClose={() => setDistOpen(null)} />}
      {amdOpen && amdOf(amdOpen.code) && <DAmdPanel lang={lang} kind="boq" e={amdOf(amdOpen.code)} code={amdOpen.code} name={amdOpen.item} unit={amdOpen.unit} onClose={() => setAmdOpen(null)} />}
      {delItem && <div className="d-modal-scrim" onClick={() => setDelItem(null)}><div className="d-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="d-modal-head"><b>{AR ? 'حذف البند' : 'Delete item'}</b><button className="d-icon-btn" onClick={() => setDelItem(null)}><Icon name="close" size={18} /></button></div>
        <div className="d-modal-body"><div className="boq-banner over"><Icon name="warning" size={16} /><span>{AR ? 'حذف «' + delItem.item + '» وتوزيعه وتخصيصاته المرتبطة؟' : 'Delete "' + delItem.item + '" and its distribution and allocations?'}</span></div></div>
        <div className="d-modal-foot"><div style={{ flex: 1 }}></div><button className="d-btn" onClick={() => setDelItem(null)}>{AR ? 'إلغاء' : 'Cancel'}</button><button className="d-btn primary" onClick={() => removeItem(delItem.code)}>{AR ? 'حذف' : 'Delete'}</button></div>
      </div></div>}

      {!ckey ? (
        <DModuleFrame title={shell.title} tabs={shell.tabs} tab={screen} onTab={setScreen} toolbar={ctxToolbar} actions={benBtn}>
          <div className="boq-editor-empty" style={{ flex: 1 }}><div className="tile"><Icon name="description" size={27} /></div>
            <b>{AR ? 'اختر عقداً للبدء' : 'Select a contract to start'}</b>
            <span>{AR ? 'البنود والأنشطة تنتمي إلى عقد واحد.' : 'Items and activities belong to one contract.'}</span></div>
        </DModuleFrame>
      )
        : screen === 'register'
          ? <DBoqRegister lang={lang} shell={shell} D={D} contractTotal={contractTotal} projectTotal={projectTotal} asOf={d.asOf}
              onGoAssign={goAssign} onEdit={startEdit} onDelete={setDelItem} onAdd={startAdd} onImport={() => setShowImp(true)}
              acts={acts} alloc={alloc} setAlloc={setAlloc} dist={dist} setDist={setDist} bens={bens}
              onAmd={setAmdOpen} notes={notes} addNote={addNote} />
          : <DBoqAssign lang={lang} shell={shell} D={D} acts={acts} wbsTree={wbsTree} alloc={alloc} setAlloc={setAlloc} basis={basis} setBasis={setBasis} focusCode={focusCode} showToast={showToast} />}
    </div>);
}
Object.assign(window, { DBoqWorkspace });
