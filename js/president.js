/* --- president.js — president chip, society expenses, category breakdown ==== */
import { db } from './firebase.js';
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

function rPresident() {
  /* ── President chip (compact) ── */
  const pres = president;
  if (!pres || !pres.name) {
    document.getElementById('presBanner').innerHTML = `
      <div class="pres-empty">
        <i class="ti ti-crown"></i>
        <div>
          <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:4px">No President Elected</div>
          <div style="font-size:12px;margin-bottom:10px">Elect a flat member to manage society expenses.</div>
          <button class="btn btn-indigo btn-sm" onclick="window._oPresM()"><i class="ti ti-crown"></i> Elect President</button>
        </div>
      </div>`;
  } else {
    const ini   = (pres.name||'P').charAt(0).toUpperCase();
    const since = pres.termStart ? new Date(pres.termStart).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '';
    document.getElementById('presBanner').innerHTML = `
      <div class="pres-chip">
        <div class="pres-chip-av">${ini}</div>
        <div>
          <div class="pres-chip-label">🏆 President</div>
          <div class="pres-chip-name">${pres.name}</div>
          <div class="pres-chip-flat">Flat ${pres.flatId}${pres.phone?' · '+pres.phone:''}${since?' · Since '+since:''}</div>
        </div>
        <button class="pres-chip-edit" onclick="window._oPresM()" title="Change president">
          <i class="ti ti-pencil"></i>
        </button>
      </div>`;
  }

  /* ── Society expenses only ── */
  const totalExp      = socExps.reduce((s,e)=>s+(e.amt||0),0);
  const approved      = socExps.filter(e=>e.status==='approved').reduce((s,e)=>s+(e.amt||0),0);
  const pending       = socExps.filter(e=>e.status==='pending').reduce((s,e)=>s+(e.amt||0),0);
  const thisMonthExp  = socExps.filter(e=>e.month===AM).reduce((s,e)=>s+(e.amt||0),0);

  document.getElementById('fundRow').innerHTML = `
    <div class="fcard2"><div class="fcard2-label">Total Expenses</div><div class="fcard2-val" style="color:var(--red)">${inr(totalExp)}</div><div class="fcard2-sub">${socExps.length} records</div></div>
    <div class="fcard2"><div class="fcard2-label">Approved</div><div class="fcard2-val" style="color:var(--green)">${inr(approved)}</div><div class="fcard2-sub">${socExps.filter(e=>e.status==='approved').length} records</div></div>
    <div class="fcard2"><div class="fcard2-label">Pending</div><div class="fcard2-val" style="color:var(--amber)">${inr(pending)}</div><div class="fcard2-sub">${socExps.filter(e=>e.status==='pending').length} records</div></div>
    <div class="fcard2"><div class="fcard2-label">This Month</div><div class="fcard2-val">${inr(thisMonthExp)}</div><div class="fcard2-sub">${AM}</div></div>`;

  /* ── Category breakdown (expenses only) ── */
  const CAT_ICONS  = {Maintenance:'ti-tool',Water:'ti-droplet',Electricity:'ti-bolt',Security:'ti-shield',Cleaning:'ti-vacuum-cleaner',Lift:'ti-elevator',Gardening:'ti-plant',Painting:'ti-paint',Internet:'ti-wifi',Parking:'ti-parking',Other:'ti-clipboard'};
  const CAT_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#0EA5E9','#8B5CF6','#EC4899','#14B8A6','#F97316','#84CC16'];
  const catIcon = c => CAT_ICONS[c]||'ti-clipboard';
  const catClr  = i => CAT_COLORS[i%CAT_COLORS.length];

  const catMap = {};
  socExps.forEach(e => {
    if (!catMap[e.cat]) catMap[e.cat] = { total:0, count:0 };
    catMap[e.cat].total += (e.amt||0);
    catMap[e.cat].count++;
  });
  const cats       = Object.entries(catMap).sort((a,b)=>b[1].total-a[1].total);
  const grandTotal = cats.reduce((s,[,v])=>s+v.total,0)||1;
  const maxAmt     = cats[0]?.[1].total||1;

  const catEl = document.getElementById('catSummary');
  if (catEl && cats.length) {
    /* Vertical bar chart */
    const n=cats.length, W=520, H=150, padL=32, padR=12, padT=8, padB=38;
    const chartW=W-padL-padR, chartH=H-padT-padB;
    const barW=Math.max(16,Math.min(44,chartW/n-6));
    const gap=(chartW-n*barW)/(n+1);
    let svg='';
    for(let i=0;i<=4;i++){
      const yv=(maxAmt/4)*i, y=padT+chartH-(yv/maxAmt)*chartH;
      const lbl=yv>=1000?'₹'+(yv/1000).toFixed(0)+'k':yv>0?'₹'+Math.round(yv):'0';
      svg+=`<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="#E5E7EB" stroke-width="1"/>`;
      svg+=`<text x="${padL-4}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="8" fill="#A5A8D0" font-family="Plus Jakarta Sans,sans-serif">${lbl}</text>`;
    }
    cats.forEach(([cat,v],i)=>{
      const clr=catClr(i), bh=Math.max(3,(v.total/maxAmt)*chartH);
      const bx=padL+gap+i*(barW+gap), by=padT+chartH-bh, lx=bx+barW/2;
      const pct=Math.round(v.total/grandTotal*100);
      svg+=`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW}" height="${bh.toFixed(1)}" rx="${Math.min(4,barW/2)}" fill="${clr}" opacity=".88"><title>${cat}: ${inr(v.total)} (${pct}%)</title></rect>`;
      if(barW>=22) svg+=`<text x="${lx.toFixed(1)}" y="${(by-3).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" fill="${clr}" font-family="Plus Jakarta Sans,sans-serif">₹${v.total>=1000?(v.total/1000).toFixed(0)+'k':v.total}</text>`;
      const shortCat=cat.length>8?cat.slice(0,7)+'.':cat;
      svg+=`<text x="${lx.toFixed(1)}" y="${(H-padB+14).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="#6B7280" font-family="Plus Jakarta Sans,sans-serif">${shortCat}</text>`;
      svg+=`<text x="${lx.toFixed(1)}" y="${(H-padB+25).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#A5A8D0" font-family="Plus Jakarta Sans,sans-serif">${pct}%</text>`;
    });
    const chips=cats.map(([cat,v],i)=>{
      const clr=catClr(i),icon=catIcon(cat),pct=Math.round(v.total/grandTotal*100);
      return `<div style="background:#fff;border:1.5px solid ${clr}30;border-radius:var(--r-md);padding:8px 10px;display:flex;align-items:center;gap:8px">
        <div style="width:24px;height:24px;border-radius:7px;background:${clr}18;color:${clr};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0"><i class="ti ${icon}"></i></div>
        <div style="min-width:0;flex:1"><div style="font-size:11px;font-weight:800;color:var(--text)">${cat}</div><div style="font-size:9px;color:var(--text2)">${v.count} record${v.count!==1?'s':''} · ${pct}%</div></div>
        <div style="font-size:12px;font-weight:800;color:${clr};white-space:nowrap">${inr(v.total)}</div>
      </div>`;
    }).join('');
    catEl.innerHTML=`
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <i class="ti ti-chart-bar" style="color:var(--indigo)"></i> By Category
        </div>
        <div class="cat-summary-grid" style="margin-bottom:10px">${chips}</div>
        <div style="background:var(--surface2);border:1.5px solid var(--border2);border-radius:var(--r-lg);padding:10px 6px;overflow:hidden">
          <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">${svg}</svg>
        </div>
      </div>`;
  } else if (catEl) {
    catEl.innerHTML = '';
  }

  /* ── Filter dropdowns ── */
  const allMonths   = [...new Set(socExps.map(e=>e.month).filter(Boolean))].sort().reverse();
  const allCatNames = [...new Set(socExps.map(e=>e.cat).filter(Boolean))].sort();
  const mSel = document.getElementById('histMonthFilter');
  const cSel = document.getElementById('histCatFilter');
  if (mSel) { const cur=mSel.value; mSel.innerHTML=`<option value="all">All months</option>`+allMonths.map(m=>`<option value="${m}"${m===cur?' selected':''}>${m}</option>`).join(''); }
  if (cSel) { const cur=cSel.value; cSel.innerHTML=`<option value="all">All categories</option>`+allCatNames.map(c=>`<option value="${c}"${c===cur?' selected':''}>${c}</option>`).join(''); }

  /* ── Filter + render expense rows ── */
  const mf = mSel?.value||'all';
  const cf = cSel?.value||'all';
  const vis = socExps.filter(e=>{
    if(mf!=='all' && e.month!==mf) return false;
    if(cf!=='all' && e.cat!==cf)   return false;
    return true;
  });

  const visTotal = vis.reduce((s,e)=>s+(e.amt||0),0);
  const totEl = document.getElementById('histTotal');
  if(totEl) totEl.innerHTML=`<span style="color:var(--text)">${vis.length} expense${vis.length!==1?'s':''}</span> &nbsp;·&nbsp; Total: <strong style="color:var(--indigo)">${inr(visTotal)}</strong>`;

  if(!vis.length){
    document.getElementById('presExpList').innerHTML=`<div class="exp-empty"><i class="ti ti-receipt-off"></i>No expenses recorded yet.</div>`;
    return;
  }

  document.getElementById('presExpList').innerHTML = vis.map(e=>{
    const ci  = allCatNames.indexOf(e.cat);
    const clr = catClr(ci>=0?ci:0);
    const icon= catIcon(e.cat);
    return `<div class="exp-row">
      <div class="exp-row-icon" style="background:${clr}18;color:${clr}"><i class="ti ${icon}"></i></div>
      <div style="flex:1;min-width:0">
        <div class="exp-row-cat">${e.title||e.cat}</div>
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:3px">
          <span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;background:${clr}18;color:${clr}">${e.cat}</span>
          ${e.date?`<span style="font-size:10px;color:var(--muted)">${e.date}</span>`:''}
          ${e.paidBy?`<span style="font-size:10px;color:var(--text2)">By: ${e.paidBy}</span>`:''}
          ${e.vendor?`<span style="font-size:10px;color:var(--muted)">${e.vendor}</span>`:''}
        </div>
        ${e.note?`<div class="exp-row-note">${e.note}</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:5px">
        <div class="exp-row-amt">${inr(e.amt)}</div>
        <select style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;border:1.5px solid var(--border2);background:#fff;font-family:var(--font);outline:none;cursor:pointer"
          onchange="window._updSEStatus('${e.id}',this.value)">
          ${['pending','approved','rejected'].map(s=>`<option value="${s}"${e.status===s?' selected':''}>${{pending:'⏳ Pending',approved:'✅ Approved',rejected:'❌ Rejected'}[s]}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-white btn-sm" onclick="window._delSE('${e.id}')" style="padding:5px 8px;min-width:0">
        <i class="ti ti-trash" style="margin:0;color:var(--red)"></i>
      </button>
    </div>`;
  }).join('');
}

function oPresM() {
  document.getElementById('presFlat').innerHTML = [...flats.values()]
    .filter(f => f.month === AM && (f.owner || '').trim())
    .map(f => `<option value="${f.flatId}"${pres && pres.flatId === f.flatId ? ' selected' : ''}>${f.flatId} — ${f.owner}</option>`)
    .join('');
  document.getElementById('presName').value  = pres?.name || '';
  document.getElementById('presStart').value = pres?.termStart || new Date().toISOString().split('T')[0];
  document.getElementById('presEnd').value   = pres?.termEnd || '';
  document.getElementById('presPhone').value = pres?.phone || '';
  document.getElementById('presSaveBtn').disabled = false;
  document.getElementById('presSaveLbl').textContent = 'Elect President';
  document.getElementById('presM').classList.add('open');
}

function cPresM() { document.getElementById('presM').classList.remove('open'); }

async function sPres() {
  const flatId    = document.getElementById('presFlat').value;
  const name      = document.getElementById('presName').value.trim();
  const termStart = document.getElementById('presStart').value;
  const termEnd   = document.getElementById('presEnd').value;
  const phone     = document.getElementById('presPhone').value.trim();
  if (!name) { toast('Enter president name.', 'error'); return; }
  document.getElementById('presSaveBtn').disabled = true;
  document.getElementById('presSaveLbl').textContent = 'Saving…';
  sync('saving');
  try {
    const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await setDoc(doc(db,'apartments',UID), { president:{flatId,name,termStart,termEnd,phone,updatedAt:new Date().toISOString()} }, {merge:true});
    president = {flatId,name,termStart,termEnd,phone};
    sync('live'); cPresM(); toast('President elected ✓'); rPresident();
  } catch(e) { console.error(e); sync('error'); toast('Save failed.', 'error'); }
  finally { document.getElementById('presSaveBtn').disabled=false; document.getElementById('presSaveLbl').textContent='Elect President'; }
}

function oPresExp() {
  ['peTitle','peAmt','pePaidBy','peVendor','peNote'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('peDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('peCat').value  = 'Maintenance';
  document.getElementById('peBtn').disabled = false;
  document.getElementById('peLbl').textContent = 'Save Expense';
  document.getElementById('presExpM').classList.add('open');
}

function cPresExp() { document.getElementById('presExpM').classList.remove('open'); }

async function sPresExp() {
  const title  = document.getElementById('peTitle').value.trim();
  const cat    = document.getElementById('peCat').value;
  const amt    = parseInt(document.getElementById('peAmt').value) || 0;
  const date   = document.getElementById('peDate').value;
  const paidBy = document.getElementById('pePaidBy').value.trim() || president?.name || 'President';
  const vendor = document.getElementById('peVendor').value.trim();
  const note   = document.getElementById('peNote').value.trim();
  if (!title) { toast('Enter expense title.', 'error'); return; }
  if (!amt)   { toast('Enter amount.', 'error'); return; }
  document.getElementById('peBtn').disabled = true;
  document.getElementById('peLbl').textContent = 'Saving…';
  sync('saving');
  try {
    const { addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    const d   = new Date(date);
    const mth = d.toISOString().slice(0,7);
    await addDoc(sexpColl(), { title, cat, amt, date:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}), month:mth, paidBy, vendor, note, status:'pending', createdAt:serverTimestamp() });
    sync('live'); cPresExp(); toast('Society expense recorded ✓');
  } catch(e) { console.error(e); sync('error'); toast('Save failed.', 'error'); }
  finally { document.getElementById('peBtn').disabled=false; document.getElementById('peLbl').textContent='Save Expense'; }
}

async function updSEStatus(id, status) {
  sync('saving');
  try {
    const { updateDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await updateDoc(sexpRef(id), {status});
    sync('live'); toast('Status updated ✓');
  } catch(e) { console.error(e); sync('error'); toast('Update failed.', 'error'); }
}

async function delSE(id) {
  if (!confirm('Delete this expense?')) return;
  sync('saving');
  try {
    const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await deleteDoc(sexpRef(id));
    sync('live'); toast('Expense deleted ✓');
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.', 'error'); }
}

// Convenience: open Add Expense modal (alias used in phAct button)

export { rPresident, oPresM, cPresM, sPres, oPresExp, cPresExp, sPresExp, updSEStatus, delSE };
