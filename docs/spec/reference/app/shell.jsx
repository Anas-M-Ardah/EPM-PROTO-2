/* ============================================================
   EPM Prototype — shared UI + App Shell
   Depends on window.EPM. Exposes components on window.
   ============================================================ */
const { useState, useRef, useEffect } = React;

// ---------- atoms ----------
function Icon({ name, size, style }) {
  const inner = (window.ICONS && window.ICONS[name]) || (window.ICONS && window.ICONS._fallback) || '';
  return <svg className="mi" width={size || 20} height={size || 20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} dangerouslySetInnerHTML={{ __html: inner }} />;
}

function Pill({ status, lang }) {
  const s = window.EPM.STATUS[status];
  return <span className={`pill ${s.cls}`}>{s[lang]}</span>;
}

function Avatar({ children, size, style }) {
  return <span className="avatar" style={{ width: size, height: size, ...style }}>{children}</span>;
}

// EPM system identity mark — tiered "E" spine + crimson governing node.
// variant: 'mono' (currentColor glyph, no tile) | 'tile' (navy tile, white glyph) | 'light'
function EpmMark({ size = 24, variant = 'mono', node = true, accent, style }) {
  const uid = 'epmg' + Math.round(size * 100);
  const tile = variant === 'tile' || variant === 'light';
  const glyphColor = variant === 'tile' ? '#ffffff' : variant === 'light' ? '#1d3c6e' : 'currentColor';
  const nodeColor = accent || (variant === 'tile' ? '#e8645a' : variant === 'mono' ? 'currentColor' : '#c5362f');
  const rx = size <= 26 ? 5 : size <= 40 ? 9 : Math.round(size * 0.23);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="EPM">
      {variant === 'tile' && <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1d3c6e"/><stop offset="1" stopColor="#0a1832"/></linearGradient></defs>}
      {tile && <rect width="64" height="64" rx={rx} fill={variant === 'tile' ? `url(#${uid})` : '#ffffff'} stroke={variant === 'light' ? '#c3cad6' : 'none'} strokeWidth={variant === 'light' ? 1.5 : 0} />}
      <rect x="18" y="15" width="7" height="34" rx="3.5" fill={glyphColor} />
      <rect x="18" y="15" width="22" height="7" rx="3.5" fill={glyphColor} />
      <rect x="18" y="28.5" width="15.5" height="7" rx="3.5" fill={glyphColor} />
      <rect x="18" y="42" width="19" height="7" rx="3.5" fill={glyphColor} />
      {node && <rect x="35.5" y="11.5" width="12" height="12" rx="3.4" fill={nodeColor} />}
    </svg>
  );
}

function Bar({ value }) {
  return <div className="bar"><span style={{ width: value + '%' }}></span></div>;
}

function fmtCost(n, lang) {
  const s = n.toLocaleString('en-US');
  return s;
}

