// ─── INVENTORY — Expiry Date & Batch Tracking ─────────────────────────────────
// Page: inv-expiry | Depends on: INV_STOCK (pg-inv-home.js)

function _invDaysLeft(expiry) {
  if(!expiry) return null;
  return Math.ceil((new Date(expiry)-new Date('2026-05-21'))/86400000);
}

function invQuarantine(id) {
  var it = INV_STOCK.find(function(x){return x.id===id;}); if(!it) return;
  if(!confirm('Quarantine all '+it.qty+' units of "'+it.name+'"?\n\nThis will:\n- Move item to Quarantine section\n- Notify CMO and Purchase dept\n- Initiate write-off process')) return;
  it.qty=0; it.loc='Quarantine';
  alert('Item quarantined.\nCMO and Quality team notified.\nWrite-off form generated for approval.');
}

function invVendorReturn(id) {
  var it = INV_STOCK.find(function(x){return x.id===id;}); if(!it) return;
  alert('Vendor return request raised for:\n'+it.name+' ('+it.qty+' '+it.unit+')\nBatch: '+it.batch+'\nExpiry: '+it.expiry+'\n\nDebit Note will be raised against '+it.vendor+'.');
}

function _invExpirySection(items, title, rowFn) {
  if(!items.length) return '';
  var rows = items.map(rowFn).join('');
  return sectionCard(title,
    '<div style="overflow-x:auto">'+
    '<table style="width:100%;border-collapse:collapse">'+
      '<thead><tr>'+
        ['Item','Category','Qty in Hand','Batch No','Expiry Date','Days Left','Location','Action'].map(function(h){
          return '<th style="padding:10px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;background:#f8fafc;white-space:nowrap">'+h+'</th>';
        }).join('')+
      '</tr></thead>'+
      '<tbody>'+rows+'</tbody>'+
    '</table></div>'
  );
}

