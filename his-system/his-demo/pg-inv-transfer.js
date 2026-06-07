// ─── INVENTORY — Inter-department Stock Transfer ───────────────────────────────
// Page: inv-transfer | Depends on: INV_TRANSFERS (pg-inv-home.js)

function invConfirmReceipt(id) {
  var t = INV_TRANSFERS.find(function(x){return x.id===id;}); if(!t) return;
  t.status='Received';
  alert('Transfer '+id+' marked as Received.\nStock updated at '+t.to+'.');
  invRenderTransferTable();
}

function invRenderTransferTable() {
  var el = document.getElementById('trf-tbody'); if(!el) return;
  el.innerHTML = INV_TRANSFERS.map(function(t){
    var sc = t.status==='Received'?'green':t.status==='Dispatched'?'blue':'yellow';
    return '<tr>'+
      '<td style="font-weight:700;color:#2563eb;font-size:13px">'+t.id+'</td>'+
      '<td style="font-size:13px">'+t.date+'</td>'+
      '<td style="font-size:13px;color:#64748b">'+t.from+'</td>'+
      '<td style="font-weight:600;font-size:13px">'+t.to+'</td>'+
      '<td><div>'+t.items.map(function(it){return '<div style="font-size:12px;color:#475569;padding:1px 0">'+it+'</div>';}).join('')+'</div></td>'+
      '<td>'+badge(t.status,sc)+'</td>'+
      '<td style="font-size:12.5px;color:#475569">'+t.by+'</td>'+
      '<td>'+
        (t.status==='In Transit'||t.status==='Dispatched'?
          '<button onclick="invConfirmReceipt(\''+t.id+'\')" style="padding:4px 10px;border-radius:5px;background:#16a34a;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer">Confirm Receipt</button>'
        :'<span style="font-size:12px;color:#94a3b8">—</span>')+
      '</td>'+
    '</tr>';
  }).join('');
}

function invRaiseTransfer() {
  var from  = ((document.getElementById('trf-from')||{}).value||'');
  var to    = ((document.getElementById('trf-to')||{}).value||'');
  var items = ((document.getElementById('trf-items')||{}).value||'').trim();
  if(!from||!to){ alert('Please select source and destination.'); return; }
  if(from===to){ alert('Source and destination cannot be the same.'); return; }
  if(!items){ alert('Please specify items to transfer.'); return; }
  var id = 'TRF26'+String(INV_TRANSFERS.length+1).padStart(3,'0');
  INV_TRANSFERS.unshift({
    id:id, date:'2026-05-21', from:from, to:to,
    items:items.split('\n').filter(function(l){return l.trim();}),
    status:'In Transit', by:currentUser.name
  });
  alert('Transfer '+id+' raised.\nItems are now In Transit to '+to+'.');
  document.getElementById('trf-items').value='';
  invRenderTransferTable();
}

function pageInventoryTransfer() {
  var stores  = ['Main Store','Pharmacy OPD','Pharmacy IPD','ICU Store','Emergency Store','OT Store','Ward 2 Satellite'];
  var inTransit= INV_TRANSFERS.filter(function(t){return t.status==='In Transit'||t.status==='Dispatched';}).length;
  var today    = INV_TRANSFERS.filter(function(t){return t.date==='2026-05-21';}).length;

  return pageHeader('Stock Transfer','Inventory &amp; Store <span>&#8250;</span> Transfer',
    '<button onclick="navTo(\'inv-home\')" class="btn-outline">All Scenarios</button>')+

  kpiCards([
    {label:'Today\'s Transfers',  value:today,       color:'blue',   sub:'dispatched / in-transit'},
    {label:'In Transit',          value:inTransit,   color:'yellow', sub:'pending confirmation'},
    {label:'Completed Today',     value:INV_TRANSFERS.filter(function(t){return t.status==='Received'&&t.date==='2026-05-21';}).length, color:'green', sub:'received & confirmed'},
    {label:'Total Transfers',     value:INV_TRANSFERS.length, color:'gray', sub:'all records'},
  ])+

  sectionCard('Transfer Register',
    (inTransit?'<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#92400e;font-weight:600">'+
      '&#9888; '+inTransit+' transfer(s) in transit — destination stores need to confirm receipt</div>':'')+
    '<div style="overflow-x:auto">'+
    '<table style="width:100%;border-collapse:collapse">'+
      '<thead><tr>'+
        ['Transfer No','Date','From','To','Items','Status','Dispatched By','Action'].map(function(h){
          return '<th style="padding:10px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;background:#f8fafc;white-space:nowrap">'+h+'</th>';
        }).join('')+
      '</tr></thead>'+
      '<tbody id="trf-tbody"><tr><td colspan="8" style="padding:18px;text-align:center;color:#94a3b8">Loading...</td></tr></tbody>'+
    '</table></div>'
  )+

  sectionCard('New Transfer Request',
    formRow(
      formField('From Store / Location',
        '<select id="trf-from" class="form-select" style="font-size:13px">'+
          stores.map(function(s){return '<option>'+s+'</option>';}).join('')+'</select>',true),
      formField('To Department / Store',
        '<select id="trf-to" class="form-select" style="font-size:13px">'+
          stores.map(function(s){return '<option>'+s+'</option>';}).join('')+'</select>',true),
      formField('Transfer Date',
        '<input class="form-input" type="date" value="2026-05-21">')
    )+
    formRow(
      formField('Items (one per line)',
        '<textarea id="trf-items" class="form-textarea" rows="4" placeholder="Paracetamol 500mg Tab — 1000 Tab&#10;Ringer Lactate 500ml — 50 Bag&#10;IV Cannula 18G — 100 Pc"></textarea>',true),
      formField('Remarks / Reason',
        '<textarea id="trf-remarks" class="form-textarea" rows="4" placeholder="Reason for transfer, urgency details..."></textarea>')
    )+
    '<div style="display:flex;gap:8px;margin-top:4px">'+
      '<button onclick="invRaiseTransfer()" class="btn-primary">Raise Transfer &rarr; Dispatch</button>'+
    '</div>'
  );
}
