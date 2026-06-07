// ═══════════════════════════════════════════════════════
// HIS DEMO — LOGIN, ROLES, SHELL, PATIENT JOURNEY
// ═══════════════════════════════════════════════════════

const HOSPITAL = { name: 'Multispeciality Hospital', city: 'Ahmedabad, Gujarat', beds: 300, type: 'Tier 1 — NABH Accredited' };

const ROLES = {
  master:       { name:'Demo Master Admin',   title:'All Departments',       avatar:'MA', color:'#2563eb', initials:'MA', modules:'all' },
  receptionist: { name:'Anita Sharma',        title:'Front Desk Receptionist',avatar:'AS', color:'#0891b2', initials:'AS', modules:['registration','opd','appointments','journey'] },
  doctor:       { name:'Dr. Anil Mehta',      title:'Cardiologist',          avatar:'AM', color:'#16a34a', initials:'AM', modules:['opd-consult','ipd-rounds','emr','discharge','journey'] },
  nurse:        { name:'Kavya Nair',          title:'Staff Nurse (Ward 2)',   avatar:'KN', color:'#db2777', initials:'KN', modules:['nursing','vitals','medication','ward','journey'] },
  billing:      { name:'Ravi Kumar',          title:'Billing Manager',       avatar:'RK', color:'#ea580c', initials:'RK', modules:['billing','journey'] },
  cashier:      { name:'Priya Desai',         title:'Billing Cashier',       avatar:'PD', color:'#ca8a04', initials:'PD', modules:['opd-billing','ipd-billing','receipts','journey'] },
  pharmacist:   { name:'Suresh Patel',        title:'Pharmacist',            avatar:'SP', color:'#7c3aed', initials:'SP', modules:['pharmacy','journey'] },
  lab:          { name:'Meena Rao',           title:'Lab Technician',        avatar:'MR', color:'#dc2626', initials:'MR', modules:['lab','journey'] },
  radiology:    { name:'Rahul Joshi',         title:'Radiology Technician',  avatar:'RJ', color:'#0891b2', initials:'RJ', modules:['radiology','journey'] },
  store:        { name:'Rajesh Kumar',        title:'Store In-charge',       avatar:'RK', color:'#475569', initials:'RK', modules:['inventory','journey'] },
  cssd:         { name:'Leena Shah',          title:'CSSD Technician',       avatar:'LS', color:'#065f46', initials:'LS', modules:['cssd','journey'] },
  management:   { name:'Dr. Sunil Adani',     title:'CEO / Management',      avatar:'SA', color:'#4338ca', initials:'SA', modules:['mis','journey'] },
};

