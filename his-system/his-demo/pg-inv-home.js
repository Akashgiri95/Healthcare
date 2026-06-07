// ─── INVENTORY & STORE — Shared Data + Home ───────────────────────────────────
// Page: inv-home | Exports: INV_STOCK, INV_GRN, INV_INDENTS, INV_TRANSFERS, INV_VENDORS
// Must load BEFORE all other pg-inv-*.js files

// ── Seed: Stock Items ─────────────────────────────────────────────────────────
var INV_STOCK = [
  {id:'M001', name:'Paracetamol 500mg Tab',     cat:'Medicine',   unit:'Tab',  qty:8500, reorder:1000, expiry:'2027-03-31', batch:'B2412', vendor:'MedPharma Ltd',    rate:0.85, loc:'Rack A1', sch:''},
  {id:'M002', name:'Amoxicillin 500mg Cap',      cat:'Medicine',   unit:'Cap',  qty:320,  reorder:500,  expiry:'2026-09-30', batch:'B2411', vendor:'Apollo Pharma',    rate:8.50, loc:'Rack A2', sch:'H'},
  {id:'M003', name:'Metformin 500mg Tab',        cat:'Medicine',   unit:'Tab',  qty:6200, reorder:800,  expiry:'2027-06-30', batch:'B2503', vendor:'Sun Pharma',       rate:1.20, loc:'Rack A3', sch:''},
  {id:'M004', name:'Amlodipine 5mg Tab',         cat:'Medicine',   unit:'Tab',  qty:4100, reorder:600,  expiry:'2027-09-30', batch:'B2502', vendor:'Cipla Ltd',        rate:2.40, loc:'Rack A4', sch:''},
  {id:'M005', name:'Ondansetron 4mg Inj',        cat:'Medicine',   unit:'Vial', qty:180,  reorder:200,  expiry:'2026-08-31', batch:'B2409', vendor:'Dr Reddy\'s',      rate:32.00,loc:'Rack B1', sch:'H'},
  {id:'M006', name:'Cefotaxime 1g Inj',          cat:'Medicine',   unit:'Vial', qty:95,   reorder:150,  expiry:'2026-07-31', batch:'B2408', vendor:'MedPharma Ltd',    rate:85.00,loc:'Rack B2', sch:'H'},
  {id:'M007', name:'Pantoprazole 40mg IV',       cat:'Medicine',   unit:'Vial', qty:240,  reorder:200,  expiry:'2027-01-31', batch:'B2501', vendor:'Lupin Ltd',        rate:45.00,loc:'Rack B3', sch:'H'},
  {id:'M008', name:'Insulin Regular 100IU/ml',   cat:'Medicine',   unit:'Vial', qty:48,   reorder:60,   expiry:'2026-06-30', batch:'B2406', vendor:'Novo Nordisk',     rate:280.00,loc:'Cold Store',sch:'H'},
  {id:'M009', name:'Morphine 10mg Inj',          cat:'Medicine',   unit:'Amp',  qty:25,   reorder:20,   expiry:'2027-03-31', batch:'B2412', vendor:'Govt Supply',      rate:15.00,loc:'Narcotic Safe',sch:'X'},
  {id:'M010', name:'Ringer Lactate 500ml',       cat:'IV Fluid',   unit:'Bag',  qty:720,  reorder:500,  expiry:'2027-06-30', batch:'B2503', vendor:'Baxter India',     rate:38.00,loc:'Rack C1', sch:''},
  {id:'M011', name:'Normal Saline 500ml',        cat:'IV Fluid',   unit:'Bag',  qty:540,  reorder:400,  expiry:'2027-06-30', batch:'B2503', vendor:'Baxter India',     rate:35.00,loc:'Rack C2', sch:''},
  {id:'M012', name:'Dextrose 5% 500ml',          cat:'IV Fluid',   unit:'Bag',  qty:320,  reorder:300,  expiry:'2027-05-31', batch:'B2502', vendor:'Baxter India',     rate:42.00,loc:'Rack C3', sch:''},
  {id:'S001', name:'Surgical Gloves (Sterile) M',cat:'Surgical',   unit:'Pair', qty:1200, reorder:400,  expiry:'2028-12-31', batch:'SG2412',vendor:'Surgicare',        rate:22.00,loc:'Store S1', sch:''},
  {id:'S002', name:'Disposable Syringe 5ml',     cat:'Surgical',   unit:'Pc',   qty:3500, reorder:1000, expiry:'2029-06-30', batch:'SY2412',vendor:'Hindustan Syringes',rate:3.50,loc:'Store S2', sch:''},
  {id:'S003', name:'IV Cannula 18G',             cat:'Surgical',   unit:'Pc',   qty:480,  reorder:200,  expiry:'2028-09-30', batch:'CN2412',vendor:'BD Medical',       rate:18.00,loc:'Store S3', sch:''},
  {id:'S004', name:'Nasogastric Tube 16Fr',      cat:'Surgical',   unit:'Pc',   qty:85,   reorder:50,   expiry:'2028-06-30', batch:'NG2411',vendor:'Romsons',          rate:55.00,loc:'Store S4', sch:''},
  {id:'S005', name:'Urinary Catheter 16Fr',      cat:'Surgical',   unit:'Pc',   qty:42,   reorder:50,   expiry:'2028-06-30', batch:'UC2411',vendor:'Romsons',          rate:95.00,loc:'Store S4', sch:''},
  {id:'C001', name:'Cotton Bandage 6"',          cat:'Consumable', unit:'Roll', qty:650,  reorder:200,  expiry:'',           batch:'CB2412',vendor:'Mediline',         rate:12.00,loc:'Store C1', sch:''},
  {id:'C002', name:'Micropore Tape 1"',          cat:'Consumable', unit:'Roll', qty:380,  reorder:100,  expiry:'',           batch:'MT2412',vendor:'3M India',         rate:28.00,loc:'Store C1', sch:''},
  {id:'C003', name:'Spirit / IPA 70%',           cat:'Consumable', unit:'Litre',qty:28,   reorder:20,   expiry:'2027-12-31', batch:'SP2412',vendor:'Local Chem',       rate:85.00,loc:'Store C2', sch:''},
];

