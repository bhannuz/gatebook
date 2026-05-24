import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js';

/* ====== MERGED app.js ====== */

/* ====== js/firebase.js ====== */
const firebaseConfig = {
  apiKey:            "AIzaSyAnUvPo_G_efbacdDApbULQgY5OToghJYM",
  authDomain:        "gatebook-17065.firebaseapp.com",
  projectId:         "gatebook-17065",
  storageBucket:     "gatebook-17065.firebasestorage.app",
  messagingSenderId: "732765572762",
  appId:             "1:732765572762:web:55f1cb897bb5804a831923",
  measurementId:     "G-6YKLV11L0G",
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);
getAnalytics(app);


/* ====== js/payments.js ====== */
let _dFid=null, _dPage=0, _dQ='', _dCat='all';
const PAGE_SIZE = 20;

function setAB(v) { AB = v; }

function hasBlocks() {
  return [...flats.values()].some(f => (f.block || '').trim() !== '');
}

function getFloors(blockOrAll) {
  const all = [...flats.values()].filter(f => f.month === AM);
  const scoped = blockOrAll ? all.filter(f => f.block === blockOrAll) : all;
  return [...new Set(scoped.map(f => f.floor).filter(x => x != null))].sort((a,b) => a - b);
}

function updateFloorFilter(block) {
  const sel = document.getElementById('flf');
  if (!sel) return;
  if (!hasBlocks()) { sel.style.display = 'none'; return; }
  const floors = getFloors(block);
  if (floors.length > 1) {
    sel.innerHTML = `<option value="all">All floors</option>` +
      floors.map(fl => `<option value="${fl}">Floor ${fl}</option>`).join('');
    sel.style.display = '';
  } else {
    sel.style.display = 'none';
  }
}

function rBTabs() {
  const useBlocks = hasBlocks();
  if (useBlocks) {
    const bs = bks();
    if (!bs.includes(AB)) { AB = bs[0] || ''; setAB(AB); }
    document.getElementById('btabs').innerHTML = bs.map(b => {
      const bf = [...flats.values()].filter(f => f.block === b && f.month === AM);
      const pc = bf.filter(f => st(f) === 'paid').length;
      return `<button class="btab${b === AB ? ' active' : ''}" onclick="window._sB('${b}')">
        <i class="ti ti-building"></i> Block ${b}
        <span class="btab-badge">${pc}/${bf.length}</span>
      </button>`;
    }).join('');
    updateFloorFilter(AB);
  } else {
    const all = [...flats.values()].filter(f => f.month === AM);
    const floors = [...new Set(all.map(f => f.floor).filter(x => x != null))].sort((a,b) => a - b);
    const flNums = floors.map(String);
    if (!flNums.includes(String(AB))) { AB = String(floors[0] || 1); setAB(AB); }
    document.getElementById('btabs').innerHTML = floors.map(fl => {
      const bf = all.filter(f => f.floor === fl);
      const pc = bf.filter(f => st(f) === 'paid').length;
      return `<button class="btab${String(fl) === String(AB) ? ' active' : ''}" onclick="window._sB('${fl}')">
        <i class="ti ti-stairs"></i> Floor ${fl}
        <span class="btab-badge">${pc}/${bf.length}</span>
      </button>`;
    }).join('');
    document.getElementById('flf').style.display = 'none';
  }
}

