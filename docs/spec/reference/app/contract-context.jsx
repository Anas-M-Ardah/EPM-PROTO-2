// Contract as the working context.
//
// Hierarchy: Organization → Beneficiary → Project → Contract → BOQ items + Activities.
// A BOQ item and an activity each belong to exactly ONE contract; the project is
// derived from the contract and never asked for again. Beneficiaries are a generic
// master list (no hard-coded "university" field) and a BOQ quantity may be
// distributed across several of them, so distribution is its own relation — never a
// single column on the BOQ row.
//
// Loaded after project-modules.jsx, so the DModBOQ here replaces the earlier one.

// contract status arrives as a raw key ('ongoing'), not a localized object
function ctStatusLabel(status, lang) {
  if (!status) return '—';
  if (typeof status === 'string') {
    const s = (window.EPM && window.EPM.STATUS && window.EPM.STATUS[status]) || null;
    return s ? (s[lang] || s.en || status) : status;
  }
  return status[lang] || status.en || '—';
}

const BEN_TYPES = [
  ['university', { ar: 'جامعة', en: 'University' }],
  ['department', { ar: 'دائرة', en: 'Department' }],
  ['campus', { ar: 'حرم جامعي', en: 'Campus' }],
  ['site', { ar: 'موقع', en: 'Site' }],
  ['facility', { ar: 'منشأة', en: 'Facility' }],
  ['other', { ar: 'أخرى', en: 'Other' }],
];
const BEN_TYPE_L = Object.fromEntries(BEN_TYPES);

const BENEFICIARIES = [
  { code: 'BEN-UOB', ar: 'جامعة بغداد', en: 'University of Baghdad', type: 'university', parent: { ar: 'وزارة التعليم العالي', en: 'Ministry of Higher Education' }, active: true },
  { code: 'BEN-UOB-ENG', ar: 'كلية الهندسة — جامعة بغداد', en: 'College of Engineering — UoB', type: 'department', parent: { ar: 'جامعة بغداد', en: 'University of Baghdad' }, active: true },
  { code: 'BEN-UOB-JAD', ar: 'حرم الجادرية', en: 'Al-Jadriya Campus', type: 'campus', parent: { ar: 'جامعة بغداد', en: 'University of Baghdad' }, active: true },
  { code: 'BEN-UOB-SCI', ar: 'كلية العلوم — جامعة بغداد', en: 'College of Science — UoB', type: 'department', parent: { ar: 'جامعة بغداد', en: 'University of Baghdad' }, active: true },
  { code: 'BEN-MU', ar: 'الجامعة المستنصرية', en: 'Al-Mustansiriyah University', type: 'university', parent: { ar: 'وزارة التعليم العالي', en: 'Ministry of Higher Education' }, active: true },
  { code: 'BEN-MU-LAB', ar: 'مجمع المختبرات المركزية', en: 'Central Laboratories Complex', type: 'facility', parent: { ar: 'الجامعة المستنصرية', en: 'Al-Mustansiriyah University' }, active: true },
  { code: 'BEN-SPU', ar: 'وحدة الدراسات والتخطيط', en: 'Studies & Planning Unit', type: 'department', parent: { ar: 'مركز الوزارة', en: 'Ministry Center' }, active: true },
  { code: 'BEN-OLD', ar: 'موقع الرصافة (موقوف)', en: 'Rusafa Site (suspended)', type: 'site', parent: { ar: 'جامعة بغداد', en: 'University of Baghdad' }, active: false },
];

// Beneficiaries assigned to THIS project — only these may receive quantity.
function projectBeneficiaries(p) {
  const n = p ? (p.id.charCodeAt(6) % 3) + 3 : 3;
  return BENEFICIARIES.filter(b => b.active).slice(0, n);
}

// Every BOQ item / activity belongs to one contract. Deterministic so the BOQ page
// and the change-order wizard always agree on the same scoping.
/* A BOQ row states its own contract. The old rule derived it from the code's
   parity, which had nothing to do with the work: the civil contract ended up
   owning the electrical item. Parity survives only for rows seeded before the
   field existed. */
function contractKeyOfBoq(row, contracts) {
  if (!contracts || !contracts.length) return 'main';
  if (row && row.contractKey && contracts.some(c => c.key === row.contractKey)) return row.contractKey;
  const n = String(row.code || '').replace(/\D/g, '') || '1';
  return contracts[(parseInt(n, 10) - 1) % contracts.length].key;
}
/* An activity belongs to the contract that owns its WBS branch — the areas
   are already split that way (A = building, B = electromechanical). Parity
   again is only the fallback. */
function contractKeyOfAct(a, contracts) {
  if (!contracts || !contracts.length) return 'main';
  if (a && a.contractKey && contracts.some(c => c.key === a.contractKey)) return a.contractKey;
  const path = String((a && (a.wbsPath || a.wbs || a.code)) || '');
  if (/كهروم|Electromech|EM\b/i.test(path)) { const m = contracts.find(c => c.key === 'mep'); if (m) return m.key; }
  const n = String((a && a.id) || '').replace(/\D/g, '') || '1';
  return contracts[(parseInt(n, 10) - 1) % contracts.length].key;
}

// ---- distribution ----
const DIST_STATE = {
  none: { ar: 'غير موزّعة', en: 'Not distributed', cls: '' },
  part: { ar: 'موزّعة جزئياً', en: 'Partially distributed', cls: 'suspended' },
  full: { ar: 'موزّعة كلياً', en: 'Fully distributed', cls: 'completed' },
  over: { ar: 'تتجاوز الكمية', en: 'Over-distributed', cls: 'stalled' },
};
function distSummary(row, list) {
  const done = (list || []).reduce((s, x) => s + (Number(x.qty) || 0), 0);
  const total = row.contractedQty;
  return { total, done, remain: Math.max(0, total - done), over: Math.max(0, done - total),
    state: done <= 0 ? 'none' : done > total + 0.001 ? 'over' : done >= total - 0.001 ? 'full' : 'part' };
}

