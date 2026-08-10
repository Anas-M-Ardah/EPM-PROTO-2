// Change-order wizard — shared pickers, filter bar and side panels.
// Multi-selection tables with search + faceted filters; nothing here mutates the record.

function DVOChips({ lang, active, onClear, onDrop }) {
  const AR = lang === 'ar';
  if (!active.length) return null;
  return (
    <div className="d-vow-chips">
      {active.map(a => (
        <button key={a.k} className="d-vow-chip" onClick={() => onDrop(a.k)}>
          <span className="l">{a.l}</span><b>{a.v}</b><Icon name="close" size={12} />
        </button>
      ))}
      <button className="d-btn" onClick={onClear}>{AR ? 'مسح كل الفلاتر' : 'Clear all filters'}</button>
    </div>
  );
}

// Multi-selection picker: search box, faceted selects, active-filter chips, checkbox rows.
function DVOMultiPick({ lang, title, hint, cols, rows, filters, taken, keyOf, onConfirm, onClose }) {
  const AR = lang === 'ar';
  const [q, setQ] = React.useState('');
  const [f, setF] = React.useState({});
  const [sel, setSel] = React.useState([]);
  const ql = q.trim().toLowerCase();
  const hits = rows.filter(r => {
    if (taken && taken.includes(keyOf(r))) return false;
    if (ql && !cols.some(c => String(r[c.k] == null ? '' : r[c.k]).toLowerCase().includes(ql))) return false;
    return (filters || []).every(fl => !f[fl.k] || String(fl.get ? fl.get(r) : r[fl.k]) === f[fl.k]);
  });
  const active = (filters || []).filter(fl => f[fl.k]).map(fl => ({ k: fl.k, l: fl.l, v: f[fl.k] }));
  const allOn = hits.length > 0 && hits.every(r => sel.includes(keyOf(r)));
  const toggle = k => setSel(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  return (
    <div className="d-modal-scrim" style={{ zIndex: 120 }} onClick={onClose}>
      <div className="d-modal xl" onClick={e => e.stopPropagation()}>
        <div className="d-modal-head"><b>{title}</b><button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-vow-filters">
          <div className="d-vow-search"><Icon name="search" size={15} />
            <input key="vo-pick-q" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={hint} />
          </div>
          <div className="d-vow-facets">{(filters || []).map(fl => (
            <select key={fl.k} className="d-form-input" value={f[fl.k] || ''} onChange={e => setF(x => ({ ...x, [fl.k]: e.target.value }))}>
              <option value="">{fl.l}</option>
              {fl.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}</div>
          <DVOChips lang={lang} active={active} onClear={() => setF({})} onDrop={k => setF(x => ({ ...x, [k]: '' }))} />
        </div>
        <div className="d-modal-body" style={{ paddingTop: 12 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="d-line-table"><thead><tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? [] : hits.map(keyOf))} /></th>
              {cols.map(c => <th key={c.k} style={c.w ? { width: c.w } : null}>{c.l}</th>)}
            </tr></thead>
              <tbody>{hits.map(r => { const k = keyOf(r); const on = sel.includes(k); return (
                <tr key={k} onClick={() => toggle(k)} className={on ? 'on' : ''} style={{ cursor: 'pointer' }}>
                  <td><input type="checkbox" checked={on} onChange={() => toggle(k)} onClick={e => e.stopPropagation()} /></td>
                  {cols.map(c => <td key={c.k} className={c.mono ? 'mono' : ''}>{c.f ? c.f(r) : r[c.k]}</td>)}
                </tr>); })}
                {!hits.length && <tr><td colSpan={cols.length + 1} className="d-cell-sub" style={{ textAlign: 'center', padding: 24 }}>{AR ? 'لا نتائج مطابقة للفلاتر الحالية' : 'No rows match the current filters'}</td></tr>}
              </tbody></table>
          </div>
        </div>
        <div className="d-modal-foot">
          <span className="d-cell-sub">{hits.length} {AR ? 'معروض' : 'shown'}{sel.length ? ' · ' + sel.length + (AR ? ' محدد' : ' selected') : ''}</span>
          <div style={{ flex: 1 }}></div>
          <button className="d-btn" onClick={onClose}>{AR ? 'إلغاء' : 'Cancel'}</button>
          <button className="d-btn primary" disabled={!sel.length} onClick={() => onConfirm(rows.filter(r => sel.includes(keyOf(r))))}>
            <Icon name="add" size={15} />{AR ? 'إضافة المحدد' : 'Add selected'}{sel.length ? ' (' + sel.length + ')' : ''}</button>
        </div>
      </div>
    </div>
  );
}

// Read-only detail of one BOQ item or activity.
function DVODetailPanel({ lang, row, onClose }) {
  const AR = lang === 'ar';
  if (!row) return null;
  const F = (k, v, mono) => <div className="d-form-i"><span className="k">{k}</span><span className={'v' + (mono ? ' mono' : '')}>{v}</span></div>;
  return (
    <React.Fragment>
      <div className="d-drawer-scrim" onClick={onClose}></div>
      <div className="d-drawer">
        <div className="d-drawer-head"><div className="tx"><b>{row._t === 'boq' ? (AR ? 'تفاصيل البند' : 'Item detail') : (AR ? 'تفاصيل النشاط' : 'Activity detail')}</b><span>{row.code || row.id}</span></div><button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-drawer-body">
          <div className="d-drawer-grp"><span className="lbl">{AR ? 'القيم الحالية في النظام' : 'Current system values'}</span>
            <div className="d-form-grid">
              {row._t === 'boq' ? <React.Fragment>
                {F(AR ? 'الوصف' : 'Description', row.desc)}
                {F('Division', row.div)}
                {F('WBS', row.wbs, true)}
                {F(AR ? 'الموقع' : 'Location', row.loc)}
                {F(AR ? 'الوحدة' : 'Unit', row.unit)}
                {F(AR ? 'الكمية الحالية' : 'Current qty', window.fmtNum(row.qty), true)}
                {F(AR ? 'المنفَّذ' : 'Executed', window.fmtNum(row.executedQty || 0), true)}
                {F(AR ? 'المتبقي' : 'Remaining', window.fmtNum(row.qty - (row.executedQty || 0)), true)}
                {F(AR ? 'سعر الوحدة' : 'Unit rate', window.fmtNum(row.price), true)}
                {F(AR ? 'القيمة الحالية' : 'Current value', window.fmtNum(row.qty * row.price), true)}
                {F(AR ? 'الوزن الحالي' : 'Current weight', row.weight + '%', true)}
                {F(AR ? 'حالة البند' : 'Item status', row.status)}
              </React.Fragment> : <React.Fragment>
                {F(AR ? 'اسم النشاط' : 'Activity name', row.name)}
                {F('WBS', row.wbsCode, true)}
                {F(AR ? 'المسار' : 'Path', row.wbs)}
                {F(AR ? 'الموقع' : 'Location', row.loc)}
                {F(AR ? 'الجهة المسؤولة' : 'Responsible party', row.resp)}
                {F(AR ? 'البداية' : 'Start', row.start, true)}
                {F(AR ? 'النهاية' : 'Finish', row.finish, true)}
                {F(AR ? 'الإنجاز الحالي' : 'Current progress', row.pct + '%', true)}
                {F(AR ? 'المدة الأصلية' : 'Original duration', row.origDur + (AR ? ' يوم' : 'd'), true)}
                {F(AR ? 'المدة المتبقية' : 'Remaining duration', row.remDur + (AR ? ' يوم' : 'd'), true)}
                {F(AR ? 'الحالة' : 'Status', row.status)}
                {F(AR ? 'المسار الحرج' : 'Critical path', row.crit)}
              </React.Fragment>}
            </div>
          </div>
        </div>
        <div className="d-drawer-foot"><button className="d-btn" onClick={onClose}>{AR ? 'إغلاق' : 'Close'}</button></div>
      </div>
    </React.Fragment>
  );
}

// Proposed new BOQ item — drafted here, added to the official BOQ only after endorsement.
function DVONewItemPanel({ lang, divs, wbsList, onSave, onClose }) {
  const AR = lang === 'ar';
  const [v, setV] = React.useState({ code: '', desc: '', unit: '', qty: '', price: '', div: divs[0] || '', wbs: wbsList[0] || '' });
  const set = (k, x) => setV(o => ({ ...o, [k]: x }));
  const ok = v.code && v.desc && v.unit && Number(v.qty) > 0 && Number(v.price) > 0;
  const F = (k, l, extra) => <div className="d-form-field"><label>{l}</label><input className={'d-form-input' + (extra ? ' mono' : '')} value={v[k]} onChange={e => set(k, extra ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)} /></div>;
  return (
    <React.Fragment>
      <div className="d-drawer-scrim" onClick={onClose}></div>
      <div className="d-drawer">
        <div className="d-drawer-head"><div className="tx"><b>{AR ? 'بند مقترح جديد' : 'Proposed new item'}</b><span>{AR ? 'لا يُضاف إلى جدول الكميات قبل الاعتماد' : 'Not added to the BOQ before endorsement'}</span></div><button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-drawer-body">
          {F('code', AR ? 'كود البند المقترح' : 'Proposed BOQ code', true)}
          {F('desc', AR ? 'وصف البند' : 'Item description')}
          {F('unit', AR ? 'الوحدة' : 'Unit')}
          {F('qty', AR ? 'الكمية' : 'Quantity', true)}
          {F('price', AR ? 'سعر الوحدة' : 'Unit rate', true)}
          <div className="d-form-field"><label>Division</label><select className="d-form-input" value={v.div} onChange={e => set('div', e.target.value)}>{divs.map(d => <option key={d}>{d}</option>)}</select></div>
          <div className="d-form-field"><label>WBS</label><select className="d-form-input" value={v.wbs} onChange={e => set('wbs', e.target.value)}>{wbsList.map(d => <option key={d}>{d}</option>)}</select></div>
          <div className="d-vow-note"><Icon name="info" size={16} /><span>{AR ? 'سيظهر البند داخل الأمر التغييري كبند مقترح جديد فقط.' : 'The item appears inside the change order as a proposed new item only.'}</span></div>
        </div>
        <div className="d-drawer-foot">
          <button className="d-btn" onClick={onClose}>{AR ? 'إلغاء' : 'Cancel'}</button>
          <button className="d-btn primary" disabled={!ok} onClick={() => onSave({
            _t: 'boq', _new: true, code: v.code, desc: v.desc, unit: v.unit, div: v.div, wbs: v.wbs,
            loc: '—', status: AR ? 'مقترح' : 'Proposed', qty: 0, executedQty: 0, price: Number(v.price), weight: 0,
            chg: 'new', delta: String(v.qty),
          })}><Icon name="check" size={15} />{AR ? 'حفظ البند المقترح' : 'Save proposed item'}</button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { DVOChips, DVOMultiPick, DVODetailPanel, DVONewItemPanel });