function rBlock() {
  const useBlocks = hasBlocks();
  let bf = [...flats.values()].filter(f => f.month === AM);
  if (useBlocks) {
    bf = bf.filter(f => f.block === AB);
  } else {
    bf = bf.filter(f => String(f.floor) === String(AB));
  }

  const vis = bf.filter(f => {
    if (FS !== 'all' && st(f) !== FS) return false;
    if (RTF !== 'all') {
      const vacant = !(f.owner || '').trim();
      if (RTF === 'vacant' && !vacant) return false;
      if (RTF === 'owner'  && (vacant || f.resType === 'tenant')) return false;
      if (RTF === 'tenant' && f.resType !== 'tenant') return false;
    }
    if (FLF !== 'all' && useBlocks && String(f.floor) !== String(FLF)) return false;
    if (SQ && !f.flatId.toLowerCase().includes(SQ) && !(f.owner || '').toLowerCase().includes(SQ)) return false;
    return true;
  });

  const pc  = bf.filter(f => st(f) === 'paid').length;
  const col = bf.reduce((s, f) => s + f.paid, 0);
  const headLabel = useBlocks ? `Block ${AB}` : `Floor ${AB}`;

  let h = `<div class="bhead">
    <div class="bhead-left">
      <div class="bstripe"></div>
      <div class="btitle">${headLabel}</div>
      <span class="bbadge">✅ ${pc}/${bf.length} paid</span>
    </div>
    <div class="bcollected">Collected: <strong>${inr(col)}</strong></div>
  </div><div class="fgrid">`;

  if (!vis.length) {
    h += `<div class="empty-grid"><i class="ti ti-search-off"></i>No flats match your filter.</div>`;
  } else {
    const byFloor = {};
    vis.forEach(f => { const fl = f.floor ?? '—'; (byFloor[fl] = byFloor[fl] || []).push(f); });
    const sortedFloors = Object.keys(byFloor).sort((a,b) => Number(a) - Number(b));
    const multiFloor = useBlocks && sortedFloors.length > 1;

    sortedFloors.forEach((fl, idx) => {
      if (multiFloor) {
        if (idx > 0) h += `</div>`;
        h += `<div class="floor-divider"><i class="ti ti-stairs"></i> Floor ${fl}</div><div class="fgrid">`;
      }
      byFloor[fl].forEach(f => {
        const s = st(f), pct = f.due ? Math.round(Math.min(f.paid/f.due*100,100)) : 0;
        h += `<div class="fcard ${s}" onclick="window._oFl('${f.flatId}')" role="button" tabindex="0"
          onkeydown="if(event.key==='Enter')window._oFl('${f.flatId}')">
          <div class="fc-top">
            <div>
              <div class="fc-num">${f.flatId}</div>
              <div class="fc-owner">${f.owner || '(No owner)'}</div>
              <span class="fc-type ${f.resType || 'owner'}">${f.resType === 'tenant' ? 'Tenant' : 'Owner'}</span>
            </div>
            <div class="fc-indicator"><i class="ti ${si(s)}"></i></div>
          </div>
          <div class="fc-amount">${inr(f.paid)}</div>
          <div class="fc-due">of ${inr(f.due)} monthly due</div>
          <div class="fprog"><div class="fpbar" style="width:${pct}%"></div></div>
          <div class="spill ${s}"><i class="ti ${si(s)}"></i>${sl(s)}</div>
        </div>`;
      });
    });
  }
  document.getElementById('bcon').innerHTML = h + '</div>';
}


/* ====== js/issues.js ====== */
function rIssues() {
  const fil = IF === 'all' ? [...issues] : issues.filter(i => i.status === IF);
  const icons = {
    Plumbing: 'ti-tool', Electrical: 'ti-bolt', Lift: 'ti-elevator',
    Security: 'ti-shield', Cleaning: 'ti-vacuum-cleaner', Parking: 'ti-car',
    Noise: 'ti-volume', Internet: 'ti-wifi', Other: 'ti-clipboard'
  };

  if (!fil.length) {
    document.getElementById('iList').innerHTML = `<div class="iss-empty">
      <i class="ti ti-mood-happy"></i>
      <h3>${IF === 'all' ? 'No issues raised yet' : 'No ' + IF + ' issues found'}</h3>
      <p>${IF === 'all' ? 'Everything is running smoothly!' : 'All clear in this category.'}</p>
    </div>`;
    return;
  }

  document.getElementById('iList').innerHTML = fil.map(iss => {
    const sLabel  = iss.status === 'in-progress' ? 'In Progress' : iss.status.charAt(0).toUpperCase() + iss.status.slice(1);
    const pLabel  = iss.priority.charAt(0).toUpperCase() + iss.priority.slice(1);
    return `<div class="icard" onclick="window._oID('${iss.id}')">
      <div class="ipbar ${iss.priority}"></div>
      <div>
        <div class="ic-title"><i class="ti ${icons[iss.cat] || 'ti-clipboard'}"></i>${iss.title}</div>
        <div class="ic-desc">${iss.desc.length > 130 ? iss.desc.slice(0, 130) + '…' : iss.desc}</div>
        <div class="ic-meta">
          <span class="itag flat"><i class="ti ti-home"></i>${iss.flat || iss.block}</span>
          <span class="itag cat">${iss.cat}</span>
          <span class="itag date"><i class="ti ti-calendar"></i>${fdt(iss.createdAt)}</span>
          <span style="font-size:11px;color:var(--text2);font-weight:600">By: ${iss.reporter}</span>
        </div>
      </div>
      <div class="iright">
        <span class="istatus ${iss.status}">${sLabel}</span>
        <span class="ipriority ${iss.priority}">${pLabel}</span>
      </div>
    </div>`;
  }).join('');
}