// ─── MODULE TREE (Full Navigation Map) ──────────────────
const NAV_TREE = [
  {
    id:'journey', label:'Patient Journey Map', icon:'🗺',
    items:[{id:'journey', label:'Patient Journey', page:'journey'}]
  },
  {
    id:'registration', label:'Registration & Front Desk', icon:'👤',
    roles:['master','receptionist'],
    items:[
      {id:'reg-home',      label:'All Scenarios',            page:'reg-home'},
      {id:'reg-desk',      label:'Front Desk Workstation',   page:'reg-desk'},
      {id:'patient-reg',   label:'New Patient Registration', page:'patient-reg'},
      {id:'appointments',  label:'Appointment Scheduling',   page:'appointments'},
      {id:'bed-status',    label:'Bed Availability Board',   page:'bed-status'},
    ]
  },
  {
    id:'opd', label:'OPD Management', icon:'🏥',
    roles:['master','receptionist','doctor','nurse'],
    items:[
      {id:'opd-queue',     label:'OPD Queue & Token',        page:'opd-queue'},
      {id:'opd-nurse',     label:'Nurse Pre-consultation',   page:'opd-nurse'},
      {id:'opd-consult',   label:"Doctor's Consultation",   page:'opd-consult'},
      {id:'prescription',  label:'Prescription / Orders',   page:'prescription'},
      {id:'opd-billing',   label:'OPD Billing & Payment',   page:'opd-registration'},
    ]
  },
  {
    id:'ipd', label:'IPD & Ward', icon:'🛏',
    roles:['master','doctor','nurse','billing'],
    items:[
      {id:'ipd-admission',  label:'Admission & Advance',      page:'ipd-admission'},
      {id:'bed-allotment',  label:'Ward / Bed Allotment',     page:'bed-allotment'},
      {id:'nursing',        label:'Nursing Workbench',        page:'nursing-wb'},
      {id:'ipd-rounds',     label:'Doctor Rounds (IPD)',      page:'ipd-rounds'},
      {id:'ipd-charges',    label:'Real-time Charge Posting', page:'ipd-charges'},
      {id:'ipd-provisional',label:'Provisional Bill Review',  page:'ipd-provisional'},
      {id:'ipd-discharge',  label:'Discharge Management',     page:'ipd-finalbill'},
    ]
  },
  {
    id:'billing', label:'Billing', icon:'💰',
    roles:['master','billing','cashier'],
    items:[
      {id:'billing-dash',    label:'Billing Dashboard',       page:'dashboard'},
      {id:'setup-tariff',    label:'Billing Master & Tariff', page:'setup-tariff'},
      {id:'setup-packages',  label:'Package & Bundle Config', page:'setup-packages'},
      {id:'setup-insurance', label:'Insurance & TPA Setup',   page:'setup-insurance'},
      {id:'opd-procedures',  label:'OPD Procedure Billing',   page:'opd-procedures'},
      {id:'ipd-finalbill',   label:'Final Bill at Discharge', page:'ipd-finalbill'},
      {id:'ipd-daycare',     label:'Day Care Billing',        page:'ipd-daycare'},
      {id:'ins-preauth',     label:'TPA Pre-authorisation',   page:'ins-preauth'},
      {id:'ins-cashless',    label:'Cashless Settlement',     page:'ins-cashless'},
      {id:'corp-billing',    label:'Corporate Billing',       page:'corp-billing'},
      {id:'corp-govt',       label:'CGHS / ECHS / Govt',     page:'corp-govt'},
      {id:'ref-refund',      label:'Patient Refund',          page:'ref-refund'},
      {id:'ref-cancel',      label:'Bill Cancellation',       page:'ref-cancel'},
      {id:'ref-duplicate',   label:'Duplicate Reprint',       page:'ref-duplicate'},
      {id:'mis-daily',       label:'Daily Collection Report', page:'mis-daily'},
      {id:'mis-audit',       label:'Audit Trail',             page:'mis-audit'},
      {id:'mis-revenue',     label:'Revenue MIS Dashboard',   page:'mis-revenue'},
      {id:'mis-leakage',     label:'Revenue Leakage Report',  page:'mis-leakage'},
      {id:'comp-gst',        label:'GST & E-invoicing',       page:'comp-gst'},
    ]
  },
  {
    id:'pharmacy', label:'Pharmacy', icon:'💊',
    roles:['master','pharmacist','nurse'],
    items:[
      {id:'pharm-opd',    label:'OPD Dispensing',         page:'pharmacy-opd'},
      {id:'pharm-ipd',    label:'IPD / Inpatient Dispensing', page:'pharmacy-ipd'},
      {id:'pharm-indent', label:'Indent from Store',      page:'pharmacy-indent'},
      {id:'pharm-return', label:'Returns & Expiry',       page:'pharmacy-returns'},
    ]
  },
  {
    id:'lab', label:'Laboratory (LIS)', icon:'🔬',
    roles:['master','lab','doctor','nurse'],
    items:[
      {id:'lab-orders',   label:'Test Orders Received',   page:'lab-orders'},
      {id:'lab-collect',  label:'Sample Collection',      page:'lab-collection'},
      {id:'lab-process',  label:'Test Processing',        page:'lab-processing'},
      {id:'lab-reports',  label:'Report Generation',      page:'lab-reports'},
      {id:'lab-critical', label:'Critical Value Alerts',  page:'lab-critical'},
    ]
  },
  {
    id:'radiology', label:'Radiology (RIS)', icon:'📡',
    roles:['master','radiology','doctor'],
    items:[
      {id:'rad-orders',   label:'Radiology Orders',       page:'radiology-orders'},
      {id:'rad-schedule', label:'Imaging Schedule',       page:'radiology-schedule'},
      {id:'rad-reports',  label:'Report Generation',      page:'radiology-reports'},
    ]
  },
  {
    id:'inventory', label:'Inventory & Store', icon:'📦',
    roles:['master','store','pharmacist'],
    items:[
      {id:'inv-dashboard',label:'Stock Dashboard',        page:'inv-dashboard'},
      {id:'inv-receive',  label:'Goods Receipt (GRN)',    page:'inv-grn'},
      {id:'inv-indent',   label:'Indent Management',      page:'inv-indent'},
      {id:'inv-transfer', label:'Inter-store Transfer',   page:'inv-transfer'},
      {id:'inv-expiry',   label:'Expiry & Batch Tracking',page:'inv-expiry'},
      {id:'inv-physical', label:'Physical Stock Verify',  page:'inv-physical'},
    ]
  },
  {
    id:'cssd', label:'CSSD', icon:'🧪',
    roles:['master','cssd','nurse'],
    items:[
      {id:'cssd-request', label:'Sterilisation Request',  page:'cssd-request'},
      {id:'cssd-track',   label:'Sterilisation Tracking', page:'cssd-tracking'},
      {id:'cssd-dispatch',label:'Dispatch to Wards',      page:'cssd-dispatch'},
    ]
  },
  {
    id:'mis', label:'MIS & Analytics', icon:'📊',
    roles:['master','management','billing'],
    items:[
      {id:'exec-dashboard',label:'Executive Dashboard',   page:'mis-revenue'},
      {id:'clinical-mis',  label:'Clinical KPIs',         page:'clinical-mis'},
      {id:'fin-reports',   label:'Financial Reports',     page:'mis-daily'},
      {id:'leakage',       label:'Revenue Leakage',       page:'mis-leakage'},
    ]
  },
  {
    id:'admin', label:'Administration', icon:'⚙',
    roles:['master'],
    items:[
      {id:'user-mgmt',   label:'User Management',        page:'user-mgmt'},
      {id:'masters',     label:'Hospital Masters',       page:'hospital-masters'},
      {id:'system',      label:'System Settings',        page:'system-settings'},
    ]
  },
];