// Compact context header: the project/contract facts, stated once.
function DContractCtx({ lang, p, contracts, selKey, onSelect }) {
  const AR = lang === 'ar';
  const c = (contracts || []).find(x => x.key === selKey);
  return (
    <div className="d-cctx">
      <div className="d-cctx-r">
        <span className="k">{AR ? 'العقد' : 'Contract'}</span>
        <select className="d-form-input" style={{ width: 'auto', minWidth: 240 }} value={selKey || ''} onChange={e => onSelect(e.target.value)}>
          <option value="">{AR ? '— اختر عقداً —' : '— select a contract —'}</option>
          {(contracts || []).map(x => <option key={x.key} value={x.key}>{x.code} — {x.name}</option>)}
        </select>
      </div>
      {c && <div className="d-cctx-f">
        <div className="d-form-i"><span className="k">{AR ? 'المشروع' : 'Project'}</span><span className="v">{p ? ((p.name && (p.name[lang] || p.name.en)) || p.id) : '—'}</span></div>
        <div className="d-form-i"><span className="k">{AR ? 'رقم العقد' : 'Contract no.'}</span><span className="v mono">{c.code}</span></div>
        <div className="d-form-i"><span className="k">{AR ? 'اسم العقد' : 'Contract name'}</span><span className="v">{c.name}</span></div>
        <div className="d-form-i"><span className="k">{AR ? 'قيمة العقد الحالية' : 'Current value'}</span><span className="v mono">{window.fmtNum((c.raw && c.raw.contractCost) || 0)}</span></div>
        <div className="d-form-i"><span className="k">{AR ? 'حالة العقد' : 'Status'}</span><span className="v">{ctStatusLabel(c.status, lang)}</span></div>
      </div>}
    </div>
  );
}

// Distribution drawer: BOQ facts on top, then one editable row per beneficiary.
function DBoqDistDrawer({ lang, row, bens, list, onChange, onClose }) {
  const AR = lang === 'ar';
  const s = distSummary(row, list);
  const St = DIST_STATE[s.state];
  const [warn, setWarn] = React.useState('');
  const set = (i, o) => {
    if (o.qty !== undefined) {
      const others = list.reduce((s, x, j) => s + (j === i ? 0 : (Number(x.qty) || 0)), 0);
      const cap = row.contractedQty - others;
      if ((Number(o.qty) || 0) > cap + 0.001) {
        o = { ...o, qty: cap > 0 ? String(+cap.toFixed(2)) : '0' };
        setWarn(AR ? 'الكمية محدودة بالمتبقي من كمية البند' : 'Capped at the item’s remaining quantity');
      } else setWarn('');
    }
    onChange(list.map((x, j) => j === i ? { ...x, ...o } : x));
  };
  const add = () => onChange([...list, { ben: (bens[0] || {}).code || '', site: '', qty: '' }]);
  const del = i => onChange(list.filter((_, j) => j !== i));
  return (
    <React.Fragment>
      <div className="d-drawer-scrim" onClick={onClose}></div>
      <div className="d-drawer">
        <div className="d-drawer-head"><div className="tx"><b>{AR ? 'توزيع الكميات' : 'Quantity distribution'}</b><span>{row.code} — {row.item}</span></div>
          <button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-drawer-body">
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'بيانات البند' : 'BOQ item'}</span>
            <div className="d-form-grid">
              <div className="d-form-i"><span className="k">{AR ? 'كود البند' : 'BOQ code'}</span><span className="v mono">{row.code}</span></div>
              <div className="d-form-i"><span className="k">{AR ? 'الوصف' : 'Description'}</span><span className="v">{row.item}</span></div>
              <div className="d-form-i"><span className="k">{AR ? 'الوحدة' : 'Unit'}</span><span className="v">{row.unit}</span></div>
              <div className="d-form-i"><span className="k">{AR ? 'الكمية الكلية' : 'Total quantity'}</span><span className="v mono">{window.fmtNum(s.total)}</span></div>
            </div>
          </div>
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'ملخص التوزيع' : 'Distribution summary'}</span>
            <div className="d-form-grid">
              <div className="d-form-i"><span className="k">{AR ? 'الموزّعة' : 'Distributed'}</span><span className="v mono">{window.fmtNum(s.done)}</span></div>
              <div className="d-form-i"><span className="k">{AR ? 'المتبقية' : 'Remaining'}</span><span className="v mono">{window.fmtNum(s.remain)}</span></div>
              <div className="d-form-i"><span className="k">{AR ? 'الحالة' : 'Status'}</span><span className="v"><span className={'d-pill ' + St.cls}>{AR ? St.ar : St.en}</span></span></div>
            </div>
            {s.state === 'over' && <div className="d-vow-note warn" style={{ marginTop: 8 }}><Icon name="warning" size={16} />
              <span>{AR ? 'مجموع الكميات الموزّعة يتجاوز كمية البند بمقدار ' : 'Distributed total exceeds the BOQ quantity by '}
                <b className="mono">{window.fmtNum(+s.over.toFixed(2))}</b> {row.unit} — {AR ? 'عدّل التوزيع.' : 'revise the distribution.'}</span></div>}
            {warn && <div className="d-vow-note warn" style={{ marginTop: 8 }}><Icon name="info" size={16} /><span>{warn}</span></div>}
          </div>
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'التوزيع على الجهات' : 'Distribution by beneficiary'}</span>
            <table className="d-line-table"><thead><tr>
              <th style={{ minWidth: 180 }}>{AR ? 'الجهة المستفيدة' : 'Beneficiary'}</th>
              <th style={{ width: 150 }}>{AR ? 'الموقع' : 'Site'}</th>
              <th style={{ width: 110 }}>{AR ? 'الكمية' : 'Quantity'}</th><th style={{ width: 52 }}></th></tr></thead>
              <tbody>{list.map((x, i) => {
                const over = s.state === 'over';
                return (<tr key={i}>
                  <td><select className="d-form-input" style={{ width: '100%', padding: '5px 6px', fontSize: 12 }} value={x.ben} onChange={e => set(i, { ben: e.target.value })}>
                    {bens.map(b => <option key={b.code} value={b.code}>{b[lang] || b.en}</option>)}</select></td>
                  <td><input className="d-form-input" style={{ width: '100%', padding: '5px 8px', fontSize: 12 }} value={x.site} placeholder={AR ? 'اختياري' : 'optional'} onChange={e => set(i, { site: e.target.value })} /></td>
                  <td><input className={'d-form-input mono' + (over ? ' bad' : '')} style={{ width: 92, padding: '5px 8px', fontSize: 12 }} value={x.qty} onChange={e => set(i, { qty: e.target.value.replace(/[^\d.]/g, '') })} /></td>
                  <td><button className="d-icon-btn" onClick={() => del(i)}><Icon name="delete" size={15} /></button></td>
                </tr>); })}
                {!list.length && <tr><td colSpan={4} className="d-cell-sub">{AR ? 'لا توزيع بعد — أضف جهة مستفيدة.' : 'No distribution yet — add a beneficiary.'}</td></tr>}
              </tbody></table>
            <button className="d-btn" style={{ marginTop: 10 }} onClick={add}><Icon name="add" size={15} />{AR ? 'إضافة توزيع' : 'Add distribution'}</button>
          </div>
        </div>
        <div className="d-drawer-foot"><button className="d-btn" onClick={onClose}>{AR ? 'إغلاق' : 'Close'}</button></div>
      </div>
    </React.Fragment>
  );
}

