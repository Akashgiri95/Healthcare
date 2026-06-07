// ─── REGISTRATION — Front Desk Workstation ────────────────────────────────────
// Page: reg-desk | Functions: fd*
// Depends on: DEMO_PATIENTS, _regCounter (from pg-reg-patient.js)

var _fd = { patient:null, isNew:false, dept:'', doctor:null, slot:'', session:'Morning', complaint:'' };

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
    { id:'D003', name:'Dr. Suresh Verma',  qual:'DM, MD — Cardiologist',          fee:1000, exp:'12 yrs', wait:25, available:3, next:'09:30 AM', booked:['09:00','09:30','12:00'] },
    { id:'D011', name:'Dr. Ramesh Kapoor', qual:'MD — Cardiology',                fee:700,  exp:'7 yrs',  wait:12, available:5, next:'10:00 AM', booked:['10:30'] },
  ],
  'General Medicine':[
    { id:'D001', name:'Dr. Anil Mehta',    qual:'MD, MBBS — General Physician',   fee:600,  exp:'10 yrs', wait:20, available:4, next:'09:00 AM', booked:['09:30','11:30'] },
    { id:'D012', name:'Dr. Pooja Rao',     qual:'MBBS — General Physician',       fee:400,  exp:'4 yrs',  wait:8,  available:7, next:'09:00 AM', booked:['09:30'] },
  ],
  'Gynaecology':     [
    { id:'D002', name:'Dr. Priya Sharma',  qual:'MS, MBBS — Gynaecologist',       fee:700,  exp:'9 yrs',  wait:30, available:3, next:'10:30 AM', booked:['10:30','11:00'] },
    { id:'D013', name:'Dr. Sunita Bose',   qual:'MD — Obs & Gynae',               fee:600,  exp:'6 yrs',  wait:18, available:5, next:'09:30 AM', booked:['09:00'] },
  ],
  'Paediatrics':     [
    { id:'D005', name:'Dr. Meena Joshi',   qual:'MD, MBBS — Paediatrician',       fee:600,  exp:'8 yrs',  wait:15, available:6, next:'09:00 AM', booked:[] },
    { id:'D014', name:'Dr. Arun Pillai',   qual:'DCH, MBBS — Paediatrician',      fee:500,  exp:'5 yrs',  wait:10, available:8, next:'09:00 AM', booked:['09:30'] },
  ],
  'Orthopaedics':    [
    { id:'D004', name:'Dr. Rajesh Nair',   qual:'MS, MBBS — Orthopaedic Surgeon', fee:700,  exp:'11 yrs', wait:20, available:3, next:'11:00 AM', booked:['11:00','12:30'] },
    { id:'D015', name:'Dr. Vikram Singh',  qual:'MS — Orthopaedics',              fee:600,  exp:'6 yrs',  wait:15, available:5, next:'09:30 AM', booked:['10:00'] },
  ],
  'ENT':             [{ id:'D006', name:'Dr. Vinod Patel',  qual:'MS, MBBS — ENT Surgeon',     fee:600, exp:'9 yrs',  wait:12, available:5, next:'09:30 AM', booked:['09:30'] }],
  'Dermatology':     [{ id:'D016', name:'Dr. Kavya Menon',  qual:'MD — Dermatologist',         fee:700, exp:'7 yrs',  wait:18, available:4, next:'10:00 AM', booked:['09:00','09:30'] }],
  'Ophthalmology':   [{ id:'D017', name:'Dr. Satish Gupta', qual:'MS — Ophthalmologist',       fee:800, exp:'10 yrs', wait:20, available:3, next:'10:30 AM', booked:['09:00'] }],
};

var FD_MORNING = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30'];
var FD_EVENING = ['16:00','16:30','17:00','17:30','18:00'];

