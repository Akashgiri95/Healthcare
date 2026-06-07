// ─── REGISTRATION — Appointment Management ────────────────────────────────────
// Page: appointments | Functions: am*
// Declares globals: _APT_DOCTORS, _APT_BOOKED, _AM_APTS (used by pg-opd-queue.js)
// Depends on: DEMO_PATIENTS (from pg-reg-patient.js)

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

var _amTab      = 'book';
var _amBookPt   = null;
var _amBookNR   = false;
var _amDocId    = '';
var _amDocFee   = 0;
var _amSlot     = '';
var _amSess     = 'Morning';
var _amBulk     = [];
var _AM_BLOCKED = {};
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
  { time:'08:45 AM', staff:'Anita Sharma', action:'Booked',    patient:'Ramesh Kumar',   aptNo:'APT/26/0001', detail:'General Medicine · Dr. Anil Mehta · 09:00 (Morning)' },
  { time:'09:00 AM', staff:'Anita Sharma', action:'Booked',    patient:'Mohammed Iqbal', aptNo:'APT/26/0002', detail:'Cardiology · Dr. Suresh Verma · 10:00 (Morning)' },
  { time:'09:10 AM', staff:'Anita Sharma', action:'Booked',    patient:'Sunita Patel',   aptNo:'APT/26/0003', detail:'Gynaecology · Dr. Priya Sharma · 10:30 (Morning)' },
  { time:'09:20 AM', staff:'Ravi Kumar',   action:'Booked',    patient:'Kavita Desai',   aptNo:'APT/26/0004', detail:'Orthopaedics · Dr. Rajesh Nair · 11:00 (Morning)' },
  { time:'09:30 AM', staff:'Anita Sharma', action:'Cancelled', patient:'Ramesh Kumar',   aptNo:'APT/26/0005', detail:'Reason: Patient request' },
  { time:'09:40 AM', staff:'Ravi Kumar',   action:'Booked',    patient:'Arjun Singh',    aptNo:'APT/26/0006', detail:'Paediatrics · Dr. Meena Joshi · 16:00 (Evening)' },
];

