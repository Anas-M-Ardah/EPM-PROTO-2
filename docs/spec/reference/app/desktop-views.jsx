/* ============================================================
   EPM — DESKTOP views: Dashboard (enterprise), Spaces browser
   (dense sortable/selectable table + bulk actions), Activity.
   ============================================================ */

/* small helper: distribution panel (desktop) */
function DDistribution({ all, lang, t }) {
  const keys = ['ongoing','completed','stalled','suspended','withdrawn'];
  const counts = keys.map(k => ({ k, n: all.filter(p => p.status === k).length }));
  const total = all.length || 1;
  return (
    <div className="d-panel">
      <div className="d-panel-head"><b>{t('status_breakdown')}</b><span className="d-cell-sub">{total} {lang === 'ar' ? 'مشروع' : 'projects'}</span></div>
      <div className="d-panel-body">
        <div className="d-dist">
          {counts.map(c => c.n > 0 && <span key={c.k} style={{ width: (c.n/total*100)+'%', background: window.STATUS_VAR[c.k] }}></span>)}
        </div>
        <div className="d-legend">
          {counts.map(c => (
            <span key={c.k} className="d-legend-i"><i style={{ background: window.STATUS_VAR[c.k] }}></i>{window.EPM.STATUS[c.k][lang]}<b>{c.n}</b></span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DActRows({ list, lang }) {
  return (
    <div className="d-feed">
      {list.map((a, i) => (
        <div key={i} className="d-feed-i">
          <span className="d-feed-av">{a.who[lang][0]}</span>
          <div className="d-feed-tx"><b>{a.who[lang]}</b> {a.act[lang]} <span className="mono">{a.tgt}</span></div>
          <span className="d-feed-time">{a.t[lang]}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   ENTERPRISE DASHBOARD — operational workspace
   ============================================================ */
function DDashboard({ t, lang, user, openWorkspace, goNav, openCmdk, showToast, setPop, onAdmin }) {
  const WS = window.EPM.WORKSPACES;
  const AR = lang === 'ar';
  const allPortfolio = WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects).map(p => ({ ...p, ws: w })));
  const [stFilter, setStFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const wsTypes = Array.from(new Set(WS.map(w => w.kind[lang])));
  const portfolio = allPortfolio.filter(p => (stFilter === 'all' || p.status === stFilter) && (typeFilter === 'all' || p.ws.kind[lang] === typeFilter));
  const plannedTotal = portfolio.reduce((a, p) => a + p.plannedCost, 0);
  const revisedTotal = portfolio.reduce((a, p) => a + p.cost, 0) || 1;
  const cumulativeTotal = portfolio.reduce((a, p) => a + Math.round(p.cost * (p.financialPct / 100)), 0);
  const annualAllocTotal = portfolio.reduce((a, p) => a + Math.round(p.cost * 0.22), 0);
  const physicalPct = Math.round(portfolio.reduce((a, p) => a + p.tech * p.cost, 0) / revisedTotal);
  const financialPct = Math.round(cumulativeTotal / revisedTotal * 100);
  const delayedCount = portfolio.filter(p => p.status === 'stalled').length;
  const highSevCount = portfolio.filter(p => p.status === 'stalled' || p.status === 'suspended').length;
  const statusKeys = ['ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  const statusColors = { ongoing: 'var(--status-ongoing)', completed: 'var(--status-completed)', stalled: 'var(--status-delayed)', suspended: 'var(--status-suspended)', withdrawn: 'var(--status-cancelled)' };
  const statusCounts = statusKeys.map(k => ({ key: k, value: portfolio.filter(p => p.status === k).length, color: statusColors[k], label: window.EPM.STATUS[k][lang] }));
  const spendWeights = [0.14, 0.17, 0.20, 0.23, 0.26];
  const spendSeries = spendWeights.map((w, i) => ({ year: 2022 + i, value: Math.round(cumulativeTotal * w) }));
  const tlProjects = [...portfolio].sort((a, b) => b.cost - a.cost).slice(0, 5).map(p => ({ ...p, ...window.EPM.buildSchedule(p) }));
  const milestones = [...portfolio].filter(p => p.status === 'ongoing').sort((a, b) => b.tech - a.tech).slice(0, 4).map(p => ({ p, s: window.EPM.buildSchedule(p) }));
  const greet = lang === 'ar' ? `أهلاً، ${user.name[lang].split(' ')[0]}` : `Welcome, ${user.name[lang].split(' ')[0]}`;
  const musd = v => Math.round(v / 1000000).toLocaleString('en-US') + (lang === 'ar' ? ' م.د.ع' : ' M IQD');

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[t('enterprise_ctx'), t('dash_portfolio_title')]} onSearch={openCmdk}
        actions={<button className="d-icon-btn" onClick={(e) => setPop({ type: 'notif', anchor: e.currentTarget })}><Icon name="notifications" size={19} /><span className="d-dot"></span></button>} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            <div className="d-page-head"><div><h1>{greet}</h1><p>{t('dash_portfolio_title')} — {t('master_sub')}</p></div></div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['all', ...statusKeys].map(f => <button key={f} className={`d-fchip ${stFilter === f ? 'on' : ''}`} onClick={() => setStFilter(f)}>{f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}</button>)}
              </div>
              <div style={{ flex: 1 }}></div>
              <select className="d-form-input" style={{ width: 'auto', height: 34 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">{AR ? 'كل الجهات' : 'All entity types'}</option>
                {wsTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
              <button className="d-btn sm" onClick={() => showToast(AR ? 'مرشحات إضافية (السنة، التمويل، المرحلة) — تجريبي' : 'More filters (year, funding, stage) — demo')}><Icon name="filter_list" size={15} />{AR ? 'مرشحات' : 'Filters'}</button>
            </div>

            <div className="d-grid stats5" style={{ marginBottom: 16 }}>
              <DStat idx={0} icon="account_balance" tone="a" val={Math.round(plannedTotal / 1000000)} suffix={lang === 'ar' ? ' مليون د.ع' : ' M IQD'} lbl={t('kpi_planned_cost')} />
              <DStat idx={1} icon="payments" tone="b" val={Math.round(revisedTotal / 1000000)} suffix={lang === 'ar' ? ' مليون د.ع' : ' M IQD'} lbl={t('kpi_revised_cost')} />
              <DStat idx={2} icon="trending_up" tone="r" val={Math.round(cumulativeTotal / 1000000)} suffix={lang === 'ar' ? ' مليون د.ع' : ' M IQD'} lbl={t('kpi_cumulative_spend')} />
              <DStat idx={3} icon="engineering" tone="g" val={physicalPct} suffix="%" lbl={t('kpi_physical_pct')} />
              <DStat idx={4} icon="donut_large" tone="a" val={financialPct} suffix="%" lbl={t('kpi_financial_pct')} />
            </div>

            <div className="d-grid stats5" style={{ marginBottom: 16 }}>
              <DStat idx={0} icon="projects" tone="a" val={portfolio.length} lbl={AR ? 'إجمالي المشاريع' : 'Total projects'} />
              <DStat idx={1} icon="account_balance" tone="b" val={Math.round(annualAllocTotal / 1000000)} suffix={AR ? ' مليون د.ع' : ' M IQD'} lbl={t('kpi_planned_cost') && (AR ? 'التخصيص السنوي' : 'Annual allocation')} />
              <DStat idx={2} icon="warning" tone="r" val={delayedCount} lbl={AR ? 'مشاريع متأخرة' : 'Delayed projects'} />
              <DStat idx={3} icon="error" tone="r" val={highSevCount} lbl={AR ? 'تنبيهات عالية' : 'High-severity alerts'} />
              <DStat idx={4} icon="schedule" tone="w" val={milestones.length} lbl={AR ? 'معالم قادمة' : 'Upcoming milestones'} />
            </div>

            <div className="d-grid c2 eqrows">
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('chart_contract_status')}</b><span className="d-cell-sub">{portfolio.length} {lang === 'ar' ? 'عقداً' : 'contracts'}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 20px' }}>
                  <DDonutMulti segments={statusCounts} size={140} stroke={22} />
                  <div style={{ flex: 1 }}>
                    {statusCounts.map(c => (
                      <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
                        <i style={{ width: 9, height: 9, borderRadius: 3, background: c.color, display: 'inline-block' }}></i>
                        <span style={{ flex: 1, color: 'var(--on-surface-variant)' }}>{c.label}</span>
                        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{c.value}</b>
                        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', minWidth: 34, textAlign: 'end' }}>{portfolio.length ? Math.round(c.value / portfolio.length * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('chart_cost_compare')}</b></div>
                <DBarCompare items={[
                  { label: t('kpi_planned_cost'), value: plannedTotal, display: musd(plannedTotal), color: 'var(--viz-1)' },
                  { label: t('kpi_revised_cost'), value: revisedTotal, display: musd(revisedTotal), color: 'var(--viz-2)' },
                  { label: t('kpi_cumulative_spend'), value: cumulativeTotal, display: musd(cumulativeTotal), color: 'var(--viz-3)' },
                ]} />
              </div>
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('chart_annual_spend')}</b></div>
                <DLineTrend points={spendSeries} color="var(--viz-1)" />
              </div>
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('chart_timeline')}</b><span className="d-cell-sub">{lang === 'ar' ? 'أعلى 5 مشاريع كلفةً' : 'Top 5 by cost'}</span></div>
                <DTlMini items={tlProjects.map(p => ({ name: p.name[lang], start: p.start, plannedFinish: p.plannedFinish, expectedFinish: p.expectedFinish, pct: p.tech, color: statusColors[p.status], ws: p.ws }))} onRowClick={it => openWorkspace(it.ws)} />
              </div>
            </div>

            <div className="d-panel" style={{ marginTop: 16 }}>
              <div className="d-panel-head"><b>{AR ? 'معالم قادمة' : 'Upcoming milestones'}</b><span className="d-cell-sub">{AR ? 'أقرب الإنجازات المخططة' : 'Nearest planned finishes'}</span></div>
              <div>
                {milestones.map(({ p, s }) => (
                  <button key={p.ws.id + p.id} className="d-mini" onClick={() => openWorkspace(p.ws)}>
                    <span className="d-mini-emblem" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}><Icon name="flag" size={16} /></span>
                    <span className="d-mini-main"><b>{p.name[lang]}</b><span>{p.ws[lang]} · {p.tech}%</span></span>
                    <span className="mono d-cell-sub">{s.plannedFinish}</span>
                    <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={16} style={{ color: 'var(--on-surface-variant)' }} />
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

function DStat({ icon, tone, val, suffix, lbl, idx }) {
  const root = React.useRef(null);
  React.useEffect(() => {
    const el = root.current; if (!el) return;
    const numEl = el.querySelector('.d-stat-num');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = 120 + (idx || 0) * 100;
    const t1 = setTimeout(() => { el.classList.add('in'); }, reduce ? 0 : delay);
    // the settled value is the default state, not the animation's endpoint —
    // rAF is throttled to zero ticks while the document is hidden (background
    // tab, unfocused preview, every screenshot/PDF/PPTX export path)
    const settle = () => { if (numEl) numEl.textContent = window.fmtNum(val); };
    if (reduce || document.hidden) {
      settle();
      const onVis = () => { if (!document.hidden) settle(); };
      document.addEventListener('visibilitychange', onVis);
      return () => { clearTimeout(t1); document.removeEventListener('visibilitychange', onVis); };
    }
    // animated path only: start at 0 so the settled value is never shown first
    if (numEl) numEl.textContent = '0';
    let raf = 0, start = 0;
    const t2 = setTimeout(() => {
      const tick = (ts) => {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / 1150);
        if (numEl) numEl.textContent = window.fmtNum(Math.round(val * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick); else settle();
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    const onVis = () => { if (document.hidden) { if (raf) cancelAnimationFrame(raf); settle(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearTimeout(t1); clearTimeout(t2); if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis); };
  }, [val, idx]);
  return (
    <div className="d-stat" ref={root}>
      <span className={`d-stat-wm ${tone || ''}`} aria-hidden="true"><Icon name={icon} size={112} /></span>
      <div className="d-stat-top">
        <span className={`d-stat-ico ${tone || ''}`}><Icon name={icon} size={20} /></span>
      </div>
      <div className="d-stat-val"><span className="d-stat-num">{window.fmtNum(val)}</span>{suffix && <i>{suffix}</i>}</div>
      <div className="d-stat-lbl">{lbl}</div>
    </div>
  );
}

function DSpark({ points, tone }) {
  const w = 100, h = 26, max = Math.max(...points), min = Math.min(...points), rng = (max - min) || 1;
  const col = tone === 'g' ? 'var(--success)' : tone === 'w' ? 'var(--warning)' : tone === 'r' ? 'var(--tertiary)' : 'var(--azure-500)';
  const xs = points.map((p, i) => i / (points.length - 1) * w);
  const ys = points.map(p => h - 3 - ((p - min) / rng) * (h - 6));
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = 'sp' + Math.round(points.reduce((a, b) => a + b, 0));
  return (
    <svg className="d-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity="0.22"/><stop offset="1" stopColor={col} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ============================================================
   SPACES — dense table browser (sort, select, bulk, context menu)
   ============================================================ */
function DSpaces({ t, lang, openWorkspace, openCmdk, showToast, setCtxMenu }) {
  const WS = window.EPM.WORKSPACES;
  const loading = useDeskLoad('spaces');
  const [q, setQ] = dS('');
  const [kind, setKind] = dS('all');
  const [sort, setSort] = dS({ k: 'active', dir: 'desc' });
  const [sel, setSel] = dS(() => new Set());

  const kinds = []; WS.forEach(w => { if (!kinds.some(k => k.en === w.kind.en)) kinds.push(w.kind); });
  const qn = q.trim().toLowerCase();
  let rows = WS.filter(w => (kind === 'all' || w.kind.en === kind) && (!qn || w.ar.toLowerCase().includes(qn) || w.en.toLowerCase().includes(qn) || w.code.toLowerCase().includes(qn)));
  rows = [...rows].sort((a, b) => {
    let av, bv;
    if (sort.k === 'name') { av = a[lang]; bv = b[lang]; return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); }
    av = a[sort.k]; bv = b[sort.k];
    return sort.dir === 'asc' ? av - bv : bv - av;
  });
  const toggleSort = (k) => setSort(s => s.k === k ? { k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: k === 'name' ? 'asc' : 'desc' });
  const sortIco = (k) => sort.k === k ? <Icon name={sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward'} size={14} className="s-ico" style={{ opacity: 1 }} /> : <Icon name="unfold_more" size={14} className="s-ico" />;

  const allSel = sel.size > 0 && rows.every(r => sel.has(r.id));
  const someSel = sel.size > 0 && !allSel;
  const toggleAll = () => setSel(allSel ? new Set() : new Set(rows.map(r => r.id)));
  const toggleOne = (id) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const rowMenu = (e, w) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, items: [
    { icon: 'login', label: t('open'), onClick: () => openWorkspace(w) },
    { icon: 'open_in_new', label: lang === 'ar' ? 'فتح في علامة جديدة' : 'Open in new tab', onClick: () => showToast('Demo') },
    { sep: true },
    { icon: 'push_pin', label: lang === 'ar' ? 'تثبيت' : 'Pin to top', onClick: () => showToast('Demo') },
    { icon: 'ios_share', label: t('export'), onClick: () => showToast('Demo') },
  ] }); };

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[t('enterprise_ctx'), t('adm_ws')]} onSearch={openCmdk}
        actions={<button className="d-btn accent" onClick={() => showToast('Demo')}><Icon name="add" size={18} />{lang === 'ar' ? 'مساحة عمل' : 'Workspace'}</button>} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            <div className="d-page-head"><div><h1>{t('adm_ws')}</h1><p>{t('ws_sub')}</p></div></div>

            <div className="d-toolbar">
              <div className="d-field">
                <Icon name="search" size={17} style={{ color: 'var(--on-surface-variant)' }} />
                <input placeholder={t('ws_search_ph')} value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <button className={`d-fchip ${kind === 'all' ? 'on' : ''}`} onClick={() => setKind('all')}>{t('ws_all_kinds')}<span className="n">{WS.length}</span></button>
              {kinds.map(k => <button key={k.en} className={`d-fchip ${kind === k.en ? 'on' : ''}`} onClick={() => setKind(k.en)}>{k[lang]}<span className="n">{WS.filter(w => w.kind.en === k.en).length}</span></button>)}
              <div className="sp" style={{ flex: 1 }}></div>
              <span className="d-cell-sub">{rows.length} {t('ws_showing')}</span>
            </div>

            {loading ? <DTableSkeleton cols={5} /> : rows.length === 0 ? (
              <div className="d-tablewrap"><div className="d-empty"><span className="d-empty-ico"><Icon name="search_off" size={28} /></span><b>{t('ws_no_results')}</b><span>{lang === 'ar' ? 'جرّب اسماً أو رمزاً أو نوعاً آخر' : 'Try another name, code or type'}</span></div></div>
            ) : (
              <div className="d-tablewrap">
                <table className="d-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}><DCheck on={allSel} mixed={someSel} onClick={toggleAll} /></th>
                      <th className="sortable" onClick={() => toggleSort('name')}>{lang === 'ar' ? 'مساحة العمل' : 'Workspace'}{sortIco('name')}</th>
                      <th>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                      <th className="sortable" onClick={() => toggleSort('active')} style={{ width: 130 }}>{t('kpi_active')}{sortIco('active')}</th>
                      <th className="sortable" onClick={() => toggleSort('projects')} style={{ width: 110 }}>{lang === 'ar' ? 'المشاريع' : 'Projects'}{sortIco('projects')}</th>
                      <th className="sortable" onClick={() => toggleSort('completion')} style={{ width: 190 }}>{t('kpi_completion')}{sortIco('completion')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(w => (
                      <tr key={w.id} className={sel.has(w.id) ? 'sel' : ''} onClick={() => openWorkspace(w)} onContextMenu={e => rowMenu(e, w)}>
                        <td onClick={e => { e.stopPropagation(); toggleOne(w.id); }}><DCheck on={sel.has(w.id)} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <span className="d-mini-emblem" style={{ background: w.color, width: 30, height: 30, borderRadius: 8 }}>{w.code}</span>
                            <span className="d-cell-strong">{w[lang]}</span>
                          </div>
                        </td>
                        <td className="d-cell-sub">{w.kind[lang]}</td>
                        <td className="num">{w.active}</td>
                        <td className="num">{w.projects}</td>
                        <td><div className="d-progress"><span className="t"><span style={{ width: w.completion + '%' }}></span></span><span className="pc">{w.completion}%</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {sel.size > 0 && (
        <div className="d-bulkbar">
          <span className="cnt">{sel.size} {lang === 'ar' ? 'محدّد' : 'selected'}</span>
          <span className="vr"></span>
          <button onClick={() => showToast('Demo')}><Icon name="ios_share" size={16} />{t('export')}</button>
          <button onClick={() => showToast('Demo')}><Icon name="archive" size={16} />{lang === 'ar' ? 'أرشفة' : 'Archive'}</button>
          <span className="vr"></span>
          <button onClick={() => setSel(new Set())}><Icon name="close" size={16} />{t('cancel')}</button>
        </div>
      )}
    </div>
  );
}

function DTableSkeleton({ cols = 5, rows = 8 }) {
  return (
    <div className="d-tablewrap">
      <table className="d-table">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td style={{ width: 44 }}><span className="d-skel" style={{ width: 17, height: 17, display: 'block' }}></span></td>
              <td><span className="d-skel" style={{ width: '60%', height: 14, display: 'block' }}></span></td>
              {Array.from({ length: cols - 1 }).map((__, j) => <td key={j}><span className="d-skel" style={{ width: '50%', height: 12, display: 'block' }}></span></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   ACTIVITY (enterprise / scoped)
   ============================================================ */
function DActivity({ t, lang, scoped, ws, openCmdk }) {
  const loading = useDeskLoad('act');
  const ACT = window.EPM.ACTIVITY;
  const feed = [...ACT, ...ACT.map(a => ({ ...a, t: { ar: 'أمس', en: 'Yesterday' } })), ...ACT.map(a => ({ ...a, t: { ar: 'قبل يومين', en: '2 days ago' } }))];
  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={scoped ? [ws[lang], t('recent')] : [t('enterprise_ctx'), t('recent')]} onSearch={openCmdk} actions={null} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap" style={{ maxWidth: 860 }}>
            <div className="d-page-head"><div><h1>{t('recent')}</h1><p>{lang === 'ar' ? 'كل ما يجري عبر مساحات العمل، بترتيب زمني.' : 'Everything happening across your workspaces, chronologically.'}</p></div></div>
            <div className="d-panel">
              {loading ? <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ display: 'flex', gap: 12 }}><span className="d-skel" style={{ width: 32, height: 32, borderRadius: 999 }}></span><span className="d-skel" style={{ flex: 1, height: 14 }}></span></div>)}</div> : <DActRows list={feed} lang={lang} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DDashboard, DSpaces, DActivity, DDistribution, DActRows, DStat, DTableSkeleton });
