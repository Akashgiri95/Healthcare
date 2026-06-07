// ─── HIS DEMO — BILLING & MIS PAGES ─────────────────────────────────────────

function pageDashboard() {
  return pageHeader('Billing Dashboard',
    `Billing <span>›</span> Dashboard`,
    `<button class="btn-outline">⬇ Export</button><button class="btn-primary">+ New Bill</button>`
  ) + kpiCards([
    {label:'Today Collections', value:fmt(284650), color:'text-blue-700'},
    {label:'OPD Revenue', value:fmt(42800), color:'text-green-700'},
    {label:'IPD Revenue', value:fmt(198400), color:'text-green-700'},
    {label:'Pending Advances', value:fmt(63200), color:'text-yellow-700'},
    {label:'TPA Receivable', value:fmt(512000), color:'text-purple-700'},
    {label:'Cancelled Bills', value:'14', color:'text-red-600', sub:'This month'},
  ]) +
  `<div class="grid grid-cols-3 gap-5">
    <div class="col-span-2">` +
  sectionCard('Recent Billing Transactions', table(
    ['Receipt No.','Patient','UHID','Type','Amount','Mode','Status'],
    [
      ['RCP-2025-4892','Ramesh Sharma','UHID-10045','OPD',fmt(1800),'UPI',badge('Settled','green')],
      ['RCP-2025-4891','Priya Patel','UHID-10038','IPD',fmt(52000),'Insurance',badge('Pending','yellow')],
      ['RCP-2025-4890','Arvind Kumar','UHID-10031','OPD',fmt(3200),'Cash',badge('Settled','green')],
      ['RCP-2025-4889','Sunita Gupta','UHID-10027','IPD',fmt(18500),'Card',badge('Settled','green')],
      ['RCP-2025-4888','Mohammed Ismail','UHID-10022','Day Care',fmt(9800),'CGHS',badge('Submitted','blue')],
    ]
  )) + `</div>
    <div>` +
  sectionCard('Payer Mix Today', `
    <div class="space-y-3">
      ${[['Cash','38%','#2563eb',38],['Card','22%','#16a34a',22],['UPI','18%','#d97706',18],['Insurance','14%','#7c3aed',14],['Govt Scheme','8%','#0891b2',8]].map(([l,p,c,w])=>`
        <div>
          <div class="flex justify-between text-xs mb-1"><span class="text-slate-600">${l}</span><span class="font-semibold">${p}</span></div>
          <div class="h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full" style="width:${w}%;background:${c}"></div></div>
        </div>`).join('')}
    </div>`) + `</div></div>`;
}