function fIss(f) {
  IF = f;
  document.querySelectorAll('.iff').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  rIssues();
}

function oRI(){
  ['iT','iDe','iFl','iRe'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('iP').value='medium';
  document.getElementById('iBl').innerHTML=bks().map(b=>`<option value="${b}">Block ${b}</option>`).join('')+'<option value="Common">Common Area</option>';
  const btn=document.getElementById('issBtn');btn.disabled=false;
  document.getElementById('issBtnL').textContent='Submit Complaint';
  document.getElementById('rIM').classList.add('open');
}

function cRI(){
  document.getElementById('rIM').classList.remove('open');
  document.getElementById('issBtn').disabled=false;
  document.getElementById('issBtnL').textContent='Submit Complaint';
}

async function sI(){
  const title=document.getElementById('iT').value.trim();
  const cat=document.getElementById('iCa').value;
  const priority=document.getElementById('iP').value;
  const block=document.getElementById('iBl').value;
  const flat=document.getElementById('iFl').value.trim().toUpperCase();
  const desc=document.getElementById('iDe').value.trim();
  const reporter=document.getElementById('iRe').value.trim();
  if(!title){toast('Enter an issue title.','error');return;}
  if(!desc){toast('Please describe the issue.','error');return;}
  if(!reporter){toast('Enter your name.','error');return;}
  const btn=document.getElementById('issBtn');btn.disabled=true;
  document.getElementById('issBtnL').textContent='Submitting…';
  sync('saving');
  try{
    const now=new Date().toISOString();
    await addDoc(issuesColl(),{
      title,cat,priority,block,flat,desc,reporter,
      status:'open',month:AM,
      timeline:[{action:'Issue reported',by:reporter,status:'open',ts:now}],
      createdAt:serverTimestamp(),
    });
    sync('live');cRI();toast('Issue submitted ✓');switchView('issues');
  }catch(e){
    console.error(e);sync('error');toast('Failed to submit. Try again.','error');
    btn.disabled=false;document.getElementById('issBtnL').textContent='Submit Complaint';
  }
}

function oID(id){
  const iss=issues.find(i=>i.id===id);if(!iss)return;
  const sc={open:'var(--red)',['in-progress']:'var(--amber)',resolved:'var(--green)'}[iss.status];
  const pc={high:'var(--red)',medium:'var(--amber)',low:'var(--green)'}[iss.priority];
  document.getElementById('idT').textContent=iss.title;
  document.getElementById('idS').textContent=`${iss.cat} · Reported by ${iss.reporter}`;
  const sL=iss.status==='in-progress'?'In Progress':iss.status.charAt(0).toUpperCase()+iss.status.slice(1);
  document.getElementById('idC').innerHTML=`
    <div class="dm">
      <div class="dm-card"><div class="dm-label">Status</div><div class="dm-value" style="font-size:14px;color:${sc}">${sL}</div></div>
      <div class="dm-card"><div class="dm-label">Priority</div><div class="dm-value" style="font-size:14px;color:${pc}">${iss.priority.charAt(0).toUpperCase()+iss.priority.slice(1)}</div></div>
      <div class="dm-card"><div class="dm-label">Location</div><div class="dm-value" style="font-size:14px">${iss.flat||iss.block}</div></div>
    </div>
    <div class="etitle"><i class="ti ti-file-description"></i>Full Description</div>
    <div style="background:var(--surface2);border:1.5px solid var(--border2);border-radius:var(--r-lg);padding:15px;font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:16px;font-weight:500">${iss.desc}</div>
    <div style="display:flex;gap:20px;font-size:12px;color:var(--muted);font-weight:600;margin-bottom:20px">
      <span><i class="ti ti-user" style="vertical-align:-2px;margin-right:4px"></i>${iss.reporter}</span>
      <span><i class="ti ti-calendar" style="vertical-align:-2px;margin-right:4px"></i>${fdt(iss.createdAt)}</span>
    </div>
    ${iss.status!=='resolved'
      ?`<div style="display:flex;gap:10px;flex-wrap:wrap">
          ${iss.status==='open'?`<button class="btn btn-white btn-sm" onclick="window._uIS('${id}','in-progress')"><i class="ti ti-progress"></i> Mark In Progress</button>`:''}
          <button class="btn btn-green btn-sm" onclick="window._uIS('${id}','resolved')"><i class="ti ti-circle-check"></i> Mark as Resolved</button>
        </div>`
      :`<div style="display:flex;align-items:center;gap:8px;color:var(--green);font-size:13px;font-weight:800"><i class="ti ti-circle-check" style="font-size:20px"></i>Issue has been resolved</div>`}
  `;
  const tl=iss.timeline||[{action:'Issue reported',by:iss.reporter,status:'open',ts:null}];
  const tlDotColor={open:'var(--red)',created:'var(--indigo)','in-progress':'var(--amber)',resolved:'var(--green)'};
  document.getElementById('idTL').innerHTML=`
    <div class="etitle" style="margin-top:18px"><i class="ti ti-timeline"></i>Activity Timeline</div>
    ${tl.map((t,i)=>`
      <div class="itl-item">
        <div class="itl-dot-col">
          <div class="itl-dot" style="background:${tlDotColor[t.status]||'var(--indigo)'}"></div>
          ${i<tl.length-1?'<div class="itl-line"></div>':''}
        </div>
        <div class="itl-body">
          <div class="itl-action">${t.action}</div>
          <div class="itl-by">By ${t.by||'System'} · ${t.ts?new Date(t.ts).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):fdt(iss.createdAt)}</div>
        </div>
      </div>`).join('')}
  `;
  document.getElementById('idM').classList.add('open');
}

