/* ============================================================
   EPM — MOBILE Administration (native: pushed screens, lists,
   pills, sheets). Same window.EPM data as desktop DAdmin.
   Pushed as stack entries: {type:'admin'} and {type:'adminsec'}.
   ============================================================ */

const M_ADMIN_SECTIONS = [
  { id: 'users',   icon: 'badge',           kAr: 'المخوّلون',        kEn: 'Authorized users' },
  { id: 'assign',  icon: 'manage_accounts', kAr: 'الأعضاء و التكليفات', kEn: 'Members & assignments' },
  { id: 'roles',   icon: 'shield_person',   kAr: 'مستويات الصلاحية',  kEn: 'Roles' },
  { id: 'matrix',  icon: 'grid_on',         kAr: 'مصفوفة الصلاحيات',  kEn: 'Permission matrix' },
  { id: 'groups',  icon: 'account_tree',    kAr: 'المجموعات و الهيكل', kEn: 'Groups & structure' },
  { id: 'ws',      icon: 'apartment',       kAr: 'مساحات العمل',      kEn: 'Workspaces' },
  { id: 'projects',icon: 'engineering',     kAr: 'المشاريع',          kEn: 'Projects' },
  { id: 'audit',   icon: 'history',         kAr: 'سجل التدقيق',       kEn: 'Audit log' },
];

/* ---------- Admin home (control center) ---------- */
function MAdmin({ t, lang, onOpenSec }) {
  const R = window.EPM.ROLES, WS = window.EPM.WORKSPACES, G = window.EPM.ADMIN_GROUPS;
  const totalUsers = R.reduce((a, r) => a + r.users, 0);
  const secLabel = (s) => lang === 'ar' ? s.kAr : s.kEn;
  return (
    <MScroll>
      <div className="m-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="m-kpis">
          <MKpi icon="badge" tone="b" value={totalUsers} label={lang === 'ar' ? 'مخوّل' : 'Users'} />
          <MKpi icon="shield_person" tone="" value={R.length} label={lang === 'ar' ? 'دور' : 'Roles'} />
          <MKpi icon="apartment" tone="g" value={WS.length} label={lang === 'ar' ? 'مساحة عمل' : 'Workspaces'} />
          <MKpi icon="account_tree" tone="w" value={G.length} label={lang === 'ar' ? 'مجموعة' : 'Groups'} />
        </div>
      </div>
      <div className="m-sec"><div className="m-sec-row"><span className="m-sec-title">{lang === 'ar' ? 'أقسام الإدارة' : 'Administration'}</span></div></div>
      <div className="m-pad" style={{ paddingTop: 0 }}>
        <div className="m-card"><div className="m-list">
          {M_ADMIN_SECTIONS.map(s => (
            <button key={s.id} className="m-row" onClick={() => onOpenSec(s.id, secLabel(s))}>
              <span className="m-srow-ico"><Icon name={s.icon} size={19} /></span>
              <div className="m-row-main"><b>{secLabel(s)}</b></div>
              <Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={20} className="m-row-chev" />
            </button>
          ))}
        </div></div>
      </div>
    </MScroll>
  );
}

/* ---------- Admin section detail ---------- */
function MAdminSection({ t, lang, sec, showToast }) {
  if (sec === 'users') return <MAdmUsers t={t} lang={lang} showToast={showToast} />;
  if (sec === 'assign') return <MAdmAssign t={t} lang={lang} />;
  if (sec === 'roles') return <MAdmRoles t={t} lang={lang} />;
  if (sec === 'matrix') return <MAdmMatrix t={t} lang={lang} />;
  if (sec === 'groups') return <MAdmGroups t={t} lang={lang} />;
  if (sec === 'ws') return <MAdmWs t={t} lang={lang} />;
  if (sec === 'projects') return <MAdmProjects t={t} lang={lang} />;
  if (sec === 'audit') return <MAdmAudit t={t} lang={lang} />;
  return null;
}

const M_USERS = [
  { id:'USR-241', n:{ar:'أحمد فؤاد جواد',en:'Ahmed Fouad'}, u:'ahmed.fouad', role:{ar:'مدير',en:'Director'}, active:true },
  { id:'USR-188', n:{ar:'ليلى حسن محمود',en:'Layla Hasan'}, u:'layla.hasan', role:{ar:'مشرف قسم',en:'Section sup.'}, active:true },
  { id:'USR-205', n:{ar:'مصطفى علي كريم',en:'Mustafa Ali'}, u:'mustafa.ali', role:{ar:'مسؤول الشعبة',en:'Branch officer'}, active:true },
  { id:'USR-219', n:{ar:'سارة كريم عبد',en:'Sara Karim'}, u:'sara.karim', role:{ar:'موظف',en:'Employee'}, active:false },
  { id:'USR-233', n:{ar:'يوسف ناصر حميد',en:'Yousif Nasser'}, u:'yousif.n', role:{ar:'موظف',en:'Employee'}, active:true },
  { id:'USR-247', n:{ar:'هدى عبد الرزاق',en:'Huda Abdulrazaq'}, u:'huda.a', role:{ar:'مشرف دائرة',en:'Dept. sup.'}, active:true },
];

