/* ============================================================
   EPM — DESKTOP: Reports & Analytics workspace + Notifications panel.
   Data-rich, structured (Linear/Stripe tier). Shares d-* tokens.
   ============================================================ */

/* mini SVG charts */
function DAreaChart({ points, color = 'var(--azure-500)', h = 200 }) {
  const w = 600, max = Math.max(...points) * 1.1, min = 0, rng = (max - min) || 1;
  const xs = points.map((p, i) => i / (points.length - 1) * w);
  const ys = points.map(p => h - 14 - ((p - min) / rng) * (h - 28));
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h} style={{ display: 'block' }}>
      <defs><linearGradient id="repArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.24"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((g, i) => <line key={i} x1="0" y1={h * g} x2={w} y2={h * g} stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray="3 5" opacity="0.5"/>)}
      <path d={area} fill="url(#repArea)"/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="3.5" fill="var(--surface-container-lowest)" stroke={color} strokeWidth="2"/>)}
    </svg>
  );
}

function DBars({ data, h = 200 }) {
  const w = 600, max = Math.max(...data.map(d => d.v)) * 1.1 || 1, bw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const bh = (d.v / max) * (h - 26), x = i * bw + bw * 0.22, y = h - 18 - bh;
        return <g key={i}><rect x={x} y={y} width={bw * 0.56} height={bh} rx="4" fill={d.color || 'var(--viz-1)'}/></g>;
      })}
    </svg>
  );
}

/* ============================================================
   REPORTS & ANALYTICS (desktop)
   ============================================================ */
function DReports({ t, lang, openCmdk, showToast, openWorkspace, scopeWs, onOpenProject }) {
  const WS = window.EPM.WORKSPACES;
  const [period, setPeriod] = dS('quarter');
  const scopedWSList = scopeWs ? [scopeWs] : WS;
  const totals = scopedWSList.reduce((a, w) => ({ active: a.active + w.active, proj: a.proj + w.projects }), { active: 0, proj: 0 });
  const avg = Math.round(scopedWSList.reduce((a, w) => a + w.completion, 0) / scopedWSList.length);
  const portfolio = scopedWSList.flatMap(w => window.EPM.buildProjects(w.id, w.projects).map(p => ({ ...p, ws: w })));
  const atRisk = portfolio.filter(p => p.status === 'stalled' || p.status === 'suspended').length;
  const keys = ['ongoing','completed','stalled','suspended','withdrawn'];
  const statusData = keys.map(k => ({ label: window.EPM.STATUS[k][lang], v: portfolio.filter(p => p.status === k).length, color: window.STATUS_VAR[k] }));
  const B = window.EPM.BRANCHES;
  const branchData = B[lang].map((b, i) => ({ label: b, v: portfolio.filter(p => p.branchIdx === i).length }));
  const trend = period === 'month' ? [54,56,58,57,60,62,63,64] : period === 'year' ? [38,44,49,53,57,60,62,64] : [50,53,55,58,60,61,63,64];
  const ranked = [...WS].sort((a, b) => b.completion - a.completion).slice(0, 8);

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_reports')]} onSearch={openCmdk}
        actions={<React.Fragment>
          <div className="d-seg">
            {['month','quarter','year'].map(p => <button key={p} className={period === p ? 'on' : ''} onClick={() => setPeriod(p)}>{t('period_' + p)}</button>)}
          </div>
          <button className="d-btn" onClick={() => showToast(lang === 'ar' ? 'تصدير — تجريبي' : 'Export — demo')}><Icon name="ios_share" size={17} />{t('export')}</button>
        </React.Fragment>} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            <div className="d-page-head"><div><h1>{t('nav_reports')}</h1><p>{scopeWs ? scopeWs[lang] : t('reports_sub')}</p></div></div>

            <div className="d-grid stats" style={{ marginBottom: 16 }}>
              <DStat icon="engineering" val={totals.active} lbl={t('kpi_active')} trend="+6%" up spark={[58,62,60,68,66,74,80]} />
              <DStat icon="folder" val={totals.proj} lbl={lang === 'ar' ? 'إجمالي المشاريع' : 'Total projects'} trend="+12" up spark={[40,44,52,58,70,82,96]} />
              <DStat icon="warning" tone="r" val={atRisk} lbl={t('rep_at_risk')} trend={lang === 'ar' ? 'مراقبة' : 'watch'} spark={[30,42,38,48,40,36,44]} />
              <DStat icon="donut_large" tone="g" val={avg} suffix="%" lbl={t('kpi_completion')} trend="+3%" up spark={[52,55,58,57,60,62,64]} />
            </div>

            <div className="d-grid c2">
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('rep_trend')}</b><span className="d-cell-sub">{t('period_' + period)}</span></div>
                <div className="d-panel-body"><DAreaChart points={trend} /></div>
              </div>
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('rep_by_status')}</b></div>
                <div className="d-panel-body">
                  <DBars data={statusData} />
                  <div className="d-legend" style={{ marginTop: 14 }}>{statusData.map((s, i) => <span key={i} className="d-legend-i"><i style={{ background: s.color }}></i>{s.label}<b>{s.v}</b></span>)}</div>
                </div>
              </div>
            </div>

            <div className="d-grid c2" style={{ marginTop: 16 }}>
              <div className="d-panel">
                <div className="d-panel-head"><b>{scopeWs ? (lang === 'ar' ? 'أبرز المشاريع' : 'Top projects') : t('rep_by_ws')}</b><span className="d-cell-sub">{lang === 'ar' ? 'الأعلى إنجازاً' : 'Top completion'}</span></div>
                <div>
                  {scopeWs
                    ? [...portfolio].sort((a, b) => b.tech - a.tech).slice(0, 8).map(p => (
                      <button key={p.id} className="d-mini" onClick={() => onOpenProject ? onOpenProject(p) : openWorkspace(p.ws)}>
                        <span className="d-mini-emblem" style={{ background: window.STATUS_VAR[p.status] }}><Icon name="engineering" size={15} /></span>
                        <span className="d-mini-main"><b>{p.name[lang]}</b><span className="mono">{p.id}</span></span>
                        <span className="d-mini-bar"><span className="t"><span style={{ width: p.tech + '%' }}></span></span><span className="pc">{p.tech}%</span></span>
                      </button>
                    ))
                    : ranked.map(w => (
                      <button key={w.id} className="d-mini" onClick={() => openWorkspace(w)}>
                        <span className="d-mini-emblem" style={{ background: w.color }}>{w.code}</span>
                        <span className="d-mini-main"><b>{w[lang]}</b><span>{w.active} {t('ws_active_short')} · {w.projects} {lang === 'ar' ? 'مشروع' : 'projects'}</span></span>
                        <span className="d-mini-bar"><span className="t"><span style={{ width: w.completion + '%' }}></span></span><span className="pc">{w.completion}%</span></span>
                      </button>
                    ))}
                </div>
              </div>
              <div className="d-panel">
                <div className="d-panel-head"><b>{t('rep_by_branch')}</b></div>
                <div className="d-panel-body">
                  <DBars data={branchData.map(b => ({ ...b, color: 'var(--primary)' }))} h={160} />
                  <div className="d-legend" style={{ marginTop: 14 }}>{branchData.map((b, i) => <span key={i} className="d-legend-i"><i style={{ background: 'var(--primary)' }}></i>{b.label}<b>{b.v}</b></span>)}</div>
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
   NOTIFICATIONS — desktop dropdown panel (contextual)
   ============================================================ */