// ── Seed: GRN ─────────────────────────────────────────────────────────────────
var INV_GRN = [
  {id:'GRN26001', date:'2026-05-19', vendor:'MedPharma Ltd',  po:'PO26045', items:5, value:42500, status:'Posted',        rcvd:'Rajesh Kumar'},
  {id:'GRN26002', date:'2026-05-18', vendor:'Baxter India',   po:'PO26044', items:2, value:18200, status:'Posted',        rcvd:'Rajesh Kumar'},
  {id:'GRN26003', date:'2026-05-16', vendor:'BD Medical',     po:'PO26042', items:3, value:9800,  status:'Posted',        rcvd:'Rajesh Kumar'},
  {id:'GRN26004', date:'2026-05-14', vendor:'Apollo Pharma',  po:'PO26040', items:4, value:31500, status:'Short Receipt', rcvd:'Rajesh Kumar'},
  {id:'GRN26005', date:'2026-05-21', vendor:'Cipla Ltd',      po:'PO26048', items:3, value:8600,  status:'Pending',       rcvd:'—'},
];

// ── Seed: Indents ─────────────────────────────────────────────────────────────
var INV_INDENTS = [
  {id:'IND26101', date:'2026-05-21', dept:'Pharmacy - OPD',      items:['Paracetamol 500mg — 2000 Tab','Amoxicillin 500mg — 500 Cap'],       priority:'Routine', status:'Pending',  raised:'Suresh Patel', remark:''},
  {id:'IND26102', date:'2026-05-21', dept:'ICU / Ward 3',         items:['Ondansetron 4mg Inj — 50 Vial','Ringer Lactate 500ml — 100 Bag'],  priority:'Urgent',  status:'Pending',  raised:'Kavya Nair',   remark:''},
  {id:'IND26103', date:'2026-05-20', dept:'OT (Operation Theatre)',items:['Surgical Gloves M — 200 Pair','IV Cannula 18G — 100 Pc'],         priority:'STAT',    status:'Approved', raised:'OT Nurse',     remark:''},
  {id:'IND26104', date:'2026-05-20', dept:'Pharmacy - IPD',       items:['Insulin Regular — 12 Vial','Metformin 500mg — 1000 Tab'],         priority:'Routine', status:'Issued',   raised:'Suresh Patel', remark:''},
  {id:'IND26105', date:'2026-05-19', dept:'Emergency Dept',        items:['Cefotaxime 1g Inj — 50 Vial','Disposable Syringe 5ml — 500 Pc'], priority:'Urgent',  status:'Issued',   raised:'ER Nurse',     remark:''},
  {id:'IND26106', date:'2026-05-19', dept:'General Ward',          items:['Cotton Bandage 6" — 100 Roll'],                                  priority:'Routine', status:'Rejected', raised:'Ward Nurse',   remark:'Sufficient stock in satellite store'},
];

