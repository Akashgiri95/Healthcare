// ─── INVENTORY — Goods Receipt Note (GRN) ─────────────────────────────────────
// Page: inv-grn | Depends on: INV_GRN, INV_VENDORS (pg-inv-home.js)

var _grnTab   = 'list';
var _grnItems = [];

function invGrnInit() {
  _grnItems = [];
  _grnTab   = 'list';
  invSwitchGrnTab('list');
}

function invSwitchGrnTab(t) {
  _grnTab = t;
  ['list','new'].forEach(function(id){
    var btn = document.getElementById('grn-tab-'+id);
    var pnl = document.getElementById('grn-pnl-'+id);
    var active = id===t;
    if(btn){ btn.style.background=active?'#2563eb':'#f8fafc'; btn.style.color=active?'#fff':'#374151'; btn.style.borderColor=active?'#2563eb':'#e2e8f0'; }
    if(pnl) pnl.style.display=active?'':'none';
  });
  if(t==='list') invRenderGrnList();
  if(t==='new')  { _grnItems=[]; grnRenderItems(); }
}

function invRenderGrnList() {
  var el = document.getElementById('grn-list-tbody'); if(!el) return;
  el.innerHTML = INV_GRN.map(function(g){
    var sc = g.status==='Posted'?'green':g.status==='Short Receipt'?'yellow':'orange';
    return '<tr>'+
      '<td style="font-weight:700;font-size:13px;color:#2563eb">'+g.id+'</td>'+
      '<td style="font-size:13px">'+g.date+'</td>'+
      '<td style="font-weight:600;font-size:13px">'+g.vendor+'</td>'+
      '<td style="font-size:12.5px;color:#64748b">'+g.po+'</td>'+
      '<td style="text-align:center;font-size:13px">'+g.items+'</td>'+
      '<td style="text-align:right;font-weight:700;font-size:13px">'+fmt(g.value)+'</td>'+
      '<td>'+badge(g.status,sc)+'</td>'+
      '<td style="font-size:12.5px;color:#475569">'+g.rcvd+'</td>'+
      '<td>'+
        (g.status==='Pending'?
          '<button onclick="grnApproveReceive(\''+g.id+'\')" style="padding:4px 10px;border-radius:5px;background:#16a34a;color:#fff;border:none;font-size:12px;cursor:pointer;font-weight:600">Receive & Post</button>'
        :'<span style="font-size:12px;color:#94a3b8">—</span>')+
      '</td>'+
    '</tr>';
  }).join('');
}

function grnApproveReceive(id) {
  var g = INV_GRN.find(function(x){return x.id===id;}); if(!g) return;
  g.status='Posted'; g.rcvd=currentUser.name;
  alert('GRN '+id+' posted. Stock updated for '+g.items+' items.\nTotal value: '+fmt(g.value));
  invRenderGrnList();
}

