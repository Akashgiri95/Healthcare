// ─── OPD CYCLE — Screen 3: Doctor Consultation ────────────────────────────────
// Page: opd-consult | Functions: consult*, consultInit
// Depends on: OPD_QUEUE, oqPriorityScore (pg-opd-queue.js)
//             NURSE_VITALS (pg-opd-nurse.js)
// Exports: CONSULT_DATA

var CONSULT_DATA   = {};
var _consultUhid   = null;
var _consultDx     = [];   // [{code, name, type, status, severity}]
var _consultRx     = [];   // [{drug, dose, route, freq, dur, instr, sched}]
var _consultLab    = [];
var _consultRad    = [];
var _consultShowPt = true;

// ── Reference data ────────────────────────────────────────────────────────────
var ICD10 = [
  {code:'J06.9', name:'Acute upper respiratory infection'},
  {code:'J18.9', name:'Pneumonia, unspecified'},
  {code:'K21.0', name:'Gastro-oesophageal reflux disease'},
  {code:'E11.9', name:'Type 2 diabetes mellitus'},
  {code:'I10',   name:'Essential (primary) hypertension'},
  {code:'K29.7', name:'Gastritis, unspecified'},
  {code:'M54.5', name:'Low back pain'},
  {code:'J45.9', name:'Asthma, unspecified'},
  {code:'N39.0', name:'Urinary tract infection'},
  {code:'A09',   name:'Gastroenteritis and colitis'},
  {code:'G43.9', name:'Migraine, unspecified'},
  {code:'I20.9', name:'Angina pectoris, unspecified'},
  {code:'E03.9', name:'Hypothyroidism, unspecified'},
  {code:'L30.9', name:'Dermatitis, unspecified'},
  {code:'H10.9', name:'Conjunctivitis, unspecified'},
  {code:'R05',   name:'Cough'},
  {code:'R50.9', name:'Fever, unspecified'},
  {code:'R10.4', name:'Abdominal pain, unspecified'},
  {code:'R51',   name:'Headache'},
  {code:'M79.3', name:'Panniculitis'},
  {code:'K35.2', name:'Acute appendicitis'},
  {code:'I50.9', name:'Heart failure, unspecified'},
  {code:'N18.9', name:'Chronic kidney disease, unspecified'},
  {code:'Z00.0', name:'General adult medical examination'},
];

var DRUGS = [
  {n:'Paracetamol',   h:false, doses:['500mg','650mg','1g']},
  {n:'Ibuprofen',     h:false, doses:['200mg','400mg','600mg']},
  {n:'Amoxicillin',   h:true,  doses:['250mg','500mg']},
  {n:'Azithromycin',  h:true,  doses:['250mg','500mg']},
  {n:'Metformin',     h:false, doses:['500mg','850mg','1g']},
  {n:'Amlodipine',    h:false, doses:['2.5mg','5mg','10mg']},
  {n:'Atorvastatin',  h:false, doses:['10mg','20mg','40mg']},
  {n:'Omeprazole',    h:false, doses:['20mg','40mg']},
  {n:'Pantoprazole',  h:false, doses:['40mg']},
  {n:'Cetirizine',    h:false, doses:['5mg','10mg']},
  {n:'Metronidazole', h:true,  doses:['400mg','500mg']},
  {n:'Diclofenac',    h:true,  doses:['50mg','75mg','100mg']},
  {n:'Ondansetron',   h:true,  doses:['4mg','8mg']},
  {n:'Salbutamol',    h:false, doses:['2mg','100mcg']},
  {n:'Levothyroxine', h:true,  doses:['25mcg','50mcg','100mcg']},
  {n:'Losartan',      h:true,  doses:['25mg','50mg','100mg']},
  {n:'Cefixime',      h:true,  doses:['200mg','400mg']},
  {n:'Doxycycline',   h:true,  doses:['100mg','200mg']},
  {n:'Folic Acid',    h:false, doses:['0.4mg','5mg']},
  {n:'Vitamin D3',    h:false, doses:['1000IU','60000IU']},
];

var LAB_PANELS = [
  'CBC (Complete Blood Count)','LFT (Liver Function Test)','KFT (Kidney Function Test)',
  'Lipid Profile','HbA1c','Random Blood Sugar','Fasting Blood Sugar',
  'Thyroid Profile (TSH, T3, T4)','Serum Electrolytes','Urine Routine & Microscopy',
  'Blood Culture & Sensitivity','PT / INR','Dengue NS1 Antigen','Malaria Antigen',
  'HbsAg','HIV (ELISA)','Widal Test','ESR','CRP','Serum Creatinine',
];

var RAD_PANELS = [
  'X-Ray Chest PA','X-Ray Abdomen (Erect)','X-Ray Lumbar Spine',
  'USG Abdomen & Pelvis','USG Neck / Thyroid',
  'CECT Abdomen','CT Head (Plain)','CT Chest',
  'MRI Brain','MRI Lumbar Spine',
  'ECG (12-lead)','Echocardiography / 2D Echo','Mammography',
];