// ── Seed: Transfers ───────────────────────────────────────────────────────────
var INV_TRANSFERS = [
  {id:'TRF26001', date:'2026-05-21', from:'Main Store',   to:'Pharmacy OPD',  items:['Paracetamol 500mg — 2000 Tab','Metformin 500mg — 500 Tab'], status:'In Transit', by:'Rajesh Kumar'},
  {id:'TRF26002', date:'2026-05-21', from:'Main Store',   to:'ICU Store',      items:['Ondansetron 4mg Inj — 50 Vial','RL 500ml — 100 Bag'],       status:'Dispatched', by:'Rajesh Kumar'},
  {id:'TRF26003', date:'2026-05-20', from:'Pharmacy OPD', to:'Pharmacy IPD',   items:['Amoxicillin 500mg — 200 Cap'],                               status:'Received',   by:'Suresh Patel'},
  {id:'TRF26004', date:'2026-05-19', from:'Main Store',   to:'Emergency Store', items:['Cefotaxime 1g — 50 Vial','Syringes 5ml — 500 Pc'],          status:'Received',   by:'Rajesh Kumar'},
];

// ── Seed: Vendors ─────────────────────────────────────────────────────────────
var INV_VENDORS = [
  {id:'V001', name:'MedPharma Ltd',       contact:'Ramesh Shah — 9876543210',   type:'Medicine',  rating:4.5, contract:'RC2026-01', exp:'2026-12-31'},
  {id:'V002', name:'Apollo Pharma',       contact:'Seema Patel — 9876500001',   type:'Medicine',  rating:4.2, contract:'RC2026-02', exp:'2026-09-30'},
  {id:'V003', name:'Baxter India',        contact:'Anil Mehta — 9000012345',    type:'IV Fluid',  rating:4.8, contract:'RC2026-03', exp:'2026-12-31'},
  {id:'V004', name:'BD Medical',          contact:'Vinod Joshi — 9988776655',   type:'Surgical',  rating:4.3, contract:'RC2026-04', exp:'2027-03-31'},
  {id:'V005', name:'Surgicare',           contact:'Priya Nair — 8877665544',    type:'Surgical',  rating:4.1, contract:'RC2026-05', exp:'2026-12-31'},
];

