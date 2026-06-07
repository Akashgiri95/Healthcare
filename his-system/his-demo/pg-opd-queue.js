// ─── OPD CYCLE — Screen 1: Queue & Check-in ──────────────────────────────────
// Page: opd-queue | Functions: oq*, oqInit
// Depends on: _APT_DOCTORS, _AM_APTS (from pg-reg-appointments.js), DEMO_PATIENTS (from pg-reg-patient.js)

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

var _oqFilter    = 'all';
var _oqWalkCtr   = 45;
var _oqCheckinPt = null;

// ── Core helpers ─────────────────────────────────────────────────────────────
function oqPriorityScore(p) {
  var s  = p.priority.includes('emergency')?0:p.priority.includes('pregnant')?1:(p.priority.includes('senior')||p.priority.includes('disabled'))?2:3;
  var st = p.status==='vitals'?0:p.status==='waiting'?1:p.status==='in-consultation'?2:p.status==='done'?3:4;
  return s*10+st;
}
function oqDeptCode(dept) {
  return {'General Medicine':'GEN','Gynaecology':'GYN','Cardiology':'CAR','Orthopaedics':'ORT','Paediatrics':'PAE','ENT':'ENT','Dermatology':'DRM','Ophthalmology':'OPH'}[dept]||'OPD';
}

// ── Tab filter ────────────────────────────────────────────────────────────────
function oqTab(t) {
  _oqFilter = t;
  ['all','appointment','walkin'].forEach(function(id) {
    var btn = document.getElementById('oq-tab-'+id); if(!btn)return;
    btn.style.background  = id===t?'#2563eb':'#f8fafc';
    btn.style.color       = id===t?'#fff':'#374151';
    btn.style.borderColor = id===t?'#2563eb':'#e2e8f0';
  });
  oqRenderQueue();
}

