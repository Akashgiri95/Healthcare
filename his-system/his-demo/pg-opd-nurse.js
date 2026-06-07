// ─── OPD CYCLE — Screen 2: Nurse Pre-consultation ────────────────────────────
// Page: opd-nurse | Functions: nurse*, nurseInit
// Depends on: OPD_QUEUE, oqPriorityScore (pg-opd-queue.js)
// Exports: NURSE_VITALS (read by pg-opd-consult.js)

var NURSE_VITALS    = {};   // uhid → vitals object; read by Doctor Consultation
var _nurseUhid      = null;
var _nursePain      = null;
var _nurseAllergies = [];
var _nurseTriage    = '';
var _nurseShowList  = true;

// ── BMI auto-calc ─────────────────────────────────────────────────────────────
function nurseCalcBMI() {
  var wt = parseFloat((document.getElementById('nv-weight')||{value:''}).value);
  var ht = parseFloat((document.getElementById('nv-height')||{value:''}).value);
  var el = document.getElementById('nv-bmi');
  if(!el) return;
  if(wt > 0 && ht > 0) {
    var m   = ht / 100;
    var bmi = (wt / (m * m)).toFixed(1);
    var cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    var col = bmi < 18.5 ? '#ca8a04' : bmi < 25 ? '#16a34a' : bmi < 30 ? '#ea580c' : '#dc2626';
    el.innerHTML = '<span style="font-size:20px;font-weight:900;color:'+col+'">'+bmi+'</span><span style="font-size:11px;color:'+col+';margin-left:5px">'+cat+'</span>';
  } else {
    el.innerHTML = '<span style="color:#94a3b8;font-size:13px">—</span>';
  }
}

// ── Pain scale ────────────────────────────────────────────────────────────────
function nurseSetPain(n) {
  _nursePain = n;
  for(var i = 0; i <= 10; i++) {
    var btn = document.getElementById('nv-pain-'+i); if(!btn) continue;
    var col = i<=2?'#16a34a':i<=4?'#ca8a04':i<=6?'#ea580c':i<=8?'#dc2626':'#7f1d1d';
    btn.style.background  = i===n ? col : '#f8fafc';
    btn.style.color       = i===n ? '#fff' : col;
    btn.style.borderColor = col;
    btn.style.transform   = i===n ? 'scale(1.2)' : 'scale(1)';
    btn.style.fontWeight  = i===n ? '900' : '700';
  }
}

// ── Triage color ──────────────────────────────────────────────────────────────
function nurseSetTriage(color) {
  _nurseTriage = color;
  ['GREEN','YELLOW','RED','BLACK'].forEach(function(c) {
    var el = document.getElementById('nv-triage-'+c); if(!el) return;
    el.style.opacity   = c===color ? '1' : '0.3';
    el.style.transform = c===color ? 'scale(1.06)' : 'scale(1)';
    el.style.boxShadow = c===color ? '0 0 0 3px rgba(37,99,235,.25)' : 'none';
  });
}

// ── Allergy chips ─────────────────────────────────────────────────────────────
function nurseAddAllergy() {
  var inp = document.getElementById('nv-allergy-inp');
  var val = inp ? inp.value.trim() : '';
  if(!val) return;
  if(_nurseAllergies.indexOf(val) === -1) _nurseAllergies.push(val);
  if(inp) inp.value = '';
  nurseRenderAllergies();
}
function nurseRemoveAllergy(idx) {
  _nurseAllergies.splice(idx, 1);
  nurseRenderAllergies();
}
function nurseRenderAllergies() {
  var el = document.getElementById('nv-allergy-chips'); if(!el) return;
  if(!_nurseAllergies.length) {
    el.innerHTML = '<span style="font-size:12px;color:#94a3b8">None recorded</span>';
    return;
  }
  el.innerHTML = _nurseAllergies.map(function(a, i) {
    return '<span style="display:inline-flex;align-items:center;gap:5px;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:999px;padding:3px 12px;font-size:12.5px;font-weight:600;margin:2px">'+
      a+'<span onclick="nurseRemoveAllergy('+i+')" style="cursor:pointer;font-size:15px;line-height:1;opacity:.7">&times;</span></span>';
  }).join('');
}

