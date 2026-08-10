/* ============================================================
   EPM Prototype — MOBILE NATIVE · Workspace detail + Project sheet
   ============================================================ */

/* ============================================================
   WORKSPACE DETAIL (pushed) — Overview / Projects
   ============================================================ */
function MWorkspace({ t, lang, ws, openProject, setSheet, showToast, refreshKey }) {
  const [sub, setSub] = useState('overview');
  const all = window.EPM.buildProjects(ws.id, ws.projects);
  const dueSoon = Math.max(2, Math.round(ws.active * 0.4));

  return (
    <React.Fragment>
      <div style={{ padding: '4px 16px 12px', display: 'flex', justifyContent: 'center' }}>
        <div className="m-seg" style={{ width: '100%', maxWidth: 320 }}>
          <button className={`m-seg-btn ${sub === 'overview' ? 'on' : ''}`} onClick={() => setSub('overview')}><Icon name="dashboard" size={16} />{t('ws_overview')}</button>
          <button className={`m-seg-btn ${sub === 'projects' ? 'on' : ''}`} onClick={() => setSub('projects')}><Icon name="projects" size={16} />{t('nav_projects')}</button>
        </div>
      </div>

      {sub === 'overview'
        ? <MWsOverview t={t} lang={lang} ws={ws} all={all} dueSoon={dueSoon} openProject={openProject} setSub={setSub} />
        : <MWsProjects t={t} lang={lang} ws={ws} all={all} openProject={openProject} setSheet={setSheet} showToast={showToast} />}
    </React.Fragment>
  );
}

