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
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', height: 'auto', direction: 'ltr' }}>
      <defs><linearGradient id="repArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.24"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((g, i) => <line key={i} x1="0" y1={h * g} x2={w} y2={h * g} stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray="3 5" opacity="0.5"/>)}
      <path d={area} fill="url(#repArea)"/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="3.5" fill="var(--surface-container-lowest)" stroke={color} strokeWidth="2"/>)}
    </svg>
  );
}

// column chart — uniform scale, value axis, gridlines, value labels
function DBars({ data, h = 210 }) {
  const W = 600, H = h, padL = 40, padR = 12, padT = 22, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(...data.map(d => d.v), 1);
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const nice = Math.max(1, pow * Math.ceil(max / pow));
  const slot = iw / data.length, barW = Math.min(46, slot * 0.5);
  const y = v => padT + ih - (v / nice) * ih;
  const cx = i => padL + slot * i + slot / 2;
  const ticks = [0, 0.5, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', height: 'auto', direction: 'ltr' }}>
      {ticks.map((tk, i) => {
        const yy = padT + ih - tk * ih;
        return (<g key={i}>
          <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray={tk === 0 ? '0' : '2 4'} opacity={tk === 0 ? 1 : .7} />
          <text x={padL - 7} y={yy + 3.5} textAnchor="end" fontSize="10" fill="var(--on-surface-variant)">{Math.round(nice * tk)}</text>
        </g>);
      })}
      {data.map((d, i) => {
        const bh = Math.max(2, (d.v / nice) * ih);
        return (<g key={i}>
          <rect x={cx(i) - barW / 2} y={y(d.v)} width={barW} height={bh} rx="4" fill={d.color || 'var(--viz-1)'} />
          <text x={cx(i)} y={y(d.v) - 7} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--on-surface)">{d.v}</text>
        </g>);
      })}
    </svg>
  );
}

/* ============================================================
   REPORTS & ANALYTICS (desktop)
   ============================================================ */
