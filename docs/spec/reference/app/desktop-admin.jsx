/* ============================================================
   EPM — DESKTOP Administration: a control center (not CRUD forms).
   Lives inside the same DesktopApp shell + design language.
   Side-drawer editing, bulk actions, dense tables, progressive
   disclosure. Sections driven by the main sidebar (admin mode).
   ============================================================ */

const ADMIN_USERS = [
  { id:'USR-241', n:{ar:'أحمد فؤاد جواد',en:'Ahmed Fouad Jawad'}, u:'ahmed.fouad', role:{ar:'مدير',en:'Director'}, unit:{ar:'القسم الهندسي',en:'Engineering'}, active:true, plane:'both' },
  { id:'USR-188', n:{ar:'ليلى حسن محمود',en:'Layla Hasan Mahmoud'}, u:'layla.hasan', role:{ar:'مشرف قسم',en:'Section sup.'}, unit:{ar:'شعبة الأبنية',en:'Buildings'}, active:true, plane:'both' },
  { id:'USR-205', n:{ar:'مصطفى علي كريم',en:'Mustafa Ali Karim'}, u:'mustafa.ali', role:{ar:'مسؤول الشعبة',en:'Branch officer'}, unit:{ar:'شعبة الكهرباء',en:'Electrical'}, active:true, plane:'ops' },
  { id:'USR-219', n:{ar:'سارة كريم عبد',en:'Sara Karim Abd'}, u:'sara.karim', role:{ar:'موظف',en:'Employee'}, unit:{ar:'شعبة الميكانيك',en:'Mechanical'}, active:false, plane:'ops' },
  { id:'USR-233', n:{ar:'يوسف ناصر حميد',en:'Yousif Nasser Hameed'}, u:'yousif.n', role:{ar:'موظف',en:'Employee'}, unit:{ar:'شعبة الطرق',en:'Roads'}, active:true, plane:'ops' },
  { id:'USR-247', n:{ar:'هدى عبد الرزاق',en:'Huda Abdulrazaq'}, u:'huda.a', role:{ar:'مشرف دائرة',en:'Dept. sup.'}, unit:{ar:'دائرة الإعمار',en:'Reconstruction'}, active:true, plane:'both' },
];