// ── Vitals colour by normal range ─────────────────────────────────────────────
function consultVitalCol(key, val) {
  var n = parseFloat(val); if(isNaN(n)||val==='') return '#94a3b8';
  var ok = {bp_sys:[90,139],bp_dia:[60,89],pulse:[60,100],spo2:[95,100],rbs:[70,139]};
  var r = ok[key]; if(!r) return '#1e293b';
  return n>=r[0]&&n<=r[1]?'#16a34a':(n<r[0]?'#ca8a04':'#dc2626');
}

// ── ICD-10 typeahead ──────────────────────────────────────────────────────────
function consultDxSearch(q) {
  var box=document.getElementById('consult-dx-drop'); if(!box)return;
  if(q.length<2){box.style.display='none';return;}
  var m=ICD10.filter(function(d){return d.name.toLowerCase().includes(q.toLowerCase())||d.code.toLowerCase().includes(q.toLowerCase());});
  if(!m.length){box.innerHTML='<div style="padding:10px;font-size:13px;color:#94a3b8">No match found</div>';box.style.display='block';return;}
  box.innerHTML=m.slice(0,8).map(function(d){
    return '<div onclick=\'consultAddDx('+JSON.stringify(d)+')\' style="padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">'+
      '<span style="font-family:monospace;font-size:11px;color:#2563eb;font-weight:700;margin-right:8px">'+d.code+'</span>'+d.name+'</div>';
  }).join('');
  box.style.display='block';
}

function consultAddDx(d) {
  if(_consultDx.find(function(x){return x.code===d.code;})){alert('Already in the list.');return;}
  _consultDx.push({code:d.code,name:d.name,type:_consultDx.length===0?'primary':'secondary',status:'provisional',severity:'Mild'});
  var inp=document.getElementById('consult-dx-inp'); if(inp)inp.value='';
  var drop=document.getElementById('consult-dx-drop'); if(drop)drop.style.display='none';
  consultRenderDxList();
}

function consultRemoveDx(idx){_consultDx.splice(idx,1);consultRenderDxList();}

function consultRenderDxList() {
  var el=document.getElementById('consult-dx-list'); if(!el)return;
  if(!_consultDx.length){el.innerHTML='<div style="color:#94a3b8;font-size:13px;padding:8px 0">No diagnosis added yet — search above</div>';return;}
  el.innerHTML=_consultDx.map(function(d,i){
    var tc=d.type==='primary'?'#dc2626':'#475569';
    var so=['provisional','confirmed'].map(function(s){return '<option'+(d.status===s?' selected':'')+'>'+s+'</option>';}).join('');
    var sv=['Mild','Moderate','Severe'].map(function(s){return '<option'+(d.severity===s?' selected':'')+'>'+s+'</option>';}).join('');
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;flex-wrap:wrap">'+
      '<span style="font-family:monospace;font-size:11px;color:#2563eb;font-weight:700">'+d.code+'</span>'+
      '<span style="flex:1;font-size:13px;font-weight:600;color:#1e293b;min-width:120px">'+d.name+'</span>'+
      '<span style="font-size:11px;font-weight:700;color:'+tc+'">'+d.type.toUpperCase()+'</span>'+
      '<select onchange="_consultDx['+i+'].status=this.value;consultRenderDxList()" style="font-size:11.5px;border:1px solid #e2e8f0;border-radius:4px;padding:2px 4px">'+so+'</select>'+
      '<select onchange="_consultDx['+i+'].severity=this.value" style="font-size:11.5px;border:1px solid #e2e8f0;border-radius:4px;padding:2px 4px">'+sv+'</select>'+
      '<button onclick="consultRemoveDx('+i+')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:17px;padding:0 2px;line-height:1">&times;</button>'+
    '</div>';
  }).join('');
}

// ── Drug typeahead ────────────────────────────────────────────────────────────
function consultDrugSearch(q) {
  var box=document.getElementById('consult-rx-drop'); if(!box)return;
  if(q.length<2){box.style.display='none';return;}
  var allergies=(_consultUhid&&NURSE_VITALS[_consultUhid])?NURSE_VITALS[_consultUhid].allergies||[]:[];
  var m=DRUGS.filter(function(d){return d.n.toLowerCase().includes(q.toLowerCase());});
  if(!m.length){box.style.display='none';return;}
  box.innerHTML=m.slice(0,8).map(function(d){
    var hit=allergies.some(function(a){return d.n.toLowerCase().includes(a.toLowerCase())||a.toLowerCase().includes(d.n.toLowerCase());});
    return '<div onclick=\'consultPickDrug('+JSON.stringify(d)+')\' style="padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px;background:'+(hit?'#fef2f2':'')+'" onmouseover="this.style.background=\''+(hit?'#fee2e2':'#f8fafc')+'\'" onmouseout="this.style.background=\''+(hit?'#fef2f2':'')+'\'" >'+
      (hit?'<span style="color:#dc2626;font-weight:700;font-size:11px;margin-right:4px">&#9888; ALLERGY</span>':'')+
      '<span style="font-weight:600">'+d.n+'</span>'+
      (d.h?'<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;margin-left:6px;font-weight:700">Sch H</span>':'')+
    '</div>';
  }).join('');
  box.style.display='block';
}

