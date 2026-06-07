// ─── REGISTRATION — Scenarios Home ───────────────────────────────────────────
// Page: reg-home | Functions: regOpenScenario, pageRegHome

var REG_SCENARIOS = [
  { n:1,  name:'New Patient Walk-in Registration',
    purpose:'Capture demographic, contact and identity details for a first-time patient; generate unique UHID; duplicate check.',
    steps:[
      { role:'Front Desk Staff', action:'Patient arrives at counter.\nStaff opens New Patient Registration screen.\nEnters: full name, DOB, gender, blood group, address, mobile, emergency contact, marital status, religion.\nConfirms no prior visit.', response:'UHID auto-generated — unique permanent identifier.\nDuplicate check runs on name + DOB + mobile.\nIf match found: HIS shows existing records and asks to confirm or link.\nForm saved with staff ID and timestamp.' },
      { role:'Front Desk Staff', action:'Selects ID proof type (Aadhaar / PAN / Passport / DL / Voter ID).\nEnters ID number.\nUploads scanned copy.\nPrints consent form and obtains signature.', response:'Aadhaar masked — only last 4 digits shown (UIDAI compliance).\nSigned consent attached to DMS.\nSMS sent: UHID number + hospital helpline.' },
      { role:'Front Desk Staff', action:'HIS generates UHID card with patient name, UHID and QR code.\nStaff prints card and hands to patient.', response:'UHID card: name, UHID, date of registration, QR code.\nQR links to patient record — scannable at any department.\nPatient record status set to Active.' },
    ]
  },
  { n:2,  name:'Returning Patient Check-in',
    purpose:'Identify returning patient by UHID or mobile, verify demographics, link to today\'s visit, avoid duplicate UHID creation.',
    steps:[
      { role:'Front Desk Staff', action:'Patient states name or presents UHID card.\nStaff searches HIS by UHID / mobile / name.\nVerifies identity and retrieves last visit summary.', response:'Record retrieved in < 2 seconds.\nLast visit date, treating doctor, department displayed.\nPending lab results or prescriptions flagged.' },
      { role:'Front Desk Staff', action:'Confirms or updates address, mobile, insurance details.\nSelects today\'s department and doctor.\nIssues new OPD token.', response:'Updated fields saved with change log (old value, new value, staff ID, timestamp).\nMobile number change triggers OTP verification.\nDoctor queue updated in real time.' },
    ]
  },
  { n:3,  name:'Duplicate UHID Detection & Merge',
    purpose:'Identify patients with multiple UHID records; merge into single UHID while preserving full clinical history.',
    steps:[
      { role:'Registration Supervisor', action:'Runs Duplicate Patient Report.\nHIS scans all records for name + DOB + mobile matches.\nReviews flagged pairs — High / Medium / Low confidence.', response:'Duplicate report shows match score per pair.\nBoth records displayed side by side: demographics, visits, billing.' },
      { role:'Registration Supervisor', action:'Selects Primary UHID (retained) and Secondary UHID (to retire).\nConfirms merge action.', response:'All clinical history from Secondary transferred to Primary.\nSecondary UHID retired — any scan redirects to Primary.\nMerge event logged in audit trail.' },
    ]
  },
  { n:4,  name:'Minor / Dependent Patient Registration',
    purpose:'Register patients below 18 or dependants; link guardian details; capture legal guardian relationship and consent.',
    steps:[
      { role:'Front Desk Staff', action:'Guardian presents child at counter.\nStaff enters patient details.\nFlags as Minor (auto-set if age < 18).\nEnters guardian name, relationship, mobile and UHID.', response:'UHID issued to minor — separate from guardian UHID.\nGuardian UHID linked.\nPaediatric clinical protocols auto-activated.' },
      { role:'Front Desk Staff', action:'Prints consent form with guardian name and relationship pre-filled.\nGuardian signs consent.\nScans and attaches signed consent.', response:'Consent form shows: patient name, guardian name, relationship, consent scope.\nIf guardian is not parent: legal document prompted.' },
    ]
  },
  { n:5,  name:'OPD Appointment Booking (In-person)',
    purpose:'Book OPD appointments at counter against doctor availability; prevent double-booking; issue confirmed appointment slip.',
    steps:[
      { role:'Front Desk Staff', action:'Patient requests OPD appointment at counter.\nStaff searches patient by UHID or registers new.\nSelects department, doctor, date and session.\nViews available slots — filled slots greyed out.\nSelects slot and confirms.', response:'Available slots shown from doctor schedule master.\nDouble-booking prevented — slot locked on selection.\nAppointment confirmed: appointment number generated.' },
      { role:'Front Desk Staff', action:'HIS generates appointment slip automatically.\nStaff prints slip and hands to patient.', response:'Appointment slip: patient name, UHID, doctor, date, time, room, appointment number.\nSMS confirmation sent.\nSlip has QR code for quick check-in.' },
    ]
  },
  { n:6,  name:'Online / Kiosk Appointment Booking',
    purpose:'Enable patients to book OPD appointments via hospital website, app or self-service kiosk.',
    steps:[
      { role:'Patient / Kiosk', action:'Patient opens hospital website, app or kiosk.\nLogs in with mobile number and OTP.\nSelects department and doctor.\nViews available slots in real time.\nSelects slot and confirms.', response:'Online slots synced in real time with HIS.\nBooking confirmed: appointment number generated.\nSMS + email confirmation sent immediately.' },
      { role:'HIS (Automated)', action:'HIS sends reminders 24 hours and 2 hours before appointment.\nPatient can cancel or reschedule via link in SMS.', response:'Reminder: doctor name, date, time, OPD location.\nCancellation via SMS link: slot released immediately.\nNo-show marked automatically if patient does not check in within 30 min.' },
    ]
  },
  { n:7,  name:'Appointment Cancellation & Rescheduling',
    purpose:'Process patient-initiated or hospital-initiated cancellations; release slots immediately; notify patients; track cancellation reasons.',
    steps:[
      { role:'Front Desk Staff', action:'Patient requests cancellation or reschedule.\nStaff searches appointment by number or UHID.\nSelects Cancel or Reschedule.\nRecords reason.', response:'Cancelled slot released immediately.\nPatient notified via SMS.\nCancellation reason and staff ID logged.' },
      { role:'HIS (Automated)', action:'Doctor or admin marks doctor as On Leave for a date.\nHIS identifies all affected appointments.', response:'All affected appointments listed.\nSMS sent to each patient: appointment cancelled, request to rebook.\nSlots auto-released.' },
    ]
  },
  { n:8,  name:'Walk-in Queue & Token Management',
    purpose:'Issue token numbers to walk-in patients; manage booked vs walk-in queues; display live queue on screens.',
    steps:[
      { role:'Front Desk Staff', action:'Walk-in patient arrives without appointment.\nStaff verifies UHID or registers new patient.\nSelects department and doctor.\nIssues OPD token.', response:'Token number issued sequentially per department per session.\nTwo queues: Booked Appointment (priority) and Walk-in.\nToken printed and handed to patient.' },
      { role:'HIS Display System', action:'OPD display screens show live token queue.\nCalled token displayed with patient name and OPD room.\nDoctor calls next patient from console.', response:'Display fed by HIS in real time.\nDoctor marks consultation complete — next token auto-called.\nSMS sent to patient when token is called.' },
    ]
  },
  { n:9,  name:'Emergency Patient Registration',
    purpose:'Register critically ill patients with minimum data entry to avoid treatment delay; complete full registration retrospectively.',
    steps:[
      { role:'Emergency / Front Desk Staff', action:'Patient arrives in Emergency in critical condition.\nEmergency nurse opens Emergency Fast Registration screen.\nEnters only: name (or Unknown), age estimate, gender, triage level.\nClicks Register — UHID issued immediately.', response:'Emergency UHID issued in < 10 seconds.\nClinical care begins immediately.\nEmergency flag and triage level visible on all screens.' },
      { role:'Front Desk Staff', action:'Patient or guardian provides full identity details after stabilisation.\nStaff opens Emergency record and updates all missing fields.', response:'Emergency alias replaced with real name across all records.\nAll clinical entries under Emergency UHID retained without re-entry.' },
    ]
  },
  { n:10, name:'MLC (Medico-Legal Case) Registration',
    purpose:'Register medico-legal cases with mandatory police intimation, MLC number generation and tamper-proof documentation.',
    steps:[
      { role:'Emergency Doctor / Registration Staff', action:'Emergency doctor flags case as MLC: RTA, assault, poisoning, burns.\nEnters: MLC type, date and time of incident, place, informant name.', response:'MLC number auto-generated: unique, sequential, year-prefixed.\nPolice intimation letter auto-generated.\nMLC register entry created automatically.' },
      { role:'Registration Staff / MLC In-charge', action:'Reviews auto-generated police intimation letter.\nSends intimation to nearest police station.\nRecords police station name and acknowledgement number.', response:'Intimation submission recorded in HIS: method, time sent, acknowledgement.\nAll subsequent clinical entries timestamped and locked after sign-off.' },
    ]
  },
  { n:11, name:'Planned Admission Registration',
    purpose:'Register patients for planned IPD admission; capture admission category, treating doctor and ward preference; collect advance payment.',
    steps:[
      { role:'Admission Desk Staff', action:'Patient arrives at Admission Desk with doctor\'s admission advice.\nStaff opens Planned Admission screen.\nSelects UHID, treating doctor, admission category, ward preference.\nCollects advance payment.', response:'IP Number auto-generated.\nBed allocation screen opens: shows available beds by category.\nAdvance receipt generated.\nNurse station notified.' },
      { role:'Admission Desk Staff', action:'Prints and obtains signature on: admission consent, financial consent, general terms.\nScans and attaches all signed documents.', response:'All consent documents attached to IP record.\nBilling pre-authorisation sent to TPA if insurance case.' },
    ]
  },
  { n:12, name:'Emergency-to-Ward Admission Transfer',
    purpose:'Convert an emergency episode to a formal IPD admission; transfer all emergency clinical data to IPD record; allocate ward bed.',
    steps:[
      { role:'Emergency Doctor / Admission Desk Staff', action:'Emergency doctor decides patient requires ward admission.\nOpens Admit to Ward option from Emergency record.\nAdmission Desk allocates bed from availability screen.', response:'IP number generated and linked to existing Emergency UHID.\nAll emergency clinical entries transferred to IPD record.\nBed status updated to Occupied.\nWard nurse station notified.' },
      { role:'Ward / Admission Desk Staff', action:'Nurse prints transfer slip with IP number, ward, bed and diagnosis.\nDocuments clinical handover in HIS.', response:'Clinical handover documented: diagnosis, vitals, drugs given, allergies, pending investigations.\nBilling switched from Emergency to IPD rate from time of transfer.' },
    ]
  },
];

