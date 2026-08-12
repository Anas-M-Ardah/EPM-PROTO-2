const TXC = c => c === 'var(--warning)' ? 'var(--status-suspended-tx)'
  : c === 'var(--success)' ? 'var(--status-completed-tx)'
  : c === 'var(--status-ongoing)' ? 'var(--status-ongoing-tx)' : c;
/* ============================================================
   EPM — project detail modules (Business Vision Phase 1 sections 6/8).
   Generic field-grid renderer + the 12 module screens, each
   showing its dictionary fields (required / proposed badges) in
   a realistic, polished layout — for client field confirmation.
   ============================================================ */

function DField({ f, lang, editMode, scope }) {
  const AR = lang === 'ar';
  // saved edit (persisted) wins over the generated value, in edit and display
  const labelEn = f.label && f.label.en;
  const saved = (scope && window.epmFieldGet) ? window.epmFieldGet(scope, labelEn, undefined) : undefined;
  const val = saved !== undefined ? saved : f.value;
  const save = v => { if (scope && window.epmFieldSet) window.epmFieldSet(scope, labelEn, v); };
  let opts = f.options;
  if (editMode && opts && val != null && !opts.includes(val)) opts = [val, ...opts];
  const showEdit = editMode && !f.auto;
  const unitTxt = String(f.unit || '').trim();
  const isMoney = unitTxt.slice(0, 3).toUpperCase() === 'IQD';
  const perDay = isMoney && unitTxt.indexOf('/') !== -1;
  return (
    <div className={`d-form-i ${showEdit ? 'editing' : ''}`}>
      <label className="k">{f.label[lang]}{f.required && <span className="req">*</span>}{f.proposed && <span className="d-proposed">{AR ? 'مقترح' : 'Proposed'}</span>}{editMode && f.auto && <span className="d-proposed" style={{ background: 'color-mix(in srgb,var(--on-surface-variant) 14%,transparent)', color: 'var(--on-surface-variant)' }} title={AR ? 'يُحسب تلقائياً ولا يقبل التعديل' : 'System-generated — not editable'}><Icon name="lock" size={10} style={{ verticalAlign: -1, marginInlineEnd: 2 }} />{AR ? 'آلي' : 'Auto'}</span>}</label>
      {showEdit
        ? (opts
            ? <select className="d-form-input" defaultValue={val} onChange={e => save(e.target.value)}>{opts.map((o, i) => <option key={i} value={o}>{o}</option>)}</select>
            : <input className={`d-form-input ${f.mono ? 'mono' : ''}`} defaultValue={val} onChange={e => save(e.target.value)} />)
        : isMoney
            ? <span className="v"><DMoney v={val} lang={lang} size="sm" />{perDay && <i className="per">/{AR ? 'يوم' : 'day'}</i>}</span>
            : <span className={`v ${f.mono ? 'mono' : ''}`}>{val}{f.unit ? ' ' + f.unit : ''}</span>}
    </div>
  );
}
function DFieldGrid({ fields, lang, editMode, scope }) {
  return <div className="d-form-grid">{fields.map((f, i) => <DField key={i} f={f} lang={lang} editMode={editMode} scope={scope} />)}</div>;
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

function DReadiness({ state, lang, sm, mod }) {
  const R = window.EPM.READINESS[state] || window.EPM.READINESS.notstarted;
  const label = mod && window.EPM.readinessLabel ? window.EPM.readinessLabel(mod, state, lang) : R[lang];
  return <span className={`d-ready ${R.cls} ${sm ? 'sm' : ''}`} title={label}><Icon name={R.icon} size={sm ? 12 : 13} />{label}</span>;
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
      <DFieldGrid fields={d.profile.fields} lang={lang} editMode={editMode} scope="profile" />
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
    const box = el && (el.closest('.d-pz7') || el.closest('.d-detail-body'));
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

/* ---------- L11 primitives (design standards Part 3 · L11 / L12) ----------
   Titled collapsible field group — max 7 fields, 3/2/1 responsive columns,
   long text spans full width. Reused by every record-detail screen. */
function DFGroup({ title, sub, id, flush, span, foot, children, defaultOpen }) {
  const [open, setOpen] = React.useState(defaultOpen !== false);
  return (
    /* `span` lets a section card sit in an L04 tile grid without a second
       card vocabulary being invented for the same job */
    <section className={'d-fgroup' + (open ? '' : ' closed') + (span ? ' s' + span : '')} id={id}>
      <header className="gh" onClick={() => setOpen(o => !o)}>
        <span className="ttl">{title}</span>
        {sub && <span className="sub">{sub}</span>}
        <span className="sp"></span>
        <Icon name="expand_more" size={16} className="chev" />
      </header>
      {/* `flush` = the body IS the content (a grid, a viewer): no padding,
          no gaps, the card's own edges frame it */}
      {open && <div className={'gb' + (flush ? ' flush' : '')}>{children}</div>}
      {open && foot && <div className="gf">{foot}</div>}
    </section>
  );
}

/* Activity log — the record's system history as a tab, not a docked rail.
   Logs only: no comment thread and no composer. Presentation stays the
   .trail/.tstep timeline L23 prescribes for a single record's history,
   with field changes rendered as from -> to. */
function DActivityLog({ lang, items }) {
  const AR = lang === 'ar';
  const logs = (items || []).filter(i => i.kind === 'system');
  /* A grouped-number value (1,236,122,106) is money; the log stores it
     pre-formatted, so route it through the one money renderer instead of
     letting a bare figure sit next to properly-tagged ones elsewhere. */
  const cval = v => {
    const t = String(v == null ? '' : v).trim();
    return /^\d{1,3}(,\d{3})+$/.test(t)
      ? <DMoney v={t} lang={lang} size="xs" />
      : (t || '—');
  };
  return (
    <div className="d-actlog">
      <div className="d-trail">
        {logs.map((it, i) => (
          <div key={i} className={'d-tstep' + (it.tone ? ' ' + it.tone : '')}>
            <span className="tdot"><Icon name={it.icon || 'settings'} size={11} /></span>
            <div className="th">
              <span>{(window.epmActor(it.by, lang) || {}).name || it.by}</span>
              {it.lvl === 'project' && <span className="lvl">{AR ? 'على مستوى المشروع' : 'project-wide'}</span>}
              <time className="tm">{it.when}</time>
            </div>
            {window.epmActor(it.by, lang) && (
              <div className="tr">
                <span className="ro">{window.epmActor(it.by, lang).role}</span>
                <span className="sep">·</span>
                <span className="og">{window.epmActor(it.by, lang).org}</span>
              </div>
            )}
            {it.changes
              ? it.changes.map((c, j) => (
                  <div className="chg" key={j} title={c.field + ': ' + (c.from || '—') + ' → ' + c.to}>
                    <span className="f">{c.field}</span>
                    <span className="from">{cval(c.from)}</span>
                    <Icon name={AR ? 'arrow_back' : 'arrow_forward'} size={12} className="arw" />
                    <span className="to">{cval(c.to)}</span>
                  </div>
                ))
              : <div className="tb" dangerouslySetInnerHTML={{ __html: it.text }}></div>}
          </div>
        ))}
        {!logs.length && (
          <div className="d-tstep"><span className="tdot"><Icon name="inbox" size={11} /></span>
            <div className="tb">{AR ? 'لا توجد أحداث مسجّلة على هذا السجل.' : 'No events recorded on this record.'}</div></div>
        )}
      </div>
    </div>
  );
}

/* A page's activity log shows exactly two things: changes to the fields
   THIS page renders, and project-wide events that are true regardless of
   which record you are looking at. An edit to a field the page does not
   show belongs to the page that does show it. */
function buildProjectActivity(d, lang, opts) {
  const AR = lang === 'ar';
  const o = opts || {};
  const out = [];

  // ---- project-wide: physical progress, true of the project itself
  ((d.progress && d.progress.history) || []).slice(-2).forEach(h => out.push({
    kind: 'system', lvl: 'project', icon: 'trending_up', by: AR ? 'النظام' : 'System', when: h.date, tone: 'done',
    text: (AR ? 'تحديث الإنجاز المادي إلى ' : 'Physical progress updated to ') + '<mark>' + h.physical + '%</mark>',
  }));

  // ---- record events belonging to this page
  if (o.vos) (d.variationOrders || []).slice(0, 3).forEach(v => out.push({
    kind: 'system', lvl: 'record', icon: 'history', by: AR ? 'النظام' : 'System', when: v.date,
    text: (AR ? 'أمر تغييري <mark>' : 'Change order <mark>') + v.no + '</mark> — ' + v.reason,
  }));
  if (o.meetings) (d.meetings || []).slice(0, 2).forEach(m => out.push({
    kind: 'system', lvl: 'record', icon: 'groups', by: AR ? 'النظام' : 'System', when: m.date,
    text: (AR ? 'محضر اجتماع: ' : 'Meeting minutes: ') + m.subject,
  }));

  // ---- field edits, narrowed to the labels this page actually renders
  const shown = o.fields ? new Set(o.fields) : null;
  (o.logs || []).forEach(k => ((d[k] && d[k].editLog) || []).forEach(e => {
    const changes = shown ? (e.changes || []).filter(c => shown.has(c.field)) : (e.changes || []);
    if (!changes.length) return;
    out.push({ kind: 'system', lvl: 'record', icon: 'edit', by: e.by, when: e.date, changes: changes });
  }));

  return out.sort((x, y) => String(y.when).localeCompare(String(x.when)));
}

/* Project Information — design standards §30 screen 05 (L11 -> L12).
   Zone flags for L11: Z2 req · Z7 req · Z8 req · Z6 opt · Z9 opt · Z10 opt.
   The record has one applicable facet (Details), so there is no Z5 tab strip
   and no Z6 (forbidden on Details). Content is exactly what this page always
   had - identity, description, entity, consultant - regrouped, not extended. */
function DModInformation({ t, lang, d, editMode, frameTitle, frameActions }) {
  const AR = lang === 'ar';
  const [sub, setSub] = React.useState('details');
  const pf = d.profile.fields || [];
  /* Field groups are semantic, not an arbitrary slice: each group is a
     coherent set the reviewer reads together, and none exceeds L12's
     max of 7 fields. Anything unmatched falls through to identity. */
  const GROUPS = [
    { id: 'sec-identity', ar: 'هوية المشروع', en: 'Project identity',
      subAr: 'البيانات التعريفية الأساسية', subEn: 'Core registration data',
      re: /project name|project code|project type|award year|execution stage|project status/i },
    { id: 'sec-loc', ar: 'الموقع', en: 'Location',
      subAr: 'الموقع الجغرافي وحدود العمل', subEn: 'Geographic location & site extents',
      re: /coordinate|region|governorate|site|address|area/i },
    { id: 'sec-budget', ar: 'التمويل والموازنة', en: 'Funding & budget',
      subAr: 'مصدر التمويل وتصنيف الصرف', subEn: 'Funding source & spending classification',
      re: /funding|priority|spending category|budget approval/i },
  ];
  const used = new Set();
  GROUPS.forEach(g => {
    g.fields = pf.filter(f => !used.has(f) && g.re.test(f.label.en || ''));
    g.fields.forEach(f => used.add(f));
  });
  GROUPS[0].fields = GROUPS[0].fields.concat(pf.filter(f => !used.has(f)));
  const shownGroups = GROUPS.filter(g => g.fields.length);
  const consultant = (d.consultant.fields || []).filter(f => !/[Ss]upervision/.test(f.label.en));
  const shownFields = React.useMemo(() => [
    ...pf, ...(d.entity.fields || []), ...consultant,
  ].map(f => f.label[lang]), [pf, d.entity.fields, consultant, lang]);
  const activity = React.useMemo(() => window.EPM.buildProjectActivity(d, lang, {
    logs: ['profile', 'entity', 'consultant'], fields: shownFields,
  }), [d, lang, shownFields]);


  const logCount = activity.filter(a2 => a2.kind === 'system').length;
  const TABS = [
    { id: 'details', label: AR ? 'التفاصيل' : 'Details' },
    { id: 'log', label: AR ? 'سجل النشاط' : 'Activity log', n: logCount },
  ];

  return (
    <DModuleFrame title={frameTitle} actions={sub === 'details' ? frameActions : null}
      tabs={TABS} tab={sub} onTab={setSub}>
      {sub === 'log' && <DActivityLog lang={lang} items={activity} />}
      {sub === 'details' && <React.Fragment>

      {shownGroups.map(g => (
        <DFGroup key={g.id} id={g.id} title={AR ? g.ar : g.en} sub={AR ? g.subAr : g.subEn}>
          <DFieldGrid fields={g.fields} lang={lang} editMode={editMode} scope="profile" />
        </DFGroup>
      ))}

      <DFGroup id="sec-desc" title={AR ? 'الوصف' : 'Description'}
        sub={AR ? 'نطاق العمل كما ورد في العقد' : 'Scope of work as contracted'}>
        <div className="d-fwide">
          {editMode
            ? <textarea className="d-form-input" style={{ width: '100%', minHeight: 96, resize: 'vertical', fontFamily: 'inherit' }} defaultValue={d.profile.description}></textarea>
            : <p>{d.profile.description}</p>}
        </div>
      </DFGroup>

      <DFGroup id="sec-entity" title={t('mod_entity')}
        sub={AR ? 'الجهة المستفيدة والمالكة' : 'Owning & beneficiary body'}>
        <DFieldGrid fields={d.entity.fields} lang={lang} editMode={editMode} scope="entity" />
      </DFGroup>

      <DFGroup id="sec-consultant" title={t('mod_consultant')}
        sub={AR ? 'المكتب الاستشاري المشرف' : 'Supervising consultant'}>
        <DFieldGrid fields={consultant} lang={lang} editMode={editMode} scope="consultant" />
      </DFGroup>
      </React.Fragment>}
    </DModuleFrame>
  );
}

function DModEntity({ t, lang, d, editMode }) {
  return (<React.Fragment><div className="d-section-title">{t('mod_entity')}</div><DFieldGrid fields={d.entity.fields} lang={lang} editMode={editMode} /></React.Fragment>);
}

function DModSimple({ title, fields, lang, editMode }) {
  return (<React.Fragment><div className="d-section-title">{title}</div><DFieldGrid fields={fields} lang={lang} editMode={editMode} /></React.Fragment>);
}

function DModContractNew({ t, lang, d, p, editMode, selKey, setSelKey, showToast, frameActions }) {
  const AR = lang === 'ar';
  const list = d.contracts || [{ key: 'main', name: AR ? 'العقد' : 'Contract', status: d.contract.status, code: d.contract.code, raw: d.contract.raw, fields: d.contract.fields, contractor: d.contractor }];
  React.useEffect(() => { if (selKey == null && list.length === 1) setSelKey(list[0].key); }, [list.length]);
  const [openPayNo, setOpenPayNo] = React.useState(null);
  const [openAmd, setOpenAmd] = React.useState(null);
  const [paneWide, setPaneWide] = React.useState(false);
  const [cTab, setCTab] = React.useState('overview');
  React.useEffect(() => { setCTab('overview'); setOpenPayNo(null); setOpenAmd(null); setPaneWide(false); }, [selKey]);
  /* a record pane belongs to the tab that opened it: leaving that tab closes
     it, so a stale record can never sit beside unrelated content. Leaving the
     module unmounts the component, which clears it too. */
  React.useEffect(() => { setOpenPayNo(null); setOpenAmd(null); setPaneWide(false); }, [cTab]);
  const totalValue = list.reduce((a, x) => a + (x.raw.contractCost || 0), 0);
  const c = list.find(x => x.key === selKey);
  // approved change orders amend the contract; the last applied one is effective.
  // must run before the register early-return, or hook order breaks between branches
  const amd = React.useMemo(() => (c && window.contractAmendments ? window.contractAmendments(c, d, lang, p) : null), [c && c.key, d, lang, p && p.id]);

  if (!c) {
    /* Contracts register — §30 screen 06: L05 on the table standard
       (code column first, then name), with a portfolio summary above it
       so the user gets the whole contractual position in one view. */
    const rows = list.map(x => {
      const am = window.contractAmendments ? window.contractAmendments(x, d, lang, p) : null;
      const effective = am ? am.effective.value : x.raw.contractCost;
      const pend = am ? am.pending.length : 0;
      const addenda = am ? (am.versions.length - 1) : 0;
      const fget = re => { const f = (x.fields || []).find(y => re.test(y.label.en || '')); return f ? f.value : null; };
      return { x, effective, pend, addenda,
        contractor: (x.contractor && window.epmContractorName({ contractor: x.contractor }, lang)) || window.epmContractorName(d, lang) || '—',
        component: fget(/component/i), finish: fget(/finish date/i), start: fget(/start date/i),
        spentPct: x.raw.contractCost ? Math.round(x.raw.totalSpent / x.raw.contractCost * 100) : 0 };
    });
    const totalSpent = list.reduce((a2, x) => a2 + (x.raw.totalSpent || 0), 0);
    const totalEffective = rows.reduce((a2, rr) => a2 + rr.effective, 0);
    const addendaImpact = totalEffective - totalValue;
    const totalAddenda = rows.reduce((a2, rr) => a2 + rr.addenda, 0);
    const totalPending = rows.reduce((a2, rr) => a2 + rr.pend, 0);
    /* value-weighted, so a small contract at 90% cannot mask a large one at 10% */
    const wPhys = totalEffective ? Math.round(rows.reduce((a2, rr) => a2 + rr.x.raw.physicalPct * rr.effective, 0) / totalEffective) : 0;
    const dates = rows.map(rr => rr.finish).filter(Boolean).sort();
    const starts = rows.map(rr => rr.start).filter(Boolean).sort();
    const byStatus = {}; list.forEach(x => { byStatus[x.status] = (byStatus[x.status] || 0) + 1; });

    const spentPct = totalEffective ? Math.round(totalSpent / totalEffective * 100) : 0;

    return (
      <DModuleFrame
        title={AR ? 'سجل عقود المشروع' : 'Project contract register'}
        sub={list.length + (AR ? ' عقود' : ' contracts')}
        actions={<React.Fragment>
          {frameActions}
          <button className="d-btn sm" onClick={() => showToast && showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}>
            <Icon name="download" size={15} />{AR ? 'تصدير' : 'Export'}</button>
          <button className="d-btn sm primary" onClick={() => showToast && showToast(AR ? 'إضافة عقد — تجريبي' : 'Add contract — demo')}>
            <Icon name="add" size={15} />{AR ? 'إضافة عقد' : 'Add contract'}</button>
        </React.Fragment>}
        status={<DZ10 lang={lang} asOf={d.asOf} stats={[
          { k: AR ? 'العقود' : 'Contracts', v: list.length },
          { k: AR ? 'القيمة النافذة' : 'Effective', v: totalEffective, money: true },
          { k: AR ? 'المصروف' : 'Spent', v: totalSpent, money: true }]} />}>

        {/* Contractual position — each datum gets the encoding it deserves:
            counts as chips, money that reconciles as a reconciliation strip,
            part-to-whole as bars. Not one flat key/value list. */}
        <section className="d-csum">
          <header className="hd">
            <span className="cnt"><b className="num">{list.length}</b><i>{AR ? 'عقود' : 'contracts'}</i></span>
            <span className="chips">
              {Object.keys(byStatus).map(k2 => (
                <span key={k2} className={'d-pill ' + k2}>{(window.EPM.STATUS[k2] ? window.EPM.STATUS[k2][lang] : k2) + ' ' + byStatus[k2]}</span>
              ))}
            </span>
            <span className="sp"></span>
            <span className="per">
              <em>{AR ? 'فترة العقود' : 'Contract period'}</em>
              <b className="num">{(starts[0] || '—') + ' → ' + (dates[dates.length - 1] || '—')}</b>
            </span>
          </header>

          {/* value reconciliation: original + addenda = effective */}
          <div className="d-recon">
            <div className="tm">
              <span className="k">{AR ? 'القيمة الأصلية' : 'Original value'}</span>
              <DMoney v={totalValue} lang={lang} size="md" />
            </div>
            <span className="op">{addendaImpact < 0 ? '−' : '+'}</span>
            <div className={'tm' + (addendaImpact ? (addendaImpact > 0 ? ' bad' : ' good') : ' zero')}>
              <span className="k">{AR ? 'أثر الملاحق' : 'Addenda impact'}</span>
              <DMoney v={Math.abs(addendaImpact)} lang={lang} size="md" />
              <span className="n">{totalAddenda} {AR ? 'ملحق' : 'addenda'}{totalPending ? ' · ' + totalPending + (AR ? ' قيد الاعتماد' : ' pending') : ''}</span>
            </div>
            <span className="op eq">=</span>
            <div className="tm strong">
              <span className="k">{AR ? 'القيمة النافذة' : 'Effective value'}</span>
              <DMoney v={totalEffective} lang={lang} size="md" />
            </div>
          </div>

          {/* part-to-whole ratios read as bars, not as paired numbers */}
          <div className="d-csum-bars">
            <div className="bx">
              <div className="bh">
                <span className="k">{AR ? 'الصرف من القيمة النافذة' : 'Spent of effective value'}</span>
                <b className="num">{spentPct}%</b>
              </div>
              <span className="track"><i style={{ width: spentPct + '%', background: 'var(--success)' }}></i></span>
              <div className="bf">
                <span><em>{AR ? 'مصروف' : 'spent'}</em> <DMoney v={totalSpent} lang={lang} size="xs" /></span>
                <span><em>{AR ? 'متبقٍ' : 'remaining'}</em> <DMoney v={Math.max(0, totalEffective - totalSpent)} lang={lang} size="xs" /></span>
              </div>
            </div>
            <div className="bx">
              <div className="bh">
                <span className="k">{AR ? 'الإنجاز المادي المرجّح' : 'Weighted physical progress'}</span>
                <b className="num">{wPhys}%</b>
              </div>
              <span className="track"><i style={{ width: wPhys + '%', background: 'var(--viz-1)' }}></i>
                <u style={{ insetInlineStart: spentPct + '%' }} title={AR ? 'نسبة الصرف' : 'spend %'}></u></span>
              <div className="bf">
                <span>{AR ? 'مرجّح بقيمة كل عقد · العلامة = نسبة الصرف' : 'weighted by contract value · marker = spend %'}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="d-contract-grid">
          {rows.map(rr => (
            <button key={rr.x.key} className="d-contract-card" onClick={() => setSelKey(rr.x.key)}>
              <div className="d-contract-card-top">
                <div className="d-contract-card-title">
                  <b>{rr.x.name}</b>
                  <span className="mono">{rr.x.code}</span>
                </div>
                <DPill status={rr.x.status} lang={lang} />
              </div>

              <div className="d-contract-card-val">
                <span className="lbl">{rr.addenda > 0 ? (AR ? 'القيمة النافذة' : 'Effective value') : (AR ? 'قيمة العقد' : 'Contract value')}</span>
                <DMoney v={rr.effective} lang={lang} size="lg" />
                {rr.addenda > 0 ? (
                  <span className="delta">
                    {rr.effective > rr.x.raw.contractCost ? '▲ ' : '▼ '}
                    {window.fmtNum(Math.abs(rr.effective - rr.x.raw.contractCost))}
                    <em>{AR ? ' عن الأصلية ' : ' vs original '}{window.fmtNum(rr.x.raw.contractCost)} {AR ? 'د.ع' : 'IQD'}</em>
                  </span>
                ) : (
                  <span className="delta quiet">{AR ? 'القيمة الأصلية دون تعديل' : 'original value, unamended'}</span>
                )}
              </div>

              <div className="d-contract-card-mtx">
                <div className="d-contract-mini">
                  <div className="hd"><span>{AR ? 'الإنجاز المادي' : 'Physical'}</span><b>{rr.x.raw.physicalPct}%</b></div>
                  <div className="d-progress"><span className="t" style={{ height: 6 }}><span style={{ width: rr.x.raw.physicalPct + '%', background: 'var(--viz-1)' }}></span></span></div>
                </div>
                <div className="d-contract-mini">
                  <div className="hd"><span>{AR ? 'المصروف' : 'Spent'}</span><b>{rr.spentPct}%</b></div>
                  <div className="d-progress"><span className="t" style={{ height: 6 }}><span style={{ width: rr.spentPct + '%', background: 'var(--success)' }}></span></span></div>
                </div>
              </div>

              <dl className="d-contract-card-kv">
                <div><dt>{AR ? 'المقاول' : 'Contractor'}</dt><dd>{rr.contractor}</dd></div>
                <div><dt>{AR ? 'المكوّن' : 'Component'}</dt><dd>{rr.component || '—'}</dd></div>
                <div><dt>{AR ? 'المدة' : 'Period'}</dt><dd className="num">{(rr.start || '—') + ' → ' + (rr.finish || '—')}</dd></div>
                <div><dt>{AR ? 'المصروف' : 'Spent'}</dt><dd><DMoney v={rr.x.raw.totalSpent} lang={lang} size="sm" /></dd></div>
              </dl>

              <div className="d-contract-card-foot">
                <span className="tags">
                  {rr.addenda > 0 && <span className="tg">{rr.addenda} {AR ? 'ملحق' : 'addenda'}</span>}
                  {rr.pend > 0 && <span className="tg warn">{rr.pend} {AR ? 'قيد الاعتماد' : 'pending'}</span>}
                  {!rr.addenda && !rr.pend && <span className="tg quiet">{AR ? 'بلا ملاحق' : 'no addenda'}</span>}
                </span>
                <span className="go">{AR ? 'فتح العقد' : 'Open contract'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></span>
              </div>
            </button>
          ))}
        </div>
      </DModuleFrame>
    );
  }

  const r = c.raw;
  const amdCount = amd ? (amd.versions.length - 1) + amd.pending.length : 0;
  const pays = (d.financial && d.financial.payments) || [];
  const contractPays = pays.filter(pay => (pay.allocations || []).some(a => a.contractKey === c.key));
  const openPay = contractPays.find(pay => pay.no === openPayNo);
  const openAlloc = openPay && (openPay.allocations || []).find(a => a.contractKey === c.key);
  const openCerts = openPay ? (openPay.attachments || []).filter(at => !at.contractKey || at.contractKey === c.key) : [];
  /* Contract fields as semantic groups (L12: titled groups, max 7 fields),
     not one flat grid of 23. Anything unmatched falls through to identity. */
  const CGROUPS = [
    { id: 'sec-terms', ar: 'هوية العقد', en: 'Contract identity',
      subAr: 'التعريف والمكوّن', subEn: 'Identification & component',
      re: /contract name|contract code|component|contract status/i },
    { id: 'sec-dates', ar: 'التواريخ والمدة', en: 'Dates & duration',
      subAr: 'المباشرة والإنجاز والمراسلات الرسمية', subEn: 'Start, finish & official correspondence',
      re: /start date|finish date|official incoming|duration|time extensions/i },
    { id: 'sec-amounts', ar: 'المبالغ التعاقدية', en: 'Contract amounts',
      subAr: 'الإحالة والاحتياط والإشراف', subEn: 'Award, reserve & supervision',
      re: /award amount|reserve amount|supervision & monitoring amount/i },
    { id: 'sec-spend', ar: 'المصروف', en: 'Disbursement',
      subAr: 'المنصرف مقابل كل بند', subEn: 'Spent against each line',
      re: /spent from|total spent|cumulative contract spend/i },
    { id: 'sec-perf', ar: 'الأداء والالتزامات', en: 'Performance & obligations',
      subAr: 'نسب الإنجاز والغرامات والضمانات', subEn: 'Progress, penalties & guarantees',
      re: /physical %|financial %|penalty|guarantees/i },
  ];
  const cUsed = new Set();
  CGROUPS.forEach(g => {
    g.fields = (c.fields || []).filter(f => !cUsed.has(f) && g.re.test(f.label.en || ''));
    g.fields.forEach(f => cUsed.add(f));
  });
  CGROUPS[0].fields = CGROUPS[0].fields.concat((c.fields || []).filter(f => !cUsed.has(f)));
  const cShownGroups = CGROUPS.filter(g => g.fields.length);

  const cActivity = window.EPM.buildProjectActivity(d, lang, {
    logs: ['contract', 'contractor'], vos: true,
    fields: [...(c.fields || []), ...((c.contractor && c.contractor.fields) || (d.contractor && d.contractor.fields) || [])].map(f => f.label[lang]),
  });
  const CTABS = [
    { id: 'overview', label: AR ? 'نظرة عامة' : 'Overview' },
    { id: 'details', label: AR ? 'التفاصيل' : 'Details' },
    { id: 'payments', label: AR ? 'الدفعات' : 'Payments', n: contractPays.length },
    { id: 'amend', label: AR ? 'الملاحق والتعديلات' : 'Addenda & amendments', n: amdCount },
    { id: 'log', label: AR ? 'سجل النشاط' : 'Activity log', n: cActivity.filter(a2 => a2.kind === 'system').length },
  ];
  /* the contract's own attributes — Z2 carries the project, so the record
     identity lives here as a metadata strip rather than a second header. */
  const cfld = re => { const f = (c.fields || []).find(x => re.test(x.label.en || '')); return f ? f.value : null; };
  const effective = amd ? amd.effective.value : r.contractCost;
  const CMETA = [
    { k: AR ? 'المقاول المنفّذ' : 'Contractor', v: (c.contractor && window.epmContractorName({ contractor: c.contractor }, lang)) || window.epmContractorName(d, lang) },
    { k: AR ? 'المكوّن' : 'Component', v: cfld(/component/i) },
    { k: AR ? 'المباشرة' : 'Start', v: cfld(/start date/i), num: true },
    { k: AR ? 'الإنجاز التعاقدي' : 'Finish', v: cfld(/finish date/i), num: true },
    { k: AR ? 'مبلغ الإحالة' : 'Award amount', v: r.contractCost, money: true },
    { k: AR ? 'القيمة النافذة' : 'Effective value', v: effective, money: true },
    { k: AR ? 'المصروف' : 'Spent', v: r.totalSpent, money: true },
    { k: AR ? 'الكتاب الرسمي' : 'Incoming no.', v: cfld(/official incoming no/i), num: true },
  ].filter(x => x.v != null && x.v !== '');
  return (
    <DModuleFrame
      tabs={CTABS} tab={cTab} onTab={setCTab}
      title={c.name}
      sub={c.code}
      back={list.length > 1 ? (
        <button className="d-btn sm ghost" onClick={() => setSelKey(null)} title={AR ? 'العودة إلى سجل العقود' : 'Back to contract register'}>
          <Icon name={AR ? 'arrow_forward' : 'arrow_back'} size={15} />{AR ? 'سجل العقود' : 'Contract register'}
        </button>
      ) : null}
      aside={openAmd ? (
        <DRecordPane lang={lang} wide={paneWide}
          title={openAmd.label}
          meta={[
            { k: AR ? 'المصدر' : 'Source', v: openAmd.source, num: true },
            { k: AR ? 'التاريخ' : 'Date', v: openAmd.date, num: true },
            { k: AR ? 'الحالة' : 'State', v: AR ? window.AMD_STATE[openAmd.state].ar : window.AMD_STATE[openAmd.state].en },
            { k: AR ? 'العقد' : 'Contract', v: c.code, num: true },
          ]}
          onExpand={() => setPaneWide(w => !w)}
          onClose={() => { setOpenAmd(null); setPaneWide(false); }}
          footer={<button className="d-btn sm" onClick={() => showToast && showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}>
            <Icon name="download" size={15} />{AR ? 'تصدير الملحق' : 'Export addendum'}</button>}>
          <DAmendmentRecord lang={lang} amd={openAmd} />
        </DRecordPane>
      ) : openPay ? (
        <DRecordPane lang={lang} wide={paneWide}
          title={openPay.no}
          meta={[
            { k: AR ? 'المبلغ' : 'Amount', v: openAlloc ? openAlloc.amount : 0, money: true },
            { k: AR ? 'التاريخ' : 'Date', v: openPay.date, num: true },
            { k: AR ? 'كتاب التمويل' : 'Finance letter', v: openPay.financeLetter.no, num: true },
            { k: AR ? 'العقد' : 'Contract', v: c.code, num: true },
          ]}
          onExpand={() => setPaneWide(w => !w)}
          onClose={() => { setOpenPayNo(null); setPaneWide(false); }}
          footer={<button className="d-btn sm" onClick={() => showToast && showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}>
            <Icon name="download" size={15} />{AR ? 'تصدير الدفعة' : 'Export payment'}</button>}>
          <DRecordGrp label={AR ? 'تفصيل الدفعة لهذا العقد' : 'Payment breakdown for this contract'}>
            <table className="d-line-table">
              <thead><tr><th>{AR ? 'البند' : 'Item'}</th>
                <th className="r">{AR ? 'المبلغ' : 'Amount'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th></tr></thead>
              <tbody>{openAlloc && openAlloc.items.map((it, k) => (
                <tr key={k}><td className="name wrap">{it.name}</td>
                  <td className="r"><DMoney v={it.value} lang={lang} size="sm" bare /></td></tr>))}</tbody>
            </table>
          </DRecordGrp>
          <DRecordGrp label={AR ? 'المرفقات' : 'Attachments'}>
            {openCerts.length
              ? <DFiles files={openCerts.map(at => ({ name: at.name, meta: at.file + ' · ' + at.size }))} />
              : <span className="d-cell-sub">{AR ? 'لا توجد مرفقات' : 'No attachments'}</span>}
          </DRecordGrp>
        </DRecordPane>
      ) : null}
      asideWide={paneWide}
      actions={<React.Fragment>
        {cTab === 'details' && frameActions}
        {(cTab === 'payments' || cTab === 'amend') && (
          <button className="d-btn sm" onClick={() => showToast && showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}>
            <Icon name="download" size={15} />{AR ? 'تصدير' : 'Export'}</button>
        )}
      </React.Fragment>}
      status={(cTab === 'payments' || cTab === 'amend') ? (
        <DZ10 lang={lang} asOf={d.asOf} stats={cTab === 'payments'
          ? [{ k: AR ? 'الدفعات' : 'Payments', v: contractPays.length },
             { k: AR ? 'الإجمالي' : 'Total', money: true, v: contractPays.reduce((a, pay) => a + (((pay.allocations || []).find(al => al.contractKey === c.key) || {}).amount || 0), 0) }]
          : [{ k: AR ? 'الملاحق' : 'Addenda', v: amdCount },
             { k: AR ? 'القيمة النافذة' : 'Effective', v: effective, money: true }]} />
      ) : null}>

      {/* record identity as attributes — the overview facet only, so it does
          not repeat above every tab's payload */}
      {cTab === 'overview' && <dl className="d-meta">
        <div className="d-meta-i"><dt>{AR ? 'العقد' : 'Contract'}</dt>
          <dd>{c.name} <span className="mono" style={{ color: 'var(--fg-subtle)' }}>{c.code}</span></dd></div>
        <div className="d-meta-i"><dt>{AR ? 'الحالة' : 'Status'}</dt>
          <dd><DPill status={c.status} lang={lang} /></dd></div>
        {CMETA.map((m, i) => (
          <div className="d-meta-i" key={i}><dt>{m.k}</dt>
            <dd className={m.num ? 'num' : ''}>{m.money ? <DMoney v={m.v} lang={lang} size="sm" /> : m.v}</dd></div>
        ))}
      </dl>}

        {cTab === 'overview' && <React.Fragment>
          {/* Financial position — the reconciliation strip + part-to-whole bars
              already used on the register, so both levels read identically. */}
          <section className="d-csum">
            <header className="hd">
              <span className="cnt"><b className="num">{r.contractCost ? Math.round(r.totalSpent / r.contractCost * 100) : 0}</b><i>%</i></span>
              <span className="chips"><span className="d-cell-sub">{AR ? 'من كلفة العقد الكلية' : 'of total contract cost'}</span></span>
              <span className="sp"></span>
              <span className="per">
                <em>{AR ? 'كلفة العقد الكلية' : 'Total contract cost'}</em>
                <b className="num"><DMoney v={r.contractCost} lang={lang} size="sm" /></b>
              </span>
            </header>

            <div className="d-csum-bars">
              <div className="bx">
                <div className="bh">
                  <span className="k">{AR ? 'الإنجاز المادي' : 'Physical completion'}</span>
                  <b className="num">{r.physicalPct}%</b>
                </div>
                <span className="track"><i style={{ width: r.physicalPct + '%', background: 'var(--viz-1)' }}></i>
                  <u style={{ insetInlineStart: r.financialPct + '%' }} title={AR ? 'الإنجاز المالي' : 'financial %'}></u></span>
                <div className="bf"><span>{AR ? 'نسبة تنفيذ الأعمال · العلامة = الإنجاز المالي' : 'work executed · marker = financial %'}</span></div>
              </div>
              <div className="bx">
                <div className="bh">
                  <span className="k">{AR ? 'الإنجاز المالي' : 'Financial completion'}</span>
                  <b className="num">{r.financialPct}%</b>
                </div>
                <span className="track"><i style={{ width: r.financialPct + '%', background: 'var(--success)' }}></i></span>
                <div className="bf">
                  <span><em>{AR ? 'مصروف' : 'spent'}</em> <DMoney v={r.totalSpent} lang={lang} size="xs" /></span>
                  <span><em>{AR ? 'متبقٍ' : 'remaining'}</em> <DMoney v={Math.max(0, r.contractCost - r.totalSpent)} lang={lang} size="xs" /></span>
                </div>
              </div>
            </div>
          </section>

          {/* Cost breakdown — one group, one card per component */}
          <DFGroup id="sec-cost" title={AR ? 'تفصيل كلفة العقد' : 'Contract cost breakdown'}
            sub={AR ? 'الإحالة · الاحتياط · الإشراف' : 'Award · reserve · supervision'}>
            <div className="d-costsplit">
              {[
                [AR ? 'الإحالة' : 'Award', r.awardAmt, r.spentAward],
                [AR ? 'الاحتياط' : 'Reserve', r.reserveAmt, r.spentReserve],
                [AR ? 'الإشراف والمراقبة' : 'Supervision & monitoring', r.supervisionAmt, r.spentSupervision],
              ].map((row, i) => {
                const pct = row[1] ? Math.min(100, Math.round(row[2] / row[1] * 100)) : 0;
                return (
                  <div className="cs" key={i}>
                    <div className="ch"><span className="k">{row[0]}</span><b className="num">{pct}%</b></div>
                    <DMoney v={row[1]} lang={lang} size="md" />
                    <span className="track"><i style={{ width: pct + '%' }}></i></span>
                    <div className="cf"><em>{AR ? 'مصروف' : 'spent'}</em><DMoney v={row[2]} lang={lang} size="xs" /></div>
                  </div>
                );
              })}
            </div>
          </DFGroup>
        </React.Fragment>}

        {cTab === 'details' && <React.Fragment>
          {cShownGroups.map(g => (
            <DFGroup key={g.id} id={g.id} title={AR ? g.ar : g.en} sub={AR ? g.subAr : g.subEn}>
              <DFieldGrid fields={g.fields} lang={lang} editMode={editMode} scope="contract" />
            </DFGroup>
          ))}
          <DFGroup id="sec-contractor" title={t('mod_contractor')}
            sub={AR ? 'بيانات المقاول المنفّذ' : 'Executing contractor'}>
            <DFieldGrid fields={c.contractor.fields} lang={lang} editMode={editMode} scope="contractor" />
          </DFGroup>
        </React.Fragment>}

        {cTab === 'amend' && <DContractAmendments lang={lang} c={c} d={d} p={p}
          openAmd={openAmd} onOpenAmd={setOpenAmd} />}

        {cTab === 'log' && <DActivityLog lang={lang} items={cActivity} />}

        {cTab === 'payments' && (contractPays.length ? (
          <div className="d-tablewrap">
            <table className="d-table">
              <thead><tr>
                <th>{AR ? 'رقم الدفعة' : 'Payment no.'}</th>
                <th>{AR ? 'كتاب التمويل' : 'Finance letter'}</th>
                <th>{AR ? 'التاريخ' : 'Date'}</th>
                <th>{AR ? 'البنود' : 'Lines'}</th>
                <th className="r">{AR ? 'المبلغ' : 'Amount'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
              </tr></thead>
              <tbody>
                {contractPays.map((pay, i) => {
                  const alloc = (pay.allocations || []).find(a2 => a2.contractKey === c.key);
                  return (
                    <tr key={i} onClick={() => setOpenPayNo(pay.no)} style={{ cursor: 'pointer' }}
                      className={openPayNo === pay.no ? 'sel' : ''}>
                      <td className="mono d-cell-sub">{pay.no}</td>
                      <td className="d-cell-strong">{pay.financeLetter.no}</td>
                      <td className="num d-cell-sub">{pay.date}</td>
                      <td className="num d-cell-sub">{(alloc && alloc.items ? alloc.items.length : 0)}</td>
                      <td className="r"><DMoney v={alloc ? alloc.amount : 0} lang={lang} size="sm" bare /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr>
                <td colSpan={4}>{AR ? 'الإجمالي' : 'Total'}</td>
                <td className="r"><DMoney v={contractPays.reduce((a2, pay) => a2 + (((pay.allocations || []).find(al => al.contractKey === c.key) || {}).amount || 0), 0)} lang={lang} size="sm" bare /></td>
              </tr></tfoot>
            </table>
          </div>
        ) : (
          <div className="d-empty">
            <span className="d-empty-ico"><Icon name="payments" size={26} /></span>
            <b>{AR ? 'لا توجد دفعات مسجلة لهذا العقد' : 'No payments recorded for this contract'}</b>
          </div>
        ))}

    </DModuleFrame>
  );
}

function DModConsultant({ t, lang, d, editMode }) {
  const spentPct = Math.min(100, Math.round(d.consultant.fields[2].value.toString().replace(/\D/g,'') / d.consultant.fields[1].value.toString().replace(/\D/g,'') * 100)) || 0;
  return (
    <React.Fragment>
      <DSec icon="engineering" title={t('mod_consultant')}>
        <DFieldGrid fields={d.consultant.fields} lang={lang} editMode={editMode} scope="consultant" />
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
  // capture the entered amounts + finance letter so the payment is real
  const [amts, setAmts] = React.useState({});
  const [flNo, setFlNo] = React.useState('FIN-7211');
  const [flDate, setFlDate] = React.useState('2026-07-20');
  const amtOf = (k, j) => Number(amts[k + '|' + j]) || 0;
  const total = contracts.filter(c => sel.includes(c.key)).reduce((s, c) => s + ITEMS.reduce((a, _, j) => a + amtOf(c.key, j), 0), 0);
  const buildPayment = () => {
    const allocations = contracts.filter(c => sel.includes(c.key)).map(c => ({
      contractKey: c.key, contractName: c.name,
      amount: ITEMS.reduce((a, _, j) => a + amtOf(c.key, j), 0),
      items: ITEMS.map((it, j) => ({ name: it, value: amtOf(c.key, j) })),
    }));
    return { date: flDate, amount: total, financeLetter: { no: flNo, date: flDate },
      allocations, attachments: [], by: AR ? 'أنت' : 'You' };
  };
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
                  {ITEMS.map((it, j) => <div key={j}><label className="d-cell-sub" style={{ fontSize: 11 }}>{it}</label><input className="d-form-input mono" placeholder="0" value={amts[c.key + '|' + j] || ''} onChange={e => setAmts(a => ({ ...a, [c.key + '|' + j]: e.target.value.replace(/[^\d.]/g, '') }))} /></div>)}
                </div>
              </div>
            ))}
            <div className="d-callout"><span className="d-callout-ico"><Icon name="functions" size={18} /></span><div className="d-callout-tx"><b style={{ fontSize: 12, fontWeight: 'var(--fw-bold)' }}>{AR ? 'كل مبلغ يُخصَّص لعقد وبند من بنود مصروفات العقد الثلاث (الإحالة/الاحتياط/الإشراف).' : 'Each amount is allocated to a contract and one of the three contract expense items (award/reserve/supervision).'}</b></div></div>
          </div>}
          {step === 2 && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="d-cell-sub">{AR ? 'رقم كتاب المالية' : 'Finance letter no.'}</label><input className="d-form-input mono" value={flNo} onChange={e => setFlNo(e.target.value)} /></div>
              <div><label className="d-cell-sub">{AR ? 'تاريخ الكتاب' : 'Letter date'}</label><input className="d-form-input mono" value={flDate} onChange={e => setFlDate(e.target.value)} /></div>
            </div>
            <div className="d-drop"><Icon name="upload_file" size={26} /><b>{AR ? 'أرفق كتاب المالية' : 'Attach the finance letter'}</b><span className="d-cell-sub">{AR ? 'PDF — تجريبي' : 'PDF — demo'}</span></div>
          </div>}
          {step === 3 && <div className="d-drop"><Icon name="upload_file" size={30} /><b>{AR ? 'أرفق ذرعات الأعمال لكل عقد مشمول' : 'Attach work measurement certificates for each covered contract'}</b><span className="d-cell-sub">{AR ? 'PDF / صور — تجريبي' : 'PDF / images — demo'}</span></div>}
          {step === 4 && <div className="d-card-sub" style={{ padding: 14 }}><table className="d-line-table"><tbody>
            <tr><td>{AR ? 'العقود المشمولة' : 'Contracts covered'}</td><td>{contracts.filter(c => sel.includes(c.key)).map(c => c.name).join(' · ')}</td></tr>
            <tr><td>{AR ? 'المبلغ الإجمالي' : 'Total amount'}</td><td className="mono">{window.fmtNum(total)} IQD</td></tr>
            <tr><td>{AR ? 'كتاب المالية' : 'Finance letter'}</td><td className="mono">{flNo} · {flDate}</td></tr>
          </tbody></table></div>}
        </div>
        <div className="d-modal-foot">{step > 0 && <button className="d-btn ghost" onClick={() => setStep(s => s - 1)}>{AR ? 'السابق' : 'Back'}</button>}<div style={{ flex: 1 }}></div>{step < steps.length - 1 ? <button className="d-btn primary" onClick={() => setStep(s => s + 1)}>{AR ? 'التالي' : 'Next'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={16} /></button> : <button className="d-btn primary" onClick={() => onDone(buildPayment())}><Icon name="check" size={16} />{AR ? 'تسجيل الدفعة' : 'Register payment'}</button>}</div>
      </div>
    </div>
  );
}

/* الموقف المالي — L16 Financial sheet.
   The archetype's own words: "a reconciled matrix of money with roll-ups …
   every number must reconcile and drill to its source records".
     Z3  reconciliation strip — approved · revised · spend + % · balance,
         pinned so it stays visible while the sheet scrolls
     Z5  year tabs (allocation here IS annual) + الإجمالي
     Z7  the sheet: two header tiers (الموازنة / الفعلي / التنبؤ), frozen
         identity column, indented hierarchy with bold roll-ups, sticky
         totals footer, negatives in parentheses and danger colour
     Z8  the record behind a clicked payment
     Z10 totals + as-of
   No Z9: money moves through payment and change-order records, never by
   editing the sheet. */
function DModFinancialNew({ t, lang, d, p, editMode, showToast, frameActions }) {
  const r = d.financial.raw;
  const AR = lang === 'ar';
  const [showPay, setShowPay] = React.useState(false);
  const [openPayNo, setOpenPayNo] = React.useState(null);
  const [paneWide, setPaneWide] = React.useState(false);
  const [openRows, setOpenRows] = React.useState({});
  const curYear = (r.yearlyAllocations.find(y => y.current) || r.yearlyAllocations[r.yearlyAllocations.length - 1]).year;
  const [selYear, setSelYear] = React.useState(curYear);
  React.useEffect(() => { const h = () => setShowPay(true); window.addEventListener('epm:pay-register', h); return () => window.removeEventListener('epm:pay-register', h); }, []);
  /* the open record belongs to the year that was showing when it was
     opened; changing the Z5 year closes it rather than leaving a record
     from another period docked beside this one's figures */
  React.useEffect(() => { setOpenPayNo(null); setPaneWide(false); }, [selYear]);

  /* registered payments persist per project and merge with the seeded ones */
  const [extraPays, setExtraPays] = window.usePersistedState('payments.rows.' + (window.__epmPid || 'na'), []);
  const allPayments = React.useMemo(() => [...(d.financial.payments || []), ...extraPays], [d.financial.payments, extraPays]);
  const registerPayment = (pay) => {
    // §2.9.3 gate: amount > 0 and cumulative spend must not exceed the revised cost
    const cumBefore = allPayments.reduce((sum, x) => sum + (x.amount || 0), 0);
    const vres = window.EPM.validate('financial', { annualSpend: 0, annualAllocation: 0, cumulative: cumBefore + (pay.amount || 0), revisedCost: r.revisedCost || r.cost });
    if ((pay.amount || 0) <= 0) { showToast(AR ? 'قيمة الدفعة يجب أن تكون أكبر من صفر' : 'Payment amount must be greater than zero'); return; }
    if (!vres.ok) { showToast(AR ? vres.errors[0].ar : vres.errors[0].en); return; }
    const no = 'PAY-' + (allPayments.length + 120);
    setExtraPays(ps => [...ps, Object.assign({ no: no }, pay)]);
    const yr2 = new Date(pay.date).getFullYear();
    if (r.yearlyAllocations.some(y => y.year === yr2)) setSelYear(yr2);
    window.EPM.pushEvent && window.EPM.pushEvent({ icon: 'payments', tone: 'azure', txtAr: 'سجّلتَ دفعة مالية ' + no + ' على', txtEn: 'you registered payment ' + no + ' on', tgt: (window.__epmPid || '') });
    showToast(AR ? 'تم تسجيل الدفعة — ' + no : 'Payment registered — ' + no);
  };

  const ALL = 'all';
  const inYear = dt => selYear === ALL || new Date(dt).getFullYear() === selYear;
  const yr = r.yearlyAllocations.find(y => y.year === selYear);
  const yrPayments = allPayments.filter(pay => inYear(pay.date));
  const yrPct = yr && yr.allocation ? Math.min(100, Math.round(yr.spend / yr.allocation * 100)) : 0;

  /* ---- the sheet ------------------------------------------------------
     Rows are the project's contracts and, under each, the three cost
     components the contract is actually made of. Budget is contractual,
     actuals come from the payment records, so every cell drills to a
     source. Figures are whole IQD; the unit is stated once, in the
     grid bar, exactly as the archetype requires. */
  const contracts = d.contracts || [];
  const voNet = React.useMemo(() => {
    const m = {};
    (d.variationOrders || []).filter(v => v.status === 'approved').forEach(v => {
      const k = window.voContractKey ? window.voContractKey(v, d.contracts) : 'main';
      m[k] = (m[k] || 0) + (v.net != null ? v.net : v.value || 0);
    });
    return m;
  }, [d.variationOrders]);

  /* spend by contract + component, scoped to the selected year */
  const spendOf = React.useMemo(() => {
    const m = {};
    yrPayments.forEach(pay => (pay.allocations || []).forEach(al => {
      (al.items || []).forEach((it, i) => {
        const k = al.contractKey + ':' + i;
        m[k] = (m[k] || 0) + (it.value || 0);
      });
    }));
    return m;
  }, [yrPayments]);

  const COMP = [
    { i: 0, ar: 'الإحالة', en: 'Award', amt: 'awardAmt', life: 'spentAward' },
    { i: 1, ar: 'الاحتياط', en: 'Reserve', amt: 'reserveAmt', life: 'spentReserve' },
    { i: 2, ar: 'الإشراف والمراقبة', en: 'Supervision & monitoring', amt: 'supervisionAmt', life: 'spentSupervision' },
  ];
  const sheet = contracts.map(c => {
    const cr = c.raw || {};
    const kids = COMP.map(comp => {
      const orig = cr[comp.amt] || 0;
      /* an approved change order changes the award, not the reserve or the
         supervision allowance — so the whole net lands on the first line */
      const chg = comp.i === 0 ? (voNet[c.key] || 0) : 0;
      const revised = orig + chg;
      const spentY = spendOf[c.key + ':' + comp.i] || 0;
      const spentLife = cr[comp.life] || 0;
      const pct = cr.physicalPct || 0;
      /* EAC the EVM way — AC / (physical %) — so a contract spending
         faster than it builds forecasts an overrun. Never capped: a
         clamped forecast hides exactly the case worth reporting. */
      const eac = pct > 0 ? Math.round(spentLife / (pct / 100)) : revised;
      return { key: c.key + ':' + comp.i, name: AR ? comp.ar : comp.en, orig, chg, revised, spentY, spentLife, eac, variance: revised - eac };
    });
    const sum = f => kids.reduce((t2, k) => t2 + k[f], 0);
    return {
      key: c.key, code: c.code, name: c.name, status: c.status, kids,
      orig: sum('orig'), chg: sum('chg'), revised: sum('revised'),
      spentY: sum('spentY'), spentLife: sum('spentLife'), eac: sum('eac'), variance: sum('variance'),
    };
  });
  const tot = f => sheet.reduce((t2, x) => t2 + x[f], 0);
  const sheetTotal = { orig: tot('orig'), chg: tot('chg'), revised: tot('revised'), spentY: tot('spentY'), spentLife: tot('spentLife'), eac: tot('eac'), variance: tot('variance') };
  const recordedGap = r.revisedCost - sheetTotal.revised;

  /* a figure cell: tabular, end-aligned, negatives in parentheses + danger */
  const N = (v, opts) => {
    const o = opts || {};
    const neg = v < 0;
    const txt = (neg ? '(' + window.fmtNum(Math.abs(Math.round(v))) + ')' : window.fmtNum(Math.round(v)));
    return <td className={'r num' + (o.cls ? ' ' + o.cls : '')}
      style={o.tone ? { color: neg ? 'var(--error)' : 'var(--status-completed-tx)' } : null}>
      {o.bold ? <b>{txt}</b> : txt}</td>;
  };

  const openPay = allPayments.find(x => x.no === openPayNo);
  const cumPct = r.revisedCost ? Math.min(100, Math.round(r.disbursed / r.revisedCost * 100)) : 0;
  /* the annual allocation and annual spend were filtered out of this list
     because the old layout printed them in the year card — which left them
     with no edit path at all. They are recorded ministry values like every
     other field here, so they belong in the one editable tab. */
  const projectFields = d.financial.fields;

  /* the year's traceable events — VOs, payments and recorded edits */
  const yrEvents = React.useMemo(() => {
    const vos = (d.variationOrders || []).filter(v => v.status === 'approved' && inYear(v.date));
    const eds = (d.financial.editLog || []).filter(ev => inYear(ev.date));
    return [
      ...vos.map(v => ({ date: v.date, icon: 'sync_alt', by: v.responsible, label: (AR ? 'أمر تغييري معتمد ' : 'Change order approved ') + v.no, note: v.reason, delta: v.net })),
      ...yrPayments.map(pay => ({ date: pay.date, icon: 'payments', by: pay.by, label: (AR ? 'دفعة مسجّلة ' : 'Payment recorded ') + pay.no, note: pay.financeLetter.no, delta: pay.amount })),
      ...eds.flatMap(ev => ev.changes.map(c => ({ date: ev.date, icon: 'edit', by: ev.by, label: c.field, from: c.from, to: c.to }))),
    ].sort((x, y2) => new Date(y2.date) - new Date(x.date));
  }, [d.variationOrders, yrPayments, selYear]);

  /* a recorded edit stores its values pre-formatted; a grouped number is
     money and renders like every other amount on the page */
  const finVal = v => {
    const txt = String(v == null ? '' : v).trim();
    return /^\d{1,3}(,\d{3})+$/.test(txt)
      ? <DMoney v={txt} lang={lang} size="xs" />
      : (txt || '—');
  };

  /* Z5 carries the sheet variants the archetype lists (budget · payments ·
     changes …); the year, being a filter, belongs in the Z6 toolbar. One
     long scroll of six sections was the wrong read for a page whose parts
     are consulted one at a time. */
  const YEARS = [
    ...r.yearlyAllocations.map(y => ({ id: y.year, label: String(y.year) })),
    { id: ALL, label: AR ? 'كل السنوات' : 'All years' },
  ];
  const [secTab, setSecTab] = React.useState('sheet');
  React.useEffect(() => { setOpenPayNo(null); setPaneWide(false); }, [secTab]);
  const STABS = [
    { id: 'sheet', label: AR ? 'جدول الكلف' : 'Cost sheet' },
    { id: 'alloc', label: AR ? 'التخصيص السنوي' : 'Allocation' },
    { id: 'pays', label: AR ? 'الدفعات' : 'Payments', n: yrPayments.length },
    { id: 'sla', label: AR ? 'مهل التدقيق' : 'Audit SLA' },
    { id: 'fields', label: AR ? 'البيانات المسجّلة' : 'Recorded data' },
    { id: 'hist', label: AR ? 'سجل التغييرات' : 'Change history', n: yrEvents.length },
  ];

  return (
    <DModuleFrame
      title={t('mod_financials')}
      sub={AR ? 'د.ع' : 'IQD'}
      tabs={STABS} tab={secTab} onTab={setSecTab}
      toolbar={secTab === 'sheet' || secTab === 'alloc' || secTab === 'pays' || secTab === 'hist' ? (
        <span className="d-yearsel" role="group" aria-label={AR ? 'السنة المالية' : 'Fiscal year'}>
          <em>{AR ? 'السنة' : 'Year'}</em>
          {YEARS.map(y => (
            <button key={y.id} className={selYear === y.id ? 'on' : ''} onClick={() => setSelYear(y.id)}>{y.label}</button>
          ))}
        </span>
      ) : null}
      actions={<React.Fragment>
        {/* تعديل belongs only to the tab that actually holds editable fields */}
        {secTab === 'fields' && frameActions}
        <button className="d-btn sm" onClick={() => showToast(AR ? 'تصدير XLSX — تجريبي' : 'Export XLSX — demo')}>
          <Icon name="download" size={15} />{AR ? 'تصدير' : 'Export'}</button>
      </React.Fragment>}
      aside={openPay ? (
        <DRecordPane lang={lang} wide={paneWide}
          title={openPay.no}
          meta={[
            { k: AR ? 'المبلغ' : 'Amount', v: openPay.amount, money: true },
            { k: AR ? 'التاريخ' : 'Date', v: openPay.date, num: true },
            { k: AR ? 'كتاب التمويل' : 'Finance letter', v: openPay.financeLetter.no, num: true },
            { k: AR ? 'سجّلها' : 'Recorded by', v: openPay.by },
          ]}
          onExpand={() => setPaneWide(w => !w)}
          onClose={() => { setOpenPayNo(null); setPaneWide(false); }}
          footer={<button className="d-btn sm" onClick={() => showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}>
            <Icon name="download" size={15} />{AR ? 'تصدير الدفعة' : 'Export payment'}</button>}>
          <DRecordGrp label={AR ? 'توزيع الدفعة على العقود' : 'Allocation across contracts'}>
            <table className="d-line-table">
              <thead><tr><th>{AR ? 'البند' : 'Item'}</th>
                <th className="r">{AR ? 'المبلغ' : 'Amount'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th></tr></thead>
              <tbody>{(openPay.allocations || []).flatMap((al, ai) => [
                <tr key={'h' + ai} className="grp"><td colSpan={2} className="name">{al.contractName}</td></tr>,
                ...al.items.map((it, ii) => (
                  <tr key={ai + '-' + ii}><td className="wrap d-cell-sub">{it.name}</td>
                    <td className="r"><DMoney v={it.value} lang={lang} size="sm" bare /></td></tr>)),
              ])}</tbody>
              <tfoot><tr><td>{AR ? 'الإجمالي' : 'Total'}</td>
                <td className="r"><DMoney v={openPay.amount} lang={lang} size="sm" bare /></td></tr></tfoot>
            </table>
          </DRecordGrp>
          <DRecordGrp label={AR ? 'كتاب المالية والمرفقات' : 'Finance letter & attachments'}>
            <DFiles files={openPay.attachments.map(at => ({ name: at.name, meta: at.file + ' · ' + at.size }))} />
          </DRecordGrp>
        </DRecordPane>
      ) : null}
      asideWide={paneWide}
      status={<DZ10 lang={lang} asOf={d.asOf} stats={[
        { k: AR ? 'الكلفة المعدلة' : 'Revised cost', v: r.revisedCost, money: true },
        { k: AR ? 'المصروف' : 'Spend', v: r.disbursed, money: true },
        { k: AR ? 'نسبة الصرف' : 'Spend %', v: cumPct + '%' },
      ]} />}>

      {showPay && <DPaymentWizard lang={lang} d={d} onClose={() => setShowPay(false)} onDone={(pay) => { setShowPay(false); if (pay) registerPayment(pay); }} />}

      {/* Z3 — the reconciliation strip. Belongs to the SHEET: the archetype
          puts it there so the totals stay in view while the matrix scrolls.
          On the other tabs it only restated Z10, so it does not render. */}
      {secTab === 'sheet' && <div className="d-fsheet-recon">
        <span className="tm"><em>{AR ? 'الكلفة المقررة' : 'Approved cost'}</em><DMoney v={r.plannedCost} lang={lang} size="sm" /></span>
        <span className="op">+</span>
        <span className="tm"><em>{AR ? 'تغييرات معتمدة' : 'Approved changes'}</em><DMoney v={r.revisedCost - r.plannedCost} lang={lang} size="sm" signed /></span>
        <span className="op">=</span>
        <span className="tm strong"><em>{AR ? 'الكلفة المعدلة' : 'Revised cost'}</em><DMoney v={r.revisedCost} lang={lang} size="sm" /></span>
        <span className="op">−</span>
        <span className="tm"><em>{AR ? 'المصروف التراكمي' : 'Cumulative spend'} <i className="pc">{cumPct}%</i></em><DMoney v={r.disbursed} lang={lang} size="sm" /></span>
        <span className="op">=</span>
        <span className={'tm ' + (r.revisedCost - r.disbursed < 0 ? 'bad' : 'good')}>
          <em>{AR ? 'المتبقي' : 'Balance'}</em><DMoney v={r.revisedCost - r.disbursed} lang={lang} size="sm" /></span>
      </div>}

      {/* ---- the sheet ---- */}
      {secTab === 'sheet' && (
        <DFGroup id="fin-sheet" title={AR ? 'جدول الكلف حسب العقود ومكوّناتها' : 'Cost sheet by contract and component'}
          sub={(AR ? 'د.ع · ' : 'IQD · ') + (selYear === ALL ? (AR ? 'كل السنوات' : 'all years') : selYear)}>
          <div className="d-vow-tw wide-sheet">
            <table className="d-line-table d-sheet">
              <thead>
                <tr className="d-grp">
                  <th className="freeze" style={{ minWidth: 230 }}></th>
                  <th className="grp r" colSpan={3}>{AR ? 'الموازنة' : 'Budget'}</th>
                  <th className="grp r" colSpan={2}>{AR ? 'الفعلي' : 'Actual'}</th>
                  <th className="grp r" colSpan={2}>{AR ? 'التنبؤ' : 'Forecast'}</th>
                  <th></th>
                </tr>
                <tr>
                  <th className="freeze" style={{ minWidth: 230 }}>{AR ? 'بند الكلفة' : 'Cost item'}</th>
                  <th className="r" style={{ width: 128 }}>{AR ? 'المقررة' : 'Approved'}</th>
                  <th className="r" style={{ width: 124 }}>{AR ? 'تغييرات معتمدة' : 'Approved changes'}</th>
                  <th className="r" style={{ width: 128 }}>{AR ? 'المعدلة' : 'Revised'}</th>
                  <th className="r" style={{ width: 128 }}>{selYear === ALL ? (AR ? 'مصروف' : 'Spend') : (AR ? 'مصروف السنة' : 'Spend this year')}</th>
                  <th className="r" style={{ width: 128 }}>{AR ? 'مصروف تراكمي' : 'Cumulative spend'}</th>
                  <th className="r" style={{ width: 128 }}>{AR ? 'عند الإنجاز' : 'At completion'}</th>
                  <th className="r" style={{ width: 116 }}>{AR ? 'الفرق' : 'Variance'}</th>
                  <th style={{ width: 128 }}>{AR ? 'الحالة' : 'State'}</th>
                </tr>
              </thead>
              <tbody>
                {sheet.map(row => {
                  const open = openRows[row.key] !== false;
                  return (
                    <React.Fragment key={row.key}>
                      <tr className="lvl1" onClick={() => setOpenRows(o => Object.assign({}, o, { [row.key]: !open }))}
                        style={{ cursor: 'pointer' }}>
                        <td className="freeze">
                          <span className="d-tree lvl1"><Icon name={open ? 'expand_more' : (AR ? 'chevron_left' : 'chevron_right')} size={15} className="tw" />
                            <b>{row.code}</b><span className="nm">{row.name}</span></span>
                        </td>
                        {N(row.orig)}{N(row.chg)}{N(row.revised, { bold: true })}
                        {N(row.spentY)}{N(row.spentLife)}{N(row.eac)}{N(row.variance, { tone: true })}
                        <td>{row.status ? <DPill status={row.status} lang={lang} /> : null}</td>
                      </tr>
                      {open && row.kids.map(k => (
                        <tr key={k.key} className="lvl2">
                          <td className="freeze"><span className="d-tree lvl2">{k.name}</span></td>
                          {N(k.orig)}{N(k.chg)}{N(k.revised)}
                          {N(k.spentY)}{N(k.spentLife)}{N(k.eac)}{N(k.variance, { tone: true })}
                          <td></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="freeze">{AR ? 'إجمالي العقود' : 'Total — contracts'}</td>
                  {N(sheetTotal.orig)}{N(sheetTotal.chg)}{N(sheetTotal.revised, { bold: true })}
                  {N(sheetTotal.spentY)}{N(sheetTotal.spentLife)}{N(sheetTotal.eac)}{N(sheetTotal.variance, { tone: true })}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <DMsgBar tone="info"
            title={AR ? 'أساسا القياس: الموازنة المعتمدة مقابل الالتزامات التعاقدية'
                      : 'Two bases: approved budget vs contracted commitments'}>
            {AR ? 'الكلفة المعدلة المسجّلة ' : 'The recorded revised cost '}
            <DMoney v={r.revisedCost} lang={lang} size="sm" />
            {AR ? ' هي الموازنة المعتمدة للمشروع، بينما إجمالي العقود '
                : ' is the project\'s approved budget, while the contracts total '}
            <DMoney v={sheetTotal.revised} lang={lang} size="sm" />
            {AR ? ' هو قيمة ما التُزم به تعاقدياً — الفرق ' : ' is what has been contractually committed — difference '}
            <DMoney v={recordedGap} lang={lang} size="sm" signed />
            {recordedGap >= 0
              ? (AR ? ' لم يُتعاقَد عليه بعد.' : ' not yet contracted.')
              : (AR ? '، أي أن الالتزامات تتجاوز الموازنة وتستوجب تعديل الكلفة أو مناقلة.'
                    : ', so commitments exceed the budget and need a cost revision or a reallocation.')}
          </DMsgBar>
        </DFGroup>
      )}

      {/* ---- annual allocation ---- */}
      {secTab === 'alloc' && (yr ? (
        <DFGroup id="fin-year" title={AR ? 'التخصيص السنوي' : 'Annual allocation'}
          sub={selYear + (yr.current ? (AR ? ' · السنة الحالية' : ' · current year') : '')}>
          <div className="d-yalloc">
            <div className="ah">
              <span className="k">{AR ? 'نسبة الاستهلاك' : 'Utilisation'}</span>
              <b className="num">{yrPct}%</b>
            </div>
            <span className="track"><i style={{ width: yrPct + '%', background: yrPct > 95 ? 'var(--warning)' : 'var(--viz-1)' }}></i></span>
            <div className="af">
              <span><em>{AR ? 'التخصيص' : 'Allocation'}</em><DMoney v={yr.allocation} lang={lang} size="md" /></span>
              <span><em>{AR ? 'المصروف' : 'Spend'}</em><DMoney v={yr.spend} lang={lang} size="md" /></span>
              <span><em>{AR ? 'المتبقي' : 'Remaining'}</em><DMoney v={yr.allocation - yr.spend} lang={lang} size="md" /></span>
            </div>
          </div>
          {yrPct > 95 && (
            <DMsgBar tone="warning" title={AR ? 'التخصيص السنوي شارف على النفاد' : 'The annual allocation is nearly exhausted'}>
              {AR ? 'أي صرف إضافي يتطلّب مناقلة معتمدة أو تخصيصاً تكميلياً.' : 'Any further spend needs an approved reallocation or a supplementary allocation.'}
            </DMsgBar>
          )}
          <DMsgBar tone="info" title={AR ? 'أين تُحرَّر هذه القيم' : 'Where these values are edited'}>
            {AR ? 'تخصيص السنة الحالية ومصروفها يُحرَّران في تبويب «البيانات المسجّلة» — وهو تبويب التحرير الوحيد في هذه الصفحة. السنوات السابقة سجلّ مقفل، ويغيّرها إجراء مناقلة معتمد لا التحرير المباشر.'
                : 'The current year\'s allocation and spend are edited in the «Recorded data» tab — the only editable tab on this page. Earlier years are a closed record; an approved reallocation changes them, not direct editing.'}
          </DMsgBar>
          <div className="d-vow-tw"><table className="d-line-table">
            <thead><tr>
              <th style={{ width: 92 }}>{AR ? 'السنة' : 'Year'}</th>
              <th className="r" style={{ width: 150 }}>{AR ? 'التخصيص' : 'Allocation'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
              <th className="r" style={{ width: 150 }}>{AR ? 'المصروف' : 'Spend'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
              <th className="r" style={{ width: 150 }}>{AR ? 'المتبقي' : 'Remaining'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
              <th className="r" style={{ width: 90 }}>{AR ? 'الاستهلاك' : 'Used'}</th>
            </tr></thead>
            <tbody>{r.yearlyAllocations.map(y => {
              const pc = y.allocation ? Math.round(y.spend / y.allocation * 100) : 0;
              return (
                <tr key={y.year} className={y.year === selYear ? 'sel' : ''}
                  onClick={() => setSelYear(y.year)} style={{ cursor: 'pointer' }}>
                  <td className="code">{y.year}</td>
                  <td className="r"><DMoney v={y.allocation} lang={lang} size="sm" bare /></td>
                  <td className="r"><DMoney v={y.spend} lang={lang} size="sm" bare /></td>
                  <td className="r"><DMoney v={y.allocation - y.spend} lang={lang} size="sm" bare /></td>
                  <td className="r num">{pc}%</td>
                </tr>);
            })}</tbody>
            <tfoot><tr>
              <td>{AR ? 'الإجمالي' : 'Total'}</td>
              <td className="r"><DMoney v={r.yearlyAllocations.reduce((sum, y) => sum + y.allocation, 0)} lang={lang} size="sm" bare /></td>
              <td className="r"><DMoney v={r.yearlyAllocations.reduce((sum, y) => sum + y.spend, 0)} lang={lang} size="sm" bare /></td>
              <td className="r"><DMoney v={r.yearlyAllocations.reduce((sum, y) => sum + (y.allocation - y.spend), 0)} lang={lang} size="sm" bare /></td>
              <td></td>
            </tr></tfoot>
          </table></div>
        </DFGroup>
      ) : (
        <DFGroup id="fin-year" title={AR ? 'التخصيص السنوي' : 'Annual allocation'}
          sub={AR ? 'كل السنوات' : 'all years'}>
          <div className="d-cell-sub">{AR ? 'اختر سنة من شريط الأدوات لعرض تفاصيل تخصيصها.' : 'Pick a year in the toolbar to see its allocation.'}</div>
        </DFGroup>
      ))}

      {/* ---- payments ---- */}
      {secTab === 'pays' && (
        <DFGroup id="fin-pays" title={AR ? 'سجل الدفعات' : 'Payments register'}
          sub={yrPayments.length + (AR ? ' دفعة · ' : ' payment(s) · ') + (selYear === ALL ? (AR ? 'كل السنوات' : 'all years') : selYear)}>
          {yrPayments.length ? (
            <table className="d-line-table">
              <thead><tr>
                <th style={{ width: 104 }}>{AR ? 'الرمز' : 'Code'}</th>
                <th style={{ minWidth: 180 }}>{AR ? 'كتاب التمويل' : 'Finance letter'}</th>
                <th style={{ width: 108 }}>{AR ? 'التاريخ' : 'Date'}</th>
                <th className="r" style={{ width: 64 }}>{AR ? 'العقود' : 'Contracts'}</th>
                <th className="r" style={{ width: 140 }}>{AR ? 'المبلغ' : 'Amount'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
              </tr></thead>
              <tbody>{yrPayments.map((pay, i) => (
                <tr key={i} onClick={() => setOpenPayNo(pay.no)} style={{ cursor: 'pointer' }}
                  className={openPayNo === pay.no ? 'sel' : ''}>
                  <td className="code">{pay.no}</td>
                  <td className="name wrap">{pay.financeLetter.no}
                    <div className="d-cell-sub">{(pay.allocations || []).map(al => al.contractName).join(' · ')}</div></td>
                  <td className="mono">{pay.date}</td>
                  <td className="r num">{(pay.allocations || []).length}</td>
                  <td className="r"><DMoney v={pay.amount} lang={lang} size="sm" bare /></td>
                </tr>))}</tbody>
              <tfoot><tr>
                <td colSpan={4}>{AR ? 'الإجمالي' : 'Total'}</td>
                <td className="r"><DMoney v={yrPayments.reduce((sum, x) => sum + x.amount, 0)} lang={lang} size="sm" bare /></td>
              </tr></tfoot>
            </table>
          ) : (
            <div className="d-cell-sub">{AR ? 'لا توجد دفعات مسجّلة لهذه السنة.' : 'No payments recorded for this year.'}</div>
          )}
        </DFGroup>
      )}

      {/* ---- advance audit SLA (§2.3.2) ---- */}
      {secTab === 'sla' && (() => {
        const sub = (function () { const tt = new Date(window.EPM.DATA_DATE); tt.setDate(tt.getDate() - 9); return tt.toISOString().slice(0, 10); })();
        const sla = window.EPM.paymentSLA(sub, lang);
        const tone = sla.color === 'red' ? 'danger' : sla.color === 'amber' ? 'warning' : 'success';
        return (
          <DFGroup id="fin-sla" title={AR ? 'مهلة تدقيق السلفة الجارية' : 'Current advance — audit SLA'}
            sub={sla.overdue ? (AR ? 'مُصعّد' : 'escalated') : (AR ? 'ضمن المهلة' : 'within SLA')}>
            <div className="d-slastages">
              {sla.stages.map(st => (
                <div key={st.key} className={'ss ' + st.status}>
                  <div className="sh"><span className="dot"></span><b>{st.label}</b></div>
                  <div className="sm">{st.owner}</div>
                  <div className="sf"><span>{AR ? 'السقف' : 'SLA'} {st.sla}{AR ? 'ي' : 'd'}</span>
                    <span>{st.status === 'done' ? (AR ? 'منجز' : 'done') : st.status === 'active' ? (st.daysIn + (AR ? 'ي مضت' : 'd elapsed')) : (AR ? 'لم تبدأ' : 'pending')}</span></div>
                </div>
              ))}
            </div>
            <DMsgBar tone={tone} title={(AR ? 'الموعد القانوني للصرف ' : 'Legal pay-by date ') + sla.payBy}>
              {(sla.payByDays >= 0 ? (AR ? 'خلال ' + sla.payByDays + ' يوم' : 'in ' + sla.payByDays + ' days') : (AR ? 'متجاوز' : 'overdue'))
                + ' · ' + (AR ? 'المرحلة الحالية: ' : 'current stage: ') + sla.currentLabel
                + (sla.escalated ? (AR ? ' — صُعّد للمستوى الأعلى' : ' — escalated to a higher level') : '')}
            </DMsgBar>
          </DFGroup>
        );
      })()}

      {/* ---- the only editable tab ---- */}
      {secTab === 'fields' && (
        <DFGroup id="fin-fields" title={AR ? 'البيانات المالية المسجّلة' : 'Recorded financial data'}
          sub={AR ? 'قيم معتمدة من الدائرة المالية' : 'values recorded by the finance department'}>
          <DFieldGrid fields={projectFields} lang={lang} editMode={editMode} scope="financial" />
        </DFGroup>
      )}

      {/* ---- traceability ---- */}
      {secTab === 'hist' && (
        <DFGroup id="fin-hist" title={AR ? 'سجل التغييرات المالية' : 'Financial change history'}
          sub={yrEvents.length + (AR ? ' حدث · ' : ' event(s) · ') + (selYear === ALL ? (AR ? 'كل السنوات' : 'all years') : selYear)}>
          {yrEvents.length ? (
            <div className="d-trail">
              {yrEvents.map((ev, i) => (
                <div className="d-tstep" key={i}>
                  <span className="tdot"><Icon name={ev.icon} size={11} /></span>
                  <div className="th"><span>{(window.epmActor(ev.by, lang) || {}).name || ev.by}</span>
                    <time className="tm">{ev.date}</time></div>
                  {window.epmActor(ev.by, lang) && (
                    <div className="tr"><span className="ro">{window.epmActor(ev.by, lang).role}</span>
                      <span className="sep">·</span><span className="og">{window.epmActor(ev.by, lang).org}</span></div>
                  )}
                  <div className="chg">
                    <span className="f">{ev.label}</span>
                    {ev.delta != null
                      ? <span className="to"><DMoney v={ev.delta} lang={lang} size="xs" signed /></span>
                      : <React.Fragment><span className="from">{finVal(ev.from)}</span>
                          <Icon name={AR ? 'arrow_back' : 'arrow_forward'} size={12} className="arw" />
                          <span className="to">{finVal(ev.to)}</span></React.Fragment>}
                  </div>
                  {ev.note && <div className="tb d-cell-sub">{ev.note}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="d-cell-sub">{AR ? 'لا توجد أحداث مالية في هذه السنة.' : 'No financial events in this year.'}</div>
          )}
        </DFGroup>
      )}

    </DModuleFrame>
  );
}

/* Progress = READ-ONLY dashboard: overall + by-WBS-level progress,
   impact/cost, schedule-risk summary — aggregated from project info
   and updates flowing in from Schedule / Financial / Change Orders. */
function DModProgress({ t, lang, d, p, asOf, frameTitle, frameActions, goTab }) {
  const e = d.evm;
  const AR = lang === 'ar';
  const fin = d.financial.raw;
  const phys = p ? p.tech : (d.progress.history.slice(-1)[0] || {}).physical || 0;
  const finPct = fin.financialPct;
  const sd = React.useMemo(() => window.EPM.buildScheduleData(p, lang), [p && p.id, lang]);
  /* What the baseline REQUIRES at the data date: its own earned value, from
     the same activities and cost weights physical % uses, read off baseline
     dates. A constant offset made every project identically behind; a
     smoothstep over the span disagreed with delayDays. */
  const plannedProg = React.useMemo(() => {
    const v = (d.evm && d.evm.plannedPct != null) ? d.evm.plannedPct
      : (window.EPM.derivePlannedPct ? window.EPM.derivePlannedPct(p, lang) : null);
    return v == null ? Math.min(100, phys + 8) : v;
  }, [d.evm, p && p.id, lang, phys]);
  const roll = window.schedRollup ? window.schedRollup(sd.activities) : { wbsPct: {}, projectPct: phys };
  const wbsRows = sd.activities.filter(a => a.type === 'wbs' && a.level >= 2);
  const approvedVO = d.variationOrders.filter(v => v.status === 'approved').reduce((s, v) => s + v.value, 0);
  const pendingVO = d.variationOrders.filter(v => v.status === 'pending').reduce((s, v) => s + v.value, 0);
  const schedImpact = sd.activities.filter(a => a.type === 'act' && a.slip > 0 && !a.milestone)
    .reduce((s, a) => s + Math.round(a.cost / (a.origDur || 1) * 0.15 * a.slip), 0);
  const atRisk = sd.activities.filter(a => a.type === 'act' && !a.milestone && (a.slip > 10 || (a.float === 0 && a.slip > 0)));
  const barColor = pct => pct >= 90 ? 'var(--status-completed)' : pct >= 45 ? 'var(--viz-1)' : 'var(--status-suspended)';

  /* L04: one global period selector in Z6 governs every tile. It picks which
     earlier reading each tile compares against, which is what makes the
     "prior period" half of the tile contract real rather than decorative. */
  const HIST = d.progress.history || [];
  /* labels are noun phrases so the "مقارنة مع …" prefix composes, and the
     spans are distinct: with four readings, back:3 and back:4 were the same
     row, and "since start" for a project at 17% has to read +17, not +10 */
  const PERIODS = [
    { id: 'm1', ar: 'القراءة السابقة', en: 'the previous reading', back: 1 },
    { id: 'q1', ar: 'الربع الماضي', en: 'last quarter', back: 3 },
    { id: 'all', ar: 'بداية المشروع', en: 'project start', back: HIST.length + 99 },
  ];
  const [per, setPer] = React.useState('m1');
  const P = PERIODS.find(x => x.id === per) || PERIODS[0];
  const prior = P.id === 'all' ? { physical: 0, financial: 0 }
    : (HIST[Math.max(0, HIST.length - 1 - P.back)] || HIST[0] || { physical: phys, financial: finPct });
  const last = HIST[HIST.length - 1] || prior;
  /* The two series are generated independently, so subtracting `finPct` (the
     financial module's basis) from `history.financial` produced things like
     "+53 points in a month". Each delta now stays inside one series and is
     scaled onto the figure the tile actually shows. */
  const dPhys = phys - (prior.physical || 0);
  const dFin = P.id === 'all' ? finPct
    : (last.financial && prior.financial != null
      ? Math.round(finPct * ((last.financial - prior.financial) / (last.financial || 1))) : 0);
  const perLabel = AR ? P.ar : P.en;
  const dirOf = v => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';

  const [tab, setTab] = React.useState('summary');
  const TABS = [
    { id: 'summary', label: AR ? 'الملخص' : 'Summary' },
    { id: 'wbs', label: AR ? 'حسب هيكل التجزئة' : 'By WBS' },
    { id: 'cost', label: AR ? 'الأثر والكلفة' : 'Impact & cost' },
    { id: 'risk', label: AR ? 'مخاطر الجدول' : 'Schedule risk', n: atRisk.length || undefined },
  ];
  const jump = k => () => (goTab ? goTab(k) : null);
  const M = v => <DMoney v={Math.round(v)} lang={lang} size="sm" />;
  const [defs, setDefs] = React.useState(false);

  const sCurve = React.useMemo(() => {
    const N = 8;                                   // periods across the whole project 0 → 100
    const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
    const nowFrac = Math.min(1, Math.max(0.05, phys / 100));
    const rows = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const planCum = Math.round(smooth(f) * 100);
      const inPast = f <= nowFrac + 1e-6;
      const actCum = inPast ? Math.round(smooth(f / (nowFrac || 1)) * phys) : null;
      const prev = rows[rows.length - 1];
      rows.push({ label: 'M' + i, planCum, actCum,
        planPeriod: planCum - (prev ? prev.planCum : 0),
        actPeriod: actCum == null ? 0 : actCum - (prev && prev.actCum != null ? prev.actCum : 0) });
    }
    return rows;
  }, [phys]);

  /* Z8 is permitted exactly two things on L04: a filter panel or a panel
     saying how each metric is derived. In a ministry that reads the second
     one off a screen in a meeting, it is the more useful of the two. */
  const DEF = (k, v) => <div className="d-form-i"><span className="k">{k}</span><span className="v">{v}</span></div>;
  const DEFS = (
    <React.Fragment>
      <DMsgBar tone="info" icon="functions" title={AR ? 'كل رقم على هذه الصفحة مشتق' : 'Every figure on this page is derived'}>
        {AR ? 'لا يُدخَل أي مؤشر هنا يدوياً — كلها محسوبة من الجدول الزمني وجدول الكميات والموقف المالي، وتتحرك مع تاريخ البيانات.'
            : 'No indicator here is entered by hand — each is computed from the schedule, the BOQ and the financial position, and moves with the data date.'}
      </DMsgBar>
      <DRecordGrp label={AR ? 'الإنجاز' : 'Completion'}>
        <div className="d-form-grid">
          {DEF(AR ? 'الإنجاز المادي' : 'Physical', AR ? 'مجموع أوزان الأنشطة المنجزة ÷ مجموع الأوزان، مرجّحاً بالكلفة.' : 'Weighted sum of completed activity weights ÷ total weight, by cost.')}
          {DEF(AR ? 'الإنجاز المالي' : 'Financial', AR ? 'المصروف التراكمي ÷ الكلفة المعدلة (بعد الأوامر التغييرية المعتمدة).' : 'Cumulative spend ÷ revised cost (after approved change orders).')}
          {DEF(AR ? 'المخطط' : 'Planned', AR ? 'الإنجاز الذي يفرضه خط الأساس عند تاريخ البيانات، على منحنى المدة نفسه.' : 'What the baseline requires at the data date, on the same duration curve.')}
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
      <DRecordGrp label={AR ? 'الزمن' : 'Time'}>
        <div className="d-form-grid">
          {DEF(AR ? 'التأخر' : 'Delay', AR ? 'الفرق بين النهاية المتوقعة والنهاية التعاقدية بالأيام.' : 'Forecast finish minus contractual finish, in days.')}
          {DEF(AR ? 'العوم السالب' : 'Negative float', AR ? 'أنشطة لا يمكن إنجازها في موعدها دون تسريع.' : 'Activities that cannot meet their dates without acceleration.')}
        </div>
      </DRecordGrp>
    </React.Fragment>
  );

  return (
    <DModuleFrame
      title={frameTitle || t('mod_progress')}
      sub={AR ? `المادي ${phys}% مقابل مخطط ${plannedProg}% · المالي ${finPct}%`
              : `Physical ${phys}% vs planned ${plannedProg}% · financial ${finPct}%`}
      tabs={TABS} tab={tab} onTab={setTab}
      toolbar={<React.Fragment>
        <label className="d-ctxsel"><span>{AR ? 'المقارنة مع' : 'Compare with'}</span>
          <select value={per} onChange={ev => setPer(ev.target.value)}>
            {PERIODS.map(x => <option key={x.id} value={x.id}>{AR ? x.ar : x.en}</option>)}
          </select></label>
        {/* a panel toggle is a view control and belongs with the other view
            controls, not in the actions cluster that acts on the module */}
        <button className={'d-fchip' + (defs ? ' on' : '')} aria-pressed={defs} onClick={() => setDefs(v => !v)}>
          <Icon name="functions" size={13} />{AR ? 'كيف تُحتسب' : 'How it is derived'}</button>
      </React.Fragment>}
      actions={frameActions}
      aside={defs ? (
        <DRecordPane lang={lang} title={AR ? 'تعريف المؤشرات' : 'Metric definitions'}
          onClose={() => setDefs(false)}>{DEFS}</DRecordPane>
      ) : null}
      status={<DZ10 lang={lang} asOf={asOf || sd.dataDate} stats={[
        { k: AR ? 'المادي' : 'Physical', v: phys + '%' },
        { k: AR ? 'المالي' : 'Financial', v: finPct + '%' },
        { k: 'SPI / CPI', v: e.spi + ' / ' + e.cpi },
        { k: AR ? 'آخر تحديث للإنجاز' : 'Last progress update', v: (HIST.slice(-1)[0] || {}).date || '—' },
      ]} />}>

      {tab === 'summary' && <DTileGrid>
        {defs && <div className="d-l04-z8fall">
          <DFGroup title={AR ? 'تعريف المؤشرات' : 'Metric definitions'}>{DEFS}</DFGroup>
        </div>}
        {/* reading order: headline → trend → breakdown → exceptions → detail */}
        <DTile lang={lang} span={3} label={AR ? 'الإنجاز المادي' : 'Physical completion'}
          value={phys} unit="%" state={phys < plannedProg - 5 ? 'bad' : phys < plannedProg ? 'warn' : 'ok'}
          delta={{ v: (dPhys > 0 ? '+' : '') + dPhys + (AR ? ' نقطة' : ' pts'), dir: dirOf(dPhys) }}
          cmp={{ label: AR ? 'مخطط' : 'planned', value: plannedProg + '%' }}
          note={(AR ? 'مقارنة مع ' : 'vs ') + perLabel}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />

        <DTile lang={lang} span={3} label={AR ? 'الإنجاز المالي' : 'Financial completion'}
          value={finPct} unit="%"
          state={finPct - phys > 20 ? 'bad' : Math.abs(finPct - phys) > 10 ? 'warn' : 'ok'}
          delta={{ v: (dFin > 0 ? '+' : '') + dFin + (AR ? ' نقطة' : ' pts'), dir: dirOf(dFin) }}
          cmp={{ label: AR ? 'المادي' : 'physical', value: phys + '%' }}
          note={finPct - phys > 20
            ? (AR ? 'الصرف يسبق الإنجاز بـ ' + (finPct - phys) + ' نقطة — يستوجب مراجعة'
                  : 'Disbursement leads delivery by ' + (finPct - phys) + ' points — needs review')
            : <React.Fragment>{AR ? 'مصروف ' : 'spent '}{M(fin.disbursed)}{AR ? ' من ' : ' of '}{M(fin.revisedCost)}</React.Fragment>}
          to={{ label: AR ? 'الموقف المالي' : 'the financial position', fn: jump('financial') }} />

        <DTile lang={lang} span={3} label={AR ? 'التأخر عن خط الأساس' : 'Delay against baseline'}
          value={(sd.delayDays > 0 ? '+' : '') + sd.delayDays} unit={AR ? 'يوم' : 'd'}
          state={sd.delayDays > 14 ? 'bad' : sd.delayDays > 0 ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'النهاية التعاقدية' : 'contractual finish', value: sd.baselineFinish }}
          note={(AR ? 'النهاية المتوقعة ' : 'forecast ') + sd.forecastFinish}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />

        <DTile lang={lang} span={3} label="SPI / CPI"
          value={e.spi + ' / ' + e.cpi}
          state={e.spi < 0.95 ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'الهدف' : 'target', value: '1.00' }}
          note={/* earned value can keep pace while the critical path slips —
                   saying only one of those beside a +27-day delay reads as a
                   contradiction, so the tile states both */
            (e.spi < 1 ? (AR ? 'القيمة المكتسبة دون الخطة' : 'earned value below plan')
              : sd.delayDays > 0 ? (AR ? 'القيمة المكتسبة على الخطة، والتأخر محصور في المسار الحرج'
                                       : 'earned value on plan; the delay sits on the critical path')
              : (AR ? 'القيمة المكتسبة على الخطة' : 'earned value on plan'))
            + ' · ' + (e.cpi < 1 ? (AR ? 'تجاوز في الكلفة' : 'over cost') : (AR ? 'الكلفة ضمن الحدود' : 'cost within limits'))}
          to={{ label: AR ? 'الأثر والكلفة' : 'impact & cost', fn: () => setTab('cost') }} />

        <DTile lang={lang} span={6} flush
          label={AR ? 'منحنى الإنجاز — المخطط مقابل الفعلي (تراكمي)' : 'Progress curve — plan vs actual (cumulative)'}
          note={(AR ? 'تاريخ البيانات ' : 'data date ') + sd.dataDate}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }}>
          <div style={{ padding: 'var(--space-12)' }}><DSCurve lang={lang} data={sCurve} /></div>
        </DTile>

        <DFGroup span={12} flush
          title={AR ? 'تحديثات الإنجاز (واردة من الأقسام)' : 'Progress updates (from the sections)'}
          sub={AR ? 'كل سطر معتمد من قسم مصدره — لا يُحرَّر هنا' : 'each row is endorsed by its own section — not edited here'}
          foot={<button type="button" className="d-linkbtn" onClick={jump('audit')}>
            {AR ? 'التفصيل في سجل التدقيق' : 'Detail in the audit log'}<Icon name="chevron_right" size={14} /></button>}>
          <table className="d-line-table">
            <thead><tr>
              <th style={{ width: 120 }}>{AR ? 'التاريخ' : 'Date'}</th>
              <th style={{ width: 120 }} className="r">{AR ? 'المادي' : 'Physical'}</th>
              <th style={{ width: 120 }} className="r">{AR ? 'المالي' : 'Financial'}</th>
              <th style={{ width: 170 }}>{AR ? 'المصدر' : 'Source'}</th>
              <th>{AR ? 'المستخدم' : 'By'}</th></tr></thead>
            <tbody>{HIST.map((h, i) => (
              <tr key={i}><td className="code">{h.date}</td>
                <td className="num r">{h.physical}%</td><td className="num r">{h.financial}%</td>
                <td className="d-cell-sub">{i % 2 ? (AR ? 'الجدول الزمني' : 'Schedule') : (AR ? 'الموقف المالي' : 'Financial position')}</td>
                <td className="d-cell-sub">{h.by}</td></tr>))}</tbody>
          </table>
        </DFGroup>
      </DTileGrid>}

      {tab === 'wbs' && <DTileGrid>
        <DTile lang={lang} span={3} label={AR ? 'الإنجاز التجميعي للجدول' : 'Schedule rollup'}
          value={roll.projectPct} unit="%"
          state={roll.projectPct < plannedProg - 5 ? 'bad' : roll.projectPct < plannedProg ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'مخطط' : 'planned', value: plannedProg + '%' }}
          note={AR ? 'محسوب صعوداً من الأنشطة، لا يُدخَل يدوياً' : 'rolled up from activities, never entered by hand'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'مستويات مكتملة' : 'Levels complete'}
          value={wbsRows.filter(w => (roll.wbsPct[w.code] || 0) >= 100).length} unit={'/' + wbsRows.length}
          state="none" cmp={{ label: AR ? 'الأدنى' : 'lowest',
            value: (wbsRows.length ? Math.min.apply(null, wbsRows.map(w => roll.wbsPct[w.code] || 0)) : 0) + '%' }}
          note={AR ? 'مستوى ثانٍ فأعلى من هيكل التجزئة' : 'WBS level 2 and above'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'الفجوة عن المخطط' : 'Gap against plan'}
          value={(phys - plannedProg > 0 ? '+' : '') + (phys - plannedProg)} unit={AR ? 'نقطة' : 'pts'}
          state={phys < plannedProg - 5 ? 'bad' : phys < plannedProg ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'مخطط' : 'planned', value: plannedProg + '%' }}
          note={AR ? 'الفجوة موزّعة على المستويات في الجدول أدناه' : 'the gap is distributed across the levels below'}
          to={{ label: AR ? 'جدول الكميات' : 'the BOQ', fn: jump('boq') }} />

        <DFGroup span={12} flush title={AR ? 'الإنجاز حسب مستويات هيكل التجزئة' : 'Progress by WBS level'}
          sub={AR ? 'محسوبة صعوداً من الأنشطة المرجّحة بالكلفة' : 'rolled up from cost-weighted activities'}
          foot={<button type="button" className="d-linkbtn" onClick={jump('schedule')}>
            {AR ? 'التفصيل في الجدول الزمني' : 'Detail in the schedule'}<Icon name="chevron_right" size={14} /></button>}>
          <div className="d-vow-tw"><table className="d-line-table">
            <thead><tr>
              <th style={{ width: 90 }}>{AR ? 'الرمز' : 'Code'}</th>
              <th style={{ minWidth: 240 }}>{AR ? 'المستوى' : 'Level'}</th>
              <th style={{ width: 260 }}>{AR ? 'الإنجاز' : 'Progress'}</th></tr></thead>
            <tbody>{wbsRows.map((w, i) => { const pct = roll.wbsPct[w.code] || 0;
              return (
              <tr key={i}>
                <td className="code">{w.code}</td>
                <td className={w.level <= 2 ? 'name' : 'd-cell-sub'}
                  style={{ paddingInlineStart: 'calc(var(--cell-px) + ' + ((w.level - 2) * 16) + 'px)' }}>{w.name}</td>
                <td><div className="d-progress"><span className="t"><span style={{ width: pct + '%', background: barColor(pct) }}></span></span><span className="pc">{pct}%</span></div></td>
              </tr>); })}</tbody>
          </table></div>
        </DFGroup>
      </DTileGrid>}

      {tab === 'cost' && <DTileGrid>
        <DTile lang={lang} span={3} label="EAC" state={e.eac > fin.revisedCost ? 'bad' : 'ok'}
          value={<DMoney v={Math.round(e.eac)} lang={lang} size="md" />}
          cmp={{ label: AR ? 'الكلفة المعدلة' : 'revised cost', value: <DMoney v={Math.round(fin.revisedCost)} lang={lang} size="sm" bare /> }}
          note={AR ? 'الكلفة المتوقعة عند الإنجاز = الموازنة ÷ CPI' : 'estimate at completion = budget ÷ CPI'}
          to={{ label: AR ? 'الموقف المالي' : 'the financial position', fn: jump('financial') }} />
        <DTile lang={lang} span={3} label="VAC" state={e.vac < 0 ? 'bad' : 'ok'}
          value={<DMoney v={Math.round(e.vac)} lang={lang} size="md" signed />}
          cmp={{ label: AR ? 'الهدف' : 'target', value: AR ? 'لا يقل عن صفر' : 'not below zero' }}
          note={e.vac < 0 ? (AR ? 'تجاوز متوقع للموازنة' : 'forecast overrun') : (AR ? 'ضمن الموازنة' : 'within budget')}
          to={{ label: AR ? 'الموقف المالي' : 'the financial position', fn: jump('financial') }} />
        <DTile lang={lang} span={3} label={AR ? 'الكلفة المعدلة' : 'Revised cost'}
          value={<DMoney v={Math.round(fin.revisedCost)} lang={lang} size="md" />}
          cmp={{ label: AR ? 'الكلفة المقررة' : 'original cost', value: <DMoney v={Math.round(fin.cost || 0)} lang={lang} size="sm" bare /> }}
          note={AR ? 'الكلفة النافذة بعد الملاحق' : 'the effective cost after addenda'}
          to={{ label: AR ? 'العقد' : 'the contract', fn: jump('contract') }} />
        <DTile lang={lang} span={3} label={AR ? 'المصروف التراكمي' : 'Cumulative spend'}
          value={<DMoney v={Math.round(fin.disbursed)} lang={lang} size="md" />}
          cmp={{ label: AR ? 'من المعدلة' : 'of revised', value: finPct + '%' }}
          note={AR ? 'كما في تاريخ البيانات' : 'as at the data date'}
          to={{ label: AR ? 'الموقف المالي' : 'the financial position', fn: jump('financial') }} />

        <DTile lang={lang} span={3} label={AR ? 'أوامر تغييرية معتمدة' : 'Approved change orders'}
          value={<DMoney v={Math.round(approvedVO)} lang={lang} size="md" signed />}
          state={pendingVO ? 'warn' : 'none'}
          cmp={pendingVO ? { label: AR ? 'قيد الاعتماد' : 'pending', value: <DMoney v={Math.round(pendingVO)} lang={lang} size="sm" bare /> } : null}
          note={AR ? 'المعتمد وحده يدخل الكلفة المعدلة؛ ما هو قيد الاعتماد لا يُرحَّل.' : 'only approved orders enter the revised cost; pending ones do not post.'}
          to={{ label: AR ? 'الأوامر التغييرية' : 'change orders', fn: jump('changeorders') }} />
        <DTile lang={lang} span={3} label={AR ? 'أثر كلفة التأخر (تقديري)' : 'Cost of delay (estimated)'}
          value={<DMoney v={Math.round(schedImpact)} lang={lang} size="md" />}
          state={schedImpact > 0 ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'أيام التأخر' : 'delay days', value: sd.delayDays }}
          note={AR ? 'تقدير غير تعاقدي — لا يدخل الكلفة المعدلة ولا يُطالَب به.' : 'a non-contractual estimate — it does not enter the revised cost and is not claimed.'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
      </DTileGrid>}

      {tab === 'risk' && <DTileGrid>
        <DTile lang={lang} span={3} label={AR ? 'التأخر' : 'Delay'}
          value={(sd.delayDays > 0 ? '+' : '') + sd.delayDays} unit={AR ? 'يوم' : 'd'}
          state={sd.delayDays > 14 ? 'bad' : sd.delayDays > 0 ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'الهدف' : 'target', value: '0' }}
          note={AR ? 'مقابل خط الأساس المعتمد' : 'against the approved baseline'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'أنشطة حرجة' : 'Critical activities'}
          value={sd.criticalCount} state="none"
          cmp={{ label: AR ? 'من الأنشطة' : 'of activities', value: sd.activities.filter(a => a.type === 'act').length }}
          note={AR ? 'عوم كلي صفر — أي انزياح يمس النهاية' : 'zero total float — any slip moves the finish'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'عوم سالب' : 'Negative float'}
          value={sd.negFloatCount} state={sd.negFloatCount ? 'bad' : 'ok'}
          cmp={{ label: AR ? 'الهدف' : 'target', value: '0' }}
          note={AR ? 'لا يمكن إنجازها في موعدها دون تسريع' : 'cannot meet their dates without acceleration'}
          to={{ label: AR ? 'الجدول الزمني' : 'the schedule', fn: jump('schedule') }} />
        <DTile lang={lang} span={3} label={AR ? 'أنشطة معرّضة للخطر' : 'At-risk activities'}
          value={atRisk.length} state={atRisk.length ? 'warn' : 'ok'}
          cmp={{ label: AR ? 'الحد' : 'threshold', value: AR ? 'أكثر من 10 أيام' : 'over 10 days' }}
          note={AR ? 'انزياح يتجاوز الحد، أو أي انزياح على مسار حرج' : 'slip past the threshold, or any slip on a critical path'}
          to={{ label: AR ? 'إدارة المخاطر' : 'the risk register', fn: jump('risk') }} />

        <DFGroup span={12} flush title={AR ? 'الأنشطة المعرّضة للخطر' : 'At-risk activities'}
          sub={AR ? 'مرتّبة بحسب الانزياح' : 'ordered by slip'}
          foot={<button type="button" className="d-linkbtn" onClick={jump('schedule')}>
            {AR ? 'التفصيل في الجدول الزمني' : 'Detail in the schedule'}<Icon name="chevron_right" size={14} /></button>}>
          {atRisk.length ? (
            <table className="d-line-table">
              <thead><tr>
                <th style={{ width: 90 }}>{AR ? 'المعرّف' : 'ID'}</th>
                <th style={{ minWidth: 240 }}>{AR ? 'النشاط' : 'Activity'}</th>
                <th style={{ width: 110 }} className="r">{AR ? 'الانزياح' : 'Slip'} <span className="cur">({AR ? 'يوم' : 'd'})</span></th>
                <th style={{ width: 110 }} className="r">{AR ? 'العوم' : 'Float'} <span className="cur">({AR ? 'يوم' : 'd'})</span></th>
                <th style={{ width: 110 }}>{AR ? 'المسار الحرج' : 'Critical'}</th></tr></thead>
              <tbody>{atRisk.map((a, i) => (
                <tr key={i}>
                  <td className="code">{a.id}</td>
                  <td className="name wrap">{a.name}</td>
                  <td className="num r">+{a.slip}</td>
                  <td className="num r">{a.float}</td>
                  <td>{a.float === 0 ? <span className="d-pill critical">{AR ? 'حرج' : 'Critical'}</span> : <span className="d-cell-sub">—</span>}</td>
                </tr>))}</tbody>
            </table>
          ) : (
            <div className="d-empty">
              <span className="d-empty-ico"><Icon name="check_circle" size={26} /></span>
              <b>{AR ? 'لا أنشطة معرّضة للخطر' : 'No at-risk activities'}</b>
              <span>{AR ? 'لا نشاط تجاوز انزياحه الحد، ولا انزياح على المسار الحرج، عند تاريخ البيانات.' : 'No activity has slipped past the threshold and nothing on the critical path has slipped, as at the data date.'}</span>
            </div>
          )}
        </DFGroup>
      </DTileGrid>}
    </DModuleFrame>
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

/* DModVO lived here until the L05/L14 rebuild. app/vo-record.jsx loads
   after this file and defines the live one, so this copy had been dead
   since that split — and kept drifting out of sync with the real page. */

function DModMeetings({ t, lang, d }) {
  const AR = lang === 'ar';
  const actions = [
    { id: 'ACT-01', task: AR ? 'تسريع أعمال الكهرباء' : 'Accelerate electrical works', owner: AR ? 'المقاول' : 'Contractor', due: '2026-04-25', pr: AR ? 'عالية' : 'High', st: AR ? 'متأخر' : 'Overdue', cls: 'stalled' },
    { id: 'ACT-02', task: AR ? 'تسوية السلفة رقم 3' : 'Settle advance #3', owner: AR ? 'القسم المالي' : 'Finance dept.', due: '2026-05-10', pr: AR ? 'متوسطة' : 'Medium', st: AR ? 'قيد التنفيذ' : 'In progress', cls: 'ongoing' },
    { id: 'ACT-03', task: AR ? 'دراسة طلب التمديد' : 'Review extension request', owner: AR ? 'لجنة المدد' : 'Duration cmte.', due: '2026-02-01', pr: AR ? 'عالية' : 'High', st: AR ? 'مغلق' : 'Closed', cls: 'completed' },
  ];
  return (
    <React.Fragment>
      <DSecNav items={[{ id: 'sec-mtg', label: t('mod_meetings') }, { id: 'sec-act', label: AR ? 'سجل الإجراءات' : 'Action register' }]} />
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

/* L18 — library & viewer. A controlled register paired with an inline
   preview. The doc puts the discipline tree in a Z1 extension; our Z1 is the
   module rail, so the tree docks at Z7's inline-start and the three panes
   (tree · register · preview) still stand side by side. */
function DModDrawings({ t, lang, d, showToast, asOf, frameTitle, frameActions }) {
  const AR = lang === 'ar';
  const [docs, setDocs] = window.usePersistedState('drawings.rows.v2.' + (window.__epmPid || 'na'), function () { return d.drawings; });
  const [openId, setOpenId] = React.useState(null);
  const [wide, setWide] = React.useState(false);
  const [tab, setTab] = React.useState('preview');
  const [dis, setDis] = React.useState('all');
  /* expanding to the full-width viewer and back must not lose the reader's
     place — the wider pane reflows shorter and the browser clamps scrollTop */
  const keepScroll = React.useRef(0);
  const toggleWide = () => {
    const b = document.querySelector('.d-rpane .rp-b');
    keepScroll.current = b ? b.scrollTop : 0;
    setWide(w => !w);
  };
  React.useLayoutEffect(() => {
    const b = document.querySelector('.d-rpane .rp-b');
    if (b && keepScroll.current) b.scrollTop = keepScroll.current;
  }, [wide]);
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [latestOnly, setLatestOnly] = React.useState(true);
  const [sel, setSel] = React.useState({});                 // multi-select for transmittal / bulk download
  const [cmp, setCmp] = React.useState(null);               // revision being compared against the current
  const [zoom, setZoom] = React.useState(100);
  const [rot, setRot] = React.useState(0);
  const [page, setPage] = React.useState(1);
  /* "Markup creates a record carrying the viewpoint" — a toast that claims to
     create a note and creates nothing is worse than no markup at all */
  const [marks, setMarks] = window.usePersistedState('drawings.marks.' + (window.__epmPid || 'na'), {});
  const [mkKind, setMkKind] = React.useState('comment');
  const [mkText, setMkText] = React.useState('');
  const DIS = window.EPM.DOC_DISCIPLINES || [];
  React.useEffect(() => { setTab('preview'); setCmp(null); setZoom(100); setRot(0); setPage(1); }, [openId]);

  const ql = q.trim().toLowerCase();
  const match = x => (dis === 'all' || x.discipline === dis)
    && (status === 'all' || x.status === status)
    && (!ql || (x.id + ' ' + (x.title || '') + ' ' + (x.disciplineLabel || '') + ' ' + (x.revisions[0] ? x.revisions[0].by : '')).toLowerCase().includes(ql));
  const shown = docs.filter(match);
  const open = docs.find(x => x.id === openId);
  const filtered = !!(ql || dis !== 'all' || status !== 'all');
  const clearAll = () => { setQ(''); setDis('all'); setStatus('all'); };
  const totalRevisions = docs.reduce((a2, x) => a2 + x.revisions.length, 0);
  /* a selection that survives a filter can send documents the reader cannot
     see, so it is always intersected with what is on screen */
  const selIds = Object.keys(sel).filter(k => sel[k] && shown.some(x => x.id === k));
  const stPill = st => st === 'approved' ? 'completed' : st === 'rejected' ? 'stalled' : 'suspended';

  /* A new file is always a NEW revision — replacement in place does not exist
     as an operation, and a superseded revision is never removed. */
  const upload = (id) => {
    const doc = docs.find(x => x.id === id); if (!doc) return;
    const rev = 'R' + (doc.revisions.length + 1);
    const draft = { name: doc.id + '-' + rev, file: doc.id + '-' + rev + '.pdf', rev };
    const v = window.EPM.validate('document', draft, { existing: doc.revisions.map(r => ({ name: doc.id + '-' + r.rev, rev: r.rev })) });
    if (!v.ok) { showToast(AR ? v.errors[0].ar : v.errors[0].en); return; }
    const U = (window.EPM && window.EPM.CURRENT_USER) || {};
    const by = (U.name && (AR ? U.name.ar : U.name.en)) || (AR ? 'المستخدم الحالي' : 'Current user');
    setDocs(ds => ds.map(x => x.id !== id ? x : { ...x, status: 'draft', revisions: [{ rev,
      date: window.EPM.DATA_DATE, by,
      reason: AR ? 'مراجعة جديدة مرفوعة من النظام' : 'New revision uploaded',
      transmittal: 'TR-' + (2900 + doc.revisions.length) }, ...x.revisions] }));
    showToast(AR ? 'أُضيفت المراجعة ' + rev + ' — المراجعة السابقة محفوظة ومعلَّمة كملغاة' : 'Revision ' + rev + ' added — the previous one is kept and marked superseded');
  };
  const setStatusOf = (id, st) => {
    setDocs(ds => ds.map(x => x.id === id ? { ...x, status: st } : x));
    showToast(st === 'approved' ? (AR ? 'اعتُمدت الوثيقة' : 'Document approved') : (AR ? 'أُعيدت الوثيقة بملاحظات' : 'Document returned with comments'));
  };

  const kv = (k, v) => <div className="d-form-i"><span className="k">{k}</span><span className="v">{v}</span></div>;
  const addMark = (id) => {
    if (!mkText.trim()) return;
    const U = (window.EPM && window.EPM.CURRENT_USER) || {};
    const by = (U.name && (AR ? U.name.ar : U.name.en)) || (AR ? 'المستخدم الحالي' : 'Current user');
    const doc = docs.find(x => x.id === id);
    const vp = { page, zoom, rot, rev: doc ? doc.revisions[0].rev : '—' };
    setMarks(m => Object.assign({}, m, { [id]: (m[id] || []).concat([
      { no: (m[id] || []).length + 1, kind: mkKind, text: mkText.trim(), by,
        date: window.EPM.DATA_DATE, viewpoint: vp }]) }));
    setMkText('');
    showToast(AR ? 'أُنشئ التأشير ويحمل موضع العرض الحالي' : 'Markup created, carrying the current viewpoint');
  };
  const goViewpoint = v => { setPage(v.page); setZoom(v.zoom); setRot(v.rot); setTab('preview'); };
  const MK_LBL = { comment: [ 'ملاحظة', 'Comment' ], rfi: [ 'طلب معلومات', 'RFI' ], ncr: [ 'عدم مطابقة', 'NCR' ] };
  const cur = open ? open.revisions[0] : null;
  const cmpRev = open && cmp ? open.revisions.find(r => r.rev === cmp) : null;

  return (
    <DModuleFrame
      title={frameTitle || t('mod_documents')}
      sub={AR ? docs.length + ' وثيقة · ' + totalRevisions + ' مراجعة' : docs.length + ' documents · ' + totalRevisions + ' revisions'}
      toolbar={<React.Fragment>
        {/* "latest revision only" is the default and is ALWAYS visible, so a
            reader never wonders whether they are seeing the whole history */}
        <button className={'d-fchip' + (latestOnly ? ' on' : '')} aria-pressed={latestOnly}
          onClick={() => setLatestOnly(v => !v)}>
          <Icon name="filter_alt" size={13} />{AR ? 'آخر مراجعة فقط' : 'Latest revision only'}</button>
      </React.Fragment>}
      actions={<React.Fragment>
        {selIds.length > 0 && <React.Fragment>
          <button className="d-btn sm" onClick={() => showToast(AR ? 'إنشاء إشعار إرسال لـ ' + selIds.length + ' وثيقة' : 'Creating a transmittal for ' + selIds.length + ' documents')}>
            <Icon name="send" size={15} />{AR ? 'إشعار إرسال' : 'Transmittal'}</button>
          <button className="d-btn sm" onClick={() => showToast(AR ? 'تنزيل ' + selIds.length + ' وثيقة' : 'Downloading ' + selIds.length + ' documents')}>
            <Icon name="download" size={15} />{AR ? 'تنزيل' : 'Download'}</button>
          <button className="d-btn sm ghost" onClick={() => setSel({})}>
            <Icon name="close" size={13} />{AR ? 'إلغاء التحديد' : 'Clear selection'}</button>
        </React.Fragment>}
        {frameActions}
      </React.Fragment>}
      aside={open ? (
        <DRecordPane lang={lang} wide={wide} onExpand={toggleWide}
          title={open.title || open.id}
          meta={[
            { k: AR ? 'رقم الوثيقة' : 'Document no.', v: open.id, num: true },
            { k: AR ? 'المراجعة' : 'Revision', v: cur ? cur.rev : '—', num: true },
            { k: AR ? 'حالة الإصدار' : 'Issue status', v: <span className={'d-pill ' + stPill(open.status)}>{window.EPM.DOC_STATUS[open.status][lang]}</span> },
            { k: AR ? 'التخصص' : 'Discipline', v: open.disciplineLabel },
          ]}
          tabs={[{ id: 'preview', label: AR ? 'المعاينة' : 'Preview' },
                 { id: 'revisions', label: AR ? 'المراجعات' : 'Revisions', n: open.revisions.length },
                 { id: 'marks', label: AR ? 'التأشيرات' : 'Markups', n: (marks[open.id] || []).length },
                 { id: 'details', label: AR ? 'التفاصيل' : 'Details' }]}
          tab={tab} onTab={setTab}
          onClose={() => { setOpenId(null); setWide(false); }}
          footer={<React.Fragment>
            <button className="d-btn sm primary" onClick={() => upload(open.id)}>
              <Icon name="upload_file" size={15} />{AR ? 'رفع مراجعة' : 'New revision'}</button>
            <span className="sp"></span>
            <button className="d-icon-btn sm" title={AR ? 'تنزيل' : 'Download'} aria-label={AR ? 'تنزيل' : 'Download'}
              onClick={() => showToast(AR ? 'تنزيل ' + open.id + '-' + cur.rev : 'Downloading ' + open.id + '-' + cur.rev)}>
              <Icon name="download" size={16} /></button>
            <button className="d-icon-btn sm" title={AR ? 'إشعار إرسال' : 'Transmit'} aria-label={AR ? 'إشعار إرسال' : 'Transmit'}
              onClick={() => showToast(AR ? 'إنشاء إشعار إرسال لـ ' + open.id : 'Creating a transmittal for ' + open.id)}>
              <Icon name="send" size={16} /></button>
          </React.Fragment>}>

          {tab === 'preview' && <React.Fragment>
            {/* viewer chrome: pages, zoom, rotate, compare-with-revision */}
            <div className="d-viewerbar">
              <button className="d-icon-btn sm flip" title={AR ? 'الصفحة السابقة' : 'Previous page'} aria-label={AR ? 'الصفحة السابقة' : 'Previous page'}
                disabled={page <= 1} onClick={() => setPage(v => Math.max(1, v - 1))}><Icon name="chevron_left" size={16} /></button>
              <span className="pg num" aria-live="polite">{page} / 4</span>
              <button className="d-icon-btn sm flip" title={AR ? 'الصفحة التالية' : 'Next page'} aria-label={AR ? 'الصفحة التالية' : 'Next page'}
                disabled={page >= 4} onClick={() => setPage(v => Math.min(4, v + 1))}><Icon name="chevron_right" size={16} /></button>
              <span className="sp"></span>
              <button className="d-icon-btn sm" title={AR ? 'تصغير' : 'Zoom out'} aria-label={AR ? 'تصغير' : 'Zoom out'}
                disabled={zoom <= 50} onClick={() => setZoom(z => Math.max(50, z - 25))}><Icon name="remove" size={16} /></button>
              <span className="pg num" aria-live="polite">{zoom}%</span>
              <button className="d-icon-btn sm" title={AR ? 'تكبير' : 'Zoom in'} aria-label={AR ? 'تكبير' : 'Zoom in'}
                disabled={zoom >= 200} onClick={() => setZoom(z => Math.min(200, z + 25))}><Icon name="add" size={16} /></button>
              <button className="d-icon-btn sm" title={AR ? 'تدوير' : 'Rotate'} aria-label={AR ? 'تدوير' : 'Rotate'}
                onClick={() => setRot(r => (r + 90) % 360)}><Icon name="rotate_right" size={16} /></button>
            </div>
            <div className="d-viewer" role="group" aria-label={AR ? 'معاينة الوثيقة' : 'Document preview'}>
              <div className="sheet" style={{ transform: 'rotate(' + rot + 'deg) scale(' + (zoom / 100) + ')' }}>
                <span className="no num">{open.id}-{cur.rev}</span>
                <Icon name="description" size={34} />
                <b>{open.title || open.id}</b>
                <span className="pgn num">{AR ? 'صفحة ' : 'page '}{page} / 4</span>
                {cmpRev && <span className="cmp num">{AR ? 'مقارنة مع ' : 'compared with '}{cmpRev.rev}</span>}
              </div>
            </div>
            {open.revisions.length > 1 && (
              <div className="d-form-field f-full">
                <label htmlFor="dwg-cmp">{AR ? 'مقارنة مع مراجعة' : 'Compare with revision'}</label>
                <select id="dwg-cmp" className="d-form-input" value={cmp || ''} onChange={e => setCmp(e.target.value || null)}>
                  <option value="">{AR ? '— بدون مقارنة —' : '— no comparison —'}</option>
                  {open.revisions.slice(1).map(r => <option key={r.rev} value={r.rev}>{r.rev} · {r.date}</option>)}
                </select>
              </div>)}
            {cmpRev && <DMsgBar tone="info" icon="difference" title={AR ? 'ما تغيّر بين المراجعتين' : 'What changed between the revisions'}>
              {cmpRev.rev} ({cmpRev.date}) → {cur.rev} ({cur.date}) — {cur.reason}
            </DMsgBar>}
            <DRecordGrp label={AR ? 'تأشير على المعاينة' : 'Markup on this view'}>
              <div className="d-form-grid">
                <div className="d-form-field f-half"><label htmlFor="mk-kind">{AR ? 'النوع' : 'Kind'}</label>
                  <select id="mk-kind" className="d-form-input" value={mkKind} onChange={e => setMkKind(e.target.value)}>
                    <option value="comment">{AR ? 'ملاحظة' : 'Comment'}</option>
                    <option value="rfi">{AR ? 'طلب معلومات (RFI)' : 'Request for information (RFI)'}</option>
                    <option value="ncr">{AR ? 'تقرير عدم مطابقة (NCR)' : 'Non-conformance report (NCR)'}</option>
                  </select></div>
                <div className="d-form-field f-full"><label htmlFor="mk-tx">{AR ? 'نص التأشير' : 'Markup text'}</label>
                  <textarea id="mk-tx" rows={2} className="d-form-input" value={mkText}
                    placeholder={AR ? 'يُسجَّل مع الصفحة والتكبير والدوران والمراجعة الحالية' : 'Recorded with the page, zoom, rotation and current revision'}
                    onChange={e => setMkText(e.target.value)}></textarea></div>
              </div>
              <div className="d-rowacts">
                <button className="d-btn sm" disabled={!mkText.trim()} onClick={() => addMark(open.id)}>
                  <Icon name="edit_note" size={15} />{AR ? 'إنشاء تأشير' : 'Create markup'}</button>
                {open.status !== 'approved' && <button className="d-btn sm primary" onClick={() => setStatusOf(open.id, 'approved')}>
                  <Icon name="check" size={15} />{AR ? 'اعتماد' : 'Approve'}</button>}
                {open.status !== 'rejected' && <button className="d-btn sm" onClick={() => setStatusOf(open.id, 'rejected')}>
                  <Icon name="undo" size={15} />{AR ? 'إعادة بملاحظات' : 'Return'}</button>}
              </div>
            </DRecordGrp>
          </React.Fragment>}

          {tab === 'revisions' && (
            <DRecordGrp label={AR ? 'سجل المراجعات' : 'Revision history'}>
              <DMsgBar tone="info" icon="history" title={AR ? 'المراجعات لا تُحذف' : 'Revisions are never deleted'}>
                {AR ? 'كل ملف جديد يُنشئ مراجعة جديدة؛ المراجعة السابقة تبقى في السجل معلَّمة كملغاة، ولا يوجد استبدال في المكان.'
                    : 'Every new file creates a new revision; the previous one stays in the register marked superseded. Replacement in place does not exist.'}
              </DMsgBar>
              <div className="d-rcptlist">{open.revisions.map((rv, i) => (
                <div className={'d-rcpt' + (i > 0 ? ' sup' : '')} key={rv.rev}>
                  <div className="hd"><span className="no">{rv.rev}</span>
                    {i === 0 ? <span className="d-pill completed">{AR ? 'الحالية' : 'Current'}</span>
                             : <span className="d-pill">{AR ? 'ملغاة' : 'Superseded'}</span>}
                    <span className="sp"></span><time className="num">{rv.date}</time></div>
                  <div className="who">{rv.by}</div>
                  <div className="nt">{rv.reason}</div>
                  <div className="fls">
                    <button type="button" className="d-filechip" title={open.id + '-' + rv.rev + '.pdf'}
                      onClick={() => showToast((AR ? 'فتح المستند: ' : 'Opening: ') + open.id + '-' + rv.rev + '.pdf')}>
                      <Icon name="description" size={13} /><span className="nm">{open.id}-{rv.rev}.pdf</span></button>
                    {rv.transmittal && <button type="button" className="d-filechip" title={rv.transmittal}
                      onClick={() => showToast((AR ? 'إشعار الإرسال ' : 'Transmittal ') + rv.transmittal)}>
                      <Icon name="send" size={13} /><span className="nm">{rv.transmittal}</span></button>}
                  </div>
                </div>))}</div>
            </DRecordGrp>)}

          {tab === 'marks' && (
            <DRecordGrp label={AR ? 'التأشيرات على هذه الوثيقة' : 'Markups on this document'}>
              {(marks[open.id] || []).length ? (
                <div className="d-rcptlist">{(marks[open.id] || []).map((m, i) => (
                  <div className="d-rcpt" key={i}>
                    <div className="hd"><span className="no">{open.id}-M{m.no}</span>
                      <span className="d-pill">{AR ? MK_LBL[m.kind][0] : MK_LBL[m.kind][1]}</span>
                      <span className="sp"></span><time className="num">{m.date}</time></div>
                    <div className="who">{m.by}</div>
                    <div className="nt">{m.text}</div>
                    <div className="fls">
                      {/* the viewpoint is the point of a markup — clicking it
                          restores the exact view it was made against */}
                      <button type="button" className="d-filechip" onClick={() => goViewpoint(m.viewpoint)}>
                        <Icon name="visibility" size={13} />
                        <span className="nm">{AR ? 'موضع العرض' : 'Viewpoint'}</span>
                        <span className="sz num">{m.viewpoint.rev} · {AR ? 'ص' : 'p'}{m.viewpoint.page} · {m.viewpoint.zoom}%</span></button>
                    </div>
                  </div>))}</div>
              ) : (
                <div className="d-vow-empty"><Icon name="edit_note" size={22} />
                  <b>{AR ? 'لا تأشيرات بعد' : 'No markups yet'}</b>
                  <span>{AR ? 'التأشير يُنشئ ملاحظة أو طلب معلومات أو تقرير عدم مطابقة، ويحمل الصفحة والتكبير والمراجعة التي أُنشئ عليها.' : 'A markup creates a comment, an RFI or an NCR, carrying the page, zoom and revision it was made against.'}</span></div>
              )}
            </DRecordGrp>)}

          {tab === 'details' && <React.Fragment>
            <DRecordGrp label={AR ? 'التصنيف' : 'Classification'}>
              <div className="d-form-grid">
                {kv(AR ? 'رقم الوثيقة' : 'Document no.', <span className="num">{open.id}</span>)}
                {kv(AR ? 'العنوان' : 'Title', open.title)}
                {kv(AR ? 'التخصص' : 'Discipline', open.disciplineLabel)}
                {kv(AR ? 'النوع' : 'Type', open.type)}
              </div>
            </DRecordGrp>
            <DRecordGrp label={AR ? 'الإصدار الحالي' : 'Current issue'}>
              <div className="d-form-grid">
                {kv(AR ? 'المراجعة' : 'Revision', <span className="num">{cur.rev}</span>)}
                {kv(AR ? 'تاريخ الإصدار' : 'Issued date', <span className="num">{cur.date}</span>)}
                {kv(AR ? 'جهة الإصدار' : 'Issued by', cur.by)}
                {kv(AR ? 'إشعار الإرسال' : 'Transmittal', <span className="num">{cur.transmittal || '—'}</span>)}
                {kv(AR ? 'حالة الإصدار' : 'Issue status', <span className={'d-pill ' + stPill(open.status)}>{window.EPM.DOC_STATUS[open.status][lang]}</span>)}
                {kv(AR ? 'عدد المراجعات' : 'Revisions', <span className="num">{open.revisions.length}</span>)}
              </div>
            </DRecordGrp>
          </React.Fragment>}
        </DRecordPane>
      ) : null}
      asideWide={wide} asideClass="aside-l18"
      status={<DZ10 lang={lang} asOf={asOf} stats={[
        { k: AR ? 'الوثائق' : 'Documents', v: shown.length + ' / ' + docs.length },
        { k: AR ? 'المراجعات' : 'Revisions', v: totalRevisions },
        { k: AR ? 'قيد المراجعة' : 'Awaiting review', v: docs.filter(x => x.status === 'draft').length },
        { k: AR ? 'محدد' : 'Selected', v: selIds.length },
      ]} />}>

      {open && <div className="d-l18-fall">
        <DFGroup title={(AR ? 'معاينة — ' : 'Preview — ') + open.id} sub={open.title}
          foot={<button type="button" className="d-linkbtn" onClick={() => setOpenId(null)}>
            {AR ? 'إغلاق المعاينة' : 'Close the preview'}<Icon name="chevron_right" size={14} /></button>}>
          <div className="d-viewer" role="group" aria-label={AR ? 'معاينة الوثيقة' : 'Document preview'}>
            <div className="sheet">
              <span className="no num">{open.id}-{cur.rev}</span>
              <Icon name="description" size={34} />
              <b>{open.title}</b>
              <span className="pgn num">{AR ? 'مراجعة ' : 'revision '}{cur.rev} · {cur.date}</span>
            </div>
          </div>
          <div className="d-form-grid">
            {kv(AR ? 'حالة الإصدار' : 'Issue status', <span className={'d-pill ' + stPill(open.status)}>{window.EPM.DOC_STATUS[open.status][lang]}</span>)}
            {kv(AR ? 'جهة الإصدار' : 'Issued by', cur.by)}
            {kv(AR ? 'إشعار الإرسال' : 'Transmittal', <span className="num">{cur.transmittal || '—'}</span>)}
            {kv(AR ? 'المراجعات' : 'Revisions', <span className="num">{open.revisions.length}</span>)}
          </div>
        </DFGroup>
      </div>}

      <div className="d-l18">
        {/* the classification tree — the doc's Z1 extension, docked here */}
        <DFGroup id="dwg-tree" title={AR ? 'التصنيف' : 'Classification'} sub={String(docs.length)}>
          <nav className="d-l18-tree" aria-label={AR ? 'تصنيف الوثائق' : 'Document classification'}>
            <button className={'nd' + (dis === 'all' ? ' on' : '')}
              aria-current={dis === 'all' ? 'true' : undefined} onClick={() => setDis('all')}>
              <Icon name="folder" size={15} /><span className="tx">{AR ? 'كل الوثائق' : 'All documents'}</span>
              <span className="n num">{docs.length}</span></button>
            {DIS.map(x => { const c = docs.filter(y => y.discipline === x.key).length;
              return (
              <button key={x.key} className={'nd' + (dis === x.key ? ' on' : '') + (c ? '' : ' zero')}
                aria-current={dis === x.key ? 'true' : undefined}
                disabled={!c} onClick={() => setDis(x.key)}>
                <Icon name="folder_open" size={15} /><span className="tx">{x[lang]}</span>
                <span className="n num">{c}</span></button>); })}
          </nav>
        </DFGroup>

        <DFGroup id="dwg-reg" flush
          title={AR ? 'سجل الوثائق' : 'Document register'}
          sub={shown.length + (AR ? ' من ' : ' of ') + docs.length + (latestOnly ? (AR ? ' · آخر مراجعة فقط' : ' · latest only') : '')}>
          <div className="d-toolbar">
            <div className="d-field">
              <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
              <input aria-label={AR ? 'بحث في الوثائق' : 'Search documents'}
                placeholder={AR ? 'بحث بالرقم أو العنوان أو الجهة…' : 'Search by number, title or issuer…'}
                value={q} onChange={e => setQ(e.target.value)} />
            </div>
            {['all', 'approved', 'draft', 'rejected'].map(st => { const c = st === 'all' ? docs.length : docs.filter(x => x.status === st).length;
              return (
              <button key={st} className={'d-fchip' + (status === st ? ' on' : '')} aria-pressed={status === st}
                disabled={st !== 'all' && !c} onClick={() => setStatus(st)}>
                {st === 'all' ? (AR ? 'الكل' : 'All') : window.EPM.DOC_STATUS[st][lang]}<span className="n">{c}</span></button>); })}
            <div className="sp"></div>
            {filtered && <button className="d-btn sm ghost" onClick={clearAll}>
              <Icon name="close" size={13} />{AR ? 'مسح الفلاتر' : 'Clear filters'}</button>}
          </div>

          {shown.length ? (
          /* Eight columns do not fit beside a tree AND a preview — the state
             this archetype is designed for. The issue date, the issuing party
             and the transmittal ride under the title and the revision, where
             they read as one issue rather than three columns the reader has
             to scroll a detached header to reach. All three are also in the
             pane's Details tab. */
          <div className="d-vow-tw wide-dwg"><table className="d-line-table d-dwg-reg"><thead><tr>
            <th style={{ width: 34 }} className="ck"><input type="checkbox" aria-label={AR ? 'تحديد الكل' : 'Select all'}
              ref={el => { if (el) el.indeterminate = shown.some(x => sel[x.id]) && !shown.every(x => sel[x.id]); }}
              checked={shown.length > 0 && shown.every(x => sel[x.id])}
              onChange={e => { const on = e.target.checked; const o = { ...sel }; shown.forEach(x => { if (on) o[x.id] = 1; else delete o[x.id]; }); setSel(o); }} /></th>
            <th style={{ width: 124 }}>{AR ? 'رقم الوثيقة والتخصص' : 'Number & discipline'}</th>
            <th style={{ minWidth: 160 }}>{AR ? 'العنوان وجهة الإصدار' : 'Title & issuer'}</th>
            <th style={{ width: 96 }}>{AR ? 'المراجعة' : 'Revision'}</th>
            <th style={{ width: 120 }}>{AR ? 'حالة الإصدار' : 'Issue status'}</th></tr></thead>
            <tbody>{shown.map(x => {
              const revs = latestOnly ? x.revisions.slice(0, 1) : x.revisions;
              return revs.map((rv, i) => (
                <tr key={x.id + rv.rev} tabIndex={0} role="link" aria-label={x.id + ' — ' + x.title}
                  className={(openId === x.id ? 'sel ' : '') + (i > 0 ? 'sup' : '')}
                  onKeyDown={e => { if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(x.id); } }}
                  onClick={() => setOpenId(x.id)} style={{ cursor: 'pointer' }}>
                  <td className="ck" onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}>
                    {i === 0 && <input type="checkbox" aria-label={(AR ? 'تحديد ' : 'Select ') + x.id}
                      checked={!!sel[x.id]} onChange={e => setSel(o => ({ ...o, [x.id]: e.target.checked ? 1 : 0 }))} />}</td>
                  <td className="code">{x.id}
                    <div className="d-cell-sub">{x.disciplineLabel}</div></td>
                  <td className="name wrap">{x.title}
                    <div className="d-cell-sub">{rv.by}
                      {i > 0 && <em>{AR ? ' · مراجعة ملغاة' : ' · superseded revision'}</em>}</div></td>
                  <td className="num">{rv.rev}
                    <div className="d-cell-sub">{rv.date}</div></td>
                  <td>{i === 0 ? <span className={'d-pill ' + stPill(x.status)}>{window.EPM.DOC_STATUS[x.status][lang]}</span>
                                : <span className="d-pill withdrawn">{AR ? 'ملغاة' : 'Superseded'}</span>}
                    <div className="d-cell-sub num">{rv.transmittal || '—'}</div></td>
                </tr>)); })}</tbody>
          </table></div>
          ) : docs.length === 0 ? (
            <div className="d-empty">
              <span className="d-empty-ico"><Icon name="folder_open" size={26} /></span>
              <b>{AR ? 'لا وثائق في هذا المشروع' : 'No documents on this project'}</b>
              <span>{AR ? 'تُرفع المخططات والتقارير إلى السجل، وكل ملف جديد يصبح مراجعة تحمل رقمها وجهة إصدارها.' : 'Drawings and reports are uploaded to the register; every new file becomes a revision carrying its number and its issuer.'}</span>
            </div>
          ) : (
            <div className="d-empty">
              <span className="d-empty-ico"><Icon name="filter_alt_off" size={26} /></span>
              <b>{AR ? 'لا وثائق مطابقة' : 'No matching documents'}</b>
              <span>{AR ? 'غيّر التخصص أو حالة الإصدار، أو امسح الفلاتر لعرض السجل كاملاً.' : 'Change the discipline or issue status, or clear the filters to see the whole register.'}</span>
              <button className="d-btn sm" onClick={clearAll}><Icon name="close" size={14} />{AR ? 'مسح الفلاتر' : 'Clear filters'}</button>
            </div>
          )}
        </DFGroup>
      </div>
    </DModuleFrame>
  );
}

/* ---------- Overview: hero health + phase pipeline + rail (IA §6) ---------- */
/* Object overview hub (§L10) — hierarchy: verdict → process → modules → detail.
   Every prior capability is preserved: progress curve, stage readiness w/ drill-through,
   financial position, BOQ, change orders, risks, documents, alerts, recent activity. */
function DModOverview({ t, lang, p, d, goTab }) {
  const AR = lang === 'ar';
  const R = window.EPM.buildReadiness(p, lang, d);
  const MODS = window.EPM.modulesFor ? window.EPM.modulesFor(p) : window.EPM.PROJECT_MODULES;
  const modMap = {}; MODS.forEach(m => { modMap[m.id] = m; });
  const isSupply = p && p.type === 'supply';
  const fin = d.financial.raw;
  const sd = React.useMemo(() => window.EPM.buildScheduleData(p, lang), [p && p.id, lang]);
  const alerts = React.useMemo(() => window.EPM.buildAlertsData(p, lang).alerts, [p && p.id, lang]);
  const n = v => window.fmtNum(Math.round(v));
  const musd = v => Math.round(v / 1e6).toLocaleString('en-US') + (AR ? ' م' : 'M');
  const plannedProg = Math.min(100, p.tech + 8);
  const spi = +(p.tech / (plannedProg || 1)).toFixed(2);
  const cpi = +(p.tech / (fin.financialPct || 1)).toFixed(2);
  const physVar = p.tech - plannedProg;
  const vos = d.variationOrders || [];
  const risks = d.risks || [];
  const docs = d.drawings || [];
  const aC = { red: alerts.filter(a => a.sev === 'red').length, amber: alerts.filter(a => a.sev === 'amber').length, green: alerts.filter(a => a.sev === 'green').length };
  const rHigh = risks.filter(r => (r.sev || r.severity || r.level) === 'high').length;

  const NOW_FRAC = 0.66;
  const smooth = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);
  const scurve = React.useMemo(() => {
    const rows = [], months = 12;
    for (let i = 1; i <= months; i++) {
      const f = i / months, planCum = Math.round(smooth(f) * 100);
      const actCum = f <= NOW_FRAC + 1e-6 ? Math.round(smooth(f / NOW_FRAC) * p.tech) : null;
      const prev = rows[rows.length - 1];
      rows.push({ label: (AR ? 'ش' : 'M') + i, planCum, actCum,
        planPeriod: planCum - (prev ? prev.planCum : 0),
        actPeriod: actCum == null ? 0 : actCum - (prev && prev.actCum != null ? prev.actCum : 0) });
    }
    return rows;
  }, [p.tech, AR]);

  /* financial S-curve — same construction as the progress curve so the two
     rows read identically, scaled to the disbursement percentage. */
  const costCurve = React.useMemo(() => {
    const rows = [], months = 12;
    for (let i = 1; i <= months; i++) {
      const f = i / months, planCum = Math.round(smooth(f) * 100);
      const actCum = f <= NOW_FRAC + 1e-6 ? Math.round(smooth(f / NOW_FRAC) * fin.financialPct) : null;
      const prev = rows[rows.length - 1];
      rows.push({ label: (AR ? 'ش' : 'M') + i, planCum, actCum,
        planPeriod: planCum - (prev ? prev.planCum : 0),
        actPeriod: actCum == null ? 0 : actCum - (prev && prev.actCum != null ? prev.actCum : 0) });
    }
    return rows;
  }, [fin.financialPct, AR]);
  const remaining = Math.max(0, fin.revisedCost - fin.disbursed);
  const costVar = fin.revisedCost - fin.plannedCost;

  const STAGE_IDS = ['information', 'contract', 'boq', 'financial', 'schedule', 'progress', 'changeorders', 'risk'].filter(id => modMap[id]);
  const approved = STAGE_IDS.filter(id => R[id] === 'approved').length;
  const nextId = STAGE_IDS.find(id => ['ready', 'returned', 'blocked'].includes(R[id])) || STAGE_IDS.find(id => R[id] === 'inprogress');

  /* Basic project metadata — the attributes a reviewer needs before reading
     any figure. Pulled from the real field bags, and deliberately excluding
     anything Z2 already shows (number, name, status, contract code). */
  const fld = (bag, re) => { const f = ((bag && bag.fields) || []).find(x => re.test(x.label.en || '')); return f ? f.value : null; };
  const META = [
    { k: AR ? 'الجهة المستفيدة' : 'Beneficiary', v: fld(d.entity, /university|beneficiary/i) },
    { k: AR ? 'المقاول المنفّذ' : 'Contractor', v: window.epmContractorName(d, lang) },
    { k: AR ? 'المكتب الاستشاري' : 'Consultant', v: fld(d.consultant, /consultant name/i) },
    { k: AR ? 'نوع المشروع' : 'Project type', v: fld(d.profile, /project type/i) },
    { k: AR ? 'نوع التمويل' : 'Funding', v: fld(d.profile, /funding/i) },
    { k: AR ? 'المنطقة' : 'Region', v: fld(d.profile, /region/i) },
    { k: AR ? 'المباشرة' : 'Start', v: fld(d.contract, /start date/i), num: true },
    { k: AR ? 'الإنجاز التعاقدي' : 'Contract finish', v: fld(d.contract, /finish date/i), num: true },
    { k: AR ? 'الكلفة المعدلة' : 'Revised cost', v: n(fin.revisedCost) + (AR ? ' د.ع' : ' IQD'), num: true },
  ].filter(x => x.v != null && x.v !== '');


  /* L22: every alert states the required action as a verb. */
  const ACTION = {
    changeorders: AR ? 'اتخاذ قرار الاعتماد' : 'Decide approval',
    schedule: AR ? 'مراجعة المسار الحرج' : 'Review critical path',
    financial: AR ? 'مراجعة الصرف' : 'Review disbursement',
    boq: AR ? 'مراجعة الكميات' : 'Review quantities',
    risk: AR ? 'تحديث خطة المعالجة' : 'Update mitigation',
    documents: AR ? 'رفع النسخة المطلوبة' : 'Upload revision',
    progress: AR ? 'تحديث نسبة الإنجاز' : 'Update progress',
  };
  const openAlerts = alerts.filter(a => a.status !== 'ack');
  /* counts and shares must both be over the OPEN set, or the percentages
     do not add up to 100 (acknowledged alerts were inflating the counts). */
  const oC = { red: openAlerts.filter(a => a.sev === 'red').length,
               amber: openAlerts.filter(a => a.sev === 'amber').length,
               green: openAlerts.filter(a => a.sev === 'green').length };
  const SEV = [
    { k: 'red', ar: 'حرجة', en: 'High', icon: 'error', n: oC.red },
    { k: 'amber', ar: 'متوسطة', en: 'Medium', icon: 'warning', n: oC.amber },
    { k: 'green', ar: 'منخفضة', en: 'Low', icon: 'info', n: oC.green },
  ];
  const sevRank = { red: 0, amber: 1, green: 2 };
  const topAlerts = [...openAlerts].sort((x, y) => (sevRank[x.sev] - sevRank[y.sev]) || String(x.when).localeCompare(String(y.when))).slice(0, 4);

  return (
    <React.Fragment>
      {/* ── metadata: the project's main attributes ───────────── */}
      <dl className="d-meta">
        {META.map((m, i) => (
          <div className="d-meta-i" key={i}>
            <dt>{m.k}</dt>
            <dd className={m.num ? 'num' : ''}>{m.v}</dd>
          </div>
        ))}
      </dl>

      {/* ── 1. VERDICT: is this project on track? ─────────────── */}
      <div className="d-verdict">
        <div className="chart">
          <div className="ch-head">
            <b>{AR ? 'التقدم التراكمي' : 'Cumulative progress'}</b>
            <span className="d-cell-sub">{AR ? 'مخطط مقابل فعلي' : 'planned vs actual'}</span>
          </div>
          <DSCurve lang={lang} data={scurve} />
        </div>
        <div className="verdicts">
          <div className={'vd big ' + (physVar < 0 ? 'bad' : 'good')}>
            <span className="k">{AR ? 'الإنجاز المادي' : 'Physical progress'}</span>
            <span className="v">{p.tech}<i>%</i></span>
            <span className="d">{physVar < 0 ? '▼' : '▲'} {Math.abs(physVar)} {AR ? 'نقطة عن المخطط' : 'pts vs plan'} ({plannedProg}%)</span>
            <span className="track"><i style={{ width: p.tech + '%' }}></i><u style={{ insetInlineStart: plannedProg + '%' }}></u></span>
          </div>
          <div className="vdrow">
            <div className={'vd ' + (spi < 1 ? 'bad' : 'good')}>
              <span className="k">SPI</span><span className="v">{spi.toFixed(2)}</span><span className="d">{AR ? 'حد 0.95' : 'thr 0.95'}</span>
            </div>
            <div className={'vd ' + (cpi < 1 ? 'bad' : 'good')}>
              <span className="k">CPI</span><span className="v">{cpi.toFixed(2)}</span><span className="d">{AR ? 'حد 0.95' : 'thr 0.95'}</span>
            </div>
            <div className={'vd ' + (sd.delayDays > 0 ? 'bad' : 'good')}>
              <span className="k">{AR ? 'التأخر' : 'Delay'}</span><span className="v">{sd.delayDays > 0 ? '+' + sd.delayDays : '0'}</span><span className="d">{sd.forecastFinish}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1b. COST: is the money tracking the work? ─────────── */}
      <div className="d-verdict">
        <div className="chart">
          <div className="ch-head">
            <b>{AR ? 'المنحنى المالي' : 'Cost curve'}</b>
            <span className="d-cell-sub">{AR ? 'الصرف المخطط مقابل الفعلي' : 'planned vs actual spend'}</span>
          </div>
          <DSCurve lang={lang} data={costCurve} color="var(--success)" />
        </div>
        <div className="verdicts">
          <button className={'vd big click ' + (fin.financialPct > p.tech ? 'bad' : 'good')} onClick={() => goTab('financial')}>
            <span className="k">{AR ? 'نسبة الصرف' : 'Disbursed'}</span>
            <span className="v">{fin.financialPct}<i>%</i></span>
            <span className="d">{musd(fin.disbursed)} {AR ? 'من' : 'of'} {musd(fin.revisedCost)} · {AR ? 'المادي' : 'physical'} {p.tech}%</span>
            <span className="track"><i style={{ width: fin.financialPct + '%' }}></i><u style={{ insetInlineStart: p.tech + '%' }}></u></span>
          </button>
          <div className="vdrow">
            <div className="vd">
              <span className="k">{AR ? 'المقررة' : 'Approved'}</span>
              <span className="v num">{musd(fin.plannedCost)}</span>
              <span className="d">{AR ? 'د.ع' : 'IQD'}</span>
            </div>
            <div className={'vd ' + (costVar > 0 ? 'bad' : 'good')}>
              <span className="k">{AR ? 'المعدلة' : 'Revised'}</span>
              <span className="v num">{musd(fin.revisedCost)}</span>
              <span className="d">{costVar > 0 ? '▲ ' : costVar < 0 ? '▼ ' : ''}{musd(Math.abs(costVar))}</span>
            </div>
            <div className="vd">
              <span className="k">{AR ? 'المتبقي' : 'Remaining'}</span>
              <span className="v num">{musd(remaining)}</span>
              <span className="d">{AR ? 'للصرف' : 'to spend'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PROCESS: where is it in the lifecycle? ─────────── */}
      <div className="d-stagebar">
        <div className="sb-head">
          <b>{AR ? 'خط سير المراحل' : 'Stage pipeline'}</b>
          <span className="prog"><span className="track"><i style={{ width: Math.round(approved / STAGE_IDS.length * 100) + '%' }}></i></span>{approved}/{STAGE_IDS.length} {AR ? 'معتمد' : 'approved'}</span>
          {nextId && <button className="d-btn sm primary" onClick={() => goTab(nextId)}>{t('next_action')}: {t(modMap[nextId].key)}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></button>}
        </div>
        <ol className="steps">
          {STAGE_IDS.map(id => {
            const st = R[id], meta = window.EPM.READINESS[st] || window.EPM.READINESS.notstarted;
            return (
              <li key={id} className={'step ' + (meta.cls || '') + (id === nextId ? ' now' : '')}>
                <button onClick={() => goTab(id)}>
                  <span className="dot"><Icon name={meta.icon} size={14} /></span>
                  <span className="nm">{t(modMap[id].key)}</span>
                  <span className="st">{meta[AR ? 'ar' : 'en']}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── 3. ATTENTION: what needs a decision now (L22) ─────── */}
      <section className={'d-alertfocus' + (oC.red ? ' crit' : '')}>
        <header className="af-h">
          <span className="ic"><Icon name={oC.red ? 'error' : 'notifications_active'} size={20} /></span>
          <span className="tx">
            <b>{AR ? 'التنبيهات النشطة' : 'Active alerts'}</b>
            <span>{oC.red
              ? (AR ? oC.red + ' تنبيهاً حرجاً يحتاج قراراً الآن' : oC.red + ' critical alerts need a decision now')
              : (AR ? 'لا توجد تنبيهات حرجة' : 'No critical alerts')}</span>
          </span>
          <span className="tot"><b className="num">{openAlerts.length}</b><i>{AR ? 'مفتوح' : 'open'}</i></span>
          <button className="d-btn sm primary" onClick={() => goTab('alerts')}>
            {AR ? 'فتح التنبيهات' : 'Open alerts'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} />
          </button>
        </header>

        <div className="af-sev">
          {SEV.map(sv => {
            const share = openAlerts.length ? Math.round(sv.n / openAlerts.length * 100) : 0;
            return (
              <button key={sv.k} className={'sv ' + sv.k + (sv.n ? '' : ' zero')} onClick={() => goTab('alerts')}>
                <span className="r1"><Icon name={sv.icon} size={16} /><em>{AR ? sv.ar : sv.en}</em></span>
                <span className="r2"><b className="num">{sv.n}</b><i className="num">{share}%</i></span>
                <span className="bar"><u style={{ width: share + '%' }}></u></span>
              </button>
            );
          })}
        </div>

        <ul className="af-list">
          {topAlerts.map(al => (
            <li key={al.id} className={'al ' + al.sev}>
              <span className="dot"></span>
              <span className="tx">
                <b>{al.title}</b>
                <span className="meta">
                  <span className="mono">{al.id}</span><span className="sep">·</span>{al.src}
                  {al.sla && <React.Fragment><span className="sep">·</span><span className="sla">{al.sla}</span></React.Fragment>}
                  {al.esc && al.esc.some(e => !e.done) && <React.Fragment><span className="sep">·</span>
                    <span className="esc">{(AR ? 'تصعيد إلى ' : 'Escalates to ') + al.esc.find(e => !e.done).role}</span></React.Fragment>}
                </span>
              </span>
              <button className="act" onClick={() => goTab(al.tab || 'alerts')}>
                {ACTION[al.tab] || (AR ? 'مراجعة التنبيه' : 'Review alert')}
                <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} />
              </button>
            </li>
          ))}
          {!topAlerts.length && (
            <li className="al empty"><span className="dot"></span>
              <span className="tx"><b>{AR ? 'لا توجد تنبيهات مفتوحة على هذا المشروع.' : 'No open alerts on this project.'}</b></span></li>
          )}
        </ul>
      </section>

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
/* إدارة المخاطر — L05 register. §30 binds severity to Z5, and a risk's
   mitigation opens as an L11 record, so the row opens the Z8 pane rather
   than a drawer. */
function DModRisk({ t, lang, d, asOf, frameTitle, frameActions }) {
  const AR = lang === 'ar';
  const risks = d.risks;
  const SEV = {
    high: { pill: 'stalled', ar: 'عالٍ', en: 'High' },
    med: { pill: 'suspended', ar: 'متوسط', en: 'Medium' },
    low: { pill: 'completed', ar: 'منخفض', en: 'Low' },
  };
  const counts = { all: risks.length, high: 0, med: 0, low: 0 };
  risks.forEach(r => { counts[r.sev]++; });
  const [sev, setSev] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [openNo, setOpenNo] = React.useState(null);
  React.useEffect(() => { setOpenNo(null); }, [sev]);
  const match = r => {
    if (sev !== 'all' && r.sev !== sev) return false;
    if (query && !((r.no + ' ' + r.desc + ' ' + r.owner).toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  };
  const shown = risks.filter(match);
  const open = risks.find(r => r.no === openNo);
  const TABS = [
    { id: 'all', label: AR ? 'الكل' : 'All', n: counts.all },
    { id: 'high', label: AR ? 'عالٍ' : 'High', n: counts.high },
    { id: 'med', label: AR ? 'متوسط' : 'Medium', n: counts.med },
    { id: 'low', label: AR ? 'منخفض' : 'Low', n: counts.low },
  ];
  const kv = (k, v) => <div className="d-form-i"><span className="k">{k}</span><span className="v">{v}</span></div>;

  return (
    <DModuleFrame
      title={frameTitle || t('mod_risk')}
      sub={AR ? 'الخطورة = الاحتمالية × التأثير' : 'Severity = probability × impact'}
      tabs={TABS} tab={sev} onTab={setSev}
      actions={frameActions}
      aside={open ? (
        <DRecordPane lang={lang}
          title={open.desc}
          meta={[
            { k: AR ? 'الرقم' : 'No.', v: open.no, num: true },
            { k: AR ? 'الخطورة' : 'Severity', v: <span className={'d-pill ' + SEV[open.sev].pill}>{AR ? SEV[open.sev].ar : SEV[open.sev].en}</span> },
            { k: AR ? 'الجهة المسؤولة' : 'Owner', v: open.owner },
            { k: AR ? 'الحالة' : 'Status', v: open.status },
          ]}
          onClose={() => setOpenNo(null)}>
          <DRecordGrp label={AR ? 'التقييم' : 'Assessment'}>
            <div className="d-form-grid">
              {kv(AR ? 'النوع' : 'Type', open.type)}
              {kv(AR ? 'الاحتمالية' : 'Probability', open.prob)}
              {kv(AR ? 'التأثير' : 'Impact', open.impact)}
              {kv(AR ? 'المؤشر المرتبط' : 'Linked KPI', <span className="mono">{open.kpi}</span>)}
            </div>
          </DRecordGrp>
          <DMsgBar tone="info" icon="functions" title={AR ? 'كيف تُحتسب الخطورة' : 'How severity is derived'}>
            {AR ? 'الخطورة = الاحتمالية × التأثير، وتُحتسب تلقائياً ولا تُحرَّر يدوياً. ترتبط بمؤشرات الأداء SPI · CPI · EAC · VAC.'
                : 'Severity = probability × impact, computed automatically and never edited by hand. It is tied to the SPI · CPI · EAC · VAC indicators.'}
          </DMsgBar>
        </DRecordPane>
      ) : null}
      status={<DZ10 lang={lang} asOf={asOf} stats={[
        { k: AR ? 'المخاطر' : 'Risks', v: shown.length + ' / ' + risks.length },
        { k: AR ? 'عالية' : 'High', v: counts.high },
        { k: AR ? 'متوسطة' : 'Medium', v: counts.med },
      ]} />}>

      <DFGroup id="risk-reg" flush
        title={AR ? 'سجل المخاطر' : 'Risk register'}
        sub={shown.length + (AR ? ' من ' : ' of ') + risks.length}>
        <div className="d-toolbar">
          <div className="d-field">
            <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
            <input aria-label={AR ? 'بحث في المخاطر' : 'Search risks'} placeholder={AR ? 'بحث بالرقم أو الوصف أو الجهة…' : 'Search by number, description or owner…'}
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="sp"></div>
          {query && <button className="d-btn sm ghost" onClick={() => setQuery('')}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
        </div>
        {shown.length ? (
          <div className="d-vow-tw"><table className="d-line-table">
            <thead><tr>
              <th style={{ width: 84 }}>{AR ? 'الرقم' : 'No.'}</th>
              <th style={{ minWidth: 220 }}>{AR ? 'الوصف' : 'Description'}</th>
              <th style={{ width: 120 }}>{AR ? 'النوع' : 'Type'}</th>
              <th style={{ width: 96 }}>{AR ? 'الاحتمالية' : 'Probability'}</th>
              <th style={{ width: 96 }}>{AR ? 'التأثير' : 'Impact'}</th>
              <th style={{ width: 96 }}>{AR ? 'الخطورة' : 'Severity'}</th>
              <th style={{ width: 160 }}>{AR ? 'الجهة المسؤولة' : 'Owner'}</th>
              <th style={{ width: 92 }}>{AR ? 'المؤشر' : 'KPI'}</th>
              <th style={{ width: 132 }}>{AR ? 'الحالة' : 'Status'}</th>
            </tr></thead>
            <tbody>{shown.map((r, i) => (
              <tr key={i} onClick={() => setOpenNo(r.no)} style={{ cursor: 'pointer' }}
                className={openNo === r.no ? 'sel' : ''}>
                <td className="code">{r.no}</td>
                <td className="name wrap">{r.desc}</td>
                <td className="d-cell-sub">{r.type}</td>
                <td className="d-cell-sub">{r.prob}</td>
                <td className="d-cell-sub">{r.impact}</td>
                <td><span className={'d-pill ' + SEV[r.sev].pill}>{AR ? SEV[r.sev].ar : SEV[r.sev].en}</span></td>
                <td className="d-cell-sub wrap">{r.owner}</td>
                <td className="mono d-cell-sub">{r.kpi}</td>
                <td className="d-cell-sub">{r.status}</td>
              </tr>))}</tbody>
          </table></div>
        ) : (
          <div className="d-empty">
            <span className="d-empty-ico"><Icon name="shield" size={26} /></span>
            <b>{AR ? 'لا مخاطر مطابقة' : 'No matching risks'}</b>
            <span>{AR ? 'غيّر مستوى الخطورة أو امسح البحث.' : 'Change the severity tab or clear the search.'}</span>
          </div>
        )}
      </DFGroup>
    </DModuleFrame>
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

Object.assign(window.EPM, { buildProjectActivity });
Object.assign(window, { DFGroup, DActivityLog, DSec, DSecNav, DFiles, DDrawerGrp, DReadiness, DReviewFlow, DField, DFieldGrid, DEditTimeline, DModProfile, DModInformation, DModEntity, DModSimple, DModConsultant, DModContractNew, DModFinancialNew, DModProgress, DModRisk, DModBOQ, DBOQAssignment, computeBOQGroups, defaultBOQLinks, boqWeights, DModMeetings, DModDrawings, DModOverview, DModReports, DModAudit });
