/* ============================================================
   EPM — Schedule Control module (Master Prompt §11):
   XER multi-level WBS hierarchy (Project ▸ Zone ▸ Discipline ▸
   Activity) Gantt + Primavera activity table (baseline/actual
   dates, status, float, cost) · WBS rollup at every level ·
   in-place progress update · P6 import (XER/XML/Excel) with
   in-wizard impact analysis · impact-analysis comparison with
   cost breakdown & Excel export.
   ============================================================ */

const SCHED_STATUS = {
  notstarted: { ar: 'لم يبدأ', en: 'Not started', icon: 'radio_button_unchecked', color: 'var(--status-cancelled)' },
  inprogress: { ar: 'قيد التنفيذ', en: 'In progress', icon: 'pending', color: 'var(--status-ongoing)' },
  ahead: { ar: 'متقدّم', en: 'Ahead', icon: 'trending_up', color: 'var(--status-completed)' },
  delayed: { ar: 'متأخر', en: 'Delayed', icon: 'warning', color: 'var(--status-delayed)' },
  completed: { ar: 'مكتمل', en: 'Completed', icon: 'check_circle', color: 'var(--status-completed)' },
};
function schedStatusOf(a) {
  if (a.milestone) return a.pct >= 100 ? 'completed' : (a.slip > 5 ? 'delayed' : 'notstarted');
  if (a.pct >= 100) return 'completed';
  if (a.pct <= 0) return 'notstarted';
  if (a.slip > 5) return 'delayed';
  if (a.slip === 0 && a.pct >= 60) return 'ahead';
  return 'inprogress';
}
const schedActualStart = a => a.pct > 0 ? a.curStart : null;
const schedActualFinish = a => a.pct >= 100 ? a.curFinish : null;

