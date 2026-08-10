/* ============================================================
   EPM Prototype — Admin console (lazy-loaded governance module)
   ============================================================ */

function Admin({ t, lang, user, onExit }) {
  const [sect, setSect] = useState('users');
  const items = [
    { id:'users',    icon:'badge',           label:t('adm_users') },
    { id:'assign',   icon:'manage_accounts', label:t('adm_assign') },
    { id:'roles',    icon:'shield_person',   label:t('adm_roles') },
    { id:'matrix',   icon:'grid_on',         label:t('adm_matrix') },
    { id:'groups',   icon:'account_tree',    label:t('adm_groups') },
    { id:'ws',       icon:'apartment',       label:t('adm_ws') },
    { id:'projects', icon:'engineering',     label:t('adm_projects') },
    { id:'deleg',    icon:'verified_user',   label:t('adm_deleg') },
    { id:'audit',    icon:'history',         label:t('adm_audit') },
  ];
  return (
    <div className="admin">
      {/* admin sub-shell with distinct identity */}
      <aside className="adm-nav">
        <div className="adm-brand">
          <span className="adm-ico"><Icon name="admin_panel_settings" size={20} /></span>
          <div><b>{t('admin_h')}</b><span>{lang==='ar'?'المستوى الإداري':'Admin plane'}</span></div>
        </div>
        <div className="adm-lazy"><Icon name="bolt" size={14} />{lang==='ar'?'وحدة محمّلة عند الطلب':'Lazy-loaded module'}</div>
        {items.map(it => (
          <button key={it.id} className={`adm-item ${sect===it.id?'on':''}`} onClick={()=>setSect(it.id)}>
            <Icon name={it.icon} size={19} />{it.label}
          </button>
        ))}
        <div className="nav-spacer"></div>
        <button className="adm-exit" onClick={onExit}><Icon name={lang==='ar'?'arrow_forward':'arrow_back'} size={18} />{lang==='ar'?'العودة إلى التطبيق':'Back to app'}</button>
      </aside>

      <div className="adm-main">
        <div className="adm-bar">
          <div className="adm-bc">
            <Icon name="admin_panel_settings" size={16} style={{color:'var(--tertiary)'}} />
            <span>{t('admin_h')}</span>
            <Icon name={lang==='ar'?'chevron_left':'chevron_right'} size={15} style={{color:'var(--outline)'}} />
            <span className="bc-cur">{items.find(i=>i.id===sect).label}</span>
          </div>
        </div>
        <div className="adm-body">
          {sect==='users'    && <AdmUsers t={t} lang={lang} />}
          {sect==='assign'   && <AdmAssignments t={t} lang={lang} />}
          {sect==='roles'    && <AdmRoles t={t} lang={lang} />}
          {sect==='matrix'   && <AdmMatrix t={t} lang={lang} />}
          {sect==='groups'   && <AdmGroups t={t} lang={lang} />}
          {sect==='ws'       && <AdmWorkspaces t={t} lang={lang} />}
          {sect==='projects' && <AdmProjects t={t} lang={lang} />}
          {sect==='audit'    && <AdmAudit t={t} lang={lang} />}
          {sect==='deleg'    && <AdmPlaceholder t={t} lang={lang} sect={sect} items={items} />}
        </div>
      </div>
    </div>
  );
}