function regOpenScenario(n) {
  var sc = REG_SCENARIOS.find(function(s){ return s.n === n; });
  if (!sc) return;
  var demoPage = n===1?'patient-reg':n===2?'patient-reg':n===5?'appointments':n===8?'opd-queue':null;
  var demoBtn = demoPage
    ? '<button onclick="document.getElementById(\'reg-sc-modal\').style.display=\'none\';navTo(\'' + demoPage + '\')" style="background:#2563eb;color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:13.5px;font-weight:600;cursor:pointer">Open Interactive Demo</button>'
    : '';
  var stepsHtml = sc.steps.map(function(st, i) {
    var aLines = st.action.split('\n').map(function(l){ return l?'<li style="margin-bottom:3px">'+l+'</li>':''; }).join('');
    var rLines = st.response.split('\n').map(function(l){ return l?'<li style="margin-bottom:3px">'+l+'</li>':''; }).join('');
    return '<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:0;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' +
      '<div style="background:#2563eb;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 14px;min-width:60px">' +
        '<div style="font-size:11px;font-weight:600;letter-spacing:.06em;opacity:.8;margin-bottom:4px">STEP</div>' +
        '<div style="font-size:22px;font-weight:800">'+(i+1)+'</div>' +
      '</div>' +
      '<div style="padding:14px 16px;border-right:1px solid #e2e8f0">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.06em;margin-bottom:6px">USER ACTION &nbsp;·&nbsp; <span style="color:#0891b2">'+st.role+'</span></div>' +
        '<ul style="margin:0;padding-left:16px;font-size:13px;color:#1e293b;line-height:1.6">'+aLines+'</ul>' +
      '</div>' +
      '<div style="padding:14px 16px;background:#f8fafc">' +
        '<div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.06em;margin-bottom:6px">HIS RESPONSE</div>' +
        '<ul style="margin:0;padding-left:16px;font-size:13px;color:#166534;line-height:1.6">'+rLines+'</ul>' +
      '</div>' +
    '</div>';
  }).join('');
  document.getElementById('reg-sc-modal-title').textContent   = 'Scenario ' + n + ' — ' + sc.name;
  document.getElementById('reg-sc-modal-purpose').textContent = sc.purpose;
  document.getElementById('reg-sc-modal-steps').innerHTML     = stepsHtml;
  document.getElementById('reg-sc-modal-demo').innerHTML      = demoBtn;
  document.getElementById('reg-sc-modal').style.display       = 'flex';
}

