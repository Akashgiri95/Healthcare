// ─── REGISTRATION — New Patient Registration & Returning Check-in ──────────────
// Page: patient-reg | Functions: reg*
// Declares globals: DEMO_PATIENTS, _regCounter (used by pg-reg-desk.js too)

var DEMO_PATIENTS = [
  { uhid:'HIS2600001', name:'Ramesh Kumar',   age:42, gender:'Male',   dob:'1983-03-12', mobile:'9876543210', blood:'B+',  dept:'General Medicine', doctor:'Dr. Anil Mehta',   token:'GEN-042', type:'OPD', payer:'Self',      status:'waiting',        reg:'09:10 AM', emergency:false, insurance:'', abha:'ABHA-1234-5678' },
  { uhid:'HIS2600002', name:'Sunita Patel',   age:35, gender:'Female', dob:'1990-07-22', mobile:'9812345678', blood:'A+',  dept:'Gynaecology',      doctor:'Dr. Priya Sharma', token:'GYN-017', type:'OPD', payer:'Insurance', status:'in-consultation', reg:'09:25 AM', emergency:false, insurance:'Star Health', abha:'' },
  { uhid:'HIS2600003', name:'Mohammed Iqbal', age:58, gender:'Male',   dob:'1967-11-05', mobile:'9900112233', blood:'O+',  dept:'Cardiology',       doctor:'Dr. Suresh Verma', token:'CAR-009', type:'OPD', payer:'CGHS',      status:'waiting',        reg:'09:40 AM', emergency:false, insurance:'CGHS', abha:'' },
  { uhid:'HIS2600004', name:'Kavita Desai',   age:29, gender:'Female', dob:'1996-02-18', mobile:'9988776655', blood:'AB+', dept:'Orthopaedics',     doctor:'Dr. Rajesh Nair',  token:'ORT-023', type:'OPD', payer:'Self',      status:'done',           reg:'08:55 AM', emergency:false, insurance:'', abha:'' },
  { uhid:'HIS2600005', name:'Arjun Singh',    age:67, gender:'Male',   dob:'1958-09-30', mobile:'9776655443', blood:'B-',  dept:'General Medicine', doctor:'Dr. Anil Mehta',   token:'GEN-043', type:'IPD', payer:'Self',      status:'admitted',       reg:'08:30 AM', emergency:true,  insurance:'', abha:'' },
];

