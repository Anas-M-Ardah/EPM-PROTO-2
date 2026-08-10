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
    { id: 'activity', icon: 'bolt', label: t('recent') },
  ];
  const wsNav = [
    { id: 'overview', icon: 'dashboard', label: t('ws_overview') },
    { id: 'projects', icon: 'projects', label: t('nav_projects'), count: ws ? ws.projects : 0 },
    { id: 'contracts', icon: 'description', label: t('nav_contracts_all') },
    { id: 'schedule', icon: 'calendar_month', label: t('nav_schedule_control') },
    { id: 'alerts', icon: 'notifications', label: t('nav_alerts_center') },
    { id: 'reports', icon: 'insights', label: t('nav_reports') },
    { id: 'activity', icon: 'bolt', label: t('recent') },
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
  const [view, setView] = dS('dashboard');        // ent: dashboard|spaces|projects|contracts|schedule|alerts|reports|activity · ws: overview|projects|project|contracts|schedule|alerts|reports|activity
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
    { id: 'activity', group: lang === 'ar' ? 'تنقّل' : 'Navigate', icon: 'bolt', label: t('recent'), run: () => { goEnterprise(); setView('activity'); } },
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
  else if (scope === 'workspace' && view === 'activity') content = <window.DActivity {...ctx} scoped />;
  else if (view === 'spaces') content = <window.DSpaces {...ctx} />;
  else if (view === 'projects' && scope === 'enterprise') content = <window.DProjectsAll {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'contracts') content = <window.DContractsAll {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'schedule') content = <window.DScheduleControl {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'alerts') content = <window.DAlertsCenter {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'reports') content = <window.DReports {...ctx} onOpenProject={openProjectDetail} />;
  else if (view === 'activity') content = <window.DActivity {...ctx} />;
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

Object.assign(window, { DesktopApp, DDonut, DPill, DCheck, useDeskLoad, DPopover, DContextMenu, DTopbar, fmtNum, STATUS_VAR });