// ── Handlers ──────────────────────────────────────────────────────────────────
function fdSearchPatient(q) {
  var box = document.getElementById('fd-search-results');
  if (q.length < 2) { box.style.display = 'none'; return; }
  var m = DEMO_PATIENTS.filter(function(p) {
    return p.name.toLowerCase().includes(q.toLowerCase()) || p.uhid.toLowerCase().includes(q.toLowerCase()) || p.mobile.includes(q);
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
  fdRenderPatientCard(); fdShowPanel('complaint');
}
function fdNewPatient() {
  _fd.isNew = true;
  _fd.patient = { name:'New Patient', uhid:'—', age:'?', gender:'—', mobile:'—', blood:'—' };
  document.getElementById('fd-search-results').style.display = 'none';
  fdRenderPatientCard(); fdShowPanel('complaint');
}
function fdRenderPatientCard() {
  var p = _fd.patient; var isNew = _fd.isNew;
  document.getElementById('fd-patient-area').innerHTML =
    '<div style="background:' + (isNew?'#fffbeb':'#f0fdf4') + ';border:1px solid ' + (isNew?'#fcd34d':'#bbf7d0') + ';border-radius:10px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">' +
        '<div style="font-weight:700;font-size:15px;color:#1e293b">' + p.name + '</div>' +
        '<button onclick="fdReset()" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1">&times;</button>' +
      '</div>' +
      (isNew
        ? '<div style="font-size:12.5px;color:#92400e;margin-bottom:10px">New patient — UHID generated on registration</div>' +
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
          (p.status ? '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #bbf7d0;font-size:12px;color:#64748b">Last: ' + p.dept + ' · ' + p.doctor + '</div>' : '')
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
  ['empty','complaint','done'].forEach(function(id) {
    var el = document.getElementById('fd-panel-' + id);
    if (el) el.style.display = id===which ? '' : 'none';
  });
}
function fdDetectDept(q) {
  _fd.complaint = q;
  var lower = q.toLowerCase();
  var matched = null;
  FD_SYMPTOM_MAP.forEach(function(entry) {
    if (!matched && entry.keywords.some(function(k){ return lower.includes(k); })) matched = entry.dept;
  });
  var hint = document.getElementById('fd-dept-hint');
  if (matched && q.length > 2) {
    hint.innerHTML = 'Suggested: <b>' + matched + '</b> &nbsp;<button onclick="fdSelectDept(\'' + matched + '\')" style="background:#2563eb;color:#fff;border:none;border-radius:5px;padding:2px 12px;font-size:12.5px;font-weight:600;cursor:pointer">Confirm</button>';
    hint.style.display = '';
  } else { hint.style.display = 'none'; }
}
function fdSelectDept(dept) {
  _fd.dept = dept;
  document.getElementById('fd-dept-sel').value = dept;
  document.getElementById('fd-dept-hint').style.display = 'none';
  fdLoadDoctors(dept);
}
function fdLoadDoctors(dept) {
  _fd.dept = dept; _fd.doctor = null; _fd.slot = '';
  var docs = FD_DOCTORS[dept] || [];
  if (!docs.length) { document.getElementById('fd-doctor-list').innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:16px 0">No doctors available for this department today.</div>'; return; }
  var sorted = docs.slice().sort(function(a,b){ return a.fee - b.fee; });
  var lowest = sorted[0].fee;
  document.getElementById('fd-doctor-list').innerHTML = sorted.map(function(d) {
    var isLowest = d.fee === lowest;
    return '<div id="fd-doc-card-' + d.id + '" onclick="fdSelectDoctor(\'' + d.id + '\')" style="background:#fff;border:2px solid ' + (isLowest?'#bbf7d0':'#e2e8f0') + ';border-radius:10px;padding:14px 16px;cursor:pointer;transition:all .15s;margin-bottom:8px" onmouseover="this.style.borderColor=\'#2563eb\'" onmouseout="this.style.borderColor=\'' + (isLowest?'#bbf7d0':'#e2e8f0') + '\'">' +
      '<div style="display:flex;justify-content:space-between;align-items:start">' +
        '<div>' +
          '<div style="font-weight:700;font-size:14px;color:#1e293b">' + d.name + (isLowest?' <span style="font-size:11px;background:#dcfce7;color:#15803d;padding:1px 8px;border-radius:999px;font-weight:700;margin-left:6px">Lowest fee</span>':'') + '</div>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px">' + d.qual + '</div>' +
        '</div>' +
        '<div style="text-align:right"><div style="font-size:20px;font-weight:800;color:#1e293b">&#8377;' + d.fee + '</div><div style="font-size:11px;color:#94a3b8">consultation fee</div></div>' +
      '</div>' +
      '<div style="display:flex;gap:16px;margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:12px;color:#475569">' +
        '<span><b>' + d.exp + '</b> exp</span><span><b>' + d.wait + ' min</b> wait</span><span><b>' + d.available + ' slots</b> today</span><span style="margin-left:auto;color:#2563eb;font-weight:700">Next: ' + d.next + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}
function fdSelectDoctor(docId) {
  var docs = FD_DOCTORS[_fd.dept] || [];
  _fd.doctor = docs.find(function(d){ return d.id === docId; });
  if (!_fd.doctor) return;
  docs.forEach(function(d) {
    var el = document.getElementById('fd-doc-card-' + d.id);
    if (el) el.style.borderColor = d.id===docId ? '#2563eb' : '#e2e8f0';
  });
  _fd.slot = ''; fdRenderSlots();
  document.getElementById('fd-slots-panel').style.display = '';
}
function fdRenderSlots() {
  var doc = _fd.doctor; if (!doc) return;
  var slots = _fd.session==='Morning' ? FD_MORNING : FD_EVENING;
  document.getElementById('fd-slot-grid').innerHTML = slots.map(function(s) {
    var isBk = doc.booked.includes(s), isSel = _fd.slot===s;
    var bg  = isSel?'#2563eb':isBk?'#f1f5f9':'#f0fdf4';
    var clr = isSel?'#fff':isBk?'#94a3b8':'#166534';
    var bdr = isSel?'2px solid #2563eb':isBk?'1px solid #e2e8f0':'1px solid #86efac';
    var clk = isBk?'':'onclick="fdPickSlot(\'' + s + '\')"';
    return '<div ' + clk + ' style="padding:10px;border-radius:8px;background:' + bg + ';color:' + clr + ';border:' + bdr + ';cursor:' + (isBk?'not-allowed':'pointer') + ';text-align:center;font-weight:600;font-size:13px;transition:all .15s">' +
      s + (isBk?'<div style="font-size:10px;opacity:.6;margin-top:1px">Booked</div>':'') + '</div>';
  }).join('');
  fdUpdateSummary();
}
function fdSetSession(s) {
  _fd.session = s; _fd.slot = '';
  var mBtn = document.getElementById('fd-sess-m'); var eBtn = document.getElementById('fd-sess-e');
  mBtn.style.background = s==='Morning'?'#2563eb':'#f1f5f9'; mBtn.style.color = s==='Morning'?'#fff':'#374151';
  eBtn.style.background = s==='Evening'?'#2563eb':'#f1f5f9'; eBtn.style.color = s==='Evening'?'#fff':'#374151';
  fdRenderSlots();
}
function fdPickSlot(s) { _fd.slot = _fd.slot===s?'':s; fdRenderSlots(); }
function fdUpdateSummary() {
  var box = document.getElementById('fd-summary-box'); var btn = document.getElementById('fd-confirm-btn');
  if (!_fd.doctor || !_fd.slot) { box.style.display='none'; if(btn)btn.style.display='none'; return; }
  box.style.display = '';
  box.innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#64748b;letter-spacing:.05em;margin-bottom:10px">BOOKING SUMMARY</div>' +
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;line-height:1.9">' +
      '<span style="color:#64748b">Patient</span><span style="font-weight:600">' + (_fd.isNew?(document.getElementById('fd-new-name')||{value:'New Patient'}).value||'New Patient':_fd.patient.name) + '</span>' +
      '<span style="color:#64748b">Department</span><span>' + _fd.dept + '</span>' +
      '<span style="color:#64748b">Doctor</span><span style="font-weight:600">' + _fd.doctor.name + '</span>' +
      '<span style="color:#64748b">Slot</span><span style="font-weight:700;color:#2563eb">' + _fd.slot + ' (' + _fd.session + ')</span>' +
      '<span style="color:#64748b">Fee</span><span style="font-weight:700;color:#16a34a">&#8377;' + _fd.doctor.fee + '</span>' +
    '</div>';
  if(btn) btn.style.display = 'flex';
}
function fdConfirm() {
  var uhid   = _fd.isNew ? ('HIS26' + String(_regCounter++).padStart(5,'0')) : _fd.patient.uhid;
  var codes  = {'Cardiology':'CAR','General Medicine':'GEN','Gynaecology':'GYN','Paediatrics':'PAE','Orthopaedics':'ORT','ENT':'ENT','Dermatology':'DRM','Ophthalmology':'OPH'};
  var token  = (codes[_fd.dept]||'OPD') + '-' + String(Math.floor(Math.random()*900)+100);
  var aptNo  = 'APT/26/' + String(Math.floor(Math.random()*9000)+1000);
  if (_fd.doctor && !_fd.doctor.booked.includes(_fd.slot)) _fd.doctor.booked.push(_fd.slot);
  var patName = _fd.isNew ? ((document.getElementById('fd-new-name')||{value:'New Patient'}).value||'New Patient') : _fd.patient.name;
  document.getElementById('fd-done-card').innerHTML =
    '<div style="text-align:center;margin-bottom:20px"><div style="width:56px;height:56px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">&#10003;</div><div style="font-size:17px;font-weight:800;color:#15803d">Booking Confirmed!</div><div style="font-size:13px;color:#64748b;margin-top:4px">SMS sent to patient</div></div>' +
    '<div style="background:#0d1f33;border-radius:12px;padding:20px;color:#fff;margin-bottom:16px">' +
      '<div style="font-size:11px;color:#64748b;letter-spacing:.08em;margin-bottom:10px">PATIENT TOKEN CARD</div>' +
      '<div style="font-size:22px;font-weight:800;margin-bottom:2px">' + patName + '</div>' +
      '<div style="font-size:28px;font-weight:900;font-family:monospace;color:#60a5fa;letter-spacing:.05em;margin:6px 0">' + uhid + '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1)">' +
        '<div><div style="font-size:11px;color:#94a3b8">OPD TOKEN</div><div style="font-size:20px;font-weight:800;font-family:monospace;color:#34d399">' + token + '</div></div>' +
        '<div style="text-align:right"><div style="font-size:11px;color:#94a3b8">APPOINTMENT</div><div style="font-size:14px;font-weight:700;color:#fbbf24">' + aptNo + '</div></div>' +
      '</div>' +
      '<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;color:#94a3b8">' +
        _fd.doctor.name + ' · ' + _fd.dept + ' · ' + _fd.slot + ' (' + _fd.session + ') · &#8377;' + _fd.doctor.fee + '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<button onclick="fdReset()" style="padding:10px;border-radius:8px;background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;font-weight:600;font-size:13.5px;cursor:pointer">Next Patient</button>' +
      '<button onclick="navTo(\'opd-queue\')" style="padding:10px;border-radius:8px;background:#2563eb;color:#fff;border:none;font-weight:600;font-size:13.5px;cursor:pointer">View OPD Queue</button>' +
    '</div>';
  fdShowPanel('done');
}

// ── Page function ─────────────────────────────────────────────────────────────
function pageRegDesk() {
  var today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var deptOptions = ['','Cardiology','General Medicine','Gynaecology','Paediatrics','Orthopaedics','ENT','Dermatology','Ophthalmology']
    .map(function(d){ return '<option value="' + d + '">' + (d||'Select Department') + '</option>'; }).join('');

  return pageHeader('Front Desk Workstation', 'Registration &amp; Front Desk <span>›</span> Front Desk', '<span style="font-size:13px;color:#64748b">' + today + '</span>') +
  '<div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start">' +
  '<div>' +
    sectionCard('Patient Identification',
      '<div style="position:relative;margin-bottom:12px">' +
        '<input id="fd-search-inp" class="form-input" placeholder="Search UHID, mobile or name..." oninput="fdSearchPatient(this.value)" autocomplete="off">' +
        '<div id="fd-search-results" style="display:none;position:absolute;left:0;right:0;top:40px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:20;max-height:220px;overflow-y:auto"></div>' +
      '</div>' +
      '<button onclick="fdNewPatient()" class="btn-outline" style="width:100%;justify-content:center;font-size:13px;margin-bottom:14px">+ Register as New Patient</button>' +
      '<div id="fd-patient-area"><div style="color:#94a3b8;font-size:13px;text-align:center;padding:32px 0">Search or register a patient to begin</div></div>'
    ) +
    sectionCard("Today's Queue",
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">' +
        '<div style="background:#eff6ff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#1d4ed8">3</div><div style="color:#64748b;font-size:12px">Waiting</div></div>' +
        '<div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#15803d">1</div><div style="color:#64748b;font-size:12px">In Consult</div></div>' +
        '<div style="background:#fefce8;border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#ca8a04">4</div><div style="color:#64748b;font-size:12px">Appointments</div></div>' +
        '<div style="background:#f8fafc;border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#475569">8</div><div style="color:#64748b;font-size:12px">Total Today</div></div>' +
      '</div>' +
      '<button onclick="navTo(\'opd-queue\')" class="btn-outline" style="width:100%;justify-content:center;margin-top:10px;font-size:13px">Open Full Queue</button>'
    )
  + '</div>' +
  '<div>' +
    '<div id="fd-panel-empty">' +
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:48px;text-align:center;color:#94a3b8">' +
      '<div style="font-size:48px;margin-bottom:12px">&#128100;</div>' +
      '<div style="font-size:15px;font-weight:600;color:#64748b">Start by identifying the patient</div>' +
      '<div style="font-size:13px;margin-top:6px">Search by UHID / mobile / name, or register as new patient</div>' +
    '</div></div>' +

    '<div id="fd-panel-complaint" style="display:none">' +
    sectionCard('Chief Complaint &amp; Department',
      '<div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;margin-bottom:10px">' +
        '<div>' +
          '<label class="form-label">Patient\'s chief complaint <span style="font-weight:400;color:#94a3b8">(type to auto-suggest department)</span></label>' +
          '<input id="fd-complaint-inp" class="form-input" placeholder="e.g. chest pain, fever, back pain..." oninput="fdDetectDept(this.value)">' +
          '<div id="fd-dept-hint" style="display:none;margin-top:6px;font-size:13px;color:#374151;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 10px"></div>' +
        '</div>' +
        '<div><label class="form-label">Or select department</label><select id="fd-dept-sel" class="form-select" onchange="fdLoadDoctors(this.value)">' + deptOptions + '</select></div>' +
      '</div>'
    ) +
    '<div id="fd-doctor-list" style="margin-bottom:16px"></div>' +
    '<div id="fd-slots-panel" style="display:none">' +
    sectionCard('Select Appointment Slot',
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">' +
        '<div id="fd-doc-chosen" style="font-size:13.5px;font-weight:700;color:#1e293b;flex:1"></div>' +
        '<button id="fd-sess-m" onclick="fdSetSession(\'Morning\')" style="padding:5px 14px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;cursor:pointer;background:#2563eb;color:#fff">Morning</button>' +
        '<button id="fd-sess-e" onclick="fdSetSession(\'Evening\')" style="padding:5px 14px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;cursor:pointer;background:#f1f5f9;color:#374151">Evening</button>' +
      '</div>' +
      '<div id="fd-slot-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"></div>'
    ) + '</div>' +
    '<div id="fd-summary-box" style="display:none;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px"></div>' +
    '<button id="fd-confirm-btn" onclick="fdConfirm()" class="btn-success" style="display:none;width:100%;justify-content:center;padding:12px;font-size:14px">Confirm Booking &amp; Issue Token</button>' +
    '</div>' +

    '<div id="fd-panel-done" style="display:none"><div id="fd-done-card"></div></div>' +
  '</div>' +
  '</div>';
}
