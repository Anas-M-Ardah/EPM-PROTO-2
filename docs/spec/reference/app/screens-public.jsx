/* ============================================================
   EPM Prototype — Public screens: Landing + Login (premium)
   Stripe/Linear-tier. Uses styles/public.css (lp-* / au-*).
   ============================================================ */

function LpNav({ t, lang, setLang, theme, setTheme, onSignin }) {
  return (
    <header className="lp-nav">
      <div className="lp-wrap">
        <div className="lp-brand">
          <span className="lp-brand-logo" style={{ background: 'none', boxShadow: 'none' }}><EpmMark size={38} variant="tile" /></span>
          <div><b>EPM</b><span>{t('app_full')}</span></div>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-ghost-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Icon name="translate" size={17} />{lang === 'ar' ? 'EN' : 'ع'}</button>
          <button className="lp-ghost-btn" style={{ width: 40, padding: 0, justifyContent: 'center' }} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={18} /></button>
          <button className="btn btn-danger" style={{ background: 'var(--crimson-500)', color: '#fff' }} onClick={onSignin}>{t('signin')}<Icon name={lang === 'ar' ? 'arrow_back' : 'arrow_forward'} size={16} /></button>
        </div>
      </div>
    </header>);

}

// Hero blueprint scene — self-draws on load (animation lives inside the SVG); quiet pointer parallax.
function HeroScene() {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    let raf = 0,tx = 0,ty = 0;
    const apply = () => {raf = 0;const el = ref.current;if (el) el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';};
    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth - .5) * -12;
      ty = (e.clientY / window.innerHeight - .5) * -8;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('mousemove', onMove);
    return () => {window.removeEventListener('mousemove', onMove);if (raf) cancelAnimationFrame(raf);};
  }, []);
  return <div className="lp-scene" ref={ref}><img src="brand/blueprint-scene.svg" alt="" /></div>;
}

// Collapsed blueprint accent (inherited from brand/blueprint-scene.svg) — self-draws once.
function BlueprintAccent() {
  return (
    <svg viewBox="0 0 150 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* building section — inherits theme color via currentColor */}
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect className="draw l1" pathLength="1" x="30" y="34" width="64" height="150" strokeWidth="1.3" />
        <path className="draw l1" pathLength="1" strokeWidth="1" d="M30 58 H94 M30 82 H94 M30 106 H94 M30 130 H94 M30 154 H94" />
        <path className="draw l1" pathLength="1" strokeWidth="1" d="M51 34 V184 M73 34 V184" />
        <path className="draw l1" pathLength="1" strokeWidth="1.2" d="M30 34 L44 20 H80 L94 34 M51 20 V12 H69 V20" />
        <path strokeWidth="1.4" opacity=".65" d="M14 184 H112" />
      </g>
      {/* red dimension line + measurement ticks */}
      <g className="bp-red" strokeLinecap="round" strokeLinejoin="round">
        <path className="draw l2" pathLength="1" strokeWidth="1.4" d="M112 34 V184" />
        <path strokeWidth="1.3" d="M107 40 L112 34 L117 40 M107 178 L112 184 L117 178" />
        <path className="draw l2" pathLength="1" strokeWidth=".9" opacity=".85" d="M94 34 H120 M94 109 H120 M94 184 H120" />
      </g>
      <circle className="bp-red-f" cx="112" cy="109" r="2.3" />
    </svg>);

}

// Faux status bar — shown only inside the desktop device-frame preview (CSS hides on real device).
function MobileStatusBar() {
  return (
    <div className="mlp-status">
      <span className="mono">9:41</span>
      <span className="mlp-status-r">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="6" rx="1" /><rect x="10" y="2.5" width="3" height="8.5" rx="1" /><rect x="15" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 4.2 A 10 10 0 0 1 15 4.2" /><path d="M3.6 6.7 A 6 6 0 0 1 12.4 6.7" /><path d="M6 9 A 2.6 2.6 0 0 1 10 9" /></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="1" y="1" width="20" height="10" rx="2.6" stroke="currentColor" strokeWidth="1.1" opacity=".5" /><rect x="3" y="3" width="15" height="6" rx="1.2" fill="currentColor" /><rect x="22.4" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".7" /></svg>
      </span>
    </div>);

}

