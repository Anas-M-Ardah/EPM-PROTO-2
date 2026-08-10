/* ============================================================
   EPM — enterprise-level areas (Main Navigation, IA §1):
   Schedule Control (portfolio schedule health) and Alerts
   Center (portfolio-wide alerts). Reuse d-* tokens + charts.
   ============================================================ */

/* ---------- Schedule Control ---------- */
function DScheduleControl({ t, lang, openWorkspace, openCmdk, showToast, setPop, scopeWs, onOpenProject }) {
  const AR = lang === 'ar';
  const WS = window.EPM.WORKSPACES;
  const portfolio = React.useMemo(() => (scopeWs ? window.EPM.buildProjects(scopeWs.id, scopeWs.projects).map(p => ({ ...p, ws: scopeWs })) : WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects).map(p => ({ ...p, ws: w })))), [scopeWs && scopeWs.id]);
  const openRow = (p) => onOpenProject ? onOpenProject(p) : openWorkspace(p.ws);
  const rowsAll = React.useMemo(() => portfolio.map(p => {
    const s = window.EPM.buildSchedule(p);
    const delay = Math.max(0, Math.round((new Date(s.expectedFinish) - new Date(s.plannedFinish)) / 86400000));
    const critical = p.status === 'stalled' ? 3 + (p.id.charCodeAt(6) % 3) : p.status === 'suspended' ? 2 : (p.id.charCodeAt(6) % 2);
    const imp = p.tech > 0 ? 'published' : 'pending';
    return { p, plannedFinish: s.plannedFinish, expectedFinish: s.expectedFinish, delay, critical, imp };
  }), [portfolio]);
  const [filter, setFilter] = React.useState('all');
  const delayed = rowsAll.filter(r => r.delay > 0);
  const avgDelay = Math.round(delayed.reduce((a, r) => a + r.delay, 0) / (delayed.length || 1));
  const criticalTotal = rowsAll.reduce((a, r) => a + r.critical, 0);
  const onTrack = rowsAll.filter(r => r.delay === 0).length;
  const rows = (filter === 'delayed' ? delayed : filter === 'critical' ? rowsAll.filter(r => r.critical > 0) : rowsAll).slice(0, 40);
  const B = window.EPM.BRANCHES;

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_schedule_control')]} onSearch={openCmdk}
        actions={<button className="d-btn" onClick={() => showToast(AR ? 'استيراد Primavera — تجريبي' : 'Import Primavera — demo')}><Icon name="upload_file" size={17} />{AR ? 'استيراد P6' : 'Import P6'}</button>} />
      <div className="d-canvas"><div className="d-canvas-pad"><div className="d-canvas-wrap">
        <div className="d-page-head"><div><h1>{t('nav_schedule_control')}</h1><p>{scopeWs ? scopeWs[lang] : (AR ? 'صحة الجداول الزمنية عبر المحفظة' : 'Portfolio-wide schedule health')}</p></div></div>
        <div className="d-grid stats" style={{ marginBottom: 16 }}>
          <DStat idx={0} icon="schedule" tone="a" val={avgDelay} suffix={AR ? ' يوم' : ' d'} lbl={t('sc_avg_delay')} />
          <DStat idx={1} icon="warning" tone="r" val={delayed.length} lbl={t('sc_delayed')} />
          <DStat idx={2} icon="priority_high" tone="w" val={criticalTotal} lbl={t('sc_critical')} />
          <DStat idx={3} icon="verified" tone="g" val={onTrack} lbl={t('sc_ontrack')} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[['all', AR ? 'الكل' : 'All'], ['delayed', t('sc_delayed')], ['critical', t('sc_critical')]].map(([f, lb]) => (
            <button key={f} className={`d-fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{lb}</button>
          ))}
        </div>
        <div className="d-tablewrap"><table className="d-table">
          <thead><tr><th>{AR ? 'المشروع' : 'Project'}</th><th>{AR ? 'الفرع' : 'Branch'}</th><th>{AR ? 'إنجاز مخطط' : 'Baseline finish'}</th><th>{AR ? 'إنجاز متوقع' : 'Forecast'}</th><th>{t('sc_avg_delay')}</th><th>{t('sc_critical')}</th><th>{t('sc_import_status')}</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.p.ws.id + r.p.id} onClick={() => openRow(r.p)} style={{ cursor: 'pointer' }}>
              <td className="d-cell-strong">{r.p.name[lang]}<div className="d-cell-sub mono">{r.p.id}</div></td>
              <td className="d-cell-sub">{B[lang][r.p.branchIdx]}</td>
              <td className="mono">{r.plannedFinish}</td>
              <td className="mono" style={{ color: r.delay > 0 ? 'var(--error)' : 'inherit' }}>{r.expectedFinish}</td>
              <td className="mono" style={{ color: r.delay > 0 ? 'var(--error)' : 'var(--success)' }}>{r.delay > 0 ? '+' + r.delay + (AR ? ' ي' : 'd') : (AR ? 'لا' : '0')}</td>
              <td><span className="d-pill" style={{ background: r.critical > 0 ? 'color-mix(in srgb,var(--tertiary) 14%,transparent)' : 'var(--surface-container-high)', color: r.critical > 0 ? 'var(--tertiary)' : 'var(--on-surface-variant)' }}>{r.critical}</span></td>
              <td><span className={`d-pill ${r.imp === 'published' ? 'completed' : 'suspended'}`}>{r.imp === 'published' ? (AR ? 'منشور' : 'Published') : (AR ? 'بانتظار' : 'Pending')}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div></div></div>
    </div>
  );
}

/* ---------- Alerts Center ---------- */
function DAlertsCenter({ t, lang, openWorkspace, openCmdk, showToast, setPop, scopeWs, onOpenProject }) {
  const AR = lang === 'ar';
  const WS = window.EPM.WORKSPACES;
  const portfolio = React.useMemo(() => (scopeWs ? window.EPM.buildProjects(scopeWs.id, scopeWs.projects).map(p => ({ ...p, ws: scopeWs })) : WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects).map(p => ({ ...p, ws: w })))), [scopeWs && scopeWs.id]);
  const openRow = (p) => onOpenProject ? onOpenProject(p) : openWorkspace(p.ws);
  const feed = React.useMemo(() => {
    const pick = portfolio.filter(p => p.status === 'stalled' || p.status === 'suspended').concat(portfolio.filter(p => p.status === 'ongoing').slice(0, 12)).slice(0, 30);
    return pick.flatMap(p => window.EPM.buildAlertsData(p, lang).alerts.map(a => ({ ...a, p }))).sort((x, y) => y.when.localeCompare(x.when));
  }, [portfolio, lang]);
  const [filter, setFilter] = React.useState('all');
  const SEV = window.ALERT_SEV || { red: { color: 'var(--error)' }, amber: { color: 'var(--status-suspended-tx)' }, green: { color: 'var(--status-completed-tx)' } };
  const counts = { red: feed.filter(a => a.sev === 'red').length, amber: feed.filter(a => a.sev === 'amber').length, green: feed.filter(a => a.sev === 'green').length, open: feed.filter(a => a.status === 'open').length };
  const shown = feed.filter(a => filter === 'all' || (filter === 'open' ? a.status === 'open' : a.sev === filter)).slice(0, 60);
  const stLabel = s => ({ open: AR ? 'مفتوح' : 'Open', ack: AR ? 'مُقَر' : 'Acknowledged', snoozed: AR ? 'مؤجل' : 'Snoozed' }[s]);

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_alerts_center')]} onSearch={openCmdk}
        actions={<button className="d-btn" onClick={() => showToast(AR ? 'ضبط القواعد — تجريبي' : 'Configure rules — demo')}><Icon name="settings" size={17} />{AR ? 'قواعد التنبيه' : 'Alert rules'}</button>} />
      <div className="d-canvas"><div className="d-canvas-pad"><div className="d-canvas-wrap">
        <div className="d-page-head"><div><h1>{t('nav_alerts_center')}</h1><p>{scopeWs ? scopeWs[lang] : (AR ? 'التنبيهات والتصعيد عبر المحفظة' : 'Portfolio-wide alerts & escalation')}</p></div></div>
        <div className="d-grid stats" style={{ marginBottom: 16 }}>
          <button className="d-stat as-stat" onClick={() => setFilter('red')}><DStat idx={0} icon="error" tone="r" val={counts.red} lbl={AR ? 'حرِجة' : 'High severity'} /></button>
          <button className="d-stat as-stat" onClick={() => setFilter('amber')}><DStat idx={1} icon="warning" tone="w" val={counts.amber} lbl={AR ? 'متوسطة' : 'Medium'} /></button>
          <button className="d-stat as-stat" onClick={() => setFilter('green')}><DStat idx={2} icon="info" tone="g" val={counts.green} lbl={AR ? 'منخفضة' : 'Low'} /></button>
          <button className="d-stat as-stat" onClick={() => setFilter('open')}><DStat idx={3} icon="notifications" tone="a" val={counts.open} lbl={AR ? 'مفتوحة' : 'Open'} /></button>
        </div>
        {filter !== 'all' && <button className="d-btn sm ghost" style={{ marginBottom: 12 }} onClick={() => setFilter('all')}><Icon name="close" size={13} />{AR ? 'إزالة التصفية' : 'Clear filter'}</button>}
        <div className="d-card-sub">
          {shown.map((a, i) => (
            <button key={a.p.id + a.id + i} className="d-alert-row as-row" onClick={() => openRow(a.p)}>
              <span className="d-alert-dot" style={{ background: SEV[a.sev].color }}></span>
              <div className="d-alert-main">
                <b>{a.title}</b>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--on-surface-variant)' }}>{a.p.name[lang]} · {a.p.id} · {a.src} · {a.when}</span>
              </div>
              <span className={`d-pill ${a.status === 'open' ? 'ongoing' : a.status === 'ack' ? 'completed' : 'suspended'}`} style={{ flex: 'none' }}>{stLabel(a.status)}</span>
              <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={16} style={{ color: 'var(--on-surface-variant)', flex: 'none' }} />
            </button>
          ))}
        </div>
      </div></div></div>
    </div>
  );
}

/* ---------- Cross-portfolio Projects list ---------- */
function DProjectsAll({ t, lang, openWorkspace, openCmdk, showToast, scopeWs, onOpenProject }) {
  const AR = lang === 'ar';
  const WS = window.EPM.WORKSPACES;
  const B = window.EPM.BRANCHES;
  const all = React.useMemo(() => (scopeWs ? window.EPM.buildProjects(scopeWs.id, scopeWs.projects).map(p => ({ ...p, ws: scopeWs })) : WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects).map(p => ({ ...p, ws: w })))), [scopeWs && scopeWs.id]);
  const openRow = (p) => onOpenProject ? onOpenProject(p) : openWorkspace(p.ws);
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const filters = ['all', 'ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  const counts = {}; filters.forEach(f => counts[f] = f === 'all' ? all.length : all.filter(p => p.status === f).length);
  const qn = q.trim().toLowerCase();
  const rows = all.filter(p => (filter === 'all' || p.status === filter) && (!qn || p.name[lang].toLowerCase().includes(qn) || p.id.toLowerCase().includes(qn))).slice(0, 60);

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_projects_all')]} onSearch={openCmdk}
        actions={<button className="d-btn accent" onClick={() => showToast(AR ? 'مشروع جديد — تجريبي' : 'New project — demo')}><Icon name="add" size={17} />{t('new_project')}</button>} />
      <div className="d-canvas"><div className="d-canvas-pad"><div className="d-canvas-wrap">
        <div className="d-page-head"><div><h1>{scopeWs ? t('nav_projects') : t('nav_projects_all')}</h1><p>{scopeWs ? scopeWs[lang] : (AR ? 'كل المشاريع عبر التشكيلات والجامعات' : 'All projects across entities & universities')}</p></div></div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="d-field" style={{ height: 36, minWidth: 240, flex: '0 1 320px' }}>
            <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
            <input placeholder={AR ? 'بحث في المشاريع…' : 'Search projects…'} value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filters.map(f => <button key={f} className={`d-fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}<span className="n">{counts[f]}</span></button>)}
          </div>
        </div>
        <div className="d-tablewrap"><table className="d-table">
          <thead><tr><th>{AR ? 'المشروع' : 'Project'}</th>{!scopeWs && <th>{AR ? 'مساحة العمل' : 'Workspace'}</th>}<th>{AR ? 'الفرع' : 'Branch'}</th><th>{AR ? 'الحالة' : 'Status'}</th><th>{AR ? 'الإنجاز' : 'Physical'}</th><th>{AR ? 'الكلفة' : 'Cost'}</th><th>{AR ? 'آخر تحديث' : 'Updated'}</th></tr></thead>
          <tbody>{rows.map(p => (
            <tr key={p.ws.id + p.id} onClick={() => openRow(p)} style={{ cursor: 'pointer' }}>
              <td className="d-cell-strong">{p.name[lang]}<div className="d-cell-sub mono">{p.id}</div></td>
              {!scopeWs && <td className="d-cell-sub">{p.ws[lang]}</td>}
              <td className="d-cell-sub">{B[lang][p.branchIdx]}</td>
              <td><DPill status={p.status} lang={lang} /></td>
              <td><span className="d-mini-bar" style={{ display: 'inline-flex' }}><span className="t" style={{ width: 70 }}><span style={{ width: p.tech + '%' }}></span></span><span className="pc">{p.tech}%</span></span></td>
              <td className="mono">{window.fmtNum(p.cost)}</td>
              <td className="mono d-cell-sub">{p.updated}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div></div></div>
    </div>
  );
}

/* ---------- Cross-portfolio Contracts list ---------- */
function DContractsAll({ t, lang, openWorkspace, openCmdk, showToast, scopeWs, onOpenProject }) {
  const AR = lang === 'ar';
  const WS = window.EPM.WORKSPACES;
  const B = window.EPM.BRANCHES;
  const rowsAll = React.useMemo(() => (scopeWs ? window.EPM.buildProjects(scopeWs.id, scopeWs.projects).map(p => ({ ...p, ws: scopeWs })) : WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects).map(p => ({ ...p, ws: w })))).map(p => {
    const s = window.EPM.buildSchedule(p);
    const fin = Math.max(0, (p.financialPct != null ? p.financialPct : p.tech - 8));
    return { p, ws: p.ws, code: 'CNT-' + p.id.slice(4), start: s.start, finish: s.plannedFinish, fin };
  }), [scopeWs && scopeWs.id]);
  const openRow = (r) => onOpenProject ? onOpenProject(r.p) : openWorkspace(r.ws);
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const filters = ['all', 'ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  const counts = {}; filters.forEach(f => counts[f] = f === 'all' ? rowsAll.length : rowsAll.filter(r => r.p.status === f).length);
  const qn = q.trim().toLowerCase();
  const rows = rowsAll.filter(r => (filter === 'all' || r.p.status === filter) && (!qn || r.p.name[lang].toLowerCase().includes(qn) || r.code.toLowerCase().includes(qn))).slice(0, 60);
  const contractor = AR ? 'شركة الفرات للمقاولات' : 'Al-Furat Contracting';

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_contracts_all')]} onSearch={openCmdk}
        actions={<button className="d-btn" onClick={() => showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}><Icon name="ios_share" size={17} />{t('export')}</button>} />
      <div className="d-canvas"><div className="d-canvas-pad"><div className="d-canvas-wrap">
        <div className="d-page-head"><div><h1>{t('nav_contracts_all')}</h1><p>{scopeWs ? scopeWs[lang] : (AR ? 'كل العقود عبر المحفظة' : 'All contracts across the portfolio')}</p></div></div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="d-field" style={{ height: 36, minWidth: 240, flex: '0 1 320px' }}>
            <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
            <input placeholder={AR ? 'بحث في العقود…' : 'Search contracts…'} value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filters.map(f => <button key={f} className={`d-fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}<span className="n">{counts[f]}</span></button>)}
          </div>
        </div>
        <div className="d-tablewrap"><table className="d-table">
          <thead><tr><th>{AR ? 'العقد' : 'Contract'}</th><th>{AR ? 'المقاول' : 'Contractor'}</th><th>{AR ? 'المباشرة' : 'Start'}</th><th>{AR ? 'الإنجاز' : 'Finish'}</th><th>{AR ? 'الحالة' : 'Status'}</th><th>{AR ? 'الإنجاز المالي' : 'Financial'}</th><th>{AR ? 'قيمة العقد' : 'Value'}</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.ws.id + r.p.id} onClick={() => openRow(r)} style={{ cursor: 'pointer' }}>
              <td className="d-cell-strong mono">{r.code}<div className="d-cell-sub" style={{ fontFamily: 'var(--font-ar)' }}>{r.p.name[lang]}</div></td>
              <td className="d-cell-sub">{contractor}</td>
              <td className="mono">{r.start}</td>
              <td className="mono">{r.finish}</td>
              <td><DPill status={r.p.status} lang={lang} /></td>
              <td className="mono">{r.fin}%</td>
              <td className="mono">{window.fmtNum(r.p.cost)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div></div></div>
    </div>
  );
}

Object.assign(window, { DScheduleControl, DAlertsCenter, DProjectsAll, DContractsAll });
