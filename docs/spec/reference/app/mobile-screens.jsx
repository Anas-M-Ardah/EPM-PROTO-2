/* ============================================================
   EPM Prototype — MOBILE NATIVE screens
   Home · Spaces · Activity · Workspace detail · Profile · Project sheet
   Uses globally-declared React hooks (from shell.jsx) + window.EPM.
   ============================================================ */

/* ---- small helpers ---- */
function MDonut({ value, size, stroke, color }) {
  const s = size || 56, w = stroke || 6, r = (s - w) / 2, c = 2 * Math.PI * r;
  return (
    <span className="m-donut" style={{ width: s, height: s }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="var(--surface-container-high)" strokeWidth={w}/>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={color || 'var(--azure-500)'} strokeWidth={w} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c*(1-value/100)} transform={`rotate(-90 ${s/2} ${s/2})`}/>
      </svg>
      <b>{value}%</b>
    </span>
  );
}

function MKpi({ icon, tone, value, suffix, label }) {
  return (
    <div className="m-kpi">
      <span className={`m-kpi-ico ${tone || ''}`}><Icon name={icon} size={18} /></span>
      <div className="m-kpi-val">{value}<i>{suffix}</i></div>
      <div className="m-kpi-lbl">{label}</div>
    </div>
  );
}

function MDistribution({ all, lang }) {
  const keys = ['ongoing','completed','stalled','suspended','withdrawn'];
  const counts = keys.map(k => ({ k, n: all.filter(p => p.status === k).length }));
  const total = all.length || 1;
  return (
    <div className="m-card pad">
      <div className="m-sec-title" style={{ marginBottom: 14 }}>{window.EPM.makeT(() => lang)('status_breakdown')}</div>
      <div className="m-dist-bar">
        {counts.map(c => c.n > 0 && <span key={c.k} className={`st-${c.k}`} style={{ width: (c.n/total*100)+'%' }}></span>)}
      </div>
      <div className="m-dist-legend">
        {counts.map(c => (
          <span key={c.k} className="m-dist-li"><i className={`st-${c.k}`}></i>{window.EPM.STATUS[c.k][lang]}<b>{c.n}</b></span>
        ))}
      </div>
    </div>
  );
}

function MSkelList({ rows }) {
  return (
    <div className="m-card">
      {Array.from({ length: rows || 5 }).map((_, i) => (
        <div key={i} className="m-skel-row">
          <span className="m-skel" style={{ width: 44, height: 44, borderRadius: 13 }}></span>
          <div style={{ flex: 1 }}>
            <span className="m-skel" style={{ display: 'block', width: '62%', height: 13, marginBottom: 8 }}></span>
            <span className="m-skel" style={{ display: 'block', width: '40%', height: 10 }}></span>
          </div>
        </div>
      ))}
    </div>
  );
}

function useFakeLoad(dep) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); const id = setTimeout(() => setLoading(false), 650); return () => clearTimeout(id); }, [dep]);
  return loading;
}

