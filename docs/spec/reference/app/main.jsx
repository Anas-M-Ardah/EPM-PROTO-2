/* ============================================================
   EPM Prototype — Root app (routing + global state)
   ============================================================ */
const { useState: useS, useEffect: useE } = React;

function App() {
  const [lang, setLangRaw]   = useS(() => localStorage.getItem('epm_lang') || 'ar');
  const [theme, setThemeRaw] = useS(() => localStorage.getItem('epm_theme') || 'light');
  const [route, setRoute]    = useS(() => localStorage.getItem('epm_route') || 'landing'); // landing|login|app|profile|admin
  const [scope, setScope]    = useS('enterprise'); // enterprise | workspace
  const [nav, setNav]        = useS('home'); // ent: home|stats · ws: overview|projects|schedules|stats
  const [workspace, setWorkspaceRaw] = useS(window.EPM.WORKSPACES[0]);

  const t = window.EPM.makeT(() => lang);
  const user = window.EPM.CURRENT_USER;

  useE(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('epm_lang', lang);
  }, [lang]);
  useE(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('epm_theme', theme);
  }, [theme]);
  useE(() => { localStorage.setItem('epm_route', route); }, [route]);

  const setLang = setLangRaw, setTheme = setThemeRaw;
  const goEnterprise = () => { setScope('enterprise'); setRoute('app'); setNav('home'); };
  const openWorkspace = (w) => { setWorkspaceRaw(w); setScope('workspace'); setRoute('app'); setNav('overview'); };
  const goNav = (n) => { setRoute('app'); setNav(n); };

  // ---- ONE app · ONE design system · device-matched experience ----
  // Same components + data (window.EPM) render two layout shells:
  //   phone  → MobileApp   (thumb-first: bottom nav, sheets, sequential)
  //   ≥768px → DesktopApp  (workspace: sidebar, ⌘K, multi-pane, dense tables)
  // The switch is automatic on viewport — nothing is built twice.
  const isPhone = window.useMediaQuery('(max-width: 767px)');
  const params = new URLSearchParams(location.search);
  const forceMobile = params.get('mobile') === '1';     // phone device-frame preview
  const forceShell = params.get('shell') === '1';       // legacy admin scaffold (reference only)
  const mobile = !forceShell && (isPhone || forceMobile);

  // wrap a node in the phone device frame when previewing mobile on a wide screen
  const frame = (node) => (forceMobile && !isPhone)
    ? <div className="m-stage"><div className="m-device">{node}</div></div>
    : (mobile ? <div className="m-fill">{node}</div> : node);

  // public routes — device-matched (mobile-native vs desktop)
  if (route === 'landing')
    return frame(<Landing {...{ t, lang, setLang, theme, setTheme, mobile }} onSignin={() => setRoute('login')} />);
  if (route === 'login')
    return frame(<Login {...{ t, lang, setLang, theme, setTheme, mobile }} onLogin={() => { setScope('enterprise'); setRoute('app'); setNav('home'); }} onBack={() => setRoute('landing')} />);
  // administration governance module (separate, full-screen) — shared by both
  if (route === 'admin')
    return <div className="theme-root"><Admin t={t} lang={lang} user={user} onExit={() => setRoute('app')} /></div>;

  // device-matched product
  if (mobile) {
    const appNode = <MobileApp t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} user={user} fill={true} onSignout={() => setRoute('landing')} />;
    return frame(appNode);
  }
  if (!forceShell) {
    return <DesktopApp t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
      user={user} onAdmin={() => setRoute('admin')} onSignout={() => setRoute('landing')} />;
  }

  // ===== legacy admin scaffold (?shell=1) — preserved for reference only =====
  // admin is a separate "lazy" module — full-screen, own chrome
  if (route === 'admin')
    return (
      <div className="theme-root">
        <Admin t={t} lang={lang} user={user} onExit={() => setRoute('app')} />
      </div>
    );

  // authenticated app (shell-wrapped)
  let screen;
  if (route === 'profile') {
    screen = <Profile t={t} lang={lang} user={user} setNav={goEnterprise} />;
  } else if (scope === 'enterprise') {
    screen = <MasterDashboard t={t} lang={lang} user={user} openWorkspace={openWorkspace} />;
  } else if (nav === 'overview') {
    screen = <WorkspaceDashboard t={t} lang={lang} workspace={workspace} goNav={goNav} />;
  } else if (nav === 'projects') {
    screen = <Workspace t={t} lang={lang} workspace={workspace} />;
  } else {
    screen = <StubScreen t={t} lang={lang} nav={nav} />;
  }

  return (
    <Shell
      t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
      user={user} scope={scope} workspace={workspace}
      openWorkspace={openWorkspace} goEnterprise={goEnterprise}
      nav={route === 'profile' ? '' : nav}
      setNav={goNav}
      onProfile={() => setRoute('profile')}
      onAdmin={() => setRoute('admin')}
      onSignout={() => setRoute('landing')}
    >
      {screen}
    </Shell>
  );
}

function StubScreen({ t, lang, nav }) {
  const map = {
    schedules:  { icon:'calendar_month', label:t('nav_schedules') },
    stats:      { icon:'bar_chart', label:t('nav_stats') },
  }[nav] || { icon:'widgets', label:nav };
  return (
    <div className="screen">
      <PageHead title={map.label} sub={lang==='ar'?'وحدة تشغيلية ضمن الهيكل — جاهزة للتفصيل في المرحلة التالية.':'An operational module in the scaffold — ready to detail next.'} />
      <div className="placeholder">
        <span className="ph-ico"><Icon name={map.icon} size={30} /></span>
        <b>{map.label}</b>
        <span>{lang==='ar'?'سيُبنى هذا القسم على نفس نظام التصميم و الجداول.':'This section builds on the same design system and tables.'}</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