function pageSetupTariff() {
  var tabHdr = function(g, tabs) {
    return tabs.map(function(t,i){
      return '<div onclick="showTab(\''+g+'\',\''+t.id+'\')" data-tg="'+g+'" data-tid="'+t.id+'" style="padding:10px 20px;cursor:pointer;font-size:13.5px;white-space:nowrap;margin-bottom:-2px;'+(i===0?'color:#2563eb;border-bottom:2px solid #2563eb;font-weight:600':'color:#64748b;border-bottom:2px solid transparent;font-weight:500')+'">'+t.label+'</div>';
    }).join('');
  };
  var tabPnl = function(g, tabs) {
    return tabs.map(function(t,i){
      return '<div data-tp="'+g+'" data-pid="'+t.id+'" style="padding:20px;display:'+(i===0?'block':'none')+'">'+t.content+'</div>';
    }).join('');
  };

  // ── TAB 1: CHARGE MASTER ────────────────────────────────────────────────
  var t1 = `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 16px;margin-bottom:16px;font-size:12.5px;color:#166534;display:flex;justify-content:space-between;align-items:center">
      <span>📋 <strong>NABH Billing Standard:</strong> Charge Master must be reviewed and approved by management annually.</span>
      <span style="background:#16a34a;color:#fff;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600">Last Review: 01-Apr-2025 &nbsp;|&nbsp; Next Due: 31-Mar-2026 &nbsp;✓ Compliant</span>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px">
      <div class="section-title" style="margin-bottom:12px">Add / Edit Charge Head</div>
      ${formRow(
        formField('Charge Head Name','<input class="form-input" value="Consultation – Specialist OPD">',true),
        formField('Charge Code <small style="color:#94a3b8;font-weight:400">(auto-validated for uniqueness)</small>','<input class="form-input" value="CHG-CONS-SP-001" style="border-color:#16a34a">',true),
        formField('Category',sel(['Consultation','Procedures','Investigations','Room Rent','OT Charges','Nursing','Pharmacy','Ambulance']),true),
        formField('Department',sel(['Cardiology','Orthopedics','General Medicine','Neurology','Oncology','Lab','Radiology','Surgery','ICU','Emergency']),true)
      )}
      ${formRow(
        formField('Billing Frequency',sel(['Per Visit','Per Day','Per Unit / Quantity','One-time','Per Hour','Per Course']),true),
        formField('Effective From (Date)','<input class="form-input" type="date" value="2025-04-01">'),
        formField('Status',sel(['Active','Inactive'])),
        formField('Remarks','<input class="form-input" placeholder="Optional note">')
      )}
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn-primary">Save Charge Head</button>
        <button class="btn-outline">Reset Form</button>
        <button class="btn-outline" style="margin-left:auto">⬇ Bulk Import from Excel</button>
      </div>
    </div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Showing 8 of 48 configured charge heads &nbsp;|&nbsp; Filter: <select style="border:1px solid #d1d5db;border-radius:4px;padding:2px 8px;font-size:12px"><option>All Categories</option><option>Consultation</option><option>Room Rent</option><option>Lab</option></select></div>
    ${table(
      ['Code','Charge Head','Category','Department','Frequency','Effective From','Status','Action'],
      [
        ['CHG-CONS-GEN-001','Consultation – General OPD','Consultation','General Medicine','Per Visit','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-CONS-SP-001','Consultation – Specialist OPD','Consultation','Cardiology','Per Visit','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-BED-GEN-001','Bed Charges – General Ward','Room Rent','IPD','Per Day','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-BED-SEM-001','Bed Charges – Semi-Private','Room Rent','IPD','Per Day','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-BED-PVT-001','Bed Charges – Private Room','Room Rent','IPD','Per Day','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-BED-ICU-001','Bed Charges – ICU','Room Rent','ICU','Per Day','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-OT-MIN-001','OT Charges – Minor','OT Charges','Surgery','One-time','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-OT-MAJ-001','OT Charges – Major','OT Charges','Surgery','One-time','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-NURS-001','Nursing Charges (Lumpsum)','Nursing','IPD','One-time','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-LAB-CBC-001','CBC (Complete Blood Count)','Investigations','Lab','Per Procedure','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-RAD-XRAY-001','X-Ray – Chest PA','Investigations','Radiology','Per Procedure','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-AMB-001','Ambulance – Local (≤10 km)','Ambulance','Transport','Per Trip','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-PHARM-001','Pharmacy Dispensing (Inpatient)','Pharmacy','Pharmacy','Per Unit','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-PROC-DRESS-001','Wound Dressing (Minor)','Procedures','Surgery / OPD','Per Visit','01-Apr-2025',badge('Active','green'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
        ['CHG-CONS-EM-001','Emergency Consultation','Consultation','Emergency','Per Visit','01-Apr-2024',badge('Inactive','gray'),'<button class="btn-outline" style="padding:3px 10px;font-size:11.5px">Edit</button>'],
      ]
    )}`;

  // ── TAB 2: TARIFF SLABS ─────────────────────────────────────────────────
  var t2 = `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e40af">
      <strong>How Tariff Slabs work:</strong> &nbsp;HIS auto-applies the correct slab based on the patient type selected at registration. The Cashier cannot manually override the slab. Different rates can be set for each patient category per charge head.
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px;align-items:flex-end">
      <div style="flex:1">${formField('Select Charge Head to Configure Tariff',sel(['Consultation – General OPD','Consultation – Specialist OPD','Bed Charges – General Ward','Bed Charges – Semi-Private','Bed Charges – Private Room','OT Charges – Minor','CBC (Complete Blood Count)','X-Ray – Chest PA']),true)}</div>
      <button class="btn-primary" style="margin-bottom:0;height:38px">Load Tariff</button>
    </div>
    <div class="section-title" style="margin-bottom:10px">Tariff Slab Configuration — Consultation – Specialist OPD (CHG-CONS-SP-001)</div>
    ${table(
      ['Patient Type / Payer','Standard Rate (₹)','Effective From','Revised Rate (₹)','New Effective From','Last Revised By'],
      [
        ['General (Self-Pay)',fmt(1200),'01-Apr-2025','<input class="form-input" style="width:100px" value="1200">','<input class="form-input" type="date" style="width:130px">','Ravi Kumar'],
        ['TPA / Insurance (Cashless)',fmt(1000),'01-Apr-2025','<input class="form-input" style="width:100px" value="1000">','<input class="form-input" type="date" style="width:130px">','Ravi Kumar'],
        ['Corporate Grade A (Adani, Reliance…)',fmt(900),'01-Apr-2025','<input class="form-input" style="width:100px" value="900">','<input class="form-input" type="date" style="width:130px">','Ravi Kumar'],
        ['Corporate Grade B (SMEs)',fmt(1000),'01-Apr-2025','<input class="form-input" style="width:100px" value="1000">','<input class="form-input" type="date" style="width:130px">','Ravi Kumar'],
        ['CGHS (Central Govt Health Scheme)',fmt(750),'01-Apr-2025','<input class="form-input" style="width:100px" value="750">','<input class="form-input" type="date" style="width:130px">','Admin IT'],
        ['ECHS (Ex-Servicemen)',fmt(750),'01-Apr-2025','<input class="form-input" style="width:100px" value="750">','<input class="form-input" type="date" style="width:130px">','Admin IT'],
        ['PMJAY / Ayushman Bharat',fmt(600),'01-Apr-2025','<input class="form-input" style="width:100px" value="600">','<input class="form-input" type="date" style="width:130px">','Admin IT'],
        ['Free / BPL / Subsidized','₹ 0','01-Apr-2025','<input class="form-input" style="width:100px" value="0">','<input class="form-input" type="date" style="width:130px">','Ravi Kumar'],
      ]
    )}
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn-primary">Save Tariff Slabs</button>
      <button class="btn-outline">View Rate History</button>
      <button class="btn-outline" style="margin-left:auto">⬇ Export Rate Card</button>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-top:16px">
      <div class="section-title" style="margin-bottom:10px;font-size:13px">Tariff Revision History – CHG-CONS-SP-001</div>
      ${table(['Effective Date','Patient Type','Old Rate (₹)','New Rate (₹)','Revised By','Reason'],[
        ['01-Apr-2025','General',fmt(1000),fmt(1200),'Ravi Kumar','Annual tariff revision – Board approved'],
        ['01-Apr-2024','CGHS',fmt(700),fmt(750),'Admin IT','CGHS rate list updated by Govt'],
        ['01-Jan-2024','TPA / Insurance',fmt(900),fmt(1000),'Ravi Kumar','TPA contract renegotiated'],
      ])}
    </div>`;

  // ── TAB 3: GST CONFIGURATION ────────────────────────────────────────────
  var t3 = `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#166534">
      <strong>GST on Healthcare (Key Rule):</strong> &nbsp;Clinical services by authorised medical practitioners are GST-exempt under Notification 12/2017. Diagnostic lab, radiology, pharmacy, and ambulance services above threshold attract 5–12% GST. E-invoicing is mandatory for hospitals with turnover &gt; ₹5 Crore.
    </div>
    ${formRow(
      formField('Hospital GSTIN','<input class="form-input" value="24AAACH1234F1Z5">'),
      formField('State','<input class="form-input" value="Gujarat (24)">'),
      formField('E-invoicing Applicable',sel(['Yes – Turnover > ₹5 Cr','No'])),
      formField('E-invoicing Threshold','<input class="form-input" value="₹ 5 Crore">')
    )}
    <div class="section-title" style="margin-bottom:10px;margin-top:4px">GST Rate Configuration by Service Category</div>
    ${table(
      ['Service Category','SAC / HSN Code','GST Rate','CGST','SGST','GST Status','E-invoice Required'],
      [
        ['Consultation (OPD / IPD)','999311','0%','0%','0%',badge('Exempt','green'),'No'],
        ['IP Bed & Room Rent','999311','0%','0%','0%',badge('Exempt','green'),'No'],
        ['Nursing Charges','999311','0%','0%','0%',badge('Exempt','green'),'No'],
        ['Ambulance Services','996412','0%','0%','0%',badge('Exempt','green'),'No'],
        ['Diagnostic Lab Tests','998213','5%','2.5%','2.5%',badge('Taxable','blue'),'Yes (if B2B)'],
        ['Radiology & Imaging','998214','5%','2.5%','2.5%',badge('Taxable','blue'),'Yes (if B2B)'],
        ['OT / Surgical Procedures','998219','5%','2.5%','2.5%',badge('Taxable','blue'),'Yes (if B2B)'],
        ['Pharmacy – Medicines','30049099','5% / 12%','Varies','Varies',badge('Taxable','blue'),'Yes (if B2B)'],
        ['Pharmacy – Consumables','30059090','12%','6%','6%',badge('Taxable','blue'),'Yes (if B2B)'],
        ['Corporate / TPA Invoices (B2B)','–','As above','As above','As above',badge('IRN Required','purple'),'Yes – Mandatory'],
      ]
    )}
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn-primary">Save GST Configuration</button>
      <button class="btn-outline">⬇ Export GSTR-1 Template</button>
    </div>`;

  // ── TAB 4: CONCESSION POLICY ────────────────────────────────────────────
  var t4 = `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#9a3412">
      <strong>Concession Policy Principle:</strong> &nbsp;Any concession on a patient bill must be pre-approved by the authorised role, documented with a mandatory reason, and is fully audit-logged in HIS. Cashier cannot apply any concession — the HIS system blocks this at field level.
    </div>
    <div class="section-title" style="margin-bottom:10px">Role-wise Concession Limits</div>
    ${table(
      ['Role','Max Concession Allowed','Approval Required','Reason Mandatory','HIS Access Level'],
      [
        ['Cashier / Front Desk','<span style="color:#dc2626;font-weight:700">0% — Not Authorised</span>','N/A','N/A','View only — cannot apply concession'],
        ['Billing Supervisor','Up to 5%','Self-approve','Yes — mandatory','Can apply up to 5% directly'],
        ['Billing Manager','Up to 25%','Self (above 15% — HOD note required)','Yes — mandatory','Can approve supervisor requests'],
        ['Medical Director / CMO','Up to 50%','CMO approval note required','Yes — mandatory','Approves high-value concessions'],
        ['CMD / Hospital Trustee','Unlimited','Board note for &gt;80%','Yes — mandatory','Final authority'],
      ]
    )}
    <div class="section-title" style="margin-bottom:10px;margin-top:16px">Concession Categories</div>
    ${table(
      ['Category','Who Can Apply','Documentation Required','Max %'],
      [
        ['Medical Hardship / BPL Patient','Billing Manager+','BPL card / Social worker note','Up to 100%'],
        ['Hospital Staff / Employee Benefit','HR + Billing Manager','Staff ID verification','As per HR policy'],
        ['VIP / Protocol','CMD approval','CMD instruction note','As decided'],
        ['Complimentary (Donor / Guest)','CMD approval','CMD written order','Up to 100%'],
        ['Package / Scheme Discount','Billing Manager','Package agreement','As per package'],
        ['Re-billing Correction','Billing Manager','Error justification','Up to amount of error'],
      ]
    )}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-top:16px">
      <div class="section-title" style="margin-bottom:8px;font-size:13px">Concession Approval Workflow (HIS Flow)</div>
      ${stepBar([
        {label:'Cashier Raises Request',status:'done'},
        {label:'Supervisor / Manager Reviews',status:'done'},
        {label:'Approval in HIS',status:'active'},
        {label:'Concession Applied to Bill',status:'pending'},
        {label:'Audit Log Updated',status:'pending'},
      ])}
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn-primary">Save Concession Policy</button>
      <button class="btn-outline">View Concession Report</button>
    </div>`;

  // ── TAB 5: AUDIT LOG ────────────────────────────────────────────────────
  var t5 = `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e40af">
      <strong>Audit Trail Principle:</strong> &nbsp;HIS captures the creator ID, date, time and all modifications to the billing master. No record can be deleted — only marked Inactive. All changes are tamper-proof and available for NABH inspection and internal audit.
    </div>
    <div style="display:flex;gap:12px;margin-bottom:12px">
      ${formField('From Date','<input class="form-input" type="date" value="2025-01-01" style="width:140px">')}
      ${formField('To Date','<input class="form-input" type="date" value="2025-05-19" style="width:140px">')}
      ${formField('Action Type',sel(['All','Added','Modified','Deactivated','Annual Review']))}
      <div style="align-self:flex-end;margin-bottom:0"><button class="btn-primary" style="height:38px">Filter</button></div>
    </div>
    ${table(
      ['Timestamp','Action','Charge Head / Field','Old Value','New Value','Modified By','IP Address'],
      [
        ['01-Apr-2025 09:15','Annual Review Completed','Entire Master','–','Reviewed & Approved',badge('Admin: Ravi Kumar','blue'),'192.168.1.10'],
        ['01-Apr-2025 08:50','Rate Revised','Consultation – Specialist OPD (General)',fmt(1000),fmt(1200),'Admin: Ravi Kumar','192.168.1.10'],
        ['01-Apr-2025 08:45','Rate Revised','Consultation – General OPD (General)',fmt(400),fmt(500),'Admin: Ravi Kumar','192.168.1.10'],
        ['01-Apr-2025 08:40','Rate Revised','Bed – General Ward (General)',fmt(1200),fmt(1500),'Admin: Ravi Kumar','192.168.1.10'],
        ['15-Mar-2025 11:20','New Charge Added','Robotic OT Charges (Major)','–',fmt(150000),'Admin: Priya IT','192.168.1.55'],
        ['10-Jan-2025 14:05','Status Changed','Emergency Consultation (CHG-CONS-EM-001)','Active','Inactive','Admin: Ravi Kumar','192.168.1.10'],
        ['01-Jan-2025 10:00','Rate Revised','Ambulance – Local (CGHS)',fmt(300),fmt(350),'Admin IT','192.168.1.55'],
      ]
    )}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-top:12px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:700;color:#166534;font-size:13.5px">NABH Annual Review Status</div>
        <div style="font-size:12.5px;color:#166534;margin-top:2px">Reviewed by: Ravi Kumar (Billing Manager) &nbsp;|&nbsp; Approved by: Dr. A. Mehta (Medical Director)</div>
      </div>
      <div style="text-align:right">
        <div style="background:#16a34a;color:#fff;padding:6px 14px;border-radius:20px;font-size:11.5px;font-weight:700">✓ COMPLIANT</div>
        <div style="font-size:11px;color:#166534;margin-top:3px">Last: 01-Apr-2025 &nbsp;|&nbsp; Next: 31-Mar-2026</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn-outline">⬇ Export Audit Log (Excel)</button>
      <button class="btn-outline">🖨 Print for NABH Inspection</button>
    </div>`;

  return pageHeader('Billing Master & Tariff Configuration',
    'Billing <span>›</span> Setup & Configuration <span>›</span> Billing Master',
    `<button class="btn-outline" style="font-size:12.5px">⬇ Export Master</button>
     <button class="btn-primary">+ Add Charge Head</button>`
  ) +
  // Purpose banner
  `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin-bottom:20px">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="flex:1">
        <div style="font-weight:700;color:#1e40af;font-size:13.5px;margin-bottom:4px">Purpose of Assessment</div>
        <div style="font-size:13px;color:#1e3a8a">Ensure all charge heads, tariff slabs, GST configuration and concession policies are correctly set up before any patient billing transaction begins.</div>
        <div style="display:flex;gap:20px;margin-top:8px;font-size:12px;color:#3b82f6;flex-wrap:wrap">
          <span>👤 Role: <strong>Billing Admin / IT Admin</strong></span>
        </div>
      </div>
    </div>
  </div>` +
  // Tabs container
  `<div class="card mb-5">
    <div style="display:flex;border-bottom:2px solid #e2e8f0;padding:0 16px;overflow-x:auto;">
      <div onclick="showTab('bst','cm')" data-tg="bst" data-tid="cm" style="padding:10px 20px;cursor:pointer;font-size:13.5px;white-space:nowrap;margin-bottom:-2px;color:#2563eb;border-bottom:2px solid #2563eb;font-weight:600">⚙ Charge Master</div>
      <div onclick="showTab('bst','ts')" data-tg="bst" data-tid="ts" style="padding:10px 20px;cursor:pointer;font-size:13.5px;white-space:nowrap;margin-bottom:-2px;color:#64748b;border-bottom:2px solid transparent;font-weight:500">₹ Tariff Slabs</div>
      <div onclick="showTab('bst','gst')" data-tg="bst" data-tid="gst" style="padding:10px 20px;cursor:pointer;font-size:13.5px;white-space:nowrap;margin-bottom:-2px;color:#64748b;border-bottom:2px solid transparent;font-weight:500">% GST Configuration</div>
      <div onclick="showTab('bst','cp')" data-tg="bst" data-tid="cp" style="padding:10px 20px;cursor:pointer;font-size:13.5px;white-space:nowrap;margin-bottom:-2px;color:#64748b;border-bottom:2px solid transparent;font-weight:500">🔒 Concession Policy</div>
      <div onclick="showTab('bst','al')" data-tg="bst" data-tid="al" style="padding:10px 20px;cursor:pointer;font-size:13.5px;white-space:nowrap;margin-bottom:-2px;color:#64748b;border-bottom:2px solid transparent;font-weight:500">📋 Audit Log</div>
    </div>
    <div data-tp="bst" data-pid="cm" style="padding:20px;display:block">${t1}</div>
    <div data-tp="bst" data-pid="ts" style="padding:20px;display:none">${t2}</div>
    <div data-tp="bst" data-pid="gst" style="padding:20px;display:none">${t3}</div>
    <div data-tp="bst" data-pid="cp" style="padding:20px;display:none">${t4}</div>
    <div data-tp="bst" data-pid="al" style="padding:20px;display:none">${t5}</div>
  </div>` +
  `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:8px">
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:16px 18px">
      <div style="font-weight:700;color:#713f12;font-size:13.5px;margin-bottom:10px">⚠ Validation &amp; Exception Controls</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${[
          ['Unique Code Enforced','Charge head code must be unique — HIS blocks duplicate on Save with an inline error.'],
          ['Department Mapping Mandatory','A charge head cannot be billed until it is mapped to a department.'],
          ['Inactive Charge Heads Blocked','Inactive charge heads do not appear in any billing screen or patient bill.'],
          ['Role-based Access Control','Only Billing Admin / IT Admin can create or modify master. Cashier access is blocked at field level.'],
          ['NABH Annual Review','Charge master must be reviewed and approved annually. HIS flags overdue reviews.'],
        ].map(([title, desc]) => '<div style="display:flex;gap:10px;align-items:flex-start"><span style="color:#d97706;font-size:14px;margin-top:1px">•</span><div><span style="font-weight:600;color:#92400e;font-size:13px">'+title+': </span><span style="color:#78350f;font-size:12.5px">'+desc+'</span></div></div>').join('')}
      </div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px">
      <div style="font-weight:700;color:#166534;font-size:13.5px;margin-bottom:10px">✅ Expected HIS System Response</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${[
          ['Charge Heads Created','Saved with unique codes and department mapping — visible in master list immediately.'],
          ['Billing Frequency Auto-calculated','HIS auto-multiplies based on frequency type (e.g., room rent × days stayed).'],
          ['Active / Inactive Status','All charge heads displayed with live status badge; inactive ones suppressed in billing screens.'],
          ['Duplicate Code Rejected','HIS shows inline validation error on Save if the code already exists — does not allow save.'],
          ['Audit Log Auto-captured','Creator ID, timestamp, and all field-level changes are recorded automatically — tamper-proof.'],
        ].map(([title, desc]) => '<div style="display:flex;gap:10px;align-items:flex-start"><span style="color:#16a34a;font-size:14px;margin-top:1px">✓</span><div><span style="font-weight:600;color:#166534;font-size:13px">'+title+': </span><span style="color:#14532d;font-size:12.5px">'+desc+'</span></div></div>').join('')}
      </div>
    </div>
  </div>`;
}

