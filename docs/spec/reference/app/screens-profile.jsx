/* ============================================================
   EPM Prototype — Profile + Admin screens
   ============================================================ */

function Profile({ t, lang, user, setNav }) {
  const [tab, setTab] = useState('account');
  const tabs = [
    { id:'account', icon:'person', label:t('account') },
    { id:'access',  icon:'verified_user', label:t('my_access') },
    { id:'activity',icon:'history', label:t('activity_log') },
  ];
  const AUD = window.EPM.AUDIT;
  return (
    <div className="screen">
      <div className="prof-hero">
        <Avatar size={72} style={{ fontSize:28 }}>{user.initials[lang]}</Avatar>
        <div className="prof-id">
          <h1>{user.name[lang]}</h1>
          <div className="prof-tags">
            <span className="pill pill-info">{user.role[lang]}</span>
            <span className="prof-unit"><Icon name="account_tree" size={15} />{user.unit[lang]}</span>
          </div>
          <span className="prof-mail mono">{user.email}</span>
        </div>
        <button className="btn btn-outlined btn-sm"><Icon name="edit" size={17} />{lang==='ar'?'تعديل':'Edit'}</button>
      </div>

      <div className="prof-tabs">
        {tabs.map(tb => (
          <button key={tb.id} className={`prof-tab ${tab===tb.id?'on':''}`} onClick={()=>setTab(tb.id)}>
            <Icon name={tb.icon} size={18} />{tb.label}
          </button>
        ))}
      </div>

      {tab==='account' && (
        <div className="prof-grid">
          <div className="info-card">
            <div className="info-card-h">{lang==='ar'?'المعلومات الأساسية':'Basic information'}</div>
            <Field2 label={lang==='ar'?'الاسم الكامل':'Full name'} value={user.name[lang]} />
            <Field2 label={t('email')} value={user.email} mono />
            <Field2 label={t('role')} value={user.role[lang]} />
            <Field2 label={t('org_unit')} value={user.unit[lang]} />
            <Field2 label={lang==='ar'?'حالة الحساب':'Account status'} value={lang==='ar'?'مفعّل':'Active'} pill="pill-success" />
          </div>
          <div className="info-card">
            <div className="info-card-h">{lang==='ar'?'الأمان':'Security'}</div>
            <Field2 label={lang==='ar'?'كلمة السر':'Password'} value="•••••••••" action={lang==='ar'?'تغيير':'Change'} />
            <Field2 label={lang==='ar'?'آخر دخول':'Last sign-in'} value="2026-06-08 09:41 · 10.4.12.7" mono />
            <Field2 label={lang==='ar'?'المصادقة الثنائية':'Two-factor'} value={lang==='ar'?'غير مفعّلة':'Disabled'} pill="pill-neutral" />
          </div>
        </div>
      )}

      {tab==='access' && (
        <div className="prof-grid">
          <div className="info-card">
            <div className="info-card-h">{t('assignments')}</div>
            <p className="info-note">{lang==='ar'?'وصولك الفعّال هو اتحاد هذه التكليفات، مقيّداً بمصفوفة الإجراءات التسعة و جدار العزل الأعلى.':'Your effective access is the union of these assignments, gated by the 9-action matrix and the enterprise isolation wall.'}</p>
            {user.assignments.map((a,i)=>(
              <div key={i} className="assign-row">
                <span className={`plane-dot ${a.plane}`}></span>
                <div className="assign-txt"><b>{a.role[lang]}</b><span>{lang==='ar'?'النطاق':'Scope'}: {a.scope[lang]}</span></div>
                <span className={`pill ${a.plane==='both'?'pill-info':'pill-neutral'}`}>{a.plane==='both'?(lang==='ar'?'تشغيلي + إداري':'Ops + Admin'):(lang==='ar'?'تشغيلي':'Operational')}</span>
              </div>
            ))}
          </div>
          <div className="info-card">
            <div className="info-card-h">{lang==='ar'?'الإجراءات المسموحة':'Permitted actions'}</div>
            <div className="action-grid">
              {window.EPM.MATRIX_ACTIONS[lang].map((a,i)=>(
                <span key={i} className={`action-tag ${i!==7?'on':''}`}>
                  <Icon name={i!==7?'check':'remove'} size={14} />{a}
                </span>
              ))}
            </div>
            <p className="info-note" style={{marginTop:12}}>{lang==='ar'?'«استيراد» معطّل على مستوى الخدمة حالياً (قرار القسم).':'“Import” is currently disabled at the service level (department decision).'}</p>
          </div>
        </div>
      )}

      {tab==='activity' && (
        <div className="card table-card">
          <table className="tbl">
            <thead><tr><th>{lang==='ar'?'الإجراء':'Action'}</th><th>{lang==='ar'?'الكيان':'Entity'}</th><th>{lang==='ar'?'الهدف':'Target'}</th><th>IP</th><th>{lang==='ar'?'الوقت':'Time'}</th></tr></thead>
            <tbody>
              {AUD.map((a,i)=>(
                <tr key={i}>
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
      )}
    </div>
  );
}

function Field2({ label, value, mono, pill, action }) {
  return (
    <div className="field2">
      <span className="field2-l">{label}</span>
      <span className="field2-v">
        {pill ? <span className={`pill ${pill}`}>{value}</span> : <span className={mono?'mono':''}>{value}</span>}
        {action && <button className="field2-act">{action}</button>}
      </span>
    </div>
  );
}

Object.assign(window, { Profile, Field2 });
