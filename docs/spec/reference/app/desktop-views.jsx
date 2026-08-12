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
  const musd = v => Math.round(v / 1000000).toLocaleString('en-US') + (lang === 'ar' ? ' م.د.ع' : ' M IQD');

  // ---- derived answers (a dashboard answers questions; each tile = metric + comparison + threshold) ----
  const NOW_FRAC = 0.66;                                  // point in the programme year
  const smooth = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);
  const plannedToDate = Math.round(smooth(NOW_FRAC) * 100);
  const physVariance = physicalPct - plannedToDate;        // +ahead / −behind, in points
  const spi = plannedToDate ? (physicalPct / plannedToDate) : 0;
  const burnVariance = financialPct - physicalPct;         // spend running ahead of work?
  const earnedValue = revisedTotal * physicalPct / 100;    // EV — value of work actually done
  const cpi = cumulativeTotal ? earnedValue / cumulativeTotal : 0;  // CPI = EV / AC
  const scurve = React.useMemo(() => {
    const rows = [], months = 12;
    for (let i = 1; i <= months; i++) {
      const f = i / months, planCum = Math.round(smooth(f) * 100);
      const actCum = f <= NOW_FRAC + 1e-6 ? Math.round(smooth(f / NOW_FRAC) * physicalPct) : null;
      const prev = rows[rows.length - 1];
      rows.push({ label: (AR ? 'ش' : 'M') + i, planCum, actCum,
        planPeriod: planCum - (prev ? prev.planCum : 0),
        actPeriod: actCum == null ? 0 : actCum - (prev && prev.actCum != null ? prev.actCum : 0) });
    }
    return rows;
  }, [physicalPct, AR]);
  // cost curve — planned disbursement vs actual spend, same shape as the progress curve
  const costCurve = React.useMemo(() => {
    const rows = [], months = 12;
    for (let i = 1; i <= months; i++) {
      const f = i / months, planCum = Math.round(smooth(f) * 100);
      const actCum = f <= NOW_FRAC + 1e-6 ? Math.round(smooth(f / NOW_FRAC) * financialPct) : null;
      const prev = rows[rows.length - 1];
      rows.push({ label: (AR ? 'ش' : 'M') + i, planCum, actCum,
        planPeriod: planCum - (prev ? prev.planCum : 0),
        actPeriod: actCum == null ? 0 : actCum - (prev && prev.actCum != null ? prev.actCum : 0) });
    }
    return rows;
  }, [financialPct, AR]);
  const signalOf = p => window.EPM.execSignal(p);
  const watchlist = portfolio.filter(p => signalOf(p) !== 'green')
    .sort((a, b) => b.cost - a.cost).slice(0, 6)
    .map(p => ({ p, s: window.EPM.buildSchedule(p), sig: signalOf(p) }));

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[t('enterprise_ctx')]} onSearch={openCmdk}
        actions={<button className="d-icon-btn" onClick={(e) => setPop({ type: 'notif', anchor: e.currentTarget })}><Icon name="notifications" size={19} /><span className="d-dot"></span></button>} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            {/* Z2 identity bar — breadcrumb · title · action cluster */}
            <DPageHead lang={lang}
              crumbs={[t('enterprise_ctx'), t('dash_portfolio_title')]}
              title={t('dash_portfolio_title')}
              sub={AR ? `${portfolio.length} مشروعاً ضمن النطاق · بيانات حتى ${new Date().toISOString().slice(0, 10)}` : `${portfolio.length} projects in scope · data as of ${new Date().toISOString().slice(0, 10)}`}
              actions={<React.Fragment>
                <button className="d-btn" onClick={() => showToast(AR ? 'تصدير اللوحة — تجريبي' : 'Export board — demo')}><Icon name="ios_share" size={16} />{t('export')}</button>
                <button className="d-btn primary" onClick={() => goNav && goNav('reports')}><Icon name="analytics" size={16} />{AR ? 'التقارير' : 'Reports'}</button>
              </React.Fragment>} />

            <div className="d-toolbar">
              <div className="grp">
                {['all', ...statusKeys].map(f => <button key={f} className={`d-fchip ${stFilter === f ? 'on' : ''}`} onClick={() => setStFilter(f)}>{f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}</button>)}
              </div>
              <div className="sp"></div>
              <select className="d-form-input" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">{AR ? 'كل الجهات' : 'All entity types'}</option>
                {wsTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
              <button className="d-btn sm ghost" onClick={() => showToast(AR ? 'مرشحات إضافية (السنة، التمويل، المرحلة) — تجريبي' : 'More filters (year, funding, stage) — demo')}><Icon name="filter_list" size={15} />{AR ? 'مرشحات' : 'Filters'}</button>
              {(stFilter !== 'all' || typeFilter !== 'all') && <button className="d-btn sm ghost" onClick={() => { setStFilter('all'); setTypeFilter('all'); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
            </div>

            {/* row 1 — progress curve + the three schedule/cost answer tiles (equal height) */}
            <div className="d-dash">
              <div className="d-dash-main">
                <div className="d-panel">
                  <div className="d-panel-head">
                    <b>{AR ? 'التقدم التراكمي — مخطط مقابل فعلي' : 'Cumulative progress — planned vs actual'}</b>
                    <span className="d-cell-sub">{AR ? `المخطط ${plannedToDate}% · الفعلي ${physicalPct}%` : `Planned ${plannedToDate}% · Actual ${physicalPct}%`}</span>
                    <span className={'d-pill ' + (physVariance < -5 ? 'stalled' : physVariance < 0 ? 'suspended' : 'completed')}>
                      {physVariance < 0 ? (AR ? `متأخر ${Math.abs(physVariance)} نقطة` : `${Math.abs(physVariance)} pts behind`)
                                        : (AR ? `متقدّم ${physVariance} نقطة` : `${physVariance} pts ahead`)}
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

            {/* row 2 — cost curve + the executive signal (equal height) */}
            <div className="d-dash">
              <div className="d-dash-main">
                <div className="d-panel">
                  <div className="d-panel-head">
                    <b>{AR ? 'المنحنى المالي — الصرف المخطط مقابل الفعلي' : 'Cost curve — planned vs actual spend'}</b>
                    <span className="d-cell-sub">{musd(cumulativeTotal)} {AR ? 'من' : 'of'} {musd(revisedTotal)}</span>
                    <span className={'d-pill ' + (burnVariance < -5 ? 'suspended' : burnVariance > 5 ? 'stalled' : 'completed')}>
                      {burnVariance === 0 ? (AR ? 'متوافق مع التنفيذ' : 'in step with progress')
                        : burnVariance > 0 ? (AR ? `الصرف يسبق التنفيذ ${burnVariance} نقطة` : `spend ${burnVariance} pts ahead of work`)
                        : (AR ? `الصرف يتأخر ${Math.abs(burnVariance)} نقطة` : `spend ${Math.abs(burnVariance)} pts behind work`)}
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
                  const sig = portfolio.map(p => window.EPM.execSignal(p));
                  const red = sig.filter(s => s === 'red').length, amber = sig.filter(s => s === 'amber').length, green = sig.filter(s => s === 'green').length;
                  const cells = [
                    { tone: 'over', icon: 'warning', label: AR ? 'متعثّرة / متأخرة' : 'Behind / stalled', value: red },
                    { tone: 'risk', icon: 'error', label: AR ? 'معرّضة للتأخير' : 'At risk', value: amber },
                    { tone: 'ok', icon: 'check_circle', label: AR ? 'ضمن الخطة' : 'On plan', value: green },
                  ];
                  const pct = n => portfolio.length ? Math.round(n / portfolio.length * 100) : 0;
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

            {/* Watchlist — full width; every tile above drills through to these records */}
            <div className="d-tablewrap" style={{ marginBottom: 16 }}>
              <div className="d-toolbar">
                <b style={{ fontSize: 14 }}>{AR ? 'قائمة المتابعة — مشاريع خارج المسار' : 'Watchlist — projects off track'}</b>
                <div className="sp"></div>
                <span className="d-cell-sub">{watchlist.length} {AR ? 'من' : 'of'} {portfolio.length}</span>
                <button className="d-btn sm ghost" onClick={() => goNav && goNav('projects')}>{AR ? 'عرض كل المشاريع' : 'View all projects'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></button>
              </div>
              {watchlist.length ? (
                <table className="d-table">
                  <thead><tr>
                    <th>{AR ? 'المشروع' : 'Project'}</th><th>{AR ? 'الجهة' : 'Entity'}</th><th>{AR ? 'الحالة' : 'Status'}</th>
                    <th>{AR ? 'الإنجاز' : 'Progress'}</th><th className="r">{AR ? 'الانحراف' : 'Variance'}</th>
                    <th className="r">{AR ? 'الكلفة (د.ع)' : 'Cost (IQD)'}</th><th>{AR ? 'الإنجاز المتوقع' : 'Expected finish'}</th>
                  </tr></thead>
                  <tbody>{watchlist.map(({ p, s }) => {
                    const v = p.tech - plannedToDate;
                    return (
                      <tr key={p.ws.id + p.id} onClick={() => openWorkspace(p.ws)} style={{ cursor: 'pointer' }}>
                        <td className="d-cell-strong">{p.name[lang]}<div className="d-cell-sub mono">{p.id}</div></td>
                        <td className="d-cell-sub">{p.ws[lang]}</td>
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
                  <div style={{ marginTop: 3 }}>{AR ? 'كل المشاريع ضمن الخطة المقررة.' : 'Every project is on plan.'}</div>
                </div>
              )}
            </div>

            {/* breakdown — paired */}
            <div className="d-grid c2 eqrows">
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('chart_contract_status')}</b><span className="d-cell-sub">{portfolio.length} {lang === 'ar' ? 'عقداً' : 'contracts'}</span></div>
                <div className="d-donut-row">
                  <DDonutMulti segments={statusCounts} size={140} stroke={16} centerLabel={AR ? 'عقداً' : 'contracts'} />
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
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('chart_annual_spend')}</b><span className="d-cell-sub">{AR ? 'تراكمي' : 'Cumulative'}</span></div>
                <DLineTrend points={spendSeries} color="var(--viz-1)" />
              </div>
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('chart_timeline')}</b><span className="d-cell-sub">{lang === 'ar' ? 'أعلى 5 مشاريع كلفةً' : 'Top 5 by cost'}</span></div>
                <DTlMini items={tlProjects.map(p => ({ name: p.name[lang], start: p.start, plannedFinish: p.plannedFinish, expectedFinish: p.expectedFinish, pct: p.tech, color: statusColors[p.status], ws: p.ws }))} onRowClick={it => openWorkspace(it.ws)} />
              </div>
            </div>{/* /breakdown c2 */}

            <div className="d-panel" style={{ marginTop: 16 }}>
              <div className="d-panel-head"><b>{AR ? 'معالم قادمة' : 'Upcoming milestones'}</b><span className="d-cell-sub">{AR ? 'أقرب الإنجازات المخططة' : 'Nearest planned finishes'}</span></div>
              <div>
                {milestones.map(({ p, s }) => (
                  <button key={p.ws.id + p.id} className="d-mini" onClick={() => openWorkspace(p.ws)}>
                    <span className="d-mini-main"><b>{p.name[lang]}</b><span>{p.ws[lang]} · {p.tech}%</span></span>
                    <span className="num d-cell-sub">{s.plannedFinish}</span>
                    <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={15} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
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

function DStat({ val, suffix, lbl, foot, delta, deltaDir, bar, idx }) {
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
      <span className="d-stat-lbl">{lbl}</span>
      <span className="d-stat-val"><span className="d-stat-num">{window.fmtNum(val)}</span>{suffix && <small>{suffix}</small>}</span>
      {delta && <span className={'d-stat-delta ' + (deltaDir || 'flat')}>{delta}</span>}
      {bar != null && <div className="d-stat-bar"><i style={{ width: Math.max(0, Math.min(100, bar)) + '%' }}></i></div>}
      {foot && <span className="d-stat-foot">{foot}</span>}
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
      <DTopbar t={t} lang={lang} crumbs={[t('enterprise_ctx')]} onSearch={openCmdk} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            <DPageHead lang={lang}
              crumbs={[t('enterprise_ctx'), t('adm_ws')]}
              title={t('adm_ws')}
              sub={t('ws_sub')}
              actions={<React.Fragment>
                <button className="d-btn" onClick={() => showToast('Demo')}><Icon name="ios_share" size={16} />{t('export')}</button>
                <button className="d-btn primary" onClick={() => showToast('Demo')}><Icon name="add" size={16} />{lang === 'ar' ? 'مساحة عمل' : 'Workspace'}</button>
              </React.Fragment>} />

            {loading ? <DTableSkeleton cols={6} /> : (
              <div className="d-tablewrap">
                <div className="d-toolbar">
                  <div className="d-field">
                    <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
                    <input placeholder={t('ws_search_ph')} value={q} onChange={e => setQ(e.target.value)} />
                  </div>
                  <div className="grp">
                    <button className={`d-fchip ${kind === 'all' ? 'on' : ''}`} onClick={() => setKind('all')}>{t('ws_all_kinds')}<span className="n">{WS.length}</span></button>
                    {kinds.map(k => <button key={k.en} className={`d-fchip ${kind === k.en ? 'on' : ''}`} onClick={() => setKind(k.en)}>{k[lang]}<span className="n">{WS.filter(w => w.kind.en === k.en).length}</span></button>)}
                  </div>
                  <div className="sp"></div>
                  {(kind !== 'all' || q) && <button className="d-btn sm ghost" onClick={() => { setKind('all'); setQ(''); }}><Icon name="close" size={13} />{lang === 'ar' ? 'مسح' : 'Clear'}</button>}
                  <span className="d-cell-sub">{rows.length} {t('ws_showing')}</span>
                </div>
                {rows.length === 0 ? (
                  <div className="d-empty"><span className="d-empty-ico"><Icon name="search_off" size={28} /></span><b>{t('ws_no_results')}</b><span>{lang === 'ar' ? 'جرّب اسماً أو رمزاً أو نوعاً آخر' : 'Try another name, code or type'}</span></div>
                ) : (
                <table className="d-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}><DCheck on={allSel} mixed={someSel} onClick={toggleAll} /></th>
                      <th style={{ width: 92 }}>{lang === 'ar' ? 'الرمز' : 'Code'}</th>
                      <th className="sortable" onClick={() => toggleSort('name')}>{lang === 'ar' ? 'مساحة العمل' : 'Workspace'}{sortIco('name')}</th>
                      <th>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                      <th className="sortable r" onClick={() => toggleSort('active')} style={{ width: 130 }}>{t('kpi_active')}{sortIco('active')}</th>
                      <th className="sortable r" onClick={() => toggleSort('projects')} style={{ width: 110 }}>{lang === 'ar' ? 'المشاريع' : 'Projects'}{sortIco('projects')}</th>
                      <th className="sortable" onClick={() => toggleSort('completion')} style={{ width: 190 }}>{t('kpi_completion')}{sortIco('completion')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(w => (
                      <tr key={w.id} className={sel.has(w.id) ? 'sel' : ''} onClick={() => openWorkspace(w)} onContextMenu={e => rowMenu(e, w)}>
                        <td onClick={e => { e.stopPropagation(); toggleOne(w.id); }}><DCheck on={sel.has(w.id)} /></td>
                        <td className="mono d-cell-sub">{w.code}</td>
                        <td className="d-cell-strong">{w[lang]}</td>
                        <td className="d-cell-sub">{w.kind[lang]}</td>
                        <td className="num r">{w.active}</td>
                        <td className="num r">{w.projects}</td>
                        <td><div className="d-progress"><span className="t"><span style={{ width: w.completion + '%' }}></span></span><span className="pc">{w.completion}%</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
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
function DActivity({ t, lang, scoped, ws, openCmdk, showToast, onOpenProject, openProjectDetail, openWorkspace }) {
  const AR = lang === 'ar';
  const loading = useDeskLoad('act');
  const WS = window.EPM.WORKSPACES;
  const portfolio = React.useMemo(() => (scoped && ws
    ? window.EPM.buildProjects(ws.id, ws.projects).map(p => ({ ...p, ws }))
    : WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects).map(p => ({ ...p, ws: w })))), [scoped, ws && ws.id]);

  // event vocabulary — module-typed so the feed can be filtered like an audit trail
  const KINDS = [
    { key: 'fin', icon: 'payments', ar: 'مالي', en: 'Financial' },
    { key: 'vo', icon: 'history', ar: 'أوامر تغييرية', en: 'Change orders' },
    { key: 'boq', icon: 'list', ar: 'جدول الكميات', en: 'BOQ' },
    { key: 'doc', icon: 'description', ar: 'وثائق', en: 'Documents' },
    { key: 'sched', icon: 'calendar_month', ar: 'الجدول الزمني', en: 'Schedule' },
    { key: 'org', icon: 'group', ar: 'لجان وصلاحيات', en: 'Committees' },
  ];
  const kindOf = k => KINDS.find(x => x.key === k) || KINDS[0];
  const ACTORS = [
    { ar: 'أحمد فؤاد', en: 'Ahmed Fouad' }, { ar: 'ليلى حسن', en: 'Layla Hasan' },
    { ar: 'مصطفى علي', en: 'Mustafa Ali' }, { ar: 'سارة كريم', en: 'Sara Karim' },
    { ar: 'عمر الجبوري', en: 'Omar Al-Jabouri' }, { ar: 'نور الدين صالح', en: 'Nooraldeen Saleh' },
  ];
  const VERBS = [
    { kind: 'fin', ar: 'حدّث الموقف المالي', en: 'updated financials' },
    { kind: 'fin', ar: 'صادق على مستخلص', en: 'certified a payment' },
    { kind: 'vo', ar: 'قدّم أمراً تغييرياً', en: 'submitted a change order' },
    { kind: 'vo', ar: 'اعتمد أمراً تغييرياً', en: 'approved a change order' },
    { kind: 'boq', ar: 'عدّل بنود جدول الكميات', en: 'edited BOQ items' },
    { kind: 'boq', ar: 'ربط بنداً بالأنشطة', en: 'linked an item to activities' },
    { kind: 'doc', ar: 'رفع ملحق عقد', en: 'uploaded a contract addendum' },
    { kind: 'doc', ar: 'سجّل مخاطبة واردة', en: 'logged inbound correspondence' },
    { kind: 'sched', ar: 'نشر جدولاً زمنياً محدّثاً', en: 'published an updated schedule' },
    { kind: 'sched', ar: 'أعاد ضبط الخط الأساس', en: 'rebaselined the programme' },
    { kind: 'org', ar: 'أضاف لجنة فنية', en: 'added a technical committee' },
    { kind: 'org', ar: 'منح صلاحية على', en: 'granted access on' },
  ];
  const feed = React.useMemo(() => {
    const out = [];
    portfolio.forEach((p, i) => {
      for (let j = 0; j < 3; j++) {
        const v = VERBS[(i * 3 + j) % VERBS.length];
        const a = ACTORS[(i + j) % ACTORS.length];
        const hoursAgo = (i * 7 + j * 5) % 96;
        out.push({ id: p.id + '-' + j, p, actor: a, verb: v, kind: v.kind, hoursAgo });
      }
    });
    return out.sort((x, y) => x.hoursAgo - y.hoursAgo);
  }, [portfolio]);

  const [q, setQ] = dS('');
  const [kind, setKind] = dS('all');
  const [proj, setProj] = dS('all');
  const [limit, setLimit] = dS(30);
  const qn = q.trim().toLowerCase();
  const filtered = feed.filter(e => (kind === 'all' || e.kind === kind)
    && (proj === 'all' || e.p.id === proj)
    && (!qn || e.actor[lang].toLowerCase().includes(qn) || e.verb[lang].toLowerCase().includes(qn) || e.p.name[lang].toLowerCase().includes(qn) || e.p.id.toLowerCase().includes(qn)));
  React.useEffect(() => { setLimit(30); }, [kind, proj, q]);
  const shown = filtered.slice(0, limit);

  const when = h => h < 1 ? (AR ? 'الآن' : 'just now')
    : h < 24 ? (AR ? `قبل ${h} ساعة` : `${h} hr ago`)
    : h < 48 ? (AR ? 'أمس' : 'Yesterday')
    : (AR ? `قبل ${Math.floor(h / 24)} أيام` : `${Math.floor(h / 24)} days ago`);
  const bucket = h => h < 24 ? 'today' : h < 48 ? 'yesterday' : 'earlier';
  const bucketLabel = { today: AR ? 'اليوم' : 'Today', yesterday: AR ? 'أمس' : 'Yesterday', earlier: AR ? 'أقدم' : 'Earlier' };
  const groups = ['today', 'yesterday', 'earlier']
    .map(b => ({ b, items: shown.filter(e => bucket(e.hoursAgo) === b) }))
    .filter(g => g.items.length);
  const openIt = e => onOpenProject ? onOpenProject(e.p)
    : openProjectDetail ? openProjectDetail(e.p)
    : openWorkspace ? openWorkspace(e.p.ws) : null;

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={scoped && ws ? [ws[lang]] : [t('enterprise_ctx')]} onSearch={openCmdk} actions={null} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            <DPageHead lang={lang}
              crumbs={scoped && ws ? [ws[lang], t('recent')] : [t('enterprise_ctx'), t('recent')]}
              title={t('recent')}
              sub={AR ? `${filtered.length} حدثاً عبر ${scoped ? 'مساحة العمل' : 'المحفظة'} — الأحدث أولاً`
                      : `${filtered.length} events across the ${scoped ? 'workspace' : 'portfolio'} — newest first`}
              actions={<button className="d-btn" onClick={() => showToast && showToast(AR ? 'تصدير السجل — تجريبي' : 'Export log — demo')}><Icon name="ios_share" size={16} />{t('export')}</button>} />

            <div className="d-toolbar">
              <div className="d-field">
                <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
                <input placeholder={AR ? 'بحث بالمستخدم أو المشروع…' : 'Search by user or project…'} value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <select className="d-form-input" style={{ width: 'auto', maxWidth: 230 }} value={proj} onChange={e => setProj(e.target.value)}>
                <option value="all">{AR ? 'كل المشاريع' : 'All projects'}</option>
                {portfolio.map(p => <option key={p.ws.id + p.id} value={p.id}>{p.name[lang]}</option>)}
              </select>
              <div className="grp">
                <button className={`d-fchip ${kind === 'all' ? 'on' : ''}`} onClick={() => setKind('all')}>{AR ? 'الكل' : 'All'}<span className="n">{feed.length}</span></button>
                {KINDS.map(k => <button key={k.key} className={`d-fchip ${kind === k.key ? 'on' : ''}`} onClick={() => setKind(k.key)}>{k[AR ? 'ar' : 'en']}<span className="n">{feed.filter(e => e.kind === k.key).length}</span></button>)}
              </div>
              <div className="sp"></div>
              {(kind !== 'all' || proj !== 'all' || q) && <button className="d-btn sm ghost" onClick={() => { setKind('all'); setProj('all'); setQ(''); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
              <span className="d-cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>{filtered.length} {AR ? 'حدثاً' : 'events'}</span>
            </div>

            {loading ? (
              <div className="d-panel"><div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ display: 'flex', gap: 12 }}><span className="d-skel" style={{ width: 32, height: 32, borderRadius: 999 }}></span><span className="d-skel" style={{ flex: 1, height: 14 }}></span></div>)}
              </div></div>
            ) : filtered.length === 0 ? (
              <div className="d-panel"><div className="d-empty"><span className="d-empty-ico"><Icon name="search_off" size={28} /></span><b>{AR ? 'لا نشاط مطابق' : 'No matching activity'}</b><span>{AR ? 'جرّب نوعاً أو مشروعاً آخر' : 'Try another type or project'}</span></div></div>
            ) : (
              <React.Fragment>
                {groups.map(g => (
                  <div className="d-panel" key={g.b} style={{ marginBottom: 12 }}>
                    <div className="d-panel-head"><b>{bucketLabel[g.b]}</b><span className="d-cell-sub">{g.items.length} {AR ? 'حدثاً' : 'events'}</span></div>
                    <div className="d-actfeed">
                      {g.items.map(e => {
                        const k = kindOf(e.kind);
                        return (
                          <button key={e.id} className="d-actrow" onClick={() => openIt(e)}>
                            <span className={`d-actico ${e.kind}`}><Icon name={k.icon} size={16} /></span>
                            <span className="tx">
                              <span className="l1"><b>{e.actor[lang]}</b> {e.verb[lang]}</span>
                              <span className="l2">{e.p.name[lang]} <span className="mono">{e.p.id}</span> · {e.p.ws[lang]}</span>
                            </span>
                            <span className={`d-cat ${e.kind === 'fin' ? 'fin' : e.kind === 'sched' ? 'sched' : e.kind === 'boq' ? 'prog' : e.kind === 'vo' ? 'comp' : 'cont'}`}>{k[AR ? 'ar' : 'en']}</span>
                            <span className="tm">{when(e.hoursAgo)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {shown.length < filtered.length && (
                  <button className="d-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setLimit(l => l + 30)}>
                    <Icon name="expand_more" size={16} />{AR ? `عرض المزيد (${filtered.length - shown.length})` : `Show more (${filtered.length - shown.length})`}
                  </button>
                )}
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DDashboard, DSpaces, DActivity, DDistribution, DActRows, DStat, DTableSkeleton });
