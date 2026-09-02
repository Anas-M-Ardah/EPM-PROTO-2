/* ============================================================
   Equipment-supply (تجهيز) modules — committee §1, §6–§10.
   A supply project's work is line items (فقرات تجهيزية), each an
   independent device tracked by contracted/supplied/received counts,
   multi-beneficiary distribution, warehouse + preliminary receipts,
   and a per-item archive. Fully functional: create items, register
   receipts, edit distribution, raise redistribution change orders —
   all persisted via window.usePersistedState. Completion (project
   tech %) derives from Σreceived ÷ Σcontracted in model.js.
   ============================================================ */

function DSupplyPill({ status, lang }) {
  const s = (window.EPM.SUPPLY_STATUS || {})[status] || { ar: status, en: status, cls: '' };
  return <span className={'d-pill ' + s.cls}>{lang === 'ar' ? s.ar : s.en}</span>;
}

// ---------- Line Items ----------
/* The supply BOQ is the SAME module as the construction BOQ — an L05 register
   of contracted line items with a docked record in Z8 — differing only in what
   a line item is (a device, received into a store) and in the two receipt
   registers a supply contract carries. Everything structural comes from the
   shared shell: DModuleFrame zones, DFGroup sections, the table contract,
   DRecordPane, DMoney, DZ10. */