function pageSetupPackages() {
  return pageHeader('Package & Bundle Configuration',
    `Billing <span>›</span> Setup <span>›</span> Package Configuration`,
    `<button class="btn-outline">⬇ Export</button><button class="btn-primary">+ Create Package</button>`
  ) +
  sectionCard('Create New Package', `
    ${formRow(
      formField('Package Name','<input class="form-input" value="Normal Delivery Package">',true),
      formField('Package Code','<input class="form-input" value="PKG-MAT-ND-001">',true),
      formField('Package Type',sel(['Surgical','Maternity','Health Checkup','Day Care','Oncology']),true)
    )}
    ${formRow(
      formField('Package Rate (₹)','<input class="form-input" value="35000">',true),
      formField('Validity (Days)','<input class="form-input" value="5">'),
      formField('Applicable For',sel(['All','TPA','Corporate','CGHS']))
    )}
    <div class="mb-4">
      <label class="form-label">Package Components</label>
      <div class="border border-slate-200 rounded-lg overflow-hidden">
        ${table(['Component','Quantity','MRP (₹)','Included in Package','Remarks'],[
          ['Delivery Room Charges','1',fmt(8000),'<input type="checkbox" checked>',''],
          ['OT Nursing Charges','1',fmt(4000),'<input type="checkbox" checked>',''],
          ['Anaesthesia Charges','1',fmt(5000),'<input type="checkbox" checked>',''],
          ['Room (General Ward) – 3 Days','3',fmt(4500),'<input type="checkbox" checked>',''],
          ['Medicines & Consumables','Lumpsum',fmt(6000),'<input type="checkbox" checked>','Subject to actual'],
          ['NICU (if required)','As needed',fmt(8000),'<input type="checkbox">','Excluded – billed separately'],
        ])}
      </div>
    </div>
    <div class="flex gap-3"><button class="btn-primary">Save Package</button><button class="btn-outline">Reset</button></div>`) +
  sectionCard('Configured Packages', table(
    ['Package Code','Package Name','Type','Rate (₹)','Validity','Components','Status'],
    [
      ['PKG-SURG-LAP-001','Laparoscopic Cholecystectomy','Surgical',fmt(55000),'7 days','12',badge('Active','green')],
      ['PKG-MAT-ND-001','Normal Delivery','Maternity',fmt(35000),'5 days','8',badge('Active','green')],
      ['PKG-MAT-CS-001','Caesarean Delivery','Maternity',fmt(65000),'7 days','11',badge('Active','green')],
      ['PKG-HC-BASIC-001','Basic Health Checkup','Health Checkup',fmt(2500),'1 day','15',badge('Active','green')],
      ['PKG-HC-COMP-001','Comprehensive Health Checkup','Health Checkup',fmt(6500),'1 day','28',badge('Active','green')],
      ['PKG-CARD-ANGIO-001','Coronary Angiography','Cardiac',fmt(42000),'2 days','9',badge('Draft','yellow')],
    ]
  ));
}

function pageSetupInsurance() {
  return pageHeader('Insurance & TPA Master Setup',
    `Billing <span>›</span> Setup <span>›</span> Insurance & TPA`,
    `<button class="btn-outline">⬇ Export</button><button class="btn-primary">+ Add TPA</button>`
  ) +
  sectionCard('Add TPA / Insurance Company', `
    ${formRow(
      formField('TPA / Insurance Name','<input class="form-input" value="Mediassist Healthcare TPA">',true),
      formField('IRDA Registration No.','<input class="form-input" value="IRDA-TPA-0038">',true),
      formField('Claim Mode',sel(['Cashless','Reimbursement','Both']),true)
    )}
    ${formRow(
      formField('Tariff Slab',sel(['NABH Tariff A','NABH Tariff B','Special Negotiated','Standard']),true),
      formField('Pre-auth Required',sel(['Yes – All Cases','Yes – >₹30,000','No'])),
      formField('Co-payment %','<input class="form-input" value="10">')
    )}
    ${formRow(
      formField('Non-payable Items','<input class="form-input" value="Diet charges, Telephone, Attendant bed">'),
      formField('TPA Contact Email','<input class="form-input" value="claims@mediassist.in">'),
      formField('Status',sel(['Active','Inactive']))
    )}
    <div class="flex gap-3"><button class="btn-primary">Save TPA</button><button class="btn-outline">Reset</button></div>`) +
  sectionCard('Configured TPAs & Insurance Companies', table(
    ['TPA / Insurer','IRDA No.','Claim Mode','Tariff','Co-pay','Pre-auth Threshold','Status'],
    [
      ['Mediassist Healthcare','IRDA-TPA-0038','Both','NABH A','10%',fmt(30000),badge('Active','green')],
      ['Vidal Health TPA','IRDA-TPA-0052','Cashless','NABH B','5%',fmt(25000),badge('Active','green')],
      ['MD India Healthcare','IRDA-TPA-0019','Both','Special Negotiated','0%',fmt(20000),badge('Active','green')],
      ['Medi Assist Star','IRDA-TPA-0071','Reimbursement','Standard','15%',fmt(50000),badge('Active','green')],
      ['Family Health Plan','IRDA-TPA-0044','Cashless','NABH A','10%',fmt(30000),badge('Inactive','gray')],
    ]
  ));
}

function pageOPDRegistration() {
  return pageHeader('OPD Registration & Consultation Billing',
    `Billing <span>›</span> OPD Billing <span>›</span> Registration & Consultation`,
    `<button class="btn-outline">🖨 Print Receipt</button><button class="btn-primary">+ New Patient</button>`
  ) +
  stepBar([
    {label:'Patient Registration', status:'done'},
    {label:'Consultation Billing', status:'done'},
    {label:'Payment Collection', status:'active'},
    {label:'Receipt & Dispatch', status:'pending'},
  ]) +
  sectionCard('Patient Details', `
    ${formRow(
      formField('UHID','<input class="form-input" value="UHID-10045" style="background:#f8fafc">'),
      formField('Full Name','<input class="form-input" value="Ramesh Sharma">',true),
      formField('Date of Birth','<input class="form-input" type="date" value="1978-06-14">'),
      formField('Gender',sel(['Male','Female','Other']))
    )}
    ${formRow(
      formField('Mobile','<input class="form-input" value="98765 43210">',true),
      formField('Address','<input class="form-input" value="B-14, Navrangpura, Ahmedabad">'),
      formField('Patient Type',sel(['General','TPA / Insurance','Corporate','CGHS/ECHS'])),
      formField('Referred By','<input class="form-input" value="Dr. Mehta (Self-referred)">')
    )}`, '', '') +
  sectionCard('Consultation Billing', `
    ${formRow(
      formField('Department',sel(['Cardiology','Orthopedics','General Medicine','Neurology'])),
      formField('Consulting Doctor',sel(['Dr. Anil Mehta (Cardiologist)','Dr. Seema Rao (Ortho)','Dr. Pradeep Shah (GM)'])),
      formField('Visit Type',sel(['New Visit','Follow-up (Paid)','Follow-up (Free)']))
    )}
    ${formRow(
      formField('Consultation Fee (₹)','<input class="form-input" value="1200">'),
      formField('Token / Appointment No.','<input class="form-input" value="T-124">'),
      formField('Slot Time','<input class="form-input" value="11:30 AM">'),
    )}`) +
  sectionCard('Payment Collection', `
    ${formRow(
      formField('Payment Mode',sel(['Cash','Card – Debit/Credit','UPI','Cheque','Insurance / TPA']),true),
      formField('Amount Tendered (₹)','<input class="form-input" value="1200">',true),
      formField('Transaction / Ref No.','<input class="form-input" value="UPI-4892827633">')
    )}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div class="flex justify-between items-center">
        <div>
          <div class="text-sm font-semibold text-slate-700">Bill Summary</div>
          <div class="text-xs text-slate-500 mt-1">Receipt No: RCP-2025-4892 | Date: 19-May-2025</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500">Consultation Fee</div>
          <div class="text-2xl font-bold text-blue-700">${fmt(1200)}</div>
          <div class="text-xs text-green-600 font-semibold">GST: Exempt (Healthcare)</div>
        </div>
      </div>
    </div>
    <div class="flex gap-3">
      <button class="btn-primary">Collect Payment & Print Receipt</button>
      <button class="btn-outline">Save Draft</button>
    </div>`);
}

