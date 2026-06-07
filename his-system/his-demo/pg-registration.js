// ─── HIS DEMO — REGISTRATION & FRONT DESK ───────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// FRONT DESK WORKSTATION — unified single-screen registration flow
// ═══════════════════════════════════════════════════════════════════════════

var _fd = {
  patient: null,   // selected or newly entered patient
  isNew: false,    // true = new patient being registered
  dept: '',
  doctor: null,
  slot: '',
  session: 'Morning',
  complaint: '',
};

var FD_SYMPTOM_MAP = [
  { keywords:['chest','heart','palpitation','breathless','cardiac','angina','ecg','bp high'],       dept:'Cardiology' },
  { keywords:['fever','cold','cough','flu','headache','weakness','fatigue','diabetes','bp','sugar','thyroid','general'], dept:'General Medicine' },
  { keywords:['pregnant','pregnancy','period','menstrual','gynae','ovary','uterus','delivery','ladies'], dept:'Gynaecology' },
  { keywords:['child','baby','infant','toddler','kids','paed'],                                      dept:'Paediatrics' },
  { keywords:['bone','joint','knee','back','spine','shoulder','fracture','ortho','arthritis','swelling'], dept:'Orthopaedics' },
  { keywords:['ear','nose','throat','tonsil','sinus','hearing','snoring','ent'],                     dept:'ENT' },
  { keywords:['skin','rash','acne','eczema','allergy','itching','derma'],                            dept:'Dermatology' },
  { keywords:['eye','vision','blur','cataract','glasses','opth'],                                    dept:'Ophthalmology' },
];

var FD_DOCTORS = {
  'Cardiology':      [
    { id:'D003', name:'Dr. Suresh Verma',   qual:'DM, MD — Cardiologist',          fee:1000, exp:'12 yrs', wait:25, available:3, next:'09:30 AM', booked:['09:00','09:30','12:00'] },
    { id:'D011', name:'Dr. Ramesh Kapoor',  qual:'MD — Cardiology',                fee:700,  exp:'7 yrs',  wait:12, available:5, next:'10:00 AM', booked:['10:30'] },
  ],
  'General Medicine':[
    { id:'D001', name:'Dr. Anil Mehta',     qual:'MD, MBBS — General Physician',   fee:600,  exp:'10 yrs', wait:20, available:4, next:'09:00 AM', booked:['09:30','11:30'] },
    { id:'D012', name:'Dr. Pooja Rao',      qual:'MBBS — General Physician',       fee:400,  exp:'4 yrs',  wait:8,  available:7, next:'09:00 AM', booked:['09:30'] },
  ],
  'Gynaecology':     [
    { id:'D002', name:'Dr. Priya Sharma',   qual:'MS, MBBS — Gynaecologist',       fee:700,  exp:'9 yrs',  wait:30, available:3, next:'10:30 AM', booked:['10:30','11:00'] },
    { id:'D013', name:'Dr. Sunita Bose',    qual:'MD — Obs & Gynae',               fee:600,  exp:'6 yrs',  wait:18, available:5, next:'09:30 AM', booked:['09:00'] },
  ],
  'Paediatrics':     [
    { id:'D005', name:'Dr. Meena Joshi',    qual:'MD, MBBS — Paediatrician',       fee:600,  exp:'8 yrs',  wait:15, available:6, next:'09:00 AM', booked:[] },
    { id:'D014', name:'Dr. Arun Pillai',    qual:'DCH, MBBS — Paediatrician',      fee:500,  exp:'5 yrs',  wait:10, available:8, next:'09:00 AM', booked:['09:30'] },
  ],
  'Orthopaedics':    [
    { id:'D004', name:'Dr. Rajesh Nair',    qual:'MS, MBBS — Orthopaedic Surgeon', fee:700,  exp:'11 yrs', wait:20, available:3, next:'11:00 AM', booked:['11:00','12:30'] },
    { id:'D015', name:'Dr. Vikram Singh',   qual:'MS — Orthopaedics',              fee:600,  exp:'6 yrs',  wait:15, available:5, next:'09:30 AM', booked:['10:00'] },
  ],
  'ENT':             [
    { id:'D006', name:'Dr. Vinod Patel',    qual:'MS, MBBS — ENT Surgeon',         fee:600,  exp:'9 yrs',  wait:12, available:5, next:'09:30 AM', booked:['09:30'] },
  ],
  'Dermatology':     [
    { id:'D016', name:'Dr. Kavya Menon',    qual:'MD — Dermatologist',             fee:700,  exp:'7 yrs',  wait:18, available:4, next:'10:00 AM', booked:['09:00','09:30'] },
  ],
  'Ophthalmology':   [
    { id:'D017', name:'Dr. Satish Gupta',   qual:'MS — Ophthalmologist',           fee:800,  exp:'10 yrs', wait:20, available:3, next:'10:30 AM', booked:['09:00'] },
  ],
};

var FD_MORNING = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30'];
var FD_EVENING = ['16:00','16:30','17:00','17:30','18:00'];

