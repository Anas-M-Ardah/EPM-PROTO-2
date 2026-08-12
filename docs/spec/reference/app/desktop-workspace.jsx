/* ============================================================
   EPM — DESKTOP workspace: the flagship 3-pane master–detail
   (project queue · always-visible detail · context panel),
   workspace overview, and profile/settings.
   ============================================================ */

/* ============================================================
   3-PANE WORKSPACE
   ============================================================ */
const TABS_WITH_ACTIONS = ['information', 'contract', 'boq', 'financial', 'schedule', 'progress', 'changeorders', 'documents', 'meetings', 'alerts'];
const tabHasActions = tab => TABS_WITH_ACTIONS.includes(tab);
function DWorkspace({ t, lang, ws, openCmdk, showToast, setCtxMenu, setPop, goNav, initSelId }) {
  const all = React.useMemo(() => window.EPM.buildProjects(ws.id, ws.projects), [ws.id]);
  const [q, setQ] = dS('');
  const [filter, setFilter] = dS('all');
  const [selId, setSelId] = dS(initSelId || (all[0] ? all[0].id : null));
  const [tab, setTab] = dS('overview');
  const [ctxOn, setCtxOn] = dS(true);
  const [editMode, setEditMode] = dS(false);
  const [contractSelKey, setContractSelKey] = dS(null);
  dE(() => { setContractSelKey(null); }, [selId]);
  const [pickerOpen, setPickerOpen] = dS(false);
  const B = window.EPM.BRANCHES;

  const filters = ['all', 'ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  const counts = {}; filters.forEach(f => counts[f] = f === 'all' ? all.length : all.filter(p => p.status === f).length);
  const qn = q.trim().toLowerCase();
  const rows = all.filter(p => (filter === 'all' || p.status === filter) && (!qn || p.name[lang].toLowerCase().includes(qn) || p.id.toLowerCase().includes(qn)));
  const sel = all.find(p => p.id === selId) || rows[0] || all[0];

  // keyboard: ↑/↓ move selection in queue
  dE(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const i = rows.findIndex(p => p.id === selId);
      const ni = e.key === 'ArrowDown' ? Math.min(i + 1, rows.length - 1) : Math.max(i - 1, 0);
      if (rows[ni]) { setSelId(rows[ni].id); setTab('overview'); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [rows, selId]);

  dE(() => { setTab('overview'); }, [selId]);
  dE(() => { setEditMode(false); }, [selId, tab]);
  dE(() => { setPickerOpen(false); }, [selId]);

  const rowMenu = (e, p) => { e.preventDefault(); e.stopPropagation(); setSelId(p.id); setCtxMenu({ x: e.clientX, y: e.clientY, items: [
    { icon: 'open_in_full', label: t('open_project'), onClick: () => showToast('Demo') },
    { icon: 'edit', label: lang === 'ar' ? 'تعديل' : 'Edit', kbd: 'E', onClick: () => showToast('Demo') },
    { icon: 'bolt', label: lang === 'ar' ? 'تعليم للمتابعة' : 'Flag', onClick: () => showToast(lang === 'ar' ? 'تم التعليم' : 'Flagged') },
    { sep: true },
    { icon: 'ios_share', label: t('export'), onClick: () => showToast('Demo') },
    { icon: 'delete', label: lang === 'ar' ? 'حذف' : 'Delete', danger: true, onClick: () => showToast('Demo') },
  ] }); };

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[ws[lang], t('nav_projects')]} onSearch={openCmdk}
        actions={<React.Fragment>
          <button className="d-btn sm ghost" onClick={() => goNav('projects')} title={lang === 'ar' ? 'قائمة المشاريع' : 'Projects list'}><Icon name={lang === 'ar' ? 'arrow_forward' : 'arrow_back'} size={16} />{lang === 'ar' ? 'المشاريع' : 'Projects'}</button>
          <div className="d-projpick">
            <button className="d-projpick-btn" onClick={() => setPickerOpen(v => !v)}>
              {sel && <span className="d-qrow-rail" style={{ background: window.STATUS_VAR[sel.status], width: 3, height: 22, borderRadius: 999 }}></span>}
              <span className="d-projpick-tx"><b>{sel ? sel.name[lang] : t('select_project')}</b>{sel && <span className="mono">{sel.id}</span>}</span>
              <Icon name="expand_more" size={18} style={{ color: 'var(--on-surface-variant)' }} />
            </button>
            {pickerOpen && (
              <React.Fragment>
                <div className="d-projpick-scrim" onClick={() => setPickerOpen(false)}></div>
                <div className="d-projpick-menu">
                  <div className="d-pane-head">
                    <div className="d-field" style={{ minWidth: 0, flex: 1, height: 34 }}>
                      <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
                      <input autoFocus placeholder={lang === 'ar' ? 'بحث في المشاريع…' : 'Search projects…'} value={q} onChange={e => setQ(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid var(--outline-variant)' }}>
                    {filters.map(f => <button key={f} className={`d-fchip ${filter === f ? 'on' : ''}`} style={{ height: 28, flex: 'none' }} onClick={() => setFilter(f)}>{f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}<span className="n">{counts[f]}</span></button>)}
                  </div>
                  <div className="d-projpick-list">
                    {rows.length === 0 ? <div className="d-empty" style={{ padding: 36 }}><span className="d-empty-ico"><Icon name="search_off" size={26} /></span><b>{lang === 'ar' ? 'لا نتائج' : 'No results'}</b></div> : rows.map(p => (
                      <button key={p.id} className={`d-qrow ${sel && p.id === sel.id ? 'on' : ''}`} onClick={() => setSelId(p.id)} onContextMenu={e => rowMenu(e, p)}>
                        <span className="d-qrow-rail" style={{ background: window.STATUS_VAR[p.status] }}></span>
                        <span className="d-qrow-main">
                          <b>{p.name[lang]}</b>
                          <span className="d-qrow-sub"><span className="mono">{p.id}</span><span className="dot"></span>{B[lang][p.branchIdx]}<span className="dot"></span>{p.tech}%</span>
                        </span>
                        <DPill status={p.status} lang={lang} />
                      </button>
                    ))}
                  </div>
                </div>
              </React.Fragment>
            )}
          </div>
        </React.Fragment>} />

      <div className="d-three" data-ctx="off" style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* DETAIL — actions now live in the page header, no side pane */}
        <div className="d-pane d-detail">
          {sel ? <DProjectDetail t={t} lang={lang} ws={ws} goNav={goNav} p={sel} tab={tab} setTab={setTab} editMode={editMode} setEditMode={setEditMode} contractSelKey={contractSelKey} setContractSelKey={setContractSelKey} showToast={showToast} /> : (
            <div className="d-empty" style={{ margin: 'auto' }}><span className="d-empty-ico"><Icon name="ads_click" size={28} /></span><b>{t('select_project')}</b></div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- center: project detail with grouped module rail ---------- */
const MOD_GROUPS = [
  { label: { ar: 'التعريف', en: 'Definition' }, ids: ['information', 'contract', 'boq', 'financial'] },
  { label: { ar: 'التنفيذ والمتابعة', en: 'Execution' }, ids: ['schedule', 'progress', 'changeorders', 'risk'] },
  { label: { ar: 'السجلات والوثائق', en: 'Records' }, ids: ['model', 'meetings', 'documents'] },
  { label: { ar: 'الرقابة', en: 'Oversight' }, ids: ['alerts', 'reports', 'audit'] },
];
// Supply projects use the SAME module set; the `boq` module carries the supply
// line items, receipts and inquiry as internal facets (no separate nav entries).
const MOD_GROUPS_SUPPLY = [
  { label: { ar: 'التعريف', en: 'Definition' }, ids: ['information', 'contract', 'boq', 'financial'] },
  { label: { ar: 'التجهيز والمتابعة', en: 'Supply & follow-up' }, ids: ['schedule', 'progress', 'changeorders', 'risk'] },
  { label: { ar: 'السجلات والوثائق', en: 'Records' }, ids: ['meetings', 'documents'] },
  { label: { ar: 'الرقابة', en: 'Oversight' }, ids: ['alerts', 'reports', 'audit'] },
];
function DProjectDetail({ t, lang, ws, goNav, p, tab, setTab, editMode, setEditMode, contractSelKey, setContractSelKey, showToast }) {
  // Stamp the active project so field-edit helpers resolve to the right scope,
  // then overlay persisted collections + field edits onto the rebuilt detail so
  // every module reads a single, consistent source of truth (survives reload).
  window.__epmPid = p.id;
  const d = React.useMemo(() => {
    const built = window.epmOverlayD(window.EPM.buildProjectDetail(p, lang), p.id);
    return window.EPM.deriveDetail ? window.EPM.deriveDetail(built, p, lang) : built;
  }, [p.id, lang, tab, editMode]);
  const MODS = window.EPM.modulesFor ? window.EPM.modulesFor(p) : window.EPM.PROJECT_MODULES;
  const byId = React.useMemo(() => Object.fromEntries(MODS.map(m => [m.id, m])), [MODS]);
  // readiness dots derive from each module's real data (pass the built detail)
  const READY = React.useMemo(() => window.EPM.buildReadiness(p, lang, d), [p.id, lang, tab, editMode]);
  /* L04 forbids inline editing and the progress dashboard is derived, so it
     is not an edit context — leaving it here also leaked editMode into the
     next tab the user opened. */
  const EDITABLE = ['information', 'contract', 'financial'];
  const canEdit = tab === 'contract' ? (EDITABLE.includes(tab) && !!contractSelKey) : EDITABLE.includes(tab);
  const ov = byId.overview;
  // Per-tab primary actions live in the PAGE HEADER (Foundation: actions in the
  // header/toolbar, never a dedicated side pane). BOQ is omitted — its own module
  // toolbar carries add/import inline with the grid controls.
  const AR = lang === 'ar';
  const ACTIONS_BY_TAB = {
    schedule: [{ icon: 'ios_share', label: AR ? 'تصدير' : 'Export', onClick: () => window.dispatchEvent(new CustomEvent('epm:sched-export')) }, { icon: 'upload_file', label: AR ? 'استيراد P6' : 'Import P6', primary: true, onClick: () => window.dispatchEvent(new CustomEvent('epm:sched-import')) }],
    changeorders: [{ icon: 'add', label: AR ? 'إنشاء أمر تغييري' : 'Create change order', primary: true, onClick: () => window.dispatchEvent(new CustomEvent('epm:vo-create')) }],
    documents: [{ icon: 'upload_file', label: AR ? 'رفع وثيقة' : 'Upload a document', primary: true,
      onClick: () => showToast(AR ? 'رفع وثيقة جديدة إلى السجل — كل ملف يصبح مراجعة' : 'Uploading a new document — every file becomes a revision') }],
    financial: [{ icon: 'payments', label: AR ? 'تسجيل دفعة' : 'Record payment', primary: true, onClick: () => window.dispatchEvent(new CustomEvent('epm:pay-register')) }],
    progress: [
      { icon: 'download', label: AR ? 'تصدير PDF' : 'Export PDF',
        onClick: () => showToast(AR ? 'تحضير ملف PDF للوحة الإنجاز' : 'Preparing the progress dashboard as PDF') },
      { icon: 'trending_up', label: AR ? 'تحديث نسبة الإنجاز' : 'Update progress', primary: true,
        onClick: () => showToast(AR ? 'يُحدَّث الإنجاز من الجدول الزمني والموقف المالي' : 'Progress is updated from the schedule and the financial position') }],
    meetings: [{ icon: 'groups', label: AR ? 'محضر اجتماع جديد' : 'New meeting minutes', primary: true, onClick: () => showToast('Demo') }],
    alerts: [{ icon: 'notifications_active', label: AR ? 'ضبط قواعد التنبيه' : 'Configure alert rules', onClick: () => showToast(AR ? 'قواعد التنبيه — تُضبط في وحدة الإدارة' : 'Alert rules — configured in Administration') }],
  };
  const contractEditGate = tab !== 'contract' || !!contractSelKey;
  /* module-scoped actions live in Z6 next to the view they act on;
     Z4 is reserved for actions on the project itself. */
  const moduleActions = [
    ...(EDITABLE.includes(tab) && contractEditGate && !editMode ? [{ icon: 'edit', label: AR ? 'تعديل' : 'Edit', onClick: () => setEditMode(true) }] : []),
    ...(ACTIONS_BY_TAB[tab] || []),
  ];
  const moduleActionEls = moduleActions.length ? (
    <React.Fragment>
      {moduleActions.map((a, i) => (
        <button key={i} className={'d-btn sm' + (a.primary ? ' primary' : '')} onClick={a.onClick} title={a.label}>
          <Icon name={a.icon} size={15} /><span className="lbl">{a.label}</span>
        </button>
      ))}
    </React.Fragment>
  ) : null;
  const headerActions = [];
  const READY_TABS = ['information', 'contract', 'boq', 'financial', 'schedule', 'progress', 'changeorders', 'risk'];
  const modBtn = (m) => {
    const R = READY_TABS.includes(m.id) ? window.EPM.READINESS[READY[m.id]] : null;
    return (
      <button key={m.id} className={`d-modnav-item ${tab === m.id ? 'on' : ''} ${!m.perm ? 'locked' : ''}`} onClick={() => m.perm ? setTab(m.id) : showToast(t('no_access'))}>
        <Icon name={!m.perm ? 'lock' : m.icon} size={17} />
        <span className="ml">{t(m.key)}</span>
        {R && <span className={`d-tab-ready ${R.cls}`} title={window.EPM.readinessLabel ? window.EPM.readinessLabel(m.id, READY[m.id], lang) : R[lang]}></span>}
      </button>
    );
  };

  /* Z2 breadcrumb — always the full path from workspace root */
  const crumbs = [
    ...(ws ? [{ label: ws[lang], onClick: goNav ? () => goNav('overview') : null }] : []),
    { label: t('nav_projects'), onClick: goNav ? () => goNav('projects') : null },
    { label: p.name[lang], onClick: tab === 'overview' ? null : () => setTab('overview') },
    ...(tab === 'overview' ? [] : [{ label: t(byId[tab] ? byId[tab].key : 'mod_overview') }]),
  ];

  /* every module renders through DModuleFrame so the assembly (Z5 tabs ·
     Z6 toolbar · Z7 content · Z8 panel · Z10 status) never varies. Modules
     that supply their own frame pass it through untouched. */
  /* modules that render their own DModuleFrame. BOQ only does so for the
     works flow — the supply variant still uses the default frame, and
     wrapping a self-framed module doubles every zone. */
  /* SELF_FRAMED is keyed by TAB, not by component — and two tabs render a
     different component for supply projects, whose variants are not framed.
     Listing the tab unconditionally would leave those pages with no frame. */
  /* both BOQ variants now render their own frame, as do both progress ones */
  const SELF_FRAMED = ['information', 'contract', 'financial', 'schedule', 'risk', 'changeorders', 'progress', 'boq',
    'supplyitems', 'receipts', 'inquiry', 'documents', 'alerts'];
  const body = (
    <React.Fragment>
      {tab === 'overview' && <DModOverview t={t} lang={lang} p={p} d={d} goTab={setTab} />}
      {tab === 'information' && <DModInformation t={t} lang={lang} d={d} editMode={editMode} frameTitle={t('mod_information')} frameActions={moduleActionEls} />}
      {tab === 'contract' && <DModContractNew t={t} lang={lang} d={d} p={p} editMode={editMode} selKey={contractSelKey} setSelKey={setContractSelKey} showToast={showToast} frameActions={moduleActionEls} />}
      {(tab === 'boq' || tab === 'supplyitems' || tab === 'receipts' || tab === 'inquiry') && (p.type === 'supply'
        ? <DModSupplyBOQ t={t} lang={lang} d={d} p={p} showToast={showToast}
            initialSub={tab === 'receipts' ? 'receipts' : tab === 'inquiry' ? 'inquiry' : 'items'}
            frameTitle={t(byId[tab] ? byId[tab].key : 'mod_boq')} frameActions={moduleActionEls} />
        : <DBoqWorkspace t={t} lang={lang} d={d} p={p} showToast={showToast} />)}
      {tab === 'schedule' && <DModSchedule t={t} lang={lang} d={d} p={p} showToast={showToast}
        shellTitle={t('mod_schedule')} frameActions={moduleActionEls} />}
      {tab === 'progress' && (p.type === 'supply'
        ? <DModSupplyProgress t={t} lang={lang} d={d} p={p} asOf={d.asOf} goTab={setTab}
            frameTitle={t('mod_progress')} frameActions={moduleActionEls} />
        : <DModProgress t={t} lang={lang} d={d} p={p} asOf={d.asOf} goTab={setTab}
            frameTitle={t('mod_progress')} frameActions={moduleActionEls} />)}
      {tab === 'risk' && <DModRisk t={t} lang={lang} d={d} asOf={d.asOf}
        frameTitle={t('mod_risk')} frameActions={moduleActionEls} />}
      {tab === 'financial' && <DModFinancialNew t={t} lang={lang} d={d} p={p} editMode={editMode} showToast={showToast} frameActions={moduleActionEls} />}
      {tab === 'changeorders' && <DModVO t={t} lang={lang} d={d} p={p} showToast={showToast}
        perm={byId.changeorders ? byId.changeorders.perm : true} />}
      {tab === 'model' && <DModModel3D t={t} lang={lang} />}
      {tab === 'meetings' && <DModMeetings t={t} lang={lang} d={d} />}
      {tab === 'documents' && <DModDrawings t={t} lang={lang} d={d} showToast={showToast} asOf={d.asOf}
        frameTitle={t('mod_documents')} frameActions={moduleActionEls} />}
      {tab === 'alerts' && <DModAlerts t={t} lang={lang} p={p} showToast={showToast} asOf={d.asOf} goTab={setTab}
        frameTitle={t('mod_alerts')} frameActions={moduleActionEls} />}
      {tab === 'reports' && <DModReports t={t} lang={lang} p={p} showToast={showToast} />}
      {tab === 'audit' && <DModAudit t={t} lang={lang} />}
    </React.Fragment>
  );

  return (
    <div className="d-detail-layout">
      <nav className="d-modnav">
        {ov && modBtn(ov)}
        {(p.type === 'supply' ? MOD_GROUPS_SUPPLY : MOD_GROUPS).map(g => (
          <div className="d-modnav-group" key={g.label.en}>
            <span className="gl">{g.label[lang]}</span>
            {g.ids.map(id => byId[id] && modBtn(byId[id]))}
          </div>
        ))}
      </nav>
      <div className="d-detail-main">
        <DProjectHeader lang={lang} crumbs={crumbs} title={p.name[lang]}
          status={<DPill status={p.status} lang={lang} />} revision={p.id}
          actions={headerActions}
          onCopy={() => showToast(AR ? 'نُسخ رقم المشروع' : 'Project number copied')} />
        {SELF_FRAMED.includes(tab) ? body : (
          <DModuleFrame title={t(byId[tab] ? byId[tab].key : 'mod_overview')} actions={moduleActionEls}>{body}</DModuleFrame>
        )}
        {editMode && canEdit && (
          <div className="d-z9">
            <span className="saved"><Icon name="cloud_done" size={14} />{AR ? 'حُفظت المسودة تلقائياً' : 'Draft saved automatically'}</span>
            <span className="sp"></span>
            <button className="d-btn sm" onClick={() => setEditMode(false)}>{AR ? 'إلغاء' : 'Cancel'}</button>
            <button className="d-btn sm" onClick={() => showToast(AR ? 'حُفظت المسودة — تجريبي' : 'Draft saved — demo')}>{AR ? 'حفظ كمسودة' : 'Save draft'}</button>
            <button className="d-btn sm primary" onClick={() => { setEditMode(false); showToast(AR ? 'تم الإرسال — تجريبي' : 'Submitted — demo'); }}><Icon name="check" size={14} />{AR ? 'إرسال' : 'Submit'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- right: context panel (adapts to the active module tab) ---------- */
function DProjectContext({ t, lang, p, tab, editMode, setEditMode, contractSelKey, setContractSelKey, showToast }) {
  const d = React.useMemo(() => window.EPM.buildProjectDetail(p, lang), [p.id, lang]);
  const [expanded, setExpanded] = dS(false);
  dE(() => { setExpanded(false); }, [tab]);

  const ACTIONS_BY_TAB = {
    boq: [{ icon: 'add', label: t('add_boq_row'), onClick: () => showToast('Demo') }, { icon: 'upload_file', label: lang === 'ar' ? 'استيراد BOQ' : 'Import BOQ', onClick: () => window.dispatchEvent(new CustomEvent('epm:boq-import')) }],
    schedule: [{ icon: 'ios_share', label: lang === 'ar' ? 'تصدير' : 'Export', onClick: () => window.dispatchEvent(new CustomEvent('epm:sched-export')) }, { icon: 'upload_file', label: lang === 'ar' ? 'استيراد P6' : 'Import P6', onClick: () => window.dispatchEvent(new CustomEvent('epm:sched-import')) }],
    changeorders: [{ icon: 'add', label: lang === 'ar' ? 'إنشاء أمر تغييري' : 'Create change order', onClick: () => window.dispatchEvent(new CustomEvent('epm:vo-create')) }],
    documents: [{ icon: 'upload_file', label: lang === 'ar' ? 'رفع وثيقة' : 'Upload a document',
      onClick: () => showToast(lang === 'ar' ? 'رفع وثيقة جديدة إلى السجل' : 'Uploading a new document to the register') }],
    financial: [{ icon: 'payments', label: lang === 'ar' ? 'تسجيل دفعة' : 'Record payment', onClick: () => window.dispatchEvent(new CustomEvent('epm:pay-register')) }],
    progress: [
      { icon: 'download', label: lang === 'ar' ? 'تصدير PDF' : 'Export PDF',
        onClick: () => showToast(lang === 'ar' ? 'تحضير ملف PDF للوحة الإنجاز' : 'Preparing the progress dashboard as PDF') },
      { icon: 'trending_up', label: lang === 'ar' ? 'تحديث نسبة الإنجاز' : 'Update progress',
        onClick: () => showToast(lang === 'ar' ? 'يُحدَّث الإنجاز من الجدول الزمني والموقف المالي' : 'Progress is updated from the schedule and the financial position') }],
    meetings: [{ icon: 'groups', label: lang === 'ar' ? 'محضر اجتماع جديد' : 'New meeting minutes', onClick: () => showToast('Demo') }],
    alerts: [{ icon: 'notifications_active', label: lang === 'ar' ? 'ضبط قواعد التنبيه' : 'Configure alert rules', onClick: () => showToast(lang === 'ar' ? 'قواعد التنبيه — قيد الإعداد في وحدة الإدارة' : 'Alert rules — configured in Administration') }],
  };
  /* L04 forbids inline editing and the progress dashboard is derived, so it
     is not an edit context — leaving it here also leaked editMode into the
     next tab the user opened. */
  const EDITABLE = ['information', 'contract', 'financial'];
  const contractEditGate = tab !== 'contract' || !!contractSelKey;
  const actions = [
    ...(EDITABLE.includes(tab) && contractEditGate ? [editMode
      ? { icon: 'check', label: lang === 'ar' ? 'حفظ التعديلات' : 'Save changes', onClick: () => { setEditMode(false); showToast(lang === 'ar' ? 'تم الحفظ — تجريبي' : 'Saved — demo'); } }
      : { icon: 'edit', label: lang === 'ar' ? 'تعديل' : 'Edit', onClick: () => setEditMode(true) }] : []),
    ...(tab === 'contract' && !contractSelKey ? [{ icon: 'add', label: lang === 'ar' ? 'إضافة عقد' : 'Add contract', onClick: () => showToast(lang === 'ar' ? 'إضافة عقد — تجريبي' : 'Add contract — demo') }] : []),
    ...(ACTIONS_BY_TAB[tab] || []),
  ];

  // per-tab edit history, normalized to { by, date, changes:[{field,from,to}] } events
  const HISTORY_BY_TAB = {
    information: d.profile.editLog,
    contract: d.contract.editLog,
    financial: d.financial.editLog,
    schedule: d.schedule.editLog,
    progress: d.progress.history.slice().reverse().slice(0, -1).map((h, i, arr) => {
      const prev = d.progress.history[d.progress.history.length - 2 - i];
      return prev ? { by: h.by, date: h.date, changes: [
        { field: lang === 'ar' ? 'الإنجاز المادي' : 'Physical %', from: prev.physical + '%', to: h.physical + '%' },
        { field: lang === 'ar' ? 'الإنجاز المالي' : 'Financial %', from: prev.financial + '%', to: h.financial + '%' },
      ] } : null;
    }).filter(Boolean),
  };
  const history = HISTORY_BY_TAB[tab];
  const fallbackTl = [
    ...d.meetings.slice(0, 2).map(m => ({ by: lang === 'ar' ? 'محضر اجتماع' : 'Meeting minutes', date: m.date, changes: [{ field: m.subject, from: '', to: m.decisions }] })),
    ...d.variationOrders.slice(0, 2).map(v => ({ by: v.no, date: v.date, changes: [{ field: v.reason, from: '', to: window.fmtNum(v.value) + ' IQD' }] })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const events = history && history.length ? history : fallbackTl;
  const visible = expanded ? events : events.slice(0, 2);

  const MOD = (window.EPM.modulesFor ? window.EPM.modulesFor(p) : window.EPM.PROJECT_MODULES).find(m => m.id === tab);
  const histTitle = lang === 'ar' ? `سجل تعديلات — ${t(MOD ? MOD.key : 'mod_overview')}` : `Edit history — ${t(MOD ? MOD.key : 'mod_overview')}`;

  return (
    <div className="d-pane d-ctx compact">
      <div className="d-pane-scroll">
        <div className="d-ctx-sec" style={{ borderBottom: 'none' }}>
          <b className="t">{lang === 'ar' ? `إجراءات — ${t(MOD ? MOD.key : 'mod_overview')}` : `Actions — ${t(MOD ? MOD.key : 'mod_overview')}`}</b>
          <div className="d-ctx-act">
            {actions.length ? actions.map((a, i) => <button className={`d-btn ${a.icon === 'check' ? 'primary' : ''}`} key={i} onClick={a.onClick} title={a.label}><Icon name={a.icon} size={16} />{a.label}</button>) : <span className="d-cell-sub">{lang === 'ar' ? 'لا توجد إجراءات' : 'No actions'}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   WORKSPACE OVERVIEW (workspace-scoped dashboard)
   ============================================================ */
function DWorkspaceOverview({ t, lang, ws, openCmdk, goNav, showToast, openProjectDetail }) {
  const AR = lang === 'ar';
  const B = window.EPM.BRANCHES;
  const all = React.useMemo(() => window.EPM.buildProjects(ws.id, ws.projects).map(p => ({ ...p, ws })), [ws.id]);

  const [stFilter, setStFilter] = React.useState('all');
  const [branch, setBranch] = React.useState('all');
  const statusKeys = ['ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  const portfolio = all.filter(p => (stFilter === 'all' || p.status === stFilter) && (branch === 'all' || String(p.branchIdx) === branch));

  // ---- workspace-scoped answers (same model as the ministry board) ----
  const plannedTotal = portfolio.reduce((a, p) => a + p.plannedCost, 0);
  const revisedTotal = portfolio.reduce((a, p) => a + p.cost, 0) || 1;
  const cumulativeTotal = portfolio.reduce((a, p) => a + Math.round(p.cost * (p.financialPct / 100)), 0);
  const physicalPct = Math.round(portfolio.reduce((a, p) => a + p.tech * p.cost, 0) / revisedTotal);
  const financialPct = Math.round(cumulativeTotal / revisedTotal * 100);
  const NOW_FRAC = 0.66;
  const smooth = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);
  const plannedToDate = Math.round(smooth(NOW_FRAC) * 100);
  const physVariance = physicalPct - plannedToDate;
  const spi = plannedToDate ? (physicalPct / plannedToDate) : 0;
  const burnVariance = financialPct - physicalPct;
  const earnedValue = revisedTotal * physicalPct / 100;
  const cpi = cumulativeTotal ? earnedValue / cumulativeTotal : 0;
  const curve = (pctNow) => {
    const rows = [], months = 12;
    for (let i = 1; i <= months; i++) {
      const f = i / months, planCum = Math.round(smooth(f) * 100);
      const actCum = f <= NOW_FRAC + 1e-6 ? Math.round(smooth(f / NOW_FRAC) * pctNow) : null;
      const prev = rows[rows.length - 1];
      rows.push({ label: (AR ? 'ش' : 'M') + i, planCum, actCum,
        planPeriod: planCum - (prev ? prev.planCum : 0),
        actPeriod: actCum == null ? 0 : actCum - (prev && prev.actCum != null ? prev.actCum : 0) });
    }
    return rows;
  };
  const scurve = React.useMemo(() => curve(physicalPct), [physicalPct, AR]);
  const costCurve = React.useMemo(() => curve(financialPct), [financialPct, AR]);
  const signalOf = p => window.EPM.execSignal(p);
  const watchlist = portfolio.filter(p => signalOf(p) !== 'green').sort((a, b) => b.cost - a.cost).slice(0, 6)
    .map(p => ({ p, s: window.EPM.buildSchedule(p) }));
  const statusColors = { ongoing: 'var(--status-ongoing)', completed: 'var(--status-completed)', stalled: 'var(--status-delayed)', suspended: 'var(--status-suspended)', withdrawn: 'var(--status-cancelled)' };
  const statusCounts = statusKeys.map(k => ({ key: k, value: portfolio.filter(p => p.status === k).length, color: statusColors[k], label: window.EPM.STATUS[k][lang] }));
  const milestones = [...portfolio].filter(p => p.status === 'ongoing').sort((a, b) => b.tech - a.tech).slice(0, 4).map(p => ({ p, s: window.EPM.buildSchedule(p) }));
  const musd = v => Math.round(v / 1000000).toLocaleString('en-US') + (AR ? ' م.د.ع' : ' M IQD');
  const openP = p => openProjectDetail ? openProjectDetail(p) : goNav('projects');
  const branches = Array.from(new Set(all.map(p => p.branchIdx)));

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[ws[lang]]} onSearch={openCmdk} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            <DPageHead lang={lang}
              crumbs={[ws[lang], t('ws_overview')]}
              title={ws[lang]}
              sub={`${ws.kind[lang]} · ${portfolio.length} ${AR ? 'مشروعاً ضمن النطاق' : 'projects in scope'} · ${AR ? 'بيانات حتى' : 'data as of'} ${new Date().toISOString().slice(0, 10)}`}
              actions={<React.Fragment>
                <button className="d-btn" onClick={() => showToast && showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}><Icon name="ios_share" size={16} />{t('export')}</button>
                <button className="d-btn primary" onClick={() => goNav('projects')}><Icon name="projects" size={16} />{t('view_projects')}</button>
              </React.Fragment>} />

            <div className="d-toolbar">
              <div className="grp">
                {['all', ...statusKeys].map(f => <button key={f} className={`d-fchip ${stFilter === f ? 'on' : ''}`} onClick={() => setStFilter(f)}>{f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}<span className="n">{f === 'all' ? all.length : all.filter(p => p.status === f).length}</span></button>)}
              </div>
              <div className="sp"></div>
              <select className="d-form-input" style={{ width: 'auto' }} value={branch} onChange={e => setBranch(e.target.value)}>
                <option value="all">{AR ? 'كل الفروع' : 'All branches'}</option>
                {branches.map(bi => <option key={bi} value={String(bi)}>{B[lang][bi]}</option>)}
              </select>
              {(stFilter !== 'all' || branch !== 'all') && <button className="d-btn sm ghost" onClick={() => { setStFilter('all'); setBranch('all'); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
            </div>

            {/* row 1 — progress curve + schedule/cost answer tiles */}
            <div className="d-dash">
              <div className="d-dash-main">
                <div className="d-panel">
                  <div className="d-panel-head">
                    <b>{AR ? 'التقدم التراكمي — مخطط مقابل فعلي' : 'Cumulative progress — planned vs actual'}</b>
                    <span className="d-cell-sub">{AR ? `المخطط ${plannedToDate}% · الفعلي ${physicalPct}%` : `Planned ${plannedToDate}% · Actual ${physicalPct}%`}</span>
                    <span className={'d-pill ' + (physVariance < -5 ? 'stalled' : physVariance < 0 ? 'suspended' : 'completed')}>
                      {physVariance < 0 ? (AR ? `متأخر ${Math.abs(physVariance)} نقطة` : `${Math.abs(physVariance)} pts behind`) : (AR ? `متقدّم ${physVariance} نقطة` : `${physVariance} pts ahead`)}
                    </span>
                  </div>
                  <DSCurve lang={lang} data={scurve} />
                </div>
              </div>
              <aside className="d-dash-side">
                <DStat idx={0} val={physicalPct} suffix="%" lbl={AR ? 'الإنجاز المادي' : 'Physical progress'} bar={physicalPct}
                  delta={(physVariance < 0 ? '▼ ' : '▲ ') + Math.abs(physVariance) + (AR ? ' نقطة' : ' pts')} deltaDir={physVariance < 0 ? 'down' : 'up'}
                  foot={(AR ? 'المخطط حتى تاريخه ' : 'Planned to date ') + plannedToDate + '%'} />
                <DStat idx={1} val={spi.toFixed(2)} lbl={AR ? 'مؤشر أداء الجدول (SPI)' : 'Schedule performance (SPI)'}
                  delta={spi < 1 ? (AR ? '▼ دون 1.00' : '▼ below 1.00') : (AR ? '▲ عند الهدف' : '▲ at target')} deltaDir={spi < 1 ? 'down' : 'up'}
                  foot={AR ? 'الحد المقبول 0.95' : 'Threshold 0.95'} />
                <DStat idx={2} val={financialPct} suffix="%" lbl={AR ? 'الإنجاز المالي' : 'Financial progress'} bar={financialPct}
                  delta={(burnVariance > 0 ? '▲ +' : '▼ ') + Math.abs(burnVariance) + (AR ? ' مقابل المادي' : ' vs physical')} deltaDir={burnVariance > 0 ? 'down' : 'up'}
                  foot={musd(cumulativeTotal) + (AR ? ' مصروف' : ' spent')} />
              </aside>
            </div>

            {/* row 2 — cost curve + CPI and the workspace signal */}
            <div className="d-dash">
              <div className="d-dash-main">
                <div className="d-panel">
                  <div className="d-panel-head">
                    <b>{AR ? 'المنحنى المالي — الصرف المخطط مقابل الفعلي' : 'Cost curve — planned vs actual spend'}</b>
                    <span className="d-cell-sub">{musd(cumulativeTotal)} {AR ? 'من' : 'of'} {musd(revisedTotal)}</span>
                    <span className={'d-pill ' + (burnVariance < -5 ? 'suspended' : burnVariance > 5 ? 'stalled' : 'completed')}>
                      {burnVariance === 0 ? (AR ? 'متوافق مع التنفيذ' : 'in step with progress')
                        : burnVariance > 0 ? (AR ? `الصرف يسبق التنفيذ ${burnVariance} نقطة` : `spend ${burnVariance} pts ahead`)
                        : (AR ? `الصرف يتأخر ${Math.abs(burnVariance)} نقطة` : `spend ${Math.abs(burnVariance)} pts behind`)}
                    </span>
                  </div>
                  <DSCurve lang={lang} data={costCurve} color="var(--status-completed)" />
                </div>
              </div>
              <aside className="d-dash-side">
                <DStat idx={0} val={cpi.toFixed(2)} lbl={AR ? 'مؤشر أداء الكلفة (CPI)' : 'Cost performance (CPI)'}
                  delta={cpi < 1 ? (AR ? '▼ دون 1.00' : '▼ below 1.00') : (AR ? '▲ فوق 1.00' : '▲ above 1.00')} deltaDir={cpi < 1 ? 'down' : 'up'}
                  foot={`EV ${musd(earnedValue)} / AC ${musd(cumulativeTotal)}`} />
                {(() => {
                  const sig = portfolio.map(p => signalOf(p));
                  const red = sig.filter(s => s === 'red').length, amber = sig.filter(s => s === 'amber').length, green = sig.filter(s => s === 'green').length;
                  const pct = n => portfolio.length ? Math.round(n / portfolio.length * 100) : 0;
                  const cells = [
                    { tone: 'over', icon: 'warning', label: AR ? 'متعثّرة / متأخرة' : 'Behind / stalled', value: red },
                    { tone: 'risk', icon: 'error', label: AR ? 'معرّضة للتأخير' : 'At risk', value: amber },
                    { tone: 'ok', icon: 'check_circle', label: AR ? 'ضمن الخطة' : 'On plan', value: green },
                  ];
                  return (
                    <div className="d-panel sig">
                      <div className="d-panel-head"><b>{AR ? 'المؤشر التنفيذي' : 'Executive signal'}</b><span className="d-cell-sub">{portfolio.length} {AR ? 'مشروعاً' : 'projects'}</span></div>
                      <div className="d-tl-band col">
                        {cells.map((c, i) => (
                          <div key={i} className={`d-tl-cell ${c.tone}`}>
                            <span className="d-tl-ico"><Icon name={c.icon} size={18} /></span>
                            <div className="d-tl-tx"><div className="d-tl-num">{c.value}</div><div className="d-cell-sub">{c.label}</div></div>
                            <span className="d-tl-pc num">{pct(c.value)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </aside>
            </div>

            {/* watchlist — full width */}
            <div className="d-tablewrap" style={{ marginBottom: 16 }}>
              <div className="d-toolbar">
                <b style={{ fontSize: 14 }}>{AR ? 'قائمة المتابعة — مشاريع خارج المسار' : 'Watchlist — projects off track'}</b>
                <div className="sp"></div>
                <span className="d-cell-sub">{watchlist.length} {AR ? 'من' : 'of'} {portfolio.length}</span>
                <button className="d-btn sm ghost" onClick={() => goNav('projects')}>{AR ? 'عرض كل المشاريع' : 'View all projects'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></button>
              </div>
              {watchlist.length ? (
                <table className="d-table">
                  <thead><tr>
                    <th style={{ width: 108 }}>{AR ? 'الرمز' : 'Code'}</th>
                    <th>{AR ? 'المشروع' : 'Project'}</th>
                    <th>{AR ? 'الفرع' : 'Branch'}</th>
                    <th>{AR ? 'الحالة' : 'Status'}</th>
                    <th>{AR ? 'الإنجاز' : 'Progress'}</th>
                    <th className="r">{AR ? 'الانحراف' : 'Variance'}</th>
                    <th className="r">{AR ? 'الكلفة (د.ع)' : 'Cost (IQD)'}</th>
                    <th>{AR ? 'الإنجاز المتوقع' : 'Expected finish'}</th>
                  </tr></thead>
                  <tbody>{watchlist.map(({ p, s }) => {
                    const v = p.tech - plannedToDate;
                    return (
                      <tr key={p.id} onClick={() => openP(p)} style={{ cursor: 'pointer' }}>
                        <td className="mono d-cell-sub">{p.id}</td>
                        <td className="d-cell-strong">{p.name[lang]}</td>
                        <td className="d-cell-sub">{B[lang][p.branchIdx]}</td>
                        <td><DPill status={p.status} lang={lang} /></td>
                        <td><span className="d-mini-bar"><span className="t"><span style={{ width: p.tech + '%' }}></span></span><span className="pc">{p.tech}%</span></span></td>
                        <td className="num r" style={{ color: v < 0 ? 'var(--error)' : 'var(--status-completed-tx)', fontWeight: 600 }}>{(v > 0 ? '+' : '') + v}</td>
                        <td className="num r">{window.fmtNum(p.cost)}</td>
                        <td className="num d-cell-sub">{s.expectedFinish}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              ) : (
                <div style={{ padding: '34px 16px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
                  <Icon name="check_circle" size={26} style={{ color: 'var(--status-completed-tx)' }} />
                  <div style={{ marginTop: 8, fontWeight: 600, color: 'var(--on-surface)' }}>{AR ? 'لا مشاريع خارج المسار' : 'No projects off track'}</div>
                  <div style={{ marginTop: 3 }}>{AR ? 'كل مشاريع المساحة ضمن الخطة.' : 'Every project in this workspace is on plan.'}</div>
                </div>
              )}
            </div>

            {/* breakdown */}
            <div className="d-grid c2 eqrows">
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('rep_by_status')}</b><span className="d-cell-sub">{portfolio.length} {AR ? 'مشروعاً' : 'projects'}</span></div>
                <div className="d-donut-row">
                  <DDonutMulti segments={statusCounts} size={140} stroke={16} centerLabel={AR ? 'مشروعاً' : 'projects'} />
                  <div className="d-donut-legend">
                    {statusCounts.map(c => (
                      <div className="li" key={c.key}>
                        <i style={{ background: c.color }}></i>
                        <span className="k">{c.label}</span>
                        <b className="num">{c.value}</b>
                        <span className="pc num">{portfolio.length ? Math.round(c.value / portfolio.length * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('chart_cost_compare')}</b></div>
                <DBarCompare lang={lang} items={[
                  { label: t('kpi_planned_cost'), value: plannedTotal, display: musd(plannedTotal), color: 'var(--viz-1)' },
                  { label: t('kpi_revised_cost'), value: revisedTotal, display: musd(revisedTotal), color: 'var(--viz-2)' },
                  { label: t('kpi_cumulative_spend'), value: cumulativeTotal, display: musd(cumulativeTotal), color: 'var(--viz-3)' },
                ]} />
              </div>
            </div>

            <div className="d-panel" style={{ marginTop: 16 }}>
              <div className="d-panel-head"><b>{AR ? 'معالم قادمة' : 'Upcoming milestones'}</b><span className="d-cell-sub">{AR ? 'أقرب الإنجازات المخططة' : 'Nearest planned finishes'}</span></div>
              <div className="d-actfeed">
                {milestones.map(({ p, s }) => (
                  <button key={p.id} className="d-actrow" onClick={() => openP(p)}>
                    <span className="tx">
                      <span className="l1"><b>{p.name[lang]}</b></span>
                      <span className="l2"><span className="mono">{p.id}</span> · {B[lang][p.branchIdx]} · {AR ? 'الإنجاز' : 'Progress'} {p.tech}%</span>
                    </span>
                    <DPill status={p.status} lang={lang} />
                    <span className="tm">{s.plannedFinish}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROFILE / SETTINGS (two-pane: subnav + content)
   ============================================================ */
function DProfile({ t, lang, user, theme, setTheme, setLang, openCmdk, showToast, onClose }) {
  const [sec, setSec] = dS('account');
  const AUD = window.EPM.AUDIT;
  const subnav = [['account', 'person', t('account')], ['access', 'shield', t('my_access')], ['activity', 'history', t('activity_log')], ['prefs', 'tune', lang === 'ar' ? 'التفضيلات' : 'Preferences']];
  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[t('profile'), subnav.find(s => s[0] === sec)[2]]} onSearch={openCmdk}
        actions={<button className="d-btn ghost" onClick={onClose}><Icon name="close" size={18} />{t('back')}</button>} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap" style={{ maxWidth: 1040, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>
            {/* subnav */}
            <div style={{ position: 'sticky', top: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 4px 18px' }}>
                <span className="d-side-av" style={{ width: 44, height: 44, fontSize: 15 }}>{user.initials[lang]}</span>
                <div style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 15, fontWeight: 'var(--fw-x)' }}>{user.name[lang]}</b><span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{user.role[lang]}</span></div>
              </div>
              {subnav.map(([id, ic, lab]) => (
                <button key={id} className="d-pop-row" style={{ background: sec === id ? 'color-mix(in srgb,var(--primary) 9%,transparent)' : 'none', marginBottom: 2 }} onClick={() => setSec(id)}>
                  <span style={{ width: 22, display: 'grid', placeItems: 'center', color: sec === id ? 'var(--primary)' : 'var(--on-surface-variant)' }}><Icon name={ic} size={18} /></span>
                  <span className="d-pop-row-tx"><b style={{ color: sec === id ? 'var(--primary)' : 'var(--on-surface)' }}>{lab}</b></span>
                </button>
              ))}
            </div>
            {/* content */}
            <div>
              {sec === 'account' && (
                <div className="d-panel"><div className="d-panel-head"><b>{t('account')}</b></div><div className="d-panel-body"><div className="d-dl">
                  <div className="d-dl-i"><span className="k">{lang === 'ar' ? 'الاسم الكامل' : 'Full name'}</span><span className="v">{user.name[lang]}</span></div>
                  <div className="d-dl-i"><span className="k">{t('email')}</span><span className="v mono">{user.email}</span></div>
                  <div className="d-dl-i"><span className="k">{t('role')}</span><span className="v">{user.role[lang]}</span></div>
                  <div className="d-dl-i"><span className="k">{t('org_unit')}</span><span className="v">{user.unit[lang]}</span></div>
                </div></div></div>
              )}
              {sec === 'access' && (
                <div className="d-panel"><div className="d-panel-head"><b>{t('assignments')}</b></div><div className="d-panel-body" style={{ padding: 0 }}>
                  <table className="d-table"><thead><tr><th>{t('col_role')}</th><th>{t('col_scope')}</th><th>{t('col_plane')}</th></tr></thead><tbody>
                    {user.assignments.map((a, i) => <tr key={i} style={{ cursor: 'default' }}><td className="d-cell-strong">{a.role[lang]}</td><td className="d-cell-sub">{a.scope[lang]}</td><td><span className={`d-pill ${a.plane === 'both' ? 'ongoing' : 'withdrawn'}`}>{a.plane === 'both' ? (lang === 'ar' ? 'تشغيلي + إداري' : 'Ops + Admin') : (lang === 'ar' ? 'تشغيلي' : 'Ops')}</span></td></tr>)}
                  </tbody></table>
                </div></div>
              )}
              {sec === 'activity' && (
                <div className="d-panel"><div className="d-panel-head"><b>{t('activity_log')}</b></div><div className="d-panel-body" style={{ padding: 0 }}>
                  <table className="d-table"><thead><tr><th>{lang === 'ar' ? 'الإجراء' : 'Action'}</th><th>{lang === 'ar' ? 'الكيان' : 'Entity'}</th><th>{lang === 'ar' ? 'الهدف' : 'Target'}</th><th>{lang === 'ar' ? 'الوقت' : 'Time'}</th></tr></thead><tbody>
                    {AUD.map((a, i) => <tr key={i} style={{ cursor: 'default' }}><td className="d-cell-strong">{a.action[lang]}</td><td className="d-cell-sub">{a.entity[lang]}</td><td className="mono">{a.tgt}</td><td className="mono d-cell-sub">{a.t.slice(5)}</td></tr>)}
                  </tbody></table>
                </div></div>
              )}
              {sec === 'prefs' && (
                <div className="d-panel"><div className="d-panel-head"><b>{lang === 'ar' ? 'التفضيلات' : 'Preferences'}</b></div><div className="d-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-container-high)' }}><div><b style={{ fontSize: 13 }}>{lang === 'ar' ? 'المظهر الداكن' : 'Dark appearance'}</b><div className="d-cell-sub">{lang === 'ar' ? 'بدّل بين الفاتح و الداكن' : 'Switch light / dark'}</div></div><button className={`d-switch ${theme === 'dark' ? 'on' : ''}`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}></button></div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}><div><b style={{ fontSize: 13 }}>{lang === 'ar' ? 'اللغة' : 'Language'}</b><div className="d-cell-sub">{lang === 'ar' ? 'العربية (RTL) / English' : 'Arabic (RTL) / English'}</div></div><button className="d-btn sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Icon name="translate" size={15} />{lang === 'ar' ? 'English' : 'العربية'}</button></div>
                </div></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DWorkspace, DWorkspaceOverview, DProfile, DProjectDetail, DProjectContext });