function consultPickDrug(d) {
  var drop=document.getElementById('consult-rx-drop'); if(drop)drop.style.display='none';
  var inp=document.getElementById('consult-rx-inp'); if(inp)inp.value='';
  var doseOpts=d.doses.map(function(x){return '<option>'+x+'</option>';}).join('');
  document.getElementById('consult-rx-form').innerHTML=
    '<div style="background:'+(d.h?'#fffbeb':'#f0fdf4')+';border:1px solid '+(d.h?'#fcd34d':'#bbf7d0')+';border-radius:8px;padding:12px;margin-top:8px">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'+
        '<span style="font-weight:800;font-size:14px;color:#1e293b">'+d.n+'</span>'+
        (d.h?'<span style="font-size:10.5px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-weight:700">Schedule H — Prescription mandatory</span>':'')+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">'+
        '<div><div style="font-size:11.5px;font-weight:600;color:#64748b;margin-bottom:3px">Dose</div>'+
          '<select id="rx-dose" class="form-select" style="font-size:13px">'+doseOpts+'</select></div>'+
        '<div><div style="font-size:11.5px;font-weight:600;color:#64748b;margin-bottom:3px">Route</div>'+
          '<select id="rx-route" class="form-select" style="font-size:13px"><option>Oral</option><option>IV</option><option>IM</option><option>SC</option><option>Topical</option><option>Inhaler</option><option>Nebulizer</option></select></div>'+
        '<div><div style="font-size:11.5px;font-weight:600;color:#64748b;margin-bottom:3px">Frequency</div>'+
          '<select id="rx-freq" class="form-select" style="font-size:13px"><option>OD</option><option>BD</option><option>TDS</option><option>QID</option><option>SOS</option><option>Stat</option><option>HS</option></select></div>'+
        '<div><div style="font-size:11.5px;font-weight:600;color:#64748b;margin-bottom:3px">Duration</div>'+
          '<select id="rx-dur" class="form-select" style="font-size:13px"><option>3 days</option><option>5 days</option><option>7 days</option><option>10 days</option><option>14 days</option><option>1 month</option><option>3 months</option><option>Continuous</option></select></div>'+
        '<div style="grid-column:span 2"><div style="font-size:11.5px;font-weight:600;color:#64748b;margin-bottom:3px">Instructions</div>'+
          '<input id="rx-instr" class="form-input" placeholder="e.g. After food, with water" style="font-size:13px"></div>'+
      '</div>'+
      '<div style="display:flex;gap:8px">'+
        '<button onclick="consultAddRx(\''+d.n+'\','+d.h+')" style="padding:8px 18px;border-radius:6px;background:#16a34a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer">Add to Prescription</button>'+
        '<button onclick="document.getElementById(\'consult-rx-form\').innerHTML=\'\'" style="padding:8px 14px;border-radius:6px;background:#fff;color:#64748b;border:1px solid #e2e8f0;font-size:13px;cursor:pointer">Cancel</button>'+
      '</div>'+
    '</div>';
}

function consultAddRx(drugName, isH) {
  _consultRx.push({
    drug:  drugName,
    dose:  (document.getElementById('rx-dose')||{value:''}).value,
    route: (document.getElementById('rx-route')||{value:''}).value,
    freq:  (document.getElementById('rx-freq')||{value:''}).value,
    dur:   (document.getElementById('rx-dur')||{value:''}).value,
    instr: (document.getElementById('rx-instr')||{value:''}).value,
    sched: isH,
  });
  document.getElementById('consult-rx-form').innerHTML='';
  document.getElementById('consult-rx-inp').value='';
  consultRenderRxList();
}

function consultRemoveRx(idx){_consultRx.splice(idx,1);consultRenderRxList();}

function consultRenderRxList() {
  var el=document.getElementById('consult-rx-list'); if(!el)return;
  if(!_consultRx.length){el.innerHTML='<div style="color:#94a3b8;font-size:13px;padding:8px 0">No medicines prescribed yet</div>';return;}
  el.innerHTML=_consultRx.map(function(rx,i){
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px">'+
      '<div style="width:24px;height:24px;border-radius:50%;background:#2563eb;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+(i+1)+'</div>'+
      '<div style="flex:1">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">'+
          '<span style="font-weight:700;font-size:13.5px;color:#1e293b">'+rx.drug+'</span>'+
          (rx.sched?'<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;font-weight:700">Sch H</span>':'')+
        '</div>'+
        '<div style="font-size:12.5px;color:#475569">'+rx.dose+' &middot; '+rx.route+' &middot; <b style="color:#1e293b">'+rx.freq+'</b> &middot; '+rx.dur+(rx.instr?' &middot; <i>'+rx.instr+'</i>':'')+'</div>'+
      '</div>'+
      '<button onclick="consultRemoveRx('+i+')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:18px;line-height:1;padding:0 4px">&times;</button>'+
    '</div>';
  }).join('');
}