function grnAddItem() {
  var nm    = ((document.getElementById('grn-item-name')||{}).value||'').trim();
  var qty   = parseInt((document.getElementById('grn-item-qty')||{value:0}).value)||0;
  var batch = ((document.getElementById('grn-item-batch')||{}).value||'').trim();
  var exp   = ((document.getElementById('grn-item-exp')||{}).value||'');
  var rate  = parseFloat((document.getElementById('grn-item-rate')||{value:0}).value)||0;
  if(!nm||!qty){ alert('Item name and quantity are required.'); return; }
  _grnItems.push({name:nm, qty:qty, batch:batch||'—', expiry:exp||'—', rate:rate, total:qty*rate});
  ['grn-item-name','grn-item-qty','grn-item-batch','grn-item-exp','grn-item-rate'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  grnRenderItems();
}

function grnRemoveItem(i){ _grnItems.splice(i,1); grnRenderItems(); }

function grnRenderItems() {
  var el = document.getElementById('grn-item-list'); if(!el) return;
  if(!_grnItems.length){
    el.innerHTML='<div style="color:#94a3b8;font-size:13px;padding:8px 0">No items added yet — use the row above</div>';
    return;
  }
  var total = _grnItems.reduce(function(s,i){return s+i.total;},0);
  el.innerHTML=
    table(
      ['Item Name','Qty','Batch','Expiry','Rate','Value',''],
      _grnItems.map(function(it,i){return[
        it.name, it.qty+' units', it.batch, it.expiry, fmt(it.rate), fmt(it.total),
        '<button onclick="grnRemoveItem('+i+')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:18px;line-height:1">&times;</button>'
      ];})
    )+
    '<div style="text-align:right;margin-top:8px;font-size:14px;font-weight:700;color:#0f172a">Total GRN Value: '+fmt(total)+'</div>';
}

function grnPost() {
  var vendor  = ((document.getElementById('grn-vendor')||{}).value||'');
  var po      = ((document.getElementById('grn-po')||{}).value||'').trim();
  if(!vendor){ alert('Please select a vendor.'); return; }
  if(!_grnItems.length){ alert('Add at least one item to the GRN.'); return; }
  var total = _grnItems.reduce(function(s,i){return s+i.total;},0);
  var id    = 'GRN26'+String(INV_GRN.length+1).padStart(3,'0');
  INV_GRN.unshift({id:id, date:'2026-05-21', vendor:vendor, po:po||'Manual GRN',
    items:_grnItems.length, value:total, status:'Posted', rcvd:currentUser.name});
  alert('GRN '+id+' posted successfully!\n'+_grnItems.length+' items received.\nTotal value: '+fmt(total)+'\nStock updated.');
  _grnItems=[];
  invSwitchGrnTab('list');
}

function pageInventoryGRN() {
  var postedTotal = INV_GRN.filter(function(g){return g.status==='Posted';}).reduce(function(s,g){return s+g.value;},0);
  var vendorOpts  = INV_VENDORS.map(function(v){return '<option value="'+v.name+'">'+v.name+' ('+v.type+')</option>';}).join('');

  return pageHeader('Goods Receipt Note (GRN)','Inventory &amp; Store <span>&#8250;</span> GRN',
    '<button onclick="navTo(\'inv-home\')" class="btn-outline">All Scenarios</button>')+

  kpiCards([
    {label:'Total GRNs',       value:INV_GRN.length,                                          color:'blue',   sub:'all time'},
    {label:'Posted This Week', value:INV_GRN.filter(function(g){return g.status==='Posted';}).length, color:'green', sub:'stock updated'},
    {label:'Short Receipts',   value:INV_GRN.filter(function(g){return g.status==='Short Receipt';}).length,   color:'yellow',sub:'vendor follow-up'},
    {label:'Pending GRNs',     value:INV_GRN.filter(function(g){return g.status==='Pending';}).length,         color:'orange',sub:'awaiting receipt'},
  ])+

  '<div style="display:flex;gap:8px;margin-bottom:16px">'+
    '<button id="grn-tab-list" onclick="invSwitchGrnTab(\'list\')" style="padding:8px 18px;border-radius:7px;border:1px solid #2563eb;background:#2563eb;color:#fff;font-size:13px;font-weight:600;cursor:pointer">GRN Register</button>'+
    '<button id="grn-tab-new"  onclick="invSwitchGrnTab(\'new\')"  style="padding:8px 18px;border-radius:7px;border:1px solid #e2e8f0;background:#f8fafc;color:#374151;font-size:13px;font-weight:600;cursor:pointer">+ New GRN</button>'+
  '</div>'+

  // List panel
  '<div id="grn-pnl-list">'+
    sectionCard('GRN Register — All Receipts',
      '<div style="overflow-x:auto">'+
      '<table style="width:100%;border-collapse:collapse">'+
        '<thead><tr>'+
          ['GRN No','Date','Vendor','PO No','Items','Value','Status','Received By','Action'].map(function(h){
            return '<th style="padding:10px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;background:#f8fafc;white-space:nowrap">'+h+'</th>';
          }).join('')+
        '</tr></thead>'+
        '<tbody id="grn-list-tbody"><tr><td colspan="9" style="padding:18px;text-align:center;color:#94a3b8">Loading...</td></tr></tbody>'+
      '</table></div>'+
      '<div style="text-align:right;margin-top:10px;font-size:13.5px;font-weight:700;color:#1e293b">Total Posted Value: '+fmt(postedTotal)+'</div>'
    )+
  '</div>'+

  // New GRN panel
  '<div id="grn-pnl-new" style="display:none">'+
    sectionCard('New GRN — Goods Receipt Entry',
      formRow(
        formField('Vendor / Supplier',
          '<select id="grn-vendor" class="form-select" style="font-size:13px"><option value="">— Select Vendor —</option>'+vendorOpts+'</select>',true),
        formField('Purchase Order No',
          '<input id="grn-po" class="form-input" placeholder="e.g. PO26050 (optional)">'),
        formField('Challan / Invoice No',
          '<input id="grn-challan" class="form-input" placeholder="Vendor delivery challan no.">')
      )+
      formRow(
        formField('Receipt Date',
          '<input id="grn-date" class="form-input" type="date" value="2026-05-21">'),
        formField('Received By',
          '<input id="grn-rcvd" class="form-input" value="'+currentUser.name+'" readonly>'),
        formField('Goods Condition',
          '<select id="grn-cond" class="form-select" style="font-size:13px"><option>Good Condition</option><option>Short Receipt</option><option>Damage Noted — Return Pending</option></select>')
      )
    )+
    sectionCard('Add Line Items',
      '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 40px;gap:8px;margin-bottom:10px;align-items:end">'+
        '<div><div class="form-label">Item Name</div><input id="grn-item-name" class="form-input" placeholder="e.g. Paracetamol 500mg Tab" style="font-size:13px"></div>'+
        '<div><div class="form-label">Qty Received</div><input id="grn-item-qty" class="form-input" type="number" placeholder="Qty" min="1" style="font-size:13px"></div>'+
        '<div><div class="form-label">Batch No</div><input id="grn-item-batch" class="form-input" placeholder="e.g. B2505" style="font-size:13px"></div>'+
        '<div><div class="form-label">Expiry Date</div><input id="grn-item-exp" class="form-input" type="date" style="font-size:13px"></div>'+
        '<div><div class="form-label">Rate (&#8377;)</div><input id="grn-item-rate" class="form-input" type="number" step="0.01" placeholder="0.00" style="font-size:13px"></div>'+
        '<div style="padding-bottom:0"><button onclick="grnAddItem()" style="width:40px;height:38px;border-radius:7px;background:#2563eb;color:#fff;border:none;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button></div>'+
      '</div>'+
      '<div id="grn-item-list"><div style="color:#94a3b8;font-size:13px;padding:8px 0">No items added yet — use the row above</div></div>'+
      '<div style="margin-top:14px;display:flex;gap:8px">'+
        '<button onclick="grnPost()" class="btn-success">Post GRN &rarr; Update Stock</button>'+
        '<button onclick="invSwitchGrnTab(\'list\')" class="btn-outline">Cancel</button>'+
      '</div>'
    )+
  '</div>';
}
