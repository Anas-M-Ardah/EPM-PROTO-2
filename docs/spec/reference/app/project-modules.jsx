const TXC = c => c === 'var(--warning)' ? 'var(--status-suspended-tx)'
  : c === 'var(--success)' ? 'var(--status-completed-tx)'
  : c === 'var(--status-ongoing)' ? 'var(--status-ongoing-tx)' : c;
/* ============================================================
   EPM — project detail modules (Business Vision Phase 1 sections 6/8).
   Generic field-grid renderer + the 12 module screens, each
   showing its dictionary fields (required / proposed badges) in
   a realistic, polished layout — for client field confirmation.
   ============================================================ */

function DField({ f, lang, editMode }) {
  const AR = lang === 'ar';
  let opts = f.options;
  if (editMode && opts && f.value != null && !opts.includes(f.value)) opts = [f.value, ...opts];
  const showEdit = editMode && !f.auto;
  return (
    <div className={`d-form-i ${showEdit ? 'editing' : ''}`}>
      <label className="k">{f.label[lang]}{f.required && <span className="req">*</span>}{f.proposed && <span className="d-proposed">{AR ? 'مقترح' : 'Proposed'}</span>}{editMode && f.auto && <span className="d-proposed" style={{ background: 'color-mix(in srgb,var(--on-surface-variant) 14%,transparent)', color: 'var(--on-surface-variant)' }} title={AR ? 'يُحسب تلقائياً ولا يقبل التعديل' : 'System-generated — not editable'}><Icon name="lock" size={10} style={{ verticalAlign: -1, marginInlineEnd: 2 }} />{AR ? 'آلي' : 'Auto'}</span>}</label>
      {showEdit
        ? (opts
            ? <select className="d-form-input" defaultValue={f.value}>{opts.map((o, i) => <option key={i} value={o}>{o}</option>)}</select>
            : <input className={`d-form-input ${f.mono ? 'mono' : ''}`} defaultValue={f.value} />)
        : <span className={`v ${f.mono ? 'mono' : ''}`}>{f.value}{f.unit ? ' ' + f.unit : ''}</span>}
    </div>
  );
}
function DFieldGrid({ fields, lang, editMode }) {
  return <div className="d-form-grid">{fields.map((f, i) => <DField key={i} f={f} lang={lang} editMode={editMode} />)}</div>;
}