// ── Main render ───────────────────────────────────────────────────────────────
function oqRenderQueue() {
  var list = OPD_QUEUE.slice().sort(function(a,b){return oqPriorityScore(a)-oqPriorityScore(b);});
  if(_oqFilter==='appointment') list=list.filter(function(p){return p.type==='appointment';});
  if(_oqFilter==='walkin')      list=list.filter(function(p){return p.type==='walkin';});

  var w=0,v=0,c=0,dn=0,ns=0;
  OPD_QUEUE.forEach(function(p){
    if(p.status==='waiting')w++; else if(p.status==='vitals')v++; else if(p.status==='in-consultation')c++; else if(p.status==='done')dn++; else if(p.status==='no-show')ns++;
  });

  var kpiEl = document.getElementById('oq-kpi-row');
  if(kpiEl) kpiEl.innerHTML = [
    {label:'Waiting',        value:w,               color:'#1d4ed8',bg:'#eff6ff'},
    {label:'In Vitals',      value:v,               color:'#7c3aed',bg:'#f5f3ff'},
    {label:'In Consultation',value:c,               color:'#b45309',bg:'#fffbeb'},
    {label:'Completed',      value:dn,              color:'#15803d',bg:'#f0fdf4'},
    {label:'No-show',        value:ns,              color:'#b91c1c',bg:'#fef2f2'},
    {label:'Total Today',    value:OPD_QUEUE.length,color:'#334155',bg:'#f8fafc'},
  ].map(function(k){
    return '<div style="background:'+k.bg+';border-radius:10px;padding:14px 18px;text-align:center;flex:1">'+
      '<div style="font-size:26px;font-weight:800;color:'+k.color+'">'+k.value+'</div>'+
      '<div style="font-size:12px;color:#64748b;margin-top:2px">'+k.label+'</div></div>';
  }).join('');

  var pfChip = function(flags){return flags.map(function(f){var map={emergency:'#dc2626',pregnant:'#db2777',senior:'#ca8a04',disabled:'#0891b2'};var label={emergency:'EMRG',pregnant:'PREG',senior:'SR.CTZN',disabled:'DISB'};return '<span style="font-size:10px;font-weight:700;background:'+map[f]+';color:#fff;padding:1px 5px;border-radius:3px;margin-right:2px">'+label[f]+'</span>';}).join('');};
  var waitEst = function(p){if(p.status!=='waiting')return '—';var pos=OPD_QUEUE.filter(function(x){return x.docId===p.docId&&(x.status==='waiting'||x.status==='vitals');}).sort(function(a,b){return oqPriorityScore(a)-oqPriorityScore(b);}).findIndex(function(x){return x.uhid===p.uhid;});return '~'+((pos+1)*10)+' min';};
  var statusMap = {
    'waiting':         '<span style="background:#eff6ff;color:#1d4ed8;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">Waiting</span>',
    'vitals':          '<span style="background:#f5f3ff;color:#7c3aed;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">In Vitals</span>',
    'in-consultation': '<span style="background:#fffbeb;color:#b45309;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">Consulting</span>',
    'done':            '<span style="background:#f0fdf4;color:#15803d;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">Done</span>',
    'no-show':         '<span style="background:#fef2f2;color:#b91c1c;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px">No-show</span>',
  };
  var actionBtns = function(p){
    var b=function(label,fn,color){return '<button onclick="'+fn+'(\''+p.uhid+'\')" style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:5px;cursor:pointer;border:1px solid '+color+';color:'+color+';background:#fff;margin-right:4px">'+label+'</button>';};
    if(p.status==='waiting')         return b('Vitals','oqSendVitals','#7c3aed')+b('No-show','oqNoShow','#dc2626')+b('Reassign','oqReassign','#64748b');
    if(p.status==='vitals')          return b('Call In','oqCallIn','#2563eb')+b('No-show','oqNoShow','#dc2626');
    if(p.status==='in-consultation') return '<span style="color:#cbd5e1;font-size:12px">In session</span>';
    if(p.status==='done')            return '<span style="color:#cbd5e1;font-size:12px">Completed</span>';
    if(p.status==='no-show')         return b('Restore','oqRestore','#ca8a04');
    return '—';
  };

  var rows = list.map(function(p){
    var typeTag = p.type==='appointment'
      ? '<span style="font-size:10px;background:#eff6ff;color:#1d4ed8;padding:1px 5px;border-radius:3px;font-weight:700">APT</span>'
      : '<span style="font-size:10px;background:#f1f5f9;color:#475569;padding:1px 5px;border-radius:3px;font-weight:700">W-IN</span>';
    return '<tr style="border-bottom:1px solid #f1f5f9">'+
      '<td style="padding:10px 12px;font-family:monospace;font-weight:800;font-size:14px;color:'+(p.priority.includes('emergency')?'#dc2626':'#2563eb')+'">'+p.token+'</td>'+
      '<td style="padding:10px 12px"><div style="font-weight:600;color:#1e293b;font-size:13.5px">'+p.name+' '+pfChip(p.priority)+'</div><div style="font-size:11.5px;color:#94a3b8;margin-top:1px">'+p.uhid+' · '+p.age+'Y '+p.gender+' · '+typeTag+'</div></td>'+
      '<td style="padding:10px 12px;font-size:13px"><div style="font-weight:600;color:#374151">'+p.doctor.split(' ').slice(0,2).join(' ')+'</div><div style="font-size:11.5px;color:#94a3b8">'+p.dept+'</div></td>'+
      '<td style="padding:10px 12px">'+(statusMap[p.status]||badge(p.status,'gray'))+'</td>'+
      '<td style="padding:10px 12px;font-size:12.5px;color:#64748b">'+waitEst(p)+'</td>'+
      '<td style="padding:10px 12px;font-size:12.5px;color:#475569">'+p.payer+'</td>'+
      '<td style="padding:10px 12px;font-size:12px;color:#94a3b8">'+p.reg+'</td>'+
      '<td style="padding:10px 12px;white-space:nowrap">'+actionBtns(p)+'</td>'+
    '</tr>';
  }).join('');

  var tbody = document.getElementById('oq-tbody');
  if(tbody) tbody.innerHTML = rows||'<tr><td colspan="8" style="text-align:center;padding:32px;color:#94a3b8;font-size:13px">No patients in queue</td></tr>';
  oqRenderWorkload();
  oqRenderDisplayBoard();
}