function DModSupplyItems({ t, lang, p, d, showToast, shell }) {
  const AR = lang === 'ar';
  const seed = React.useMemo(() => window.EPM.buildSupplyData(p, lang), [p && p.id, lang]);
  const [items, setItems] = window.usePersistedState('supply.items.' + (window.__epmPid || 'na'), function () { return seed.items; });
  const [openSeq, setOpenSeq] = React.useState(null);
  const [wide, setWide] = React.useState(false);
  const [tab, setTab] = React.useState('general');
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [editItem, setEditItem] = React.useState(false);
  const [draft, setDraft] = React.useState(null);   // new item — added to the list only on Save
  const [notes, setNotes] = window.usePersistedState('supply.notes.' + (window.__epmPid || 'na'), {});
  const [note, setNote] = React.useState('');
  /* Registering a receipt is a contractual act — it moves the received
     quantity and can close the item. It gets a form with its own evidence,
     not a button that invents a quantity and a committee. */
  const [rcpt, setRcpt] = React.useState(null);
  const fileRef = React.useRef(null);
  const fileTarget = React.useRef(null);          // 'rcpt' | 'docs'
  const pickFiles = (to) => { fileTarget.current = to; if (fileRef.current) fileRef.current.click(); };
  const sizeOf = f => f.size < 1024 ? f.size + ' B' : f.size < 1048576
    ? Math.round(f.size / 1024) + ' KB' : (f.size / 1048576).toFixed(1) + ' MB';
  const onFiles = (ev) => {
    const picked = [...(ev.target.files || [])].map(f => ({ name: f.name, size: sizeOf(f) }));
    if (!picked.length) return;
    const U = (window.EPM && window.EPM.CURRENT_USER) || {};
    const by = (U.name && (AR ? U.name.ar : U.name.en)) || (AR ? 'المستخدم الحالي' : 'Current user');
    if (fileTarget.current === 'rcpt') {
      setRcpt(r => r ? { ...r, files: [...r.files, ...picked] } : r);
    } else if (fileTarget.current === 'docs' && openSeq != null) {
      setItems(is => is.map(x => x.seq !== openSeq ? x : { ...x, docs: [...x.docs,
        ...picked.map(f => ({ name: f.name.replace(/\.[^.]+$/, ''), file: f.name, date: window.EPM.DATA_DATE, by, rev: 'R1', size: f.size }))] }));
      showToast(AR ? 'أُضيف الملف إلى أرشيف الفقرة' : 'File added to the item archive');
    }
    if (ev.target) ev.target.value = '';
  };
  const fmt = window.fmtNum;
  const FORMS = window.EPM.FORMATIONS || [];
  const blankBen = (n) => ({ name: (FORMS[n] || FORMS[0] || {})[lang] || '', qty: 0, received: 0 });
  React.useEffect(() => { setTab('general'); setNote(''); }, [openSeq]);

  // Normalize each item to the inherited BOQ shape — older persisted items may
  // predate the rate/total/weight fields. Contract value / Σcontracted is the
  // fallback unit rate.
  const cCost = (d && d.contract && d.contract.raw && d.contract.raw.contractCost) || 0;
  const sumContracted = items.reduce((a2, x) => a2 + (x.contractedQty != null ? x.contractedQty : x.contracted), 0) || 1;
  const rateFallback = Math.max(1, Math.round(cCost / sumContracted));
  const rows0 = items.map(x => {
    const cQty = x.contractedQty != null ? x.contractedQty : x.contracted;
    const price = x.price != null ? x.price : rateFallback;
    return { ...x, contractedQty: cQty, executedQty: x.executedQty != null ? x.executedQty : x.received,
      unit: x.unit || (AR ? 'جهاز' : 'unit'), price, total: cQty * price };
  });
  const totVal = rows0.reduce((a2, x) => a2 + x.total, 0) || 1;
  const rows = rows0.map(x => ({ ...x, weight: +(x.total / totVal * 100).toFixed(2) }));
  const totC = rows.reduce((a2, x) => a2 + x.contracted, 0);
  const totS = rows.reduce((a2, x) => a2 + x.supplied, 0);
  const totR = rows.reduce((a2, x) => a2 + x.received, 0);
  const totValue = Math.round(totVal);
  const pct = totC ? Math.round(totR / totC * 100) : 0;
  const ql = q.trim().toLowerCase();
  const shown = rows.filter(x => (filter === 'all' || x.status === filter) &&
    (!ql || (x.code + ' ' + x.device + ' ' + x.model + ' ' + x.manufacturer).toLowerCase().includes(ql)));
  const open = rows.find(x => x.seq === openSeq);
  const filtered = !!(ql || filter !== 'all');
  const clearAll = () => { setQ(''); setFilter('all'); };
  const COUNT = f => f === 'all' ? rows.length : rows.filter(x => x.status === f).length;

  const recalc = (x) => { const price = x.price != null ? x.price : 0; return { ...x,
    contractedQty: x.contracted, executedQty: x.received, price, total: x.contracted * price,
    remaining: Math.max(0, x.contracted - x.received),
    status: (x.contracted > 0 && x.received >= x.contracted) ? 'received' : x.received > 0 ? 'partial' : x.supplied > 0 ? 'supplied' : 'pending' }; };
  const updateItem = (seq, patch) => setItems(is => is.map(x => x.seq === seq ? recalc({ ...x, ...patch }) : x));
  const addBeneficiary = (seq) => setItems(is => is.map(x => x.seq === seq ? { ...x, beneficiaries: [...x.beneficiaries, blankBen(x.beneficiaries.length)] } : x));
  const updateBeneficiary = (seq, i, patch) => setItems(is => is.map(x => x.seq === seq ? { ...x, beneficiaries: x.beneficiaries.map((b, j) => j === i ? { ...b, ...patch } : b) } : x));
  const removeBeneficiary = (seq, i) => setItems(is => is.map(x => x.seq === seq ? { ...x, beneficiaries: x.beneficiaries.filter((_, j) => j !== i) } : x));
  const startAdd = () => {
    const seq = (items.reduce((m, x) => Math.max(m, x.seq), 0) || 0) + 1;
    setOpenSeq(null); setEditItem(false);
    setDraft({ seq, no: seq, code: 'ITM-' + String(seq).padStart(3, '0'),
      item: '', unit: AR ? 'جهاز' : 'unit', price: 0, contractedQty: 0, executedQty: 0, total: 0, weight: 0,
      device: '', manufacturer: '', country: '', model: '',
      serialFrom: '—', serialTo: '—', contracted: 0, supplied: 0, received: 0, remaining: 0, status: 'pending',
      beneficiaries: [], warrantyMonths: 12, warrantyExpiry: '—', notes: '', receipts: { warehouse: [], preliminary: [] }, docs: [] });
  };
  const saveDraft = () => {
    if (!draft.device || !draft.device.trim()) { showToast(AR ? 'أدخل اسم الجهاز' : 'Enter the device name'); return; }
    if (!(draft.contracted > 0)) { showToast(AR ? 'أدخل الكمية المتعاقد عليها (أكبر من صفر)' : 'Enter the contracted quantity (> 0)'); return; }
    if (!(draft.price > 0)) { showToast(AR ? 'أدخل سعر الوحدة (أكبر من صفر)' : 'Enter the unit rate (> 0)'); return; }
    if (draft.beneficiaries.reduce((a2, b2) => a2 + (b2.qty || 0), 0) > draft.contracted) { showToast(AR ? 'مجموع التوزيع يتجاوز الكمية المتعاقدة' : 'Distribution exceeds the contracted quantity'); return; }
    setItems(is => [...is, recalc({ ...draft, item: draft.device })]); showToast(AR ? 'حُفظت الفقرة الجديدة' : 'New item saved');
    setOpenSeq(draft.seq); setDraft(null);
  };
  const deleteItem = (seq) => { setItems(is => is.filter(x => x.seq !== seq)); setOpenSeq(null); setEditItem(false); showToast(AR ? 'حُذفت الفقرة' : 'Item deleted'); };
  const startReceipt = (x, kind) => {
    const pid = (window.__epmPid || '').slice(4);
    const seqNo = kind === 'warehouse' ? x.receipts.warehouse.length + 1 : x.receipts.preliminary.length + 1;
    setRcpt({ seq: x.seq, kind,
      no: (kind === 'warehouse' ? 'WR-' : 'PR-') + pid + '-' + x.seq + '-' + seqNo,
      date: window.EPM.DATA_DATE,
      qty: String(Math.max(0, x.remaining || 0)),
      store: AR ? 'مخزن الوزارة المركزي' : 'Ministry central store',
      committee: AR ? 'لجنة الاستلام المخزني' : 'Warehouse receipt committee',
      entity: (x.beneficiaries[0] && x.beneficiaries[0].name) || '',
      conformity: AR ? 'مطابق' : 'Conforming',
      notes: '', files: [] });
  };
  const rcptItem = rcpt ? rows.find(x => x.seq === rcpt.seq) : null;
  const rcptQty = rcpt ? (parseFloat(rcpt.qty) || 0) : 0;
  /* a receipt can never book more than the item still owes */
  const rcptCap = rcptItem ? Math.max(0, rcptItem.contracted - rcptItem.received) : 0;
  const rcptBad = !!(rcpt && (rcptQty <= 0 || rcptQty > rcptCap + 0.001
    || (rcpt.kind === 'warehouse' ? !String(rcpt.store).trim() : !String(rcpt.entity).trim())));
  const saveReceipt = () => {
    if (!rcpt || rcptBad) return;
    const r = rcpt, qty = rcptQty;
    setItems(is => is.map(x => {
      if (x.seq !== r.seq) return x;
      if (r.kind === 'warehouse') {
        const rec = { no: r.no, date: r.date, qty, store: r.store, committee: r.committee,
          notes: r.notes, files: r.files };
        const received = Math.min(x.contracted, x.received + qty);
        return { ...x, receipts: { ...x.receipts, warehouse: [rec, ...x.receipts.warehouse] },
          received, remaining: x.contracted - received,
          status: received >= x.contracted ? 'received' : received > 0 ? 'partial' : x.status };
      }
      const rec = { no: r.no, date: r.date, entity: r.entity, qty, conformity: r.conformity,
        notes: r.notes, files: r.files };
      return { ...x, receipts: { ...x.receipts, preliminary: [rec, ...x.receipts.preliminary] } };
    }));
    setRcpt(null);
    showToast(r.kind === 'warehouse' ? (AR ? 'سُجّل الاستلام المخزني ' + r.no : 'Warehouse receipt ' + r.no + ' registered')
                                     : (AR ? 'سُجّل الاستلام الأولي ' + r.no : 'Preliminary receipt ' + r.no + ' registered'));
  };
  const postNote = (code) => { if (!note.trim()) return;
    const U = (window.EPM && window.EPM.CURRENT_USER) || {};
    const by = (U.name && (AR ? U.name.ar : U.name.en)) || (AR ? 'المستخدم الحالي' : 'Current user');
    const z = new Date(); const pad = v => String(v).padStart(2, '0');
    const at = z.getFullYear() + '-' + pad(z.getMonth() + 1) + '-' + pad(z.getDate()) + ' ' + pad(z.getHours()) + ':' + pad(z.getMinutes());
    setNotes(prev => Object.assign({}, prev, { [code]: (prev[code] || []).concat([{ at, by, text: note.trim() }]) }));
    setNote(''); showToast(AR ? 'أُضيف التعليق إلى سجل الفقرة' : 'Comment added to the item history');
  };

  const kv = (k, v, mono) => <div className="d-form-i"><span className="k">{k}</span><span className={'v' + (mono ? ' mono' : '')}>{v}</span></div>;
  /* one way to open a document, used everywhere one is listed — on the
     receipt that proves it, in the item's archive, and in the history */
  const openFile = f => showToast((AR ? 'فتح المستند: ' : 'Opening: ') + (f.file || f.name));
  const fileChip = (f, i) => (
    <button key={i} type="button" className="d-filechip" title={f.file || f.name}
      onClick={() => openFile(f)}>
      <Icon name="description" size={13} />
      <span className="nm">{f.file || f.name}</span>
      {f.size && <span className="sz num">{f.size}</span>}
    </button>);
  const ef = (k, v, on, type) => (
    <div className="d-form-field"><label>{k}</label>
      <input className={'d-form-input' + (type === 'number' ? ' num' : '')} type={type || 'text'} value={v}
        onChange={e => on(type === 'number' ? (parseInt(e.target.value || '0', 10) || 0) : e.target.value)} /></div>);

  /* ---- the edit form, in Z8 like every other record edit in the app ---- */
  const editBody = (cur, mut) => {
    const allocSum = cur.beneficiaries.reduce((a2, b2) => a2 + (b2.qty || 0), 0);
    const over = allocSum > cur.contracted;
    return (<React.Fragment>
      <DRecordGrp label={AR ? 'البيانات الفنية' : 'Technical data'}>
        <div className="d-form-grid">
          {ef(AR ? 'الجهاز' : 'Device', cur.device, v => mut.field({ device: v }))}
          {ef(AR ? 'الموديل' : 'Model', cur.model, v => mut.field({ model: v }))}
          {ef(AR ? 'الشركة المصنعة' : 'Manufacturer', cur.manufacturer, v => mut.field({ manufacturer: v }))}
          {ef(AR ? 'بلد المنشأ' : 'Country of origin', cur.country, v => mut.field({ country: v }))}
          {ef(AR ? 'مدة الكفالة (شهر)' : 'Warranty (months)', cur.warrantyMonths, v => mut.field({ warrantyMonths: v }), 'number')}
        </div>
      </DRecordGrp>
      <DRecordGrp label={AR ? 'الكميات والكلفة' : 'Quantities & cost'}>
        <div className="d-form-grid">
          {ef(AR ? 'المتعاقد عليها' : 'Contracted', cur.contracted, v => mut.field({ contracted: v }), 'number')}
          {ef(AR ? 'الوحدة' : 'Unit', cur.unit || '', v => mut.field({ unit: v }))}
          {ef(AR ? 'سعر الوحدة' : 'Unit rate', cur.price || 0, v => mut.field({ price: v }), 'number')}
          {kv(AR ? 'القيمة الإجمالية' : 'Total value', <DMoney v={(cur.contracted || 0) * (cur.price || 0)} lang={lang} size="sm" />)}
        </div>
      </DRecordGrp>
      <DRecordGrp label={AR ? 'التوزيع على الجهات المستفيدة' : 'Distribution by beneficiary'}>
        {over && <DMsgBar tone="danger" title={AR ? 'التوزيع يتجاوز الكمية' : 'Distribution exceeds the quantity'}>
          {AR ? 'مجموع المخصَّص ' : 'Allocated '}<b className="num">{fmt(allocSum)}</b>
          {AR ? ' مقابل كمية متعاقدة ' : ' against a contracted '}<b className="num">{fmt(cur.contracted)}</b>.</DMsgBar>}
        {cur.beneficiaries.length ? (
          <table className="d-line-table d-editgrid">
            <thead><tr><th>{AR ? 'الجهة' : 'Beneficiary'}</th>
              <th className="r" style={{ width: 84 }}>{AR ? 'المخصَّص' : 'Allocated'}</th>
              <th style={{ width: 34 }}></th></tr></thead>
            <tbody>{cur.beneficiaries.map((b2, i) => (
              <tr key={i}>
                <td><select className="d-cellinput" value={b2.name} title={b2.name}
                  aria-label={AR ? 'الجهة المستفيدة' : 'Beneficiary'}
                  onChange={e => mut.updBen(i, { name: e.target.value })}>
                  {FORMS.every(f => f[lang] !== b2.name) && b2.name ? <option value={b2.name}>{b2.name}</option> : null}
                  {FORMS.map(f => <option key={f.en} value={f[lang]}>{f[lang]}</option>)}</select></td>
                <td className="r"><input className="d-cellinput num" inputMode="numeric" value={b2.qty}
                  aria-label={AR ? 'الكمية المخصَّصة' : 'Allocated quantity'}
                  onChange={e => mut.updBen(i, { qty: parseInt(e.target.value.replace(/\D/g, '') || '0', 10) || 0 })} /></td>
                <td><button className="d-icon-btn sm" aria-label={AR ? 'إزالة' : 'Remove'} onClick={() => mut.rmBen(i)}>
                  <Icon name="close" size={15} /></button></td></tr>))}</tbody>
            <tfoot><tr><td>{AR ? 'المخصَّص' : 'Allocated'}</td>
              <td className={'r num' + (over ? ' bad' : '')}>{fmt(allocSum)} / {fmt(cur.contracted)}</td><td></td></tr></tfoot>
          </table>
        ) : (
          <div className="d-vow-empty"><Icon name="groups" size={22} />
            <b>{AR ? 'لا توزيع بعد' : 'Not distributed yet'}</b>
            <span>{AR ? 'وزّع الكمية على الجهات المستفيدة لتتبّع التسليم لكل جهة.' : 'Allocate the quantity to beneficiaries to track delivery per entity.'}</span></div>
        )}
        <div className="d-rowacts">
          <button className="d-btn sm" onClick={mut.addBen}><Icon name="add" size={15} />{AR ? 'إضافة جهة' : 'Add a beneficiary'}</button>
        </div>
      </DRecordGrp>
    </React.Fragment>);
  };

  /* ---- Z8: the edit pane while creating or editing, the record otherwise ---- */
  const cur = draft || (editItem ? open : null);
  const rf = (k, v, on, o) => { const opt = o || {};
    return (<div className={'d-form-field ' + (opt.w || 'f-full')}>
      <label>{k}{opt.req && <span className="req" aria-hidden="true">*</span>}</label>
      {opt.ro
        ? <span className="d-form-ro num">{v}</span>
        : <input className={'d-form-input' + (opt.num ? ' num' : '') + (opt.bad ? ' bad' : '')}
            inputMode={opt.num ? 'decimal' : undefined} value={v}
            onChange={e => on(opt.num ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)} />}
      {opt.bad && <span className="d-form-err">{opt.bad}</span>}
      {opt.hint && !opt.bad && <span className="d-form-hint">{opt.hint}</span>}
    </div>); };
  const aside = rcpt ? (
    <DRecordPane lang={lang} wide={wide} onExpand={() => setWide(w => !w)}
      title={rcpt.kind === 'warehouse' ? (AR ? 'تسجيل استلام مخزني' : 'Register a warehouse receipt')
                                       : (AR ? 'تسجيل استلام أولي' : 'Register a preliminary receipt')}
      meta={[{ k: AR ? 'الفقرة' : 'Item', v: (rcptItem || {}).code, num: true },
             { k: AR ? 'المتبقّي' : 'Remaining', v: fmt(rcptCap) + ' ' + ((rcptItem || {}).unit || ''), num: true }]}
      onClose={() => setRcpt(null)}
      footer={<React.Fragment>
        <button className="d-btn sm" onClick={() => setRcpt(null)}>{AR ? 'إلغاء' : 'Cancel'}</button>
        <span className="sp"></span>
        <button className="d-btn sm primary" disabled={rcptBad} onClick={saveReceipt}>
          <Icon name="check" size={15} />{AR ? 'تسجيل الاستلام' : 'Register receipt'}</button>
      </React.Fragment>}>
      <DMsgBar tone="info" icon="inventory" title={AR ? 'ماذا يفعل هذا التسجيل' : 'What this registration does'}>
        {rcpt.kind === 'warehouse'
          ? (AR ? 'الاستلام المخزني يزيد الكمية المستلَمة للفقرة وقد يُغلقها — لذلك يتطلّب مستنداً وجهة استلام.'
                : 'A warehouse receipt increases the item’s received quantity and can close it, so it needs a document and a receiving store.')
          : (AR ? 'الاستلام الأولي يوثّق تسلّم الجهة المستفيدة ولا يغيّر الكمية المستلَمة مخزنياً.'
                : 'A preliminary receipt records the beneficiary’s hand-over; it does not change the warehouse-received quantity.')}
      </DMsgBar>
      <DRecordGrp label={AR ? 'بيانات الاستلام' : 'Receipt data'}>
        <div className="d-form-grid">
          {rf(AR ? 'رقم الاستلام' : 'Receipt no.', rcpt.no, null, { ro: true, w: 'f-half' })}
          {rf(AR ? 'التاريخ' : 'Date', rcpt.date, v => setRcpt(r => ({ ...r, date: v })), { w: 'f-half', num: true })}
          {rf(AR ? 'الكمية' : 'Quantity', rcpt.qty, v => setRcpt(r => ({ ...r, qty: v })),
            { num: true, req: true, w: 'f-half',
              bad: rcptQty > rcptCap + 0.001 ? (AR ? 'أكبر من المتبقّي (' + fmt(rcptCap) + ')' : 'More than remaining (' + fmt(rcptCap) + ')')
                : (rcpt.qty !== '' && rcptQty <= 0) ? (AR ? 'أدخل كمية أكبر من صفر' : 'Enter a quantity above zero') : null,
              hint: AR ? 'المتبقّي ' + fmt(rcptCap) + ' ' + ((rcptItem || {}).unit || '') : 'remaining ' + fmt(rcptCap) + ' ' + ((rcptItem || {}).unit || '') })}
          {rcpt.kind === 'warehouse' ? (
            <React.Fragment>
              {rf(AR ? 'المخزن' : 'Store', rcpt.store, v => setRcpt(r => ({ ...r, store: v })),
                { req: true, bad: !String(rcpt.store).trim() ? (AR ? 'حدّد المخزن المستلِم' : 'Name the receiving store') : null })}
              {rf(AR ? 'لجنة الاستلام' : 'Receipt committee', rcpt.committee, v => setRcpt(r => ({ ...r, committee: v })))}
            </React.Fragment>
          ) : (
            <React.Fragment>
              {rf(AR ? 'الجهة المستلمة' : 'Receiving entity', rcpt.entity, v => setRcpt(r => ({ ...r, entity: v })),
                { req: true, bad: !String(rcpt.entity).trim() ? (AR ? 'حدّد الجهة المستلمة' : 'Name the receiving entity') : null })}
              {rf(AR ? 'المطابقة' : 'Conformity', rcpt.conformity, v => setRcpt(r => ({ ...r, conformity: v })))}
            </React.Fragment>
          )}
          <div className="d-form-field f-full"><label>{AR ? 'ملاحظات' : 'Notes'}</label>
            <textarea className="d-form-input" rows={2} value={rcpt.notes}
              onChange={e => setRcpt(r => ({ ...r, notes: e.target.value }))}></textarea></div>
        </div>
      </DRecordGrp>
      <DRecordGrp label={(AR ? 'مستندات الاستلام' : 'Receipt documents') + (rcpt.files.length ? ' · ' + rcpt.files.length : '')}>
        {rcpt.files.length ? (
          <div className="d-attlist">{rcpt.files.map((f, i) => (
            <div className="d-att" key={i}>
              <Icon name="description" size={16} />
              <span className="tx"><b title={f.name}>{f.name}</b><span className="num">{f.size}</span></span>
              <button className="d-icon-btn sm" aria-label={AR ? 'إزالة الملف' : 'Remove file'}
                onClick={() => setRcpt(r => ({ ...r, files: r.files.filter((_, j) => j !== i) }))}>
                <Icon name="close" size={15} /></button>
            </div>))}</div>
        ) : (
          <span className="d-cell-sub">{AR ? 'أرفق صورة محضر الاستلام أو الذرعة — تبقى مع هذا الاستلام في سجل الفقرة.'
            : 'Attach the receipt certificate or measurement sheet — it stays with this receipt in the item’s history.'}</span>
        )}
        <div className="d-rowacts">
          <button className="d-btn sm" onClick={() => pickFiles('rcpt')}>
            <Icon name="attach_file" size={15} />{AR ? 'إرفاق ملف' : 'Attach a file'}</button>
        </div>
      </DRecordGrp>
    </DRecordPane>
  ) : cur ? (
    <DRecordPane lang={lang} wide={wide} onExpand={() => setWide(w => !w)}
      title={draft ? (AR ? 'فقرة تجهيزية جديدة' : 'New supply item') : (AR ? 'تعديل — ' : 'Edit — ') + cur.code}
      meta={[{ k: AR ? 'الرمز' : 'Code', v: cur.code, num: true },
             { k: AR ? 'الحالة' : 'Status', v: <DSupplyPill status={cur.status} lang={lang} /> }]}
      onClose={() => { setDraft(null); setEditItem(false); }}
      footer={<React.Fragment>
        <button className="d-btn sm" onClick={() => { setDraft(null); setEditItem(false); }}>{AR ? 'إلغاء' : 'Cancel'}</button>
        <span className="sp"></span>
        <button className="d-btn sm primary" onClick={() => { if (draft) saveDraft(); else setEditItem(false); }}>
          <Icon name="check" size={15} />{AR ? 'حفظ' : 'Save'}</button>
      </React.Fragment>}>
      {editBody(cur, draft ? {
        field: patch => setDraft(dd => recalc({ ...dd, ...patch })),
        addBen: () => setDraft(dd => ({ ...dd, beneficiaries: [...dd.beneficiaries, blankBen(dd.beneficiaries.length)] })),
        updBen: (i, patch) => setDraft(dd => ({ ...dd, beneficiaries: dd.beneficiaries.map((b2, j) => j === i ? { ...b2, ...patch } : b2) })),
        rmBen: (i) => setDraft(dd => ({ ...dd, beneficiaries: dd.beneficiaries.filter((_, j) => j !== i) })),
      } : {
        field: patch => updateItem(cur.seq, patch),
        addBen: () => addBeneficiary(cur.seq),
        updBen: (i, patch) => updateBeneficiary(cur.seq, i, patch),
        rmBen: (i) => removeBeneficiary(cur.seq, i),
      })}
    </DRecordPane>
  ) : open ? (
    <DRecordPane lang={lang} wide={wide} onExpand={() => setWide(w => !w)}
      title={open.device}
      meta={[
        { k: AR ? 'الرمز' : 'Code', v: open.code, num: true },
        { k: AR ? 'القيمة' : 'Amount', v: open.total, money: true },
        { k: AR ? 'الحالة' : 'Status', v: <DSupplyPill status={open.status} lang={lang} /> },
        { k: AR ? 'الوزن' : 'Weight', v: (open.weight != null ? open.weight : 0) + '%', num: true },
      ]}
      tabs={[{ id: 'general', label: AR ? 'عام' : 'General' },
             { id: 'dist', label: AR ? 'التوزيع' : 'Distribution', n: open.beneficiaries.length },
             { id: 'receipts', label: AR ? 'الاستلامات' : 'Receipts', n: open.receipts.warehouse.length + open.receipts.preliminary.length },
             { id: 'cost', label: AR ? 'الكلفة' : 'Cost' },
             { id: 'history', label: AR ? 'السجل' : 'History' }]}
      tab={tab} onTab={setTab}
      onEdit={() => setEditItem(true)} onClose={() => { setOpenSeq(null); setWide(false); }}
      footer={<React.Fragment>
        <button className="d-btn sm primary" disabled={open.remaining <= 0}
          title={open.remaining <= 0 ? (AR ? 'استُلمت الكمية بالكامل' : 'Fully received') : ''}
          onClick={() => startReceipt(open, 'warehouse')}>
          <Icon name="inventory" size={15} />{AR ? 'استلام مخزني' : 'Warehouse'}</button>
        <button className="d-btn sm" onClick={() => startReceipt(open, 'preliminary')}>
          <Icon name="assignment_turned_in" size={15} />{AR ? 'استلام أولي' : 'Preliminary'}</button>
        <span className="sp"></span>
        <button className="d-icon-btn sm" title={AR ? 'حذف الفقرة' : 'Delete item'}
          aria-label={AR ? 'حذف الفقرة' : 'Delete item'} onClick={() => deleteItem(open.seq)}>
          <Icon name="delete" size={16} /></button>
      </React.Fragment>}>

      {tab === 'general' && <React.Fragment>
        {open.remaining > 0
          ? <DMsgBar tone="warning" title={AR ? 'الاستلام غير مكتمل' : 'Receipt incomplete'}>
              {AR ? 'لم يُستلَم بعد ' : 'Still to receive: '}<b className="num">{fmt(open.remaining)}</b> {open.unit}
              {AR ? ' من أصل ' : ' of '}<b className="num">{fmt(open.contracted)}</b>.</DMsgBar>
          : <DMsgBar tone="success" title={AR ? 'استُلمت الكمية بالكامل' : 'Fully received'}>
              {AR ? 'استُلمت كامل الكمية المتعاقد عليها وسُجّلت مخزنياً.' : 'The whole contracted quantity has been received and booked into store.'}</DMsgBar>}
        <DRecordGrp label={AR ? 'البيانات الفنية' : 'Technical data'}>
          <div className="d-form-grid">
            {kv(AR ? 'الجهاز' : 'Device', open.device)}
            {kv(AR ? 'الموديل' : 'Model', <span className="num">{open.model}</span>)}
            {kv(AR ? 'الشركة المصنعة' : 'Manufacturer', open.manufacturer)}
            {kv(AR ? 'بلد المنشأ' : 'Country of origin', open.country)}
            {kv(AR ? 'الرقم التسلسلي' : 'Serial range', <span className="num">{open.serialFrom} → {open.serialTo}</span>)}
            {kv(AR ? 'الكفالة' : 'Warranty', open.warrantyMonths + (AR ? ' شهر · تنتهي ' : ' months · to ') + open.warrantyExpiry)}
          </div>
        </DRecordGrp>
        <DRecordGrp label={AR ? 'الكميات' : 'Quantities'}>
          <div className="d-form-grid">
            {kv(AR ? 'المتعاقد عليها' : 'Contracted', <span className="num">{fmt(open.contracted)}</span>)}
            {kv(AR ? 'المجهَّزة' : 'Supplied', <span className="num">{fmt(open.supplied)}</span>)}
            {kv(AR ? 'المستلَمة' : 'Received', <span className="num">{fmt(open.received)}</span>)}
            {kv(AR ? 'المتبقية' : 'Remaining', <span className="num">{fmt(open.remaining)}</span>)}
          </div>
        </DRecordGrp>
      </React.Fragment>}

      {tab === 'dist' && <React.Fragment>
        <DRecordGrp label={AR ? 'التوزيع على الجهات المستفيدة' : 'Distribution by beneficiary'}>
          {open.beneficiaries.length ? (
            <table className="d-line-table">
              <thead><tr><th>{AR ? 'الجهة' : 'Beneficiary'}</th>
                <th className="r" style={{ width: 84 }}>{AR ? 'المخصَّص' : 'Allocated'}</th>
                <th className="r" style={{ width: 84 }}>{AR ? 'المستلَم' : 'Received'}</th></tr></thead>
              <tbody>{open.beneficiaries.map((b2, i) => (
                <tr key={i}><td className="name wrap">{b2.name}</td>
                  <td className="r num">{fmt(b2.qty)}</td><td className="r num">{fmt(b2.received)}</td></tr>))}</tbody>
              <tfoot><tr><td>{AR ? 'المجموع' : 'Total'}</td>
                <td className="r num">{fmt(open.beneficiaries.reduce((a2, b2) => a2 + (b2.qty || 0), 0))}</td>
                <td className="r num">{fmt(open.beneficiaries.reduce((a2, b2) => a2 + (b2.received || 0), 0))}</td></tr></tfoot>
            </table>
          ) : (
            <div className="d-vow-empty"><Icon name="groups" size={22} />
              <b>{AR ? 'لا توزيع بعد' : 'Not distributed yet'}</b>
              <span>{AR ? 'افتح التعديل لتوزيع الكمية على الجهات المستفيدة.' : 'Open edit to allocate the quantity to beneficiaries.'}</span></div>
          )}
        </DRecordGrp>
      </React.Fragment>}

      {tab === 'receipts' && <React.Fragment>
        {/* A receipt is a document with a receiving party and evidence, so it
            is rendered as a record — three columns in a 320px pane had no room
            for the store, the committee or the file, and dropped all three. */}
        <DRecordGrp label={(AR ? 'الاستلام المخزني' : 'Warehouse receipts') + ' · ' + open.receipts.warehouse.length}>
          {open.receipts.warehouse.length ? (
            <div className="d-rcptlist">{open.receipts.warehouse.map((rc, i) => (
              <div className="d-rcpt" key={i}>
                <div className="hd"><span className="no">{rc.no}</span>
                  <span className="sp"></span>
                  <span className="qty num">{fmt(rc.qty)} {open.unit}</span>
                  <time className="num">{rc.date}</time></div>
                <div className="who">{rc.store}{rc.committee ? ' · ' + rc.committee : ''}</div>
                {rc.notes && <div className="nt">{rc.notes}</div>}
                {(rc.files || []).length > 0 && <div className="fls">{(rc.files || []).map(fileChip)}</div>}
              </div>))}</div>
          ) : <span className="d-cell-sub">{AR ? 'لا استلامات مخزنية بعد.' : 'No warehouse receipts yet.'}</span>}
        </DRecordGrp>
        <DRecordGrp label={(AR ? 'الاستلام الأولي' : 'Preliminary receipts') + ' · ' + open.receipts.preliminary.length}>
          {open.receipts.preliminary.length ? (
            <div className="d-rcptlist">{open.receipts.preliminary.map((rc, i) => (
              <div className="d-rcpt" key={i}>
                <div className="hd"><span className="no">{rc.no}</span>
                  <span className="sp"></span>
                  <span className="qty num">{fmt(rc.qty)} {open.unit}</span>
                  <time className="num">{rc.date}</time></div>
                <div className="who">{rc.entity}{rc.conformity ? ' · ' + rc.conformity : ''}</div>
                {rc.notes && <div className="nt">{rc.notes}</div>}
                {(rc.files || []).length > 0 && <div className="fls">{(rc.files || []).map(fileChip)}</div>}
              </div>))}</div>
          ) : <span className="d-cell-sub">{AR ? 'لا استلامات أولية بعد.' : 'No preliminary receipts yet.'}</span>}
        </DRecordGrp>
        {/* documents that belong to the ITEM rather than to one receipt —
            the catalogue, the technical specs, the distribution letter */}
        <DRecordGrp label={(AR ? 'أرشيف الفقرة' : 'Item archive') + ' · ' + open.docs.length}>
          {open.docs.length ? (
            <div className="d-attlist">{open.docs.map((dc, i) => (
              <div className="d-att" key={i}>
                <Icon name="description" size={16} />
                <span className="tx"><b title={dc.file}>{dc.file}</b>
                  <span className="num">{dc.date} · {dc.by} · {dc.rev}{dc.size ? ' · ' + dc.size : ''}</span></span>
                <button className="d-icon-btn sm" title={AR ? 'عرض' : 'View'}
                  aria-label={(AR ? 'عرض ' : 'View ') + dc.file} onClick={() => openFile(dc)}>
                  <Icon name="visibility" size={15} /></button>
              </div>))}</div>
          ) : (
            <span className="d-cell-sub">{AR ? 'لا مستندات على مستوى الفقرة — الكتالوغ والمواصفات وكتب التوزيع تُرفق هنا.'
              : 'No item-level documents yet — the catalogue, technical specs and distribution letters are attached here.'}</span>
          )}
          <div className="d-rowacts">
            <button className="d-btn sm" onClick={() => pickFiles('docs')}>
              <Icon name="attach_file" size={15} />{AR ? 'إرفاق ملف للفقرة' : 'Attach a file to the item'}</button>
          </div>
        </DRecordGrp>
      </React.Fragment>}

      {tab === 'cost' && <DRecordGrp label={AR ? 'الكلفة والوزن' : 'Cost & weight'}>
        <div className="d-form-grid">
          {kv(AR ? 'الوحدة' : 'Unit', open.unit)}
          {kv(AR ? 'سعر الوحدة' : 'Unit rate', <DMoney v={open.price || 0} lang={lang} size="sm" />)}
          {kv(AR ? 'القيمة الإجمالية' : 'Total value', <DMoney v={open.total} lang={lang} size="sm" />)}
          {kv(AR ? 'القيمة المستلَمة' : 'Received value', <DMoney v={Math.round((open.received || 0) * (open.price || 0))} lang={lang} size="sm" />)}
          {kv(AR ? 'الوزن من قيمة التجهيز' : 'Weight of supply value', <span className="num">{open.weight != null ? open.weight : 0}%</span>)}
        </div>
      </DRecordGrp>}

      {tab === 'history' && <React.Fragment>
        <DRecordGrp label={AR ? 'سجل الفقرة' : 'Item history'}>
          <div className="d-trail">
            {[].concat(
              open.receipts.warehouse.map(rc => ({ at: rc.date, by: rc.store || (AR ? 'مخزن' : 'Store'),
                text: (AR ? 'استلام مخزني ' : 'Warehouse receipt ') + rc.no,
                meta: fmt(rc.qty) + ' ' + open.unit + (rc.committee ? ' · ' + rc.committee : ''),
                files: rc.files || [], icon: 'inventory', kind: 'sys' })),
              open.receipts.preliminary.map(rc => ({ at: rc.date, by: rc.entity,
                text: (AR ? 'استلام أولي ' : 'Preliminary receipt ') + rc.no,
                meta: fmt(rc.qty) + ' ' + open.unit + (rc.conformity ? ' · ' + rc.conformity : ''),
                files: rc.files || [], icon: 'assignment_turned_in', kind: 'sys' })),
              open.docs.map(dc => ({ at: dc.date, by: dc.by,
                text: (AR ? 'أُرفق مستند بالفقرة' : 'A document was attached to the item'),
                files: [dc], icon: 'attach_file', kind: 'sys' })),
              ((notes && notes[open.code]) || []).map(x => ({ at: x.at, by: x.by, text: x.text, files: [], icon: 'chat', kind: 'note' }))
            ).sort((x, y) => String(x.at).localeCompare(String(y.at))).map((h, i) => (
              <div className={'d-tstep' + (h.kind === 'note' ? ' note' : '')} key={i}>
                <span className="tdot"><Icon name={h.icon} size={11} /></span>
                <div className="th"><span>{h.by}</span><time className="tm">{h.at}</time></div>
                <div className="tb">{h.text}</div>
                {h.meta && <div className="tm2">{h.meta}</div>}
                {/* the evidence is reachable from the log, not just counted */}
                {(h.files || []).length > 0 && <div className="fls">{h.files.map(fileChip)}</div>}
              </div>))}
          </div>
        </DRecordGrp>
        <DRecordGrp label={AR ? 'إضافة تعليق' : 'Add a comment'}>
          <div className="d-form-field f-full">
            <label htmlFor="sup-note" className="sr">{AR ? 'التعليق' : 'Comment'}</label>
            <textarea id="sup-note" rows={3} className="d-form-input" value={note}
              placeholder={AR ? 'ملاحظة على هذه الفقرة — تُسجَّل باسمك ولا تُحذف.' : 'A note on this item — recorded under your name and never removed.'}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') postNote(open.code); }}></textarea>
          </div>
          <div className="d-rowacts"><span className="sp"></span>
            <button className="d-btn sm primary" disabled={!note.trim()} onClick={() => postNote(open.code)}>
              <Icon name="send" size={15} />{AR ? 'نشر' : 'Post'}</button></div>
        </DRecordGrp>
      </React.Fragment>}
    </DRecordPane>
  ) : null;

  return (
    <DModuleFrame {...(shell || {})}
      actions={<button className="d-btn sm primary" onClick={startAdd}>
        <Icon name="add" size={15} />{AR ? 'إضافة فقرة' : 'Add item'}</button>}
      aside={aside} asideWide={wide}
      status={<DZ10 lang={lang} asOf={d && d.asOf} stats={[
        { k: AR ? 'الفقرات' : 'Line items', v: shown.length + ' / ' + rows.length },
        { k: AR ? 'المتعاقد' : 'Contracted', v: fmt(totC) },
        { k: AR ? 'المستلَم' : 'Received', v: fmt(totR) + ' · ' + pct + '%' },
        { k: AR ? 'قيمة الفقرات' : 'BOQ value', v: totValue, money: true },
      ]} />}>

      <input type="file" multiple ref={fileRef} onChange={onFiles} style={{ display: 'none' }} />
      <DFGroup id="sup-reg" flush
        title={AR ? 'الفقرات التجهيزية' : 'Supply line items'}
        sub={shown.length + (AR ? ' من ' : ' of ') + rows.length}>
        <div className="d-toolbar">
          <div className="d-field">
            <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
            <input aria-label={AR ? 'بحث في الفقرات' : 'Search items'}
              placeholder={AR ? 'بحث بالرمز أو الجهاز أو المصنّع…' : 'Search by code, device or manufacturer…'}
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {['all', 'received', 'partial', 'supplied', 'pending'].map(f => (
            <button key={f} className={'d-fchip' + (filter === f ? ' on' : '')} aria-pressed={filter === f}
              disabled={f !== 'all' && !COUNT(f)} onClick={() => setFilter(f)}>
              {f === 'all' ? (AR ? 'الكل' : 'All') : (AR ? window.EPM.SUPPLY_STATUS[f].ar : window.EPM.SUPPLY_STATUS[f].en)}
              <span className="n">{COUNT(f)}</span></button>))}
          <div className="sp"></div>
          {filtered && <button className="d-btn sm ghost" onClick={clearAll}>
            <Icon name="close" size={13} />{AR ? 'مسح الفلاتر' : 'Clear filters'}</button>}
        </div>

        {shown.length ? (
        <div className="d-vow-tw wide-supreg"><table className="d-line-table d-vo-reg"><thead><tr>
          <th style={{ width: 92 }}>{AR ? 'الرمز' : 'Code'}</th>
          <th style={{ minWidth: 220 }}>{AR ? 'الجهاز' : 'Device'}</th>
          <th style={{ width: 76 }}>{AR ? 'الوحدة' : 'Unit'}</th>
          <th style={{ width: 92 }} className="r">{AR ? 'المتعاقد' : 'Contracted'}</th>
          <th style={{ width: 122 }} className="r">{AR ? 'سعر الوحدة' : 'Unit rate'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
          <th style={{ width: 148 }} className="r">{AR ? 'القيمة' : 'Value'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
          <th style={{ width: 190 }}>{AR ? 'الاستلام' : 'Receipt'}</th>
          <th style={{ width: 132 }}>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
          <tbody>{shown.map(x => { const ip = x.contracted ? Math.round(x.received / x.contracted * 100) : 0;
            return (
            <tr key={x.seq} tabIndex={0} role="link" aria-label={x.code + ' — ' + x.device}
              className={openSeq === x.seq ? 'sel' : ''}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSeq(x.seq); setEditItem(false); } }}
              onClick={() => { setOpenSeq(x.seq); setEditItem(false); }} style={{ cursor: 'pointer' }}>
              <td className="code">{x.code}</td>
              <td className="name wrap">{x.device}
                <div className="d-cell-sub">{x.manufacturer}{x.model ? ' · ' + x.model : ''}</div></td>
              <td className="d-cell-sub">{x.unit}</td>
              <td className="r num">{fmt(x.contracted)}</td>
              <td className="r"><DMoney v={x.price} lang={lang} size="sm" bare /></td>
              <td className="r"><DMoney v={x.total} lang={lang} size="sm" bare />
                <div className="d-cell-sub">{AR ? 'وزن ' : 'weight '}{x.weight}%</div></td>
              <td><div className="d-progress"><span className="t"><span style={{ width: Math.min(100, ip) + '%',
                background: ip >= 100 ? 'var(--status-completed)' : ip >= 50 ? 'var(--viz-1)' : 'var(--status-suspended)' }}></span></span>
                <span className="pc">{ip}%</span></div>
                <div className="d-cell-sub">{fmt(x.received)} / {fmt(x.contracted)}</div></td>
              <td><DSupplyPill status={x.status} lang={lang} /></td>
            </tr>); })}</tbody>
          <tfoot><tr>
            <td className="code">{AR ? 'الإجمالي' : 'Total'}</td>
            <td className="d-cell-sub">{shown.length}{AR ? ' فقرة' : ' items'}</td>
            <td></td>
            <td className="r num">{fmt(shown.reduce((a2, x) => a2 + x.contracted, 0))}</td>
            <td></td>
            <td className="r"><DMoney v={Math.round(shown.reduce((a2, x) => a2 + x.total, 0))} lang={lang} size="sm" bare /></td>
            <td className="d-cell-sub">{fmt(shown.reduce((a2, x) => a2 + x.received, 0))} / {fmt(shown.reduce((a2, x) => a2 + x.contracted, 0))}</td>
            <td></td>
          </tr></tfoot>
        </table></div>
        ) : rows.length === 0 ? (
          <div className="d-empty">
            <span className="d-empty-ico"><Icon name="inventory_2" size={26} /></span>
            <b>{AR ? 'لا فقرات تجهيزية بعد' : 'No supply items yet'}</b>
            <span>{AR ? 'تُدرَج الفقرات التجهيزية من جدول كميات العقد، وتُستلم لاحقاً على دفعات.' : 'Supply items come from the contract’s bill of quantities and are received in batches.'}</span>
            <button className="d-btn sm primary" onClick={startAdd}><Icon name="add" size={15} />{AR ? 'إضافة فقرة' : 'Add item'}</button>
          </div>
        ) : (
          <div className="d-empty">
            <span className="d-empty-ico"><Icon name="filter_alt_off" size={26} /></span>
            <b>{AR ? 'لا فقرات مطابقة' : 'No matching items'}</b>
            <span>{AR ? 'غيّر حالة الاستلام أو امسح البحث لعرض كل الفقرات.' : 'Change the receipt status or clear the search to see every item.'}</span>
            <button className="d-btn sm" onClick={clearAll}><Icon name="close" size={14} />{AR ? 'مسح الفلاتر' : 'Clear filters'}</button>
          </div>
        )}
      </DFGroup>
    </DModuleFrame>
  );
}