function DEditTimeline({ events, lang }) {
  return (
    <div className="d-edit-timeline">
      {events.map((ev, i) => (
        <div className="d-edit-item" key={i}>
          <span className="d-edit-dot"></span>
          <div className="d-edit-body">
            <div className="d-edit-meta"><b>{ev.by}</b><span className="mono">{ev.date}</span></div>
            <div className="d-edit-chips">
              {ev.changes.map((c, j) => (
                <span className="d-edit-chip" key={j}>
                  <span className="f">{c.field}</span>
                  {c.from ? (<React.Fragment>
                    <span className="fr">{c.from}</span>
                    <Icon name="arrow_back" size={11} style={{ transform: lang === 'ar' ? 'none' : 'scaleX(-1)' }} />
                  </React.Fragment>) : null}
                  <span className="to">{c.to}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DReadiness({ state, lang, sm }) {
  const R = window.EPM.READINESS[state] || window.EPM.READINESS.notstarted;
  return <span className={`d-ready ${R.cls} ${sm ? 'sm' : ''}`}><Icon name={R.icon} size={sm ? 12 : 13} />{R[lang]}</span>;
}

function DReviewFlow({ lang, current }) {
  const AR = lang === 'ar';
  const steps = AR ? ['مسودة', 'مُقدَّم', 'قيد المراجعة', 'معتمد'] : ['Draft', 'Submitted', 'Under Review', 'Approved'];
  const returned = AR ? 'مُعاد بملاحظات' : 'Returned';
  const cur = current == null ? 3 : current;
  return (
    <div className="d-review-flow">
      {steps.map((s, i) => (
        <div key={i} className={`d-rf-step ${i <= cur ? 'done' : ''} ${i === cur ? 'on' : ''}`}>
          <span className="d-rf-dot">{i < cur ? <Icon name="check" size={11} /> : i + 1}</span>
          <span className="d-rf-l">{s}</span>
        </div>
      ))}
      <span className="d-rf-ret" title={returned}><Icon name="undo" size={12} />{returned}</span>
    </div>
  );
}

function DModProfile({ t, lang, d, editMode }) {
  return (
    <React.Fragment>
      <div className="d-section-title">{t('mod_profile')}</div>
      <DFieldGrid fields={d.profile.fields} lang={lang} editMode={editMode} />
      <div className="d-section-title">{lang === 'ar' ? 'الوصف' : 'Description'}</div>
      {editMode
        ? <textarea className="d-form-input" style={{ width: '100%', minHeight: 84, resize: 'vertical', fontFamily: 'inherit' }} defaultValue={d.profile.description}></textarea>
        : <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--on-surface-variant)', margin: 0 }}>{d.profile.description}</p>}
    </React.Fragment>
  );
}

/* ---------- unified section primitives (shared by every project tab) ---------- */
function DSec({ icon, title, sub, n, actions, children, flush, id, collapsible, defaultOpen }) {
  const [open, setOpen] = React.useState(defaultOpen !== false);
  return (
    <div className={`d-sec${collapsible ? ' collapsible' : ''}`} id={id}>
      <div className="d-sec-h" onClick={collapsible ? () => setOpen(o => !o) : undefined}>
        {icon && <span className="ico"><Icon name={icon} size={15} /></span>}
        <span className="ttl">{title}</span>
        {sub && <span className="sub">{sub}</span>}
        {n != null && <span className="n">{n}</span>}
        <span className="sp"></span>
        {actions && <span className="acts" onClick={e => e.stopPropagation()}>{actions}</span>}
        {collapsible && <Icon name={open ? 'expand_less' : 'expand_more'} size={16} style={{ color: 'var(--on-surface-variant)' }} />}
      </div>
      {open && <div className={`d-sec-b${flush ? ' flush' : ''}`}>{children}</div>}
    </div>
  );
}

function DSecNav({ items }) {
  const [active, setActive] = React.useState(items[0] ? items[0].id : null);
  const go = (id) => {
    setActive(id);
    const el = document.getElementById(id);
    const box = el && el.closest('.d-detail-body');
    if (el && box) box.scrollTo({ top: el.offsetTop - box.offsetTop - 52, behavior: 'smooth' });
  };
  return (
    <div className="d-secnav">
      {items.map(i => <button key={i.id} className={active === i.id ? 'on' : ''} onClick={() => go(i.id)}>{i.icon && <Icon name={i.icon} size={13} />}{i.label}</button>)}
    </div>
  );
}

function DDrawerGrp({ label, children }) {
  return <div className="d-drawer-grp">{label && <span className="lbl">{label}</span>}{children}</div>;
}

function DFiles({ files }) {
  const kindOf = n => /\.pdf$/i.test(n) ? 'pdf' : /\.(xlsx?|csv)$/i.test(n) ? 'xls' : /\.(png|jpe?g|gif|webp|dwg)$/i.test(n) ? 'img' : '';
  const icoOf = k => k === 'pdf' ? 'description' : k === 'xls' ? 'grid_on' : k === 'img' ? 'image' : 'attach_file';
  return (
    <div className="d-files">
      {files.map((f, i) => {
        const nm = f.name || f; const k = kindOf(nm);
        return (
          <div className="d-file" key={i}>
            <span className={`fi ${k}`}><Icon name={icoOf(k)} size={16} /></span>
            <span className="fm"><b title={nm}>{nm}</b>{f.meta && <span>{f.meta}</span>}</span>
          </div>
        );
      })}
    </div>
  );
}

/* Project Information = identity + entity/beneficiary + consultant (folded per IA) */
function DModInformation({ t, lang, d, editMode }) {
  const AR = lang === 'ar';
  const secs = [
    { id: 'sec-identity', icon: 'badge', label: AR ? 'هوية المشروع' : 'Project identity' },
    { id: 'sec-desc', icon: 'description', label: AR ? 'الوصف' : 'Description' },
    { id: 'sec-entity', icon: 'account_balance', label: t('mod_entity') },
    { id: 'sec-consultant', icon: 'engineering', label: t('mod_consultant') },
  ];
  return (
    <React.Fragment>
      <DSecNav items={secs} />
      <DSec id="sec-identity" icon="badge" title={AR ? 'هوية المشروع' : 'Project identity'} sub={AR ? 'البيانات التعريفية الأساسية' : 'Core registration data'}>
        <DFieldGrid fields={d.profile.fields} lang={lang} editMode={editMode} />
      </DSec>
      <DSec id="sec-desc" icon="description" title={AR ? 'الوصف' : 'Description'}>
        {editMode
          ? <textarea className="d-form-input" style={{ width: '100%', minHeight: 84, resize: 'vertical', fontFamily: 'inherit' }} defaultValue={d.profile.description}></textarea>
          : <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--on-surface-variant)', margin: 0 }}>{d.profile.description}</p>}
      </DSec>
      <DSec id="sec-entity" icon="account_balance" title={t('mod_entity')} sub={AR ? 'الجهة المستفيدة والمالكة' : 'Owning & beneficiary body'}>
        <DFieldGrid fields={d.entity.fields} lang={lang} editMode={editMode} />
      </DSec>
      <DSec id="sec-consultant" icon="engineering" title={t('mod_consultant')} sub={AR ? 'المكتب الاستشاري المشرف' : 'Supervising consultant'}>
        <DFieldGrid fields={d.consultant.fields.filter(f => !/[Ss]upervision/.test(f.label.en))} lang={lang} editMode={editMode} />
      </DSec>
    </React.Fragment>
  );
}

function DModEntity({ t, lang, d, editMode }) {
  return (<React.Fragment><div className="d-section-title">{t('mod_entity')}</div><DFieldGrid fields={d.entity.fields} lang={lang} editMode={editMode} /></React.Fragment>);
}

function DModSimple({ title, fields, lang, editMode }) {
  return (<React.Fragment><div className="d-section-title">{title}</div><DFieldGrid fields={fields} lang={lang} editMode={editMode} /></React.Fragment>);
}

function DModContractNew({ t, lang, d, p, editMode, selKey, setSelKey }) {
  const AR = lang === 'ar';
  const list = d.contracts || [{ key: 'main', name: AR ? 'العقد' : 'Contract', status: d.contract.status, code: d.contract.code, raw: d.contract.raw, fields: d.contract.fields, contractor: d.contractor }];
  React.useEffect(() => { if (selKey == null && list.length === 1) setSelKey(list[0].key); }, [list.length]);
  const [openPayNo, setOpenPayNo] = React.useState(null);
  const [cTab, setCTab] = React.useState('overview');
  React.useEffect(() => { setCTab('overview'); setOpenPayNo(null); }, [selKey]);
  const totalValue = list.reduce((a, x) => a + (x.raw.contractCost || 0), 0);
  const c = list.find(x => x.key === selKey);
  // approved change orders amend the contract; the last applied one is effective.
  // must run before the register early-return, or hook order breaks between branches
  const amd = React.useMemo(() => (c && window.contractAmendments ? window.contractAmendments(c, d, lang, p) : null), [c && c.key, d, lang, p && p.id]);

  if (!c) {
    const totalSpent = list.reduce((a, x) => a + (x.raw.totalSpent || 0), 0);
    const avgPhys = Math.round(list.reduce((a, x) => a + (x.raw.physicalPct || 0), 0) / list.length);
    const avgFin = Math.round(list.reduce((a, x) => a + (x.raw.financialPct || 0), 0) / list.length);
    return (
      <React.Fragment>
        <div className="d-model-topbar">
          <div className="d-section-title" style={{ margin: 0 }}>{t('mod_contract')}</div>
          <span className="d-cell-sub">· {list.length} {AR ? 'عقود' : 'contracts'}</span>
          <div style={{ flex: 1 }}></div>
          <span className="d-cell-sub mono">{AR ? 'إجمالي قيمة العقود' : 'Total contract value'}: {window.fmtNum(totalValue)} IQD</span>
        </div>
        <div className="d-metrics c3">
          <div className="d-metric">
            <span className="d-metric-ring"><DDonut value={avgPhys} size={64} stroke={7} color="var(--viz-1)" /><b>{avgPhys}%</b></span>
            <span className="d-metric-tx"><span className="k">{AR ? 'متوسط الإنجاز المادي' : 'Avg. physical completion'}</span><span className="s">{AR ? 'عبر كل العقود' : 'Across all contracts'}</span></span>
          </div>
          <div className="d-metric">
            <span className="d-metric-ring"><DDonut value={avgFin} size={64} stroke={7} color="var(--viz-2)" /><b>{avgFin}%</b></span>
            <span className="d-metric-tx"><span className="k">{AR ? 'متوسط الإنجاز المالي' : 'Avg. financial completion'}</span><span className="s">{AR ? 'عبر كل العقود' : 'Across all contracts'}</span></span>
          </div>
          <div className="d-util-bar">
            <div className="d-util-row"><span className="lbl">{AR ? 'المصروف من إجمالي قيمة العقود' : 'Spent of total contract value'}</span><b className="amt">{totalValue ? Math.round(totalSpent / totalValue * 100) : 0}%</b></div>
            <div className="d-progress"><span className="t" style={{ height: 8 }}><span style={{ width: (totalValue ? Math.round(totalSpent / totalValue * 100) : 0) + '%' }}></span></span></div>
            <div className="d-util-row"><span className="lbl">{AR ? 'إجمالي قيمة العقود' : 'Total contract value'}</span><span className="amt mono">{window.fmtNum(totalValue)}</span></div>
            <div className="d-util-row"><span className="lbl">{AR ? 'إجمالي المصروف' : 'Total spent'}</span><span className="amt mono" style={{ color: 'var(--on-surface)' }}>{window.fmtNum(totalSpent)}</span></div>
          </div>
        </div>
        <div className="d-section-title">{AR ? 'سجل العقود' : 'Contract register'}</div>
        <div className="d-contract-grid">
          {list.map((x) => {
            const spentPct = x.raw.contractCost ? Math.min(100, Math.round(x.raw.totalSpent / x.raw.contractCost * 100)) : 0;
            return (
              <button key={x.key} className="d-contract-card" onClick={() => setSelKey(x.key)}>
                <div className="d-contract-card-top">
                  <span className="d-vo-emblem" style={{ background: 'color-mix(in srgb,var(--primary) 12%,transparent)', color: 'var(--primary)' }}><Icon name="description" size={18} /></span>
                  <div className="d-contract-card-title">
                    <b>{x.name}</b>
                    <span className="mono">{x.code}</span>
                  </div>
                  <DPill status={x.status} lang={lang} />
                </div>
                <div className="d-contract-card-val">
                  <span className="lbl">{AR ? 'كلفة العقد' : 'Contract cost'}</span>
                  <span className="amt"><span className="mono">{window.fmtNum(x.raw.contractCost)}</span><small>IQD</small></span>
                </div>
                <div className="d-contract-card-mtx">
                  <div className="d-contract-mini">
                    <div className="hd"><span>{AR ? 'الإنجاز المادي' : 'Physical'}</span><b style={{ color: 'var(--azure-600)' }}>{x.raw.physicalPct}%</b></div>
                    <div className="d-progress"><span className="t" style={{ height: 6 }}><span style={{ width: x.raw.physicalPct + '%', background: 'var(--azure-500)' }}></span></span></div>
                  </div>
                  <div className="d-contract-mini">
                    <div className="hd"><span>{AR ? 'الإنجاز المالي' : 'Financial'}</span><b style={{ color: 'var(--on-surface)' }}>{x.raw.financialPct}%</b></div>
                    <div className="d-progress"><span className="t" style={{ height: 6 }}><span style={{ width: x.raw.financialPct + '%', background: 'var(--on-surface)' }}></span></span></div>
                  </div>
                  <div className="d-contract-mini">
                    <div className="hd"><span>{AR ? 'مصروف من الكلفة' : 'Spent of cost'}</span><b>{spentPct}%</b></div>
                    <div className="d-progress"><span className="t" style={{ height: 6 }}><span style={{ width: spentPct + '%' }}></span></span></div>
                  </div>
                </div>
                <div className="d-contract-card-foot">
                  <span>{(x.fields.find(fl => fl.label.en === 'Component') || {}).value || ''}</span>
                  <span className="go">{AR ? 'التفاصيل' : 'View details'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></span>
                </div>
              </button>
            );
          })}
        </div>
      </React.Fragment>
    );
  }

  const r = c.raw;
  const amdCount = amd ? (amd.versions.length - 1) + amd.pending.length : 0;
  const pays = (d.financial && d.financial.payments) || [];
  const contractPays = pays.filter(pay => (pay.allocations || []).some(a => a.contractKey === c.key));
  const openPay = contractPays.find(pay => pay.no === openPayNo);
  const openAlloc = openPay && (openPay.allocations || []).find(a => a.contractKey === c.key);
  const openCerts = openPay ? (openPay.attachments || []).filter(at => !at.contractKey || at.contractKey === c.key) : [];
  const CTABS = [
    { id: 'overview', ico: 'insights', label: AR ? 'نظرة عامة' : 'Overview' },
    { id: 'details', ico: 'list_alt', label: AR ? 'التفاصيل' : 'Details' },
    { id: 'payments', ico: 'payments', label: AR ? 'الدفعات' : 'Payments', n: contractPays.length },
    { id: 'amend', ico: 'history', label: AR ? 'التعديلات التعاقدية' : 'Amendments', n: amdCount },
  ];
  return (
    <React.Fragment>
      <div className="d-vo-detail">
        <div className="d-vo-detail-head">
          {list.length > 1 && <button className="d-btn sm ghost" onClick={() => setSelKey(null)}><Icon name={AR ? 'arrow_forward' : 'arrow_back'} size={16} />{AR ? 'سجل العقود' : 'Register'}</button>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><b style={{ fontSize: 15 }}>{c.name}</b><DPill status={c.status} lang={lang} /></div>
            <div className="reason" style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }} dir="ltr">{c.code}</div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div className="mono" style={{ fontSize: 15, fontWeight: 'var(--fw-x)' }}>{window.fmtNum(amd ? amd.effective.value : r.contractCost)}</div>
            <div className="d-cell-sub" style={{ fontSize: 11 }}>IQD · {amd && amd.versions.length > 1 ? (AR ? 'القيمة النافذة' : 'effective value') : (AR ? 'كلفة كلية' : 'total cost')}</div>
            {amd && amd.versions.length > 1 && <div className="d-cell-sub mono" style={{ fontSize: 11 }}>{AR ? 'الأصلية ' : 'original '}{window.fmtNum(r.contractCost)}</div>}
          </div>
        </div>
        <div className="d-vo-tabs">
          {CTABS.map(tb => (
            <button key={tb.id} className={cTab === tb.id ? 'on' : ''} onClick={() => setCTab(tb.id)}>
              <Icon name={tb.ico} size={15} />{tb.label}
              {tb.n != null && <span className="d-cell-sub mono" style={{ fontSize: 11 }}>{tb.n}</span>}
            </button>
          ))}
        </div>
        <div className="d-vo-tabbody">
        {cTab === 'overview' && <React.Fragment>
      <div className="d-metrics c3">
        <div className="d-metric">
          <span className="d-metric-ring"><DDonut value={r.physicalPct} size={64} stroke={7} color="var(--viz-1)" /><b>{r.physicalPct}%</b></span>
          <span className="d-metric-tx"><span className="k">{AR ? 'الإنجاز المادي' : 'Physical completion'}</span><span className="s">{AR ? 'نِسبة تنفيذ الأعمال' : 'Work executed'}</span></span>
        </div>
        <div className="d-metric">
          <span className="d-metric-ring"><DDonut value={r.financialPct} size={64} stroke={7} color="var(--viz-2)" /><b>{r.financialPct}%</b></span>
          <span className="d-metric-tx"><span className="k">{AR ? 'الإنجاز المالي' : 'Financial completion'}</span><span className="s">{AR ? 'نِسبة الصرف' : 'Amount disbursed'}</span></span>
        </div>
        <div className="d-util-bar">
          <div className="d-util-row"><span className="lbl">{AR ? 'المصروف من كلفة العقد الكلي' : 'Spent of total contract cost'}</span><b className="amt">{r.contractCost ? Math.round(r.totalSpent / r.contractCost * 100) : 0}%</b></div>
          <div className="d-progress"><span className="t" style={{ height: 8 }}><span style={{ width: (r.contractCost ? Math.round(r.totalSpent / r.contractCost * 100) : 0) + '%' }}></span></span></div>
          <div className="d-util-row"><span className="lbl">{AR ? 'كلفة العقد الكلية' : 'Total contract cost'}</span><span className="amt mono">{window.fmtNum(r.contractCost)}</span></div>
          <div className="d-util-row"><span className="lbl">{AR ? 'إجمالي المصروف' : 'Total spent'}</span><span className="amt mono" style={{ color: 'var(--on-surface)' }}>{window.fmtNum(r.totalSpent)}</span></div>
        </div>
      </div>
      <DSec id="sec-cost" icon="payments" title={AR ? 'تفصيل كلفة العقد' : 'Contract cost breakdown'} sub={AR ? 'الإحالة · الاحتياط · الإشراف' : 'Award · reserve · supervision'}>      <div className="d-fig-row" style={{ marginBottom: 0 }}>
        {[
          [AR ? 'الإحالة' : 'Award', r.awardAmt, r.spentAward],
          [AR ? 'الاحتياط' : 'Reserve', r.reserveAmt, r.spentReserve],
          [AR ? 'الإشراف والمراقبة' : 'Supervision & monitoring', r.supervisionAmt, r.spentSupervision],
        ].map((row, i) => {
          const pct = row[1] ? Math.min(100, Math.round(row[2] / row[1] * 100)) : 0;
          return (
            <div className="d-fig" key={i}>
              <div className="k">{row[0]}</div>
              <div className="v mono">{window.fmtNum(row[1])}<small> IQD</small></div>
              <div className="d-progress" style={{ marginTop: 6 }}><span className="t" style={{ height: 6 }}><span style={{ width: pct + '%' }}></span></span></div>
              <div className="d-cell-sub mono" style={{ fontSize: 11, marginTop: 4 }}>{AR ? 'مصروف' : 'spent'} {window.fmtNum(row[2])} ({pct}%)</div>
            </div>
          );
        })}
      </div>
      </DSec>
        </React.Fragment>}

        {cTab === 'details' && <React.Fragment>
          <DSec id="sec-terms" icon="list_alt" title={AR ? 'شروط العقد' : 'Contract terms'}>
            <DFieldGrid fields={c.fields} lang={lang} editMode={editMode} />
          </DSec>
          <DSec id="sec-contractor" icon="engineering" title={t('mod_contractor')} sub={AR ? 'بيانات المقاول المنفّذ' : 'Executing contractor'}>
            <DFieldGrid fields={c.contractor.fields} lang={lang} editMode={editMode} />
          </DSec>
        </React.Fragment>}

        {cTab === 'amend' && <DContractAmendments lang={lang} c={c} d={d} p={p} />}

        {cTab === 'payments' && (contractPays.length ? (
          <div className="d-card-sub">
            {contractPays.map((pay, i) => {
              const alloc = (pay.allocations || []).find(a => a.contractKey === c.key);
              return (
                <button key={i} className="d-openrow" onClick={() => setOpenPayNo(pay.no)}>
                  <span className="d-vo-emblem" style={{ background: 'color-mix(in srgb,var(--success) 14%,transparent)', color: 'var(--on-surface)', flex: 'none' }}><Icon name="payments" size={17} /></span>
                  <span className="om"><b>{pay.no} · {pay.date}</b><span>{AR ? 'كتاب' : 'letter'} {pay.financeLetter.no}</span></span>
                  <span className="mono" style={{ color: 'var(--on-surface)', fontWeight: 'var(--fw-bold)', fontSize: 12 }}>{window.fmtNum(alloc ? alloc.amount : 0)} IQD</span>
                  <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={17} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
                </button>
              );
            })}
          </div>
        ) : <div className="d-cell-sub" style={{ padding: '8px 2px' }}>{AR ? 'لا توجد دفعات مسجلة لهذا العقد.' : 'No payments recorded for this contract.'}</div>)}

        {openPay && <DDrawer wide onClose={() => setOpenPayNo(null)}
          title={`${openPay.no} · ${window.fmtNum(openAlloc ? openAlloc.amount : 0)} IQD`}
          sub={`${openPay.date} · ${AR ? 'كتاب' : 'letter'} ${openPay.financeLetter.no}`}
          footer={<button className="d-btn" onClick={() => setOpenPayNo(null)}>{AR ? 'إغلاق' : 'Close'}</button>}>
          <DDrawerGrp label={AR ? 'تفصيل الدفعة لهذا العقد' : 'Payment breakdown for this contract'}>
            <table className="d-line-table">
              <thead><tr><th>{AR ? 'البند' : 'Item'}</th><th>{AR ? 'المبلغ' : 'Amount'}</th></tr></thead>
              <tbody>{openAlloc && openAlloc.items.map((it, k) => <tr key={k}><td className="d-cell-sub">{it.name}</td><td className="mono">{window.fmtNum(it.value)}</td></tr>)}</tbody>
            </table>
          </DDrawerGrp>
          <DDrawerGrp label={AR ? 'المرفقات' : 'Attachments'}>
            {openCerts.length ? <DFiles files={openCerts.map(at => ({ name: at.name, meta: `${at.file} · ${at.size}` }))} />
              : <span className="d-cell-sub">{AR ? 'لا توجد مرفقات' : 'No attachments'}</span>}
          </DDrawerGrp>
        </DDrawer>}
        </div>
      </div>
    </React.Fragment>
  );
}

function DModConsultant({ t, lang, d, editMode }) {
  const spentPct = Math.min(100, Math.round(d.consultant.fields[2].value.toString().replace(/\D/g,'') / d.consultant.fields[1].value.toString().replace(/\D/g,'') * 100)) || 0;
  return (
    <React.Fragment>
      <DSec icon="engineering" title={t('mod_consultant')}>
        <DFieldGrid fields={d.consultant.fields} lang={lang} editMode={editMode} />
      </DSec>
      <DSec icon="bar_chart" title={lang === 'ar' ? 'نسبة الصرف من الإشراف' : 'Supervision spend ratio'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}><span className="d-cell-sub">{lang === 'ar' ? 'المصروف' : 'Spent'}</span><b className="mono">{spentPct}%</b></div>
        <div className="d-progress"><span className="t" style={{ height: 10 }}><span style={{ width: spentPct + '%' }}></span></span></div>
      </DSec>
    </React.Fragment>
  );
}

function DPaymentWizard({ lang, d, onClose, onDone }) {
  const AR = lang === 'ar';
  const [step, setStep] = React.useState(0);
  const contracts = d.contracts || [];
  const [sel, setSel] = React.useState(contracts.map(c => c.key));
  const ITEMS = AR ? ['الإحالة', 'الاحتياط', 'الإشراف والمراقبة'] : ['Award', 'Reserve', 'Supervision & monitoring'];
  const steps = AR ? ['العقود المشمولة', 'المبالغ والبنود', 'كتاب المالية', 'ذرعات الأعمال', 'مراجعة'] : ['Contracts covered', 'Amounts & items', 'Finance letter', 'Work certificates', 'Review'];
  const toggle = k => setSel(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  return (
    <div className="d-modal-scrim" onClick={onClose}>
      <div className="d-modal" onClick={e => e.stopPropagation()}>
        <div className="d-modal-head"><b>{AR ? 'تسجيل دفعة' : 'Register payment'}</b><button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="d-stepper">{steps.map((s, i) => <div key={i} className={`d-step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}><span className="n">{i < step ? <Icon name="check" size={13} /> : i + 1}</span><span className="l">{s}</span></div>)}</div>
        <div className="d-modal-body">
          {step === 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="d-cell-sub">{AR ? 'حدّد العقد أو العقود المشمولة بالدفعة' : 'Select the contract(s) covered by this payment'}</label>
            {contracts.map(c => (
              <button key={c.key} onClick={() => toggle(c.key)} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid ' + (sel.includes(c.key) ? 'var(--primary)' : 'var(--outline-variant)'), borderRadius: 'var(--r-md)', background: sel.includes(c.key) ? 'color-mix(in srgb,var(--primary) 6%,transparent)' : 'var(--surface-container-lowest)' }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, flex: 'none', display: 'grid', placeItems: 'center', border: '2px solid ' + (sel.includes(c.key) ? 'var(--primary)' : 'var(--outline)'), background: sel.includes(c.key) ? 'var(--primary)' : 'transparent' }}>{sel.includes(c.key) && <Icon name="check" size={13} style={{ color: '#fff' }} />}</span>
                <div style={{ flex: 1 }}><b style={{ fontSize: 13 }}>{c.name}</b><div className="mono d-cell-sub" style={{ fontSize: 11 }}>{c.code}</div></div>
              </button>
            ))}
          </div>}
          {step === 1 && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {contracts.filter(c => sel.includes(c.key)).map(c => (
              <div key={c.key} className="d-card-sub" style={{ padding: 12 }}>
                <b style={{ fontSize: 12 }}>{c.name}</b>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 8 }}>
                  {ITEMS.map((it, j) => <div key={j}><label className="d-cell-sub" style={{ fontSize: 11 }}>{it}</label><input className="d-form-input mono" placeholder="0" /></div>)}
                </div>
              </div>
            ))}
            <div className="d-callout"><span className="d-callout-ico"><Icon name="functions" size={18} /></span><div className="d-callout-tx"><b style={{ fontSize: 12, fontWeight: 'var(--fw-bold)' }}>{AR ? 'كل مبلغ يُخصَّص لعقد وبند من بنود مصروفات العقد الثلاث (الإحالة/الاحتياط/الإشراف).' : 'Each amount is allocated to a contract and one of the three contract expense items (award/reserve/supervision).'}</b></div></div>
          </div>}
          {step === 2 && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="d-cell-sub">{AR ? 'رقم كتاب المالية' : 'Finance letter no.'}</label><input className="d-form-input mono" defaultValue="FIN-7211" /></div>
              <div><label className="d-cell-sub">{AR ? 'تاريخ الكتاب' : 'Letter date'}</label><input className="d-form-input mono" defaultValue="2026-07-20" /></div>
            </div>
            <div className="d-drop"><Icon name="upload_file" size={26} /><b>{AR ? 'أرفق كتاب المالية' : 'Attach the finance letter'}</b><span className="d-cell-sub">{AR ? 'PDF — تجريبي' : 'PDF — demo'}</span></div>
          </div>}
          {step === 3 && <div className="d-drop"><Icon name="upload_file" size={30} /><b>{AR ? 'أرفق ذرعات الأعمال لكل عقد مشمول' : 'Attach work measurement certificates for each covered contract'}</b><span className="d-cell-sub">{AR ? 'PDF / صور — تجريبي' : 'PDF / images — demo'}</span></div>}
          {step === 4 && <div className="d-card-sub" style={{ padding: 14 }}><table className="d-line-table"><tbody>
            <tr><td>{AR ? 'العقود المشمولة' : 'Contracts covered'}</td><td>{contracts.filter(c => sel.includes(c.key)).map(c => c.name).join(' · ')}</td></tr>
            <tr><td>{AR ? 'المرفقات المطلوبة' : 'Required attachments'}</td><td className="d-cell-sub">{AR ? 'كتاب المالية + ذرعة أعمال لكل عقد' : 'Finance letter + a work certificate per contract'}</td></tr>
          </tbody></table></div>}
        </div>
        <div className="d-modal-foot">{step > 0 && <button className="d-btn ghost" onClick={() => setStep(s => s - 1)}>{AR ? 'السابق' : 'Back'}</button>}<div style={{ flex: 1 }}></div>{step < steps.length - 1 ? <button className="d-btn primary" onClick={() => setStep(s => s + 1)}>{AR ? 'التالي' : 'Next'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={16} /></button> : <button className="d-btn primary" onClick={onDone}><Icon name="check" size={16} />{AR ? 'تسجيل الدفعة' : 'Register payment'}</button>}</div>
      </div>
    </div>
  );
}

function DModFinancialNew({ t, lang, d, editMode, showToast }) {
  const r = d.financial.raw;
  const AR = lang === 'ar';
  const cumPct = Math.min(100, Math.round(r.disbursed / r.revisedCost * 100));
  const [showPay, setShowPay] = React.useState(false);
  const [openPay, setOpenPay] = React.useState(null);
  const [histOpen, setHistOpen] = React.useState(false);
  const curYear = (r.yearlyAllocations.find(y => y.current) || r.yearlyAllocations[r.yearlyAllocations.length - 1]).year;
  const [selYear, setSelYear] = React.useState(curYear);
  React.useEffect(() => { const h = () => setShowPay(true); window.addEventListener('epm:pay-register', h); return () => window.removeEventListener('epm:pay-register', h); }, []);
  const kindIco = { pdf: 'picture_as_pdf', image: 'image', sheet: 'table_view', doc: 'description' };
  const yr = r.yearlyAllocations.find(y => y.year === selYear) || r.yearlyAllocations[0];
  const yrPayments = d.financial.payments.filter(pay => new Date(pay.date).getFullYear() === selYear);
  const yrPct = yr.allocation ? Math.min(100, Math.round(yr.spend / yr.allocation * 100)) : 0;
  const projectFields = d.financial.fields.filter(f => !/Annual|Cumulative spend/.test(f.label.en));
  return (
    <React.Fragment>
      {showPay && <DPaymentWizard lang={lang} d={d} onClose={() => setShowPay(false)} onDone={() => { setShowPay(false); showToast(AR ? 'تم تسجيل الدفعة' : 'Payment registered'); }} />}
      <div className="d-section-title">{t('mod_financials')}</div>
      <div className="d-metrics c2">
        <div className="d-metric">
          <span className="d-metric-ring"><DDonut value={cumPct} size={64} stroke={7} color="var(--viz-1)" /><b>{cumPct}%</b></span>
          <span className="d-metric-tx"><span className="k">{AR ? 'المصروف من الكلفة المعدلة' : 'Spent of revised cost'}</span><span className="s">{window.fmtNum(r.disbursed)} / {window.fmtNum(r.revisedCost)} IQD</span></span>
        </div>
        <div className="d-util-bar">
          <div className="d-util-row"><span className="lbl">{AR ? 'كلفة المشروع المقررة' : 'Planned cost'}</span><span className="amt mono">{window.fmtNum(r.plannedCost)}</span></div>
          <div className="d-util-row"><span className="lbl">{AR ? 'الكلفة المعدلة' : 'Revised cost'}</span><span className="amt mono">{window.fmtNum(r.revisedCost)}</span></div>
          <div className="d-util-row"><span className="lbl">{AR ? 'المصروف التراكمي' : 'Cumulative spend'}</span><span className="amt mono" style={{ color: 'var(--azure-600)' }}>{window.fmtNum(r.disbursed)}</span></div>
        </div>
      </div>
      <DFieldGrid fields={projectFields} lang={lang} editMode={editMode} />

      <div className="d-section-title">{AR ? 'التخصيص السنوي' : 'Annual allocation'}</div>
      <div className="d-year-card">
        <div className="d-year-tabs">
          {r.yearlyAllocations.map((y, i) => {
            const on = y.year === selYear;
            return (
              <button key={i} className={`d-year-tab ${on ? 'on' : ''}`} onClick={() => setSelYear(y.year)}>
                {y.year}{y.current && <i className="dot"></i>}
              </button>
            );
          })}
        </div>
        <div className="d-year-detail">
        <div className="d-year-detail-head">
          <b>{selYear}</b>{yr.current && <span className="d-year-cur">{AR ? 'الحالية' : 'Current'}</span>}
          <div style={{ flex: 1 }}></div>
          <span className="mono" style={{ fontSize: 13, fontWeight: 'var(--fw-x)', color: yrPct > 95 ? 'var(--warning)' : 'var(--azure-600)' }}>{yrPct}%</span>
          <span className="d-cell-sub">{AR ? 'مستهلك' : 'utilized'}</span>
        </div>
        <div className="d-progress" style={{ margin: '0 16px' }}><span className="t" style={{ height: 7 }}><span style={{ width: yrPct + '%', background: yrPct > 95 ? 'var(--warning)' : 'var(--azure-500)' }}></span></span></div>
        <div className="d-fig-row" style={{ margin: '14px 16px' }}>
          <div className="d-fig" style={{ padding: 0, border: 'none', background: 'none' }}><div className="k">{AR ? 'التخصيص' : 'Allocation'}</div><div className="v mono">{window.fmtNum(yr.allocation)}</div></div>
          <div className="d-fig" style={{ padding: 0, border: 'none', background: 'none' }}><div className="k">{AR ? 'المصروف' : 'Spend'}</div><div className="v mono" style={{ color: 'var(--on-surface)' }}>{window.fmtNum(yr.spend)}</div></div>
          <div className="d-fig" style={{ padding: 0, border: 'none', background: 'none' }}><div className="k">{AR ? 'المتبقي' : 'Remaining'}</div><div className="v mono">{window.fmtNum(yr.allocation - yr.spend)}</div></div>
        </div>
        <div style={{ margin: '0 16px 14px', paddingTop: 12, borderTop: '1px solid var(--surface-container-high)' }}>
          <div className="d-vo-subtitle">{AR ? `سجل الدفعات — ${selYear}` : `Payment records — ${selYear}`}</div>
          {yrPayments.length === 0 && <div className="d-cell-sub" style={{ padding: '8px 0' }}>{AR ? 'لا توجد دفعات مسجّلة لهذه السنة' : 'No payments recorded for this year'}</div>}
          {yrPayments.map((pay, i) => (
            <button key={i} className="d-openrow" onClick={() => setOpenPay(pay.no)}>
              <span className="d-vo-emblem" style={{ background: 'color-mix(in srgb,var(--success) 14%,transparent)', color: 'var(--on-surface)', flex: 'none' }}><Icon name="payments" size={17} /></span>
              <span className="om"><b>{pay.no} · {pay.date}</b><span>{(pay.allocations || []).map(a => a.contractName).join(' · ')}</span></span>
              <span className="mono" style={{ color: 'var(--on-surface)', fontWeight: 'var(--fw-bold)', fontSize: 12 }}>{window.fmtNum(pay.amount)} IQD</span>
              <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={17} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
            </button>
          ))}
        </div>
        {(() => {
          const pay = yrPayments.find(x => x.no === openPay);
          if (!pay) return null;
          return (
            <DDrawer wide onClose={() => setOpenPay(null)}
              title={`${pay.no} · ${window.fmtNum(pay.amount)} IQD`}
              sub={`${pay.date} · ${AR ? 'كتاب' : 'letter'} ${pay.financeLetter.no}`}
              footer={<button className="d-btn" onClick={() => setOpenPay(null)}>{AR ? 'إغلاق' : 'Close'}</button>}>
              <DDrawerGrp label={AR ? 'توزيع الدفعة على العقود' : 'Allocation across contracts'}>
                <table className="d-line-table">
                  <thead><tr><th>{AR ? 'العقد' : 'Contract'}</th><th>{AR ? 'البند' : 'Item'}</th><th>{AR ? 'المبلغ' : 'Amount'}</th></tr></thead>
                  <tbody>{(pay.allocations || []).flatMap((a, ai) => a.items.map((it, ii) => <tr key={ai + '-' + ii}>{ii === 0 && <td rowSpan={a.items.length} className="d-cell-strong">{a.contractName}</td>}<td className="d-cell-sub">{it.name}</td><td className="mono">{window.fmtNum(it.value)}</td></tr>))}</tbody>
                </table>
              </DDrawerGrp>
              <DDrawerGrp label={AR ? 'كتاب المالية والمرفقات' : 'Finance letter & attachments'}>
                <DFiles files={pay.attachments.map(at => ({ name: at.name, meta: `${at.file} · ${at.size}` }))} />
              </DDrawerGrp>
            </DDrawer>
          );
        })()}

        {(() => {
          const yrVOs = d.variationOrders.filter(v => v.status === 'approved' && new Date(v.date).getFullYear() === selYear);
          const yrPays = d.financial.payments.filter(pay => new Date(pay.date).getFullYear() === selYear);
          const yrEdits = (d.financial.editLog || []).filter(ev => new Date(ev.date).getFullYear() === selYear);
          const events = [
            ...yrVOs.map(v => ({ date: v.date, kind: 'vo', by: v.responsible, label: (AR ? 'أمر تغييري معتمد ' : 'Change order approved ') + v.no, note: v.reason, delta: v.net })),
            ...yrPays.map(pay => ({ date: pay.date, kind: 'pay', by: pay.by, label: (AR ? 'دفعة مسجّلة ' : 'Payment recorded ') + pay.no, note: pay.financeLetter.no, delta: pay.amount })),
            ...yrEdits.flatMap(ev => ev.changes.map(c => ({ date: ev.date, kind: 'edit', by: ev.by, label: c.field, from: c.from, to: c.to, delta: null }))),
          ].sort((a, b) => new Date(b.date) - new Date(a.date));
          if (!events.length) return null;
          const ico = { vo: 'sync_alt', pay: 'payments', edit: 'edit_note' };
          const col = { vo: 'var(--on-surface)', pay: 'var(--on-surface)', edit: 'var(--azure-600)' };
          return (
            <div style={{ margin: '0 16px 14px', paddingTop: 12, borderTop: '1px solid var(--surface-container-high)' }}>
              <button className="d-openrow" style={{ padding: '10px 0', borderBottom: 'none' }} onClick={() => setHistOpen(true)}>
                <span className="d-vo-emblem" style={{ background: 'color-mix(in srgb,var(--tertiary) 14%,transparent)', color: 'var(--on-surface)', flex: 'none' }}><Icon name="history" size={17} /></span>
                <span className="om"><b>{AR ? 'سجل التغييرات' : 'Change history'}</b><span>{AR ? `${events.length} حدث في ${selYear}` : `${events.length} events in ${selYear}`}</span></span>
                <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={17} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
              </button>
              {histOpen && <DDrawer wide onClose={() => setHistOpen(false)}
                title={AR ? 'سجل التغييرات' : 'Change history'}
                sub={AR ? `${selYear} · ${events.length} حدث` : `${selYear} · ${events.length} events`}
                footer={<button className="d-btn" onClick={() => setHistOpen(false)}>{AR ? 'إغلاق' : 'Close'}</button>}>
                <div className="d-edit-timeline">
                {events.map((ev, i) => (
                  <div className="d-edit-item" key={i}>
                    <span className="d-edit-dot" style={{ background: col[ev.kind] }}></span>
                    <div className="d-edit-body">
                      <div className="d-edit-meta"><Icon name={ico[ev.kind]} size={13} style={{ color: col[ev.kind] }} /><b>{ev.by}</b><span className="mono">{ev.date}</span></div>
                      <div className="d-edit-chips">
                        <span className="d-edit-chip">
                          <span className="f">{ev.label}</span>
                          {ev.delta != null
                            ? <span className="to" style={{ color: col[ev.kind] }}>+{window.fmtNum(ev.delta)}</span>
                            : <React.Fragment><span className="fr">{ev.from}</span><Icon name="arrow_back" size={11} style={{ transform: AR ? 'none' : 'scaleX(-1)' }} /><span className="to">{ev.to}</span></React.Fragment>}
                        </span>
                        {ev.delta != null && ev.note && <span className="d-edit-chip"><span className="d-cell-sub">{ev.note}</span></span>}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </DDrawer>}
            </div>
          );
        })()}
      </div>
      </div>
    </React.Fragment>
  );
}

/* Progress = READ-ONLY dashboard: overall + by-WBS-level progress,
   impact/cost, schedule-risk summary — aggregated from project info
   and updates flowing in from Schedule / Financial / Change Orders. */
function DModProgress({ t, lang, d, p }) {
  const e = d.evm;
  const AR = lang === 'ar';
  const fin = d.financial.raw;
  const phys = p ? p.tech : (d.progress.history.slice(-1)[0] || {}).physical || 0;
  const finPct = fin.financialPct;
  const plannedProg = Math.min(100, phys + 8);
  const sd = React.useMemo(() => window.EPM.buildScheduleData(p, lang), [p && p.id, lang]);
  const roll = window.schedRollup ? window.schedRollup(sd.activities) : { wbsPct: {}, projectPct: phys };
  const wbsRows = sd.activities.filter(a => a.type === 'wbs' && a.level >= 2);
  const approvedVO = d.variationOrders.filter(v => v.status === 'approved').reduce((s, v) => s + v.value, 0);
  const pendingVO = d.variationOrders.filter(v => v.status === 'pending').reduce((s, v) => s + v.value, 0);
  const schedImpact = sd.activities.filter(a => a.type === 'act' && a.slip > 0 && !a.milestone).reduce((s, a) => s + Math.round(a.cost / (a.origDur || 1) * 0.15 * a.slip), 0);
  const atRisk = sd.activities.filter(a => a.type === 'act' && !a.milestone && (a.slip > 10 || (a.float === 0 && a.slip > 0)));
  const barColor = pct => pct >= 90 ? 'var(--status-completed)' : pct >= 45 ? 'var(--viz-1)' : 'var(--status-suspended)';
  return (
    <React.Fragment>
      <div className="d-section-title">{t('mod_progress')}</div>

      {/* overall progress */}
      <div className="d-metrics c3">
        <div className="d-metric">
          <span className="d-metric-ring"><DDonut value={phys} size={64} stroke={7} color="var(--viz-1)" /><b>{phys}%</b></span>
          <span className="d-metric-tx"><span className="k">{AR ? 'الإنجاز المادي' : 'Physical completion'}</span><span className="v">{phys}%</span><span className="s">{AR ? 'المخطط' : 'Planned'} {plannedProg}%</span></span>
        </div>
        <div className="d-metric">
          <span className="d-metric-ring"><DDonut value={finPct} size={64} stroke={7} color="var(--viz-2)" /><b>{finPct}%</b></span>
          <span className="d-metric-tx"><span className="k">{AR ? 'الإنجاز المالي' : 'Financial completion'}</span><span className="v">{finPct}%</span><span className="s">{AR ? 'من الكلفة المعدلة' : 'of revised cost'}</span></span>
        </div>
        <div className="d-util-bar">
          <div className="d-util-row"><span className="lbl">{AR ? 'الإنجاز التجميعي للجدول' : 'Schedule rollup'}</span><b className="amt" style={{ color: 'var(--azure-600)' }}>{roll.projectPct}%</b></div>
          <div className="d-progress"><span className="t" style={{ height: 8 }}><span style={{ width: roll.projectPct + '%' }}></span></span></div>
          <div className="d-util-row d-idx"><span className="lbl">SPI</span><span className="amt mono v">{e.spi}</span></div>
          <div className="d-util-row d-idx"><span className="lbl">CPI</span><span className="amt mono v">{e.cpi}</span></div>
        </div>
      </div>

      {/* progress by WBS level */}
      <div className="d-section-title">{AR ? 'الإنجاز حسب مستويات هيكل التجزئة' : 'Progress by WBS level'}</div>
      <div className="d-card-sub">
        {wbsRows.map((w, i) => {
          const pct = roll.wbsPct[w.code] || 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < wbsRows.length - 1 ? '1px solid var(--surface-container-high)' : 'none' }}>
              <span className="mono d-cell-sub" style={{ fontSize: 11, width: 44, flex: 'none' }}>{w.code}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: w.level <= 2 ? 'var(--fw-x)' : 'var(--fw-regular)', paddingInlineStart: (w.level - 2) * 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</span>
              <div className="d-progress" style={{ width: 220, flex: 'none' }}><span className="t"><span style={{ width: pct + '%', background: barColor(pct) }}></span></span><span className="pc">{pct}%</span></div>
            </div>
          );
        })}
      </div>

      <div className="d-grid c2 eqrows" style={{ marginTop: 14 }}>
        {/* impact & cost */}
        <div className="d-panel">
          <div className="d-panel-head"><b>{AR ? 'الأثر والكلفة' : 'Impact & cost'}</b></div>
          <div className="d-fig-row" style={{ margin: 0, padding: 14 }}>
            <div className="d-fig"><div className="k">{AR ? 'الكلفة المعدلة' : 'Revised cost'}</div><div className="v mono">{Math.round(fin.revisedCost / 1e6)}<small>M</small></div></div>
            <div className="d-fig"><div className="k">{AR ? 'المصروف التراكمي' : 'Cumulative spend'}</div><div className="v mono">{Math.round(fin.disbursed / 1e6)}<small>M</small></div></div>
            <div className="d-fig"><div className="k">{AR ? 'أوامر تغييرية معتمدة' : 'Approved change orders'}</div><div className="v mono" style={{ color: 'var(--on-surface)' }}>{Math.round(approvedVO / 1e6)}<small>M</small></div></div>
            <div className="d-fig"><div className="k">{AR ? 'أثر كلفة الجدول (تقديري)' : 'Schedule cost impact (est.)'}</div><div className="v mono" style={{ color: 'var(--on-surface)' }}>{Math.round(schedImpact / 1e6)}<small>M</small></div></div>
            <div className="d-fig"><div className="k">EAC</div><div className="v mono">{Math.round(e.eac / 1e6)}<small>M</small></div></div>
            <div className="d-fig"><div className="k">VAC</div><div className="v mono" style={{ color: e.vac < 0 ? 'var(--error)' : 'var(--on-surface)' }}>{Math.round(e.vac / 1e6)}<small>M</small></div></div>
          </div>
        </div>
        {/* schedule risk summary */}
        <div className="d-panel">
          <div className="d-panel-head"><b>{AR ? 'ملخص مخاطر الجدول' : 'Schedule risk summary'}</b></div>
          <div className="d-alert-tiles" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="d-alert-tile"><div className="n" style={{ color: sd.delayDays > 0 ? 'var(--error)' : 'var(--on-surface)' }}>{sd.delayDays > 0 ? '+' : ''}{sd.delayDays}</div><div className="l">{AR ? 'تأخر (يوم)' : 'Delay (d)'}</div></div>
            <div className="d-alert-tile"><div className="n" style={{ color: 'var(--on-surface)' }}>{sd.criticalCount}</div><div className="l">{AR ? 'أنشطة حرجة' : 'Critical'}</div></div>
            <div className="d-alert-tile"><div className="n" style={{ color: 'var(--status-suspended-tx)' }}>{sd.negFloatCount}</div><div className="l">{AR ? 'عوم سالب' : 'Neg. float'}</div></div>
          </div>
          <div style={{ padding: '0 14px 12px' }}>
            <div className="d-cell-sub" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', margin: '2px 0 8px' }}>{AR ? 'أنشطة معرّضة للخطر' : 'At-risk activities'}</div>
            {atRisk.length === 0 && <span className="d-cell-sub">{AR ? 'لا توجد' : 'None'}</span>}
            {atRisk.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < atRisk.length - 1 ? '1px dashed var(--outline-variant)' : 'none' }}>
                <Icon name="warning" size={14} style={{ color: 'var(--error)', flex: 'none' }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--error)' }}>+{a.slip}{AR ? 'ي' : 'd'}</span>
                {a.float === 0 && <span className="d-pill critical" style={{ height: 18 }}>{AR ? 'حرج' : 'Crit'}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* trend + update history (updates flowing from sections) */}
      <div className="d-section-title">{AR ? 'منحنى S — المخطط مقابل الفعلي (تراكمي)' : 'S-curve — plan vs actual (cumulative)'}</div>
      {(() => {
        const N = 8; // periods across the whole project 0 → 100
        const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); // smoothstep S-shape
        const nowFrac = Math.min(1, Math.max(0.05, phys / 100));
        const rows = [];
        for (let i = 0; i <= N; i++) {
          const f = i / N;
          const planCum = Math.round(smooth(f) * 100);
          const inPast = f <= nowFrac + 1e-6;
          const actCum = inPast ? Math.round(smooth(f / (nowFrac || 1)) * phys) : null;
          const prev = rows[rows.length - 1];
          rows.push({
            label: 'M' + i,
            planCum,
            actCum,
            planPeriod: planCum - (prev ? prev.planCum : 0),
            actPeriod: actCum == null ? 0 : actCum - (prev && prev.actCum != null ? prev.actCum : 0),
          });
        }
        return <DSCurve lang={lang} data={rows} />;
      })()}
      <div className="d-section-title">{AR ? 'تحديثات الإنجاز (من الأقسام)' : 'Progress updates (from sections)'}</div>
      <div className="d-card-sub">
        <table className="d-line-table">
          <thead><tr><th>{AR ? 'التاريخ' : 'Date'}</th><th>{AR ? 'الإنجاز المادي' : 'Physical'}</th><th>{AR ? 'الإنجاز المالي' : 'Financial'}</th><th>{AR ? 'المصدر' : 'Source'}</th><th>{AR ? 'المستخدم' : 'By'}</th></tr></thead>
          <tbody>{d.progress.history.map((h, i) => <tr key={i}><td className="mono">{h.date}</td><td className="mono">{h.physical}%</td><td className="mono">{h.financial}%</td><td className="d-cell-sub">{i % 2 ? (AR ? 'الجدول الزمني' : 'Schedule') : (AR ? 'الموقف المالي' : 'Financial')}</td><td>{h.by}</td></tr>)}</tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

function boqWeights(rows) {
  const total = rows.reduce((a, r) => a + r.total, 0) || 1;
  const raw = rows.map(r => r.total / total * 100);
  const floors = raw.map(w => Math.floor(w));
  const remainder = Math.round(100 - floors.reduce((a, w) => a + w, 0));
  const order = raw.map((w, i) => ({ i, frac: w - Math.floor(w) })).sort((a, b) => b.frac - a.frac);
  const out = floors.slice();
  for (let k = 0; k < remainder && out.length; k++) out[order[k % out.length].i] += 1;
  return out;
}

function DModBOQ({ t, lang, d, p, showToast }) {
  const [rows, setRows] = React.useState(d.boq);
  const [adding, setAdding] = React.useState(false);
  const [view, setView] = React.useState('register');
  const [nm, setNm] = React.useState(''); const [unit, setUnit] = React.useState(''); const [qty, setQty] = React.useState(''); const [price, setPrice] = React.useState('');
  const addRow = () => {
    if (!nm.trim() || !qty || !price) { showToast(lang === 'ar' ? 'أكمل الحقول' : 'Fill in the fields'); return; }
    const q = parseInt(qty, 10), pr = parseInt(price, 10);
    setRows(rs => [...rs, { no: rs.length + 1, code: 'BQ-' + String(rs.length + 1).padStart(3, '0'), item: nm, unit: unit || '—', contractedQty: q, executedQty: 0, price: pr, total: q * pr }]);
    setNm(''); setUnit(''); setQty(''); setPrice(''); setAdding(false);
  };
  const [editIdx, setEditIdx] = React.useState(null);
  const [eNm, setENm] = React.useState(''); const [eUnit, setEUnit] = React.useState(''); const [eQty, setEQty] = React.useState(''); const [ePrice, setEPrice] = React.useState('');
  const [delIdx, setDelIdx] = React.useState(null);
  const startEdit = (i) => { const r = rows[i]; setEditIdx(i); setENm(r.item); setEUnit(r.unit); setEQty(String(r.contractedQty)); setEPrice(String(r.price)); setDelIdx(null); setAdding(false); };
  const cancelEdit = () => setEditIdx(null);
  const saveEdit = () => {
    if (!eNm.trim() || !eQty || !ePrice) { showToast(lang === 'ar' ? 'أكمل الحقول' : 'Fill in the fields'); return; }
    const q = parseInt(eQty, 10), pr = parseInt(ePrice, 10);
    setRows(rs => rs.map((r, i) => i === editIdx ? { ...r, item: eNm, unit: eUnit || '—', contractedQty: q, price: pr, total: q * pr, executedQty: Math.min(r.executedQty, q) } : r));
    setEditIdx(null);
    showToast(lang === 'ar' ? 'تم حفظ التعديل' : 'Changes saved');
  };
  const removeRow = (i) => {
    setRows(rs => rs.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, no: idx + 1 })));
    setDelIdx(null);
    showToast(lang === 'ar' ? 'تم حذف البند' : 'Item deleted');
  };
  const totalContracted = rows.reduce((a, r) => a + r.total, 0);
  const weights = boqWeights(rows);
  const sd = React.useMemo(() => window.EPM.buildScheduleData(p, lang), [p && p.id, lang]);
  const activities = React.useMemo(() => sd.activities.filter(a => a.type === 'act' && !a.milestone), [sd]);
  const boqs = React.useMemo(() => rows.map((r, i) => ({ ...r, weight: weights[i] || 0 })), [rows, weights]);
  const [links, setLinks] = React.useState(() => defaultBOQLinks(boqs, activities));
  const [basis, setBasis] = React.useState('cost');
  const [allocOverrides, setAllocOverrides] = React.useState({});
  const [actPct, setActPct] = React.useState({});
  const groups = React.useMemo(() => computeBOQGroups(boqs, activities, links, allocOverrides, actPct, basis), [boqs, activities, links, allocOverrides, actPct, basis]);
  const progressByNo = {}; groups.forEach(g => { progressByNo[g.b.no] = g; });
  const totalAchieved = groups.reduce((a, g) => a + g.achievedAmount, 0);
  const [showImp, setShowImp] = React.useState(false);
  React.useEffect(() => { const h = () => setShowImp(true); window.addEventListener('epm:boq-import', h); return () => window.removeEventListener('epm:boq-import', h); }, []);
  return (
    <React.Fragment>
      {showImp && <DImportWizard lang={lang} kind="boq" onClose={() => setShowImp(false)} onDone={() => { setShowImp(false); showToast(lang === 'ar' ? 'تم استيراد BOQ وربطه — تجريبي' : 'BOQ imported & linked — demo'); }} />}
      <div className="d-model-topbar">
        <div className="d-section-title" style={{ margin: 0 }}>{t('mod_boq')}</div>
        <div style={{ flex: 1 }}></div>
        <div className="d-seg">
          <button className={view === 'register' ? 'on' : ''} onClick={() => setView('register')}><Icon name="list_alt" size={14} />{lang === 'ar' ? 'السجل' : 'Register'}</button>
          <button className={view === 'assign' ? 'on' : ''} onClick={() => setView('assign')}><Icon name="hub" size={14} />{lang === 'ar' ? 'الربط بالأنشطة' : 'Activity assignment'}</button>
        </div>
      </div>
      {view === 'register' ? (
        <React.Fragment>
          <div className="d-fig-row" >
            <div className="d-fig"><div className="k">{lang === 'ar' ? 'إجمالي قيمة البنود' : 'Total BOQ value'}</div><div className="v">{window.fmtNum(totalContracted)}<small>IQD</small></div></div>
            <div className="d-fig"><div className="k">{lang === 'ar' ? 'قيمة المنفذ' : 'Executed value'}</div><div className="v">{window.fmtNum(Math.round(totalAchieved))}<small>IQD</small></div></div>
          </div>
          <div className="d-card-sub">
            <table className="d-line-table">
              <thead><tr><th>#</th><th>{lang === 'ar' ? 'كود البند' : 'Item code'}</th><th>{lang === 'ar' ? 'البند' : 'Item'}</th><th>{lang === 'ar' ? 'الوحدة' : 'Unit'}</th><th>{lang === 'ar' ? 'كمية تعاقدية' : 'Contracted'}</th><th title={lang === 'ar' ? 'مُحتسبة من إنجاز الأنشطة المرتبطة عبر نسب التخصيص' : 'Calculated from linked activities\u2019 progress via allocation %'}>{lang === 'ar' ? 'نسبة التنفيذ' : 'Executed %'}</th><th>{lang === 'ar' ? 'السعر' : 'Price'}</th><th>{lang === 'ar' ? 'الإجمالي' : 'Total'}</th><th title={lang === 'ar' ? 'مبلغ البند \u00f7 إجمالي كل بنود الكميات المستوردة' : 'BOQ amount \u00f7 total of all imported BOQs'}>{lang === 'ar' ? 'وزن البند' : 'BOQ weight'}</th><th></th></tr></thead>
              <tbody>{rows.map((r, i) => {
                const g = progressByNo[r.no];
                const pct = g ? Math.round(g.boqProgress) : 0;
                if (editIdx === i) return (
                  <tr key={i}>
                    <td className="mono">{r.no}</td>
                    <td className="mono d-cell-sub">{r.code}</td>
                    <td><input className="d-form-input" style={{ height: 32, fontSize: 12 }} value={eNm} onChange={e => setENm(e.target.value)} /></td>
                    <td><input className="d-form-input" style={{ height: 32, fontSize: 12, width: 60 }} value={eUnit} onChange={e => setEUnit(e.target.value)} /></td>
                    <td><input className="d-form-input mono" style={{ height: 32, fontSize: 12, width: 90 }} value={eQty} onChange={e => setEQty(e.target.value.replace(/\D/g, ''))} /></td>
                    <td className="d-cell-sub">—</td>
                    <td><input className="d-form-input mono" style={{ height: 32, fontSize: 12, width: 100 }} value={ePrice} onChange={e => setEPrice(e.target.value.replace(/\D/g, ''))} /></td>
                    <td className="mono d-cell-sub">{window.fmtNum((parseInt(eQty, 10) || 0) * (parseInt(ePrice, 10) || 0))}</td>
                    <td className="d-cell-sub">—</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button className="d-icon-btn" title={lang === 'ar' ? 'حفظ' : 'Save'} onClick={saveEdit}><Icon name="check" size={15} style={{ color: 'var(--on-surface)' }} /></button>
                        <button className="d-icon-btn" title={lang === 'ar' ? 'إلغاء' : 'Cancel'} onClick={cancelEdit}><Icon name="close" size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
                return (
                  <tr key={i}>
                    <td className="mono">{r.no}</td><td className="mono d-cell-sub">{r.code}</td><td>{r.item}</td><td className="mono">{r.unit}</td><td className="mono">{window.fmtNum(r.contractedQty)}</td>
                    <td style={{ minWidth: 110 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="d-tl-mini-track" style={{ flex: 1 }}><span className="d-tl-mini-fill" style={{ width: pct + '%', background: 'var(--azure-500)' }}></span></div>
                        <span className="mono" style={{ fontSize: 11.5 }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="mono">{window.fmtNum(r.price)}</td><td className="mono">{window.fmtNum(r.total)}</td>
                    <td className="mono" style={{ fontWeight: 'var(--fw-bold)' }}>{weights[i]}%</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {delIdx === i ? (
                          <React.Fragment>
                            <span className="d-cell-sub" style={{ marginInlineEnd: 2 }}>{lang === 'ar' ? 'تأكيد الحذف؟' : 'Delete?'}</span>
                            <button className="d-icon-btn" title={lang === 'ar' ? 'تأكيد' : 'Confirm'} onClick={() => removeRow(i)}><Icon name="check" size={15} style={{ color: 'var(--error)' }} /></button>
                            <button className="d-icon-btn" title={lang === 'ar' ? 'إلغاء' : 'Cancel'} onClick={() => setDelIdx(null)}><Icon name="close" size={15} /></button>
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            <button className="d-icon-btn" title={lang === 'ar' ? 'تعديل' : 'Edit'} onClick={() => startEdit(i)}><Icon name="edit" size={15} /></button>
                            <button className="d-icon-btn" title={lang === 'ar' ? 'حذف' : 'Delete'} onClick={() => setDelIdx(i)}><Icon name="delete" size={15} style={{ color: 'var(--error)' }} /></button>
                          </React.Fragment>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
              <tfoot><tr style={{ background: 'var(--surface-container-low)' }}>
                <td colSpan={8} style={{ textAlign: 'end', fontWeight: 'var(--fw-x)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--on-surface-variant)' }}>{lang === 'ar' ? 'إجمالي الوزن' : 'Total weight'}</td>
                <td className="mono" style={{ fontWeight: 'var(--fw-x)', color: 'var(--primary)' }}>{weights.reduce((a, w) => a + w, 0)}%</td>
                <td></td>
              </tr></tfoot>
            </table>
            {adding ? (
              <div className="d-add-inline">
                <input placeholder={lang === 'ar' ? 'اسم البند' : 'Item name'} value={nm} onChange={e => setNm(e.target.value)} style={{ flex: 2 }} />
                <input placeholder={lang === 'ar' ? 'الوحدة' : 'Unit'} value={unit} onChange={e => setUnit(e.target.value)} style={{ width: 70 }} />
                <input placeholder={lang === 'ar' ? 'الكمية' : 'Qty'} value={qty} onChange={e => setQty(e.target.value.replace(/\D/g, ''))} style={{ width: 90 }} />
                <input placeholder={lang === 'ar' ? 'السعر' : 'Price'} value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} style={{ width: 110 }} />
                <span className="d-cell-sub mono" style={{ whiteSpace: 'nowrap' }} title={lang === 'ar' ? 'يُحسب تلقائياً بعد الإضافة' : 'Auto-calculated after adding'}>{lang === 'ar' ? 'الوزن' : 'Wt'} {(() => { const dt = (parseInt(qty, 10) || 0) * (parseInt(price, 10) || 0); const nt = totalContracted + dt; return dt && nt ? Math.round(dt / nt * 100) : 0; })()}%</span>
                <button className="d-btn primary sm" onClick={addRow}><Icon name="check" size={15} />{t('save')}</button>
                <button className="d-btn sm ghost" onClick={() => setAdding(false)}><Icon name="close" size={15} /></button>
              </div>
            ) : (
              <button className="d-add-trigger" onClick={() => { setAdding(true); setEditIdx(null); }}>
                <Icon name="add" size={16} />{t('add_boq_row')}
              </button>
            )}
          </div>
        </React.Fragment>
      ) : <DBOQAssignment lang={lang} showToast={showToast} boqs={boqs} activities={activities} groups={groups} links={links} setLinks={setLinks} basis={basis} setBasis={setBasis} allocOverrides={allocOverrides} setAllocOverrides={setAllocOverrides} actPct={actPct} setActPct={setActPct} />}
    </React.Fragment>
  );
}

const ASSIGN_STATUS = {
  full: { ar: 'مخصص بالكامل', en: 'Fully allocated', icon: 'check_circle', pill: 'completed' },
  partial: { ar: 'تخصيص جزئي', en: 'Partially allocated', icon: 'warning', pill: 'suspended' },
  over: { ar: 'تخصيص زائد', en: 'Over allocated', icon: 'error', pill: 'stalled' },
  unassigned: { ar: 'غير مخصص', en: 'Unassigned', icon: 'radio_button_unchecked', pill: 'withdrawn' },
};
function defaultBOQLinks(boqs, activities) {
  const has = id => activities.some(a => a.id === id);
  const map = { 1: ['A2'], 2: ['A3', 'A4', 'A5'], 3: ['A5', 'A8'], 4: ['A8'], 5: ['A6', 'A7'] };
  const out = [];
  boqs.forEach(b => (map[b.no] || []).forEach(id => { if (has(id)) out.push({ boqNo: b.no, activityId: id }); }));
  return out;
}
function computeBOQGroups(boqs, activities, links, allocOverrides, actPct, basis) {
  const wAbs = a => basis === 'manhours' ? a.wMHAbs : a.wCostAbs;
  const pctOf = a => actPct[a.id] != null ? actPct[a.id] : a.pct;
  const linkedIdsOf = no => links.filter(l => l.boqNo === no).map(l => l.activityId);
  return boqs.map(b => {
    const linked = activities.filter(a => linkedIdsOf(b.no).includes(a.id));
    const sumW = linked.reduce((s, a) => s + wAbs(a), 0);
    const ov = allocOverrides[b.no];
    const arows = linked.map(a => {
      const auto = sumW ? wAbs(a) / sumW * 100 : 0;
      const manual = ov && ov[a.id] != null;
      const share = manual ? ov[a.id] : auto;
      return { a, share, manual, assigned: b.total * share / 100, pct: pctOf(a) };
    }).sort((x, y) => y.share - x.share);
    const sumShare = arows.reduce((s, r) => s + r.share, 0);
    const status = linked.length === 0 ? 'unassigned' : Math.abs(sumShare - 100) < 0.5 ? 'full' : sumShare < 100 ? 'partial' : 'over';
    const boqProgress = arows.reduce((s, r) => s + r.share / 100 * r.pct, 0);
    const achievedAmount = b.total * boqProgress / 100;
    const achievedQty = b.contractedQty * boqProgress / 100;
    return { b, arows, sumShare, status, boqProgress, achievedAmount, achievedQty, remaining: b.total - achievedAmount };
  });
}

/* BOQ <-> Activity assignment: allocation driven by schedule Absolute Weight; manually editable and saved per BOQ. */
function DBOQAssignment({ lang, showToast, boqs, activities, groups, links, setLinks, basis, setBasis, allocOverrides, setAllocOverrides, actPct, setActPct }) {
  const AR = lang === 'ar';
  const [openBoq, setOpenBoq] = React.useState(null);
  const [pickFor, setPickFor] = React.useState({});
  const wAbs = a => basis === 'manhours' ? a.wMHAbs : a.wCostAbs;
  const linkedIdsOf = no => links.filter(l => l.boqNo === no).map(l => l.activityId);
  const addLink = (no, id) => { if (!id) return; setLinks(ls => ls.some(l => l.boqNo === no && l.activityId === id) ? ls : [...ls, { boqNo: no, activityId: id }]); setPickFor(m => ({ ...m, [no]: '' })); };
  const removeLink = (no, id) => setLinks(ls => ls.filter(l => !(l.boqNo === no && l.activityId === id)));
  const [editingAlloc, setEditingAlloc] = React.useState(null);
  const [draftAlloc, setDraftAlloc] = React.useState({});
  const startEditAlloc = (no, arows) => { const d = {}; arows.forEach(r => { d[r.a.id] = r.share.toFixed(1); }); setDraftAlloc(d); setEditingAlloc(no); };
  const cancelEditAlloc = () => { setEditingAlloc(null); setDraftAlloc({}); };
  const saveAlloc = (no) => {
    const vals = {};
    Object.keys(draftAlloc).forEach(id => { const v = parseFloat(draftAlloc[id]); vals[id] = isNaN(v) ? 0 : v; });
    setAllocOverrides(m => ({ ...m, [no]: vals }));
    setEditingAlloc(null); setDraftAlloc({});
    showToast(AR ? 'تم حفظ التخصيص' : 'Allocation saved');
  };
  const resetAlloc = (no) => setAllocOverrides(m => { const c = { ...m }; delete c[no]; return c; });
  const counts = groups.reduce((c, g) => { c[g.status] = (c[g.status] || 0) + 1; return c; }, {});

  return (
    <React.Fragment>
      <div className="d-callout">
        <span className="d-callout-ico"><Icon name="hub" size={18} /></span>
        <div className="d-callout-tx">
          <span className="k">{AR ? 'كيف يُحسب التخصيص' : 'How allocation is calculated'}</span>
          <b style={{ fontSize: 12, fontWeight: 400 }}>{AR
            ? 'يُوزَّع مبلغ كل بند تلقائياً على الأنشطة المرتبطة به حسب وزنها المطلق في الجدول. يمكن تعديل نسب التخصيص يدوياً لكل بند ثم حفظها — الحالة تُحسب من مجموع نسب التخصيص المحفوظة: 100% = مخصص بالكامل، أقل = تخصيص جزئي، أكثر = تخصيص زائد. المبلغ المحقَّق والكمية المحقَّقة هنا يُحسبان من (نسبة التخصيص × إنجاز النشاط)، وهذا الرقم نفسه يغذّي عمود "نسبة التنفيذ" في السجل.'
            : 'Each BOQ amount is auto-distributed across its linked activities by their Absolute Weight in the schedule. Allocation % can be manually edited per BOQ and saved — status is calculated from the saved allocation total: 100% = fully allocated, less = partially allocated, more = over allocated. Achieved amount and quantity here are computed from allocation % times activity progress, and the same figure feeds the register’s Executed % column.'}</b>
        </div>
      </div>
      <div className="d-model-topbar" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['full', 'partial', 'over', 'unassigned'].map(k => {
            const M = ASSIGN_STATUS[k];
            return <span key={k} className={`d-pill ${M.pill}`}><Icon name={M.icon} size={12} />{counts[k] || 0} {M[lang]}</span>;
          })}
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="d-seg">
          <button className={basis === 'cost' ? 'on' : ''} onClick={() => setBasis('cost')}><Icon name="payments" size={13} />{AR ? 'الكلفة' : 'Cost'}</button>
          <button className={basis === 'manhours' ? 'on' : ''} onClick={() => setBasis('manhours')}><Icon name="schedule" size={13} />{AR ? 'ساعات العمل' : 'Man-hours'}</button>
        </div>
      </div>
      <div className="d-card-sub" style={{ marginTop: 10 }}>
        {groups.map(g => {
          const M = ASSIGN_STATUS[g.status];
          return (
            <button key={g.b.no} className="d-openrow" onClick={() => setOpenBoq(g.b.no)}>
              <span className="om" style={{ flex: '2 1 0' }}>
                <b>{g.b.item}</b>
                <span>{window.fmtNum(g.b.total)} IQD · {AR ? 'وزن البند' : 'BOQ wt'} {g.b.weight}% · {g.arows.length} {AR ? 'نشاط' : 'activities'}</span>
              </span>
              <span className={`d-pill ${M.pill}`} style={{ flex: 'none' }}><Icon name={M.icon} size={12} />{M[lang]}</span>
              <span style={{ flex: '0 0 130px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className="d-tl-mini-track"><span className="d-tl-mini-fill" style={{ width: Math.min(100, g.boqProgress) + '%', background: 'var(--azure-500)' }}></span></span>
                <span className="mono d-cell-sub">{AR ? 'الإنجاز' : 'Progress'} {g.boqProgress.toFixed(0)}%</span>
              </span>
              <span className="mono d-cell-sub" style={{ flex: '0 0 120px', textAlign: 'end' }}>{window.fmtNum(Math.round(g.achievedAmount))}</span>
              <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={17} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
            </button>
          );
        })}
      </div>
      {(() => {
        const g = groups.find(x => x.b.no === openBoq);
        if (!g) return null;
        const M = ASSIGN_STATUS[g.status];
        const editing = editingAlloc === g.b.no;
        const unlinked = activities.filter(a => !linkedIdsOf(g.b.no).includes(a.id));
        return (
          <DDrawer wide onClose={() => { cancelEditAlloc(); setOpenBoq(null); }}
            title={g.b.item}
            sub={`${window.fmtNum(g.b.total)} IQD · ${AR ? 'وزن البند' : 'BOQ wt'} ${g.b.weight}%`}
            footer={editing
              ? <React.Fragment>
                  <button className="d-btn" onClick={cancelEditAlloc}>{AR ? 'إلغاء' : 'Cancel'}</button>
                  <button className="d-btn primary" onClick={() => saveAlloc(g.b.no)}><Icon name="check" size={14} />{AR ? 'حفظ التخصيص' : 'Save allocation'}</button>
                </React.Fragment>
              : <React.Fragment>
                  {allocOverrides[g.b.no] && <button className="d-btn" onClick={() => resetAlloc(g.b.no)}><Icon name="undo" size={14} />{AR ? 'إعادة تلقائي' : 'Reset to automatic'}</button>}
                  {g.arows.length > 0 && <button className="d-btn primary" onClick={() => startEditAlloc(g.b.no, g.arows)}><Icon name="edit" size={14} />{AR ? 'تعديل التخصيص' : 'Edit allocation'}</button>}
                </React.Fragment>}>
            <DDrawerGrp label={AR ? 'حالة التخصيص' : 'Allocation status'}>
              <div className="d-fig-row" style={{ marginBottom: 0 }}>
                <div className="d-fig"><div className="k">{AR ? 'مجموع التخصيص' : 'Allocated'}</div><div className="v mono">{g.sumShare.toFixed(1)}%</div></div>
                <div className="d-fig"><div className="k">{AR ? 'إنجاز البند' : 'BOQ progress'}</div><div className="v mono">{g.boqProgress.toFixed(0)}%</div></div>
              </div>
              <span className={`d-pill ${M.pill}`} style={{ alignSelf: 'flex-start' }}><Icon name={M.icon} size={12} />{M[lang]}</span>
            </DDrawerGrp>
            <DDrawerGrp label={AR ? 'الأنشطة المرتبطة' : 'Linked activities'}>
              {g.arows.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{g.arows.map(r => (
                  <div className="d-alloc" key={r.a.id}>
                    <div className="d-alloc-top">
                      <span className="nm"><span className="id">{r.a.id}</span>{r.a.name}</span>
                      <button className="d-icon-btn" title={AR ? 'إلغاء الربط' : 'Unlink'} onClick={() => removeLink(g.b.no, r.a.id)} style={{ flex: 'none' }}><Icon name="close" size={14} /></button>
                    </div>
                    <div className="d-alloc-meta">
                      <span className="kv">{AR ? 'الوزن المطلق' : 'Abs. wt'} <b>{wAbs(r.a).toFixed(2)}%</b></span>
                      <span className="kv">{AR ? 'التخصيص' : 'Alloc.'} {editing
                        ? <input type="number" step="0.1" value={draftAlloc[r.a.id] ?? ''} onChange={e => setDraftAlloc(dd => ({ ...dd, [r.a.id]: e.target.value }))} className="d-form-input mono" style={{ height: 28, fontSize: 12 }} />
                        : <b className="pri">{r.share.toFixed(1)}%{r.manual && <span title={AR ? 'مُعدَّل يدوياً' : 'Manually edited'}> *</span>}</b>}</span>
                      <span className="kv">{AR ? 'المبلغ' : 'Amount'} <b>{window.fmtNum(Math.round(r.assigned))}</b></span>
                    </div>
                    <div className="d-alloc-prog">
                      <span className="d-cell-sub" style={{ fontSize: 11 }}>{AR ? 'الإنجاز' : 'Progress'}</span>
                      <input type="range" min="0" max="100" value={r.pct} onChange={e => setActPct(m => ({ ...m, [r.a.id]: parseInt(e.target.value, 10) }))} />
                      <span className="pv">{r.pct}%</span>
                    </div>
                  </div>
                ))}</div>
              ) : <span className="d-cell-sub">{AR ? 'لا توجد أنشطة مرتبطة بعد.' : 'No activities linked yet.'}</span>}
            </DDrawerGrp>
            <DDrawerGrp label={AR ? 'ربط نشاط جديد' : 'Link an activity'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select className="d-form-input" style={{ height: 34, flex: 1 }} value={pickFor[g.b.no] || ''} onChange={e => setPickFor(m => ({ ...m, [g.b.no]: e.target.value }))}>
                  <option value="">{AR ? 'اختر نشاطاً لربطه…' : 'Select an activity to link…'}</option>
                  {unlinked.map(a => <option key={a.id} value={a.id}>{a.id} — {a.name} ({wAbs(a).toFixed(2)}%)</option>)}
                </select>
                <button className="d-btn sm primary" disabled={!pickFor[g.b.no]} onClick={() => addLink(g.b.no, pickFor[g.b.no])}><Icon name="add" size={14} />{AR ? 'ربط' : 'Link'}</button>
              </div>
              <span className="d-cell-sub" style={{ fontSize: 11.5 }}><Icon name="functions" size={12} style={{ verticalAlign: -2 }} /> {AR ? `المحقَّق: ${window.fmtNum(Math.round(g.achievedQty))} ${g.b.unit} و${window.fmtNum(Math.round(g.achievedAmount))} د.ع — المتبقي: ${window.fmtNum(Math.round(g.remaining))} د.ع.` : `Achieved: ${window.fmtNum(Math.round(g.achievedQty))} ${g.b.unit} · ${window.fmtNum(Math.round(g.achievedAmount))} IQD — remaining: ${window.fmtNum(Math.round(g.remaining))} IQD.`}</span>
            </DDrawerGrp>
          </DDrawer>
        );
      })()}
    </React.Fragment>
  );
}
const VO_STAGE_STATE = {
  done: { ar: 'مكتمل', en: 'Done', icon: 'check_circle', color: 'var(--on-surface)' },
  active: { ar: 'قيد التدقيق', en: 'Active', icon: 'pending', color: 'var(--info)' },
  overdue: { ar: 'متجاوز السقف', en: 'SLA exceeded', icon: 'error', color: 'var(--error)' },
  rejected: { ar: 'مُعاد', en: 'Returned', icon: 'undo', color: 'var(--error)' },
  pending: { ar: 'بالانتظار', en: 'Pending', icon: 'radio_button_unchecked', color: 'var(--on-surface-variant)' },
};

function DVOStageTimeline({ v, lang }) {
  const AR = lang === 'ar';
  return (
    <div className="d-vo-stages">
      {v.stages.map((s, i) => {
        const S = VO_STAGE_STATE[s.status];
        const over = s.status === 'overdue' || (s.status === 'done' && s.elapsed > s.sla);
        return (
          <div key={i} className={`d-vo-stage ${s.status}`}>
            <div className="d-vo-stage-rail"><span className="dot" style={{ background: S.color }}><Icon name={S.icon} size={12} /></span>{i < v.stages.length - 1 && <span className="bar" style={{ background: s.status === 'done' ? 'var(--on-surface)' : 'var(--outline-variant)' }}></span>}</div>
            <div className="d-vo-stage-body">
              <div className="hd"><b>{s.label}</b><span className="d-pill" style={{ background: 'color-mix(in srgb,' + S.color + ' 14%,transparent)', color: TXC(S.color) }}>{S[lang]}</span></div>
              <div className="mt d-cell-sub">{s.owner} · {AR ? 'السقف' : 'SLA'} {s.sla}{AR ? 'ي' : 'd'}{(s.status === 'done' || s.status === 'active' || s.status === 'overdue') && <span style={{ color: over ? 'var(--error)' : 'var(--on-surface-variant)', fontWeight: over ? 'var(--fw-bold)' : 'inherit' }}> · {AR ? 'المستغرق' : 'elapsed'} {s.elapsed}{AR ? 'ي' : 'd'}</span>}{s.doneDate && <span className="mono"> · {s.doneDate}</span>}</div>
              {s.decision && <div className="mt" style={{ fontSize: 11.5, color: s.status === 'overdue' || s.status === 'rejected' ? 'var(--error)' : 'var(--on-surface-variant)' }}>{s.decision}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DModVO({ t, lang, d, p, showToast }) {
  const AR = lang === 'ar';
  const [rows, setRows] = React.useState(d.variationOrders.map(v => ({ ...v, attachments: [...(v.attachments || [])] })));
  const [note, setNote] = React.useState(false);
  const [openNo, setOpenNo] = React.useState(null);
  const [showCreate, setShowCreate] = React.useState(false);
  // activities for the wizard's schedule picker — read from the same schedule engine the Gantt uses
  const voActs = React.useMemo(() => (showCreate && p ? window.EPM.buildScheduleData(p, lang).activities : []), [showCreate, p && p.id, lang]);
  const fileRef = React.useRef(null);
  const pendingUpload = React.useRef(null);
  const act = (no, st) => {
    setRows(rs => rs.map(r => r.no === no ? { ...r, status: st, stages: r.stages.map(s => ({ ...s, status: st === 'approved' ? 'done' : (s.status === 'active' || s.status === 'overdue' ? 'rejected' : s.status) })) } : r));
    if (st === 'approved') { setNote(true); showToast(AR ? 'تم الاعتماد النهائي' : 'Final endorsement done'); }
    else showToast(AR ? 'أُعيد بملاحظات' : 'Returned with notes');
  };
  const kindIco = { pdf: 'picture_as_pdf', image: 'image', sheet: 'table_view', doc: 'description' };
  const addAttach = (no) => { pendingUpload.current = no; fileRef.current && fileRef.current.click(); };
  const onFile = (e) => {
    const no = pendingUpload.current; const f = e.target.files && e.target.files[0];
    const nm = f ? f.name : 'evidence.pdf';
    const ext = nm.split('.').pop().toLowerCase();
    const kind = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) ? 'image' : ['xls', 'xlsx', 'csv'].includes(ext) ? 'sheet' : ext === 'pdf' ? 'pdf' : 'doc';
    setRows(rs => rs.map(r => r.no === no ? { ...r, attachments: [{ name: AR ? 'مستند مرفوع' : 'Uploaded evidence', file: nm, kind, size: f ? (Math.max(1, Math.round(f.size / 1024)) + ' KB') : '—', by: AR ? 'أنت' : 'You', date: '2026-07-23' }, ...r.attachments] } : r));
    showToast(AR ? 'تم إرفاق المستند' : 'Evidence attached');
    if (e.target) e.target.value = '';
  };
  const approvedSum = rows.filter(r => r.status === 'approved').reduce((a, r) => a + r.net, 0);
  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const escalated = rows.filter(r => r.slaExceeded).length;
  const NOW = new Date('2026-07-22');
  const leadOf = v => Math.max(0, Math.round((NOW - new Date(v.inDate)) / 86400000));
  const leadTone = dys => dys > 14 ? 'var(--error)' : dys > 7 ? 'var(--warning)' : 'var(--on-surface)';
  const pend = rows.filter(r => r.status === 'pending');
  const avgLead = pend.length ? Math.round(pend.reduce((a, v) => a + leadOf(v), 0) / pend.length) : 0;
  const dl = (a, b) => <div className="d-dl-i"><span className="k">{a}</span><span className="v mono">{b}</span></div>;
  // role-based access + escalation: the actor for a pending order is the active stage's owner,
  // unless its SLA is exceeded — then it escalates to the senior manager (§2.3.2.1 / §2.3.3.1).
  const MANAGER = AR ? 'المستوى الإداري الأعلى' : 'Senior manager';
  const ROLES = [...(rows[0] ? rows[0].stages.map(s => s.owner) : []), MANAGER];
  const actorOf = v => v.status !== 'pending' ? null : (v.slaExceeded ? MANAGER : ((v.stages.find(s => s.key === v.activeStage) || {}).owner || null));
  // current role follows the pre-built workflow — default to the stage owner the workflow is currently waiting on
  const firstPending = rows.find(r => r.status === 'pending');
  const workflowActor = (firstPending && actorOf(firstPending)) || ROLES[0];
  const [role, setRole] = React.useState(workflowActor);
  const [voTab, setVoTab] = React.useState('workflow');
  React.useEffect(() => { const h = () => setShowCreate(true); window.addEventListener('epm:vo-create', h); return () => window.removeEventListener('epm:vo-create', h); }, []);
  return (
    <React.Fragment>
      <input type="file" ref={fileRef} onChange={onFile} style={{ display: 'none' }} />
      {showCreate && <DVOCreateWizard lang={lang} contract={d.contract} boq={d.boq} acts={voActs}
        onClose={() => setShowCreate(false)}
        onDraft={() => { setShowCreate(false); showToast(AR ? 'حُفظ الأمر التغييري كمسودة' : 'Change order saved as draft'); }}
        onDone={() => { setShowCreate(false); showToast(AR ? 'أُرسل الأمر التغييري للمراجعة' : 'Change order sent for review'); }} />}
      <div className="d-model-topbar">
        <div className="d-section-title" style={{ margin: 0 }}>{t('mod_changeorders')}</div>
        <div style={{ flex: 1 }}></div>
      </div>
      <div className="d-fig-row" >
        <div className="d-fig"><div className="k">{AR ? 'صافي المعتمد' : 'Net approved'}</div><div className="v mono">{Math.round(approvedSum / 1e6)}<small>M</small></div></div>
        <div className="d-fig"><div className="k">{AR ? 'قيد الاعتماد' : 'Pending'}</div><div className="v">{pendingCount}</div></div>
        <div className="d-fig"><div className="k">{AR ? 'مُصعّدة' : 'Escalated'}</div><div className="v" style={{ color: escalated ? 'var(--error)' : 'var(--on-surface)' }}>{escalated}</div></div>
        <div className="d-fig"><div className="k">{AR ? 'إجمالي الأوامر' : 'Total orders'}</div><div className="v">{rows.length}</div></div>
        <div className="d-fig"><div className="k" title="Transaction Lead Time">{AR ? 'معدل دوران المعاملة' : 'Transaction lead time'}</div><div className="v" style={{ color: leadTone(avgLead) }}>{avgLead}<small>{AR ? ' يوم' : ' d'}</small></div></div>
      </div>
      {note && <div className="d-card-sub" style={{ padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="verified" size={16} />{t('vo_recalc_note')}</div>}

      {!openNo && (() => {
        const pend = rows.filter(v => v.status === 'pending');
        const closed = rows.filter(v => v.status !== 'pending');
        const openDetail = no => { setOpenNo(no); setVoTab('workflow'); };
        return (<React.Fragment>
          <div className="d-section-title">{AR ? 'بحاجة إجراء' : 'Needs action'} {pend.length ? '· ' + pend.length : ''}</div>
          <div className="d-card-sub">
            {pend.length === 0 && <div style={{ padding: '14px', fontSize: 12, color: 'var(--on-surface-variant)' }}><Icon name="check_circle" size={15} style={{ verticalAlign: -2, color: 'var(--on-surface)', marginInlineEnd: 6 }} />{AR ? 'لا توجد أوامر قيد الاعتماد' : 'No orders pending approval'}</div>}
            {pend.map((v, i) => {
              const activeSt = v.stages.find(s => s.key === v.activeStage);
              const actor = actorOf(v);
              return (
                <button key={v.no} className="d-vo-row" style={{ borderBottom: i < pend.length - 1 ? '1px solid var(--surface-container-high)' : 'none' }} onClick={() => openDetail(v.no)}>
                  <span className="d-vo-emblem" style={{ background: 'color-mix(in srgb,var(--warning) 14%,transparent)', color: 'var(--status-suspended-tx)' }}><Icon name="pending" size={18} /></span>
                  <div className="d-vo-main">
                    <span className="no">{v.no} · {v.date} · {v.inNo} · <span style={{ color: 'var(--on-surface-variant)' }}>{v.type === 'supply' ? (AR ? 'تجهيز' : 'Supply') : (AR ? 'هندسي' : 'Engineering')}</span></span>
                    <span className="reason">{v.reason}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11.5, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--azure-600)' }}><Icon name="attach_file" size={12} />{v.attachments.length}</span>
                      {v.affectsCP && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--on-surface)' }}><Icon name="priority_high" size={12} />{AR ? 'المسار الحرج' : 'Critical path'}</span>}
                      {activeSt && <React.Fragment><i style={{ width: 8, height: 8, borderRadius: 9, background: v.slaExceeded ? 'var(--error)' : 'var(--warning)' }}></i><span style={{ color: v.slaExceeded ? 'var(--error)' : 'var(--warning)', fontWeight: 'var(--fw-bold)' }}>{v.slaExceeded ? (AR ? 'مُصعّد: ' : 'Escalated: ') + actor : activeSt.label}</span></React.Fragment>}
                    </span>
                  </div>
                  <span className="d-vo-val mono">{window.fmtNum(v.net)} IQD</span>
                  <span className="d-pill" style={{ background: 'color-mix(in srgb,var(--warning) 14%,transparent)', color: 'var(--status-suspended-tx)' }}>{AR ? 'قيد الاعتماد' : 'Pending'}</span>
                  <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={18} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
                </button>
              );
            })}
          </div>

          <div className="d-section-title">{AR ? 'المعتمدة والمغلقة' : 'Approved & closed'} {closed.length ? '· ' + closed.length : ''}</div>
          <div className="d-card-sub" style={{ overflowX: 'auto' }}>
            <table className="d-line-table d-vo-closed">
              <thead><tr><th>{AR ? 'الرقم' : 'No.'}</th><th>{AR ? 'السبب' : 'Reason'}</th><th>{AR ? 'النوع' : 'Type'}</th><th>{AR ? 'التاريخ' : 'Date'}</th><th>{AR ? 'الصافي' : 'Net'}</th><th>{AR ? 'الحالة' : 'Status'}</th><th></th></tr></thead>
              <tbody>{closed.map((v, i) => { const st = window.EPM.VO_STATUS[v.status]; return (
                <tr key={v.no} style={{ cursor: 'pointer' }} onClick={() => openDetail(v.no)}>
                  <td className="mono">{v.no}</td>
                  <td className="d-cell-strong">{v.reason}</td>
                  <td className="d-cell-sub">{v.type === 'supply' ? (AR ? 'تجهيز' : 'Supply') : (AR ? 'هندسي' : 'Engineering')}</td>
                  <td className="mono d-cell-sub">{v.date}</td>
                  <td className="mono">{window.fmtNum(v.net)}</td>
                  <td><span className={`d-pill ${v.status === 'approved' ? 'completed' : 'stalled'}`}>{st[lang]}</span></td>
                  <td><Icon name={AR ? 'chevron_left' : 'chevron_right'} size={16} style={{ color: 'var(--on-surface-variant)' }} /></td>
                </tr>
              ); })}</tbody>
            </table>
          </div>
        </React.Fragment>);
      })()}

      {openNo && (() => {
        const v = rows.find(r => r.no === openNo); if (!v) return null;
        const st = window.EPM.VO_STATUS[v.status];
        const actor = actorOf(v);
        const canAct = v.status === 'pending' && role === actor;
        const es = v.slaExceeded ? v.stages.find(s => s.status === 'overdue') : null;
        const TABS = [
          { id: 'workflow', ic: 'account_tree', lbl: AR ? 'المسار' : 'Workflow' },
          { id: 'values', ic: 'payments', lbl: AR ? 'القيمة والمدة' : 'Value & time' },
          { id: 'impact', ic: 'difference', lbl: AR ? 'الأثر' : 'Impact' },
          { id: 'files', ic: 'attach_file', lbl: (AR ? 'المرفقات' : 'Files') + ' (' + v.attachments.length + ')' },
          { id: 'history', ic: 'history', lbl: AR ? 'السجل' : 'History' },
        ];
        return (
          <div className="d-vo-detail">
            <div className="d-vo-detail-head">
              <button className="d-btn sm ghost" onClick={() => setOpenNo(null)}><Icon name={AR ? 'arrow_forward' : 'arrow_back'} size={16} />{AR ? 'السجل' : 'Register'}</button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><b style={{ fontSize: 15 }}>{v.no}</b><span className="d-cell-sub">{v.type === 'supply' ? (AR ? 'تجهيز' : 'Supply') : (AR ? 'هندسي' : 'Engineering')}</span>{v.status === 'pending' ? <span className="d-pill" style={{ background: 'color-mix(in srgb,var(--warning) 14%,transparent)', color: 'var(--status-suspended-tx)' }}>{AR ? 'قيد الاعتماد' : 'Pending'}</span> : <span className={`d-pill ${v.status === 'approved' ? 'completed' : 'stalled'}`}>{st[lang]}</span>}</div>
                <div className="reason" style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }}>{v.reason} · {v.inNo} · {v.date}</div>
              </div>
              <div style={{ textAlign: 'end' }}><div className="mono" style={{ fontSize: 15, fontWeight: 'var(--fw-x)' }}>{window.fmtNum(v.net)}</div><div className="d-cell-sub" style={{ fontSize: 11 }}>IQD · {AR ? 'صافي' : 'net'}</div></div>
              {v.status === 'pending' && (canAct ? (
                <div className="d-vo-actions">
                  <button className="d-btn sm" onClick={() => { act(v.no, 'approved'); setOpenNo(null); }}><Icon name="check" size={14} />{v.slaExceeded ? (AR ? 'اعتماد (تصعيد)' : 'Approve (escalated)') : t('approve')}</button>
                  <button className="d-btn sm ghost" onClick={() => { act(v.no, 'rejected'); setOpenNo(null); }}><Icon name="close" size={14} />{t('reject')}</button>
                </div>
              ) : <span className="d-pill" style={{ background: 'color-mix(in srgb,var(--warning) 14%,transparent)', color: 'var(--status-suspended-tx)' }}><Icon name="lock" size={12} style={{ marginInlineEnd: 3 }} />{AR ? 'بانتظار: ' : 'Awaiting: '}{actor}</span>)}
            </div>

            {es && <div className="d-callout" style={{ margin: '0 16px 12px', borderColor: 'var(--error)', background: 'color-mix(in srgb,var(--error) 6%,transparent)' }}><span className="d-callout-ico" style={{ background: 'var(--error)', color: '#fff' }}><Icon name="trending_up" size={18} /></span><div className="d-callout-tx"><span className="k" style={{ color: 'var(--error)' }}>{AR ? 'تصعيد تلقائي للمستوى الإداري الأعلى' : 'Auto-escalated to senior manager'}</span><b style={{ fontSize: 12, fontWeight: 'var(--fw-bold)' }}>{AR ? `تجاوزت مرحلة «${es.label}» سقفها (${es.sla} يوم) بمرور ${es.elapsed} يوم دون إجراء — انتقلت الصلاحية إلى ${MANAGER}.` : `Stage “${es.label}” exceeded its ${es.sla}-day SLA (${es.elapsed}d elapsed) — authority moved to the ${MANAGER}.`}</b></div></div>}

            <div className="d-vo-tabs">{TABS.map(tb => <button key={tb.id} className={voTab === tb.id ? 'on' : ''} onClick={() => setVoTab(tb.id)}><Icon name={tb.ic} size={15} />{tb.lbl}</button>)}</div>

            <div className="d-vo-tabbody">
              {voTab === 'workflow' && <React.Fragment>
                {v.status === 'pending' && <div className="d-callout" style={{ marginBottom: 14 }}><span className="d-callout-ico"><Icon name="badge" size={18} /></span><div className="d-callout-tx"><span className="k">{AR ? 'الإجراء الحالي' : 'Current action'}</span><b style={{ fontSize: 12, fontWeight: 'var(--fw-bold)' }}>{canAct ? (AR ? 'دورك الحالي مخوّل باتخاذ الإجراء على هذه المرحلة.' : 'Your current role is authorized to act on this stage.') : (AR ? `الإجراء متاح لـ «${actor}» فقط. بدّل الدور من الأعلى لتجربته.` : `Action is available to “${actor}” only. Switch role above to try it.`)}</b></div></div>}
                <DVOStageTimeline v={v} lang={lang} />
                {v.status === 'pending' && <div className="d-callout" style={{ marginTop: 14 }}><span className="d-callout-ico"><Icon name="verified_user" size={18} /></span><div className="d-callout-tx"><span className="k">{AR ? 'فصل الصلاحيات' : 'Separation of duties'}</span><b style={{ fontSize: 12, fontWeight: 'var(--fw-bold)' }}>{AR ? 'لا يجوز اعتماد الأمر من مُدخِله — المصادقة من جهة مخوّلة مختلفة، وكل إجراء يُسجّل في سجل التدقيق.' : 'The order cannot be approved by its author — endorsement is by a different authorized party; every action is logged.'}</b></div></div>}
              </React.Fragment>}

              {voTab === 'values' && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="d-grid c2 eqrows">
                  <div className="d-panel"><div className="d-panel-head"><b>{AR ? 'تفصيل القيمة' : 'Value breakdown'}</b></div><div className="d-dl" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px 16px', padding: 14 }}>
                    {dl(AR ? 'القيمة الأصلية' : 'Original', window.fmtNum(v.original))}
                    {dl(AR ? 'الإضافية' : 'Additional', '+' + window.fmtNum(v.additional))}
                    {dl(AR ? 'الحسم' : 'Deduction', '−' + window.fmtNum(v.deduction))}
                    {dl(AR ? 'الصافية' : 'Net', window.fmtNum(v.net))}
                    <div className="d-dl-i" style={{ gridColumn: '1 / -1' }}><span className="k">{AR ? 'قيمة العقد المعدلة' : 'Revised contract value'}</span><span className="v mono" style={{ color: 'var(--primary)', fontWeight: 'var(--fw-x)' }}>{window.fmtNum(v.revisedContract)} IQD</span></div>
                  </div></div>
                  <div className="d-panel"><div className="d-panel-head"><b>{AR ? 'التمديد الزمني والمسار الحرج' : 'Time extension & critical path'}</b></div><div className="d-dl" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px 16px', padding: 14 }}>
                    {dl(AR ? 'التمديد المطلوب' : 'Requested ext.', v.reqExt + (AR ? ' يوم' : ' d'))}
                    {dl(AR ? 'التمديد المعتمد' : 'Approved ext.', v.appExt != null ? v.appExt + (AR ? ' يوم' : ' d') : '—')}
                    <div className="d-dl-i"><span className="k">{AR ? 'تاريخ الإنجاز المعدّل' : 'Revised completion'}</span><span className="v mono" style={{ color: 'var(--error)' }}>{v.revisedCompletion}</span></div>
                    <div className="d-dl-i"><span className="k">{AR ? 'أثر المسار الحرج' : 'Critical-path effect'}</span><span className="v" style={{ color: v.affectsCP ? 'var(--error)' : 'var(--on-surface)' }}>{v.affectsCP ? (AR ? '+' + v.cpDelayDays + ' يوم على المشروع' : '+' + v.cpDelayDays + 'd to project') : (AR ? 'لا يؤثر' : 'No effect')}</span></div>
                  </div></div>
                </div>
                {v.supply && <div><div className="d-vo-subtitle">{AR ? 'إعادة توزيع الكميات (تجهيز)' : 'Quantity redistribution (supply)'}</div><div className="d-card-sub"><table className="d-line-table">
                  <thead><tr><th>{AR ? 'الجهة قبل' : 'From beneficiary'}</th><th>{AR ? 'الجهة بعد' : 'To beneficiary'}</th><th>{AR ? 'الكمية قبل' : 'Qty before'}</th><th>{AR ? 'الكمية بعد' : 'Qty after'}</th></tr></thead>
                  <tbody><tr><td>{v.supply.benFrom}</td><td>{v.supply.benTo}</td><td className="mono">{v.supply.qtyBefore}</td><td className="mono">{v.supply.qtyAfter}</td></tr></tbody>
                </table></div></div>}
              </div>}

              {voTab === 'impact' && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><div className="d-vo-subtitle">{AR ? 'ملخص الأثر — قبل / بعد' : 'Impact summary — before / after'}</div><div className="d-card-sub"><table className="d-line-table">
                  <thead><tr><th>{AR ? 'البند' : 'Item'}</th><th>{AR ? 'قبل' : 'Before'}</th><th>{AR ? 'بعد' : 'After'}</th></tr></thead>
                  <tbody>
                    <tr><td>{AR ? 'قيمة العقد' : 'Contract value'}</td><td className="mono d-cell-sub">{window.fmtNum(d.contract.raw.contractCost)}</td><td className="mono">{window.fmtNum(v.revisedContract)}</td></tr>
                    <tr><td>{AR ? 'تاريخ الإنجاز' : 'Completion date'}</td><td className="mono d-cell-sub">{d.contract.raw.finish}</td><td className="mono" style={{ color: 'var(--error)' }}>{v.revisedCompletion}</td></tr>
                  </tbody>
                </table></div></div>
                <div><div className="d-vo-subtitle">{AR ? 'بنود الكميات المتأثرة' : 'Affected BOQ items'}</div><div className="d-card-sub"><table className="d-line-table">
                  <thead><tr><th>{AR ? 'الرمز' : 'Code'}</th><th>{AR ? 'الوصف' : 'Description'}</th><th>{AR ? 'قبل' : 'Before'}</th><th>{AR ? 'بعد' : 'After'}</th><th>{AR ? 'السعر' : 'Rate'}</th><th>{AR ? 'الفرق' : 'Δ Value'}</th></tr></thead>
                  <tbody>{v.affectedBOQ.map((b, j) => <tr key={j}><td className="mono">{b.code}</td><td>{b.desc}</td><td className="mono">{b.qtyBefore} {b.unit}</td><td className="mono">{b.qtyAfter} {b.unit}</td><td className="mono d-cell-sub">{window.fmtNum(b.rate)}</td><td className="mono" style={{ color: (b.qtyAfter - b.qtyBefore) >= 0 ? 'var(--error)' : 'var(--on-surface)' }}>{(b.qtyAfter - b.qtyBefore) >= 0 ? '+' : ''}{window.fmtNum((b.qtyAfter - b.qtyBefore) * b.rate)}</td></tr>)}</tbody>
                </table></div></div>
                <div><div className="d-vo-subtitle">{AR ? 'أنشطة الجدول المتأثرة' : 'Affected schedule activities'}</div><div className="d-card-sub"><table className="d-line-table">
                  <thead><tr><th>{AR ? 'المعرّف' : 'ID'}</th><th>{AR ? 'النشاط' : 'Activity'}</th><th>{AR ? 'حرج' : 'Critical'}</th><th>{AR ? 'الانزياح' : 'Slip'}</th></tr></thead>
                  <tbody>{v.affectedActivities.map((a, j) => <tr key={j}><td className="mono">{a.id}</td><td>{a.name}</td><td>{a.critical ? <span className="d-pill critical" style={{ height: 18 }}>{AR ? 'حرج' : 'Crit'}</span> : '—'}</td><td className="mono" style={{ color: 'var(--error)' }}>+{a.slip}{AR ? 'ي' : 'd'}</td></tr>)}</tbody>
                </table></div></div>
              </div>}

              {voTab === 'files' && <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}><div className="d-vo-subtitle" style={{ margin: 0 }}>{AR ? 'المرفقات (إثبات)' : 'Attachments (evidence)'}</div><button className="d-btn sm ghost" onClick={() => addAttach(v.no)}><Icon name="upload_file" size={14} />{AR ? 'إرفاق مستند' : 'Attach'}</button></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {v.attachments.map((at, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--outline-variant)', borderRadius: 'var(--r-sm)' }}>
                      <Icon name={kindIco[at.kind] || 'description'} size={18} style={{ color: 'var(--azure-600)', flex: 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 'var(--fw-bold)' }}>{at.name}</div><div className="mono d-cell-sub" style={{ fontSize: 11 }}>{at.file} · {at.size} · {at.by} · {at.date}</div></div>
                      <button className="d-btn sm ghost" onClick={() => showToast(AR ? 'تنزيل — تجريبي' : 'Download — demo')}><Icon name="download" size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>}

              {voTab === 'history' && <div className="d-card-sub"><table className="d-line-table">
                <thead><tr><th>{AR ? 'التاريخ' : 'Date'}</th><th>{AR ? 'الجهة' : 'Actor'}</th><th>{AR ? 'الإجراء' : 'Action'}</th><th>{AR ? 'الملاحظة' : 'Note'}</th></tr></thead>
                <tbody>{v.history.map((h, j) => <tr key={j}><td className="mono">{h.date}</td><td>{h.actor}</td><td className="d-cell-strong">{h.action}</td><td className="d-cell-sub">{h.note}</td></tr>)}</tbody>
              </table></div>}
            </div>
          </div>
        );
      })()}
    </React.Fragment>
  );
}

function DModMeetings({ t, lang, d }) {
  const AR = lang === 'ar';
  const actions = [
    { id: 'ACT-01', task: AR ? 'تسريع أعمال الكهرباء' : 'Accelerate electrical works', owner: AR ? 'المقاول' : 'Contractor', due: '2026-04-25', pr: AR ? 'عالية' : 'High', st: AR ? 'متأخر' : 'Overdue', cls: 'stalled' },
    { id: 'ACT-02', task: AR ? 'تسوية السلفة رقم 3' : 'Settle advance #3', owner: AR ? 'القسم المالي' : 'Finance dept.', due: '2026-05-10', pr: AR ? 'متوسطة' : 'Medium', st: AR ? 'قيد التنفيذ' : 'In progress', cls: 'ongoing' },
    { id: 'ACT-03', task: AR ? 'دراسة طلب التمديد' : 'Review extension request', owner: AR ? 'لجنة المدد' : 'Duration cmte.', due: '2026-02-01', pr: AR ? 'عالية' : 'High', st: AR ? 'مغلق' : 'Closed', cls: 'completed' },
  ];
  return (
    <React.Fragment>
      <DSecNav items={[{ id: 'sec-mtg', icon: 'groups', label: t('mod_meetings') }, { id: 'sec-act', icon: 'list_alt', label: AR ? 'سجل الإجراءات' : 'Action register' }]} />
      <DSec id="sec-mtg" icon="groups" title={t('mod_meetings')} sub={AR ? 'المحاضر والقرارات' : 'Minutes & decisions'} n={d.meetings.length} flush>
        {d.meetings.map((m, i) => (
          <div key={i} style={{ padding: '14px 16px', borderBottom: i < d.meetings.length - 1 ? '1px solid var(--surface-container-high)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}><b style={{ fontSize: 13 }}>{m.subject}</b><span className="mono d-cell-sub">{m.date}</span></div>
            <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{m.decisions}</div>
            {m.hasAttachment && <div style={{ marginTop: 10 }}><DFiles files={[{ name: `MoM-${m.date}.pdf`, meta: (AR ? 'محضر اجتماع · PDF' : 'Meeting minutes · PDF') }]} /></div>}
          </div>
        ))}
      </DSec>
      <DSec id="sec-act" icon="list_alt" title={AR ? 'سجل الإجراءات' : 'Action register'} n={actions.length} flush>
        <table className="d-line-table">
          <thead><tr><th>{AR ? 'الرقم' : 'No.'}</th><th>{AR ? 'الإجراء' : 'Action'}</th><th>{AR ? 'المسؤول' : 'Owner'}</th><th>{AR ? 'الاستحقاق' : 'Due'}</th><th>{AR ? 'الأولوية' : 'Priority'}</th><th>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
          <tbody>{actions.map((a, i) => (
            <tr key={i}><td className="mono">{a.id}</td><td>{a.task}</td><td className="d-cell-sub">{a.owner}</td><td className="mono">{a.due}</td><td className="d-cell-sub">{a.pr}</td><td><span className={`d-pill ${a.cls}`}>{a.st}</span></td></tr>
          ))}</tbody>
        </table>
      </DSec>
    </React.Fragment>
  );
}

function DModDrawings({ t, lang, d, showToast }) {
  const [docs, setDocs] = React.useState(d.drawings);
  const [openId, setOpenId] = React.useState(null);
  const upload = (id) => {
    setDocs(ds => ds.map(doc => doc.id === id ? { ...doc, revisions: [{ rev: 'R' + (doc.revisions.length + 1), date: '2026-07-21', reason: lang === 'ar' ? 'مراجعة جديدة — تجريبي' : 'New revision — demo', by: lang === 'ar' ? 'أنت' : 'You' }, ...doc.revisions] } : doc));
    showToast(lang === 'ar' ? 'تمت إضافة مراجعة جديدة' : 'New revision added');
  };
  const totalRevisions = docs.reduce((a, doc) => a + doc.revisions.length, 0);
  const pendingCount = docs.filter(doc => doc.status === 'draft').length;
  return (
    <React.Fragment>
      <div className="d-fig-row" >
        <div className="d-fig"><div className="k">{lang === 'ar' ? 'الوثائق' : 'Documents'}</div><div className="v">{docs.length}</div></div>
        <div className="d-fig"><div className="k">{t('revisions')}</div><div className="v">{totalRevisions}</div></div>
        <div className="d-fig"><div className="k">{lang === 'ar' ? 'بانتظار المراجعة' : 'Awaiting review'}</div><div className="v">{pendingCount}</div></div>
      </div>
      <DSec icon="folder" title={t('mod_documents')} sub={lang === 'ar' ? 'المخططات والمراجعات' : 'Drawings & revisions'} n={docs.length} flush>
        {docs.map(doc => {
          const st = window.EPM.DOC_STATUS[doc.status];
          return (
            <button className="d-openrow" key={doc.id} onClick={() => setOpenId(doc.id)}>
              <Icon name="layers" size={17} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
              <span className="om"><b>{doc.id} — {doc.type}</b><span>{doc.revisions.length} {t('revisions')} · {doc.revisions[0] ? doc.revisions[0].date : ''}</span></span>
              <span className={`d-pill ${doc.status === 'approved' ? 'completed' : doc.status === 'rejected' ? 'stalled' : 'suspended'}`}>{st[lang]}</span>
              <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={16} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
            </button>
          );
        })}
      </DSec>
      {(() => {
        const doc = docs.find(x => x.id === openId);
        if (!doc) return null;
        return (
          <DDrawer wide onClose={() => setOpenId(null)}
            title={`${doc.id} — ${doc.type}`}
            sub={`${doc.revisions.length} ${t('revisions')}`}
            footer={<button className="d-btn primary" onClick={() => upload(doc.id)}><Icon name="add" size={15} />{t('upload_revision')}</button>}>
              <DDrawerGrp label={lang === 'ar' ? 'الملفات' : 'Files'}>
                <DFiles files={doc.revisions.map((rv, i) => ({ name: `${doc.id}-${rv.rev}.pdf`, meta: `${rv.date} · ${rv.by}${i === 0 ? (lang === 'ar' ? ' · الحالية' : ' · current') : ''}` }))} />
              </DDrawerGrp>
              <DDrawerGrp label={lang === 'ar' ? 'سجل المراجعات' : 'Revision history'}>
                <table className="d-line-table">
                  <thead><tr><th>{lang === 'ar' ? 'المراجعة' : 'Rev'}</th><th>{lang === 'ar' ? 'السبب' : 'Reason'}</th><th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th><th>{lang === 'ar' ? 'بواسطة' : 'By'}</th></tr></thead>
                  <tbody>{doc.revisions.map((rv, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontWeight: 'var(--fw-bold)', color: i === 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>{rv.rev}</td>
                      <td>{rv.reason}</td><td className="mono d-cell-sub">{rv.date}</td><td className="d-cell-sub">{rv.by}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </DDrawerGrp>
          </DDrawer>
        );
      })()}
    </React.Fragment>
  );
}

/* ---------- Overview: hero health + phase pipeline + rail (IA §6) ---------- */
function DModOverview({ t, lang, p, d, goTab }) {
  const R = window.EPM.buildReadiness(p);
  const MODS = window.EPM.PROJECT_MODULES;
  const modMap = {}; MODS.forEach(m => { modMap[m.id] = m; });
  const fin = d.financial.raw;
  const AR = lang === 'ar';
  const sd = React.useMemo(() => window.EPM.buildScheduleData(p, lang), [p && p.id, lang]);
  const alerts = React.useMemo(() => window.EPM.buildAlertsData(p, lang).alerts, [p && p.id, lang]);
  const plannedProg = Math.min(100, p.tech + 8);
  const spi = (p.tech / (plannedProg || 1)).toFixed(2);
  const cpi = (p.tech / (fin.financialPct || 1)).toFixed(2);
  const openCO = d.variationOrders.filter(v => v.status === 'pending').length;
  const aC = { red: alerts.filter(a => a.sev === 'red').length, amber: alerts.filter(a => a.sev === 'amber').length, green: alerts.filter(a => a.sev === 'green').length };

  const PHASES = [
    { lbl: AR ? 'التعريف' : 'Definition', ids: ['information', 'contract', 'boq', 'financial'] },
    { lbl: AR ? 'التنفيذ' : 'Execution', ids: ['schedule', 'progress', 'changeorders', 'risk'] },
  ];
  const allStages = PHASES.flatMap(ph => ph.ids).filter(id => modMap[id]);
  const approved = allStages.filter(id => R[id] === 'approved').length;
  const nextId = allStages.find(id => ['ready', 'returned', 'blocked'].includes(R[id])) || allStages.find(id => R[id] === 'inprogress');
  const nextR = nextId ? window.EPM.READINESS[R[nextId]] : null;

  const feed = [
    ...d.meetings.slice(0, 2).map(m => ({ ic: 'groups', tx: m.subject, when: m.date })),
    ...d.variationOrders.slice(0, 2).map(v => ({ ic: 'sync_alt', tx: v.no + ' — ' + v.reason, when: v.date })),
    ...d.progress.history.slice(-1).map(h => ({ ic: 'trending_up', tx: (AR ? 'تحديث الإنجاز إلى ' : 'Progress updated to ') + h.physical + '%', when: h.date })),
  ].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 5);

  const meta = [
    [AR ? 'الكلفة المعدلة' : 'Revised cost', Math.round(fin.revisedCost / 1e6) + 'M', null],
    [AR ? 'المصروف التراكمي' : 'Cumulative spend', Math.round(fin.disbursed / 1e6) + 'M', null],
    [AR ? 'الإنجاز المتوقع' : 'Forecast finish', sd.forecastFinish, sd.delayDays > 0 ? 'var(--error)' : 'var(--on-surface)'],
    [AR ? 'التأخر' : 'Delay', (sd.delayDays > 0 ? '+' : '') + sd.delayDays + (AR ? 'ي' : 'd'), sd.delayDays > 0 ? 'var(--error)' : 'var(--on-surface)'],
    ['SPI', spi, spi < 1 ? 'var(--error)' : 'var(--on-surface)'],
    ['CPI', cpi, cpi < 1 ? 'var(--error)' : 'var(--on-surface)'],
  ];

  return (
    <React.Fragment>
      <div className="d-ov-hero">
        <div className="d-ov-hero-top"><DPill status={p.status} lang={lang} /><span className="code">{p.id} · {d.contract.code}</span></div>
        <div className="d-ov-meters">
          <div className="d-ov-meter">
            <div className="top"><span className="lbl">{AR ? 'الإنجاز المادي' : 'Physical completion'}</span><span className="pct" style={{ color: 'var(--azure-600)' }}>{p.tech}%</span></div>
            <div className="mtrack"><span style={{ width: p.tech + '%', background: 'var(--azure-500)' }}></span></div>
          </div>
          <div className="d-ov-meter">
            <div className="top"><span className="lbl">{AR ? 'الإنجاز المالي' : 'Financial completion'}</span><span className="pct" style={{ color: 'var(--on-surface)' }}>{fin.financialPct}%</span></div>
            <div className="mtrack"><span style={{ width: fin.financialPct + '%', background: 'var(--on-surface)' }}></span></div>
          </div>
        </div>
        <div className="d-ov-metarow">
          {meta.map((m, i) => <div className="d-ov-mi" key={i}><span className="k">{m[0]}</span><span className="v" style={m[2] ? { color: m[2] } : null}>{m[1]}</span></div>)}
        </div>
      </div>

      <div className="d-callout">
        <span className="d-callout-ico"><Icon name="assistant_direction" size={20} /></span>
        <div className="d-callout-tx">
          <span className="k">{t('next_action')}</span>
          {nextId ? <b>{t(modMap[nextId].key)} — {nextR[lang]}</b> : <b>{AR ? 'جميع المراحل معتمدة' : 'All stages approved'}</b>}
        </div>
        {nextId && <button className="d-btn sm primary" onClick={() => goTab(nextId)}>{AR ? 'الانتقال' : 'Go'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={15} /></button>}
      </div>

      <div className="d-ov-work" style={{ marginTop: 14 }}>
        <div className="d-panel">
          <div className="d-ov-pipe-head">
            <b>{AR ? 'خط سير المراحل' : 'Stage pipeline'}</b>
            <span className="d-ov-pipe-prog"><span className="track"><span style={{ width: Math.round(approved / allStages.length * 100) + '%' }}></span></span>{approved}/{allStages.length} {AR ? 'معتمد' : 'approved'}</span>
          </div>
          {PHASES.map((ph, pi) => (
            <div key={pi}>
              <span className="d-ov-phase-l">{ph.lbl}</span>
              {ph.ids.filter(id => modMap[id]).map((id, i, arr) => (
                <button key={id} className="d-ready-row" onClick={() => goTab(id)} style={{ borderBottom: (pi < PHASES.length - 1 || i < arr.length - 1) ? '1px solid var(--surface-container-high)' : 'none' }}>
                  <Icon name={modMap[id].icon} size={17} style={{ color: 'var(--on-surface-variant)' }} />
                  <span className="nm">{t(modMap[id].key)}</span>
                  <DReadiness state={R[id]} lang={lang} sm />
                  <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={16} style={{ color: 'var(--on-surface-variant)' }} />
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="d-panel">
            <div className="d-panel-head"><b>{AR ? 'ملخص التنبيهات' : 'Alert summary'}</b><button className="d-link" onClick={() => goTab('alerts')}>{t('view_all')}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={15} /></button></div>
            <div className="d-alert-tiles">
              {[['var(--error)', aC.red, AR ? 'حرجة' : 'High'], ['var(--status-suspended-tx)', aC.amber, AR ? 'متوسطة' : 'Medium'], ['var(--on-surface)', aC.green, AR ? 'منخفضة' : 'Low']].map((a, i) => (
                <div className="d-alert-tile" key={i}><div className="n" style={{ color: a[0] }}>{a[1]}</div><div className="l">{a[2]}</div></div>
              ))}
            </div>
          </div>
          <div className="d-panel">
            <div className="d-panel-head"><b>{t('recent')}</b></div>
            <div>
              {feed.map((f, i) => (
                <div key={i} className="d-mini" style={{ cursor: 'default' }}>
                  <span className="d-mini-emblem" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', width: 30, height: 30 }}><Icon name={f.ic} size={15} /></span>
                  <span className="d-mini-main"><b style={{ fontSize: 12 }}>{f.tx}</b><span className="mono">{f.when}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ---------- Reports & Analytics: catalog ---------- */
function DModReports({ t, lang, p, showToast }) {
  const AR = lang === 'ar';
  const d = React.useMemo(() => window.EPM.buildProjectDetail(p, lang), [p && p.id, lang]);
  const sd = React.useMemo(() => window.EPM.buildScheduleData(p, lang), [p && p.id, lang]);
  const catalog = [
    { id: 'status', icon: 'summarize', ar: 'تقرير حالة المشروع', en: 'Project status report' },
    { id: 'financial', icon: 'payments', ar: 'التقرير المالي', en: 'Financial report' },
    { id: 'progress', icon: 'trending_up', ar: 'تقرير الإنجاز المادي', en: 'Physical progress report' },
    { id: 'schedule', icon: 'timeline', ar: 'أداء الجدول الزمني', en: 'Schedule performance report' },
    { id: 'changeorders', icon: 'sync_alt', ar: 'تقرير الأوامر التغييرية', en: 'Change-order report' },
    { id: 'documents', icon: 'folder_open', ar: 'حالة الوثائق', en: 'Document status report' },
  ];
  const [sel, setSel] = React.useState('status');
  const [period, setPeriod] = React.useState('quarter');
  const cur = catalog.find(c => c.id === sel);
  const fin = d.financial.raw;
  const fig = (k, v, c) => <div className="d-fig"><div className="k">{k}</div><div className="v" style={c ? { color: c } : null}>{v}</div></div>;

  return (
    <React.Fragment>
      <div className="d-model-topbar">
        <div className="d-section-title" style={{ margin: 0 }}>{t('mod_reports')}</div>
        <div style={{ flex: 1 }}></div>
        <div className="d-seg">{['month', 'quarter', 'year'].map(pr => <button key={pr} className={period === pr ? 'on' : ''} onClick={() => setPeriod(pr)}>{t('period_' + pr)}</button>)}</div>
        <button className="d-btn sm" onClick={() => showToast(AR ? 'تصدير PDF — تجريبي' : 'Export PDF — demo')}><Icon name="ios_share" size={15} />{AR ? 'تصدير' : 'Export'}</button>
      </div>
      <div className="d-report-shell">
        <div className="d-report-cat">
          {catalog.map(c => (
            <button key={c.id} className={`d-report-cat-i ${sel === c.id ? 'on' : ''}`} onClick={() => setSel(c.id)}>
              <Icon name={c.icon} size={16} /><span>{AR ? c.ar : c.en}</span>
            </button>
          ))}
        </div>
        <div className="d-report-view">
          <div className="d-report-view-head">
            <div><b>{AR ? cur.ar : cur.en}</b><span className="d-cell-sub">{p.name[lang]} · {p.id} · {t('period_' + period)}</span></div>
            <span className="d-demo-tag">{t('demo_data')}</span>
          </div>

          {sel === 'status' && <React.Fragment>
            <div className="d-fig-row" >
              {fig(AR ? 'الإنجاز المادي' : 'Physical', p.tech + '%')}
              {fig(AR ? 'الإنجاز المالي' : 'Financial', fin.financialPct + '%')}
              {fig(AR ? 'التأخر' : 'Delay', (sd.delayDays > 0 ? '+' : '') + sd.delayDays + (AR ? ' يوم' : 'd'), sd.delayDays > 0 ? 'var(--error)' : 'var(--on-surface)')}
              {fig(AR ? 'أوامر تغييرية' : 'Change orders', d.variationOrders.length)}
            </div>
            <b className="d-rev-title">{AR ? 'مؤشر الأداء' : 'Performance'}</b>
            <DBarCompare items={[
              { label: AR ? 'مخطط' : 'Planned', value: Math.min(100, p.tech + 8), display: Math.min(100, p.tech + 8) + '%', color: 'var(--azure-500)' },
              { label: AR ? 'مادي فعلي' : 'Physical', value: p.tech, display: p.tech + '%', color: 'var(--primary)' },
              { label: AR ? 'مالي فعلي' : 'Financial', value: fin.financialPct, display: fin.financialPct + '%', color: 'var(--on-surface)' },
            ]} />
          </React.Fragment>}

          {sel === 'financial' && <React.Fragment>
            <div className="d-fig-row" >
              {fig(AR ? 'الكلفة المعدلة' : 'Revised cost', window.fmtNum(fin.revisedCost))}
              {fig(AR ? 'التخصيص السنوي' : 'Allocation', window.fmtNum(fin.annualAllocation))}
              {fig(AR ? 'المصروف التراكمي' : 'Cumulative', window.fmtNum(fin.disbursed))}
            </div>
            <b className="d-rev-title">{AR ? 'التخصيص مقابل الصرف' : 'Allocation vs spend'}</b>
            <DBarCompare items={[
              { label: AR ? 'مخطط' : 'Planned', value: fin.plannedCost, display: window.fmtNum(fin.plannedCost), color: 'var(--azure-500)' },
              { label: AR ? 'معدل' : 'Revised', value: fin.revisedCost, display: window.fmtNum(fin.revisedCost), color: 'var(--primary)' },
              { label: AR ? 'مصروف' : 'Spent', value: fin.disbursed, display: window.fmtNum(fin.disbursed), color: 'var(--on-surface)' },
            ]} />
            <div className="d-card-sub" style={{ marginTop: 12 }}><table className="d-line-table">
              <thead><tr><th>{AR ? 'الدفعة' : 'Payment'}</th><th>{AR ? 'التاريخ' : 'Date'}</th><th>{AR ? 'المبلغ' : 'Amount'}</th></tr></thead>
              <tbody>{d.financial.payments.map((pm, i) => <tr key={i}><td className="mono">{pm.no}</td><td className="mono">{pm.date}</td><td className="mono">{window.fmtNum(pm.amount)}</td></tr>)}</tbody>
            </table></div>
          </React.Fragment>}

          {sel === 'progress' && <React.Fragment>
            <b className="d-rev-title">{AR ? 'اتجاه الإنجاز' : 'Progress trend'}</b>
            <DDualLine series={[
              { label: AR ? 'مادي' : 'Physical', color: 'var(--viz-1)', points: d.progress.history.map(h => h.physical) },
              { label: AR ? 'مالي' : 'Financial', color: 'var(--viz-2)', points: d.progress.history.map(h => h.financial) },
            ]} xLabels={d.progress.history.map(h => h.date.slice(5))} />
            <div className="d-card-sub" style={{ marginTop: 12 }}><table className="d-line-table">
              <thead><tr><th>{AR ? 'التاريخ' : 'Date'}</th><th>{AR ? 'مادي' : 'Physical'}</th><th>{AR ? 'مالي' : 'Financial'}</th><th>{AR ? 'المستخدم' : 'By'}</th></tr></thead>
              <tbody>{d.progress.history.map((h, i) => <tr key={i}><td className="mono">{h.date}</td><td className="mono">{h.physical}%</td><td className="mono">{h.financial}%</td><td>{h.by}</td></tr>)}</tbody>
            </table></div>
          </React.Fragment>}

          {sel === 'schedule' && <React.Fragment>
            <div className="d-fig-row" >
              {fig(AR ? 'إنجاز مخطط' : 'Baseline', sd.baselineFinish)}
              {fig(AR ? 'إنجاز متوقع' : 'Forecast', sd.forecastFinish, sd.delayDays > 0 ? 'var(--error)' : null)}
              {fig(AR ? 'التأخر' : 'Delay', (sd.delayDays > 0 ? '+' : '') + sd.delayDays + (AR ? ' يوم' : 'd'), sd.delayDays > 0 ? 'var(--error)' : 'var(--on-surface)')}
              {fig(AR ? 'أنشطة حرجة' : 'Critical', sd.criticalCount, 'var(--on-surface)')}
            </div>
            <div className="d-card-sub" style={{ marginTop: 12 }}><table className="d-line-table">
              <thead><tr><th>{AR ? 'النشاط' : 'Activity'}</th><th>{AR ? 'أساس' : 'Baseline'}</th><th>{AR ? 'متوقع' : 'Forecast'}</th><th>{AR ? 'انزياح' : 'Slip'}</th></tr></thead>
              <tbody>{sd.comparison.changed.map((c, i) => <tr key={i}><td>{c.name}</td><td className="mono d-cell-sub">{c.from}</td><td className="mono">{c.to}</td><td className="mono" style={{ color: 'var(--error)' }}>+{c.slip}{AR ? 'ي' : 'd'}</td></tr>)}</tbody>
            </table></div>
          </React.Fragment>}

          {sel === 'changeorders' && <div className="d-card-sub"><table className="d-line-table">
            <thead><tr><th>{AR ? 'الأمر' : 'Order'}</th><th>{AR ? 'التاريخ' : 'Date'}</th><th>{AR ? 'السبب' : 'Reason'}</th><th>{AR ? 'القيمة' : 'Value'}</th><th>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
            <tbody>{d.variationOrders.map((v, i) => { const st = window.EPM.VO_STATUS[v.status]; return <tr key={i}><td className="mono">{v.no}</td><td className="mono">{v.date}</td><td>{v.reason}</td><td className="mono">{window.fmtNum(v.value)}</td><td><span className={`d-pill ${v.status === 'approved' ? 'completed' : v.status === 'rejected' ? 'stalled' : 'suspended'}`}>{st[lang]}</span></td></tr>; })}</tbody>
          </table></div>}

          {sel === 'documents' && <div className="d-card-sub"><table className="d-line-table">
            <thead><tr><th>{AR ? 'الوثيقة' : 'Document'}</th><th>{AR ? 'النوع' : 'Type'}</th><th>{AR ? 'الإصدار' : 'Rev'}</th><th>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
            <tbody>{d.drawings.map((dc, i) => { const st = window.EPM.DOC_STATUS[dc.status]; return <tr key={i}><td className="mono">{dc.id}</td><td>{dc.type}</td><td className="mono">{dc.revisions[0].rev}</td><td><span className={`d-pill ${dc.status === 'approved' ? 'completed' : dc.status === 'rejected' ? 'stalled' : 'suspended'}`}>{st[lang]}</span></td></tr>; })}</tbody>
          </table></div>}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ---------- Risk Management (team minutes §2.1.6) ---------- */
function DModRisk({ t, lang, d }) {
  const AR = lang === 'ar';
  const risks = d.risks;
  const sevPill = { high: 'stalled', med: 'suspended', low: 'completed' };
  const sevLbl = { high: AR ? 'عالٍ' : 'High', med: AR ? 'متوسط' : 'Medium', low: AR ? 'منخفض' : 'Low' };
  const counts = { high: risks.filter(r => r.sev === 'high').length, med: risks.filter(r => r.sev === 'med').length, low: risks.filter(r => r.sev === 'low').length };
  return (
    <React.Fragment>
      <div className="d-fig-row" >
        <div className="d-fig"><div className="k">{AR ? 'مخاطر عالية' : 'High'}</div><div className="v" style={{ color: 'var(--error)' }}>{counts.high}</div></div>
        <div className="d-fig"><div className="k">{AR ? 'متوسطة' : 'Medium'}</div><div className="v" style={{ color: 'var(--status-suspended-tx)' }}>{counts.med}</div></div>
        <div className="d-fig"><div className="k">{AR ? 'منخفضة' : 'Low'}</div><div className="v" style={{ color: 'var(--on-surface)' }}>{counts.low}</div></div>
      </div>
      <DSec icon="shield" title={t('mod_risk')} sub={AR ? 'الخطورة = الاحتمالية × التأثير' : 'Severity = probability × impact'} n={risks.length} flush>
        <div style={{ overflowX: 'auto' }}>
        <table className="d-line-table">
          <thead><tr><th>{AR ? 'الرقم' : 'No.'}</th><th>{AR ? 'الوصف' : 'Description'}</th><th>{AR ? 'النوع' : 'Type'}</th><th>{AR ? 'الاحتمالية' : 'Prob.'}</th><th>{AR ? 'التأثير' : 'Impact'}</th><th>{AR ? 'الخطورة' : 'Severity'}</th><th>{AR ? 'الجهة المسؤولة' : 'Owner'}</th><th>{AR ? 'المؤشر' : 'KPI'}</th><th>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
          <tbody>{risks.map((r, i) => (
            <tr key={i}>
              <td className="mono">{r.no}</td><td>{r.desc}</td><td className="d-cell-sub">{r.type}</td>
              <td className="d-cell-sub">{r.prob}</td><td className="d-cell-sub">{r.impact}</td>
              <td><span className={`d-pill ${sevPill[r.sev]}`}>{sevLbl[r.sev]}</span></td>
              <td className="d-cell-sub">{r.owner}</td><td className="mono">{r.kpi}</td><td className="d-cell-sub">{r.status}</td>
            </tr>
          ))}</tbody>
        </table>
        </div>
      </DSec>
      <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 10 }}>{AR ? 'مستوى الخطورة = الاحتمالية × التأثير، ويُحسب تلقائياً. مرتبط بمؤشرات الأداء (SPI/CPI/EAC/VAC).' : 'Severity = probability × impact, auto-computed. Linked to EVM KPIs (SPI/CPI/EAC/VAC).'}</p>
    </React.Fragment>
  );
}

/* ---------- Audit History ---------- */
function DModAudit({ t, lang }) {
  const AUD = window.EPM.AUDIT;
  return (
    <React.Fragment>
      <DSec icon="history" title={t('mod_audit')} sub={lang === 'ar' ? 'سجل الإجراءات على المشروع' : 'Trail of actions on this project'} n={AUD.length} flush>
        <table className="d-line-table">
          <thead><tr><th>{lang === 'ar' ? 'الإجراء' : 'Action'}</th><th>{lang === 'ar' ? 'الكيان' : 'Entity'}</th><th>{lang === 'ar' ? 'الهدف' : 'Target'}</th><th>{lang === 'ar' ? 'الوقت' : 'Time'}</th></tr></thead>
          <tbody>{AUD.map((a, i) => <tr key={i}><td className="d-cell-strong">{a.action[lang]}</td><td className="d-cell-sub">{a.entity[lang]}</td><td className="mono">{a.tgt}</td><td className="mono d-cell-sub">{a.t.slice(5)}</td></tr>)}</tbody>
        </table>
      </DSec>
    </React.Fragment>
  );
}

Object.assign(window, { DSec, DSecNav, DFiles, DDrawerGrp, DReadiness, DReviewFlow, DField, DFieldGrid, DEditTimeline, DModProfile, DModInformation, DModEntity, DModSimple, DModConsultant, DModContractNew, DModFinancialNew, DModProgress, DModRisk, DModBOQ, DModVO, DBOQAssignment, computeBOQGroups, defaultBOQLinks, boqWeights, DModMeetings, DModDrawings, DModOverview, DModReports, DModAudit });
