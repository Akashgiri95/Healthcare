// ─── REGISTRATION — Bed Availability Board ────────────────────────────────────
// Page: bed-status | Functions: (none — static render)

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
      {no:'LR-01',status:'occupied',  patient:'Sunita Patel', uhid:'HIS2600002',since:'09:00 AM'},
      {no:'LR-02',status:'available', patient:'',uhid:'',since:''},
    ]},
  ];

  var total=0, occupied=0, available=0, cleaning=0;
  WARDS.forEach(function(w){ w.beds.forEach(function(b){
    total++;
    if(b.status==='occupied') occupied++;
    else if(b.status==='available') available++;
    else cleaning++;
  }); });

  var wardCards = WARDS.map(function(w) {
    var bedGrid = w.beds.map(function(b) {
      var bg     = b.status==='occupied'?'#fee2e2':b.status==='available'?'#f0fdf4':b.status==='cleaning'?'#fef3c7':'#f1f5f9';
      var border = b.status==='occupied'?'#fca5a5':b.status==='available'?'#86efac':b.status==='cleaning'?'#fcd34d':'#cbd5e1';
      var icon   = b.status==='occupied'?'&#128716;':b.status==='available'?'&#10003;':b.status==='cleaning'?'&#129529;':'&#128295;';
      var label  = b.status==='available'?'Available':b.status==='cleaning'?'Cleaning':'Maintenance';
      return '<div style="background:'+bg+';border:1px solid '+border+';border-radius:8px;padding:10px;text-align:center;min-width:100px">' +
        '<div style="font-size:18px;margin-bottom:4px">'+icon+'</div>' +
        '<div style="font-weight:700;font-size:13px;color:#1e293b">'+b.no+'</div>' +
        (b.patient
          ? '<div style="font-size:11px;color:#374151;margin-top:2px;font-weight:600">'+b.patient+'</div><div style="font-size:10.5px;color:#94a3b8">'+b.since+'</div>'
          : '<div style="font-size:11.5px;color:#16a34a;font-weight:600;margin-top:4px">'+label+'</div>'
        ) +
      '</div>';
    }).join('');
    var wardAvail = w.beds.filter(function(b){return b.status==='available';}).length;
    return sectionCard(w.name,
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">'+bedGrid+'</div>',
      '<span style="font-size:12.5px;color:#16a34a;font-weight:600">'+wardAvail+' available</span>'
    );
  }).join('');

  return pageHeader('Bed Availability Board', 'Registration &amp; Front Desk <span>›</span> Bed Availability', '<button class="btn-outline">Export</button>') +
  kpiCards([
    { label:'Total Beds',       value:total,     color:'text-slate-700' },
    { label:'Occupied',         value:occupied,  color:'text-red-600',    sub:Math.round(occupied/total*100)+'% occupancy' },
    { label:'Available',        value:available, color:'text-green-700' },
    { label:'Cleaning / Maint', value:cleaning,  color:'text-yellow-600' },
  ]) +
  wardCards;
}
