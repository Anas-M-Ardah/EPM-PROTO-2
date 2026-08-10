/* ============================================================
   EPM Prototype — MOBILE NATIVE shell
   MobileApp root: status bar · top app bar · bottom tab bar ·
   bottom sheet · stack navigation · gestures (PTR/swipe).
   Depends on window.EPM + shared atoms (Icon, Avatar...).
   ============================================================ */
const { useState: mS, useEffect: mE, useRef: mR, useCallback: mCB } = React;

/* ---- viewport hook ---- */
function useMediaQuery(q) {
  const [m, setM] = mS(() => window.matchMedia(q).matches);
  mE(() => {
    const mq = window.matchMedia(q);
    const h = e => setM(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}

/* ---- mock status bar (battery / signal) ---- */
function MStatusBar({ onHero }) {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  return (
    <div className={`m-status ${onHero ? 'on-hero' : ''}`}>
      <span>{hh}:{mm}</span>
      <span className="m-stat-r">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M8 2.2c2 0 3.8.8 5.1 2.1l.9-.9A8.3 8.3 0 0 0 8 1 8.3 8.3 0 0 0 2 3.4l.9.9A7.2 7.2 0 0 1 8 2.2Z"/><path d="M8 5.2c1.2 0 2.3.5 3.1 1.3l.9-.9A5.7 5.7 0 0 0 8 4 5.7 5.7 0 0 0 4 5.6l.9.9A4.5 4.5 0 0 1 8 5.2Z"/><circle cx="8" cy="9" r="1.6"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor"/><rect x="23" y="3.5" width="1.6" height="5" rx="0.8" fill="currentColor" opacity="0.5"/></svg>
      </span>
    </div>
  );
}

/* ---- bottom sheet ---- */
function MSheet({ title, onClose, children, headRight, className }) {
  mE(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <React.Fragment>
      <div className="m-sheet-scrim" onClick={onClose}></div>
      <div className={`m-sheet ${className || ''}`} role="dialog" aria-modal="true">
        <div className="m-sheet-grab"></div>
        {(title || headRight) && (
          <div className="m-sheet-head">
            <b>{title}</b>
            {headRight || <button className="m-sheet-x" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>}
          </div>
        )}
        <div className="m-sheet-body">{children}</div>
      </div>
    </React.Fragment>
  );
}

/* ---- pull-to-refresh wrapper ---- */
function MScroll({ children, onRefresh, noTabbar, scrollRef }) {
  const ref = scrollRef || mR(null);
  const [pull, setPull] = mS(0);
  const [refreshing, setRefreshing] = mS(false);
  const start = mR(null);

  const onTouchStart = e => { if (ref.current && ref.current.scrollTop <= 0) start.current = e.touches[0].clientY; };
  const onTouchMove = e => {
    if (start.current == null) return;
    const d = e.touches[0].clientY - start.current;
    if (d > 0 && ref.current.scrollTop <= 0) setPull(Math.min(d * 0.5, 70));
  };
  const onTouchEnd = () => {
    if (pull > 50 && onRefresh) {
      setRefreshing(true); setPull(36);
      setTimeout(() => { setRefreshing(false); setPull(0); onRefresh && onRefresh(); }, 900);
    } else setPull(0);
    start.current = null;
  };
  return (
    <div className={`m-scroll ${noTabbar ? 'no-tabbar' : ''}`} ref={ref}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ transform: pull ? `translateY(${pull}px)` : '', transition: start.current == null ? 'transform .3s' : 'none' }}>
      {(pull > 4 || refreshing) && (
        <div className="m-ptr" style={{ opacity: Math.min(pull / 50, 1) }}>
          <Icon name="sync_alt" size={20} style={{ animationPlayState: refreshing ? 'running' : 'paused' }} />
        </div>
      )}
      {children}
    </div>
  );
}

/* ---- swipe-to-reveal row ---- */
function MSwipe({ children, actions }) {
  const [revealed, setRevealed] = mS(false);
  const start = mR(null);
  const onTouchStart = e => { start.current = e.touches[0].clientX; };
  const onTouchEnd = e => {
    if (start.current == null) return;
    const d = e.changedTouches[0].clientX - start.current;
    const rtl = document.documentElement.dir === 'rtl';
    // reveal when swiping toward the action side
    if ((rtl && d > 40) || (!rtl && d < -40)) setRevealed(true);
    else if ((rtl && d < -40) || (!rtl && d > 40)) setRevealed(false);
    start.current = null;
  };
  return (
    <div className={`m-swipe ${revealed ? 'revealed' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="m-swipe-actions">{actions}</div>
      <div className="m-swipe-fg" onClick={() => revealed && setRevealed(false)}>{children}</div>
    </div>
  );
}

/* ---- bottom tab bar ---- */
function MTabBar({ tab, setTab, t }) {
  const tabs = [
    { id: 'home',    icon: 'dashboard', label: t('nav_home') },
    { id: 'spaces',  icon: 'apartment', label: t('adm_ws') },
    { id: 'activity',icon: 'bolt',      label: t('recent'), dot: true },
    { id: 'profile', icon: 'person',    label: t('profile') },
  ];
  return (
    <nav className="m-tabbar">
      {tabs.map(tb => (
        <button key={tb.id} className={`m-tab ${tab === tb.id ? 'on' : ''}`} onClick={() => setTab(tb.id)}>
          <span className="m-tab-ico">
            <Icon name={tb.icon} size={23} />
            {tb.dot && <span className="m-badge-dot"></span>}
          </span>
          <span>{tb.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ============================================================
   MobileApp — root
   ============================================================ */
function MobileApp({ t, lang, setLang, theme, setTheme, user, fill, onSignout }) {
  const [tab, setTab] = mS('home');
  const [stack, setStack] = mS([]);          // pushed detail screens
  const [sheet, setSheet] = mS(null);        // { type, props }
  const [scope, setScope] = mS('enterprise');// enterprise | workspace
  const [ws, setWs] = mS(window.EPM.WORKSPACES[0]);
  const [refreshKey, setRefreshKey] = mS(0);
  const [toast, setToast] = mS(null);

  const backIcon = lang === 'ar' ? 'chevron_right' : 'chevron_left';
  const push = (entry) => setStack(s => [...s, entry]);
  const pop = () => setStack(s => s.slice(0, -1));
  const top = stack[stack.length - 1];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  // tab switch resets stack
  const goTab = (id) => { setStack([]); setTab(id); };

  // open a workspace -> push detail
  const openWorkspace = (w) => { setWs(w); setScope('workspace'); push({ type: 'workspace', ws: w }); };
  const openProject = (p) => setSheet({ type: 'project', p });

  mE(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('epm_lang', lang);
  }, [lang]);
  mE(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('epm_theme', theme); }, [theme]);

  const ctx = { t, lang, theme, user, ws, scope, push, pop, openWorkspace, openProject, setSheet, showToast, refreshKey, onSignout };

  // ---- determine current screen + header ----
  let screenNode, header;
  if (top && top.type === 'workspace') {
    screenNode = <window.MWorkspace key={'ws' + refreshKey} {...ctx} ws={top.ws} />;
    header = (
      <div className="m-topbar">
        <div className="m-tb-start"><button className="m-tb-btn" onClick={pop} aria-label="Back"><Icon name={backIcon} size={24} /></button></div>
        <div className="m-tb-title"><b>{top.ws[lang]}</b><span>{top.ws.kind[lang]}</span></div>
        <div className="m-tb-end"><button className="m-tb-btn" onClick={() => setSheet({ type: 'wsmenu', ws: top.ws })} aria-label="More"><Icon name="more_horiz" size={22} /></button></div>
      </div>
    );
  } else if (top && top.type === 'admin') {
    screenNode = <window.MAdmin {...ctx} onOpenSec={(sec, label) => push({ type: 'adminsec', sec, label })} />;
    header = (
      <div className="m-topbar">
        <div className="m-tb-start"><button className="m-tb-btn" onClick={pop} aria-label="Back"><Icon name={backIcon} size={24} /></button></div>
        <div className="m-tb-title"><b>{t('admin_h')}</b><span>{lang === 'ar' ? 'المستوى الإداري' : 'Admin plane'}</span></div>
        <div className="m-tb-end" style={{ width: 40 }}></div>
      </div>
    );
  } else if (top && top.type === 'adminsec') {
    screenNode = <window.MAdminSection {...ctx} sec={top.sec} />;
    header = (
      <div className="m-topbar">
        <div className="m-tb-start"><button className="m-tb-btn" onClick={pop} aria-label="Back"><Icon name={backIcon} size={24} /></button></div>
        <div className="m-tb-title"><b>{top.label}</b><span>{t('admin_h')}</span></div>
        <div className="m-tb-end" style={{ width: 40 }}></div>
      </div>
    );
  } else if (top && top.type === 'reports') {
    screenNode = <window.MReports {...ctx} />;
    header = (
      <div className="m-topbar">
        <div className="m-tb-start"><button className="m-tb-btn" onClick={pop} aria-label="Back"><Icon name={backIcon} size={24} /></button></div>
        <div className="m-tb-title"><b>{t('nav_reports')}</b><span>{t('enterprise_ctx')}</span></div>
        <div className="m-tb-end" style={{ width: 40 }}></div>
      </div>
    );
  } else if (top && top.type === 'notifs') {
    screenNode = <window.MNotifs {...ctx} />;
    header = (
      <div className="m-topbar">
        <div className="m-tb-start"><button className="m-tb-btn" onClick={pop} aria-label="Back"><Icon name={backIcon} size={24} /></button></div>
        <div className="m-tb-title"><b>{t('notifications')}</b></div>
        <div className="m-tb-end" style={{ width: 40 }}></div>
      </div>
    );
  } else if (tab === 'home') {
    screenNode = <window.MHome key={'home' + refreshKey} {...ctx} />;
    header = null; // home renders its own brand hero
  } else if (tab === 'spaces') {
    screenNode = <window.MSpaces key={'sp' + refreshKey} {...ctx} />;
    header = null;
  } else if (tab === 'activity') {
    screenNode = <window.MActivity key={'ac' + refreshKey} {...ctx} />;
    header = null;
  } else {
    screenNode = <window.MProfile key={'pf' + refreshKey} {...ctx} />;
    header = null;
  }

  const onHero = !header && (tab === 'home' || tab === 'profile') && !top;

  return (
    <div className="m-app">
      <div className="m-island"></div>
      <MStatusBar onHero={onHero} />
      {header}
      <div className={`m-screen ${stack.length ? 'm-push-enter' : ''}`} key={tab + stack.length}>
        {screenNode}
      </div>
      {!top && <MTabBar tab={tab} setTab={goTab} t={t} />}

      {/* sheets */}
      {sheet && sheet.type === 'switcher' && (
        <MSheet title={t('all_workspaces')} onClose={() => setSheet(null)}>
          <SwitcherSheet {...ctx} onClose={() => setSheet(null)} />
        </MSheet>
      )}
      {sheet && sheet.type === 'more' && (
        <MSheet title={lang === 'ar' ? 'المزيد' : 'More'} onClose={() => setSheet(null)}>
          <MoreSheet {...ctx} setLang={setLang} setTheme={setTheme} onClose={() => setSheet(null)} />
        </MSheet>
      )}
      {sheet && sheet.type === 'project' && (
        <MSheet title={sheet.p.id} onClose={() => setSheet(null)}>
          <window.MProjectSheet {...ctx} p={sheet.p} onClose={() => setSheet(null)} />
        </MSheet>
      )}
      {sheet && sheet.type === 'filter' && (
        <MSheet title={t('filter')} onClose={() => setSheet(null)}>
          {sheet.render(() => setSheet(null))}
        </MSheet>
      )}
      {sheet && sheet.type === 'wsmenu' && (
        <MSheet title={sheet.ws[lang]} onClose={() => setSheet(null)}>
          <WsMenuSheet {...ctx} onClose={() => setSheet(null)} />
        </MSheet>
      )}

      {toast && (
        <div className="m-toast"><span className="m-toast-ico"><Icon name="check" size={14} /></span>{toast}</div>
      )}
    </div>
  );
}

/* ---- switcher sheet (enterprise <-> workspace) ---- */
function SwitcherSheet({ t, lang, ws, scope, onClose, push, setSheet }) {
  const WS = window.EPM.WORKSPACES;
  const [q, setQ] = mS('');
  const qn = q.trim().toLowerCase();
  const list = WS.filter(w => !qn || w.ar.toLowerCase().includes(qn) || w.en.toLowerCase().includes(qn) || w.code.toLowerCase().includes(qn));
  const goEnt = () => { onClose(); /* enterprise = Home tab */ };
  return (
    <div>
      <div className="m-search" style={{ margin: '0 0 8px' }}>
        <Icon name="search" size={18} style={{ color: 'var(--on-surface-variant)' }} />
        <input placeholder={t('ws_search_ph')} value={q} onChange={e => setQ(e.target.value)} autoFocus />
        {q && <button className="m-clear" onClick={() => setQ('')}><Icon name="close" size={13} /></button>}
      </div>
      <button className={`m-srow ${scope === 'enterprise' ? 'on' : ''}`} onClick={goEnt}>
        <span className="m-srow-emblem ent"><img src="brand/ministry-logo.svg" alt="" /></span>
        <span className="m-srow-txt"><b>{t('all_workspaces')}</b><span>{t('enterprise_ctx')}</span></span>
        {scope === 'enterprise' && <Icon name="check" size={20} style={{ color: 'var(--tertiary)', marginInlineStart: 'auto' }} />}
      </button>
      <div className="menu-label" style={{ padding: '10px 12px 4px', fontSize: 11, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 800 }}>{t('your_workspaces')}</div>
      {list.map(w => (
        <button key={w.id} className={`m-srow ${scope === 'workspace' && w.id === ws.id ? 'on' : ''}`}
          onClick={() => { onClose(); push({ type: 'workspace', ws: w }); }}>
          <span className="m-srow-emblem" style={{ background: w.color }}>{w.code}</span>
          <span className="m-srow-txt"><b>{w[lang]}</b><span>{w.kind[lang]} · {w.active} {t('ws_active_short')}</span></span>
          {scope === 'workspace' && w.id === ws.id && <Icon name="check" size={20} style={{ color: 'var(--tertiary)', marginInlineStart: 'auto' }} />}
        </button>
      ))}
    </div>
  );
}

/* ---- workspace overflow menu ---- */
function WsMenuSheet({ t, lang, showToast, onClose }) {
  const items = [
    { icon: 'add', label: t('new_project') },
    { icon: 'ios_share', label: t('export') },
    { icon: 'insights', label: t('nav_stats') },
    { icon: 'settings', label: t('adm_workspace') },
  ];
  return (
    <div>
      {items.map((it, i) => (
        <button key={i} className="m-srow" onClick={() => { onClose(); showToast(lang === 'ar' ? 'تجريبي — غير مفعّل' : 'Demo — not wired'); }}>
          <span className="m-srow-ico"><Icon name={it.icon} size={19} /></span>
          <span className="m-srow-txt"><b>{it.label}</b></span>
        </button>
      ))}
    </div>
  );
}

/* ---- more / settings sheet ---- */
function MoreSheet({ t, lang, theme, user, setLang, setTheme, showToast, onClose, push, onSignout }) {
  return (
    <div>
      <button className="m-srow" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
        <span className="m-srow-ico"><Icon name="translate" size={19} /></span>
        <span className="m-srow-txt"><b>{lang === 'ar' ? 'اللغة' : 'Language'}</b><span>{lang === 'ar' ? 'العربية' : 'English'}</span></span>
        <span style={{ marginInlineStart: 'auto', color: 'var(--tertiary)', fontWeight: 800 }}>{lang === 'ar' ? 'EN' : 'ع'}</span>
      </button>
      <button className="m-srow" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        <span className="m-srow-ico"><Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={19} /></span>
        <span className="m-srow-txt"><b>{lang === 'ar' ? 'المظهر' : 'Appearance'}</b><span>{theme === 'light' ? (lang === 'ar' ? 'فاتح' : 'Light') : (lang === 'ar' ? 'داكن' : 'Dark')}</span></span>
        <button className={`m-switch ${theme === 'dark' ? 'on' : ''}`} aria-label="theme"></button>
      </button>
      {user.isAdmin && (
        <button className="m-srow" onClick={() => { onClose(); push({ type: 'admin' }); }}>
          <span className="m-srow-ico"><Icon name="admin_panel_settings" size={19} /></span>
          <span className="m-srow-txt"><b>{t('nav_admin')}</b><span>{t('adm_enterprise')}</span></span>
          <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={20} style={{ marginInlineStart: 'auto', color: 'var(--on-surface-variant)' }} />
        </button>
      )}
      <button className="m-srow" onClick={() => { onClose(); push({ type: 'reports' }); }}>
        <span className="m-srow-ico"><Icon name="insights" size={19} /></span>
        <span className="m-srow-txt"><b>{t('nav_reports')}</b><span>{t('reports_sub')}</span></span>
        <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={20} style={{ marginInlineStart: 'auto', color: 'var(--on-surface-variant)' }} />
      </button>
      <button className="m-srow" onClick={() => { onClose(); showToast(lang === 'ar' ? 'مركز المساعدة' : 'Help center'); }}>
        <span className="m-srow-ico"><Icon name="help" size={19} /></span>
        <span className="m-srow-txt"><b>{lang === 'ar' ? 'المساعدة و الدعم' : 'Help & support'}</b></span>
        <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={20} style={{ marginInlineStart: 'auto', color: 'var(--on-surface-variant)' }} />
      </button>
      <hr className="divider" style={{ margin: '8px 12px' }} />
      <button className="m-srow danger" onClick={() => { onClose(); onSignout ? onSignout() : showToast(lang === 'ar' ? 'تم تسجيل الخروج' : 'Signed out'); }}>
        <span className="m-srow-ico"><Icon name="logout" size={19} /></span>
        <span className="m-srow-txt"><b>{t('signout')}</b></span>
      </button>
    </div>
  );
}

Object.assign(window, { MobileApp, MSheet, MScroll, MSwipe, useMediaQuery, MStatusBar });