function DNotifPanel({ t, lang, onClose, showToast }) {
  const N = window.EPM.NOTIFICATIONS;
  const [read, setRead] = dS(false);
  const tone = { azure: ['color-mix(in srgb,var(--azure-500) 14%,transparent)', 'var(--azure-600)'], crimson: ['color-mix(in srgb,var(--tertiary) 14%,transparent)', 'var(--tertiary)'], success: ['color-mix(in srgb,var(--success) 14%,transparent)', 'var(--success)'] };
  const groups = [['today', t('notif_today')], ['earlier', t('notif_earlier')]];
  return (
    <div style={{ width: 360, maxWidth: '92vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 10px' }}>
        <b style={{ fontSize: 15, fontWeight: 'var(--fw-x)' }}>{t('notifications')}</b>
        <button className="d-link" style={{ border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => { setRead(true); showToast(lang === 'ar' ? 'تم التعليم كمقروء' : 'All marked read'); }}>{t('notif_mark_all')}</button>
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', margin: '0 -7px' }}>
        {groups.map(([g, label]) => (
          <React.Fragment key={g}>
            <div className="d-pop-lbl">{label}</div>
            {N.filter(n => n.group === g).map((n, i) => {
              const [bg, fg] = tone[n.tone] || tone.azure;
              return (
                <button key={i} className="d-pop-row" style={{ alignItems: 'flex-start' }} onClick={onClose}>
                  <span className="d-mini-emblem" style={{ width: 32, height: 32, background: bg, color: fg, flex: 'none' }}><Icon name={n.icon} size={17} /></span>
                  <span className="d-pop-row-tx" style={{ whiteSpace: 'normal' }}>
                    <b style={{ whiteSpace: 'normal', fontWeight: 'var(--fw-bold)' }}>{n[lang === 'ar' ? 'whoAr' : 'whoEn']} <span style={{ fontWeight: 'var(--fw-regular)', color: 'var(--on-surface-variant)' }}>{n[lang === 'ar' ? 'txtAr' : 'txtEn']}</span> <span className="mono" style={{ color: 'var(--tertiary)' }}>{n.tgt}</span></b>
                    <span style={{ fontSize: 11 }}>{n[lang === 'ar' ? 'tAr' : 'tEn']}</span>
                  </span>
                  {!read && n.unread && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--tertiary)', flex: 'none', marginTop: 6 }}></span>}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DReports, DNotifPanel, DAreaChart, DBars });