function AdmUsers({ t, lang }) {
  const users = [
    { n:{ar:'أحمد فؤاد جواد',en:'Ahmed Fouad'}, u:'ahmed.fouad', role:{ar:'مدير',en:'Director'}, unit:{ar:'القسم الهندسي',en:'Engineering'}, active:true },
    { n:{ar:'ليلى حسن محمود',en:'Layla Hasan'}, u:'layla.hasan', role:{ar:'مشرف قسم',en:'Section sup.'}, unit:{ar:'شعبة الأبنية',en:'Buildings'}, active:true },
    { n:{ar:'مصطفى علي كريم',en:'Mustafa Ali'}, u:'mustafa.ali', role:{ar:'مسؤول الشعبة',en:'Branch officer'}, unit:{ar:'شعبة الكهرباء',en:'Electrical'}, active:true },
    { n:{ar:'سارة كريم عبد',en:'Sara Karim'}, u:'sara.karim', role:{ar:'موظف',en:'Employee'}, unit:{ar:'شعبة الميكانيك',en:'Mechanical'}, active:false },
    { n:{ar:'يوسف ناصر',en:'Yousif Nasser'}, u:'yousif.n', role:{ar:'موظف',en:'Employee'}, unit:{ar:'شعبة الطرق',en:'Roads'}, active:true },
  ];
  return (
    <div className="screen">
      <PageHead title={t('adm_users')} sub={lang==='ar'?'إنشاء و إدارة الحسابات و تكليفات الأدوار و النطاقات.':'Create and manage accounts, role and scope assignments.'}>
        <button className="btn btn-outlined btn-sm"><Icon name="ios_share" size={18} />{t('export')}</button>
        <button className="btn btn-accent btn-sm"><Icon name="person_add" size={18} />{lang==='ar'?'مستخدم جديد':'New user'}</button>
      </PageHead>
      <div className="card table-card">
        <table className="tbl">
          <thead><tr><th>{lang==='ar'?'الموظف':'Employee'}</th><th>{t('username')}</th><th>{t('role')}</th><th>{lang==='ar'?'الوحدة':'Unit'}</th><th>{lang==='ar'?'الحالة':'Status'}</th><th></th></tr></thead>
          <tbody>
            {users.map((u,i)=>(
              <tr key={i}>
                <td><div className="user-cell"><Avatar size={28} style={{fontSize:11}}>{u.n[lang][0]}</Avatar><b style={{fontWeight:'var(--fw-bold)'}}>{u.n[lang]}</b></div></td>
                <td className="mono" style={{color:'var(--on-surface-variant)'}}>{u.u}</td>
                <td><span className="pill pill-info">{u.role[lang]}</span></td>
                <td>{u.unit[lang]}</td>
                <td>{u.active ? <span className="pill pill-success">{lang==='ar'?'مفعّل':'Active'}</span> : <span className="pill pill-neutral">{lang==='ar'?'معطّل':'Inactive'}</span>}</td>
                <td><button className="btn-icon" style={{width:30,height:30}}><Icon name="more_horiz" size={18} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdmRoles({ t, lang }) {
  const R = window.EPM.ROLES;
  return (
    <div className="screen">
      <PageHead title={t('adm_roles')} sub={lang==='ar'?'كتالوج الأدوار عالمي على مستوى النظام و يملكه المدير الرئيسي. مشرفو مساحات العمل يكلّفون فقط.':'The role catalog is enterprise-global and master-owned. Workspace admins assign only.'} />
      <div className="role-grid">
        {R.map(r=>(
          <div key={r.key} className="role-card">
            <div className="role-card-top">
              <span className="role-key mono">{r.key}</span>
              <span className={`pill ${r.plane==='both'?'pill-info':'pill-neutral'}`}>{r.plane==='both'?(lang==='ar'?'تشغيلي + إداري':'Ops + Admin'):(lang==='ar'?'تشغيلي':'Operational')}</span>
            </div>
            <h3>{r[lang]}</h3>
            <div className="role-users"><Icon name="group" size={16} style={{color:'var(--on-surface-variant)'}} /><span className="mono">{r.users}</span> {lang==='ar'?'مستخدم':'users'}</div>
            <button className="btn btn-text btn-sm" style={{alignSelf:'flex-start',marginTop:4}}>{lang==='ar'?'عرض المصفوفة':'View matrix'} <Icon name={lang==='ar'?'arrow_back':'arrow_forward'} size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdmMatrix({ t, lang }) {
  const E = window.EPM.MATRIX_ENTITIES[lang];
  const A = window.EPM.MATRIX_ACTIONS[lang];
  // deterministic checked pattern
  const checked = (ri, ci) => {
    if (ci === 7) return false; // import disabled
    return ((ri*3 + ci*5 + 2) % 4) !== 0;
  };
  const [role, setRole] = useState('3');
  const R = window.EPM.ROLES;
  return (
    <div className="screen">
      <PageHead title={t('adm_matrix')} sub={lang==='ar'?'صفوف الكيانات (٤٤ كياناً) × ٩ إجراءات. ابدأ من افتراضي الدور ثم خصّص لكل مستخدم.':'Entity rows (44 entities) × 9 actions. Start from the role default, then override per user.'}>
        <div className="matrix-role-pick">
          <span>{t('role')}:</span>
          <select className="select" style={{height:34, width:'auto'}} value={role} onChange={e=>setRole(e.target.value)}>
            {R.map(r=><option key={r.key} value={r.key}>{r[lang]}</option>)}
          </select>
        </div>
      </PageHead>
      <div className="card matrix-card">
        <div className="matrix-scroll">
          <table className="matrix-tbl">
            <thead>
              <tr>
                <th className="mx-corner">{lang==='ar'?'الكيان / الإجراء':'Entity / Action'}</th>
                {A.map((a,i)=>(<th key={i} className={i===7?'mx-dis':''}><span>{a}</span></th>))}
              </tr>
            </thead>
            <tbody>
              {E.map((e,ri)=>(
                <tr key={ri}>
                  <td className="mx-row">{e}</td>
                  {A.map((a,ci)=>(
                    <td key={ci} className={`mx-cell ${ci===7?'mx-dis':''}`}>
                      <span className={`mx-box ${checked(ri,ci)?'on':''} ${ci===7?'dis':''}`}>
                        {checked(ri,ci) && <Icon name="check" size={14} />}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="matrix-legend">
          <span><span className="mx-box on" style={{display:'inline-flex'}}><Icon name="check" size={12} /></span>{lang==='ar'?'مسموح':'Allowed'}</span>
          <span><span className="mx-box"></span>{lang==='ar'?'غير مسموح':'Not allowed'}</span>
          <span><span className="mx-box dis"></span>{lang==='ar'?'«استيراد» معطّل على مستوى الخدمة':'“Import” disabled at service level'}</span>
        </div>
      </div>
    </div>
  );
}

function AdmAudit({ t, lang }) {
  const AUD = [...window.EPM.AUDIT, ...window.EPM.AUDIT];
  return (
    <div className="screen">
      <PageHead title={t('adm_audit')} sub={lang==='ar'?'كل عملية إنشاء و تعديل و حذف تُسجَّل مع الهوية و الوقت و الهدف.':'Every create, update and delete is recorded with identity, time and target.'}>
        <button className="btn btn-outlined btn-sm"><Icon name="filter_list" size={18} />{t('filter')}</button>
      </PageHead>
      <div className="card table-card">
        <table className="tbl">
          <thead><tr><th>{lang==='ar'?'المستخدم':'User'}</th><th>{lang==='ar'?'الإجراء':'Action'}</th><th>{lang==='ar'?'الكيان':'Entity'}</th><th>{lang==='ar'?'الهدف':'Target'}</th><th>IP</th><th>{lang==='ar'?'الوقت':'Time'}</th></tr></thead>
          <tbody>
            {AUD.map((a,i)=>(
              <tr key={i}>
                <td><div className="user-cell"><Avatar size={26} style={{fontSize: 11}}>{a.user[lang][0]}</Avatar>{a.user[lang]}</div></td>
                <td><b style={{fontWeight:'var(--fw-bold)'}}>{a.action[lang]}</b></td>
                <td>{a.entity[lang]}</td>
                <td className="mono" style={{color:'var(--on-surface-variant)'}}>{a.tgt}</td>
                <td className="mono" style={{color:'var(--on-surface-variant)'}}>{a.ip}</td>
                <td className="mono" style={{color:'var(--on-surface-variant)',fontSize:12}}>{a.t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdmPlaceholder({ t, lang, sect, items }) {
  const it = items.find(i=>i.id===sect);
  const desc = {
    orgs:    {ar:'شجرة الهيكل التنظيمي (دائرة › قسم › شعبة) كمجموعات هرمية مكتوبة بنوع الوحدة.',en:'OBS tree (Dept › Section › Branch) as typed hierarchical groups.'},
    lookups: {ar:'إدارة القوائم المرجعية: نوع المشروع، حالة المشروع، العملة، نوع اللجان…',en:'Manage lookups: project type, status, currency, committee type…'},
    ws:      {ar:'إنشاء و تهيئة مساحات العمل و عضوياتها و تفعيل الإدارة المفوّضة.',en:'Create and configure workspaces, memberships, and enable delegation.'},
    deleg:   {ar:'منح الإدارة المفوّضة: DELEGATION_GRANT + دور إداري على نطاق مساحة العمل.',en:'Delegated administration grants: DELEGATION_GRANT + admin-plane role at workspace scope.'},
  }[sect];
  return (
    <div className="screen">
      <PageHead title={it.label} sub={desc[lang]} />
      <div className="placeholder">
        <span className="ph-ico"><Icon name={it.icon} size={30} /></span>
        <b>{it.label}</b>
        <span>{lang==='ar'?'هذه الوحدة جزء من هيكل الإدارة — جاهزة للتفصيل في المرحلة التالية.':'This module is part of the admin scaffold — ready to detail in the next phase.'}</span>
      </div>
    </div>
  );
}

function AdmAssignments({ t, lang }) {
  const A = window.EPM.ASSIGNMENTS;
  const scopeCls = { enterprise:'sc-ent', workspace:'sc-ws', project:'sc-prj' };
  const scopeLbl = { enterprise:t('scope_enterprise'), workspace:t('scope_workspace'), project:t('scope_project') };
  return (
    <div className="screen">
      <PageHead title={t('adm_assign')} sub={lang==='ar'?'تكليف مستخدم أو مجموعة بدور على نطاق (مؤسسة / مساحة عمل / مشروع).':'Assign a user or group a role at a scope (enterprise / workspace / project).'}>
        <button className="btn btn-accent btn-sm"><Icon name="add" size={17} />{t('new_assignment')}</button>
      </PageHead>
      <div className="adr-note"><Icon name="info" size={16} /><span>{t('assign_note')}</span></div>
      <div className="card table-card">
        <table className="tbl">
          <thead><tr><th>{t('col_principal')}</th><th>{t('col_role')}</th><th>{t('col_scope')}</th><th>{t('col_target')}</th><th>{t('col_plane')}</th><th></th></tr></thead>
          <tbody>
            {A.map((a,i)=>(
              <tr key={i}>
                <td><div className="user-cell">
                  <span className={`p-ico ${a.ptype}`}><Icon name={a.ptype==='group'?'groups':'person'} size={15} /></span>
                  <span><b style={{fontWeight:'var(--fw-bold)'}}>{a.principal[lang]}</b><span className="p-type">{a.ptype==='group'?t('principal_group'):t('principal_user')}</span></span>
                </div></td>
                <td><span className="tag-soft">{a.role[lang]}</span></td>
                <td><span className={`scope-pill ${scopeCls[a.scope]}`}>{scopeLbl[a.scope]}</span></td>
                <td>{a.target[lang]}</td>
                <td>{a.plane==='both'
                  ? <span className="pill pill-info">{t('plane_ops')} + {t('plane_admin')}</span>
                  : <span className="pill pill-neutral">{t('plane_ops')}</span>}</td>
                <td><RowMenu /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdmGroups({ t, lang }) {
  const G = window.EPM.ADMIN_GROUPS;
  const WS = window.EPM.WORKSPACES;
  const ownerLabel = (o) => o === 'ent' ? t('owner_ent') : (WS.find(w=>w.id===o)?.[lang] || o);
  return (
    <div className="screen">
      <PageHead title={t('adm_groups')} sub={lang==='ar'?'الهيكل التنظيمي كشجرة مجموعات (ADR-0011). التكليف على مجموعة يمنح كل أعضائها.':'OBS as a group tree (ADR-0011). Assigning to a group grants all its members.'}>
        <button className="btn btn-accent btn-sm"><Icon name="add" size={17} />{lang==='ar'?'مجموعة':'Group'}</button>
      </PageHead>
      <div className="adr-note"><Icon name="info" size={16} /><span>{t('groups_note')}</span></div>
      <div className="card">
        <div className="group-tree">
          {G.map(g => (
            <div key={g.id} className="grp-row" style={{ paddingInlineStart: 16 + g.level*26 }}>
              {g.level > 0 && <span className="grp-branch"></span>}
              <span className={`grp-ico lvl-${g.level}`}><Icon name={g.level===2 && g.type.en==='Committee' ? 'groups' : 'account_tree'} size={15} /></span>
              <div className="grp-main"><b>{g.name[lang]}</b><span className="grp-type">{g.type[lang]}</span></div>
              <span className="grp-owner">
                {g.owner==='ent'
                  ? <span className="own-ent"><Icon name="public" size={12} />{ownerLabel(g.owner)}</span>
                  : <span className="own-ws"><Icon name="apartment" size={12} />{ownerLabel(g.owner)}</span>}
              </span>
              <span className="grp-members num">{g.members} {t('members')}</span>
              <RowMenu />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdmWorkspaces({ t, lang }) {
  const WS = window.EPM.WORKSPACES;
  return (
    <div className="screen">
      <PageHead title={t('adm_ws')} sub={lang==='ar'?'مساحات العمل هي حدّ العزل و نطاق التكليف. تُدار من المدير الرئيسي.':'Workspaces are the isolation boundary (enterprise) and the assignment scope. Master-managed.'}>
        <button className="btn btn-accent btn-sm"><Icon name="add" size={17} />{lang==='ar'?'مساحة عمل':'Workspace'}</button>
      </PageHead>
      <div className="card table-card">
        <table className="tbl">
          <thead><tr><th>{lang==='ar'?'مساحة العمل':'Workspace'}</th><th>{lang==='ar'?'النوع':'Type'}</th><th>{lang==='ar'?'الرمز':'Code'}</th><th>{lang==='ar'?'المشاريع':'Projects'}</th><th>{lang==='ar'?'الإدارة المفوّضة':'Delegated admin'}</th><th></th></tr></thead>
          <tbody>
            {WS.map((w,i)=>(
              <tr key={w.id}>
                <td><div className="user-cell"><span className="ws-emblem" style={{background:w.color, width:28, height:28, fontSize: 11}}>{w.code}</span><b style={{fontWeight:'var(--fw-bold)'}}>{w[lang]}</b></div></td>
                <td>{w.kind[lang]}</td>
                <td className="mono" style={{color:'var(--on-surface-variant)'}}>{w.code}</td>
                <td className="num">{w.projects}</td>
                <td>{i % 2 === 0 ? <span className="pill pill-success">{lang==='ar'?'مفعّلة':'Enabled'}</span> : <span className="pill pill-neutral">{lang==='ar'?'معطّلة':'Disabled'}</span>}</td>
                <td><RowMenu /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdmProjects({ t, lang }) {
  const P = window.EPM.ADMIN_PROJECTS;
  const WS = window.EPM.WORKSPACES;
  const wsName = (id) => WS.find(w=>w.id===id)?.[lang] || id;
  return (
    <div className="screen">
      <PageHead title={t('adm_projects')} sub={lang==='ar'?'إنشاء المشاريع و إدارة أعضائها على نطاق المشروع (ADR-0007). مشروع واحد يملكه مساحة عمل واحدة.':'Create projects and manage project-scope members (ADR-0007). One workspace owns each project.'}>
        <button className="btn btn-accent btn-sm"><Icon name="add" size={17} />{t('new_project')}</button>
      </PageHead>
      <div className="card table-card">
        <table className="tbl">
          <thead><tr><th>{t('col_id')}</th><th>{t('col_project')}</th><th>{lang==='ar'?'المالك':'Owner workspace'}</th><th>{lang==='ar'?'الأعضاء':'Members'}</th><th>{t('col_status')}</th><th></th></tr></thead>
          <tbody>
            {P.map(p=>(
              <tr key={p.id}>
                <td className="mono" style={{color:'var(--on-surface-variant)'}}>{p.id}</td>
                <td><b style={{fontWeight:'var(--fw-bold)'}}>{p.name[lang]}</b>{p.shared && <span className="shared-tag"><Icon name="hub" size={11} />{lang==='ar'?'مشترك':'Shared'}</span>}</td>
                <td>{wsName(p.ws)}</td>
                <td><span className="members-cell"><Icon name="group" size={14} /><span className="num">{p.members}</span></span></td>
                <td><Pill status={p.status} lang={lang} /></td>
                <td><RowMenu /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowMenu() { return <button className="btn-icon" style={{ width: 30, height: 30 }}><Icon name="more_horiz" size={18} /></button>; }

Object.assign(window, { Admin });