// ── Lab / Rad orders ──────────────────────────────────────────────────────────
function consultPlaceOrders() {
  var lab=LAB_PANELS.filter(function(p,i){var cb=document.getElementById('lab-'+i);return cb&&cb.checked;});
  var rad=RAD_PANELS.filter(function(p,i){var cb=document.getElementById('rad-'+i);return cb&&cb.checked;});
  var custom=((document.getElementById('lab-custom')||{}).value||'').trim();
  if(custom) lab.push(custom);
  if(!lab.length&&!rad.length){alert('Select at least one investigation.');return;}
  _consultLab=lab; _consultRad=rad;
  alert('Orders placed successfully:\n\n'+
    (lab.length?'LAB:\n'+lab.map(function(x){return '  • '+x;}).join('\n'):'')+
    (lab.length&&rad.length?'\n\n':'')+
    (rad.length?'RADIOLOGY:\n'+rad.map(function(x){return '  • '+x;}).join('\n'):'')
  );
}

// ── Patient selection ─────────────────────────────────────────────────────────
function consultSelect(uhid) {
  if(CONSULT_DATA[_consultUhid]) {
    // persist unsaved arrays before switching
    CONSULT_DATA[_consultUhid].dx  = _consultDx.slice();
    CONSULT_DATA[_consultUhid].rx  = _consultRx.slice();
    CONSULT_DATA[_consultUhid].lab = _consultLab.slice();
    CONSULT_DATA[_consultUhid].rad = _consultRad.slice();
  }
  _consultUhid=uhid;
  var saved=CONSULT_DATA[uhid]||{};
  _consultDx  = (saved.dx||[]).slice();
  _consultRx  = (saved.rx||[]).slice();
  _consultLab = (saved.lab||[]).slice();
  _consultRad = (saved.rad||[]).slice();
  consultRenderSidebar();
  consultRenderTabs();
}

// ── Left sidebar ──────────────────────────────────────────────────────────────
function consultRenderSidebar() {
  var el=document.getElementById('consult-panel-body'); if(!el)return;
  var pts=OPD_QUEUE.filter(function(p){return p.status==='in-consultation';});

  var ptItems=pts.length
    ? pts.map(function(p){
        var act=p.uhid===_consultUhid;
        return '<div onclick="consultSelect(\''+p.uhid+'\')" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05);background:'+(act?'rgba(37,99,235,.25)':'')+'">'+
          '<div style="font-weight:700;font-size:13px;color:'+(act?'#93c5fd':'#94a3b8')+'">'+p.name+'</div>'+
          '<div style="font-size:11px;color:#475569;margin-top:1px">'+p.token+' &middot; '+p.dept+'</div>'+
        '</div>';
      }).join('')
    : '<div style="padding:14px 12px;font-size:12.5px;color:#475569;text-align:center">No patients in consultation<br><button onclick="navTo(\'opd-queue\')" style="margin-top:8px;padding:5px 12px;border-radius:5px;background:#1e3a5f;color:#93c5fd;border:none;font-size:12px;cursor:pointer">Go to Queue</button></div>';

  if(!_consultUhid) { el.innerHTML='<div style="font-size:10.5px;font-weight:700;color:#475569;letter-spacing:.07em;text-transform:uppercase;padding:10px 12px 4px">In Consultation</div>'+ptItems; return; }

  var p=OPD_QUEUE.find(function(x){return x.uhid===_consultUhid;}); if(!p)return;
  var v=NURSE_VITALS[_consultUhid]||{};

  var vRow=function(lbl,val,key,unit){
    var col=key==='temp'?(parseFloat(val)<97||parseFloat(val)>99?'#dc2626':'#16a34a'):consultVitalCol(key,val);
    var disp=val?'<span style="font-weight:800;font-size:13.5px;color:'+col+'">'+val+'</span><span style="font-size:10px;color:'+col+';margin-left:2px">'+unit+'</span>':'<span style="color:#475569;font-size:12px">—</span>';
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">'+
      '<span style="font-size:11.5px;color:#64748b">'+lbl+'</span>'+disp+'</div>';
  };

  var painCol=v.pain==null?'#475569':v.pain<=2?'#16a34a':v.pain<=5?'#ca8a04':'#dc2626';
  var triCol={GREEN:'#16a34a',YELLOW:'#ca8a04',RED:'#dc2626',BLACK:'#94a3b8'}[v.triage]||'#475569';

  el.innerHTML=
    '<div style="font-size:10.5px;font-weight:700;color:#475569;letter-spacing:.07em;text-transform:uppercase;padding:10px 12px 4px">In Consultation</div>'+
    ptItems+

    '<div style="margin:8px 10px;background:#1e3a5f;border-radius:8px;padding:12px">'+
      '<div style="font-weight:800;font-size:15px;color:#fff">'+p.name+'</div>'+
      '<div style="font-size:11.5px;color:#93c5fd;margin-top:3px">'+p.uhid+' &middot; '+p.age+'Y '+p.gender+'</div>'+
      '<div style="font-size:11.5px;color:#93c5fd;margin-top:1px">'+p.token+' &middot; '+p.dept+'</div>'+
      '<div style="font-size:11.5px;color:#93c5fd;margin-top:1px">'+p.doctor+'</div>'+
      '<div style="margin-top:6px;display:inline-block;background:rgba(255,255,255,.1);color:#e2e8f0;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px">'+p.payer+'</div>'+
    '</div>'+

    (v.bp_sys||v.pulse||v.spo2
      ? '<div style="margin:8px 10px 0">'+
          '<div style="font-size:10px;font-weight:700;color:#475569;letter-spacing:.07em;text-transform:uppercase;margin-bottom:4px">Vitals from Nurse &middot; '+v.recorded_at+'</div>'+
          (v.bp_sys?vRow('BP',v.bp_sys+'/'+v.bp_dia,'bp_sys','mmHg'):'')+
          vRow('Pulse',v.pulse,'pulse','bpm')+
          vRow('SpO2',v.spo2,'spo2','%')+
          vRow('Temp',v.temp,'temp','°'+(v.temp_unit||'F'))+
          vRow('RBS',v.rbs,'rbs','mg/dL')+
          (v.bmi?'<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0"><span style="font-size:11.5px;color:#64748b">BMI</span><span style="font-size:13.5px;font-weight:800;color:#fff">'+v.bmi+'</span></div>':'')+
          (v.pain!=null?'<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0"><span style="font-size:11.5px;color:#64748b">Pain</span><span style="font-weight:800;font-size:13.5px;color:'+painCol+'">'+v.pain+' / 10</span></div>':'')+
          (v.triage?'<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0"><span style="font-size:11.5px;color:#64748b">Triage</span><span style="font-weight:800;font-size:12px;color:'+triCol+'">'+v.triage+'</span></div>':'')+
        '</div>'
      : '<div style="margin:8px 10px;font-size:12px;color:#475569;font-style:italic">No vitals recorded by nurse</div>'
    )+

    (v.complaint
      ? '<div style="margin:8px 10px">'+
          '<div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Chief Complaint</div>'+
          '<div style="font-size:12.5px;color:#94a3b8;font-style:italic;line-height:1.4">&ldquo;'+v.complaint+'&rdquo;</div>'+
        '</div>'
      : '')+

    ((v.allergies||[]).length
      ? '<div style="margin:8px 10px">'+
          '<div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">&#9888; Allergy Alerts</div>'+
          (v.allergies||[]).map(function(a){return '<span style="display:inline-block;background:#dc2626;color:#fff;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px;margin:2px">'+a+'</span>';}).join('')+
        '</div>'
      : '')+

    ((v.history||[]).length
      ? '<div style="margin:8px 10px">'+
          '<div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Medical History</div>'+
          (v.history||[]).map(function(h){return '<span style="display:inline-block;background:#1e3a5f;color:#93c5fd;font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:4px;margin:2px">'+h+'</span>';}).join('')+
        '</div>'
      : '')+

    '<div style="margin:10px 10px 12px;display:flex;flex-direction:column;gap:6px">'+
      '<button onclick="consultComplete()" style="width:100%;padding:9px;border-radius:7px;background:#16a34a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer">&#10003; Complete Consultation</button>'+
      '<button onclick="consultSaveDraft()" style="width:100%;padding:8px;border-radius:7px;background:#1e3a5f;color:#93c5fd;border:1px solid #334155;font-size:13px;cursor:pointer">Save Draft</button>'+
      '<button onclick="consultAdmitIPD()" style="width:100%;padding:8px;border-radius:7px;background:transparent;color:#64748b;border:1px solid #334155;font-size:13px;cursor:pointer">Admit to IPD</button>'+
    '</div>';
}

