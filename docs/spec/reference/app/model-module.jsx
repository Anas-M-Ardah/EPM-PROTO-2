/* ============================================================
   EPM — 3D Model Viewer (Requirements 04): model tree + filters,
   three.js canvas + toolbar, object property/link panel, and a
   side-by-side shop-drawing / site-image viewer with revision
   history and before/after. Drives the window.EPM3D engine.
   ============================================================ */

function DModelObjIcon({ disc }) {
  const map = { Structural: 'foundation', Mechanical: 'hvac', Electrical: 'bolt', 'إنشائي': 'foundation', 'ميكانيكي': 'hvac', 'كهربائي': 'bolt' };
  return <Icon name={map[disc] || 'deployed_code'} size={15} />;
}

function DModModel3D({ t, lang, p, showToast }) {
  const AR = lang === 'ar';
  const md = React.useMemo(() => window.EPM.buildModelData(p, lang), [p && p.id, lang]);
  const boxRef = React.useRef(null);
  const [selId, setSelId] = React.useState(null);
  const [ready, setReady] = React.useState(false);
  const [colorMode, setColorMode] = React.useState('status');
  const [isolated, setIsolated] = React.useState(false);
  const [discFilter, setDiscFilter] = React.useState('all');
  const [split, setSplit] = React.useState('drawing');
  const [openRev, setOpenRev] = React.useState(0);
  const [imgIdx, setImgIdx] = React.useState(0);
  const [compare, setCompare] = React.useState(false);

  const sel = md.objects.find(o => o.id === selId);
  const meta = React.useMemo(() => {
    const m = {}; md.objects.forEach(o => { m[o.id] = { status: o.status, discKey: o.discKey, critical: o.critical }; }); return m;
  }, [md]);
  const drawings = sel ? (md.drawings[sel.id] || []) : [];

  React.useEffect(() => {
    let poll, tries = 0;
    const boot = () => {
      if (window.EPM3D && boxRef.current) {
        window.EPM3D.create(boxRef.current, { meta, onSelect: id => { setSelId(id); setOpenRev(0); } });
        setReady(true);
      } else if (tries++ < 60) { poll = setTimeout(boot, 100); }
    };
    boot();
    return () => { clearTimeout(poll); window.EPM3D && window.EPM3D.dispose(); };
  }, [p && p.id]);

  React.useEffect(() => { if (ready && window.EPM3D) window.EPM3D.setColorMode(colorMode); }, [colorMode, ready]);
  React.useEffect(() => {
    if (!ready || !window.EPM3D) return;
    if (discFilter === 'all') window.EPM3D.showAll();
    else window.EPM3D.filter((id, m) => m && m.discKey === discFilter);
    setIsolated(false);
  }, [discFilter, ready]);

  const pick = id => { setSelId(id); setOpenRev(0); if (window.EPM3D) window.EPM3D.select(id); };
  const statusCls = s => s === 'completed' ? 'completed' : s === 'delayed' ? 'stalled' : s === 'inprogress' ? 'ongoing' : 'suspended';
  const tools = [
    { ic: 'zoom_out_map', lb: AR ? 'ملاءمة الكل' : 'Fit all', run: () => window.EPM3D && window.EPM3D.fit() },
    { ic: 'center_focus_strong', lb: AR ? 'تركيز على المحدد' : 'Focus selection', run: () => sel && window.EPM3D && window.EPM3D.focus(sel.id) },
    { ic: 'filter_center_focus', lb: AR ? 'عزل' : 'Isolate', run: () => { if (sel && window.EPM3D) { window.EPM3D.isolate(sel.id); setIsolated(true); } } },
    { ic: 'visibility', lb: AR ? 'إظهار الكل' : 'Show all', run: () => { window.EPM3D && window.EPM3D.showAll(); setIsolated(false); } },
    { ic: 'restart_alt', lb: AR ? 'إعادة ضبط' : 'Reset', run: () => { if (window.EPM3D) window.EPM3D.reset(); setSelId(null); setIsolated(false); } },
    { sim: true, ic: 'content_cut', lb: AR ? 'صندوق مقطعي (محاكاة)' : 'Section box (simulated)' },
    { sim: true, ic: 'straighten', lb: AR ? 'قياس (محاكاة)' : 'Measure (simulated)' },
    { sim: true, ic: 'edit', lb: AR ? 'تأشير (محاكاة)' : 'Markup (simulated)' },
    { sim: true, ic: 'photo_camera', lb: AR ? 'لقطة (محاكاة)' : 'Screenshot (simulated)' },
  ];

  return (
    <React.Fragment>
      <div className="d-model-topbar">
        <div className="d-section-title" style={{ margin: 0 }}>{t('mod_model')}</div>
        <div style={{ flex: 1 }}></div>
        <select className="d-form-input" style={{ width: 'auto', height: 32 }} onChange={e => showToast(AR ? 'تبديل إصدار النموذج — تجريبي' : 'Switch model version — demo')}>
          {md.versions.map(v => <option key={v.id}>{v.label} · {v.date}</option>)}
        </select>
        <div className="d-seg">
          <button className={colorMode === 'status' ? 'on' : ''} onClick={() => setColorMode('status')}>{AR ? 'الحالة' : 'Status'}</button>
          <button className={colorMode === 'discipline' ? 'on' : ''} onClick={() => setColorMode('discipline')}>{AR ? 'التخصص' : 'Discipline'}</button>
        </div>
      </div>

      <div className="d-model-shell3">
        {/* tree + filters */}
        <div className="d-model-tree">
          <b className="tt">{AR ? 'شجرة النموذج' : 'Model tree'}</b>
          <div className="d-model-filter">
            {['all', 'Structural', 'Mechanical', 'Electrical'].map(f => (
              <button key={f} className={`d-chip2 ${discFilter === f ? 'on' : ''}`} onClick={() => setDiscFilter(f)}>
                {f === 'all' ? (AR ? 'الكل' : 'All') : (AR ? { Structural: 'إنشائي', Mechanical: 'ميكانيكي', Electrical: 'كهربائي' }[f] : f)}
              </button>
            ))}
          </div>
          <div className="d-model-node grp">{AR ? 'المبنى A' : 'Building A'}</div>
          {['L00', 'L01', 'L02'].map(lv => (
            <React.Fragment key={lv}>
              <div className="d-model-node lvl" style={{ paddingInlineStart: 20 }}><Icon name="layers" size={13} />{lv}</div>
              {md.objects.filter(o => o.level === lv && (discFilter === 'all' || o.discKey === discFilter)).map(o => (
                <button key={o.id} className={`d-model-node obj ${selId === o.id ? 'on' : ''}`} style={{ paddingInlineStart: 34 }} onClick={() => pick(o.id)}>
                  <DModelObjIcon disc={o.discKey} />
                  <span className="nm">{o.name}</span>
                  {o.critical && <span className="d-crit-dot"></span>}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* canvas */}
        <div className="d-model-canvas3">
          <div className="d-model-toolbar">
            {tools.map((tl, i) => (
              <button key={i} className="d-model-tool live" title={tl.lb} onClick={() => tl.sim ? showToast(tl.lb) : tl.run()}><Icon name={tl.ic} size={15} /></button>
            ))}
            {isolated && <span className="d-model-badge">{AR ? 'وضع العزل' : 'Isolated'}</span>}
          </div>
          <div className="d-model-viewport" ref={boxRef}>
            {!ready && <div className="d-model-loading"><div className="d-spin"></div><span>{AR ? 'تحميل النموذج…' : 'Loading model…'}</span></div>}
          </div>
          <div className="d-model-legend">
            {(colorMode === 'status'
              ? [['completed', AR ? 'مكتمل' : 'Completed', '#2e9e6b'], ['inprogress', AR ? 'قيد التنفيذ' : 'In progress', '#2f6fdb'], ['delayed', AR ? 'متأخر' : 'Delayed', '#d23f3f'], ['critical', AR ? 'حرج' : 'Critical', '#e08636']]
              : [['s', AR ? 'إنشائي' : 'Structural', '#8792a8'], ['m', AR ? 'ميكانيكي' : 'Mechanical', '#c98a4b'], ['e', AR ? 'كهربائي' : 'Electrical', '#d0b03f']]
            ).map(([k, lb, c]) => <span key={k} className="li"><i style={{ background: c }}></i>{lb}</span>)}
          </div>
        </div>

        {/* properties */}
        <div className="d-model-props">
          {!sel ? (
            <div className="d-empty" style={{ margin: 'auto', padding: 20 }}><span className="d-empty-ico"><Icon name="ads_click" size={24} /></span><b style={{ fontSize: 13 }}>{AR ? 'اختر كائناً' : 'Select an object'}</b><p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>{AR ? 'من النموذج أو الشجرة' : 'in the model or tree'}</p></div>
          ) : (
            <React.Fragment>
              <div className="d-model-props-head">
                <b>{sel.name}</b>
                <span className="mono d-cell-sub">{sel.id}</span>
                <span className={`d-pill ${statusCls(sel.status)}`} style={{ marginTop: 6 }}>{window.EPM.STATUS[sel.status === 'inprogress' ? 'ongoing' : sel.status === 'delayed' ? 'stalled' : sel.status === 'completed' ? 'completed' : 'suspended'][lang]}</span>
              </div>
              <div className="d-model-plist">
                {[[AR ? 'التخصص' : 'Discipline', sel.discipline], [AR ? 'الطابق' : 'Level', sel.level], [AR ? 'المنطقة' : 'Zone', sel.zone], [AR ? 'الكمية' : 'Quantity', sel.qty + ' ' + sel.unit], [AR ? 'الإصدار' : 'Revision', sel.revision], [AR ? 'الإنجاز' : 'Progress', sel.progress + '%']].map(([k, v], i) => (
                  <div key={i} className="d-plist-i"><span className="k">{k}</span><span className="v">{v}</span></div>
                ))}
              </div>
              <div className="d-model-link">
                <span className="lk-t">{AR ? 'الروابط' : 'Links'}</span>
                <button className="d-linkrow" onClick={() => showToast(AR ? 'فتح بند الكميات — تجريبي' : 'Open BOQ item — demo')}><Icon name="list_alt" size={14} /><span>{sel.boqCode} — {sel.boqDesc}</span><Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></button>
                <button className="d-linkrow" onClick={() => showToast(AR ? 'فتح النشاط — تجريبي' : 'Open activity — demo')}><Icon name="calendar_month" size={14} /><span>{sel.activityId} — {sel.activityName}</span><Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></button>
                <button className="d-linkrow" onClick={() => window.EPM3D && window.EPM3D.focus(sel.id)}><Icon name="center_focus_strong" size={14} /><span>{AR ? 'تركيز في النموذج' : 'Focus in model'}</span><Icon name={AR ? 'chevron_left' : 'chevron_right'} size={14} /></button>
              </div>
            </React.Fragment>
          )}
        </div>
      </div>

      {/* split viewer: shop drawing / images beside model */}
      {sel && (
        <div className="d-model-split">
          <div className="d-model-split-head">
            <div className="d-seg">
              <button className={split === 'drawing' ? 'on' : ''} onClick={() => setSplit('drawing')}><Icon name="description" size={14} />{AR ? 'المخطط' : 'Shop drawing'}</button>
              <button className={split === 'images' ? 'on' : ''} onClick={() => setSplit('images')}><Icon name="image" size={14} />{AR ? 'الصور' : 'Images'}</button>
            </div>
            <div style={{ flex: 1 }}></div>
            {split === 'images' && <button className={`d-btn sm ${compare ? 'accent' : ''}`} onClick={() => setCompare(v => !v)}><Icon name="compare" size={14} />{AR ? 'قبل/بعد' : 'Before/after'}</button>}
            <button className="d-btn sm" onClick={() => showToast('Demo')}><Icon name="open_in_full" size={14} />{AR ? 'ملء الشاشة' : 'Full screen'}</button>
          </div>

          {split === 'drawing' && (
            drawings.length ? (
              <div className="d-model-drawing">
                <div className="d-drawing-canvas">
                  <div className="d-drawing-sheet">
                    <div className="d-drawing-tb">{drawings[openRev].no} · {drawings[openRev].rev}</div>
                    <Icon name="architecture" size={64} style={{ color: 'var(--outline-variant)' }} />
                    <span className="d-cell-sub">{drawings[openRev].title}</span>
                    {!drawings[openRev].current && <span className="d-superseded">{AR ? 'إصدار متجاوَز' : 'Superseded revision'}</span>}
                  </div>
                  <div className="d-drawing-mini">
                    {['zoom_in', 'zoom_out', 'rotate_right', 'fit_screen'].map(ic => <button key={ic} className="d-model-tool live" onClick={() => showToast(AR ? 'أداة عرض — محاكاة' : 'Viewer tool — simulated')}><Icon name={ic} size={14} /></button>)}
                  </div>
                </div>
                <div className="d-drawing-side">
                  <div className="d-dl-i" style={{ marginBottom: 10 }}><span className="k">{AR ? 'رقم المخطط' : 'Drawing no.'}</span><span className="v mono">{drawings[0].no}</span></div>
                  <div className="d-dl-i" style={{ marginBottom: 10 }}><span className="k">{AR ? 'التخصص' : 'Discipline'}</span><span className="v">{drawings[0].disc}</span></div>
                  <b className="d-rev-title">{AR ? 'سجل المراجعات' : 'Revision history'}</b>
                  {drawings.map((dr, i) => (
                    <button key={i} className={`d-rev-pick ${openRev === i ? 'on' : ''}`} onClick={() => setOpenRev(i)}>
                      <span className="d-rev-tag">{dr.rev}</span>
                      <span className="mono d-cell-sub" style={{ flex: 1 }}>{dr.date}</span>
                      {dr.current ? <span className="d-pill completed" style={{ height: 18 }}>{AR ? 'الحالي' : 'Current'}</span> : <span className="d-cell-sub" style={{ fontSize: 11 }}>{AR ? 'متجاوَز' : 'Superseded'}</span>}
                    </button>
                  ))}
                  <button className="d-btn sm ghost" style={{ marginTop: 10 }} onClick={() => showToast('Demo')}><Icon name="download" size={14} />{AR ? 'تنزيل' : 'Download'}</button>
                </div>
              </div>
            ) : (
              <div className="d-empty" style={{ padding: 30 }}><span className="d-empty-ico"><Icon name="description" size={24} /></span><b style={{ fontSize: 13 }}>{AR ? 'لا يوجد مخطط مرتبط' : 'No linked drawing'}</b><p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>{AR ? 'هذا الكائن غير مرتبط بمخطط تنفيذي.' : 'This object has no linked shop drawing.'}</p></div>
            )
          )}

          {split === 'images' && (
            <div className="d-model-images">
              {compare ? (
                <div className="d-img-compare">
                  <div className="d-img-big" style={{ background: md.images[0].tint }}><span className="d-img-tag">{AR ? 'قبل' : 'Before'} · {md.images[1].date}</span></div>
                  <div className="d-img-big" style={{ background: md.images[imgIdx].tint }}><span className="d-img-tag">{AR ? 'بعد' : 'After'} · {md.images[imgIdx].date}</span></div>
                </div>
              ) : (
                <div className="d-img-big solo" style={{ background: md.images[imgIdx].tint }}>
                  <span className="d-img-tag">{md.images[imgIdx].cat} · {md.images[imgIdx].date} · {md.images[imgIdx].by}</span>
                </div>
              )}
              <div className="d-img-strip">
                {md.images.map((im, i) => (
                  <button key={i} className={`d-img-thumb ${imgIdx === i ? 'on' : ''}`} style={{ background: im.tint }} onClick={() => setImgIdx(i)} title={im.title}></button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { DModModel3D });