// ─── APP STATE ───────────────────────────────────────────
let currentRole = null;
let currentUser = null;
let currentPage = 'journey';
let sidebarExpanded = {};

// ─── INIT: SHOW LOGIN ────────────────────────────────────
function initApp() {
  document.getElementById('app').innerHTML = renderLogin();
}

// ─── LOGIN SCREEN ────────────────────────────────────────
function renderLogin() {
  const roleCards = Object.entries(ROLES).map(([id, r]) => `
    <div onclick="loginAs('${id}')" style="background:#fff;border-radius:12px;padding:16px 14px;cursor:pointer;text-align:center;transition:all .2s;border:2px solid transparent;box-shadow:0 1px 4px rgba(0,0,0,.08)"
      onmouseover="this.style.borderColor='${r.color}';this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'"
      onmouseout="this.style.borderColor='transparent';this.style.transform='';this.style.boxShadow='0 1px 4px rgba(0,0,0,.08)'">
      <div style="width:44px;height:44px;border-radius:50%;background:${r.color};color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">${r.initials}</div>
      <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:2px">${id==='master'?'Master Admin':r.name.split(' ')[0]+' '+r.name.split(' ').slice(-1)}</div>
      <div style="font-size:11.5px;color:#64748b;line-height:1.3">${r.title}</div>
      ${id==='master'?'<div style="margin-top:6px;background:#dbeafe;color:#1d4ed8;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block">ALL ACCESS</div>':''}
    </div>`).join('');

  return `
    <div style="min-height:100vh;background:linear-gradient(135deg,#0a1628 0%,#0d1f33 50%,#0f2d4a 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">
        <div style="width:52px;height:52px;background:#2563eb;border-radius:14px;display:flex;align-items:center;justify-content:center">
          <svg width="28" height="28" fill="white" viewBox="0 0 24 24"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"/></svg>
        </div>
        <div>
          <div style="color:#fff;font-size:28px;font-weight:800;letter-spacing:-.5px">HIS</div>
          <div style="color:#94a3b8;font-size:12px;letter-spacing:.05em">HOSPITAL INFORMATION SYSTEM</div>
        </div>
      </div>
      <div style="color:#fff;font-size:20px;font-weight:700;margin-bottom:2px">${HOSPITAL.name}</div>
      <div style="color:#64748b;font-size:13px;margin-bottom:6px">${HOSPITAL.city} &nbsp;·&nbsp; ${HOSPITAL.beds} Beds &nbsp;·&nbsp; ${HOSPITAL.type}</div>
      <div style="background:#1e3a5f;color:#93c5fd;font-size:11.5px;font-weight:600;padding:4px 14px;border-radius:20px;margin-bottom:28px">🎯 DEMO MODE — Click any role to begin</div>

      <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:780px;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div style="font-size:13.5px;font-weight:700;color:#475569;text-align:center;margin-bottom:16px;text-transform:uppercase;letter-spacing:.06em">Select Role to Begin Demo</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${roleCards}</div>
      </div>

      <div style="color:#334155;font-size:11.5px;margin-top:20px">v2.3.1 &nbsp;·&nbsp; © 2025 HIS &nbsp;·&nbsp; NABH Compliant</div>
    </div>`;
}