function cID(){document.getElementById('idM').classList.remove('open');}

async function uIS(id,ns){
  const iss=issues.find(i=>i.id===id);if(!iss)return;
  sync('saving');
  const actionLabel={open:'Issue opened','in-progress':'Marked as In Progress',resolved:'Marked as Resolved'}[ns]||ns;
  const updatedTimeline=[...(iss.timeline||[]),{action:actionLabel,by:'Admin',status:ns,ts:new Date().toISOString()}];
  try{
    await updateDoc(issueRef(id),{status:ns,timeline:updatedTimeline});
    sync('live');cID();toast(ns==='resolved'?'Marked as resolved ✓':'Status updated ✓');
  }catch(e){console.error(e);sync('error');toast('Update failed.','error');}
}


/* ====== js/residents.js ====== */
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

function fMem(t) {
  MF = t;
  document.querySelectorAll('.mff').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  rMembers();
}

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
    document.getElementById('memList').innerHTML = `<div class="mem-empty"><i class="ti ti-users-off"></i>No members found.</div>`;
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

    const residentCell = isVacant ? `<span style="color:var(--muted);font-style:italic">Vacant</span>` : `<div class="mem-name">${f.owner}</div>`;
    const ownerCell = isTenant ? (f.ownerName ? `<div style="font-size:12px;font-weight:700;color:var(--text)">${f.ownerName}</div><div style="font-size:10px;color:var(--text2)">${f.ownerPhone || ''}</div>` : `<span style="color:var(--muted);font-size:11px">Not set</span>`) : `<span style="font-size:11px;color:var(--muted)">—</span>`;

    return `<tr onclick="window._oFl('${f.flatId}')" style="cursor:pointer">
      <td><span class="mem-flat">${f.flatId}</span>${f.block ? `<br><span style="font-size:10px;color:var(--muted)">Block ${f.block}</span>` : ''}</td>
      <td><span class="mem-type ${rType}">${typeLabel}</span></td>
      <td>${residentCell}</td>
      <td>${ownerCell}</td>
      <td>
        ${movedIn !== '—' ? `<div style="font-size:11px">In: <strong>${movedIn}</strong></div>` : ''}
        ${movedOut !== '—' ? `<div style="font-size:11px">Out: <strong>${movedOut}</strong></div>` : ''}
      </td>
      <td><span class="mem-tenure"><strong>${tenureStr}</strong></span></td>
      <td><span class="mem-paid">${totalPaid ? inr(totalPaid) : '—'}</span></td>
      <td><span style="font-size:12px;font-weight:700;color:${statusColor}">${f.due ? inr(Math.abs(balance)) : '—'}</span></td>
      <td>
        <div style="display:flex;flex-wrap:wrap;gap:2px;max-width:140px">
          ${payMonths.slice(-4).map(m => `<span class="hist-chip">${m}</span>`).join('')}
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('memList').innerHTML = `<table class="mem-table"><thead><tr><th>Flat</th><th>Type</th><th>Resident</th><th>Owner (if tenant)</th><th>Move In/Out</th><th>Tenure</th><th>Total Paid</th><th>Balance</th><th>Payment Months</th></tr></thead><tbody>${tRows}</tbody></table>`;
}

function rVehicles() {
  const q  = (document.getElementById('vehQ')?.value || '').toLowerCase().trim();
  const bf = document.getElementById('vehBF')?.value || 'all';
  const tf = document.getElementById('vehTF')?.value || 'all';
  const all = [...flats.values()].filter(f => f.month === AM);

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
    <div class="vscard"><div class="vscard-icon fl"><i class="ti ti-home-check"></i></div><div><div class="vscard-label">Flats w/ Vehicles</div><div class="vscard-val">${withVeh}/${all.length}</div></div></div>`;

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
    document.getElementById('vehBody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--muted)">No records match filter.</td></tr>`;
    return;
  }

  document.getElementById('vehBody').innerHTML = rows.map(f => {
    const v = vehicles.get(f.flatId) || { tw: 0, fw: 0, nums: '', slot: '' };
    const tw = parseInt(v.tw) || 0, fw = parseInt(v.fw) || 0;
    return `<tr><td><strong>${f.flatId}</strong></td><td>${f.owner || '(No owner)'}</td><td>${tw}</td><td>${fw}</td><td>${v.nums || '—'}</td><td>${v.slot || '—'}</td><td><button class="btn btn-white btn-sm" onclick="window._oVehFor('${f.flatId}')">Edit</button></td></tr>`;
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
  document.getElementById('vehM').classList.add('open');
}

function cVehM() { document.getElementById('vehM').classList.remove('open'); }

async function sVeh() {
  const fid  = document.getElementById('vehFid').value;
  const tw   = parseInt(document.getElementById('veh2w').value)   || 0;
  const fw   = parseInt(document.getElementById('veh4w').value)   || 0;
  const nums = document.getElementById('vehNums').value.trim();
  const slot = document.getElementById('vehSlot').value.trim();
  sync('saving');
  try {
    await setDoc(vehRef(fid), { flatId: fid, tw, fw, nums, slot, updatedAt: serverTimestamp() });
    sync('live'); cVehM(); toast('Vehicles saved ✓');
  } catch(e) { console.error(e); sync('error'); toast('Save failed.', 'error'); }
}

async function delVeh() {
  const fid = document.getElementById('vehFid').value;
  if (!confirm('Clear vehicle data?')) return;
  sync('saving');
  try {
    await deleteDoc(vehRef(fid));
    sync('live'); cVehM(); toast('Vehicle data cleared ✓');
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.', 'error'); }
}

function rResidents() {
  const all = [...flats.values()].filter(f => f.month === AM);
  const totTw   = [...vehicles.values()].reduce((s,v)=>s+(parseInt(v.tw)||0),0);
  const totFw   = [...vehicles.values()].reduce((s,v)=>s+(parseInt(v.fw)||0),0);
  const withVeh = all.filter(f=>{const v=vehicles.get(f.flatId)||{};return (parseInt(v.tw)||0)+(parseInt(v.fw)||0)>0;}).length;
  const vs = document.getElementById('vehSum');
  if(vs) vs.innerHTML = `
    <div class="vscard"><div class="vscard-icon tw"><i class="ti ti-motorbike"></i></div><div><div class="vscard-label">2-Wheelers</div><div class="vscard-val">${totTw}</div></div></div>
    <div class="vscard"><div class="vscard-icon fw"><i class="ti ti-car"></i></div><div><div class="vscard-label">4-Wheelers</div><div class="vscard-val">${totFw}</div></div></div>
    <div class="vscard"><div class="vscard-icon tot"><i class="ti ti-parking"></i></div><div><div class="vscard-label">Total Vehicles</div><div class="vscard-val">${totTw+totFw}</div></div></div>
    <div class="vscard"><div class="vscard-icon fl"><i class="ti ti-home-check"></i></div><div><div class="vscard-label">Flats w/ Vehicles</div><div class="vscard-val">${withVeh}/${all.length}</div></div></div>`;

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
    return true;
  }).sort((a,b)=>(a.flatId||'').localeCompare(b.flatId||''));

  if(!rows.length){
    document.getElementById('resBody').innerHTML=`<tr><td colspan="12" style="text-align:center;padding:3rem">No residents match filter.</td></tr>`;
    return;
  }

  document.getElementById('resBody').innerHTML = rows.map(f=>{
    const isVacant=(!(f.owner||'').trim());
    const v=vehicles.get(f.flatId)||{tw:0,fw:0,nums:'',slot:''};
    const bal=(f.due||0)-(f.paid||0);
    return `<tr onclick="window._oFl('${f.flatId}')" style="cursor:pointer">
      <td><strong>${f.flatId}</strong></td>
      <td>${isVacant?'Vacant':'Resident'}</td>
      <td>${f.owner||'—'}</td>
      <td>${f.ownerName||'—'}</td>
      <td>${fmtDate(f.moveIn)}</td>
      <td>${tenure(f.moveIn,f.moveOut)}</td>
      <td>${v.tw}</td><td>${v.fw}</td><td>${v.nums||'—'}</td><td>${v.slot||'—'}</td><td>${inr(bal)}</td>
      <td><button class="btn btn-white btn-xs" onclick="window._oVehFor('${f.flatId}')">⚙</button></td></tr>`;
  }).join('');
}