// ── Workload bars ─────────────────────────────────────────────────────────────
function oqRenderWorkload() {
  var el = document.getElementById('oq-workload'); if(!el)return;
  var doctors = [
    {id:'D001',name:'Dr. Anil Mehta',  dept:'Gen. Medicine'},
    {id:'D002',name:'Dr. Priya Sharma',dept:'Gynaecology'},
    {id:'D003',name:'Dr. Suresh Verma',dept:'Cardiology'},
    {id:'D004',name:'Dr. Rajesh Nair', dept:'Orthopaedics'},
    {id:'D005',name:'Dr. Meena Joshi', dept:'Paediatrics'},
  ];
  var max=8;
  el.innerHTML = doctors.map(function(d){
    var pts=OPD_QUEUE.filter(function(p){return p.docId===d.id;});
    var w=0,v=0,c=0,dn=0;
    pts.forEach(function(p){if(p.status==='waiting')w++;else if(p.status==='vitals')v++;else if(p.status==='in-consultation')c++;else if(p.status==='done')dn++;});
    var total=w+v+c+dn;
    return '<div style="margin-bottom:12px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div><div style="font-size:13px;font-weight:600;color:#1e293b">'+d.name+'</div><div style="font-size:11px;color:#94a3b8">'+d.dept+'</div></div><div style="font-size:12px;color:#64748b">'+total+' / '+max+'</div></div>'+
      '<div style="height:8px;background:#f1f5f9;border-radius:999px;overflow:hidden;display:flex">'+
        (c?'<div style="background:#f59e0b;width:'+(c/max*100)+'%;transition:.3s"></div>':'')+
        (v?'<div style="background:#7c3aed;width:'+(v/max*100)+'%;transition:.3s"></div>':'')+
        (w?'<div style="background:#2563eb;width:'+(w/max*100)+'%;transition:.3s"></div>':'')+
        (dn?'<div style="background:#16a34a;width:'+(dn/max*100)+'%;transition:.3s"></div>':'')+
      '</div>'+
      '<div style="display:flex;gap:12px;margin-top:3px;font-size:10.5px;color:#94a3b8">'+
        (c?'<span style="color:#b45309">&#9632; '+c+' consulting</span>':'')+
        (v?'<span style="color:#7c3aed">&#9632; '+v+' vitals</span>':'')+
        (w?'<span style="color:#2563eb">&#9632; '+w+' waiting</span>':'')+
        (dn?'<span style="color:#16a34a">&#9632; '+dn+' done</span>':'')+
        (!total?'<span>No patients</span>':'')+
      '</div>'+
    '</div>';
  }).join('');
}

// ── Display board ─────────────────────────────────────────────────────────────
function oqRenderDisplayBoard() {
  var el = document.getElementById('oq-display-board'); if(!el)return;
  var calling = OPD_QUEUE.filter(function(p){return p.status==='in-consultation';});
  var next    = OPD_QUEUE.filter(function(p){return p.status==='vitals'||p.status==='waiting';}).sort(function(a,b){return oqPriorityScore(a)-oqPriorityScore(b);}).slice(0,3);
  var now = calling.length?calling[0]:null;
  el.innerHTML =
    '<div style="background:#0a1628;border-radius:10px;padding:18px;font-family:monospace;min-height:160px">'+
      '<div style="font-size:10px;color:#475569;letter-spacing:.12em;margin-bottom:12px">OPD DISPLAY BOARD — LIVE PREVIEW</div>'+
      (now
        ? '<div style="text-align:center;margin-bottom:14px"><div style="font-size:11px;color:#94a3b8;letter-spacing:.1em;margin-bottom:4px">NOW CALLING</div><div style="font-size:32px;font-weight:900;color:#34d399;letter-spacing:.05em">'+now.token+'</div><div style="font-size:12px;color:#60a5fa;margin-top:4px">'+now.name+' &rarr; '+now.dept+'</div></div>'
        : '<div style="text-align:center;color:#475569;font-size:13px;padding:16px 0">— No patient being called —</div>'
      )+
      (next.length
        ? '<div style="border-top:1px solid #1e3a5f;padding-top:10px"><div style="font-size:10px;color:#475569;letter-spacing:.1em;margin-bottom:6px">NEXT IN QUEUE</div>'+
          next.map(function(p,i){return '<div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:4px"><span style="color:#fbbf24;font-weight:700">'+(i+1)+'. '+p.token+'</span><span>'+p.name+'</span></div>';}).join('')+
          '</div>'
        : ''
      )+
    '</div>';
}