// ── Handlers ──────────────────────────────────────────────────────────────────
function amLog(action, patient, aptNo, detail) {
  var now   = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  var staff = (typeof currentUser!=='undefined'&&currentUser) ? currentUser.name : 'Staff';
  _AM_LOG.unshift({ time:now, staff:staff, action:action, patient:patient, aptNo:aptNo, detail:detail });
}
function amTab(t) {
  _amTab = t;
  ['book','schedule','manage','audit'].forEach(function(id) {
    var btn = document.getElementById('am-tab-'+id); var pnl = document.getElementById('am-pnl-'+id);
    if(btn){ btn.style.background=id===t?'#2563eb':'#f8fafc'; btn.style.color=id===t?'#fff':'#374151'; btn.style.borderColor=id===t?'#2563eb':'#e2e8f0'; }
    if(pnl) pnl.style.display = id===t?'':'none';
  });
  if(t==='manage')   amRenderManage();
  if(t==='audit')    amRenderAudit();
  if(t==='schedule') amRenderSchedule();
}
function amBookSearch(q) {
  var box = document.getElementById('am-book-results');
  if(q.length<2){ box.style.display='none'; return; }
  var m = DEMO_PATIENTS.filter(function(p){ return p.name.toLowerCase().includes(q.toLowerCase())||p.uhid.toLowerCase().includes(q.toLowerCase())||p.mobile.includes(q); });
  if(!m.length){ box.innerHTML='<div style="padding:10px 14px;font-size:13px;color:#94a3b8">No record found — <button onclick="amBookNonReg()" style="background:none;border:none;color:#2563eb;font-weight:600;cursor:pointer;font-size:13px;text-decoration:underline">book without UHID</button></div>'; box.style.display='block'; return; }
  box.innerHTML = m.map(function(p){
    var todayApts = _AM_APTS.filter(function(a){ return a.uhid===p.uhid&&a.date==='today'&&a.status!=='cancelled'; });
    var dup = todayApts.length ? '<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:999px;font-weight:700;margin-left:6px">'+todayApts.length+' apt today</span>' : '';
    return '<div onclick=\'amPickPatient('+JSON.stringify(p)+')\' style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">' +
      '<div style="font-weight:600;font-size:13.5px;color:#1e293b">'+p.name+' <span style="font-family:monospace;font-size:11.5px;color:#64748b">'+p.uhid+'</span>'+dup+'</div>' +
      '<div style="font-size:12px;color:#94a3b8;margin-top:1px">'+p.age+'Y '+p.gender+' · '+p.mobile+'</div></div>';
  }).join('');
  box.style.display='block';
}
function amPickPatient(p) {
  _amBookPt=p; _amBookNR=false;
  document.getElementById('am-book-results').style.display='none';
  document.getElementById('am-book-search-inp').value='';
  document.getElementById('am-book-nonreg').style.display='none';
  var todayApts = _AM_APTS.filter(function(a){ return a.uhid===p.uhid&&a.date==='today'&&a.status!=='cancelled'; });
  var dup = todayApts.length ? '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:7px;padding:8px 12px;margin-bottom:8px;font-size:12.5px;color:#92400e"><b>Duplicate Check:</b> This patient already has '+todayApts.length+' appointment(s) today ('+todayApts.map(function(a){return a.time;}).join(', ')+'). Confirm to book another.</div>' : '';
  document.getElementById('am-book-pt-card').innerHTML =
    dup + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:start">' +
        '<div><div style="font-weight:700;font-size:14px;color:#1e293b">'+p.name+'</div>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px;display:grid;grid-template-columns:auto 1fr;gap:2px 10px">' +
            '<span>UHID</span><span style="font-family:monospace;font-weight:700;color:#166534">'+p.uhid+'</span>' +
            '<span>Age/Sex</span><span>'+p.age+'Y '+p.gender+'</span>' +
            '<span>Mobile</span><span>'+p.mobile+'</span>' +
          '</div></div>' +
        '<button onclick="amClearBookPt()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer">&times;</button>' +
      '</div></div>';
  document.getElementById('am-book-pt-card').style.display='';
}
function amBookNonReg() {
  _amBookPt=null; _amBookNR=true;
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
  var dept=document.getElementById('am-dept').value;
  var sel=document.getElementById('am-doctor');
  Array.from(sel.options).forEach(function(o){ if(!o.value){o.style.display='';return;} o.style.display=(!dept||o.dataset.dept===dept)?'':'none'; });
  sel.value=''; _amDocId=''; _amDocFee=0;
  document.getElementById('am-doc-info').style.display='none';
  amRefreshSlots(); amSummary();
}
function amDocPick() {
  var sel=document.getElementById('am-doctor'); var opt=sel.options[sel.selectedIndex];
  _amDocId=opt.value; _amDocFee=parseInt(opt.dataset.fee)||0;
  var info=document.getElementById('am-doc-info');
  if(_amDocId){ info.textContent=opt.dataset.qual+' · Consultation: ₹'+opt.dataset.fee; info.style.display=''; }
  else info.style.display='none';
  amRefreshSlots(); amSummary();
}
function amSetSess(s) {
  _amSess=s; _amSlot='';
  var mBtn=document.getElementById('am-sess-m'); var eBtn=document.getElementById('am-sess-e');
  var act={background:'#2563eb',color:'#fff',borderColor:'#2563eb'};
  var off={background:'#f8fafc',color:'#374151',borderColor:'#e2e8f0'};
  Object.assign(mBtn.style,s==='Morning'?act:off); Object.assign(eBtn.style,s==='Morning'?off:act);
  amRefreshSlots(); amSummary();
}
function amPickSlot(s) { _amSlot=_amSlot===s?'':s; amRefreshSlots(); amSummary(); }
function amRefreshSlots() {
  var grid=document.getElementById('am-slot-grid'); var lbl=document.getElementById('am-slot-lbl'); var cnt=document.getElementById('am-slot-cnt');
  if(!_amDocId){ grid.innerHTML='<div style="grid-column:1/-1;text-align:center;color:#cbd5e1;padding:28px;font-size:13px">Select a doctor first</div>'; lbl.textContent=''; cnt.textContent=''; return; }
  var doc=_APT_DOCTORS.find(function(d){return d.id===_amDocId;}); lbl.textContent=doc?doc.name:'';
  var slots=_amSess==='Morning'?_AM_MORNING:_AM_EVENING;
  var booked=(_APT_BOOKED[_amDocId]||[]); var blocked=(_AM_BLOCKED[_amDocId]||[]); var avail=0;
  grid.innerHTML=slots.map(function(s){
    var isBlk=blocked.includes(s); var isBk=booked.includes(s); var isSel=_amSlot===s;
    if(!isBlk&&!isBk)avail++;
    var bg  =isBlk?'#fef2f2':isSel?'#2563eb':isBk?'#f1f5f9':'#f0fdf4';
    var clr =isBlk?'#dc2626':isSel?'#fff':isBk?'#94a3b8':'#166534';
    var bdr =isBlk?'1px solid #fca5a5':isSel?'2px solid #2563eb':isBk?'1px solid #e2e8f0':'1px solid #86efac';
    var lbl2=isBlk?'<div style="font-size:10px;margin-top:1px">Blocked</div>':isBk?'<div style="font-size:10px;margin-top:1px;opacity:.6">Booked</div>':'';
    var clk=(!isBlk&&!isBk)?'onclick="amPickSlot(\''+s+'\')"':'';
    return '<div '+clk+' style="padding:10px;border-radius:8px;background:'+bg+';color:'+clr+';border:'+bdr+';cursor:'+(!isBlk&&!isBk?'pointer':'not-allowed')+';text-align:center;font-weight:600;font-size:13px;transition:all .15s">'+s+lbl2+'</div>';
  }).join('');
  cnt.textContent=avail+' available';
}
function amSummary() {
  var empty=document.getElementById('am-sum-empty'); var filled=document.getElementById('am-sum-filled');
  var docSel=document.getElementById('am-doctor');
  var docName=docSel&&docSel.value?docSel.options[docSel.selectedIndex].text.split(' — ')[0]:'';
  var dept=document.getElementById('am-dept')?document.getElementById('am-dept').value:'';
  var dateVal=document.getElementById('am-date')?document.getElementById('am-date').value:'';
  if(!_amDocId||!_amSlot||((!_amBookPt)&&!_amBookNR)){ empty.style.display=''; filled.style.display='none'; return; }
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
  if(!_amDocId||!_amSlot||((!_amBookPt)&&!_amBookNR)){ alert('Please complete all fields.'); return; }
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
  var a=_AM_APTS.find(function(x){return x.no===aptNo;}); if(a) amShowSlip(a);
}
function amRenderSchedule() {
  var docId=document.getElementById('am-sched-doc')?document.getElementById('am-sched-doc').value:_amSchedDoc;
  _amSchedDoc=docId||'D001';
  var blocked=_AM_BLOCKED[_amSchedDoc]||[]; var booked=_APT_BOOKED[_amSchedDoc]||[];
  var allSlots=_AM_MORNING.concat(_AM_EVENING);
  var gridHtml=allSlots.map(function(s){
    var isBlk=blocked.includes(s); var isBk=booked.includes(s);
    var apt=_AM_APTS.find(function(a){return a.docId===_amSchedDoc&&a.time===s&&a.status==='booked';});
    var bg=isBlk?'#fef2f2':isBk?'#eff6ff':'#f0fdf4';
    var bdr=isBlk?'#fca5a5':isBk?'#bfdbfe':'#86efac';
    var clr=isBlk?'#dc2626':isBk?'#1d4ed8':'#15803d';
    var lbl=isBlk?'BLOCKED':isBk?'BOOKED':'OPEN';
    var btnLabel=isBlk?'Unblock':'Block'; var btnClr=isBlk?'#16a34a':'#dc2626';
    return '<div style="background:'+bg+';border:1px solid '+bdr+';border-radius:8px;padding:10px;position:relative">'+
      '<div style="font-weight:700;font-size:13.5px;color:#1e293b">'+s+'</div>'+
      '<div style="font-size:10px;font-weight:700;letter-spacing:.06em;color:'+clr+';margin-top:2px">'+lbl+'</div>'+
      (apt?'<div style="font-size:10.5px;margin-top:3px;color:#374151;font-weight:600">'+apt.patient+'</div>':'')+
      '<button onclick="amToggleBlock(\''+_amSchedDoc+'\',\''+s+'\')" style="position:absolute;top:8px;right:8px;background:none;border:1px solid '+btnClr+';color:'+btnClr+';border-radius:4px;padding:1px 7px;font-size:10.5px;font-weight:600;cursor:pointer">'+btnLabel+'</button>'+
    '</div>';
  }).join('');
  var pnl=document.getElementById('am-sched-grid'); if(pnl) pnl.innerHTML=gridHtml;
  var apts=_AM_APTS.filter(function(a){return a.docId===_amSchedDoc&&a.date==='today'&&a.status!=='cancelled';});
  var listPnl=document.getElementById('am-sched-list');
  if(listPnl){
    if(!apts.length){listPnl.innerHTML='<div style="color:#94a3b8;font-size:13px;padding:12px 0">No appointments for this doctor today.</div>';return;}
    listPnl.innerHTML=table(['Time','Patient','UHID','Status','Booked By','Action'],apts.map(function(a){
      var sb=a.status==='completed'?badge('Done','green'):a.status==='cancelled'?badge('Cancelled','red'):badge('Booked','blue');
      return [a.time+' ('+a.sess+')',a.patient,'<span style="font-family:monospace;font-size:12px">'+a.uhid+'</span>',sb,a.by,
        '<button onclick="amShowSlipByNo(\''+a.no+'\')" style="font-size:12px;color:#2563eb;background:none;border:none;cursor:pointer;font-weight:600">Slip</button>'];
    }),'No appointments');
  }
}
function amToggleBlock(docId,slot) {
  if(!_AM_BLOCKED[docId])_AM_BLOCKED[docId]=[];
  var idx=_AM_BLOCKED[docId].indexOf(slot);
  if(idx>=0){_AM_BLOCKED[docId].splice(idx,1);amLog('Unblocked slot','—','—',docId+' · '+slot);}
  else{_AM_BLOCKED[docId].push(slot);amLog('Blocked slot','—','—',docId+' · '+slot);}
  amRenderSchedule(); amRefreshSlots();
}
function amRenderManage() {
  var fStatus=document.getElementById('am-flt-status')?document.getElementById('am-flt-status').value:'';
  var fDoctor=document.getElementById('am-flt-doctor')?document.getElementById('am-flt-doctor').value:'';
  var fSearch=document.getElementById('am-flt-search')?document.getElementById('am-flt-search').value.toLowerCase():'';
  var apts=_AM_APTS.filter(function(a){
    if(fStatus&&a.status!==fStatus)return false;
    if(fDoctor&&a.docId!==fDoctor)return false;
    if(fSearch&&!a.patient.toLowerCase().includes(fSearch)&&!a.uhid.toLowerCase().includes(fSearch))return false;
    return true;
  });
  var rows=apts.map(function(a){
    var sb=a.status==='completed'?badge('Done','green'):a.status==='cancelled'?badge('Cancelled','red'):a.status==='booked'?badge('Booked','blue'):badge(a.status,'gray');
    var chk='<input type="checkbox" '+((_amBulk.includes(a.no))?'checked':'')+' onchange="amBulkToggle(\''+a.no+'\')" style="width:15px;height:15px;cursor:pointer">';
    var actions=a.status==='booked'
      ? '<button onclick="amShowSlipByNo(\''+a.no+'\')" style="font-size:12px;color:#2563eb;background:none;border:none;cursor:pointer;font-weight:600;margin-right:8px">Slip</button>'+
        '<button onclick="amReschedule(\''+a.no+'\')" style="font-size:12px;color:#ca8a04;background:none;border:none;cursor:pointer;font-weight:600;margin-right:8px">Reschedule</button>'+
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
function amBulkToggle(aptNo) { var idx=_amBulk.indexOf(aptNo); if(idx>=0)_amBulk.splice(idx,1); else _amBulk.push(aptNo); amBulkBar(); }
function amBulkBar() {
  var bar=document.getElementById('am-bulk-bar'); if(!bar)return;
  if(!_amBulk.length){bar.style.display='none';return;}
  bar.style.display='flex'; document.getElementById('am-bulk-count').textContent=_amBulk.length+' selected';
}
function amBulkCancel() {
  if(!_amBulk.length)return;
  if(!confirm('Cancel '+_amBulk.length+' appointment(s)?'))return;
  _amBulk.forEach(function(no){
    var a=_AM_APTS.find(function(x){return x.no===no;});
    if(a&&a.status==='booked'){
      a.status='cancelled';
      if(_APT_BOOKED[a.docId]){var i=_APT_BOOKED[a.docId].indexOf(a.time);if(i>=0)_APT_BOOKED[a.docId].splice(i,1);}
      amLog('Bulk Cancelled',a.patient,no,'Reason: Bulk operation');
    }
  });
  _amBulk=[]; amRenderManage(); amRefreshSlots();
}
function amBulkTransfer() {
  var newDoc=prompt('Enter new Doctor ID (D001–D006):'); if(!newDoc)return;
  var doc=_APT_DOCTORS.find(function(d){return d.id===newDoc;}); if(!doc){alert('Doctor not found.');return;}
  _amBulk.forEach(function(no){
    var a=_AM_APTS.find(function(x){return x.no===no;});
    if(a&&a.status==='booked'){
      var oldDoc=a.docId;
      if(_APT_BOOKED[oldDoc]){var i=_APT_BOOKED[oldDoc].indexOf(a.time);if(i>=0)_APT_BOOKED[oldDoc].splice(i,1);}
      a.docId=newDoc; a.doctor=doc.name; a.dept=doc.dept;
      if(!_APT_BOOKED[newDoc])_APT_BOOKED[newDoc]=[];
      _APT_BOOKED[newDoc].push(a.time);
      amLog('Transferred',a.patient,no,'To '+doc.name);
    }
  });
  _amBulk=[]; amRenderManage();
}
function amReschedule(aptNo) {
  var a=_AM_APTS.find(function(x){return x.no===aptNo;}); if(!a)return;
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
  var a=_AM_APTS.find(function(x){return x.no===aptNo;}); if(!a)return;
  if(_APT_BOOKED[a.docId]){var i=_APT_BOOKED[a.docId].indexOf(a.time);if(i>=0)_APT_BOOKED[a.docId].splice(i,1);}
  amLog('Rescheduled',a.patient,aptNo,a.time+'→'+newSlot+' ('+newSess+')');
  a.time=newSlot; a.sess=newSess;
  if(!_APT_BOOKED[a.docId])_APT_BOOKED[a.docId]=[];
  _APT_BOOKED[a.docId].push(newSlot);
  document.getElementById('am-resched-modal').style.display='none';
  amRenderManage(); amRefreshSlots();
}
function amCancelOne(aptNo) {
  if(!confirm('Cancel appointment '+aptNo+'?'))return;
  var a=_AM_APTS.find(function(x){return x.no===aptNo;}); if(!a)return;
  if(_APT_BOOKED[a.docId]){var i=_APT_BOOKED[a.docId].indexOf(a.time);if(i>=0)_APT_BOOKED[a.docId].splice(i,1);}
  a.status='cancelled';
  amLog('Cancelled',a.patient,aptNo,'Patient/staff request');
  amRenderManage(); amRefreshSlots();
}
function amRenderAudit() {
  var rows=_AM_LOG.map(function(l){
    var clr=l.action==='Booked'?'green':l.action==='Cancelled'?'red':l.action.includes('Block')?'orange':l.action==='Rescheduled'?'yellow':'blue';
    return [l.time,badge(l.action,clr),l.patient,l.aptNo,l.detail,l.staff];
  });
  var grid=document.getElementById('am-audit-grid');
  if(grid) grid.innerHTML=table(['Time','Action','Patient','Apt No.','Detail','Staff'],rows,'No log entries');
}

// ── Page function ─────────────────────────────────────────────────────────────
function pageAppointments() {
  var today   = new Date().toISOString().split('T')[0];
  var todayLbl= new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var DEPTS   = ['General Medicine','Gynaecology','Cardiology','Orthopaedics','Paediatrics','ENT','Dermatology','Ophthalmology'];
  var docOpts = '<option value="">Select Doctor</option>' +
    _APT_DOCTORS.map(function(d){return '<option value="'+d.id+'" data-dept="'+d.dept+'" data-fee="'+d.fee+'" data-qual="'+d.qual+'">'+d.name+' — ₹'+d.fee+'</option>';}).join('');
  var tabBtn = function(id,label){ var active=id==='book'; return '<button id="am-tab-'+id+'" onclick="amTab(\''+id+'\')" style="padding:8px 20px;border-radius:7px;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid '+(active?'#2563eb':'#e2e8f0')+';background:'+(active?'#2563eb':'#f8fafc')+';color:'+(active?'#fff':'#374151')+'">'+label+'</button>'; };
  var legends = [['#eff6ff','#bfdbfe','#1d4ed8','Booked'],['#f0fdf4','#bbf7d0','#15803d','Confirmed'],['#fef3c7','#fcd34d','#92400e','In Progress'],['#dcfce7','#86efac','#166534','Completed'],['#fef2f2','#fca5a5','#dc2626','Cancelled'],['#f1f5f9','#e2e8f0','#475569','No Show'],['#fef2f2','#fca5a5','#dc2626','Blocked Slot']].map(function(l){ return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#374151"><span style="width:14px;height:14px;border-radius:3px;background:'+l[0]+';border:1px solid '+l[1]+';display:inline-block"></span>'+l[3]+'</span>'; }).join('');

  return pageHeader('Appointment Management','Registration &amp; Front Desk <span>›</span> Appointments','<span style="font-size:13px;color:#64748b">'+todayLbl+'</span>') +
  kpiCards([
    { label:'Today Booked',  value:_AM_APTS.filter(function(a){return a.status==='booked';}).length,     color:'text-blue-700' },
    { label:'Completed',     value:_AM_APTS.filter(function(a){return a.status==='completed';}).length,  color:'text-green-700' },
    { label:'Cancelled',     value:_AM_APTS.filter(function(a){return a.status==='cancelled';}).length,  color:'text-red-600' },
    { label:'Total Today',   value:_AM_APTS.length,                                                       color:'text-slate-700' },
  ]) +
  '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:14px;align-items:center"><span style="font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Legends:</span>'+legends+'</div>' +
  '<div style="display:flex;gap:8px;margin-bottom:20px">'+tabBtn('book','+ Book Appointment')+tabBtn('schedule','Doctor Schedule')+tabBtn('manage','Manage / Reschedule')+tabBtn('audit','Audit Log')+'</div>' +

  '<div id="am-pnl-book">' +
  '<div style="display:grid;grid-template-columns:300px 1fr 280px;gap:16px;align-items:start">' +
  '<div>'+sectionCard('Patient',
    '<div style="position:relative;margin-bottom:10px"><input id="am-book-search-inp" class="form-input" placeholder="Search UHID, mobile, name..." oninput="amBookSearch(this.value)" autocomplete="off"><div id="am-book-results" style="display:none;position:absolute;left:0;right:0;top:40px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:20;max-height:220px;overflow-y:auto"></div></div>' +
    '<button onclick="amBookNonReg()" class="btn-outline" style="width:100%;justify-content:center;font-size:12.5px;margin-bottom:10px">Book Without UHID (Non-registered)</button>' +
    '<div id="am-book-pt-card" style="display:none"></div>' +
    '<div id="am-book-nonreg" style="display:none;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px">' +
      '<div style="font-weight:700;font-size:13px;color:#92400e;margin-bottom:8px">Non-registered Patient</div>' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:8px">UHID will be issued on arrival at registration desk</div>' +
      formRow(formField('Name','<input id="am-nr-name" class="form-input" placeholder="Patient name" style="font-size:13px">',true)) +
      formRow(formField('Mobile','<input id="am-nr-mobile" class="form-input" placeholder="Mobile" style="font-size:13px" maxlength="10">')) +
      '<button onclick="amClearBookPt()" style="background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer">Clear</button>' +
    '</div>'
  )+'</div>' +
  '<div>'+sectionCard('Department, Doctor &amp; Slot',
    formRow(
      formField('Department','<select id="am-dept" class="form-select" onchange="amDocFilter()"><option value="">Select Department</option>'+DEPTS.map(function(d){return '<option>'+d+'</option>';}).join('')+'</select>',true),
      formField('Doctor','<select id="am-doctor" class="form-select" onchange="amDocPick()">'+docOpts+'</select>',true)
    ) +
    '<div id="am-doc-info" style="display:none;font-size:12.5px;color:#64748b;margin-bottom:10px"></div>' +
    formRow(formField('Date','<input id="am-date" type="date" class="form-input" value="'+today+'" min="'+today+'" onchange="amRefreshSlots()">',true)) +
    '<div style="display:flex;gap:8px;margin-bottom:12px"><button id="am-sess-m" onclick="amSetSess(\'Morning\')" style="flex:1;padding:8px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #2563eb;background:#2563eb;color:#fff">Morning</button><button id="am-sess-e" onclick="amSetSess(\'Evening\')" style="flex:1;padding:8px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;background:#f8fafc;color:#374151">Evening</button></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div id="am-slot-lbl" style="font-size:13px;color:#64748b"></div><span id="am-slot-cnt" style="font-size:12px;color:#16a34a;font-weight:600"></span></div>' +
    '<div id="am-slot-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"><div style="grid-column:1/-1;text-align:center;color:#cbd5e1;padding:24px;font-size:13px">Select doctor to view slots</div></div>'
  )+'</div>' +
  '<div>'+sectionCard('Booking Summary',
    '<div id="am-sum-empty" style="color:#94a3b8;font-size:13px;padding:8px 0">Select patient, doctor and slot to confirm.</div>' +
    '<div id="am-sum-filled" style="display:none">' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:13px;line-height:1.9;margin-bottom:14px">' +
        '<span style="color:#64748b">Patient</span><span id="am-sum-pt" style="font-weight:600;color:#1e293b"></span>' +
        '<span style="color:#64748b">Doctor</span><span id="am-sum-doc" style="font-weight:600;color:#1e293b"></span>' +
        '<span style="color:#64748b">Dept</span><span id="am-sum-dept" style="color:#374151"></span>' +
        '<span style="color:#64748b">Date</span><span id="am-sum-date" style="font-weight:600"></span>' +
        '<span style="color:#64748b">Slot</span><span id="am-sum-slot" style="font-weight:700;color:#2563eb;font-size:14px"></span>' +
        '<span style="color:#64748b">Fee</span><span id="am-sum-fee" style="font-weight:700;color:#16a34a"></span>' +
      '</div>' +
      '<button onclick="amConfirm()" class="btn-primary" style="width:100%;justify-content:center;padding:11px">Confirm &amp; Generate Slip</button>' +
    '</div>'
  )+'</div>' +
  '</div></div>' +

  '<div id="am-pnl-schedule" style="display:none">'+sectionCard('Doctor Schedule &amp; Slot Management',
    '<div style="display:flex;gap:12px;align-items:end;margin-bottom:16px;flex-wrap:wrap">' +
      '<div><label class="form-label">Doctor</label><select id="am-sched-doc" class="form-select" onchange="amRenderSchedule()" style="width:240px">'+_APT_DOCTORS.map(function(d){return '<option value="'+d.id+'">'+d.name+'</option>';}).join('')+'</select></div>' +
      '<div><label class="form-label">Date</label><input type="date" class="form-input" value="'+today+'" style="width:160px"></div>' +
      '<button onclick="amRenderSchedule()" class="btn-outline">Load Schedule</button>' +
    '</div>' +
    '<div style="font-size:12px;color:#64748b;margin-bottom:12px">Click <b>Block</b> to prevent new bookings · Click <b>Unblock</b> to re-open</div>' +
    '<div id="am-sched-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px"></div>' +
    '<div style="font-weight:600;font-size:14px;color:#1e293b;margin-bottom:10px">Today\'s Appointments for Selected Doctor</div>' +
    '<div id="am-sched-list"></div>'
  )+'</div>' +

  '<div id="am-pnl-manage" style="display:none">' +
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
  )+'</div>' +

  '<div id="am-pnl-audit" style="display:none">'+sectionCard('Appointment Audit Log','<div id="am-audit-grid"></div>')+'</div>' +

  '<div id="am-slip-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center" onclick="this.style.display=\'none\'">' +
  '  <div style="background:#fff;border-radius:16px;padding:28px;width:400px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()">' +
  '    <div style="text-align:center;margin-bottom:20px"><div style="width:52px;height:52px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px">&#10003;</div><div style="font-size:17px;font-weight:800;color:#1e293b">Appointment Slip</div></div>' +
  '    <div id="am-slip-content" style="background:#f8fafc;border-radius:10px;padding:16px;border:1px solid #e2e8f0;font-size:13.5px;line-height:2"></div>' +
  '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">' +
  '      <button onclick="window.print()" style="padding:10px;border-radius:8px;background:#2563eb;color:#fff;border:none;font-weight:600;font-size:13.5px;cursor:pointer">Print Slip</button>' +
  '      <button onclick="document.getElementById(\'am-slip-modal\').style.display=\'none\'" style="padding:10px;border-radius:8px;background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;font-weight:500;font-size:13.5px;cursor:pointer">Close</button>' +
  '    </div></div></div>' +

  '<div id="am-resched-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center" onclick="this.style.display=\'none\'">' +
  '  <div style="background:#fff;border-radius:16px;padding:28px;width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.3)" onclick="event.stopPropagation()">' +
  '    <div style="font-size:16px;font-weight:800;color:#1e293b;margin-bottom:4px" id="am-resched-title"></div>' +
  '    <div style="font-size:13px;color:#64748b;margin-bottom:18px">Current: <span id="am-resched-from" style="font-weight:600;color:#374151"></span></div>' +
  '    <input type="hidden" id="am-resched-aptno">' +
  '    '+formRow(formField('New Time Slot','<input id="am-resched-slot" class="form-input" placeholder="e.g. 11:30">',true)) +
  '    '+formRow(formField('Session','<select id="am-resched-sess" class="form-select"><option>Morning</option><option>Evening</option></select>')) +
  '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">' +
  '      <button onclick="amReschedConfirm()" class="btn-primary" style="justify-content:center">Confirm Reschedule</button>' +
  '      <button onclick="document.getElementById(\'am-resched-modal\').style.display=\'none\'" class="btn-outline" style="justify-content:center">Cancel</button>' +
  '    </div></div></div>';
}