// ─── LOGIN AS ROLE ───────────────────────────────────────
function loginAs(roleId) {
  currentRole = roleId;
  currentUser = ROLES[roleId];
  document.getElementById('app').innerHTML = renderShell();
  navTo('journey');
}

function logout() {
  currentRole = null;
  currentUser = null;
  document.getElementById('app').innerHTML = renderLogin();
}

// ─── SHELL ───────────────────────────────────────────────
function renderShell() {
  return `
    <div style="display:flex;flex-direction:column;height:100vh;overflow:hidden">
      ${renderTopNav()}
      <div style="display:flex;flex:1;overflow:hidden">
        <nav id="sidebar" style="width:240px;min-width:240px;background:#0d1f33;height:100%;overflow-y:auto;flex-shrink:0">${renderSidebar()}</nav>
        <main id="main-content" style="flex:1;background:#f1f5f9;overflow-y:auto;padding:24px"></main>
      </div>
    </div>`;
}

function renderTopNav() {
  const u = currentUser;
  return `
    <header style="height:52px;background:#0d1f33;display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0;z-index:50">
      <button onclick="toggleSidebar()" title="Toggle sidebar" style="width:34px;height:34px;border-radius:7px;border:none;background:#1e3a5f;color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div style="display:flex;align-items:center;gap:10px;margin-right:12px">
        <div style="width:32px;height:32px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center">
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"/></svg>
        </div>
        <div>
          <div style="color:#fff;font-weight:800;font-size:13px;line-height:1">HIS</div>
          <div style="color:#64748b;font-size:10px;line-height:1">${HOSPITAL.name}</div>
        </div>
      </div>
      <div style="flex:1;max-width:480px">
        <div style="display:flex;align-items:center;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:6px 12px;gap:8px">
          <svg width="14" height="14" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input placeholder="Search patient / menu / module..." style="background:transparent;border:none;outline:none;color:#94a3b8;font-size:13px;width:100%">
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-left:auto">
        <button style="background:none;border:none;color:#64748b;cursor:pointer;position:relative;padding:4px">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span style="position:absolute;top:-2px;right:-2px;width:16px;height:16px;background:#ef4444;color:#fff;font-size:9px;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center">5</span>
        </button>
        <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="logout()">
          <div style="width:32px;height:32px;border-radius:50%;background:${u.color};color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">${u.initials}</div>
          <div>
            <div style="color:#fff;font-size:12px;font-weight:600;line-height:1.2">${u.name}</div>
            <div style="color:#64748b;font-size:10.5px;line-height:1.2">${u.title}</div>
          </div>
          <svg width="12" height="12" fill="none" stroke="#64748b" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </header>`;
}