// Beneficiaries master + which of them this project uses.
function DBenDrawer({ lang, assigned, onToggle, onClose }) {
  const AR = lang === 'ar';
  return (
    <React.Fragment>
      <div className="d-drawer-scrim" onClick={onClose}></div>
      <div className="d-drawer">
        <div className="d-drawer-head"><div className="tx"><b>{AR ? 'الجهات المستفيدة' : 'Beneficiaries'}</b>
          <span>{AR ? 'القائمة الرئيسية وربطها بالمشروع' : 'Master list and project assignment'}</span></div>
          <button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-drawer-body">
          <table className="d-line-table"><thead><tr>
            <th style={{ width: 44 }}></th><th style={{ width: 108 }}>{AR ? 'الكود' : 'Code'}</th>
            <th style={{ minWidth: 190 }}>{AR ? 'الاسم' : 'Name'}</th><th style={{ width: 110 }}>{AR ? 'النوع' : 'Type'}</th>
            <th style={{ minWidth: 150 }}>{AR ? 'الجهة الأم' : 'Parent organization'}</th><th style={{ width: 92 }}>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
            <tbody>{BENEFICIARIES.map(b => (
              <tr key={b.code}>
                <td><input type="checkbox" disabled={!b.active} checked={assigned.includes(b.code)} onChange={() => onToggle(b.code)} /></td>
                <td className="mono">{b.code}</td><td>{b[lang] || b.en}</td>
                <td>{BEN_TYPE_L[b.type][lang] || BEN_TYPE_L[b.type].en}</td>
                <td className="d-cell-sub">{b.parent[lang] || b.parent.en}</td>
                <td>{b.active ? <span className="d-pill completed">{AR ? 'نشطة' : 'Active'}</span> : <span className="d-pill">{AR ? 'موقوفة' : 'Inactive'}</span>}</td>
              </tr>))}</tbody></table>
          <div className="d-cell-sub" style={{ marginTop: 10 }}>{AR ? 'الجهات المؤشَّرة فقط تظهر عند توزيع كميات هذا المشروع.' : 'Only ticked beneficiaries appear when distributing this project’s quantities.'}</div>
        </div>
        <div className="d-drawer-foot"><button className="d-btn" onClick={onClose}>{AR ? 'إغلاق' : 'Close'}</button></div>
      </div>
    </React.Fragment>
  );
}