// ---------- Receipts register (aggregated across all items) ----------
function DModReceipts({ t, lang, p, d, shell, showToast }) {
  const AR = lang === 'ar';
  const seed = React.useMemo(() => window.EPM.buildSupplyData(p, lang), [p && p.id, lang]);
  const [items] = window.usePersistedState('supply.items.' + (window.__epmPid || 'na'), function () { return seed.items; });
  const [view, setView] = React.useState('warehouse');
  const fmt = window.fmtNum;
  const wh = [], pr = [];
  items.forEach(x => { x.receipts.warehouse.forEach(r => wh.push({ ...r, item: x.code, device: x.device, unit: x.unit }));
    x.receipts.preliminary.forEach(r => pr.push({ ...r, item: x.code, device: x.device, unit: x.unit })); });
  wh.sort((a, b) => (b.date || '').localeCompare(a.date || '')); pr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const list = view === 'warehouse' ? wh : pr;
  return (
    <DModuleFrame {...(shell || {})}
      toolbar={
        <div className="d-seg">
          <button className={view === 'warehouse' ? 'on' : ''} onClick={() => setView('warehouse')}>
            <Icon name="inventory" size={14} />{AR ? 'مخزني' : 'Warehouse'}</button>
          <button className={view === 'preliminary' ? 'on' : ''} onClick={() => setView('preliminary')}>
            <Icon name="assignment_turned_in" size={14} />{AR ? 'أولي' : 'Preliminary'}</button>
        </div>}
      status={<DZ10 lang={lang} asOf={d && d.asOf} stats={[
        { k: AR ? 'استلامات مخزنية' : 'Warehouse receipts', v: wh.length },
        { k: AR ? 'استلامات أولية' : 'Preliminary receipts', v: pr.length },
        { k: AR ? 'الكميات المستلمة' : 'Received quantity', v: fmt(wh.reduce((a, r) => a + r.qty, 0)) },
      ]} />}>

      <DFGroup id="sup-rec" flush
        title={view === 'warehouse' ? (AR ? 'سجل الاستلام المخزني' : 'Warehouse receipt register') : (AR ? 'سجل الاستلام الأولي' : 'Preliminary receipt register')}
        sub={list.length + (AR ? ' استلام' : ' receipts')}>
        {list.length ? (
          <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
            <th style={{ width: 132 }}>{AR ? 'رقم الاستلام' : 'Receipt no.'}</th>
            <th style={{ width: 110 }}>{AR ? 'التاريخ' : 'Date'}</th>
            <th style={{ width: 110 }}>{AR ? 'الفقرة' : 'Item'}</th>
            <th style={{ minWidth: 180 }}>{AR ? 'الجهاز' : 'Device'}</th>
            <th className="r" style={{ width: 90 }}>{AR ? 'الكمية' : 'Qty'}</th>
            <th style={{ minWidth: 170 }}>{view === 'warehouse' ? (AR ? 'المخزن واللجنة' : 'Store & committee') : (AR ? 'الجهة والمطابقة' : 'Entity & conformity')}</th>
            <th style={{ minWidth: 180 }}>{AR ? 'المستندات' : 'Documents'}</th></tr></thead>
            <tbody>{list.map((r, i) => (
              <tr key={i}><td className="code">{r.no}</td><td className="num">{r.date}</td>
                <td className="code">{r.item}</td><td className="name wrap">{r.device}</td>
                <td className="r num">{fmt(r.qty)}</td>
                <td className="d-cell-sub wrap">{view === 'warehouse' ? r.store : r.entity}
                  <div className="d-cell-sub">{view === 'warehouse' ? r.committee : r.conformity}</div></td>
                <td>{(r.files || []).length
                  ? <div className="fls">{(r.files || []).map((f, j) => (
                      <button key={j} type="button" className="d-filechip" title={f.file || f.name}
                        onClick={() => showToast((AR ? 'فتح المستند: ' : 'Opening: ') + (f.file || f.name))}>
                        <Icon name="description" size={13} /><span className="nm">{f.file || f.name}</span></button>))}</div>
                  : <span className="d-cell-sub">{AR ? 'لا مستند' : 'none'}</span>}</td></tr>))}</tbody>
            <tfoot><tr><td className="code">{AR ? 'الإجمالي' : 'Total'}</td>
              <td colSpan={3} className="d-cell-sub">{list.length}{AR ? ' استلام' : ' receipts'}</td>
              <td className="r num">{fmt(list.reduce((a, r) => a + (r.qty || 0), 0))}</td><td colSpan={2}></td></tr></tfoot>
          </table></div>
        ) : (
          <div className="d-empty">
            <span className="d-empty-ico"><Icon name={view === 'warehouse' ? 'inventory' : 'assignment_turned_in'} size={26} /></span>
            <b>{view === 'warehouse' ? (AR ? 'لا استلامات مخزنية بعد' : 'No warehouse receipts yet') : (AR ? 'لا استلامات أولية بعد' : 'No preliminary receipts yet')}</b>
            <span>{AR ? 'يُسجَّل الاستلام من الفقرة التجهيزية نفسها، فيظهر هنا مجمّعاً على مستوى العقد.' : 'A receipt is registered on the supply item itself and appears here aggregated across the contract.'}</span>
          </div>
        )}
      </DFGroup>
    </DModuleFrame>
  );
}