function MAdmUsers({ t, lang, showToast }) {
  const [q, setQ] = useState('');
  const qn = q.trim().toLowerCase();
  const rows = M_USERS.filter(u => !qn || u.n[lang].toLowerCase().includes(qn) || u.u.includes(qn));
  return (
    <React.Fragment>
      <div style={{ paddingTop: 12 }}>
        <div className="m-search">
          <Icon name="search" size={18} style={{ color: 'var(--on-surface-variant)' }} />
          <input placeholder={lang === 'ar' ? 'بحث بالاسم أو المعرّف…' : 'Search name or username…'} value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="m-clear" onClick={() => setQ('')}><Icon name="close" size={13} /></button>}
        </div>
      </div>
      <MScroll>
        <div className="m-pad">
          <div className="m-card"><div className="m-list">
            {rows.map(u => (
              <button key={u.id} className="m-row" onClick={() => showToast(lang === 'ar' ? 'تعديل — تجريبي' : 'Edit — demo')}>
                <span className="m-act-av">{u.n[lang][0]}</span>
                <div className="m-row-main"><b>{u.n[lang]}</b><div className="m-row-sub"><span className="mono">{u.u}</span></div></div>
                <div className="m-row-end">
                  <span className={`m-pill ${u.active ? 'completed' : 'withdrawn'}`}>{u.active ? (lang === 'ar' ? 'مفعّل' : 'Active') : (lang === 'ar' ? 'معطّل' : 'Inactive')}</span>
                  <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{u.role[lang]}</span>
                </div>
              </button>
            ))}
          </div></div>
        </div>
      </MScroll>
      <button className="m-fab" onClick={() => showToast(lang === 'ar' ? 'مستخدم جديد — تجريبي' : 'New user — demo')}><Icon name="person_add" size={20} />{lang === 'ar' ? 'مستخدم' : 'User'}</button>
    </React.Fragment>
  );
}

function MAdmAssign({ t, lang }) {
  const A = window.EPM.ASSIGNMENTS;
  const scopePill = { enterprise: 'stalled', workspace: 'ongoing', project: 'suspended' };
  const scopeLbl = { enterprise: t('scope_enterprise'), workspace: t('scope_workspace'), project: t('scope_project') };
  return (
    <MScroll>
      <div className="m-pad">
        <div className="m-card"><div className="m-list">
          {A.map((a, i) => (
            <div key={i} className="m-row" style={{ cursor: 'default' }}>
              <span className="m-srow-ico" style={{ background: a.ptype === 'group' ? 'color-mix(in srgb,var(--azure-500) 14%,transparent)' : 'var(--surface-container-high)', color: a.ptype === 'group' ? 'var(--azure-600)' : 'var(--on-surface-variant)' }}><Icon name={a.ptype === 'group' ? 'groups' : 'person'} size={18} /></span>
              <div className="m-row-main"><b>{a.principal[lang]}</b><div className="m-row-sub">{a.role[lang]}<span className="dot"></span>{a.target[lang]}</div></div>
              <span className={`m-pill ${scopePill[a.scope]}`}>{scopeLbl[a.scope]}</span>
            </div>
          ))}
        </div></div>
      </div>
    </MScroll>
  );
}

function MAdmRoles({ t, lang }) {
  const R = window.EPM.ROLES;
  return (
    <MScroll>
      <div className="m-pad">
        <div className="m-card"><div className="m-list">
          {R.map(r => (
            <div key={r.key} className="m-row" style={{ cursor: 'default' }}>
              <span className="m-srow-ico"><Icon name="shield_person" size={18} /></span>
              <div className="m-row-main"><b>{r[lang]}</b><div className="m-row-sub"><span className="mono">{r.users}</span> {lang === 'ar' ? 'مستخدم' : 'users'}<span className="dot"></span>{lang === 'ar' ? 'المفتاح' : 'key'} <span className="mono">{r.key}</span></div></div>
              <span className={`m-pill ${r.plane === 'both' ? 'ongoing' : 'withdrawn'}`}>{r.plane === 'both' ? (lang === 'ar' ? 'تشغيلي + إداري' : 'Ops + Admin') : (lang === 'ar' ? 'تشغيلي' : 'Ops')}</span>
            </div>
          ))}
        </div></div>
      </div>
    </MScroll>
  );
}