/* ====== js/president.js ====== */
const CAT_ICONS = { Maintenance:'ti-tool', Water:'ti-droplet', Electricity:'ti-bolt', Security:'ti-shield', Cleaning:'ti-vacuum-cleaner', Lift:'ti-elevator', Gardening:'ti-plant', Painting:'ti-paint', Other:'ti-clipboard' };
const CAT_BG = { Maintenance:'var(--indigo-bg)', Water:'var(--sky-bg)', Electricity:'var(--amber-bg)', Security:'var(--red-bg)', Cleaning:'var(--green-bg)', Lift:'var(--purple-bg)', Gardening:'var(--green-bg)', Painting:'var(--amber-bg)', Other:'var(--surface3)' };
const CAT_CLR = { Maintenance:'var(--indigo)', Water:'var(--sky)', Electricity:'var(--amber)', Security:'var(--red)', Cleaning:'var(--green)', Lift:'var(--purple)', Gardening:'var(--green)', Painting:'var(--amber)', Other:'var(--text2)' };

function rPresident() {
  const pres = president;
  if (!pres || !pres.name) {
    document.getElementById('presBanner').innerHTML = `<div class="pres-empty"><button class="btn btn-indigo btn-sm" onclick="window._oPresM()">Elect President</button></div>`;
  } else {
    document.getElementById('presBanner').innerHTML = `<div class="pres-chip"><div class="pres-chip-name">${pres.name}</div></div>`;
  }

  const totalExp      = socExps.reduce((s,e)=>s+(e.amt||0),0);
  const approved      = socExps.filter(e=>e.status==='approved').reduce((s,e)=>s+(e.amt||0),0);
  const pending       = socExps.filter(e=>e.status==='pending').reduce((s,e)=>s+(e.amt||0),0);
  const thisMonthExp  = socExps.filter(e=>e.month===AM).reduce((s,e)=>s+(e.amt||0),0);

  const fundRow = document.getElementById('fundRow');
  if(fundRow) {
    fundRow.innerHTML = `<div class="fcard2">Total Expenses: ${inr(totalExp)}</div><div class="fcard2">Approved: ${inr(approved)}</div>`;
  }
}