function schedMonths(min, max) {
  const out = []; const d = new Date(min); d.setDate(1);
  const end = new Date(max);
  while (d <= end) { out.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
  return out;
}
const schedDayFrac = (date, min, span) => (new Date(date) - new Date(min)) / span;

// rollup at every WBS level (weighted by original duration) — keyed by WBS code
function schedRollup(acts) {
  const agg = {};
  acts.forEach(a => {
    if (a.type === 'act' && !a.milestone) (a.parents || []).forEach(c => {
      const g = agg[c] || (agg[c] = { dur: 0, done: 0 });
      g.dur += a.origDur; g.done += a.origDur * a.pct / 100;
    });
  });
  const wbsPct = {}; Object.keys(agg).forEach(c => { wbsPct[c] = agg[c].dur ? Math.round(agg[c].done / agg[c].dur * 100) : 0; });
  const flat = acts.filter(a => a.type === 'act' && !a.milestone);
  const totDur = flat.reduce((s, a) => s + a.origDur, 0) || 1;
  const projectPct = wbsPct['PRJ'] != null ? wbsPct['PRJ'] : Math.round(flat.reduce((s, a) => s + a.origDur * a.pct / 100, 0) / totDur * 100);
  return { wbsPct, projectPct };
}

// descendant date span per WBS code (for summary bars)
function schedSpans(acts) {
  const span = {};
  acts.forEach(a => {
    if (a.type === 'act') (a.parents || []).forEach(c => {
      const s = span[c] || (span[c] = { s: a.curStart, f: a.curFinish });
      if (a.curStart < s.s) s.s = a.curStart;
      if (a.curFinish > s.f) s.f = a.curFinish;
    });
  });
  return span;
}

function schedCSV(filename, headers, rows) {
  const esc = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function DSchedStatus({ st, lang, dot }) {
  const S = SCHED_STATUS[st] || SCHED_STATUS.notstarted;
  if (dot) return <Icon name={S.icon} size={15} style={{ color: S.color, flex: 'none' }} title={S[lang]} />;
  return <span className="d-sched-stat" style={{ color: S.color }}><Icon name={S.icon} size={14} />{S[lang]}</span>;
}

function DGantt({ sd, acts, wbsPct, lang, filterCrit, onSelect, selId, basis, amdIdx, onAmd }) {
  const amdOf = id => (amdIdx && amdIdx.acts[id] && amdIdx.acts[id].srcs.length) ? amdIdx.acts[id] : null;
  const [collapsed, setCollapsed] = React.useState({});
  // 20b — gate on the chart room actually available inside the pane, not on
  // window.innerWidth (the pane is ~498px narrower than the window, so a
  // window test reports "wide" while the track has nowhere to draw).
  const scrollRef = React.useRef(null);
  const [tight, setTight] = React.useState(true);
  const [allCols, setAllCols] = React.useState(false);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const NAME_W = 320, CHART_MIN = 240;
    const check = () => setTight(el.clientWidth - NAME_W - GANTT_COLS_MIN < CHART_MIN);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = tight && !allCols;
  const GANTT_COLS_MIN = 564; // = sum of grid-template-columns minimums
  const [infoW, setInfoW] = React.useState(GANTT_COLS_MIN);
  const onResizeDown = (e) => {
    e.preventDefault();
    const startX = e.clientX; const startW = infoW;
    const dirMul = getComputedStyle(document.documentElement).direction === 'rtl' ? -1 : 1;
    const onMove = (ev) => setInfoW(Math.min(920, Math.max(GANTT_COLS_MIN, startW + (ev.clientX - startX) * dirMul)));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };
  const relOf = a => basis === 'manhours' ? a.wMHRel : a.wCostRel;
  const absOf = a => basis === 'manhours' ? a.wMHAbs : a.wCostAbs;
  const min = sd.origin;
  const maxDate = new Date(sd.forecastFinish); maxDate.setDate(maxDate.getDate() + 20);
  const max = maxDate.toISOString().slice(0, 10);
  const span = new Date(max) - new Date(min) || 1;
  const AR = lang === 'ar';
  const months = schedMonths(min, max);
  const colW = 46; const timelineW = months.length * colW;
  const fmtGD = d => d ? new Date(d).toLocaleDateString(AR ? 'ar' : 'en', { day: '2-digit', month: 'short' }) : '—';
  const ddLeft = schedDayFrac(sd.dataDate, min, span) * timelineW;
  const spans = schedSpans(acts);
  let showCodes = null;
  if (filterCrit) { showCodes = {}; acts.forEach(a => { if (a.type === 'act' && a.critical) (a.parents || []).forEach(c => { showCodes[c] = 1; }); }); }
  const toggle = code => setCollapsed(c => ({ ...c, [code]: !c[code] }));
  const rows = acts.filter(a => {
    if (a.parents && a.parents.some(c => collapsed[c])) return false;
    if (filterCrit) { if (a.type === 'wbs') return !!(showCodes && showCodes[a.code]); return a.critical; }
    return true;
  });
  return (
    <div className={'d-gantt' + (compact ? ' cols-compact' : '')}>
      {(
        <div className="d-gantt-colbar">
          <button className="d-btn" onClick={() => setAllCols(v => !v)}
            title={AR ? 'إظهار أو إخفاء أعمدة البيانات' : 'Show or hide data columns'}>
            {allCols ? (AR ? 'أعمدة أساسية (4)' : 'Essential columns (4)') : (AR ? 'كل الأعمدة (9)' : 'All columns (9)')}
          </button>
        </div>
      )}
      <div className="d-gantt-scroll" ref={scrollRef}>
        <div className="d-gantt-inner" style={{ width: timelineW + 340 + (compact ? 264 : infoW) }}>
          <div className="d-gantt-row head">
            <div className="d-gantt-cellname">{AR ? 'هيكل تجزئة العمل / النشاط' : 'WBS / Activity'}</div>
            <div className="d-gantt-cellinfo" style={{ width: infoW }}>
              <span className="c" style={{ flex: '1 1 56px' }} title={AR ? 'المدة الأصلية' : 'Original duration'}>{AR ? 'المدة' : 'Duration'}</span>
              <span className="c" style={{ flex: '1 1 92px' }} title={AR ? 'بداية الأساس' : 'Baseline start'}>{AR ? 'بداية الأساس' : 'Baseline start'}</span>
              <span className="c" style={{ flex: '1 1 96px' }} title={AR ? 'إنجاز الأساس' : 'Baseline finish'}>{AR ? 'إنجاز الأساس' : 'Baseline finish'}</span>
              <span className="c" style={{ flex: '1 1 84px' }} title={AR ? 'البداية الفعلية' : 'Actual/current start'}>{AR ? 'البداية الفعلية' : 'Actual start'}</span>
              <span className="c" style={{ flex: '1 1 88px' }} title={AR ? 'الإنجاز الفعلي' : 'Actual/forecast finish'}>{AR ? 'الإنجاز الفعلي' : 'Actual finish'}</span>
              <span className="c" style={{ flex: '1 1 66px' }} title={AR ? 'العوم الكلي' : 'Total float'}>{AR ? 'العوم الكلي' : 'Total float'}</span>
              <span className="c" style={{ flex: '1 1 74px' }} title={AR ? 'نسبة الانجاز' : '% complete'}>{AR ? 'الإنجاز' : '% Complete'}</span>
              <span className="c" style={{ flex: '1 1 66px' }} title={AR ? 'الوزن النسبي حسب ' + (basis === 'manhours' ? 'ساعات العمل' : 'الكلفة') : 'Relative weight by ' + (basis === 'manhours' ? 'man-hours' : 'cost')}>{AR ? 'الوزن النسبي' : 'Rel. weight'}</span>
              <span className="c" style={{ flex: '1 1 66px' }} title={AR ? 'الوزن المطلق حسب ' + (basis === 'manhours' ? 'ساعات العمل' : 'الكلفة') : 'Absolute weight by ' + (basis === 'manhours' ? 'man-hours' : 'cost')}>{AR ? 'الوزن المطلق' : 'Abs. weight'}</span>
              <span className="d-gantt-resize" onMouseDown={onResizeDown} title={AR ? 'اسحب للتوسيع/التضييق' : 'Drag to resize'}></span>
            </div>
            <div className="d-gantt-track" style={{ width: timelineW }}>
              {months.map((m, i) => <span key={i} className="d-gantt-mon" style={{ width: colW }}>{m.toLocaleDateString(AR ? 'ar' : 'en', { month: 'short' })}<i>{String(m.getFullYear()).slice(2)}</i></span>)}
              <span className="d-gantt-dd" style={{ insetInlineStart: ddLeft }}><i>{AR ? 'تاريخ البيانات' : 'Data date'}</i></span>
            </div>
          </div>
          {rows.map((a, idx) => {
            const indent = { paddingInlineStart: 8 + ((a.level || 1) - 1) * 15 };
            if (a.type === 'wbs') {
              const isOpen = !collapsed[a.code];
              const sp = spans[a.code];
              const sL = sp ? schedDayFrac(sp.s, min, span) * timelineW : 0;
              const sW = sp ? Math.max(4, (schedDayFrac(sp.f, min, span) - schedDayFrac(sp.s, min, span)) * timelineW) : 0;
              return (
                <div key={idx} className="d-gantt-row wbs">
                  <div className="d-gantt-cellname wbs-name" style={indent}>
                    <button className="d-gantt-collapse" onClick={() => toggle(a.code)} title={isOpen ? (AR ? 'طي' : 'Collapse') : (AR ? 'توسيع' : 'Expand')}><Icon name={isOpen ? 'expand_more' : (AR ? 'chevron_left' : 'chevron_right')} size={15} /></button>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{a.code}</span>
                    <span className="nm" style={{ fontWeight: a.level <= 1 ? 'var(--fw-x)' : 'var(--fw-bold)' }}>{a.name}</span>
                    {wbsPct[a.code] != null && <span className="mono" style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--on-surface-variant)' }}>{wbsPct[a.code]}%</span>}
                    <span className="mono" style={{ fontSize: 11, color: 'var(--on-surface)' }} title={AR ? 'الوزن المطلق' : 'Absolute weight'}>· {basis === 'manhours' ? a.wMHAbs : a.wCostAbs}%</span>
                  </div>
                  <div className="d-gantt-cellinfo" style={{ width: infoW }}>
                    <span className="c" style={{ flex: '1 1 56px' }}>—</span>
                    <span className="c" style={{ flex: '1 1 92px' }}>{sp ? fmtGD(sp.s) : '—'}</span>
                    <span className="c" style={{ flex: '1 1 96px' }}>{sp ? fmtGD(sp.f) : '—'}</span>
                    <span className="c" style={{ flex: '1 1 84px' }}>{sp ? fmtGD(sp.s) : '—'}</span>
                    <span className="c" style={{ flex: '1 1 88px' }}>{sp ? fmtGD(sp.f) : '—'}</span>
                    <span className="c" style={{ flex: '1 1 66px' }}>—</span>
                    <span className="c mono" style={{ flex: '1 1 74px' }}>{wbsPct[a.code] != null ? wbsPct[a.code] + '%' : '—'}</span>
                    <span className="c mono" style={{ flex: '1 1 66px' }}>{relOf(a)}%</span>
                    <span className="c mono" style={{ flex: '1 1 66px', color: 'var(--on-surface)', fontWeight: 'var(--fw-bold)' }}>{absOf(a)}%</span>
                  </div>
                  <div className="d-gantt-track" style={{ width: timelineW }}>
                    <span className="d-gantt-dd-line" style={{ insetInlineStart: ddLeft }}></span>
                    {sp && <span className="d-gantt-sum" style={{ insetInlineStart: sL, width: sW, opacity: a.level <= 1 ? 1 : 0.72 }}></span>}
                  </div>
                </div>
              );
            }
            const st = schedStatusOf(a);
            const blL = schedDayFrac(a.blStart, min, span) * timelineW;
            const blW = Math.max(2, (schedDayFrac(a.blFinish, min, span) - schedDayFrac(a.blStart, min, span)) * timelineW);
            const cL = schedDayFrac(a.curStart, min, span) * timelineW;
            const cW = Math.max(2, (schedDayFrac(a.curFinish, min, span) - schedDayFrac(a.curStart, min, span)) * timelineW);
            const barColor = SCHED_STATUS[st].color;
            const amd = amdOf(a.id);
            const amdTo = amd && (amd.applied ? amd.effFinish : null);
            const extL = amdTo ? schedDayFrac(a.curFinish, min, span) * timelineW : 0;
            const extW = amdTo ? Math.max(2, (schedDayFrac(amdTo, min, span) - schedDayFrac(a.curFinish, min, span)) * timelineW) : 0;
            return (
              <div key={idx} className={`d-gantt-row ${selId === a.id ? 'on' : ''}`} onClick={() => onSelect(a.id)}>
                <div className="d-gantt-cellname" style={indent}>
                  <DSchedStatus st={st} lang={lang} dot />
                  <span className="mono" style={{ color: 'var(--on-surface-variant)', fontSize: 11 }}>{a.id}</span>
                  <span className="nm">{a.name}</span>
                  {a.critical && <span className="d-crit-dot" title={AR ? 'مسار حرج' : 'Critical'}></span>}
                  {amdOf(a.id) ? <DAmdMark lang={lang} e={amdOf(a.id)} onOpen={() => onAmd && onAmd(a)} /> : null}
                </div>
                <div className="d-gantt-cellinfo" style={{ width: infoW }}>
                  <span className="c mono" style={{ flex: '1 1 56px' }}>{a.milestone ? '—' : a.origDur}</span>
                  <span className="c mono" style={{ flex: '1 1 92px' }}>{fmtGD(a.blStart)}</span>
                  <span className="c mono" style={{ flex: '1 1 96px' }}>{fmtGD(a.blFinish)}</span>
                  <span className="c mono" style={{ flex: '1 1 84px' }}>{fmtGD(schedActualStart(a)) !== '—' ? fmtGD(a.curStart) : '—'}</span>
                  <span className="c mono" style={{ flex: '1 1 88px' }}>{fmtGD(schedActualFinish(a)) !== '—' ? fmtGD(a.curFinish) : '—'}</span>
                  <span className="c mono" style={a.float === 0 ? { flex: '1 1 66px', color: 'var(--on-surface)', fontWeight: 'var(--fw-bold)' } : { flex: '1 1 66px' }}>{a.milestone ? '—' : a.float}</span>
                  <span className="c mono" style={{ flex: '1 1 74px', fontWeight: 'var(--fw-bold)' }}>{a.milestone ? '—' : a.pct + '%'}</span>
                  <span className="c mono" style={{ flex: '1 1 66px' }}>{a.milestone ? '—' : relOf(a) + '%'}</span>
                  <span className="c mono" style={{ flex: '1 1 66px', color: 'var(--on-surface)', fontWeight: 'var(--fw-bold)' }}>{a.milestone ? '—' : absOf(a) + '%'}</span>
                </div>
                <div className="d-gantt-track" style={{ width: timelineW }}>
                  <span className="d-gantt-dd-line" style={{ insetInlineStart: ddLeft }}></span>
                  {a.milestone ? (
                    <span className={'d-gantt-ms' + (a.critical ? ' crit' : '')} style={{ insetInlineStart: cL - 7 }} title={a.curFinish}></span>
                  ) : (
                    <React.Fragment>
                      <span className="d-gantt-bl" style={{ insetInlineStart: blL, width: blW }}></span>
                      {amdTo && extW > 0 && <span className="d-gantt-ext" style={{ insetInlineStart: extL, width: extW }}
                        title={(AR ? 'تمديد معتمد بأمر تغييري ' : 'Approved extension per ') + amd.srcs[amd.srcs.length - 1].no + ' → ' + amdTo}></span>}
                      <span className={'d-gantt-bar' + (a.critical ? ' crit' : '')} style={{ insetInlineStart: cL, width: cW, background: barColor }}>
                        <span className="fill" style={{ width: a.pct + '%' }}></span>
                      </span>
                    </React.Fragment>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* Primavera-style tabular view — WBS hierarchy + baseline / actual dates + status */
function DSchedTable({ acts, wbsPct, lang, onSelect, selId, basis, amdIdx, onAmd }) {
  const AR = lang === 'ar';
  const amdOf = id => (amdIdx && amdIdx.acts[id] && amdIdx.acts[id].srcs.length) ? amdIdx.acts[id] : null;
  const rel = a => basis === 'manhours' ? a.wMHRel : a.wCostRel;
  const abs = a => basis === 'manhours' ? a.wMHAbs : a.wCostAbs;
  return (
    <div className="d-tablewrap">
      <div style={{ overflowX: 'auto' }}>
        <table className="d-table" style={{ minWidth: 1180 }}>
          <thead><tr>
            <th>{AR ? 'المعرّف' : 'Act ID'}</th>
            <th>{AR ? 'الحالة' : 'Status'}</th>
            <th>{AR ? 'هيكل التجزئة / النشاط' : 'WBS / Activity'}</th>
            <th>{AR ? 'المدة' : 'OD'}</th>
            <th>{AR ? 'بداية الأساس' : 'BL start'}</th>
            <th>{AR ? 'إنجاز الأساس' : 'BL finish'}</th>
            <th>{AR ? 'البداية الفعلية' : 'Act start'}</th>
            <th>{AR ? 'الإنجاز الفعلي' : 'Act finish'}</th>
            <th>{AR ? 'العوم' : 'TF'}</th>
            <th>%</th>
            <th>{AR ? 'الكلفة (IQD)' : 'Cost (IQD)'}</th>
            <th>{AR ? 'الوزن النسبي' : 'Rel. wt%'}</th>
            <th>{AR ? 'الوزن المطلق' : 'Abs. wt%'}</th>
          </tr></thead>
          <tbody>
            {acts.map((a, i) => {
              if (a.type === 'wbs') return (
                <tr key={i} style={{ background: a.level <= 1 ? 'var(--surface-container-high)' : 'var(--surface-container)' }}>
                  <td className="mono d-cell-sub" style={{ fontSize: 11 }}>{a.code}</td>
                  <td colSpan={8} style={{ fontWeight: 'var(--fw-x)', paddingInlineStart: 8 + ((a.level || 1) - 1) * 16 }}>{a.name}</td>
                  <td className="mono" style={{ fontWeight: 'var(--fw-x)' }}>{wbsPct[a.code] != null ? wbsPct[a.code] + '%' : ''}</td>
                  <td></td>
                  <td className="mono">{rel(a)}%</td>
                  <td className="mono" style={{ fontWeight: 'var(--fw-x)', color: 'var(--on-surface)' }}>{abs(a)}%</td>
                </tr>
              );
              const st = schedStatusOf(a);
              const as = schedActualStart(a), af = schedActualFinish(a);
              return (
                <tr key={i} className={selId === a.id ? 'sel' : ''} onClick={() => onSelect(a.id)}>
                  <td className="mono">{a.id}{a.critical && <span className="d-crit-dot" style={{ marginInlineStart: 6, display: 'inline-block' }}></span>}
                    {amdOf(a.id) ? <DAmdMark lang={lang} e={amdOf(a.id)} onOpen={() => onAmd && onAmd(a)} /> : null}</td>
                  <td><DSchedStatus st={st} lang={lang} /></td>
                  <td className="d-cell-strong" style={{ whiteSpace: 'nowrap', paddingInlineStart: 8 + ((a.level || 2) - 1) * 16 }}>{a.name}</td>
                  <td className="mono">{a.origDur}{AR ? 'ي' : 'd'}</td>
                  <td className="mono d-cell-sub">{a.blStart}</td>
                  <td className="mono d-cell-sub">{a.blFinish}</td>
                  <td className="mono">{as || '—'}</td>
                  <td className="mono" style={af && a.slip > 0 ? { color: 'var(--error)' } : null}>
                    {(amdOf(a.id) && amdOf(a.id).applied ? amdOf(a.id).effFinish : af) || '—'}
                    {amdOf(a.id) ? <DAmdDelta lang={lang} from={amdOf(a.id).origRem} to={amdOf(a.id).effRem}
                      pending={amdOf(a.id).pendingRem != null} unit={AR ? 'يوم' : 'd'} /> : null}</td>
                  <td className="mono" style={a.float === 0 ? { color: 'var(--on-surface)' } : null}>{a.milestone ? '—' : a.float}</td>
                  <td className="mono">{a.pct}%</td>
                  <td className="mono">{a.cost ? window.fmtNum(a.cost) : '—'}</td>
                  <td className="mono">{a.milestone ? '—' : rel(a) + '%'}</td>
                  <td className="mono" style={{ fontWeight: 'var(--fw-bold)' }}>{a.milestone ? '—' : abs(a) + '%'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DImportWizard({ lang, onClose, onDone, kind, impact, totalCostImpact }) {
  const AR = lang === 'ar';
  const boq = kind === 'boq';
  const [step, setStep] = React.useState(0);
  const [fmt, setFmt] = React.useState(boq ? 'excel' : 'xer');
  const [basis, setBasis] = React.useState('cost');
  const steps = boq
    ? (AR ? ['رفع الملف', 'تحليل Excel', 'التحقق', 'المقارنة', 'تأكيد وربط'] : ['Upload file', 'Parse Excel', 'Validate', 'Compare', 'Confirm & link'])
    : (AR ? ['الصيغة والملف', 'تحليل الملف', 'التحقق', 'تحليل الأثر', 'تأكيد وتقديم'] : ['Format & file', 'Parse file', 'Validate', 'Impact analysis', 'Confirm & submit']);
  const fmtOpts = [
    { id: 'xer', label: 'Primavera XER', sub: AR ? 'ملف P6 الأصلي' : 'Native P6 export', ico: 'account_tree' },
    { id: 'xml', label: 'P6 XML', sub: AR ? 'تبادل قياسي' : 'Standard interchange', ico: 'data_object' },
    { id: 'excel', label: 'Excel', sub: AR ? 'جدول أنشطة' : 'Activity spreadsheet', ico: 'table_view' },
  ];
  const fmtLabel = (fmtOpts.find(f => f.id === fmt) || {}).label || 'XER';
  const validation = boq ? [
    { ok: true, ar: '86 بنداً مقروءاً', en: '86 items parsed' },
    { ok: true, ar: 'الوحدات والأسعار متطابقة', en: 'Units & rates matched' },
    { ok: false, warn: true, ar: '3 بنود بدون كمية تعاقدية', en: '3 rows missing contracted qty' },
    { ok: false, warn: true, ar: 'بند مكرر محتمل', en: '1 possible duplicate item' },
    { ok: true, ar: 'الإجمالي يطابق قيمة العقد', en: 'Total matches contract value' },
  ] : [
    { ok: true, ar: '312 نشاطاً مقروءاً', en: '312 activities parsed' },
    { ok: true, ar: 'هيكل WBS بأربعة مستويات متطابق', en: '4-level WBS structure matched' },
    { ok: false, warn: true, ar: '4 علاقات منطقية مفقودة', en: '4 logic links missing' },
    { ok: false, warn: true, ar: 'نشاطان بدون تقويم', en: '2 activities without calendar' },
    { ok: true, ar: 'لا توجد تكرارات', en: 'No duplicates found' },
  ];
  const imp = impact || [];
  return (
    <div className="d-modal-scrim" onClick={onClose}>
      <div className="d-modal" style={!boq && step === 3 ? { width: 'min(760px, 100%)' } : null} onClick={e => e.stopPropagation()}>
        <div className="d-modal-head">
          <b>{boq ? (AR ? 'استيراد جدول الكميات (Excel)' : 'Import BOQ (Excel)') : (AR ? 'استيراد جدول Primavera P6' : 'Import Primavera P6 schedule')}</b>
          <button className="d-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="d-stepper">
          {steps.map((s, i) => (
            <div key={i} className={`d-step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}>
              <span className="n">{i < step ? <Icon name="check" size={13} /> : i + 1}</span><span className="l">{s}</span>
            </div>
          ))}
        </div>
        <div className="d-modal-body">
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!boq && <React.Fragment>
                <label className="d-cell-sub">{AR ? 'اختر صيغة الاستيراد' : 'Choose import format'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {fmtOpts.map(f => (
                    <button key={f.id} onClick={() => setFmt(f.id)} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4, padding: 12, border: '1px solid ' + (fmt === f.id ? 'var(--primary)' : 'var(--outline-variant)'), borderRadius: 'var(--r-md)', background: fmt === f.id ? 'color-mix(in srgb,var(--primary) 6%,transparent)' : 'var(--surface-container-lowest)' }}>
                      <Icon name={f.ico} size={20} style={{ color: fmt === f.id ? 'var(--primary)' : 'var(--on-surface-variant)' }} />
                      <b style={{ fontSize: 13 }}>{f.label}</b><span className="d-cell-sub" style={{ fontSize: 11 }}>{f.sub}</span>
                    </button>
                  ))}
                </div>
                <label className="d-cell-sub" style={{ marginTop: 4 }}>{AR ? 'أساس حساب وزن هيكل التجزئة (WBS)' : 'WBS weight calculation basis'}</label>
                <div className="d-cell-sub" style={{ fontSize: 11 }}>{AR ? 'حقول مكشوفة تلقائياً من الملف: الكلفة المدرجة (BAC) · ساعات العمل المدرجة' : 'Auto-detected fields: Budgeted Cost (BAC) · Budgeted Man-Hours'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['cost', AR ? 'الكلفة المدرجة' : 'Budgeted Cost', 'payments'], ['manhours', AR ? 'ساعات العمل المدرجة' : 'Budgeted Man-Hours', 'schedule']].map(o => (
                    <button key={o[0]} onClick={() => setBasis(o[0])} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, padding: 12, border: '1px solid ' + (basis === o[0] ? 'var(--primary)' : 'var(--outline-variant)'), borderRadius: 'var(--r-md)', background: basis === o[0] ? 'color-mix(in srgb,var(--primary) 6%,transparent)' : 'var(--surface-container-lowest)' }}>
                      <Icon name={o[2]} size={18} style={{ color: basis === o[0] ? 'var(--primary)' : 'var(--on-surface-variant)' }} /><b style={{ fontSize: 12 }}>{o[1]}</b>
                    </button>
                  ))}
                </div>
              </React.Fragment>}
              <div className="d-drop"><Icon name="upload_file" size={30} /><b>{boq ? (AR ? 'اسحب ملف Excel / BOQ هنا' : 'Drop an Excel / BOQ file here') : (AR ? `اسحب ملف ${fmtLabel} هنا` : `Drop a ${fmtLabel} file here`)}</b><span className="d-cell-sub">{AR ? 'أو اختر من الجهاز — بيانات تجريبية' : 'or browse — demonstration data'}</span></div>
            </div>
          )}
          {step === 1 && <div className="d-parse"><div className="d-spin"></div><span>{boq ? (AR ? 'جارٍ تحليل ملف الكميات…' : 'Parsing BOQ file…') : (AR ? `جارٍ تحليل ملف ${fmtLabel}…` : `Parsing ${fmtLabel} file…`)}</span></div>}
          {step === 2 && <div className="d-card-sub" style={{ padding: 4 }}>{validation.map((v, i) => (
            <div key={i} className="d-val-row"><Icon name={v.ok ? 'check_circle' : 'warning'} size={17} style={{ color: v.ok ? 'var(--on-surface)' : 'var(--warning)' }} /><span>{AR ? v.ar : v.en}</span><span className={`d-pill ${v.ok ? 'completed' : 'suspended'}`}>{v.ok ? (AR ? 'سليم' : 'OK') : (AR ? 'تحذير' : 'Warning')}</span></div>
          ))}</div>}
          {step === 3 && !boq && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="d-fig-row" style={{ margin: 0 }}>
              <div className="d-fig"><div className="k">{AR ? 'أنشطة متأثرة' : 'Affected'}</div><div className="v" style={{ color: 'var(--status-suspended-tx)' }}>{imp.length}</div></div>
              <div className="d-fig"><div className="k">{AR ? 'أنشطة مضافة' : 'Added'}</div><div className="v" style={{ color: 'var(--on-surface)' }}>+8</div></div>
              <div className="d-fig"><div className="k">{AR ? 'أثر الإنجاز' : 'Finish impact'}</div><div className="v" style={{ color: 'var(--error)' }}>+18<small>{AR ? 'يوم' : 'd'}</small></div></div>
              <div className="d-fig"><div className="k">{AR ? 'أثر الكلفة (تقديري)' : 'Cost impact'}</div><div className="v mono" style={{ fontSize: 15, color: 'var(--error)' }}>{window.fmtNum(totalCostImpact || 0)}</div></div>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--outline-variant)', borderRadius: 'var(--r-md)' }}>
              <table className="d-line-table">
                <thead><tr><th>{AR ? 'النشاط' : 'Activity'}</th><th>{AR ? 'إنجاز أساس' : 'BL finish'}</th><th>{AR ? 'إنجاز حالي' : 'New finish'}</th><th>{AR ? 'الانزياح' : 'Slip'}</th><th>{AR ? 'أثر الكلفة' : 'Cost impact'}</th></tr></thead>
                <tbody>{imp.map((im, i) => (
                  <tr key={i}><td><span className="mono d-cell-sub" style={{ marginInlineEnd: 6 }}>{im.id}</span>{im.name}{im.critical && <span className="d-pill stalled" style={{ marginInlineStart: 6 }}>{AR ? 'حرج' : 'Crit'}</span>}</td><td className="mono d-cell-sub">{im.blFinish}</td><td className="mono" style={{ color: 'var(--error)' }}>{im.curFinish}</td><td className="mono" style={{ color: 'var(--error)' }}>+{im.slip}{AR ? 'ي' : 'd'}</td><td className="mono">{window.fmtNum(im.costImpact)}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div className="d-callout"><span className="d-callout-ico"><Icon name="how_to_reg" size={18} /></span><div className="d-callout-tx"><span className="k">{AR ? 'مقدِّم الطلب ← المعتمِد' : 'Submitter → Approver'}</span><b style={{ fontSize: 13, fontWeight: 'var(--fw-bold)' }}>{AR ? 'أنت مقدِّم الطلب وتطّلع على الأثر قبل التقديم. الاعتماد يتم من مستخدم آخر مخوّل، ويبقى الأثر ظاهراً للطرفين.' : 'You are the submitter and review this impact before submitting. Approval is performed by another authorized user; the impact stays visible to both.'}</b></div></div>
          </div>}
          {step === 3 && boq && <div className="d-card-sub" style={{ padding: 16 }}><div className="d-fig-row" style={{ margin: 0 }}>
            <div className="d-fig"><div className="k">{AR ? 'بنود مضافة' : 'Added'}</div><div className="v" style={{ color: 'var(--on-surface)' }}>+5</div></div>
            <div className="d-fig"><div className="k">{AR ? 'أسعار متغيرة' : 'Changed rates'}</div><div className="v" style={{ color: 'var(--status-suspended-tx)' }}>11</div></div>
            <div className="d-fig"><div className="k">{AR ? 'أثر القيمة' : 'Value impact'}</div><div className="v" style={{ color: 'var(--error)' }}>+3.4<small>%</small></div></div>
          </div></div>}
          {step === 4 && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="d-cell-sub">{AR ? 'نوع الجدول' : 'Schedule type'}</label>
            <select className="d-form-input"><option>{AR ? 'تحديث حالي' : 'Current update'}</option><option>{AR ? 'خط أساس' : 'Baseline'}</option><option>{AR ? 'جدول استرداد' : 'Recovery schedule'}</option><option>{AR ? 'جدول منقّح' : 'Revised schedule'}</option></select>
            <div className="d-callout" style={{ marginTop: 6 }}><span className="d-callout-ico"><Icon name="info" size={18} /></span><div className="d-callout-tx"><b style={{ fontSize: 13 }}>{AR ? 'يُقدَّم للاعتماد ولا يُستبدل الجدول السابق — يُحفظ كإصدار.' : 'Submitted for approval; the previous schedule is preserved as a version.'}</b></div></div>
          </div>}
        </div>
        <div className="d-modal-foot">
          {step > 0 && <button className="d-btn ghost" onClick={() => setStep(s => s - 1)}>{AR ? 'السابق' : 'Back'}</button>}
          <div style={{ flex: 1 }}></div>
          {step < steps.length - 1
            ? <button className="d-btn primary" onClick={() => setStep(s => s + 1)}>{AR ? 'التالي' : 'Next'}<Icon name={AR ? 'chevron_left' : 'chevron_right'} size={16} /></button>
            : <button className="d-btn primary" onClick={() => onDone(basis)}><Icon name="send" size={16} />{AR ? 'تقديم للاعتماد' : 'Submit for approval'}</button>}
        </div>
      </div>
    </div>
  );
}

function DModSchedule({ t, lang, d, p, showToast }) {
  // applied change orders move activity dates; the baseline stays untouched
  const amdIdx = React.useMemo(() => (window.amendmentIndex ? window.amendmentIndex(d, lang, p) : { boq: {}, acts: {} }), [d, lang, p && p.id]);
  const sd = React.useMemo(() => window.EPM.buildScheduleData(p, lang), [p && p.id, lang]);
  const AR = lang === 'ar';
  const [view, setView] = React.useState('gantt');
  const [selId, setSelId] = React.useState(null);
  const [amdAct, setAmdAct] = React.useState(null);
  const [filterCrit, setFilterCrit] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);
  const [verId, setVerId] = React.useState(sd.versions[0].id);
  const [basis, setBasis] = React.useState('cost');
  const [acts, setActs] = React.useState(sd.activities);
  React.useEffect(() => { setActs(sd.activities); setSelId(null); }, [sd]);
  const roll = React.useMemo(() => schedRollup(acts), [acts]);
  const sel = acts.find(a => a.id === selId);
  const setPct = (id, pct) => setActs(as => as.map(a => a.id === id ? { ...a, pct, remDur: a.milestone ? 0 : Math.round(a.origDur * (1 - pct / 100)) } : a));

  const OVERHEAD = 0.15;
  const impact = acts.filter(a => a.type === 'act' && a.slip > 0 && !a.milestone).map(a => {
    const dailyRate = Math.round(a.cost / (a.origDur || 1));
    const dailyOverhead = Math.round(dailyRate * OVERHEAD);
    return {
      id: a.id, name: a.name, critical: a.critical, status: schedStatusOf(a),
      blStart: a.blStart, blFinish: a.blFinish, curStart: a.curStart, curFinish: a.curFinish,
      durBefore: a.origDur, durAfter: a.origDur + a.slip,
      floatBefore: a.float + a.slip, floatAfter: a.float, slip: a.slip,
      cost: a.cost, dailyRate, dailyOverhead, costImpact: dailyOverhead * a.slip,
    };
  });
  const totalCostImpact = impact.reduce((s, im) => s + im.costImpact, 0);

  const exportSchedule = () => schedCSV('schedule-' + (p ? p.id : 'demo') + '.csv', [AR ? 'المعرّف' : 'ID', AR ? 'النشاط' : 'Activity', AR ? 'الحالة' : 'Status', AR ? 'بداية أساس' : 'BL start', AR ? 'إنجاز أساس' : 'BL finish', AR ? 'بداية فعلية' : 'Act start', AR ? 'إنجاز فعلي' : 'Act finish', AR ? 'عوم' : 'TF', '%', AR ? 'كلفة' : 'Cost'], acts.filter(a => a.type === 'act').map(a => [a.id, a.name, (SCHED_STATUS[schedStatusOf(a)][lang]), a.blStart, a.blFinish, schedActualStart(a) || '-', schedActualFinish(a) || '-', a.float, a.pct, a.cost]));
  React.useEffect(() => {
    const imp = () => setShowImport(true), exp = () => exportSchedule(), crit = () => setFilterCrit(v => !v);
    window.addEventListener('epm:sched-import', imp); window.addEventListener('epm:sched-export', exp); window.addEventListener('epm:sched-critical', crit);
    return () => { window.removeEventListener('epm:sched-import', imp); window.removeEventListener('epm:sched-export', exp); window.removeEventListener('epm:sched-critical', crit); };
  });

  const exportImpact = () => {
    schedCSV('impact-analysis-' + (p ? p.id : 'demo') + '.csv',
      [AR ? 'المعرّف' : 'Activity ID', AR ? 'النشاط' : 'Activity', AR ? 'حرج' : 'Critical', AR ? 'بداية أساس' : 'BL start', AR ? 'إنجاز أساس' : 'BL finish', AR ? 'بداية حالية' : 'Cur start', AR ? 'إنجاز حالي' : 'Cur finish', AR ? 'مدة قبل' : 'Dur before', AR ? 'مدة بعد' : 'Dur after', AR ? 'الانزياح' : 'Slip (d)', AR ? 'كلفة النشاط' : 'Activity cost', AR ? 'عبء يومي' : 'Daily overhead', AR ? 'أثر الكلفة' : 'Cost impact'],
      impact.map(im => [im.id, im.name, im.critical ? 'Yes' : 'No', im.blStart, im.blFinish, im.curStart, im.curFinish, im.durBefore, im.durAfter, im.slip, im.cost, im.dailyOverhead, im.costImpact]));
    showToast(AR ? 'تم تصدير Excel — تجريبي' : 'Exported to Excel — demo');
  };

  const critDetail = sel && sel.critical && !sel.milestone;
  const selStatus = sel ? schedStatusOf(sel) : null;

  const amdActE = amdAct && amdIdx.acts[amdAct.id];
  return (
    <React.Fragment>
      {amdActE && <DAmdPanel lang={lang} kind="act" e={amdActE} code={amdAct.id} name={amdAct.name} onClose={() => setAmdAct(null)} />}
      {showImport && <DImportWizard lang={lang} impact={impact} totalCostImpact={totalCostImpact} onClose={() => setShowImport(false)} onDone={(b) => { setShowImport(false); setView('compare'); if (b) setBasis(b); showToast(AR ? 'قُدِّم للاعتماد — راجع تحليل الأثر' : 'Submitted for approval — review impact'); }} />}

      <div className="d-sched-bar">
        <div className="d-fig-row" style={{ flex: 1, margin: 0 }}>
          <div className="d-fig"><div className="k">{AR ? 'إنجاز المشروع (تجميعي)' : 'Project rollup'}</div><div className="v" style={{ color: 'var(--azure-600)' }}>{roll.projectPct}<small>%</small></div></div>
          <div className="d-fig"><div className="k">{AR ? 'تاريخ البيانات' : 'Data date'}</div><div className="v mono" style={{ fontSize: 15 }}>{sd.dataDate}</div></div>
          <div className="d-fig"><div className="k">{AR ? 'الإنجاز المخطط' : 'Baseline finish'}</div><div className="v mono" style={{ fontSize: 15 }}>{sd.baselineFinish}</div></div>
          <div className="d-fig"><div className="k">{AR ? 'الإنجاز المتوقع' : 'Forecast finish'}</div><div className="v mono" style={{ fontSize: 15, color: sd.delayDays > 0 ? 'var(--error)' : 'var(--on-surface)' }}>{sd.forecastFinish}</div></div>
          <div className="d-fig"><div className="k">{AR ? 'التأخر' : 'Delay'}</div><div className="v" style={{ color: sd.delayDays > 0 ? 'var(--error)' : 'var(--on-surface)' }}>{sd.delayDays > 0 ? '+' : ''}{sd.delayDays}<small>{AR ? 'يوم' : 'd'}</small></div></div>
          <div className="d-fig"><div className="k">{AR ? 'أنشطة حرجة' : 'Critical'}</div><div className="v" style={{ color: 'var(--on-surface)' }}>{sd.criticalCount}</div></div>
        </div>
      </div>

      <div className="d-sched-toolbar">
        <select className="d-form-input" style={{ width: 'auto', height: 34 }} value={verId} onChange={e => setVerId(e.target.value)}>
          {sd.versions.map(v => <option key={v.id} value={v.id}>{v.label} · {v.date}{v.current ? (AR ? ' (الحالي)' : ' (current)') : ''}</option>)}
        </select>
        <div className="d-seg">
          <button className={view === 'gantt' ? 'on' : ''} onClick={() => setView('gantt')}><Icon name="calendar_view_week" size={14} />{AR ? 'جانت' : 'Gantt'}</button>
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}><Icon name="table_rows" size={14} />{AR ? 'جدول' : 'Table'}</button>
          <button className={view === 'compare' ? 'on' : ''} onClick={() => setView('compare')}><Icon name="difference" size={14} />{AR ? 'المقارنة والأثر' : 'Compare & impact'}</button>
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="d-seg">
          <button className={basis === 'cost' ? 'on' : ''} onClick={() => setBasis('cost')} title={AR ? 'أساس الوزن: الكلفة' : 'Weight basis: cost'}><Icon name="payments" size={13} />{AR ? 'الكلفة' : 'Cost'}</button>
          <button className={basis === 'manhours' ? 'on' : ''} onClick={() => setBasis('manhours')} title={AR ? 'أساس الوزن: ساعات العمل' : 'Weight basis: man-hours'}><Icon name="schedule" size={13} />{AR ? 'ساعات العمل' : 'Man-hours'}</button>
        </div>
        {view !== 'compare' && <button className={`d-btn sm ${filterCrit ? 'accent' : ''}`} onClick={() => setFilterCrit(v => !v)}><Icon name="priority_high" size={15} />{AR ? 'المسار الحرج' : 'Critical path'}</button>}
      </div>

      {view === 'gantt' && (
        <div className="d-gantt-wrap">
          <div className="d-gantt-legend">
            <span className="li"><i className="bl"></i>{AR ? 'الخط الأساس' : 'Baseline'}</span>
            <span className="li"><i className="crit"></i>{AR ? 'مسار حرج' : 'Critical'}</span>
            <span className="li"><i className="ms"></i>{AR ? 'معلم' : 'Milestone'}</span>
            {Object.keys(SCHED_STATUS).map(k => <span className="li" key={k}><Icon name={SCHED_STATUS[k].icon} size={13} style={{ color: SCHED_STATUS[k].color }} />{SCHED_STATUS[k][lang]}</span>)}
          </div>
          <DGantt amdIdx={amdIdx} onAmd={a => setAmdAct(a)} sd={sd} acts={acts} wbsPct={roll.wbsPct} lang={lang} filterCrit={filterCrit} onSelect={setSelId} selId={selId} basis={basis} />
          {sel && (
            <div className="d-actpanel">
              <div className="d-actpanel-head"><b style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{sel.id} — {sel.name}<DSchedStatus st={selStatus} lang={lang} /></b><button className="d-icon-btn" onClick={() => setSelId(null)}><Icon name="close" size={16} /></button></div>
              <div className="d-dl" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: '10px 18px' }}>
                <div className="d-dl-i"><span className="k">{AR ? 'بداية الأساس' : 'Baseline start'}</span><span className="v mono">{sel.blStart}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'إنجاز الأساس' : 'Baseline finish'}</span><span className="v mono">{sel.blFinish}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'البداية الفعلية' : 'Actual start'}</span><span className="v mono">{schedActualStart(sel) || '—'}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'الإنجاز الفعلي' : 'Actual finish'}</span><span className="v mono" style={{ color: sel.slip > 0 && schedActualFinish(sel) ? 'var(--error)' : 'inherit' }}>{schedActualFinish(sel) || '—'}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'النوع' : 'Type'}</span><span className="v">{sel.actType}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'التقويم' : 'Calendar'}</span><span className="v">{sel.calendar}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'المدة الأصلية/المتبقية' : 'Orig / Rem dur'}</span><span className="v mono">{sel.origDur} / {sel.remDur} {AR ? 'يوم' : 'd'}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'العوم الكلي' : 'Total float'}</span><span className="v mono" style={{ color: sel.float === 0 ? 'var(--on-surface)' : 'inherit' }}>{sel.milestone ? '—' : sel.float + (AR ? ' يوم' : ' d')}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'هيكل التجزئة' : 'WBS'}</span><span className="v" style={{ fontSize: 12 }}>{sel.wbs}</span></div>
                <div className="d-dl-i"><span className="k">{AR ? 'السوابق' : 'Predecessors'}</span><span className="v mono">{sel.preds.length ? sel.preds.join(', ') : '—'}</span></div>
              </div>

              {amdIdx.acts[sel.id] && amdIdx.acts[sel.id].srcs.length ? (() => {
                const e = amdIdx.acts[sel.id]; const last = e.srcs[e.srcs.length - 1];
                return (<div className="d-act-amd">
                  <div className="hd"><Icon name="history" size={15} />
                    <b>{AR ? 'تعديل بأمر تغييري' : 'Amended by change order'}</b>
                    <DAmdMark lang={lang} e={e} onOpen={() => setAmdAct(sel)} /><div style={{ flex: 1 }}></div>
                    <button className="d-btn sm" onClick={() => setAmdAct(sel)}>{AR ? 'تسلسل التعديلات' : 'History'}</button>
                    <span className="d-cell-sub">{e.applied ? (AR ? 'نافذ — طُبِّق على الجدول' : 'Effective — applied to the schedule')
                      : (AR ? 'معتمد — لم يُطبَّق بعد' : 'Approved — not yet applied')}</span></div>
                  <div className="d-dl" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: '10px 18px' }}>
                    <div className="d-dl-i"><span className="k">{AR ? 'النهاية قبل التعديل' : 'Finish before'}</span><span className="v mono">{e.origFinish}</span></div>
                    <div className="d-dl-i"><span className="k">{AR ? 'النهاية النافذة' : 'Effective finish'}</span><span className="v mono">{e.applied ? e.effFinish : '—'}</span></div>
                    <div className="d-dl-i"><span className="k">{AR ? 'المتبقي قبل / بعد' : 'Remaining before / after'}</span><span className="v mono">{e.origRem} / {e.applied ? e.effRem : (last.remTo != null ? last.remTo : '—')} {AR ? 'يوم' : 'd'}</span></div>
                    <div className="d-dl-i"><span className="k">{AR ? 'مقدار التمديد' : 'Extension'}</span><span className="v mono">+{(e.applied ? e.effRem : (last.remTo || 0)) - e.origRem} {AR ? 'يوم' : 'd'}</span></div>
                  </div>
                  <div className="d-vow-note" style={{ marginTop: 10 }}><Icon name="info" size={15} />
                    <span>{AR ? 'تاريخ الأساس لم يتغيّر — هو المرجع التعاقدي الذي تُحتسب عليه الغرامات التأخيرية. التمديد يحرّك التاريخ التعاقدي في ملحق العقد.'
                      : 'The baseline is unchanged — it is the contractual reference the delay penalty is measured against. The extension moves the contractual date in the contract amendment.'}</span></div>
                </div>); })() : null}

              {!sel.milestone && (
                <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--outline-variant)', borderRadius: 'var(--r-md)', background: 'var(--surface-container-lowest)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <b style={{ fontSize: 13 }}>{AR ? 'تحديث الإنجاز' : 'Update progress'}</b>
                    <span className="mono" style={{ fontSize: 15, fontWeight: 'var(--fw-x)', color: 'var(--azure-600)' }}>{sel.pct}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={sel.pct} onChange={e => setPct(sel.id, parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="d-cell-sub">{AR ? 'المتبقي:' : 'Remaining:'} <b className="mono">{sel.remDur} {AR ? 'يوم' : 'd'}</b></span>
                    <div style={{ flex: 1 }}></div>
                    <button className="d-btn sm primary" onClick={() => showToast(AR ? 'حُدِّث الإنجاز — أُعيد حساب التجميع' : 'Progress saved — rollup recalculated')}><Icon name="check" size={14} />{AR ? 'حفظ التحديث' : 'Save update'}</button>
                  </div>
                  <div className="d-cell-sub" style={{ marginTop: 8, fontSize: 11.5 }}><Icon name="functions" size={12} style={{ verticalAlign: -2 }} /> {AR ? 'يُرحَّل إلى تجميع كل مستويات هيكل التجزئة والمشروع تلقائياً.' : 'Rolls up through every WBS level to the project automatically.'}</div>
                </div>
              )}

              {critDetail && (
                <React.Fragment>
                  <div className="d-section-title" style={{ marginTop: 16 }}>{AR ? 'أثر النشاط الحرج' : 'Critical-path impact'}</div>
                  <div className="d-fig-row" style={{ margin: 0 }}>
                    <div className="d-fig"><div className="k">{AR ? 'أثر التسليم' : 'Delivery impact'}</div><div className="v" style={{ color: 'var(--error)' }}>+{sel.slip}<small>{AR ? ' يوم على إنجاز المشروع' : 'd to project finish'}</small></div></div>
                    <div className="d-fig"><div className="k">{AR ? 'الإنجاز' : 'Progress'}</div><div className="v">{sel.pct}%<small> · {AR ? 'متبقٍ' : 'rem'} {sel.remDur}{AR ? 'ي' : 'd'}</small></div></div>
                    <div className="d-fig"><div className="k">{AR ? 'الأثر المالي' : 'Financial'}</div><div className="v mono" style={{ fontSize: 15 }}>{window.fmtNum(Math.round(sel.cost / (sel.origDur || 1) * 0.15 * sel.slip))}<small> IQD</small></div></div>
                  </div>
                  <div className="d-card-sub" style={{ marginTop: 10 }}><table className="d-line-table">
                    <tbody>
                      <tr><td>{AR ? 'كلفة النشاط' : 'Activity cost'}</td><td className="mono">{window.fmtNum(sel.cost)} IQD</td></tr>
                      <tr><td>{AR ? 'القيمة المكتسبة (النشاط)' : 'Earned value (activity)'}</td><td className="mono" style={{ color: 'var(--on-surface)' }}>{window.fmtNum(Math.round(sel.cost * sel.pct / 100))} IQD</td></tr>
                      <tr><td>{AR ? 'المتبقي المالي' : 'Remaining value'}</td><td className="mono">{window.fmtNum(Math.round(sel.cost * (1 - sel.pct / 100)))} IQD</td></tr>
                    </tbody>
                  </table></div>
                </React.Fragment>
              )}

              <div className="d-actpanel-links">
                <button className="d-btn sm ghost" onClick={() => showToast('Demo')}><Icon name="list_alt" size={14} />{AR ? 'بنود الكميات' : 'BOQ'}</button>
                <button className="d-btn sm ghost" onClick={() => showToast('Demo')}><Icon name="deployed_code" size={14} />{AR ? 'كائنات النموذج' : 'Model'}</button>
                <button className="d-btn sm ghost" onClick={() => showToast('Demo')}><Icon name="folder_open" size={14} />{AR ? 'الوثائق' : 'Docs'}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'table' && <DSchedTable amdIdx={amdIdx} onAmd={a => setAmdAct(a)} acts={filterCrit ? acts.filter(a => a.type === 'wbs' || a.critical) : acts} wbsPct={roll.wbsPct} lang={lang} onSelect={id => { setSelId(id); setView('gantt'); }} selId={selId} basis={basis} />}

      {view === 'compare' && (
        <React.Fragment>
          <div className="d-model-topbar">
            <div className="d-section-title" style={{ margin: 0 }}>{AR ? 'تحليل الأثر' : 'Impact analysis'} — {AR ? 'الأساس ↔ الحالي' : 'Baseline ↔ Current'}</div>
            <div style={{ flex: 1 }}></div>
            <button className="d-btn sm" onClick={exportImpact}><Icon name="download" size={15} />{AR ? 'تصدير إلى Excel' : 'Export to Excel'}</button>
            <button className="d-btn sm primary" onClick={() => showToast(AR ? 'اعتُمد الأثر — تجريبي' : 'Impact approved — demo')}><Icon name="verified" size={15} />{AR ? 'اعتماد الأثر' : 'Approve impact'}</button>
          </div>
          <div className="d-fig-row" >
            <div className="d-fig"><div className="k">{AR ? 'أنشطة متأثرة' : 'Affected activities'}</div><div className="v" style={{ color: 'var(--status-suspended-tx)' }}>{impact.length}</div></div>
            <div className="d-fig"><div className="k">{AR ? 'مضافة' : 'Added'}</div><div className="v" style={{ color: 'var(--on-surface)' }}>{sd.comparison.added.length}</div></div>
            <div className="d-fig"><div className="k">{AR ? 'أصبحت حرجة' : 'Now critical'}</div><div className="v" style={{ color: 'var(--on-surface)' }}>{sd.comparison.nowCritical.length}</div></div>
            <div className="d-fig"><div className="k">{AR ? 'أثر الكلفة (تقديري)' : 'Cost impact (est.)'}</div><div className="v mono" style={{ fontSize: 15, color: 'var(--error)' }}>{window.fmtNum(totalCostImpact)}<small> IQD</small></div></div>
          </div>

          <div className="d-callout" style={{ marginTop: 4 }}><span className="d-callout-ico"><Icon name="functions" size={18} /></span><div className="d-callout-tx"><span className="k">{AR ? 'طريقة احتساب أثر الكلفة' : 'How cost impact is calculated'}</span><b style={{ fontSize: 12, fontWeight: 'var(--fw-bold)' }}>{AR ? 'المعدل اليومي = كلفة النشاط ÷ المدة الأصلية · العبء اليومي = المعدل × ١٥٪ · أثر الكلفة = العبء اليومي × أيام الانزياح.' : 'Daily rate = activity cost ÷ original duration · Daily overhead = rate × 15% · Cost impact = daily overhead × slip days.'}</b></div></div>

          <div className="d-section-title">{AR ? 'الأنشطة المتأثرة — قبل / بعد' : 'Affected activities — before / after'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {impact.map((im, i) => (
              <div key={i} className="d-card-sub" style={{ padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--surface-container-high)' }}>
                  <span className="mono d-cell-sub">{im.id}</span>
                  <b style={{ fontSize: 13 }}>{im.name}</b>
                  <DSchedStatus st={im.status} lang={lang} />
                  {im.critical && <span className="d-pill stalled">{AR ? 'حرج' : 'Critical'}</span>}
                  <div style={{ flex: 1 }}></div>
                  <span className="mono" style={{ color: 'var(--error)', fontWeight: 'var(--fw-bold)' }}>+{im.slip}{AR ? ' يوم' : 'd'}</span>
                  <span className="mono d-cell-sub">· {window.fmtNum(im.costImpact)} IQD</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  {[0, 1].map(ci => (
                    <div key={ci} style={{ padding: '10px 14px', borderInlineStart: ci === 1 ? '1px solid var(--surface-container-high)' : 'none', background: ci === 1 ? 'color-mix(in srgb,var(--error) 4%,transparent)' : 'transparent' }}>
                      <div className="d-cell-sub" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>{ci === 0 ? (AR ? 'الأساس' : 'Baseline') : (AR ? 'الحالي' : 'Current')}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span className="d-cell-sub">{AR ? 'البداية' : 'Start'}</span><span className="mono">{ci === 0 ? im.blStart : im.curStart}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span className="d-cell-sub">{AR ? 'الإنجاز' : 'Finish'}</span><span className="mono" style={ci === 1 ? { color: 'var(--error)' } : null}>{ci === 0 ? im.blFinish : im.curFinish}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span className="d-cell-sub">{AR ? 'المدة' : 'Duration'}</span><span className="mono">{(ci === 0 ? im.durBefore : im.durAfter)} {AR ? 'يوم' : 'd'}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span className="d-cell-sub">{AR ? 'العوم' : 'Float'}</span><span className="mono">{(ci === 0 ? im.floatBefore : im.floatAfter)} {AR ? 'يوم' : 'd'}</span></div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', padding: '8px 14px', borderTop: '1px dashed var(--outline-variant)', fontSize: 11.5 }} className="d-cell-sub">
                  <span>{AR ? 'كلفة النشاط' : 'Activity cost'}: <b className="mono" style={{ color: 'var(--on-surface)' }}>{window.fmtNum(im.cost)}</b></span>
                  <span>{AR ? 'المعدل اليومي' : 'Daily rate'}: <b className="mono" style={{ color: 'var(--on-surface)' }}>{window.fmtNum(im.dailyRate)}</b></span>
                  <span>{AR ? 'عبء يومي (١٥٪)' : 'Daily overhead (15%)'}: <b className="mono" style={{ color: 'var(--on-surface)' }}>{window.fmtNum(im.dailyOverhead)}</b></span>
                  <span>× {AR ? 'انزياح' : 'slip'} {im.slip}{AR ? 'ي' : 'd'} = <b className="mono" style={{ color: 'var(--error)' }}>{window.fmtNum(im.costImpact)} IQD</b></span>
                </div>
              </div>
            ))}
          </div>

          {sd.comparison.nowCritical.length > 0 && (
            <div className="d-callout" style={{ marginTop: 14 }}><span className="d-callout-ico"><Icon name="priority_high" size={18} /></span><div className="d-callout-tx"><span className="k">{AR ? 'أنشطة أصبحت على المسار الحرج' : 'Newly critical activities'}</span><b>{sd.comparison.nowCritical.map(c => c.name).join(' · ')}</b></div></div>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { DModSchedule, DGantt, DSchedTable, DImportWizard, SCHED_STATUS, schedStatusOf, schedRollup });