function MAdmMatrix({ t, lang }) {
  const E = window.EPM.MATRIX_ENTITIES[lang], A = window.EPM.MATRIX_ACTIONS[lang], R = window.EPM.ROLES;
  const [role, setRole] = useState('3');
  const checked = (ri, ci) => ci === 7 ? false : ((ri * 3 + ci * 5 + 2) % 4) !== 0;
  return (
    <React.Fragment>
      <div className="m-chips" style={{ paddingTop: 12 }}>
        {R.map(r => <button key={r.key} className={`m-chip ${role === r.key ? 'on' : ''}`} onClick={() => setRole(r.key)}>{r[lang]}</button>)}
      </div>
      <MScroll>
        <div className="m-pad">
          <div className="m-card"><div className="m-list">
            {E.map((e, ri) => (
              <div key={ri} className="m-row" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                <div className="m-row-main">
                  <b style={{ whiteSpace: 'normal' }}>{e}</b>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                    {A.map((a, ci) => checked(ri, ci) && <span key={ci} className="m-tag on" style={{ height: 24, fontSize: 11 }}><Icon name="check" size={11} />{a}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div></div>
        </div>
      </MScroll>
    </React.Fragment>
  );
}

function MAdmGroups({ t, lang }) {
  const G = window.EPM.ADMIN_GROUPS, WS = window.EPM.WORKSPACES;
  const ownerLabel = o => o === 'ent' ? t('owner_ent') : (WS.find(w => w.id === o)?.[lang] || o);
  return (
    <MScroll>
      <div className="m-pad">
        <div className="m-card"><div className="m-list">
          {G.map(g => (
            <div key={g.id} className="m-row" style={{ cursor: 'default', paddingInlineStart: 16 + g.level * 18 }}>
              <span className="m-srow-ico" style={{ background: g.level === 0 ? 'var(--primary)' : g.level === 1 ? 'color-mix(in srgb,var(--azure-500) 16%,transparent)' : 'var(--surface-container-high)', color: g.level === 1 ? 'var(--azure-600)' : g.level === 0 ? '#fff' : 'var(--on-surface-variant)' }}><Icon name={g.type.en === 'Committee' ? 'groups' : 'account_tree'} size={17} /></span>
              <div className="m-row-main"><b>{g.name[lang]}</b><div className="m-row-sub">{g.type[lang]}<span className="dot"></span><span className="mono">{g.members}</span> {t('members')}</div></div>
            </div>
          ))}
        </div></div>
      </div>
    </MScroll>
  );
}

function MAdmWs({ t, lang }) {
  const WS = window.EPM.WORKSPACES;
  return (
    <MScroll>
      <div className="m-pad">
        <div className="m-card"><div className="m-list">
          {WS.map((w, i) => (
            <div key={w.id} className="m-row" style={{ cursor: 'default' }}>
              <span className="m-row-emblem" style={{ background: w.color }}>{w.code}</span>
              <div className="m-row-main"><b>{w[lang]}</b><div className="m-row-sub">{w.kind[lang]}<span className="dot"></span><span className="mono">{w.projects}</span> {lang === 'ar' ? 'مشروع' : 'projects'}</div></div>
              <span className={`m-pill ${i % 2 === 0 ? 'completed' : 'withdrawn'}`}>{i % 2 === 0 ? (lang === 'ar' ? 'مفعّلة' : 'On') : (lang === 'ar' ? 'معطّلة' : 'Off')}</span>
            </div>
          ))}
        </div></div>
      </div>
    </MScroll>
  );
}

function MAdmProjects({ t, lang }) {
  const P = window.EPM.ADMIN_PROJECTS, WS = window.EPM.WORKSPACES;
  const wsName = id => WS.find(w => w.id === id)?.[lang] || id;
  return (
    <MScroll>
      <div className="m-pad">
        <div className="m-card"><div className="m-list">
          {P.map(p => (
            <div key={p.id} className="m-row" style={{ cursor: 'default' }}>
              <span className="m-row-rail" data-st={p.status}></span>
              <div className="m-row-main"><b>{p.name[lang]}</b><div className="m-row-sub"><span className="mono">{p.id}</span><span className="dot"></span>{wsName(p.ws)}</div></div>
              <span className={`m-pill ${p.status}`}>{window.EPM.STATUS[p.status][lang]}</span>
            </div>
          ))}
        </div></div>
      </div>
    </MScroll>
  );
}

function MAdmAudit({ t, lang }) {
  const AUD = [...window.EPM.AUDIT, ...window.EPM.AUDIT];
  return (
    <MScroll>
      <div className="m-pad">
        <div className="m-card"><div className="m-list">
          {AUD.map((a, i) => (
            <div key={i} className="m-row" style={{ cursor: 'default' }}>
              <span className="m-act-av">{a.user[lang][0]}</span>
              <div className="m-row-main"><b>{a.action[lang]} · {a.entity[lang]}</b><div className="m-row-sub"><span className="mono">{a.tgt}</span><span className="dot"></span><span className="mono">{a.ip}</span></div></div>
              <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>{a.t.slice(5)}</span>
            </div>
          ))}
        </div></div>
      </div>
    </MScroll>
  );
}

Object.assign(window, { MAdmin, MAdminSection });