// ── Scenarios ─────────────────────────────────────────────────────────────────
var INV_SCENARIOS = [
  {no:1,  icon:'📊', title:'Daily Stock Dashboard',         status:'done',    page:'inv-stock',
   desc:'Real-time stock levels across all categories. Identify low stock, zero stock, and near-reorder items instantly.',
   steps:['Store opens — view opening stock summary','System highlights items below reorder level','Download / print daily stock status report','Morning report sent to CMO & Purchase dept']},
  {no:2,  icon:'📦', title:'Goods Receipt Note (GRN)',       status:'done',    page:'inv-grn',
   desc:'Receive goods from vendor, verify against PO, inspect batches, update stock, and post GRN.',
   steps:['Vendor delivers goods against Purchase Order','Verify quantity & batch vs delivery challan','Inspect for damage, expiry date & packing','Post GRN → stock updated → accounting entry created']},
  {no:3,  icon:'📋', title:'Department Indent',              status:'done',    page:'inv-indent',
   desc:'Pharmacy or ward raises a stock indent. Store manager approves and issues items from stock.',
   steps:['Pharmacy / Ward submits indent with priority','Store verifies availability vs current stock','Store Manager approves or rejects with remarks','Items picked, dispatched — stock deducted automatically']},
  {no:4,  icon:'🔄', title:'Inter-department Transfer',      status:'done',    page:'inv-transfer',
   desc:'Move stock between stores — Main Store to Pharmacy / Ward satellite stores.',
   steps:['Source store raises stock transfer note','Items packed and dispatched with transfer slip','Destination store scans / confirms receipt','Stock adjusted in both source and destination']},
  {no:5,  icon:'⚠️', title:'Expiry Date Tracking',           status:'done',    page:'inv-expiry',
   desc:'Near-expiry items flagged at 90 / 60 / 30 days. Expired items quarantined and reported.',
   steps:['System scans all batches daily at midnight','Amber alert: expiry within 90 days','Red alert: expiry within 30 days — contact vendor','Expired items quarantined — CMO notified — write-off']},
  {no:6,  icon:'🔔', title:'Minimum Stock Alert & Reorder',  status:'partial', page:'inv-stock',
   desc:'Auto-alert when stock falls below reorder level. Purchase Requisition raised automatically.',
   steps:['Stock falls below reorder level','Alert sent to Store Manager on dashboard','Store raises Purchase Requisition (PR)','PR approved → PO raised by Purchase dept']},
  {no:7,  icon:'🔒', title:'Narcotic / Schedule X Register', status:'partial', page:'inv-stock',
   desc:'Controlled substance balance book — receipt vs consumption tracked, witness required.',
   steps:['Receive Schedule X drugs from Govt supply','Entry in Narcotic Register (dual sign)','Every issue requires doctor Rx + nurse witness','Monthly reconciliation signed by CMO']},
  {no:8,  icon:'↩️', title:'Return to Vendor (RTV)',          status:'planned', page:'inv-grn',
   desc:'Return expired, damaged, or short-supplied goods to vendor with debit note.',
   steps:['Identify damaged / expired / short goods','Raise Debit Note (DN) against vendor','Physical return with outward challan','Vendor Credit Note received → billing updated']},
  {no:9,  icon:'📑', title:'Batch & FEFO Tracking',          status:'planned', page:'inv-stock',
   desc:'Multiple batches per item — First Expired First Out dispatch rule enforced.',
   steps:['Each GRN creates a separate batch record','Issue uses earliest-expiry batch first (FEFO)','System warns if non-FEFO selection attempted','Batch traceability report generated for recalls']},
  {no:10, icon:'📈', title:'Monthly Consumption Report',     status:'planned', page:'inv-stock',
   desc:'Department-wise monthly consumption, ABC-VED analysis, and budget utilization.',
   steps:['Closing stock = Opening + GRN receipts − Issues','Department-wise consumption calculated','ABC analysis: A=80% value, B=15%, C=5%','Report submitted to management and purchase committee']},
];

// ── Scenario Modal ────────────────────────────────────────────────────────────
function invScenarioModal(no) {
  var s = INV_SCENARIOS.find(function(x){return x.no===no;}); if(!s) return;
  document.getElementById('inv-modal-body').innerHTML =
    '<div style="font-size:36px;margin-bottom:10px">'+s.icon+'</div>'+
    '<div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:6px">Scenario '+s.no+': '+s.title+'</div>'+
    '<div style="font-size:13.5px;color:#475569;line-height:1.5;margin-bottom:18px">'+s.desc+'</div>'+
    '<div style="font-size:11.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">End-to-End Workflow</div>'+
    s.steps.map(function(st,i){
      return '<div style="display:flex;align-items:flex-start;gap:12px;padding:9px 0;border-bottom:1px solid #f1f5f9">'+
        '<div style="min-width:24px;height:24px;border-radius:50%;background:#2563eb;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">'+( i+1)+'</div>'+
        '<div style="font-size:13.5px;color:#374151;line-height:1.45;padding-top:3px">'+st+'</div>'+
      '</div>';
    }).join('')+
    '<div style="margin-top:20px;display:flex;gap:8px">'+
      '<button onclick="navTo(\''+s.page+'\')" class="btn-primary">Open '+s.title+' &rsaquo;</button>'+
      '<button onclick="document.getElementById(\'inv-scenario-modal\').style.display=\'none\'" class="btn-outline">Close</button>'+
    '</div>';
  document.getElementById('inv-scenario-modal').style.display='flex';
}