// ── Patient list (left panel) ─────────────────────────────────────────────────
function nurseSelect(uhid) {
  _nurseUhid      = uhid;
  _nursePain      = null;
  _nurseAllergies = [];
  _nurseTriage    = '';
  nurseRenderPatients();
  nurseRenderForm();
}

function nurseRenderPatients() {
  var el = document.getElementById('nurse-pt-list'); if(!el) return;
  var pts = OPD_QUEUE.filter(function(p){ return p.status==='vitals'; })
    .sort(function(a,b){ return oqPriorityScore(a)-oqPriorityScore(b); });

  var ctEl = document.getElementById('nurse-pt-count');
  if(ctEl) ctEl.textContent = pts.length+' patient'+(pts.length!==1?'s':'');

  if(!pts.length) {
    el.innerHTML =
      '<div style="text-align:center;padding:48px 16px;color:#94a3b8">'+
        '<div style="font-size:40px;margin-bottom:10px">&#128203;</div>'+
        '<div style="font-size:13px;margin-bottom:14px">No patients in vitals queue</div>'+
        '<button onclick="navTo(\'opd-queue\')" class="btn-outline" style="font-size:12.5px">&#8592; Back to Queue</button>'+
      '</div>';
    return;
  }

  var pfChip = function(flags) {
    return flags.map(function(f) {
      var map  ={emergency:'#dc2626',pregnant:'#db2777',senior:'#ca8a04',disabled:'#0891b2'};
      var lbl  ={emergency:'EMRG',pregnant:'PREG',senior:'SR.CTZN',disabled:'DISB'};
      return '<span style="font-size:10px;font-weight:700;background:'+map[f]+';color:#fff;padding:1px 5px;border-radius:3px;margin-right:2px">'+lbl[f]+'</span>';
    }).join('');
  };

  el.innerHTML = pts.map(function(p) {
    var active    = p.uhid===_nurseUhid;
    var hasVitals = !!NURSE_VITALS[p.uhid];
    return '<div onclick="nurseSelect(\''+p.uhid+'\')" style="padding:13px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;'+
      'background:'+(active?'#eff6ff':'#fff')+';border-left:3px solid '+(active?'#2563eb':'transparent')+';transition:background .1s">'+
      '<div style="font-weight:700;font-size:13.5px;color:#1e293b;margin-bottom:2px">'+p.name+' '+pfChip(p.priority)+'</div>'+
      '<div style="font-size:11.5px;color:#94a3b8">'+p.uhid+' &middot; '+p.token+'</div>'+
      '<div style="font-size:11.5px;color:#64748b;margin-top:1px">'+p.doctor.split(' ').slice(0,2).join(' ')+' &middot; '+p.dept+'</div>'+
      (hasVitals?'<div style="font-size:11px;color:#16a34a;font-weight:700;margin-top:4px">&#10003; Vitals recorded</div>':
                 '<div style="font-size:11px;color:#7c3aed;font-weight:600;margin-top:4px">&#9679; Pending</div>')+
    '</div>';
  }).join('');
}

// ── Vital input box helper ────────────────────────────────────────────────────
function nurseVBox(label, icon, content) {
  return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:13px">'+
    '<div style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">'+icon+' '+label+'</div>'+
    content+
  '</div>';
}