/* ---------- side drawer ---------- */
function DDrawer({ title, sub, onClose, children, footer, wide }) {
  dE(() => { const k = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  return (
    <React.Fragment>
      <div className="d-drawer-scrim" onClick={onClose}></div>
      <div className={`d-drawer${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        <div className="d-drawer-head">
          <div className="tx"><b>{title}</b>{sub && <span>{sub}</span>}</div>
          <button className="d-icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <div className="d-drawer-body">{children}</div>
        {footer && <div className="d-drawer-foot">{footer}</div>}
      </div>
    </React.Fragment>
  );
}

/* ============================================================
   ADMIN ROOT (rendered in DesktopApp content area)
   ============================================================ */
function DAdmin({ t, lang, sec, setSec, showToast, setCtxMenu, openCmdk, goEnterprise }) {
  const labels = {
    overview: lang === 'ar' ? 'مركز التحكّم' : 'Control center',
    users: t('adm_users'), assign: t('adm_assign'), roles: t('adm_roles'), matrix: t('adm_matrix'),
    groups: t('adm_groups'), ws: t('adm_ws'), projects: t('adm_projects'), audit: t('adm_audit'),
  };
  const props = { t, lang, showToast, setCtxMenu, setSec };
  return (
    <div className="d-main">
      <DTopbar t={t} lang={lang} crumbs={[t('admin_h'), labels[sec]]} onSearch={openCmdk}
        actions={<button className="d-btn ghost" onClick={goEnterprise}><Icon name={lang === 'ar' ? 'arrow_forward' : 'arrow_back'} size={18} />{lang === 'ar' ? 'العودة للتطبيق' : 'Back to app'}</button>} />
      <div className="d-canvas">
        <div className="d-canvas-pad">
          <div className="d-canvas-wrap">
            {sec === 'overview' && <DAdmOverview {...props} />}
            {sec === 'users' && <DAdmUsers {...props} />}
            {sec === 'assign' && <DAdmAssignments {...props} />}
            {sec === 'roles' && <DAdmRoles {...props} />}
            {sec === 'matrix' && <DAdmMatrix {...props} />}
            {sec === 'groups' && <DAdmGroups {...props} />}
            {sec === 'ws' && <DAdmWorkspaces {...props} />}
            {sec === 'projects' && <DAdmProjects {...props} />}
            {sec === 'audit' && <DAdmAudit {...props} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- overview: control-center home ---------- */
function DAdmOverview({ t, lang, showToast, setSec }) {
  const R = window.EPM.ROLES, WS = window.EPM.WORKSPACES, G = window.EPM.ADMIN_GROUPS, AUD = window.EPM.AUDIT;
  const totalUsers = R.reduce((a, r) => a + r.users, 0);
  const quick = [
    { icon: 'person_add', label: lang === 'ar' ? 'مستخدم جديد' : 'New user', to: 'users', tint: 'var(--tertiary)' },
    { icon: 'manage_accounts', label: t('new_assignment'), to: 'assign', tint: 'var(--azure-600)' },
    { icon: 'apartment', label: lang === 'ar' ? 'مساحة عمل' : 'Workspace', to: 'ws', tint: 'var(--success)' },
    { icon: 'grid_on', label: t('adm_matrix'), to: 'matrix', tint: 'var(--warning)' },
  ];
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{lang === 'ar' ? 'مركز التحكّم الإداري' : 'Admin control center'}</h1><p>{t('admin_sub')}</p></div></div>
      <div className="d-grid stats" style={{ marginBottom: 16 }}>
        <DStat icon="badge" val={totalUsers} lbl={t('adm_users')} />
        <DStat icon="shield_person" val={R.length} lbl={t('adm_roles')} />
        <DStat icon="apartment" tone="g" val={WS.length} lbl={t('adm_ws')} />
        <DStat icon="account_tree" tone="w" val={G.length} lbl={t('adm_groups')} />
      </div>
      <div className="d-grid c2">
        <div className="d-panel">
          <div className="d-panel-head"><b>{lang === 'ar' ? 'إجراءات سريعة' : 'Quick actions'}</b></div>
          <div className="d-panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {quick.map(q => (
              <button key={q.to} className="d-stat" style={{ cursor: 'pointer', alignItems: 'flex-start', gap: 12 }} onClick={() => setSec(q.to)}>
                <span className="d-stat-ico" style={{ background: 'color-mix(in srgb,' + q.tint + ' 14%, transparent)', color: q.tint }}><Icon name={q.icon} size={19} /></span>
                <div className="d-stat-lbl" style={{ fontSize: 13, fontWeight: 'var(--fw-bold)', color: 'var(--on-surface)' }}>{q.label}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="d-panel">
          <div className="d-panel-head"><b>{lang === 'ar' ? 'حالة النظام' : 'System status'}</b><span className="d-pill completed">{lang === 'ar' ? 'تشغيلي' : 'Operational'}</span></div>
          <div className="d-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { k: lang === 'ar' ? 'خدمة الهوية' : 'Identity service', s: 'ok' },
              { k: lang === 'ar' ? 'قاعدة البيانات' : 'Database', s: 'ok' },
              { k: lang === 'ar' ? 'مزامنة التدقيق' : 'Audit pipeline', s: 'ok' },
              { k: lang === 'ar' ? 'النسخ الاحتياطي' : 'Backups', s: 'warn' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 3 ? '1px solid var(--surface-container-high)' : 'none' }}>
                <span style={{ fontSize: 13 }}>{r.k}</span>
                <span className={`d-pill ${r.s === 'ok' ? 'completed' : 'suspended'}`}>{r.s === 'ok' ? (lang === 'ar' ? 'سليم' : 'Healthy') : (lang === 'ar' ? 'تحذير' : 'Warning')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="d-panel" style={{ marginTop: 16 }}>
        <div className="d-panel-head"><b>{lang === 'ar' ? 'أحدث نشاط إداري' : 'Recent admin activity'}</b><button className="d-link" onClick={() => setSec('audit')}>{t('view_all')}<Icon name={lang === 'ar' ? 'chevron_left' : 'chevron_right'} size={15} /></button></div>
        <div className="d-feed">
          {[...AUD, ...AUD.slice(0, 2)].map((a, i) => (
            <div key={i} className="d-feed-i">
              <span className="d-feed-av">{a.user[lang][0]}</span>
              <div className="d-feed-tx"><b>{a.user[lang]}</b> · {a.action[lang]} <span className="mono">{a.tgt}</span> <span className="d-cell-sub">({a.entity[lang]})</span></div>
              <span className="d-feed-time mono">{a.t.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ---------- users: table + select + bulk + drawer edit ---------- */
function DAdmUsers({ t, lang, showToast, setCtxMenu }) {
  const loading = useDeskLoad('adm-users');
  const [sel, setSel] = dS(() => new Set());
  const [edit, setEdit] = dS(null);
  const [q, setQ] = dS('');
  const qn = q.trim().toLowerCase();
  const rows = ADMIN_USERS.filter(u => !qn || u.n[lang].toLowerCase().includes(qn) || u.u.includes(qn));
  const allSel = sel.size > 0 && rows.every(r => sel.has(r.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(rows.map(r => r.id)));
  const toggleOne = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const menu = (e, u) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, items: [
    { icon: 'edit', label: lang === 'ar' ? 'تعديل' : 'Edit', onClick: () => setEdit(u) },
    { icon: u.active ? 'block' : 'check_circle', label: u.active ? (lang === 'ar' ? 'تعطيل' : 'Deactivate') : (lang === 'ar' ? 'تفعيل' : 'Activate'), onClick: () => showToast('Demo') },
    { sep: true },
    { icon: 'delete', label: lang === 'ar' ? 'حذف' : 'Delete', danger: true, onClick: () => showToast('Demo') },
  ] }); };
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{t('adm_users')}</h1><p>{lang === 'ar' ? 'إنشاء و إدارة الحسابات و تكليفات الأدوار و النطاقات.' : 'Create and manage accounts, role and scope assignments.'}</p></div>
        <div className="d-head-actions"><button className="d-btn" onClick={() => showToast('Demo')}><Icon name="ios_share" size={17} />{t('export')}</button><button className="d-btn accent" onClick={() => setEdit({ id: '', n: { ar: '', en: '' }, u: '', role: window.EPM.ROLES[4], unit: { ar: '', en: '' }, active: true, plane: 'ops', _new: true })}><Icon name="person_add" size={18} />{lang === 'ar' ? 'مستخدم جديد' : 'New user'}</button></div>
      </div>
      <div className="d-toolbar"><div className="d-field"><Icon name="search" size={17} style={{ color: 'var(--on-surface-variant)' }} /><input placeholder={lang === 'ar' ? 'بحث بالاسم أو المعرّف…' : 'Search name or username…'} value={q} onChange={e => setQ(e.target.value)} /></div><div className="sp" style={{ flex: 1 }}></div><span className="d-cell-sub">{rows.length} {lang === 'ar' ? 'مستخدم' : 'users'}</span></div>
      {loading ? <DTableSkeleton cols={5} /> : (
        <div className="d-tablewrap">
          <table className="d-table">
            <thead><tr>
              <th style={{ width: 44 }}><DCheck on={allSel} mixed={sel.size > 0 && !allSel} onClick={toggleAll} /></th>
              <th>{lang === 'ar' ? 'الموظف' : 'Employee'}</th><th>{t('username')}</th><th>{t('role')}</th><th>{lang === 'ar' ? 'الوحدة' : 'Unit'}</th><th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
            </tr></thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id} className={sel.has(u.id) ? 'sel' : ''} onClick={() => setEdit(u)} onContextMenu={e => menu(e, u)}>
                  <td onClick={e => { e.stopPropagation(); toggleOne(u.id); }}><DCheck on={sel.has(u.id)} /></td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><span className="d-side-av" style={{ width: 30, height: 30, fontSize: 12, background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>{u.n[lang][0]}</span><span className="d-cell-strong">{u.n[lang]}</span></div></td>
                  <td className="mono d-cell-sub">{u.u}</td>
                  <td><span className="d-pill ongoing">{u.role[lang]}</span></td>
                  <td className="d-cell-sub">{u.unit[lang]}</td>
                  <td>{u.active ? <span className="d-pill completed">{lang === 'ar' ? 'مفعّل' : 'Active'}</span> : <span className="d-pill withdrawn">{lang === 'ar' ? 'معطّل' : 'Inactive'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sel.size > 0 && (
        <div className="d-bulkbar">
          <span className="cnt">{sel.size} {lang === 'ar' ? 'محدّد' : 'selected'}</span><span className="vr"></span>
          <button onClick={() => showToast('Demo')}><Icon name="shield_person" size={16} />{lang === 'ar' ? 'تغيير الدور' : 'Set role'}</button>
          <button onClick={() => showToast('Demo')}><Icon name="block" size={16} />{lang === 'ar' ? 'تعطيل' : 'Deactivate'}</button>
          <span className="vr"></span><button onClick={() => setSel(new Set())}><Icon name="close" size={16} />{t('cancel')}</button>
        </div>
      )}
      {edit && (
        <DDrawer title={edit._new ? (lang === 'ar' ? 'مستخدم جديد' : 'New user') : edit.n[lang]} sub={edit._new ? '' : edit.id} onClose={() => setEdit(null)}
          footer={<React.Fragment><button className="d-btn" onClick={() => setEdit(null)}>{t('cancel')}</button><button className="d-btn primary" onClick={() => { setEdit(null); showToast(lang === 'ar' ? 'تم الحفظ — تجريبي' : 'Saved — demo'); }}><Icon name="check" size={17} />{t('save')}</button></React.Fragment>}>
          <div className="d-form-field"><label>{lang === 'ar' ? 'الاسم الكامل' : 'Full name'}</label><input className="ctl" defaultValue={edit.n[lang]} /></div>
          <div className="d-form-field"><label>{t('username')}</label><input className="ctl" defaultValue={edit.u} /></div>
          <div className="d-form-field"><label>{t('role')}</label><select className="ctl" defaultValue={edit.role[lang]}>{window.EPM.ROLES.map(r => <option key={r.key}>{r[lang]}</option>)}</select></div>
          <div className="d-form-field"><label>{lang === 'ar' ? 'الوحدة التنظيمية' : 'Org unit'}</label><select className="ctl" defaultValue={edit.unit[lang]}>{window.EPM.ADMIN_GROUPS.map(g => <option key={g.id}>{g.name[lang]}</option>)}</select></div>
          <div className="d-form-field"><label>{t('col_plane')}</label><select className="ctl" defaultValue={edit.plane}><option value="ops">{t('plane_ops')}</option><option value="both">{t('plane_ops')} + {t('plane_admin')}</option></select></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px' }}><span style={{ fontSize: 13, fontWeight: 'var(--fw-bold)' }}>{lang === 'ar' ? 'الحساب مفعّل' : 'Account active'}</span><button className={`d-switch ${edit.active ? 'on' : ''}`} onClick={() => setEdit(e => ({ ...e, active: !e.active }))}></button></div>
        </DDrawer>
      )}
    </React.Fragment>
  );
}

/* ---------- assignments ---------- */
function DAdmAssignments({ t, lang, showToast, setCtxMenu }) {
  const A = window.EPM.ASSIGNMENTS;
  const scopeLbl = { enterprise: t('scope_enterprise'), workspace: t('scope_workspace'), project: t('scope_project') };
  const scopePill = { enterprise: 'stalled', workspace: 'ongoing', project: 'suspended' };
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{t('adm_assign')}</h1><p>{lang === 'ar' ? 'تكليف مستخدم أو مجموعة بدور على نطاق (مؤسسة / مساحة عمل / مشروع).' : 'Assign a user or group a role at a scope (enterprise / workspace / project).'}</p></div>
        <div className="d-head-actions"><button className="d-btn accent" onClick={() => showToast('Demo')}><Icon name="add" size={18} />{t('new_assignment')}</button></div></div>
      <div className="d-panel" style={{ marginBottom: 14, background: 'color-mix(in srgb,var(--azure-500) 7%,transparent)', borderColor: 'color-mix(in srgb,var(--azure-500) 25%,transparent)' }}><div className="d-panel-body" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14 }}><Icon name="info" size={18} style={{ color: 'var(--azure-600)', flex: 'none', marginTop: 1 }} /><span style={{ fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.55 }}>{t('assign_note')}</span></div></div>
      <div className="d-tablewrap">
        <table className="d-table">
          <thead><tr><th>{t('col_principal')}</th><th>{t('col_role')}</th><th>{t('col_scope')}</th><th>{t('col_target')}</th><th>{t('col_plane')}</th></tr></thead>
          <tbody>
            {A.map((a, i) => (
              <tr key={i} onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, items: [{ icon: 'edit', label: lang === 'ar' ? 'تعديل' : 'Edit', onClick: () => showToast('Demo') }, { icon: 'delete', label: lang === 'ar' ? 'إزالة' : 'Remove', danger: true, onClick: () => showToast('Demo') }] }); }}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="d-party-av" style={{ width: 28, height: 28, borderRadius: 7, background: a.ptype === 'group' ? 'color-mix(in srgb,var(--azure-500) 14%,transparent)' : 'var(--surface-container-high)', color: a.ptype === 'group' ? 'var(--azure-600)' : 'var(--on-surface-variant)' }}><Icon name={a.ptype === 'group' ? 'groups' : 'person'} size={15} /></span><span><b className="d-cell-strong" style={{ display: 'block' }}>{a.principal[lang]}</b><span className="d-cell-sub">{a.ptype === 'group' ? t('principal_group') : t('principal_user')}</span></span></div></td>
                <td><span className="d-pill withdrawn">{a.role[lang]}</span></td>
                <td><span className={`d-pill ${scopePill[a.scope]}`}>{scopeLbl[a.scope]}</span></td>
                <td className="d-cell-sub">{a.target[lang]}</td>
                <td>{a.plane === 'both' ? <span className="d-pill ongoing">{t('plane_ops')} + {t('plane_admin')}</span> : <span className="d-pill withdrawn">{t('plane_ops')}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

/* ---------- roles: cards ---------- */
function DAdmRoles({ t, lang, showToast }) {
  const R = window.EPM.ROLES;
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{t('adm_roles')}</h1><p>{lang === 'ar' ? 'كتالوج الأدوار عالمي على مستوى النظام و يملكه المدير الرئيسي. مشرفو مساحات العمل يكلّفون فقط.' : 'The role catalog is enterprise-global and master-owned. Workspace admins assign only.'}</p></div></div>
      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(248px,1fr))' }}>
        {R.map(r => (
          <div key={r.key} className="d-stat" style={{ gap: 12 }}>
            <div className="d-stat-top">
              <span className="d-stat-ico" style={{ background: 'color-mix(in srgb,var(--primary) 12%,transparent)', color: 'var(--primary)' }}><Icon name="shield_person" size={19} /></span>
              <span className={`d-pill ${r.plane === 'both' ? 'ongoing' : 'withdrawn'}`}>{r.plane === 'both' ? (lang === 'ar' ? 'تشغيلي + إداري' : 'Ops + Admin') : (lang === 'ar' ? 'تشغيلي' : 'Ops')}</span>
            </div>
            <div><div style={{ fontSize: 15, fontWeight: 'var(--fw-x)', color: 'var(--on-surface)', letterSpacing: '-.2px' }}>{r[lang]}</div><div className="d-cell-sub" style={{ marginTop: 3 }}><span className="mono">{r.users}</span> {lang === 'ar' ? 'مستخدم' : 'users'} · {lang === 'ar' ? 'المفتاح' : 'key'} <span className="mono">{r.key}</span></div></div>
            <button className="d-btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => showToast('Demo')}>{lang === 'ar' ? 'عرض المصفوفة' : 'View matrix'}<Icon name={lang === 'ar' ? 'arrow_back' : 'arrow_forward'} size={15} /></button>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

/* ---------- permission matrix ---------- */
function DAdmMatrix({ t, lang, showToast }) {
  const E = window.EPM.MATRIX_ENTITIES[lang], A = window.EPM.MATRIX_ACTIONS[lang], R = window.EPM.ROLES;
  const [role, setRole] = dS('3');
  const checked = (ri, ci) => ci === 7 ? false : ((ri * 3 + ci * 5 + 2) % 4) !== 0;
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{t('adm_matrix')}</h1><p>{lang === 'ar' ? 'صفوف الكيانات × ٩ إجراءات. ابدأ من افتراضي الدور ثم خصّص لكل مستخدم.' : 'Entity rows × 9 actions. Start from the role default, then override per user.'}</p></div>
        <div className="d-head-actions"><select className="ctl" style={{ width: 'auto', height: 36 }} value={role} onChange={e => setRole(e.target.value)}>{R.map(r => <option key={r.key} value={r.key}>{r[lang]}</option>)}</select></div></div>
      <div className="d-tablewrap" style={{ overflow: 'auto' }}>
        <table className="d-table" style={{ minWidth: 720 }}>
          <thead><tr><th style={{ position: 'sticky', insetInlineStart: 0, zIndex: 2 }}>{lang === 'ar' ? 'الكيان / الإجراء' : 'Entity / Action'}</th>{A.map((a, i) => <th key={i} style={{ textAlign: 'center', opacity: i === 7 ? .5 : 1 }}>{a}</th>)}</tr></thead>
          <tbody>
            {E.map((e, ri) => (
              <tr key={ri} style={{ cursor: 'default' }}>
                <td className="d-cell-strong" style={{ position: 'sticky', insetInlineStart: 0, background: 'var(--surface-container-lowest)', zIndex: 1 }}>{e}</td>
                {A.map((a, ci) => (
                  <td key={ci} style={{ textAlign: 'center' }}>
                    <span className={`d-check ${checked(ri, ci) ? 'on' : ''}`} style={{ display: 'inline-grid', opacity: ci === 7 ? .4 : 1, cursor: ci === 7 ? 'not-allowed' : 'pointer' }} onClick={() => ci !== 7 && showToast('Demo')}>{checked(ri, ci) && <Icon name="check" size={13} />}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 12, color: 'var(--on-surface-variant)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span className="d-check on" style={{ width: 16, height: 16, display: 'inline-grid' }}><Icon name="check" size={11} /></span>{lang === 'ar' ? 'مسموح' : 'Allowed'}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span className="d-check" style={{ width: 16, height: 16 }}></span>{lang === 'ar' ? 'غير مسموح' : 'Not allowed'}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span className="d-check" style={{ width: 16, height: 16, opacity: .4 }}></span>{lang === 'ar' ? '«استيراد» معطّل على مستوى الخدمة' : '“Import” disabled at service level'}</span>
      </div>
    </React.Fragment>
  );
}

/* ---------- groups: org tree ---------- */
function DAdmGroups({ t, lang, showToast }) {
  const G = window.EPM.ADMIN_GROUPS, WS = window.EPM.WORKSPACES;
  const ownerLabel = o => o === 'ent' ? t('owner_ent') : (WS.find(w => w.id === o)?.[lang] || o);
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{t('adm_groups')}</h1><p>{t('groups_note')}</p></div><div className="d-head-actions"><button className="d-btn accent" onClick={() => showToast('Demo')}><Icon name="add" size={18} />{lang === 'ar' ? 'مجموعة' : 'Group'}</button></div></div>
      <div className="d-tablewrap">
        {G.map((g, i) => (
          <button key={g.id} className="d-mini" style={{ paddingInlineStart: 18 + g.level * 26, borderBottom: i < G.length - 1 ? '1px solid var(--surface-container-high)' : 'none' }} onClick={() => showToast('Demo')}>
            {g.level > 0 && <span style={{ width: 14, height: 1, background: 'var(--outline-variant)', flex: 'none' }}></span>}
            <span className="d-mini-emblem" style={{ width: 30, height: 30, background: g.level === 0 ? 'var(--primary)' : g.level === 1 ? 'var(--azure-600)' : 'var(--surface-container-high)', color: g.level === 2 ? 'var(--on-surface-variant)' : '#fff' }}><Icon name={g.type.en === 'Committee' ? 'groups' : 'account_tree'} size={15} /></span>
            <span className="d-mini-main"><b>{g.name[lang]}</b><span>{g.type[lang]}</span></span>
            <span className="d-pill withdrawn" style={{ marginInlineEnd: 12 }}>{g.owner === 'ent' ? <React.Fragment><Icon name="public" size={12} />{ownerLabel(g.owner)}</React.Fragment> : <React.Fragment><Icon name="apartment" size={12} />{ownerLabel(g.owner)}</React.Fragment>}</span>
            <span className="d-cell-sub mono">{g.members} {t('members')}</span>
          </button>
        ))}
      </div>
    </React.Fragment>
  );
}

/* ---------- workspaces ---------- */
function DAdmWorkspaces({ t, lang, showToast }) {
  const WS = window.EPM.WORKSPACES;
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{t('adm_ws')}</h1><p>{lang === 'ar' ? 'مساحات العمل هي حدّ العزل و نطاق التكليف. تُدار من المدير الرئيسي.' : 'Workspaces are the isolation boundary and the assignment scope. Master-managed.'}</p></div><div className="d-head-actions"><button className="d-btn accent" onClick={() => showToast('Demo')}><Icon name="add" size={18} />{lang === 'ar' ? 'مساحة عمل' : 'Workspace'}</button></div></div>
      <div className="d-tablewrap">
        <table className="d-table">
          <thead><tr><th>{lang === 'ar' ? 'مساحة العمل' : 'Workspace'}</th><th>{lang === 'ar' ? 'النوع' : 'Type'}</th><th>{lang === 'ar' ? 'الرمز' : 'Code'}</th><th>{lang === 'ar' ? 'المشاريع' : 'Projects'}</th><th>{lang === 'ar' ? 'الإدارة المفوّضة' : 'Delegated admin'}</th></tr></thead>
          <tbody>
            {WS.map((w, i) => (
              <tr key={w.id} onClick={() => showToast('Demo')}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><span className="d-mini-emblem" style={{ width: 28, height: 28, background: w.color, fontSize: 11 }}>{w.code}</span><span className="d-cell-strong">{w[lang]}</span></div></td>
                <td className="d-cell-sub">{w.kind[lang]}</td><td className="mono d-cell-sub">{w.code}</td><td className="num">{w.projects}</td>
                <td>{i % 2 === 0 ? <span className="d-pill completed">{lang === 'ar' ? 'مفعّلة' : 'Enabled'}</span> : <span className="d-pill withdrawn">{lang === 'ar' ? 'معطّلة' : 'Disabled'}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

/* ---------- projects ---------- */
function DAdmProjects({ t, lang, showToast }) {
  const P = window.EPM.ADMIN_PROJECTS, WS = window.EPM.WORKSPACES;
  const wsName = id => WS.find(w => w.id === id)?.[lang] || id;
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{t('adm_projects')}</h1><p>{lang === 'ar' ? 'إنشاء المشاريع و إدارة أعضائها على نطاق المشروع. مشروع واحد يملكه مساحة عمل واحدة.' : 'Create projects and manage project-scope members. One workspace owns each project.'}</p></div><div className="d-head-actions"><button className="d-btn accent" onClick={() => showToast('Demo')}><Icon name="add" size={18} />{t('new_project')}</button></div></div>
      <div className="d-tablewrap">
        <table className="d-table">
          <thead><tr><th>{t('col_id')}</th><th>{t('col_project')}</th><th>{lang === 'ar' ? 'المالك' : 'Owner'}</th><th>{lang === 'ar' ? 'الأعضاء' : 'Members'}</th><th>{t('col_status')}</th></tr></thead>
          <tbody>
            {P.map(p => (
              <tr key={p.id} onClick={() => showToast('Demo')}>
                <td className="mono d-cell-sub">{p.id}</td>
                <td><span className="d-cell-strong">{p.name[lang]}</span>{p.shared && <span className="d-pill ongoing" style={{ marginInlineStart: 8 }}><Icon name="hub" size={11} />{lang === 'ar' ? 'مشترك' : 'Shared'}</span>}</td>
                <td className="d-cell-sub">{wsName(p.ws)}</td>
                <td className="num">{p.members}</td>
                <td><DPill status={p.status} lang={lang} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

/* ---------- audit ---------- */
function DAdmAudit({ t, lang, showToast }) {
  const AUD = [...window.EPM.AUDIT, ...window.EPM.AUDIT];
  return (
    <React.Fragment>
      <div className="d-page-head"><div><h1>{t('adm_audit')}</h1><p>{lang === 'ar' ? 'كل عملية إنشاء و تعديل و حذف تُسجَّل مع الهوية و الوقت و الهدف.' : 'Every create, update and delete is recorded with identity, time and target.'}</p></div><div className="d-head-actions"><button className="d-btn" onClick={() => showToast('Demo')}><Icon name="filter_list" size={17} />{t('filter')}</button></div></div>
      <div className="d-tablewrap">
        <table className="d-table">
          <thead><tr><th>{lang === 'ar' ? 'المستخدم' : 'User'}</th><th>{lang === 'ar' ? 'الإجراء' : 'Action'}</th><th>{lang === 'ar' ? 'الكيان' : 'Entity'}</th><th>{lang === 'ar' ? 'الهدف' : 'Target'}</th><th>IP</th><th>{lang === 'ar' ? 'الوقت' : 'Time'}</th></tr></thead>
          <tbody>
            {AUD.map((a, i) => (
              <tr key={i} style={{ cursor: 'default' }}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span className="d-side-av" style={{ width: 26, height: 26, fontSize: 11, background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>{a.user[lang][0]}</span>{a.user[lang]}</div></td>
                <td className="d-cell-strong">{a.action[lang]}</td><td className="d-cell-sub">{a.entity[lang]}</td>
                <td className="mono d-cell-sub">{a.tgt}</td><td className="mono d-cell-sub">{a.ip}</td><td className="mono d-cell-sub">{a.t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { DAdmin, DDrawer });
