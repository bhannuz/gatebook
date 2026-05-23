/* --- residents.js — members, vehicles, merged residents tab ==== */
import { db } from './firebase.js';
import { doc, setDoc, deleteDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

/* ── Helpers ── */
function tenure(moveIn, moveOut) {
  if (!moveIn) return '—';
  const start = new Date(moveIn);
  const end   = moveOut ? new Date(moveOut) : new Date();
  const days  = Math.floor((end - start) / 86400000);
  if (days < 0) return '—';
  const yrs = Math.floor(days / 365);
  const mos = Math.floor((days % 365) / 30);
  const parts = [];
  if (yrs) parts.push(`${yrs}y`);
  if (mos) parts.push(`${mos}m`);
  if (!parts.length) parts.push(`${days}d`);
  return parts.join(' ');
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

/* ── Filter toggle ── */
function fMem(t) {
  MF = t;
  document.querySelectorAll('.mff').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  rMembers();
}

/* ── Main render ── */
function rMembers() {
  const q = (document.getElementById('memQ')?.value || '').trim().toLowerCase();

  let rows = [...flats.values()].filter(f => {
    if (MF === 'owner'  && (f.resType || 'owner') !== 'owner') return false;
    if (MF === 'tenant' && f.resType !== 'tenant')             return false;
    if (MF === 'vacant' && (f.owner || '').trim())             return false;
    if (q && !f.flatId?.toLowerCase().includes(q)
          && !(f.owner || '').toLowerCase().includes(q)
          && !(f.ownerName || '').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (a.flatId || '').localeCompare(b.flatId || ''));

  if (!rows.length) {
    document.getElementById('memList').innerHTML =
      `<div class="mem-empty"><i class="ti ti-users-off"></i>No members found.</div>`;
    return;
  }

  const tRows = rows.map(f => {
    const isVacant   = !(f.owner || '').trim();
    const rType      = isVacant ? 'vacant' : (f.resType || 'owner');
    const isTenant   = rType === 'tenant';
    const typeLabel  = isVacant ? 'Vacant' : isTenant ? '🔑 Tenant' : '🏠 Owner';
    const tenureStr  = isVacant ? '—' : tenure(f.moveIn, f.moveOut);
    const movedIn    = fmtDate(f.moveIn);
    const movedOut   = fmtDate(f.moveOut);
    const allEx      = fex(f.flatId);
    const totalPaid  = allEx.reduce((s, e) => s + e.amt, 0);
    const balance    = (f.due || 0) - (f.paid || 0);
    const payMonths  = [...new Set(allEx.map(e => e.month || e.date?.slice(0, 7)))].filter(Boolean);
    const statusColor = balance > 0 ? 'var(--red)' : balance === 0 && f.due > 0 ? 'var(--green)' : 'var(--muted)';

    // Owner info line — always show; for tenants show actual owner separately
    const residentCell = isVacant
      ? `<span style="color:var(--muted);font-style:italic">Vacant</span>`
      : `<div class="mem-name">${f.owner}</div>`;

    const ownerCell = isTenant
      ? (f.ownerName
          ? `<div style="font-size:12px;font-weight:700;color:var(--text)">${f.ownerName}</div>
             ${f.ownerPhone ? `<div style="font-size:10px;color:var(--text2)">${f.ownerPhone}</div>` : ''}`
          : `<span style="color:var(--muted);font-size:11px">Not set</span>`)
      : `<span style="font-size:11px;color:var(--muted)">—</span>`;

    return `<tr onclick="window._oFl('${f.flatId}')" style="cursor:pointer">
      <td><span class="mem-flat">${f.flatId}</span>${f.block ? `<br><span style="font-size:10px;color:var(--muted)">Block ${f.block}</span>` : ''}</td>
      <td><span class="mem-type ${rType}">${typeLabel}</span></td>
      <td>${residentCell}</td>
      <td>${ownerCell}</td>
      <td>
        ${movedIn !== '—' ? `<div style="font-size:11px">In: <strong>${movedIn}</strong></div>` : ''}
        ${movedOut !== '—' ? `<div style="font-size:11px">Out: <strong>${movedOut}</strong></div>` : ''}
        ${movedIn === '—' ? '<span style="color:var(--muted);font-size:11px">—</span>' : ''}
      </td>
      <td>
        <span class="mem-tenure"><strong>${tenureStr}</strong></span>
        ${f.moveOut ? `<div style="font-size:10px;color:var(--muted)">vacated</div>` : ''}
      </td>
      <td><span class="mem-paid">${totalPaid ? inr(totalPaid) : '—'}</span></td>
      <td><span style="font-size:12px;font-weight:700;color:${statusColor}">${f.due ? inr(Math.abs(balance)) : '—'}</span></td>
      <td>
        <div style="display:flex;flex-wrap:wrap;gap:2px;max-width:140px">
          ${payMonths.slice(-4).map(m => `<span class="hist-chip">${m}</span>`).join('')}
          ${payMonths.length > 4 ? `<span class="hist-chip">+${payMonths.length - 4}</span>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('memList').innerHTML = `
    <table class="mem-table">
      <thead><tr>
        <th>Flat</th>
        <th>Type</th>
        <th>Resident</th>
        <th>Owner (if tenant)</th>
        <th>Move In / Out</th>
        <th>Tenure</th>
        <th>Total Paid</th>
        <th>Balance</th>
        <th>Payment Months</th>
      </tr></thead>
      <tbody>${tRows}</tbody>
    </table>`;
}


/* --- vehicles.js == */
/* ---
   VEHICLES TAB — js/vehicles.js
   Reads from: closure vars (shared state)

function rVehicles() {
  const q  = (document.getElementById('vehQ')?.value || '').toLowerCase().trim();
  const bf = document.getElementById('vehBF')?.value || 'all';
  const tf = document.getElementById('vehTF')?.value || 'all';
  const all = [...flats.values()].filter(f => f.month === AM);

  // Rebuild block filter dropdown
  const bs = bks();
  const bfSel = document.getElementById('vehBF');
  if (bfSel && bfSel.options.length <= 1) {
    bs.forEach(b => {
      const o = document.createElement('option');
      o.value = b; o.textContent = 'Block ' + b;
      bfSel.appendChild(o);
    });
  }

  const totTw   = [...vehicles.values()].reduce((s, v) => s + (parseInt(v.tw) || 0), 0);
  const totFw   = [...vehicles.values()].reduce((s, v) => s + (parseInt(v.fw) || 0), 0);
  const withVeh = [...flats.values()].filter(f => {
    const v = vehicles.get(f.flatId) || {};
    return (parseInt(v.tw) || 0) + (parseInt(v.fw) || 0) > 0;
  }).length;

  document.getElementById('vehSum').innerHTML = `
    <div class="vscard"><div class="vscard-icon tw"><i class="ti ti-motorbike"></i></div><div><div class="vscard-label">2-Wheelers</div><div class="vscard-val">${totTw}</div></div></div>
    <div class="vscard"><div class="vscard-icon fw"><i class="ti ti-car"></i></div><div><div class="vscard-label">4-Wheelers</div><div class="vscard-val">${totFw}</div></div></div>
    <div class="vscard"><div class="vscard-icon tot"><i class="ti ti-parking"></i></div><div><div class="vscard-label">Total Vehicles</div><div class="vscard-val">${totTw + totFw}</div></div></div>
    <div class="vscard"><div class="vscard-icon fl"><i class="ti ti-home-check"></i></div><div><div class="vscard-label">Flats w/ Vehicles</div><div class="vscard-val">${withVeh}/${all.length}</div></div></div>
  `;

  const rows = all.filter(f => {
    if (bf !== 'all' && f.block !== bf) return false;
    if (q && !f.flatId.toLowerCase().includes(q) && !(f.owner || '').toLowerCase().includes(q)) return false;
    const v = vehicles.get(f.flatId) || {};
    const tw = parseInt(v.tw) || 0, fw = parseInt(v.fw) || 0;
    if (tf === '2w'   && tw === 0) return false;
    if (tf === '4w'   && fw === 0) return false;
    if (tf === 'both' && (tw === 0 || fw === 0)) return false;
    if (tf === 'none' && (tw + fw) > 0) return false;
    return true;
  });

  if (!rows.length) {
    document.getElementById('vehBody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--muted)"><i class="ti ti-motorbike" style="font-size:32px;display:block;margin-bottom:8px;opacity:.3"></i>No records match your filter.</td></tr>`;
    return;
  }

  document.getElementById('vehBody').innerHTML = rows.map(f => {
    const v = vehicles.get(f.flatId) || { tw: 0, fw: 0, nums: '', slot: '' };
    const tw = parseInt(v.tw) || 0, fw = parseInt(v.fw) || 0;
    const twB = tw > 0 ? `<span class="vbadge tw"><i class="ti ti-motorbike"></i>${tw}</span>` : `<span class="vbadge none">–</span>`;
    const fwB = fw > 0 ? `<span class="vbadge fw"><i class="ti ti-car"></i>${fw}</span>` : `<span class="vbadge none">–</span>`;
    return `<tr>
      <td><strong style="color:var(--indigo)">${f.flatId}</strong></td>
      <td><div style="font-weight:600">${f.owner || '(No owner)'}</div><div style="font-size:10px;color:var(--muted)">${f.resType === 'tenant' ? '🔑 Tenant' : '🏠 Owner'}</div></td>
      <td>${twB}</td>
      <td>${fwB}</td>
      <td style="font-size:12px;color:var(--text2)">${v.nums || '—'}</td>
      <td style="font-size:12px;color:var(--text2)">${v.slot || '—'}</td>
      <td><button class="btn btn-white btn-sm" onclick="window._oVehFor('${f.flatId}')"><i class="ti ti-pencil"></i> Edit</button></td>
    </tr>`;
  }).join('');
}

function oVehM() {
  const first = [...flats.values()].find(f => f.month === AM);
  if (first) oVehFor(first.flatId);
  else toast('No flats found.', 'error');
}

function oVehFor(fid) {
  const f = flats.get(fid);
  const v = vehicles.get(fid) || { tw: 0, fw: 0, nums: '', slot: '' };
  document.getElementById('vehFid').value         = fid;
  document.getElementById('vehMSub').textContent  = fid + (f && f.owner ? ' — ' + f.owner : '');
  document.getElementById('veh2w').value           = v.tw || 0;
  document.getElementById('veh4w').value           = v.fw || 0;
  document.getElementById('vehNums').value         = v.nums || '';
  document.getElementById('vehSlot').value         = v.slot || '';
  document.getElementById('vehDelBtn').style.display = vehicles.has(fid) ? '' : 'none';
  document.getElementById('vehSaveBtn').disabled   = false;
  document.getElementById('vehSaveLbl').textContent = 'Save Vehicles';
  document.getElementById('vehM').classList.add('open');
}

function cVehM() { document.getElementById('vehM').classList.remove('open'); }

async function sVeh() {
  const fid  = document.getElementById('vehFid').value;
  const tw   = parseInt(document.getElementById('veh2w').value)   || 0;
  const fw   = parseInt(document.getElementById('veh4w').value)   || 0;
  const nums = document.getElementById('vehNums').value.trim();
  const slot = document.getElementById('vehSlot').value.trim();
  const btn  = document.getElementById('vehSaveBtn');
  btn.disabled = true;
  document.getElementById('vehSaveLbl').textContent = 'Saving…';
  sync('saving');
  try {
    const { setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await setDoc(vehRef(fid), { flatId: fid, tw, fw, nums, slot, updatedAt: serverTimestamp() });
    sync('live'); cVehM(); toast('Vehicles saved ✓');
  } catch(e) { console.error(e); sync('error'); toast('Save failed.', 'error'); }
  finally { btn.disabled = false; document.getElementById('vehSaveLbl').textContent = 'Save Vehicles'; }
}

async function delVeh() {
  const fid = document.getElementById('vehFid').value;
  if (!confirm('Clear vehicle data for this flat?')) return;
  sync('saving');
  try {
    const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await deleteDoc(vehRef(fid));
    sync('live'); cVehM(); toast('Vehicle data cleared ✓');
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.', 'error'); }
}


/* --- president.js == */
/* ---
   PRESIDENT TAB — js/president.js
   Reads from: closure vars (shared state)

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

/* --- RESIDENTS TAB (merged Members + Vehicles) == */
function rResidents() {
  // re-use rMembers for now — members tab shows in resView
  // Vehicle summary cards
  const all = [...flats.values()].filter(f => f.month === AM);
  const totTw   = [...vehicles.values()].reduce((s,v)=>s+(parseInt(v.tw)||0),0);
  const totFw   = [...vehicles.values()].reduce((s,v)=>s+(parseInt(v.fw)||0),0);
  const withVeh = all.filter(f=>{const v=vehicles.get(f.flatId)||{};return (parseInt(v.tw)||0)+(parseInt(v.fw)||0)>0;}).length;
  const vs = document.getElementById('vehSum');
  if(vs) vs.innerHTML = `
    <div class="vscard"><div class="vscard-icon tw"><i class="ti ti-motorbike"></i></div><div><div class="vscard-label">2-Wheelers</div><div class="vscard-val">${totTw}</div></div></div>
    <div class="vscard"><div class="vscard-icon fw"><i class="ti ti-car"></i></div><div><div class="vscard-label">4-Wheelers</div><div class="vscard-val">${totFw}</div></div></div>
    <div class="vscard"><div class="vscard-icon tot"><i class="ti ti-parking"></i></div><div><div class="vscard-label">Total Vehicles</div><div class="vscard-val">${totTw+totFw}</div></div></div>
    <div class="vscard"><div class="vscard-icon fl"><i class="ti ti-home-check"></i></div><div><div class="vscard-label">Flats w/ Vehicles</div><div class="vscard-val">${withVeh}/${all.length}</div></div></div>
  `;

  // Render member rows (reuse rMembers logic but target resBody)
  const q = (document.getElementById('memQ')?.value||'').trim().toLowerCase();
  const tf = document.getElementById('resTF')?.value||'all';
  let rows = all.filter(f=>{
    if(MF==='owner'  && (f.resType||'owner')!=='owner') return false;
    if(MF==='tenant' && f.resType!=='tenant')            return false;
    if(MF==='vacant' && (f.owner||'').trim())            return false;
    if(q && !f.flatId?.toLowerCase().includes(q) && !(f.owner||'').toLowerCase().includes(q)) return false;
    const v=vehicles.get(f.flatId)||{};
    const tw=parseInt(v.tw)||0,fw=parseInt(v.fw)||0;
    if(tf==='2w'   && tw===0)     return false;
    if(tf==='4w'   && fw===0)     return false;
    if(tf==='none' && tw+fw>0)    return false;
    return true;
  }).sort((a,b)=>(a.flatId||'').localeCompare(b.flatId||''));

  if(!rows.length){
    document.getElementById('resBody').innerHTML=`<tr><td colspan="12" style="text-align:center;padding:3rem;color:var(--muted)"><i class="ti ti-users-off" style="font-size:32px;display:block;margin-bottom:8px;opacity:.3"></i>No residents match filter.</td></tr>`;
    return;
  }

  function tenure2(moveIn,moveOut){
    if(!moveIn)return'—';
    const days=Math.floor(((moveOut?new Date(moveOut):new Date())-new Date(moveIn))/86400000);
    if(days<0)return'—';
    const y=Math.floor(days/365),m=Math.floor((days%365)/30);
    return [y?y+'y':'',m?m+'m':''].filter(Boolean).join(' ')||days+'d';
  }
  function fmtD(d){return d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';}

  document.getElementById('resBody').innerHTML = rows.map(f=>{
    const isVacant=(!(f.owner||'').trim());
    const rType=isVacant?'vacant':(f.resType||'owner');
    const isTenant=rType==='tenant';
    const v=vehicles.get(f.flatId)||{tw:0,fw:0,nums:'',slot:''};
    const tw=parseInt(v.tw)||0,fw=parseInt(v.fw)||0;
    const twB=tw>0?`<span class="vbadge tw"><i class="ti ti-motorbike"></i>${tw}</span>`:`<span class="vbadge none">–</span>`;
    const fwB=fw>0?`<span class="vbadge fw"><i class="ti ti-car"></i>${fw}</span>`:`<span class="vbadge none">–</span>`;
    const bal=(f.due||0)-(f.paid||0);
    const balClr=bal>0?'var(--red)':bal===0&&f.due>0?'var(--green)':'var(--muted)';
    return `<tr onclick="window._oFl('${f.flatId}')" style="cursor:pointer">
      <td><strong style="color:var(--indigo);font-size:12px">${f.flatId}</strong></td>
      <td><span class="mem-type ${rType}" style="font-size:10px">${isVacant?'Vacant':isTenant?'🔑 Tenant':'🏠 Owner'}</span></td>
      <td><div style="font-size:12px;font-weight:700">${f.owner||'<em style="color:var(--muted);font-weight:400">Vacant</em>'}</div></td>
      <td style="font-size:11px">${isTenant?(f.ownerName?`<div style="font-weight:700">${f.ownerName}</div>${f.ownerPhone?`<div style="font-size:10px;color:var(--text2)">${f.ownerPhone}</div>`:''}`:`<span style="color:var(--muted)">Not set</span>`):`<span style="color:var(--muted)">—</span>`}</td>
      <td style="font-size:11px;color:var(--text2)">${fmtD(f.moveIn)}</td>
      <td style="font-size:11px;font-weight:700;color:var(--text2)">${tenure2(f.moveIn,f.moveOut)}</td>
      <td>${twB}</td>
      <td>${fwB}</td>
      <td style="font-size:11px;color:var(--text2);max-width:100px;word-break:break-all">${v.nums||'—'}</td>
      <td style="font-size:11px;color:var(--text2)">${v.slot||'—'}</td>
      <td style="font-size:12px;font-weight:700;color:${balClr}">${f.due?inr(Math.abs(bal)):'—'}</td>
      <td onclick="event.stopPropagation()">
        <button class="btn btn-white btn-xs" onclick="window._oVehFor('${f.flatId}')">
          <i class="ti ti-motorbike" style="margin:0"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

/* --- CUSTOM CATEGORIES == */
// DEFAULT_FLAT_CATS moved to top-level state section
// DEFAULT_SOC_CATS moved to top-level state section
// customCats declared in state section above

export { tenure, fmtDate, fMem, rMembers, rVehicles, rResidents, oVehM, oVehFor, cVehM, sVeh, delVeh };