function pageInventoryExpiry() {
  var expired = INV_STOCK.filter(function(i){
    var d=_invDaysLeft(i.expiry); return d!==null && d<=0;
  });
  var days30 = INV_STOCK.filter(function(i){
    var d=_invDaysLeft(i.expiry); return d!==null && d>0 && d<=30;
  });
  var days90 = INV_STOCK.filter(function(i){
    var d=_invDaysLeft(i.expiry); return d!==null && d>30 && d<=90;
  });
  var okCount = INV_STOCK.filter(function(i){
    var d=_invDaysLeft(i.expiry); return d===null || d>90;
  }).length;

  function expiredRow(it) {
    var d = _invDaysLeft(it.expiry);
    return '<tr style="background:#fff5f5">'+
      '<td><div style="font-weight:600;font-size:13px;color:#dc2626">'+it.name+'</div>'+
           '<div style="font-size:11px;color:#94a3b8">'+it.id+'</div></td>'+
      '<td>'+badge(it.cat,'blue')+'</td>'+
      '<td style="font-weight:700;font-size:13.5px;color:#dc2626">'+it.qty.toLocaleString()+' '+it.unit+'</td>'+
      '<td style="font-size:13px;font-family:monospace;color:#64748b">'+it.batch+'</td>'+
      '<td style="font-weight:700;color:#dc2626;font-size:13px">'+it.expiry+'</td>'+
      '<td>'+badge('EXPIRED','red')+'</td>'+
      '<td style="font-size:12.5px;color:#64748b">'+it.loc+'</td>'+
      '<td><button onclick="invQuarantine(\''+it.id+'\')" style="padding:5px 10px;border-radius:5px;background:#dc2626;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer">Quarantine</button></td>'+
    '</tr>';
  }

  function nearRow(it, isRed) {
    var d = _invDaysLeft(it.expiry);
    var col = isRed?'#dc2626':'#d97706';
    var sc  = isRed?'red':'yellow';
    return '<tr>'+
      '<td><div style="font-weight:600;font-size:13px">'+it.name+'</div>'+
           '<div style="font-size:11px;color:#94a3b8">'+it.id+'</div></td>'+
      '<td>'+badge(it.cat,'blue')+'</td>'+
      '<td style="font-weight:700;font-size:13px;color:'+col+'">'+it.qty.toLocaleString()+' '+it.unit+'</td>'+
      '<td style="font-size:13px;font-family:monospace;color:#64748b">'+it.batch+'</td>'+
      '<td style="font-size:13px;color:'+col+';font-weight:600">'+it.expiry+'</td>'+
      '<td>'+badge(d+' days',sc)+'</td>'+
      '<td style="font-size:12.5px;color:#64748b">'+it.loc+'</td>'+
      '<td>'+
        '<button onclick="invVendorReturn(\''+it.id+'\')" style="padding:5px 10px;border-radius:5px;background:#fff;color:'+col+';border:1px solid '+(isRed?'#fca5a5':'#fde68a')+';font-size:12px;font-weight:600;cursor:pointer">Return to Vendor</button>'+
      '</td>'+
    '</tr>';
  }

  function okRow(it) {
    var d = _invDaysLeft(it.expiry);
    return '<tr>'+
      '<td><div style="font-weight:600;font-size:13px">'+it.name+'</div>'+
           '<div style="font-size:11px;color:#94a3b8">'+it.id+'</div></td>'+
      '<td>'+badge(it.cat,'blue')+'</td>'+
      '<td style="font-size:13px;font-weight:600;color:#16a34a">'+it.qty.toLocaleString()+' '+it.unit+'</td>'+
      '<td style="font-size:13px;font-family:monospace;color:#64748b">'+it.batch+'</td>'+
      '<td style="font-size:13px;color:#475569">'+(it.expiry||'—')+'</td>'+
      '<td>'+(d!==null?badge(d+'d','green'):'<span style="color:#94a3b8;font-size:12px">No expiry</span>')+'</td>'+
      '<td style="font-size:12.5px;color:#64748b">'+it.loc+'</td>'+
      '<td><span style="font-size:12px;color:#16a34a;font-weight:600">&#10003; OK</span></td>'+
    '</tr>';
  }

  var okItems = INV_STOCK.filter(function(i){
    var d=_invDaysLeft(i.expiry); return d===null || d>90;
  });

  return pageHeader('Expiry Date & Batch Tracking','Inventory &amp; Store <span>&#8250;</span> Expiry',
    '<button onclick="navTo(\'inv-home\')" class="btn-outline">All Scenarios</button>'+
    '<button onclick="alert(\'Expiry report exported\')" class="btn-primary" style="margin-left:8px">Export Report</button>')+

  kpiCards([
    {label:'Expired Items',        value:expired.length, color:'red',    sub:'quarantine immediately'},
    {label:'Expiring ≤ 30 days',  value:days30.length,  color:'red',    sub:'return to vendor'},
    {label:'Expiring ≤ 90 days',  value:days90.length,  color:'yellow', sub:'plan consumption'},
    {label:'OK — No Action',       value:okCount,         color:'green',  sub:'within safe range'},
  ])+

  (expired.length?
    '<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:12px 16px;margin:16px 0;display:flex;align-items:center;gap:10px">'+
      '<span style="font-size:20px">🚨</span>'+
      '<span style="font-weight:700;color:#dc2626;font-size:14px">'+expired.length+' item(s) have expired — immediate quarantine required</span>'+
    '</div>'
  :'<div style="background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:12px 16px;margin:16px 0;font-weight:600;color:#15803d">&#10003; No expired items in stock</div>')+

  _invExpirySection(expired, '🚨 Expired Items — Immediate Action Required', expiredRow)+
  _invExpirySection(days30,  '⚠️ Expiring within 30 Days — Return to Vendor', function(it){return nearRow(it,true);})+
  _invExpirySection(days90,  '📋 Expiring within 31–90 Days — Plan Utilization', function(it){return nearRow(it,false);})+

  sectionCard('&#10003; Items within Safe Range (>90 days)',
    '<div style="overflow-x:auto">'+
    '<table style="width:100%;border-collapse:collapse">'+
      '<thead><tr>'+
        ['Item','Category','Qty in Hand','Batch No','Expiry Date','Days Left','Location','Status'].map(function(h){
          return '<th style="padding:10px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;background:#f8fafc;white-space:nowrap">'+h+'</th>';
        }).join('')+
      '</tr></thead>'+
      '<tbody>'+okItems.map(okRow).join('')+'</tbody>'+
    '</table></div>'
  );
}
