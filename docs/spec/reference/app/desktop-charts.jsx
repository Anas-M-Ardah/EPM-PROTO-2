/* ============================================================
   EPM — DESKTOP chart primitives for the Projects & Contracts
   Dashboard (Business Vision Phase 1 §9): multi-segment donut,
   3-bar cost comparison, annual-spend line, mini timelines.
   ============================================================ */

function DDonutMulti({ segments, size, stroke }) {
  const s = size || 150, w = stroke || 20, r = (s - w) / 2, c = 2 * Math.PI * r;
  const total = segments.reduce((a, x) => a + x.value, 0) || 1;
  let acc = 0;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="var(--surface-container-high)" strokeWidth={w} />
      {segments.filter(x => x.value > 0).map((x, i) => {
        const frac = x.value / total;
        const dash = frac * c;
        const rotateDeg = -90 + acc * 360;
        acc += frac;
        return <circle key={i} cx={s/2} cy={s/2} r={r} fill="none" stroke={x.color} strokeWidth={w}
          strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(${rotateDeg} ${s/2} ${s/2})`} />;
      })}
    </svg>
  );
}

function DBarCompare({ items }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="d-bar-compare">
      {items.map((it, i) => (
        <div className="col" key={i}>
          <span className="val">{it.display}</span>
          <span className="bar" style={{ height: Math.max(8, it.value / max * 130) + 'px', background: it.color }}></span>
          <span className="lbl">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function DLineTrend({ points, color }) {
  const w = 100, h = 46, vals = points.map(p => p.value), max = Math.max(...vals, 1);
  const xs = points.map((p, i) => i / (points.length - 1) * w);
  const ys = points.map(p => h - 4 - (p.value / max) * (h - 10));
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <div className="d-line-chart">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={130} preserveAspectRatio="none">
        <defs><linearGradient id="epmLineTrendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.25"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
        <path d={area} fill="url(#epmLineTrendGrad)" />
        <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="1.7" fill={color} />)}
      </svg>
      <div className="yrow">{points.map((p, i) => <span key={i}>{p.year}</span>)}</div>
    </div>
  );
}

function DTlMini({ items, onRowClick }) {
  return (
    <div className="d-tl-mini">
      {items.map((it, i) => {
        const overrun = it.expectedFinish > it.plannedFinish;
        return (
          <button className="d-tl-mini-row" key={i} onClick={() => onRowClick && onRowClick(it)}>
            <span className="d-tl-mini-name">{it.name}</span>
            <div>
              <div className="d-tl-mini-track"><span className="d-tl-mini-fill" style={{ width: Math.min(100, it.pct) + '%', background: it.color }}></span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{it.start}</span>
                <span className="mono" style={{ fontSize: 11, color: overrun ? 'var(--error)' : 'var(--on-surface-variant)' }}>{overrun ? it.expectedFinish : it.plannedFinish}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DDualLine({ series, xLabels }) {
  const w = 100, h = 50;
  const all = series.flatMap(s => s.points);
  const max = Math.max(...all, 1);
  const paths = series.map(s => {
    const xs = s.points.map((v, i) => i / (s.points.length - 1) * w);
    const ys = s.points.map(v => h - 4 - (v / max) * (h - 10));
    return { color: s.color, line: xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' '), xs, ys };
  });
  return (
    <div className="d-line-chart">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={130} preserveAspectRatio="none">
        {paths.map((p, i) => <path key={i} d={p.line} fill="none" stroke={p.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />)}
        {paths.map((p, i) => p.xs.map((x, j) => <circle key={i + '-' + j} cx={x} cy={p.ys[j]} r="1.6" fill={p.color} />))}
      </svg>
      <div className="yrow">{xLabels.map((y, i) => <span key={i}>{y}</span>)}</div>
      <div className="d-chart-legend" style={{ padding: '10px 0 0' }}>
        {series.map((s, i) => <span className="li" key={i}><i style={{ background: s.color }}></i>{s.label}</span>)}
      </div>
    </div>
  );
}

/* Project S-curve: periodic plan-vs-actual bars + cumulative plan-vs-actual lines.
   data: [{ label, planPeriod, actPeriod, planCum, actCum }]  (values 0–100 %) */
function DSCurve({ data, lang }) {
  const AR = lang === 'ar';
  // uniform-scaled viewBox (no preserveAspectRatio distortion)
  const W = 760, H = 300, padL = 40, padR = 18, padT = 16, padB = 34;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = data.length;
  const slot = iw / n;
  const barW = Math.min(26, slot * 0.24);
  const gap = 5;
  const maxPeriod = Math.max(...data.map(d => Math.max(d.planPeriod, d.actPeriod)), 1);
  const base = padT + ih;
  const yCum = v => padT + ih - (v / 100) * ih;
  const yBar = v => (v / maxPeriod) * (ih * 0.62);
  const cx = i => padL + slot * i + slot / 2;
  const cumPts = key => data.map((d, i) => [cx(i), yCum(d[key])]);
  const cumPtsDefined = key => data.map((d, i) => d[key] == null ? null : [cx(i), yCum(d[key])]).filter(Boolean);
  const line = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = pts => `${line(pts)} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z`;
  const actPts = cumPtsDefined('actCum'), planPts = cumPts('planCum');
  const grid = [0, 25, 50, 75, 100];
  const uid = React.useMemo(() => 'sc' + Math.random().toString(36).slice(2, 7), []);
  const legend = [
    { k: AR ? 'مخطط الفترة' : 'Planned (period)', swatch: <rect x="0" y="3" width="12" height="10" rx="2" fill="var(--surface-container-highest)" stroke="var(--outline)" strokeWidth="1" /> },
    { k: AR ? 'فعلي الفترة' : 'Actual (period)', swatch: <rect x="0" y="3" width="12" height="10" rx="2" fill="var(--viz-1)" /> },
    { k: AR ? 'تراكمي مخطط' : 'Cum. planned', swatch: <line x1="0" y1="8" x2="14" y2="8" stroke="var(--viz-base)" strokeWidth="2" strokeDasharray="4 3" /> },
    { k: AR ? 'تراكمي فعلي' : 'Cum. actual', swatch: <line x1="0" y1="8" x2="14" y2="8" stroke="var(--viz-1)" strokeWidth="2.5" strokeLinecap="round" /> },
  ];
  return (
    <div className="d-chart-card">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', height: 'auto', direction: 'ltr' }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-1)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--viz-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={yCum(g)} x2={W - padR} y2={yCum(g)} stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray={g === 0 ? '0' : '2 4'} opacity={g === 0 ? 1 : 0.7} />
            <text x={padL - 8} y={yCum(g) + 3.5} textAnchor="end" fontSize="10.5" fill="var(--on-surface-variant)">{g}%</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x0 = cx(i) - barW - gap / 2;
          const x1 = cx(i) + gap / 2;
          return (
            <g key={i}>
              <rect x={x0} y={base - yBar(d.planPeriod)} width={barW} height={yBar(d.planPeriod)} rx="3" fill="var(--viz-track)" stroke="var(--viz-base)" strokeWidth="1" />
              <rect x={x1} y={base - yBar(d.actPeriod)} width={barW} height={yBar(d.actPeriod)} rx="3" fill="var(--viz-1)" />
            </g>
          );
        })}
        <path d={area(actPts)} fill={`url(#${uid})`} />
        <path d={line(planPts)} fill="none" stroke="var(--viz-base)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={line(actPts)} fill="none" stroke="var(--viz-1)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
        {planPts.map((p, i) => <circle key={'p' + i} cx={p[0]} cy={p[1]} r="3" fill="var(--surface)" stroke="var(--viz-base)" strokeWidth="1.5" />)}
        {actPts.map((p, i) => <circle key={'a' + i} cx={p[0]} cy={p[1]} r="4" fill="var(--surface)" stroke="var(--viz-1)" strokeWidth="2.5" />)}
        {data.map((d, i) => <text key={'l' + i} x={cx(i)} y={H - 12} textAnchor="middle" fontSize="10.5" fill="var(--on-surface-variant)">{d.label}</text>)}
      </svg>
      <div className="d-chart-legend">
        {legend.map((l, i) => <span className="li" key={i}><svg width="14" height="16" style={{ flex: 'none' }}>{l.swatch}</svg>{l.k}</span>)}
      </div>
    </div>
  );
}

Object.assign(window, { DDonutMulti, DBarCompare, DLineTrend, DDualLine, DTlMini, DSCurve });