// ── Front Desk global handlers ─────────────────────────────────────────────────
function fdSearchPatient(q) {
  var box = document.getElementById('fd-search-results');
  if (q.length < 2) { box.style.display = 'none'; return; }
  var m = DEMO_PATIENTS.filter(function(p) {
    return p.name.toLowerCase().includes(q.toLowerCase()) ||
           p.uhid.toLowerCase().includes(q.toLowerCase()) ||
           p.mobile.includes(q);
  });
  if (!m.length) {
    box.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#94a3b8">No record found — <a href="#" onclick="fdNewPatient();return false" style="color:#2563eb;font-weight:600">Register as new patient</a></div>';
    box.style.display = 'block'; return;
  }
  box.innerHTML = m.map(function(p) {
    return '<div onclick=\'fdPickPatient(' + JSON.stringify(p) + ')\' style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">' +
      '<div style="font-weight:600;color:#1e293b;font-size:13.5px">' + p.name + ' <span style="font-family:monospace;font-size:11.5px;color:#64748b">' + p.uhid + '</span></div>' +
      '<div style="font-size:12px;color:#94a3b8;margin-top:1px">' + p.age + 'Y ' + p.gender + ' · ' + p.mobile + ' · ' + p.blood + '</div>' +
    '</div>';
  }).join('');
  box.style.display = 'block';
}
function fdPickPatient(p) {
  _fd.patient = p; _fd.isNew = false;
  document.getElementById('fd-search-results').style.display = 'none';
  document.getElementById('fd-search-inp').value = '';
  fdRenderPatientCard();
  fdShowPanel('complaint');
}
function fdNewPatient() {
  _fd.isNew = true;
  _fd.patient = { name:'New Patient', uhid:'—', age:'?', gender:'—', mobile:'—', blood:'—', abha:'—' };
  document.getElementById('fd-search-results').style.display = 'none';
  fdRenderPatientCard();
  fdShowPanel('complaint');
}
function fdRenderPatientCard() {
  var p = _fd.patient;
  var isNew = _fd.isNew;
  document.getElementById('fd-patient-area').innerHTML =
    '<div style="background:' + (isNew ? '#fffbeb' : '#f0fdf4') + ';border:1px solid ' + (isNew ? '#fcd34d' : '#bbf7d0') + ';border-radius:10px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">' +
        '<div style="font-weight:700;font-size:15px;color:#1e293b">' + p.name + '</div>' +
        '<button onclick="fdReset()" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1">&times;</button>' +
      '</div>' +
      (isNew
        ? '<div style="font-size:12.5px;color:#92400e;margin-bottom:10px">New patient — UHID will be generated on registration</div>' +
          '<div style="display:grid;gap:6px">' +
            '<input id="fd-new-name" class="form-input" placeholder="Full name *" style="font-size:13px">' +
            '<input id="fd-new-mobile" class="form-input" placeholder="Mobile number *" style="font-size:13px" maxlength="10">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
              '<input id="fd-new-age" class="form-input" placeholder="Age" style="font-size:13px">' +
              '<select id="fd-new-gender" class="form-select" style="font-size:13px"><option value="">Gender</option><option>Male</option><option>Female</option><option>Other</option></select>' +
            '</div>' +
          '</div>'
        : '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12.5px">' +
            '<span style="color:#64748b">UHID</span><span style="font-family:monospace;font-weight:700;color:#166534">' + p.uhid + '</span>' +
            '<span style="color:#64748b">Age / Gender</span><span>' + p.age + 'Y ' + p.gender + '</span>' +
            '<span style="color:#64748b">Mobile</span><span>' + p.mobile + '</span>' +
            '<span style="color:#64748b">Blood Group</span><span>' + p.blood + '</span>' +
          '</div>' +
          (p.status ? '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #bbf7d0;font-size:12px;color:#64748b">Last visit: Today · ' + p.dept + ' · ' + p.doctor + '</div>' : '')
      ) +
    '</div>';
}
function fdReset() {
  _fd = { patient:null, isNew:false, dept:'', doctor:null, slot:'', session:'Morning', complaint:'' };
  document.getElementById('fd-patient-area').innerHTML =
    '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:32px 0">Search or register a patient to begin</div>';
  fdShowPanel('empty');
  var si = document.getElementById('fd-search-inp');
  if (si) si.value = '';
}
function fdShowPanel(which) {
  ['empty','complaint','doctors','slots','done'].forEach(function(id) {
    var el = document.getElementById('fd-panel-' + id);
    if (el) el.style.display = id === which ? '' : 'none';
  });
}
function fdDetectDept(q) {
  _fd.complaint = q;
  var lower = q.toLowerCase();
  var matched = null;
  FD_SYMPTOM_MAP.forEach(function(entry) {
    if (!matched && entry.keywords.some(function(k){ return lower.includes(k); })) {
      matched = entry.dept;
    }
  });
  var hint = document.getElementById('fd-dept-hint');
  if (matched && q.length > 2) {
    hint.innerHTML = 'Suggested: <b>' + matched + '</b> &nbsp;' +
      '<button onclick="fdSelectDept(\'' + matched + '\')" style="background:#2563eb;color:#fff;border:none;border-radius:5px;padding:2px 12px;font-size:12.5px;font-weight:600;cursor:pointer">Confirm</button>';
    hint.style.display = '';
  } else {
    hint.style.display = 'none';
  }
}
function fdSelectDept(dept) {
  _fd.dept = dept;
  document.getElementById('fd-dept-sel').value = dept;
  document.getElementById('fd-dept-hint').style.display = 'none';
  fdLoadDoctors(dept);
}
function fdLoadDoctors(dept) {
  _fd.dept = dept;
  _fd.doctor = null; _fd.slot = '';
  var docs = FD_DOCTORS[dept] || [];
  if (!docs.length) {
    document.getElementById('fd-doctor-list').innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:16px 0">No doctors available for this department today.</div>';
    return;
  }
  var sorted = docs.slice().sort(function(a,b){ return a.fee - b.fee; });
  var lowest = sorted[0].fee;
  document.getElementById('fd-doctor-list').innerHTML = sorted.map(function(d, i) {
    var isLowest = d.fee === lowest;
    return '<div id="fd-doc-card-' + d.id + '" onclick="fdSelectDoctor(\'' + d.id + '\')" style="background:#fff;border:2px solid ' + (isLowest?'#bbf7d0':'#e2e8f0') + ';border-radius:10px;padding:14px 16px;cursor:pointer;transition:all .15s;margin-bottom:8px" ' +
      'onmouseover="this.style.borderColor=\'#2563eb\'" onmouseout="this.style.borderColor=\'' + (isLowest?'#bbf7d0':'#e2e8f0') + '\'">' +
      '<div style="display:flex;justify-content:space-between;align-items:start">' +
        '<div>' +
          '<div style="font-weight:700;font-size:14px;color:#1e293b">' + d.name +
            (isLowest ? ' <span style="font-size:11px;background:#dcfce7;color:#15803d;padding:1px 8px;border-radius:999px;font-weight:700;margin-left:6px">Lowest fee</span>' : '') +
          '</div>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px">' + d.qual + '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:20px;font-weight:800;color:#1e293b">&#8377;' + d.fee + '</div>' +
          '<div style="font-size:11px;color:#94a3b8">consultation fee</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:16px;margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:12px;color:#475569">' +
        '<span><b>' + d.exp + '</b> experience</span>' +
        '<span><b>' + d.wait + ' min</b> avg wait</span>' +
        '<span><b>' + d.available + ' slots</b> today</span>' +
        '<span style="margin-left:auto;color:#2563eb;font-weight:700">Next: ' + d.next + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}
function fdSelectDoctor(docId) {
  var docs = FD_DOCTORS[_fd.dept] || [];
  _fd.doctor = docs.find(function(d){ return d.id === docId; });
  if (!_fd.doctor) return;
  // highlight selected card
  docs.forEach(function(d) {
    var el = document.getElementById('fd-doc-card-' + d.id);
    if (el) el.style.borderColor = d.id === docId ? '#2563eb' : '#e2e8f0';
  });
  _fd.slot = '';
  fdRenderSlots();
  document.getElementById('fd-slots-panel').style.display = '';
  document.getElementById('fd-slots-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}
function fdRenderSlots() {
  var doc = _fd.doctor;
  if (!doc) return;
  var slots = _fd.session === 'Morning' ? FD_MORNING : FD_EVENING;
  document.getElementById('fd-slot-grid').innerHTML = slots.map(function(s) {
    var isBk = doc.booked.includes(s), isSel = _fd.slot === s;
    var bg  = isSel ? '#2563eb' : isBk ? '#f1f5f9' : '#f0fdf4';
    var clr = isSel ? '#fff'    : isBk ? '#94a3b8' : '#166534';
    var bdr = isSel ? '2px solid #2563eb' : isBk ? '1px solid #e2e8f0' : '1px solid #86efac';
    var clk = isBk ? '' : 'onclick="fdPickSlot(\'' + s + '\')"';
    return '<div ' + clk + ' style="padding:10px;border-radius:8px;background:' + bg + ';color:' + clr + ';border:' + bdr + ';cursor:' + (isBk?'not-allowed':'pointer') + ';text-align:center;font-weight:600;font-size:13px;transition:all .15s">' +
      s + (isBk ? '<div style="font-size:10px;opacity:.6;margin-top:1px">Booked</div>' : '') +
    '</div>';
  }).join('');
  fdUpdateSummary();
}
function fdSetSession(s) {
  _fd.session = s; _fd.slot = '';
  var mBtn = document.getElementById('fd-sess-m');
  var eBtn = document.getElementById('fd-sess-e');
  mBtn.style.background = s==='Morning' ? '#2563eb' : '#f1f5f9';
  mBtn.style.color = s==='Morning' ? '#fff' : '#374151';
  eBtn.style.background = s==='Evening' ? '#2563eb' : '#f1f5f9';
  eBtn.style.color = s==='Evening' ? '#fff' : '#374151';
  fdRenderSlots();
}
function fdPickSlot(s) {
  _fd.slot = _fd.slot === s ? '' : s;
  fdRenderSlots();
}
function fdUpdateSummary() {
  var box = document.getElementById('fd-summary-box');
  var btn = document.getElementById('fd-confirm-btn');
  if (!_fd.doctor || !_fd.slot) { box.style.display = 'none'; return; }
  box.style.display = '';
  box.innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#64748b;letter-spacing:.05em;margin-bottom:10px">BOOKING SUMMARY</div>' +
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;line-height:1.9">' +
      '<span style="color:#64748b">Patient</span><span style="font-weight:600">' + (_fd.isNew ? (document.getElementById('fd-new-name')||{value:'New Patient'}).value || 'New Patient' : _fd.patient.name) + '</span>' +
      '<span style="color:#64748b">Department</span><span>' + _fd.dept + '</span>' +
      '<span style="color:#64748b">Doctor</span><span style="font-weight:600">' + _fd.doctor.name + '</span>' +
      '<span style="color:#64748b">Slot</span><span style="font-weight:700;color:#2563eb">' + _fd.slot + ' (' + _fd.session + ')</span>' +
      '<span style="color:#64748b">Fee</span><span style="font-weight:700;color:#16a34a">&#8377;' + _fd.doctor.fee + '</span>' +
    '</div>';
  btn.style.display = 'flex';
}
function fdConfirm() {
  var uhid = _fd.isNew ? ('HIS26' + String(_regCounter++).padStart(5,'0')) : _fd.patient.uhid;
  var deptCode = { 'Cardiology':'CAR','General Medicine':'GEN','Gynaecology':'GYN','Paediatrics':'PAE','Orthopaedics':'ORT','ENT':'ENT','Dermatology':'DRM','Ophthalmology':'OPH' };
  var code = deptCode[_fd.dept] || 'OPD';
  var token = code + '-' + String(Math.floor(Math.random()*900)+100);
  var aptNo  = 'APT/26/' + String(Math.floor(Math.random()*9000)+1000);
  // mark slot as booked
  if (_fd.doctor && !_fd.doctor.booked.includes(_fd.slot)) _fd.doctor.booked.push(_fd.slot);

  var patName = _fd.isNew
    ? ((document.getElementById('fd-new-name')||{value:'New Patient'}).value || 'New Patient')
    : _fd.patient.name;

  document.getElementById('fd-done-card').innerHTML =
    '<div style="text-align:center;margin-bottom:20px">' +
      '<div style="width:56px;height:56px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">&#10003;</div>' +
      '<div style="font-size:17px;font-weight:800;color:#15803d">Booking Confirmed!</div>' +
      '<div style="font-size:13px;color:#64748b;margin-top:4px">SMS sent to patient</div>' +
    '</div>' +
    '<div style="background:#0d1f33;border-radius:12px;padding:20px;color:#fff;margin-bottom:16px">' +
      '<div style="font-size:11px;color:#64748b;letter-spacing:.08em;margin-bottom:10px">PATIENT TOKEN CARD</div>' +
      '<div style="font-size:22px;font-weight:800;margin-bottom:2px">' + patName + '</div>' +
      '<div style="font-size:28px;font-weight:900;font-family:monospace;color:#60a5fa;letter-spacing:.05em;margin:6px 0">' + uhid + '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1)">' +
        '<div><div style="font-size:11px;color:#94a3b8">OPD TOKEN</div><div style="font-size:20px;font-weight:800;font-family:monospace;color:#34d399">' + token + '</div></div>' +
        '<div style="text-align:right"><div style="font-size:11px;color:#94a3b8">APPOINTMENT</div><div style="font-size:14px;font-weight:700;color:#fbbf24">' + aptNo + '</div></div>' +
      '</div>' +
      '<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;color:#94a3b8">' +
        _fd.doctor.name + ' &nbsp;·&nbsp; ' + _fd.dept + ' &nbsp;·&nbsp; ' + _fd.slot + ' (' + _fd.session + ')' +
        ' &nbsp;·&nbsp; &#8377;' + _fd.doctor.fee +
      '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<button onclick="fdReset()" style="padding:10px;border-radius:8px;background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;font-weight:600;font-size:13.5px;cursor:pointer">Next Patient</button>' +
      '<button onclick="navTo(\'opd-queue\')" style="padding:10px;border-radius:8px;background:#2563eb;color:#fff;border:none;font-weight:600;font-size:13.5px;cursor:pointer">View OPD Queue</button>' +
    '</div>';

  fdShowPanel('done');
}

// ── Page: Front Desk Workstation ───────────────────────────────────────────────
function pageRegDesk() {
  var today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var deptOptions = ['','Cardiology','General Medicine','Gynaecology','Paediatrics','Orthopaedics','ENT','Dermatology','Ophthalmology']
    .map(function(d){ return '<option value="' + d + '">' + (d||'Select Department') + '</option>'; }).join('');

  return pageHeader(
    'Front Desk Workstation',
    'Registration &amp; Front Desk <span>›</span> Front Desk',
    '<span style="font-size:13px;color:#64748b">' + today + '</span>'
  ) +

  '<div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start">' +

  // ── LEFT — Patient panel ──────────────────────────────────────────────────
  '<div>' +
    sectionCard('Patient Identification',
      '<div style="position:relative;margin-bottom:12px">' +
        '<input id="fd-search-inp" class="form-input" placeholder="Search UHID, mobile or name..." oninput="fdSearchPatient(this.value)" autocomplete="off">' +
        '<div id="fd-search-results" style="display:none;position:absolute;left:0;right:0;top:40px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:20;max-height:220px;overflow-y:auto"></div>' +
      '</div>' +
      '<button onclick="fdNewPatient()" class="btn-outline" style="width:100%;justify-content:center;font-size:13px;margin-bottom:14px">+ Register as New Patient</button>' +
      '<div id="fd-patient-area">' +
        '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:32px 0">Search or register a patient to begin</div>' +
      '</div>'
    ) +

    sectionCard('Today\'s Queue',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">' +
        '<div style="background:#eff6ff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#1d4ed8">3</div><div style="color:#64748b;font-size:12px">Waiting</div></div>' +
        '<div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#15803d">1</div><div style="color:#64748b;font-size:12px">In Consult</div></div>' +
        '<div style="background:#fefce8;border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#ca8a04">4</div><div style="color:#64748b;font-size:12px">Appointments</div></div>' +
        '<div style="background:#f8fafc;border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#475569">8</div><div style="color:#64748b;font-size:12px">Total Today</div></div>' +
      '</div>' +
      '<button onclick="navTo(\'opd-queue\')" class="btn-outline" style="width:100%;justify-content:center;margin-top:10px;font-size:13px">Open Full Queue</button>'
    )
  + '</div>' +

  // ── RIGHT — Action panels ─────────────────────────────────────────────────
  '<div>' +

    // Panel: empty state
    '<div id="fd-panel-empty">' +
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:48px;text-align:center;color:#94a3b8">' +
      '<div style="font-size:48px;margin-bottom:12px">&#128100;</div>' +
      '<div style="font-size:15px;font-weight:600;color:#64748b">Start by identifying the patient</div>' +
      '<div style="font-size:13px;margin-top:6px">Search by UHID / mobile / name, or register as new patient</div>' +
    '</div>' +
    '</div>' +

    // Panel: complaint + doctors
    '<div id="fd-panel-complaint" style="display:none">' +
    sectionCard('Chief Complaint &amp; Department',
      '<div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;margin-bottom:10px">' +
        '<div>' +
          '<label class="form-label">Patient\'s chief complaint <span style="font-weight:400;color:#94a3b8">(type to auto-suggest department)</span></label>' +
          '<input id="fd-complaint-inp" class="form-input" placeholder="e.g. chest pain, fever, back pain, pregnancy..." oninput="fdDetectDept(this.value)">' +
          '<div id="fd-dept-hint" style="display:none;margin-top:6px;font-size:13px;color:#374151;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 10px"></div>' +
        '</div>' +
        '<div>' +
          '<label class="form-label">Or select department</label>' +
          '<select id="fd-dept-sel" class="form-select" onchange="fdLoadDoctors(this.value)">' + deptOptions + '</select>' +
        '</div>' +
      '</div>'
    ) +

    '<div id="fd-doctor-list" style="margin-bottom:16px"></div>' +

    // Slot selection (appears after doctor pick)
    '<div id="fd-slots-panel" style="display:none">' +
    sectionCard('Select Appointment Slot',
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
        '<div id="fd-doc-chosen" style="font-size:13.5px;font-weight:700;color:#1e293b;flex:1"></div>' +
        '<button id="fd-sess-m" onclick="fdSetSession(\'Morning\')" style="padding:5px 14px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;cursor:pointer;background:#2563eb;color:#fff">Morning</button>' +
        '<button id="fd-sess-e" onclick="fdSetSession(\'Evening\')" style="padding:5px 14px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;cursor:pointer;background:#f1f5f9;color:#374151">Evening</button>' +
      '</div>' +
      '<div id="fd-slot-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"></div>'
    ) +
    '</div>' +

    // Summary + confirm
    '<div id="fd-summary-box" style="display:none;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px"></div>' +
    '<button id="fd-confirm-btn" onclick="fdConfirm()" class="btn-success" style="display:none;width:100%;justify-content:center;padding:12px;font-size:14px">Confirm Booking &amp; Issue Token</button>' +
    '</div>' +

    // Panel: done / token card
    '<div id="fd-panel-slots" style="display:none"></div>' +
    '<div id="fd-panel-done" style="display:none">' +
    '<div id="fd-done-card"></div>' +
    '</div>' +

  '</div>' + // end right
  '</div>';  // end grid
}

// ── All 12 Registration scenarios (from Excel) ────────────────────────────────
var REG_SCENARIOS = [
  { n:1,  name:'New Patient Walk-in Registration',
    purpose:'Capture demographic, contact and identity details for a first-time patient; generate unique UHID; duplicate check.',
    steps:[
      { role:'Front Desk Staff', action:'Patient arrives at counter.\nStaff opens New Patient Registration screen.\nEnters: full name, DOB, gender, blood group, address, mobile, emergency contact, marital status, religion.\nConfirms no prior visit.', response:'UHID auto-generated — unique permanent identifier.\nDuplicate check runs on name + DOB + mobile.\nIf match found: HIS shows existing records and asks to confirm or link.\nForm saved with staff ID and timestamp.' },
      { role:'Front Desk Staff', action:'Selects ID proof type (Aadhaar / PAN / Passport / DL / Voter ID).\nEnters ID number.\nUploads scanned copy.\nPrints consent form and obtains signature.\nAttaches signed consent to patient record.', response:'Aadhaar masked — only last 4 digits shown (UIDAI compliance).\nSigned consent attached to DMS — authorised staff only.\nConsent version, date and staff ID captured.\nSMS sent: UHID number + hospital helpline.' },
      { role:'Front Desk Staff', action:'HIS generates UHID card with patient name, UHID and QR code.\nStaff prints card and hands to patient.\nRegistration marked complete.', response:'UHID card: name, UHID, date of registration, QR code.\nQR links to patient record — scannable at any department.\nPatient record status set to Active.\nEvent logged in audit trail.\nIf printer unavailable: UHID + QR sent via SMS.' },
    ]
  },
  { n:2,  name:'Returning Patient Check-in',
    purpose:'Identify returning patient by UHID or mobile, verify demographics, link to today\'s visit, avoid duplicate UHID creation.',
    steps:[
      { role:'Front Desk Staff', action:'Patient states name or presents UHID card.\nStaff searches HIS by UHID / mobile / name.\nVerifies identity: confirms name, DOB and address.\nRetrieves last visit summary.', response:'Record retrieved in < 2 seconds.\nLast visit date, treating doctor, department displayed.\nPending lab results or prescriptions flagged.\nVisit count and first registration date shown.' },
      { role:'Front Desk Staff', action:'Confirms or updates: address, mobile, emergency contact, insurance details.\nSelects today\'s department and doctor.\nIssues new OPD token for today\'s visit.', response:'Updated fields saved with change log (old value, new value, staff ID, timestamp).\nMobile number change triggers OTP verification.\nNew OPD token issued under same UHID.\nDoctor queue updated in real time.' },
    ]
  },
  { n:3,  name:'Duplicate UHID Detection & Merge',
    purpose:'Identify patients with multiple UHID records; merge into single UHID while preserving full clinical history.',
    steps:[
      { role:'Registration Supervisor', action:'Runs Duplicate Patient Report in HIS.\nHIS scans all records: name + DOB + mobile matches.\nReviews flagged pairs — High / Medium / Low confidence.\nSelects pair for review.', response:'Duplicate report shows match score per pair.\nBoth records displayed side by side: demographics, visits, billing.\nSupervisor can compare and decide action: Merge, Keep Separate, or Flag for Review.' },
      { role:'Registration Supervisor', action:'Selects Primary UHID (retained) and Secondary UHID (to retire).\nConfirms merge action.\nSystem merges all records.', response:'All clinical history, visits, billing from Secondary transferred to Primary.\nSecondary UHID retired — status set to Merged.\nAny scan of old UHID redirects to Primary UHID automatically.\nMerge event logged in audit trail with supervisor ID.' },
    ]
  },
  { n:4,  name:'Minor / Dependent Patient Registration',
    purpose:'Register patients below 18 or dependants; link guardian details; capture legal guardian relationship and consent.',
    steps:[
      { role:'Front Desk Staff', action:'Guardian presents child or dependent at counter.\nStaff opens New Patient Registration.\nEnters patient details.\nFlags as Minor (DOB auto-sets flag if age < 18).\nEnters guardian name, relationship, mobile and UHID (if existing patient).', response:'UHID issued to minor — separate from guardian UHID.\nMinor flag set on record — visible on all clinical screens.\nGuardian UHID linked — guardian can access patient records.\nPaediatric clinical protocols auto-activated.' },
      { role:'Front Desk Staff', action:'Prints consent form with guardian name and relationship pre-filled.\nExplains consent scope to guardian.\nGuardian signs consent.\nScans and attaches signed consent.', response:'Consent form shows: patient name, guardian name, relationship, hospital name, consent scope.\nSigned consent attached to patient record.\nIf guardian is not parent: legal document (court order) prompted and attached.' },
    ]
  },
  { n:5,  name:'OPD Appointment Booking (In-person)',
    purpose:'Book OPD appointments at counter against doctor availability; prevent double-booking; issue confirmed appointment slip.',
    steps:[
      { role:'Front Desk Staff', action:'Patient requests OPD appointment at counter.\nStaff opens Appointment Booking screen.\nSearches patient by UHID or registers new.\nSelects department, doctor, date and session.\nViews available slots — filled slots greyed out.\nSelects slot and confirms.', response:'Available slots shown from doctor schedule master.\nDouble-booking prevented — slot locked on selection.\nAppointment confirmed: appointment number generated.\nDoctor schedule updated in real time.' },
      { role:'Front Desk Staff', action:'HIS generates appointment slip automatically.\nStaff prints slip and hands to patient.', response:'Appointment slip: patient name, UHID, doctor, department, date, time, OPD room, appointment number.\nSMS confirmation sent to patient.\nSlip has QR code for quick check-in on day of visit.' },
    ]
  },
  { n:6,  name:'Online / Kiosk Appointment Booking',
    purpose:'Enable patients to book OPD appointments via hospital website, app or self-service kiosk without front desk involvement.',
    steps:[
      { role:'Patient / Kiosk', action:'Patient opens hospital website, app or kiosk.\nLogs in with mobile number and OTP.\nSelects department and doctor.\nViews available slots in real time.\nSelects slot and confirms.', response:'Online slots synced in real time with HIS — no stale data.\nBooking confirmed: appointment number generated.\nSMS + email confirmation sent immediately.\nAppointment visible in HIS front desk view.' },
      { role:'HIS (Automated)', action:'HIS sends reminders 24 hours and 2 hours before appointment.\nPatient can cancel or reschedule via link in SMS.', response:'Reminder: doctor name, date, time, OPD location and what to bring (ID, reports).\nCancellation via SMS link: slot released immediately for rebooking.\nNo-show marked automatically if patient does not check in within 30 min of slot.' },
    ]
  },
  { n:7,  name:'Appointment Cancellation & Rescheduling',
    purpose:'Process patient-initiated or hospital-initiated cancellations; release slots immediately; notify patients; track cancellation reasons.',
    steps:[
      { role:'Front Desk Staff', action:'Patient requests cancellation or reschedule at counter, phone or online link.\nStaff searches appointment by number or UHID.\nSelects appointment and chooses Cancel or Reschedule.\nRecords reason.', response:'Cancelled slot released immediately — available for other bookings.\nPatient notified via SMS: cancellation confirmed, reason.\nCancellation reason and staff ID logged.\nReschedule: new slot selection screen opens.' },
      { role:'HIS (Automated)', action:'Doctor or admin marks doctor as On Leave or Unavailable for a date.\nHIS identifies all affected appointments.', response:'All affected appointments listed within seconds.\nSMS sent to each patient: appointment cancelled, reason (doctor unavailable), request to rebook.\nSlots auto-released for other bookings.\nDoctor availability report updated.' },
    ]
  },
  { n:8,  name:'Walk-in Queue & Token Management',
    purpose:'Issue token numbers to walk-in patients; manage booked vs walk-in queues; display live queue on screens.',
    steps:[
      { role:'Front Desk Staff', action:'Walk-in patient arrives without appointment.\nStaff verifies UHID or registers new patient.\nSelects department and doctor.\nIssues OPD token.', response:'Token number issued sequentially per department per session.\nTwo queues maintained: Booked Appointment (priority) and Walk-in.\nToken printed and handed to patient.\nDoctor console updated — new token visible in queue.' },
      { role:'HIS Display System', action:'OPD display screens show live token queue.\nCalled token displayed with patient name and OPD room.\nDoctor calls next patient from console.', response:'Display fed by HIS in real time — no manual update.\nDoctor marks consultation complete — next token auto-called.\nSMS sent to patient when token is called.\nAverage wait time shown on display.' },
    ]
  },
  { n:9,  name:'Emergency Patient Registration',
    purpose:'Register critically ill patients with minimum data entry to avoid treatment delay; complete full registration retrospectively.',
    steps:[
      { role:'Emergency / Front Desk Staff', action:'Patient arrives in Emergency in critical condition.\nEmergency nurse opens Emergency Fast Registration screen.\nEnters only: name (or Unknown), age estimate, gender, triage level.\nClicks Register — UHID issued immediately.', response:'Emergency UHID issued in < 10 seconds.\nClinical care begins immediately — investigations, drugs, notes all under this UHID.\nEmergency flag and triage level visible on all screens.\nRegistration staff alerted to complete full details.' },
      { role:'Front Desk Staff', action:'Patient or guardian provides full identity details after stabilisation.\nStaff opens Emergency record and updates all missing fields.\nLinks insurance, ABHA and emergency contact.', response:'Emergency alias (Unknown Patient) replaced with real name across all records automatically.\nAll clinical entries made under Emergency UHID retained without re-entry.\nFull registration completion recorded in audit trail.' },
    ]
  },
  { n:10, name:'MLC (Medico-Legal Case) Registration',
    purpose:'Register medico-legal cases with mandatory police intimation, MLC number generation and tamper-proof documentation.',
    steps:[
      { role:'Emergency Doctor / Registration Staff', action:'Emergency doctor identifies case as MLC: RTA, assault, poisoning, burns, unnatural death.\nFlags case as MLC in HIS.\nEnters: MLC type, date and time of incident, place of incident, informant name.', response:'MLC flag activates restricted access mode — authorised clinical and medico-legal staff only.\nMLC number auto-generated: unique, sequential, year-prefixed.\nPolice intimation letter auto-generated with all captured details.\nMLC register entry created automatically.' },
      { role:'Registration Staff / MLC In-charge', action:'Staff reviews auto-generated police intimation letter.\nSends intimation to nearest police station.\nRecords police station name and acknowledgement number.', response:'Intimation submission recorded in HIS: method, time sent, acknowledgement received.\nMLC register updated: patient name, UHID, MLC number, intimation status.\nAll subsequent clinical entries timestamped and locked against editing after sign-off.' },
    ]
  },
  { n:11, name:'Planned Admission Registration',
    purpose:'Register patients for planned IPD admission; capture admission category, treating doctor and ward preference; collect advance payment.',
    steps:[
      { role:'Admission Desk Staff', action:'Patient arrives at Admission Desk with doctor\'s admission advice.\nStaff opens Planned Admission screen.\nSelects UHID, treating doctor, admission category (general / semi-private / private / ICU).\nCaptures diagnosis, ward preference and estimated stay.\nCollects advance payment.', response:'IP Number (admission number) auto-generated — unique per admission episode.\nBed allocation screen opens: shows available beds by category and ward.\nAdvance receipt generated.\nNurse station and ward desk notified of incoming patient.' },
      { role:'Admission Desk Staff', action:'Prints and obtains signature on: admission consent, financial consent, general terms.\nScans and attaches all signed documents.', response:'All consent documents attached to IP record in DMS.\nConsent completion status shown on admission dashboard — incomplete consents flagged.\nBilling pre-authorisation sent to TPA if insurance case.' },
    ]
  },
  { n:12, name:'Emergency-to-Ward Admission Transfer',
    purpose:'Convert an emergency episode to a formal IPD admission; transfer all emergency clinical data to IPD record; allocate ward bed.',
    steps:[
      { role:'Emergency Doctor / Admission Desk Staff', action:'Emergency doctor decides patient requires ward admission.\nOpens Admit to Ward option from Emergency record.\nSelects ward type, treating doctor and estimated stay.\nAdmission Desk allocates bed from availability screen.', response:'IP number generated and linked to existing Emergency UHID record.\nAll emergency clinical entries (vitals, drugs, notes) transferred to IPD record automatically.\nBed status updated to Occupied.\nWard nurse station notified.' },
      { role:'Ward / Admission Desk Staff', action:'Nurse prints transfer slip with IP number, ward, bed and diagnosis.\nPhysically shifts patient to allocated ward.\nDocuments clinical handover in HIS.', response:'Clinical handover documented: diagnosis, vitals, drugs given in Emergency, allergies, pending investigations.\nWard nursing workbench shows patient with full Emergency history.\nBilling switched from Emergency to IPD rate from time of transfer.' },
    ]
  },
];

// ── Open scenario flow modal ───────────────────────────────────────────────────
function regOpenScenario(n) {
  var sc = REG_SCENARIOS.find(function(s){ return s.n === n; });
  if (!sc) return;
  var demoBtn = (n===1||n===2||n===5||n===8)
    ? '<button onclick="document.getElementById(\'reg-sc-modal\').style.display=\'none\';navTo(\'' +
        (n===1?'patient-reg':n===2?'patient-reg':n===5?'appointments':'opd-queue') +
      '\')" style="background:#2563eb;color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Open Interactive Demo</button>'
    : '';
  var stepsHtml = sc.steps.map(function(st, i) {
    var actionLines = st.action.split('\n').map(function(l){ return l ? '<li style="margin-bottom:3px">'+l+'</li>' : ''; }).join('');
    var responseLines = st.response.split('\n').map(function(l){ return l ? '<li style="margin-bottom:3px">'+l+'</li>' : ''; }).join('');
    return '<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:0;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' +
      '<div style="background:#2563eb;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 14px;min-width:60px">' +
        '<div style="font-size:11px;font-weight:600;letter-spacing:.06em;opacity:.8;margin-bottom:4px">STEP</div>' +
        '<div style="font-size:22px;font-weight:800">'+(i+1)+'</div>' +
      '</div>' +
      '<div style="padding:14px 16px;border-right:1px solid #e2e8f0">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.06em;margin-bottom:6px">USER ACTION &nbsp;·&nbsp; <span style="color:#0891b2">'+st.role+'</span></div>' +
        '<ul style="margin:0;padding-left:16px;font-size:13px;color:#1e293b;line-height:1.6">'+actionLines+'</ul>' +
      '</div>' +
      '<div style="padding:14px 16px;background:#f8fafc">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.06em;margin-bottom:6px">HIS RESPONSE</div>' +
        '<ul style="margin:0;padding-left:16px;font-size:13px;color:#166534;line-height:1.6">'+responseLines+'</ul>' +
      '</div>' +
    '</div>';
  }).join('');

  document.getElementById('reg-sc-modal-title').textContent = 'Scenario ' + n + ' — ' + sc.name;
  document.getElementById('reg-sc-modal-purpose').textContent = sc.purpose;
  document.getElementById('reg-sc-modal-steps').innerHTML = stepsHtml;
  document.getElementById('reg-sc-modal-demo').innerHTML = demoBtn;
  document.getElementById('reg-sc-modal').style.display = 'flex';
}

// ── Registration & Front Desk — Scenarios Home ────────────────────────────────
function pageRegHome() {
  var colors = ['#0891b2','#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0284c7','#9333ea','#dc2626','#0d9488','#ca8a04','#6366f1'];
  var cats = {
    'Patient Master': [1,2,3,4],
    'Appointments': [5,6,7],
    'Queue & Token': [8],
    'Emergency & Admission': [9,10,11,12],
  };

  var catHtml = Object.keys(cats).map(function(cat) {
    var scNums = cats[cat];
    var cards = scNums.map(function(n) {
      var sc = REG_SCENARIOS.find(function(s){ return s.n === n; });
      var color = colors[n-1];
      var hasDemo = (n===1||n===2||n===5||n===8);
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;display:flex;gap:16px;align-items:flex-start;cursor:pointer;transition:box-shadow .15s" ' +
        'onmouseover="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,.08)\'" onmouseout="this.style.boxShadow=\'\'" onclick="regOpenScenario('+n+')">' +
        '<div style="width:44px;height:44px;border-radius:10px;background:'+color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex-shrink:0">'+n+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:4px">'+sc.name+'</div>' +
          '<div style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:10px">'+sc.purpose.slice(0,110)+(sc.purpose.length>110?'…':'')+'</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span style="font-size:11.5px;background:#f1f5f9;color:#475569;padding:2px 10px;border-radius:999px;font-weight:600">'+sc.steps.length+' steps</span>' +
            (hasDemo ? '<span style="font-size:11.5px;background:#eff6ff;color:#1d4ed8;padding:2px 10px;border-radius:999px;font-weight:600">Interactive demo</span>' : '') +
            '<span style="font-size:11.5px;color:#2563eb;font-weight:600;margin-left:auto">View Flow →</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div style="margin-bottom:28px">' +
      '<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">'+cat+'</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">'+cards+'</div>' +
    '</div>';
  }).join('');

  return pageHeader(
    'Registration &amp; Front Desk',
    'Scenarios Overview',
    '<span style="font-size:13px;color:#64748b">12 scenarios · Click any card to view the step-by-step flow</span>'
  ) +
  kpiCards([
    { label:'Total Scenarios', value:'12', color:'text-slate-700' },
    { label:'Patient Master',  value:'4',  color:'text-blue-700',   sub:'Reg, Returning, Duplicate, Minor' },
    { label:'Appointments',    value:'3',  color:'text-purple-700', sub:'In-person, Online, Cancel/Reschedule' },
    { label:'Emergency & IPD', value:'5',  color:'text-red-600',    sub:'Emergency, MLC, Admission, Transfer' },
  ]) +

  '<div style="max-width:960px">' + catHtml + '</div>' +

  // ── Scenario flow modal ──────────────────────────────────────────────────
  '<div id="reg-sc-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center" onclick="this.style.display=\'none\'">' +
  '  <div style="background:#fff;border-radius:16px;width:860px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.3)" onclick="event.stopPropagation()">' +
  '    <div style="padding:22px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:start;position:sticky;top:0;background:#fff;z-index:1">' +
  '      <div>' +
  '        <div id="reg-sc-modal-title" style="font-size:17px;font-weight:800;color:#0f172a"></div>' +
  '        <div id="reg-sc-modal-purpose" style="font-size:12.5px;color:#64748b;margin-top:4px;max-width:640px;line-height:1.5"></div>' +
  '      </div>' +
  '      <button onclick="document.getElementById(\'reg-sc-modal\').style.display=\'none\'" style="background:none;border:none;font-size:22px;color:#94a3b8;cursor:pointer;line-height:1;flex-shrink:0">&times;</button>' +
  '    </div>' +
  '    <div id="reg-sc-modal-steps" style="padding:20px 24px"></div>' +
  '    <div id="reg-sc-modal-demo" style="padding:0 24px 20px"></div>' +
  '  </div>' +
  '</div>';
}

// ── Shared demo data ─────────────────────────────────────────────────────────
var DEMO_PATIENTS = [
  { uhid:'HIS2600001', name:'Ramesh Kumar',   age:42, gender:'Male',   dob:'1983-03-12', mobile:'9876543210', blood:'B+',  dept:'General Medicine', doctor:'Dr. Anil Mehta',   token:'GEN-042', type:'OPD', payer:'Self',      status:'waiting',        reg:'09:10 AM', emergency:false, insurance:'', abha:'ABHA-1234-5678' },
  { uhid:'HIS2600002', name:'Sunita Patel',   age:35, gender:'Female', dob:'1990-07-22', mobile:'9812345678', blood:'A+',  dept:'Gynaecology',      doctor:'Dr. Priya Sharma', token:'GYN-017', type:'OPD', payer:'Insurance', status:'in-consultation', reg:'09:25 AM', emergency:false, insurance:'Star Health', abha:'' },
  { uhid:'HIS2600003', name:'Mohammed Iqbal', age:58, gender:'Male',   dob:'1967-11-05', mobile:'9900112233', blood:'O+',  dept:'Cardiology',       doctor:'Dr. Suresh Verma', token:'CAR-009', type:'OPD', payer:'CGHS',      status:'waiting',        reg:'09:40 AM', emergency:false, insurance:'CGHS', abha:'' },
  { uhid:'HIS2600004', name:'Kavita Desai',   age:29, gender:'Female', dob:'1996-02-18', mobile:'9988776655', blood:'AB+', dept:'Orthopaedics',     doctor:'Dr. Rajesh Nair',  token:'ORT-023', type:'OPD', payer:'Self',      status:'done',           reg:'08:55 AM', emergency:false, insurance:'', abha:'' },
  { uhid:'HIS2600005', name:'Arjun Singh',    age:67, gender:'Male',   dob:'1958-09-30', mobile:'9776655443', blood:'B-',  dept:'General Medicine', doctor:'Dr. Anil Mehta',   token:'GEN-043', type:'IPD', payer:'Self',      status:'admitted',       reg:'08:30 AM', emergency:true,  insurance:'', abha:'' },
];

var _regCounter = 6;
var _regStep = 1;
var _regNewUhid = '';
var _regNewToken = '';

// ── Registration global handlers ──────────────────────────────────────────────
function regToggle(v) {
  document.getElementById('reg-search-panel').style.display = v==='search' ? '' : 'none';
  document.getElementById('reg-new-panel').style.display    = v==='new'    ? '' : 'none';
  if (v === 'new') { _regStep = 1; regShowStep(1); }
}
function regShowStep(n) {
  _regStep = n;
  [1,2,3].forEach(function(i) {
    var p = document.getElementById('reg-step-' + i);
    if (p) p.style.display = i === n ? '' : 'none';
  });
  // update step bar
  var statuses = ['done','done','done'];
  statuses[n-1] = 'active';
  for (var i = n; i < 3; i++) statuses[i] = 'pending';
  var labels = ['Demographics','Identity Proof','UHID & Card'];
  var bar = document.getElementById('reg-step-bar');
  if (!bar) return;
  bar.innerHTML = labels.map(function(lbl, idx) {
    var s = statuses[idx];
    var circleClass = s==='done' ? 'step-done' : s==='active' ? 'step-active' : 'step-pending';
    var lineClass   = idx < labels.length-1 ? (s==='done' ? 'step-line-done' : 'step-line-pending') : '';
    var num = s==='done' ? '&#10003;' : (idx+1);
    return '<div style="display:flex;align-items:center;flex:1;' + (idx===labels.length-1?'flex:0':'') + '">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:6px">' +
        '<div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700" class="' + circleClass + '">' + num + '</div>' +
        '<div style="font-size:12px;font-weight:600;color:' + (s==='active'?'#2563eb':s==='done'?'#16a34a':'#94a3b8') + ';white-space:nowrap">' + lbl + '</div>' +
      '</div>' +
      (idx < labels.length-1 ? '<div style="flex:1;height:2px;margin:0 8px;margin-bottom:18px" class="' + lineClass + '"></div>' : '') +
    '</div>';
  }).join('');
}
function regCheckDuplicate() {
  var mobile = (document.getElementById('reg-mobile') || {}).value || '';
  var dob    = (document.getElementById('reg-dob')    || {}).value || '';
  var warn   = document.getElementById('reg-dup-warn');
  if (!warn) return;
  if (mobile.length === 10 && dob) {
    var match = DEMO_PATIENTS.find(function(p) { return p.mobile === mobile || p.dob === dob; });
    if (match) {
      warn.style.display = '';
      warn.innerHTML =
        '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 14px;display:flex;gap:12px;align-items:start">' +
          '<span style="font-size:18px">&#9888;</span>' +
          '<div>' +
            '<div style="font-weight:700;color:#92400e;font-size:13px">Possible Duplicate Detected</div>' +
            '<div style="font-size:12.5px;color:#78350f;margin-top:2px">Record found: <b>' + match.name + '</b> (' + match.uhid + ') · ' + match.mobile + ' · DOB: ' + match.dob + '</div>' +
            '<div style="margin-top:8px;display:flex;gap:8px">' +
              '<button onclick="regToggle(\'search\');document.getElementById(\'reg-search-inp\').value=\'' + match.mobile + '\';regSearch(\'' + match.mobile + '\')" style="font-size:12px;background:#f59e0b;color:#fff;border:none;border-radius:5px;padding:4px 12px;cursor:pointer;font-weight:600">View Existing Record</button>' +
              '<button onclick="document.getElementById(\'reg-dup-warn\').style.display=\'none\'" style="font-size:12px;background:none;border:1px solid #fcd34d;border-radius:5px;padding:4px 12px;cursor:pointer;color:#92400e;font-weight:600">Register as New</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      return;
    }
  }
  warn.style.display = 'none';
}
function regNext() {
  if (_regStep === 1) {
    var mobile = (document.getElementById('reg-mobile') || {}).value || '';
    var name   = (document.getElementById('reg-name')   || {}).value || '';
    var dob    = (document.getElementById('reg-dob')    || {}).value || '';
    if (!name || !mobile || !dob) { alert('Please fill Name, Date of Birth and Mobile Number (mandatory fields).'); return; }
    regShowStep(2);
  } else if (_regStep === 2) {
    var idType = document.getElementById('reg-id-type').value;
    var idNum  = document.getElementById('reg-id-num').value;
    var consent = document.getElementById('reg-consent');
    if (!idType || !idNum) { alert('Please select ID proof type and enter ID number.'); return; }
    if (!consent.checked) { alert('Patient consent is mandatory before registration.'); return; }
    // Generate UHID & token
    _regNewUhid  = 'HIS26' + String(_regCounter++).padStart(5,'0');
    var depts    = ['GEN','GYN','CAR','ORT','PAE','ENT'];
    _regNewToken = depts[Math.floor(Math.random()*depts.length)] + '-' + String(Math.floor(Math.random()*900)+100);
    var nameVal  = document.getElementById('reg-name').value || 'New Patient';
    var deptSel  = document.getElementById('reg-dept');
    var deptVal  = deptSel ? deptSel.value : 'General Medicine';
    var doctSel  = document.getElementById('reg-doctor');
    var doctVal  = doctSel ? doctSel.options[doctSel.selectedIndex].text : 'Dr. Anil Mehta';
    // Populate Step 3 card
    document.getElementById('reg-card-uhid').textContent  = _regNewUhid;
    document.getElementById('reg-card-name').textContent  = nameVal;
    document.getElementById('reg-card-token').textContent = _regNewToken;
    document.getElementById('reg-card-dept').textContent  = deptVal + ' · ' + doctVal;
    document.getElementById('reg-card-time').textContent  = 'Registered: ' + new Date().toLocaleTimeString('en-IN') + ' · By: ' + (typeof currentUser!=='undefined'&&currentUser?currentUser.name:'Staff');
    regShowStep(3);
  }
}
function regSearch(q) {
  var res = document.getElementById('reg-search-results');
  if (q.length < 3) { res.innerHTML = ''; return; }
  var matches = DEMO_PATIENTS.filter(p =>
    p.uhid.toLowerCase().includes(q.toLowerCase()) ||
    p.mobile.includes(q) ||
    p.name.toLowerCase().includes(q.toLowerCase())
  );
  if (!matches.length) { res.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px">No records found</div>'; return; }
  res.innerHTML = matches.map(p =>
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">' +
      '<div>' +
        '<div style="font-weight:700;color:#1e293b">' + p.name + ' <span style="font-family:monospace;font-size:12px;color:#64748b">' + p.uhid + '</span></div>' +
        '<div style="font-size:12.5px;color:#64748b;margin-top:2px">' + p.age + 'Y ' + p.gender + ' · ' + p.mobile + ' · ' + p.blood + ' · Last visit: Today</div>' +
        '<div style="font-size:12px;color:#94a3b8;margin-top:2px">' + p.dept + ' · ' + p.doctor + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn-outline" style="font-size:12.5px;padding:6px 14px" onclick="alert(\'Viewing record for ' + p.uhid + '\')">View Record</button>' +
        '<button class="btn-primary" style="font-size:12.5px;padding:6px 14px" onclick="regIssueToken(\'' + p.uhid + '\')">Issue Token</button>' +
      '</div>' +
    '</div>'
  ).join('');
}
function regIssueToken(uhid) {
  alert('Issuing new token for ' + uhid);
}
function regReset() {
  document.querySelectorAll('#reg-new-panel input:not([type=file]), #reg-new-panel select, #reg-new-panel textarea').forEach(function(el) {
    if (el.type === 'checkbox') { el.checked = false; return; }
    if (el.type !== 'button') el.value = el.defaultValue || '';
  });
  var warn = document.getElementById('reg-dup-warn');
  if (warn) warn.style.display = 'none';
}
function regTogglePayer(v) { /* expand insurance fields based on payer type */ }

// ── OPD Queue global handler ───────────────────────────────────────────────────
function opdCallPatient(uhid) {
  var rows = document.querySelectorAll('table tbody tr');
  rows.forEach(function(row) {
    if (row.textContent.includes(uhid)) {
      row.cells[4].innerHTML = '<span class="badge badge-yellow">In Consult</span>';
      row.cells[7].innerHTML = '<span style="color:#cbd5e1">—</span>';
    }
  });
}

// ── Appointment global state & handlers ───────────────────────────────────────
var _APT_DOCTORS = [
  { id:'D001', name:'Dr. Anil Mehta',   dept:'General Medicine', qual:'MD, MBBS',  fee:600  },
  { id:'D002', name:'Dr. Priya Sharma', dept:'Gynaecology',      qual:'MS, MBBS',  fee:700  },
  { id:'D003', name:'Dr. Suresh Verma', dept:'Cardiology',       qual:'DM, MD',    fee:1000 },
  { id:'D004', name:'Dr. Rajesh Nair',  dept:'Orthopaedics',     qual:'MS, MBBS',  fee:700  },
  { id:'D005', name:'Dr. Meena Joshi',  dept:'Paediatrics',      qual:'MD, MBBS',  fee:600  },
  { id:'D006', name:'Dr. Vinod Patel',  dept:'ENT',              qual:'MS, MBBS',  fee:600  },
];
var _APT_BOOKED = {
  'D001':['09:00','09:30','11:30'], 'D002':['10:30','11:00'],
  'D003':['10:00','10:30','12:00'], 'D004':['11:00','12:30'],
  'D005':[], 'D006':['09:30'],
};
var _APT_MORNING = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30'];
var _APT_EVENING = ['16:00','16:30','17:00','17:30','18:00','18:30'];
var _aptSession = 'Morning', _aptSlot = '', _aptDocId = '', _aptDocFee = 0, _aptPatient = null;

function aptToggleView(v) {
  document.getElementById('apt-book-panel').style.display = v === 'book' ? '' : 'none';
  document.getElementById('apt-list-panel').style.display = v === 'list' ? '' : 'none';
}
function aptSearch(q) {
  var wrap = document.getElementById('apt-search-results');
  if (q.length < 3) { wrap.style.display = 'none'; return; }
  var m = DEMO_PATIENTS.filter(function(p) {
    return p.uhid.toLowerCase().includes(q.toLowerCase()) || p.mobile.includes(q) || p.name.toLowerCase().includes(q.toLowerCase());
  });
  if (!m.length) { wrap.style.display = 'none'; return; }
  wrap.innerHTML = m.map(function(p) {
    return '<div onclick=\'aptSelectPatient(' + JSON.stringify(p) + ')\' style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13.5px" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">' +
      '<div style="font-weight:600;color:#1e293b">' + p.name + '</div>' +
      '<div style="font-size:12px;color:#94a3b8">' + p.uhid + ' · ' + p.mobile + '</div>' +
    '</div>';
  }).join('');
  wrap.style.display = 'block';
}
function aptSelectPatient(p) {
  _aptPatient = p;
  document.getElementById('apt-patient-search-wrap').style.display = 'none';
  document.getElementById('apt-patient-selected').style.display = '';
  document.getElementById('apt-pt-name').textContent = p.name;
  document.getElementById('apt-pt-meta').textContent = p.uhid + ' · ' + p.mobile + ' · ' + p.age + 'Y ' + p.gender;
  document.getElementById('apt-search-results').style.display = 'none';
  aptUpdateSummary();
}
function aptClearPatient() {
  _aptPatient = null;
  document.getElementById('apt-patient-search-wrap').style.display = '';
  document.getElementById('apt-patient-selected').style.display = 'none';
  document.getElementById('apt-search').value = '';
  aptUpdateSummary();
}
function aptFilterDoctors() {
  var dept = document.getElementById('apt-dept').value;
  var sel = document.getElementById('apt-doctor');
  Array.from(sel.options).forEach(function(o) {
    if (o.value === '') { o.style.display = ''; return; }
    o.style.display = (!dept || o.dataset.dept === dept) ? '' : 'none';
  });
  sel.value = ''; _aptDocId = ''; _aptDocFee = 0;
  document.getElementById('apt-doctor-info').style.display = 'none';
  aptRefreshSlots(); aptUpdateSummary();
}
function aptShowDoctorInfo() {
  var sel = document.getElementById('apt-doctor');
  var opt = sel.options[sel.selectedIndex];
  _aptDocId = opt.value; _aptDocFee = parseInt(opt.dataset.fee) || 0;
  var info = document.getElementById('apt-doctor-info');
  if (_aptDocId) { info.textContent = opt.dataset.qual + ' · Consultation fee: ₹' + opt.dataset.fee; info.style.display = ''; }
  else info.style.display = 'none';
  aptRefreshSlots(); aptUpdateSummary();
}
function aptSetSession(s) {
  _aptSession = s; _aptSlot = '';
  var mBtn = document.getElementById('apt-sess-morning');
  var eBtn = document.getElementById('apt-sess-evening');
  var act = { borderColor:'#f59e0b', background:'#fffbeb' };
  var inact = { borderColor:'#e2e8f0', background:'#f8fafc' };
  if (s === 'Morning') {
    Object.assign(mBtn.style, act); Object.assign(eBtn.style, inact);
    mBtn.children[0].style.color = '#92400e'; eBtn.children[0].style.color = '#475569';
  } else {
    Object.assign(eBtn.style, act); Object.assign(mBtn.style, inact);
    eBtn.children[0].style.color = '#92400e'; mBtn.children[0].style.color = '#475569';
  }
  aptRefreshSlots(); aptUpdateSummary();
}
function aptSelectSlot(s) { _aptSlot = (_aptSlot === s) ? '' : s; aptRefreshSlots(); aptUpdateSummary(); }
function aptRefreshSlots() {
  var grid = document.getElementById('apt-slot-grid');
  var label = document.getElementById('apt-slot-doctor-label');
  var cntEl = document.getElementById('apt-slot-count');
  if (!_aptDocId) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#cbd5e1;padding:32px 0;font-size:13px">Select a doctor first</div>';
    label.textContent = 'Select a department and doctor to view slots';
    cntEl.textContent = '';
    return;
  }
  var doc = _APT_DOCTORS.find(function(d) { return d.id === _aptDocId; });
  label.textContent = doc ? doc.name : '';
  var slots = _aptSession === 'Morning' ? _APT_MORNING : _APT_EVENING;
  var booked = _APT_BOOKED[_aptDocId] || [];
  var avail = 0;
  grid.innerHTML = slots.map(function(s) {
    var isBk = booked.includes(s), isSel = _aptSlot === s;
    if (!isBk) avail++;
    var bg  = isSel ? '#2563eb' : isBk ? '#f1f5f9' : '#f0fdf4';
    var clr = isSel ? '#fff'    : isBk ? '#94a3b8' : '#166534';
    var bdr = isSel ? '2px solid #2563eb' : isBk ? '1px solid #e2e8f0' : '1px solid #86efac';
    var cur = isBk ? 'not-allowed' : 'pointer';
    var sub = isBk ? '<div style="font-size:10.5px;margin-top:2px;opacity:.6">Booked</div>' : '';
    var clk = isBk ? '' : 'onclick="aptSelectSlot(\'' + s + '\')"';
    return '<div ' + clk + ' style="padding:12px;border-radius:8px;background:' + bg + ';color:' + clr + ';border:' + bdr + ';cursor:' + cur + ';text-align:center;font-weight:600;font-size:13.5px;transition:all .15s">' + s + sub + '</div>';
  }).join('');
  cntEl.textContent = avail + ' slots available';
}
function aptUpdateSummary() {
  var empty  = document.getElementById('apt-summary-empty');
  var filled = document.getElementById('apt-summary-filled');
  var docSel = document.getElementById('apt-doctor');
  var docName = docSel && docSel.value ? docSel.options[docSel.selectedIndex].text.split(' — ')[0] : '';
  var dept    = document.getElementById('apt-dept')  ? document.getElementById('apt-dept').value  : '';
  var dateVal = document.getElementById('apt-date')  ? document.getElementById('apt-date').value  : '';
  if (!_aptPatient || !_aptDocId || !_aptSlot) { empty.style.display = ''; filled.style.display = 'none'; return; }
  empty.style.display = 'none'; filled.style.display = '';
  document.getElementById('sum-patient').textContent = _aptPatient.name + ' (' + _aptPatient.uhid + ')';
  document.getElementById('sum-doctor').textContent  = docName;
  document.getElementById('sum-dept').textContent    = dept;
  var d = new Date(dateVal + 'T00:00:00');
  document.getElementById('sum-date').textContent = d.toLocaleDateString('en-IN', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
  document.getElementById('sum-time').textContent = _aptSlot + ' (' + _aptSession + ')';
  document.getElementById('sum-fee').textContent  = '₹' + _aptDocFee;
}
function aptConfirm() {
  if (!_aptPatient || !_aptDocId || !_aptSlot) return;
  var docSel  = document.getElementById('apt-doctor');
  var docName = docSel.options[docSel.selectedIndex].text.split(' — ')[0];
  var dept    = document.getElementById('apt-dept').value;
  var dateVal = document.getElementById('apt-date').value;
  var d = new Date(dateVal + 'T00:00:00');
  var aptNo = 'APT/26/' + String(Math.floor(Math.random() * 9000) + 1000);
  if (!_APT_BOOKED[_aptDocId]) _APT_BOOKED[_aptDocId] = [];
  _APT_BOOKED[_aptDocId].push(_aptSlot);
  aptRefreshSlots();
  document.getElementById('apt-slip-content').innerHTML =
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Appointment No.</span><span style="font-family:monospace;font-weight:700;color:#2563eb">' + aptNo + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Patient</span><span style="font-weight:600">' + _aptPatient.name + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">UHID</span><span style="font-family:monospace">' + _aptPatient.uhid + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Doctor</span><span style="font-weight:600">' + docName + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Department</span><span>' + dept + '</span></div>' +
    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Date</span><span style="font-weight:600">' + d.toLocaleDateString('en-IN', {weekday:'short',day:'numeric',month:'short',year:'numeric'}) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Time</span><span style="font-weight:700;color:#2563eb;font-size:15px">' + _aptSlot + ' (' + _aptSession + ')</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span style="color:#64748b">Consultation Fee</span><span style="font-weight:700;color:#16a34a">₹' + _aptDocFee + '</span></div>';
  document.getElementById('apt-slip-modal').style.display = 'flex';
  _aptSlot = ''; _aptPatient = null; aptClearPatient(); aptUpdateSummary();
}
function aptCancel(btn, aptNo) {
  if (!confirm('Cancel appointment ' + aptNo + '?')) return;
  var row = btn.closest('tr');
  row.cells[6].innerHTML = '<span class="badge badge-red">Cancelled</span>';
  row.cells[7].innerHTML = '<span style="color:#cbd5e1">—</span>';
}

// ─── SCENARIO 1 — NEW PATIENT WALK-IN REGISTRATION (3-step wizard) ───────────
function pagePatientReg() {
  var today = new Date().toISOString().split('T')[0];

  return pageHeader(
    'New Patient Walk-in Registration',
    'Registration &amp; Front Desk <span>›</span> Patient Registration',
    '<button class="btn-outline" onclick="regToggle(\'search\')">Returning Patient</button>' +
    ' <button class="btn-primary" onclick="regToggle(\'new\')">+ New Patient</button>'
  ) +

  // ── Returning patient search ──────────────────────────────────────────────
  '<div id="reg-search-panel" style="display:none">' +
  sectionCard('Returning Patient — Search & Re-check-in',
    '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end">' +
      '<div><label class="form-label">UHID / Mobile / Name</label>' +
        '<input id="reg-search-inp" class="form-input" placeholder="HIS26..., 98765..., Ramesh..." oninput="regSearch(this.value)"></div>' +
      '<div><label class="form-label">Scan UHID card (QR / barcode)</label>' +
        '<input class="form-input" placeholder="Place cursor here and scan"></div>' +
      '<button class="btn-primary" style="height:38px">Search</button>' +
    '</div>' +
    '<div id="reg-search-results" style="margin-top:12px"></div>'
  ) + '</div>' +

  // ── New patient wizard ────────────────────────────────────────────────────
  '<div id="reg-new-panel">' +

  // Dynamic step bar (rendered by regShowStep)
  '<div id="reg-step-bar" style="display:flex;align-items:center;justify-content:center;padding:20px 0 24px;gap:0"></div>' +

  // ── STEP 1: Demographics ─────────────────────────────────────────────────
  '<div id="reg-step-1">' +
  sectionCard('Step 1 — Patient Demographics',
    '<div id="reg-dup-warn" style="display:none;margin-bottom:14px"></div>' +
    formRow(
      formField('Full Name <small style="color:#64748b;font-weight:400">(as per govt. ID)</small>', '<input id="reg-name" class="form-input" placeholder="e.g. Ramesh Kumar" oninput="regCheckDuplicate()">', true),
      formField('Date of Birth', '<input id="reg-dob" type="date" class="form-input" max="' + today + '" oninput="regCheckDuplicate()">', true),
      formField('Age (auto)', '<input class="form-input" placeholder="Auto-calculated" readonly>')
    ) +
    formRow(
      formField('Gender', '<select class="form-select"><option>Male</option><option>Female</option><option>Other</option></select>', true),
      formField('Blood Group', '<select class="form-select"><option value="">Unknown</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select>'),
      formField('Marital Status', '<select class="form-select"><option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option></select>')
    ) +
    formRow(
      formField('Mobile Number', '<input id="reg-mobile" class="form-input" placeholder="10-digit mobile" maxlength="10" oninput="regCheckDuplicate()">', true),
      formField('Emergency Contact Name', inp('Guardian / Spouse')),
      formField('Emergency Contact No.', inp('Mobile'))
    ) +
    formRow(
      formField('Address', inp('House No., Street, Area')),
      formField('City', inp('City'), true),
      formField('PIN Code', inp('6-digit PIN'))
    ) +
    formRow(
      formField('Religion', '<select class="form-select"><option>Hindu</option><option>Muslim</option><option>Christian</option><option>Sikh</option><option>Other</option></select>'),
      formField('Nationality', '<input class="form-input" value="Indian">'),
      formField('Occupation', inp('e.g. Farmer, Teacher'))
    ) +
    '<hr style="border:none;border-top:1px solid #f1f5f9;margin:16px 0">' +
    formRow(
      formField('Patient Type', '<select id="reg-payer" class="form-select"><option>Self Pay</option><option>Insurance / TPA</option><option>CGHS</option><option>ECHS</option><option>PMJAY</option><option>Corporate</option></select>', true),
      formField('Insurance / TPA Company', inp('e.g. Star Health, Medi-Assist')),
      formField('Policy / Card Number', inp('Policy No.'))
    ) +
    formRow(
      formField('ABHA ID', inp('XX-XXXX-XXXX-XXXX (optional)')),
      formField('Referred By', inp('Doctor / Hospital name')),
      formField('Visit Type', '<select class="form-select"><option>OPD</option><option>IPD</option><option>Emergency</option><option>Day Care</option></select>')
    ) +
    '<hr style="border:none;border-top:1px solid #f1f5f9;margin:16px 0">' +
    formRow(
      formField('Department', '<select id="reg-dept" class="form-select"><option>General Medicine</option><option>Gynaecology</option><option>Cardiology</option><option>Orthopaedics</option><option>Paediatrics</option><option>ENT</option><option>Dermatology</option><option>Ophthalmology</option></select>', true),
      formField('Doctor', '<select id="reg-doctor" class="form-select"><option>Dr. Anil Mehta</option><option>Dr. Priya Sharma</option><option>Dr. Suresh Verma</option><option>Dr. Rajesh Nair</option><option>Dr. Meena Joshi</option></select>', true),
      formField('Chief Complaint', inp('e.g. Fever, Chest Pain'))
    ),
    '<div style="display:flex;gap:8px">' +
    '  <button class="btn-outline" onclick="regReset()">Reset</button>' +
    '  <button class="btn-primary" onclick="regNext()">Next: Identity Proof →</button>' +
    '</div>'
  ) +
  '</div>' +

  // ── STEP 2: Identity Proof + Consent ─────────────────────────────────────
  '<div id="reg-step-2" style="display:none">' +
  sectionCard('Step 2 — Identity Proof &amp; Consent',
    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#1d4ed8">' +
      '<b>Note:</b> As per hospital policy, a government-issued photo ID is mandatory for all new registrations. Aadhaar number will be masked — only last 4 digits displayed (UIDAI compliance).' +
    '</div>' +
    formRow(
      formField('ID Proof Type', '<select id="reg-id-type" class="form-select"><option value="">Select ID type</option><option>Aadhaar Card</option><option>PAN Card</option><option>Passport</option><option>Driving Licence</option><option>Voter ID</option><option>CGHS Card</option></select>', true),
      formField('ID Number', '<input id="reg-id-num" class="form-input" placeholder="Enter ID number">', true),
      formField('Upload Scan / Photo', '<input type="file" class="form-input" accept="image/*,.pdf" style="padding:5px">')
    ) +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:8px">' +
      '<div style="font-weight:600;font-size:13.5px;color:#1e293b;margin-bottom:12px">Patient / Guardian Consent</div>' +
      '<div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:14px">' +
        'I hereby consent to the collection and processing of my personal and medical information for the purpose of receiving healthcare services at this hospital. ' +
        'I authorise the hospital staff to access my records as necessary for my treatment.' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13.5px;font-weight:600;color:#1e293b">' +
        '<input id="reg-consent" type="checkbox" style="width:16px;height:16px;cursor:pointer"> ' +
        'Patient / Guardian has given verbal consent and signed the consent form' +
      '</label>' +
    '</div>' +
    '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;margin-top:14px;font-size:12.5px;color:#166534">' +
      '&#10003; SMS will be sent to patient with UHID number, hospital helpline and appointment details upon registration.' +
    '</div>',
    '<div style="display:flex;gap:8px">' +
    '  <button class="btn-outline" onclick="regShowStep(1)">← Back</button>' +
    '  <button class="btn-primary" onclick="regNext()">Register &amp; Generate UHID →</button>' +
    '</div>'
  ) +
  '</div>' +

  // ── STEP 3: UHID Card ─────────────────────────────────────────────────────
  '<div id="reg-step-3" style="display:none">' +
  '<div style="max-width:680px;margin:0 auto">' +
  '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px">' +
    '<div style="width:44px;height:44px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0">&#10003;</div>' +
    '<div>' +
      '<div style="font-weight:700;font-size:15px;color:#15803d">Patient Registered Successfully</div>' +
      '<div style="font-size:13px;color:#166534;margin-top:2px">UHID issued · OPD token generated · SMS sent to patient</div>' +
    '</div>' +
  '</div>' +

  // UHID Card mock
  '<div style="background:linear-gradient(135deg,#0d1f33 0%,#1e3a5f 100%);border-radius:16px;padding:24px 28px;color:#fff;margin-bottom:20px;position:relative;overflow:hidden">' +
    '<div style="position:absolute;right:-20px;top:-20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.05)"></div>' +
    '<div style="position:absolute;right:40px;bottom:-30px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.04)"></div>' +
    '<div style="font-size:11px;font-weight:600;letter-spacing:.1em;color:#94a3b8;margin-bottom:14px">HOSPITAL INFORMATION SYSTEM — PATIENT CARD</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:start">' +
      '<div>' +
        '<div id="reg-card-name" style="font-size:20px;font-weight:800;letter-spacing:.02em;margin-bottom:6px"></div>' +
        '<div style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:.08em">UHID</div>' +
        '<div id="reg-card-uhid" style="font-size:26px;font-weight:800;font-family:monospace;color:#60a5fa;letter-spacing:.05em"></div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:8px;padding:10px;text-align:center">' +
        '<div style="display:grid;grid-template-columns:repeat(5,8px);gap:2px;margin-bottom:4px">' +
          Array(25).fill(0).map(function(){ return '<div style="width:8px;height:8px;background:' + (Math.random()>.5?'#000':'#fff') + ';border:1px solid #ddd"></div>'; }).join('') +
        '</div>' +
        '<div style="font-size:9px;color:#374151;font-weight:700">SCAN AT DESK</div>' +
      '</div>' +
    '</div>' +
    '<div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;align-items:end">' +
      '<div>' +
        '<div style="font-size:11px;color:#94a3b8">OPD TOKEN</div>' +
        '<div id="reg-card-token" style="font-size:18px;font-weight:800;font-family:monospace;color:#34d399"></div>' +
        '<div id="reg-card-dept"  style="font-size:11.5px;color:#94a3b8;margin-top:2px"></div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div id="reg-card-time" style="font-size:11px;color:#64748b"></div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' +
    '<button class="btn-primary" style="justify-content:center;padding:11px" onclick="window.print()">Print UHID Card</button>' +
    '<button class="btn-outline" style="justify-content:center;padding:11px" onclick="navTo(\'opd-queue\')">Go to OPD Queue</button>' +
    '<button class="btn-outline" style="justify-content:center;padding:11px" onclick="regReset();regToggle(\'new\')">Register Next Patient</button>' +
  '</div>' +
  '</div>' +
  '</div>' +

  '</div>'; // end reg-new-panel
}

// ─── SCREEN 1 — OPD QUEUE & CHECK-IN ─────────────────────────────────────────

var OPD_QUEUE = [
  { uhid:'HIS2600005', name:'Arjun Singh',    age:67, gender:'Male',   token:'GEN-043', dept:'General Medicine', doctor:'Dr. Anil Mehta',   docId:'D001', status:'vitals',         payer:'Self',      reg:'08:30 AM', priority:['senior','emergency'], type:'walkin',      apt:'' },
  { uhid:'HIS2600001', name:'Ramesh Kumar',   age:42, gender:'Male',   token:'GEN-042', dept:'General Medicine', doctor:'Dr. Anil Mehta',   docId:'D001', status:'waiting',        payer:'Self',      reg:'09:10 AM', priority:[],                    type:'walkin',      apt:'' },
  { uhid:'HIS2600002', name:'Sunita Patel',   age:35, gender:'Female', token:'GYN-017', dept:'Gynaecology',      doctor:'Dr. Priya Sharma', docId:'D002', status:'in-consultation',payer:'Insurance', reg:'09:25 AM', priority:['pregnant'],           type:'appointment', apt:'APT/26/0003' },
  { uhid:'HIS2600003', name:'Mohammed Iqbal', age:58, gender:'Male',   token:'CAR-009', dept:'Cardiology',       doctor:'Dr. Suresh Verma', docId:'D003', status:'waiting',        payer:'CGHS',      reg:'09:40 AM', priority:['senior'],             type:'appointment', apt:'APT/26/0002' },
  { uhid:'HIS2600004', name:'Kavita Desai',   age:29, gender:'Female', token:'ORT-023', dept:'Orthopaedics',     doctor:'Dr. Rajesh Nair',  docId:'D004', status:'done',           payer:'Self',      reg:'08:55 AM', priority:[],                    type:'walkin',      apt:'' },
  { uhid:'HIS2600006', name:'Priya Nair',     age:32, gender:'Female', token:'GYN-018', dept:'Gynaecology',      doctor:'Dr. Priya Sharma', docId:'D002', status:'waiting',        payer:'Self',      reg:'10:05 AM', priority:['pregnant'],           type:'appointment', apt:'APT/26/0007' },
  { uhid:'HIS2600007', name:'Ravi Kumar',     age:45, gender:'Male',   token:'GEN-044', dept:'General Medicine', doctor:'Dr. Anil Mehta',   docId:'D001', status:'waiting',        payer:'PMJAY',     reg:'10:10 AM', priority:[],                    type:'walkin',      apt:'' },
  { uhid:'HIS2600008', name:'Geeta Sharma',   age:71, gender:'Female', token:'ORT-024', dept:'Orthopaedics',     doctor:'Dr. Rajesh Nair',  docId:'D004', status:'waiting',        payer:'Self',      reg:'10:15 AM', priority:['senior','disabled'],  type:'walkin',      apt:'' },
];

var _oqFilter   = 'all';
var _oqWalkCtr  = 45;
var _oqCheckinPt = null;

// Priority sort: emergency > pregnant > senior/disabled > regular; within same priority: status order
function oqPriorityScore(p) {
  var s = p.priority.includes('emergency') ? 0 : p.priority.includes('pregnant') ? 1 : (p.priority.includes('senior')||p.priority.includes('disabled')) ? 2 : 3;
  var st = p.status==='vitals'?0:p.status==='waiting'?1:p.status==='in-consultation'?2:p.status==='done'?3:4;
  return s * 10 + st;
}

function oqTab(t) {
  _oqFilter = t;
  ['all','appointment','walkin'].forEach(function(id) {
    var btn = document.getElementById('oq-tab-' + id);
    if (!btn) return;
    btn.style.background = id===t ? '#2563eb' : '#f8fafc';
    btn.style.color       = id===t ? '#fff'    : '#374151';
    btn.style.borderColor = id===t ? '#2563eb' : '#e2e8f0';
  });
  oqRenderQueue();
}

function oqRenderQueue() {
  var list = OPD_QUEUE.slice().sort(function(a,b){ return oqPriorityScore(a)-oqPriorityScore(b); });
  if (_oqFilter === 'appointment') list = list.filter(function(p){ return p.type==='appointment'; });
  if (_oqFilter === 'walkin')      list = list.filter(function(p){ return p.type==='walkin'; });

  var waiting=0, vitals=0, consult=0, done=0, noshow=0;
  OPD_QUEUE.forEach(function(p){
    if(p.status==='waiting') waiting++;
    else if(p.status==='vitals') vitals++;
    else if(p.status==='in-consultation') consult++;
    else if(p.status==='done') done++;
    else if(p.status==='no-show') noshow++;
  });
  // update KPIs
  var kpiEl = document.getElementById('oq-kpi-row');
  if (kpiEl) {
    kpiEl.innerHTML = [
      {label:'Waiting',       value:waiting, color:'#1d4ed8', bg:'#eff6ff'},
      {label:'In Vitals',     value:vitals,  color:'#7c3aed', bg:'#f5f3ff'},
      {label:'In Consultation',value:consult,color:'#b45309', bg:'#fffbeb'},
      {label:'Completed',     value:done,    color:'#15803d', bg:'#f0fdf4'},
      {label:'No-show',       value:noshow,  color:'#b91c1c', bg:'#fef2f2'},
      {label:'Total Today',   value:OPD_QUEUE.length, color:'#334155', bg:'#f8fafc'},
    ].map(function(k){
      return '<div style="background:'+k.bg+';border-radius:10px;padding:14px 18px;text-align:center;flex:1">' +
        '<div style="font-size:26px;font-weight:800;color:'+k.color+'">'+k.value+'</div>' +
        '<div style="font-size:12px;color:#64748b;margin-top:2px">'+k.label+'</div>' +
      '</div>';
    }).join('');
  }

  // priority flag chips
  var pfChip = function(flags) {
    return flags.map(function(f){
      var map = {emergency:'#dc2626',pregnant:'#db2777',senior:'#ca8a04',disabled:'#0891b2'};
      var label = {emergency:'EMRG',pregnant:'PREG',senior:'SR.CTZN',disabled:'DISB'};
      return '<span style="font-size:10px;font-weight:700;background:'+map[f]+';color:#fff;padding:1px 5px;border-radius:3px;margin-right:2px">'+label[f]+'</span>';
    }).join('');
  };

  // wait estimate (position among waiting for same doctor × 10 min)
  var waitEst = function(p) {
    if (p.status!=='waiting') return '—';
    var pos = OPD_QUEUE.filter(function(x){ return x.docId===p.docId && (x.status==='waiting'||x.status==='vitals'); }).sort(function(a,b){return oqPriorityScore(a)-oqPriorityScore(b);}).findIndex(function(x){return x.uhid===p.uhid;});
    return '~' + ((pos+1)*10) + ' min';
  };

  var statusMap = {
    'waiting':         '<span style="background:#eff6ff;color:#1d4ed8;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">Waiting</span>',
    'vitals':          '<span style="background:#f5f3ff;color:#7c3aed;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">In Vitals</span>',
    'in-consultation': '<span style="background:#fffbeb;color:#b45309;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">Consulting</span>',
    'done':            '<span style="background:#f0fdf4;color:#15803d;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">Done</span>',
    'no-show':         '<span style="background:#fef2f2;color:#b91c1c;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">No-show</span>',
  };

  var actionBtns = function(p) {
    var b = function(label, fn, color) {
      return '<button onclick="'+fn+'(\''+p.uhid+'\')" style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:5px;cursor:pointer;border:1px solid '+color+';color:'+color+';background:#fff;margin-right:4px">'+label+'</button>';
    };
    if (p.status==='waiting')         return b('Send to Vitals','oqSendVitals','#7c3aed') + b('No-show','oqNoShow','#dc2626') + b('Reassign','oqReassign','#64748b');
    if (p.status==='vitals')          return b('Call In','oqCallIn','#2563eb') + b('No-show','oqNoShow','#dc2626');
    if (p.status==='in-consultation') return '<span style="color:#cbd5e1;font-size:12px">In session</span>';
    if (p.status==='done')            return '<span style="color:#cbd5e1;font-size:12px">Completed</span>';
    if (p.status==='no-show')         return b('Restore','oqRestore','#ca8a04');
    return '—';
  };

  var rows = list.map(function(p) {
    var typeTag = p.type==='appointment'
      ? '<span style="font-size:10px;background:#eff6ff;color:#1d4ed8;padding:1px 5px;border-radius:3px;font-weight:700">APT</span>'
      : '<span style="font-size:10px;background:#f1f5f9;color:#475569;padding:1px 5px;border-radius:3px;font-weight:700">W-IN</span>';
    return '<tr style="border-bottom:1px solid #f1f5f9">' +
      '<td style="padding:10px 12px;font-family:monospace;font-weight:800;font-size:14px;color:'+(p.priority.includes('emergency')?'#dc2626':'#2563eb')+'">'+p.token+'</td>' +
      '<td style="padding:10px 12px">' +
        '<div style="font-weight:600;color:#1e293b;font-size:13.5px">'+p.name+' '+pfChip(p.priority)+'</div>' +
        '<div style="font-size:11.5px;color:#94a3b8;margin-top:1px">'+p.uhid+' · '+p.age+'Y '+p.gender+' · '+typeTag+'</div>' +
      '</td>' +
      '<td style="padding:10px 12px;font-size:13px"><div style="font-weight:600;color:#374151">'+p.doctor.split(' ').slice(0,2).join(' ')+'</div><div style="font-size:11.5px;color:#94a3b8">'+p.dept+'</div></td>' +
      '<td style="padding:10px 12px">'+(statusMap[p.status]||badge(p.status,'gray'))+'</td>' +
      '<td style="padding:10px 12px;font-size:12.5px;color:#64748b">'+waitEst(p)+'</td>' +
      '<td style="padding:10px 12px;font-size:12.5px;color:#475569">'+p.payer+'</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#94a3b8">'+p.reg+'</td>' +
      '<td style="padding:10px 12px;white-space:nowrap">'+actionBtns(p)+'</td>' +
    '</tr>';
  }).join('');

  var tbody = document.getElementById('oq-tbody');
  if (tbody) tbody.innerHTML = rows || '<tr><td colspan="8" style="text-align:center;padding:32px;color:#94a3b8;font-size:13px">No patients in queue</td></tr>';

  oqRenderWorkload();
  oqRenderDisplayBoard();
}

function oqRenderWorkload() {
  var el = document.getElementById('oq-workload');
  if (!el) return;
  var doctors = [
    {id:'D001',name:'Dr. Anil Mehta',   dept:'Gen. Medicine'},
    {id:'D002',name:'Dr. Priya Sharma', dept:'Gynaecology'},
    {id:'D003',name:'Dr. Suresh Verma', dept:'Cardiology'},
    {id:'D004',name:'Dr. Rajesh Nair',  dept:'Orthopaedics'},
    {id:'D005',name:'Dr. Meena Joshi',  dept:'Paediatrics'},
  ];
  el.innerHTML = doctors.map(function(d) {
    var pts = OPD_QUEUE.filter(function(p){ return p.docId===d.id; });
    var w=0,v=0,c=0,dn=0;
    pts.forEach(function(p){ if(p.status==='waiting')w++; else if(p.status==='vitals')v++; else if(p.status==='in-consultation')c++; else if(p.status==='done')dn++; });
    var total = w+v+c+dn;
    var max = 8;
    return '<div style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
        '<div><div style="font-size:13px;font-weight:600;color:#1e293b">'+d.name+'</div><div style="font-size:11px;color:#94a3b8">'+d.dept+'</div></div>' +
        '<div style="font-size:12px;color:#64748b">'+total+' / '+max+'</div>' +
      '</div>' +
      '<div style="height:8px;background:#f1f5f9;border-radius:999px;overflow:hidden;display:flex">' +
        (c ?  '<div style="background:#f59e0b;width:'+(c/max*100)+'%;transition:.3s"></div>'  : '') +
        (v ?  '<div style="background:#7c3aed;width:'+(v/max*100)+'%;transition:.3s"></div>'  : '') +
        (w ?  '<div style="background:#2563eb;width:'+(w/max*100)+'%;transition:.3s"></div>'  : '') +
        (dn ? '<div style="background:#16a34a;width:'+(dn/max*100)+'%;transition:.3s"></div>' : '') +
      '</div>' +
      '<div style="display:flex;gap:12px;margin-top:3px;font-size:10.5px;color:#94a3b8">' +
        (c  ? '<span style="color:#b45309">&#9632; '+c+' consulting</span>' : '') +
        (v  ? '<span style="color:#7c3aed">&#9632; '+v+' vitals</span>'    : '') +
        (w  ? '<span style="color:#2563eb">&#9632; '+w+' waiting</span>'   : '') +
        (dn ? '<span style="color:#16a34a">&#9632; '+dn+' done</span>'     : '') +
        (!total ? '<span>No patients</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function oqRenderDisplayBoard() {
  var el = document.getElementById('oq-display-board');
  if (!el) return;
  var calling = OPD_QUEUE.filter(function(p){ return p.status==='in-consultation'; });
  var next    = OPD_QUEUE.filter(function(p){ return p.status==='vitals'||p.status==='waiting'; })
                  .sort(function(a,b){ return oqPriorityScore(a)-oqPriorityScore(b); }).slice(0,3);
  var now = calling.length ? calling[0] : null;
  el.innerHTML =
    '<div style="background:#0a1628;border-radius:10px;padding:18px;font-family:monospace;min-height:160px">' +
      '<div style="font-size:10px;color:#475569;letter-spacing:.12em;margin-bottom:12px">OPD DISPLAY BOARD — LIVE PREVIEW</div>' +
      (now
        ? '<div style="text-align:center;margin-bottom:14px">' +
            '<div style="font-size:11px;color:#94a3b8;letter-spacing:.1em;margin-bottom:4px">NOW CALLING</div>' +
            '<div style="font-size:32px;font-weight:900;color:#34d399;letter-spacing:.05em">'+now.token+'</div>' +
            '<div style="font-size:12px;color:#60a5fa;margin-top:4px">'+now.name+' &rarr; '+now.dept+'</div>' +
          '</div>'
        : '<div style="text-align:center;color:#475569;font-size:13px;padding:16px 0">— No patient being called —</div>'
      ) +
      (next.length
        ? '<div style="border-top:1px solid #1e3a5f;padding-top:10px">' +
            '<div style="font-size:10px;color:#475569;letter-spacing:.1em;margin-bottom:6px">NEXT IN QUEUE</div>' +
            next.map(function(p,i){
              return '<div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:4px">' +
                '<span style="color:#fbbf24;font-weight:700">'+(i+1)+'. '+p.token+'</span><span>'+p.name+'</span>' +
              '</div>';
            }).join('') +
          '</div>'
        : '') +
    '</div>';
}

// Queue action handlers
function oqSendVitals(uhid) {
  var p = OPD_QUEUE.find(function(x){ return x.uhid===uhid; });
  if (p) { p.status = 'vitals'; oqRenderQueue(); }
}
function oqCallIn(uhid) {
  var p = OPD_QUEUE.find(function(x){ return x.uhid===uhid; });
  if (p) { p.status = 'in-consultation'; oqRenderQueue(); }
}
function oqNoShow(uhid) {
  var p = OPD_QUEUE.find(function(x){ return x.uhid===uhid; });
  if (p && confirm('Mark ' + p.name + ' as No-show?')) { p.status = 'no-show'; oqRenderQueue(); }
}
function oqRestore(uhid) {
  var p = OPD_QUEUE.find(function(x){ return x.uhid===uhid; });
  if (p) { p.status = 'waiting'; oqRenderQueue(); }
}
function oqReassign(uhid) {
  var p = OPD_QUEUE.find(function(x){ return x.uhid===uhid; });
  if (!p) return;
  var newDoc = prompt('Reassign to doctor:\nD001 Dr. Anil Mehta (Gen Medicine)\nD002 Dr. Priya Sharma (Gynae)\nD003 Dr. Suresh Verma (Cardiology)\nD004 Dr. Rajesh Nair (Ortho)\nD005 Dr. Meena Joshi (Paeds)\n\nEnter Doctor ID:');
  if (!newDoc) return;
  var doc = _APT_DOCTORS.find(function(d){ return d.id===newDoc.trim(); });
  if (!doc) { alert('Doctor not found.'); return; }
  p.docId = doc.id; p.doctor = doc.name; p.dept = doc.dept;
  oqRenderQueue();
}

// Check-in handlers
function oqCheckinSearch(q) {
  var box = document.getElementById('oq-checkin-results');
  if (q.length < 2) { box.style.display = 'none'; return; }
  var m = _AM_APTS.filter(function(a){
    return a.status==='booked' && (a.patient.toLowerCase().includes(q.toLowerCase()) || a.uhid.toLowerCase().includes(q.toLowerCase()) || a.no.toLowerCase().includes(q.toLowerCase()));
  });
  if (!m.length) { box.innerHTML='<div style="padding:10px;font-size:13px;color:#94a3b8">No pending appointments found</div>'; box.style.display='block'; return; }
  box.innerHTML = m.map(function(a){
    return '<div onclick=\'oqCheckinSelect('+JSON.stringify(a)+')\' style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">' +
      '<div style="font-weight:600;color:#1e293b">'+a.patient+' <span style="font-family:monospace;font-size:11px;color:#64748b">'+a.uhid+'</span></div>' +
      '<div style="font-size:11.5px;color:#94a3b8;margin-top:1px">'+a.no+' · '+a.doctor+' · '+a.time+' ('+a.sess+')</div>' +
    '</div>';
  }).join('');
  box.style.display = 'block';
}
function oqCheckinSelect(apt) {
  _oqCheckinPt = apt;
  document.getElementById('oq-checkin-results').style.display = 'none';
  document.getElementById('oq-checkin-inp').value = '';
  document.getElementById('oq-checkin-card').innerHTML =
    '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-top:8px">' +
      '<div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:6px">'+apt.patient+'</div>' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12.5px">' +
        '<span style="color:#64748b">UHID</span><span style="font-family:monospace;font-weight:700;color:#166534">'+apt.uhid+'</span>' +
        '<span style="color:#64748b">Apt No.</span><span style="font-family:monospace">'+apt.no+'</span>' +
        '<span style="color:#64748b">Doctor</span><span>'+apt.doctor+'</span>' +
        '<span style="color:#64748b">Slot</span><span style="font-weight:700;color:#2563eb">'+apt.time+' ('+apt.sess+')</span>' +
      '</div>' +
      '<button onclick="oqCheckinConfirm()" class="btn-success" style="width:100%;justify-content:center;margin-top:10px;padding:9px">Confirm Arrival &amp; Issue Token</button>' +
    '</div>';
  document.getElementById('oq-checkin-card').style.display = '';
}
function oqCheckinConfirm() {
  if (!_oqCheckinPt) return;
  var a = _oqCheckinPt;
  var deptCodes = {'General Medicine':'GEN','Gynaecology':'GYN','Cardiology':'CAR','Orthopaedics':'ORT','Paediatrics':'PAE','ENT':'ENT','Dermatology':'DRM','Ophthalmology':'OPH'};
  var code  = deptCodes[a.dept] || 'OPD';
  var token = code + '-' + String(_oqWalkCtr++).padStart(3,'0');
  OPD_QUEUE.unshift({ uhid:a.uhid, name:a.patient, age:30, gender:'—', token:token, dept:a.dept, doctor:a.doctor, docId:a.docId, status:'waiting', payer:a.payer||'Self', reg:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})+' AM', priority:[], type:'appointment', apt:a.no });
  a.status = 'arrived';
  _oqCheckinPt = null;
  document.getElementById('oq-checkin-card').style.display = 'none';
  document.getElementById('oq-checkin-inp').value = '';
  oqRenderQueue();
  alert('Token issued: ' + token + '\nPatient added to queue.');
}

// Walk-in token handlers
function oqWalkinDept() {
  var dept = document.getElementById('oq-wk-dept').value;
  var sel  = document.getElementById('oq-wk-doctor');
  Array.from(sel.options).forEach(function(o){
    if (!o.value) { o.style.display=''; return; }
    o.style.display = (!dept || o.dataset.dept===dept) ? '' : 'none';
  });
  sel.value = '';
}
function oqWalkinConfirm() {
  var name  = (document.getElementById('oq-wk-name')||{value:''}).value.trim();
  var dept  = (document.getElementById('oq-wk-dept')||{value:''}).value;
  var docEl = document.getElementById('oq-wk-doctor');
  var docId = docEl ? docEl.value : '';
  var docName = docEl && docEl.value ? docEl.options[docEl.selectedIndex].text : '';
  if (!name || !dept || !docId) { alert('Enter patient name, department and doctor.'); return; }
  var deptCodes = {'General Medicine':'GEN','Gynaecology':'GYN','Cardiology':'CAR','Orthopaedics':'ORT','Paediatrics':'PAE','ENT':'ENT','Dermatology':'DRM','Ophthalmology':'OPH'};
  var code  = deptCodes[dept] || 'OPD';
  var token = code + '-' + String(_oqWalkCtr++).padStart(3,'0');
  var uhid  = 'TEMP-' + String(Math.floor(Math.random()*9000)+1000);
  OPD_QUEUE.unshift({ uhid:uhid, name:name, age:0, gender:'—', token:token, dept:dept, doctor:docName, docId:docId, status:'waiting', payer:'Self', reg:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})+' AM', priority:[], type:'walkin', apt:'' });
  document.getElementById('oq-wk-name').value = '';
  document.getElementById('oq-wk-dept').value = '';
  docEl.value = '';
  oqRenderQueue();
  alert('Token issued: ' + token + '\nPatient added to walk-in queue.');
}

// ── pageOpdQueue ───────────────────────────────────────────────────────────────
function pageOpdQueue() {
  var today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var tabBtn = function(id, label) {
    var act = id==='all';
    return '<button id="oq-tab-'+id+'" onclick="oqTab(\''+id+'\')" style="padding:6px 18px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid '+(act?'#2563eb':'#e2e8f0')+';background:'+(act?'#2563eb':'#f8fafc')+';color:'+(act?'#fff':'#374151')+'">'+label+'</button>';
  };
  var docOpts = '<option value="">Select Doctor</option>' +
    _APT_DOCTORS.map(function(d){ return '<option value="'+d.id+'" data-dept="'+d.dept+'">'+d.name+'</option>'; }).join('');
  var deptOpts = ['','General Medicine','Gynaecology','Cardiology','Orthopaedics','Paediatrics','ENT','Dermatology','Ophthalmology']
    .map(function(d){ return '<option value="'+d+'">'+(d||'Select Department')+'</option>'; }).join('');

  return pageHeader(
    'OPD Queue &amp; Check-in',
    'OPD Management <span>›</span> OPD Queue',
    '<button class="btn-outline" onclick="navTo(\'reg-desk\')" style="font-size:13px">Front Desk</button>' +
    ' <button class="btn-outline" onclick="navTo(\'appointments\')" style="font-size:13px">Appointments</button>' +
    ' <button class="btn-primary" onclick="navTo(\'opd-nurse\')" style="font-size:13px">Nurse Station</button>'
  ) +

  // KPI row (dynamic)
  '<div id="oq-kpi-row" style="display:flex;gap:12px;margin-bottom:20px"></div>' +

  // Legend
  '<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px;font-size:12px;flex-wrap:wrap">' +
    '<span style="color:#64748b;font-weight:600">Status:</span>' +
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#7c3aed;margin-right:4px"></span>In Vitals</span>' +
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#2563eb;margin-right:4px"></span>Waiting</span>' +
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f59e0b;margin-right:4px"></span>Consulting</span>' +
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#16a34a;margin-right:4px"></span>Done</span>' +
    '<span style="color:#64748b;font-weight:600;margin-left:8px">Priority:</span>' +
    '<span style="background:#dc2626;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">EMRG</span>' +
    '<span style="background:#db2777;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">PREG</span>' +
    '<span style="background:#ca8a04;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">SR.CTZN</span>' +
    '<span style="background:#0891b2;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">DISB</span>' +
  '</div>' +

  // Main grid: queue (left) + action panel (right)
  '<div style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start">' +

  // ── LEFT: Queue ──────────────────────────────────────────────────────────────
  '<div>' +
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' +
      '<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">' +
        '<div style="font-weight:700;font-size:14.5px;color:#1e293b">Live Queue — <span style="font-weight:400;font-size:13px;color:#64748b">'+today+'</span></div>' +
        '<div style="display:flex;gap:6px">' + tabBtn('all','All') + tabBtn('appointment','Appointments') + tabBtn('walkin','Walk-ins') + '</div>' +
      '</div>' +
      '<div style="overflow-x:auto">' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr style="background:#f8fafc">' +
            '<th style="padding:9px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Token</th>' +
            '<th style="padding:9px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Patient</th>' +
            '<th style="padding:9px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Doctor / Dept</th>' +
            '<th style="padding:9px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Status</th>' +
            '<th style="padding:9px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Wait</th>' +
            '<th style="padding:9px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Payer</th>' +
            '<th style="padding:9px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Reg.</th>' +
            '<th style="padding:9px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Actions</th>' +
          '</tr></thead>' +
          '<tbody id="oq-tbody"></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
  '</div>' +

  // ── RIGHT: Action panel ──────────────────────────────────────────────────────
  '<div style="display:flex;flex-direction:column;gap:14px">' +

    // Check-in panel
    sectionCard('Appointment Check-in',
      '<div style="font-size:12.5px;color:#64748b;margin-bottom:8px">Search by patient name, UHID or appointment number</div>' +
      '<div style="position:relative">' +
        '<input id="oq-checkin-inp" class="form-input" placeholder="Name / UHID / APT no..." oninput="oqCheckinSearch(this.value)" style="font-size:13px">' +
        '<div id="oq-checkin-results" style="display:none;position:absolute;left:0;right:0;top:38px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:20;max-height:200px;overflow-y:auto"></div>' +
      '</div>' +
      '<div id="oq-checkin-card" style="display:none"></div>'
    ) +

    // Walk-in token panel
    sectionCard('Issue Walk-in Token',
      formRow(formField('Patient Name', '<input id="oq-wk-name" class="form-input" placeholder="Full name" style="font-size:13px">', true)) +
      formRow(formField('Department', '<select id="oq-wk-dept" class="form-select" onchange="oqWalkinDept()" style="font-size:13px">'+deptOpts+'</select>', true)) +
      formRow(formField('Doctor', '<select id="oq-wk-doctor" class="form-select" style="font-size:13px">'+docOpts+'</select>', true)),
      '<button onclick="oqWalkinConfirm()" class="btn-primary" style="width:100%;justify-content:center;padding:9px">Issue Token</button>'
    ) +

    // Doctor workload
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px">' +
      '<div style="font-weight:700;font-size:13.5px;color:#1e293b;margin-bottom:14px">Doctor Workload</div>' +
      '<div id="oq-workload"></div>' +
    '</div>' +

    // Display board
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px">' +
      '<div style="font-weight:700;font-size:13.5px;color:#1e293b;margin-bottom:10px">Display Board Preview</div>' +
      '<div id="oq-display-board"></div>' +
    '</div>' +

  '</div>' + // end right
  '</div>' + // end grid

  // init script trigger — use onload pattern via setTimeout
  '<div id="oq-init" style="display:none"></div>';
}

// Auto-render queue after page loads (called from navTo via setTimeout)
function oqInit() {
  if (document.getElementById('oq-tbody')) {
    _oqFilter = 'all';
    oqRenderQueue();
  }
}


// ─── APPOINTMENT MANAGEMENT — global state & handlers ─────────────────────────
var _amTab      = 'book';
var _amBookPt   = null;
var _amBookNR   = false;
var _amDocId    = '';
var _amDocFee   = 0;
var _amSlot     = '';
var _amSess     = 'Morning';
var _amBulk     = [];
var _AM_BLOCKED = {};   // { docId: [slot, ...] }
var _amSchedDoc = 'D001';
var _amAptCtr   = 6;

var _AM_MORNING = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30'];
var _AM_EVENING = ['16:00','16:30','17:00','17:30','18:00'];

var _AM_APTS = [
  { no:'APT/26/0001', patient:'Ramesh Kumar',   uhid:'HIS2600001', mobile:'9876543210', docId:'D001', doctor:'Dr. Anil Mehta',   dept:'General Medicine', date:'today', time:'09:00', sess:'Morning', fee:600,  status:'completed', by:'Anita Sharma', at:'08:45 AM' },
  { no:'APT/26/0002', patient:'Mohammed Iqbal', uhid:'HIS2600003', mobile:'9900112233', docId:'D003', doctor:'Dr. Suresh Verma', dept:'Cardiology',       date:'today', time:'10:00', sess:'Morning', fee:1000, status:'booked',    by:'Anita Sharma', at:'09:00 AM' },
  { no:'APT/26/0003', patient:'Sunita Patel',   uhid:'HIS2600002', mobile:'9812345678', docId:'D002', doctor:'Dr. Priya Sharma', dept:'Gynaecology',      date:'today', time:'10:30', sess:'Morning', fee:700,  status:'booked',    by:'Anita Sharma', at:'09:10 AM' },
  { no:'APT/26/0004', patient:'Kavita Desai',   uhid:'HIS2600004', mobile:'9988776655', docId:'D004', doctor:'Dr. Rajesh Nair',  dept:'Orthopaedics',     date:'today', time:'11:00', sess:'Morning', fee:700,  status:'booked',    by:'Ravi Kumar',   at:'09:20 AM' },
  { no:'APT/26/0005', patient:'Ramesh Kumar',   uhid:'HIS2600001', mobile:'9876543210', docId:'D001', doctor:'Dr. Anil Mehta',   dept:'General Medicine', date:'today', time:'11:30', sess:'Morning', fee:600,  status:'cancelled', by:'Anita Sharma', at:'09:30 AM' },
  { no:'APT/26/0006', patient:'Arjun Singh',    uhid:'HIS2600005', mobile:'9776655443', docId:'D005', doctor:'Dr. Meena Joshi',  dept:'Paediatrics',      date:'today', time:'16:00', sess:'Evening', fee:600,  status:'booked',    by:'Ravi Kumar',   at:'09:40 AM' },
];

var _AM_LOG = [
  { time:'08:45 AM', staff:'Anita Sharma', action:'Booked',     patient:'Ramesh Kumar',   aptNo:'APT/26/0001', detail:'General Medicine · Dr. Anil Mehta · 09:00 (Morning)' },
  { time:'09:00 AM', staff:'Anita Sharma', action:'Booked',     patient:'Mohammed Iqbal', aptNo:'APT/26/0002', detail:'Cardiology · Dr. Suresh Verma · 10:00 (Morning)' },
  { time:'09:10 AM', staff:'Anita Sharma', action:'Booked',     patient:'Sunita Patel',   aptNo:'APT/26/0003', detail:'Gynaecology · Dr. Priya Sharma · 10:30 (Morning)' },
  { time:'09:20 AM', staff:'Ravi Kumar',   action:'Booked',     patient:'Kavita Desai',   aptNo:'APT/26/0004', detail:'Orthopaedics · Dr. Rajesh Nair · 11:00 (Morning)' },
  { time:'09:30 AM', staff:'Anita Sharma', action:'Cancelled',  patient:'Ramesh Kumar',   aptNo:'APT/26/0005', detail:'Reason: Patient request' },
  { time:'09:40 AM', staff:'Ravi Kumar',   action:'Booked',     patient:'Arjun Singh',    aptNo:'APT/26/0006', detail:'Paediatrics · Dr. Meena Joshi · 16:00 (Evening)' },
];

function amLog(action, patient, aptNo, detail) {
  var now = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  var staff = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'Staff';
  _AM_LOG.unshift({ time:now, staff:staff, action:action, patient:patient, aptNo:aptNo, detail:detail });
}

// ── Tab switching ──────────────────────────────────────────────────────────────
function amTab(t) {
  _amTab = t;
  ['book','schedule','manage','audit'].forEach(function(id) {
    var btn = document.getElementById('am-tab-' + id);
    var pnl = document.getElementById('am-pnl-' + id);
    if (btn) { btn.style.background = id===t?'#2563eb':'#f8fafc'; btn.style.color = id===t?'#fff':'#374151'; btn.style.borderColor = id===t?'#2563eb':'#e2e8f0'; }
    if (pnl) pnl.style.display = id===t?'':'none';
  });
  if (t==='manage')  amRenderManage();
  if (t==='audit')   amRenderAudit();
  if (t==='schedule') amRenderSchedule();
}

// ── BOOK TAB ──────────────────────────────────────────────────────────────────
function amBookSearch(q) {
  var box = document.getElementById('am-book-results');
  if (q.length < 2) { box.style.display='none'; return; }
  var m = DEMO_PATIENTS.filter(function(p){
    return p.name.toLowerCase().includes(q.toLowerCase())||p.uhid.toLowerCase().includes(q.toLowerCase())||p.mobile.includes(q);
  });
  // Duplicate detection: check if same mobile appears more than once in _AM_APTS today
  if (!m.length) {
    box.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#94a3b8">No record found — <button onclick="amBookNonReg()" style="background:none;border:none;color:#2563eb;font-weight:600;cursor:pointer;font-size:13px;text-decoration:underline">book without UHID</button></div>';
    box.style.display='block'; return;
  }
  box.innerHTML = m.map(function(p) {
    var todayApts = _AM_APTS.filter(function(a){ return a.uhid===p.uhid && a.date==='today' && a.status!=='cancelled'; });
    var dupWarn = todayApts.length ? '<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:999px;font-weight:700;margin-left:6px">'+todayApts.length+' apt today</span>' : '';
    return '<div onclick=\'amPickPatient('+JSON.stringify(p)+')\' style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">' +
      '<div style="font-weight:600;font-size:13.5px;color:#1e293b">' + p.name + ' <span style="font-family:monospace;font-size:11.5px;color:#64748b">' + p.uhid + '</span>' + dupWarn + '</div>' +
      '<div style="font-size:12px;color:#94a3b8;margin-top:1px">' + p.age + 'Y ' + p.gender + ' · ' + p.mobile + ' · ' + p.blood + '</div>' +
    '</div>';
  }).join('');
  box.style.display='block';
}
function amPickPatient(p) {
  _amBookPt = p; _amBookNR = false;
  document.getElementById('am-book-results').style.display='none';
  document.getElementById('am-book-search-inp').value='';
  document.getElementById('am-book-nonreg').style.display='none';
  var todayApts = _AM_APTS.filter(function(a){ return a.uhid===p.uhid && a.date==='today' && a.status!=='cancelled'; });
  var dupHtml = todayApts.length ?
    '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:7px;padding:8px 12px;margin-bottom:8px;font-size:12.5px;color:#92400e"><b>Duplicate Check:</b> This patient already has ' + todayApts.length + ' appointment(s) today (' + todayApts.map(function(a){return a.time+' '+a.doctor.split(' ')[1];}).join(', ') + '). Confirm to book another.</div>' : '';
  document.getElementById('am-book-pt-card').innerHTML =
    dupHtml +
    '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:start">' +
        '<div><div style="font-weight:700;font-size:14px;color:#1e293b">' + p.name + '</div>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px;display:grid;grid-template-columns:auto 1fr;gap:2px 10px">' +
            '<span>UHID</span><span style="font-family:monospace;font-weight:700;color:#166534">' + p.uhid + '</span>' +
            '<span>Age/Sex</span><span>' + p.age + 'Y ' + p.gender + '</span>' +
            '<span>Mobile</span><span>' + p.mobile + '</span>' +
          '</div>' +
        '</div>' +
        '<button onclick="amClearBookPt()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer">&times;</button>' +
      '</div>' +
    '</div>';
  document.getElementById('am-book-pt-card').style.display='';
}
function amBookNonReg() {
  _amBookPt = null; _amBookNR = true;
  document.getElementById('am-book-results').style.display='none';
  document.getElementById('am-book-search-inp').value='';
  document.getElementById('am-book-pt-card').style.display='none';
  document.getElementById('am-book-nonreg').style.display='';
}
function amClearBookPt() {
  _amBookPt=null; _amBookNR=false;
  document.getElementById('am-book-pt-card').style.display='none';
  document.getElementById('am-book-nonreg').style.display='none';
}
function amDocFilter() {
  var dept = document.getElementById('am-dept').value;
  var sel  = document.getElementById('am-doctor');
  Array.from(sel.options).forEach(function(o){
    if(!o.value){o.style.display='';return;}
    o.style.display=(!dept||o.dataset.dept===dept)?'':'none';
  });
  sel.value=''; _amDocId=''; _amDocFee=0;
  document.getElementById('am-doc-info').style.display='none';
  amRefreshSlots(); amSummary();
}
function amDocPick() {
  var sel=document.getElementById('am-doctor');
  var opt=sel.options[sel.selectedIndex];
  _amDocId=opt.value; _amDocFee=parseInt(opt.dataset.fee)||0;
  var info=document.getElementById('am-doc-info');
  if(_amDocId){info.textContent=opt.dataset.qual+' · Consultation: ₹'+opt.dataset.fee;info.style.display='';}
  else info.style.display='none';
  amRefreshSlots(); amSummary();
}
function amSetSess(s) {
  _amSess=s; _amSlot='';
  var mBtn=document.getElementById('am-sess-m');
  var eBtn=document.getElementById('am-sess-e');
  var act={background:'#2563eb',color:'#fff',borderColor:'#2563eb'};
  var off={background:'#f8fafc',color:'#374151',borderColor:'#e2e8f0'};
  Object.assign(mBtn.style,s==='Morning'?act:off);
  Object.assign(eBtn.style,s==='Morning'?off:act);
  amRefreshSlots(); amSummary();
}
function amPickSlot(s) { _amSlot=_amSlot===s?'':s; amRefreshSlots(); amSummary(); }
function amRefreshSlots() {
  var grid=document.getElementById('am-slot-grid');
  var lbl=document.getElementById('am-slot-lbl');
  var cnt=document.getElementById('am-slot-cnt');
  if(!_amDocId){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;color:#cbd5e1;padding:28px;font-size:13px">Select a doctor first</div>';
    lbl.textContent=''; cnt.textContent=''; return;
  }
  var doc=_APT_DOCTORS.find(function(d){return d.id===_amDocId;});
  lbl.textContent=doc?doc.name:'';
  var slots=_amSess==='Morning'?_AM_MORNING:_AM_EVENING;
  var booked=(_APT_BOOKED[_amDocId]||[]);
  var blocked=(_AM_BLOCKED[_amDocId]||[]);
  var avail=0;
  grid.innerHTML=slots.map(function(s){
    var isBlk=blocked.includes(s);
    var isBk=booked.includes(s);
    var isSel=_amSlot===s;
    if(!isBlk&&!isBk)avail++;
    var bg  =isBlk?'#fef2f2':isSel?'#2563eb':isBk?'#f1f5f9':'#f0fdf4';
    var clr =isBlk?'#dc2626':isSel?'#fff':isBk?'#94a3b8':'#166534';
    var bdr =isBlk?'1px solid #fca5a5':isSel?'2px solid #2563eb':isBk?'1px solid #e2e8f0':'1px solid #86efac';
    var cur =(!isBlk&&!isBk)?'pointer':'not-allowed';
    var lbl2=isBlk?'<div style="font-size:10px;margin-top:1px">Blocked</div>':isBk?'<div style="font-size:10px;margin-top:1px;opacity:.6">Booked</div>':'';
    var clk=(!isBlk&&!isBk)?'onclick="amPickSlot(\''+s+'\')"':'';
    return '<div '+clk+' style="padding:10px;border-radius:8px;background:'+bg+';color:'+clr+';border:'+bdr+';cursor:'+cur+';text-align:center;font-weight:600;font-size:13px;transition:all .15s">'+s+lbl2+'</div>';
  }).join('');
  cnt.textContent=avail+' available';
}
function amSummary() {
  var empty=document.getElementById('am-sum-empty');
  var filled=document.getElementById('am-sum-filled');
  var docSel=document.getElementById('am-doctor');
  var docName=docSel&&docSel.value?docSel.options[docSel.selectedIndex].text.split(' — ')[0]:'';
  var dept=document.getElementById('am-dept')?document.getElementById('am-dept').value:'';
  var dateVal=document.getElementById('am-date')?document.getElementById('am-date').value:'';
  if(!_amDocId||!_amSlot||((!_amBookPt)&&!_amBookNR)){empty.style.display='';filled.style.display='none';return;}
  empty.style.display='none'; filled.style.display='';
  var ptName=_amBookNR?((document.getElementById('am-nr-name')||{value:'Guest'}).value||'Guest'):_amBookPt.name;
  document.getElementById('am-sum-pt').textContent=ptName;
  document.getElementById('am-sum-doc').textContent=docName;
  document.getElementById('am-sum-dept').textContent=dept;
  var d=new Date(dateVal+'T00:00:00');
  document.getElementById('am-sum-date').textContent=d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
  document.getElementById('am-sum-slot').textContent=_amSlot+' ('+_amSess+')';
  document.getElementById('am-sum-fee').textContent='₹'+_amDocFee;
}
function amConfirm() {
  if(!_amDocId||!_amSlot||((!_amBookPt)&&!_amBookNR)){alert('Please complete all fields.');return;}
  var docSel=document.getElementById('am-doctor');
  var docName=docSel.options[docSel.selectedIndex].text.split(' — ')[0];
  var dept=document.getElementById('am-dept').value;
  var dateVal=document.getElementById('am-date').value;
  var ptName=_amBookNR?((document.getElementById('am-nr-name')||{value:'Guest'}).value||'Guest'):_amBookPt.name;
  var uhid=_amBookNR?'TEMP-'+String(Math.floor(Math.random()*9000)+1000):_amBookPt.uhid;
  var aptNo='APT/26/'+String(1000+_amAptCtr++);
  if(!_APT_BOOKED[_amDocId])_APT_BOOKED[_amDocId]=[];
  _APT_BOOKED[_amDocId].push(_amSlot);
  var rec={no:aptNo,patient:ptName,uhid:uhid,mobile:_amBookNR?'—':_amBookPt.mobile,docId:_amDocId,doctor:docName,dept:dept,date:'today',time:_amSlot,sess:_amSess,fee:_amDocFee,status:'booked',by:(typeof currentUser!=='undefined'&&currentUser?currentUser.name:'Staff'),at:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})};
  _AM_APTS.push(rec);
  amLog('Booked',ptName,aptNo,dept+' · '+docName+' · '+_amSlot+' ('+_amSess+')');
  amShowSlip(rec);
  _amSlot=''; _amBookPt=null; _amBookNR=false;
  amClearBookPt(); amRefreshSlots(); amSummary();
}
function amShowSlip(a) {
  document.getElementById('am-slip-content').innerHTML=
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Apt No.</span><span style="font-family:monospace;font-weight:700;color:#2563eb">'+a.no+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Patient</span><span style="font-weight:600">'+a.patient+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">UHID</span><span style="font-family:monospace">'+a.uhid+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Doctor</span><span style="font-weight:600">'+a.doctor+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Department</span><span>'+a.dept+'</span></div>'+
    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0">'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Date</span><span style="font-weight:600">'+new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:#64748b">Time</span><span style="font-weight:700;color:#2563eb;font-size:15px">'+a.time+' ('+a.sess+')</span></div>'+
    '<div style="display:flex;justify-content:space-between"><span style="color:#64748b">Consultation Fee</span><span style="font-weight:700;color:#16a34a">₹'+a.fee+'</span></div>'+
    '<div style="font-size:11.5px;color:#94a3b8;margin-top:12px;text-align:center">Arrive 10 min early · Carry UHID card &amp; valid ID</div>';
  document.getElementById('am-slip-modal').style.display='flex';
}
function amShowSlipByNo(aptNo) {
  var a=_AM_APTS.find(function(x){return x.no===aptNo;});
  if(a) amShowSlip(a);
}

// ── SCHEDULE TAB ──────────────────────────────────────────────────────────────
function amRenderSchedule() {
  var docId=document.getElementById('am-sched-doc')?document.getElementById('am-sched-doc').value:_amSchedDoc;
  _amSchedDoc=docId||'D001';
  var doc=_APT_DOCTORS.find(function(d){return d.id===_amSchedDoc;});
  var blocked=_AM_BLOCKED[_amSchedDoc]||[];
  var booked=_APT_BOOKED[_amSchedDoc]||[];
  var allSlots=_AM_MORNING.concat(_AM_EVENING);
  var gridHtml=allSlots.map(function(s){
    var isBlk=blocked.includes(s);
    var isBk=booked.includes(s);
    var apt=_AM_APTS.find(function(a){return a.docId===_amSchedDoc&&a.time===s&&a.status==='booked';});
    var bg  =isBlk?'#fef2f2':isBk?'#eff6ff':'#f0fdf4';
    var bdr =isBlk?'#fca5a5':isBk?'#bfdbfe':'#86efac';
    var clr =isBlk?'#dc2626':isBk?'#1d4ed8':'#15803d';
    var lbl =isBlk?'BLOCKED':isBk?'BOOKED':'OPEN';
    var ptInfo=apt?'<div style="font-size:10.5px;margin-top:3px;color:#374151;font-weight:600">'+apt.patient+'</div>':'';
    var btnLabel=isBlk?'Unblock':'Block';
    var btnClr=isBlk?'#16a34a':'#dc2626';
    return '<div style="background:'+bg+';border:1px solid '+bdr+';border-radius:8px;padding:10px;position:relative">' +
      '<div style="font-weight:700;font-size:13.5px;color:#1e293b">'+s+'</div>' +
      '<div style="font-size:10px;font-weight:700;letter-spacing:.06em;color:'+clr+';margin-top:2px">'+lbl+'</div>' +
      ptInfo +
      '<button onclick="amToggleBlock(\''+_amSchedDoc+'\',\''+s+'\')" style="position:absolute;top:8px;right:8px;background:none;border:1px solid '+btnClr+';color:'+btnClr+';border-radius:4px;padding:1px 7px;font-size:10.5px;font-weight:600;cursor:pointer">'+btnLabel+'</button>' +
    '</div>';
  }).join('');
  var pnl=document.getElementById('am-sched-grid');
  if(pnl) pnl.innerHTML=gridHtml;
  // apt list for this doctor today
  var apts=_AM_APTS.filter(function(a){return a.docId===_amSchedDoc&&a.date==='today'&&a.status!=='cancelled';});
  var listPnl=document.getElementById('am-sched-list');
  if(listPnl){
    if(!apts.length){listPnl.innerHTML='<div style="color:#94a3b8;font-size:13px;padding:12px 0">No appointments for this doctor today.</div>';return;}
    listPnl.innerHTML=table(
      ['Time','Patient','UHID','Status','Booked By','Action'],
      apts.map(function(a){
        var sb=a.status==='completed'?badge('Done','green'):a.status==='cancelled'?badge('Cancelled','red'):badge('Booked','blue');
        return [a.time+' ('+a.sess+')',a.patient,'<span style="font-family:monospace;font-size:12px">'+a.uhid+'</span>',sb,a.by,
          '<button onclick="amShowSlipByNo(\''+a.no+'\')" style="font-size:12px;color:#2563eb;background:none;border:none;cursor:pointer;font-weight:600">Slip</button>'];
      }),'No appointments');
  }
}
function amToggleBlock(docId,slot) {
  if(!_AM_BLOCKED[docId]) _AM_BLOCKED[docId]=[];
  var idx=_AM_BLOCKED[docId].indexOf(slot);
  if(idx>=0){ _AM_BLOCKED[docId].splice(idx,1); amLog('Unblocked slot','—','—',docId+' · '+slot); }
  else { _AM_BLOCKED[docId].push(slot); amLog('Blocked slot','—','—',docId+' · '+slot); }
  amRenderSchedule();
  amRefreshSlots();
}

// ── MANAGE TAB ────────────────────────────────────────────────────────────────
function amRenderManage() {
  var fStatus=document.getElementById('am-flt-status')?document.getElementById('am-flt-status').value:'';
  var fDoctor=document.getElementById('am-flt-doctor')?document.getElementById('am-flt-doctor').value:'';
  var fSearch=document.getElementById('am-flt-search')?document.getElementById('am-flt-search').value.toLowerCase():'';
  var apts=_AM_APTS.filter(function(a){
    if(fStatus&&a.status!==fStatus) return false;
    if(fDoctor&&a.docId!==fDoctor) return false;
    if(fSearch&&!a.patient.toLowerCase().includes(fSearch)&&!a.uhid.toLowerCase().includes(fSearch)) return false;
    return true;
  });
  var rows=apts.map(function(a){
    var sb=a.status==='completed'?badge('Done','green'):a.status==='cancelled'?badge('Cancelled','red'):a.status==='booked'?badge('Booked','blue'):badge(a.status,'gray');
    var chk='<input type="checkbox" '+((_amBulk.includes(a.no))?'checked':'')+' onchange="amBulkToggle(\''+a.no+'\')" style="width:15px;height:15px;cursor:pointer">';
    var actions=a.status==='booked'
      ? '<button onclick="amShowSlipByNo(\''+a.no+'\')" style="font-size:12px;color:#2563eb;background:none;border:none;cursor:pointer;font-weight:600;margin-right:8px">Slip</button>' +
        '<button onclick="amReschedule(\''+a.no+'\')" style="font-size:12px;color:#ca8a04;background:none;border:none;cursor:pointer;font-weight:600;margin-right:8px">Reschedule</button>' +
        '<button onclick="amCancelOne(\''+a.no+'\')" style="font-size:12px;color:#dc2626;background:none;border:none;cursor:pointer;font-weight:600">Cancel</button>'
      : '<button onclick="amShowSlipByNo(\''+a.no+'\')" style="font-size:12px;color:#2563eb;background:none;border:none;cursor:pointer;font-weight:600">Slip</button>';
    return [chk,'<span style="font-family:monospace;font-size:12px;color:#64748b">'+a.no+'</span>',
      '<div style="font-weight:600;color:#1e293b">'+a.patient+'</div><div style="font-size:11.5px;color:#94a3b8">'+a.uhid+'</div>',
      a.doctor,a.dept,a.time+' ('+a.sess+')',sb,actions];
  });
  var grid=document.getElementById('am-manage-grid');
  if(grid) grid.innerHTML=table(['','Apt No.','Patient','Doctor','Dept','Time','Status','Actions'],rows,'No appointments match filter');
  amBulkBar();
}
function amBulkToggle(aptNo) {
  var idx=_amBulk.indexOf(aptNo);
  if(idx>=0) _amBulk.splice(idx,1); else _amBulk.push(aptNo);
  amBulkBar();
}
function amBulkBar() {
  var bar=document.getElementById('am-bulk-bar');
  if(!bar) return;
  if(!_amBulk.length){bar.style.display='none';return;}
  bar.style.display='flex';
  document.getElementById('am-bulk-count').textContent=_amBulk.length+' selected';
}
function amBulkCancel() {
  if(!_amBulk.length) return;
  if(!confirm('Cancel '+_amBulk.length+' appointment(s)?')) return;
  _amBulk.forEach(function(no){
    var a=_AM_APTS.find(function(x){return x.no===no;});
    if(a&&a.status==='booked'){
      a.status='cancelled';
      if(_APT_BOOKED[a.docId]){var i=_APT_BOOKED[a.docId].indexOf(a.time);if(i>=0)_APT_BOOKED[a.docId].splice(i,1);}
      amLog('Bulk Cancelled',a.patient,no,'Reason: Bulk operation');
    }
  });
  _amBulk=[];
  amRenderManage(); amRefreshSlots();
}
function amBulkTransfer() {
  var newDoc=prompt('Enter new Doctor ID (D001–D006):');
  if(!newDoc) return;
  var doc=_APT_DOCTORS.find(function(d){return d.id===newDoc;});
  if(!doc){alert('Doctor not found.');return;}
  _amBulk.forEach(function(no){
    var a=_AM_APTS.find(function(x){return x.no===no;});
    if(a&&a.status==='booked'){
      var oldDoc=a.docId;
      if(_APT_BOOKED[oldDoc]){var i=_APT_BOOKED[oldDoc].indexOf(a.time);if(i>=0)_APT_BOOKED[oldDoc].splice(i,1);}
      a.docId=newDoc; a.doctor=doc.name; a.dept=doc.dept;
      if(!_APT_BOOKED[newDoc])_APT_BOOKED[newDoc]=[];
      _APT_BOOKED[newDoc].push(a.time);
      amLog('Transferred',a.patient,no,'To '+doc.name+' ('+newDoc+')');
    }
  });
  _amBulk=[];
  amRenderManage();
}
function amReschedule(aptNo) {
  var a=_AM_APTS.find(function(x){return x.no===aptNo;});
  if(!a) return;
  document.getElementById('am-resched-title').textContent='Reschedule: '+a.patient+' — '+a.no;
  document.getElementById('am-resched-from').textContent=a.doctor+' · '+a.time+' ('+a.sess+')';
  document.getElementById('am-resched-aptno').value=aptNo;
  document.getElementById('am-resched-modal').style.display='flex';
}
function amReschedConfirm() {
  var aptNo=document.getElementById('am-resched-aptno').value;
  var newSlot=document.getElementById('am-resched-slot').value;
  var newSess=document.getElementById('am-resched-sess').value;
  if(!newSlot){alert('Enter new time slot.');return;}
  var a=_AM_APTS.find(function(x){return x.no===aptNo;});
  if(!a) return;
  if(_APT_BOOKED[a.docId]){var i=_APT_BOOKED[a.docId].indexOf(a.time);if(i>=0)_APT_BOOKED[a.docId].splice(i,1);}
  amLog('Rescheduled',a.patient,aptNo,a.time+'→'+newSlot+' ('+newSess+')');
  a.time=newSlot; a.sess=newSess;
  if(!_APT_BOOKED[a.docId])_APT_BOOKED[a.docId]=[];
  _APT_BOOKED[a.docId].push(newSlot);
  document.getElementById('am-resched-modal').style.display='none';
  amRenderManage(); amRefreshSlots();
}
function amCancelOne(aptNo) {
  if(!confirm('Cancel appointment '+aptNo+'?')) return;
  var a=_AM_APTS.find(function(x){return x.no===aptNo;});
  if(!a) return;
  if(_APT_BOOKED[a.docId]){var i=_APT_BOOKED[a.docId].indexOf(a.time);if(i>=0)_APT_BOOKED[a.docId].splice(i,1);}
  a.status='cancelled';
  amLog('Cancelled',a.patient,aptNo,'Patient/staff request');
  amRenderManage(); amRefreshSlots();
}

// ── AUDIT TAB ─────────────────────────────────────────────────────────────────
function amRenderAudit() {
  var rows=_AM_LOG.map(function(l){
    var clr=l.action==='Booked'?'green':l.action==='Cancelled'?'red':l.action.includes('Block')?'orange':l.action==='Rescheduled'?'yellow':'blue';
    return [l.time,badge(l.action,clr),l.patient,l.aptNo,l.detail,l.staff];
  });
  var grid=document.getElementById('am-audit-grid');
  if(grid) grid.innerHTML=table(['Time','Action','Patient','Apt No.','Detail','Staff'],rows,'No log entries');
}

// ─── SCENARIO 3 — APPOINTMENT MANAGEMENT (4-tab) ──────────────────────────────
function pageAppointments() {
  var today    = new Date().toISOString().split('T')[0];
  var todayLbl = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var DEPTS    = ['General Medicine','Gynaecology','Cardiology','Orthopaedics','Paediatrics','ENT','Dermatology','Ophthalmology'];
  var docOpts  = '<option value="">Select Doctor</option>' +
    _APT_DOCTORS.map(function(d){return '<option value="'+d.id+'" data-dept="'+d.dept+'" data-fee="'+d.fee+'" data-qual="'+d.qual+'">'+d.name+' — ₹'+d.fee+'</option>';}).join('');

  var tabBtn = function(id,label) {
    var active = id==='book';
    return '<button id="am-tab-'+id+'" onclick="amTab(\''+id+'\')" style="padding:8px 20px;border-radius:7px;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid '+(active?'#2563eb':'#e2e8f0')+';background:'+(active?'#2563eb':'#f8fafc')+';color:'+(active?'#fff':'#374151')+'">'+label+'</button>';
  };

  // Status legends bar
  var legends = [
    ['#eff6ff','#bfdbfe','#1d4ed8','Booked'],
    ['#f0fdf4','#bbf7d0','#15803d','Confirmed'],
    ['#fef3c7','#fcd34d','#92400e','In Progress'],
    ['#dcfce7','#86efac','#166534','Completed'],
    ['#fef2f2','#fca5a5','#dc2626','Cancelled'],
    ['#f1f5f9','#e2e8f0','#475569','No Show'],
    ['#fef2f2','#fca5a5','#dc2626','Blocked Slot'],
  ].map(function(l){
    return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#374151">' +
      '<span style="width:14px;height:14px;border-radius:3px;background:'+l[0]+';border:1px solid '+l[1]+';display:inline-block"></span>'+l[3]+'</span>';
  }).join('');

  return pageHeader(
    'Appointment Management',
    'Registration &amp; Front Desk <span>›</span> Appointments',
    '<span style="font-size:13px;color:#64748b">' + todayLbl + '</span>'
  ) +
  kpiCards([
    { label:'Today Booked',    value: _AM_APTS.filter(function(a){return a.status==='booked';}).length,     color:'text-blue-700' },
    { label:'Completed',       value: _AM_APTS.filter(function(a){return a.status==='completed';}).length,  color:'text-green-700' },
    { label:'Cancelled',       value: _AM_APTS.filter(function(a){return a.status==='cancelled';}).length,  color:'text-red-600' },
    { label:'Total Today',     value: _AM_APTS.length,                                                       color:'text-slate-700' },
  ]) +

  // Status legends
  '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:14px;align-items:center">' +
    '<span style="font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Legends:</span>' + legends +
  '</div>' +

  // Tab bar
  '<div style="display:flex;gap:8px;margin-bottom:20px">' +
    tabBtn('book','+ Book Appointment') + tabBtn('schedule','Doctor Schedule') +
    tabBtn('manage','Manage / Reschedule') + tabBtn('audit','Audit Log') +
  '</div>' +

  // ── TAB: BOOK ──────────────────────────────────────────────────────────────
  '<div id="am-pnl-book">' +
  '<div style="display:grid;grid-template-columns:300px 1fr 280px;gap:16px;align-items:start">' +

    // Column 1: Patient
    '<div>' +
    sectionCard('Patient',
      '<div style="position:relative;margin-bottom:10px">' +
        '<input id="am-book-search-inp" class="form-input" placeholder="Search UHID, mobile, name..." oninput="amBookSearch(this.value)" autocomplete="off">' +
        '<div id="am-book-results" style="display:none;position:absolute;left:0;right:0;top:40px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:20;max-height:220px;overflow-y:auto"></div>' +
      '</div>' +
      '<button onclick="amBookNonReg()" class="btn-outline" style="width:100%;justify-content:center;font-size:12.5px;margin-bottom:10px">Book Without UHID (Non-registered)</button>' +
      '<div id="am-book-pt-card" style="display:none"></div>' +
      '<div id="am-book-nonreg" style="display:none;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px">' +
        '<div style="font-weight:700;font-size:13px;color:#92400e;margin-bottom:10px">Non-registered Patient</div>' +
        '<div style="font-size:12px;color:#64748b;margin-bottom:8px">UHID will be issued on arrival at registration desk</div>' +
        formRow(formField('Name', '<input id="am-nr-name" class="form-input" placeholder="Patient name" style="font-size:13px">', true)) +
        formRow(formField('Mobile', '<input id="am-nr-mobile" class="form-input" placeholder="Mobile" style="font-size:13px" maxlength="10">')) +
        '<button onclick="amClearBookPt()" style="background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer">Clear</button>' +
      '</div>'
    ) +
    '</div>' +

    // Column 2: Doctor + Date + Slots
    '<div>' +
    sectionCard('Department, Doctor &amp; Slot',
      formRow(
        formField('Department', '<select id="am-dept" class="form-select" onchange="amDocFilter()"><option value="">Select Department</option>'+DEPTS.map(function(d){return '<option>'+d+'</option>';}).join('')+'</select>', true),
        formField('Doctor', '<select id="am-doctor" class="form-select" onchange="amDocPick()">'+docOpts+'</select>', true)
      ) +
      '<div id="am-doc-info" style="display:none;font-size:12.5px;color:#64748b;margin-bottom:10px"></div>' +
      formRow(
        formField('Date', '<input id="am-date" type="date" class="form-input" value="'+today+'" min="'+today+'" onchange="amRefreshSlots()">', true)
      ) +
      '<div style="display:flex;gap:8px;margin-bottom:12px">' +
        '<button id="am-sess-m" onclick="amSetSess(\'Morning\')" style="flex:1;padding:8px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #2563eb;background:#2563eb;color:#fff">Morning</button>' +
        '<button id="am-sess-e" onclick="amSetSess(\'Evening\')" style="flex:1;padding:8px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;background:#f8fafc;color:#374151">Evening</button>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<div id="am-slot-lbl" style="font-size:13px;color:#64748b"></div>' +
        '<span id="am-slot-cnt" style="font-size:12px;color:#16a34a;font-weight:600"></span>' +
      '</div>' +
      '<div id="am-slot-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
        '<div style="grid-column:1/-1;text-align:center;color:#cbd5e1;padding:24px;font-size:13px">Select doctor to view slots</div>' +
      '</div>'
    ) +
    '</div>' +

    // Column 3: Summary + Confirm
    '<div>' +
    sectionCard('Booking Summary',
      '<div id="am-sum-empty" style="color:#94a3b8;font-size:13px;padding:8px 0">Select patient, doctor and slot to confirm.</div>' +
      '<div id="am-sum-filled" style="display:none">' +
        '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:13px;line-height:1.9;margin-bottom:14px">' +
          '<span style="color:#64748b">Patient</span>    <span id="am-sum-pt"   style="font-weight:600;color:#1e293b"></span>' +
          '<span style="color:#64748b">Doctor</span>     <span id="am-sum-doc"  style="font-weight:600;color:#1e293b"></span>' +
          '<span style="color:#64748b">Dept</span>       <span id="am-sum-dept" style="color:#374151"></span>' +
          '<span style="color:#64748b">Date</span>       <span id="am-sum-date" style="font-weight:600"></span>' +
          '<span style="color:#64748b">Slot</span>       <span id="am-sum-slot" style="font-weight:700;color:#2563eb;font-size:14px"></span>' +
          '<span style="color:#64748b">Fee</span>        <span id="am-sum-fee"  style="font-weight:700;color:#16a34a"></span>' +
        '</div>' +
        '<button onclick="amConfirm()" class="btn-primary" style="width:100%;justify-content:center;padding:11px">Confirm &amp; Generate Slip</button>' +
      '</div>'
    ) +
    '</div>' +

  '</div>' +
  '</div>' +

  // ── TAB: SCHEDULE ──────────────────────────────────────────────────────────
  '<div id="am-pnl-schedule" style="display:none">' +
  sectionCard('Doctor Schedule &amp; Slot Management',
    '<div style="display:flex;gap:12px;align-items:end;margin-bottom:16px;flex-wrap:wrap">' +
      '<div>' +
        '<label class="form-label">Doctor</label>' +
        '<select id="am-sched-doc" class="form-select" onchange="amRenderSchedule()" style="width:240px">' +
          _APT_DOCTORS.map(function(d){return '<option value="'+d.id+'">'+d.name+'</option>';}).join('') +
        '</select>' +
      '</div>' +
      '<div><label class="form-label">Date</label><input type="date" class="form-input" value="'+today+'" style="width:160px"></div>' +
      '<button onclick="amRenderSchedule()" class="btn-outline">Load Schedule</button>' +
    '</div>' +
    '<div style="font-size:12px;color:#64748b;margin-bottom:12px">Click <b>Block</b> to prevent new bookings in a slot · Click <b>Unblock</b> to re-open</div>' +
    '<div id="am-sched-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px"></div>' +
    '<div style="font-weight:600;font-size:14px;color:#1e293b;margin-bottom:10px">Today\'s Appointments for Selected Doctor</div>' +
    '<div id="am-sched-list"></div>'
  ) +
  '</div>' +

  // ── TAB: MANAGE ────────────────────────────────────────────────────────────
  '<div id="am-pnl-manage" style="display:none">' +
  // Bulk action bar
  '<div id="am-bulk-bar" style="display:none;background:#1e3a5f;color:#fff;border-radius:8px;padding:10px 16px;margin-bottom:12px;align-items:center;gap:14px">' +
    '<span id="am-bulk-count" style="font-weight:700;font-size:13.5px"></span>' +
    '<button onclick="amBulkCancel()" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer">Cancel All</button>' +
    '<button onclick="amBulkTransfer()" style="background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer">Transfer to Doctor</button>' +
    '<button onclick="_amBulk=[];amRenderManage()" style="background:none;border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:6px;padding:6px 14px;font-size:13px;cursor:pointer">Clear Selection</button>' +
  '</div>' +
  sectionCard('All Appointments',
    '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
      '<input id="am-flt-search" class="form-input" placeholder="Search patient / UHID..." oninput="amRenderManage()" style="width:200px;font-size:13px">' +
      '<select id="am-flt-status" class="form-select" onchange="amRenderManage()" style="width:150px;font-size:13px"><option value="">All Status</option><option value="booked">Booked</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>' +
      '<select id="am-flt-doctor" class="form-select" onchange="amRenderManage()" style="width:190px;font-size:13px"><option value="">All Doctors</option>'+_APT_DOCTORS.map(function(d){return '<option value="'+d.id+'">'+d.name+'</option>';}).join('')+'</select>' +
    '</div>' +
    '<div id="am-manage-grid"></div>'
  ) +
  '</div>' +

  // ── TAB: AUDIT ─────────────────────────────────────────────────────────────
  '<div id="am-pnl-audit" style="display:none">' +
  sectionCard('Appointment Audit Log',
    '<div id="am-audit-grid"></div>'
  ) +
  '</div>' +

  // ── Slip modal ─────────────────────────────────────────────────────────────
  '<div id="am-slip-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center" onclick="this.style.display=\'none\'">' +
  '  <div style="background:#fff;border-radius:16px;padding:28px;width:400px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()">' +
  '    <div style="text-align:center;margin-bottom:20px">' +
  '      <div style="width:52px;height:52px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px">&#10003;</div>' +
  '      <div style="font-size:17px;font-weight:800;color:#1e293b">Appointment Slip</div>' +
  '    </div>' +
  '    <div id="am-slip-content" style="background:#f8fafc;border-radius:10px;padding:16px;border:1px solid #e2e8f0;font-size:13.5px;line-height:2"></div>' +
  '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">' +
  '      <button onclick="window.print()" style="padding:10px;border-radius:8px;background:#2563eb;color:#fff;border:none;font-weight:600;font-size:13.5px;cursor:pointer">Print Slip</button>' +
  '      <button onclick="document.getElementById(\'am-slip-modal\').style.display=\'none\'" style="padding:10px;border-radius:8px;background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;font-weight:500;font-size:13.5px;cursor:pointer">Close</button>' +
  '    </div>' +
  '  </div>' +
  '</div>' +

  // ── Reschedule modal ───────────────────────────────────────────────────────
  '<div id="am-resched-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center" onclick="this.style.display=\'none\'">' +
  '  <div style="background:#fff;border-radius:16px;padding:28px;width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()">' +
  '    <div style="font-size:16px;font-weight:800;color:#1e293b;margin-bottom:4px" id="am-resched-title"></div>' +
  '    <div style="font-size:13px;color:#64748b;margin-bottom:18px">Current: <span id="am-resched-from" style="font-weight:600;color:#374151"></span></div>' +
  '    <input type="hidden" id="am-resched-aptno">' +
  '    '+formRow(formField('New Time Slot', '<input id="am-resched-slot" class="form-input" placeholder="e.g. 11:30">', true)) +
  '    '+formRow(formField('Session', '<select id="am-resched-sess" class="form-select"><option>Morning</option><option>Evening</option></select>')) +
  '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">' +
  '      <button onclick="amReschedConfirm()" class="btn-primary" style="justify-content:center">Confirm Reschedule</button>' +
  '      <button onclick="document.getElementById(\'am-resched-modal\').style.display=\'none\'" class="btn-outline" style="justify-content:center">Cancel</button>' +
  '    </div>' +
  '  </div>' +
  '</div>';
}

// ─── SCENARIO 4 — BED AVAILABILITY BOARD ─────────────────────────────────────
function pageBedStatus() {
  var WARDS = [
    { name:'General Ward (Male)', beds:[
      {no:'GM-01',status:'occupied',  patient:'Arjun Singh',    uhid:'HIS2600005',since:'08:30 AM'},
      {no:'GM-02',status:'available', patient:'',uhid:'',since:''},
      {no:'GM-03',status:'available', patient:'',uhid:'',since:''},
      {no:'GM-04',status:'cleaning',  patient:'',uhid:'',since:'Being sanitised'},
      {no:'GM-05',status:'occupied',  patient:'Ravi Yadav',     uhid:'HIS2600008',since:'07:00 AM'},
      {no:'GM-06',status:'available', patient:'',uhid:'',since:''},
    ]},
    { name:'General Ward (Female)', beds:[
      {no:'GF-01',status:'occupied',  patient:'Kavita Desai',   uhid:'HIS2600004',since:'Yesterday'},
      {no:'GF-02',status:'available', patient:'',uhid:'',since:''},
      {no:'GF-03',status:'available', patient:'',uhid:'',since:''},
      {no:'GF-04',status:'available', patient:'',uhid:'',since:''},
    ]},
    { name:'ICU', beds:[
      {no:'ICU-01',status:'occupied',     patient:'Critical Patient',uhid:'HIS2600006',since:'Yesterday'},
      {no:'ICU-02',status:'occupied',     patient:'Suresh Sharma',  uhid:'HIS2600007',since:'06:00 AM'},
      {no:'ICU-03',status:'available',    patient:'',uhid:'',since:''},
      {no:'ICU-04',status:'maintenance',  patient:'',uhid:'',since:'Under maintenance'},
    ]},
    { name:'Private Rooms', beds:[
      {no:'PVT-01',status:'available', patient:'',uhid:'',since:''},
      {no:'PVT-02',status:'occupied',  patient:'Mohammed Iqbal',uhid:'HIS2600003',since:'10:00 AM'},
      {no:'PVT-03',status:'available', patient:'',uhid:'',since:''},
    ]},
    { name:'Labour Room', beds:[
      {no:'LR-01',status:'occupied',  patient:'Sunita Patel',   uhid:'HIS2600002',since:'09:00 AM'},
      {no:'LR-02',status:'available', patient:'',uhid:'',since:''},
    ]},
  ];

  var total=0, occupied=0, available=0, cleaning=0;
  WARDS.forEach(function(w) { w.beds.forEach(function(b) {
    total++;
    if (b.status==='occupied') occupied++;
    else if (b.status==='available') available++;
    else cleaning++;
  }); });

  var wardCards = WARDS.map(function(w) {
    var bedGrid = w.beds.map(function(b) {
      var bg     = b.status==='occupied' ? '#fee2e2' : b.status==='available' ? '#f0fdf4' : b.status==='cleaning' ? '#fef3c7' : '#f1f5f9';
      var border = b.status==='occupied' ? '#fca5a5' : b.status==='available' ? '#86efac' : b.status==='cleaning' ? '#fcd34d' : '#cbd5e1';
      var icon   = b.status==='occupied' ? '&#128716;' : b.status==='available' ? '&#10003;' : b.status==='cleaning' ? '&#129529;' : '&#128295;';
      var label  = b.status==='available' ? 'Available' : b.status==='cleaning' ? 'Cleaning' : 'Maintenance';
      return '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:8px;padding:10px;text-align:center;min-width:100px">' +
        '<div style="font-size:18px;margin-bottom:4px">' + icon + '</div>' +
        '<div style="font-weight:700;font-size:13px;color:#1e293b">' + b.no + '</div>' +
        (b.patient
          ? '<div style="font-size:11px;color:#374151;margin-top:2px;font-weight:600">' + b.patient + '</div><div style="font-size:10.5px;color:#94a3b8">' + b.since + '</div>'
          : '<div style="font-size:11.5px;color:#16a34a;font-weight:600;margin-top:4px">' + label + '</div>'
        ) +
      '</div>';
    }).join('');
    var wardAvail = w.beds.filter(function(b){return b.status==='available';}).length;
    return sectionCard(
      w.name,
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">' + bedGrid + '</div>',
      '<span style="font-size:12.5px;color:#16a34a;font-weight:600">' + wardAvail + ' available</span>'
    );
  }).join('');

  return pageHeader(
    'Bed Availability Board',
    'Registration &amp; Front Desk <span>›</span> Bed Availability',
    '<button class="btn-outline">Export</button>'
  ) +
  kpiCards([
    { label:'Total Beds',       value:total,     color:'text-slate-700' },
    { label:'Occupied',         value:occupied,  color:'text-red-600',    sub:Math.round(occupied/total*100) + '% occupancy' },
    { label:'Available',        value:available, color:'text-green-700' },
    { label:'Cleaning / Maint', value:cleaning,  color:'text-yellow-600' },
  ]) +
  wardCards;
}