// ── Queue action handlers ─────────────────────────────────────────────────────
function oqSendVitals(uhid) { var p=OPD_QUEUE.find(function(x){return x.uhid===uhid;}); if(p){p.status='vitals';oqRenderQueue();} }
function oqCallIn(uhid)     { var p=OPD_QUEUE.find(function(x){return x.uhid===uhid;}); if(p){p.status='in-consultation';oqRenderQueue();} }
function oqNoShow(uhid)     { var p=OPD_QUEUE.find(function(x){return x.uhid===uhid;}); if(p&&confirm('Mark '+p.name+' as No-show?')){p.status='no-show';oqRenderQueue();} }
function oqRestore(uhid)    { var p=OPD_QUEUE.find(function(x){return x.uhid===uhid;}); if(p){p.status='waiting';oqRenderQueue();} }
function oqReassign(uhid) {
  var p=OPD_QUEUE.find(function(x){return x.uhid===uhid;}); if(!p)return;
  var newDoc=prompt('Reassign to doctor:\nD001 Dr. Anil Mehta (Gen Medicine)\nD002 Dr. Priya Sharma (Gynae)\nD003 Dr. Suresh Verma (Cardiology)\nD004 Dr. Rajesh Nair (Ortho)\nD005 Dr. Meena Joshi (Paeds)\n\nEnter Doctor ID:');
  if(!newDoc)return;
  var doc=_APT_DOCTORS.find(function(d){return d.id===newDoc.trim();}); if(!doc){alert('Doctor not found.');return;}
  p.docId=doc.id; p.doctor=doc.name; p.dept=doc.dept; oqRenderQueue();
}

// ── Appointment check-in ──────────────────────────────────────────────────────
function oqCheckinSearch(q) {
  var box=document.getElementById('oq-checkin-results'); if(q.length<2){box.style.display='none';return;}
  var m=_AM_APTS.filter(function(a){return a.status==='booked'&&(a.patient.toLowerCase().includes(q.toLowerCase())||a.uhid.toLowerCase().includes(q.toLowerCase())||a.no.toLowerCase().includes(q.toLowerCase()));});
  if(!m.length){box.innerHTML='<div style="padding:10px;font-size:13px;color:#94a3b8">No pending appointments found</div>';box.style.display='block';return;}
  box.innerHTML=m.map(function(a){
    return '<div onclick=\'oqCheckinSelect('+JSON.stringify(a)+')\' style="padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">' +
      '<div style="font-weight:600;color:#1e293b">'+a.patient+' <span style="font-family:monospace;font-size:11px;color:#64748b">'+a.uhid+'</span></div>' +
      '<div style="font-size:11.5px;color:#94a3b8;margin-top:1px">'+a.no+' · '+a.doctor+' · '+a.time+' ('+a.sess+')</div>' +
    '</div>';
  }).join('');
  box.style.display='block';
}
function oqCheckinSelect(apt) {
  _oqCheckinPt=apt;
  document.getElementById('oq-checkin-results').style.display='none';
  document.getElementById('oq-checkin-inp').value='';
  document.getElementById('oq-checkin-card').innerHTML=
    '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-top:8px">'+
      '<div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:6px">'+apt.patient+'</div>'+
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12.5px">'+
        '<span style="color:#64748b">UHID</span><span style="font-family:monospace;font-weight:700;color:#166534">'+apt.uhid+'</span>'+
        '<span style="color:#64748b">Apt No.</span><span style="font-family:monospace">'+apt.no+'</span>'+
        '<span style="color:#64748b">Doctor</span><span>'+apt.doctor+'</span>'+
        '<span style="color:#64748b">Slot</span><span style="font-weight:700;color:#2563eb">'+apt.time+' ('+apt.sess+')</span>'+
      '</div>'+
      '<button onclick="oqCheckinConfirm()" class="btn-success" style="width:100%;justify-content:center;margin-top:10px;padding:9px">Confirm Arrival &amp; Issue Token</button>'+
    '</div>';
  document.getElementById('oq-checkin-card').style.display='';
}
function oqCheckinConfirm() {
  if(!_oqCheckinPt)return;
  var a=_oqCheckinPt;
  var token=oqDeptCode(a.dept)+'-'+String(_oqWalkCtr++).padStart(3,'0');
  OPD_QUEUE.unshift({uhid:a.uhid,name:a.patient,age:30,gender:'—',token:token,dept:a.dept,doctor:a.doctor,docId:a.docId,status:'waiting',payer:a.payer||'Self',reg:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),priority:[],type:'appointment',apt:a.no});
  a.status='arrived'; _oqCheckinPt=null;
  document.getElementById('oq-checkin-card').style.display='none';
  document.getElementById('oq-checkin-inp').value='';
  oqRenderQueue(); alert('Token issued: '+token+'\nPatient added to queue.');
}

