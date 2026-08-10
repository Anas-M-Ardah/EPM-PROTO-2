/* ============================================================
   EPM Prototype — Master (enterprise) + Workspace dashboards + Projects list
   Sleek/flat. Context-aware: enterprise overview vs scoped workspace.
   ============================================================ */

function PageHead({ kicker, title, sub, children }) {
  return (
    <div className="page-head2">
      <div>
        {kicker && <p className="ph-kicker">{kicker}</p>}
        <h1 className="ph-title">{title}</h1>
        {sub && <p className="ph-sub">{sub}</p>}
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </div>
  );
}

function Donut({ value, size, stroke, color }) {
  const s = size || 60, w = stroke || 7, r = (s - w) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="donut">
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="var(--track, var(--surface-container-high))" strokeWidth={w}/>
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={color || 'var(--azure-600)'} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c*(1-value/100)} transform={`rotate(-90 ${s/2} ${s/2})`}/>
    </svg>
  );
}

function useCountUp(target, dur) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const d = dur || 850; let raf, start;
    const step = (ts) => { if (!start) start = ts; const p = Math.min((ts - start) / d, 1);
      const e = 1 - Math.pow(1 - p, 3); setV(target * e); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(v);
}

function Kpi({ icon, value, suffix, label, accent, delta }) {
  const n = useCountUp(value);
  return (
    <div className={`kpi-card ${accent ? 'accent' : ''}`}>
      <span className="kpi-wm"><Icon name={icon} size={132} /></span>
      <div className="kpi-top">
        <span className="kpi-ico"><Icon name={icon} size={19} /></span>
        {delta && <span className="kpi-delta"><Icon name="trending_up" size={14} />{delta}</span>}
      </div>
      <div className="kpi-val">{n}{suffix}</div>
      <div className="kpi-lbl">{label}</div>
    </div>
  );
}

