// ─── HIS DEMO — SHARED HELPERS ──────────────────────────────────────────────
// ─── TAB HELPER ─────────────────────────────────────────────────────────────
function showTab(g, id) {
  document.querySelectorAll('[data-tg="'+g+'"]').forEach(el => {
    el.style.color='#64748b'; el.style.borderBottom='2px solid transparent'; el.style.fontWeight='500';
  });
  document.querySelectorAll('[data-tp="'+g+'"]').forEach(el => el.style.display='none');
  var ah = document.querySelector('[data-tg="'+g+'"][data-tid="'+id+'"]');
  if(ah){ ah.style.color='#2563eb'; ah.style.borderBottom='2px solid #2563eb'; ah.style.fontWeight='600'; }
  var ap = document.querySelector('[data-tp="'+g+'"][data-pid="'+id+'"]');
  if(ap) ap.style.display='block';
}

// ─── UTILITIES ──────────────────────────────────────────────────────────────
const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
const fmtN = n => Number(n).toLocaleString('en-IN');

function badge(text, color='gray') {
  return `<span class="badge badge-${color}">${text}</span>`;
}

function stepBar(steps) {
  return `<div class="flex items-center gap-0 my-4">` + steps.map((s, i) => `
    <div class="flex flex-col items-center" style="min-width:110px">
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${s.status==='done'?'step-done':s.status==='active'?'step-active':'step-pending'}">
        ${s.status==='done'?'✓':i+1}
      </div>
      <div class="text-[11.5px] font-semibold mt-1 text-center ${s.status==='done'?'text-blue-600':s.status==='active'?'text-blue-600':'text-slate-400'}">${s.label}</div>
      <div class="text-[10.5px] mt-0.5 ${s.status==='done'?'text-green-600':s.status==='active'?'text-blue-500':'text-slate-400'}">${s.status==='done'?'Completed':s.status==='active'?'In Progress':'Pending'}</div>
    </div>
    ${i<steps.length-1?`<div class="flex-1 h-0.5 mb-6 ${s.status==='done'?'step-line-done':'step-line-pending'}"></div>`:''}
  `).join('') + `</div>`;
}

function kpiCards(cards) {
  return `<div class="grid gap-4 mb-6" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">` +
    cards.map(c => `
      <div class="kpi-card">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">${c.label}</div>
        <div class="text-xl font-bold ${c.color||'text-slate-800'}">${c.value}</div>
        ${c.sub?`<div class="text-xs text-slate-400 mt-0.5">${c.sub}</div>`:''}
      </div>`).join('') + `</div>`;
}

function pageHeader(title, breadcrumb, btns='') {
  return `
    <div class="flex items-start justify-between mb-5">
      <div>
        <div class="breadcrumb mb-1">${breadcrumb}</div>
        <div class="page-title">${title}</div>
      </div>
      <div class="flex gap-2 items-center mt-1">${btns}</div>
    </div>`;
}

function table(cols, rows, emptyMsg='No records found') {
  return `<div class="overflow-x-auto"><table class="w-full border-collapse">
    <thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}" class="text-center py-8 text-slate-400">${emptyMsg}</td></tr>`}</tbody>
  </table></div>`;
}

function formRow(...fields) {
  return `<div class="grid gap-4 mb-4" style="grid-template-columns:repeat(${fields.length},1fr)">${fields.join('')}</div>`;
}

function formField(label, html, req=false) {
  return `<div><label class="form-label">${label}${req?'<span class="required"> *</span>':''}</label>${html}</div>`;
}

function inp(ph='', val='') { return `<input class="form-input" placeholder="${ph}" value="${val}">`; }
function sel(opts) { return `<select class="form-select">${opts.map(o=>`<option>${o}</option>`).join('')}</select>`; }

function sectionCard(title, content, headerRight='') {
  return `<div class="card mb-5">
    <div class="flex items-center justify-between px-5 py-3 border-b border-slate-100">
      <div class="section-title">${title}</div>
      <div>${headerRight}</div>
    </div>
    <div class="p-5">${content}</div>
  </div>`;
}
