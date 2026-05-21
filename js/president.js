/* ════════════════════════════════
   PRESIDENT TAB — js/president.js
════════════════════════════════ */

const CAT_ICONS = {
  Maintenance:'ti-tool', Water:'ti-droplet', Electricity:'ti-bolt',
  Security:'ti-shield', Cleaning:'ti-vacuum-cleaner', Lift:'ti-elevator',
  Gardening:'ti-plant', Painting:'ti-paint', Internet:'ti-wifi',
  Parking:'ti-parking', Other:'ti-clipboard',
};
const CAT_COLORS = [
  '#6366F1','#10B981','#F59E0B','#EF4444','#0EA5E9',
  '#8B5CF6','#EC4899','#14B8A6','#F97316','#84CC16'
];

function inr(n){ return '₹'+(n||0).toLocaleString('en-IN'); }
function catIcon(c){ return CAT_ICONS[c]||'ti-clipboard'; }
function catColor(i){ return CAT_COLORS[i%CAT_COLORS.length]; }

/* ══════════════════════════════
   MAIN RENDER
══════════════════════════════ */
export function rPresident(){
  const { president:pres, socExps, flats, exps:flatExps, AM } = window.APP;

  /* — Banner — */
  if(!pres||!pres.name){
    document.getElementById('presBanner').innerHTML=`
      <div class="pres-empty">
        <i class="ti ti-crown"></i>
        <div style="font-size:15px;font-weight:800;color:var(--text);margin-bottom:6px">No President Elected</div>
        <div style="font-size:13px;margin-bottom:16px">Elect a flat member to manage society expenses.</div>
        <button class="btn btn-indigo" onclick="window._oPresM()"><i class="ti ti-crown"></i> Elect President</button>
      </div>`;
  } else {
    const ini = (pres.name||'P').charAt(0).toUpperCase();
    const since = pres.termStart ? `Since ${new Date(pres.termStart).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}` : '';
    document.getElementById('presBanner').innerHTML=`
      <div class="pres-banner">
        <div class="pres-info">
          <div class="pres-avatar">${ini}</div>
          <div>
            <div style="font-size:10px;opacity:.7;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">🏆 Current President</div>
            <div class="pres-name">${pres.name}</div>
            <div class="pres-flat">Flat ${pres.flatId}${pres.phone?' · '+pres.phone:''}</div>
            ${since?`<div style="font-size:10px;opacity:.7;margin-top:2px">${since}</div>`:''}
          </div>
        </div>
        <button class="btn" style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)" onclick="window._oPresM()">
          <i class="ti ti-edit"></i> Change
        </button>
      </div>`;
  }

  /* — Build combined history: all flat payments + society expenses — */
  const allFlats = [...flats.values()].filter(f=>f.month===AM);

  // Flat payments: collect all individual expense records
  const payRows = [];
  allFlats.forEach(f=>{
    const ex = flatExps.get ? flatExps.get(f.flatId)||[] : [];
    ex.forEach(e=>{
      payRows.push({
        _type   : 'payment',
        id      : e.expId||e.id,
        title   : `Flat ${f.flatId}` + (f.owner ? ` — ${f.owner}`:''),
        cat     : e.cat||'Maintenance',
        amt     : e.amt||0,
        month   : e.month||e.date?.slice(0,7)||AM,
        date    : e.date||e.month||'',
        status  : e.status||'paid',
        note    : e.note||'',
        flatId  : f.flatId,
      });
    });
  });

  // Society expenses
  const expRows = socExps.map(e=>({
    _type   : 'expense',
    id      : e.id,
    title   : e.title||e.cat,
    cat     : e.cat||'Other',
    amt     : e.amt||0,
    month   : e.month||'',
    date    : e.date||e.month||'',
    status  : e.status||'pending',
    paidBy  : e.paidBy||'',
    vendor  : e.vendor||'',
    note    : e.note||'',
  }));

  const combined = [...payRows, ...expRows]
    .sort((a,b)=>(b.month||'').localeCompare(a.month||''));

  /* — Summary cards — */
  const totalSocExp   = socExps.reduce((s,e)=>s+e.amt,0);
  const totalPayments = payRows.reduce((s,e)=>s+e.amt,0);
  const thisMonthExp  = socExps.filter(e=>e.month===AM).reduce((s,e)=>s+e.amt,0);
  const totalFlats    = allFlats.length;

  document.getElementById('fundRow').innerHTML=`
    <div class="fcard2"><div class="fcard2-label">Society Expenses</div><div class="fcard2-val" style="color:var(--red)">${inr(totalSocExp)}</div><div class="fcard2-sub">${socExps.length} records</div></div>
    <div class="fcard2"><div class="fcard2-label">Flat Payments</div><div class="fcard2-val" style="color:var(--green)">${inr(totalPayments)}</div><div class="fcard2-sub">${payRows.length} records</div></div>
    <div class="fcard2"><div class="fcard2-label">This Month Exp</div><div class="fcard2-val">${inr(thisMonthExp)}</div><div class="fcard2-sub">${AM}</div></div>
    <div class="fcard2"><div class="fcard2-label">Net (Paid − Spent)</div>
      <div class="fcard2-val" style="color:${totalPayments-totalSocExp>=0?'var(--green)':'var(--red)'}">${inr(Math.abs(totalPayments-totalSocExp))}</div>
      <div class="fcard2-sub">${totalPayments>=totalSocExp?'Surplus':'Deficit'}</div></div>`;

  /* — Category breakdown — */
  rCatBreakdown(combined);

  /* — Populate filter dropdowns — */
  const allMonths = [...new Set(combined.map(r=>r.month).filter(Boolean))].sort().reverse();
  const allCats   = [...new Set(combined.map(r=>r.cat).filter(Boolean))].sort();
  const mSel = document.getElementById('histMonthFilter');
  const cSel = document.getElementById('histCatFilter');
  if(mSel){
    const curM = mSel.value;
    mSel.innerHTML = `<option value="all">All months</option>`
      + allMonths.map(m=>`<option value="${m}"${m===curM?' selected':''}>${m}</option>`).join('');
  }
  if(cSel){
    const curC = cSel.value;
    cSel.innerHTML = `<option value="all">All categories</option>`
      + allCats.map(c=>`<option value="${c}"${c===curC?' selected':''}>${c}</option>`).join('');
  }

  /* — Filter & render list — */
  const tf = document.getElementById('histTypeFilter')?.value||'all';
  const mf = mSel?.value||'all';
  const cf = cSel?.value||'all';

  const vis = combined.filter(r=>{
    if(tf!=='all' && r._type!==tf) return false;
    if(mf!=='all' && r.month!==mf) return false;
    if(cf!=='all' && r.cat!==cf)   return false;
    return true;
  });

  const visTotal = vis.reduce((s,r)=>s+r.amt,0);
  const totEl = document.getElementById('histTotal');
  if(totEl) totEl.innerHTML = `<span style="color:var(--text)">${vis.length} records</span> &nbsp;·&nbsp; Total: <strong style="color:var(--indigo)">${inr(visTotal)}</strong>`;

  if(!vis.length){
    document.getElementById('presExpList').innerHTML=`
      <div class="exp-empty"><i class="ti ti-filter-off"></i>No records match this filter.</div>`;
    return;
  }

  document.getElementById('presExpList').innerHTML = vis.map(r=>{
    const clrIdx = allCats.indexOf(r.cat);
    const clr    = catColor(clrIdx>=0?clrIdx:0);
    const icon   = catIcon(r.cat);
    const typeBadge = r._type==='payment'
      ? `<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:99px;background:var(--green-bg);color:var(--green);border:1px solid rgba(16,185,129,.3)">PAYMENT</span>`
      : `<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:99px;background:var(--red-bg);color:var(--red);border:1px solid rgba(239,68,68,.3)">EXPENSE</span>`;

    const statusBadge = r._type==='expense' ? `
      <select style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;border:1.5px solid var(--border2);background:#fff;font-family:var(--font);outline:none;cursor:pointer"
        onchange="window._updSEStatus('${r.id}',this.value)">
        ${['pending','approved','rejected'].map(s=>`<option value="${s}"${r.status===s?' selected':''}>${{pending:'⏳ Pending',approved:'✅ Approved',rejected:'❌ Rejected'}[s]}</option>`).join('')}
      </select>` : `<span style="font-size:10px;font-weight:700;color:var(--green)">💰 Paid</span>`;

    const deleteBtn = r._type==='expense'
      ? `<button class="btn btn-white btn-sm" onclick="window._delSE('${r.id}')" style="padding:5px 8px;min-width:0">
           <i class="ti ti-trash" style="margin:0;color:var(--red)"></i>
         </button>`
      : '';

    return `<div class="exp-row">
      <div class="exp-row-icon" style="background:${clr}18;color:${clr}"><i class="ti ${icon}"></i></div>
      <div style="flex:1;min-width:0">
        <div class="exp-row-cat">${r.title}</div>
        <div class="exp-row-date" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px">
          ${typeBadge}
          <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;background:${clr}18;color:${clr}">${r.cat}</span>
          ${r.date?`<span style="font-size:10px;color:var(--muted)">${r.date}</span>`:''}
          ${r.paidBy?`<span style="font-size:10px;color:var(--text2)">By: ${r.paidBy}</span>`:''}
          ${r.vendor?`<span style="font-size:10px;color:var(--muted)">${r.vendor}</span>`:''}
        </div>
        ${r.note?`<div class="exp-row-note">${r.note}</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:5px">
        <div class="exp-row-amt">${inr(r.amt)}</div>
        ${statusBadge}
      </div>
      ${deleteBtn}
    </div>`;
  }).join('');
}

/* ══════════════════════════════
   CATEGORY BREAKDOWN CHART
══════════════════════════════ */
function rCatBreakdown(combined){
  const el = document.getElementById('catSummary');
  if(!el) return;
  if(!combined.length){ el.innerHTML=''; return; }

  // Group by category
  const catMap={};
  combined.forEach(r=>{ catMap[r.cat]=(catMap[r.cat]||{total:0,count:0,payments:0,expenses:0}); catMap[r.cat].total+=r.amt; catMap[r.cat].count++; if(r._type==='payment') catMap[r.cat].payments+=r.amt; else catMap[r.cat].expenses+=r.amt; });
  const cats = Object.entries(catMap).sort((a,b)=>b[1].total-a[1].total);
  const grandTotal = cats.reduce((s,[,v])=>s+v.total,0)||1;
  const maxAmt = cats[0]?.[1].total||1;

  /* Horizontal bar chart SVG */
  const W=540, barH=20, gap=6, padL=96, padR=90, padT=8;
  const chartH = cats.length*(barH+gap)+padT+6;

  const svgRows = cats.map(([cat,v],i)=>{
    const clr = catColor(i);
    const bw  = Math.max(2, Math.round(v.total/maxAmt*(W-padL-padR)));
    const y   = padT + i*(barH+gap);
    const pct = Math.round(v.total/grandTotal*100);
    return `
      <text x="${padL-8}" y="${y+barH*.65}" text-anchor="end" font-size="11" font-weight="700" fill="#666" font-family="Plus Jakarta Sans,sans-serif">${cat.slice(0,11)}</text>
      <rect x="${padL}" y="${y}" width="${bw}" height="${barH}" rx="4" fill="${clr}" opacity=".85"/>
      <text x="${padL+bw+6}" y="${y+barH*.65}" font-size="11" font-weight="700" fill="${clr}" font-family="Plus Jakarta Sans,sans-serif">${inr(v.total)} · ${pct}%</text>`;
  }).join('');

  /* Category chips */
  const chips = cats.map(([cat,v],i)=>{
    const clr  = catColor(i);
    const icon = catIcon(cat);
    const pct  = Math.round(v.total/grandTotal*100);
    return `<div style="background:#fff;border:1.5px solid ${clr}30;border-radius:var(--r-lg);padding:10px 12px;min-width:160px;flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:28px;height:28px;border-radius:8px;background:${clr}18;color:${clr};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0"><i class="ti ${icon}"></i></div>
        <div style="min-width:0">
          <div style="font-size:12px;font-weight:800;color:var(--text)">${cat}</div>
          <div style="font-size:10px;color:var(--text2)">${v.count} records · ${pct}%</div>
        </div>
        <div style="margin-left:auto;font-size:13px;font-weight:800;color:${clr};white-space:nowrap">${inr(v.total)}</div>
      </div>
      <div style="height:5px;background:var(--bg2);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${clr};border-radius:99px"></div>
      </div>
      ${v.payments&&v.expenses?`<div style="font-size:9px;color:var(--muted);margin-top:4px">Pay: ${inr(v.payments)} · Exp: ${inr(v.expenses)}</div>`:''}
    </div>`;
  }).join('');

  el.innerHTML=`
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">
        <i class="ti ti-chart-bar" style="color:var(--indigo)"></i> Category Breakdown
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${chips}</div>
      <div style="background:var(--surface2);border:1.5px solid var(--border2);border-radius:var(--r-lg);padding:12px 8px;overflow:hidden">
        <svg viewBox="0 0 ${W} ${chartH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">${svgRows}</svg>
      </div>
    </div>`;
}

/* ══════════════════════════════
   PRESIDENT MODAL
══════════════════════════════ */
export function oPresM(){
  const { flats, president:pres, AM } = window.APP;
  document.getElementById('presFlat').innerHTML=[...flats.values()]
    .filter(f=>f.month===AM&&(f.owner||'').trim())
    .map(f=>`<option value="${f.flatId}"${pres&&pres.flatId===f.flatId?' selected':''}>${f.flatId} — ${f.owner}</option>`)
    .join('');
  document.getElementById('presName').value      = pres?.name||'';
  document.getElementById('presStart').value     = pres?.termStart||new Date().toISOString().split('T')[0];
  document.getElementById('presEnd').value       = pres?.termEnd||'';
  document.getElementById('presPhone').value     = pres?.phone||'';
  document.getElementById('presSaveBtn').disabled        = false;
  document.getElementById('presSaveLbl').textContent     = 'Elect President';
  document.getElementById('presM').classList.add('open');
}
export function cPresM(){ document.getElementById('presM').classList.remove('open'); }
export async function sPres(){
  const { sync, toast, db, UID } = window.APP;
  const flatId=document.getElementById('presFlat').value;
  const name=document.getElementById('presName').value.trim();
  const termStart=document.getElementById('presStart').value;
  const termEnd=document.getElementById('presEnd').value;
  const phone=document.getElementById('presPhone').value.trim();
  if(!name){ toast('Enter president name.','error'); return; }
  document.getElementById('presSaveBtn').disabled=true;
  document.getElementById('presSaveLbl').textContent='Saving…';
  sync('saving');
  try{
    const {setDoc,doc}=await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await setDoc(doc(db,'apartments',UID),{president:{flatId,name,termStart,termEnd,phone,updatedAt:new Date().toISOString()}},{merge:true});
    window.APP.president={flatId,name,termStart,termEnd,phone};
    sync('live'); cPresM(); toast('President elected ✓'); rPresident();
  }catch(e){ console.error(e); sync('error'); toast('Save failed: '+e.message,'error'); }
  finally{ document.getElementById('presSaveBtn').disabled=false; document.getElementById('presSaveLbl').textContent='Elect President'; }
}

/* ══════════════════════════════
   ADD EXPENSE MODAL
══════════════════════════════ */
export function oPresExp(){
  try{
    ['peTitle','peAmt','pePaidBy','peVendor','peNote'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
    const dateEl=document.getElementById('peDate');
    if(dateEl) dateEl.value=new Date().toISOString().split('T')[0];

    // Fill category dropdown
    const cats=(window.APP?.categories?.length?window.APP.categories
      :['Maintenance','Water','Electricity','Parking','Lift','Security','Cleaning','Other']);
    const oldSel=document.getElementById('peCat');
    if(oldSel){
      const lastVal=oldSel.dataset?.lastCat||cats[0];
      // Clone to strip stale listeners
      const newSel=oldSel.cloneNode(false);
      newSel.innerHTML=cats.map(c=>`<option value="${c}"${c===lastVal?' selected':''}>${c}</option>`).join('')
        +`<option value="__manage__">⚙ Manage Categories…</option>`;
      newSel.dataset.lastCat=lastVal;
      newSel.addEventListener('change',function(e){
        if(e.target.value==='__manage__'){ e.target.value=e.target.dataset.lastCat||cats[0]; if(window._openCatManager)window._openCatManager(); }
        else e.target.dataset.lastCat=e.target.value;
      });
      oldSel.parentNode.replaceChild(newSel,oldSel);
    }

    const btn=document.getElementById('peBtn');
    const lbl=document.getElementById('peLbl');
    if(btn){ btn.disabled=false; }
    if(lbl) lbl.textContent='Save Expense';
    document.getElementById('presExpM').classList.add('open');
  }catch(err){ console.error('oPresExp error:',err); alert('Error opening modal: '+err.message); }
}
export function cPresExp(){ document.getElementById('presExpM').classList.remove('open'); }
export async function sPresExp(){
  const { sexpColl, sync, toast, president } = window.APP;
  if(typeof sexpColl!=='function'){ toast('Setup error: sexpColl missing','error'); console.error('sexpColl not in window.APP'); return; }
  const title=(document.getElementById('peTitle')?.value||'').trim();
  const catEl=document.getElementById('peCat');
  const cat=catEl?.value||'Other';
  const amt=parseInt(document.getElementById('peAmt')?.value)||0;
  const date=document.getElementById('peDate')?.value||new Date().toISOString().split('T')[0];
  const paidBy=(document.getElementById('pePaidBy')?.value||'').trim()||president?.name||'Committee';
  const vendor=(document.getElementById('peVendor')?.value||'').trim();
  const note=(document.getElementById('peNote')?.value||'').trim();
  if(!title){ toast('Enter expense title.','error'); return; }
  if(!amt)  { toast('Enter amount > 0.','error'); return; }
  if(cat==='__manage__'){ toast('Select a valid category.','error'); return; }
  const btn=document.getElementById('peBtn');
  const lbl=document.getElementById('peLbl');
  if(btn) btn.disabled=true;
  if(lbl) lbl.textContent='Saving…';
  sync('saving');
  try{
    const {addDoc,serverTimestamp}=await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    const d=new Date(date), mth=d.toISOString().slice(0,7);
    await addDoc(sexpColl(),{title,cat,amt,date:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),month:mth,paidBy,vendor,note,status:'pending',createdAt:serverTimestamp()});
    sync('live'); cPresExp(); toast('Expense saved ✓');
  }catch(e){ console.error('sPresExp:',e); sync('error'); toast('Save failed: '+(e.code||e.message),'error'); }
  finally{ if(btn) btn.disabled=false; if(lbl) lbl.textContent='Save Expense'; }
}

/* ══════════════════════════════
   STATUS + DELETE
══════════════════════════════ */
export async function updSEStatus(id,status){
  const {sexpRef,sync,toast}=window.APP;
  sync('saving');
  try{
    const {updateDoc}=await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await updateDoc(sexpRef(id),{status}); sync('live'); toast('Status updated ✓');
  }catch(e){ console.error(e); sync('error'); toast('Update failed.','error'); }
}
export async function delSE(id){
  const {sexpRef,sync,toast}=window.APP;
  if(!confirm('Delete this expense?')) return;
  sync('saving');
  try{
    const {deleteDoc}=await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await deleteDoc(sexpRef(id)); sync('live'); toast('Expense deleted ✓');
  }catch(e){ console.error(e); sync('error'); toast('Delete failed.','error'); }
}
export { oPresExp as oAddSocExp };