function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  if (!sb) return;
  if (sb.style.display === 'none') {
    sb.style.display = '';
  } else {
    sb.style.display = 'none';
  }
}

function renderSidebar() {
  const isAllAccess = currentRole === 'master';
  const userModules = currentUser.modules;
  let html = `<div style="padding:12px 16px 6px;color:#fff;font-weight:700;font-size:13px">${isAllAccess ? 'All Departments' : currentUser.title}</div>`;

  NAV_TREE.forEach(group => {
    const allowed = isAllAccess || (group.roles && group.roles.includes(currentRole)) || group.id === 'journey';
    if (!allowed) return;
    html += `<div style="font-size:10.5px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.08em;padding:12px 16px 4px">${group.icon} ${group.label}</div>`;
    group.items.forEach(item => {
      const isActive = currentPage === item.page || currentPage === item.id;
      html += `<div onclick="navTo('${item.page}')" style="display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer;font-size:13px;border-radius:0;transition:all .15s;${isActive?'background:#1e3a5f;color:#fff;border-left:3px solid #2563eb;padding-left:13px':'color:#94a3b8;border-left:3px solid transparent'}" onmouseover="if(!this.style.background.includes('1e3a5f'))this.style.background='#152840'" onmouseout="if(!this.style.background.includes('1e3a5f'))this.style.background=''">
        ${item.label}
      </div>`;
    });
  });

  html += `<div style="padding:16px;margin-top:16px;border-top:1px solid #1e3a5f">
    <button onclick="logout()" style="width:100%;background:#1e3a5f;color:#94a3b8;border:none;border-radius:6px;padding:8px;font-size:12.5px;cursor:pointer">← Switch Role</button>
    <div style="color:#334155;font-size:10.5px;margin-top:8px;text-align:center">v2.3.1 · © 2025 HIS</div>
  </div>`;
  return html;
}

// ─── NAVIGATION ──────────────────────────────────────────
function navTo(pageId) {
  currentPage = pageId;
  document.getElementById('sidebar').innerHTML = renderSidebar();
  const renderer = ALL_PAGES[pageId] || (() => pageComingSoon(pageId));
  document.getElementById('main-content').innerHTML = renderer();
  // page-specific post-render hooks
  if (pageId === 'opd-queue'   && typeof oqInit      === 'function') oqInit();
  if (pageId === 'opd-nurse'   && typeof nurseInit   === 'function') nurseInit();
  if (pageId === 'opd-consult' && typeof consultInit === 'function') consultInit();
}