// Distribution batch upload — validate before applying, never after.
function DDistImport({ lang, rows, bens, dist, onApply, onClose }) {
  const AR = lang === 'ar';
  const sample = React.useMemo(() => {
    const b0 = rows[0], b1 = rows[1] || rows[0];
    const k = c => c || '';
    return [
      { code: k(b0 && b0.code), ben: (bens[0] || {}).code, site: 'S-01', qty: b0 ? Math.round(b0.contractedQty * 0.6) : 0 },
      { code: k(b0 && b0.code), ben: (bens[1] || bens[0] || {}).code, site: '', qty: b0 ? Math.round(b0.contractedQty * 0.4) : 0 },
      { code: k(b1 && b1.code), ben: (bens[0] || {}).code, site: '', qty: b1 ? b1.contractedQty * 3 : 0 },
      { code: 'BQ-999', ben: (bens[0] || {}).code, site: '', qty: 10 },
      { code: k(b0 && b0.code), ben: (bens[0] || {}).code, site: 'S-01', qty: 5 },
      { code: k(b1 && b1.code), ben: 'BEN-OLD', site: '', qty: 12 },
    ];
  }, [rows, bens]);
  const checked = React.useMemo(() => {
    const seen = {};
    return sample.map(r => {
      const row = rows.find(x => x.code === r.code);
      const ben = bens.find(b => b.code === r.ben);
      const key = r.code + '|' + r.ben;
      const dup = !!seen[key]; seen[key] = true;
      let err = null;
      if (!row) err = AR ? 'البند لا ينتمي للعقد المحدد' : 'BOQ item not in the selected contract';
      else if (!ben) err = AR ? 'الجهة غير مرتبطة بالمشروع' : 'Beneficiary not assigned to this project';
      else if (dup) err = AR ? 'صف مكرر (بند + جهة)' : 'Duplicate BOQ + beneficiary row';
      else {
        const others = (dist[r.code] || []).filter(x => x.ben !== r.ben).reduce((s, x) => s + (Number(x.qty) || 0), 0);
        if (r.qty + others > row.contractedQty + 0.001) err = AR ? 'الكمية تتجاوز كمية البند' : 'Quantity exceeds the BOQ quantity';
      }
      return { ...r, err, ok: !err };
    });
  }, [sample, rows, bens, dist, lang]);
  const ok = checked.filter(r => r.ok), bad = checked.filter(r => !r.ok);
  return (
    <div className="d-modal-scrim" onClick={onClose}>
      <div className="d-modal xl" onClick={e => e.stopPropagation()}>
        <div className="d-modal-head"><b>{AR ? 'استيراد توزيع الكميات' : 'Import quantity distribution'}</b>
          <button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-modal-body">
          <div className="d-cell-sub" style={{ marginBottom: 14 }}>{AR ? 'قالب الاستيراد: كود البند · كود الجهة المستفيدة · كود الموقع (اختياري) · الكمية الموزّعة' : 'Template: BOQ Code · Beneficiary Code · Site Code (optional) · Distributed Quantity'}</div>
          <div className="d-form-grid" style={{ marginBottom: 18 }}>
            <div className="d-form-i"><span className="k">{AR ? 'صفوف الملف' : 'Rows in file'}</span><span className="v mono">{checked.length}</span></div>
            <div className="d-form-i"><span className="k">{AR ? 'صفوف صالحة' : 'Valid rows'}</span><span className="v mono">{ok.length}</span></div>
            <div className="d-form-i"><span className="k">{AR ? 'صفوف مرفوضة' : 'Rejected rows'}</span><span className="v mono">{bad.length}</span></div>
            <div className="d-form-i"><span className="k">{AR ? 'مجموع الكميات الصالحة' : 'Valid quantity total'}</span><span className="v mono">{window.fmtNum(ok.reduce((s, r) => s + r.qty, 0))}</span></div>
          </div>
          <table className="d-line-table"><thead><tr>
            <th style={{ width: 100 }}>{AR ? 'كود البند' : 'BOQ Code'}</th><th style={{ width: 140 }}>{AR ? 'كود الجهة' : 'Beneficiary'}</th>
            <th style={{ width: 90 }}>{AR ? 'الموقع' : 'Site'}</th><th style={{ width: 110 }}>{AR ? 'الكمية' : 'Quantity'}</th>
            <th style={{ minWidth: 240 }}>{AR ? 'نتيجة التحقق' : 'Validation'}</th></tr></thead>
            <tbody>{checked.map((r, i) => (
              <tr key={i}><td className="mono">{r.code}</td><td className="mono">{r.ben}</td><td className="mono">{r.site || '—'}</td>
                <td className="mono">{window.fmtNum(r.qty)}</td>
                <td>{r.ok ? <span className="d-pill completed">{AR ? 'صالح' : 'Valid'}</span>
                  : <span className="d-vow-inline warn"><Icon name="warning" size={14} />{r.err}</span>}</td></tr>))}</tbody></table>
        </div>
        <div className="d-modal-foot">
          <div style={{ flex: 1 }}></div>
          <button className="d-btn" onClick={onClose}>{AR ? 'إلغاء' : 'Cancel'}</button>
          <button className="d-btn primary" disabled={!ok.length} onClick={() => onApply(ok)}>
            <Icon name="check" size={16} />{AR ? 'تطبيق الصفوف الصالحة' : 'Apply valid rows'} ({ok.length})</button>
        </div>
      </div>
    </div>
  );
}