function MWsOverview({ t, lang, ws, all, dueSoon, openProject, setSub }) {
  const recent = [...all].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);
  const B = window.EPM.BRANCHES;
  return (
    <MScroll onRefresh={() => {}}>
      <div className="m-pad" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="m-kpis">
          <MKpi icon="engineering" tone="" value={ws.active} label={t('kpi_active')} />
          <MKpi icon="folder" tone="b" value={ws.projects} label={lang === 'ar' ? 'إجمالي المشاريع' : 'Total projects'} />
          <MKpi icon="schedule" tone="w" value={dueSoon} label={t('kpi_due')} />
          <MKpi icon="donut_large" tone="g" value={ws.completion} suffix="%" label={t('kpi_completion')} />
        </div>
        <MDistribution all={all} lang={lang} />
      </div>

      <div className="m-sec">
        <div className="m-sec-row">
          <span className="m-sec-title">{t('top_projects')}</span>
          <button className="m-sec-more" onClick={() => setSub('projects')}>{t('view_all')} <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={15} /></button>
        </div>
      </div>
      <div className="m-pad" style={{ paddingTop: 0 }}>
        <div className="m-card">
          <div className="m-list">
            {recent.map(p => (
              <button key={p.id} className="m-row" onClick={() => openProject(p)}>
                <span className="m-row-rail" data-st={p.status}></span>
                <div className="m-row-main">
                  <b>{p.name[lang]}</b>
                  <div className="m-row-sub"><span className="mono">{p.id}</span><span className="dot"></span>{B[lang][p.branchIdx]}</div>
                </div>
                <div className="m-row-end"><span className={`m-pill ${p.status}`}>{window.EPM.STATUS[p.status][lang]}</span><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', fontVariantNumeric: 'tabular-nums' }}>{p.tech}%</span></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </MScroll>
  );
}

function MWsProjects({ t, lang, ws, all, openProject, setSheet, showToast }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const B = window.EPM.BRANCHES, E = window.EPM.EXECUTORS;
  const filters = ['all', 'ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  const counts = {}; filters.forEach(f => counts[f] = f === 'all' ? all.length : all.filter(p => p.status === f).length);
  let rows = all.filter(p => filter === 'all' || p.status === filter);
  const qn = q.trim().toLowerCase();
  if (qn) rows = rows.filter(p => p.name[lang].toLowerCase().includes(qn) || p.id.toLowerCase().includes(qn));

  return (
    <React.Fragment>
      <div style={{ paddingTop: 2 }}>
        <div className="m-search">
          <Icon name="search" size={18} style={{ color: 'var(--on-surface-variant)' }} />
          <input placeholder={lang === 'ar' ? 'ابحث في المشاريع…' : 'Search projects…'} value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="m-clear" onClick={() => setQ('')}><Icon name="close" size={13} /></button>}
        </div>
        <div className="m-chips" style={{ marginTop: 12 }}>
          {filters.map(f => (
            <button key={f} className={`m-chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}<span className="m-chip-n">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <MScroll onRefresh={() => {}}>
        <div className="m-pad">
          {rows.length === 0 ? (
            <div className="m-empty"><span className="m-empty-ico"><Icon name="search_off" size={30} /></span><b>{lang === 'ar' ? 'لا توجد نتائج' : 'No results'}</b><span>{lang === 'ar' ? 'عدّل التصفية أو البحث' : 'Adjust filter or search'}</span></div>
          ) : (
            <div className="m-card">
              <div className="m-list">
                {rows.map(p => (
                  <MSwipe key={p.id} actions={
                    <React.Fragment>
                      <button className="m-swipe-act open" onClick={() => openProject(p)}><Icon name="login" size={18} />{t('open')}</button>
                      <button className="m-swipe-act flag" onClick={() => showToast(lang === 'ar' ? 'تم التعليم للمتابعة' : 'Flagged for follow-up')}><Icon name="bolt" size={18} />{lang === 'ar' ? 'تعليم' : 'Flag'}</button>
                    </React.Fragment>
                  }>
                    <button className="m-row" style={{ width: '100%' }} onClick={() => openProject(p)}>
                      <span className="m-row-rail" data-st={p.status}></span>
                      <div className="m-row-main">
                        <b>{p.name[lang]}</b>
                        <div className="m-row-sub"><span className="mono">{p.id}</span><span className="dot"></span>{B[lang][p.branchIdx]}</div>
                        <div className="m-mini-prog"><div className="m-track"><span style={{ width: p.tech + '%' }}></span></div><span className="m-pct">{p.tech}%</span></div>
                      </div>
                      <div className="m-row-end"><span className={`m-pill ${p.status}`}>{window.EPM.STATUS[p.status][lang]}</span></div>
                    </button>
                  </MSwipe>
                ))}
              </div>
            </div>
          )}
        </div>
      </MScroll>

      <button className="m-fab" onClick={() => showToast(lang === 'ar' ? 'مشروع جديد — تجريبي' : 'New project — demo')}>
        <Icon name="add" size={20} />{t('new_project')}
      </button>
    </React.Fragment>
  );
}

/* ============================================================
   PROJECT SHEET — progressive detail
   ============================================================ */
function MProjectSheet({ t, lang, p, showToast, onClose }) {
  const d = window.EPM.buildProjectDetail(p, lang);
  const fin = d.financial.raw;
  const disbPct = Math.round(fin.disbursed / fin.cost * 100);
  const fmt = n => n.toLocaleString('en-US');
  return (
    <div style={{ paddingBottom: 8 }}>
      {/* hero */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '4px 4px 14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className={`m-pill ${p.status}`}>{window.EPM.STATUS[p.status][lang]}</span>
          <h2 style={{ margin: '10px 0 4px', fontSize: 18, fontWeight: 800, letterSpacing: '-.3px', lineHeight: 1.2 }}>{p.name[lang]}</h2>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>{p.id} · {d.contract.code}</div>
        </div>
        <MDonut value={p.tech} size={62} stroke={7} />
      </div>

      {/* figures */}
      <div className="m-kpis" style={{ marginBottom: 14 }}>
        <div className="m-kpi"><span className="m-kpi-ico b"><Icon name="payments" size={18} /></span><div className="m-kpi-val" style={{ fontSize: 18 }}>{fmt(fin.cost)}</div><div className="m-kpi-lbl">{t('pd_cost')} · IQD</div></div>
        <div className="m-kpi"><span className="m-kpi-ico g"><Icon name="account_balance" size={18} /></span><div className="m-kpi-val" style={{ fontSize: 18 }}>{disbPct}<i>%</i></div><div className="m-kpi-lbl">{t('pd_disbursed')}</div></div>
      </div>

      {/* financial bar */}
      <div className="m-card pad" style={{ marginBottom: 14 }}>
        <div className="m-field" style={{ paddingInline: 0, paddingTop: 0 }}><div className="m-field-k">{t('pd_disbursed')}</div><div className="m-field-v mono" style={{ fontFamily: 'var(--font-mono)' }}>{fmt(fin.disbursed)}</div></div>
        <div className="m-track" style={{ height: 10, borderRadius: 999, background: 'var(--surface-container-high)', overflow: 'hidden', margin: '4px 0 6px' }}><span style={{ display: 'block', height: '100%', width: disbPct + '%', background: 'var(--azure-500)', borderRadius: 999 }}></span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--on-surface-variant)' }}><span>{t('pd_remaining')}: {fmt(fin.remaining)}</span><span>{t('pd_due')}: {fmt(fin.due)}</span></div>
      </div>

      {/* parties */}
      <div className="m-card" style={{ marginBottom: 14 }}>
        <MField k={t('pd_beneficiary')} v={d.parties.beneficiary[lang]} />
        <MField k={t('mod_contractor')} v={d.parties.contractor[lang]} />
        <MField k={t('mod_consultant')} v={d.parties.consultant[lang]} />
      </div>

      {/* meetings preview */}
      <div className="m-sec-title" style={{ margin: '0 4px 8px' }}>{t('mod_meetings')}</div>
      <div className="m-card" style={{ marginBottom: 16 }}>
        <div className="m-list">
          {d.meetings.slice(0, 3).map((m, i) => (
            <div key={i} className="m-row" style={{ cursor: 'default' }}>
              <span className="m-srow-ico" style={{ background: 'color-mix(in srgb,var(--azure-500) 14%,transparent)', color: 'var(--azure-600)' }}><Icon name="groups" size={17} /></span>
              <div className="m-row-main"><b>{m.subject}</b><div className="m-row-sub"><span className="mono">{m.date}</span></div></div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-accent" style={{ width: '100%', height: 50, borderRadius: 16 }} onClick={() => { onClose(); showToast(lang === 'ar' ? 'فتح المشروع — تجريبي' : 'Open project — demo'); }}>
        <Icon name="login" size={19} />{t('open_project')}
      </button>
    </div>
  );
}

Object.assign(window, { MWorkspace, MProjectSheet });