// ─── PATIENT JOURNEY MAP ─────────────────────────────────
function pageJourney() {
  const steps = [
    { n:1,  dept:'Registration',      role:'Receptionist',    icon:'👤', title:'Patient Arrival & Registration',  desc:'UHID generated, demographics captured, insurance verified',  color:'#0891b2', page:'patient-reg',    tag:'OPD PATH' },
    { n:2,  dept:'OPD',               role:'Receptionist',    icon:'🎫', title:'Token & Queue Assignment',         desc:'OPD token issued, patient directed to consultation room',     color:'#0891b2', page:'opd-queue',       tag:'OPD PATH' },
    { n:3,  dept:'OPD / EMR',         role:'Doctor',          icon:'👨‍⚕️', title:"Doctor's Consultation",          desc:'Clinical examination, diagnosis, prescription & orders placed', color:'#16a34a', page:'opd-consult',   tag:'OPD PATH' },
    { n:4,  dept:'Lab / Radiology',   role:'Lab / Rad Tech',  icon:'🔬', title:'Investigations Ordered',           desc:'Lab samples collected, radiology imaging done, results uploaded', color:'#dc2626', page:'lab-orders',  tag:'OPD PATH' },
    { n:5,  dept:'Billing',           role:'Cashier',         icon:'💰', title:'OPD Billing & Payment',            desc:'Consultation + investigation fees collected, receipt issued',  color:'#ea580c', page:'opd-registration', tag:'OPD PATH' },
    { n:6,  dept:'Pharmacy',          role:'Pharmacist',      icon:'💊', title:'OPD Pharmacy Dispensing',          desc:'Prescription medicines dispensed, counselling given',          color:'#7c3aed', page:'pharmacy-opd',   tag:'OPD PATH' },
    { n:7,  dept:'Billing / Nursing', role:'Billing + Nurse', icon:'🛏', title:'IPD Admission & Advance',          desc:'Admission form, cost estimate, advance collected, bed allotted', color:'#1d4ed8', page:'ipd-admission', tag:'IPD PATH' },
    { n:8,  dept:'Nursing',           role:'Nurse',           icon:'🩺', title:'Nursing Care & Vitals',            desc:'Vitals monitoring, nursing notes, medication administration',   color:'#db2777', page:'nursing-wb',     tag:'IPD PATH' },
    { n:9,  dept:'IPD / EMR',         role:'Doctor',          icon:'📋', title:'Doctor Rounds (IPD)',              desc:'Daily rounds, progress notes, updated treatment plan',         color:'#16a34a', page:'ipd-rounds',     tag:'IPD PATH' },
    { n:10, dept:'Billing',           role:'HIS Auto',        icon:'⚡', title:'Real-time Charge Posting',        desc:'Room rent, consultant visits, pharmacy, lab — auto-posted',    color:'#ea580c', page:'ipd-charges',    tag:'IPD PATH' },
    { n:11, dept:'Pharmacy / CSSD',   role:'Pharmacist',      icon:'💉', title:'IPD Pharmacy & CSSD',              desc:'Inpatient medicines dispensed, sterile supplies issued',       color:'#7c3aed', page:'pharmacy-ipd',   tag:'IPD PATH' },
    { n:12, dept:'Clinical',          role:'Doctor + Nurse',  icon:'✅', title:'Discharge Order',                  desc:'Doctor issues discharge, pending charges closed, summary prepared', color:'#16a34a', page:'ipd-finalbill', tag:'DISCHARGE' },
    { n:13, dept:'Billing',           role:'Cashier',         icon:'🧾', title:'Final Bill Generation',            desc:'All charges consolidated, advance adjusted, balance collected', color:'#ea580c', page:'ipd-finalbill', tag:'DISCHARGE' },
    { n:14, dept:'Insurance Desk',    role:'Insurance Staff', icon:'🏦', title:'TPA / Insurance Settlement',      desc:'Cashless claim submitted, co-payment collected, TPA notified', color:'#4338ca', page:'ins-cashless',   tag:'DISCHARGE' },
    { n:15, dept:'Registration',      role:'Receptionist',    icon:'🚪', title:'Discharge & Follow-up',           desc:'Bed released, discharge card issued, follow-up appointment booked', color:'#0891b2', page:'opd-queue', tag:'DISCHARGE' },
  ];

  const tagColors = { 'OPD PATH':'#0891b2', 'IPD PATH':'#1d4ed8', 'DISCHARGE':'#16a34a' };

  const cards = steps.map((s,i) => `
    <div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${s.color};border-radius:10px;padding:14px;width:168px;cursor:pointer;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,.06)"
        onclick="navTo('${s.page}')"
        onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.12)';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,.06)';this.style.transform=''">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:26px;height:26px;background:${s.color};color:#fff;border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">${s.n}</div>
          <span style="font-size:18px">${s.icon}</span>
          <span style="background:${tagColors[s.tag]}18;color:${tagColors[s.tag]};font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:10px;margin-left:auto">${s.tag}</span>
        </div>
        <div style="font-weight:700;font-size:12.5px;color:#1e293b;margin-bottom:4px;line-height:1.3">${s.title}</div>
        <div style="font-size:11px;color:#64748b;line-height:1.4;margin-bottom:8px">${s.desc}</div>
        <div style="font-size:10.5px;color:${s.color};font-weight:600">${s.dept}</div>
        <div style="font-size:10px;color:#94a3b8">👤 ${s.role}</div>
      </div>
      ${i < steps.length-1 ? `<div style="color:#cbd5e1;font-size:18px;margin:6px 0">↓</div>` : ''}
    </div>`).join('');

  // Group into OPD (1-6), IPD (7-11), Discharge (12-15)
  const groups = [
    { label:'OPD Patient Journey', color:'#0891b2', range:[0,6] },
    { label:'IPD Extension (If Admission Required)', color:'#1d4ed8', range:[6,11] },
    { label:'Discharge & Settlement', color:'#16a34a', range:[11,15] },
  ];

  const groupedHtml = groups.map(g => {
    const groupSteps = steps.slice(g.range[0], g.range[1]);
    const row = groupSteps.map((s, i) => `
      <div style="display:flex;align-items:flex-start;gap:0">
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${s.color};border-radius:10px;padding:12px;width:172px;cursor:pointer;transition:all .2s"
          onclick="navTo('${s.page}')"
          onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.12)';this.style.transform='translateY(-2px)'"
          onmouseout="this.style.boxShadow='';this.style.transform=''">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px">
            <div style="width:22px;height:22px;background:${s.color};color:#fff;border-radius:50%;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${s.n}</div>
            <span style="font-size:16px">${s.icon}</span>
          </div>
          <div style="font-weight:700;font-size:12px;color:#1e293b;margin-bottom:3px;line-height:1.3">${s.title}</div>
          <div style="font-size:10.5px;color:#64748b;line-height:1.4;margin-bottom:6px">${s.desc}</div>
          <div style="font-size:10px;color:${s.color};font-weight:600">${s.dept}</div>
          <div style="font-size:9.5px;color:#94a3b8;margin-top:2px">👤 ${s.role}</div>
        </div>
        ${i < groupSteps.length - 1 ? `<div style="display:flex;align-items:center;padding:0 4px;padding-top:30px"><svg width="24" height="16" viewBox="0 0 24 16"><path d="M0 8h20M15 2l6 6-6 6" stroke="${g.color}" stroke-width="2" fill="none"/></svg></div>` : ''}
      </div>`).join('');

    return `
      <div style="margin-bottom:20px">
        <div style="display:inline-flex;align-items:center;gap:8px;background:${g.color};color:#fff;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:12px">
          <span>${g.label}</span>
        </div>
        <div style="display:flex;align-items:flex-start;flex-wrap:nowrap;overflow-x:auto;gap:0;padding-bottom:4px">${row}</div>
      </div>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">🗺 Patient Journey Map</div>
        <div style="font-size:22px;font-weight:700;color:#0f172a">Patient Journey — End to End</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px">Click any step to open that module. This map shows the complete patient flow through the hospital.</div>
      </div>
      <div style="display:flex;gap:10px">
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b"><span style="width:12px;height:12px;background:#0891b2;border-radius:50%;display:inline-block"></span>OPD</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b"><span style="width:12px;height:12px;background:#1d4ed8;border-radius:50%;display:inline-block"></span>IPD</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b"><span style="width:12px;height:12px;background:#16a34a;border-radius:50%;display:inline-block"></span>Discharge</div>
      </div>
    </div>
    ${groupedHtml}
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-top:4px">
      <div style="font-weight:700;color:#1e293b;font-size:13.5px;margin-bottom:10px">📋 Modules Status</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        ${[
          ['Billing Module','9 scenarios','#16a34a','Built'],
          ['Registration','2 scenarios','#ca8a04','In Progress'],
          ['OPD / EMR','3 scenarios','#ca8a04','In Progress'],
          ['IPD / Ward','4 scenarios','#ca8a04','In Progress'],
          ['Pharmacy','4 scenarios','#94a3b8','Planned'],
          ['Laboratory','5 scenarios','#94a3b8','Planned'],
          ['Radiology','3 scenarios','#94a3b8','Planned'],
          ['Inventory','6 scenarios','#94a3b8','Planned'],
          ['CSSD','3 scenarios','#94a3b8','Planned'],
          ['MIS & Analytics','4 scenarios','#94a3b8','Planned'],
        ].map(([m,s,c,st])=>`<div style="display:flex;align-items:center;gap:10px;background:#f8fafc;border-radius:8px;padding:10px 12px">
          <div style="width:8px;height:8px;background:${c};border-radius:50%;flex-shrink:0"></div>
          <div style="flex:1"><div style="font-size:12.5px;font-weight:600;color:#1e293b">${m}</div><div style="font-size:11px;color:#94a3b8">${s}</div></div>
          <span style="font-size:10.5px;font-weight:600;color:${c}">${st}</span>
        </div>`).join('')}
      </div>
    </div>`;
}

// ─── PLACEHOLDER FOR UNBUILT PAGES ───────────────────────
function pageComingSoon(pageId) {
  const labels = {
    'patient-reg':'Patient Registration','opd-queue':'OPD Queue & Token','appointments':'Appointment Scheduling',
    'bed-status':'Bed Availability Board','opd-consult':"Doctor's Consultation",'vitals':'Vitals & Triage',
    'prescription':'Prescription / Orders','bed-allotment':'Ward / Bed Allotment','nursing-wb':'Nursing Workbench',
    'ipd-rounds':'Doctor Rounds (IPD)','pharmacy-opd':'OPD Pharmacy Dispensing','pharmacy-ipd':'IPD Pharmacy Dispensing',
    'pharmacy-indent':'Indent from Store','pharmacy-returns':'Returns & Expiry','lab-orders':'Test Orders Received',
    'lab-collection':'Sample Collection','lab-processing':'Test Processing','lab-reports':'Lab Report Generation',
    'lab-critical':'Critical Value Alerts','radiology-orders':'Radiology Orders','radiology-schedule':'Imaging Schedule',
    'radiology-reports':'Radiology Reports','inv-dashboard':'Stock Dashboard','inv-grn':'Goods Receipt (GRN)',
    'inv-indent':'Indent Management','inv-transfer':'Inter-store Transfer','inv-expiry':'Expiry & Batch Tracking',
    'inv-physical':'Physical Stock Verification','cssd-request':'Sterilisation Request','cssd-tracking':'Sterilisation Tracking',
    'cssd-dispatch':'Dispatch to Wards','user-mgmt':'User Management','hospital-masters':'Hospital Masters',
    'system-settings':'System Settings','clinical-mis':'Clinical KPIs',
  };
  const label = labels[pageId] || pageId;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🔨</div>
      <div style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:6px">${label}</div>
      <div style="font-size:13.5px;color:#64748b;margin-bottom:20px;max-width:400px">This module is part of the patient journey map. Scenarios will be built here next, following the same detailed approach as Billing.</div>
      <button onclick="navTo('journey')" style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13.5px;font-weight:600;cursor:pointer">← Back to Patient Journey</button>
    </div>`;
}
