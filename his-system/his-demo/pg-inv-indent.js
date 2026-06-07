// ─── INVENTORY — Indent Management ────────────────────────────────────────────
// Page: inv-indent | Depends on: INV_INDENTS (pg-inv-home.js)

var _indentTab = 'pending';

function invIndentInit() {
  _indentTab = 'pending';
  indentSwitchTab('pending');
}

function indentSwitchTab(t) {
  _indentTab = t;
  ['pending','approved','issued','rejected','all'].forEach(function(id){
    var btn = document.getElementById('itab-'+id); if(!btn) return;
    var active = id===t;
    btn.style.background   = active?'#2563eb':'#f8fafc';
    btn.style.color        = active?'#fff':'#374151';
    btn.style.borderColor  = active?'#2563eb':'#e2e8f0';
  });
  indentRenderList();
}

function indentRenderList() {
  var el = document.getElementById('indent-tbody'); if(!el) return;
  var items = INV_INDENTS.filter(function(i){
    return _indentTab==='all' || i.status.toLowerCase()===_indentTab;
  });
  if(!items.length){
    el.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8;font-size:13.5px">No indents in this category</td></tr>';
    return;
  }
  el.innerHTML = items.map(function(ind){
    var pColor = ind.priority==='STAT'?'red':ind.priority==='Urgent'?'orange':'gray';
    var sColor = ind.status==='Issued'?'green':ind.status==='Approved'?'blue':ind.status==='Rejected'?'red':'yellow';
    var action = '';
    if(ind.status==='Pending'){
      action='<div style="display:flex;gap:4px">'+
        '<button onclick="indentApprove(\''+ind.id+'\')" style="padding:5px 10px;border-radius:5px;background:#16a34a;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer">Approve</button>'+
        '<button onclick="indentReject(\''+ind.id+'\')"  style="padding:5px 10px;border-radius:5px;background:#fff;color:#dc2626;border:1px solid #fca5a5;font-size:12px;font-weight:600;cursor:pointer">Reject</button>'+
      '</div>';
    } else if(ind.status==='Approved'){
      action='<button onclick="indentIssue(\''+ind.id+'\')" style="padding:5px 12px;border-radius:5px;background:#2563eb;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer">Issue Items</button>';
    } else {
      action='<span style="font-size:12px;color:#94a3b8">'+(ind.remark||'—')+'</span>';
    }
    return '<tr>'+
      '<td style="font-weight:700;color:#2563eb;font-size:13px">'+ind.id+'</td>'+
      '<td style="font-size:13px">'+ind.date+'</td>'+
      '<td style="font-weight:600;font-size:13px">'+ind.dept+'</td>'+
      '<td><div style="max-width:240px">'+ind.items.map(function(it){
        return '<div style="font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;padding:2px 0;white-space:nowrap">'+it+'</div>';
      }).join('')+'</div></td>'+
      '<td>'+badge(ind.priority,pColor)+'</td>'+
      '<td>'+badge(ind.status,sColor)+'</td>'+
      '<td style="font-size:12.5px;color:#64748b">'+ind.raised+'</td>'+
      '<td>'+action+'</td>'+
    '</tr>';
  }).join('');
}

function indentApprove(id) {
  var it = INV_INDENTS.find(function(x){return x.id===id;}); if(!it) return;
  if(!confirm('Approve indent '+id+' for '+it.dept+'?\n\nItems:\n'+it.items.join('\n'))) return;
  it.status='Approved';
  alert('Indent '+id+' approved.\nReady to issue items from store.');
  indentRenderList();
}

function indentReject(id) {
  var it = INV_INDENTS.find(function(x){return x.id===id;}); if(!it) return;
  var reason = prompt('Reason for rejection (required):');
  if(!reason) return;
  it.status='Rejected'; it.remark=reason;
  alert('Indent '+id+' rejected.\nReason recorded and sent to '+it.dept+'.');
  indentRenderList();
}

function indentIssue(id) {
  var it = INV_INDENTS.find(function(x){return x.id===id;}); if(!it) return;
  if(!confirm('Issue items for indent '+id+'?\n\nItems:\n'+it.items.join('\n')+'\n\nStock will be deducted from Main Store.')) return;
  it.status='Issued';
  alert('Items issued for indent '+id+'.\nStock deducted from Main Store.\nTransfer challan generated.');
  indentRenderList();
}

function pageInventoryIndent() {
  var pending  = INV_INDENTS.filter(function(i){return i.status==='Pending';}).length;
  var statCount= INV_INDENTS.filter(function(i){return i.priority==='STAT'&&i.status==='Pending';}).length;
  var tabs     = ['pending','approved','issued','rejected','all'];

  return pageHeader('Indent Management','Inventory &amp; Store <span>&#8250;</span> Indent',
    '<button onclick="navTo(\'inv-home\')" class="btn-outline">All Scenarios</button>')+

  (statCount?
    '<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">'+
      '<span style="font-size:20px">🚨</span>'+
      '<span style="font-weight:700;color:#dc2626;font-size:14px">'+statCount+' STAT indent(s) pending — immediate action required</span>'+
    '</div>'
  :'')+

  kpiCards([
    {label:'Total Indents',     value:INV_INDENTS.length,                                                         color:'blue',   sub:'all records'},
    {label:'Pending Approval',  value:pending,                                                                     color:'orange', sub:'action required'},
    {label:'Issued Today',      value:INV_INDENTS.filter(function(i){return i.status==='Issued'&&i.date==='2026-05-21';}).length, color:'green',  sub:'fulfilled'},
    {label:'Rejected',          value:INV_INDENTS.filter(function(i){return i.status==='Rejected';}).length,      color:'red',    sub:'with remarks'},
  ])+

  sectionCard('Indent Register',
    '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+
      tabs.map(function(t){
        var label = t.charAt(0).toUpperCase()+t.slice(1);
        var cnt   = t==='all'?INV_INDENTS.length:INV_INDENTS.filter(function(i){return i.status.toLowerCase()===t;}).length;
        var active= _indentTab===t;
        return '<button id="itab-'+t+'" onclick="indentSwitchTab(\''+t+'\')" '+
          'style="padding:6px 14px;border-radius:6px;border:1px solid '+(active?'#2563eb':'#e2e8f0')+
          ';background:'+(active?'#2563eb':'#f8fafc')+';color:'+(active?'#fff':'#374151')+
          ';font-size:12.5px;font-weight:600;cursor:pointer">'+label+' ('+cnt+')</button>';
      }).join('')+
    '</div>'+
    '<div style="overflow-x:auto">'+
    '<table style="width:100%;border-collapse:collapse">'+
      '<thead><tr>'+
        ['Indent No','Date','Department','Items Requested','Priority','Status','Raised By','Action'].map(function(h){
          return '<th style="padding:10px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;background:#f8fafc;white-space:nowrap">'+h+'</th>';
        }).join('')+
      '</tr></thead>'+
      '<tbody id="indent-tbody"><tr><td colspan="8" style="padding:18px;text-align:center;color:#94a3b8">Loading...</td></tr></tbody>'+
    '</table></div>'
  );
}