// ── Vitals form (right panel) ─────────────────────────────────────────────────
function nurseRenderForm() {
  var el = document.getElementById('nurse-form-area'); if(!el) return;

  if(!_nurseUhid) {
    el.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:420px;color:#94a3b8;background:#fff;border:1px solid #e2e8f0;border-radius:10px">'+
        '<div style="font-size:56px;margin-bottom:12px">&#128203;</div>'+
        '<div style="font-size:14px;color:#64748b">Select a patient from the list to record vitals</div>'+
      '</div>';
    return;
  }

  var p    = OPD_QUEUE.find(function(x){ return x.uhid===_nurseUhid; });
  if(!p) return;
  var prev = NURSE_VITALS[_nurseUhid] || {};

  var HX_FLAGS = ['Diabetes (DM)','Hypertension (HTN)','Cardiac Disease','Asthma / COPD','Pregnancy','Thyroid','Epilepsy','On Blood Thinners'];

  el.innerHTML =
    // ── Patient banner ──────────────────────────────────────────────────────
    '<div style="background:linear-gradient(130deg,#1e3a5f 0%,#2563eb 100%);border-radius:10px;padding:16px 22px;color:#fff;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">'+
      '<div>'+
        '<div style="font-size:20px;font-weight:800;letter-spacing:-.02em">'+p.name+'</div>'+
        '<div style="font-size:12.5px;opacity:.75;margin-top:3px">'+p.uhid+' &middot; '+p.age+'Y '+p.gender+' &middot; Token: <b>'+p.token+'</b></div>'+
        '<div style="font-size:12.5px;opacity:.75;margin-top:1px">'+p.doctor+' &middot; '+p.dept+'</div>'+
      '</div>'+
      '<div style="display:flex;gap:10px">'+
        '<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 14px;text-align:center">'+
          '<div style="font-size:10px;opacity:.65;letter-spacing:.07em">PAYER</div>'+
          '<div style="font-size:14px;font-weight:800">'+p.payer+'</div>'+
        '</div>'+
        '<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 14px;text-align:center">'+
          '<div style="font-size:10px;opacity:.65;letter-spacing:.07em">TYPE</div>'+
          '<div style="font-size:14px;font-weight:800">'+(p.type==='appointment'?'APT':'Walk-in')+'</div>'+
        '</div>'+
      '</div>'+
    '</div>'+

    // ── Section 1: Vitals ───────────────────────────────────────────────────
    sectionCard('Vitals Measurement',
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'+
        nurseVBox('Blood Pressure','&#129505;',
          '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">'+
            '<input id="nv-sys" type="number" class="form-input" placeholder="Sys" style="text-align:center;font-size:16px;font-weight:800" value="'+(prev.bp_sys||'')+'">'+
            '<span style="color:#94a3b8;font-weight:700;font-size:16px">/</span>'+
            '<input id="nv-dia" type="number" class="form-input" placeholder="Dia" style="text-align:center;font-size:16px;font-weight:800" value="'+(prev.bp_dia||'')+'">'+
          '</div>'+
          '<div style="font-size:10px;color:#94a3b8;text-align:center">mmHg &middot; Normal 90–120 / 60–80</div>'
        )+
        nurseVBox('Pulse Rate','&#10084;',
          '<input id="nv-pulse" type="number" class="form-input" placeholder="bpm" style="text-align:center;font-size:20px;font-weight:900" value="'+(prev.pulse||'')+'">'+
          '<div style="font-size:10px;color:#94a3b8;text-align:center;margin-top:4px">Normal 60–100 bpm</div>'
        )+
        nurseVBox('Temperature','&#127774;',
          '<div style="display:flex;gap:6px;margin-bottom:4px">'+
            '<input id="nv-temp" type="number" step="0.1" class="form-input" placeholder="98.6" style="text-align:center;font-size:18px;font-weight:800" value="'+(prev.temp||'')+'">'+
            '<select id="nv-temp-unit" class="form-select" style="width:60px;font-size:13px">'+
              '<option value="F"'+((!prev.temp_unit||prev.temp_unit==='F')?' selected':'')+'>°F</option>'+
              '<option value="C"'+(prev.temp_unit==='C'?' selected':'')+'>°C</option>'+
            '</select>'+
          '</div>'+
          '<div style="font-size:10px;color:#94a3b8;text-align:center">Normal 97–99°F / 36.1–37.2°C</div>'
        )+
        nurseVBox('SpO2','&#129788;',
          '<input id="nv-spo2" type="number" min="0" max="100" class="form-input" placeholder="99" style="text-align:center;font-size:20px;font-weight:900" value="'+(prev.spo2||'')+'">'+
          '<div style="font-size:10px;color:#94a3b8;text-align:center;margin-top:4px">% &middot; Normal ≥ 95%</div>'
        )+
        nurseVBox('RBS (Blood Sugar)','&#128137;',
          '<input id="nv-rbs" type="number" class="form-input" placeholder="mg/dL" style="text-align:center;font-size:20px;font-weight:900" value="'+(prev.rbs||'')+'">'+
          '<div style="font-size:10px;color:#94a3b8;text-align:center;margin-top:4px">Fasting 70–100 mg/dL</div>'
        )+
        nurseVBox('Weight / Height / BMI','&#9878;',
          '<div style="display:flex;gap:6px;margin-bottom:6px">'+
            '<input id="nv-weight" type="number" step="0.1" class="form-input" placeholder="kg" style="text-align:center;font-size:15px;font-weight:700" oninput="nurseCalcBMI()" value="'+(prev.weight||'')+'">'+
            '<input id="nv-height" type="number" class="form-input" placeholder="cm" style="text-align:center;font-size:15px;font-weight:700" oninput="nurseCalcBMI()" value="'+(prev.height||'')+'">'+
          '</div>'+
          '<div id="nv-bmi" style="text-align:center;min-height:24px"><span style="color:#94a3b8;font-size:13px">—</span></div>'
        )+
      '</div>'
    )+

    // ── Section 2: Symptoms ─────────────────────────────────────────────────
    sectionCard('Symptoms & History',
      '<div class="form-label" style="margin-bottom:6px">Pain Score <span style="font-weight:400;color:#94a3b8">(0 = No pain &nbsp; 10 = Worst imaginable)</span></div>'+
      '<div style="display:flex;gap:4px;margin-bottom:16px">'+
        [0,1,2,3,4,5,6,7,8,9,10].map(function(i){
          var col=i<=2?'#16a34a':i<=4?'#ca8a04':i<=6?'#ea580c':i<=8?'#dc2626':'#7f1d1d';
          return '<button id="nv-pain-'+i+'" onclick="nurseSetPain('+i+')" style="width:38px;height:38px;border-radius:6px;border:2px solid '+col+';background:#f8fafc;color:'+col+';font-weight:700;font-size:13.5px;cursor:pointer;transition:all .15s;flex-shrink:0">'+i+'</button>';
        }).join('')+
      '</div>'+
      formRow(
        formField('Chief Complaint',
          '<textarea id="nv-complaint" class="form-textarea" rows="2" placeholder="Patient\'s main complaint in their own words...">'+(prev.complaint||'')+'</textarea>',
          true
        )
      )+
      '<div class="form-label" style="margin-top:12px;margin-bottom:8px">Medical History Flags</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:8px">'+
        HX_FLAGS.map(function(flag) {
          var key     = flag.replace(/[^a-z]/gi,'');
          var checked = (prev.history||[]).indexOf(flag)>-1 ? 'checked' : '';
          return '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;color:#374151;'+
            'background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:7px 12px">'+
            '<input type="checkbox" id="nv-hx-'+key+'" '+checked+' style="accent-color:#2563eb;width:14px;height:14px">'+
            flag+'</label>';
        }).join('')+
      '</div>'
    )+

    // ── Section 3: Allergies ────────────────────────────────────────────────
    sectionCard('Allergies',
      '<div style="display:flex;gap:8px;margin-bottom:10px">'+
        '<input id="nv-allergy-inp" class="form-input" placeholder="Drug / food / environmental allergy — press Enter to add" '+
          'style="font-size:13.5px" onkeydown="if(event.key===\'Enter\')nurseAddAllergy()">'+
        '<button onclick="nurseAddAllergy()" class="btn-danger" style="white-space:nowrap;padding:8px 14px">+ Add</button>'+
      '</div>'+
      '<div id="nv-allergy-chips" style="min-height:28px"></div>'+
      '<div style="font-size:11.5px;color:#94a3b8;margin-top:8px">Allergies recorded here will appear as alerts in the Doctor Consultation screen.</div>'
    )+

    // ── Section 4: Triage ───────────────────────────────────────────────────
    sectionCard('Triage Assessment',
      '<div style="display:flex;gap:10px">'+
        [
          {c:'GREEN',  bg:'#16a34a', label:'Non-urgent',  desc:'Stable — routine consultation'},
          {c:'YELLOW', bg:'#ca8a04', label:'Semi-urgent', desc:'Needs attention, not critical'},
          {c:'RED',    bg:'#dc2626', label:'Urgent',      desc:'Requires immediate attention'},
          {c:'BLACK',  bg:'#1e293b', label:'Critical',    desc:'Life-threatening / CPR risk'},
        ].map(function(t){
          return '<div id="nv-triage-'+t.c+'" onclick="nurseSetTriage(\''+t.c+'\')" style="flex:1;cursor:pointer;border:2px solid '+t.bg+';border-radius:10px;padding:13px 10px;text-align:center;opacity:0.3;transition:all .18s">'+
            '<div style="width:28px;height:28px;border-radius:50%;background:'+t.bg+';margin:0 auto 8px"></div>'+
            '<div style="font-weight:800;font-size:13.5px;color:'+t.bg+'">'+t.c+'</div>'+
            '<div style="font-size:11.5px;font-weight:600;color:#374151;margin-top:2px">'+t.label+'</div>'+
            '<div style="font-size:10.5px;color:#94a3b8;margin-top:3px;line-height:1.3">'+t.desc+'</div>'+
          '</div>';
        }).join('')+
      '</div>',
      '<div style="display:flex;gap:10px;justify-content:flex-end">'+
        '<button onclick="nurseSaveAndPrint()" class="btn-outline">Save &amp; Print Sheet</button>'+
        '<button onclick="nurseSave()" class="btn-success" style="padding:9px 22px">Save Vitals &amp; Ready for Doctor &#10003;</button>'+
      '</div>'
    );

  // Restore state for returning to a patient already assessed
  if(prev.pain != null)            nurseSetPain(prev.pain);
  if(prev.triage)                  nurseSetTriage(prev.triage);
  if((prev.allergies||[]).length)  { _nurseAllergies = prev.allergies.slice(); nurseRenderAllergies(); }
  if(prev.weight && prev.height)   nurseCalcBMI();
}

