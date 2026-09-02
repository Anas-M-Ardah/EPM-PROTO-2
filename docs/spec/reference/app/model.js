/* ============================================================
   EPM Prototype — derivation layer (bottom-up, from base facts)
   Loaded after data.jsx. Recomputes aggregate figures from the
   project's own base records (schedule activities, payments,
   contract/BOQ values) so nothing displayed is a standalone random
   number — every total/%, EVM index, etc. is CALCULATED from data.
   Base facts (activity progress, BOQ qty/rate, payments) are the
   editable + persisted records; these functions derive up from them.
   ============================================================ */
(function (root) {
  const EPM = (root.EPM = root.EPM || {});

  /* The single "now" the whole app measures progress and lead times against
     (demo data date). Change here to re-date the entire portfolio. */
  EPM.DATA_DATE = '2026-07-22';

  /* Earned-value physical % across a project's schedule activities:
     Σ(cost × progress) / Σ(cost). Milestones (zero cost) excluded.
     Memoised per project id — buildProjects calls this for the whole
     portfolio, so recomputing a schedule each time would be wasteful. */
  const _physCache = {};
  EPM.derivePhysicalPct = function (p, lang) {
    const key = p && p.id;
    // live propagation: if the user edited activity progress (persisted in the
    // Schedule tab), overlay those values so the rollup reflects the edit.
    const skey = key && 'sched.acts.' + key;
    const persisted = (skey && window.EPMStore && window.EPMStore.has(skey)) ? window.EPMStore.get(skey) : null;
    if (key && !persisted && _physCache[key] != null) return _physCache[key]; // cache only the base figure
    let val;
    try {
      const sd = EPM.buildScheduleData(p, lang || 'ar');
      let acts = (sd.activities || []).filter(a => a.type === 'act' && !a.milestone);
      if (persisted && persisted.length) {
        const pm = {}; persisted.forEach(function (a) { if (a && a.id != null) pm[a.id] = a.pct; });
        acts = acts.map(function (a) { return pm[a.id] != null ? Object.assign({}, a, { pct: pm[a.id] }) : a; });
      }
      const costOf = a => a.budgetedCost || a.cost || a.dur || 1;
      const tot = acts.reduce((s, a) => s + costOf(a), 0);
      val = tot <= 0 ? (p ? (p.tech || 0) : 0)
        : Math.round(acts.reduce((s, a) => s + costOf(a) * (a.pct || 0), 0) / tot);
    } catch (e) { val = p ? (p.tech || 0) : 0; }
    if (key && !persisted) _physCache[key] = val;
    return val;
  };

  /* Wrap buildProjects so EVERY project's completion % is the earned-value
     rollup of its own activity records — the portfolio list, cards and all
     enterprise averages then read a computed figure, not a stored one. */
  const ACTIVE_ST = { ongoing: 1, stalled: 1, suspended: 1 };
  const _buildProjects = EPM.buildProjects;
  if (_buildProjects && !_buildProjects.__derived) {
    EPM.buildProjects = function (wsId, count, lang) {
      const projs = _buildProjects(wsId, count);
      projs.forEach(function (p) {
        // Supply projects derive completion from device receipts (Σ received ÷
        // Σ contracted), not from a construction S-curve.
        var isSupply = p.type === 'supply';
        var phys = isSupply && EPM.buildSupplyData
          ? (function () {
              try {
                // live: prefer persisted line items (receipt edits) over the seed
                var stored = window.EPMStore ? window.EPMStore.get('supply.items.' + p.id, null) : null;
                var items = (stored && stored.length) ? stored : EPM.buildSupplyData(p, lang || 'ar').items;
                // value-weighted completion — each item earns by its BOQ value
                // (contracted × unit rate); falls back to a plain quantity ratio for
                // older items that predate the inherited price attribute
                var totVal = items.reduce(function (a, x) { return a + (x.contracted || 0) * (x.price || 0); }, 0);
                if (totVal > 0) {
                  var earned = items.reduce(function (a, x) { return a + (x.received || 0) * (x.price || 0); }, 0);
                  return Math.round(earned / totVal * 100);
                }
                var c = items.reduce(function (a, x) { return a + (x.contracted || 0); }, 0);
                var rc = items.reduce(function (a, x) { return a + (x.received || 0); }, 0);
                return c ? Math.round(rc / c * 100) : 0;
              } catch (e) { return EPM.derivePhysicalPct(p, lang || 'ar'); }
            })()
          : EPM.derivePhysicalPct(p, lang || 'ar');
        p.techSeed = p.tech;      // keep the raw seed for reference
        p.tech = phys;            // displayed completion is derived
        // financialPct was computed by the seed from techSeed. Replacing tech
        // without replacing it left the two describing different projects —
        // a job 17% built reading 61% paid, and every derived indicator (CPI,
        // EAC, VAC) inheriting the gap. Money follows delivery, keeping the
        // seed's own cost-efficiency ratio.
        if (p.financialPct != null && p.techSeed) {
          var effRatio = p.financialPct / p.techSeed;
          p.financialPct = Math.max(0, Math.min(100, Math.round(phys * effRatio)));
        }
        // reconcile status with the real figures so nothing conflicts
        // (a 100% project is Completed, a delayed one is Delayed, etc.).
        // Suspended / withdrawn are administrative stops — kept, and their
        // progress is already frozen partial by buildScheduleData.
        if (p.status !== 'suspended' && p.status !== 'withdrawn') {
          var delay = 0;
          if (!isSupply) { var sd = null; try { sd = EPM.buildScheduleData(p, lang || 'ar'); } catch (e) {} delay = sd ? (sd.delayDays || 0) : 0; }
          p.status = phys >= 100 ? 'completed'
            : (phys > 0 && delay > 20) ? 'stalled'
              : 'ongoing';
        }
      });
      // roll the workspace figures up from its own projects — recomputed on
      // every call, so edits to activity progress propagate here too (live).
      const w = (EPM.WORKSPACES || []).find(function (x) { return x.id === wsId; });
      if (w) {
        w.projects = projs.length;
        w.active = projs.filter(function (p) { return ACTIVE_ST[p.status]; }).length;
        w.completion = projs.length ? Math.round(projs.reduce(function (s, p) { return s + p.tech; }, 0) / projs.length) : 0;
      }
      return projs;
    };
    EPM.buildProjects.__derived = true;
  }

  /* Recompute a project detail `d`'s headline aggregates from its base
     facts. Mutates d in place and returns it. Safe to call repeatedly. */
  EPM.deriveDetail = function (d, p, lang) {
    if (!d) return d;
    // 1) actual cost from the REAL payments list (seeded + user-registered)
    const payments = (d.financial && d.financial.payments) || [];
    const disbursed = payments.reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
    // 2) budget = Σ contract values (each contract value = its BOQ total)
    const budget = (d.contracts || []).reduce((s, c) => s + ((c.raw && c.raw.contractCost) || 0), 0)
      || (d.evm && d.evm.budget) || (d.financial && d.financial.raw && d.financial.raw.revisedCost) || 0;
    // 3) physical % = earned value across the schedule
    const physicalPct = EPM.derivePhysicalPct(p, lang);
    // 4) write back financial raw (drives the donut + metrics)
    const raw = d.financial && d.financial.raw;
    if (raw) {
      raw.disbursed = disbursed;
      raw.remaining = Math.max(0, (raw.revisedCost || budget) - disbursed);
      raw.financialPct = (raw.revisedCost || budget) ? Math.round(disbursed / (raw.revisedCost || budget) * 100) : 0;
      raw.physicalDerived = physicalPct;
    }
    // 5) EVM indices — all computed from budget / physical% / actual cost
    if (d.evm) {
      const b = d.evm.budget || budget;
      const plannedProg = EPM.derivePlannedPct(p, lang);
      const pp = plannedProg == null ? Math.min(100, physicalPct + 8) : plannedProg;
      d.evm.ac = disbursed;
      d.evm.ev = Math.round(b * physicalPct / 100);
      d.evm.pv = Math.round(b * pp / 100);
      d.evm.plannedPct = pp;
      d.evm.cpi = d.evm.ac ? +(d.evm.ev / d.evm.ac).toFixed(2) : 1;
      d.evm.spi = d.evm.pv ? +(d.evm.ev / d.evm.pv).toFixed(2) : 1;
      d.evm.eac = d.evm.cpi ? Math.round(b / d.evm.cpi) : b;
      d.evm.vac = b - d.evm.eac;
      d.evm.physicalPct = physicalPct;
    }
    if (p) { p.techDerived = physicalPct; }
    return d;
  };

  /* Derive a project's physical % for the portfolio list/cards. */
  EPM.derivePlannedPct = function (p, lang) {
    var sd = null; try { sd = EPM.buildScheduleData(p, lang || 'ar'); } catch (e) { return null; }
    if (!sd) return null;
    var acts = (sd.activities || []).filter(function (a) { return a.type === 'act' && !a.milestone; });
    if (!acts.length) return null;
    var dd = new Date(sd.dataDate).getTime();
    var tot = 0, earned = 0;
    acts.forEach(function (a) {
      var c = a.cost || 1; tot += c;
      var s0 = a.blStart ? new Date(a.blStart).getTime() : null;
      var f0 = a.blFinish ? new Date(a.blFinish).getTime() : null;
      if (s0 == null || f0 == null || f0 <= s0) { earned += dd >= (f0 || dd) ? c : 0; return; }
      var f = (dd - s0) / (f0 - s0);
      earned += c * Math.max(0, Math.min(1, f));
    });
    return tot ? Math.round(earned / tot * 100) : null;
  };
  EPM.deriveProjectFigures = function (p, lang) {
    return { physicalPct: EPM.derivePhysicalPct(p, lang), plannedPct: EPM.derivePlannedPct(p, lang) };
  };

  /* Per-module readiness LABELS — the shared readiness state machine is reused
     across modules that evaluate different things, so each module gets labels
     that say what was actually evaluated (e.g. Schedule "Returned" really means
     "Delayed — re-baseline"). Falls back to the generic READINESS label. */
  var RLABEL = {
    schedule: { approved: { ar: 'ضمن الجدول', en: 'On schedule' }, ready: { ar: 'انزياح بسيط', en: 'Minor slip' }, returned: { ar: 'متأخر — إعادة جدولة', en: 'Delayed — re-baseline' }, notstarted: { ar: 'لم يبدأ', en: 'Not started' }, blocked: { ar: 'متوقف', en: 'Halted' } },
    changeorders: { approved: { ar: 'أوامر معتمدة', en: 'Orders approved' }, inprogress: { ar: 'قيد الاعتماد', en: 'In approval' }, returned: { ar: 'معاد للتعديل', en: 'Returned for revision' }, na: { ar: 'لا أوامر', en: 'No orders' } },
    documents: { approved: { ar: 'وثائق معتمدة', en: 'Docs approved' }, inprogress: { ar: 'قيد المراجعة', en: 'In review' }, returned: { ar: 'مرفوضة', en: 'Rejected' }, notstarted: { ar: 'لا وثائق', en: 'No documents' } },
    meetings: { approved: { ar: 'محاضر مسجّلة', en: 'Minutes recorded' }, notstarted: { ar: 'لا محاضر', en: 'No minutes' } },
    alerts: { approved: { ar: 'لا تنبيهات', en: 'No alerts' }, inprogress: { ar: 'تنبيهات نشطة', en: 'Active alerts' }, blocked: { ar: 'تنبيهات حرجة', en: 'Critical alerts' } },
    model: { na: { ar: 'مؤجّل — المرحلة الأولى', en: 'Deferred — Phase 1' } },
    progress: { approved: { ar: 'مكتمل', en: 'Complete' }, inprogress: { ar: 'قيد التنفيذ', en: 'In progress' }, ready: { ar: 'مراحل مبكرة', en: 'Early stage' }, notstarted: { ar: 'لم يبدأ', en: 'Not started' } },
    boq: { approved: { ar: 'بنود مُدرجة', en: 'Items loaded' }, ready: { ar: 'بانتظار الإدخال', en: 'Awaiting entry' } },
    financial: { approved: { ar: 'صرف مكتمل', en: 'Fully disbursed' }, inprogress: { ar: 'صرف جارٍ', en: 'Disbursing' }, ready: { ar: 'بانتظار الصرف', en: 'Awaiting disbursement' } },
  };
  EPM.readinessLabel = function (mod, state, lang) {
    var m = RLABEL[mod];
    if (m && m[state]) return m[state][lang] || m[state].en;
    var g = EPM.READINESS[state] || EPM.READINESS.notstarted;
    return g[lang] || g.en;
  };

  /* Make the per-module readiness dots on the project tabs derive from each
     module's REAL data (change orders, documents, meetings, alerts), not a
     seeded pick. Wraps the base buildReadiness (which already derives
     progress/schedule/boq/financial/contract/information from completion+status).
     Pass the already-built detail `dIn` to avoid rebuilding it. */
  var _buildReadiness = EPM.buildReadiness;
  if (_buildReadiness && !_buildReadiness.__derived) {
    EPM.buildReadiness = function (p, lang, dIn) {
      var base = _buildReadiness(p) || {};
      try {
        var L = lang || 'ar';
        var d = dIn || (window.epmOverlayD ? window.epmOverlayD(EPM.buildProjectDetail(p, L), p.id) : EPM.buildProjectDetail(p, L));
        // change orders → from the actual VO lifecycle
        var vos = d.variationOrders || [];
        base.changeorders = !vos.length ? 'na'
          : vos.some(function (v) { return v.status === 'rejected'; }) ? 'returned'
            : vos.some(function (v) { return v.status === 'pending'; }) ? 'inprogress'
              : 'approved';
        // documents → from drawing/revision approval state
        var docs = d.drawings || [];
        base.documents = !docs.length ? 'notstarted'
          : docs.some(function (x) { return x.status === 'rejected'; }) ? 'returned'
            : docs.some(function (x) { return x.status === 'draft' || x.status === 'review'; }) ? 'inprogress'
              : 'approved';
        // meetings → recorded minutes = approved, none = not started
        base.meetings = (d.meetings && d.meetings.length) ? 'approved' : 'notstarted';
        // 3D model → deferred in Phase 1 (honest: not applicable yet)
        base.model = 'na';
        // schedule + alerts derive from real schedule health (delay days,
        // negative-float activities) rather than overall completion
        var sd = null; try { sd = EPM.buildScheduleData(p, L); } catch (e) {}
        var delay = sd ? (sd.delayDays || 0) : 0, negF = sd ? (sd.negFloatCount || 0) : 0;
        if ((p.tech || 0) <= 0) base.schedule = 'notstarted';
        else if (p.status === 'stalled') base.schedule = 'returned';   // work withdrawn/halted
        else if (sd) base.schedule = (delay <= 0) ? 'approved'         // on track / ahead
          : (delay > 20) ? 'returned'                                 // major slip → re-baseline
            : 'ready';                                                // minor slip → needs review
        if (p.status === 'stalled' || p.status === 'suspended') base.alerts = 'blocked';
        else base.alerts = (delay > 0 || negF > 0) ? 'inprogress' : 'approved';
      } catch (e) {}
      return base;
    };
    EPM.buildReadiness.__derived = true;
  }
  // prime the workspace rollups once at load (kept live by the wrapper after).
  (EPM.WORKSPACES || []).forEach(function (w) { try { EPM.buildProjects(w.id, w.projects, 'ar'); } catch (e) {} });

  // Rebuild the Administration project sample from the REAL portfolio so its
  // ids / names / statuses / workspaces match (was a stale hardcoded list).
  try {
    var adm = [];
    (EPM.WORKSPACES || []).forEach(function (w) {
      EPM.buildProjects(w.id, w.projects, 'ar').slice(0, 2).forEach(function (p, idx) {
        adm.push({ id: p.id, name: p.name, ws: w.id,
          members: 3 + (Math.abs(p.id.charCodeAt(6) + p.id.charCodeAt(7)) % 8),
          status: p.status, shared: (w.id === 'cu' && idx === 0) });
      });
    });
    if (adm.length) EPM.ADMIN_PROJECTS = adm;
  } catch (e) {}

  // Rebuild the audit log so it traces to REAL contract codes (CNT-<proj>) and
  // the SAME user accounts shown in the admin directory (desktop/mobile-admin
  // USR-241/188/205/219…), instead of a stale placeholder contract code.
  try {
    var users = [
      { id: 'USR-241', name: { ar: 'أحمد فؤاد جواد', en: 'Ahmed Fouad Jawad' } },
      { id: 'USR-188', name: { ar: 'ليلى حسن محمود', en: 'Layla Hasan Mahmoud' } },
      { id: 'USR-205', name: { ar: 'مصطفى علي كريم', en: 'Mustafa Ali Karim' } },
      { id: 'USR-219', name: { ar: 'سارة كريم عبد', en: 'Sara Karim Abd' } },
    ];
    EPM.USERS = users;
    var cnt = [];
    (EPM.WORKSPACES || []).forEach(function (w) { EPM.buildProjects(w.id, w.projects, 'ar').slice(0, 3).forEach(function (p) { cnt.push('CNT-' + p.id.slice(4)); }); });
    var C = function (i) { return cnt[i % cnt.length] || 'CNT-0148'; };
    EPM.AUDIT = [
      { user: users[0].name, action: { ar: 'تعديل', en: 'Edit' }, entity: { ar: 'العقد', en: 'Contract' }, tgt: C(1), ip: '10.4.12.7', t: '2026-06-08 09:41' },
      { user: users[0].name, action: { ar: 'إضافة مستخدم', en: 'Create user' }, entity: { ar: 'المخوّلون', en: 'Users' }, tgt: users[3].id, ip: '10.4.12.2', t: '2026-06-08 09:12' },
      { user: users[1].name, action: { ar: 'حذف مرفق', en: 'Delete attachment' }, entity: { ar: 'العقد', en: 'Contract' }, tgt: C(0) + ' · DOC-02', ip: '10.4.13.9', t: '2026-06-07 16:50' },
      { user: users[2].name, action: { ar: 'تسجيل دخول', en: 'Sign-in' }, entity: { ar: 'الجلسة', en: 'Session' }, tgt: users[2].id, ip: '10.4.12.31', t: '2026-06-07 08:03' },
      { user: users[3].name, action: { ar: 'تعديل صلاحيات', en: 'Permission change' }, entity: { ar: 'المخوّلون', en: 'Users' }, tgt: users[1].id, ip: '10.4.12.2', t: '2026-06-06 14:22' },
      { user: users[0].name, action: { ar: 'اعتماد أمر تغييري', en: 'Approve change order' }, entity: { ar: 'العقد', en: 'Contract' }, tgt: C(2) + ' · VO-03', ip: '10.4.12.7', t: '2026-06-06 11:10' },
    ];
  } catch (e) {}

  /* ---- Data-driven notifications ----------------------------------------
     Real workflow events pushed by user actions (EPM.pushEvent) + events
     derived from the live portfolio state (stalled / completed / suspended
     projects). Replaces the static seed feed. */
  EPM.pushEvent = function (evt) {
    if (!window.EPMStore) return;
    var list = window.EPMStore.get('notif.events', []) || [];
    list.push(Object.assign({ at: EPM.DATA_DATE }, evt));
    if (list.length > 40) list = list.slice(-40);
    window.EPMStore.set('notif.events', list);
  };
  EPM.deriveNotifications = function (lang) {
    var out = [];
    // 1) real actions the user performed (most recent first)
    var events = (window.EPMStore ? (window.EPMStore.get('notif.events', []) || []) : []).slice().reverse();
    events.forEach(function (e) {
      out.push({ icon: e.icon || 'bolt', tone: e.tone || 'azure', whoAr: e.whoAr || 'أنت', whoEn: e.whoEn || 'You',
        txtAr: e.txtAr, txtEn: e.txtEn, tgt: e.tgt, tAr: 'الآن', tEn: 'just now', unread: true, group: 'today' });
    });
    // 2) derived from the live portfolio state
    var all = []; (EPM.WORKSPACES || []).forEach(function (w) { all = all.concat(EPM.buildProjects(w.id, w.projects, lang)); });
    all.filter(function (p) { return p.status === 'stalled'; }).slice(0, 3).forEach(function (p) {
      out.push({ icon: 'warning', tone: 'crimson', whoAr: 'النظام', whoEn: 'System', txtAr: 'تنبيه تعثّر في', txtEn: 'flagged a stall on', tgt: p.id, tAr: 'اليوم', tEn: 'today', unread: true, group: 'today' });
    });
    all.filter(function (p) { return p.status === 'suspended'; }).slice(0, 2).forEach(function (p) {
      out.push({ icon: 'pause_circle', tone: 'crimson', whoAr: 'النظام', whoEn: 'System', txtAr: 'مشروع متوقف:', txtEn: 'project suspended:', tgt: p.id, tAr: 'اليوم', tEn: 'today', unread: true, group: 'today' });
    });
    all.filter(function (p) { return p.status === 'completed'; }).slice(0, 3).forEach(function (p) {
      out.push({ icon: 'check_circle', tone: 'success', whoAr: 'النظام', whoEn: 'System', txtAr: 'اكتمل مشروع', txtEn: 'marked complete:', tgt: p.id, tAr: 'أقدم', tEn: 'earlier', unread: false, group: 'earlier' });
    });
    return out.length ? out : (window.EPM.NOTIFICATIONS || []);
  };

  /* ---- Data-driven alerts engine ----------------------------------------
     Every alert is PRODUCED by a rule evaluated against the project's live
     module data — schedule delay, spend vs allocation, milestones, documents,
     meeting actions, risks, change orders. Rules carry their firing state and
     match count so the Rules tab shows what each rule is currently catching,
     and disabling a rule suppresses the alerts it generated. A healthy project
     legitimately shows zero alerts. Replaces the former static seed. */
  EPM.buildAlertsData = function (p, lang) {
    var AR = lang === 'ar';
    var out = [];
    var sd = null, d = null;
    try { sd = EPM.buildScheduleData(p, lang); } catch (e) {}
    try {
      var base = EPM.buildProjectDetail(p, lang);
      d = (EPM.deriveDetail && window.epmOverlayD && p) ? EPM.deriveDetail(window.epmOverlayD(base, p.id), p, lang) : base;
    } catch (e) {}
    var now = (sd && sd.dataDate) || EPM.DATA_DATE || '2026-07-22';
    var st = p ? p.status : 'ongoing';
    var running = ['completed', 'suspended', 'withdrawn'].indexOf(st) < 0;
    var daysBetween = function (a, b) { var x = new Date(a), y = new Date(b); return (isNaN(x) || isNaN(y)) ? 0 : Math.round((y - x) / 86400000); };
    var addDays = function (dd, n) { var t = new Date(dd); if (isNaN(t)) t = new Date(now); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };

    // escalation role chains (by source module), trimmed by severity depth
    var PM = AR ? 'مدير المشروع' : 'Project manager', ENG = AR ? 'مدير القسم الهندسي' : 'Engineering head',
        DEP = AR ? 'الوكيل الفني' : 'Technical deputy', ACC = AR ? 'المحاسب' : 'Accountant',
        DOC = AR ? 'مسؤول الوثائق' : 'Document controller', CON = AR ? 'المقاول' : 'Contractor',
        RES = AR ? 'المهندس المقيم' : 'Resident engineer';
    var chains = { schedule: [PM, ENG, DEP], financial: [ACC, PM, DEP], documents: [DOC, PM],
      progress: [PM, ENG], meetings: [CON, RES, PM], risk: [PM, ENG, DEP], changeorders: [PM, ENG, DEP] };
    var depth = { red: 3, amber: 2, green: 1 };
    /* how long the rule gives you, in days, before it is overdue */
    var DUE_IN = { red: 2, amber: 5, green: 14 };
    /* the required action, as a verb — what the reader is expected to DO */
    var ACTIONS = {
      R1: [ 'أقرّ خطة تسريع للمسار الحرج', 'Approve an acceleration plan for the critical path' ],
      R2: [ 'راجع خطة الصرف لما تبقّى من السنة', 'Review the disbursement plan for the rest of the year' ],
      R3: [ 'أكّد جاهزية المعلم مع المقاول', 'Confirm milestone readiness with the contractor' ],
      R4: [ 'سجّل تحديث الإنجاز لهذا الشهر', 'Log this month’s progress update' ],
      R5: [ 'ارفع الوثيقة الإلزامية الناقصة', 'Upload the missing mandatory document' ],
      R6: [ 'أغلق إجراء الاجتماع المتأخر', 'Close the overdue meeting action' ],
      R7: [ 'راجع تقييم الخطر وحدّث خطة المعالجة', 'Review the risk and update its mitigation' ],
      R8: [ 'ابتّ في الأمر التغييري', 'Decide on the change order' ],
      R9: [ 'راجع الالتزام المالي مقابل التخصيص', 'Reconcile the commitment against the allocation' ],
      R10: [ 'قدّم مطالبة التمديد قبل انتهاء المهلة', 'File the extension claim before the window closes' ],
      R11: [ 'استحصل قرار لجنة دراسة التمديد', 'Obtain the extension committee’s decision' ],
      R12: [ 'عالج تجاوز المهلة التعاقدية فوراً', 'Deal with the breached contractual ceiling now' ],
    };
    /* the rules whose item IS an approval — L22 exposes the decision panel
       for these so the user can act without leaving the queue */
    var APPROVALS = { R8: 1, R11: 1, R12: 1 };
    var base2 = 70 + (p && p.id ? (p.id.charCodeAt(7) % 20) : 0), seq = 0;
    var mk = function (o) {
      seq++;
      var roles = (chains[o.tab] || [PM]).slice(0, depth[o.sev] || 2);
      var when = o.when || now;
      var actTx = ACTIONS[o.ruleId];
      out.push({
        id: 'AL-' + (base2 + seq), sev: o.sev, type: o.type, title: o.title, src: o.src, tab: o.tab,
        when: when, status: o.status || 'open', ruleId: o.ruleId,
        /* a deadline the queue can order against, and the verb it expects */
        due: o.due || addDays(when, o.dueIn != null ? o.dueIn : (DUE_IN[o.sev] || 5)),
        action: o.action || (actTx ? (AR ? actTx[0] : actTx[1]) : (AR ? 'راجع السجل المصدر' : 'Review the source record')),
        approval: !!APPROVALS[o.ruleId],
        /* one item in the queue reaches the reader by delegation rather than
           by their own role — the inbox groups those separately */
        delegated: !!o.delegated,
        sla: o.sla || (o.sev === 'red' ? (AR ? 'خلال يومين' : 'in 2 days') : o.sev === 'amber' ? (AR ? 'خلال 5 أيام' : 'in 5 days') : (AR ? 'غير عاجل' : 'not urgent')),
        esc: roles.map(function (role, i) { return { role: role, at: addDays(when, i * 2), done: i === 0 }; }),
      });
    };

    // R1 — critical-path activity delay (schedule) — construction & supply delivery
    if (sd && running) {
      var dly = sd.delayDays || 0;
      if (dly >= 5) {
        var crit = (sd.comparison && sd.comparison.nowCritical) || [];
        var an = crit.length ? crit[0].name : (AR ? 'المسار الحرج' : 'critical path');
        mk({ ruleId: 'R1', sev: dly > 20 ? 'red' : 'amber', tab: 'schedule', type: AR ? 'مسار حرج' : 'Critical path', src: AR ? 'الجدول الزمني' : 'Schedule',
          title: AR ? ('نشاط حرج «' + an + '» متأخر ' + dly + ' يوماً') : ('Critical activity “' + an + '” delayed ' + dly + ' days'), when: now });
      }
    }
    // R2 — spend exceeds allocation (financial)
    if (d && d.financial && d.financial.raw && running) {
      var raw = d.financial.raw, alloc = raw.annualAllocation || raw.revisedCost || raw.cost || 0,
          spend = (raw.annualSpend != null ? raw.annualSpend : raw.disbursed) || 0, ratio = alloc ? spend / alloc : 0;
      if (ratio >= 0.9) {
        var pct = Math.round(ratio * 100);
        mk({ ruleId: 'R2', sev: ratio >= 1 ? 'red' : 'amber', tab: 'financial', type: AR ? 'مالي' : 'Financial', src: AR ? 'المالية' : 'Financials',
          title: AR ? ('الصرف بلغ ' + pct + '% من التخصيص السنوي') : ('Spend reached ' + pct + '% of annual allocation'), when: now });
      }
    }
    // R3 — milestone approaching (schedule) — construction & supply delivery
    if (sd && sd.milestones && running) {
      sd.milestones.forEach(function (m) {
        if (m.status === 'done') return;
        var ddn = daysBetween(now, m.date);
        if (ddn >= 0 && ddn <= 45) {
          mk({ ruleId: 'R3', sev: 'amber', tab: 'schedule', type: AR ? 'معلم' : 'Milestone', src: AR ? 'الجدول الزمني' : 'Schedule',
            title: AR ? ('معلم «' + m.name + '» يقترب خلال ' + ddn + ' يوماً') : ('Milestone “' + m.name + '” approaching in ' + ddn + ' days'), when: now, status: 'ack', sla: '—' });
        }
      });
    }
    // R4 — monthly progress report missing (progress)
    if (d && d.progress && d.progress.history && d.progress.history.length && running) {
      var lastD = d.progress.history[d.progress.history.length - 1].date, age = daysBetween(lastD, now);
      if (age > 40) {
        mk({ ruleId: 'R4', sev: 'amber', tab: 'progress', type: AR ? 'متابعة' : 'Monitoring', src: AR ? 'الإنجاز' : 'Progress',
          title: AR ? ('لم يُسجَّل تحديث إنجاز منذ ' + age + ' يوماً') : ('No progress update logged for ' + age + ' days'), when: lastD, sla: AR ? 'متأخر' : 'overdue' });
      }
    }
    // R5 — mandatory document awaiting approval (documents)
    if (d && d.drawings && running) {
      d.drawings.filter(function (dw) { return dw.status !== 'approved'; }).slice(0, 2).forEach(function (dw) {
        var rv = (dw.revisions && dw.revisions[0]) || {};
        mk({ ruleId: 'R5', sev: 'green', tab: 'documents', type: AR ? 'وثائق' : 'Documents', src: AR ? 'الوثائق والمخططات' : 'Documents & Drawings',
          title: AR ? ('وثيقة بانتظار الاعتماد: ' + dw.type) : ('Document awaiting approval: ' + dw.type), when: rv.date || now, status: 'ack' });
      });
    }
    // R6 — overdue meeting action (meetings)
    if (d && d.meetings && running) {
      d.meetings.filter(function (m) { return /تسريع|تكليف|accelerate|task/i.test(m.decisions || ''); }).slice(0, 1).forEach(function (m) {
        var age = daysBetween(m.date, now);
        if (age > 21) {
          mk({ ruleId: 'R6', sev: 'amber', tab: 'meetings', type: AR ? 'إجراء' : 'Action', src: AR ? 'الاجتماعات والإجراءات' : 'Meetings & Actions',
            title: AR ? ('إجراء اجتماع متأخر: ' + m.decisions) : ('Overdue meeting action: ' + m.decisions), when: m.date, sla: AR ? ('متأخر ' + age + ' يوماً') : ('overdue ' + age + 'd') });
        }
      });
    }
    // R7 — high open risk (risk register); relevant while active or suspended, not once terminal
    if (d && d.risks && st !== 'completed' && st !== 'withdrawn') {
      d.risks.filter(function (rk) { return rk.sev === 'high' && /مفتوح|Open|معالجة|Mitigat/i.test(rk.status || ''); }).slice(0, 2).forEach(function (rk) {
        mk({ ruleId: 'R7', sev: 'red', tab: 'risk', type: AR ? 'مخاطر' : 'Risk', src: AR ? 'سجل المخاطر' : 'Risk register',
          title: AR ? ('خطر مرتفع مفتوح: ' + rk.desc) : ('High open risk: ' + rk.desc), when: rk.date || now });
      });
    }
    // R8 — change order awaiting decision (change orders)
    if (d && d.variationOrders && running) {
      d.variationOrders.filter(function (v) { return v.status === 'pending'; }).slice(0, 2).forEach(function (v) {
        mk({ ruleId: 'R8', sev: 'amber', tab: 'changeorders', type: AR ? 'أمر تغييري' : 'Change order', src: AR ? 'الأوامر التغييرية' : 'Change orders',
          title: AR ? ('أمر تغييري بانتظار القرار: ' + (v.no || '')) : ('Change order awaiting decision: ' + (v.no || '')), when: v.date || now });
      });
    }
    // R9 — cumulative spend approaching / over total (revised) cost (§2.7.1)
    if (d && d.financial && d.financial.raw && running) {
      var raw9 = d.financial.raw, tot9 = raw9.revisedCost || raw9.cost || 0, cum9 = raw9.disbursed || 0, ratio9 = tot9 ? cum9 / tot9 : 0;
      if (ratio9 >= 0.9) {
        mk({ ruleId: 'R9', sev: ratio9 >= 1 ? 'red' : 'amber', tab: 'financial', type: AR ? 'مالي' : 'Financial', src: AR ? 'المالية' : 'Financials',
          title: AR ? ('الصرف التراكمي بلغ ' + Math.round(ratio9 * 100) + '% من الكلفة الكلية') : ('Cumulative spend reached ' + Math.round(ratio9 * 100) + '% of total cost'), when: now });
      }
    }
    // R10 / R11 — EOT claim countdown + extension-committee decision deadline (§2.7.2)
    if (d && d.variationOrders && running) {
      d.variationOrders.filter(function (v) { return v.status === 'pending' && (v.reqExt || 0) > 0; }).slice(0, 2).forEach(function (v) {
        var claimClose = addDays(v.inDate || now, 28), cttee = addDays(v.inDate || now, 60);
        var toClaim = daysBetween(now, claimClose), toCttee = daysBetween(now, cttee);
        if (toClaim >= 0) {
          mk({ ruleId: 'R10', sev: toClaim <= 7 ? 'red' : 'amber', tab: 'changeorders', type: AR ? 'مطالبة تمديد' : 'EOT claim', src: AR ? 'الأوامر التغييرية' : 'Change orders',
            title: AR ? ('مهلة تقديم مطالبة التمديد (' + v.no + '): ' + toClaim + ' يوماً') : ('EOT claim window (' + v.no + '): ' + toClaim + ' days left'), when: now, sla: AR ? ('تنتهي ' + claimClose) : ('due ' + claimClose) });
        } else if (toCttee >= 0) {
          mk({ ruleId: 'R11', delegated: true, sev: toCttee <= 10 ? 'red' : 'amber', tab: 'changeorders', type: AR ? 'قرار اللجنة' : 'Committee decision', src: AR ? 'لجنة دراسة التمديد' : 'Extension committee',
            title: AR ? ('على لجنة التمديد حسم الطلب (' + v.no + ') خلال ' + toCttee + ' يوماً') : ('Extension committee must decide (' + v.no + ') within ' + toCttee + ' days'), when: now, sla: AR ? ('الموعد ' + cttee) : ('by ' + cttee) });
        }
      });
    }
    // R12 — transaction exceeded its audit SLA → escalated to the higher level (§2.3.2)
    if (d && d.variationOrders && running) {
      d.variationOrders.filter(function (v) { return v.slaExceeded; }).slice(0, 2).forEach(function (v) {
        mk({ ruleId: 'R12', sev: 'red', tab: 'changeorders', type: AR ? 'تجاوز مهلة' : 'SLA breach', src: AR ? 'الأوامر التغييرية' : 'Change orders',
          title: AR ? ('تجاوزت المعاملة (' + v.no + ') مهلة التدقيق — صُعّدت للمستوى الأعلى') : ('Transaction (' + v.no + ') exceeded its audit SLA — escalated'), when: now });
      });
    }

    out.sort(function (a, b) { return (b.when || '').localeCompare(a.when || ''); });

    // Rule catalogue — each rule is a live evaluator; matches/firing/lastTriggered
    // are computed from the alerts it produced this evaluation.
    var ch = function (i, e, s) { return { inapp: true, email: !!e, sms: !!s }; };
    var rules = [
      { id: 'R1', tab: 'schedule', name: AR ? 'تأخر نشاط على المسار الحرج' : 'Critical-path activity delay', trigger: AR ? 'انزياح ≥ 5 أيام' : 'Slip ≥ 5 days', sev: 'red', channels: ch(0, 1, 1), recurring: AR ? 'يومي' : 'Daily', escalateAfter: AR ? '48 ساعة' : '48h', enabled: true },
      { id: 'R2', tab: 'financial', name: AR ? 'تجاوز الصرف للتخصيص' : 'Spend exceeds allocation', trigger: AR ? 'الصرف ≥ 90%' : 'Spend ≥ 90%', sev: 'amber', channels: ch(0, 1, 0), recurring: AR ? 'أسبوعي' : 'Weekly', escalateAfter: AR ? '5 أيام' : '5 days', enabled: true },
      { id: 'R3', tab: 'schedule', name: AR ? 'اقتراب معلم' : 'Milestone approaching', trigger: AR ? 'خلال 45 يوماً' : 'Within 45 days', sev: 'amber', channels: ch(0, 0, 0), recurring: AR ? 'مرة واحدة' : 'Once', escalateAfter: '—', enabled: true },
      { id: 'R4', tab: 'progress', name: AR ? 'تقرير إنجاز شهري مفقود' : 'Monthly progress report missing', trigger: AR ? 'لا تحديث منذ 40 يوماً' : 'No update in 40 days', sev: 'amber', channels: ch(0, 1, 0), recurring: AR ? 'يومي' : 'Daily', escalateAfter: AR ? '3 أيام' : '3 days', enabled: true },
      { id: 'R5', tab: 'documents', name: AR ? 'وثيقة إلزامية بانتظار الاعتماد' : 'Mandatory document pending', trigger: AR ? 'حالة الوثيقة ≠ معتمدة' : 'Doc status ≠ approved', sev: 'green', channels: ch(0, 0, 0), recurring: AR ? 'عند تغيّر المرحلة' : 'On stage change', escalateAfter: '—', enabled: true },
      { id: 'R6', tab: 'meetings', name: AR ? 'إجراء اجتماع متأخر' : 'Overdue meeting action', trigger: AR ? 'إجراء مفتوح > 21 يوماً' : 'Open action > 21 days', sev: 'amber', channels: ch(0, 1, 0), recurring: AR ? 'أسبوعي' : 'Weekly', escalateAfter: AR ? '5 أيام' : '5 days', enabled: true },
      { id: 'R7', tab: 'risk', name: AR ? 'خطر مرتفع مفتوح' : 'High open risk', trigger: AR ? 'شدّة عالية + مفتوح' : 'High severity + open', sev: 'red', channels: ch(0, 1, 1), recurring: AR ? 'يومي' : 'Daily', escalateAfter: AR ? '48 ساعة' : '48h', enabled: true },
      { id: 'R8', tab: 'changeorders', name: AR ? 'أمر تغييري بانتظار القرار' : 'Change order awaiting decision', trigger: AR ? 'الحالة = قيد الاعتماد' : 'Status = pending', sev: 'amber', channels: ch(0, 1, 0), recurring: AR ? 'أسبوعي' : 'Weekly', escalateAfter: AR ? '5 أيام' : '5 days', enabled: true },
      { id: 'R9', tab: 'financial', name: AR ? 'تجاوز الصرف التراكمي للكلفة' : 'Cumulative spend exceeds cost', trigger: AR ? 'الصرف التراكمي ≥ 90%' : 'Cumulative ≥ 90%', sev: 'red', channels: ch(0, 1, 1), recurring: AR ? 'أسبوعي' : 'Weekly', escalateAfter: AR ? '5 أيام' : '5 days', enabled: true },
      { id: 'R10', tab: 'changeorders', name: AR ? 'مهلة تقديم مطالبة التمديد' : 'EOT claim submission window', trigger: AR ? 'خلال 28 يوماً من الإشعار' : 'Within 28 days of notice', sev: 'amber', channels: ch(0, 1, 1), recurring: AR ? 'يومي' : 'Daily', escalateAfter: AR ? '7 أيام' : '7 days', enabled: true },
      { id: 'R11', tab: 'changeorders', name: AR ? 'موعد حسم لجنة التمديد' : 'Extension-committee deadline', trigger: AR ? 'قبل المهلة القانونية' : 'Before legal deadline', sev: 'amber', channels: ch(0, 1, 0), recurring: AR ? 'أسبوعي' : 'Weekly', escalateAfter: AR ? '10 أيام' : '10 days', enabled: true },
      { id: 'R12', tab: 'changeorders', name: AR ? 'تجاوز مهلة تدقيق المعاملة' : 'Transaction audit-SLA breach', trigger: AR ? 'تجاوز سقف مرحلة التدقيق' : 'Audit-stage cap exceeded', sev: 'red', channels: ch(0, 1, 1), recurring: AR ? 'يومي' : 'Daily', escalateAfter: AR ? '48 ساعة' : '48h', enabled: true },
    ];
    rules.forEach(function (r) {
      var ms = out.filter(function (a) { return a.ruleId === r.id; });
      r.matches = ms.length;
      r.firing = ms.length > 0;
      r.lastTriggered = ms.length ? ms.map(function (a) { return a.when; }).sort().slice(-1)[0] : null;
    });

    return { alerts: out, rules: rules };
  };

  /* ================= G5 — validation & mandatory-field gates (§2.9, §2.10) ====
     Pure validators returning { ok, errors:[{field, ar, en}] }. Edit surfaces call
     EPM.validate(entity, draft, ctx) before persisting and surface the messages. */
  EPM.ACCEPTED_DOC_FORMATS = ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg'];
  EPM.validate = function (entity, draft, ctx) {
    draft = draft || {}; ctx = ctx || {};
    var e = [];
    var err = function (field, ar, en) { e.push({ field: field, ar: ar, en: en }); };
    var num = function (v) { if (typeof v === 'number') return v; var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
    var nonEmpty = function (v) { return v != null && String(v).trim() !== '' && String(v).trim() !== '—'; };
    if (entity === 'project') {
      if (!nonEmpty(draft.name)) err('name', 'اسم المشروع مطلوب', 'Project name is required');
      if (!nonEmpty(draft.formation)) err('formation', 'التشكيل مطلوب', 'Formation is required');
      if (!nonEmpty(draft.funding)) err('funding', 'نوع التمويل مطلوب', 'Funding type is required');
      var yr = num(draft.awardYear);
      if (!yr) err('awardYear', 'سنة الإدراج مطلوبة', 'Award year is required');
      else if (yr < 2015 || yr > 2030) err('awardYear', 'سنة الإدراج خارج النطاق المعتمد (2015–2030)', 'Award year outside the approved range (2015–2030)');
      var pc = num(draft.plannedCost);
      if (!nonEmpty(draft.plannedCost)) err('plannedCost', 'الكلفة المقررة مطلوبة', 'Planned cost is required');
      else if (pc <= 0) err('plannedCost', 'يجب أن تكون الكلفة المقررة أكبر من صفر', 'Planned cost must be greater than zero');
    } else if (entity === 'contract') {
      if (!nonEmpty(draft.no)) err('no', 'رقم العقد مطلوب', 'Contract no. is required');
      else if (ctx.existingNos && ctx.existingNos.indexOf(draft.no) >= 0) err('no', 'رقم العقد مكرر ضمن التشكيل', 'Duplicate contract no. within the formation');
      if (!nonEmpty(draft.project)) err('project', 'يجب ربط العقد بمشروع', 'Contract must be linked to a project');
      if (num(draft.cost) <= 0) err('cost', 'كلفة العقد يجب ألا تكون صفراً أو سالبة', 'Contract cost must not be zero or negative');
      if (draft.start && draft.award && draft.start < draft.award) err('start', 'تاريخ المباشرة أسبق من تاريخ الإحالة', 'Start date precedes the award date');
      if (draft.start && draft.finish && draft.finish <= draft.start) err('finish', 'تاريخ الإنجاز يجب أن يكون لاحقاً للمباشرة', 'Finish date must be after the start date');
      if (draft.status === 'completed' && !nonEmpty(draft.actualFinish)) err('actualFinish', 'لا يمكن اعتماد «منجز» بدون تاريخ إنجاز فعلي', 'Cannot mark "completed" without an actual finish date');
    } else if (entity === 'financial') {
      if (num(draft.annualSpend) > num(draft.annualAllocation)) err('annualSpend', 'المصروف السنوي يتجاوز التخصيص السنوي', 'Annual spend exceeds the annual allocation');
      if (num(draft.cumulative) > num(draft.revisedCost)) err('cumulative', 'المصروف التراكمي يتجاوز الكلفة المعدلة', 'Cumulative spend exceeds the revised cost');
      if (num(draft.annualAllocation) < 0 || num(draft.annualSpend) < 0) err('negative', 'لا يسمح بقيم سالبة للتخصيص أو المصروف', 'Negative allocation/spend is not allowed');
    } else if (entity === 'progress') {
      var ph = num(draft.physical), fi = num(draft.financial);
      if (ph < 0 || ph > 100) err('physical', 'نسبة الإنجاز المادي يجب أن تكون بين 0 و100', 'Physical % must be between 0 and 100');
      if (fi < 0 || fi > 100) err('financial', 'نسبة الإنجاز المالي يجب أن تكون بين 0 و100', 'Financial % must be between 0 and 100');
      if (ctx.previous != null && ph < num(ctx.previous) && !ctx.override) err('physical', 'لا يسمح بتسجيل نسبة أقل من المسجّلة سابقاً إلا بموافقة مخوّل', 'Cannot record a value below the previously-recorded one without authorized approval');
      if (ph >= 100 && !nonEmpty(draft.actualFinish)) err('actualFinish', 'عند بلوغ الإنجاز 100% يلزم إدخال تاريخ الإنجاز الفعلي', 'At 100% an actual finish date is required');
    } else if (entity === 'document') {
      if (!nonEmpty(draft.name)) err('name', 'اسم الوثيقة مطلوب', 'Document name is required');
      var ext = String(draft.file || '').split('.').pop().toLowerCase();
      if (draft.file && EPM.ACCEPTED_DOC_FORMATS.indexOf(ext) < 0) err('file', 'صيغة غير مقبولة — المسموح PDF / DOCX / XLSX / JPG', 'Unsupported format — allowed: PDF / DOCX / XLSX / JPG');
      if (ctx.existing && ctx.existing.some(function (x) { return x.name === draft.name && (x.rev || '') === (draft.rev || ''); })) err('dup', 'ملف مكرر بنفس الاسم والإصدار', 'Duplicate file with the same name and version');
    }
    return { ok: e.length === 0, errors: e };
  };

  /* ================= G3 — admin-order suspension freezes the duration counter ==
     A contract "موقوف مؤقتاً بأمر إداري" stops the contractual-duration clock; delay
     days are measured to the freeze date, not to the live data date (§2.1.2). */
  EPM.isDurationFrozen = function (p) {
    return !!(p && (p.status === 'suspended' || p.contractStatus === 'admin_suspended'));
  };
  EPM.effectiveAsOf = function (p) {
    // suspended projects freeze at their stop date; others use the live data date
    if (EPM.isDurationFrozen(p) && p && p.stopDate) return p.stopDate;
    return EPM.DATA_DATE;
  };

  /* ================= G7 — Transaction Lead Time KPI (§2.8.2) ==================
     From a transaction's stage log: total elapsed and where it currently sits
     (which section, how long). Works off VO stage timelines / payment stages. */
  EPM.transactionLeadTime = function (stages, now) {
    now = now || EPM.DATA_DATE;
    if (!stages || !stages.length) return null;
    var days = function (a, b) { var x = new Date(a), y = new Date(b); return (isNaN(x) || isNaN(y)) ? 0 : Math.round((y - x) / 86400000); };
    var g = function (s, k1, k2) { return s[k1] || s[k2] || null; };
    var start = g(stages[0], 'start', 'at') || stages[0].date || now;
    var active = null, lastDone = null;
    stages.forEach(function (s) {
      if (!active && (s.status === 'active' || s.status === 'overdue')) active = s;
      if (s.status === 'done' || s.status === 'rejected') lastDone = s.doneDate || s.date || lastDone;
    });
    var endRef = active ? now : (lastDone || now);
    var stageStart = active ? (g(active, 'start', 'at') || active.date || start) : start;
    return {
      totalDays: Math.max(0, days(start, endRef)),
      stalledAt: active ? (active.label || active.owner || active.stage || '—') : null,
      stalledDays: active ? Math.max(0, days(stageStart, now)) : 0,
      overdue: !!(active && active.status === 'overdue'),
      done: !active,
    };
  };

  /* ================= G10 — executive traffic-light (§5.a) =====================
     red = > 20% behind plan; amber = at risk (behind but ≤20%, or SPI<0.9);
     green = on plan. delayPct = delay days / planned duration. */
  EPM.execSignal = function (p, d) {
    if (!p) return 'green';
    if (p.status === 'completed') return 'green';
    var sd = null; try { sd = EPM.buildScheduleData(p, 'en'); } catch (e) {}
    var planned = sd ? Math.max(1, Math.round((new Date(sd.baselineFinish) - new Date(sd.origin)) / 86400000)) : 365;
    var delay = sd ? (sd.delayDays || 0) : 0;
    var delayPct = delay / planned * 100;
    var spi = (d && d.evm && d.evm.spi != null) ? d.evm.spi : 1;
    if (p.status === 'stalled' || delayPct > 20) return 'red';
    if (delayPct > 5 || spi < 0.9) return 'amber';
    return 'green';
  };

  /* ================= Equipment-supply (تجهيز) domain (§1, §6–§10) =============
     A supply project is many independent line items (فقرات تجهيزية), each an
     independently-tracked device: contracted / supplied / received counts,
     multi-beneficiary distribution, warehouse + preliminary receipts, per-item
     archive. Completion derives from Σreceived ÷ Σcontracted. Deterministic. */
  var SUPPLY_DEVICES = [
    { ar: 'حاسبة مكتبية', en: 'Desktop computer', mfr: 'Dell', country: { ar: 'الولايات المتحدة', en: 'USA' }, model: 'OptiPlex 7010' },
    { ar: 'خادم شبكة', en: 'Network server', mfr: 'HPE', country: { ar: 'الولايات المتحدة', en: 'USA' }, model: 'ProLiant DL380' },
    { ar: 'مجهر إلكتروني', en: 'Microscope', mfr: 'Zeiss', country: { ar: 'ألمانيا', en: 'Germany' }, model: 'Primo Star' },
    { ar: 'جهاز طرد مركزي', en: 'Centrifuge', mfr: 'Eppendorf', country: { ar: 'ألمانيا', en: 'Germany' }, model: '5430R' },
    { ar: 'طابعة ليزرية', en: 'Laser printer', mfr: 'HP', country: { ar: 'الصين', en: 'China' }, model: 'LaserJet M428' },
    { ar: 'بروجكتر تفاعلي', en: 'Interactive projector', mfr: 'Epson', country: { ar: 'اليابان', en: 'Japan' }, model: 'EB-685W' },
    { ar: 'مولّدة كهرباء', en: 'Power generator', mfr: 'Perkins', country: { ar: 'المملكة المتحدة', en: 'UK' }, model: '1104A-44' },
    { ar: 'وحدة تكييف', en: 'HVAC unit', mfr: 'LG', country: { ar: 'كوريا الجنوبية', en: 'S. Korea' }, model: 'Multi V5' },
    { ar: 'خزانة سلامة مختبرية', en: 'Lab safety cabinet', mfr: 'Esco', country: { ar: 'سنغافورة', en: 'Singapore' }, model: 'Airstream' },
    { ar: 'جهاز قياس طيفي', en: 'Spectrophotometer', mfr: 'Shimadzu', country: { ar: 'اليابان', en: 'Japan' }, model: 'UV-1900' },
  ];
  var SUPPLY_STATUS = {
    received: { ar: 'مستلَم بالكامل', en: 'Fully received', cls: 'completed' },
    partial: { ar: 'استلام جزئي', en: 'Partially received', cls: 'ongoing' },
    supplied: { ar: 'مجهَّز — بانتظار الاستلام', en: 'Supplied — awaiting receipt', cls: 'suspended' },
    pending: { ar: 'لم يُجهَّز', en: 'Not yet supplied', cls: 'stalled' },
  };
  EPM.SUPPLY_STATUS = SUPPLY_STATUS;
  EPM.buildSupplyData = function (p, lang) {
    var AR = lang === 'ar';
    var seed = p ? (p.id.charCodeAt(6) * 31 + p.id.charCodeAt(7) * 7 + 11) : 3, s = seed;
    var rnd = function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    var addM = function (iso, m) { var d = new Date(iso); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); };
    var addD = function (iso, n) { var d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    var unis = (EPM.FORMATIONS || []).slice(0, 12);
    var nItems = 5 + Math.floor(rnd() * 4);           // 5–8 line items
    var proj = p ? (0.35 + (p.id.charCodeAt(7) % 6) * 0.13) : 0.6;   // per-project supply maturity
    var items = [];
    for (var i = 0; i < nItems; i++) {
      var dev = SUPPLY_DEVICES[(i + Math.floor(rnd() * SUPPLY_DEVICES.length)) % SUPPLY_DEVICES.length];
      var contracted = 20 + Math.floor(rnd() * 180);
      var price = 250000 + Math.floor(rnd() * 4750000);   // BOQ unit rate per device (IQD)
      var supplied = Math.min(contracted, Math.round(contracted * Math.min(1, proj + rnd() * 0.35)));
      var received = Math.round(supplied * (0.55 + rnd() * 0.45));
      var remaining = contracted - received;
      var status = received >= contracted ? 'received' : received > 0 ? 'partial' : supplied > 0 ? 'supplied' : 'pending';
      // distribute the contracted quantity across 2–3 beneficiaries
      var nb = 2 + Math.floor(rnd() * 2), bens = [], left = contracted, rleft = received;
      for (var b = 0; b < nb; b++) {
        var last = b === nb - 1;
        var q = last ? left : Math.max(1, Math.round(contracted / nb * (0.7 + rnd() * 0.6)));
        q = Math.min(q, left); left -= q;
        var rq = last ? Math.min(rleft, q) : Math.min(rleft, Math.round(q * (received / contracted)));
        rleft -= rq;
        var uni = unis[(i * 3 + b) % unis.length] || { ar: 'جهة مستفيدة', en: 'Beneficiary' };
        bens.push({ name: AR ? uni.ar : uni.en, qty: q, received: rq });
        if (left <= 0) break;
      }
      var wMonths = [12, 24, 36][Math.floor(rnd() * 3)];
      var baseDate = addD('2026-01-05', Math.floor(rnd() * 150));
      var warehouse = [], pre = [];
      if (received > 0) {
        var wq1 = Math.round(received * (status === 'received' ? 0.6 : 1));
        warehouse.push({ no: 'WR-' + (p ? p.id.slice(4) : '000') + '-' + (i + 1) + 'A', date: baseDate, qty: wq1, store: AR ? 'مخزن الوزارة المركزي' : 'Ministry central store', committee: AR ? 'لجنة الاستلام المخزني' : 'Warehouse receipt committee', notes: AR ? 'مطابق للمواصفات' : 'Conforms to specs' });
        if (status === 'received' && received - wq1 > 0) warehouse.push({ no: 'WR-' + (p ? p.id.slice(4) : '000') + '-' + (i + 1) + 'B', date: addD(baseDate, 30), qty: received - wq1, store: AR ? 'مخزن الوزارة المركزي' : 'Ministry central store', committee: AR ? 'لجنة الاستلام المخزني' : 'Warehouse receipt committee', notes: AR ? 'الدفعة الثانية' : 'Second batch' });
        pre.push({ no: 'PR-' + (p ? p.id.slice(4) : '000') + '-' + (i + 1), date: addD(baseDate, 14), entity: bens[0].name, qty: Math.round(received * 0.8), conformity: AR ? 'مطابق' : 'Conforming', notes: AR ? 'استلام أولي من قبل الجهة المستفيدة' : 'Preliminary receipt by beneficiary' });
      }
      var docNames = AR
        ? ['استمارة الطلب', 'استمارة المصادقة', 'شهادة الاستلام الأولي', 'شهادة الاستلام المخزني', 'كتاب التوزيع على الجامعات', 'الكتالوغ والمواصفات الفنية']
        : ['Request form', 'Approval form', 'Preliminary receipt certificate', 'Warehouse receipt certificate', 'University distribution letter', 'Catalog & tech specs'];
      var docs = docNames.slice(0, 3 + Math.floor(rnd() * 3)).map(function (nm, k) {
        return { name: nm, file: 'ITM-' + (i + 1) + '-' + (k + 1) + (k === 5 ? '.pdf' : '.pdf'), date: addD(baseDate, k * 3), by: AR ? 'مسؤول التجهيز' : 'Supply officer', rev: 'R1' };
      });
      items.push({
        seq: i + 1, no: i + 1, code: 'ITM-' + String(i + 1).padStart(3, '0'),
        // ---- inherited BOQ base attributes (a supply item IS a BOQ line) ----
        item: AR ? dev.ar : dev.en,          // BOQ description = the device
        unit: AR ? 'جهاز' : 'unit', price: price,
        contractedQty: contracted, executedQty: received, total: contracted * price, weight: 0,
        // ---- supply-specific extension attributes ----
        device: AR ? dev.ar : dev.en, manufacturer: dev.mfr, country: AR ? dev.country.ar : dev.country.en,
        model: dev.model, serialFrom: 'SN-' + (1000 + i * 200), serialTo: 'SN-' + (1000 + i * 200 + received),
        contracted: contracted, supplied: supplied, received: received, remaining: remaining, status: status,
        beneficiaries: bens, warrantyMonths: wMonths, warrantyExpiry: addM(baseDate, wMonths),
        notes: status === 'pending' ? (AR ? 'بانتظار فتح الاعتماد المستندي' : 'Awaiting LC opening') : '',
        receipts: { warehouse: warehouse, preliminary: pre }, docs: docs,
      });
    }
    // BOQ weight = each item's share of the total supply value (Σ = 100%)
    var totVal = items.reduce(function (a, x) { return a + x.total; }, 0) || 1;
    items.forEach(function (x) { x.weight = +(x.total / totVal * 100).toFixed(2); });
    var totC = items.reduce(function (a, x) { return a + x.contracted; }, 0);
    var totS = items.reduce(function (a, x) { return a + x.supplied; }, 0);
    var totR = items.reduce(function (a, x) { return a + x.received; }, 0);
    return {
      items: items,
      summary: {
        items: items.length, totalContracted: totC, totalSupplied: totS, totalReceived: totR,
        remaining: totC - totR, pct: totC ? Math.round(totR / totC * 100) : 0,
        beneficiaries: (function () { var set = {}; items.forEach(function (x) { x.beneficiaries.forEach(function (b) { set[b.name] = 1; }); }); return Object.keys(set).length; })(),
      },
    };
  };

  /* ================= G6 — advance/payment audit-SLA timers (§2.3.2) ==========
     Per-stage electronic caps (resident engineer 7d + finance 7d); a dynamic
     green→amber→red state as the transaction ages; auto-escalation on breach;
     and the final legally-binding pay-by date from a compliant submission. */
  EPM.paymentSLA = function (submitted, lang, now) {
    var AR = lang === 'ar';
    now = now || EPM.DATA_DATE;
    var days = function (a, b) { var x = new Date(a), y = new Date(b); return (isNaN(x) || isNaN(y)) ? 0 : Math.round((y - x) / 86400000); };
    var addDays = function (dd, n) { var t = new Date(dd); if (isNaN(t)) t = new Date(now); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
    var defs = [
      { key: 're', label: AR ? 'تدقيق المهندس المقيم' : 'Resident-engineer review', owner: AR ? 'المهندس المقيم' : 'Resident engineer', sla: 7 },
      { key: 'fin', label: AR ? 'تدقيق الدائرة المالية' : 'Finance-dept review', owner: AR ? 'الدائرة المالية' : 'Finance dept.', sla: 7 },
    ];
    var elapsed = Math.max(0, days(submitted, now)), cum = 0, current = null, stages = [];
    defs.forEach(function (st) {
      var start = cum, end = cum + st.sla;
      var status = elapsed >= end ? 'done' : elapsed >= start ? 'active' : 'todo';
      stages.push({ key: st.key, label: st.label, owner: st.owner, sla: st.sla, start: start, end: end, status: status,
        daysIn: status === 'active' ? elapsed - start : status === 'done' ? st.sla : 0 });
      if (status === 'active' && !current) current = st;
      cum = end;
    });
    var totalSla = cum;
    var color = elapsed <= totalSla * 0.6 ? 'green' : elapsed <= totalSla ? 'amber' : 'red';
    var payBy = addDays(submitted, 30);
    return { elapsed: elapsed, totalSla: totalSla, color: color, current: current ? current.key : null,
      currentLabel: current ? current.label : (AR ? 'مكتمل التدقيق' : 'Audit complete'), stages: stages,
      payBy: payBy, payByDays: days(now, payBy), overdue: elapsed > totalSla, escalated: elapsed > totalSla };
  };

  /* Type-gated module list: supply projects swap BOQ→Line Items, add Receipts &
     Item Inquiry, and drop the construction-only Schedule & 3D-Model tabs. */
  // BOQ is ONE entity, not two. A supply project keeps the same `boq` module id;
  // only its label/icon and internal behaviour change (line items + receipts +
  // inquiry become facets inside the module, not separate top-level modules).
  EPM.modulesFor = function (p) {
    var base = EPM.PROJECT_MODULES || [];
    if (!p || p.type !== 'supply') return base;
    var out = [];
    base.forEach(function (m) {
      if (m.id === 'model') return;      // no 3D/BIM for equipment supply
      if (m.id === 'boq') { out.push({ id: 'boq', key: 'mod_supplyitems', icon: 'inventory_2', perm: true }); return; }
      // schedule/progress stay — supply runs the same engines
      out.push(m);
    });
    return out;
  };

  // ---- change-order terminology & workflow, by project type ----------------
  // Construction and supply run the SAME change-order engine, but the parties,
  // the reviewer, and the pricing rules differ. Everything type-dependent in the
  // VO wizard and record reads from here so no label or stage is left construction-
  // specific on a supply project.
  //  · Construction: contractor requests → resident-engineer dept (د.م.م) reviews →
  //    change-order cttee → (rate-fixing cttee for the >20% tier) → endorsement →
  //    ministerial order → RE dept executes. The 20% unit-rate rule applies.
  //  · Supply: supplier (المجهز) requests → technical inspection & receipt cttee
  //    reviews (no resident engineer on a pure-supply contract) → change-order cttee
  //    → endorsement → ministerial order → inspection cttee executes. Prices are
  //    catalogue/LC-fixed, so there is no 20% tier and no rate-fixing committee.
  EPM.voTerms = function (p, lang) {
    var AR = lang === 'ar';
    var supply = !!(p && p.type === 'supply');
    if (supply) return {
      supply: true,
      parties: AR ? ['المجهز', 'لجنة الفحص والاستلام', 'الجهة المستفيدة', 'الاستشاري']
                  : ['Supplier', 'Inspection & receipt cttee', 'Beneficiary', 'Consultant'],
      requester: AR ? 'المجهز' : 'Supplier',
      // reviewer / enteredBy / execOwner MUST be the same string — it is the
      // stage-owner identity that the persona picker matches against.
      reviewer: AR ? 'لجنة الفحص والاستلام' : 'Inspection & receipt cttee',
      reviewerShort: AR ? 'لجنة الفحص' : 'Inspection cttee',
      enteredBy: AR ? 'لجنة الفحص والاستلام' : 'Inspection & receipt cttee',
      techParty: AR ? 'لجنة الفحص والاستلام الفني' : 'Technical inspection & receipt cttee',
      techAct: AR ? 'الرأي الفني والموافقة على الفقرات' : 'Technical opinion and item approval',
      hasRateRule: false,
      execNote: AR ? 'تحديث عقد التجهيز والفقرات والتوزيع والجدول الزمني' : 'Supply contract, items, distribution and schedule updated',
      stage1Note: AR ? 'تُدخل لجنة الفحص والاستلام الأمر بعد ورود طلب المجهز والرأي الفني، ثم تدقّقه وتعيده عند وجود نقص'
                     : 'Entered by the inspection & receipt committee after the supplier’s request and technical opinion, then reviewed',
      execOwner: AR ? 'لجنة الفحص والاستلام' : 'Inspection & receipt cttee',
      typeLabel: AR ? 'تجهيز' : 'Supply',
      subtitle: AR ? 'تجهيز — كمية / مبلغ / مدة / توزيع' : 'Supply — quantity / amount / duration / redistribution',
    };
    return {
      supply: false,
      parties: AR ? ['المقاول', 'المهندس المقيم', 'الجهة المستفيدة', 'الاستشاري']
                  : ['Contractor', 'Resident engineer', 'Beneficiary', 'Consultant'],
      requester: AR ? 'المقاول' : 'Contractor',
      reviewer: AR ? 'دائرة المهندس المقيم' : 'RE department',
      reviewerShort: AR ? 'د.م.م' : 'RE dept',
      enteredBy: AR ? 'دائرة المهندس المقيم' : 'RE department',
      techParty: AR ? 'الاستشاري المصمم والمدقق' : 'Designer & checking consultant',
      techAct: AR ? 'الموافقة على جميع الفقرات' : 'Approval of all items',
      hasRateRule: true,
      execNote: AR ? 'تحديث العقد وبنود الكميات والجدول الزمني' : 'Contract, BOQ and schedule updated',
      stage1Note: AR ? 'يُدخل المهندس المقيم الأمر بعد ورود طلب المقاول ورأي الاستشاري، ثم يدقّقه ويعيده إلى المقاول عند وجود نقص'
                     : 'Entered by the resident engineer after the contractor’s request and the consultant’s opinion, then reviewed',
      execOwner: AR ? 'دائرة المهندس المقيم' : 'RE department',
      typeLabel: AR ? 'هندسي' : 'Engineering',
      subtitle: AR ? 'هندسي — كلفة / مدة' : 'Engineering — cost / time',
    };
  };
})(window);
