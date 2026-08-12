/* ============================================================
   EPM — Alerts engine (IA §17): severity summary, filterable
   alert list, detail panel with escalation timeline + acknowledge
   / snooze / deep-link, and a configurable alert-rules sub-view
   (severity, channels, recurring reminder, escalation). Backend
   delivery (email/SMS) is simulated and labelled honestly.
   ============================================================ */

const ALERT_SEV = {
  red: { ar: 'حرِج', en: 'High', color: 'var(--error)', cls: 'stalled', icon: 'warning' },
  amber: { ar: 'متوسط', en: 'Medium', color: 'var(--status-suspended-tx)', cls: 'suspended', icon: 'error' },
  green: { ar: 'منخفض', en: 'Low', color: 'var(--status-completed-tx)', cls: 'completed', icon: 'info' },
};
window.ALERT_SEV = ALERT_SEV;

// severity marker = shape (per-severity glyph) + colour + accessible label — never colour alone
function DSevDot({ sev, lang, size }) {
  const s = ALERT_SEV[sev] || ALERT_SEV.amber;
  return <span className="d-sev-dot" role="img" aria-label={s[lang === 'ar' ? 'ar' : 'en']} title={s[lang === 'ar' ? 'ar' : 'en']} style={{ color: s.color }}><Icon name={s.icon} size={size || 15} /></span>;
}
window.DSevDot = DSevDot;

function DAlertSev({ sev, lang }) {
  const s = ALERT_SEV[sev];
  return <span className="d-alert-sev" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}><Icon name={s.icon} size={13} />{s[lang]}</span>;
}

/* L22 — inbox / alert centre. "Distinct from L05 because it is ordered by
   urgency to ME, not by a data column." The grouping is fixed and is never
   user-sortable: the point of an inbox is that the system decides priority. */