// ── Save handlers ─────────────────────────────────────────────────────────────
function nurseSave() {
  if(!_nurseUhid) return;

  var complaint = ((document.getElementById('nv-complaint')||{}).value||'').trim();
  if(!complaint) { alert('Chief Complaint is required.'); return; }
  if(!_nurseTriage)    { alert('Please select a Triage color.'); return; }

  var HX_FLAGS = ['Diabetes (DM)','Hypertension (HTN)','Cardiac Disease','Asthma / COPD','Pregnancy','Thyroid','Epilepsy','On Blood Thinners'];
  var hx = HX_FLAGS.filter(function(f){
    var el = document.getElementById('nv-hx-'+f.replace(/[^a-z]/gi,''));
    return el && el.checked;
  });

  var ht  = parseFloat((document.getElementById('nv-height')||{value:0}).value);
  var wt  = parseFloat((document.getElementById('nv-weight')||{value:0}).value);
  var bmi = (ht>0 && wt>0) ? parseFloat((wt/((ht/100)*(ht/100))).toFixed(1)) : null;

  NURSE_VITALS[_nurseUhid] = {
    bp_sys:      ((document.getElementById('nv-sys')||{}).value)||'',
    bp_dia:      ((document.getElementById('nv-dia')||{}).value)||'',
    pulse:       ((document.getElementById('nv-pulse')||{}).value)||'',
    temp:        ((document.getElementById('nv-temp')||{}).value)||'',
    temp_unit:   ((document.getElementById('nv-temp-unit')||{}).value)||'F',
    spo2:        ((document.getElementById('nv-spo2')||{}).value)||'',
    rbs:         ((document.getElementById('nv-rbs')||{}).value)||'',
    weight:      wt || '',
    height:      ht || '',
    bmi:         bmi,
    pain:        _nursePain,
    complaint:   complaint,
    history:     hx,
    allergies:   _nurseAllergies.slice(),
    triage:      _nurseTriage,
    recorded_at: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
  };

  var pt = OPD_QUEUE.find(function(x){ return x.uhid===_nurseUhid; });
  if(pt) pt.status = 'waiting';   // back to queue — ready for doctor to call

  _nurseUhid = null; _nursePain = null; _nurseAllergies = []; _nurseTriage = '';
  nurseRenderPatients();
  nurseRenderForm();
  alert('Vitals saved. Patient moved back to OPD Queue — ready for doctor.');
}

