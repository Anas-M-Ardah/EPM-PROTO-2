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
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const delayed = rowsAll.filter(r => r.delay > 0);
  const avgDelay = Math.round(delayed.reduce((a, r) => a + r.delay, 0) / (delayed.length || 1));
  const criticalTotal = rowsAll.reduce((a, r) => a + r.critical, 0);
  const onTrack = rowsAll.filter(r => r.delay === 0).length;
  const qn = q.trim().toLowerCase();
  const filtered = (filter === 'delayed' ? delayed : filter === 'critical' ? rowsAll.filter(r => r.critical > 0) : rowsAll)
    .filter(r => !qn || r.p.name[lang].toLowerCase().includes(qn) || r.p.id.toLowerCase().includes(qn));
  React.useEffect(() => { setPage(1); }, [filter, q, pageSize]);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const B = window.EPM.BRANCHES;

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx')]} onSearch={openCmdk} />
      <div className="d-canvas"><div className="d-canvas-pad"><div className="d-canvas-wrap">
        <DPageHead lang={lang}
          crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_schedule_control')]}
          title={t('nav_schedule_control')}
          sub={scopeWs ? scopeWs[lang] : (AR ? 'صحة الجداول الزمنية عبر المحفظة' : 'Portfolio-wide schedule health')}
          actions={<React.Fragment>
            <button className="d-btn" onClick={() => showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}><Icon name="ios_share" size={16} />{t('export')}</button>
            <button className="d-btn primary" onClick={() => showToast(AR ? 'استيراد Primavera — تجريبي' : 'Import Primavera — demo')}><Icon name="upload_file" size={16} />{AR ? 'استيراد P6' : 'Import P6'}</button>
          </React.Fragment>} />
        <div className="d-grid stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
          <DStat idx={0} val={avgDelay} suffix={AR ? ' يوم' : ' d'} lbl={t('sc_avg_delay')} foot={AR ? `عبر ${delayed.length} مشروعاً متأخراً` : `across ${delayed.length} delayed projects`} />
          <DStat idx={1} val={delayed.length} lbl={t('sc_delayed')} bar={rowsAll.length ? delayed.length / rowsAll.length * 100 : 0}
            delta={delayed.length ? (AR ? '▼ خلف الخط الأساس' : '▼ behind baseline') : (AR ? '▲ لا تأخير' : '▲ none')} deltaDir={delayed.length ? 'down' : 'up'}
            foot={rowsAll.length ? Math.round(delayed.length / rowsAll.length * 100) + (AR ? '% من المحفظة' : '% of portfolio') : '—'} />
          <DStat idx={2} val={criticalTotal} lbl={t('sc_critical')} foot={AR ? 'أنشطة على المسار الحرج' : 'Activities on the critical path'} />
          <DStat idx={3} val={onTrack} lbl={t('sc_ontrack')} bar={rowsAll.length ? onTrack / rowsAll.length * 100 : 0}
            delta={AR ? '▲ ضمن الخط الأساس' : '▲ on baseline'} deltaDir="up"
            foot={rowsAll.length ? Math.round(onTrack / rowsAll.length * 100) + (AR ? '% من المحفظة' : '% of portfolio') : '—'} />
        </div>
        <div className="d-tablewrap">
          <div className="d-toolbar">
            <div className="d-field">
              <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
              <input placeholder={AR ? 'بحث في المشاريع…' : 'Search projects…'} value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="grp">
              {[['all', AR ? 'الكل' : 'All', rowsAll.length], ['delayed', t('sc_delayed'), delayed.length], ['critical', t('sc_critical'), rowsAll.filter(r => r.critical > 0).length]].map(([f, lb, n]) => (
                <button key={f} className={`d-fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{lb}<span className="n">{n}</span></button>
              ))}
            </div>
            <div className="sp"></div>
            {(filter !== 'all' || q) && <button className="d-btn sm ghost" onClick={() => { setFilter('all'); setQ(''); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
            <span className="d-cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>{total} {AR ? 'نتيجة' : 'results'}</span>
          </div>
          <table className="d-table">
            <thead><tr>
              <th style={{ width: 108 }}>{AR ? 'الرمز' : 'Code'}</th>
              <th>{AR ? 'المشروع' : 'Project'}</th>
              <th>{AR ? 'الفرع' : 'Branch'}</th>
              <th>{AR ? 'إنجاز مخطط' : 'Baseline finish'}</th>
              <th>{AR ? 'إنجاز متوقع' : 'Forecast'}</th>
              <th className="r">{t('sc_avg_delay')}</th>
              <th className="r">{t('sc_critical')}</th>
              <th>{t('sc_import_status')}</th>
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.p.ws.id + r.p.id} onClick={() => openRow(r.p)} style={{ cursor: 'pointer' }}>
                <td className="mono d-cell-sub">{r.p.id}</td>
                <td className="d-cell-strong">{r.p.name[lang]}</td>
                <td className="d-cell-sub">{B[lang][r.p.branchIdx]}</td>
                <td className="num d-cell-sub">{r.plannedFinish}</td>
                <td className="num" style={{ color: r.delay > 0 ? 'var(--error)' : 'var(--on-surface-variant)' }}>{r.expectedFinish}</td>
                <td className="num r" style={{ color: r.delay > 0 ? 'var(--error)' : 'var(--status-completed-tx)', fontWeight: 600 }}>{r.delay > 0 ? '+' + r.delay + (AR ? ' ي' : 'd') : (AR ? 'لا' : '0')}</td>
                <td className="num r" style={{ color: r.critical > 0 ? 'var(--tertiary)' : 'var(--on-surface-variant)', fontWeight: r.critical > 0 ? 600 : 400 }}>{r.critical}</td>
                <td><span className={`d-pill ${r.imp === 'published' ? 'completed' : 'suspended'}`}>{r.imp === 'published' ? (AR ? 'منشور' : 'Published') : (AR ? 'بانتظار' : 'Pending')}</span></td>
              </tr>
            ))}</tbody>
          </table>
          <DPager lang={lang} page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>
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
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  // local acknowledge state — keyed per alert, overrides the seeded status
  const [ackMap, setAckMap] = React.useState(() => ({}));
  const statusOf = a => ackMap[a.p.id + a.id] || a.status;
  const ackOne = (e, a) => { e.stopPropagation(); const k = a.p.id + a.id;
    setAckMap(m => ({ ...m, [k]: statusOf(a) === 'ack' ? 'open' : 'ack' }));
    showToast(statusOf(a) === 'ack' ? (AR ? 'أُعيد فتح التنبيه' : 'Alert reopened') : (AR ? 'تم إقرار التنبيه' : 'Alert acknowledged')); };
  const SEV = window.ALERT_SEV || { red: { color: 'var(--error)' }, amber: { color: 'var(--status-suspended-tx)' }, green: { color: 'var(--status-completed-tx)' } };
  const counts = { red: feed.filter(a => a.sev === 'red').length, amber: feed.filter(a => a.sev === 'amber').length, green: feed.filter(a => a.sev === 'green').length,
    open: feed.filter(a => statusOf(a) === 'open').length, ack: feed.filter(a => statusOf(a) === 'ack').length };
  const qn = q.trim().toLowerCase();
  const filtered = feed.filter(a => (filter === 'all' ? true
      : filter === 'open' ? statusOf(a) === 'open'
      : filter === 'ack' ? statusOf(a) === 'ack'
      : a.sev === filter)
    && (!qn || a.title.toLowerCase().includes(qn) || a.p.name[lang].toLowerCase().includes(qn) || String(a.id).toLowerCase().includes(qn)));
  React.useEffect(() => { setPage(1); }, [filter, q, pageSize]);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  const stLabel = s => ({ open: AR ? 'مفتوح' : 'Open', ack: AR ? 'مُقَر' : 'Acknowledged', snoozed: AR ? 'مؤجل' : 'Snoozed' }[s]);
  const sevLabel = s => { const x = window.ALERT_SEV && window.ALERT_SEV[s]; return x ? x[AR ? 'ar' : 'en'] : s; };

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx')]} onSearch={openCmdk} />
      <div className="d-canvas"><div className="d-canvas-pad"><div className="d-canvas-wrap">
        <DPageHead lang={lang}
          crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_alerts_center')]}
          title={t('nav_alerts_center')}
          sub={scopeWs ? scopeWs[lang] : (AR ? 'التنبيهات والتصعيد عبر المحفظة' : 'Portfolio-wide alerts & escalation')}
          actions={<React.Fragment>
            <button className="d-btn" onClick={() => showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}><Icon name="ios_share" size={16} />{t('export')}</button>
            <button className="d-btn primary" onClick={() => showToast(AR ? 'ضبط القواعد — تجريبي' : 'Configure rules — demo')}><Icon name="settings" size={16} />{AR ? 'قواعد التنبيه' : 'Alert rules'}</button>
          </React.Fragment>} />
        {(() => {
          const pct = n => feed.length ? Math.round(n / feed.length * 100) : 0;
          const openOf = sev => feed.filter(a => a.sev === sev && statusOf(a) === 'open').length;
          const acked = counts.ack;
          const cards = [
            { key: 'red', tone: 'crit', icon: 'warning', lbl: AR ? 'حرِجة' : 'High severity', val: counts.red,
              insight: AR ? `${openOf('red')} مفتوحة · تتطلب تدخلاً فورياً` : `${openOf('red')} open · needs immediate action` },
            { key: 'amber', tone: 'warn', icon: 'error', lbl: AR ? 'متوسطة' : 'Medium', val: counts.amber,
              insight: AR ? `${openOf('amber')} مفتوحة · تحت المتابعة` : `${openOf('amber')} open · under watch` },
            { key: 'green', tone: 'info', icon: 'info', lbl: AR ? 'منخفضة' : 'Low', val: counts.green,
              insight: AR ? 'للعلم فقط — لا إجراء مطلوب' : 'Informational — no action' },
            { key: 'open', tone: 'open', icon: 'notifications', lbl: AR ? 'مفتوحة' : 'Open', val: counts.open,
              insight: AR ? `${acked} مُقَرّة من ${feed.length}` : `${acked} acknowledged of ${feed.length}` },
          ];
          return (
            <div className="d-sevcards">
              {cards.map(c => (
                <button key={c.key} className={`d-sevcard ${c.tone}${filter === c.key ? ' on' : ''}`}
                  aria-pressed={filter === c.key} onClick={() => setFilter(filter === c.key ? 'all' : c.key)}>
                  <span className="hd"><span className="ico"><Icon name={c.icon} size={18} /></span><span className="lbl">{c.lbl}</span></span>
                  <span className="val"><span className="num">{c.val}</span><span className="pc num">{pct(c.val)}%</span></span>
                  <span className="bar"><i style={{ width: pct(c.val) + '%' }}></i></span>
                  <span className="foot">{c.insight}</span>
                </button>
              ))}
            </div>
          );
        })()}
        <div className="d-tablewrap">
          <div className="d-toolbar">
            <div className="d-field">
              <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
              <input placeholder={AR ? 'بحث في التنبيهات…' : 'Search alerts…'} value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="grp">
              {[['all', AR ? 'الكل' : 'All', feed.length], ['open', AR ? 'غير مُقَرّة' : 'Unacknowledged', counts.open], ['ack', AR ? 'مُقَرّة' : 'Acknowledged', counts.ack], ['red', AR ? 'حرِجة' : 'High', counts.red], ['amber', AR ? 'متوسطة' : 'Medium', counts.amber], ['green', AR ? 'منخفضة' : 'Low', counts.green]].map(([f, lb, n]) => (
                <button key={f} className={`d-fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{lb}<span className="n">{n}</span></button>
              ))}
            </div>
            <div className="sp"></div>
            {(filter !== 'all' || q) && <button className="d-btn sm ghost" onClick={() => { setFilter('all'); setQ(''); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
            <span className="d-cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>{total} {AR ? 'نتيجة' : 'results'}</span>
          </div>
          <table className="d-table">
            <thead><tr>
              <th>{AR ? 'التنبيه' : 'Alert'}</th>
              <th>{AR ? 'المشروع' : 'Project'}</th>
              <th>{AR ? 'المصدر' : 'Source'}</th>
              <th style={{ width: 118 }}>{AR ? 'الخطورة' : 'Severity'}</th>
              <th style={{ width: 118 }}>{AR ? 'الحالة' : 'Status'}</th>
              <th>{AR ? 'التاريخ' : 'Raised'}</th>
              <th style={{ width: 116 }}></th>
            </tr></thead>
            <tbody>{shown.map((a, i) => {
              const st = statusOf(a), isAck = st === 'ack';
              return (
              <tr key={a.p.id + a.id + i} className={isAck ? 'is-ack' : ''} onClick={() => openRow(a.p)} style={{ cursor: 'pointer' }}>
                <td className="d-cell-strong">{a.title}</td>
                <td className="d-cell-sub">{a.p.name[lang]}</td>
                <td className="d-cell-sub">{a.src}</td>
                <td><span className="d-sevcell">{window.DSevDot ? <DSevDot sev={a.sev} lang={lang} size={15} /> : null}{sevLabel(a.sev)}</span></td>
                <td><span className={`d-pill ${st === 'open' ? 'stalled' : st === 'ack' ? 'completed' : 'suspended'}`}>{stLabel(st)}</span></td>
                <td className="num d-cell-sub">{a.when}</td>
                <td className="d-rowact">
                  <button className={'d-btn sm' + (isAck ? ' ghost' : '')} onClick={e => ackOne(e, a)}
                    title={isAck ? (AR ? 'إعادة الفتح' : 'Reopen') : (AR ? 'إقرار التنبيه' : 'Acknowledge')}>
                    <Icon name={isAck ? 'undo' : 'done'} size={14} />{isAck ? (AR ? 'إعادة فتح' : 'Reopen') : (AR ? 'إقرار' : 'Ack')}
                  </button>
                </td>
              </tr>
            );})}</tbody>
          </table>
          <DPager lang={lang} page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
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
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const filters = ['all', 'ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  const counts = {}; filters.forEach(f => counts[f] = f === 'all' ? all.length : all.filter(p => p.status === f).length);
  const qn = q.trim().toLowerCase();
  const filtered = all.filter(p => (filter === 'all' || p.status === filter) && (!qn || p.name[lang].toLowerCase().includes(qn) || p.id.toLowerCase().includes(qn)));
  React.useEffect(() => { setPage(1); }, [filter, q, pageSize]);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx')]} onSearch={openCmdk} />
      <div className="d-canvas"><div className="d-canvas-pad"><div className="d-canvas-wrap">
        <DPageHead lang={lang}
          crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), scopeWs ? t('nav_projects') : t('nav_projects_all')]}
          title={scopeWs ? t('nav_projects') : t('nav_projects_all')}
          sub={scopeWs ? scopeWs[lang] : (AR ? 'كل المشاريع عبر التشكيلات والجامعات' : 'All projects across entities & universities')}
          actions={<React.Fragment>
            <button className="d-btn" onClick={() => showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}><Icon name="ios_share" size={16} />{t('export')}</button>
            <button className="d-btn primary" onClick={() => showToast(AR ? 'مشروع جديد — تجريبي' : 'New project — demo')}><Icon name="add" size={16} />{t('new_project')}</button>
          </React.Fragment>} />
        <div className="d-tablewrap">
          <div className="d-toolbar">
            <div className="d-field">
              <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
              <input placeholder={AR ? 'بحث في المشاريع…' : 'Search projects…'} value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="grp">
              {filters.map(f => <button key={f} className={`d-fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}<span className="n">{counts[f]}</span></button>)}
            </div>
            <div className="sp"></div>
            {(filter !== 'all' || q) && <button className="d-btn sm ghost" onClick={() => { setFilter('all'); setQ(''); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
            <span className="d-cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>{total} {AR ? 'نتيجة' : 'results'}</span>
          </div>
          <table className="d-table">
          <thead><tr><th>{AR ? 'الرمز' : 'Code'}</th><th>{AR ? 'المشروع' : 'Project'}</th>{!scopeWs && <th>{AR ? 'مساحة العمل' : 'Workspace'}</th>}<th>{AR ? 'الفرع' : 'Branch'}</th><th>{AR ? 'الحالة' : 'Status'}</th><th>{AR ? 'الإنجاز' : 'Physical'}</th><th className="r">{AR ? 'الكلفة (د.ع)' : 'Cost (IQD)'}</th><th>{AR ? 'آخر تحديث' : 'Updated'}</th></tr></thead>
          <tbody>{rows.map(p => (
            <tr key={p.ws.id + p.id} onClick={() => openRow(p)} style={{ cursor: 'pointer' }}>
              <td className="mono d-cell-sub">{p.id}</td>
              <td className="d-cell-strong">{p.name[lang]}</td>
              {!scopeWs && <td className="d-cell-sub">{p.ws[lang]}</td>}
              <td className="d-cell-sub">{B[lang][p.branchIdx]}</td>
              <td><DPill status={p.status} lang={lang} /></td>
              <td><span className="d-mini-bar"><span className="t"><span style={{ width: p.tech + '%' }}></span></span><span className="pc">{p.tech}%</span></span></td>
              <td className="num r">{window.fmtNum(p.cost)}</td>
              <td className="num d-cell-sub">{p.updated}</td>
            </tr>
          ))}</tbody>
        </table>
        <DPager lang={lang} page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} /></div>
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
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const filters = ['all', 'ongoing', 'completed', 'stalled', 'suspended', 'withdrawn'];
  const counts = {}; filters.forEach(f => counts[f] = f === 'all' ? rowsAll.length : rowsAll.filter(r => r.p.status === f).length);
  const qn = q.trim().toLowerCase();
  const filtered = rowsAll.filter(r => (filter === 'all' || r.p.status === filter) && (!qn || r.p.name[lang].toLowerCase().includes(qn) || r.code.toLowerCase().includes(qn)));
  React.useEffect(() => { setPage(1); }, [filter, q, pageSize]);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const contractor = AR ? 'شركة الفرات للمقاولات' : 'Al-Furat Contracting';

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx')]} onSearch={openCmdk} />
      <div className="d-canvas"><div className="d-canvas-pad"><div className="d-canvas-wrap">
        <DPageHead lang={lang}
          crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_contracts_all')]}
          title={t('nav_contracts_all')}
          sub={scopeWs ? scopeWs[lang] : (AR ? 'كل العقود عبر المحفظة' : 'All contracts across the portfolio')}
          actions={<React.Fragment>
            <button className="d-btn" onClick={() => showToast(AR ? 'تصدير — تجريبي' : 'Export — demo')}><Icon name="ios_share" size={16} />{t('export')}</button>
            <button className="d-btn primary" onClick={() => showToast(AR ? 'عقد جديد — تجريبي' : 'New contract — demo')}><Icon name="add" size={16} />{AR ? 'عقد جديد' : 'New contract'}</button>
          </React.Fragment>} />
        <div className="d-tablewrap">
          <div className="d-toolbar">
            <div className="d-field">
              <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
              <input placeholder={AR ? 'بحث في العقود…' : 'Search contracts…'} value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="grp">
              {filters.map(f => <button key={f} className={`d-fchip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? t('all') : window.EPM.STATUS[f][lang]}<span className="n">{counts[f]}</span></button>)}
            </div>
            <div className="sp"></div>
            {(filter !== 'all' || q) && <button className="d-btn sm ghost" onClick={() => { setFilter('all'); setQ(''); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
            <span className="d-cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>{total} {AR ? 'نتيجة' : 'results'}</span>
          </div>
          <table className="d-table">
            <thead><tr>
              <th style={{ width: 118 }}>{AR ? 'الرمز' : 'Code'}</th>
              <th>{AR ? 'العقد' : 'Contract'}</th>
              <th>{AR ? 'المقاول' : 'Contractor'}</th>
              <th>{AR ? 'المباشرة' : 'Start'}</th>
              <th>{AR ? 'الإنجاز' : 'Finish'}</th>
              <th>{AR ? 'الحالة' : 'Status'}</th>
              <th className="r">{AR ? 'الإنجاز المالي' : 'Financial'}</th>
              <th className="r">{AR ? 'قيمة العقد (د.ع)' : 'Value (IQD)'}</th>
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.ws.id + r.p.id} onClick={() => openRow(r)} style={{ cursor: 'pointer' }}>
                <td className="mono d-cell-sub">{r.code}</td>
                <td className="d-cell-strong">{r.p.name[lang]}</td>
                <td className="d-cell-sub">{contractor}</td>
                <td className="num d-cell-sub">{r.start}</td>
                <td className="num d-cell-sub">{r.finish}</td>
                <td><DPill status={r.p.status} lang={lang} /></td>
                <td className="num r">{r.fin}%</td>
                <td className="num r">{window.fmtNum(r.p.cost)}</td>
              </tr>
            ))}</tbody>
          </table>
          <DPager lang={lang} page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>
      </div></div></div>
    </div>
  );
}

Object.assign(window, { DScheduleControl, DAlertsCenter, DProjectsAll, DContractsAll });