function StatusBreakdown({ all, lang, detailed }) {
  const keys = ['ongoing','completed','stalled','suspended','withdrawn'];
  const counts = keys.map(k => ({ k, n: all.filter(p => p.status === k).length }));
  const total = all.length || 1;
  const max = Math.max(1, ...counts.map(c => c.n));
  return (
    <div className="sb">
      <div className="sb-bar">
        {counts.map(c => c.n > 0 && (
          <span key={c.k} className={`sb-seg st-${c.k}`} style={{ width: (c.n/total*100)+'%' }} title={window.EPM.STATUS[c.k][lang]}></span>
        ))}
      </div>
      {detailed ? (
        <div className="sb-rows">
          {counts.map(c => (
            <div key={c.k} className="sb-row">
              <i className={`st-${c.k}`}></i>
              <span className="sb-row-lbl">{window.EPM.STATUS[c.k][lang]}</span>
              <div className="sb-row-track"><span className={`st-${c.k}`} style={{ width: (c.n/max*100)+'%' }}></span></div>
              <b className="sb-row-n">{c.n}</b>
              <span className="sb-row-pct">{Math.round(c.n/total*100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="sb-legend">
          {counts.map(c => (
            <span key={c.k} className="sb-li"><i className={`st-${c.k}`}></i>{window.EPM.STATUS[c.k][lang]}<b>{c.n}</b></span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- WORKSPACE BROWSER (searchable / filterable) ---------------- */
function WsCard({ w, t, lang, onClick }) {
  return (
    <button className="ws-card" onClick={onClick}>
      <span className="ws-card-wm" style={{ color: w.color }}>{w.code}</span>
      <div className="ws-card-top">
        <span className="ws-emblem" style={{ background: w.color }}>{w.code}</span>
        <span className="ws-kind">{w.kind[lang]}</span>
      </div>
      <h3>{w[lang]}</h3>
      <div className="ws-stats">
        <span><b>{w.active}</b> {t('ws_active_short')}</span>
        <span className="dotsep">·</span>
        <span><b>{w.projects}</b> {t('projects_count')}</span>
      </div>
      <div className="ws-prog"><div className="bar"><span style={{ width: w.completion + '%' }}></span></div><span className="num">{w.completion}%</span></div>
      <span className="ws-enter">{t('enter_ws')} <Icon name={lang === 'ar' ? 'arrow_back' : 'arrow_forward'} size={15} /></span>
    </button>
  );
}

function WsRow({ w, t, lang, onClick }) {
  return (
    <button className="ws-row" onClick={onClick}>
      <span className="ws-emblem sm" style={{ background: w.color }}>{w.code}</span>
      <div className="ws-row-main">
        <b>{w[lang]}</b>
        <span className="ws-row-kind">{w.kind[lang]}</span>
      </div>
      <div className="ws-row-stats">
        <span><b>{w.active}</b> {t('ws_active_short')}</span>
        <span className="dotsep">·</span>
        <span><b>{w.projects}</b> {t('projects_count')}</span>
      </div>
      <div className="ws-row-prog"><div className="bar"><span style={{ width: w.completion + '%' }}></span></div><span className="num">{w.completion}%</span></div>
      <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={20} style={{ color: 'var(--on-surface-variant)' }} />
    </button>
  );
}

function WorkspaceBrowser({ t, lang, WS, openWorkspace }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('active');
  const [view, setView] = useState(() => localStorage.getItem('epm_ws_view') || 'grid');
  const setViewP = (v) => { setView(v); localStorage.setItem('epm_ws_view', v); };

  // distinct workspace kinds (with counts) for filter chips
  const kinds = [];
  WS.forEach(w => { if (!kinds.some(k => k.en === w.kind.en)) kinds.push(w.kind); });
  const kindCount = (kEn) => WS.filter(w => w.kind.en === kEn).length;

  const qn = q.trim().toLowerCase();
  let rows = WS.filter(w => kind === 'all' || w.kind.en === kind);
  if (qn) rows = rows.filter(w =>
    w.ar.toLowerCase().includes(qn) || w.en.toLowerCase().includes(qn) || w.code.toLowerCase().includes(qn));
  rows = [...rows].sort((a, b) =>
    sort === 'name' ? a[lang].localeCompare(b[lang], lang === 'ar' ? 'ar' : 'en') :
    sort === 'comp' ? b.completion - a.completion :
    b.active - a.active);

  const reset = () => { setQ(''); setKind('all'); };

  return (
    <div className="ws-browser">
      <div className="sec-row">
        <span className="sec-label">{t('your_workspaces')}
          <span className="ws-count">{rows.length} {t('ws_of')} {WS.length}</span>
        </span>
        <div className="view-toggle" role="tablist">
          <button className={`vt-btn ${view === 'grid' ? 'on' : ''}`} onClick={() => setViewP('grid')} title={t('ws_view_grid')} aria-label={t('ws_view_grid')}><Icon name="grid_view" size={17} /></button>
          <button className={`vt-btn ${view === 'list' ? 'on' : ''}`} onClick={() => setViewP('list')} title={t('ws_view_list')} aria-label={t('ws_view_list')}><Icon name="view_list" size={17} /></button>
        </div>
      </div>

      <div className="wsb-toolbar">
        <div className="ws-search wsb-search">
          <Icon name="search" size={18} style={{ color: 'var(--on-surface-variant)' }} />
          <input placeholder={t('ws_search_ph')} value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="wsb-clear" onClick={() => setQ('')} title={t('ws_clear')} aria-label={t('ws_clear')}><Icon name="close" size={15} /></button>}
        </div>
        <label className="wsb-sort">
          <Icon name="sort" size={17} style={{ color: 'var(--on-surface-variant)' }} />
          <select className="select" value={sort} onChange={e => setSort(e.target.value)} aria-label={t('ws_sort_label')}>
            <option value="active">{t('ws_sort_active')}</option>
            <option value="comp">{t('ws_sort_comp')}</option>
            <option value="name">{t('ws_sort_name')}</option>
          </select>
        </label>
      </div>

      <div className="filter-chips wsb-chips">
        <button className={`chip ${kind === 'all' ? 'is-active' : ''}`} onClick={() => setKind('all')}>
          {t('ws_all_kinds')}<span className="chip-count">{WS.length}</span>
        </button>
        {kinds.map(k => (
          <button key={k.en} className={`chip ${kind === k.en ? 'is-active' : ''}`} onClick={() => setKind(k.en)}>
            {k[lang]}<span className="chip-count">{kindCount(k.en)}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty wsb-empty">
          <Icon name="search_off" size={32} style={{ color: 'var(--on-surface-variant)' }} />
          <span>{t('ws_no_results')}</span>
          <button className="btn btn-text btn-sm" onClick={reset}>{t('ws_clear')}</button>
        </div>
      ) : view === 'grid' ? (
        <div className="ws-cards">
          {rows.map(w => <WsCard key={w.id} w={w} t={t} lang={lang} onClick={() => openWorkspace(w)} />)}
        </div>
      ) : (
        <div className="ws-list">
          {rows.map(w => <WsRow key={w.id} w={w} t={t} lang={lang} onClick={() => openWorkspace(w)} />)}
        </div>
      )}
    </div>
  );
}

/* ---------------- MASTER (enterprise) ---------------- */
function MasterDashboard({ t, lang, user, openWorkspace }) {
  const WS = window.EPM.WORKSPACES;
  const totals = WS.reduce((a, w) => ({ active: a.active + w.active, proj: a.proj + w.projects }), { active: 0, proj: 0 });
  const avg = Math.round(WS.reduce((a, w) => a + w.completion, 0) / WS.length);
  const ACT = window.EPM.ACTIVITY;
  const portfolio = WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects));
  return (
    <div className="screen">
      <PageHead title={t('nav_home')} sub={t('master_sub')} />

      <div className="kpi-row">
        <Kpi icon="engineering" value={totals.active} label={t('kpi_active')} accent delta="+4" />
        <Kpi icon="apartment" value={WS.length} label={t('kpi_workspaces')} />
        <Kpi icon="folder" value={totals.proj} label={lang === 'ar' ? 'إجمالي المشاريع' : 'Total projects'} />
        <Kpi icon="donut_large" value={avg} suffix="%" label={t('kpi_completion')} />
      </div>

      <WorkspaceBrowser t={t} lang={lang} WS={WS} openWorkspace={openWorkspace} />

      <div className="dash-secondary">
        <div className="panel-card">
          <div className="side-card-h"><Icon name="insights" size={18} />{t('status_breakdown')}</div>
          <StatusBreakdown all={portfolio} lang={lang} detailed />
        </div>
        <div className="panel-card">
          <div className="side-card-h"><Icon name="bolt" size={18} /> {t('recent')}</div>
          <div className="activity">
            {ACT.map((a, i) => (
              <div key={i} className="act-row">
                <Avatar size={30} style={{ fontSize: 12 }}>{a.who[lang][0]}</Avatar>
                <div className="act-txt">
                  <span><b>{a.who[lang]}</b> {a.act[lang]} <a className="mono">{a.tgt}</a></span>
                  <span className="act-time">{a.t[lang]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- WORKSPACE (scoped overview) ---------------- */
function WorkspaceDashboard({ t, lang, workspace, goNav }) {
  const all = window.EPM.buildProjects(workspace.id, workspace.projects);
  const recent = [...all].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);
  const B = window.EPM.BRANCHES;
  const dueSoon = Math.max(2, Math.round(workspace.active * 0.4));
  return (
    <div className="screen">
      <div className="ctx-banner">
        <span className="ctx-emblem" style={{ background: workspace.color }}>{workspace.code}</span>
        <div className="ctx-banner-txt"><b>{workspace[lang]}</b><span>{workspace.kind[lang]} · {t('ws_scoped_sub')}</span></div>
      </div>
      <PageHead title={t('ws_overview')}>
        <button className="btn btn-outlined btn-sm" onClick={() => goNav('projects')}><Icon name="grid_view" size={17} />{t('view_projects')}</button>
        <button className="btn btn-accent btn-sm"><Icon name="add" size={17} />{t('new_project')}</button>
      </PageHead>

      <div className="kpi-row">
        <Kpi icon="engineering" value={workspace.active} label={t('kpi_active')} accent />
        <Kpi icon="folder" value={workspace.projects} label={lang === 'ar' ? 'إجمالي المشاريع' : 'Total projects'} />
        <Kpi icon="schedule" value={dueSoon} label={t('kpi_due')} />
        <Kpi icon="donut_large" value={workspace.completion} suffix="%" label={t('kpi_completion')} />
      </div>

      <div className="dash-grid">
        <div>
          <div className="panel-card" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="side-card-h"><Icon name="insights" size={18} />{t('status_breakdown')}</div>
            <StatusBreakdown all={all} lang={lang} />
          </div>
          <div className="panel-card">
            <div className="card-row-h"><div className="side-card-h"><Icon name="engineering" size={18} />{t('top_projects')}</div>
              <button className="btn btn-text btn-sm" onClick={() => goNav('projects')}>{t('view_all')} <Icon name={lang==='ar'?'arrow_back':'arrow_forward'} size={15} /></button></div>
            <div className="mini-proj">
              {recent.map(p => (
                <button key={p.id} className="mini-proj-row" onClick={() => goNav('projects')}>
                  <span className="mp-rail" data-st={p.status}></span>
                  <div className="mp-main"><b>{p.name[lang]}</b><span className="mono">{p.id} · {B[lang][p.branchIdx]}</span></div>
                  <div className="mp-prog"><div className="bar"><span style={{ width: p.tech + '%' }}></span></div><span className="num">{p.tech}%</span></div>
                  <Pill status={p.status} lang={lang} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="dash-side">
          <div className="panel-card">
            <div className="side-card-h"><Icon name="bolt" size={18} /> {t('recent')}</div>
            <div className="activity">
              {window.EPM.ACTIVITY.map((a, i) => (
                <div key={i} className="act-row">
                  <Avatar size={30} style={{ fontSize: 12 }}>{a.who[lang][0]}</Avatar>
                  <div className="act-txt">
                    <span><b>{a.who[lang]}</b> {a.act[lang]} <a className="mono">{a.tgt}</a></span>
                    <span className="act-time">{a.t[lang]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- PROJECTS LIST ---------------- */
function Workspace({ t, lang, workspace }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const B = window.EPM.BRANCHES, E = window.EPM.EXECUTORS;
  const all = window.EPM.buildProjects(workspace.id, workspace.projects);
  const filters = ['all', 'ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  let rows = all.filter(p => filter === 'all' || p.status === filter);
  if (q) rows = rows.filter(p => p.name[lang].includes(q) || p.id.includes(q));
  const counts = {}; filters.forEach(f => counts[f] = f === 'all' ? all.length : all.filter(p => p.status === f).length);

  return (
    <div className="screen">
      <div className="ws-breadcrumb">
        <span className="ws-dot" style={{ background: workspace.color }}></span>
        <span>{workspace[lang]}</span>
        <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={16} style={{ color: 'var(--on-surface-variant)' }} />
        <span className="bc-cur">{t('ws_projects')}</span>
      </div>
      <PageHead title={t('ws_projects')} sub={`${all.length} ${t('projects_count')} · ${t('select_project')}`}>
        <button className="btn btn-outlined btn-sm"><Icon name="ios_share" size={18} />{t('export')}</button>
        <button className="btn btn-accent btn-sm"><Icon name="add" size={18} />{t('new_project')}</button>
      </PageHead>

      <div className="ws-toolbar">
        <div className="filter-chips">
          {filters.map(f => (
            <button key={f} className={`chip ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}
              <span className="chip-count">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="ws-search">
          <Icon name="search" size={18} style={{ color: 'var(--on-surface-variant)' }} />
          <input placeholder={lang === 'ar' ? 'بحث…' : 'Search…'} value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="proj-list">
        {rows.map(p => (
          <div key={p.id} className="proj-row">
            <span className="proj-rail" data-st={p.status}></span>
            <div className="proj-main">
              <div className="proj-id mono">{p.id}</div>
              <div className="proj-name">{p.name[lang]}</div>
              <div className="proj-meta">
                <span><Icon name="account_tree" size={13} />{B[lang][p.branchIdx]}</span>
                <span><Icon name="engineering" size={13} />{E[lang][p.executorIdx]}</span>
              </div>
            </div>
            <div className="proj-prog">
              <div className="ppb"><span className="ppb-l">{t('pd_tech')}</span><div className="bar"><span style={{ width: p.tech + '%' }}></span></div><span className="num">{p.tech}%</span></div>
            </div>
            <div className="proj-cost mono">{p.cost.toLocaleString('en-US')} <span>IQD</span></div>
            <Pill status={p.status} lang={lang} />
          </div>
        ))}
        {rows.length === 0 && <div className="empty"><Icon name="search_off" size={32} style={{ color: 'var(--on-surface-variant)' }} /><span>{lang === 'ar' ? 'لا توجد نتائج' : 'No results'}</span></div>}
      </div>
    </div>
  );
}

Object.assign(window, { MasterDashboard, WorkspaceDashboard, Workspace, PageHead, Kpi, Donut });