// ---------- Item inquiry (§6.ب) ----------
function DModItemInquiry({ t, lang, p, d, shell }) {
  const AR = lang === 'ar';
  const seed = React.useMemo(() => window.EPM.buildSupplyData(p, lang), [p && p.id, lang]);
  const [items] = window.usePersistedState('supply.items.' + (window.__epmPid || 'na'), function () { return seed.items; });
  const [q, setQ] = React.useState('');
  const fmt = window.fmtNum;
  const ql = q.trim().toLowerCase();
  const hits = ql ? items.filter(x => (x.code + ' ' + x.seq + ' ' + x.device + ' ' + x.model + ' ' + x.serialFrom + ' ' + x.serialTo).toLowerCase().includes(ql)) : [];
  const hit = hits[0] || null;
  const kv = (k, v) => <div className="d-form-i"><span className="k">{k}</span><span className="v">{v}</span></div>;
  return (
    <DModuleFrame {...(shell || {})}
      status={<DZ10 lang={lang} asOf={d && d.asOf} stats={[
        { k: AR ? 'الفقرات القابلة للاستعلام' : 'Searchable items', v: items.length },
        { k: AR ? 'النتائج' : 'Matches', v: ql ? hits.length : '—' },
      ]} />}>

      <DFGroup id="sup-inq" title={AR ? 'استعلام عن فقرة تجهيزية' : 'Supply item inquiry'}
        sub={AR ? 'بالتسلسل أو الرمز أو اسم الجهاز أو الرقم التسلسلي' : 'by sequence, code, device name or serial number'}>
        <div className="d-field" style={{ maxWidth: 420 }}>
          <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
          <input aria-label={AR ? 'استعلام عن فقرة' : 'Item inquiry'}
            placeholder={AR ? 'اكتب رمز الفقرة أو اسم الجهاز…' : 'Enter item code or device name…'}
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {!ql && <DMsgBar tone="info" icon="travel_explore" title={AR ? 'استعلام مباشر' : 'Direct inquiry'}>
          {AR ? 'ابدأ الكتابة لعرض بطاقة الفقرة كاملةً: بياناتها الفنية، توزيعها على الجهات، واستلاماتها.'
              : 'Start typing to reveal the item’s full record: technical data, its distribution across beneficiaries, and its receipts.'}
        </DMsgBar>}
        {ql && !hit && (
          <div className="d-empty">
            <span className="d-empty-ico"><Icon name="search_off" size={26} /></span>
            <b>{AR ? 'لا فقرة مطابقة' : 'No matching item'}</b>
            <span>{AR ? 'جرّب رمز الفقرة (ITM-001) أو جزءاً من اسم الجهاز.' : 'Try the item code (ITM-001) or part of the device name.'}</span>
          </div>)}
        {hit && hits.length > 1 && <DMsgBar tone="info" title={AR ? 'أكثر من فقرة مطابقة' : 'More than one match'}>
          {AR ? 'يُعرض أول ' + hits.length + ' مطابقات — دقّق البحث للوصول إلى فقرة بعينها.' : 'Showing the first of ' + hits.length + ' matches — refine the search to reach one item.'}
        </DMsgBar>}
      </DFGroup>

      {hit && <React.Fragment>
        <DFGroup title={hit.code + ' — ' + hit.device} sub={hit.manufacturer + (hit.model ? ' · ' + hit.model : '')}>
          <div className="d-form-grid">
            {kv(AR ? 'الحالة' : 'Status', <DSupplyPill status={hit.status} lang={lang} />)}
            {kv(AR ? 'بلد المنشأ' : 'Country', hit.country)}
            {kv(AR ? 'التسلسل' : 'Serial range', <span className="num">{hit.serialFrom} → {hit.serialTo}</span>)}
            {kv(AR ? 'الكفالة' : 'Warranty', hit.warrantyMonths + (AR ? ' شهر · تنتهي ' : ' months · to ') + hit.warrantyExpiry)}
            {kv(AR ? 'المتعاقد' : 'Contracted', <span className="num">{fmt(hit.contracted)}</span>)}
            {kv(AR ? 'المجهَّز' : 'Supplied', <span className="num">{fmt(hit.supplied)}</span>)}
            {kv(AR ? 'المستلَم' : 'Received', <span className="num">{fmt(hit.received)}</span>)}
            {kv(AR ? 'المتبقي' : 'Remaining', <span className="num">{fmt(hit.remaining)}</span>)}
          </div>
        </DFGroup>
        <DFGroup flush title={AR ? 'الجهات المستفيدة' : 'Beneficiaries'} sub={String(hit.beneficiaries.length)}>
          {hit.beneficiaries.length ? (
            <table className="d-line-table"><thead><tr>
              <th>{AR ? 'الجهة' : 'Beneficiary'}</th>
              <th className="r" style={{ width: 110 }}>{AR ? 'المخصَّص' : 'Allocated'}</th>
              <th className="r" style={{ width: 110 }}>{AR ? 'المستلَم' : 'Received'}</th></tr></thead>
              <tbody>{hit.beneficiaries.map((b, i) => (
                <tr key={i}><td className="name wrap">{b.name}</td>
                  <td className="r num">{fmt(b.qty)}</td><td className="r num">{fmt(b.received)}</td></tr>))}</tbody>
            </table>
          ) : <div className="d-empty"><span className="d-empty-ico"><Icon name="groups" size={26} /></span>
            <b>{AR ? 'لا توزيع' : 'Not distributed'}</b>
            <span>{AR ? 'لم تُوزَّع كمية هذه الفقرة على جهات مستفيدة بعد.' : 'This item’s quantity has not been allocated to beneficiaries yet.'}</span></div>}
        </DFGroup>
        <DFGroup flush title={AR ? 'استلامات الفقرة' : 'Receipts for this item'}
          sub={(hit.receipts.warehouse.length + hit.receipts.preliminary.length) + (AR ? ' استلام' : ' receipts')}>
          {(hit.receipts.warehouse.length + hit.receipts.preliminary.length) ? (
            <table className="d-line-table"><thead><tr>
              <th style={{ width: 132 }}>{AR ? 'الرقم' : 'No.'}</th>
              <th style={{ width: 110 }}>{AR ? 'التاريخ' : 'Date'}</th>
              <th style={{ width: 120 }}>{AR ? 'النوع' : 'Type'}</th>
              <th className="r" style={{ width: 90 }}>{AR ? 'الكمية' : 'Qty'}</th>
              <th>{AR ? 'الجهة / المخزن' : 'Entity / store'}</th></tr></thead>
              <tbody>{[].concat(
                hit.receipts.warehouse.map(r => ({ ...r, kind: AR ? 'مخزني' : 'Warehouse', where: r.store })),
                hit.receipts.preliminary.map(r => ({ ...r, kind: AR ? 'أولي' : 'Preliminary', where: r.entity }))
              ).sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((r, i) => (
                <tr key={i}><td className="code">{r.no}</td><td className="num">{r.date}</td>
                  <td className="d-cell-sub">{r.kind}</td><td className="r num">{fmt(r.qty)}</td>
                  <td className="d-cell-sub wrap">{r.where}</td></tr>))}</tbody>
            </table>
          ) : <div className="d-empty"><span className="d-empty-ico"><Icon name="inventory" size={26} /></span>
            <b>{AR ? 'لا استلامات' : 'No receipts'}</b>
            <span>{AR ? 'لم يُسجَّل أي استلام على هذه الفقرة بعد.' : 'No receipt has been registered against this item yet.'}</span></div>}
        </DFGroup>
      </React.Fragment>}
    </DModuleFrame>
  );
}

