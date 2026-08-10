/* ============================================================
   EPM — Alerts engine (IA §17): severity summary, filterable
   alert list, detail panel with escalation timeline + acknowledge
   / snooze / deep-link, and a configurable alert-rules sub-view
   (severity, channels, recurring reminder, escalation). Backend
   delivery (email/SMS) is simulated and labelled honestly.
   ============================================================ */

const ALERT_SEV = {
  red: { ar: 'حرِج', en: 'High', color: 'var(--error)', cls: 'stalled' },
  amber: { ar: 'متوسط', en: 'Medium', color: 'var(--status-suspended-tx)', cls: 'suspended' },
  green: { ar: 'منخفض', en: 'Low', color: 'var(--status-completed-tx)', cls: 'completed' },
};

function DAlertSev({ sev, lang }) {
  const s = ALERT_SEV[sev];
  return <span className="d-alert-sev" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}><i style={{ background: s.color }}></i>{s[lang]}</span>;
}

function DModAlerts({ t, lang, p, showToast }) {
  const AR = lang === 'ar';
  const ad = React.useMemo(() => window.EPM.buildAlertsData(p, lang), [p && p.id, lang]);
  const [view, setView] = React.useState('inbox');
  const [rows, setRows] = React.useState(ad.alerts);
  const [rules, setRules] = React.useState(ad.rules);
  const [selId, setSelId] = React.useState(ad.alerts[0] ? ad.alerts[0].id : null);
  const [filter, setFilter] = React.useState('all');
  React.useEffect(() => { setRows(ad.alerts); setRules(ad.rules); setSelId(ad.alerts[0] ? ad.alerts[0].id : null); }, [ad]);

  const counts = { red: rows.filter(a => a.sev === 'red').length, amber: rows.filter(a => a.sev === 'amber').length, green: rows.filter(a => a.sev === 'green').length, open: rows.filter(a => a.status === 'open').length };
  const shown = rows.filter(a => filter === 'all' || (filter === 'open' ? a.status === 'open' : a.sev === filter));
  const sel = rows.find(a => a.id === selId);
  const setStatus = (id, status, msg) => { setRows(rs => rs.map(a => a.id === id ? { ...a, status } : a)); showToast(msg); };
  const stLabel = s => ({ open: AR ? 'مفتوح' : 'Open', ack: AR ? 'مُقَر' : 'Acknowledged', snoozed: AR ? 'مؤجل' : 'Snoozed' }[s]);

  return (
    <React.Fragment>
      <div className="d-model-topbar">
        <div className="d-section-title" style={{ margin: 0 }}>{t('mod_alerts')}</div>
        <div style={{ flex: 1 }}></div>
        <div className="d-seg">
          <button className={view === 'inbox' ? 'on' : ''} onClick={() => setView('inbox')}><Icon name="notifications" size={14} />{AR ? 'التنبيهات' : 'Alerts'}</button>
          <button className={view === 'rules' ? 'on' : ''} onClick={() => setView('rules')}><Icon name="settings" size={14} />{AR ? 'القواعد' : 'Rules'}</button>
        </div>
      </div>

      {view === 'inbox' && (
        <React.Fragment>
          <div className="d-fig-row" >
            <button className="d-fig as-btn" onClick={() => setFilter('red')} style={{ borderColor: filter === 'red' ? 'var(--error)' : '' }}><div className="k">{AR ? 'حرِجة' : 'High'}</div><div className="v" style={{ color: 'var(--error)' }}>{counts.red}</div></button>
            <button className="d-fig as-btn" onClick={() => setFilter('amber')} style={{ borderColor: filter === 'amber' ? 'var(--warning)' : '' }}><div className="k">{AR ? 'متوسطة' : 'Medium'}</div><div className="v" style={{ color: 'var(--status-suspended-tx)' }}>{counts.amber}</div></button>
            <button className="d-fig as-btn" onClick={() => setFilter('green')} style={{ borderColor: filter === 'green' ? 'var(--success)' : '' }}><div className="k">{AR ? 'منخفضة' : 'Low'}</div><div className="v" style={{ color: 'var(--status-completed-tx)' }}>{counts.green}</div></button>
            <button className="d-fig as-btn" onClick={() => setFilter('open')} style={{ borderColor: filter === 'open' ? 'var(--primary)' : '' }}><div className="k">{AR ? 'مفتوحة' : 'Open'}</div><div className="v">{counts.open}</div></button>
          </div>

          <div className="d-alert-split">
            <div className="d-alert-list">
              {filter !== 'all' && <button className="d-btn sm ghost" style={{ margin: '0 0 10px' }} onClick={() => setFilter('all')}><Icon name="close" size={13} />{AR ? 'إزالة التصفية' : 'Clear filter'}</button>}
              {shown.map(a => (
                <button key={a.id} className={`d-alert-item ${selId === a.id ? 'on' : ''}`} onClick={() => setSelId(a.id)}>
                  <span className="d-alert-dot" style={{ background: ALERT_SEV[a.sev].color }}></span>
                  <div className="d-alert-item-main">
                    <b>{a.title}</b>
                    <span className="sub"><span className="mono">{a.id}</span> · {a.src} · <span className="mono">{a.when}</span></span>
                  </div>
                  <span className={`d-pill ${a.status === 'open' ? 'ongoing' : a.status === 'ack' ? 'completed' : 'suspended'}`} style={{ height: 20, flex: 'none' }}>{stLabel(a.status)}</span>
                </button>
              ))}
            </div>

            {sel && (
              <div className="d-alert-detail">
                <div className="d-alert-detail-head">
                  <DAlertSev sev={sel.sev} lang={lang} />
                  <span className="mono d-cell-sub">{sel.id}</span>
                </div>
                <h3>{sel.title}</h3>
                <div className="d-dl" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 16 }}>
                  <div className="d-dl-i"><span className="k">{AR ? 'النوع' : 'Type'}</span><span className="v">{sel.type}</span></div>
                  <div className="d-dl-i"><span className="k">{AR ? 'المصدر' : 'Source'}</span><span className="v">{sel.src}</span></div>
                  <div className="d-dl-i"><span className="k">{AR ? 'التاريخ' : 'Raised'}</span><span className="v mono">{sel.when}</span></div>
                  <div className="d-dl-i"><span className="k">{AR ? 'مهلة الاستجابة' : 'SLA'}</span><span className="v">{sel.sla}</span></div>
                </div>
                <button className="d-linkrow" style={{ marginBottom: 16 }} onClick={() => showToast(AR ? 'فتح السجل المصدر — تجريبي' : 'Open source record — demo')}><Icon name="open_in_full" size={14} /><span>{AR ? 'الانتقال إلى السجل المصدر' : 'Go to source record'}</span><Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></button>

                <b className="d-rev-title">{AR ? 'مسار التصعيد' : 'Escalation timeline'}</b>
                <div className="d-esc">
                  {sel.esc.map((e, i) => (
                    <div key={i} className={`d-esc-i ${e.done ? 'done' : ''}`}>
                      <span className="d-esc-dot"><Icon name={e.done ? 'check' : 'pending'} size={11} /></span>
                      <div className="d-esc-tx"><b>{e.role}</b><span className="mono">{e.at}</span></div>
                      <span className="d-esc-lvl">{AR ? 'مستوى' : 'L'} {i + 1}</span>
                    </div>
                  ))}
                </div>

                <div className="d-alert-actions">
                  {sel.status !== 'ack' && <button className="d-btn sm primary" onClick={() => setStatus(sel.id, 'ack', AR ? 'تم الإقرار' : 'Acknowledged')}><Icon name="done" size={14} />{AR ? 'إقرار' : 'Acknowledge'}</button>}
                  {sel.status !== 'snoozed' && <button className="d-btn sm" onClick={() => setStatus(sel.id, 'snoozed', AR ? 'تم التأجيل ليومين' : 'Snoozed 2 days')}><Icon name="schedule" size={14} />{AR ? 'تأجيل' : 'Snooze'}</button>}
                  <button className="d-btn sm ghost" onClick={() => showToast(AR ? 'تعيين مسؤول — تجريبي' : 'Assign — demo')}><Icon name="person_add" size={14} />{AR ? 'تعيين' : 'Assign'}</button>
                </div>
              </div>
            )}
          </div>
        </React.Fragment>
      )}

      {view === 'rules' && (
        <React.Fragment>
          <div className="d-callout" style={{ marginBottom: 14 }}>
            <span className="d-callout-ico"><Icon name="info" size={18} /></span>
            <div className="d-callout-tx"><b style={{ fontSize: 13 }}>{AR ? 'قنوات التسليم (بريد/SMS) محاكاة، والتنبيهات المتكررة تُجمَّع وتُزال تكراراتها تلقائياً.' : 'Delivery channels (email/SMS) are simulated; repeat alerts are grouped and deduplicated automatically.'}</b></div>
          </div>
          <div className="d-card-sub">
            {rules.map((r, i) => (
              <div key={r.id} className="d-rule-row" style={{ borderBottom: i < rules.length - 1 ? '1px solid var(--surface-container-high)' : 'none', opacity: r.enabled ? 1 : 0.55 }}>
                <button className={`d-switch ${r.enabled ? 'on' : ''}`} onClick={() => setRules(rs => rs.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x))}></button>
                <div className="d-rule-main">
                  <div className="d-rule-t"><b>{r.name}</b><DAlertSev sev={r.sev} lang={lang} /></div>
                  <span className="d-rule-sub">{AR ? 'المُطلِق' : 'Trigger'}: {r.trigger} · {AR ? 'تكرار' : 'Repeat'}: {r.recurring} · {AR ? 'تصعيد بعد' : 'Escalate after'}: {r.escalateAfter}</span>
                </div>
                <div className="d-rule-ch">
                  {[['inapp', 'notifications', AR ? 'داخل النظام' : 'In-app'], ['email', 'forward_to_inbox', AR ? 'بريد' : 'Email'], ['sms', 'chat', 'SMS']].map(([k, ic, lb]) => (
                    <span key={k} className={`d-ch ${r.channels[k] ? 'on' : ''}`} title={lb}><Icon name={ic} size={14} /></span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { DModAlerts, DAlertSev, ALERT_SEV });
