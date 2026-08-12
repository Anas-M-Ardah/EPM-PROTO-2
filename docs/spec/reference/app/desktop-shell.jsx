/* ============================================================
   EPM — DESKTOP shell: DesktopApp root, sidebar, command bar,
   ⌘K palette, context menu, popover, shared desktop atoms.
   Consumes the SAME window.EPM data + Icon atom as mobile.
   ============================================================ */
const { useState: dS, useEffect: dE, useRef: dR, useCallback: dCB } = React;

/* ---------- shared desktop atoms ---------- */
function DDonut({ value, size = 56, stroke = 6, color = 'var(--azure-500)' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <span className="d-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-container-high)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c*(1-value/100)} transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <b>{value}%</b>
    </span>
  );
}
function DPill({ status, lang }) {
  return <span className={`d-pill ${status}`}>{window.EPM.STATUS[status][lang]}</span>;
}
function DCheck({ on, mixed, onClick }) {
  return (
    <span className={`d-check ${on ? 'on' : ''} ${mixed ? 'mixed' : ''}`} onClick={onClick}>
      {on && <Icon name="check" size={13} />}{!on && mixed && <Icon name="remove" size={13} />}
    </span>
  );
}
function useDeskLoad(dep) {
  const [l, setL] = dS(true);
  dE(() => { setL(true); const id = setTimeout(() => setL(false), 550); return () => clearTimeout(id); }, [dep]);
  return l;
}
const fmtNum = n => n.toLocaleString('en-US');
const STATUS_VAR = { ongoing:'var(--info)', completed:'var(--success)', stalled:'var(--error)', suspended:'var(--warning)', withdrawn:'var(--outline)' };

/* ---------- generic popover (auto-flips above when near viewport bottom) ---------- */
function DPopover({ anchor, onClose, children, align = 'start', width }) {
  const ref = dR(null);
  const [pos, setPos] = dS(null);
  dE(() => {
    const rtl = document.documentElement.dir === 'rtl';
    const w = width || 280;
    if (!anchor) { // fallback: top, inner edge (e.g. opened from ⌘K)
      const left = rtl ? 12 : window.innerWidth - w - 12;
      setPos({ left: Math.max(8, left), w, aTop: 64, aBottom: 64, top: 64 }); return;
    }
    const r = anchor.getBoundingClientRect();
    let left = align === 'end' ? r.right - w : r.left;
    if (rtl) left = align === 'end' ? r.left : r.right - w;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    setPos({ left, w, aTop: r.top, aBottom: r.bottom, top: null });
  }, [anchor]);
  // measure & flip up if it would overflow the bottom
  dE(() => {
    if (!pos || !ref.current) return;
    const h = ref.current.offsetHeight;
    const below = pos.aBottom + 6;
    const want = (below + h > window.innerHeight - 8) ? Math.max(8, pos.aTop - h - 6) : below;
    if (pos.top !== want) setPos(p => ({ ...p, top: want }));
  }, [pos]);
  dE(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);
  if (!pos) return null;
  return (
    <React.Fragment>
      <div className="d-pop-scrim" onClick={onClose}></div>
      <div className="d-pop" ref={ref} style={{ left: pos.left, top: pos.top != null ? pos.top : pos.aBottom + 6, width: pos.w, visibility: pos.top != null ? 'visible' : 'hidden' }}>{children}</div>
    </React.Fragment>
  );
}

/* ---------- context menu ---------- */
function DContextMenu({ x, y, items, onClose }) {
  dE(() => {
    const h = () => onClose();
    window.addEventListener('click', h); window.addEventListener('resize', h);
    const k = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => { window.removeEventListener('click', h); window.removeEventListener('resize', h); document.removeEventListener('keydown', k); };
  }, []);
  const rtl = document.documentElement.dir === 'rtl';
  const w = 200;
  let left = rtl ? x - w : x;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  const top = Math.min(y, window.innerHeight - 260);
  return (
    <div className="d-ctxmenu" style={{ left, top, width: w }} onClick={e => e.stopPropagation()}>
      {items.map((it, i) => it.sep
        ? <hr key={i} />
        : <button key={i} className={it.danger ? 'danger' : ''} onClick={() => { it.onClick && it.onClick(); onClose(); }}>
            <Icon name={it.icon} size={17} />{it.label}{it.kbd && <span className="kbd">{it.kbd}</span>}
          </button>
      )}
    </div>
  );
}