function MobileLanding({ t, lang, setLang, theme, setTheme, onSignin }) {
  const ar = lang === 'ar';
  const arrow = ar ? 'arrow_back' : 'arrow_forward';
  const bpRef = useRef(null);
  const [entered, setEntered] = useState(false);

  // entrance choreography trigger
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // quiet tilt parallax on the blueprint accent (mirrored for RTL)
  useEffect(() => {
    const sx = ar ? 1 : -1;
    let raf = 0,tx = 0,ty = 0;
    const apply = () => {raf = 0;const bp = bpRef.current;if (bp) bp.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scaleX(' + sx + ')';};
    const sched = () => {if (!raf) raf = requestAnimationFrame(apply);};
    const onTilt = (e) => {
      tx = Math.max(-8, Math.min(8, (e.gamma || 0) * 0.26)) * sx;
      ty = Math.max(-6, Math.min(6, ((e.beta || 0) - 45) * 0.1));
      sched();
    };
    window.addEventListener('deviceorientation', onTilt);
    return () => {window.removeEventListener('deviceorientation', onTilt);if (raf) cancelAnimationFrame(raf);};
  }, [ar]);

  const haptic = () => {try {if (navigator.vibrate) navigator.vibrate(9);} catch (e) {}};
  const go = () => {haptic();onSignin();};

  return (
    <div className={'mlp' + (entered ? ' mlp-in' : '')}>
      <MobileStatusBar />

      {/* full-screen navy brand background */}
      <div className="mlp-hero-grid" aria-hidden="true"></div>

      <header className="mlp-head s-head d0">
        <div className="mlp-brand">
          <EpmMark size={34} variant="tile" />
        </div>
        <div className="mlp-ctrls">
          <button className="gbtn" onClick={() => {haptic();setLang(ar ? 'en' : 'ar');}}><Icon name="translate" size={16} />{ar ? 'EN' : 'ع'}</button>
          <button className="gbtn ic" onClick={() => {haptic();setTheme(theme === 'light' ? 'dark' : 'light');}} aria-label="theme"><Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={17} /></button>
        </div>
      </header>

      <div className="mlp-id">
        <div className="mlp-bp" ref={bpRef} aria-hidden="true"><img src="brand/blueprint-scene.svg" alt="" /></div>
        <div className="mlp-lockup s-head d1">
          <img src="brand/ministry-logo.svg" alt={t('ministry')} width="30" height="30" />
          <span>{ar ? 'وزارة التعليم العالي و البحث العلمي' : 'Ministry of Higher Education & Scientific Research'}</span>
        </div>
        <h1 className="s-head d2">{ar ? 'نظام إدارة المشاريع الهندسية' : 'Engineering Projects Management System'}</h1>
        <span className="lp-dim s-head d3" aria-hidden="true"><i></i><i></i></span>
        <p className="mlp-sub s-head d3">{ar ? 'المنصّة الموحّدة لإدارة المشاريع الهندسية عبر الجامعات و الوحدات.' : 'The unified platform for managing engineering projects across universities and units.'}</p>
      </div>

      {/* bottom sheet — login + pillars in one curved surface, anchored to bottom */}
      <section className="mlp-sheet s-head d4">
        <span className="mlp-grab" aria-hidden="true"></span>

        <div className="mlp-card-head">
          <span className="mk"><Icon name="login" size={22} /></span>
          <div>
            <b>{ar ? 'الدخول إلى النظام' : 'System access'}</b>
            <span>{ar ? 'هوية موحّدة على مستوى الوزارة' : 'Unified enterprise identity'}</span>
          </div>
        </div>

        <button className="mlp-signin" onClick={go}><span className="press"></span><Icon name="login" size={19} />{t('signin')}</button>

        <div className="mlp-notes">
          <span><Icon name="lock" size={15} />{ar ? 'متاح داخل شبكة الوزارة فقط' : 'Available on the ministry network only'}</span>
          <span><Icon name="history" size={15} />{ar ? 'كل عملية دخول تُسجّل و تُدقّق' : 'Every sign-in is logged and audited'}</span>
        </div>

      </section>
    </div>);

}

function Landing({ t, lang, setLang, theme, setTheme, onSignin, mobile }) {
  // Operational module gateways — EPM's real modules (entry points, not feature ads)
  const gateways = [
  { icon: 'apartment', ar: 'مساحات العمل', en: 'Workspaces', dAr: 'الجامعات و الوحدات المرتبطة.', dEn: 'Universities and affiliated units.' },
  { icon: 'engineering', ar: 'المشاريع الهندسية', en: 'Engineering projects', dAr: 'إدارة المشاريع و متابعة الإنجاز.', dEn: 'Project records and progress tracking.' },
  { icon: 'description', ar: 'العقود و الملاحق', en: 'Contracts & addendums', dAr: 'العقود التنفيذية و ملاحقها.', dEn: 'Execution contracts and addendums.' },
  { icon: 'groups', ar: 'اللجان', en: 'Committees', dAr: 'لجان فنية و مالية و مدد.', dEn: 'Technical, financial and duration committees.' },
  { icon: 'forward_to_inbox', ar: 'المخاطبات', en: 'Correspondence', dAr: 'سجلّات الوارد و الصادر.', dEn: 'Inbound and outbound registers.' },
  { icon: 'payments', ar: 'المواقف المالية', en: 'Financial position', dAr: 'الكلفة و الصرف و السلف.', dEn: 'Cost, disbursement and advances.' },
  { icon: 'insights', ar: 'الإحصائيات', en: 'Statistics', dAr: 'مؤشرات الأداء عبر المستويات.', dEn: 'Performance indicators across tiers.' },
  { icon: 'admin_panel_settings', ar: 'وحدة الإدارة', en: 'Administration', dAr: 'المخوّلون و الصلاحيات و الهيكل.', dEn: 'Users, permissions and structure.' },
  { icon: 'history', ar: 'سجل التدقيق', en: 'Audit log', dAr: 'توثيق كل العمليات.', dEn: 'A record of every operation.' }];

  const facts = [
  { icon: 'corporate_fare', ar: 'الجهة المالكة', en: 'Owning entity', vAr: 'وزارة التعليم العالي', vEn: 'Ministry of Higher Education' },
  { icon: 'account_tree', ar: 'نطاق الحوكمة', en: 'Governance scope', vAr: 'ثلاث طبقات: الوزارة · مساحات العمل · المشاريع', vEn: 'Three tiers: Enterprise · Workspaces · Projects' },
  { icon: 'apartment', ar: 'الجهات المرتبطة', en: 'Connected entities', vAr: '١٩ جامعة و وحدة مركزية', vEn: '19 universities & central units' },
  { icon: 'domain', ar: 'المجال التشغيلي', en: 'Operational domain', vAr: 'المشاريع الهندسية و الإعمار', vEn: 'Engineering projects & reconstruction' }];


  // ---- MOBILE-NATIVE landing: app entry screen (own component for hooks) ----
  if (mobile) return <MobileLanding {...{ t, lang, setLang, theme, setTheme, onSignin }} />;

  return (
    <div className="lp">
      <LpNav {...{ t, lang, setLang, theme, setTheme, onSignin }} />

      {/* HERO — institutional identity + access */}
      <section className="lp-hero">
        <div className="lp-hero-bg"><div className="lp-grid-tex"></div></div>
        <HeroScene />
        <div className="lp-wrap">
          <div className="lp-hero-text">
            <MinistryLockup t={t} lang={lang} size={52} style={{ marginBottom: 'var(--sp-5)' }} />
            <span className="lp-eyebrow lp-rise"><span className="dot"></span>{lang === 'ar' ? 'بوابة الدخول المؤسسية' : 'Institutional access portal'}</span>
            <h1 className="lp-rise d1">{lang === 'ar' ? 'نظام إدارة المشاريع الهندسية' : 'Engineering Projects Management System'}</h1>
            <span className="lp-dim" aria-hidden="true"><i></i><i></i></span>
            <p className="lp-hero-sub lp-rise d2">{lang === 'ar' ?
              'المنصّة الموحّدة لوزارة التعليم العالي لإدارة المشاريع الهندسية عبر الجامعات و الوحدات. الدخول مخصّص للموظّفين المخوّلين وفق الأدوار و النطاقات.' :
              'The unified platform of the Ministry of Higher Education for managing engineering projects across universities and units. Access is restricted to authorized personnel, by role and scope.'}</p>
          </div>

          {/* access panel — entry first */}
          <div className="lp-access lp-rise d3">
            <div className="lp-access-head"><span className="mk"><Icon name="login" size={20} /></span><div><b>{lang === 'ar' ? 'الدخول إلى النظام' : 'System access'}</b><span>{lang === 'ar' ? 'هوية موحّدة على مستوى الوزارة' : 'Unified enterprise identity'}</span></div></div>
            <div className="lp-access-body">
              <button className="btn btn-danger" style={{ width: '100%', height: 48, background: 'var(--crimson-500)', color: '#fff' }} onClick={onSignin}><Icon name="login" size={19} />{t('signin')}</button>
              <div className="lp-access-div">{lang === 'ar' ? 'الدخول الآمن' : 'Secure access'}</div>
              <div className="lp-access-notes">
                <span className="lp-access-note"><Icon name="lock" size={15} />{lang === 'ar' ? 'متاح داخل شبكة الوزارة فقط' : 'Available on the ministry network only'}</span>
                <span className="lp-access-note"><Icon name="history" size={15} />{lang === 'ar' ? 'كل عملية دخول تُسجّل و تُدقّق' : 'Every sign-in is logged and audited'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* operational access — module gateways: removed per request */}

      <footer className="lp-foot">
        <div className="lp-wrap">
          <div className="lp-foot-feat">
            <div className="lp-foot-i">
              <span className="lp-foot-ico"><Icon name="hub" size={21} /></span>
              <div><b>{lang === 'ar' ? 'تكامل على مستوى الوزارة' : 'Ministry-wide integration'}</b><span>{lang === 'ar' ? 'ربط الجامعات و الوحدات و المشاريع.' : 'Links universities, units and projects.'}</span></div>
            </div>
            <div className="lp-foot-i">
              <span className="lp-foot-ico"><Icon name="insights" size={21} /></span>
              <div><b>{lang === 'ar' ? 'إدارة فعّالة و شفافة' : 'Effective, transparent management'}</b><span>{lang === 'ar' ? 'لمتابعة المشاريع و الموارد و الميزانيات.' : 'Tracks projects, resources and budgets.'}</span></div>
            </div>
            <div className="lp-foot-i">
              <span className="lp-foot-ico"><Icon name="verified_user" size={21} /></span>
              <div><b>{lang === 'ar' ? 'نظام آمن و معتمد' : 'Secure, accredited system'}</b><span>{lang === 'ar' ? 'وفق معايير الحوكمة و الأمن السيبراني.' : 'Per governance and cybersecurity standards.'}</span></div>
            </div>
          </div>
          <div className="lp-foot-copy">
            <span>© 2026 {t('ministry')}</span>
            <span className="mono">EPM v1.0</span>
          </div>
        </div>
      </footer>
    </div>);

}

function Login({ t, lang, setLang, theme, setTheme, onLogin, onBack, mobile }) {
  const [u, setU] = useState('ahmed.fouad');
  const [p, setP] = useState('demo1234');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = () => {if (busy) return;setBusy(true);setTimeout(onLogin, 800);};

  const fields =
  <React.Fragment>
      <div className="au-field">
        <label>{t('username')}</label>
        <div className="au-input"><Icon name="person" size={19} /><input value={u} autoFocus={!mobile} onChange={(e) => setU(e.target.value)} /></div>
      </div>
      <div className="au-field">
        <label>{t('password')}</label>
        <div className="au-input"><Icon name="lock" size={19} /><input type={show ? 'text' : 'password'} value={p} onChange={(e) => setP(e.target.value)} /><button type="button" className="toggle" onClick={() => setShow((s) => !s)}><Icon name={show ? 'visibility_off' : 'visibility'} size={20} /></button></div>
      </div>
      <div className="au-row">
        <label className="au-check"><input type="checkbox" defaultChecked /> <span>{t('remember')}</span></label>
        <a href="#" onClick={(e) => e.preventDefault()}>{t('forgot')}</a>
      </div>
      <button className="au-submit" type="submit" disabled={busy}>{busy ? <React.Fragment><span className="au-spin" aria-hidden="true"></span>{lang === 'ar' ? 'جارٍ التحقق…' : 'Verifying…'}</React.Fragment> : <React.Fragment>{t('enter')}<Icon name={lang === 'ar' ? 'arrow_back' : 'arrow_forward'} size={19} /></React.Fragment>}</button>
      <div className="au-secure"><Icon name="verified_user" size={16} />{t('login_note')}</div>
    </React.Fragment>;


  // ---- MOBILE login: reuses the landing .mlp layout; sheet hosts the form ----
  if (mobile) {
    const ar = lang === 'ar';
    return (
      <div className="mlp mlp-in">
        <MobileStatusBar />
        <div className="mlp-hero-grid" aria-hidden="true"></div>

        <header className="mlp-head s-head d0">
          <div className="mlp-brand"><EpmMark size={34} variant="tile" /></div>
          <div className="mlp-ctrls">
            <button className="gbtn" onClick={onBack} aria-label={ar ? 'الرئيسية' : 'Home'}><Icon name={ar ? 'arrow_forward' : 'arrow_back'} size={18} /></button>
            <button className="gbtn" onClick={() => setLang(ar ? 'en' : 'ar')}><Icon name="translate" size={16} />{ar ? 'EN' : 'ع'}</button>
            <button className="gbtn ic" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="theme"><Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={17} /></button>
          </div>
        </header>

        <div className="mlp-id">
          <div className="mlp-bp" aria-hidden="true"><img src="brand/blueprint-scene.svg" alt="" /></div>
          <div className="mlp-lockup s-head d1">
            <img src="brand/ministry-logo.svg" alt={t('ministry')} width="30" height="30" />
            <span>{ar ? 'وزارة التعليم العالي و البحث العلمي' : 'Ministry of Higher Education & Scientific Research'}</span>
          </div>
          <h1 className="s-head d2">{ar ? 'نظام إدارة المشاريع الهندسية' : 'Engineering Projects Management System'}</h1>
          <span className="lp-dim s-head d3" aria-hidden="true"><i></i><i></i></span>
        </div>

        <form className="mlp-sheet s-head" onSubmit={(e) => {e.preventDefault();submit();}}>
          <span className="mlp-grab" aria-hidden="true"></span>
          <div className="mlp-card-head">
            <span className="mk"><Icon name="login" size={22} /></span>
            <div>
              <b>{ar ? 'تسجيل الدخول' : 'Sign in'}</b>
              <span>{ar ? 'هوية موحّدة على مستوى الوزارة' : 'Unified enterprise identity'}</span>
            </div>
          </div>
          <div className="mlp-form">{fields}</div>
        </form>
      </div>);

  }

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap">
          <div className="lp-brand">
            <span className="lp-brand-logo" style={{ background: 'none', boxShadow: 'none' }}><EpmMark size={38} variant="tile" /></span>
            <div><b>EPM</b><span>{t('app_full')}</span></div>
          </div>
          <div className="lp-nav-actions">
            <button className="lp-ghost-btn" onClick={onBack}><Icon name={lang === 'ar' ? 'arrow_forward' : 'arrow_back'} size={17} />{lang === 'ar' ? 'الرئيسية' : 'Home'}</button>
            <button className="lp-ghost-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Icon name="translate" size={17} />{lang === 'ar' ? 'EN' : 'ع'}</button>
            <button className="lp-ghost-btn" style={{ width: 40, padding: 0, justifyContent: 'center' }} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={18} /></button>
          </div>
        </div>
      </header>

      {/* HERO — reuses landing layout; access panel hosts the login form */}
      <section className="lp-hero">
        <div className="lp-hero-bg"><div className="lp-grid-tex"></div></div>
        <HeroScene />
        <div className="lp-wrap">
          <div className="lp-hero-text">
            <MinistryLockup t={t} lang={lang} size={52} style={{ marginBottom: 'var(--sp-5)' }} />
            <span className="lp-eyebrow lp-rise"><span className="dot"></span>{lang === 'ar' ? 'بوابة الدخول المؤسسية' : 'Institutional access portal'}</span>
            <h1 className="lp-rise d1">{lang === 'ar' ? 'نظام إدارة المشاريع الهندسية' : 'Engineering Projects Management System'}</h1>
            <span className="lp-dim" aria-hidden="true"><i></i><i></i></span>
            <p className="lp-hero-sub lp-rise d2">{lang === 'ar' ?
              'المنصّة الموحّدة لوزارة التعليم العالي لإدارة المشاريع الهندسية عبر الجامعات و الوحدات. الدخول مخصّص للموظّفين المخوّلين وفق الأدوار و النطاقات.' :
              'The unified platform of the Ministry of Higher Education for managing engineering projects across universities and units. Access is restricted to authorized personnel, by role and scope.'}</p>
          </div>

          <form className="lp-access lp-rise d3" onSubmit={(e) => {e.preventDefault();submit();}}>
            <div className="lp-access-head"><span className="mk"><Icon name="login" size={20} /></span><div><b>{lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}</b><span>{lang === 'ar' ? 'هوية موحّدة على مستوى الوزارة' : 'Unified enterprise identity'}</span></div></div>
            <div className="lp-access-body">
              {fields}
            </div>
          </form>
        </div>
      </section>
    </div>);

}

Object.assign(window, { Landing, Login });