// ── 6-tab consultation area ───────────────────────────────────────────────────
function consultRenderTabs() {
  var el=document.getElementById('consult-tabs-area'); if(!el)return;

  if(!_consultUhid) {
    el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:380px;flex-direction:column;color:#94a3b8;background:#fff;border:1px solid #e2e8f0;border-radius:0 0 10px 10px">'+
      '<div style="font-size:48px;margin-bottom:12px">&#128084;</div>'+
      '<div style="font-size:14px">Select a patient from the panel to begin consultation</div></div>';
    return;
  }

  var p=OPD_QUEUE.find(function(x){return x.uhid===_consultUhid;}); if(!p)return;
  var v=NURSE_VITALS[_consultUhid]||{};
  var HX=['Diabetes (DM)','Hypertension (HTN)','Cardiac Disease','Asthma / COPD','Pregnancy','Thyroid','Epilepsy','On Blood Thinners'];
  var GEN=['Pallor','Icterus','Cyanosis','Clubbing','Oedema','Lymphadenopathy','Dehydration'];

  var tabBtn=function(id,label){
    return '<button data-tg="consult" data-tid="'+id+'" onclick="showTab(\'consult\',\''+id+'\')" '+
      'style="padding:11px 14px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;'+
      'color:#64748b;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s">'+label+'</button>';
  };

  // ── Tab 1: History ──────────────────────────────────────────────────────────
  var T1=
    '<div data-tp="consult" data-pid="history" style="padding:16px">'+
      formRow(formField('Chief Complaint','<textarea id="c-complaint" class="form-textarea" rows="2" style="font-size:13.5px">'+(v.complaint||'')+'</textarea>',true))+
      formRow(
        formField('Duration','<input id="c-dur" class="form-input" placeholder="e.g. 3 days" style="font-size:13.5px">'),
        formField('Onset','<select id="c-onset" class="form-select" style="font-size:13px"><option>Sudden</option><option>Gradual</option><option>Insidious</option></select>'),
        formField('Progression','<select id="c-prog" class="form-select" style="font-size:13px"><option>Worsening</option><option>Stable</option><option>Improving</option></select>')
      )+
      formRow(formField('History of Present Illness (HPI)','<textarea id="c-hpi" class="form-textarea" rows="3" placeholder="Detailed description — onset, character, severity, associated symptoms..."></textarea>'))+
      '<div class="form-label" style="margin-bottom:8px">Past Medical History <span style="font-weight:400;color:#94a3b8;font-size:12px">(pre-filled from nurse)</span></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">'+
        HX.map(function(f){var k='c-hx-'+f.replace(/[^a-z]/gi,'');var c=(v.history||[]).indexOf(f)>-1?'checked':'';return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px"><input type="checkbox" id="'+k+'" '+c+' style="accent-color:#2563eb">'+f+'</label>';}).join('')+
      '</div>'+
      formRow(
        formField('Family History','<textarea id="c-fhx" class="form-textarea" rows="2" placeholder="Relevant family history..."></textarea>'),
        formField('Social History','<textarea id="c-shx" class="form-textarea" rows="2" placeholder="Occupation, smoking, alcohol, diet..."></textarea>')
      )+
      (p.gender==='Female'?formRow(
        formField('LMP','<input id="c-lmp" class="form-input" type="date">'),
        formField('Obstetric History','<input id="c-obs" class="form-input" placeholder="G_P_L_A_">'),
        formField('Menstrual Cycle','<select id="c-mens" class="form-select" style="font-size:13px"><option value="">—</option><option>Regular</option><option>Irregular</option><option>Dysmenorrhoea</option><option>Amenorrhoea</option><option>Post-menopausal</option></select>')
      ):'')+
    '</div>';

  // ── Tab 2: Examination ──────────────────────────────────────────────────────
  var T2=
    '<div data-tp="consult" data-pid="exam" style="display:none;padding:16px">'+
      '<div class="form-label" style="margin-bottom:8px">General Examination</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">'+
        GEN.map(function(f){return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px"><input type="checkbox" style="accent-color:#2563eb">'+f+'</label>';}).join('')+
      '</div>'+
      '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:14px">'+
        '<div style="font-size:12px;font-weight:700;color:#15803d;margin-bottom:6px">Vitals from Nurse Station — Read only</div>'+
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:12.5px;color:#374151">'+
          '<div>BP: <strong>'+(v.bp_sys?v.bp_sys+'/'+v.bp_dia:'—')+'</strong> mmHg</div>'+
          '<div>Pulse: <strong>'+(v.pulse||'—')+'</strong> bpm</div>'+
          '<div>SpO2: <strong>'+(v.spo2||'—')+'</strong> %</div>'+
          '<div>Temp: <strong>'+(v.temp||'—')+'</strong> '+(v.temp_unit?'°'+v.temp_unit:'°F')+'</div>'+
        '</div>'+
      '</div>'+
      formRow(
        formField('Cardiovascular (CVS)','<textarea id="c-cvs" class="form-textarea" rows="2" placeholder="S1 S2 heard, murmurs, JVP..."></textarea>'),
        formField('Respiratory (RS)','<textarea id="c-rs" class="form-textarea" rows="2" placeholder="Air entry, breath sounds, added sounds..."></textarea>')
      )+
      formRow(
        formField('Per Abdomen','<textarea id="c-pa" class="form-textarea" rows="2" placeholder="Soft, tender, organomegaly, bowel sounds..."></textarea>'),
        formField('CNS','<textarea id="c-cns" class="form-textarea" rows="2" placeholder="Consciousness, orientation, pupils, power..."></textarea>')
      )+
      formRow(formField('Local Examination','<textarea id="c-local" class="form-textarea" rows="3" placeholder="Detailed local findings..."></textarea>'))+
    '</div>';

  // ── Tab 3: Diagnosis ────────────────────────────────────────────────────────
  var T3=
    '<div data-tp="consult" data-pid="dx" style="display:none;padding:16px">'+
      sectionCard('ICD-10 Diagnosis Search',
        '<div style="position:relative;margin-bottom:12px">'+
          '<input id="consult-dx-inp" class="form-input" placeholder="Type diagnosis name or ICD-10 code..." oninput="consultDxSearch(this.value)" style="font-size:13.5px">'+
          '<div id="consult-dx-drop" style="display:none;position:absolute;left:0;right:0;top:44px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:100;max-height:260px;overflow-y:auto"></div>'+
        '</div>'+
        '<div id="consult-dx-list"></div>'
      )+
      sectionCard('Clinical Notes',
        formRow(formField('Assessment &amp; Reasoning','<textarea id="c-dx-notes" class="form-textarea" rows="3" placeholder="Clinical reasoning, differentials, working diagnosis..."></textarea>'))
      )+
    '</div>';

  // ── Tab 4: Investigations ───────────────────────────────────────────────────
  var T4=
    '<div data-tp="consult" data-pid="invest" style="display:none;padding:16px">'+
      sectionCard('Laboratory Investigations',
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">'+
          LAB_PANELS.map(function(p,i){var c=_consultLab.indexOf(p)>-1?'checked':'';return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;padding:5px 9px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"><input type="checkbox" id="lab-'+i+'" '+c+' style="accent-color:#2563eb">'+p+'</label>';}).join('')+
        '</div>'+
        '<div style="display:flex;gap:8px"><input id="lab-custom" class="form-input" placeholder="Other custom test..." style="font-size:13px"><button onclick="document.getElementById(\'lab-custom\').value=\'\'" style="padding:8px 12px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:13px;color:#64748b">Clear</button></div>'
      )+
      sectionCard('Radiology / Imaging',
        '<div style="display:flex;flex-wrap:wrap;gap:8px">'+
          RAD_PANELS.map(function(p,i){var c=_consultRad.indexOf(p)>-1?'checked':'';return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;padding:5px 9px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px"><input type="checkbox" id="rad-'+i+'" '+c+' style="accent-color:#7c3aed">'+p+'</label>';}).join('')+
        '</div>'
      )+
      '<div style="text-align:right;margin-top:-8px">'+
        '<button onclick="consultPlaceOrders()" class="btn-primary" style="padding:10px 26px;font-size:14px;font-weight:700">Place Investigation Orders</button>'+
      '</div>'+
    '</div>';

  // ── Tab 5: Prescription ─────────────────────────────────────────────────────
  var T5=
    '<div data-tp="consult" data-pid="rx" style="display:none;padding:16px">'+
      sectionCard('Search &amp; Prescribe',
        '<div style="font-size:12.5px;color:#64748b;margin-bottom:8px">Generic drug search. <span style="color:#92400e;font-weight:600">Schedule H drugs require a written prescription.</span></div>'+
        '<div style="position:relative;margin-bottom:8px">'+
          '<input id="consult-rx-inp" class="form-input" placeholder="Type medicine name..." oninput="consultDrugSearch(this.value)" style="font-size:13.5px">'+
          '<div id="consult-rx-drop" style="display:none;position:absolute;left:0;right:0;top:44px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:100;max-height:260px;overflow-y:auto"></div>'+
        '</div>'+
        '<div id="consult-rx-form"></div>'
      )+
      sectionCard('Current Prescription','<div id="consult-rx-list"></div>')+
    '</div>';

  // ── Tab 6: Plan & Advice ────────────────────────────────────────────────────
  var T6=
    '<div data-tp="consult" data-pid="plan" style="display:none;padding:16px">'+
      sectionCard('Follow-up &amp; Referral',
        formRow(
          formField('Follow-up After','<select id="c-fu" class="form-select" style="font-size:13px"><option value="">Not required</option><option>3 days</option><option>5 days</option><option>1 week</option><option>2 weeks</option><option>1 month</option><option>3 months</option></select>'),
          formField('Refer to Specialist','<select id="c-ref" class="form-select" style="font-size:13px"><option value="">No referral</option><option>Cardiologist</option><option>Neurologist</option><option>Orthopaedic Surgeon</option><option>Gynaecologist</option><option>Dermatologist</option><option>ENT Specialist</option><option>Ophthalmologist</option><option>Psychiatrist</option><option>Endocrinologist</option><option>Pulmonologist</option></select>'),
          formField('Medical Certificate','<select id="c-cert" class="form-select" style="font-size:13px"><option value="">Not required</option><option>Sick Leave — 1 day</option><option>Sick Leave — 3 days</option><option>Sick Leave — 7 days</option><option>Fitness Certificate</option><option>Disability Certificate</option></select>')
        )
      )+
      sectionCard('Patient Instructions',
        formRow(
          formField('Diet Advice','<textarea id="c-diet" class="form-textarea" rows="2" placeholder="e.g. Soft diet, avoid spicy food, increase fluids..."></textarea>'),
          formField('Activity Restrictions','<textarea id="c-act" class="form-textarea" rows="2" placeholder="e.g. Bed rest 2 days, avoid heavy lifting..."></textarea>')
        )+
        formRow(formField('Additional Notes / Patient Instructions','<textarea id="c-notes" class="form-textarea" rows="3" placeholder="Any other instructions for the patient or attendant..."></textarea>'))
      )+
      sectionCard('Consultation Outcome',
        '<div style="display:flex;gap:12px;flex-wrap:wrap">'+
          '<button onclick="consultComplete()" style="padding:12px 28px;border-radius:8px;background:#16a34a;color:#fff;border:none;font-size:14px;font-weight:700;cursor:pointer">&#10003; Complete &amp; Close Consultation</button>'+
          '<button onclick="consultAdmitIPD()" style="padding:12px 22px;border-radius:8px;background:#1e3a5f;color:#93c5fd;border:1px solid #334155;font-size:14px;font-weight:600;cursor:pointer">Admit to IPD</button>'+
          '<button onclick="consultSaveDraft()" style="padding:12px 20px;border-radius:8px;background:#fff;color:#374151;border:1px solid #d1d5db;font-size:14px;cursor:pointer">Save Draft</button>'+
        '</div>'
      )+
    '</div>';

  el.innerHTML=
    '<div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;overflow:visible">'+
      T1+T2+T3+T4+T5+T6+
    '</div>';

  showTab('consult','history');
  consultRenderDxList();
  consultRenderRxList();
}

// ── Actions ───────────────────────────────────────────────────────────────────
function consultSaveDraft() {
  if(!_consultUhid)return;
  CONSULT_DATA[_consultUhid]={dx:_consultDx.slice(),rx:_consultRx.slice(),lab:_consultLab.slice(),rad:_consultRad.slice()};
  alert('Draft saved for '+_consultUhid+'.');
}

function consultComplete() {
  if(!_consultUhid)return;
  if(!_consultDx.length){alert('Please add at least one diagnosis (Tab 3) before completing.');return;}
  consultSaveDraft();
  var pt=OPD_QUEUE.find(function(x){return x.uhid===_consultUhid;});
  if(pt)pt.status='done';
  var uid=_consultUhid; _consultUhid=null; _consultDx=[]; _consultRx=[]; _consultLab=[]; _consultRad=[];
  alert('Consultation completed.\n'+uid+' moved to Done in OPD Queue.');
  consultRenderSidebar(); consultRenderTabs();
}

function consultAdmitIPD() {
  if(!_consultUhid)return;
  alert('IPD Admission — coming in the IPD & Ward module.\nPatient: '+_consultUhid);
}

// ── Sidebar toggle ────────────────────────────────────────────────────────────
function consultToggleSidebar() {
  _consultShowPt=!_consultShowPt;
  var sb=document.getElementById('consult-sidebar');
  var lay=document.getElementById('consult-layout');
  var btn=document.getElementById('consult-toggle-btn');
  if(!sb||!lay||!btn)return;
  if(_consultShowPt){
    sb.style.display=''; lay.style.gridTemplateColumns='300px 1fr'; btn.textContent='Hide Panel';
  } else {
    sb.style.display='none'; lay.style.gridTemplateColumns='1fr'; btn.textContent='Show Panel';
  }
}

// ── Page function ─────────────────────────────────────────────────────────────
function pageOpdConsult() {
  return pageHeader(
    "Doctor's Consultation",
    'OPD Management <span>&#8250;</span> Doctor\'s Consultation',
    '<button onclick="navTo(\'opd-queue\')" style="padding:7px 14px;border-radius:7px;border:1px solid #d1d5db;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer">OPD Queue</button>'+
    '<button onclick="navTo(\'opd-nurse\')" style="padding:7px 14px;border-radius:7px;border:1px solid #d1d5db;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px">Nurse Station</button>'
  )+

  '<div id="consult-layout" style="display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start">'+

    // ── Left: dark patient panel ─────────────────────────────────────────────
    '<div id="consult-sidebar" style="background:#0d1f33;border-radius:10px;overflow:hidden;position:sticky;top:16px;max-height:calc(100vh - 110px);overflow-y:auto">'+
      '<div style="padding:10px 12px;background:#152840;border-bottom:1px solid #1e3a5f;display:flex;justify-content:space-between;align-items:center">'+
        '<div style="font-weight:700;font-size:13px;color:#fff">Patient Panel</div>'+
        '<button id="consult-toggle-btn" onclick="consultToggleSidebar()" style="padding:4px 10px;border-radius:5px;border:1px solid #334155;background:transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer">Hide Panel</button>'+
      '</div>'+
      '<div id="consult-panel-body"></div>'+
    '</div>'+

    // ── Right: tab bar + content ─────────────────────────────────────────────
    '<div>'+
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px 10px 0 0;display:flex;align-items:center;border-bottom:2px solid #e2e8f0;overflow-x:auto">'+
        '<button data-tg="consult" data-tid="history" onclick="showTab(\'consult\',\'history\')" style="padding:11px 14px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap">1. History</button>'+
        '<button data-tg="consult" data-tid="exam"    onclick="showTab(\'consult\',\'exam\')"    style="padding:11px 14px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap">2. Examination</button>'+
        '<button data-tg="consult" data-tid="dx"      onclick="showTab(\'consult\',\'dx\')"      style="padding:11px 14px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap">3. Diagnosis</button>'+
        '<button data-tg="consult" data-tid="invest"  onclick="showTab(\'consult\',\'invest\')"  style="padding:11px 14px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap">4. Investigations</button>'+
        '<button data-tg="consult" data-tid="rx"      onclick="showTab(\'consult\',\'rx\')"      style="padding:11px 14px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap">5. Prescription</button>'+
        '<button data-tg="consult" data-tid="plan"    onclick="showTab(\'consult\',\'plan\')"    style="padding:11px 14px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap">6. Plan &amp; Advice</button>'+
      '</div>'+
      '<div id="consult-tabs-area"></div>'+
    '</div>'+

  '</div>';
}

// ── Post-render init (called by navTo) ────────────────────────────────────────
function consultInit() {
  _consultUhid=null; _consultDx=[]; _consultRx=[]; _consultLab=[]; _consultRad=[]; _consultShowPt=true;
  var first=OPD_QUEUE.find(function(p){return p.status==='in-consultation';});
  if(first) consultSelect(first.uhid);
  else { consultRenderSidebar(); consultRenderTabs(); }
}