function pageOPDProcedures() {
  return pageHeader('OPD Procedure & Investigation Billing',
    `Billing <span>›</span> OPD Billing <span>›</span> Procedure & Investigation`,
    `<button class="btn-outline">🖨 Print</button><button class="btn-primary">Collect & Dispatch</button>`
  ) +
  sectionCard('Patient & Doctor Orders', `
    <div class="grid grid-cols-4 gap-4 mb-4 bg-slate-50 rounded-lg p-4">
      <div><div class="text-xs text-slate-500">UHID</div><div class="font-semibold text-sm">UHID-10038</div></div>
      <div><div class="text-xs text-slate-500">Patient</div><div class="font-semibold text-sm">Priya Patel</div></div>
      <div><div class="text-xs text-slate-500">Doctor</div><div class="font-semibold text-sm">Dr. Seema Rao</div></div>
      <div><div class="text-xs text-slate-500">Order Date</div><div class="font-semibold text-sm">19-May-2025 10:15</div></div>
    </div>`) +
  sectionCard('Doctor\'s Investigation & Procedure Orders', table(
    ['#','Investigation / Procedure','Department','Rate (₹)','GST','Total','Bill','Dispatch'],
    [
      ['1','CBC (Complete Blood Count)','Lab',fmt(450),'5%',fmt(473),'<input type="checkbox" checked>',badge('Pending','yellow')],
      ['2','Liver Function Test (LFT)','Lab',fmt(850),'5%',fmt(893),'<input type="checkbox" checked>',badge('Pending','yellow')],
      ['3','X-Ray Chest PA','Radiology',fmt(700),'5%',fmt(735),'<input type="checkbox" checked>',badge('Pending','yellow')],
      ['4','ECG (12-Lead)','Cardiology',fmt(350),'5%',fmt(368),'<input type="checkbox" checked>',badge('Pending','yellow')],
      ['5','USG Abdomen','Radiology',fmt(1200),'5%',fmt(1260),'<input type="checkbox">','–'],
    ]
  ), '', '') +
  `<div class="card p-5 mb-5">
    <div class="flex justify-between items-center">
      <div>
        <div class="font-semibold text-slate-700">Bill Total (Selected)</div>
        <div class="text-xs text-slate-500">4 items selected for billing and dispatch</div>
      </div>
      <div class="text-right">
        <div class="text-2xl font-bold text-blue-700">${fmt(2469)}</div>
        <div class="text-xs text-slate-500">Incl. GST @5%</div>
      </div>
    </div>
    <div class="border-t border-slate-100 mt-4 pt-4">
      ${formRow(
        formField('Payment Mode',sel(['Cash','Card','UPI','Insurance'])),
        formField('Transaction Ref','<input class="form-input" placeholder="UPI/Card Ref No.">'),
        formField('','')
      )}
      <div class="flex gap-3">
        <button class="btn-primary">Collect Payment & Dispatch to Departments</button>
        <button class="btn-outline">Cancel</button>
      </div>
    </div>
  </div>`;
}

function pageIPDAdmission() {
  return pageHeader('IPD Admission & Advance Collection',
    `Billing <span>›</span> IPD Billing <span>›</span> Admission & Advance`,
    `<button class="btn-outline">🖨 Print Estimate</button><button class="btn-primary">Confirm Admission</button>`
  ) +
  stepBar([
    {label:'Patient Registration', status:'done'},
    {label:'Admission Form', status:'done'},
    {label:'Cost Estimate', status:'active'},
    {label:'Advance Collection', status:'pending'},
    {label:'Ward Allotment', status:'pending'},
  ]) +
  sectionCard('Admission Details', `
    ${formRow(
      formField('UHID','<input class="form-input" value="UHID-10031">'),
      formField('Patient Name','<input class="form-input" value="Arvind Kumar">'),
      formField('Admission Type',sel(['Elective','Emergency','Referred','Day Care'])),
      formField('Admission Date','<input class="form-input" type="date" value="2025-05-19">')
    )}
    ${formRow(
      formField('Ward Type',sel(['General Ward','Semi-Private','Private Room','ICU','ICCU']),true),
      formField('Bed No.','<input class="form-input" value="B-214">',true),
      formField('Treating Doctor',sel(['Dr. Anil Mehta (Cardiology)','Dr. Pradeep Shah (GM)','Dr. Rajiv Nair (Ortho)'])),
      formField('Diagnosis / Procedure','<input class="form-input" value="ACS – NSTEMI">')
    )}`) +
  sectionCard('Admission Cost Estimate', `
    <div class="overflow-x-auto mb-4">
      ${table(['Component','Unit','Rate (₹)','Est. Qty','Est. Amount (₹)'],[
        ['Semi-Private Room Charges','Per Day',fmt(3500),'5',fmt(17500)],
        ['Consultant Visit Charges','Per Visit',fmt(1500),'10',fmt(15000)],
        ['Nursing Charges (Lumpsum)','Per Admission','–','–',fmt(5000)],
        ['Investigations (Estimated)','Lumpsum','–','–',fmt(8000)],
        ['Medicines & Consumables','Estimated','–','–',fmt(12000)],
        ['OT / Procedure Charges','If required','–','–',fmt(25000)],
      ])}
    </div>
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex justify-between items-center">
      <div>
        <div class="font-semibold text-yellow-800">Estimated Total</div>
        <div class="text-xs text-yellow-700">Actual billing may vary based on clinical course</div>
      </div>
      <div class="text-2xl font-bold text-yellow-700">${fmt(82500)}</div>
    </div>`) +
  sectionCard('Advance Collection', `
    ${formRow(
      formField('Advance Amount (₹)','<input class="form-input" value="30000">',true),
      formField('Payment Mode',sel(['Cash','Card','UPI','NEFT/RTGS','Cheque']),true),
      formField('Transaction Ref','<input class="form-input" value="NEFT-48827361">')
    )}
    <div class="flex gap-3">
      <button class="btn-primary">Collect Advance & Allot Bed</button>
      <button class="btn-outline">Print Estimate Only</button>
    </div>`);
}

function pageIPDCharges() {
  return pageHeader('Real-time Bed & Service Charge Posting',
    `Billing <span>›</span> IPD Billing <span>›</span> Charge Posting`,
    `<button class="btn-outline">🔄 Refresh</button><button class="btn-primary">Add Manual Charge</button>`
  ) +
  `<div class="grid grid-cols-4 gap-4 mb-5">
    <div class="kpi-card"><div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Advance Paid</div><div class="text-xl font-bold text-green-700">${fmt(30000)}</div></div>
    <div class="kpi-card"><div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Charges Posted</div><div class="text-xl font-bold text-blue-700">${fmt(22800)}</div></div>
    <div class="kpi-card"><div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Advance Balance</div><div class="text-xl font-bold text-green-700">${fmt(7200)}</div></div>
    <div class="kpi-card"><div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Days Admitted</div><div class="text-xl font-bold text-slate-800">3</div><div class="text-xs text-slate-400">Since 16-May-2025</div></div>
  </div>` +
  `<div class="bg-blue-50 border border-blue-100 rounded-lg px-5 py-3 mb-5 flex items-center gap-4">
    <div><div class="text-xs text-slate-500">Patient</div><div class="font-semibold text-sm">Arvind Kumar (UHID-10031)</div></div>
    <div><div class="text-xs text-slate-500">Ward / Bed</div><div class="font-semibold text-sm">Semi-Private / B-214</div></div>
    <div><div class="text-xs text-slate-500">Treating Doctor</div><div class="font-semibold text-sm">Dr. Anil Mehta</div></div>
    <div><div class="text-xs text-slate-500">Diagnosis</div><div class="font-semibold text-sm">ACS – NSTEMI</div></div>
    <span class="ml-auto badge badge-yellow">Admitted</span>
  </div>` +
  sectionCard('Auto-Posted Charges (Real-time)', table(
    ['Posting Time','Charge Head','Posted By','Amount (₹)','Source','Status'],
    [
      ['19-May 00:01','Bed Charges – Semi-Private (Day 3)','HIS Auto',fmt(3500),'Auto-Midnight',badge('Posted','green')],
      ['18-May 14:22','Dr. Anil Mehta – Consultant Visit','EMR',fmt(1500),'Doctor EMR',badge('Posted','green')],
      ['18-May 11:05','Troponin I (High Sensitivity)','Lab LIS',fmt(1200),'Lab',badge('Posted','green')],
      ['18-May 09:30','ECG (12-Lead)','Cardiology',fmt(350),'Dept',badge('Posted','green')],
      ['17-May 00:01','Bed Charges – Semi-Private (Day 2)','HIS Auto',fmt(3500),'Auto-Midnight',badge('Posted','green')],
      ['17-May 20:15','IV Fluids & Consumables (Pharmacy)','Pharmacy',fmt(680),'Pharmacy',badge('Posted','green')],
      ['17-May 16:40','Dr. Anil Mehta – Consultant Visit','EMR',fmt(1500),'Doctor EMR',badge('Posted','green')],
      ['16-May 00:01','Bed Charges – Semi-Private (Day 1)','HIS Auto',fmt(3500),'Auto-Midnight',badge('Posted','green')],
      ['16-May 11:00','Nursing Charges (Admission)','Nursing',fmt(5000),'Nursing',badge('Posted','green')],
      ['16-May 10:30','CBC + LFT + RFT Panel','Lab LIS',fmt(1890),'Lab',badge('Posted','green')],
    ]
  ), `<div class="font-bold text-blue-700 text-sm">Total: ${fmt(22620)}</div>`);
}