/* ---- activity rows (shared) ---- */
function MActRows({ list, lang }) {
  return list.map((a, i) => (
    <div key={i} className="m-act">
      <span className="m-act-av">{a.who[lang][0]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="m-act-txt"><b>{a.who[lang]}</b> {a.act[lang]} <span className="mono">{a.tgt}</span></div>
        <div className="m-act-time">{a.t[lang]}</div>
      </div>
    </div>
  ));
}

/* ============================================================
   HOME — enterprise portfolio
   ============================================================ */
function MHome({ t, lang, user, setSheet, openWorkspace, openProject, refreshKey, push }) {
  const WS = window.EPM.WORKSPACES;
  const loading = useFakeLoad(refreshKey);
  const totals = WS.reduce((a, w) => ({ active: a.active + w.active, proj: a.proj + w.projects }), { active: 0, proj: 0 });
  const avg = Math.round(WS.reduce((a, w) => a + w.completion, 0) / WS.length);
  const portfolio = WS.flatMap(w => window.EPM.buildProjects(w.id, w.projects));
  const topSpaces = [...WS].sort((a, b) => b.active - a.active).slice(0, 4);
  const ACT = window.EPM.ACTIVITY;
  const greet = lang === 'ar' ? 'مساء الخير،' : 'Good evening,';

  const walletCard = (
    <div className="m-wallet">
      <div className="m-wallet-top">
        <span className="m-wallet-chip"><span className="m-dot"></span>{lang === 'ar' ? 'محفظة المشاريع' : 'Project portfolio'}</span>
        <span className="m-wallet-emblem"><Icon name="engineering" size={18} /></span>
      </div>
      <div className="m-wallet-big">
        <div className="m-num">{totals.active}</div>
        <div className="m-lbl">{t('kpi_active')} · {WS.length} {t('kpi_workspaces')}</div>
      </div>
      <div className="m-wallet-prog">
        <div className="m-track"><span style={{ width: avg + '%' }}></span></div>
        <div className="m-pl"><span>{t('kpi_completion')}</span><span>{avg}%</span></div>
      </div>
      <div className="m-wallet-foot">
        <div><b>{totals.proj}</b><span>{lang === 'ar' ? 'إجمالي المشاريع' : 'Total projects'}</span></div>
        <div><b>{Math.max(2, Math.round(totals.active * 0.4))}</b><span>{t('kpi_due')}</span></div>
      </div>
    </div>
  );

  const topSpacesCard = (
    <div className="m-card">
      <div className="m-list">
        {topSpaces.map(w => (
          <button key={w.id} className="m-row" onClick={() => openWorkspace(w)}>
            <span className="m-row-emblem" style={{ background: w.color }}>{w.code}</span>
            <div className="m-row-main">
              <b>{w[lang]}</b>
              <div className="m-row-sub"><b style={{ color: 'var(--on-surface)' }}>{w.active}</b> {t('ws_active_short')} <span className="dot"></span> {w.completion}%</div>
            </div>
            <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={20} className="m-row-chev" />
          </button>
        ))}
      </div>
    </div>
  );

  const activityCard = <div className="m-card">{<MActRows list={ACT} lang={lang} />}</div>;
  const secTitle = (txt) => <div className="m-sec-row" style={{ margin: '0 0 10px' }}><span className="m-sec-title">{txt}</span></div>;

  return (
    <React.Fragment>
      <div className="m-hero brand">
        <div className="m-appbar">
          <div className="m-appbar-brand">
            <img src="brand/epm-icon.svg" alt="EPM" width="34" height="34" className="m-appbar-emblem" />
            <b>{t('app_title')}</b>
          </div>
          <button className="m-tb-btn" style={{ color: '#fff' }} onClick={() => push({ type: 'notifs' })} aria-label="Notifications">
            <Icon name="notifications" size={22} /><span className="m-badge-dot" style={{ position: 'absolute', marginTop: -13, marginInlineStart: -10, borderColor: 'transparent' }}></span>
          </button>
        </div>
        <button className="m-srow" style={{ background: 'rgba(255,255,255,.14)', marginTop: 14, padding: '10px 12px' }} onClick={() => setSheet({ type: 'switcher' })}>
          <span className="m-srow-emblem ent"><img src="brand/ministry-logo.svg" alt="" /></span>
          <span className="m-srow-txt"><b style={{ color: '#fff' }}>{t('all_workspaces')}</b><span style={{ color: '#cfe6fb' }}>{t('enterprise_ctx')}</span></span>
          <Icon name="unfold_more" size={18} style={{ marginInlineStart: 'auto', color: '#cfe6fb' }} />
        </button>
      </div>

      <MScroll onRefresh={() => {}}>
        <div className="m-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {walletCard}
          <MDistribution all={portfolio} lang={lang} />
        </div>
        <div className="m-sec"><div className="m-sec-row"><span className="m-sec-title">{t('recent')}</span></div></div>
        <div className="m-pad" style={{ paddingTop: 0 }}>{activityCard}</div>
      </MScroll>
    </React.Fragment>
  );
}

/* ============================================================
   SPACES — workspace browser
   ============================================================ */
function MSpaces(props) {
  const { t, lang, openWorkspace, refreshKey } = props;
  const WS = window.EPM.WORKSPACES;
  const loading = useFakeLoad(refreshKey);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const kinds = []; WS.forEach(w => { if (!kinds.some(k => k.en === w.kind.en)) kinds.push(w.kind); });
  const qn = q.trim().toLowerCase();
  let rows = WS.filter(w => kind === 'all' || w.kind.en === kind);
  if (qn) rows = rows.filter(w => w.ar.toLowerCase().includes(qn) || w.en.toLowerCase().includes(qn) || w.code.toLowerCase().includes(qn));
  rows = [...rows].sort((a, b) => b.active - a.active);

  const searchAndChips = (
    <React.Fragment>
      <div className="m-search">
        <Icon name="search" size={18} style={{ color: 'var(--on-surface-variant)' }} />
        <input placeholder={t('ws_search_ph')} value={q} onChange={e => setQ(e.target.value)} />
        {q && <button className="m-clear" onClick={() => setQ('')}><Icon name="close" size={13} /></button>}
      </div>
      <div className="m-chips" style={{ marginTop: 12 }}>
        <button className={`m-chip ${kind === 'all' ? 'on' : ''}`} onClick={() => setKind('all')}>{t('ws_all_kinds')}<span className="m-chip-n">{WS.length}</span></button>
        {kinds.map(k => (
          <button key={k.en} className={`m-chip ${kind === k.en ? 'on' : ''}`} onClick={() => setKind(k.en)}>{k[lang]}<span className="m-chip-n">{WS.filter(w => w.kind.en === k.en).length}</span></button>
        ))}
      </div>
    </React.Fragment>
  );

  const listCard = (
    loading ? <MSkelList rows={6} /> : rows.length === 0 ? (
      <div className="m-empty"><span className="m-empty-ico"><Icon name="search_off" size={30} /></span><b>{t('ws_no_results')}</b><span>{lang === 'ar' ? 'جرّب اسماً أو رمزاً آخر' : 'Try another name or code'}</span></div>
    ) : (
      <div className="m-card">
        <div className="m-list">
          {rows.map(w => (
            <button key={w.id} className="m-row m-wsrow" onClick={() => openWorkspace(w)}>
              <span className="m-row-emblem" style={{ background: w.color }}>{w.code}</span>
              <div className="m-wsrow-body">
                <b className="m-row-main" style={{ display: 'block' }}>{w[lang]}</b>
                <div className="m-wsrow-stats"><span>{w.kind[lang]}</span><span className="dot" style={{ width: 3, height: 3, borderRadius: 9, background: 'var(--outline)' }}></span><span><b>{w.active}</b> {t('ws_active_short')}</span></div>
                <div className="m-mini-prog"><div className="m-track"><span style={{ width: w.completion + '%' }}></span></div><span className="m-pct">{w.completion}%</span></div>
              </div>
              <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={20} className="m-row-chev" />
            </button>
          ))}
        </div>
      </div>
    )
  );

  return (
    <React.Fragment>
      <div className="m-hero">
        <h1 style={{ color: 'var(--on-surface)' }}>{t('adm_ws')}</h1>
        <p style={{ color: 'var(--on-surface-variant)' }}>{t('ws_sub')}</p>
      </div>
      <MScroll onRefresh={() => {}}>
        <div style={{ paddingTop: 14 }}>{searchAndChips}</div>
        <div className="m-pad">{listCard}</div>
      </MScroll>
    </React.Fragment>
  );
}

/* ============================================================
   ACTIVITY
   ============================================================ */
function MActivity({ t, lang, refreshKey }) {
  const loading = useFakeLoad(refreshKey);
  const ACT = window.EPM.ACTIVITY;
  const feed = [...ACT, ...ACT.map(a => ({ ...a, t: { ar: 'أمس', en: 'Yesterday' } })), ...ACT];
  return (
    <React.Fragment>
      <div className="m-hero">
        <h1 style={{ color: 'var(--on-surface)' }}>{t('recent')}</h1>
        <p style={{ color: 'var(--on-surface-variant)' }}>{lang === 'ar' ? 'كل ما يجري عبر مساحات العمل.' : 'Everything happening across your workspaces.'}</p>
      </div>
      <MScroll onRefresh={() => {}}>
        <div className="m-pad">
          {loading ? <MSkelList rows={7} /> : <div className="m-card"><MActRows list={feed} lang={lang} /></div>}
        </div>
      </MScroll>
    </React.Fragment>
  );
}

/* ============================================================
   PROFILE
   ============================================================ */
function MProfile({ t, lang, user, theme, setSheet }) {
  const [tab, setTab] = useState('account');
  const AUD = window.EPM.AUDIT;
  return (
    <React.Fragment>
      <div className="m-prof-hero">
        <button className="m-tb-btn" style={{ color: '#fff', position: 'absolute', insetInlineEnd: 10, top: 8 }} onClick={() => setSheet({ type: 'more' })} aria-label="Settings"><Icon name="settings" size={22} /></button>
        <span className="m-prof-av">{user.initials[lang]}</span>
        <div className="m-prof-meta">
          <div className="m-prof-name">{user.name[lang]}</div>
          <span className="m-prof-role">{user.role[lang]}</span>
          <span className="m-prof-mail">{user.email}</span>
        </div>
      </div>
      <MScroll>
          <div className="m-pad" style={{ paddingTop: 14, paddingBottom: 8 }}>
          <div className="m-seg">
            {[['account', t('account')], ['access', t('my_access')], ['activity', t('activity_log')]].map(([id, lbl]) => (
              <button key={id} className={`m-seg-btn ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{lbl}</button>
            ))}
          </div>
        </div>

        {tab === 'account' && (
          <div className="m-pad" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="m-card">
              <MField k={lang === 'ar' ? 'الاسم الكامل' : 'Full name'} v={user.name[lang]} />
              <MField k={t('email')} v={user.email} mono />
              <MField k={t('role')} v={user.role[lang]} />
              <MField k={t('org_unit')} v={user.unit[lang]} />
            </div>
            <div className="m-card">
              <MField k={lang === 'ar' ? 'كلمة السر' : 'Password'} v="•••••••••" />
              <MField k={lang === 'ar' ? 'آخر دخول' : 'Last sign-in'} v="2026-06-08 09:41" mono />
              <div className="m-field"><div className="m-field-l"><span className="m-srow-ico"><Icon name="verified_user" size={18} /></span><div><div className="m-field-k">{lang === 'ar' ? 'المصادقة الثنائية' : 'Two-factor'}</div><div className="m-field-v">{lang === 'ar' ? 'غير مفعّلة' : 'Disabled'}</div></div></div><button className="m-switch" aria-label="2fa"></button></div>
            </div>
          </div>
        )}

        {tab === 'access' && (
          <div className="m-pad" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="m-card pad">
              <div className="m-sec-title" style={{ marginBottom: 4 }}>{t('assignments')}</div>
              <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', lineHeight: 1.5, margin: '4px 0 8px' }}>{lang === 'ar' ? 'وصولك الفعّال = اتحاد هذه التكليفات، مقيّداً بمصفوفة الإجراءات.' : 'Effective access = union of these assignments, gated by the action matrix.'}</p>
              {user.assignments.map((a, i) => (
                <div key={i} className="m-field" style={{ paddingInline: 0 }}>
                  <div className="m-field-l"><span className={`plane-dot ${a.plane}`} style={{ width: 10, height: 10, borderRadius: 9 }}></span><div><div className="m-field-v" style={{ fontSize: 13 }}>{a.role[lang]}</div><div className="m-field-k">{a.scope[lang]}</div></div></div>
                  <span className={`m-pill ${a.plane === 'both' ? 'ongoing' : 'withdrawn'}`}>{a.plane === 'both' ? (lang === 'ar' ? 'تشغيلي + إداري' : 'Ops + Admin') : (lang === 'ar' ? 'تشغيلي' : 'Ops')}</span>
                </div>
              ))}
            </div>
            <div className="m-card">
              <div className="m-sec-title" style={{ padding: '16px 16px 0' }}>{lang === 'ar' ? 'الإجراءات المسموحة' : 'Permitted actions'}</div>
              <div className="m-tags">
                {window.EPM.MATRIX_ACTIONS[lang].map((a, i) => (
                  <span key={i} className={`m-tag ${i !== 7 ? 'on' : ''}`}><Icon name={i !== 7 ? 'check' : 'remove'} size={13} />{a}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="m-pad" style={{ paddingTop: 0 }}>
            <div className="m-card">
              <div className="m-list">
                {AUD.map((a, i) => (
                  <div key={i} className="m-row" style={{ cursor: 'default' }}>
                    <span className="m-srow-ico"><Icon name="history" size={18} /></span>
                    <div className="m-row-main"><b>{a.action[lang]} · {a.entity[lang]}</b><div className="m-row-sub"><span className="mono">{a.tgt}</span><span className="dot"></span><span className="mono">{a.ip}</span></div></div>
                    <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>{a.t.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 16px 8px', textAlign: 'center' }}>
          <img src="brand/ministry-logo.svg" alt={t('ministry')} width="46" height="46" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 'var(--fw-x)', color: 'var(--on-surface)' }}>{t('ministry')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--on-surface-variant)', marginTop: 2 }}>{t('dept')}</div>
          </div>
        </div>
      </MScroll>
    </React.Fragment>
  );
}

function MField({ k, v, mono }) {
  return (
    <div className="m-field">
      <div className="m-field-k">{k}</div>
      <div className={`m-field-v ${mono ? 'mono' : ''}`} style={mono ? { fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 13 } : null}>{v}</div>
    </div>
  );
}

Object.assign(window, { MHome, MSpaces, MActivity, MProfile, MDonut, MKpi, MDistribution, MField });