var _regCounter  = 6;
var _regStep     = 1;
var _regNewUhid  = '';
var _regNewToken = '';

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
    if (!name || !mobile || !dob) { alert('Please fill Name, Date of Birth and Mobile Number.'); return; }
    regShowStep(2);
  } else if (_regStep === 2) {
    var idType  = document.getElementById('reg-id-type').value;
    var idNum   = document.getElementById('reg-id-num').value;
    var consent = document.getElementById('reg-consent');
    if (!idType || !idNum) { alert('Please select ID proof type and enter ID number.'); return; }
    if (!consent.checked) { alert('Patient consent is mandatory before registration.'); return; }
    _regNewUhid  = 'HIS26' + String(_regCounter++).padStart(5,'0');
    var depts    = ['GEN','GYN','CAR','ORT','PAE','ENT'];
    _regNewToken = depts[Math.floor(Math.random()*depts.length)] + '-' + String(Math.floor(Math.random()*900)+100);
    var nameVal  = document.getElementById('reg-name').value || 'New Patient';
    var deptSel  = document.getElementById('reg-dept');
    var deptVal  = deptSel ? deptSel.value : 'General Medicine';
    var doctSel  = document.getElementById('reg-doctor');
    var doctVal  = doctSel ? doctSel.options[doctSel.selectedIndex].text : 'Dr. Anil Mehta';
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
  var matches = DEMO_PATIENTS.filter(function(p) {
    return p.uhid.toLowerCase().includes(q.toLowerCase()) || p.mobile.includes(q) || p.name.toLowerCase().includes(q.toLowerCase());
  });
  if (!matches.length) { res.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:8px">No records found</div>'; return; }
  res.innerHTML = matches.map(function(p) {
    return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">' +
      '<div>' +
        '<div style="font-weight:700;color:#1e293b">' + p.name + ' <span style="font-family:monospace;font-size:12px;color:#64748b">' + p.uhid + '</span></div>' +
        '<div style="font-size:12.5px;color:#64748b;margin-top:2px">' + p.age + 'Y ' + p.gender + ' · ' + p.mobile + ' · ' + p.blood + '</div>' +
        '<div style="font-size:12px;color:#94a3b8;margin-top:2px">' + p.dept + ' · ' + p.doctor + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn-outline" style="font-size:12.5px;padding:6px 14px" onclick="alert(\'Viewing record for ' + p.uhid + '\')">View Record</button>' +
        '<button class="btn-primary" style="font-size:12.5px;padding:6px 14px" onclick="regIssueToken(\'' + p.uhid + '\')">Issue Token</button>' +
      '</div>' +
    '</div>';
  }).join('');
}
function regIssueToken(uhid) { alert('Token issued for ' + uhid); }
function regReset() {
  document.querySelectorAll('#reg-new-panel input:not([type=file]), #reg-new-panel select, #reg-new-panel textarea').forEach(function(el) {
    if (el.type === 'checkbox') { el.checked = false; return; }
    if (el.type !== 'button') el.value = el.defaultValue || '';
  });
  var warn = document.getElementById('reg-dup-warn');
  if (warn) warn.style.display = 'none';
}
function regTogglePayer() {}

// ── Page function ─────────────────────────────────────────────────────────────
function pagePatientReg() {
  var today = new Date().toISOString().split('T')[0];
  return pageHeader(
    'New Patient Walk-in Registration',
    'Registration &amp; Front Desk <span>›</span> Patient Registration',
    '<button class="btn-outline" onclick="regToggle(\'search\')">Returning Patient</button>' +
    ' <button class="btn-primary" onclick="regToggle(\'new\')">+ New Patient</button>'
  ) +

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

  '<div id="reg-new-panel">' +
  '<div id="reg-step-bar" style="display:flex;align-items:center;justify-content:center;padding:20px 0 24px;gap:0"></div>' +

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
  ) + '</div>' +

  '<div id="reg-step-2" style="display:none">' +
  sectionCard('Step 2 — Identity Proof &amp; Consent',
    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#1d4ed8">' +
      '<b>Note:</b> Aadhaar number will be masked — only last 4 digits displayed (UIDAI compliance).' +
    '</div>' +
    formRow(
      formField('ID Proof Type', '<select id="reg-id-type" class="form-select"><option value="">Select ID type</option><option>Aadhaar Card</option><option>PAN Card</option><option>Passport</option><option>Driving Licence</option><option>Voter ID</option><option>CGHS Card</option></select>', true),
      formField('ID Number', '<input id="reg-id-num" class="form-input" placeholder="Enter ID number">', true),
      formField('Upload Scan / Photo', '<input type="file" class="form-input" accept="image/*,.pdf" style="padding:5px">')
    ) +
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:8px">' +
      '<div style="font-weight:600;font-size:13.5px;color:#1e293b;margin-bottom:12px">Patient / Guardian Consent</div>' +
      '<div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:14px">I hereby consent to collection and processing of my personal and medical information for the purpose of receiving healthcare services at this hospital.</div>' +
      '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13.5px;font-weight:600;color:#1e293b">' +
        '<input id="reg-consent" type="checkbox" style="width:16px;height:16px;cursor:pointer"> ' +
        'Patient / Guardian has given verbal consent and signed the consent form' +
      '</label>' +
    '</div>' +
    '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;margin-top:14px;font-size:12.5px;color:#166534">' +
      '&#10003; SMS will be sent to patient with UHID number and appointment details.' +
    '</div>',
    '<div style="display:flex;gap:8px">' +
    '  <button class="btn-outline" onclick="regShowStep(1)">← Back</button>' +
    '  <button class="btn-primary" onclick="regNext()">Register &amp; Generate UHID →</button>' +
    '</div>'
  ) + '</div>' +

  '<div id="reg-step-3" style="display:none">' +
  '<div style="max-width:680px;margin:0 auto">' +
  '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px">' +
    '<div style="width:44px;height:44px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0">&#10003;</div>' +
    '<div>' +
      '<div style="font-weight:700;font-size:15px;color:#15803d">Patient Registered Successfully</div>' +
      '<div style="font-size:13px;color:#166534;margin-top:2px">UHID issued · OPD token generated · SMS sent</div>' +
    '</div>' +
  '</div>' +
  '<div style="background:linear-gradient(135deg,#0d1f33 0%,#1e3a5f 100%);border-radius:16px;padding:24px 28px;color:#fff;margin-bottom:20px;position:relative;overflow:hidden">' +
    '<div style="position:absolute;right:-20px;top:-20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.05)"></div>' +
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
  '</div></div>' +
  '</div>';
}