// ── Page function ─────────────────────────────────────────────────────────────
function pageRegHome() {
  var colors = ['#0891b2','#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0284c7','#9333ea','#dc2626','#0d9488','#ca8a04','#6366f1'];
  var cats = { 'Patient Master':[1,2,3,4], 'Appointments':[5,6,7], 'Queue & Token':[8], 'Emergency & Admission':[9,10,11,12] };

  var catHtml = Object.keys(cats).map(function(cat) {
    var cards = cats[cat].map(function(n) {
      var sc = REG_SCENARIOS.find(function(s){ return s.n===n; });
      var color = colors[n-1];
      var hasDemo = (n===1||n===2||n===5||n===8);
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;display:flex;gap:16px;align-items:flex-start;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,.08)\'" onmouseout="this.style.boxShadow=\'\'" onclick="regOpenScenario('+n+')">' +
        '<div style="width:44px;height:44px;border-radius:10px;background:'+color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex-shrink:0">'+n+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:4px">'+sc.name+'</div>' +
          '<div style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:10px">'+sc.purpose.slice(0,110)+(sc.purpose.length>110?'…':'')+'</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span style="font-size:11.5px;background:#f1f5f9;color:#475569;padding:2px 10px;border-radius:999px;font-weight:600">'+sc.steps.length+' steps</span>' +
            (hasDemo?'<span style="font-size:11.5px;background:#eff6ff;color:#1d4ed8;padding:2px 10px;border-radius:999px;font-weight:600">Interactive demo</span>':'') +
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

  return pageHeader('Registration &amp; Front Desk', 'Scenarios Overview', '<span style="font-size:13px;color:#64748b">12 scenarios · Click any card to view flow</span>') +
  kpiCards([
    { label:'Total Scenarios', value:'12', color:'text-slate-700' },
    { label:'Patient Master',  value:'4',  color:'text-blue-700',   sub:'Reg, Returning, Duplicate, Minor' },
    { label:'Appointments',    value:'3',  color:'text-purple-700', sub:'In-person, Online, Cancel/Reschedule' },
    { label:'Emergency & IPD', value:'5',  color:'text-red-600',    sub:'Emergency, MLC, Admission, Transfer' },
  ]) +
  '<div style="max-width:960px">' + catHtml + '</div>' +

  '<div id="reg-sc-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center" onclick="this.style.display=\'none\'">' +
  '  <div style="background:#fff;border-radius:16px;width:860px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.3)" onclick="event.stopPropagation()">' +
  '    <div style="padding:22px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:start;position:sticky;top:0;background:#fff;z-index:1">' +
  '      <div><div id="reg-sc-modal-title" style="font-size:17px;font-weight:800;color:#0f172a"></div><div id="reg-sc-modal-purpose" style="font-size:12.5px;color:#64748b;margin-top:4px;max-width:640px;line-height:1.5"></div></div>' +
  '      <button onclick="document.getElementById(\'reg-sc-modal\').style.display=\'none\'" style="background:none;border:none;font-size:22px;color:#94a3b8;cursor:pointer;line-height:1;flex-shrink:0">&times;</button>' +
  '    </div>' +
  '    <div id="reg-sc-modal-steps" style="padding:20px 24px"></div>' +
  '    <div id="reg-sc-modal-demo" style="padding:0 24px 20px"></div>' +
  '  </div>' +
  '</div>';
}