function oPresM() {
  document.getElementById('presFlat').innerHTML = [...flats.values()].filter(f => f.month === AM && (f.owner || '').trim()).map(f => `<option value="${f.flatId}">${f.flatId}</option>`).join('');
  document.getElementById('presM').classList.add('open');
}
function cPresM() { document.getElementById('presM').classList.remove('open'); }

async function sPres() {
  const flatId    = document.getElementById('presFlat').value;
  const name      = document.getElementById('presName').value.trim();
  try {
    await setDoc(doc(db,'apartments',UID), { president:{flatId,name,updatedAt:new Date().toISOString()} }, {merge:true});
    president = {flatId,name};
    sync('live'); cPresM(); rPresident();
  } catch(e) { console.error(e); }
}

function oPresExp() { document.getElementById('presExpM').classList.add('open'); }
function cPresExp() { document.getElementById('presExpM').classList.remove('open'); }

async function sPresExp() {
  const title  = document.getElementById('peTitle').value.trim();
  const amt    = parseInt(document.getElementById('peAmt').value) || 0;
  try {
    await addDoc(sexpColl(), { title, amt, month:AM, status:'pending', createdAt:serverTimestamp() });
    sync('live'); cPresExp(); toast('Society expense recorded ✓');
  } catch(e) { console.error(e); }
}