function pageIPDFinalBill() {
  return pageHeader('Final Bill Generation at Discharge',
    `Billing <span>›</span> IPD Billing <span>›</span> Final Bill at Discharge`,
    `<button class="btn-outline">🖨 Print Final Bill</button><button class="btn-primary">Collect Balance & Discharge</button>`
  ) +
  stepBar([
    {label:'Discharge Order', status:'done'},
    {label:'Pending Charges', status:'done'},
    {label:'Final Bill Generation', status:'active'},
    {label:'Concession / Approval', status:'pending'},
    {label:'Payment & Bed Release', status:'pending'},
  ]) +
  `<div class="bg-green-50 border border-green-200 rounded-lg px-5 py-3 mb-5 flex items-center gap-6">
    <div><div class="text-xs text-slate-500">Patient</div><div class="font-semibold">Arvind Kumar (UHID-10031)</div></div>
    <div><div class="text-xs text-slate-500">Admitted</div><div class="font-semibold">16-May-2025</div></div>
    <div><div class="text-xs text-slate-500">Discharge</div><div class="font-semibold">19-May-2025</div></div>
    <div><div class="text-xs text-slate-500">Stay</div><div class="font-semibold">3 Days</div></div>
    <div><div class="text-xs text-slate-500">Treating Doctor</div><div class="font-semibold">Dr. Anil Mehta</div></div>
    ${badge('Discharge Initiated','yellow')}
  </div>` +
  sectionCard('Consolidated Bill', `
    ${table(['Category','Charge Head','Qty','Rate (₹)','Amount (₹)'],[
      ['Room & Board','Bed Charges – Semi-Private × 3 Days','3',fmt(3500),fmt(10500)],
      ['Consultant Visits','Dr. Anil Mehta – Consultation × 3','3',fmt(1500),fmt(4500)],
      ['Nursing','Nursing Charges (Lumpsum)','1',fmt(5000),fmt(5000)],
      ['Lab','Investigations – CBC, LFT, Troponin, etc.','—','—',fmt(4340)],
      ['Pharmacy','Medicines & IV Consumables','—','—',fmt(8240)],
      ['Cardiology','Echocardiography','1',fmt(2500),fmt(2500)],
      ['Cardiology','ECG × 3','3',fmt(350),fmt(1050)],
    ])}
    <div class="border-t border-slate-200 mt-2 pt-4 space-y-2">
      <div class="flex justify-between text-sm"><span class="text-slate-600">Subtotal</span><span class="font-semibold">${fmt(36130)}</span></div>
      <div class="flex justify-between text-sm"><span class="text-slate-600">GST (Lab & Procedures @5%)</span><span>${fmt(790)}</span></div>
      <div class="flex justify-between text-sm font-semibold text-slate-800 border-t border-slate-100 pt-2"><span>Gross Total</span><span>${fmt(36920)}</span></div>
      <div class="flex justify-between text-sm text-green-700"><span>Less: Advance Paid</span><span>– ${fmt(30000)}</span></div>
      <div class="flex justify-between text-sm text-red-600"><span>Concession (if any)</span><span class="flex items-center gap-2">– <input class="form-input w-24 text-center" value="0"></span></div>
      <div class="flex justify-between text-lg font-bold text-blue-800 border-t-2 border-slate-200 pt-3 mt-2"><span>Balance Payable</span><span>${fmt(6920)}</span></div>
    </div>`) +
  sectionCard('Balance Payment', `
    ${formRow(
      formField('Payment Mode',sel(['Cash','Card','UPI','NEFT/RTGS']),true),
      formField('Amount (₹)','<input class="form-input" value="6920">'),
      formField('Transaction Ref','<input class="form-input" placeholder="Ref No.">')
    )}
    <div class="flex gap-3">
      <button class="btn-primary">Collect Balance & Release Bed</button>
      <button class="btn-outline">Apply Concession</button>
    </div>`);
}

function pageIPDDaycare() {
  return pageHeader('Day Care & Short-Stay Billing',
    `Billing <span>›</span> IPD Billing <span>›</span> Day Care Billing`,
    `<button class="btn-outline">🖨 Print Receipt</button><button class="btn-primary">Complete & Discharge</button>`
  ) +
  sectionCard('Day Care Admission', `
    ${formRow(
      formField('UHID','<input class="form-input" value="UHID-10055">'),
      formField('Patient Name','<input class="form-input" value="Sunita Gupta">'),
      formField('Admission Type','<input class="form-input" value="Day Care" style="background:#f8fafc">'),
      formField('Procedure',sel(['Chemotherapy Session','Dialysis','Minor Surgery','Endoscopy','Colonoscopy']))
    )}
    ${formRow(
      formField('Package',sel(['Chemotherapy Day Care – ₹9,500','Dialysis Day Care – ₹3,200','Endoscopy Package – ₹8,000']),true),
      formField('Admission Time','<input class="form-input" value="08:30 AM">'),
      formField('Expected Discharge','<input class="form-input" value="05:00 PM">'),
      formField('Session No.','<input class="form-input" value="6 of 12">')
    )}`) +
  sectionCard('Day Care Package Billing', `
    <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
      <div class="flex justify-between items-center">
        <div>
          <div class="font-semibold text-slate-700">Chemotherapy Day Care Package</div>
          <div class="text-xs text-slate-500 mt-1">Flat rate applies · Daily room rent NOT charged · Includes: Chemo drug, IV fluids, nursing, monitoring</div>
        </div>
        <div class="text-2xl font-bold text-blue-700">${fmt(9500)}</div>
      </div>
    </div>
    ${table(['Component','Included','Notes'],[
      ['Chemotherapy Drug (Paclitaxel 240mg)','✓ Included','Dose as per body surface area'],
      ['IV Fluids & Pre-medication','✓ Included','Standard protocol'],
      ['Nursing & Monitoring (Day)','✓ Included','8 hrs'],
      ['Oncologist Visit','✓ Included','1 visit'],
      ['Day Room (No Room Rent)','✓ Included','Day use only'],
      ['Anti-emetics (If additional)','✗ Excluded','Billed separately if required'],
    ])}
    <div class="flex gap-3 mt-4">
      <button class="btn-primary">Collect Payment & Start Procedure</button>
      <button class="btn-outline">Print Package Details</button>
    </div>`);
}

function pageIPDProvisional() {
  return pageHeader('Provisional Bill Review',
    `Billing <span>›</span> IPD Billing <span>›</span> Provisional Bill`,
    `<button class="btn-outline">🖨 Print Provisional</button><button class="btn-primary">Send to Patient</button>`
  ) +
  `<div class="bg-yellow-50 border border-yellow-200 rounded-lg px-5 py-3 mb-5 flex items-center gap-2">
    <svg width="16" height="16" fill="none" stroke="#b45309" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span class="text-sm text-yellow-800 font-medium">This is an interim bill. Charges may increase as treatment continues. Not valid for insurance/TPA submission.</span>
  </div>` +
  `<div class="bg-white border border-slate-200 rounded-lg mb-5 flex items-center gap-8 px-5 py-3">
    <div><div class="text-xs text-slate-500">Patient</div><div class="font-semibold text-sm">Mohammed Ismail (UHID-10022)</div></div>
    <div><div class="text-xs text-slate-500">Ward / Bed</div><div class="font-semibold text-sm">General Ward / A-108</div></div>
    <div><div class="text-xs text-slate-500">Admitted</div><div class="font-semibold text-sm">14-May-2025</div></div>
    <div><div class="text-xs text-slate-500">Generated At</div><div class="font-semibold text-sm">19-May-2025 10:45 AM</div></div>
    <div><div class="text-xs text-slate-500">Advance Paid</div><div class="font-semibold text-green-700 text-sm">${fmt(15000)}</div></div>
  </div>` +
  sectionCard('Provisional Bill – Charges Posted Till Now', table(
    ['Category','Details','Amount (₹)'],
    [
      ['Room & Board','General Ward × 5 Days @₹1,500/day',fmt(7500)],
      ['Consultant','Dr. Pradeep Shah × 5 Visits',fmt(5000)],
      ['Nursing','Nursing (Lumpsum)',fmt(3000)],
      ['Lab','Blood investigations × 3 panels',fmt(2850)],
      ['Pharmacy','Medicines issued',fmt(4200)],
      ['Radiology','Chest X-Ray × 2',fmt(1400)],
    ]
  ) + `
    <div class="border-t border-slate-100 mt-2 pt-4 space-y-2">
      <div class="flex justify-between text-sm"><span class="text-slate-600">Subtotal</span><span class="font-semibold">${fmt(23950)}</span></div>
      <div class="flex justify-between text-sm text-green-700"><span>Advance Adjusted</span><span>– ${fmt(15000)}</span></div>
      <div class="flex justify-between text-base font-bold text-blue-800 border-t border-slate-200 pt-2 mt-1"><span>Provisional Balance</span><span>${fmt(8950)}</span></div>
    </div>`, '', '');
}

