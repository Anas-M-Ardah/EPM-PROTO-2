/* ============================================================
   EPM — MOBILE: Reports (sequential, card-based) + Notifications.
   Native mobile patterns; same window.EPM data as desktop.
   ============================================================ */

function MReports({ t, lang }) {
  const WS = window.EPM.WORKSPACES;
  const [period, setPeriod] = useState('quarter');
  const avg = Math.round(WS.reduce((a, w) => a + w.completion, 0) / WS.length);
  const totals = WS.reduce((a, w) => ({ active: a.active + w.active, proj: a.proj + w.projects }), { active: 0, proj: 0 });
  const portfolio = WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects));
  const atRisk = portfolio.filter(p => p.status === 'stalled' || p.status === 'suspended').length;
  const keys = ['ongoing','completed','stalled','suspended','withdrawn'];
  const counts = keys.map(k => ({ k, n: portfolio.filter(p => p.status === k).length }));
  const maxN = Math.max(...counts.map(c => c.n)) || 1;
  const top = [...WS].sort((a, b) => b.completion - a.completion).slice(0, 5);

  return (
    <React.Fragment>
      <div className="m-chips" style={{ paddingTop: 12 }}>
        {['month','quarter','year'].map(p => <button key={p} className={`m-chip ${period === p ? 'on' : ''}`} onClick={() => setPeriod(p)}>{t('period_' + p)}</button>)}
      </div>
      <MScroll>
        <div className="m-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* hero completion */}
          <div className="m-card pad" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <MDonut value={avg} size={84} stroke={9} />
            <div>
              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>{t('kpi_completion')}</div>
              <div style={{ fontSize: 15, fontWeight: 'var(--fw-bold)', marginTop: 4 }}>{t('period_' + period)}</div>
              <div style={{ fontSize: 12, color: 'var(--status-completed-tx)', fontWeight: 'var(--fw-bold)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="trending_up" size={14} />+3%</div>
            </div>
          </div>

          <div className="m-kpis">
            <MKpi icon="engineering" value={totals.active} label={t('kpi_active')} />
            <MKpi icon="folder" tone="b" value={totals.proj} label={lang === 'ar' ? 'إجمالي المشاريع' : 'Total'} />
            <MKpi icon="warning" tone="w" value={atRisk} label={t('rep_at_risk')} />
            <MKpi icon="apartment" tone="g" value={WS.length} label={t('kpi_workspaces')} />
          </div>

          {/* by status bars */}
          <div className="m-card pad">
            <div className="m-sec-title" style={{ marginBottom: 14 }}>{t('rep_by_status')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {counts.map(c => (
                <div key={c.k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 64, fontSize: 12, color: 'var(--on-surface-variant)' }}>{window.EPM.STATUS[c.k][lang]}</span>
                  <div style={{ flex: 1, height: 9, borderRadius: 999, background: 'var(--surface-container-high)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (c.n / maxN * 100) + '%', background: window.STATUS_VAR[c.k], borderRadius: 999 }}></span></div>
                  <b style={{ width: 24, textAlign: 'end', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{c.n}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="m-sec"><div className="m-sec-row"><span className="m-sec-title">{t('rep_by_ws')}</span></div></div>
        <div className="m-pad" style={{ paddingTop: 0 }}>
          <div className="m-card"><div className="m-list">
            {top.map(w => (
              <div key={w.id} className="m-row" style={{ cursor: 'default' }}>
                <span className="m-row-emblem" style={{ background: w.color }}>{w.code}</span>
                <div className="m-row-main"><b>{w[lang]}</b><div className="m-mini-prog"><div className="m-track"><span style={{ width: w.completion + '%' }}></span></div><span className="m-pct">{w.completion}%</span></div></div>
              </div>
            ))}
          </div></div>
        </div>
      </MScroll>
    </React.Fragment>
  );
}

function MNotifs({ t, lang, showToast }) {
  const N = window.EPM.NOTIFICATIONS;
  const [read, setRead] = useState(false);
  const tone = { azure: ['color-mix(in srgb,var(--azure-500) 14%,transparent)', 'var(--azure-600)'], crimson: ['color-mix(in srgb,var(--tertiary) 14%,transparent)', 'var(--tertiary)'], success: ['color-mix(in srgb,var(--success) 14%,transparent)', 'var(--success)'] };
  const groups = [['today', t('notif_today')], ['earlier', t('notif_earlier')]];
  return (
    <MScroll>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="m-sec-more" onClick={() => { setRead(true); showToast(lang === 'ar' ? 'تم التعليم كمقروء' : 'All marked read'); }}>{t('notif_mark_all')}</button>
      </div>
      {groups.map(([g, label]) => (
        <React.Fragment key={g}>
          <div className="m-sec"><div className="m-sec-row" style={{ margin: '0 0 8px' }}><span className="m-sec-title">{label}</span></div></div>
          <div className="m-pad" style={{ paddingTop: 0, paddingBottom: 8 }}>
            <div className="m-card"><div className="m-list">
              {N.filter(n => n.group === g).map((n, i) => {
                const [bg, fg] = tone[n.tone] || tone.azure;
                return (
                  <div key={i} className="m-row" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                    <span className="m-srow-ico" style={{ background: bg, color: fg }}><Icon name={n.icon} size={18} /></span>
                    <div className="m-row-main">
                      <b style={{ whiteSpace: 'normal', fontWeight: 'var(--fw-bold)' }}>{n[lang === 'ar' ? 'whoAr' : 'whoEn']} <span style={{ fontWeight: 'var(--fw-regular)', color: 'var(--on-surface-variant)' }}>{n[lang === 'ar' ? 'txtAr' : 'txtEn']}</span> <span className="mono" style={{ color: 'var(--tertiary)' }}>{n.tgt}</span></b>
                      <div className="m-row-sub">{n[lang === 'ar' ? 'tAr' : 'tEn']}</div>
                    </div>
                    {!read && n.unread && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--tertiary)', flex: 'none', marginTop: 7 }}></span>}
                  </div>
                );
              })}
            </div></div>
          </div>
        </React.Fragment>
      ))}
    </MScroll>
  );
}

Object.assign(window, { MReports, MNotifs });