async function updSEStatus(id, status) {
  try { await updateDoc(sexpRef(id), {status}); sync('live'); } catch(e) { console.error(e); }
}

async function delSE(id) {
  try { await deleteDoc(sexpRef(id)); sync('live'); } catch(e) { console.error(e); }
}


/* ====== js/categories.js ====== */
function getCats(type){ return [...new Set([...(type==='flat'?DEFAULT_FLAT_CATS:DEFAULT_SOC_CATS),...(type==='flat'?customCats.flat:customCats.soc)])]; }

function renderCatOpts(selId, type){
  const sel=document.getElementById(selId); if(!sel)return;
  sel.innerHTML=getCats(type).map(c=>`<option value="${c}">${c}</option>`).join('');
}

async function saveCats(){ try{ await setDoc(doc(db,'apartments',UID,'config','categories'), customCats); }catch(e){console.error(e);}}
async function loadCats(){
  try{
    const snap=await getDoc(doc(db,'apartments',UID,'config','categories'));
    if(snap.exists()){const d=snap.data();customCats.flat=d.flat||[];customCats.soc=d.soc||[];}
  } catch(e){ console.error(e); }
}

/* ====== js/core.js ====== */
/* --- --- AUTH GUARD --- */
let UID = null;

function refreshAPP() {
  // Safe base no-op context target
}

onAuthStateChanged(auth, user => {
  if (!user) { window.location.replace('index.html'); return; }
  UID = user.uid;
  boot();
});

const flatsColl   = () => collection(db, 'apartments', UID, 'flats');
const expColl      = () => collection(db, 'apartments', UID, 'expenses');
const issuesColl  = () => collection(db, 'apartments', UID, 'issues');
const aptDocRef   = () => doc(db, 'apartments', UID);
const flatRef      = id => doc(db, 'apartments', UID, 'flats', id);
const issueRef    = id => doc(db, 'apartments', UID, 'issues', id);
const vehColl      = () => collection(db, 'apartments', UID, 'vehicles');
const vehRef       = id => doc(db, 'apartments', UID, 'vehicles', id);
const sexpColl    = () => collection(db, 'apartments', UID, 'soc_expenses');
const sexpRef      = id => doc(db, 'apartments', UID, 'soc_expenses', id);

const flats  = new Map();
const exps   = new Map();
const issues = [];