// ---------- Supply change orders (redistribution) §9 ----------
function DModSupplyOrders({ t, lang, p, showToast }) {
  const AR = lang === 'ar';
  const seed = React.useMemo(() => window.EPM.buildSupplyData(p, lang), [p && p.id, lang]);
  const [items] = window.usePersistedState('supply.items.' + (window.__epmPid || 'na'), function () { return seed.items; });
  const defaultOrders = React.useMemo(() => {
    const it = items[0];
    if (!it || it.beneficiaries.length < 2) return [];
    return [{ no: 'SVO-01', item: it.code, device: it.device, benFrom: it.beneficiaries[0].name, benTo: it.beneficiaries[1].name,
      qtyBefore: it.beneficiaries[0].qty, qtyAfter: Math.max(0, it.beneficiaries[0].qty - Math.round(it.beneficiaries[0].qty * 0.3)),
      reason: AR ? 'إعادة توزيع الكميات وفق الحاجة الفعلية للجهات المستفيدة' : 'Redistribute quantities per beneficiaries’ actual need',
      date: '2026-06-12', status: 'approved' }];
  }, [items]);
  const [orders, setOrders] = window.usePersistedState('supply.orders.' + (window.__epmPid || 'na'), function () { return defaultOrders; });
  const [form, setForm] = React.useState(null);

  const raise = () => {
    const it = items[0] || {};
    setForm({ item: it.code || '', benFrom: (it.beneficiaries && it.beneficiaries[0] && it.beneficiaries[0].name) || '', benTo: (it.beneficiaries && it.beneficiaries[1] && it.beneficiaries[1].name) || '', qty: 5, reason: '' });
  };
  const submit = () => {
    if (!form.item || !form.benFrom || !form.benTo || !(form.qty > 0)) { showToast(AR ? 'أكمل حقول أمر الغيار' : 'Complete the change-order fields'); return; }
    const it = items.find(x => x.code === form.item) || {};
    const bf = (it.beneficiaries || []).find(b => b.name === form.benFrom);
    const no = 'SVO-' + String(orders.length + 1).padStart(2, '0');
    setOrders(os => [{ no, item: form.item, device: it.device || '', benFrom: form.benFrom, benTo: form.benTo,
      qtyBefore: bf ? bf.qty : 0, qtyAfter: bf ? Math.max(0, bf.qty - Number(form.qty)) : 0,
      reason: form.reason || (AR ? 'إعادة توزيع الكميات' : 'Quantity redistribution'), date: window.EPM.DATA_DATE, status: 'pending' }, ...os]);
    setForm(null); showToast(AR ? 'رُفع أمر غيار توزيع — ' + no : 'Redistribution order raised — ' + no);
    window.EPM.pushEvent && window.EPM.pushEvent({ icon: 'sync_alt', tone: 'azure', txtAr: 'رفعتَ أمر غيار توزيع ' + no + ' على', txtEn: 'you raised redistribution order ' + no + ' on', tgt: (window.__epmPid || '') });
  };
  const setStatus = (no, status) => { setOrders(os => os.map(o => o.no === no ? { ...o, status } : o)); showToast(status === 'approved' ? (AR ? 'اعتُمد الأمر' : 'Order approved') : (AR ? 'أُعيد الأمر' : 'Order returned')); };
  const kv = (k, v, mono) => <div className="d-form-i"><span className="k">{k}</span><span className={'v' + (mono ? ' mono' : '')}>{v}</span></div>;
  const fmt = window.fmtNum;
  const uniOpts = Array.from(new Set(items.flatMap(x => x.beneficiaries.map(b => b.name))));

  return (
    <React.Fragment>
      <div className="d-model-topbar"><div className="d-section-title" style={{ margin: 0 }}>{AR ? 'أوامر غيار التوزيع (تجهيز)' : 'Supply change orders (redistribution)'}</div><div style={{ flex: 1 }}></div>
        <button className="d-btn sm primary" onClick={raise}><Icon name="add" size={15} />{AR ? 'أمر غيار جديد' : 'New order'}</button></div>
      <div className="d-callout" style={{ marginBottom: 14 }}><span className="d-callout-ico"><Icon name="info" size={18} /></span>
        <div className="d-callout-tx"><b style={{ fontSize: 13 }}>{AR ? 'أوامر غيار مشاريع التجهيز تُعيد توزيع الكميات بين الجهات المستفيدة دون المساس ببقية الفقرات (لا تعدّل الكلفة أو المدة).' : 'Supply change orders redistribute quantities between beneficiaries without touching other items (no cost/time change).'}</b></div></div>

      {form && (
        <DDrawer onClose={() => setForm(null)} title={AR ? 'أمر غيار توزيع جديد' : 'New redistribution order'}
          footer={<button className="d-btn primary" onClick={submit}><Icon name="arrow_forward" size={15} />{AR ? 'رفع للاعتماد' : 'Submit'}</button>}>
          <DDrawerGrp label={AR ? 'تفاصيل إعادة التوزيع' : 'Redistribution details'}>
            <div className="d-form-grid">
              <div className="d-form-i"><span className="k">{AR ? 'الفقرة' : 'Item'}</span>
                <select className="d-form-input" value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))}>{items.map(x => <option key={x.code} value={x.code}>{x.code} — {x.device}</option>)}</select></div>
              <div className="d-form-i"><span className="k">{AR ? 'من جهة' : 'From beneficiary'}</span>
                <select className="d-form-input" value={form.benFrom} onChange={e => setForm(f => ({ ...f, benFrom: e.target.value }))}>{uniOpts.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              <div className="d-form-i"><span className="k">{AR ? 'إلى جهة' : 'To beneficiary'}</span>
                <select className="d-form-input" value={form.benTo} onChange={e => setForm(f => ({ ...f, benTo: e.target.value }))}>{uniOpts.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              <div className="d-form-i"><span className="k">{AR ? 'الكمية المنقولة' : 'Quantity moved'}</span>
                <input className="d-form-input mono" type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} /></div>
            </div>
            <div style={{ marginTop: 10 }}><span className="k" style={{ display: 'block', marginBottom: 4 }}>{AR ? 'سبب الغيار' : 'Reason'}</span>
              <input className="d-form-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={AR ? 'سبب إعادة التوزيع' : 'Reason for redistribution'} /></div>
          </DDrawerGrp>
        </DDrawer>
      )}

      <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
        <th style={{ width: 80 }}>{AR ? 'الرقم' : 'No.'}</th><th>{AR ? 'الفقرة' : 'Item'}</th>
        <th>{AR ? 'من جهة' : 'From'}</th><th>{AR ? 'إلى جهة' : 'To'}</th>
        <th style={{ width: 80 }}>{AR ? 'قبل' : 'Before'}</th><th style={{ width: 80 }}>{AR ? 'بعد' : 'After'}</th>
        <th style={{ width: 96 }}>{AR ? 'التاريخ' : 'Date'}</th><th style={{ width: 160 }}>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
        <tbody>{orders.map(o => (
          <tr key={o.no}><td className="mono">{o.no}</td><td className="mono">{o.item}<div className="d-cell-sub">{o.device}</div></td>
            <td>{o.benFrom}</td><td className="chg">{o.benTo}</td><td className="mono">{fmt(o.qtyBefore)}</td><td className="mono chg">{fmt(o.qtyAfter)}</td><td className="mono">{o.date}</td>
            <td><span className={'d-pill ' + (o.status === 'approved' ? 'completed' : o.status === 'rejected' ? 'stalled' : 'suspended')}>{o.status === 'approved' ? (AR ? 'معتمد' : 'Approved') : o.status === 'rejected' ? (AR ? 'مرفوض' : 'Rejected') : (AR ? 'قيد الاعتماد' : 'Pending')}</span>
              {o.status === 'pending' && <span style={{ marginInlineStart: 8, display: 'inline-flex', gap: 4 }}>
                <button className="d-btn sm primary" onClick={() => setStatus(o.no, 'approved')}><Icon name="done" size={13} /></button>
                <button className="d-btn sm ghost" onClick={() => setStatus(o.no, 'rejected')}><Icon name="close" size={13} /></button></span>}</td></tr>))}
          {orders.length === 0 && <tr><td colSpan={8} className="d-cell-sub" style={{ textAlign: 'center', padding: 18 }}>{AR ? 'لا أوامر غيار توزيع بعد' : 'No redistribution orders yet'}</td></tr>}
        </tbody></table></div>
    </React.Fragment>
  );
}