function DModBOQ({ t, lang, d, p, showToast }) {
  const AR = lang === 'ar';
  const pid = (p && p.id) || 'na';
  const contracts = d.contracts || [{ key: 'main', name: AR ? 'العقد' : 'Contract', code: d.contract.code, status: d.contract.status, raw: d.contract.raw }];
  const [ckey, setCkey] = React.useState(contracts.length === 1 ? contracts[0].key : null);
  // Persisted so BOQ edits/adds/deletes survive navigation and reload.
  const [allRows, setAllRows] = window.usePersistedState('boq.rows.' + pid, function () { return d.boq; });
  const [view, setView] = React.useState('register');
  const [editCode, setEditCode] = React.useState(null);
  const [ef, setEf] = React.useState({ item: '', unit: '', qty: '', price: '' });
  const [delCode, setDelCode] = React.useState(null);
  const [amdOpen, setAmdOpen] = React.useState(null);
  // BOQ <-> activity mapping stays a separate many-to-many relation
  const [basis, setBasis] = React.useState('cost');
  const [links, setLinks] = React.useState(null);
  // Manual allocation overrides + per-activity progress persist per project.
  const [allocOverrides, setAllocOverrides] = window.usePersistedState('boq.alloc.' + pid, {});
  const [actPct, setActPct] = window.usePersistedState('boq.actpct.' + pid, {});
  const [dist, setDist] = window.usePersistedState('boq.dist.' + pid, {});
  const [distOpen, setDistOpen] = React.useState(null);
  const [benOpen, setBenOpen] = React.useState(false);
  const [assigned, setAssigned] = window.usePersistedState('boq.assigned.' + pid, function () { return projectBeneficiaries(p).map(b => b.code); });
  const [showImp, setShowImp] = React.useState(false);
  const [showDistImp, setShowDistImp] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [nf, setNf] = React.useState({ item: '', unit: '', qty: '', price: '' });
  React.useEffect(() => { const h = () => setShowImp(true); window.addEventListener('epm:boq-import', h); return () => window.removeEventListener('epm:boq-import', h); }, []);

  const bens = BENEFICIARIES.filter(b => assigned.includes(b.code) && b.active);
  const rows = React.useMemo(() => allRows.filter(r => contractKeyOfBoq(r, contracts) === ckey), [allRows, ckey, contracts]);
  // an applied change order moves the effective quantity; the original is preserved
  const amdIdx = React.useMemo(() => (window.amendmentIndex ? window.amendmentIndex(d, lang, p) : { boq: {}, acts: {} }), [d, lang, p && p.id]);
  const amdOf = code => amdIdx.boq[code] && amdIdx.boq[code].srcs.length ? amdIdx.boq[code] : null;
  const effQty = r => { const e = amdOf(r.code); return e && e.applied ? e.eff : r.contractedQty; };
  // a banded item holds more than one rate, so its value is the sum of the bands
  const effVal = r => { const e = amdOf(r.code); return e && e.applied ? e.effValue : r.contractedQty * r.price; };
  const contractTotal = rows.reduce((a, r) => a + effVal(r), 0) || 1;
  // largest-remainder at 2dp so the column sums to exactly 100.00%
  const wByCode = React.useMemo(() => {
    const raw = rows.map(r => effVal(r) / contractTotal * 100);
    const floor = raw.map(v => Math.floor(v * 100) / 100);
    let short = Math.round((100 - floor.reduce((a, b) => a + b, 0)) * 100);
    const order = raw.map((v, i) => [i, v - floor[i]]).sort((a, b) => b[1] - a[1]);
    const out = [...floor];
    for (let k = 0; k < short && k < order.length; k++) out[order[k][0]] = +(out[order[k][0]] + 0.01).toFixed(2);
    const m = {}; rows.forEach((r, i) => { m[r.code] = +out[i].toFixed(2); });
    return m;
  }, [rows, contractTotal, amdIdx]);
  const weightOf = r => wByCode[r.code] != null ? wByCode[r.code] : 0;
  const projectTotal = contracts.reduce((a, c) => a + allRows.filter(r => contractKeyOfBoq(r, contracts) === c.key).reduce((s, r) => s + r.total, 0), 0);

  const addRow = () => {
    const q = parseFloat(nf.qty), pr = parseFloat(nf.price);
    if (!nf.item.trim() || !q || !pr) { showToast(AR ? 'أكمل الحقول' : 'Fill in the fields'); return; }
    setAllRows(rs => {
      const idx = rs.length + 1;
      // the new code must land in the selected contract, not a neighbouring one
      let n = idx; const ci = contracts.findIndex(c => c.key === ckey);
      while ((n - 1) % contracts.length !== ci) n++;
      return [...rs, { no: idx, code: 'BQ-' + String(n).padStart(3, '0'), item: nf.item, unit: nf.unit || '—', contractedQty: q, executedQty: 0, price: pr, total: q * pr }];
    });
    setNf({ item: '', unit: '', qty: '', price: '' }); setAdding(false);
    showToast(AR ? 'أُضيف البند إلى العقد المحدد' : 'Item added to the selected contract');
  };
  const applyDistImport = valid => {
    setDist(dd => { const out = { ...dd };
      valid.forEach(r => { out[r.code] = [...(out[r.code] || []).filter(x => x.ben !== r.ben), { ben: r.ben, site: r.site, qty: r.qty }]; });
      return out; });
    setShowDistImp(false);
    showToast(AR ? 'طُبِّق التوزيع المستورد' : 'Imported distribution applied');
  };

  const startEdit = r => { setEditCode(r.code); setEf({ item: r.item, unit: r.unit, qty: String(r.contractedQty), price: String(r.price) }); setAdding(false); setDelCode(null); };
  const saveEdit = () => {
    const q = parseFloat(ef.qty), pr = parseFloat(ef.price);
    if (!ef.item.trim() || !q || !pr) { showToast(AR ? 'أكمل الحقول' : 'Fill in the fields'); return; }
    setAllRows(rs => rs.map(r => r.code === editCode
      ? { ...r, item: ef.item, unit: ef.unit || '—', contractedQty: q, price: pr, total: q * pr, executedQty: Math.min(r.executedQty, q) } : r));
    setEditCode(null);
    showToast(AR ? 'تم حفظ التعديل' : 'Changes saved');
  };
  const removeRow = code => {
    setAllRows(rs => rs.filter(r => r.code !== code));
    setDist(dd => { const o = { ...dd }; delete o[code]; return o; });
    setDelCode(null);
    showToast(AR ? 'تم حذف البند' : 'Item deleted');
  };

  const sd = React.useMemo(() => (p ? window.EPM.buildScheduleData(p, lang) : { activities: [] }), [p && p.id, lang]);
  const cActs = React.useMemo(() => sd.activities.filter(a => a.type === 'act' && !a.milestone)
    .filter(a => !ckey || contractKeyOfAct(a, contracts) === ckey), [sd, ckey, contracts]);
  const boqsW = React.useMemo(() => rows.map(r => ({ ...r, weight: weightOf(r) })), [rows, contractTotal]);
  React.useEffect(() => { setLinks(window.defaultBOQLinks(boqsW, cActs)); }, [ckey]);
  const groups = React.useMemo(() => (links && cActs.length)
    ? window.computeBOQGroups(boqsW, cActs, links, allocOverrides, actPct, basis) : [], [boqsW, cActs, links, allocOverrides, actPct, basis]);
  const gByCode = {}; groups.forEach(g => { gByCode[g.b.code] = g; });
  const executedValue = groups.reduce((a, g) => a + g.achievedAmount, 0);

  const secH = (ico, txt, right) => <div className="d-vow-sech"><Icon name={ico} size={16} /><div className="d-section-title" style={{ margin: 0 }}>{txt}</div><div style={{ flex: 1 }}></div>{right}</div>;

  return (
    <React.Fragment>
      {showImp && <DImportWizard lang={lang} kind="boq" onClose={() => setShowImp(false)}
        onDone={() => { setShowImp(false); showToast(AR ? 'استُوردت البنود ورُبطت بالعقد المحدد' : 'Items imported and linked to the selected contract'); }} />}
      {showDistImp && <DDistImport lang={lang} rows={rows} bens={bens} dist={dist} onApply={applyDistImport} onClose={() => setShowDistImp(false)} />}
      {benOpen && <DBenDrawer lang={lang} assigned={assigned} onClose={() => setBenOpen(false)}
        onToggle={c => setAssigned(a => a.includes(c) ? a.filter(x => x !== c) : [...a, c])} />}
      {amdOpen && amdOf(amdOpen.code) && <DAmdPanel lang={lang} kind="boq" e={amdOf(amdOpen.code)}
        code={amdOpen.code} name={amdOpen.item} unit={amdOpen.unit} onClose={() => setAmdOpen(null)} />}
      {distOpen && <DBoqDistDrawer lang={lang} row={distOpen} bens={bens} list={dist[distOpen.code] || []}
        onChange={l => setDist(dd => ({ ...dd, [distOpen.code]: l }))} onClose={() => setDistOpen(null)} />}

      <div className="d-model-topbar">
        <div className="d-section-title" style={{ margin: 0 }}>{t('mod_boq')}</div>
        <div style={{ flex: 1 }}></div>
        <button className="d-btn" onClick={() => setBenOpen(true)}><Icon name="apartment" size={15} />{AR ? 'الجهات المستفيدة' : 'Beneficiaries'}</button>
      </div>

      <DContractCtx lang={lang} p={p} contracts={contracts} selKey={ckey} onSelect={k => { setCkey(k || null); setAdding(false); }} />

      {!ckey ? <div className="d-vow-empty"><Icon name="description" size={22} /><b>{AR ? 'اختر عقداً للبدء' : 'Select a contract to start'}</b>
        <span className="d-cell-sub">{AR ? 'بنود الكميات والأنشطة تنتمي إلى عقد واحد — يُستنتج المشروع من العقد تلقائياً.' : 'BOQ items and activities belong to one contract — the project is derived from it automatically.'}</span></div>
        : <React.Fragment>
          <div className="d-vow-tabs" style={{ marginTop: 18 }}>
            <button className={'d-vow-tab' + (view === 'register' ? ' on' : '')} onClick={() => setView('register')}>
              <Icon name="list_alt" size={15} />{AR ? 'بنود الكميات' : 'BOQ items'}<span className="n">{rows.length}</span></button>
            <button className={'d-vow-tab' + (view === 'dist' ? ' on' : '')} onClick={() => setView('dist')}>
              <Icon name="apartment" size={15} />{AR ? 'توزيع الكميات' : 'Quantity distribution'}</button>
            <button className={'d-vow-tab' + (view === 'assign' ? ' on' : '')} onClick={() => setView('assign')}>
              <Icon name="hub" size={15} />{AR ? 'الربط بالأنشطة' : 'Activity assignment'}<span className="n">{cActs.length}</span></button>
            <div style={{ flex: 1 }}></div>
            {view === 'register'
              ? <React.Fragment>
                <button className="d-btn" onClick={() => setAdding(a => !a)}><Icon name="add" size={15} />{AR ? 'إدخال يدوي' : 'Manual entry'}</button>
                <button className="d-btn primary" onClick={() => setShowImp(true)}><Icon name="upload_file" size={15} />{AR ? 'استيراد دفعة' : 'Batch upload'}</button>
              </React.Fragment>
              : view === 'dist' ? <button className="d-btn primary" onClick={() => setShowDistImp(true)}><Icon name="upload_file" size={15} />{AR ? 'استيراد توزيع' : 'Import distribution'}</button>
              : null}
          </div>

          {view === 'register' && <React.Fragment>
            <div className="d-form-grid" style={{ marginBottom: 20 }}>
              <div className="d-form-i"><span className="k">{AR ? 'قيمة بنود هذا العقد' : 'Contract BOQ value'}</span><span className="v mono">{window.fmtNum(contractTotal)}</span></div>
              <div className="d-form-i"><span className="k">{AR ? 'عدد البنود' : 'Items'}</span><span className="v mono">{rows.length}</span></div>
              <div className="d-form-i"><span className="k">{AR ? 'قيمة المنفذ' : 'Executed value'}</span><span className="v mono">{window.fmtNum(Math.round(executedValue))}</span></div>
              <div className="d-form-i"><span className="k">{AR ? 'قيمة المشروع (مجموع العقود)' : 'Project value (sum of contracts)'}</span><span className="v mono">{window.fmtNum(projectTotal)}</span></div>
            </div>
            <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
              <th style={{ width: 96 }}>{AR ? 'كود البند' : 'BOQ Code'}</th><th style={{ minWidth: 200 }}>{AR ? 'الوصف' : 'Description'}</th>
              <th style={{ width: 60 }}>{AR ? 'الوحدة' : 'Unit'}</th><th style={{ width: 104 }}>{AR ? 'الكمية' : 'Quantity'}</th>
              <th style={{ width: 108 }}>{AR ? 'سعر الوحدة' : 'Unit Rate'}</th><th style={{ width: 130 }}>{AR ? 'القيمة' : 'Amount'}</th>
              <th style={{ width: 88 }}>{AR ? 'الوزن' : 'Weight'}</th>
              <th style={{ width: 118 }} title={AR ? 'مُحتسبة من إنجاز الأنشطة المرتبطة عبر نسب التخصيص' : 'From linked activities’ progress via allocation %'}>{AR ? 'نسبة التنفيذ' : 'Executed %'}</th>
              <th style={{ width: 170 }}>{AR ? 'التوزيع' : 'Distribution'}</th>
              <th style={{ width: 96 }}></th></tr></thead>
              <tbody>{rows.map(r => { const s = distSummary({ ...r, contractedQty: effQty(r) }, dist[r.code]); const St = DIST_STATE[s.state];
                const g = gByCode[r.code]; const pct = g ? Math.round(g.boqProgress) : 0;
                if (editCode === r.code) return (<tr key={r.code}>
                  <td className="mono">{r.code}</td>
                  <td><input className="d-form-input" style={{ width: '100%', padding: '5px 8px', fontSize: 12 }} value={ef.item} onChange={e => setEf(f => ({ ...f, item: e.target.value }))} /></td>
                  <td><input className="d-form-input" style={{ width: 52, padding: '5px 6px', fontSize: 12 }} value={ef.unit} onChange={e => setEf(f => ({ ...f, unit: e.target.value }))} /></td>
                  <td><input className="d-form-input mono" style={{ width: 92, padding: '5px 8px', fontSize: 12 }} value={ef.qty} onChange={e => setEf(f => ({ ...f, qty: e.target.value.replace(/[^\d.]/g, '') }))} /></td>
                  <td><input className="d-form-input mono" style={{ width: 96, padding: '5px 8px', fontSize: 12 }} value={ef.price} onChange={e => setEf(f => ({ ...f, price: e.target.value.replace(/[^\d.]/g, '') }))} /></td>
                  <td className="mono d-cell-sub">{window.fmtNum((parseFloat(ef.qty) || 0) * (parseFloat(ef.price) || 0))}</td>
                  <td className="d-cell-sub">—</td><td className="d-cell-sub">—</td><td className="d-cell-sub">—</td>
                  <td><div className="d-vow-ac"><button className="d-icon-btn" title={AR ? 'حفظ' : 'Save'} onClick={saveEdit}><Icon name="check" size={15} /></button>
                    <button className="d-icon-btn" title={AR ? 'إلغاء' : 'Cancel'} onClick={() => setEditCode(null)}><Icon name="close" size={15} /></button></div></td>
                </tr>);
                if (delCode === r.code) return (<tr key={r.code}><td className="mono">{r.code}</td>
                  <td colSpan={7}><span className="d-vow-inline warn"><Icon name="warning" size={14} />
                    {AR ? 'حذف هذا البند وتوزيعه المرتبط؟' : 'Delete this item and its distribution?'}</span></td>
                  <td><div className="d-vow-ac"><button className="d-icon-btn" title={AR ? 'تأكيد' : 'Confirm'} onClick={() => removeRow(r.code)}><Icon name="check" size={15} /></button>
                    <button className="d-icon-btn" onClick={() => setDelCode(null)}><Icon name="close" size={15} /></button></div></td></tr>);
                return [(
                <tr key={r.code}>
                  <td className="mono">{r.code}
                    {amdOf(r.code) ? <DAmdMark lang={lang} e={amdOf(r.code)} onOpen={() => setAmdOpen(r)} /> : null}</td><td>{r.item}</td><td>{r.unit}</td>
                  <td className="mono">{window.fmtNum(effQty(r))}
                    {amdOf(r.code) ? <DAmdDelta lang={lang} from={r.contractedQty} to={effQty(r)}
                      pending={amdOf(r.code).pendingQty != null} /> : null}</td>
                  <td className="mono">{window.fmtNum(amdOf(r.code) && amdOf(r.code).banded ? amdOf(r.code).effRate : r.price)}
                    {amdOf(r.code) && amdOf(r.code).banded ? <span className="d-rate-multi">{AR ? 'سعران — الأصلي ' : '2 rates — orig. '}{window.fmtNum(r.price)}</span> : null}</td>
                  <td className="mono">{window.fmtNum(effVal(r))}</td>
                  <td className="mono" style={{ fontWeight: 'var(--fw-bold)' }}>{weightOf(r)}%</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="d-tl-mini-track" style={{ flex: 1 }}><span className="d-tl-mini-fill" style={{ width: pct + '%', background: 'var(--viz-1)' }}></span></div>
                    <span className="mono" style={{ fontSize: 11.5 }}>{pct}%</span></div></td>
                  <td><span className={'d-pill ' + St.cls}>{AR ? St.ar : St.en}</span>
                    {s.done > 0 && <div className="d-cell-sub mono">{window.fmtNum(s.done)} / {window.fmtNum(s.total)}{s.state === 'over' ? ' (+' + window.fmtNum(+s.over.toFixed(2)) + ')' : ''}</div>}</td>
                  <td><div className="d-vow-ac">
                    <button className="d-icon-btn" title={AR ? 'توزيع الكميات' : 'Distribute'} onClick={() => setDistOpen(r)}><Icon name="apartment" size={15} /></button>
                    <button className="d-icon-btn" title={AR ? 'تعديل' : 'Edit'} onClick={() => startEdit(r)}><Icon name="edit" size={15} /></button>
                    <button className="d-icon-btn" title={AR ? 'حذف' : 'Delete'} onClick={() => { setDelCode(r.code); setEditCode(null); }}><Icon name="delete" size={15} /></button>
                  </div></td>
                </tr>)]; })}
                {adding && <tr>
                  <td className="mono d-cell-sub">{AR ? 'تلقائي' : 'auto'}</td>
                  <td><input className="d-form-input" style={{ width: '100%', padding: '5px 8px', fontSize: 12 }} value={nf.item} onChange={e => setNf(f => ({ ...f, item: e.target.value }))} placeholder={AR ? 'وصف البند' : 'Description'} /></td>
                  <td><input className="d-form-input" style={{ width: 52, padding: '5px 6px', fontSize: 12 }} value={nf.unit} onChange={e => setNf(f => ({ ...f, unit: e.target.value }))} /></td>
                  <td><input className="d-form-input mono" style={{ width: 92, padding: '5px 8px', fontSize: 12 }} value={nf.qty} onChange={e => setNf(f => ({ ...f, qty: e.target.value.replace(/[^\d.]/g, '') }))} /></td>
                  <td><input className="d-form-input mono" style={{ width: 96, padding: '5px 8px', fontSize: 12 }} value={nf.price} onChange={e => setNf(f => ({ ...f, price: e.target.value.replace(/[^\d.]/g, '') }))} /></td>
                  <td className="mono d-cell-sub">{window.fmtNum((parseFloat(nf.qty) || 0) * (parseFloat(nf.price) || 0))}</td>
                  <td className="d-cell-sub">—</td><td className="d-cell-sub">—</td><td className="d-cell-sub">—</td>
                  <td><div className="d-vow-ac"><button className="d-icon-btn" onClick={addRow}><Icon name="check" size={15} /></button>
                    <button className="d-icon-btn" onClick={() => setAdding(false)}><Icon name="close" size={15} /></button></div></td>
                </tr>}
              </tbody>
              <tfoot><tr><td colSpan={5}>{AR ? 'مجموع بنود العقد' : 'Contract BOQ total'}</td>
                <td className="mono">{window.fmtNum(contractTotal)}</td><td className="mono">100.00%</td><td colSpan={3}></td></tr></tfoot>
            </table></div>
          </React.Fragment>}

          {view === 'assign' && (links ? <DBOQAssignment lang={lang} showToast={showToast} boqs={boqsW} activities={cActs} groups={groups}
            links={links} setLinks={setLinks} basis={basis} setBasis={setBasis}
            allocOverrides={allocOverrides} setAllocOverrides={setAllocOverrides} actPct={actPct} setActPct={setActPct} />
            : <div className="d-vow-empty"><Icon name="hub" size={22} /><b>{AR ? 'لا أنشطة في هذا العقد' : 'No activities in this contract'}</b></div>)}

          {view === 'dist' && <React.Fragment>
            {secH('apartment', AR ? 'توزيع الكميات على الجهات المستفيدة' : 'Quantity distribution by beneficiary')}
            <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
              <th style={{ width: 96 }}>{AR ? 'كود البند' : 'BOQ Code'}</th><th style={{ minWidth: 190 }}>{AR ? 'الوصف' : 'Description'}</th>
              <th style={{ width: 56 }}>{AR ? 'الوحدة' : 'Unit'}</th><th style={{ width: 104 }}>{AR ? 'الكمية الكلية' : 'Total qty'}</th>
              <th style={{ width: 104 }}>{AR ? 'الموزّعة' : 'Distributed'}</th><th style={{ width: 116 }}>{AR ? 'المتبقية / الزائدة' : 'Remaining / excess'}</th>
              <th style={{ width: 90 }}>{AR ? 'الجهات' : 'Beneficiaries'}</th><th style={{ width: 170 }}>{AR ? 'الحالة' : 'Status'}</th>
              <th style={{ width: 56 }}></th></tr></thead>
              <tbody>{rows.map(r => { const s = distSummary({ ...r, contractedQty: effQty(r) }, dist[r.code]); const St = DIST_STATE[s.state]; return (
                <tr key={r.code} onClick={() => setDistOpen(r)} style={{ cursor: 'pointer' }}>
                  <td className="mono">{r.code}</td><td>{r.item}</td><td>{r.unit}</td>
                  <td className="mono">{window.fmtNum(s.total)}</td>
                  <td className={'mono' + (s.state === 'over' ? ' chg' : '')}>{window.fmtNum(s.done)}</td>
                  <td className="mono">{s.state === 'over' ? '+' + window.fmtNum(+s.over.toFixed(2)) : window.fmtNum(s.remain)}</td>
                  <td className="mono">{(dist[r.code] || []).length}</td>
                  <td><span className={'d-pill ' + St.cls}>{AR ? St.ar : St.en}</span></td>
                  <td><button className="d-icon-btn" onClick={e => { e.stopPropagation(); setDistOpen(r); }}><Icon name="chevron_left" size={15} /></button></td>
                </tr>); })}</tbody></table></div>
            <div className="d-cell-sub" style={{ marginTop: 10 }}>{AR ? 'اضغط أي بند لفتح لوحة التوزيع. الجهات المتاحة هي المرتبطة بهذا المشروع فقط.' : 'Select a line to open its distribution panel. Only beneficiaries assigned to this project are available.'}</div>
          </React.Fragment>}
        </React.Fragment>}
    </React.Fragment>
  );
}

Object.assign(window, { DModBOQ, DContractCtx, ctStatusLabel, DBoqDistDrawer, DDistImport, DBenDrawer,
  BENEFICIARIES, BEN_TYPES, BEN_TYPE_L, DIST_STATE, distSummary, projectBeneficiaries,
  contractKeyOfBoq, contractKeyOfAct });
