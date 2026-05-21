/* ════════════════════════════════
   PRESIDENT TAB — js/president.js
   Reads from: window.APP (shared closure vars)
════════════════════════════════ */

const CAT_ICONS = {
  Maintenance:'ti-tool', Water:'ti-droplet', Electricity:'ti-bolt',
  Security:'ti-shield', Cleaning:'ti-vacuum-cleaner', Lift:'ti-elevator',
  Gardening:'ti-plant', Painting:'ti-paint', Other:'ti-clipboard'
};
const CAT_BG = {
  Maintenance:'var(--indigo-bg)', Water:'var(--sky-bg)', Electricity:'var(--amber-bg)',
  Security:'var(--red-bg)', Cleaning:'var(--green-bg)', Lift:'var(--purple-bg)',
  Gardening:'var(--green-bg)', Painting:'var(--amber-bg)', Other:'var(--surface3)'
};
const CAT_CLR = {
  Maintenance:'var(--indigo)', Water:'var(--sky)', Electricity:'var(--amber)',
  Security:'var(--red)', Cleaning:'var(--green)', Lift:'var(--purple)',
  Gardening:'var(--green)', Painting:'var(--amber)', Other:'var(--text2)'
};

export function rPresident() {
  const { president, socExps, flats, AM, inr } = window.APP;
  const pres = president;

  if (!pres || !pres.name) {
    document.getElementById('presBanner').innerHTML = `
      <div class="pres-empty">
        <i class="ti ti-crown"></i>
        <div style="font-size:15px;font-weight:800;color:var(--text);margin-bottom:6px">No President Elected Yet</div>
        <div style="font-size:13px;margin-bottom:16px">Elect a flat member as society president to track expenses.</div>
        <button class="btn btn-indigo" onclick="window._oPresM()"><i class="ti ti-crown"></i> Elect President</button>
      </div>`;
  } else {
    const ini = (pres.name || 'P').charAt(0).toUpperCase();
    const tenure = pres.termStart
      ? `Since ${new Date(pres.termStart).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}${pres.termEnd ? ' — ' + new Date(pres.termEnd).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : ''}`
      : '';
    document.getElementById('presBanner').innerHTML = `
      <div class="pres-banner">
        <div class="pres-info">
          <div class="pres-avatar">${ini}</div>
          <div>
            <div style="font-size:11px;opacity:.7;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px">🏆 Current President</div>
            <div class="pres-name">${pres.name}</div>
            <div class="pres-flat">Flat ${pres.flatId}${pres.phone ? ' · ' + pres.phone : ''}</div>
            ${tenure ? `<div style="font-size:11px;opacity:.7;margin-top:3px">${tenure}</div>` : ''}
          </div>
        </div>
        <button class="btn" style="background:rgba(255,255,255,.2);color:#fff;border:1.5px solid rgba(255,255,255,.3)" onclick="window._oPresM()">
          <i class="ti ti-edit"></i> Change
        </button>
      </div>`;
  }

  const totalSocExp = socExps.reduce((s, e) => s + e.amt, 0);
  const totalFlats  = [...flats.values()].filter(f => f.month === AM).length;
  const perFlat     = totalFlats > 0 ? Math.round(totalSocExp / totalFlats) : 0;

  document.getElementById('fundRow').innerHTML = `
    <div class="fcard2"><div class="fcard2-label">Total Society Expenses</div><div class="fcard2-val">${inr(totalSocExp)}</div><div class="fcard2-sub">${socExps.length} transactions</div></div>
    <div class="fcard2"><div class="fcard2-label">This Month</div><div class="fcard2-val">${inr(socExps.filter(e => e.month === AM).reduce((s,e) => s+e.amt, 0))}</div><div class="fcard2-sub">${AM}</div></div>
    <div class="fcard2"><div class="fcard2-label">Per Flat (avg)</div><div class="fcard2-val">${inr(perFlat)}</div><div class="fcard2-sub">across ${totalFlats} flats</div></div>
    <div class="fcard2"><div class="fcard2-label">Approved</div><div class="fcard2-val">${inr(socExps.filter(e=>e.status==='approved').reduce((s,e)=>s+e.amt,0))}</div><div class="fcard2-sub">${socExps.filter(e=>e.status==='approved').length} approved</div></div>
  `;

  if (!socExps.length) {
    document.getElementById('presExpList').innerHTML = `<div class="exp-empty"><i class="ti ti-receipt-off"></i>No society expenses recorded yet.</div>`;
    return;
  }

  document.getElementById('presExpList').innerHTML = socExps.map(e => {
    const icon = CAT_ICONS[e.cat] || 'ti-clipboard';
    const bg   = CAT_BG[e.cat]   || 'var(--surface3)';
    const clr  = CAT_CLR[e.cat]  || 'var(--text2)';
    const statusOptions = ['pending','approved','rejected'].map(s =>
      `<option value="${s}"${e.status===s?' selected':''}>${{pending:'⏳ Pending',approved:'✅ Approved',rejected:'❌ Rejected'}[s]}</option>`
    ).join('');
    return `<div class="exp-row">
      <div class="exp-row-icon" style="background:${bg};color:${clr}"><i class="ti ${icon}"></i></div>
      <div>
        <div class="exp-row-cat">${e.title || e.cat}</div>
        <div class="exp-row-date">${e.date || ''}${e.paidBy ? ' · Paid by: ' + e.paidBy : ''}${e.vendor ? ' · ' + e.vendor : ''}</div>
        ${e.note ? `<div class="exp-row-note">${e.note}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div class="exp-row-amt">${inr(e.amt)}</div>
        <div style="margin-top:4px">
          <select style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;border:1.5px solid var(--border2);background:#fff;font-family:var(--font);outline:none;cursor:pointer"
            onchange="window._updSEStatus('${e.id}',this.value)">${statusOptions}</select>
        </div>
      </div>
      <button class="btn btn-white btn-sm" onclick="window._delSE('${e.id}')" style="padding:5px 8px;min-width:0">
        <i class="ti ti-trash" style="margin:0;color:var(--red)"></i>
      </button>
    </div>`;
  }).join('');
}

export function oPresM() {
  const { flats, president: pres, AM } = window.APP;
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

export function cPresM() { document.getElementById('presM').classList.remove('open'); }

export async function sPres() {
  const { aptDocRef, sync, toast } = window.APP;
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
    const { db, UID } = window.APP;
    await setDoc(doc(db,'apartments',UID), { president:{flatId,name,termStart,termEnd,phone,updatedAt:new Date().toISOString()} }, {merge:true});
    window.APP.president = {flatId,name,termStart,termEnd,phone};
    sync('live'); cPresM(); toast('President elected ✓'); rPresident();
  } catch(e) { console.error(e); sync('error'); toast('Save failed.', 'error'); }
  finally { document.getElementById('presSaveBtn').disabled=false; document.getElementById('presSaveLbl').textContent='Elect President'; }
}

export function oPresExp() {
  ['peTitle','peAmt','pePaidBy','peVendor','peNote'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('peDate').value = new Date().toISOString().split('T')[0];
  // Fill category dropdown from shared categories
  const cats = (window.APP?.categories) || ['Maintenance','Water','Electricity','Parking','Lift','Security','Cleaning','Other'];
  const sel = document.getElementById('peCat');
  if (sel) {
    const cur = sel.value || cats[0];
    sel.innerHTML = cats.map(c=>`<option value="${c}"${c===cur?' selected':''}>${c}</option>`).join('')
      + `<option value="__manage__">⚙ Manage Categories…</option>`;
    sel.onchange = (e) => { if(e.target.value==='__manage__'){ e.target.value=cur; if(window._openCatManager) window._openCatManager(); }};
  }
  document.getElementById('peBtn').disabled = false;
  document.getElementById('peLbl').textContent = 'Save Expense';
  document.getElementById('presExpM').classList.add('open');
}

export function cPresExp() { document.getElementById('presExpM').classList.remove('open'); }

export async function sPresExp() {
  const { sexpColl, sync, toast, president } = window.APP;
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

export async function updSEStatus(id, status) {
  const { sexpRef, sync, toast } = window.APP;
  sync('saving');
  try {
    const { updateDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await updateDoc(sexpRef(id), {status});
    sync('live'); toast('Status updated ✓');
  } catch(e) { console.error(e); sync('error'); toast('Update failed.', 'error'); }
}

export async function delSE(id) {
  const { sexpRef, sync, toast } = window.APP;
  if (!confirm('Delete this expense?')) return;
  sync('saving');
  try {
    const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await deleteDoc(sexpRef(id));
    sync('live'); toast('Expense deleted ✓');
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.', 'error'); }
}

// Convenience: open Add Expense modal (alias used in phAct button)
export { oPresExp as oAddSocExp };