// ── Page: Inventory Home ──────────────────────────────────────────────────────
function pageInventoryHome() {
  var now = new Date('2026-05-21');
  var lowStock   = INV_STOCK.filter(function(i){return i.qty < i.reorder;}).length;
  var nearExpiry = INV_STOCK.filter(function(i){
    if(!i.expiry) return false;
    var d=(new Date(i.expiry)-now)/(86400000); return d>0 && d<=90;
  }).length;
  var pendingIndents = INV_INDENTS.filter(function(i){return i.status==='Pending';}).length;
  var statIndents    = INV_INDENTS.filter(function(i){return i.priority==='STAT'&&i.status==='Pending';}).length;

  var statusMeta = {
    done:    {label:'Ready',   bg:'#dcfce7', color:'#15803d'},
    partial: {label:'Partial', bg:'#fef3c7', color:'#b45309'},
    planned: {label:'Planned', bg:'#f1f5f9', color:'#64748b'},
  };

  return pageHeader('Inventory & Store','Inventory & Store',
    '<button onclick="navTo(\'inv-stock\')" class="btn-primary">Stock Dashboard &rsaquo;</button>')+

  kpiCards([
    {label:'Total SKUs',          value:INV_STOCK.length,  color:'blue',   sub:'across all categories'},
    {label:'Low Stock Alerts',    value:lowStock,           color:'red',    sub:'below reorder level'},
    {label:'Near Expiry (90d)',   value:nearExpiry,         color:'yellow', sub:'action required'},
    {label:'Pending Indents',     value:pendingIndents,     color:'orange', sub:(statIndents?statIndents+' STAT':'awaiting approval')},
  ])+

  (statIndents?
    '<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:12px 16px;margin:16px 0;display:flex;align-items:center;gap:10px">'+
      '<span style="font-size:18px">🚨</span>'+
      '<span style="font-weight:700;color:#dc2626">'+statIndents+' STAT indent(s) require immediate attention</span>'+
      '<button onclick="navTo(\'inv-indent\')" style="margin-left:auto;padding:6px 14px;border-radius:6px;background:#dc2626;color:#fff;border:none;font-size:12.5px;font-weight:700;cursor:pointer">Action Now</button>'+
    '</div>'
  :'')+

  '<div style="margin-top:8px">'+
    '<div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:4px">Inventory & Store — Scenario Coverage</div>'+
    '<div style="font-size:13.5px;color:#64748b;margin-bottom:18px">10 workflows covering the full store management cycle. Click any scenario to see the end-to-end steps.</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px">'+
      INV_SCENARIOS.map(function(s){
        var m = statusMeta[s.status]||statusMeta.planned;
        return '<div onclick="invScenarioModal('+s.no+')" '+
          'style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;cursor:pointer;transition:border-color .15s,box-shadow .15s" '+
          'onmouseover="this.style.borderColor=\'#2563eb\';this.style.boxShadow=\'0 4px 14px rgba(37,99,235,.1)\'" '+
          'onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.boxShadow=\'\'">'+
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">'+
            '<span style="font-size:28px">'+s.icon+'</span>'+
            '<span style="font-size:11px;font-weight:700;color:'+m.color+';background:'+m.bg+';padding:2px 9px;border-radius:999px">'+m.label+'</span>'+
          '</div>'+
          '<div style="font-size:10.5px;font-weight:800;color:#2563eb;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px">Scenario '+s.no+'</div>'+
          '<div style="font-size:14.5px;font-weight:700;color:#0f172a;margin-bottom:6px">'+s.title+'</div>'+
          '<div style="font-size:12.5px;color:#64748b;line-height:1.45">'+s.desc+'</div>'+
        '</div>';
      }).join('')+
    '</div>'+
  '</div>'+

  '<div id="inv-scenario-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center" onclick="this.style.display=\'none\'">'+
    '<div style="background:#fff;border-radius:16px;padding:28px;width:520px;max-width:95vw;max-height:88vh;overflow-y:auto" onclick="event.stopPropagation()">'+
      '<div id="inv-modal-body"></div>'+
    '</div>'+
  '</div>';
}