// ---------- Supply progress (dates + receipt-based completion) ----------
// Supply projects have no construction schedule; progress = devices received ÷
// contracted, and dates are a supply timeline (award → LC → delivery → receipts
// → distribution), derived from the contract dates and the recorded receipts.
/* The supply project's الإنجاز is the same L04 dashboard as construction's —
   it only measures a different thing. A supply project earns value by
   RECEIVING devices, not by completing activities, so the headline is
   received ÷ contracted and the breakdown is per line item rather than per
   WBS level. Everything else — the tile contract, the tabs, the comparison
   period, the Z8 definitions, Z10 — is the archetype, unchanged. */
function DModSupplyProgress({ t, lang, p, d, asOf, frameTitle, frameActions, goTab }) {
  const AR = lang === 'ar';
  const seed = React.useMemo(() => window.EPM.buildSupplyData(p, lang), [p && p.id, lang]);
  const [items] = window.usePersistedState('supply.items.' + (window.__epmPid || 'na'), function () { return seed.items; });
  const sd = React.useMemo(() => window.EPM.buildScheduleData(p, lang), [p && p.id, lang]);
  const e = d.evm || {};
  const raw = (d.financial && d.financial.raw) || {};

  const totC = items.reduce((a2, x) => a2 + x.contracted, 0);
  const totS = items.reduce((a2, x) => a2 + x.supplied, 0);
  const totR = items.reduce((a2, x) => a2 + x.received, 0);
  const pct = totC ? Math.round(totR / totC * 100) : 0;
  const supPct = totC ? Math.round(totS / totC * 100) : 0;
  const finPct = raw.revisedCost ? Math.round((raw.disbursed || 0) / raw.revisedCost * 100) : 0;
  const plannedProg = React.useMemo(() => {
    const v = (d.evm && d.evm.plannedPct != null) ? d.evm.plannedPct
      : (window.EPM.derivePlannedPct ? window.EPM.derivePlannedPct(p, lang) : null);
    return v == null ? Math.min(100, pct + 8) : v;
  }, [d.evm, p && p.id, lang, pct]);

  const approvedVO = (d.variationOrders || []).filter(v => v.status === 'approved').reduce((a2, v) => a2 + v.value, 0);
  const pendingVO = (d.variationOrders || []).filter(v => v.status === 'pending').reduce((a2, v) => a2 + v.value, 0);
  const done = items.filter(x => x.received >= x.contracted).length;
  /* the gap between what the supplier has DELIVERED and what the ministry has
     RECEIVED is the supply project's own exception — goods sitting undelivered
     to a beneficiary, or a receipt committee that has not met */
  const inTransit = Math.max(0, totS - totR);
  const laggards = items.filter(x => x.contracted && (x.received / x.contracted) < 0.5)
    .sort((x, y) => (x.received / x.contracted) - (y.received / y.contracted));

  const HIST = (d.progress && d.progress.history) || [];
  const PERIODS = [
    { id: 'm1', ar: 'القراءة السابقة', en: 'the previous reading', back: 1 },
    { id: 'q1', ar: 'الربع الماضي', en: 'last quarter', back: 3 },
    { id: 'all', ar: 'بداية المشروع', en: 'project start', back: HIST.length + 99 },
  ];
  const [per, setPer] = React.useState('m1');
  const P = PERIODS.find(x => x.id === per) || PERIODS[0];
  const prior = P.id === 'all' ? { physical: 0, financial: 0 }
    : (HIST[Math.max(0, HIST.length - 1 - P.back)] || HIST[0] || { physical: pct, financial: finPct });
  const last = HIST[HIST.length - 1] || prior;
  const dPhys = pct - (prior.physical || 0);
  const dFin = P.id === 'all' ? finPct
    : (last.financial && prior.financial != null
      ? Math.round(finPct * ((last.financial - prior.financial) / (last.financial || 1))) : 0);
  const perLabel = AR ? P.ar : P.en;
  const dirOf = v => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';

  const [tab, setTab] = React.useState('summary');
  const TABS = [
    { id: 'summary', label: AR ? 'الملخص' : 'Summary' },
    { id: 'items', label: AR ? 'حسب الفقرة' : 'By line item', n: items.length },
    { id: 'cost', label: AR ? 'الأثر والكلفة' : 'Impact & cost' },
    { id: 'risk', label: AR ? 'مخاطر التوريد' : 'Delivery risk', n: laggards.length || undefined },
  ];
  const jump = k => () => (goTab ? goTab(k) : null);
  const [defs, setDefs] = React.useState(false);
  const DEF = (k, v) => <div className="d-form-i"><span className="k">{k}</span><span className="v">{v}</span></div>;
  const DEFS = (
    <React.Fragment>
      <DMsgBar tone="info" icon="functions" title={AR ? 'الإنجاز هنا يُقاس بالكمية' : 'Completion here is measured by quantity'}>
        {AR ? 'مشروع التجهيز يكتسب قيمته بالاستلام لا بإنجاز نشاط — لذلك المؤشر الأساسي هو الأجهزة المستلمة ÷ المتعاقد عليها. التواريخ ومسار التوريد يُتابَعان في الجدول الزمني.'
            : 'A supply project earns value on receipt, not on activity completion — so the headline is devices received ÷ contracted. Dates and the delivery path are tracked in the schedule.'}
      </DMsgBar>
      <DRecordGrp label={AR ? 'الكمية' : 'Quantity'}>
        <div className="d-form-grid">
          {DEF(AR ? 'نسبة الاستلام' : 'Received %', AR ? 'مجموع الأجهزة المستلمة مخزنياً ÷ مجموع المتعاقد عليه.' : 'Devices received into store ÷ total contracted.')}
          {DEF(AR ? 'نسبة التجهيز' : 'Supplied %', AR ? 'ما جهّزه المجهّز فعلياً — قد يسبق الاستلام إذا لم تجتمع لجنة الاستلام.' : 'What the supplier has actually delivered — it can lead receipt when the committee has not yet met.')}
          {DEF(AR ? 'قيد الاستلام' : 'Awaiting receipt', AR ? 'الفرق بين المجهَّز والمستلَم: بضاعة وصلت ولم تُستلم رسمياً بعد.' : 'The gap between supplied and received: goods that arrived but are not yet formally受.')}
        </div>
      </DRecordGrp>
      <DRecordGrp label={AR ? 'الأداء' : 'Performance'}>
        <div className="d-form-grid">
          {DEF('SPI', AR ? 'القيمة المكتسبة ÷ القيمة المخططة. أقل من واحد يعني تأخراً عن الجدول.' : 'Earned ÷ planned value. Below one means behind schedule.')}
          {DEF('CPI', AR ? 'القيمة المكتسبة ÷ الكلفة الفعلية. أقل من واحد يعني تجاوزاً في الكلفة.' : 'Earned ÷ actual cost. Below one means over cost.')}
          {DEF('EAC', AR ? 'الكلفة المتوقعة عند الإنجاز = الموازنة ÷ CPI.' : 'Estimate at completion = budget ÷ CPI.')}
          {DEF('VAC', AR ? 'الموازنة ناقص EAC. القيمة الموجبة تعني البقاء ضمن الموازنة.' : 'Budget minus EAC. A positive value means within budget.')}
        </div>
      </DRecordGrp>
    </React.Fragment>
  );

  return (
    <DModuleFrame
      title={frameTitle || t('mod_progress')}
      sub={AR ? `الاستلام ${pct}% · التجهيز ${supPct}% · المالي ${finPct}%`
              : `Received ${pct}% · supplied ${supPct}% · financial ${finPct}%`}
      tabs={TABS} tab={tab} onTab={setTab}
      toolbar={<React.Fragment>
        <label className="d-ctxsel"><span>{AR ? 'المقارنة مع' : 'Compare with'}</span>
          <select value={per} onChange={ev => setPer(ev.target.value)}>
            {PERIODS.map(x => <option key={x.id} value={x.id}>{AR ? x.ar : x.en}</option>)}
          </select></label>
        <button className={'d-fchip' + (defs ? ' on' : '')} aria-pressed={defs} onClick={() => setDefs(v => !v)}>
          <Icon name="functions" size={13} />{AR ? 'كيف تُحتسب' : 'How it is derived'}</button>
      </React.Fragment>}
      actions={frameActions}
      aside={defs ? (
        <DRecordPane lang={lang} title={AR ? 'تعريف المؤشرات' : 'Metric definitions'}
          onClose={() => setDefs(false)}>{DEFS}</DRecordPane>
      ) : null}
      status={<DZ10 lang={lang} asOf={asOf || sd.dataDate} stats={[
        { k: AR ? 'الاستلام' : 'Received', v: pct + '%' },
        { k: AR ? 'التجهيز' : 'Supplied', v: supPct + '%' },
        { k: AR ? 'المالي' : 'Financial', v: finPct + '%' },
        { k: 'SPI / CPI', v: (e.spi != null ? e.spi : '—') + ' / ' + (e.cpi != null ? e.cpi : '—') },
      ]} />}>

      {tab === 'summary' && <DTileGrid>
        {defs && <div className="d-l04-z8fall">
          <DFGroup title={AR ? 'تعريف المؤشرات' : 'Metric definitions'}>{DEFS}</DFGroup>
        </div>}

        <DTile lang={lang} span={3} label={AR ? 'نسبة الاستلام (الإنجاز المادي)' : 'Received % (physical)'}
          value={pct} unit="%" state={pct < plannedProg - 5 ? 'bad' : pct < plannedProg ? 'warn' : 'ok'}
          delta={{ v: (dPhys > 0 ? '+' : '') + dPhys + (AR ? ' نقطة' : ' pts'), dir: dirOf(dPhys) }}
          cmp={{ label: AR ? 'مخطط' : 'planned', value: plannedProg + '%' }}
          note={(AR ? 'مقارنة مع ' : 'vs ') + perLabel}
          to={{ label: AR ? 'الفقرات التجهيزية' : 'supply items', fn: jump('boq') }} />

        <DTile lang={lang} span={3} label={AR ? 'نسبة التجهيز' : 'Supplied %'}
          value={supPct} unit="%" state={supPct - pct > 20 ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'المستلَم' : 'received', value: pct + '%' }}
          note={inTransit > 0
            ? (AR ? window.fmtNum(inTransit) + ' جهاز وصل ولم يُستلم رسمياً بعد'
                  : window.fmtNum(inTransit) + ' devices delivered but not yet formally received')
            : (AR ? 'كل ما جُهِّز استُلم' : 'everything supplied has been received')}
          to={{ label: AR ? 'الاستلامات' : 'receipts', fn: jump('boq') }} />

        <DTile lang={lang} span={3} label={AR ? 'الإنجاز المالي' : 'Financial completion'}
          value={finPct} unit="%"
          state={finPct - pct > 20 ? 'bad' : Math.abs(finPct - pct) > 10 ? 'warn' : 'ok'}
          delta={{ v: (dFin > 0 ? '+' : '') + dFin + (AR ? ' نقطة' : ' pts'), dir: dirOf(dFin) }}
          cmp={{ label: AR ? 'الاستلام' : 'received', value: pct + '%' }}
          note={finPct - pct > 20
            ? (AR ? 'الصرف يسبق الاستلام بـ ' + (finPct - pct) + ' نقطة — يستوجب مراجعة'
                  : 'Disbursement leads receipt by ' + (finPct - pct) + ' points — needs review')
            : <React.Fragment>{AR ? 'مصروف ' : 'spent '}<DMoney v={Math.round(raw.disbursed || 0)} lang={lang} size="sm" /></React.Fragment>}
          to={{ label: AR ? 'الموقف المالي' : 'the financial position', fn: jump('financial') }} />

        <DTile lang={lang} span={3} label={AR ? 'التأخر عن خط الأساس' : 'Delay against baseline'}
          value={(sd.delayDays > 0 ? '+' : '') + sd.delayDays} unit={AR ? 'يوم' : 'd'}
          state={sd.delayDays > 14 ? 'bad' : sd.delayDays > 0 ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'النهاية التعاقدية' : 'contractual finish', value: sd.baselineFinish }}
          note={(AR ? 'النهاية المتوقعة ' : 'forecast ') + sd.forecastFinish}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />

        <DFGroup span={12} flush title={AR ? 'الإنجاز حسب الفقرة التجهيزية' : 'Completion by supply line item'}
          sub={AR ? 'المستلَم ÷ المتعاقد عليه لكل فقرة' : 'received ÷ contracted, per line'}
          foot={<button type="button" className="d-linkbtn" onClick={jump('boq')}>
            {AR ? 'التفصيل في الفقرات التجهيزية' : 'Detail in the supply items'}<Icon name="chevron_right" size={14} /></button>}>
          <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
            <th style={{ width: 96 }}>{AR ? 'الرمز' : 'Code'}</th>
            <th style={{ minWidth: 200 }}>{AR ? 'الجهاز' : 'Device'}</th>
            <th style={{ width: 110 }} className="r">{AR ? 'المتعاقد' : 'Contracted'}</th>
            <th style={{ width: 110 }} className="r">{AR ? 'المجهَّز' : 'Supplied'}</th>
            <th style={{ width: 110 }} className="r">{AR ? 'المستلَم' : 'Received'}</th>
            <th style={{ width: 220 }}>{AR ? 'نسبة الاستلام' : 'Received %'}</th></tr></thead>
            <tbody>{items.map(x => { const ip = x.contracted ? Math.round(x.received / x.contracted * 100) : 0;
              return (
              <tr key={x.seq}>
                <td className="code">{x.code}</td>
                <td className="name wrap">{x.device || x.item}</td>
                <td className="num r">{window.fmtNum(x.contracted)}</td>
                <td className="num r">{window.fmtNum(x.supplied)}</td>
                <td className="num r">{window.fmtNum(x.received)}</td>
                <td><div className="d-progress"><span className="t"><span style={{ width: Math.min(100, ip) + '%',
                  background: ip >= 100 ? 'var(--status-completed)' : ip >= 50 ? 'var(--viz-1)' : 'var(--status-suspended)' }}></span></span>
                  <span className="pc">{ip}%</span></div></td>
              </tr>); })}</tbody>
            <tfoot><tr>
              <td className="code">{AR ? 'الإجمالي' : 'Total'}</td>
              <td className="d-cell-sub">{items.length}{AR ? ' فقرة' : ' items'}</td>
              <td className="num r">{window.fmtNum(totC)}</td>
              <td className="num r">{window.fmtNum(totS)}</td>
              <td className="num r">{window.fmtNum(totR)}</td>
              <td className="num">{pct}%</td>
            </tr></tfoot>
          </table></div>
        </DFGroup>
      </DTileGrid>}

      {tab === 'items' && <DTileGrid>
        <DTile lang={lang} span={3} label={AR ? 'فقرات مستلمة بالكامل' : 'Fully received items'}
          value={done} unit={'/' + items.length} state={done === items.length ? 'ok' : 'none'}
          cmp={{ label: AR ? 'الأدنى' : 'lowest', value: (items.length
            ? Math.min.apply(null, items.map(x => x.contracted ? Math.round(x.received / x.contracted * 100) : 0)) : 0) + '%' }}
          note={AR ? 'الفقرة مكتملة عند استلام كامل الكمية المتعاقدة' : 'an item is complete once the full contracted quantity is received'}
          to={{ label: AR ? 'الفقرات التجهيزية' : 'supply items', fn: jump('boq') }} />
        <DTile lang={lang} span={3} label={AR ? 'قيد الاستلام' : 'Awaiting receipt'}
          value={window.fmtNum(inTransit)} unit={AR ? 'جهاز' : 'devices'}
          state={inTransit > 0 ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'المجهَّز' : 'supplied', value: window.fmtNum(totS) }}
          note={AR ? 'وصل ولم تُنظَّم له شهادة استلام مخزني بعد' : 'delivered with no warehouse receipt certificate raised yet'}
          to={{ label: AR ? 'الاستلامات' : 'receipts', fn: jump('boq') }} />
        <DTile lang={lang} span={3} label={AR ? 'الفجوة عن المخطط' : 'Gap against plan'}
          value={(pct - plannedProg > 0 ? '+' : '') + (pct - plannedProg)} unit={AR ? 'نقطة' : 'pts'}
          state={pct < plannedProg - 5 ? 'bad' : pct < plannedProg ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'مخطط' : 'planned', value: plannedProg + '%' }}
          note={AR ? 'الفجوة موزّعة على الفقرات في الجدول أدناه' : 'the gap is distributed across the items below'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'الجهات المستفيدة' : 'Beneficiaries'}
          value={new Set(items.flatMap(x => (x.beneficiaries || []).map(b => b.name))).size} state="none"
          cmp={{ label: AR ? 'على' : 'across', value: items.length + (AR ? ' فقرة' : ' items') }}
          note={AR ? 'التوزيع يُدار من الفقرات التجهيزية' : 'distribution is managed from the supply items'}
          to={{ label: AR ? 'الفقرات التجهيزية' : 'supply items', fn: jump('boq') }} />

        <DFGroup span={12} flush title={AR ? 'الفقرات مرتّبة بحسب نسبة الاستلام' : 'Line items ordered by received %'}
          sub={AR ? 'الأدنى أولاً — هذه الفقرات تحكم إنجاز المشروع' : 'lowest first — these govern the project’s completion'}
          foot={<button type="button" className="d-linkbtn" onClick={jump('boq')}>
            {AR ? 'التفصيل في الفقرات التجهيزية' : 'Detail in the supply items'}<Icon name="chevron_right" size={14} /></button>}>
          <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
            <th style={{ width: 96 }}>{AR ? 'الرمز' : 'Code'}</th>
            <th style={{ minWidth: 200 }}>{AR ? 'الجهاز' : 'Device'}</th>
            <th style={{ width: 110 }} className="r">{AR ? 'المتبقّي' : 'Remaining'}</th>
            <th style={{ width: 150 }} className="r">{AR ? 'قيمة المتبقّي' : 'Value remaining'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
            <th style={{ width: 220 }}>{AR ? 'نسبة الاستلام' : 'Received %'}</th>
            <th style={{ width: 130 }}>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
            <tbody>{items.slice().sort((x, y) => (x.contracted ? x.received / x.contracted : 0) - (y.contracted ? y.received / y.contracted : 0))
              .map(x => { const ip = x.contracted ? Math.round(x.received / x.contracted * 100) : 0;
                const rem = Math.max(0, x.contracted - x.received);
                return (
                <tr key={x.seq}>
                  <td className="code">{x.code}</td>
                  <td className="name wrap">{x.device || x.item}</td>
                  <td className="num r">{window.fmtNum(rem)}</td>
                  <td className="r"><DMoney v={Math.round(rem * (x.price || 0))} lang={lang} size="sm" bare /></td>
                  <td><div className="d-progress"><span className="t"><span style={{ width: Math.min(100, ip) + '%',
                    background: ip >= 100 ? 'var(--status-completed)' : ip >= 50 ? 'var(--viz-1)' : 'var(--status-suspended)' }}></span></span>
                    <span className="pc">{ip}%</span></div></td>
                  <td>{ip >= 100 ? <span className="d-pill completed">{AR ? 'مكتملة' : 'Complete'}</span>
                    : ip >= 50 ? <span className="d-pill ongoing">{AR ? 'جارية' : 'In progress'}</span>
                    : <span className="d-pill suspended">{AR ? 'متأخرة' : 'Lagging'}</span>}</td>
                </tr>); })}</tbody>
          </table></div>
        </DFGroup>
      </DTileGrid>}

      {tab === 'cost' && <DTileGrid>
        <DTile lang={lang} span={3} label="EAC" state={e.eac > (raw.revisedCost || 0) ? 'bad' : 'ok'}
          value={<DMoney v={Math.round(e.eac || 0)} lang={lang} size="md" />}
          cmp={{ label: AR ? 'الكلفة المعدلة' : 'revised cost', value: <DMoney v={Math.round(raw.revisedCost || 0)} lang={lang} size="sm" bare /> }}
          note={AR ? 'الكلفة المتوقعة عند الإنجاز = الموازنة ÷ CPI' : 'estimate at completion = budget ÷ CPI'}
          to={{ label: AR ? 'الموقف المالي' : 'the financial position', fn: jump('financial') }} />
        <DTile lang={lang} span={3} label="VAC" state={(e.vac || 0) < 0 ? 'bad' : 'ok'}
          value={<DMoney v={Math.round(e.vac || 0)} lang={lang} size="md" signed />}
          cmp={{ label: AR ? 'الهدف' : 'target', value: AR ? 'لا يقل عن صفر' : 'not below zero' }}
          note={(e.vac || 0) < 0 ? (AR ? 'تجاوز متوقع للموازنة' : 'forecast overrun') : (AR ? 'ضمن الموازنة' : 'within budget')}
          to={{ label: AR ? 'الموقف المالي' : 'the financial position', fn: jump('financial') }} />
        <DTile lang={lang} span={3} label={AR ? 'الكلفة المعدلة' : 'Revised cost'}
          value={<DMoney v={Math.round(raw.revisedCost || 0)} lang={lang} size="md" />}
          cmp={{ label: AR ? 'الكلفة المقررة' : 'original cost', value: <DMoney v={Math.round(raw.cost || 0)} lang={lang} size="sm" bare /> }}
          note={AR ? 'الكلفة النافذة بعد الملاحق' : 'the effective cost after addenda'}
          to={{ label: AR ? 'العقود' : 'contracts', fn: jump('contract') }} />
        <DTile lang={lang} span={3} label={AR ? 'المصروف التراكمي' : 'Cumulative spend'}
          value={<DMoney v={Math.round(raw.disbursed || 0)} lang={lang} size="md" />}
          cmp={{ label: AR ? 'من المعدلة' : 'of revised', value: finPct + '%' }}
          note={AR ? 'كما في تاريخ البيانات' : 'as at the data date'}
          to={{ label: AR ? 'الموقف المالي' : 'the financial position', fn: jump('financial') }} />

        <DTile lang={lang} span={3} label={AR ? 'أوامر تغييرية معتمدة' : 'Approved change orders'}
          value={<DMoney v={Math.round(approvedVO)} lang={lang} size="md" signed />}
          state={pendingVO ? 'warn' : 'none'}
          cmp={pendingVO ? { label: AR ? 'قيد الاعتماد' : 'pending', value: <DMoney v={Math.round(pendingVO)} lang={lang} size="sm" bare /> } : null}
          note={AR ? 'المعتمد وحده يدخل الكلفة المعدلة؛ ما هو قيد الاعتماد لا يُرحَّل.' : 'only approved orders enter the revised cost; pending ones do not post.'}
          to={{ label: AR ? 'الأوامر التغييرية' : 'change orders', fn: jump('changeorders') }} />
        <DTile lang={lang} span={3} label={AR ? 'قيمة الكميات غير المستلمة' : 'Value not yet received'}
          value={<DMoney v={Math.round(items.reduce((a2, x) => a2 + Math.max(0, x.contracted - x.received) * (x.price || 0), 0))} lang={lang} size="md" />}
          state="none"
          cmp={{ label: AR ? 'من المتعاقد' : 'of contracted', value: (100 - pct) + '%' }}
          note={AR ? 'ما تبقّى من التزام تعاقدي على المجهّز' : 'the supplier’s remaining contractual obligation'}
          to={{ label: AR ? 'الفقرات التجهيزية' : 'supply items', fn: jump('boq') }} />
      </DTileGrid>}

      {tab === 'risk' && <DTileGrid>
        <DTile lang={lang} span={3} label={AR ? 'التأخر' : 'Delay'}
          value={(sd.delayDays > 0 ? '+' : '') + sd.delayDays} unit={AR ? 'يوم' : 'd'}
          state={sd.delayDays > 14 ? 'bad' : sd.delayDays > 0 ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'الهدف' : 'target', value: '0' }}
          note={AR ? 'مقابل خط الأساس المعتمد' : 'against the approved baseline'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'أنشطة توريد حرجة' : 'Critical delivery activities'}
          value={sd.criticalCount} state="none"
          cmp={{ label: AR ? 'من الأنشطة' : 'of activities', value: sd.activities.filter(a2 => a2.type === 'act').length }}
          note={AR ? 'عوم كلي صفر — أي تأخير يمس تاريخ الإنجاز' : 'zero total float — any delay moves the finish'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'عوم سالب' : 'Negative float'}
          value={sd.negFloatCount} state={sd.negFloatCount ? 'bad' : 'ok'}
          cmp={{ label: AR ? 'الهدف' : 'target', value: '0' }}
          note={AR ? 'لا يمكن إنجازها في موعدها دون تسريع' : 'cannot meet their dates without acceleration'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'فقرات متأخرة' : 'Lagging items'}
          value={laggards.length} state={laggards.length ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'الحد' : 'threshold', value: AR ? 'أقل من نصف الكمية' : 'under half received' }}
          note={AR ? 'لم يُستلَم منها نصف الكمية المتعاقدة بعد' : 'less than half of the contracted quantity received'}
          to={{ label: AR ? 'إدارة المخاطر' : 'the risk register', fn: jump('risk') }} />

        <DFGroup span={12} flush title={AR ? 'الفقرات المتأخرة عن الاستلام' : 'Items lagging on receipt'}
          sub={AR ? 'مرتّبة بحسب نسبة الاستلام' : 'ordered by received %'}
          foot={<button type="button" className="d-linkbtn" onClick={jump('boq')}>
            {AR ? 'التفصيل في الفقرات التجهيزية' : 'Detail in the supply items'}<Icon name="chevron_right" size={14} /></button>}>
          {laggards.length ? (
            <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
              <th style={{ width: 96 }}>{AR ? 'الرمز' : 'Code'}</th>
              <th style={{ minWidth: 200 }}>{AR ? 'الجهاز' : 'Device'}</th>
              <th style={{ width: 110 }} className="r">{AR ? 'المتعاقد' : 'Contracted'}</th>
              <th style={{ width: 110 }} className="r">{AR ? 'المستلَم' : 'Received'}</th>
              <th style={{ width: 110 }} className="r">{AR ? 'المتبقّي' : 'Remaining'}</th>
              <th style={{ width: 130 }}>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
              <tbody>{laggards.map(x => (
                <tr key={x.seq}>
                  <td className="code">{x.code}</td>
                  <td className="name wrap">{x.device || x.item}</td>
                  <td className="num r">{window.fmtNum(x.contracted)}</td>
                  <td className="num r">{window.fmtNum(x.received)}</td>
                  <td className="num r">{window.fmtNum(Math.max(0, x.contracted - x.received))}</td>
                  <td><span className="d-pill suspended">{AR ? 'متأخرة' : 'Lagging'}</span></td>
                </tr>))}</tbody>
            </table></div>
          ) : (
            <div className="d-empty">
              <span className="d-empty-ico"><Icon name="check_circle" size={26} /></span>
              <b>{AR ? 'لا فقرات متأخرة' : 'No lagging items'}</b>
              <span>{AR ? 'كل فقرة استُلم منها أكثر من نصف الكمية المتعاقدة عند تاريخ البيانات.' : 'Every line item has more than half its contracted quantity received, as at the data date.'}</span>
            </div>
          )}
        </DFGroup>
      </DTileGrid>}
    </DModuleFrame>
  );
}