function pageInsPreauth() {
  return pageHeader('TPA Pre-authorisation Request',
    `Billing <span>›</span> Insurance & TPA <span>›</span> Pre-authorisation`,
    `<button class="btn-outline">📎 Upload Documents</button><button class="btn-primary">Submit Pre-auth</button>`
  ) +
  stepBar([
    {label:'Patient Verification', status:'done'},
    {label:'Pre-auth Form', status:'active'},
    {label:'Document Upload', status:'pending'},
    {label:'TPA Response', status:'pending'},
    {label:'Confirmation', status:'pending'},
  ]) +
  sectionCard('Insurance & Patient Details', `
    ${formRow(
      formField('UHID','<input class="form-input" value="UHID-10061">'),
      formField('Patient Name','<input class="form-input" value="Geeta Nair">'),
      formField('Policy Number','<input class="form-input" value="MED-PLY-2024-88432">'),
      formField('TPA',sel(['Mediassist Healthcare','Vidal Health TPA','MD India','Family Health Plan']))
    )}
    ${formRow(
      formField('Insurance Company','<input class="form-input" value="Star Health & Allied Insurance">'),
      formField('Sum Insured (₹)','<input class="form-input" value="500000">'),
      formField('Policy Validity','<input class="form-input" value="31-Dec-2025">'),
      formField('Eligibility Status','<input class="form-input" value="Active" style="color:#16a34a;font-weight:600">'),
    )}`) +
  sectionCard('Pre-auth Request Details', `
    ${formRow(
      formField('Admission Type',sel(['Planned','Emergency']),true),
      formField('Diagnosis (ICD-10)','<input class="form-input" value="I25.1 – Atherosclerotic heart disease">',true),
      formField('Planned Procedure','<input class="form-input" value="Coronary Angiography">',true)
    )}
    ${formRow(
      formField('Treating Doctor',sel(['Dr. Anil Mehta (Cardiologist)','Dr. Seema Rao','Dr. Rajiv Nair'])),
      formField('Estimated Cost (₹)','<input class="form-input" value="42000">'),
      formField('Expected Admission Date','<input class="form-input" type="date" value="2025-05-21">')
    )}
    <div class="flex gap-3 mt-2">
      <button class="btn-primary">Submit Pre-auth to TPA</button>
      <button class="btn-outline">Save Draft</button>
    </div>`) +
  sectionCard('Pre-auth Tracker', table(
    ['Pre-auth No.','Patient','TPA','Submitted','Status','Sanctioned Amt','Action'],
    [
      ['PA-2025-0482','Ramesh Sharma','Mediassist','17-May-2025',badge('Approved','green'),fmt(45000),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">View</button>'],
      ['PA-2025-0481','Priya Patel','Vidal Health','16-May-2025',badge('Query Raised','yellow'),'–','<button class="btn-outline" style="padding:4px 10px;font-size:12px">Respond</button>'],
      ['PA-2025-0479','Geeta Nair','Star Health','15-May-2025',badge('Pending','blue'),fmt(0),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">Track</button>'],
      ['PA-2025-0476','Suresh Iyer','MD India','14-May-2025',badge('Approved','green'),fmt(32000),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">View</button>'],
    ]
  ));
}

function pageInsCashless() {
  return pageHeader('Cashless Settlement Processing',
    `Billing <span>›</span> Insurance & TPA <span>›</span> Cashless Settlement`,
    `<button class="btn-outline">📤 Submit to TPA</button><button class="btn-primary">Generate Claim Bill</button>`
  ) +
  stepBar([
    {label:'Discharge Initiated', status:'done'},
    {label:'Claim Bill Generated', status:'done'},
    {label:'TPA Submission', status:'active'},
    {label:'Settlement Receipt', status:'pending'},
    {label:'Reconciliation', status:'pending'},
  ]) +
  sectionCard('Claim Bill Summary', `
    <div class="grid grid-cols-4 gap-4 mb-4 bg-slate-50 p-4 rounded-lg">
      <div><div class="text-xs text-slate-500">Patient</div><div class="font-semibold text-sm">Ramesh Sharma</div></div>
      <div><div class="text-xs text-slate-500">TPA</div><div class="font-semibold text-sm">Mediassist Healthcare</div></div>
      <div><div class="text-xs text-slate-500">Pre-auth No.</div><div class="font-semibold text-sm">PA-2025-0482</div></div>
      <div><div class="text-xs text-slate-500">Sanctioned Amount</div><div class="font-semibold text-green-700 text-sm">${fmt(45000)}</div></div>
    </div>
    ${table(['Category','Amount (₹)','TPA Payable (₹)','Non-payable (₹)','Reason'],[
      ['Room & Board',fmt(21000),fmt(21000),fmt(0),'–'],
      ['Consultant Fees',fmt(9000),fmt(9000),fmt(0),'–'],
      ['Lab & Radiology',fmt(5200),fmt(5200),fmt(0),'–'],
      ['Pharmacy',fmt(6800),fmt(5800),fmt(1000),'OTC Medicines'],
      ['Diet / Meals',fmt(1500),fmt(0),fmt(1500),'Non-payable'],
      ['Telephone / TV',fmt(500),fmt(0),fmt(500),'Non-payable'],
    ])}
    <div class="border-t border-slate-200 mt-2 pt-4 space-y-1">
      <div class="flex justify-between text-sm"><span class="text-slate-600">Gross Bill</span><span>${fmt(44000)}</span></div>
      <div class="flex justify-between text-sm text-red-600"><span>Non-payable Deductions</span><span>– ${fmt(3000)}</span></div>
      <div class="flex justify-between text-sm font-bold text-blue-700 border-t border-slate-100 pt-2"><span>TPA Claim Amount</span><span>${fmt(41000)}</span></div>
      <div class="flex justify-between text-sm text-orange-700"><span>Co-payment @10% (Patient)</span><span>${fmt(4100)}</span></div>
      <div class="flex justify-between text-base font-bold text-green-700"><span>TPA Net Settlement</span><span>${fmt(36900)}</span></div>
    </div>`) +
  sectionCard('Settlement Status', table(
    ['Claim Ref.','TPA','Submitted','Claim Amt','Settlement','Received','Status'],
    [
      ['CLM-2025-0211','Mediassist','19-May-2025',fmt(41000),fmt(36900),'Pending',badge('Submitted','blue')],
      ['CLM-2025-0198','Vidal Health','10-May-2025',fmt(28500),fmt(28500),'12-May-2025',badge('Settled','green')],
      ['CLM-2025-0187','MD India','02-May-2025',fmt(52000),fmt(49400),'08-May-2025',badge('Settled','green')],
      ['CLM-2025-0174','Star Health','28-Apr-2025',fmt(18000),'–','–',badge('Rejected','red')],
    ]
  ));
}

function pageCorpBilling() {
  return pageHeader('Corporate & Empanelled Patient Billing',
    `Billing <span>›</span> Corporate Billing <span>›</span> Corporate Patients`,
    `<button class="btn-outline">🖨 Invoice</button><button class="btn-primary">+ New Corporate Bill</button>`
  ) +
  sectionCard('Corporate Patient Registration & Billing', `
    ${formRow(
      formField('UHID','<input class="form-input" value="UHID-10072">'),
      formField('Employee Name','<input class="form-input" value="Vikram Mehta">',true),
      formField('Employee ID','<input class="form-input" value="ADANI-EMP-4821">',true),
      formField('Company',sel(['Adani Group','Reliance Industries','Tata Consultancy','L&T Ltd']),true)
    )}
    ${formRow(
      formField('Entitlement Category',sel(['Grade A – ₹2L/year','Grade B – ₹1.5L/year','Grade C – ₹1L/year'])),
      formField('Used this year (₹)','<input class="form-input" value="42000" style="background:#f8fafc">'),
      formField('Balance Entitlement (₹)','<input class="form-input" value="158000" style="background:#f8fafc;color:#16a34a;font-weight:600">'),
      formField('Tariff Slab',sel(['Adani Group Negotiated Tariff','Standard Corporate','NABH']))
    )}`) +
  sectionCard('Visit Details & Billing', `
    ${formRow(
      formField('Visit Type',sel(['OPD','IPD Admission','Day Care'])),
      formField('Department',sel(['General Medicine','Orthopedics','Cardiology','Dentistry'])),
      formField('Consulting Doctor',sel(['Dr. Pradeep Shah','Dr. Anil Mehta','Dr. Seema Rao']))
    )}
    <div class="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-4">
      <div class="flex justify-between items-center">
        <div>
          <div class="font-semibold text-slate-700">Corporate Tariff Applied: Adani Group Negotiated</div>
          <div class="text-xs text-slate-500 mt-1">Consultation: ₹1,000 (Standard: ₹1,200) · 16.7% discount applied</div>
        </div>
        ${badge('Credit Billing – No Cash Collection','blue')}
      </div>
    </div>
    <div class="flex gap-3"><button class="btn-primary">Post to Monthly Invoice</button><button class="btn-outline">Print Visit Summary</button></div>`) +
  sectionCard('Monthly Corporate Invoice', table(
    ['Company','Invoice No.','Month','Services','Amount (₹)','Status','Action'],
    [
      ['Adani Group','CORP-INV-MAY-001','May 2025','28 visits',fmt(84200),badge('Draft','yellow'),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">Finalize</button>'],
      ['Reliance Industries','CORP-INV-MAY-002','May 2025','15 visits',fmt(42600),badge('Draft','yellow'),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">Finalize</button>'],
      ['Adani Group','CORP-INV-APR-001','Apr 2025','31 visits',fmt(96400),badge('Submitted','blue'),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">View</button>'],
      ['L&T Ltd','CORP-INV-APR-003','Apr 2025','8 visits',fmt(22800),badge('Settled','green'),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">View</button>'],
    ]
  ));
}

function pageCorpGovt() {
  return pageHeader('CGHS / ECHS / Government Scheme Billing',
    `Billing <span>›</span> Corporate Billing <span>›</span> Government Schemes`,
    `<button class="btn-outline">📤 Submit Claim</button><button class="btn-primary">+ New Govt Patient</button>`
  ) +
  sectionCard('Beneficiary Verification', `
    ${formRow(
      formField('Scheme',sel(['CGHS','ECHS','PM-JAY / Ayushman Bharat','State Govt – MA Yojana','ESIC']),true),
      formField('Beneficiary Card No.','<input class="form-input" value="CGHS-AHM-GRP-0892">',true),
      formField('Wellness Centre / Unit','<input class="form-input" value="CGHS Ahmedabad – Navrangpura WC">'),
      formField('Eligibility Verified',`<div class="flex items-center gap-2 mt-1"><span class="badge badge-green">✓ Active Beneficiary</span></div>`)
    )}
    ${formRow(
      formField('Beneficiary Name','<input class="form-input" value="Ramji Lal Verma">'),
      formField('Designation','<input class="form-input" value="Retd. Deputy Secretary">'),
      formField('Entitlement','<input class="form-input" value="CGHS Private Ward">'),
      formField('Dependants Covered','<input class="form-input" value="Spouse, 2 children">')
    )}`) +
  sectionCard('CGHS / Scheme Tariff Application', `
    <div class="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
      <div class="font-semibold text-green-800 mb-2">CGHS Approved Rate List Auto-applied</div>
      ${table(['Procedure / Service','CGHS Rate (₹)','Standard Rate (₹)','Savings (₹)'],[
        ['Consultation – Specialist',fmt(750),fmt(1200),fmt(450)],
        ['Bed Charges – Private Ward',fmt(4500),fmt(6500),fmt(2000)],
        ['Coronary Angiography',fmt(18000),fmt(42000),fmt(24000)],
        ['CBC + Metabolic Panel',fmt(380),fmt(520),fmt(140)],
      ])}
    </div>
    <div class="flex gap-3"><button class="btn-primary">Generate CGHS Claim</button><button class="btn-outline">Print Referral Form</button></div>`);
}

function pageRefRefund() {
  return pageHeader('Patient Refund Processing',
    `Billing <span>›</span> Refunds & Adjustments <span>›</span> Patient Refund`,
    `<button class="btn-outline">🖨 Print Refund Receipt</button><button class="btn-primary">+ New Refund Request</button>`
  ) +
  stepBar([
    {label:'Refund Request', status:'done'},
    {label:'Calculation', status:'done'},
    {label:'Manager Approval', status:'active'},
    {label:'Payment Processing', status:'pending'},
    {label:'Receipt Generated', status:'pending'},
  ]) +
  sectionCard('Refund Request Details', `
    ${formRow(
      formField('UHID / Patient','<input class="form-input" value="UHID-10031 – Arvind Kumar">'),
      formField('Refund Type',sel(['Advance Refund','Excess Payment Refund','Cancellation Refund','Duplicate Payment']),true),
      formField('Original Receipt No.','<input class="form-input" value="RCP-2025-4821">'),
      formField('Reason','<input class="form-input" value="Patient discharged early – unused advance">')
    )}
    <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
      <div class="grid grid-cols-4 gap-4">
        <div><div class="text-xs text-slate-500">Advance Collected</div><div class="font-bold text-slate-800">${fmt(30000)}</div></div>
        <div><div class="text-xs text-slate-500">Total Charges Billed</div><div class="font-bold text-slate-800">${fmt(23080)}</div></div>
        <div><div class="text-xs text-slate-500">Refundable Amount</div><div class="font-bold text-green-700">${fmt(6920)}</div></div>
        <div><div class="text-xs text-slate-500">Mode (Original)</div><div class="font-bold text-slate-800">NEFT</div></div>
      </div>
    </div>
    ${formRow(
      formField('Refund Payment Mode',sel(['Cash (≤ ₹5,000)','NEFT/RTGS','UPI','Cheque']),true),
      formField('Bank Account No.','<input class="form-input" value="XXXX XXXX 4821">'),
      formField('IFSC Code','<input class="form-input" value="HDFC0004821">')
    )}
    <div class="flex gap-3"><button class="btn-primary">Submit for Manager Approval</button><button class="btn-outline">Cancel</button></div>`) +
  sectionCard('Refund Tracker', table(
    ['Refund Ref.','Patient','Amount (₹)','Type','Raised By','Status','Action'],
    [
      ['REF-2025-0092','Arvind Kumar',fmt(6920),'Advance Refund','Cashier Priya',badge('Pending Approval','yellow'),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">Approve</button>'],
      ['REF-2025-0088','Sunita Gupta',fmt(2500),'Cancellation','Cashier Raj',badge('Approved','green'),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">Process</button>'],
      ['REF-2025-0082','Ratan Lal',fmt(1200),'Duplicate Pymnt','Cashier Priya',badge('Processed','blue'),'<button class="btn-outline" style="padding:4px 10px;font-size:12px">Receipt</button>'],
    ]
  ));
}

function pageRefCancel() {
  return pageHeader('Bill Cancellation & Amendment',
    `Billing <span>›</span> Refunds & Adjustments <span>›</span> Bill Cancellation`,
    `<button class="btn-outline">🖨 Credit Note</button><button class="btn-primary">Submit Cancellation</button>`
  ) +
  sectionCard('Cancellation / Amendment Request', `
    ${formRow(
      formField('Receipt / Bill No.','<input class="form-input" value="RCP-2025-4880">',true),
      formField('UHID / Patient','<input class="form-input" value="UHID-10019 – Rohit Sharma">'),
      formField('Bill Date','<input class="form-input" value="18-May-2025">'),
      formField('Bill Amount (₹)','<input class="form-input" value="3200" style="background:#f8fafc">')
    )}
    ${formRow(
      formField('Action',sel(['Cancel Entire Bill','Amend – Remove Line Item','Amend – Correct Amount']),true),
      formField('Reason',sel(['Wrong Service Billed','Patient Refused Service','Duplicate Entry','Doctor Order Changed','Other'])),
      formField('Authorised By',sel(['Billing Manager','Medical Director','CFO']))
    )}
    <div class="flex gap-3 mt-2"><button class="btn-primary">Generate Credit Note & Cancel</button><button class="btn-outline">Preview Impact</button></div>`) +
  sectionCard('Recent Cancellations & Amendments', table(
    ['Original Bill','Credit Note No.','Patient','Reason','Original Amt','Credit Amt','Approved By','Date'],
    [
      ['RCP-2025-4812','CN-2025-0041','Ratan Lal','Wrong service',fmt(1800),fmt(1800),'Mgr. Kumar','17-May-2025'],
      ['RCP-2025-4799','CN-2025-0038','Geeta Nair','Duplicate entry',fmt(450),fmt(450),'Mgr. Kumar','16-May-2025'],
      ['RCP-2025-4780','CN-2025-0034','Suresh Iyer','Amount correction',fmt(5200),fmt(800),'Dr. Director','14-May-2025'],
    ]
  ));
}

function pageRefDuplicate() {
  return pageHeader('Duplicate Bill & Receipt Reprint',
    `Billing <span>›</span> Refunds & Adjustments <span>›</span> Duplicate Reprint`,
    `<button class="btn-primary">🖨 Print Duplicate</button>`
  ) +
  sectionCard('Search for Original Bill / Receipt', `
    ${formRow(
      formField('Search By',sel(['Receipt No.','UHID','Patient Name','Bill Date'])),
      formField('Search Value','<input class="form-input" value="RCP-2025-4821">'),
      formField('','<div class="mt-5"><button class="btn-primary">Search</button></div>')
    )}`) +
  sectionCard('Bill Found', `
    <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
      <div class="grid grid-cols-4 gap-4">
        <div><div class="text-xs text-slate-500">Receipt No.</div><div class="font-semibold text-sm">RCP-2025-4821</div></div>
        <div><div class="text-xs text-slate-500">Patient</div><div class="font-semibold text-sm">Arvind Kumar (UHID-10031)</div></div>
        <div><div class="text-xs text-slate-500">Amount</div><div class="font-semibold text-sm">${fmt(30000)}</div></div>
        <div><div class="text-xs text-slate-500">Date</div><div class="font-semibold text-sm">16-May-2025</div></div>
      </div>
    </div>
    ${formRow(
      formField('Reason for Reprint',sel(['Lost Original','Damaged Original','Insurance Submission','Patient Request']),true),
      formField('Supervisor Approval','<input class="form-input" value="Mgr. Ravi Kumar">',true),
      formField('','')
    )}
    <div class="border border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 mb-4">
      <div class="text-slate-400 mb-2 font-mono text-4xl font-bold opacity-20">DUPLICATE</div>
      <div class="text-xs text-slate-500">Receipt will be printed with DUPLICATE watermark · Reprint logged in audit trail</div>
    </div>
    <div class="flex gap-3"><button class="btn-primary">🖨 Print with DUPLICATE Watermark</button><button class="btn-outline">Cancel</button></div>`);
}

function pageMISDaily() {
  return pageHeader('Daily Collection & Revenue Report',
    `Billing <span>›</span> MIS & Reporting <span>›</span> Daily Collection`,
    `<button class="btn-outline">⬇ Export Excel</button><button class="btn-outline">🖨 Print</button><button class="btn-primary">Lock Day & Close</button>`
  ) +
  `<div class="bg-white border border-slate-200 rounded-lg px-5 py-3 mb-5 flex items-center gap-4">
    ${formField('Report Date','<input class="form-input" type="date" value="2025-05-19" style="width:160px">')}
    <div class="mt-5"><button class="btn-primary">Generate Report</button></div>
    <div class="ml-auto"><span class="badge badge-yellow">Day Open · Not Locked</span></div>
  </div>` +
  kpiCards([
    {label:'Total Collections', value:fmt(284650), color:'text-blue-700'},
    {label:'Cash', value:fmt(68200), color:'text-green-700'},
    {label:'Card (Debit/Credit)', value:fmt(52400), color:'text-blue-600'},
    {label:'UPI', value:fmt(48600), color:'text-purple-700'},
    {label:'Insurance / TPA', value:fmt(98750), color:'text-orange-700'},
    {label:'Cheque / NEFT', value:fmt(16700), color:'text-slate-700'},
  ]) +
  sectionCard('Cashier-wise Collection Summary', table(
    ['Cashier','Counter','Opening Cash','Collections','Cash Closg.','Card','UPI','Total','Variance'],
    [
      ['Priya Desai','Counter 1',fmt(5000),fmt(42000),fmt(8200),fmt(18500),fmt(21000),fmt(89700),'<span class="text-green-600 font-semibold">Nil</span>'],
      ['Raj Patel','Counter 2',fmt(5000),fmt(38500),fmt(7800),fmt(16200),fmt(14800),fmt(76300),'<span class="text-green-600 font-semibold">Nil</span>'],
      ['Anita Shah','Counter 3',fmt(5000),fmt(29200),fmt(6100),fmt(12400),fmt(9800),fmt(57500),'<span class="text-red-600 font-semibold">₹–200</span>'],
      ['Suresh Nair','IPD Counter',fmt(10000),fmt(48000),fmt(10000),fmt(15300),fmt(3000),fmt(86300),'<span class="text-green-600 font-semibold">Nil</span>'],
    ]
  )) +
  sectionCard('Payment Mode Reconciliation', table(
    ['Mode','System Total (₹)','Physical / Bank (₹)','Variance'],
    [
      ['Cash',fmt(68200),fmt(68000),'<span class="text-red-600">– ₹200 (Anita – Under)</span>'],
      ['Card / POS',fmt(52400),fmt(52400),'<span class="text-green-600">Nil</span>'],
      ['UPI',fmt(48600),fmt(48600),'<span class="text-green-600">Nil</span>'],
      ['Insurance TPA',fmt(98750),'Pending Settlement','<span class="text-yellow-700">Receivable</span>'],
      ['NEFT / Cheque',fmt(16700),fmt(16700),'<span class="text-green-600">Nil</span>'],
    ]
  ));
}

function pageMISAudit() {
  return pageHeader('Billing Audit Trail & Exception Report',
    `Billing <span>›</span> MIS & Reporting <span>›</span> Audit Trail`,
    `<button class="btn-outline">⬇ Export</button><button class="btn-primary">Run Exception Report</button>`
  ) +
  sectionCard('Exception Report — Flagged Transactions', `
    <div class="flex gap-2 mb-4">
      ${['All','High Concession','Repeated Cancellation','Off-hours Transaction','Large Refund'].map((f,i)=>`<button class="btn-${i===0?'primary':'outline'}" style="padding:5px 14px;font-size:12.5px">${f}</button>`).join('')}
    </div>` +
    table(
      ['Flag','Transaction','Patient','Cashier','Amount (₹)','Time','Details'],
      [
        [badge('High Concession','red'),'RCP-2025-4891','Priya Patel','Raj Patel',fmt(8000),'18-May 14:32','30% concession – no approval note'],
        [badge('Off-hours','yellow'),'RCP-2025-4878','Rohit Sharma','Anita Shah',fmt(15200),'17-May 23:18','Transaction at 11 PM'],
        [badge('Repeat Cancel','red'),'RCP-2025-4821','Arvind Kumar','Suresh Nair',fmt(2400),'17-May 16:40','3rd cancellation this week'],
        [badge('Large Refund','yellow'),'REF-2025-0088','Sunita Gupta','Priya Desai',fmt(18500),'16-May 11:20','Refund > ₹10,000'],
      ]
    )) +
  sectionCard('Audit Trail – All Actions', table(
    ['Timestamp','Action','Reference','Patient','By User','IP Address'],
    [
      ['19-May 10:45:22','Bill Generated','RCP-2025-4892','Ramesh Sharma','Priya Desai','192.168.1.42'],
      ['19-May 10:44:11','Payment Collected','RCP-2025-4892','Ramesh Sharma','Priya Desai','192.168.1.42'],
      ['19-May 10:30:05','Refund Approved','REF-2025-0092','Arvind Kumar','Ravi Kumar (Mgr)','192.168.1.10'],
      ['19-May 09:15:48','Pre-auth Submitted','PA-2025-0483','Geeta Nair','Anita Shah','192.168.1.51'],
      ['18-May 23:18:02','Bill Generated','RCP-2025-4878','Rohit Sharma','Anita Shah','192.168.1.51'],
      ['18-May 14:32:17','Concession Applied','RCP-2025-4891','Priya Patel','Raj Patel','192.168.1.44'],
    ]
  ));
}

function pageMISRevenue() {
  return pageHeader('Revenue MIS Dashboard',
    `Billing <span>›</span> MIS & Reporting <span>›</span> Revenue Dashboard`,
    `<button class="btn-outline">⬇ Export PPT</button><button class="btn-outline">⬇ Export Excel</button>`
  ) +
  kpiCards([
    {label:'MTD Revenue', value:fmt(8420000), color:'text-blue-700', sub:'May 2025'},
    {label:'OPD Revenue', value:fmt(1240000), color:'text-green-700', sub:'14.7%'},
    {label:'IPD Revenue', value:fmt(5980000), color:'text-green-700', sub:'71.0%'},
    {label:'Day Care', value:fmt(620000), color:'text-blue-600', sub:'7.4%'},
    {label:'TPA Receivable', value:fmt(1820000), color:'text-purple-700', sub:'Outstanding'},
    {label:'Corporate Receivable', value:fmt(342000), color:'text-orange-700', sub:'Outstanding'},
  ]) +
  `<div class="grid grid-cols-3 gap-5">
  <div class="col-span-2">` +
  sectionCard('Department-wise Revenue (MTD)', `
    <div class="space-y-3">
      ${[
        ['Cardiology',fmt(1820000),68],
        ['Orthopedics',fmt(1240000),46],
        ['General Medicine',fmt(980000),37],
        ['Oncology',fmt(1180000),44],
        ['Neurology',fmt(760000),28],
        ['Gastroenterology',fmt(620000),23],
        ['Radiology',fmt(480000),18],
        ['Laboratory',fmt(340000),13],
      ].map(([dept,amt,pct])=>`
        <div class="flex items-center gap-3">
          <div class="w-36 text-sm text-slate-600">${dept}</div>
          <div class="flex-1 h-3 bg-slate-100 rounded-full"><div class="h-3 bg-blue-500 rounded-full" style="width:${pct}%"></div></div>
          <div class="w-28 text-sm font-semibold text-right">${amt}</div>
        </div>`).join('')}
    </div>`) + `</div>
  <div>` +
  sectionCard('Payer Mix (MTD)', `
    <div class="space-y-4">
      ${[['Cash',fmt(2526000),'30%','#2563eb',30],['TPA / Insurance',fmt(3368000),'40%','#7c3aed',40],['Corporate',fmt(1263000),'15%','#16a34a',15],['Govt Scheme',fmt(842000),'10%','#d97706',10],['Self Pay (Card/UPI)',fmt(421000),'5%','#0891b2',5]].map(([l,a,p,c,w])=>`
        <div>
          <div class="flex justify-between text-xs mb-1"><span class="text-slate-600">${l}</span><span class="font-bold">${p}</span></div>
          <div class="h-3 bg-slate-100 rounded-full"><div class="h-3 rounded-full" style="width:${w*2}%;background:${c}"></div></div>
          <div class="text-xs text-slate-500 mt-0.5">${a}</div>
        </div>`).join('')}
    </div>`) + `</div></div>` +
  sectionCard('Advance & TPA Outstanding', table(
    ['Category','Count','Amount (₹)','Oldest (Days)','Action'],
    [
      ['IPD Advance Outstanding','12 patients',fmt(285000),'—','<button class="btn-outline" style="padding:4px 10px;font-size:12px">View</button>'],
      ['TPA Claims Pending Settlement','8 claims',fmt(1280000),'22 days','<button class="btn-outline" style="padding:4px 10px;font-size:12px">Follow-up</button>'],
      ['Corporate Invoices Pending','3 invoices',fmt(342000),'18 days','<button class="btn-outline" style="padding:4px 10px;font-size:12px">View</button>'],
      ['CGHS Claims Pending','4 claims',fmt(284000),'35 days','<button class="btn-outline" style="padding:4px 10px;font-size:12px">Escalate</button>'],
    ]
  ));
}

function pageMISLeakage() {
  return pageHeader('Revenue Leakage Detection Report',
    `Billing <span>›</span> MIS & Reporting <span>›</span> Revenue Leakage`,
    `<button class="btn-outline">⬇ Export</button><button class="btn-primary">Run Leakage Scan</button>`
  ) +
  kpiCards([
    {label:'Total Leakage Detected', value:fmt(84200), color:'text-red-700', sub:'Last 7 days'},
    {label:'Unbilled Services', value:'23 items', color:'text-red-600'},
    {label:'Pharmacy Unbilled', value:fmt(28400), color:'text-orange-700'},
    {label:'Consultant Unposted', value:fmt(21000), color:'text-yellow-700'},
  ]) +
  sectionCard('Identified Revenue Leakage', table(
    ['#','UHID','Patient','Leakage Type','Service / Item','Dept','Est. Amount (₹)','Action'],
    [
      ['1','UHID-10031','Arvind Kumar','Service Rendered – Not Billed','Echo Cardiography','Cardiology',fmt(2500),'<button class="btn-primary" style="padding:4px 10px;font-size:12px">Bill Now</button>'],
      ['2','UHID-10038','Priya Patel','Pharmacy Issue – Not Billed','Clopidogrel 75mg × 10','Pharmacy',fmt(380),'<button class="btn-primary" style="padding:4px 10px;font-size:12px">Bill Now</button>'],
      ['3','UHID-10022','Mohammed Ismail','Consultant Visit Not Posted','Dr. Shah Visit – 18-May','GM',fmt(1000),'<button class="btn-primary" style="padding:4px 10px;font-size:12px">Post Now</button>'],
      ['4','UHID-10055','Sunita Gupta','Lab Report – No Bill','Tumour Marker CA-125','Lab',fmt(1800),'<button class="btn-primary" style="padding:4px 10px;font-size:12px">Bill Now</button>'],
      ['5','UHID-10072','Vikram Mehta','Procedure Not Billed','Wound Dressing × 3','Surgery',fmt(900),'<button class="btn-primary" style="padding:4px 10px;font-size:12px">Bill Now</button>'],
      ['6','UHID-10081','Kavya Reddy','Pharmacy Issue – Not Billed','Insulin Glargine 5 vials','Pharmacy',fmt(4200),'<button class="btn-primary" style="padding:4px 10px;font-size:12px">Bill Now</button>'],
    ]
  ));
}

function pageCompGST() {
  return pageHeader('GST Return & E-invoicing Compliance',
    `Billing <span>›</span> Compliance <span>›</span> GST & E-invoicing`,
    `<button class="btn-outline">⬇ Export GSTR-1</button><button class="btn-outline">⬇ Export GSTR-3B</button><button class="btn-primary">Generate E-invoices</button>`
  ) +
  kpiCards([
    {label:'Taxable Invoices (Month)', value:'248', color:'text-blue-700'},
    {label:'Total Taxable Value', value:fmt(2840000), color:'text-slate-800'},
    {label:'Total GST Collected', value:fmt(142000), color:'text-green-700'},
    {label:'E-invoices Generated', value:'142', color:'text-blue-600'},
    {label:'IRN Pending', value:'18', color:'text-yellow-700'},
    {label:'Cancelled E-invoices', value:'4', color:'text-red-600'},
  ]) +
  sectionCard('GST-wise Summary', table(
    ['HSN / SAC Code','Service Description','Taxable Amt (₹)','GST Rate','CGST (₹)','SGST (₹)','Total GST (₹)'],
    [
      ['998213','Diagnostic Testing Services',fmt(420000),'5%',fmt(10500),fmt(10500),fmt(21000)],
      ['998214','Radiology & Imaging Services',fmt(280000),'5%',fmt(7000),fmt(7000),fmt(14000)],
      ['998219','Medical Procedure Charges',fmt(840000),'5%',fmt(21000),fmt(21000),fmt(42000)],
      ['998215','Medicines Sold (Pharmacy)',fmt(1300000),'5–12%',fmt(32500),fmt(32500),fmt(65000)],
      ['999311','Healthcare Consultation','Exempt','0%','–','–','–'],
    ]
  )) +
  sectionCard('E-invoicing Status', table(
    ['Invoice No.','Patient / Entity','Date','Amount (₹)','IRN','QR Code','Status'],
    [
      ['INV-2025-1082','Adani Group (Corporate)','19-May-2025',fmt(84200),'IRN-8829...','✓',badge('Generated','green')],
      ['INV-2025-1081','Reliance Ind. (Corporate)','18-May-2025',fmt(42600),'IRN-8821...','✓',badge('Generated','green')],
      ['INV-2025-1080','GSTIN: 24AAACA...','17-May-2025',fmt(12400),'Pending','–',badge('Pending IRN','yellow')],
      ['INV-2025-1079','Star Health Insurance','16-May-2025',fmt(36900),'IRN-8810...','✓',badge('Generated','green')],
    ]
  ));
}