// ── Walk-in token ─────────────────────────────────────────────────────────────
function oqWalkinDept() {
  var dept=document.getElementById('oq-wk-dept').value;
  var sel=document.getElementById('oq-wk-doctor');
  Array.from(sel.options).forEach(function(o){ if(!o.value){o.style.display='';return;} o.style.display=(!dept||o.dataset.dept===dept)?'':'none'; });
  sel.value='';
}
function oqWalkinConfirm() {
  var name  = (document.getElementById('oq-wk-name')||{value:''}).value.trim();
  var dept  = (document.getElementById('oq-wk-dept')||{value:''}).value;
  var docEl = document.getElementById('oq-wk-doctor');
  var docId = docEl?docEl.value:'';
  var docName = docEl&&docEl.value?docEl.options[docEl.selectedIndex].text:'';
  if(!name||!dept||!docId){alert('Enter patient name, department and doctor.');return;}
  var token = oqDeptCode(dept)+'-'+String(_oqWalkCtr++).padStart(3,'0');
  var uhid  = 'TEMP-'+String(Math.floor(Math.random()*9000)+1000);
  OPD_QUEUE.unshift({uhid:uhid,name:name,age:0,gender:'—',token:token,dept:dept,doctor:docName,docId:docId,status:'waiting',payer:'Self',reg:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),priority:[],type:'walkin',apt:''});
  document.getElementById('oq-wk-name').value='';
  document.getElementById('oq-wk-dept').value='';
  docEl.value='';
  oqRenderQueue(); alert('Token issued: '+token+'\nPatient added to walk-in queue.');
}