// ---------- Unified supply BOQ module ----------
// A supply project's BOQ IS the same module as construction — only its facets
// differ. Line items, receipts and item inquiry are sub-views inside the one
// `boq` module, not separate top-level modules.
function DModSupplyBOQ({ t, lang, p, d, showToast, initialSub, frameTitle, frameActions }) {
  const AR = lang === 'ar';
  const [sub, setSub] = React.useState(initialSub || 'items');
  const seed = React.useMemo(() => window.EPM.buildSupplyData(p, lang), [p && p.id, lang]);
  const [items] = window.usePersistedState('supply.items.' + (window.__epmPid || 'na'), function () { return seed.items; });
  const recN = items.reduce((a, x) => a + x.receipts.warehouse.length + x.receipts.preliminary.length, 0);
  const TABS = [
    { id: 'items', label: AR ? 'الفقرات التجهيزية' : 'Supply items', n: items.length },
    { id: 'receipts', label: AR ? 'الاستلامات' : 'Receipts', n: recN },
    { id: 'inquiry', label: AR ? 'استعلام الفقرات' : 'Item inquiry' },
  ];
  /* the same `shell` contract the construction BOQ hands its two screens:
     identity and Z5 live here, each screen fills Z6 actions, Z7, Z8 and Z10 */
  const shell = { tabs: TABS, tab: sub, onTab: setSub,
    title: frameTitle || t('mod_boq'),
    sub: (d && d.contract && d.contract.raw && d.contract.code) || (d && d.contract && d.contract.code) || undefined };
  if (sub === 'receipts') return <DModReceipts t={t} lang={lang} p={p} d={d} shell={shell} showToast={showToast} />;
  if (sub === 'inquiry') return <DModItemInquiry t={t} lang={lang} p={p} d={d} shell={shell} />;
  return <DModSupplyItems t={t} lang={lang} p={p} d={d} showToast={showToast} shell={shell} />;
}

Object.assign(window, { DModSupplyItems, DModReceipts, DModItemInquiry, DModSupplyOrders, DModSupplyProgress, DModSupplyBOQ, DSupplyPill });