// dropdown menu wrapper (click outside to close)
function Menu({ open, onClose, children, align, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  if (!open) return null;
  return (
    <div ref={ref} className="menu-pop" style={{ [align === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: 0, ...style }}>
      {children}
    </div>
  );
}

// ---------- App Shell ----------
function Shell({ t, lang, setLang, theme, setTheme, user, scope, workspace, openWorkspace, goEnterprise, nav, setNav, onProfile, onAdmin, onSignout, children }) {
  const [wsOpen, setWsOpen] = useState(false);
  const [wsQuery, setWsQuery] = useState('');
  const [userOpen, setUserOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const WS = window.EPM.WORKSPACES;
  const isEnt = scope === 'enterprise';

  const opsItems = isEnt
    ? [
        { id: 'home',  icon: 'dashboard',     label: t('ws_overview') },
      ]
    : [
        { id: 'overview',  icon: 'dashboard',      label: t('ws_overview') },
        { id: 'projects',  icon: 'projects',    label: t('nav_projects') },
      ];

  return (
    <div className={`shell ${collapsed ? 'is-collapsed' : ''}`}>
      {/* Full-height sidebar */}
      <aside className="sh-nav">
        {/* context switcher (enterprise ↔ workspace) with selected workspace logo */}
        <div className="nav-switch">
          <button className="nav-switch-btn" onClick={() => setWsOpen(o => !o)}>
            {isEnt
              ? <span className="nav-ctx-dot ent"></span>
              : <span className="nav-ctx-dot" style={{ background: workspace.color }}>{workspace.code}</span>}
            <span className="nav-switch-txt"><b>{isEnt ? t('all_workspaces') : workspace[lang]}</b>{!isEnt && <span>{workspace.kind[lang]}</span>}</span>
            <Icon name="unfold_more" size={17} />
          </button>
          <Menu open={wsOpen} onClose={() => { setWsOpen(false); setWsQuery(''); }} align="start" style={{ top: 6, width: 290 }}>
            <button className={`ws-opt ${isEnt ? 'on' : ''}`} onClick={() => { goEnterprise(); setWsOpen(false); setWsQuery(''); }}>
              <span className="ws-dot ent"></span>
              <span className="ws-opt-txt"><b>{t('all_workspaces')}</b></span>
              {isEnt && <Icon name="check" size={18} style={{ color: 'var(--azure-600)', marginInlineStart: 'auto' }} />}
            </button>
            <hr className="divider" />
            <div className="menu-label">{t('your_workspaces')}</div>
            {WS.length > 7 && (
              <div className="ws-menu-search">
                <Icon name="search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
                <input autoFocus placeholder={t('ws_search_ph')} value={wsQuery} onChange={e => setWsQuery(e.target.value)} />
              </div>
            )}
            <div className="ws-menu-list">
              {(() => {
                const qn = wsQuery.trim().toLowerCase();
                const list = WS.filter(w => !qn || w.ar.toLowerCase().includes(qn) || w.en.toLowerCase().includes(qn) || w.code.toLowerCase().includes(qn));
                if (list.length === 0) return <div className="ws-menu-empty">{t('ws_no_results')}</div>;
                return list.map(w => (
                  <button key={w.id} className={`ws-opt ${!isEnt && w.id === workspace.id ? 'on' : ''}`} onClick={() => { openWorkspace(w); setWsOpen(false); setWsQuery(''); }}>
                    <span className="ws-dot" style={{ background: w.color }}></span>
                    <span className="ws-opt-txt"><b>{w[lang]}</b><span>{w.kind[lang]} · {w.active} {t('projects_count')}</span></span>
                    {!isEnt && w.id === workspace.id && <Icon name="check" size={18} style={{ color: 'var(--azure-600)', marginInlineStart: 'auto' }} />}
                  </button>
                ));
              })()}
            </div>
          </Menu>
        </div>

        <nav className="nav-scroll">
          {!isEnt && <div className="nav-group">{t('nav_section_ops')}</div>}
          {opsItems.map(it => (
            <button key={it.id} className={`nav-item ${nav === it.id ? 'on' : ''}`} onClick={() => setNav(it.id)} title={it.label}>
              <Icon name={it.icon} size={20} /><span className="nav-label">{it.label}</span>
            </button>
          ))}
          <div className="nav-spacer"></div>
          {user.isAdmin && (
            <div className="nav-foot-admin">
              <button className={`nav-item ${nav === 'admin' ? 'on' : ''}`} onClick={onAdmin} title={isEnt ? t('adm_enterprise') : t('adm_workspace')}>
                <Icon name="settings" size={20} /><span className="nav-label">{isEnt ? t('adm_enterprise') : t('adm_workspace')}</span>
              </button>
            </div>
          )}
        </nav>
      </aside>

      {/* Content column: header + main */}
      <div className="sh-col">
        <header className="sh-head">
          <button className="btn-icon" onClick={() => setCollapsed(c => !c)} title="Menu"><Icon name="menu" /></button>
          <div className="sh-brand" onClick={goEnterprise}>
            <img src="assets/epm-emblem.png" alt="EPM" />
            <b>EPM</b>
          </div>
          <div className="sh-dept"><span>{t('dept')}</span></div>

          <div className="sh-actions">
            <div className="sh-search">
              <Icon name="search" size={20} style={{ color: 'var(--on-surface-variant)' }} />
              <input placeholder={t('search_ph')} />
              <span className="kbd">⌘K</span>
            </div>
            <button className="lang-toggle" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title="Language">
              <Icon name="translate" size={18} />{lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <button className="btn-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Theme">
              <Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} />
            </button>
            <button className="btn-icon" title="Notifications"><Icon name="notifications" /><span className="badge-dot"></span></button>

            <div style={{ position: 'relative' }}>
              <button className="user-btn" onClick={() => setUserOpen(o => !o)}>
                <Avatar size={32}>{user.initials[lang]}</Avatar>
              </button>
              <Menu open={userOpen} onClose={() => setUserOpen(false)} style={{ top: 46, width: 248 }}>
                <div className="user-card">
                  <Avatar size={40}>{user.initials[lang]}</Avatar>
                  <div><b>{user.name[lang]}</b><span>{user.role[lang]}</span></div>
                </div>
                <hr className="divider" />
                <button className="menu-item" onClick={() => { setUserOpen(false); onProfile(); }}><Icon name="person" size={19} /> {t('profile')}</button>
                {user.isAdmin && <button className="menu-item" onClick={() => { setUserOpen(false); onAdmin(); }}><Icon name="admin_panel_settings" size={19} /> {t('nav_admin')}</button>}
                <hr className="divider" />
                <button className="menu-item danger" onClick={onSignout}><Icon name="logout" size={19} /> {t('signout')}</button>
              </Menu>
            </div>
          </div>
        </header>

        <main className="sh-main">{children}</main>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Pill, Avatar, Bar, Menu, Shell, fmtCost, EpmMark, MinistryLockup });

// Ministry crest + name lockup. variant: 'row' (crest beside name) | 'stack' (crest above, centered).
function MinistryLockup({ t, lang, size = 44, variant = 'row', onDark = false, style }) {
  const crest = <img src="brand/ministry-logo.svg" alt={t('ministry')} width={size} height={size} style={{ display: 'block', flex: 'none', objectFit: 'contain' }} />;
  const nameColor = onDark ? '#fff' : 'var(--on-surface)';
  const subColor = onDark ? 'rgba(255,255,255,.7)' : 'var(--on-surface-variant)';
  if (variant === 'stack') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, ...style }}>
        {crest}
        <div>
          <div style={{ fontSize: 13, fontWeight: 'var(--fw-x)', color: nameColor, lineHeight: 1.35 }}>{t('ministry')}</div>
          <div style={{ fontSize: 11.5, color: subColor, marginTop: 2 }}>{t('dept')}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      {crest}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 'var(--fw-x)', color: nameColor, lineHeight: 1.3 }}>{t('ministry')}</div>
        <div style={{ fontSize: 11.5, color: subColor, marginTop: 1 }}>{t('dept')}</div>
      </div>
    </div>
  );
}