function DModAlerts({ t, lang, p, showToast, asOf, frameTitle, frameActions, goTab }) {
  const AR = lang === 'ar';
  const ad = React.useMemo(() => window.EPM.buildAlertsData(p, lang), [p && p.id, lang]);
  const [rows, setRows] = React.useState(ad.alerts);
  const [rules, setRules] = React.useState(ad.rules);
  const [selId, setSelId] = React.useState(null);
  const [sev, setSev] = React.useState('all');
  const [wide, setWide] = React.useState(false);
  const [view, setView] = React.useState('inbox');
  const [batch, setBatch] = React.useState({});
  const [note, setNote] = React.useState('');
  React.useEffect(() => { setRows(ad.alerts); setRules(ad.rules); setSelId(null); setBatch({}); }, [ad]);

  const NOW = (window.EPM && window.EPM.DATA_DATE) || '2026-07-22';
  const days = iso => Math.round((new Date(iso) - new Date(NOW)) / 86400000);
  // a disabled rule suppresses the alerts it produced
  const enabled = rules.filter(r => r.enabled).map(r => r.id);
  const live = rows.filter(a => !a.ruleId || enabled.indexOf(a.ruleId) >= 0);
  const counts = { all: live.length, red: live.filter(a => a.sev === 'red').length,
    amber: live.filter(a => a.sev === 'amber').length, green: live.filter(a => a.sev === 'green').length };
  const shown = live.filter(a => sev === 'all' || a.sev === sev);

  /* The fixed order. It never changes and is never user-sortable. */
  const GROUPS = [
    { id: 'overdue', ar: 'متأخرة', en: 'Overdue', ico: 'priority_high', tone: 'bad',
      test: a => !a.delegated && days(a.due) < 0 },
    { id: 'today', ar: 'مستحقة اليوم', en: 'Due today', ico: 'today', tone: 'warn',
      test: a => !a.delegated && days(a.due) === 0 },
    { id: 'week', ar: 'خلال هذا الأسبوع', en: 'Due this week', ico: 'date_range', tone: '',
      test: a => !a.delegated && days(a.due) > 0 && days(a.due) <= 7 },
    { id: 'later', ar: 'لاحقاً', en: 'Later', ico: 'schedule', tone: '',
      test: a => !a.delegated && days(a.due) > 7 },
    { id: 'delegated', ar: 'مُفوَّضة لي', en: 'Delegated to me', ico: 'assignment_ind', tone: '',
      test: a => !!a.delegated },
  ];
  const grouped = GROUPS.map(g => ({ ...g, items: shown.filter(g.test) })).filter(g => g.items.length);
  const needsAction = live.filter(a => a.status === 'open' && days(a.due) <= 0).length;
  const sel = live.find(a => a.id === selId) || null;
  const ruleOf = a => rules.find(r => r.id === a.ruleId) || null;

  const act = (id, status, msg) => { setRows(rs => rs.map(a => a.id === id ? { ...a, status } : a)); showToast(msg); };
  const stLabel = st => ({ open: AR ? 'مفتوح' : 'Open', ack: AR ? 'مُقَر' : 'Acknowledged', snoozed: AR ? 'مؤجل' : 'Snoozed' }[st]);
  const stCls = st => st === 'open' ? 'ongoing' : st === 'ack' ? 'completed' : 'suspended';
  const dueLabel = a => { const n = days(a.due);
    return n < 0 ? (AR ? 'متأخر ' + (-n) + ' يوم' : (-n) + ' days overdue')
      : n === 0 ? (AR ? 'يستحق اليوم' : 'due today')
      : (AR ? 'خلال ' + n + ' يوم' : 'in ' + n + ' days'); };

  /* Bulk acting is permitted only for same-type, same-step items, and the one
     comment is recorded on each record individually. */
  const batchIds = Object.keys(batch).filter(k => batch[k]);
  const batchRows = live.filter(a => batchIds.indexOf(a.id) >= 0);
  const batchType = batchRows.length ? batchRows[0].type : null;
  const batchOk = batchRows.length > 1 && batchRows.every(a => a.type === batchType && a.status === batchRows[0].status);
  const runBatch = (status) => {
    setRows(rs => rs.map(a => batchIds.indexOf(a.id) >= 0 ? { ...a, status } : a));
    showToast(AR ? 'طُبِّق الإجراء على ' + batchIds.length + ' تنبيهاً، وسُجّل التعليق على كلٍّ منها' : 'Applied to ' + batchIds.length + ' alerts; the comment is recorded on each');
    setBatch({}); setNote('');
  };
  const kv = (k, v) => <div className="d-form-i"><span className="k">{k}</span><span className="v">{v}</span></div>;

  return (
    <DModuleFrame
      title={frameTitle || t('mod_alerts')}
      sub={needsAction > 0
        ? (AR ? needsAction + ' تحتاج إجراءً الآن' : needsAction + ' need action now')
        : (AR ? 'لا شيء متأخر' : 'nothing overdue')}
      tabs={view === 'inbox' ? [
        { id: 'all', label: AR ? 'الكل' : 'All', n: counts.all },
        { id: 'red', label: AR ? 'حرجة' : 'Critical', n: counts.red },
        { id: 'amber', label: AR ? 'متوسطة' : 'Medium', n: counts.amber },
        { id: 'green', label: AR ? 'منخفضة' : 'Low', n: counts.green },
      ] : null}
      tab={sev} onTab={setSev}
      toolbar={
        <div className="d-seg">
          <button className={view === 'inbox' ? 'on' : ''} onClick={() => setView('inbox')}>
            <Icon name="notifications" size={14} />{AR ? 'التنبيهات' : 'Alerts'}</button>
          <button className={view === 'rules' ? 'on' : ''} onClick={() => { setView('rules'); setSelId(null); }}>
            <Icon name="settings" size={14} />{AR ? 'القواعد' : 'Rules'}</button>
        </div>}
      actions={frameActions}
      aside={sel ? (
        <DRecordPane lang={lang} wide={wide} onExpand={() => setWide(w => !w)}
          title={sel.title}
          meta={[
            { k: AR ? 'الرقم' : 'No.', v: sel.id, num: true },
            { k: AR ? 'الخطورة' : 'Severity', v: <DAlertSev sev={sel.sev} lang={lang} /> },
            { k: AR ? 'الاستحقاق' : 'Due', v: dueLabel(sel) },
            { k: AR ? 'الحالة' : 'Status', v: <span className={'d-pill ' + stCls(sel.status)}>{stLabel(sel.status)}</span> },
          ]}
          onClose={() => { setSelId(null); setWide(false); }}
          footer={<React.Fragment>
            {sel.status === 'open' && <button className="d-btn sm primary"
              onClick={() => act(sel.id, 'ack', AR ? 'أُقِرَّ التنبيه' : 'Alert acknowledged')}>
              <Icon name="check" size={15} />{AR ? 'إقرار' : 'Acknowledge'}</button>}
            {sel.status !== 'snoozed' && <button className="d-btn sm"
              onClick={() => act(sel.id, 'snoozed', AR ? 'أُجِّل التنبيه' : 'Alert snoozed')}>
              <Icon name="schedule" size={15} />{AR ? 'تأجيل' : 'Snooze'}</button>}
            <span className="sp"></span>
            <button className="d-btn sm" onClick={() => (goTab ? goTab(sel.tab) : showToast(AR ? 'فتح السجل المصدر' : 'Opening the source record'))}>
              <Icon name="open_in_full" size={15} />{AR ? 'السجل المصدر' : 'Source record'}</button>
          </React.Fragment>}>

          {/* the required action, first, because it is why this item exists */}
          <DMsgBar tone={days(sel.due) < 0 ? 'danger' : days(sel.due) === 0 ? 'warning' : 'info'}
            icon="task_alt" title={AR ? 'الإجراء المطلوب' : 'Required action'}>
            {sel.action} — <b>{dueLabel(sel)}</b>
            {sel.delegated && (AR ? ' · مُفوَّض إليك' : ' · delegated to you')}
          </DMsgBar>

          <DRecordGrp label={AR ? 'مصدر التنبيه' : 'Where this came from'}>
            <div className="d-form-grid">
              {kv(AR ? 'النوع' : 'Type', sel.type)}
              {kv(AR ? 'المصدر' : 'Source', sel.src)}
              {kv(AR ? 'تاريخ الإطلاق' : 'Raised', <span className="num">{sel.when}</span>)}
              {kv(AR ? 'الاستحقاق' : 'Due', <span className="num">{sel.due}</span>)}
              {kv(AR ? 'القاعدة' : 'Rule', ruleOf(sel) ? ruleOf(sel).id + ' · ' + ruleOf(sel).name : '—')}
              {kv(AR ? 'شرط الإطلاق' : 'Trigger', ruleOf(sel) ? ruleOf(sel).trigger : '—')}
            </div>
          </DRecordGrp>

          {/* where the item IS an approval, the decision panel is exposed so the
              user can act without leaving the queue */}
          {sel.approval && (
            <DRecordGrp label={AR ? 'القرار' : 'Decision'}>
              <DMsgBar tone="info" icon="alt_route" title={AR ? 'ماذا سيحدث بعد ذلك' : 'What happens next'}>
                {AR ? 'ينتقل الأمر إلى المرحلة التالية ويُشعَر أصحابها، ويُقفل هذا التنبيه تلقائياً.'
                    : 'The order moves to its next stage, its owners are notified, and this alert closes itself.'}
              </DMsgBar>
              <div className="d-rowacts">
                <button className="d-btn sm primary" onClick={() => { act(sel.id, 'ack', AR ? 'اعتُمد من مركز التنبيهات' : 'Approved from the alert centre'); if (goTab) goTab('changeorders'); }}>
                  <Icon name="check_circle" size={15} />{AR ? 'اعتماد' : 'Approve'}</button>
                <button className="d-btn sm" onClick={() => (goTab ? goTab('changeorders') : null)}>
                  <Icon name="account_tree" size={15} />{AR ? 'فتح مسار الاعتماد' : 'Open the approval path'}</button>
              </div>
            </DRecordGrp>)}

          <DRecordGrp label={AR ? 'مسار التصعيد' : 'Escalation path'}>
            <div className="d-trail">
              {sel.esc.map((e, i) => (
                <div className={'d-tstep' + (e.done ? '' : ' pend')} key={i}>
                  <span className="tdot"><Icon name={e.done ? 'check' : 'schedule'} size={11} /></span>
                  <div className="th"><span>{e.role}</span><time className="tm">{e.at}</time></div>
                  <div className="tb">{e.done ? (AR ? 'أُشعِر' : 'Notified') : (AR ? 'يُشعَر إن لم يُتَّخذ إجراء' : 'Notified if no action is taken')}</div>
                </div>))}
            </div>
          </DRecordGrp>
        </DRecordPane>
      ) : null}
      asideWide={wide}
      status={<DZ10 lang={lang} asOf={asOf} stats={[
        { k: AR ? 'التنبيهات' : 'Alerts', v: shown.length + ' / ' + live.length },
        { k: AR ? 'تحتاج إجراءً' : 'Need action', v: needsAction },
        { k: AR ? 'حرجة' : 'Critical', v: counts.red },
        { k: AR ? 'محدد' : 'Selected', v: batchIds.length },
      ]} />}>

      {view === 'rules' ? (
        <DFGroup id="al-rules" flush title={AR ? 'قواعد التنبيه' : 'Alert rules'}
          sub={rules.filter(r => r.enabled).length + (AR ? ' مفعّلة من ' : ' enabled of ') + rules.length}>
          <DMsgBar tone="info" icon="rule" title={AR ? 'القاعدة هي مصدر التنبيه' : 'The rule is what produces the alert'}>
            {AR ? 'إيقاف قاعدة يوقف التنبيهات التي أنتجتها فوراً — التنبيه ليس سجلاً مستقلاً يُحرَّر.'
                : 'Disabling a rule immediately withdraws the alerts it produced — an alert is not a record edited on its own.'}
          </DMsgBar>
          <div className="d-vow-tw"><table className="d-line-table"><thead><tr>
            <th style={{ width: 74 }}>{AR ? 'الرمز' : 'Code'}</th>
            <th style={{ minWidth: 220 }}>{AR ? 'القاعدة' : 'Rule'}</th>
            <th style={{ minWidth: 190 }}>{AR ? 'شرط الإطلاق' : 'Trigger'}</th>
            <th style={{ width: 110 }}>{AR ? 'الخطورة' : 'Severity'}</th>
            <th style={{ width: 150 }}>{AR ? 'القنوات' : 'Channels'}</th>
            <th style={{ width: 110 }}>{AR ? 'التكرار' : 'Recurrence'}</th>
            <th style={{ width: 128 }}>{AR ? 'التصعيد بعد' : 'Escalate after'}</th>
            <th style={{ width: 110 }}>{AR ? 'الحالة' : 'Status'}</th></tr></thead>
            <tbody>{rules.map(r => (
              <tr key={r.id}>
                <td className="code">{r.id}</td>
                <td className="name wrap">{r.name}</td>
                <td className="d-cell-sub wrap">{r.trigger}</td>
                <td><DAlertSev sev={r.sev} lang={lang} /></td>
                <td className="d-cell-sub">{[r.channels.inapp && (AR ? 'داخل النظام' : 'in-app'),
                  r.channels.email && (AR ? 'بريد' : 'email'), r.channels.sms && (AR ? 'رسالة' : 'SMS')].filter(Boolean).join(' · ')}</td>
                <td className="d-cell-sub">{r.recurring}</td>
                <td className="d-cell-sub">{r.escalateAfter}</td>
                <td><button className={'d-fchip' + (r.enabled ? ' on' : '')} aria-pressed={r.enabled}
                  onClick={() => { setRules(rs => rs.map(x => x.id === r.id ? { ...x, enabled: !x.enabled } : x));
                    showToast(r.enabled ? (AR ? 'أُوقفت القاعدة وسُحبت تنبيهاتها' : 'Rule disabled; its alerts are withdrawn')
                                        : (AR ? 'فُعِّلت القاعدة' : 'Rule enabled')); }}>
                  {r.enabled ? (AR ? 'مفعّلة' : 'Enabled') : (AR ? 'موقوفة' : 'Disabled')}</button></td>
              </tr>))}</tbody>
          </table></div>
        </DFGroup>
      ) : live.length === 0 ? (
        /* an empty inbox is a SUCCESS state, not "no records found" */
        <DFGroup id="al-zero" title={AR ? 'صندوق التنبيهات' : 'Alert inbox'}>
          <div className="d-empty ok">
            <span className="d-empty-ico ok"><Icon name="check_circle" size={26} /></span>
            <b>{AR ? 'لا شيء ينتظر إجراءك' : 'Nothing is waiting on you'}</b>
            <span>{AR ? 'لا قاعدة تُطلِق تنبيهاً على بيانات هذا المشروع عند تاريخ البيانات — وهذه حالة سليمة، لا نتيجة فارغة.'
                      : 'No rule is firing on this project’s data at the data date. That is a healthy state, not an empty result.'}</span>
        </div>
        </DFGroup>
      ) : (
        <React.Fragment>
          {batchIds.length > 0 && (
            <DFGroup id="al-batch" title={AR ? 'إجراء جماعي' : 'Bulk action'}
              sub={batchIds.length + (AR ? ' محدد' : ' selected')}>
              {batchOk ? (
                <React.Fragment>
                  <DMsgBar tone="info" icon="checklist" title={AR ? 'تعليق واحد يُسجَّل على كل سجل' : 'One comment, recorded on each record'}>
                    {AR ? 'العناصر المحددة من النوع نفسه وفي الخطوة نفسها، فيمكن البتّ فيها معاً؛ ويُسجَّل التعليق على كل سجل على حدة.'
                        : 'The selected items share a type and a step, so they can be actioned together; the comment is written to each record separately.'}
                  </DMsgBar>
                  <div className="d-form-field f-full">
                    <label htmlFor="al-note">{AR ? 'التعليق' : 'Comment'}</label>
                    <textarea id="al-note" rows={2} className="d-form-input" value={note}
                      onChange={e => setNote(e.target.value)}></textarea>
                  </div>
                  <div className="d-rowacts">
                    <button className="d-btn sm primary" onClick={() => runBatch('ack')}>
                      <Icon name="check" size={15} />{AR ? 'إقرار الكل' : 'Acknowledge all'}</button>
                    <button className="d-btn sm" onClick={() => runBatch('snoozed')}>
                      <Icon name="schedule" size={15} />{AR ? 'تأجيل الكل' : 'Snooze all'}</button>
                    <span className="sp"></span>
                    <button className="d-btn sm ghost" onClick={() => { setBatch({}); setNote(''); }}>
                      <Icon name="close" size={13} />{AR ? 'إلغاء التحديد' : 'Clear selection'}</button>
                  </div>
                </React.Fragment>
              ) : (
                <DMsgBar tone="warning" title={AR ? 'لا يمكن البتّ جماعياً' : 'These cannot be actioned together'}>
                  {AR ? 'الإجراء الجماعي مسموح فقط لعناصر من النوع نفسه وفي الخطوة نفسها. اختر عناصر متجانسة أو عالج كلاً منها على حدة.'
                      : 'A bulk action is permitted only for items of the same type at the same step. Pick homogeneous items, or act on each one on its own.'}
                </DMsgBar>
              )}
            </DFGroup>)}

          {grouped.map(g => (
            <DFGroup key={g.id} id={'al-' + g.id} flush
              title={AR ? g.ar : g.en} sub={String(g.items.length)}>
              <ul className="d-inbox">
                {g.items.map(a => (
                  <li key={a.id} className={(selId === a.id ? 'on ' : '') + (g.tone || '')}>
                    <input type="checkbox" aria-label={(AR ? 'تحديد ' : 'Select ') + a.id}
                      checked={!!batch[a.id]} onChange={e => setBatch(o => ({ ...o, [a.id]: e.target.checked ? 1 : 0 }))} />
                    <button className="it" onClick={() => setSelId(a.id)}>
                      <DSevDot sev={a.sev} lang={lang} />
                      <span className="bd">
                        <span className="t"><span className="no">{a.id}</span><b>{a.title}</b></span>
                        {/* the required action, as a verb */}
                        <span className="ac"><Icon name="task_alt" size={13} />{a.action}</span>
                        <span className="mt">
                          <span className={'due' + (g.id === 'overdue' ? ' bad' : g.id === 'today' ? ' warn' : '')}>{dueLabel(a)}</span>
                          <span>·</span><span>{a.src}</span>
                          <span>·</span><span>{ruleOf(a) ? ruleOf(a).id : '—'}</span>
                        </span>
                      </span>
                      <span className={'d-pill ' + stCls(a.status)}>{stLabel(a.status)}</span>
                    </button>
                    {/* one primary action, inline */}
                    {a.status === 'open'
                      ? <button className="d-btn sm primary" onClick={() => act(a.id, 'ack', AR ? 'أُقِرَّ ' + a.id : a.id + ' acknowledged')}>
                          <Icon name="check" size={15} />{AR ? 'إقرار' : 'Acknowledge'}</button>
                      : <button className="d-btn sm" onClick={() => setSelId(a.id)}>
                          <Icon name="visibility" size={15} />{AR ? 'عرض' : 'View'}</button>}
                  </li>))}
              </ul>
            </DFGroup>))}

          {grouped.length === 0 && (
            <DFGroup id="al-none" title={AR ? 'صندوق التنبيهات' : 'Alert inbox'}>
              <div className="d-empty">
                <span className="d-empty-ico"><Icon name="filter_alt_off" size={26} /></span>
                <b>{AR ? 'لا تنبيهات بهذه الخطورة' : 'No alerts at this severity'}</b>
                <span>{AR ? 'اختر «الكل» لعرض صندوق التنبيهات كاملاً.' : 'Choose “All” to see the whole inbox.'}</span>
                <button className="d-btn sm" onClick={() => setSev('all')}>{AR ? 'عرض الكل' : 'Show all'}</button>
              </div>
            </DFGroup>)}
        </React.Fragment>
      )}
    </DModuleFrame>
  );
}

Object.assign(window, { DModAlerts, DAlertSev, ALERT_SEV });