function nurseSaveAndPrint() {
  nurseSave();
  // placeholder — production would generate a printable vitals sheet PDF
}

// ── Patient panel toggle ──────────────────────────────────────────────────────
function nurseToggleList() {
  _nurseShowList = !_nurseShowList;
  var grid  = document.getElementById('nurse-layout');
  var panel = document.getElementById('nurse-panel');
  var btn   = document.getElementById('nurse-toggle-btn');
  if(!grid || !panel || !btn) return;
  if(_nurseShowList) {
    panel.style.display            = '';
    grid.style.gridTemplateColumns = '280px 1fr';
    btn.textContent                = '[ Hide List ]';
  } else {
    panel.style.display            = 'none';
    grid.style.gridTemplateColumns = '1fr';
    btn.textContent                = '[ Show List ]';
  }
}

// ── Page function ─────────────────────────────────────────────────────────────
function pageOpdNurse() {
  return pageHeader(
    'Nurse Pre-consultation',
    'OPD Management <span>&#8250;</span> Nurse Station',
    '<button onclick="navTo(\'opd-queue\')" style="padding:7px 14px;border-radius:7px;border:1px solid #d1d5db;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer">Back to Queue</button>'+
    '<button onclick="navTo(\'opd-consult\')" style="padding:7px 14px;border-radius:7px;border:none;background:#2563eb;color:#fff;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px">Doctor Consult</button>'
  )+

  '<div id="nurse-layout" style="display:grid;grid-template-columns:280px 1fr;gap:0;align-items:start">'+

    // Left panel
    '<div id="nurse-panel" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px 0 0 10px;overflow:hidden">'+
      '<div style="padding:11px 14px;background:#f8fafc;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">'+
        '<div style="font-weight:700;font-size:13.5px;color:#1e293b">Vitals Queue</div>'+
        '<span id="nurse-pt-count" style="font-size:12px;color:#7c3aed;font-weight:700"></span>'+
      '</div>'+
      '<div id="nurse-pt-list" style="max-height:calc(100vh - 200px);overflow-y:auto"></div>'+
    '</div>'+

    // Right: toggle tab + form
    '<div style="display:flex;flex-direction:column;gap:0">'+
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f0f4ff;border:1px solid #c7d7fd;border-left:none;border-radius:0 10px 0 0;border-bottom:none">'+
        '<button id="nurse-toggle-btn" onclick="nurseToggleList()" '+
          'style="padding:5px 16px;border-radius:6px;border:2px solid #2563eb;background:#2563eb;color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">'+
          'Hide Patient List</button>'+
        '<span style="font-size:12px;color:#4b5563">Toggle the patient list panel on the left</span>'+
      '</div>'+
      '<div style="border:1px solid #e2e8f0;border-left:none;border-top:none;border-radius:0 0 10px 0;padding:14px">'+
        '<div id="nurse-form-area"></div>'+
      '</div>'+
    '</div>'+

  '</div>';
}

// ── Post-render init (called by navTo in login.js) ────────────────────────────
function nurseInit() {
  _nurseUhid = null; _nursePain = null; _nurseAllergies = []; _nurseTriage = '';
  _nurseShowList = true;
  nurseRenderPatients();
  nurseRenderForm();
}