// ── Page function ─────────────────────────────────────────────────────────────
function pageOpdQueue() {
  var today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var tabBtn = function(id,label){ var act=id==='all'; return '<button id="oq-tab-'+id+'" onclick="oqTab(\''+id+'\')" style="padding:6px 18px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid '+(act?'#2563eb':'#e2e8f0')+';background:'+(act?'#2563eb':'#f8fafc')+';color:'+(act?'#fff':'#374151')+'">'+label+'</button>'; };
  var docOpts = '<option value="">Select Doctor</option>' + _APT_DOCTORS.map(function(d){return '<option value="'+d.id+'" data-dept="'+d.dept+'">'+d.name+'</option>';}).join('');
  var deptOpts = ['','General Medicine','Gynaecology','Cardiology','Orthopaedics','Paediatrics','ENT','Dermatology','Ophthalmology'].map(function(d){return '<option value="'+d+'">'+(d||'Select Department')+'</option>';}).join('');

  return pageHeader('OPD Queue &amp; Check-in','OPD Management <span>›</span> OPD Queue',
    '<button class="btn-outline" onclick="navTo(\'reg-desk\')" style="font-size:13px">Front Desk</button> ' +
    '<button class="btn-outline" onclick="navTo(\'appointments\')" style="font-size:13px">Appointments</button> ' +
    '<button class="btn-primary" onclick="navTo(\'opd-nurse\')" style="font-size:13px">Nurse Station</button>'
  ) +

  '<div id="oq-kpi-row" style="display:flex;gap:12px;margin-bottom:20px"></div>' +

  '<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px;font-size:12px;flex-wrap:wrap">'+
    '<span style="color:#64748b;font-weight:600">Status:</span>'+
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#7c3aed;margin-right:4px"></span>In Vitals</span>'+
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#2563eb;margin-right:4px"></span>Waiting</span>'+
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f59e0b;margin-right:4px"></span>Consulting</span>'+
    '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#16a34a;margin-right:4px"></span>Done</span>'+
    '<span style="color:#64748b;font-weight:600;margin-left:8px">Priority:</span>'+
    '<span style="background:#dc2626;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">EMRG</span>'+
    '<span style="background:#db2777;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">PREG</span>'+
    '<span style="background:#ca8a04;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">SR.CTZN</span>'+
    '<span style="background:#0891b2;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px">DISB</span>'+
  '</div>' +

  '<div style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start">' +

  // ── LEFT: Queue table ────────────────────────────────────────────────────
  '<div>' +
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' +
      '<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">' +
        '<div style="font-weight:700;font-size:14.5px;color:#1e293b">Live Queue — <span style="font-weight:400;font-size:13px;color:#64748b">'+today+'</span></div>' +
        '<div style="display:flex;gap:6px">'+tabBtn('all','All')+tabBtn('appointment','Appointments')+tabBtn('walkin','Walk-ins')+'</div>' +
      '</div>' +
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">' +
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
      '</table></div>' +
    '</div>' +
  '</div>' +

  // ── RIGHT: Action panel ──────────────────────────────────────────────────
  '<div style="display:flex;flex-direction:column;gap:14px">' +
    sectionCard('Appointment Check-in',
      '<div style="font-size:12.5px;color:#64748b;margin-bottom:8px">Search by patient name, UHID or appointment number</div>'+
      '<div style="position:relative"><input id="oq-checkin-inp" class="form-input" placeholder="Name / UHID / APT no..." oninput="oqCheckinSearch(this.value)" style="font-size:13px"><div id="oq-checkin-results" style="display:none;position:absolute;left:0;right:0;top:38px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:20;max-height:200px;overflow-y:auto"></div></div>'+
      '<div id="oq-checkin-card" style="display:none"></div>'
    ) +
    sectionCard('Issue Walk-in Token',
      formRow(formField('Patient Name','<input id="oq-wk-name" class="form-input" placeholder="Full name" style="font-size:13px">',true))+
      formRow(formField('Department','<select id="oq-wk-dept" class="form-select" onchange="oqWalkinDept()" style="font-size:13px">'+deptOpts+'</select>',true))+
      formRow(formField('Doctor','<select id="oq-wk-doctor" class="form-select" style="font-size:13px">'+docOpts+'</select>',true)),
      '<button onclick="oqWalkinConfirm()" class="btn-primary" style="width:100%;justify-content:center;padding:9px">Issue Token</button>'
    ) +
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px">' +
      '<div style="font-weight:700;font-size:13.5px;color:#1e293b;margin-bottom:14px">Doctor Workload</div>' +
      '<div id="oq-workload"></div>' +
    '</div>' +
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px">' +
      '<div style="font-weight:700;font-size:13.5px;color:#1e293b;margin-bottom:10px">Display Board Preview</div>' +
      '<div id="oq-display-board"></div>' +
    '</div>' +
  '</div>' +
  '</div>';
}

// ── Post-render init (called by navTo in login.js) ────────────────────────────
function oqInit() {
  if(document.getElementById('oq-tbody')){ _oqFilter='all'; oqRenderQueue(); }
}
