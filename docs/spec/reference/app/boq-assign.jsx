/* ============================================================
   BOQ↔Activity Assignment — design handoff screen 2, driven by
   REAL project data. Work queue + ONE focused editor (never a
   four-panel transfer list; the activity tree is an on-demand
   picker popover). `alloc` (owned by DBoqWorkspace) is the single
   source of truth; everything derives on render. Over-allocation
   blocks Save/Submit; duplicate activity warns only.
   Props: D (derived model), acts (real activities), wbsTree (for
   the picker), alloc/setAlloc, basis/setBasis, focusCode.
   ============================================================ */
function DBoqAssign({ lang, shell, D, acts, wbsTree, alloc, setAlloc, basis, setBasis, focusCode, showToast }) {
  const AR = lang === 'ar';
  const TOL = window.BOQ_TOL;
  const actOf = {}; (acts || []).forEach(a => actOf[a.id] = a);
  const actName = a => a ? (a.name || a.wbs || a.id) : '';
  const wAbs = a => a ? (basis === 'mh' ? (a.wMHAbs || 0) : (a.wCostAbs || 0)) : 0;

  const firstOver = D.items.find(x => x.state === 'over');
  const [activeId, setActiveId] = React.useState(focusCode || (firstOver && firstOver.code) || (D.items[0] && D.items[0].code));
  const [queueFilter, setQueueFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [distMenu, setDistMenu] = React.useState(false);
  const [pickerQuery, setPickerQuery] = React.useState('');
  React.useEffect(() => { if (focusCode) { setActiveId(focusCode); setQueueFilter('all'); } }, [focusCode]);
  /* a facet that filters the active item out of the list would leave the
     editor showing a record you can no longer see — follow the filter */
  React.useEffect(() => {
    if (!queue.length) return;
    if (!queue.some(x => x.code === activeId)) setActiveId(queue[0].code);
  }, [queueFilter]);
  /* L17: matrix edits are BATCHED — nothing is final until save, and the
     save summary states how many links were added, changed and removed.
     The baseline is the last committed state; edits show live against it. */
  const [baseline, setBaseline] = React.useState(() => JSON.parse(JSON.stringify(alloc || {})));
  const delta = React.useMemo(() => {
    let added = 0, changed = 0, removed = 0;
    const keys = new Set(Object.keys(baseline || {}).concat(Object.keys(alloc || {})));
    keys.forEach(code => {
      const was = (baseline[code] || []), now = (alloc[code] || []);
      const wasBy = {}; was.forEach(r => wasBy[r.act] = Number(r.pct) || 0);
      const nowBy = {}; now.forEach(r => nowBy[r.act] = Number(r.pct) || 0);
      Object.keys(nowBy).forEach(a => { if (!(a in wasBy)) added++; else if (wasBy[a] !== nowBy[a]) changed++; });
      Object.keys(wasBy).forEach(a => { if (!(a in nowBy)) removed++; });
    });
    return { added, changed, removed, any: added + changed + removed };
  }, [alloc, baseline]);
  const revert = () => { setAlloc(JSON.parse(JSON.stringify(baseline))); showToast(AR ? 'أُلغيت التعديلات غير المحفوظة' : 'Unsaved changes discarded'); };

  const active = activeId ? D.byCode[activeId] : null;
  const rows = active ? active.rows : [];
  const total = active ? active.pct : 0;
  const dup = active ? window.boqDupSet(rows) : {};
  const anyOver = D.counts.over > 0;

  const setRows = next => setAlloc(a => ({ ...a, [activeId]: next }));
  const editShare = (i, v) => { const n = Math.max(0, Number(String(v).replace(/[^\d.]/g, '')) || 0); setRows(rows.map((r, k) => k === i ? { ...r, pct: n } : r)); };
  const fillRemainder = i => { const others = rows.reduce((a, r, k) => a + (k === i ? 0 : (Number(r.pct) || 0)), 0); setRows(rows.map((r, k) => k === i ? { ...r, pct: Math.max(0, +(100 - others).toFixed(1)) } : r)); };
  const removeRow = i => setRows(rows.filter((_, k) => k !== i));
  const addActivity = id => { const rem = Math.max(0, +(100 - total).toFixed(1)); setRows([...rows, { act: id, pct: rem }]); setPickerOpen(false); setPickerQuery(''); };
  /* spread only what is left, evenly — the common move when one activity
     is fixed by contract and the rest share the remainder */
  const spreadRemainder = () => {
    if (!rows.length) { showToast(AR ? 'لا أنشطة لتوزيعها' : 'No activities to distribute'); return; }
    const left = +(100 - total).toFixed(1);
    if (Math.abs(left) < 0.05) { showToast(AR ? 'لا متبقٍ للتوزيع' : 'Nothing left to distribute'); return; }
    const each = +(left / rows.length).toFixed(1); let acc = 0;
    setRows(rows.map((r, k) => { const add = k === rows.length - 1 ? +(left - acc).toFixed(1) : each;
      acc = +(acc + add).toFixed(1); return { ...r, pct: Math.max(0, +((Number(r.pct) || 0) + add).toFixed(1)) }; }));
    showToast(AR ? 'وُزِّع المتبقي بالتساوي' : 'Remainder spread evenly');
  };
  const clearAll = () => { if (!rows.length) return; setRows(rows.map(r => ({ ...r, pct: 0 }))); };
  const autoDistribute = () => {
    if (!rows.length) { showToast(AR ? 'لا أنشطة لتوزيعها — أضف نشاطاً أولاً' : 'No activities to distribute — add one first'); return; }
    const sum = rows.reduce((a, r) => a + wAbs(actOf[r.act]), 0) || 1; let acc = 0;
    const out = rows.map((r, k) => { let p = k === rows.length - 1 ? +(100 - acc).toFixed(1) : +(wAbs(actOf[r.act]) / sum * 100).toFixed(1); acc = +(acc + p).toFixed(1); return { ...r, pct: Math.max(0, p) }; });
    setRows(out); showToast(AR ? 'وُزِّعت النسب تلقائياً حسب ' + (basis === 'mh' ? 'ساعات العمل' : 'الكلفة') : 'Auto-distributed by ' + (basis === 'mh' ? 'man-hours' : 'cost'));
  };
  const save = kind => {
    if (anyOver) { showToast(AR ? 'لا يمكن الحفظ: توجد بنود تجاوزت 100%' : 'Cannot save: some items exceed 100%'); return; }
    const sum = (AR ? delta.added + ' إضافة · ' + delta.changed + ' تعديل · ' + delta.removed + ' حذف'
                    : delta.added + ' added · ' + delta.changed + ' changed · ' + delta.removed + ' removed');
    setBaseline(JSON.parse(JSON.stringify(alloc)));
    showToast((kind === 'submit' ? (AR ? 'أُرسل للاعتماد — ' : 'Submitted — ') : (AR ? 'حُفظ الإسناد — ' : 'Assignment saved — ')) + sum);
  };

  const scale = 100 / Math.max(total, 100);
  const segColor = i => 'var(--seg-' + ((i % 6) + 1) + ')';

  const SUM = [['all', AR ? 'إجمالي البنود' : 'Total items', D.counts.all, null], ['full', AR ? 'مُخصَّص بالكامل' : 'Fully allocated', D.counts.full, 'full'], ['partial', AR ? 'جزئي' : 'Partial', D.counts.partial, 'partial'], ['over', AR ? 'تجاوز' : 'Over-allocated', D.counts.over, 'over'], ['none', AR ? 'غير مُخصَّص' : 'Unassigned', D.counts.none, 'none']];
  /* one facet, one result set: the filter IS the allocation state. The old
     five-to-three mapping made «الكل» and «مُخصَّص بالكامل» light up together
     and neither of them actually narrow the list. */
  const queue = D.items.filter(x => {
    if (query && !((x.code + ' ' + x.item).toLowerCase().includes(query.toLowerCase()))) return false;
    return queueFilter === 'all' ? true : x.state === queueFilter;
  });
  const pickerRows = (wbsTree || []).filter(w => !pickerQuery || ((w.id + ' ' + (w.name || w.wbs || '')).toLowerCase().includes(pickerQuery.toLowerCase())));

  const rem = 100 - total;
  const remMsg = active && (total > TOL.OVER ? <span className="over">{AR ? 'يتجاوز بـ ' : 'exceeds by '}<span dir="ltr">{(total - 100).toFixed(1)}%</span></span>
    : total >= TOL.FULL ? <span className="full">{AR ? 'متوازن — 100%' : 'balanced — 100%'}</span>
      : total <= 0 ? <span className="none">{AR ? 'غير مُخصَّص' : 'unallocated'}</span>
        : <span className="partial"><span dir="ltr">{rem.toFixed(1)}%</span> {AR ? 'غير مُخصَّص' : 'unallocated'}</span>);

  const S = shell || {};
  const METHODS = AR
    ? [{ id: 'cost', label: 'الوزن المطلق (الكلفة)' }, { id: 'mh', label: 'الوزن الزمني (ساعات العمل)' }]
    : [{ id: 'cost', label: 'Absolute weight (cost)' }, { id: 'mh', label: 'Time weight (man-hours)' }];

  return (
    <DModuleFrame
      title={S.title} sub={S.sub}
      tabs={S.tabs} tab={S.tab} onTab={S.onTab}
      toolbar={S.toolbar}
      actions={S.benBtn}
      aside={S.editPane}
      asideWide={S.editWide}
      commit={<React.Fragment>
        <span className={'saved ' + (anyOver ? 'bad' : delta.any ? 'dirty' : '')}>
          <Icon name={anyOver ? 'warning' : delta.any ? 'edit' : 'check_circle'} size={16} />
          {anyOver ? (AR ? D.counts.over + ' بند تجاوز 100% — يجب تصحيحه قبل الحفظ' : D.counts.over + ' item(s) exceed 100% — fix before saving')
            : delta.any ? (AR ? delta.added + ' إضافة · ' + delta.changed + ' تعديل · ' + delta.removed + ' حذف'
                              : delta.added + ' added · ' + delta.changed + ' changed · ' + delta.removed + ' removed')
              : (AR ? 'لا تغييرات غير محفوظة' : 'No unsaved changes')}
        </span>
        <span className="sp"></span>
        <button className="d-btn sm" disabled={!delta.any} onClick={revert}>{AR ? 'إلغاء' : 'Cancel'}</button>
        <button className="d-btn sm" disabled={anyOver || !delta.any} onClick={() => save('save')}>
          <Icon name="save" size={15} />{AR ? 'حفظ الإسناد' : 'Save assignment'}</button>
        <button className="d-btn sm primary" disabled={anyOver || !delta.any} onClick={() => save('submit')}>
          <Icon name="check_circle" size={15} />{AR ? 'إرسال للاعتماد' : 'Submit'}</button>
      </React.Fragment>}
      status={<DZ10 lang={lang} stats={[
        { k: AR ? 'بنود الكميات' : 'BOQ items', v: D.items.length },
        { k: AR ? 'الأنشطة' : 'Activities', v: (acts || []).length },
        { k: AR ? 'مطابق' : 'Balanced', v: D.counts.full + ' / ' + D.items.length },
      ]} />}>

      <div className="boq-assign-row">
        {/* the source list */}
        <DFGroup id="boq-queue" flush title={AR ? 'بنود الكميات (المصدر)' : 'BOQ items (source)'}
          sub={queue.length + (AR ? ' من ' : ' of ') + D.items.length}>
          <div className="d-toolbar">
            <div className="d-field">
              <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
              <input aria-label={AR ? 'بحث في القائمة' : 'Search queue'} placeholder={AR ? 'بحث…' : 'Search…'} value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
          {/* coverage as a facet list: one row per state, label left, count
              right. The chip row needed three lines in a 280px column. */}
          <div className="d-facets" role="group" aria-label={AR ? 'حالة الإسناد' : 'Assignment state'}>
            {SUM.map(function (x) { return (
              <button key={x[0]} className={queueFilter === x[0] ? 'on' : ''}
                aria-pressed={queueFilter === x[0]} disabled={x[0] !== 'all' && !x[2]}
                onClick={function () { setQueueFilter(x[0]); }}>
                <span className={'dot ' + (x[3] || 'all')}></span>
                <span className="lb">{x[1]}</span>
                <span className="n">{x[2]}</span>
              </button>); })}
          </div>
          <div className="boq-queue-b">
            {queue.map(x => (
              <button key={x.code} className={'boq-qcard' + (activeId === x.code ? ' on' : '')} onClick={() => { setActiveId(x.code); setPickerOpen(false); }}>
                <div className="l1"><span className="mono code">{x.code}</span><span className="sp"></span><window.BoqStateBadge state={x.state} lang={lang} /></div>
                <div className="l2" title={x.item}>{x.item}</div>
                <div className="l3"><span className="d-mini-bar"><span className="t"><span className={x.state} style={{ width: Math.min(100, x.pct) + '%' }}></span></span><span className="pc">{x.pct.toFixed(0)}%</span></span></div>
              </button>))}
            {!queue.length && <div className="d-cell-sub pad">{AR ? 'لا بنود مطابقة.' : 'No matching items.'}</div>}
          </div>
        </DFGroup>

        {/* the allocation control + target list */}
        {!active ? (
          <DFGroup id="boq-editor" title={AR ? 'الإسناد' : 'Assignment'}>
            <div className="d-empty">
              <span className="d-empty-ico"><Icon name="touch_app" size={26} /></span>
              <b>{AR ? 'اختر بنداً من القائمة' : 'Pick an item from the list'}</b>
              <span>{AR ? 'ابدأ من البنود ذات المشاكل لحلّها أولاً.' : 'Start from the flagged items first.'}</span>
            </div>
          </DFGroup>
        ) : (
          <DFGroup id="boq-editor" title={active.item} sub={active.code}>
            {/* coverage of THIS item */}
            <div className="d-yalloc">
              <div className="ah">
                <span className="k">{AR ? 'نسبة الإسناد' : 'Allocated'}</span>
                {remMsg}
                <b className="num">{total.toFixed(1)}%</b>
              </div>
              <div className="boq-segbar" role="img" aria-label={AR ? 'شريط التخصيص' : 'Allocation bar'}>
                {rows.map((r, i) => { const p = Number(r.pct) || 0; return <div key={i} className="boq-seg" title={r.act + ' · ' + p.toFixed(1) + '%'} style={{ width: (p * scale) + '%', background: segColor(i) }}></div>; })}
                {total < TOL.FULL && <div className="boq-seg-rem" style={{ flex: 1 }}></div>}
                {total > TOL.OVER && <div className="boq-limit" style={{ insetInlineStart: (100 * scale) + '%' }}></div>}
              </div>
              <div className="af boq-legend">
                {rows.map((r, i) => <span key={i}><em><span className="sw" style={{ background: segColor(i) }}></span>{r.act}</em><b className="num">{(Number(r.pct) || 0).toFixed(1)}%</b></span>)}
                {total < TOL.FULL && <span><em><span className="sw hatch"></span>{AR ? 'غير مُسنَد' : 'unallocated'}</em><b className="num">{Math.max(0, rem).toFixed(1)}%</b></span>}
              </div>
            </div>

            {/* L17 method transparency — inline, beside the control it explains */}
            <DMsgBar tone="info" icon="functions"
              title={(AR ? 'طريقة التوزيع: ' : 'Method: ') + (basis === 'cost'
                ? (AR ? 'الوزن المطلق (الكلفة)' : 'absolute weight (cost)')
                : (AR ? 'الوزن الزمني (ساعات العمل)' : 'time weight (man-hours)'))}>
              {AR ? 'التوزيع التلقائي يوزّع 100% بنسبة وزن كل نشاط — عمود «وزن النشاط». كل قيمة محسوبة قابلة للتجاوز يدوياً، والوزن المطلق = وزن البند من العقد '
                  : 'Auto-distribute spreads 100% by each activity own weight — the «activity wt» column. Every computed value is overridable; absolute weight = the item contract weight '}
              <b className="num">{active.weight.toFixed(2)}%</b>
              {AR ? ' × حصة النشاط.' : ' × the activity share.'}
            </DMsgBar>

            {Object.keys(dup).length > 0 && (
              <DMsgBar tone="warning" title={AR ? 'نشاط مكرَّر في الإسناد' : 'A duplicate activity is linked'}>
                {AR ? 'النشاط نفسه مرتبط أكثر من مرة — ادمج الحصص أو احذف المكرر.' : 'The same activity is linked more than once — merge the shares or remove the duplicate.'}
              </DMsgBar>
            )}

            {/* the target list */}
            <div className="d-tablewrap">
              <div className="d-toolbar">
                <span className="d-cell-sub">{AR ? 'الأنشطة المرتبطة (الهدف)' : 'Linked activities (target)'}</span>
                <div className="sp"></div>
                <span className={'boq-remchip ' + (total > TOL.OVER ? 'over' : total >= TOL.FULL ? 'full' : 'partial')}>
                  <em>{AR ? 'المتبقي' : 'Remaining'}</em><b className="num">{rem.toFixed(1)}%</b></span>
                {/* one menu instead of four controls: the basis is a parameter
                    of auto-distribute, so it lives with it rather than beside it */}
                <div className="boq-colmenu-wrap">
                  <button className="d-btn sm" aria-haspopup="true" aria-expanded={distMenu}
                    onClick={() => setDistMenu(v => !v)} disabled={!rows.length}>
                    <Icon name="auto_fix_high" size={15} />{AR ? 'توزيع' : 'Distribute'}
                    <Icon name="expand_more" size={14} />
                  </button>
                  {distMenu && <React.Fragment><div className="boq-menu-scrim" onClick={() => setDistMenu(false)}></div>
                    <div className="d-actmenu" role="menu">
                      <div className="sec">{AR ? 'أساس الوزن' : 'Weight basis'}</div>
                      <div className="segrow">
                        <button className={basis === 'cost' ? 'on' : ''} onClick={() => setBasis('cost')}>{AR ? 'الكلفة' : 'Cost'}</button>
                        <button className={basis === 'mh' ? 'on' : ''} onClick={() => setBasis('mh')}>{AR ? 'ساعات العمل' : 'Man-hours'}</button>
                      </div>
                      <div className="sec">{AR ? 'الإجراء' : 'Action'}</div>
                      <button role="menuitem" onClick={() => { setDistMenu(false); autoDistribute(); }}>
                        <Icon name="auto_fix_high" size={15} />
                        <span className="tx"><b>{AR ? 'توزيع تلقائي' : 'Auto-distribute'}</b>
                          <em>{AR ? 'يوزّع 100% بنسبة وزن كل نشاط' : 'spreads 100% by each activity weight'}</em></span></button>
                      <button role="menuitem" onClick={() => { setDistMenu(false); spreadRemainder(); }}>
                        <Icon name="functions" size={15} />
                        <span className="tx"><b>{AR ? 'وزّع المتبقي بالتساوي' : 'Spread the remainder evenly'}</b>
                          <em>{AR ? 'يبقي الحصص الحالية ويضيف المتبقي' : 'keeps current shares and adds what is left'}</em></span></button>
                      <button role="menuitem" className="danger" onClick={() => { setDistMenu(false); clearAll(); }}>
                        <Icon name="restart_alt" size={15} />
                        <span className="tx"><b>{AR ? 'تصفير الحصص' : 'Clear all shares'}</b>
                          <em>{AR ? 'يعيد كل الحصص إلى صفر' : 'resets every share to zero'}</em></span></button>
                    </div></React.Fragment>}
                </div>
                <div className="boq-picker-wrap">
                  <button className="d-btn sm primary" aria-haspopup="true" aria-expanded={pickerOpen} onClick={() => setPickerOpen(v => !v)}><Icon name="add" size={15} />{AR ? 'إضافة نشاط' : 'Add activity'}</button>
                  {pickerOpen && <React.Fragment><div className="boq-menu-scrim" onClick={() => setPickerOpen(false)}></div>
                    <div className="boq-picker" role="menu">
                      <div className="boq-picker-s"><Icon name="search" size={15} /><input autoFocus aria-label={AR ? 'بحث عن نشاط' : 'Search activities'} placeholder={AR ? 'بحث عن نشاط…' : 'Search activities…'} value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} /><button className="d-icon-btn sm" aria-label={AR ? 'إغلاق' : 'Close'} onClick={() => setPickerOpen(false)}><Icon name="close" size={15} /></button></div>
                      <div className="boq-picker-b">{pickerRows.map(w => (w.type === 'act')
                        ? <button key={w.id} role="menuitem" className="boq-picker-row act" style={{ paddingInlineStart: (10 + (w.level || 0) * 13) + 'px' }} onClick={() => addActivity(w.id)}><Icon name="task_alt" size={15} /><span className="mono cd">{w.id}</span><span className="nm">{actName(w)}</span><span className="mono aw">{wAbs(w).toFixed(2)}%</span></button>
                        : <div key={w.id} className="boq-picker-row wbs" style={{ paddingInlineStart: (10 + (w.level || 0) * 13) + 'px' }}><Icon name="folder" size={15} /><span className="mono cd">{w.id}</span><span className="nm">{w.wbs || w.name}</span></div>)}
                        {!pickerRows.length && <div className="d-cell-sub pad">{AR ? 'لا أنشطة.' : 'No activities.'}</div>}</div>
                    </div></React.Fragment>}
                </div>
              </div>
              {rows.length ? (
                <div className="d-vow-tw wide-alloc"><table className="d-line-table">
                  <thead><tr>
                    <th style={{ width: 104 }}>{AR ? 'النشاط' : 'Activity'}</th>
                    <th style={{ minWidth: 160 }}>{AR ? 'اسم النشاط' : 'Activity name'}</th>
                    <th className="r" style={{ width: 80 }}>{AR ? 'وزنه' : 'Its wt'}</th>
                    <th className="r" style={{ width: 76 }}>{AR ? 'الإنجاز' : 'Progress'}</th>
                    <th className="r" style={{ width: 124 }}>{AR ? 'الحصة' : 'Share'}</th>
                    <th className="r" style={{ width: 128 }}>{AR ? 'القيمة المُخصَّصة' : 'Assigned'} <span className="cur">({AR ? 'د.ع' : 'IQD'})</span></th>
                    <th style={{ width: 44 }} aria-label={AR ? 'إجراءات' : 'Actions'}></th>
                  </tr></thead>
                  <tbody>{rows.map((r, i) => { const a = actOf[r.act]; const isDup = dup[r.act]; return (
                    <tr key={i} className={isDup ? 'dup' : ''}>
                      {/* the segment colour identifies the row, so it rides with
                          the code instead of costing a column of its own */}
                      <td className="code"><span className="sw" style={{ background: segColor(i) }}></span>{r.act}</td>
                      <td className="name wrap">{a ? actName(a) : r.act}
                        {a && a.wbs && a.wbs !== actName(a) && <div className="d-cell-sub">{a.wbs}</div>}
                        {isDup && <span className="d-proposed">{AR ? 'مكرَّر' : 'duplicate'}</span>}</td>
                      <td className="r num">{wAbs(a).toFixed(2)}%</td>
                      <td className="r">{a ? <span className="d-mini-bar"><span className="t"><span style={{ width: (a.pct || 0) + '%' }}></span></span><span className="pc">{a.pct || 0}%</span></span> : <span className="d-cell-sub">—</span>}</td>
                      {/* share carries its own derived absolute weight and the
                          fill-remainder affordance, right where you edit it */}
                      <td className="r sharecell">
                        <span className="boq-shareinp">
                          <input className="mono" inputMode="decimal" aria-label={AR ? 'حصة البند' : 'Share of item'} value={r.pct} onChange={e => editShare(i, e.target.value)} /><i>%</i>
                          <button className="fill" title={AR ? 'إكمال المتبقي' : 'Fill remainder'} aria-label={AR ? 'إكمال المتبقي' : 'Fill remainder'} onClick={() => fillRemainder(i)}><Icon name="functions" size={13} /></button>
                        </span>
                        <div className="d-cell-sub">{AR ? 'وزن مطلق ' : 'abs. wt '}{(active.weight * (Number(r.pct) || 0) / 100).toFixed(3)}%</div>
                      </td>
                      <td className="r"><DMoney v={Math.round(active.amount * (Number(r.pct) || 0) / 100)} lang={lang} size="sm" bare /></td>
                      <td className="r">
                        <button className="d-icon-btn sm" aria-label={AR ? 'حذف' : 'Remove'} onClick={() => removeRow(i)}><Icon name="delete" size={16} /></button>
                      </td>
                    </tr>); })}</tbody>
                  <tfoot><tr>
                    <td colSpan={4}>{AR ? 'المجموع' : 'Total'}</td>
                    <td className="r sharecell"><b className="num">{total.toFixed(1)}%</b>
                      <div className="d-cell-sub">{AR ? 'وزن مطلق ' : 'abs. wt '}{(active.weight * total / 100).toFixed(3)}%</div></td>
                    <td className="r"><DMoney v={Math.round(active.amount * total / 100)} lang={lang} size="sm" bare /></td>
                    <td></td>
                  </tr></tfoot>
                </table></div>
              ) : (
                <div className="d-empty">
                  <span className="d-empty-ico"><Icon name="account_tree" size={26} /></span>
                  <b>{AR ? 'لا أنشطة مرتبطة' : 'No linked activities'}</b>
                  <span>{AR ? 'أضف نشاطاً لبدء الإسناد — القيمة غير المُسنَدة لا تُكتسب أبداً.' : 'Add an activity to start — an unallocated amount is never earned.'}</span>
                </div>
              )}
            </div>
          </DFGroup>
        )}
      </div>
    </DModuleFrame>);
}
Object.assign(window, { DBoqAssign });