/* ---------- command palette ⌘K ---------- */
function DCommandPalette({ t, lang, onClose, actions }) {
  const [q, setQ] = dS('');
  const [idx, setIdx] = dS(0);
  const qn = q.trim().toLowerCase();
  const filtered = qn ? actions.filter(a => a.label.toLowerCase().includes(qn) || (a.sub && a.sub.toLowerCase().includes(qn)) || (a.group && a.group.toLowerCase().includes(qn))) : actions;
  dE(() => { setIdx(0); }, [q]);
  dE(() => {
    const onKey = e => {
      if (e.key === 'Escape') return onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); const a = filtered[idx]; if (a) { a.run(); onClose(); } }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [filtered, idx]);
  // group
  const groups = [];
  filtered.forEach(a => { let g = groups.find(x => x.name === a.group); if (!g) { g = { name: a.group, items: [] }; groups.push(g); } g.items.push(a); });
  let running = -1;
  return (
    <div className="d-cmdk-scrim" onClick={onClose}>
      <div className="d-cmdk" onClick={e => e.stopPropagation()}>
        <div className="d-cmdk-input">
          <Icon name="search" size={20} style={{ color: 'var(--on-surface-variant)' }} />
          <input autoFocus placeholder={lang === 'ar' ? 'ابحث أو نفّذ أمراً…' : 'Search or run a command…'} value={q} onChange={e => setQ(e.target.value)} />
          <span className="kbd" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)', borderRadius: 5, padding: '2px 6px' }}>ESC</span>
        </div>
        <div className="d-cmdk-list">
          {filtered.length === 0 && <div className="d-empty" style={{ padding: '32px' }}><span className="d-empty-ico"><Icon name="search_off" size={26} /></span><b>{lang === 'ar' ? 'لا نتائج' : 'No results'}</b></div>}
          {groups.map(g => (
            <React.Fragment key={g.name}>
              <div className="d-cmdk-grp">{g.name}</div>
              {g.items.map(a => { running++; const cur = running; return (
                <div key={a.id} className={`d-cmdk-i ${cur === idx ? 'on' : ''}`} onMouseEnter={() => setIdx(cur)} onClick={() => { a.run(); onClose(); }}>
                  <span className="ico" style={a.tint ? { background: a.tint, color: '#fff' } : null}><Icon name={a.icon} size={17} /></span>
                  <span className="lab">{a.label}{a.sub && <small>{a.sub}</small>}</span>
                  {a.meta && <span className="meta">{a.meta}</span>}
                </div>
              ); })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function DSidebar({ t, lang, user, scope, view, ws, collapsed, onToggleSide, onSwitch, onNav, onAccount, onAdmin, admin, adminSec, onAdminNav, exitAdmin }) {
  const collapseLabel = collapsed ? (lang === 'ar' ? 'توسيع القائمة' : 'Expand sidebar') : (lang === 'ar' ? 'طي القائمة' : 'Collapse sidebar');
  const toggleBtn = (
    <button className="d-side-toggle" onClick={onToggleSide} title={collapseLabel} aria-label={collapseLabel}>
      <Icon name="menu" size={20} />
    </button>);

  const entNav = [
    { id: 'dashboard', icon: 'dashboard', label: t('nav_home') },
    { id: 'spaces', icon: 'apartment', label: t('adm_ws'), count: window.EPM.WORKSPACES.length },
    { id: 'projects', icon: 'projects', label: t('nav_projects_all') },
    { id: 'contracts', icon: 'description', label: t('nav_contracts_all') },
    { id: 'schedule', icon: 'calendar_month', label: t('nav_schedule_control') },
    { id: 'alerts', icon: 'notifications', label: t('nav_alerts_center') },
    { id: 'reports', icon: 'insights', label: t('nav_reports') },
  ];
  const wsNav = [
    { id: 'overview', icon: 'dashboard', label: t('ws_overview') },
    { id: 'projects', icon: 'projects', label: t('nav_projects'), count: ws ? ws.projects : 0 },
    { id: 'contracts', icon: 'description', label: t('nav_contracts_all') },
    { id: 'schedule', icon: 'calendar_month', label: t('nav_schedule_control') },
    { id: 'alerts', icon: 'notifications', label: t('nav_alerts_center') },
    { id: 'reports', icon: 'insights', label: t('nav_reports') },
  ];
  const admNav = [
    { id: 'overview', icon: 'space_dashboard', label: lang === 'ar' ? 'مركز التحكّم' : 'Control center' },
    { id: 'users', icon: 'badge', label: t('adm_users') },
    { id: 'assign', icon: 'manage_accounts', label: t('adm_assign') },
    { id: 'roles', icon: 'shield_person', label: t('adm_roles') },
    { id: 'matrix', icon: 'grid_on', label: t('adm_matrix') },
    { id: 'groups', icon: 'account_tree', label: t('adm_groups') },
    { id: 'ws', icon: 'apartment', label: t('adm_ws') },
    { id: 'projects', icon: 'engineering', label: t('adm_projects') },
    { id: 'audit', icon: 'history', label: t('adm_audit') },
  ];

  // ---- ADMIN MODE: control-center nav, distinct identity ----
  if (admin) {
    return (
      <aside className="d-side">
        <div className="d-side-head">
          <span className="d-side-logo" style={{ background: 'linear-gradient(135deg,#c5362f,#8a211f)' }}><Icon name="admin_panel_settings" size={21} /></span>
          <span className="d-side-wm"><b>{t('admin_h')}</b><span>{lang === 'ar' ? 'المستوى الإداري' : 'Admin plane'}</span></span>
          {toggleBtn}
        </div>
        <button className="d-side-switch" onClick={exitAdmin}>
          <span className="d-ctx-emblem" style={{ background: 'rgba(255,255,255,.12)' }}><Icon name={lang === 'ar' ? 'arrow_forward' : 'arrow_back'} size={16} /></span>
          <span className="d-ctx-switch-meta"><b>{lang === 'ar' ? 'العودة للتطبيق' : 'Back to app'}</b><span>{t('all_workspaces')}</span></span>
        </button>
        <nav className="d-nav">
          <div className="d-nav-grp">{lang === 'ar' ? 'الحوكمة' : 'Governance'}</div>
          {admNav.map(n => (
            <button key={n.id} className={`d-nav-item ${adminSec === n.id ? 'on' : ''}`} onClick={() => onAdminNav(n.id)} title={collapsed ? n.label : undefined}>
              <span className="d-nav-ico"><Icon name={n.icon} size={20} /></span><span className="d-nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="d-side-foot">
          <button className="d-side-acct" onClick={e => onAccount(e.currentTarget)}>
            <span className="d-side-av">{user.initials[lang]}</span>
            <span className="d-side-acct-id"><b>{user.name[lang].split(' ').slice(0, 2).join(' ')}</b><span>{user.role[lang]}</span></span>
            <Icon name="more_horiz" size={18} style={{ color: 'var(--nav-fg-dim)', flex: 'none' }} />
          </button>
        </div>
      </aside>
    );
  }

  const nav = scope === 'workspace' ? wsNav : entNav;
  const switchRef = dR(null);
  return (
    <aside className="d-side">
      <div className="d-side-head">
        <span className="d-side-logo" style={{ background: 'none', boxShadow: 'none' }}><EpmMark size={32} variant="tile" /></span>
        <span className="d-side-wm"><b>{lang === 'ar' ? 'نظام إدارة المشاريع الهندسية' : 'Engineering Projects System'}</b></span>
        {toggleBtn}
      </div>

      <div className="d-side-sep" aria-hidden="true"></div>

      <button className="d-side-switch" onClick={e => onSwitch(e.currentTarget)} title={collapsed ? (scope === 'workspace' ? ws[lang] : t('all_workspaces')) : undefined}>
        {scope === 'workspace'
          ? <span className="d-ctx-emblem" style={{ background: ws.color }}>{ws.code}</span>
          : <span className="d-ctx-emblem ent"><img src="brand/ministry-logo.svg" alt="" /></span>}
        <span className="d-ctx-switch-meta">
          <b>{scope === 'workspace' ? ws[lang] : t('all_workspaces')}</b>
          <span>{scope === 'workspace' ? ws.kind[lang] : t('enterprise_ctx')}</span>
        </span>
        <Icon name="unfold_more" size={17} style={{ color: 'var(--nav-fg-dim)', flex: 'none' }} />
      </button>

      <nav className="d-nav">
        {nav.map(n => (
          <button key={n.id} className={`d-nav-item ${view === n.id ? 'on' : ''}`} onClick={() => onNav(n.id)} title={collapsed ? n.label : undefined}>
            <span className="d-nav-ico"><Icon name={n.icon} size={20} /></span>
            <span className="d-nav-label">{n.label}</span>
            {n.count != null && <span className="d-nav-count">{n.count}</span>}
          </button>
        ))}
        {user.isAdmin && scope === 'enterprise' && (
          <React.Fragment>
            <div className="d-nav-grp">{t('nav_section_gov')}</div>
            <button className="d-nav-item" onClick={onAdmin} title={collapsed ? t('nav_admin') : undefined}>
              <span className="d-nav-ico"><Icon name="admin_panel_settings" size={20} /></span>
              <span className="d-nav-label">{t('nav_admin')}</span>
            </button>
          </React.Fragment>
        )}
      </nav>

      <div className="d-side-foot">
        <div className="d-side-ministry">
          <img src="brand/ministry-logo.svg" alt={t('ministry')} width="26" height="26" style={{ flex: 'none' }} />
          <span>{t('ministry')}</span>
        </div>
        <button className="d-side-acct" onClick={e => onAccount(e.currentTarget)} title={collapsed ? user.name[lang] : undefined}>
          <span className="d-side-av">{user.initials[lang]}</span>
          <span className="d-side-acct-id"><b>{user.name[lang].split(' ').slice(0, 2).join(' ')}</b><span>{user.role[lang]}</span></span>
          <Icon name="more_horiz" size={18} style={{ color: 'var(--nav-fg-dim)', flex: 'none' }} />
        </button>
      </div>
    </aside>
  );
}

/* ============================================================
   DesktopApp — root
   ============================================================ */
function DesktopApp({ t, lang, setLang, theme, setTheme, user, onAdmin, onSignout }) {
  const WS = window.EPM.WORKSPACES;
  const [scope, setScope] = dS('enterprise');
  const [view, setView] = dS('dashboard');        // ent: dashboard|spaces|projects|contracts|schedule|alerts|reports · ws: overview|projects|project|contracts|schedule|alerts|reports
  const [ws, setWs] = dS(WS[0]);
  const [focusProj, setFocusProj] = dS(null);
  const [profile, setProfile] = dS(false);
  const [admin, setAdmin] = dS(false);
  const [adminSec, setAdminSec] = dS('overview');
  const [cmdk, setCmdk] = dS(false);
  const [pop, setPop] = dS(null);                 // { type, anchor }
  const [ctxMenu, setCtxMenu] = dS(null);         // { x, y, items }
  const [toast, setToast] = dS(null);
  const [sideCollapsed, setSideCollapsed] = dS(() => localStorage.getItem('epm_side') === '1');
  dE(() => { localStorage.setItem('epm_side', sideCollapsed ? '1' : '0'); }, [sideCollapsed]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };
  const openWorkspace = (w) => { setWs(w); setScope('workspace'); setView('overview'); setFocusProj(null); setProfile(false); setAdmin(false); setSideCollapsed(true); };
  const goEnterprise = () => { setScope('enterprise'); setView('dashboard'); setProfile(false); setAdmin(false); setSideCollapsed(false); };
  const goNav = (v) => { setView(v); setProfile(false); setAdmin(false); };
  const openProjectDetail = (p) => { if (p && p.ws) setWs(p.ws); setFocusProj(p.id); setScope('workspace'); setView('project'); setProfile(false); setAdmin(false); setSideCollapsed(true); };
  const enterAdmin = () => { setAdmin(true); setProfile(false); setAdminSec('overview'); };

  dE(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdk(v => !v); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);
  dE(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('epm_lang', lang);
  }, [lang]);
  dE(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('epm_theme', theme); }, [theme]);

  const ctx = { t, lang, theme, user, ws, scope, view, openWorkspace, goEnterprise, goNav, openProjectDetail, focusProj, showToast,
    setPop, setCtxMenu, setLang, setTheme, openProfile: () => setProfile(true), onAdmin: enterAdmin, openCmdk: () => setCmdk(true) };

  // ---- command palette actions ----
  const cmdActions = [
    { id: 'dash', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'dashboard', label: t('nav_home'), run: goEnterprise },
    { id: 'spaces', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'apartment', label: t('adm_ws'), run: () => { goEnterprise(); setView('spaces'); } },
    { id: 'reports', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'insights', label: t('nav_reports'), run: () => { goEnterprise(); setView('reports'); } },
    { id: 'schedctl', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'calendar_month', label: t('nav_schedule_control'), run: () => { goEnterprise(); setView('schedule'); } },
    { id: 'projectsall', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'projects', label: t('nav_projects_all'), run: () => { goEnterprise(); setView('projects'); } },
    { id: 'contractsall', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'description', label: t('nav_contracts_all'), run: () => { goEnterprise(); setView('contracts'); } },
    { id: 'alertsctr', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'notifications', label: t('nav_alerts_center'), run: () => { goEnterprise(); setView('alerts'); } },
    { id: 'notifs', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'notifications', label: t('notifications'), run: () => setPop({ type: 'notif', anchor: null }) },
    { id: 'profile', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'person', label: t('profile'), run: () => setProfile(true) },
    ...(user.isAdmin ? [{ id: 'admin', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'admin_panel_settings', label: t('nav_admin'), run: enterAdmin }] : []),
    { id: 'newp', group: lang === 'ar' ? 'إجراءات' : 'Actions', icon: 'add', label: t('new_project'), tint: 'var(--tertiary)', run: () => showToast(lang === 'ar' ? 'مشروع جديد — تجريبي' : 'New project — demo') },
    { id: 'theme', group: lang === 'ar' ? 'إجراءات' : 'Actions', icon: theme === 'light' ? 'dark_mode' : 'light_mode', label: lang === 'ar' ? 'تبديل المظهر' : 'Toggle appearance', run: () => setTheme(theme === 'light' ? 'dark' : 'light') },
    { id: 'lang', group: lang === 'ar' ? 'إجراءات' : 'Actions', icon: 'translate', label: lang === 'ar' ? 'English' : 'العربية', run: () => setLang(lang === 'ar' ? 'en' : 'ar') },
    ...WS.map(w => ({ id: 'ws' + w.id, group: lang === 'ar' ? 'مساحات العمل' : 'Workspaces', icon: 'apartment', label: w[lang], sub: w.kind[lang], meta: w.code, run: () => openWorkspace(w) })),
  ];

  // ---- view router ----
  let content;
  if (admin) content = <window.DAdmin {...ctx} sec={adminSec} setSec={setAdminSec} />;
  else if (profile) content = <window.DProfile {...ctx} onClose={() => setProfile(false)} />;
  else if (scope === 'workspace' && view === 'project') content = <window.DWorkspace {...ctx} key={ws.id} initSelId={focusProj} />;
  else if (scope === 'workspace' && view === 'projects') content = <window.DProjectsAll {...ctx} scopeWs={ws} onOpenProject={openProjectDetail} />;
  else if (scope === 'workspace' && view === 'overview') content = <window.DWorkspaceOverview {...ctx} key={ws.id} />;
  else if (scope === 'workspace' && view === 'contracts') content = <window.DContractsAll {...ctx} scopeWs={ws} onOpenProject={openProjectDetail} />;
  else if (scope === 'workspace' && view === 'schedule') content = <window.DScheduleControl {...ctx} scopeWs={ws} onOpenProject={openProjectDetail} />;
  else if (scope === 'workspace' && view === 'alerts') content = <window.DAlertsCenter {...ctx} scopeWs={ws} onOpenProject={openProjectDetail} />;
  else if (scope === 'workspace' && view === 'reports') content = <window.DReports {...ctx} scopeWs={ws} onOpenProject={openProjectDetail} />;
  else if (view === 'spaces') content = <window.DSpaces {...ctx} />;
  else if (view === 'projects' && scope === 'enterprise') content = <window.DProjectsAll {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'contracts') content = <window.DContractsAll {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'schedule') content = <window.DScheduleControl {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'alerts') content = <window.DAlertsCenter {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'reports') content = <window.DReports {...ctx} onOpenProject={openProjectDetail} />;
  else content = <window.DDashboard {...ctx} />;

  return (
    <div className="d-fill">
      <div className="d-app" data-side={sideCollapsed ? 'collapsed' : 'expanded'}>
        <DSidebar t={t} lang={lang} user={user} scope={scope} view={profile ? '' : (view === 'project' ? 'projects' : view)} ws={ws}
          admin={admin} adminSec={adminSec} onAdminNav={setAdminSec} exitAdmin={goEnterprise}
          collapsed={sideCollapsed} onToggleSide={() => setSideCollapsed(v => !v)}
          onSwitch={(a) => setPop({ type: 'switcher', anchor: a })}
          onNav={goNav} onAccount={(a) => setPop({ type: 'account', anchor: a })} onAdmin={enterAdmin} />
        {content}
        <DAppFooter lang={lang} />
      </div>

      {/* command palette */}
      {cmdk && <DCommandPalette t={t} lang={lang} onClose={() => setCmdk(false)} actions={cmdActions} />}

      {/* popovers */}
      {pop && pop.type === 'switcher' && (
        <DPopover anchor={pop.anchor} onClose={() => setPop(null)} width={300}>
          <DSwitcherPop {...ctx} onClose={() => setPop(null)} />
        </DPopover>
      )}
      {pop && pop.type === 'account' && (
        <DPopover anchor={pop.anchor} onClose={() => setPop(null)} width={260}>
          <DAccountPop {...ctx} onClose={() => setPop(null)} onSignout={onSignout} />
        </DPopover>
      )}
      {pop && pop.type === 'notif' && (
        <DPopover anchor={pop.anchor} onClose={() => setPop(null)} width={360} align="end">
          <window.DNotifPanel {...ctx} onClose={() => setPop(null)} />
        </DPopover>
      )}

      {/* context menu */}
      {ctxMenu && <DContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      {/* toast */}
      {toast && <div className="d-toast"><span className="ico"><Icon name="check" size={13} /></span>{toast}</div>}
    </div>
  );
}

/* ---------- switcher popover ---------- */
function DSwitcherPop({ t, lang, ws, scope, openWorkspace, goEnterprise, onClose }) {
  const [q, setQ] = dS('');
  const qn = q.trim().toLowerCase();
  const list = window.EPM.WORKSPACES.filter(w => !qn || w.ar.toLowerCase().includes(qn) || w.en.toLowerCase().includes(qn) || w.code.toLowerCase().includes(qn));
  return (
    <div>
      <div className="d-field" style={{ margin: '2px 2px 6px', height: 34 }}>
        <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
        <input autoFocus placeholder={t('ws_search_ph')} value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <button className={`d-pop-row ${scope === 'enterprise' ? 'on' : ''}`} onClick={() => { goEnterprise(); onClose(); }}>
        <span className="d-ctx-emblem ent"><img src="brand/ministry-logo.svg" alt="" /></span>
        <span className="d-pop-row-tx"><b>{t('all_workspaces')}</b><span>{t('enterprise_ctx')}</span></span>
        {scope === 'enterprise' && <Icon name="check" size={18} style={{ color: 'var(--primary)' }} />}
      </button>
      <div className="d-pop-lbl">{t('your_workspaces')}</div>
      {list.map(w => (
        <button key={w.id} className={`d-pop-row ${scope === 'workspace' && w.id === ws.id ? 'on' : ''}`} onClick={() => { openWorkspace(w); onClose(); }}>
          <span className="d-ctx-emblem" style={{ background: w.color }}>{w.code}</span>
          <span className="d-pop-row-tx"><b>{w[lang]}</b><span>{w.kind[lang]} · {w.active} {t('ws_active_short')}</span></span>
          {scope === 'workspace' && w.id === ws.id && <Icon name="check" size={18} style={{ color: 'var(--primary)' }} />}
        </button>
      ))}
    </div>
  );
}

/* ---------- account popover ---------- */
function DAccountPop({ t, lang, theme, user, setLang, setTheme, openProfile, onAdmin, showToast, onClose, onSignout }) {
  return (
    <div>
      <div className="d-pop-row" style={{ cursor: 'default' }}>
        <span className="d-side-av" style={{ width: 36, height: 36 }}>{user.initials[lang]}</span>
        <span className="d-pop-row-tx"><b>{user.name[lang]}</b><span style={{ fontFamily: 'var(--font-mono)' }}>{user.email}</span></span>
      </div>
      <hr />
      <button className="d-pop-row" onClick={() => { openProfile(); onClose(); }}><span style={{ width: 22, display: 'grid', placeItems: 'center' }}><Icon name="person" size={18} /></span><span className="d-pop-row-tx"><b>{t('profile')}</b></span></button>
      <button className="d-pop-row" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><span style={{ width: 22, display: 'grid', placeItems: 'center' }}><Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={18} /></span><span className="d-pop-row-tx"><b>{lang === 'ar' ? 'المظهر' : 'Appearance'}</b><span>{theme === 'light' ? (lang === 'ar' ? 'فاتح' : 'Light') : (lang === 'ar' ? 'داكن' : 'Dark')}</span></span></button>
      <button className="d-pop-row" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><span style={{ width: 22, display: 'grid', placeItems: 'center' }}><Icon name="translate" size={18} /></span><span className="d-pop-row-tx"><b>{lang === 'ar' ? 'English' : 'العربية'}</b></span></button>
      {user.isAdmin && <button className="d-pop-row" onClick={() => { onAdmin(); onClose(); }}><span style={{ width: 22, display: 'grid', placeItems: 'center' }}><Icon name="admin_panel_settings" size={18} /></span><span className="d-pop-row-tx"><b>{t('nav_admin')}</b></span></button>}
      <hr />
      <button className="d-pop-row" style={{ color: 'var(--error)' }} onClick={() => { onClose(); onSignout(); }}><span style={{ width: 22, display: 'grid', placeItems: 'center' }}><Icon name="logout" size={18} /></span><span className="d-pop-row-tx"><b>{t('signout')}</b></span></button>
    </div>
  );
}

/* ---------- shared command bar ---------- */
function DTopbar({ t, lang, crumbs, actions, onSearch }) {
  return (
    <div className="d-topbar">
      <div className="d-crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={16} className="sep" />}
            {i === crumbs.length - 1 ? <b>{c}</b> : <span className="muted">{c}</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="sp"></div>
      <button className="d-search" onClick={onSearch}>
        <Icon name="search" size={17} />
        <span className="ph">{t('search_ph')}</span>
        <span className="kbd">⌘K</span>
      </button>
      {actions}
    </div>
  );
}

// Standard page header — Z2 identity bar (EPM design standards v1.1 §08):
// breadcrumb → title (+ optional status) + sub → action cluster (Z4) inline-end.
// crumbs: array of strings, or {label, onClick} objects; last is current (bold).
function DPageHead({ crumbs, title, status, sub, actions, lang }) {
  const AR = lang === 'ar';
  return (
    <div className="d-page-head">
      <div className="idtx">
        {crumbs && crumbs.length > 0 && (
          <div className="d-crumbs">
            {crumbs.map((c, i) => {
              const label = (c && c.label != null) ? c.label : c;
              const last = i === crumbs.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <Icon name={AR ? 'chevron_left' : 'chevron_right'} size={13} className="sepr" />}
                  {last ? <span className="cur">{label}</span>
                    : (c && c.onClick) ? <button className="lnk" onClick={c.onClick}>{label}</button>
                    : <span>{label}</span>}
                </React.Fragment>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1>{title}</h1>
          {status}
        </div>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="d-pacts">{actions}</div>}
    </div>
  );
}

// Standard grid pager — bottom strip of a grid card (EPM design standards v1.1 §14 .pager)
function DPager({ page, pageCount, total, pageSize, onPage, onPageSize, lang }) {
  const AR = lang === 'ar';
  if (pageCount <= 1 && !onPageSize) return null;
  const nums = []; const win = 1;
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || (i >= page - win && i <= page + win)) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const prevIco = AR ? 'chevron_right' : 'chevron_left';
  const nextIco = AR ? 'chevron_left' : 'chevron_right';
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1, to = Math.min(page * pageSize, total);
  return (
    <div className="d-pager">
      <span>{AR ? `${from}–${to} من ${total}` : `${from}–${to} of ${total}`}</span>
      <span className="sp"></span>
      {onPageSize && <select className="psize" value={pageSize} onChange={e => onPageSize(+e.target.value)}>{[15, 30, 60].map(n => <option key={n} value={n}>{n} / {AR ? 'صفحة' : 'page'}</option>)}</select>}
      <button className="pg" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={AR ? 'السابق' : 'Previous'}><Icon name={prevIco} size={15} /></button>
      {nums.map((n, i) => n === '…' ? <span key={'e' + i} style={{ padding: '0 2px' }}>…</span> : <button key={n} className={`pg ${n === page ? 'on' : ''}`} onClick={() => onPage(n)}>{n}</button>)}
      <button className="pg" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label={AR ? 'التالي' : 'Next'}><Icon name={nextIco} size={15} /></button>
    </div>
  );
}

Object.assign(window, { DesktopApp, DDonut, DPill, DCheck, useDeskLoad, DPopover, DContextMenu, DTopbar, DPageHead, DPager, fmtNum, STATUS_VAR });

/* ============================================================
   Unified project page zones — design standards Part 2.
   Z2 identity · Z3 vital signs · Z4 actions live on the shell and
   are identical on every module page. Z5/Z6/Z7/Z8/Z10 are supplied
   per module through DModuleFrame so the assembly never varies.
   ============================================================ */

/* Z4 — overflow · secondary (max 3) · exactly one primary. */
function DZ4({ actions, lang }) {
  const [open, setOpen] = React.useState(false);
  const AR = lang === 'ar';
  const primary = actions.find(a => a.primary);
  const rest = actions.filter(a => a !== primary);
  const secondary = rest.slice(0, 3);
  const overflow = rest.slice(3);
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  return (
    <div className="d-pz4">
      {overflow.length > 0 && (
        <span className="z4-more" onClick={e => e.stopPropagation()}>
          <button className="d-btn sm icon" title={AR ? 'إجراءات أخرى' : 'More actions'} onClick={() => setOpen(o => !o)}>
            <Icon name="more_horiz" size={16} />
          </button>
          {open && (
            <div className="z4-menu">
              {overflow.map((a, i) => (
                <button key={i} onClick={() => { setOpen(false); a.onClick && a.onClick(); }}>
                  <Icon name={a.icon} size={15} />{a.label}
                </button>
              ))}
            </div>
          )}
        </span>
      )}
      {secondary.map((a, i) => (
        <button key={i} className="d-btn sm" onClick={a.onClick} title={a.label}>
          <Icon name={a.icon} size={15} /><span className="lbl">{a.label}</span>
        </button>
      ))}
      {primary && (
        <button className="d-btn sm primary" onClick={primary.onClick} title={primary.label}>
          <Icon name={primary.icon} size={15} /><span className="lbl">{primary.label}</span>
        </button>
      )}
    </div>
  );
}

/* Z2 + Z3 — HDR-B object header. One Z2 per page; the object number
   always comes first and is copyable; status sits on the title line. */
function DProjectHeader({ lang, crumbs, num, title, status, revision, vitals, actions, onCopy }) {
  return (
    <React.Fragment>
      <div className="d-pz2">
        <nav className="z2-crumbs">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep">{lang === 'ar' ? '‹' : '›'}</span>}
              {c.onClick ? <button onClick={c.onClick} title={c.label}>{c.label}</button> : <span className="cur" title={c.label}>{c.label}</span>}
            </React.Fragment>
          ))}
        </nav>
        <div className="z2-title">
          {num && <span className="num" title={lang === 'ar' ? 'نسخ الرقم' : 'Copy number'}
            onClick={() => { try { navigator.clipboard.writeText(num); } catch (e) { } onCopy && onCopy(); }}>{num}</span>}
          <h2 title={title}>{title}</h2>
          {status}
          {/* the object number rides here as a copyable chip */}
          {revision && <button className="rev" title={lang === 'ar' ? 'نسخ الرقم' : 'Copy number'}
            onClick={() => { try { navigator.clipboard.writeText(revision); } catch (e) { } onCopy && onCopy(); }}>{revision}</button>}
          <span className="sp"></span>
          <DZ4 actions={actions} lang={lang} />
        </div>
      </div>
      {vitals && vitals.length > 0 && (
        <div className="d-pz3">
          {vitals.filter(v => v && v.v != null && v.v !== '').map((v, i) => (
            <span className="vs" key={i}>
              <span className="k">{v.k}</span>
              <span className={'v' + (v.tone ? ' ' + v.tone : '') + (v.num ? ' num' : '')}>{v.v}</span>
            </span>
          ))}
        </div>
      )}
    </React.Fragment>
  );
}

/* Z5 + Z6 + Z7 + Z8 + Z10 — the per-module frame. Every module page
   renders through this, so the assembly is identical everywhere:
   sub-tabs, toolbar, scrolling content, docked 320px panel, status bar. */
/* Z6 is one shared assembly on every page: the view's title at the
   inline-start, its controls next to it, and its actions at the
   inline-end. Pages fill the slots; they never lay the row out. */
function DModuleFrame({ tabs, tab, onTab, back, title, sub, toolbar, actions, aside, asideWide, asideClass, commit, status, children }) {
  /* Chrome is flat at rest (per the doc) and lifts only once content has
     scrolled under it — the elevation states the fixed/scrolling relationship
     exactly when it is true, instead of asserting it permanently. */
  const [scrolled, setScrolled] = React.useState(false);
  const onScroll = e => {
    const past = e.currentTarget.scrollTop > 2;
    setScrolled(v => (v === past ? v : past));
  };
  /* an actions fragment can render nothing once its tab-gates fail, so
     test for real children rather than for the prop being present */
  const hasKids = el => {
    if (!el) return false;
    if (el.type === React.Fragment) return React.Children.toArray(el.props.children).some(Boolean);
    return true;
  };
  const hasZ6 = hasKids(back) || title || hasKids(toolbar) || hasKids(actions);
  return (
    <div className={'d-pframe' + (scrolled ? ' scrolled' : '')}>
      {hasZ6 && (
        <div className="d-pz6">
          {back}
          {title && <span className="z6-t">{title}{sub && <em>{sub}</em>}</span>}
          {toolbar}
          <span className="sp"></span>
          {actions}
        </div>
      )}
      {tabs && tabs.length > 0 && (
        <div className="d-pz5">
          {tabs.map(tb => (
            <button key={tb.id} className={tab === tb.id ? 'on' : ''} onClick={() => onTab && onTab(tb.id)}>
              {tb.icon && <Icon name={tb.icon} size={14} />}
              {tb.label}
              {tb.n != null && <span className="n">{tb.n}</span>}
            </button>
          ))}
        </div>
      )}
      {/* `asideClass` lets one archetype widen Z8 where its own spec calls for
          it (L18 asks for 420px) without every page drifting off the 320/480
          the rest of the system shares */}
      <div className={'d-pbody' + (aside ? (asideWide ? ' aside-wide' : '') + (asideClass ? ' ' + asideClass : '') : ' no-aside')}>
        <div className="d-pz7" onScroll={onScroll}>{children}</div>
        {aside && <div className="d-pz8">{aside}</div>}
      </div>
      {/* Z9 — the sticky commit bar. Batched-edit screens (L17 makes it
          mandatory) put cancel/save here with a summary of what will change. */}
      {commit && <div className="d-z9">{commit}</div>}
      {status && <div className="d-pz10">{status}</div>}
    </div>
  );
}

/* Z10 helpers — record count · selection · totals · "as of" timestamp.
   The doc requires the data date on anything derived. */
function DZ10({ lang, stats, asOf }) {
  const AR = lang === 'ar';
  return (
    <React.Fragment>
      {stats.filter(Boolean).map((s, i) => (
        <span className="st" key={i}>
          <span>{s.k}</span>
          {s.money ? <DMoney v={s.v} lang={lang} size="sm" /> : <b className="num">{s.v}</b>}
        </span>
      ))}
      <span className="sp"></span>
      <span className="asof">{(AR ? 'البيانات حتى ' : 'Data as of ') + (asOf || new Date().toISOString().slice(0, 10))}</span>
    </React.Fragment>
  );
}


/* d.contractor is a field bag ({fields:[{label,value}]}), not a {name} object —
   resolve the display name from the labelled field. */
function epmContractorName(d, lang) {
  const f = d && d.contractor && d.contractor.fields;
  if (!f || !f.length) return null;
  const hit = f.find(x => /contractor name|executing entity/i.test((x.label && x.label.en) || '')) || f[0];
  return hit && hit.value;
}


/* App footer — global shell chrome. Content follows L01: organisation
   identity, system version and support contact. Kept to one 28px line so
   it never competes with a page's own Z10 status bar. */
function DAppFooter({ lang }) {
  const AR = lang === 'ar';
  return (
    <footer className="d-appfoot">
      <span className="org">
        <Icon name="account_balance" size={13} />
        <b>{AR ? 'وزارة التعليم العالي والبحث العلمي' : 'Ministry of Higher Education & Scientific Research'}</b>
        <span className="hide-sm">{AR ? '— نظام إدارة المشاريع الهندسية' : '— Engineering Projects Management'}</span>
      </span>
      <span className="sp"></span>
      <span className="it"><span className="env">{AR ? 'بيئة تجريبية' : 'PROTOTYPE'}</span></span>
      <span className="it hide-sm">
        <Icon name="support_agent" size={13} />
        {AR ? 'الدعم الفني' : 'Support'}
        <a href="tel:+9647701002440">2440</a>
        <a href="mailto:support@mohe.gov.iq">support@mohe.gov.iq</a>
      </span>
      <span className="it">{AR ? 'الإصدار' : 'Version'}<span className="ver num">1.4.0</span></span>
    </footer>
  );
}


/* Actor directory — in a ministry with many users a bare name is ambiguous,
   so every audit/activity line resolves to name + role + entity. Seeded for
   the known actors; unknown names get a stable assignment (hashed on the
   name) so the same person always reads the same way. */
const EPM_ACTORS = {
  'أحمد فؤاد':      { role: { ar: 'مهندس مشروع', en: 'Project engineer' },       org: { ar: 'دائرة الإعمار والمشاريع', en: 'Reconstruction & Projects Dept.' } },
  'ليلى حسن':       { role: { ar: 'محللة موازنة', en: 'Budget analyst' },        org: { ar: 'الدائرة المالية', en: 'Finance Dept.' } },
  'سارة كريم':      { role: { ar: 'مسؤولة عقود', en: 'Contracts officer' },      org: { ar: 'قسم العقود', en: 'Contracts Section' } },
  'مصطفى علي':      { role: { ar: 'رئيس التشكيل', en: 'Formation head' },        org: { ar: 'جامعة بغداد', en: 'University of Baghdad' } },
  'م. سالم الجبوري': { role: { ar: 'مهندس مقيم', en: 'Resident engineer' },       org: { ar: 'القسم الهندسي', en: 'Engineering Section' } },
  'أ. هدى الركابي':  { role: { ar: 'مهندسة تخطيط', en: 'Planning engineer' },     org: { ar: 'دائرة الإعمار والمشاريع', en: 'Reconstruction & Projects Dept.' } },
};
const EPM_ACTOR_FALLBACK = [
  { role: { ar: 'مستخدم التشكيل', en: 'Formation user' },  org: { ar: 'دائرة الإعمار والمشاريع', en: 'Reconstruction & Projects Dept.' } },
  { role: { ar: 'مستخدم الدائرة', en: 'Department user' }, org: { ar: 'القسم الهندسي', en: 'Engineering Section' } },
  { role: { ar: 'مهندس مشروع', en: 'Project engineer' },   org: { ar: 'قسم المشاريع', en: 'Projects Section' } },
];
function epmActor(name, lang) {
  const AR = lang === 'ar';
  if (!name) return null;
  if (/^النظام$|^system$/i.test(name)) {
    return { name: AR ? 'النظام' : 'System', role: AR ? 'حدث آلي' : 'Automated', org: AR ? 'نظام إدارة المشاريع' : 'EPM system', system: true };
  }
  let hit = EPM_ACTORS[name];
  if (!hit) {
    const key = Object.keys(EPM_ACTORS).find(k => name.indexOf(k) === 0 || k.indexOf(name) === 0);
    if (key) hit = EPM_ACTORS[key];
  }
  if (!hit) {
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    hit = EPM_ACTOR_FALLBACK[h % EPM_ACTOR_FALLBACK.length];
  }
  return { name: name, role: hit.role[AR ? 'ar' : 'en'], org: hit.org[AR ? 'ar' : 'en'] };
}


/* Money renders one way everywhere: mono tabular figures + the currency
   as a muted unit, isolated so it stays LTR inside RTL text. Size is tied
   to role (hero / figure / fact / legend), never chosen ad hoc — the page
   had 11 money renderings in 9 different styles before this existed. */
function DMoney({ v, lang, size, tone, cur, signed, bare }) {
  const num = typeof v === 'number' ? Math.round(v) : null;
  let n = num != null ? window.fmtNum(Math.abs(num)) : v;
  /* A delta is money too: it carries the sign, but never loses the currency. */
  if (signed && num != null) n = (num > 0 ? '+' : num < 0 ? '−' : '') + n;
  return (
    <span className={'d-money' + (size ? ' ' + size : '') + (tone ? ' ' + tone : '')
      + (bare ? ' bare' : '') + (signed && num ? (num > 0 ? ' up' : ' down') : '')}>
      <b className="num">{n}</b>
      {/* in a table the currency lives in the column header, so the figure
          keeps the shared treatment without repeating the unit on every row */}
      {!bare && <i>{cur || (lang === 'ar' ? 'د.ع' : 'IQD')}</i>}
    </span>
  );
}


/* Message bar — the doc's page-level state notice: icon, one semibold
   title line, an optional supporting line. Four tones, never invented
   per page. Sits at the top of the region whose state it describes. */
function DMsgBar({ tone, title, children, icon }) {
  const ICO = { info: 'info', success: 'check_circle', warning: 'warning', danger: 'error' };
  const t = tone || 'info';
  return (
    <div className={'d-msgbar ' + t} role={t === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon || ICO[t]} size={16} className="mgi" />
      <div className="mtx">
        {title && <div className="mtitle">{title}</div>}
        {children && <div className="mbody">{children}</div>}
      </div>
    </div>
  );
}


/* Shared record-detail pane — the one way any tab opens a record's detail.
   Modelled on the BOQ record panel that proved the pattern: identity row
   (code + status), title, and an action cluster of edit / expand / close,
   then optional facet tabs, a scrolling body and an optional footer.
   Docks into Z8 at 320px per the doc and expands to 480px on demand. */
function DRecordPane({ lang, title, meta, tabs, tab, onTab,
                       wide, onExpand, onEdit, onClose, footer, children }) {
  const AR = lang === 'ar';
  return (
    <aside className={'d-rpane' + (wide ? ' wide' : '')}>
      {/* the header carries the record's name and its actions — nothing else.
          Identifying attributes belong in the body with the rest of the data. */}
      <header className="rp-h">
        <b className="tx" title={typeof title === 'string' ? title : undefined}>{title}</b>
        <div className="acts">
          {onEdit && (
            <button className="d-icon-btn sm" title={AR ? 'تعديل' : 'Edit'}
              aria-label={AR ? 'تعديل السجل' : 'Edit record'} onClick={onEdit}><Icon name="edit" size={16} /></button>
          )}
          {onExpand && (
            <button className="d-icon-btn sm" title={wide ? (AR ? 'تصغير' : 'Collapse') : (AR ? 'توسيع' : 'Expand')}
              aria-label={AR ? 'توسيع اللوحة' : 'Expand panel'} onClick={onExpand}>
              <Icon name={wide ? 'close_fullscreen' : 'open_in_full'} size={16} /></button>
          )}
          {onClose && (
            <button className="d-icon-btn sm" title={AR ? 'إغلاق' : 'Close'}
              aria-label={AR ? 'إغلاق اللوحة' : 'Close panel'} onClick={onClose}><Icon name="close" size={17} /></button>
          )}
        </div>
      </header>

      {tabs && tabs.length > 0 && (
        <div className="rp-tabs">
          {tabs.map(tb => (
            <button key={tb.id} className={tab === tb.id ? 'on' : ''} onClick={() => onTab && onTab(tb.id)}>
              {tb.label}{tb.n != null && <span className="n">{tb.n}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="rp-b">
        {meta && meta.length > 0 && (
          <dl className="d-meta rp-meta">
            {meta.filter(m => m && m.v != null).map((m, i) => (
              <div className="d-meta-i" key={i}>
                <dt>{m.k}</dt>
                <dd className={m.num ? 'num' : ''}>{m.money ? <DMoney v={m.v} lang={lang} size="sm" /> : m.v}</dd>
              </div>
            ))}
          </dl>
        )}
        {children}
      </div>
      {footer && <div className="rp-f">{footer}</div>}
    </aside>
  );
}

/* A titled block inside a record pane. */
function DRecordGrp({ label, children }) {
  return <div className="rp-grp">{label && <span className="lbl">{label}</span>}{children}</div>;
}

/* ---------- L04 analytical dashboard ----------
   The doc is strict about what a tile is: "Every tile must state metric
   label · value · comparison (target, plan, prior period) · threshold state ·
   drill-through target." A tile that shows only a number is not a tile, it is
   a figure — which is why the old progress page's `.d-fig` rows could not be
   promoted in place. Spans are 3 (KPI), 6 (chart) or 12 (table); nothing
   free-floats and nothing overlaps. */
function DTileGrid({ children }) { return <div className="d-l04">{children}</div>; }

function DTile({ lang, span, label, value, unit, cmp, delta, state, note, to, period, flush, children }) {
  const AR = lang === 'ar';
  const st = state || 'none';
  /* the threshold has to survive being read aloud, printed in greyscale, or
     heard — a 2px coloured edge is the visual half of it, not the whole */
  const STATE_TX = { ok: { ar: 'ضمن الحد', en: 'within threshold' },
    warn: { ar: 'قرب الحد', en: 'near threshold' }, bad: { ar: 'تجاوز الحد', en: 'past threshold' } };
  const tid = 'tile-' + String(label).replace(/[^\w\u0600-\u06FF]/g, '').slice(0, 24) + (span || 3);
  return (
    <section className={'d-tile s' + (span || 3) + (st !== 'none' ? ' ' + st : '') + (flush ? ' flush' : '')}
      role="group" aria-labelledby={tid}>
      <header className="th">
        <span className="lbl" id={tid}>{label}
          {STATE_TX[st] && <span className="sr">{' — ' + (AR ? STATE_TX[st].ar : STATE_TX[st].en)}</span>}</span>
        {period && <span className="per" title={AR ? 'لهذه البطاقة فترة خاصة' : 'This tile has its own period'}>
          <Icon name="schedule" size={12} />{period}</span>}
      </header>
      {value != null && <div className="tv"><b>{value}</b>{unit && <i>{unit}</i>}</div>}
      {(delta || cmp) && <div className="tc">
        {delta && <span className={'dl ' + (delta.dir || 'flat')}>
          <Icon name={delta.dir === 'up' ? 'arrow_upward' : delta.dir === 'down' ? 'arrow_downward' : 'remove'} size={13} />
          {delta.v}{delta.unit ? ' ' + delta.unit : ''}</span>}
        {cmp && <span className="cm">{cmp.label} <b>{cmp.value}</b></span>}
      </div>}
      {children}
      {note && <div className="tn">{note}</div>}
      {/* a tile without a drill-through is a dead end — the doc requires one */}
      {to && <button type="button" className="tt" onClick={to.fn}
        aria-label={(AR ? 'التفصيل في ' : 'Detail in ') + to.label + ' — ' + label}>
        {AR ? 'التفصيل في ' : 'Detail in '}{to.label}
        <Icon name="chevron_right" size={14} /></button>}
    </section>
  );
}

Object.assign(window, { DZ4, DProjectHeader, DModuleFrame, DZ10, DMoney, DMsgBar, DRecordPane, DRecordGrp, DTileGrid, DTile, DAppFooter, epmContractorName, epmActor });