let AB='', FS='all', SQ='', RTF='all', FLF='all', MF='all', AM=new Date().toISOString().slice(0,7), AV='payments', IF='all';
let eu=null, iu=null, vu=null, pu=null;
const vehicles = new Map();
const socExps  = [];
let president  = null;
let customCats = { flat: [], soc: [] };
const DEFAULT_FLAT_CATS = ['Maintenance','Water','Electricity','Parking','Lift','Security','Cleaning','Other'];
const DEFAULT_SOC_CATS  = ['Maintenance','Water','Electricity','Security','Cleaning','Lift','Gardening','Painting','Other'];
let APT_NAME = 'Gatebook';

const st  = f => f.paid>=f.due?'paid':f.paid>0?'partial':'pending';
const sl  = s => ({paid:'Paid in full',partial:'Partial payment',pending:'Not paid'}[s]);
const si  = s => ({paid:'ti-circle-check',partial:'ti-clock',pending:'ti-alert-circle'}[s]);
const inr = n => '₹'+Number(n||0).toLocaleString('en-IN');
const fd  = s => new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
const fdt = ts => {
  if(!ts)return'–';
  const d=ts.toDate?ts.toDate():new Date(ts);
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
};
const bks = () => [...new Set([...flats.values()].map(f=>f.block))].sort();
const bfl = b => [...flats.values()].filter(f=>f.block===b&&f.month===AM);
const fex = id => exps.get(id)||[];

function applyAptName(name) {
  APT_NAME = name||'Gatebook';
  document.getElementById('aptNameDisplay').innerHTML = `${APT_NAME}`;
}

function sync(s) { console.log("Sync Status:", s); }
function toast(msg) { console.log("Toast:", msg); }

function rStats() {
  const all=([...flats.values()]).filter(f=>f.month===AM);
  const due=all.reduce((s,f)=>s+f.due,0);
  const paid=all.reduce((s,f)=>s+f.paid,0);
  const oi=issues.filter(i=>i.status==='open').length;

  const openCnt = document.getElementById('openCnt');
  if(openCnt) openCnt.textContent = oi;
}

function listenFlats(){
  let _firstLoad = true;
  onSnapshot(flatsColl(), snap => {
    snap.docChanges().forEach(ch => {
      const d = {flatId:ch.doc.id,...ch.doc.data()};
      ch.type==='removed' ? flats.delete(ch.doc.id) : flats.set(ch.doc.id,d);
    });
    if (_firstLoad) {
      _firstLoad = false;
      const lo = document.getElementById('lo'); if(lo) lo.style.display = 'none';
      const appEl = document.getElementById('app'); if(appEl) appEl.style.display = '';
    }
    rAll();
  });
}

function listenExp(){
  if(eu)eu();
  eu=onSnapshot(query(expColl(),where('month','==',AM)),snap=>{
    exps.clear();
    snap.forEach(d=>{const e={expId:d.id,...d.data()};const a=exps.get(e.flatId)||[];a.push(e);exps.set(e.flatId,a);});
    rAll();
  });
}

function listenIssues(){
  if(iu)iu();
  iu=onSnapshot(issuesColl(),snap=>{issues.length=0;snap.forEach(d=>issues.push({id:d.id,...d.data()}));rAll();});
}

function listenVehicles(){ if(vu)vu(); vu=onSnapshot(vehColl(),snap=>{ vehicles.clear(); snap.forEach(d=>vehicles.set(d.id,{...d.data()})); rStats(); }); }
function listenSocExp(){ if(pu)pu(); pu=onSnapshot(sexpColl(),snap=>{ socExps.length=0; snap.forEach(d=>socExps.push({id:d.id,...d.data()})); rPresident(); }); }

function switchView(v) { 
  AV = v; 
  if(v==='residents') rResidents();
  if(v==='president') rPresident();
}

function rAll(){ rStats(); rBTabs(); rBlock(); rIssues(); }

async function boot(){
  try{
    const aptDoc = await getDoc(aptDocRef());
    if(aptDoc.exists() && aptDoc.data().name) applyAptName(aptDoc.data().name);
    await loadCats();
    listenFlats(); listenExp(); listenIssues(); listenVehicles(); listenSocExp();
  }catch(err){ console.error(err); }
}

window._sB = b => { AB=b; rBTabs(); rBlock(); };
window.switchView = switchView;
