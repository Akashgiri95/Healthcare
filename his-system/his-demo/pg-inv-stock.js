// ─── INVENTORY — Stock Dashboard ──────────────────────────────────────────────
// Page: inv-stock | Depends on: INV_STOCK (pg-inv-home.js)

var _stockSearch = '';
var _stockCat    = 'all';

function invStockInit() {
  _stockSearch = '';
  _stockCat    = 'all';
  var si = document.getElementById('stock-search'); if(si) si.value='';
  var sc = document.getElementById('stock-cat');    if(sc) sc.value='all';
  invRenderStockTable();
}

function invStockFilter() {
  _stockSearch = ((document.getElementById('stock-search')||{}).value||'').toLowerCase();
  _stockCat    = (document.getElementById('stock-cat')||{value:'all'}).value;
  invRenderStockTable();
}

function invRenderStockTable() {
  var el = document.getElementById('inv-stock-tbody'); if(!el) return;
  var now = new Date('2026-05-21');

  var items = INV_STOCK.filter(function(i){
    var ms = !_stockSearch || i.name.toLowerCase().includes(_stockSearch) || i.id.toLowerCase().includes(_stockSearch);
    var mc = _stockCat==='all' || i.cat===_stockCat;
    return ms && mc;
  });

  if(!items.length){
    el.innerHTML='<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;font-size:13.5px">No items match the filter</td></tr>';
    return;
  }

  el.innerHTML = items.map(function(it){
    var daysToExp = it.expiry ? Math.ceil((new Date(it.expiry)-now)/86400000) : null;
    var expCell = '';
    if(daysToExp===null)        expCell='<span style="font-size:12px;color:#94a3b8">—</span>';
    else if(daysToExp<=0)       expCell=badge('Expired','red');
    else if(daysToExp<=30)      expCell='<span style="color:#dc2626;font-weight:700;font-size:12.5px">'+it.expiry+'</span><br>'+badge(daysToExp+'d left','red');
    else if(daysToExp<=90)      expCell='<span style="color:#d97706;font-weight:600;font-size:12.5px">'+it.expiry+'</span><br>'+badge(daysToExp+'d left','yellow');
    else                        expCell='<span style="font-size:12.5px;color:#64748b">'+it.expiry+'</span>';

    var qtyCol = it.qty===0?'#dc2626':it.qty<it.reorder?'#d97706':'#16a34a';
    var statusB = it.qty===0?badge('Out of Stock','red'):it.qty<it.reorder?badge('Low Stock','orange'):badge('OK','green');
    var schB    = it.sch==='X'?badge('Sch X','red'):it.sch==='H'?badge('Sch H','yellow'):'';

    return '<tr>'+
      '<td><div style="font-weight:600;font-size:13px;color:#1e293b">'+it.name+'</div>'+
           '<div style="font-size:11px;color:#94a3b8;margin-top:1px">'+it.id+' &middot; '+it.loc+'</div>'+
           (schB?'<div style="margin-top:3px">'+schB+'</div>':'')+
      '</td>'+
      '<td>'+badge(it.cat,'blue')+'</td>'+
      '<td style="text-align:right"><span style="font-size:15px;font-weight:800;color:'+qtyCol+'">'+it.qty.toLocaleString()+'</span><span style="font-size:11px;color:#94a3b8;margin-left:3px">'+it.unit+'</span></td>'+
      '<td style="text-align:right;font-size:13px;color:#64748b">'+it.reorder.toLocaleString()+'</td>'+
      '<td>'+expCell+'</td>'+
      '<td style="font-size:12.5px;color:#475569">'+it.batch+'</td>'+
      '<td style="font-size:12.5px;color:#475569;max-width:140px">'+it.vendor+'</td>'+
      '<td style="text-align:right;font-weight:600;font-size:13px">'+fmt(it.rate)+'</td>'+
      '<td>'+statusB+'</td>'+
    '</tr>';
  }).join('');
}

function pageInventoryStock() {
  var now      = new Date('2026-05-21');
  var totalVal = INV_STOCK.reduce(function(s,i){return s+i.qty*i.rate;},0);
  var lowItems = INV_STOCK.filter(function(i){return i.qty>0 && i.qty<i.reorder;});
  var outItems = INV_STOCK.filter(function(i){return i.qty===0;});
  var expItems = INV_STOCK.filter(function(i){
    if(!i.expiry) return false;
    var d=(new Date(i.expiry)-now)/86400000; return d>0 && d<=90;
  });
  var cats = ['Medicine','IV Fluid','Surgical','Consumable'];

  return pageHeader('Stock Dashboard','Inventory & Store <span>&#8250;</span> Stock Dashboard',
    '<button onclick="navTo(\'inv-home\')" class="btn-outline">All Scenarios</button>'+
    '<button onclick="alert(\'Daily stock report generated\')" class="btn-primary" style="margin-left:8px">Print Report</button>')+

  kpiCards([
    {label:'Total Stock Value', value:fmt(totalVal),     color:'blue',   sub:INV_STOCK.length+' items tracked'},
    {label:'Low Stock',         value:lowItems.length,   color:'orange', sub:'below reorder level'},
    {label:'Out of Stock',      value:outItems.length,   color:'red',    sub:'needs immediate reorder'},
    {label:'Near Expiry (90d)', value:expItems.length,   color:'yellow', sub:'action required'},
  ])+

  (lowItems.length||outItems.length?
    '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:12px 16px;margin:16px 0">'+
      '<div style="font-weight:700;color:#92400e;font-size:13px;margin-bottom:6px">&#9888; Low / Out of Stock — Reorder Required</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:6px">'+
        lowItems.concat(outItems).map(function(i){
          return '<span style="background:'+(i.qty===0?'#fee2e2':'#fff7ed')+';color:'+(i.qty===0?'#dc2626':'#c2410c')+';border:1px solid '+(i.qty===0?'#fca5a5':'#fed7aa')+';font-size:12px;font-weight:600;padding:3px 10px;border-radius:6px">'+i.name+' ('+i.qty+' '+i.unit+')</span>';
        }).join('')+
      '</div>'+
    '</div>'
  :'')+

  sectionCard('Live Stock Register',
    '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">'+
      '<input id="stock-search" class="form-input" placeholder="Search item name or ID..." oninput="invStockFilter()" style="max-width:280px;font-size:13px">'+
      '<select id="stock-cat" class="form-select" onchange="invStockFilter()" style="max-width:180px;font-size:13px">'+
        '<option value="all">All Categories</option>'+
        cats.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('')+
      '</select>'+
      '<span style="font-size:12.5px;color:#94a3b8;margin-left:4px" id="stock-count">'+INV_STOCK.length+' items</span>'+
    '</div>'+
    '<div style="overflow-x:auto">'+
    '<table style="width:100%;border-collapse:collapse">'+
      '<thead><tr>'+
        ['Item','Category','Qty in Hand','Reorder Lvl','Expiry / Days','Batch','Vendor','Rate (₹)','Status'].map(function(h){
          return '<th style="padding:10px 12px;text-align:left;font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;background:#f8fafc;white-space:nowrap">'+h+'</th>';
        }).join('')+
      '</tr></thead>'+
      '<tbody id="inv-stock-tbody"><tr><td colspan="9" style="padding:20px;text-align:center;color:#94a3b8">Loading...</td></tr></tbody>'+
    '</table></div>'
  );
}