function DReports({ t, lang, openCmdk, showToast, openWorkspace, scopeWs, onOpenProject }) {
  const AR = lang === 'ar';
  const WS = window.EPM.WORKSPACES;
  const scopedWSList = scopeWs ? [scopeWs] : WS;
  const portfolio = React.useMemo(() => scopedWSList.flatMap(w => window.EPM.buildProjects(w.id, w.projects).map(p => ({ ...p, ws: w }))), [scopeWs && scopeWs.id]);

  // ---- the defined report catalog: what a user can actually run from this gate ----
  const CATS = [
    { key: 'fin', ar: 'مالي', en: 'Financial' },
    { key: 'sched', ar: 'الجدول الزمني', en: 'Schedule' },
    { key: 'prog', ar: 'الإنجاز', en: 'Progress' },
    { key: 'cont', ar: 'العقود', en: 'Contracts' },
    { key: 'comp', ar: 'الامتثال والتدقيق', en: 'Compliance' },
  ];
  const catLabel = k => { const c = CATS.find(x => x.key === k); return c ? c[AR ? 'ar' : 'en'] : k; };
  const CATALOG = [
    { id: 'RPT-01', cat: 'fin', scope: 'project', ar: 'الموقف المالي للمشروع', en: 'Project financial position', dAr: 'الكلفة المقررة والمعدلة، المصروف التراكمي، والمتبقي.', dEn: 'Approved vs revised cost, cumulative spend and balance.', fmt: ['PDF', 'XLSX'], freq: 'monthly', last: '2026-08-01' },
    { id: 'RPT-02', cat: 'fin', scope: 'portfolio', ar: 'المصروف التراكمي للمحفظة', en: 'Portfolio cumulative spend', dAr: 'منحنى الصرف المخطط مقابل الفعلي عبر المحفظة.', dEn: 'Planned vs actual disbursement curve across the portfolio.', fmt: ['PDF'], freq: 'monthly', last: '2026-08-01' },
    { id: 'RPT-03', cat: 'fin', scope: 'project', ar: 'المستخلصات والدفعات', en: 'Payment certificates', dAr: 'المستخلصات المقدمة والمصادق عليها والمصروفة.', dEn: 'Submitted, certified and paid certificates.', fmt: ['PDF', 'XLSX'], freq: null, last: '2026-07-24' },
    { id: 'RPT-04', cat: 'prog', scope: 'project', ar: 'الإنجاز المادي والمالي', en: 'Physical and financial progress', dAr: 'مقارنة نسب الإنجاز مع الخطة المعتمدة.', dEn: 'Progress against the approved plan.', fmt: ['PDF'], freq: 'weekly', last: '2026-08-03' },
    { id: 'RPT-05', cat: 'prog', scope: 'project', ar: 'كشف الكميات المنفذة', en: 'Executed BOQ quantities', dAr: 'الكميات المنفذة مقابل التعاقدية لكل بند.', dEn: 'Executed vs contracted quantity per BOQ item.', fmt: ['XLSX'], freq: null, last: '2026-07-30' },
    { id: 'RPT-06', cat: 'sched', scope: 'project', ar: 'الانحرافات الزمنية', en: 'Schedule variance', dAr: 'الفروق بين الخط الأساس والإنجاز المتوقع.', dEn: 'Baseline vs forecast finish variance.', fmt: ['PDF', 'XLSX'], freq: 'weekly', last: '2026-08-03' },
    { id: 'RPT-07', cat: 'sched', scope: 'project', ar: 'أنشطة المسار الحرج', en: 'Critical path activities', dAr: 'الأنشطة الحرجة والفائض الزمني.', dEn: 'Critical activities and float.', fmt: ['PDF'], freq: null, last: '2026-07-28' },
    { id: 'RPT-08', cat: 'cont', scope: 'portfolio', ar: 'حالة العقود', en: 'Contract status', dAr: 'العقود السارية والمنجزة والمتوقفة وقيمها.', dEn: 'Active, completed and suspended contracts with values.', fmt: ['PDF', 'XLSX'], freq: 'monthly', last: '2026-08-01' },
    { id: 'RPT-09', cat: 'cont', scope: 'project', ar: 'الأوامر التغييرية', en: 'Change orders', dAr: 'الأوامر المقترحة والمعتمدة وأثرها على الكلفة.', dEn: 'Proposed and approved orders with cost impact.', fmt: ['PDF', 'XLSX'], freq: null, last: '2026-08-02' },
    { id: 'RPT-10', cat: 'comp', scope: 'portfolio', ar: 'التنبيهات والتصعيد', en: 'Alerts and escalation', dAr: 'التنبيهات المفتوحة ومسار التصعيد ومهل الاستجابة.', dEn: 'Open alerts, escalation path and SLAs.', fmt: ['PDF'], freq: 'weekly', last: '2026-08-04' },
    { id: 'RPT-11', cat: 'comp', scope: 'project', ar: 'سجل التدقيق', en: 'Audit trail', dAr: 'سجل كامل للتغييرات والاعتمادات مع المستخدم والتاريخ.', dEn: 'Full change and approval log with user and timestamp.', fmt: ['PDF', 'XLSX'], freq: null, last: '2026-08-05' },
    { id: 'RPT-12', cat: 'prog', scope: 'project', ar: 'التجهيز والاستلامات', en: 'Supply and receipts', dAr: 'الأصناف المجهّزة والمستلمة ولجان الفحص.', dEn: 'Supplied and received items with inspection committees.', fmt: ['PDF', 'XLSX'], freq: 'monthly', last: '2026-07-31' },
  ];

  const [q, setQ] = dS('');
  const [cat, setCat] = dS('all');
  const [proj, setProj] = dS('all');
  const [page, setPage] = dS(1);
  const [pageSize, setPageSize] = dS(15);
  const qn = q.trim().toLowerCase();
  // selecting a project narrows the catalog to reports that run at project level
  const filtered = CATALOG.filter(r => (cat === 'all' || r.cat === cat)
    && (proj === 'all' || r.scope === 'project')
    && (!qn || r[AR ? 'ar' : 'en'].toLowerCase().includes(qn) || r[AR ? 'dAr' : 'dEn'].toLowerCase().includes(qn) || r.id.toLowerCase().includes(qn)));
  React.useEffect(() => { setPage(1); }, [cat, proj, q, pageSize]);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const scheduled = CATALOG.filter(r => r.freq).length;
  const freqLabel = f => f === 'weekly' ? (AR ? 'أسبوعي' : 'Weekly') : f === 'monthly' ? (AR ? 'شهري' : 'Monthly') : (AR ? 'عند الطلب' : 'On demand');
  const selProj = proj === 'all' ? null : portfolio.find(p => p.id === proj);
  const runReport = (e, r) => { e.stopPropagation();
    showToast((AR ? 'تشغيل: ' : 'Running: ') + r[AR ? 'ar' : 'en'] + (selProj ? ' — ' + selProj.name[lang] : '')); };

  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx')]} onSearch={openCmdk} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            <DPageHead lang={lang}
              crumbs={[scopeWs ? scopeWs[lang] : t('enterprise_ctx'), t('nav_reports')]}
              title={t('nav_reports')}
              sub={AR ? `${CATALOG.length} تقريراً معرّفاً · ${scheduled} مجدولة تلقائياً`
                      : `${CATALOG.length} defined reports · ${scheduled} scheduled automatically`}
              actions={<React.Fragment>
                <button className="d-btn" onClick={() => showToast(AR ? 'التقارير المجدولة — تجريبي' : 'Scheduled reports — demo')}><Icon name="schedule" size={16} />{AR ? 'المجدولة' : 'Scheduled'}</button>
                <button className="d-btn primary" onClick={() => showToast(AR ? 'تقرير مخصّص — تجريبي' : 'Custom report — demo')}><Icon name="add" size={16} />{AR ? 'تقرير مخصّص' : 'Custom report'}</button>
              </React.Fragment>} />

            <div className="d-tablewrap">
              <div className="d-toolbar">
                <div className="d-field">
                  <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
                  <input placeholder={AR ? 'بحث في التقارير…' : 'Search reports…'} value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <select className="d-form-input" style={{ width: 'auto', maxWidth: 240 }} value={proj} onChange={e => setProj(e.target.value)}>
                  <option value="all">{AR ? 'كل المشاريع' : 'All projects'}</option>
                  {portfolio.map(p => <option key={p.ws.id + p.id} value={p.id}>{p.name[lang]}</option>)}
                </select>
                <div className="grp">
                  <button className={`d-fchip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>{AR ? 'الكل' : 'All'}<span className="n">{CATALOG.length}</span></button>
                  {CATS.map(c => <button key={c.key} className={`d-fchip ${cat === c.key ? 'on' : ''}`} onClick={() => setCat(c.key)}>{c[AR ? 'ar' : 'en']}<span className="n">{CATALOG.filter(r => r.cat === c.key).length}</span></button>)}
                </div>
                <div className="sp"></div>
                {(cat !== 'all' || proj !== 'all' || q) && <button className="d-btn sm ghost" onClick={() => { setCat('all'); setProj('all'); setQ(''); }}><Icon name="close" size={13} />{AR ? 'مسح' : 'Clear'}</button>}
                <span className="d-cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>{total} {AR ? 'تقريراً' : 'reports'}</span>
              </div>

              {selProj && <div className="d-scopebar"><Icon name="info" size={15} /><span>{AR ? 'النطاق: ' : 'Scoped to: '}<b>{selProj.name[lang]}</b> — {AR ? 'تُعرض التقارير القابلة للتشغيل على مستوى المشروع.' : 'showing reports that run at project level.'}</span></div>}

              {rows.length === 0 ? (
                <div className="d-empty"><span className="d-empty-ico"><Icon name="search_off" size={28} /></span><b>{AR ? 'لا تقارير مطابقة' : 'No matching reports'}</b><span>{AR ? 'جرّب تصنيفاً أو كلمة بحث أخرى' : 'Try another category or search term'}</span></div>
              ) : (
              <table className="d-table">
                <thead><tr>
                  <th>{AR ? 'التقرير' : 'Report'}</th>
                  <th style={{ width: 132 }}>{AR ? 'التصنيف' : 'Category'}</th>
                  <th style={{ width: 100 }}>{AR ? 'النطاق' : 'Scope'}</th>
                  <th style={{ width: 108 }}>{AR ? 'الصيغة' : 'Format'}</th>
                  <th style={{ width: 116 }}>{AR ? 'الدورية' : 'Frequency'}</th>
                  <th style={{ width: 112 }}>{AR ? 'آخر تشغيل' : 'Last run'}</th>
                  <th style={{ width: 104 }}></th>
                </tr></thead>
                <tbody>{rows.map(r => (
                  <tr key={r.id} onClick={e => runReport(e, r)} style={{ cursor: 'pointer' }}>
                    <td className="d-cell-strong">{r[AR ? 'ar' : 'en']}<div className="d-cell-sub">{r[AR ? 'dAr' : 'dEn']}</div></td>
                    <td><span className={`d-cat ${r.cat}`}>{catLabel(r.cat)}</span></td>
                    <td className="d-cell-sub">{r.scope === 'project' ? (AR ? 'مشروع' : 'Project') : (AR ? 'محفظة' : 'Portfolio')}</td>
                    <td><span className="d-fmts">{r.fmt.map(f => <span key={f} className="fmt">{f}</span>)}</span></td>
                    <td>{r.freq ? <span className="d-pill completed">{freqLabel(r.freq)}</span> : <span className="d-cell-sub">{freqLabel(null)}</span>}</td>
                    <td className="num d-cell-sub">{r.last}</td>
                    <td className="d-rowact"><button className="d-btn sm" onClick={e => runReport(e, r)}><Icon name="bolt" size={14} />{AR ? 'تشغيل' : 'Run'}</button></td>
                  </tr>
                ))}</tbody>
              </table>
              )}
              <DPager lang={lang} page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
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
  const N = window.EPM.deriveNotifications ? window.EPM.deriveNotifications(lang) : window.EPM.NOTIFICATIONS;
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
