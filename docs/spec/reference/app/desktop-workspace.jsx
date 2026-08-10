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
          {sel && tabHasActions(tab) && <button className={`d-btn sm d-ctx-toggle ${ctxOn ? 'on' : 'ghost'}`} onClick={() => setCtxOn(v => !v)} title={lang === 'ar' ? 'لوحة الإجراءات' : 'Actions panel'}><Icon name="bolt" size={17} />{lang === 'ar' ? 'إجراءات' : 'Actions'}</button>}
        </React.Fragment>} />

      <div className="d-three" data-ctx={ctxOn && sel && tabHasActions(tab) ? 'on' : 'off'} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* DETAIL */}
        <div className="d-pane d-detail">
          {sel ? <DProjectDetail t={t} lang={lang} p={sel} tab={tab} setTab={setTab} editMode={editMode} setEditMode={setEditMode} contractSelKey={contractSelKey} setContractSelKey={setContractSelKey} showToast={showToast} /> : (
            <div className="d-empty" style={{ margin: 'auto' }}><span className="d-empty-ico"><Icon name="ads_click" size={28} /></span><b>{t('select_project')}</b></div>
          )}
        </div>

        {/* CONTEXT */}
        {ctxOn && sel && tabHasActions(tab) && <DProjectContext t={t} lang={lang} p={sel} tab={tab} editMode={editMode} setEditMode={setEditMode} contractSelKey={contractSelKey} setContractSelKey={setContractSelKey} showToast={showToast} />}
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
function DProjectDetail({ t, lang, p, tab, setTab, editMode, setEditMode, contractSelKey, setContractSelKey, showToast }) {
  const d = React.useMemo(() => window.EPM.buildProjectDetail(p, lang), [p.id, lang]);
  const MODS = window.EPM.PROJECT_MODULES;
  const byId = React.useMemo(() => Object.fromEntries(MODS.map(m => [m.id, m])), [MODS]);
  const READY = React.useMemo(() => window.EPM.buildReadiness(p), [p.id]);
  const EDITABLE = ['information', 'contract', 'financial', 'progress'];
  const canEdit = tab === 'contract' ? (EDITABLE.includes(tab) && !!contractSelKey) : EDITABLE.includes(tab);
  const ov = byId.overview;
  const READY_TABS = ['information', 'contract', 'boq', 'financial', 'schedule', 'progress', 'changeorders', 'risk'];
  const modBtn = (m) => {
    const R = READY_TABS.includes(m.id) ? window.EPM.READINESS[READY[m.id]] : null;
    return (
      <button key={m.id} className={`d-modnav-item ${tab === m.id ? 'on' : ''} ${!m.perm ? 'locked' : ''}`} onClick={() => m.perm ? setTab(m.id) : showToast(t('no_access'))}>
        <Icon name={!m.perm ? 'lock' : m.icon} size={17} />
        <span className="ml">{t(m.key)}</span>
        {R && <span className={`d-tab-ready ${R.cls}`} title={R[lang]}></span>}
      </button>
    );
  };

  return (
    <div className="d-detail-layout">
      <nav className="d-modnav">
        {ov && modBtn(ov)}
        {MOD_GROUPS.map(g => (
          <div className="d-modnav-group" key={g.label.en}>
            <span className="gl">{g.label[lang]}</span>
            {g.ids.map(id => byId[id] && modBtn(byId[id]))}
          </div>
        ))}
      </nav>
      <div className="d-detail-main">
        <div className="d-detail-head">
          <div className="d-detail-titlerow">
            <div className="d-detail-title">
              <DPill status={p.status} lang={lang} />
              <h2>{p.name[lang]}</h2>
              <div className="d-detail-meta"><span>{p.id}</span><span className="sep">·</span><span>{d.contract.code}</span><span className="sep">·</span><span>{window.EPM.BRANCHES[lang][p.branchIdx]}</span></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <DDonut value={p.tech} size={58} stroke={6} />
            </div>
          </div>
        </div>
        {editMode && canEdit && (
          <div className="d-edit-bar">
            <Icon name="edit_note" size={16} />
            <span>{lang === 'ar' ? 'وضع التعديل — التغييرات للمراجعة فقط' : 'Edit mode — changes are for review only'}</span>
            <div style={{ flex: 1 }}></div>
            <button className="d-btn sm ghost" onClick={() => setEditMode(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button className="d-btn sm primary" onClick={() => { setEditMode(false); showToast(lang === 'ar' ? 'تم الحفظ — تجريبي' : 'Saved — demo'); }}><Icon name="check" size={14} />{t('save')}</button>
          </div>
        )}
        <div className="d-detail-body">
          {tab === 'overview' && <DModOverview t={t} lang={lang} p={p} d={d} goTab={setTab} />}
          {tab === 'information' && <DModInformation t={t} lang={lang} d={d} editMode={editMode} />}
          {tab === 'contract' && <DModContractNew t={t} lang={lang} d={d} p={p} editMode={editMode} selKey={contractSelKey} setSelKey={setContractSelKey} />}
          {tab === 'boq' && <DModBOQ t={t} lang={lang} d={d} p={p} showToast={showToast} />}
          {tab === 'schedule' && <DModSchedule t={t} lang={lang} d={d} p={p} showToast={showToast} />}
          {tab === 'progress' && <DModProgress t={t} lang={lang} d={d} p={p} />}
          {tab === 'risk' && <DModRisk t={t} lang={lang} d={d} />}
          {tab === 'financial' && <DModFinancialNew t={t} lang={lang} d={d} editMode={editMode} showToast={showToast} />}
          {tab === 'changeorders' && <DModVO t={t} lang={lang} d={d} p={p} showToast={showToast} />}
          {tab === 'model' && <DModModel3D t={t} lang={lang} />}
          {tab === 'meetings' && <DModMeetings t={t} lang={lang} d={d} />}
          {tab === 'documents' && <DModDrawings t={t} lang={lang} d={d} showToast={showToast} />}
          {tab === 'alerts' && <DModAlerts t={t} lang={lang} p={p} showToast={showToast} />}
          {tab === 'reports' && <DModReports t={t} lang={lang} p={p} showToast={showToast} />}
          {tab === 'audit' && <DModAudit t={t} lang={lang} />}
        </div>
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
    schedule: [{ icon: 'priority_high', label: lang === 'ar' ? 'المسار الحرج' : 'Critical path', onClick: () => window.dispatchEvent(new CustomEvent('epm:sched-critical')) }, { icon: 'ios_share', label: lang === 'ar' ? 'تصدير' : 'Export', onClick: () => window.dispatchEvent(new CustomEvent('epm:sched-export')) }, { icon: 'upload_file', label: lang === 'ar' ? 'استيراد P6' : 'Import P6', onClick: () => window.dispatchEvent(new CustomEvent('epm:sched-import')) }],
    changeorders: [{ icon: 'add', label: lang === 'ar' ? 'إنشاء أمر تغييري' : 'Create change order', onClick: () => window.dispatchEvent(new CustomEvent('epm:vo-create')) }],
    documents: [{ icon: 'upload_file', label: t('upload_revision'), onClick: () => showToast('Demo') }],
    financial: [{ icon: 'payments', label: lang === 'ar' ? 'تسجيل دفعة' : 'Record payment', onClick: () => window.dispatchEvent(new CustomEvent('epm:pay-register')) }],
    progress: [{ icon: 'trending_up', label: lang === 'ar' ? 'تحديث نسبة الإنجاز' : 'Update progress', onClick: () => showToast('Demo') }],
    meetings: [{ icon: 'groups', label: lang === 'ar' ? 'محضر اجتماع جديد' : 'New meeting minutes', onClick: () => showToast('Demo') }],
    alerts: [{ icon: 'notifications_active', label: lang === 'ar' ? 'ضبط قواعد التنبيه' : 'Configure alert rules', onClick: () => showToast('Demo') }],
  };
  const EDITABLE = ['information', 'contract', 'financial', 'progress'];
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

  const MOD = window.EPM.PROJECT_MODULES.find(m => m.id === tab);
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
function DWorkspaceOverview({ t, lang, ws, openCmdk, goNav, showToast }) {
  const all = React.useMemo(() => window.EPM.buildProjects(ws.id, ws.projects), [ws.id]);
  const recent = [...all].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6);
  const dueSoon = Math.max(2, Math.round(ws.active * 0.4));
  const B = window.EPM.BRANCHES;
  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[ws[lang], t('ws_overview')]} onSearch={openCmdk}
        actions={<button className="d-btn accent" onClick={() => goNav('projects')}><Icon name="projects" size={18} />{t('view_projects')}</button>} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            <div className="d-page-head"><div><h1>{ws[lang]}</h1><p>{ws.kind[lang]} · {t('ws_scoped_sub')}</p></div></div>
            <div className="d-grid stats" style={{ marginBottom: 16 }}>
              <DStat icon="engineering" val={ws.active} lbl={t('kpi_active')} />
              <DStat icon="folder" val={ws.projects} lbl={lang === 'ar' ? 'إجمالي المشاريع' : 'Total projects'} />
              <DStat icon="schedule" tone="w" val={dueSoon} lbl={t('kpi_due')} />
              <DStat icon="donut_large" tone="g" val={ws.completion} suffix="%" lbl={t('kpi_completion')} />
            </div>
            <div className="d-grid c2">
              <DDistribution all={all} lang={lang} t={t} />
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('top_projects')}</b><button className="d-link" onClick={() => goNav('projects')}>{t('view_all')}<Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={15} /></button></div>
                <div>
                  {recent.map(p => (
                    <button key={p.id} className="d-mini" onClick={() => goNav('projects')}>
                      <span className="d-qrow-rail" style={{ background: window.STATUS_VAR[p.status], width: 3, height: 30, borderRadius: 999 }}></span>
                      <span className="d-mini-main"><b>{p.name[lang]}</b><span>{p.id} · {B[lang][p.branchIdx]}</span></span>
                      <DPill status={p.status} lang={lang} />
                    </button>
                  ))}
                </div>
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
