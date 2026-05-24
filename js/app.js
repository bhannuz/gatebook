import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import { getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js';

/* ====== MERGED app.js ====== */


/* ====== js/firebase.js ====== */
// firebase.js — shared Firebase initialisation
// Keep this file out of public repos in production; use environment variables.


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
/* --- payments.js — flat grid, drawer, add payment/flat ==== */

// State injected by core
let _dFid=null, _dPage=0, _dQ='', _dCat='all';
const PAGE_SIZE = 20;

function setAB(v) { AB = v; }

/* --- payments.js == */
/* ---
   PAYMENTS TAB — js/payments.js
   Handles: block tabs OR floor tabs (no-block buildings)
   Custom filters: status, resident type, floor, search
--- */

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
  if (!hasBlocks()) { sel.style.display = 'none'; return; } // no-block uses floor tabs not dropdown
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
    // No blocks — show floor tabs
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
    document.getElementById('flf').style.display = 'none'; // no dropdown when using floor tabs
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
    // Group by floor when in block view with multiple floors
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


/* --- issues.js == */
/* ---
   ISSUES TAB — js/issues.js
   Depends on: window.APP (shared state injected from app.html)
--- */

function oFl(fid) {
  _dFid  = fid;
  _dPage = 0;
  _dQ    = '';
  _dCat  = 'all';
  const f = flats.get(fid); if (!f) return;
  const s   = st(f);
  const bal = f.due - f.paid;
  const sc  = s==='paid'?'var(--green)':s==='partial'?'var(--amber)':'var(--red)';
  const month = new Date(AM+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'});

  document.getElementById('dTitle').textContent = f.flatId + (f.owner?' — '+f.owner:'');
  document.getElementById('dSub').textContent   = (f.block?'Block '+f.block+' · ':'')+month;

  // Fixed Comment Syntax below
  const ex   = fex(fid);
  const cats = [...new Set(ex.map(e=>e.cat).filter(Boolean))].sort();
  const catOpts = `<option value="all">All categories</option>`
    + cats.map(c=>`<option value="${c}">${c}</option>`).join('');

  document.getElementById('dBody').innerHTML = `
    <div class="drawer-stats">
      <div class="dstat"><div class="dstat-label">Paid</div><div class="dstat-val" style="color:var(--green)">${inr(f.paid)}</div></div>
      <div class="dstat"><div class="dstat-label">Balance</div><div class="dstat-val" style="color:${bal>0?'var(--red)':'var(--green)'}">${inr(Math.abs(bal))}</div></div>
      <div class="dstat"><div class="dstat-label">Status</div><div class="dstat-val" style="font-size:11px;color:${sc}">${sl(s)}</div></div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;margin-top:12px">
      <div class="etitle" style="margin-bottom:0"><i class="ti ti-list"></i>Payment History <span id="dHistCount" style="font-size:11px;color:var(--muted);font-weight:600"></span></div>
      <button class="btn btn-indigo btn-sm" onclick="window._cD();window._oAFor('${f.block}','${fid}')">
        <i class="ti ti-plus"></i> Add
      </button>
    </div>

    ${ex.length > PAGE_SIZE ? `
    <div class="hist-toolbar">
      <div class="hist-search-wrap">
        <i class="ti ti-search"></i>
        <input class="hist-search" type="text" placeholder="Search category or note…"
          oninput="_dQ=this.value.toLowerCase().trim();_dPage=0;_renderHistPage()"/>
      </div>
      <select class="hist-cat-sel" onchange="_dCat=this.value;_dPage=0;_renderHistPage()">${catOpts}</select>
    </div>` : ''}

    <div id="dHistList"></div>
    <div id="dPager"></div>
  `;

  _renderHistPage();

  document.getElementById('flatDrawer').classList.add('open');
  document.getElementById('drawerBg').classList.add('open');
  document.getElementById('app').classList.add('drawer-open');
}

function _renderHistPage() {
  const f   = flats.get(_dFid); if (!f) return;
  const ex  = fex(_dFid);

  /* Filter */
  const vis = ex.filter(e => {
    if (_dCat !== 'all' && e.cat !== _dCat) return false;
    if (_dQ && !(e.cat||'').toLowerCase().includes(_dQ)
            && !(e.note||'').toLowerCase().includes(_dQ)
            && !(e.date||'').toLowerCase().includes(_dQ)) return false;
    return true;
  });

  const tot   = vis.reduce((s,e)=>s+(e.amt||0), 0);
  const pages = Math.max(1, Math.ceil(vis.length / PAGE_SIZE));
  if (_dPage >= pages) _dPage = pages - 1;

  const slice = vis.slice(_dPage * PAGE_SIZE, (_dPage+1) * PAGE_SIZE);

  /* Count label */
  const cntEl = document.getElementById('dHistCount');
  if (cntEl) cntEl.textContent = vis.length
    ? `(${vis.length}${vis.length !== ex.length ? ' filtered' : ''})`
    : '';

  /* Rows */
  const listEl = document.getElementById('dHistList');
  if (!listEl) return;

  if (!vis.length) {
    listEl.innerHTML = `<div class="hist-empty"><i class="ti ti-inbox"></i>${_dQ||_dCat!=='all'?'No records match this filter.':'No payments recorded yet.'}</div>`;
    document.getElementById('dPager').innerHTML = '';
    return;
  }

  listEl.innerHTML = `
    <div class="elist">
      ${slice.map(e=>`<div class="erow">
        <div>
          <div class="ecat"><i class="ti ti-tag"></i>${e.cat}</div>
          <div class="edate">${e.date}${e.note?' · '+e.note:''}</div>
        </div>
        <div class="eamt">${inr(e.amt)}</div>
      </div>`).join('')}
    </div>
    <div class="etotal" style="margin-top:0">
      <span class="etotal-label">
        ${pages>1?`Page ${_dPage+1}/${pages} · `:''}${vis.length} record${vis.length!==1?'s':''}
      </span>
      <span class="etotal-val">${inr(tot)}</span>
    </div>`;

  /* Pagination (only if more than one page) */
  const pagerEl = document.getElementById('dPager');
  if (pages <= 1) { pagerEl.innerHTML=''; return; }

  const maxBtns = 5;
  let start = Math.max(0, _dPage - Math.floor(maxBtns/2));
  let end   = Math.min(pages, start + maxBtns);
  if (end - start < maxBtns) start = Math.max(0, end - maxBtns);

  let btns = `<button class="pager-btn" onclick="_dPage=Math.max(0,_dPage-1);_renderHistPage()"
    ${_dPage===0?'disabled':''} title="Previous"><i class="ti ti-chevron-left"></i></button>`;

  if (start > 0) btns += `<button class="pager-btn" onclick="_dPage=0;_renderHistPage()">1</button>
    ${start>1?'<span class="pager-info">…</span>':''}`;

  for (let i=start; i<end; i++) {
    btns += `<button class="pager-btn${i===_dPage?' active':''}" onclick="_dPage=${i};_renderHistPage()">${i+1}</button>`;
  }

  if (end < pages) btns += `${end<pages-1?'<span class="pager-info">…</span>':''}
    <button class="pager-btn" onclick="_dPage=${pages-1};_renderHistPage()">${pages}</button>`;

  btns += `<button class="pager-btn" onclick="_dPage=Math.min(${pages-1},_dPage+1);_renderHistPage()"
    ${_dPage===pages-1?'disabled':''} title="Next"><i class="ti ti-chevron-right"></i></button>`;

  pagerEl.innerHTML = `<div class="pager">${btns}</div>`;
}

function cD() {
  document.getElementById('flatDrawer').classList.remove('open');
  document.getElementById('drawerBg').classList.remove('open');
  document.getElementById('app').classList.remove('drawer-open');
}

function cM(){document.getElementById('flatM').classList.remove('open');}

/* auto-save flat fields on blur / select change — no button needed */
let _autoSaveTimer=null;
async function autoSaveFlat(fid) {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(async()=>{
    const owner      = (document.getElementById('edOwner')?.value||'').trim();
    const resType    = document.getElementById('edType')?.value||'owner';
    const due        = parseInt(document.getElementById('edDue')?.value)||0;
    const moveIn     = document.getElementById('edMoveIn')?.value||'';
    const moveOut    = document.getElementById('edMoveOut')?.value||'';
    const ownerName  = (document.getElementById('edOwnerName')?.value||'').trim();
    const ownerPhone = (document.getElementById('edOwnerPhone')?.value||'').trim();
    sync('saving');
    try {
      await updateDoc(flatRef(fid),{owner,resType,due,moveIn,moveOut,ownerName,ownerPhone});
      sync('live');
      document.getElementById('mdT').textContent=`${fid} — ${owner||'(No resident)'}`;
      toast('Saved ✓');
    } catch(e){ console.error(e);sync('error');toast('Save failed.','error'); }
  }, 400);
}

function toggleOwnerFields(resType) {
  const sec = document.getElementById('ownerSection');
  if (sec) sec.style.display = resType === 'tenant' ? 'grid' : 'none';
}

/* inline edit of a payment amount in history */
async function saveExpAmt(expId, rawVal, fid) {
  const amt = parseInt(rawVal)||0;
  const expDocRef = doc(db,'apartments',UID,'expenses',expId);
  sync('saving');
  try {
    await updateDoc(expDocRef,{amt});
    // recalculate flat paid from all its expenses
    const allEx = exps.get(fid)||[];
    const totalPaid = allEx.reduce((s,e)=> e.expId===expId ? s+amt : s+e.amt, 0);
    await updateDoc(flatRef(fid),{paid:totalPaid});
    sync('live'); toast('Payment updated ✓');
  } catch(e){ console.error(e);sync('error');toast('Update failed.','error'); }
}

/* --- ADD EXPENSE MODAL --- */

function fBS(){
  document.getElementById('fB').innerHTML=bks().map(b=>`<option value="${b}">Block ${b}</option>`).join('');
  document.getElementById('fB').value=AB;
}
function fFS(){
  const b=document.getElementById('fB').value;
  document.getElementById('fF').innerHTML=bfl(b).map(f=>`<option value="${f.flatId}">${f.flatId} — ${f.owner||'(No owner)'}</option>`).join('');
}
function oA(){fBS();fFS();document.getElementById('fD').value=new Date().toISOString().split('T')[0];document.getElementById('fA').value='';document.getElementById('fN').value='';document.getElementById('fS').value='paid';renderCatOpts('fC','flat');document.getElementById('addM').classList.add('open')}
function oAFor(block,fid){fBS();document.getElementById('fB').value=block;fFS();setTimeout(()=>document.getElementById('fF').value=fid,10);document.getElementById('fD').value=new Date().toISOString().split('T')[0];document.getElementById('fA').value='';document.getElementById('fN').value='';document.getElementById('fS').value='paid';renderCatOpts('fC','flat');document.getElementById('addM').classList.add('open')}
function cA(){document.getElementById('addM').classList.remove('open');}
document.getElementById('fB').addEventListener('change',fFS);

async function sE(){
  const block=document.getElementById('fB').value,fid=document.getElementById('fF').value;
  const cat=document.getElementById('fC').value,amt=parseInt(document.getElementById('fA').value)||0;
  const dv=document.getElementById('fD').value,s=document.getElementById('fS').value;
  const note=document.getElementById('fN').value.trim();
  if(!amt||amt<=0){toast('Please enter a valid amount.','error');return;}
  const f=flats.get(fid);if(!f){toast('Flat not found.','error');return;}
  sync('saving');
  const btn=document.getElementById('svBtn');btn.disabled=true;
  document.getElementById('svLbl').textContent='Saving…';
  try{
    await addDoc(expColl(),{flatId:fid,block,cat,amt,date:dv?fd(dv):fd(new Date().toISOString()),note,status:s,month:AM,createdAt:serverTimestamp()});
    let np=f.paid;
    if(s==='paid')np=f.due;else if(s==='partial')np=Math.min(f.paid+amt,f.due-1);
    await updateDoc(flatRef(fid),{paid:np});
    sync('live');cA();toast('Payment saved ✓');
  }catch(e){console.error(e);sync('error');toast('Save failed. Check console.','error');}
  finally{btn.disabled=false;document.getElementById('svLbl').textContent='Save Payment';}
}

/* --- ADD FLAT MODAL --- */

function oAF(){
  document.getElementById('nB').innerHTML=bks().map(b=>`<option value="${b}">Block ${b}</option>`).join('');
  document.getElementById('nI').value='';document.getElementById('nO').value='';document.getElementById('nD').value='';
  document.getElementById('flatAddM').classList.add('open');
}
function cAF(){document.getElementById('flatAddM').classList.remove('open');}
async function sNF(){
  const block=document.getElementById('nB').value,id=document.getElementById('nI').value.trim().toUpperCase();
  const owner=document.getElementById('nO').value.trim(),due=parseInt(document.getElementById('nD').value)||0;
  if(!id){toast('Enter a flat number.','error');return;}
  if(!owner){toast('Enter owner name.','error');return;}
  if(flats.has(id)){toast(`Flat ${id} already exists.`,'error');return;}
  sync('saving');
  try{
    await setDoc(flatRef(id),{block,owner,resType:'owner',due:0,paid:0,month:AM});
    sync('live');cAF();toast(`Flat ${id} registered ✓`);AB=block;rBTabs();rBlock();
  }catch(e){console.error(e);sync('error');toast('Failed to register flat.','error');}
}

/* --- RAISE ISSUE MODAL --- */



/* ====== js/issues.js ====== */
/* --- issues.js — issues list, raise, detail, update ==== */

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


/* --- members.js == */
/* ---
   MEMBERS TAB — js/members.js
   Depends on: window.APP (shared state injected from app.html)

/* MF declared in state line above */

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

/* --- ISSUE DETAIL MODAL --- */

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

/* --- FIRESTORE LISTENERS (scoped under apartments/{uid}/...) --- */



/* ====== js/residents.js ====== */
/* --- residents.js — members, vehicles, merged residents tab ==== */

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


/* --- vehicles.js == 
   VEHICLES TAB — js/vehicles.js
   Reads from: closure vars (shared state) 
--- */ // <--- FIXED: Safely closing this section header now

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


/* --- president.js == 
   PRESIDENT TAB — js/president.js
   Reads from: closure vars (shared state) 
--- */ // <--- FIXED: Safely closing this section header now

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



/* ====== js/president.js ====== */
/* --- president.js — president chip, society expenses, category breakdown ==== */

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



/* ====== js/categories.js ====== */
/* --- categories.js — custom expense categories + inline add ==== */

function getCats(type){ return [...new Set([...(type==='flat'?DEFAULT_FLAT_CATS:DEFAULT_SOC_CATS),...(type==='flat'?customCats.flat:customCats.soc)])]; }

function renderCatOpts(selId, type){
  const sel=document.getElementById(selId); if(!sel)return;
  const cur=sel.value;
  sel.innerHTML=getCats(type).map(c=>`<option value="${c}">${c}</option>`).join('')
    + `<option value="__new__" style="color:var(--indigo);font-weight:700">＋ New Category…</option>`;
  if(cur && getCats(type).includes(cur)) sel.value=cur;
}

function renderCatChips(listId, type){
  const el=document.getElementById(listId); if(!el)return;
  const def=type==='flat'?DEFAULT_FLAT_CATS:DEFAULT_SOC_CATS;
  const custom=type==='flat'?customCats.flat:customCats.soc;
  el.innerHTML=[...new Set([...def,...custom])].map(c=>`
    <span class="cat-chip">${c}${!def.includes(c)?`<button class="cat-del" onclick="window._delCat('${type}','${c}')"><i class="ti ti-x"></i></button>`:''}</span>
  `).join('');
}

function oCatM(){
  renderCatChips('flatCatList','flat');
  renderCatChips('socCatList','soc');
  ['flatCatInput','socCatInput'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('catM').classList.add('open');
}
function cCatM(){ document.getElementById('catM').classList.remove('open'); }

async function addCat(type){
  const inp=document.getElementById(type==='flat'?'flatCatInput':'socCatInput');
  const val=(inp?.value||'').trim(); if(!val){toast('Enter a category name.','error');return;}
  const arr=type==='flat'?customCats.flat:customCats.soc;
  const def=type==='flat'?DEFAULT_FLAT_CATS:DEFAULT_SOC_CATS;
  if([...def,...arr].map(c=>c.toLowerCase()).includes(val.toLowerCase())){toast('Already exists.','error');return;}
  arr.push(val); if(inp)inp.value='';
  await saveCats();
  renderCatChips(type==='flat'?'flatCatList':'socCatList',type);
  renderCatOpts('fC','flat'); renderCatOpts('peCat','soc');
  toast(`"${val}" added ✓`);
}

async function delCat(type,name){
  const arr=type==='flat'?customCats.flat:customCats.soc;
  const i=arr.indexOf(name); if(i===-1)return;
  arr.splice(i,1);
  await saveCats();
  renderCatChips(type==='flat'?'flatCatList':'socCatList',type);
  renderCatOpts('fC','flat'); renderCatOpts('peCat','soc');
  toast(`"${name}" removed`);
}

async function saveCats(){
  try{ await setDoc(doc(db,'apartments',UID,'config','categories'), customCats); sync('live'); }
  catch(e){ console.error(e); toast('Failed to save categories.','error'); }
}

async function loadCats(){
  try{
    const snap=await getDoc(doc(db,'apartments',UID,'config','categories'));
    if(snap.exists()){const d=snap.data();customCats.flat=d.flat||[];customCats.soc=d.soc||[];}
  } catch(e){ console.error('loadCats:',e); }
  renderCatOpts('fC','flat'); renderCatOpts('peCat','soc');
}

window._oCatM=oCatM; window._cCatM=cCatM;
window._addCat=addCat; window._delCat=delCat;


/* ── Inline category add in dropdowns ── */
function _catSelChange(selId, type) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  if (sel.value === '__new__') {
    // Revert to first valid option while input shows
    sel.value = getCats(type)[0] || 'Maintenance';
    window._showInlineCat(selId);
  }
};

function _showInlineCat(selId) {
  const wrap = document.getElementById(selId + '_new');
  const inp  = document.getElementById(selId + '_input');
  if (!wrap) return;
  wrap.style.display = 'block';
  if (inp) { inp.value = ''; inp.focus(); }
};

function _hideInlineCat(selId) {
  const wrap = document.getElementById(selId + '_new');
  if (wrap) wrap.style.display = 'none';
};

async function _addInlineCat(selId, type) {
  const inp = document.getElementById(selId + '_input');
  const val = (inp?.value || '').trim();
  if (!val) { inp?.focus(); return; }
  const arr = type==='flat' ? customCats.flat : customCats.soc;
  const def = type==='flat' ? DEFAULT_FLAT_CATS : DEFAULT_SOC_CATS;
  if ([...def,...arr].map(c=>c.toLowerCase()).includes(val.toLowerCase())) {
    toast('Category already exists.','error');
    inp?.focus(); return;
  }
  arr.push(val);
  await saveCats();
  renderCatOpts(selId, type);
  // Select the newly added category
  const sel = document.getElementById(selId);
  if (sel) sel.value = val;
  window._hideInlineCat(selId);
  toast(`"${val}" added ✓`);
};



/* ====== js/core.js ====== */
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
         fBS, fFS, oA, oAFor, cA, sE, oAF, cAF, sNF,
         setAB, hasBlocks, getFloors, updateFloorFilter }
         oVehM, oVehFor, cVehM, sVeh, delVeh }
         oPresExp, cPresExp, sPresExp, updSEStatus, delSE }
         oCatM, cCatM, addCat, delCat, saveCats,
         _catSelChange, _addInlineCat, _hideInlineCat, _showInlineCat }


/* --- --- AUTH GUARD --- */
let UID = null;

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.replace('index.html');
    return;
  }
  UID = user.uid;
  // Show user info in nav
  const initials = (user.displayName||user.email||'A').charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent   = user.displayName || user.email.split('@')[0];
  boot();
});

window._doSignOut = async function() {
  await signOut(auth);
  window.location.replace('index.html');
};

/* --- --- HELPERS for scoped Firestore paths All data lives under apartments/{uid}/... --- */
const flatsColl   = () => collection(db, 'apartments', UID, 'flats');
const expColl     = () => collection(db, 'apartments', UID, 'expenses');
const issuesColl  = () => collection(db, 'apartments', UID, 'issues');
const aptDocRef   = () => doc(db, 'apartments', UID);
const flatRef     = id => doc(db, 'apartments', UID, 'flats', id);
const issueRef    = id => doc(db, 'apartments', UID, 'issues', id);
const vehColl     = () => collection(db, 'apartments', UID, 'vehicles');
const vehRef      = id => doc(db, 'apartments', UID, 'vehicles', id);
const sexpColl    = () => collection(db, 'apartments', UID, 'soc_expenses');
const sexpRef     = id => doc(db, 'apartments', UID, 'soc_expenses', id);

/* --- --- STATE --- */
const flats  = new Map();
const exps   = new Map();
const issues = [];

let AB='', FS='all', SQ='', RTF='all', FLF='all', MF='all', AM=new Date().toISOString().slice(0,7), AV='payments', IF='all';
let eu=null, iu=null, vu=null, pu=null;
const vehicles = new Map();   // flatId -> {tw,fw,nums,slot}
const socExps  = [];          // society-level expenses
let president  = null;        // current president object
let customCats = { flat: [], soc: [] }; // user-defined expense categories
const DEFAULT_FLAT_CATS = ['Maintenance','Water','Electricity','Parking','Lift','Security','Cleaning','Other'];
const DEFAULT_SOC_CATS  = ['Maintenance','Water','Electricity','Security','Cleaning','Lift','Gardening','Painting','Other'];
let APT_NAME = 'Gatebook';

/* --- --- HELPERS --- */
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

/* --- ── Shared APP context for tab modules ── --- */
function refreshAPP() { /* --- no-op — all functions use closure vars directly  } /* ── Month selector ── --- */
function buildMonthSelect() {
  const sel = document.getElementById('mf');
  const opts = [];
  for (let i=0; i<12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth()-i);
    const val = d.toISOString().slice(0,7);
    const lbl = d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
    opts.push(`<option value="${val}"${val===AM?' selected':''}>${lbl}</option>`);
  }
  sel.innerHTML = opts.join('');
}

/* --- --- --- APT NAME --- --- */
function applyAptName(name) {
  APT_NAME = name||'Gatebook';
  document.getElementById('aptNameDisplay').innerHTML =
    `${APT_NAME.replace(/(\w+)$/,'<em>$1</em>')}`;
  document.title = `${APT_NAME} — Powered by AK Group`;
}


/* --- --- --- SYNC & TOAST --- --- */
function sync(s) {
  const d=document.getElementById('sdot'),l=document.getElementById('slbl');
  if(!d)return;
  d.className='sdot '+s;
  l.textContent={live:'Live',saving:'Saving…',error:'Error'}[s];
}

function toast(msg, t='success') {
  const el=document.getElementById('toast');
  document.getElementById('tMsg').textContent=msg;
  document.getElementById('tIco').className=t==='success'?'ti ti-circle-check':'ti ti-alert-circle';
  el.className=t+' show';
  setTimeout(()=>el.className='',3200);
}

/* --- --- --- RENDER --- --- */
function rStats() {
  const all=([...flats.values()]).filter(f=>f.month===AM);
  const due=all.reduce((s,f)=>s+f.due,0);
  const paid=all.reduce((s,f)=>s+f.paid,0);
  const pc=all.filter(f=>st(f)==='paid').length;
  const pen=all.filter(f=>st(f)==='pending').length;
  const pct=due?Math.round(paid/due*100):0;
  const oi=issues.filter(i=>i.status==='open').length;
  const ip=issues.filter(i=>i.status==='in-progress').length;

  document.getElementById('openCnt').textContent=oi;
  // Update flat count badge in navbar
  const badge=document.getElementById('flatCountBadge');
  if(badge){badge.textContent=`${all.length} flats`;badge.style.display='';}
  const totTw=[...vehicles.values()].reduce((s,v)=>s+(parseInt(v.tw)||0),0);
  const totFw=[...vehicles.values()].reduce((s,v)=>s+(parseInt(v.fw)||0),0);
  document.getElementById('phAct').innerHTML=`
    <button class="btn btn-indigo"  onclick="window._oA()"><i class="ti ti-plus"></i> Add Payment</button>
    <button class="btn btn-white"   onclick="window._oPresExp()"><i class="ti ti-receipt"></i> Add Expense</button>
  `;
  document.getElementById('statsRow').innerHTML=`
    <div class="scard indigo">
      <div class="sc-top"><div class="sc-icon"><i class="ti ti-receipt"></i></div><span class="sc-trend up">This month</span></div>
      <div class="sc-label">Total Due</div><div class="sc-value">${inr(due)}</div>
      <div class="sc-sub">${all.filter(f=>f.resType!=='tenant').length} owners · ${all.filter(f=>f.resType==='tenant').length} tenants</div>
    </div>
    <div class="scard green">
      <div class="sc-top"><div class="sc-icon"><i class="ti ti-circle-check"></i></div><span class="sc-trend up">${pct}% collected</span></div>
      <div class="sc-label">Amount Collected</div><div class="sc-value">${inr(paid)}</div>
      <div class="sc-sub">${pc} of ${all.length} flats fully paid</div>
      <div class="sc-bar"><div class="sc-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="scard amber">
      <div class="sc-top"><div class="sc-icon"><i class="ti ti-clock"></i></div><span class="sc-trend dn">${pen} pending</span></div>
      <div class="sc-label">Outstanding Balance</div><div class="sc-value">${inr(due-paid)}</div>
      <div class="sc-sub">${all.filter(f=>st(f)==='partial').length} partial · ${pen} not paid</div>
      <div class="sc-bar"><div class="sc-fill" style="width:${due?Math.round((due-paid)/due*100):0}%"></div></div>
    </div>
    <div class="scard red">
      <div class="sc-top"><div class="sc-icon"><i class="ti ti-tool"></i></div><span class="sc-trend dn">${ip} in progress</span></div>
      <div class="sc-label">Open Issues</div><div class="sc-value">${oi}</div>
      <div class="sc-sub">${issues.filter(i=>i.status==='resolved').length} resolved</div>
    </div>
  `;
}


window.fMem = fMem;
window.rResidents = rResidents;
window._oCatM = oCatM;
window._cCatM = cCatM;
window._addCat = addCat;
window._delCat = delCat;
window._cD=cD;
window.switchView=switchView;
window.fIss=fIss;
window.fMem=fMem;
window.rMembers=rMembers;

/* --- Flat drawer state / Firestore listeners --- */

function listenFlats(){
  let _firstLoad = true;
  onSnapshot(flatsColl(), snap => {
    snap.docChanges().forEach(ch => {
      const d = {flatId:ch.doc.id,...ch.doc.data()};
      ch.type==='removed' ? flats.delete(ch.doc.id) : flats.set(ch.doc.id,d);
    });
    if (_firstLoad) {
      _firstLoad = false;
      document.getElementById('lo').style.display  = 'none';
      document.getElementById('app').style.display = '';
    }
    try { refreshAPP(); rAll(); } catch(e) { console.error('rAll error:', e); }
    sync('live');
  },e=>{
    console.error('Flats listener error:',e);
    sync('error');
    document.getElementById('loSub').textContent='⚠ Firebase connection failed. Check console.';
  });
}

function listenExp(){
  if(eu)eu();
  const q=query(expColl(),where('month','==',AM),orderBy('createdAt','asc'));
  eu=onSnapshot(q,snap=>{
    exps.clear();
    snap.forEach(d=>{const e={expId:d.id,...d.data()};const a=exps.get(e.flatId)||[];a.push(e);exps.set(e.flatId,a);});
    rAll();
  },()=>{
    const q2=query(expColl(),where('month','==',AM));
    eu=onSnapshot(q2,snap=>{exps.clear();snap.forEach(d=>{const e={expId:d.id,...d.data()};const a=exps.get(e.flatId)||[];a.push(e);exps.set(e.flatId,a);});rAll();});
  });
}

function listenIssues(){
  if(iu)iu();
  const q=query(issuesColl(),orderBy('createdAt','desc'));
  iu=onSnapshot(q,snap=>{issues.length=0;snap.forEach(d=>issues.push({id:d.id,...d.data()}));rAll();},
    ()=>{iu=onSnapshot(issuesColl(),snap=>{issues.length=0;snap.forEach(d=>issues.push({id:d.id,...d.data()}));rAll();});});
}

/* --- --- --- --- DOM EVENTS --- --- --- */
document.getElementById('sf').addEventListener('change',e=>{FS=e.target.value;rBlock();});
document.getElementById('rtf').addEventListener('change',e=>{RTF=e.target.value;rBlock();});
document.getElementById('flf').addEventListener('change',e=>{FLF=e.target.value;rBlock();});
document.getElementById('qi').addEventListener('input', e=>{SQ=e.target.value.toLowerCase().trim();rBlock();});
// #mf month dropdown removed from UI — AM stays as current month
['flatM','addM','flatAddM','rIM','idM','vehM','presM','presExpM','catM'].forEach(id=>{
  const el=document.getElementById(id);if(!el)return;
  el.addEventListener('click',e=>{
    if(e.target.id===id){cM();cA();cAF();cRI();cID();cVehM();cPresM();cPresExp();}
  });
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){cD();cA();cAF();cRI();cID();cVehM();cPresM();cPresExp();cCatM();}});

/* --- --- --- WINDOW EXPOSE --- --- 
window._sB = b => { AB=b; FLF='all'; const flf=document.getElementById('flf'); if(flf)flf.value='all'; refreshAPP(); rBTabs(); rBlock(); };
window._oFl  =oFl;  window._cM=cD;
window._autoSaveFlat=autoSaveFlat;
window._toggleOwnerFields=toggleOwnerFields;
window._saveExpAmt=saveExpAmt;
window._oA   =oA;   window._oAFor=oAFor; window._cA=cA; window._sE=sE;
window._oAF  =oAF;  window._cAF=cAF;    window._sNF=sNF;
window._oRI  =oRI;  window._cRI=cRI;    window._sI=sI;
window._oID  =oID;  window._cID=cID;    window._uIS=uIS;
// vehicles.js
window._oVehM   = oVehM;   window._oVehFor = oVehFor;
window._cVehM   = cVehM;   window._sVeh    = sVeh;   window._delVeh = delVeh;
window.rVehicles = rVehicles;
// president.js
window._oPresM   = oPresM;  window._cPresM  = cPresM;  window._sPres   = sPres;
window._oPresExp = oPresExp; window._cPresExp= cPresExp; window._sPresExp= sPresExp;
window._updSEStatus = updSEStatus; window._delSE = delSE;
window.rPresident = rPresident;
// issues.js / members.js
window.fIss = fIss; window.fMem = fMem; window.rMembers = rMembers;

/* --- IN-APP SETUP WIZARD: Shown when the account has no flats yet --- */
let WIZ_BLOCKS = [{ name:'A', floors:4, flatsPerFloor:4 }];

function wizSetStep(n) {
  [0,1,2].forEach(i => {
    document.getElementById('ws'+i).style.display = i===n ? '' : 'none';
  });
  // Update dots
  const dots = document.getElementById('wizDots').children;
  [0,1,2].forEach(i => {
    const d = dots[i];
    if(i < n)       d.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0';
    else if(i === n) d.style.cssText = 'width:24px;height:8px;border-radius:99px;background:var(--indigo);flex-shrink:0';
    else             d.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--surface3);flex-shrink:0';
  });
}

function wizRenderBlocks() {
  document.getElementById('wBlocks').innerHTML = WIZ_BLOCKS.map((b,i) => `
    <div class="wiz-block-row">
      <div>
        <label>Block Name</label>
        <input type="text" value="${b.name}" maxlength="3" placeholder="A"
          oninput="WIZ_BLOCKS[${i}].name=this.value.toUpperCase();wizUpdatePreview()"/>
      </div>
      <div>
        <label>Floors</label>
        <input type="number" value="${b.floors}" min="1" max="50"
          oninput="WIZ_BLOCKS[${i}].floors=parseInt(this.value)||1;wizUpdatePreview()"/>
      </div>
      <div>
        <label>Flats / Floor</label>
        <input type="number" value="${b.flatsPerFloor}" min="1" max="20"
          oninput="WIZ_BLOCKS[${i}].flatsPerFloor=parseInt(this.value)||1;wizUpdatePreview()"/>
      </div>
      ${WIZ_BLOCKS.length > 1
        ? `<button class="wiz-rm" onclick="wizRemoveBlock(${i})"><i class="ti ti-trash"></i></button>`
        : '<div></div>'}
    </div>`).join('');
  wizUpdatePreview();
}

function wizRemoveBlock(i) { WIZ_BLOCKS.splice(i,1); wizRenderBlocks(); }

window.WIZ_BLOCKS = WIZ_BLOCKS;
window.wizUpdatePreview = function() {
  let total=0, lines=[];
  WIZ_BLOCKS.forEach(b => {
    const cnt = b.floors * (b.flatsPerFloor||1);
    total += cnt;
    lines.push(`<strong>Block ${b.name||'?'}</strong> — ${b.floors} floor${b.floors!==1?'s':''}, ${b.flatsPerFloor} flat${b.flatsPerFloor!==1?'s':''}/floor = ${cnt} flats`);
  });
  const p = document.getElementById('wPreview');
  if(p) p.innerHTML = lines.join('<br>') + `<br><strong>Total: ${total} flats</strong> will be created`;
};
window.wizRemoveBlock = wizRemoveBlock;

window._wizAddBlock = function() {
  const letters = 'ABCDEFGHIJKLMNOP';
  WIZ_BLOCKS.push({ name: letters[WIZ_BLOCKS.length] || String(WIZ_BLOCKS.length+1), floors:4, flatsPerFloor:4 });
  wizRenderBlocks();
};

window._wizBack = n => wizSetStep(n-1);

window._wizNext = function(from) {
  if(from === 0) {
    const n = document.getElementById('wAptName').value.trim();
    if(!n) { toast('Please enter your apartment name.','error'); return; }
    APT_NAME = n; applyAptName(n);
    wizRenderBlocks();
    wizSetStep(1);
  } else if(from === 1) {
    if(WIZ_BLOCKS.some(b=>!b.name.trim())) { toast('Every block needs a name.','error'); return; }
    // Build confirm preview
    let html = `<strong>${APT_NAME}</strong><br><br>`;
    WIZ_BLOCKS.forEach(b => {
      html += `🏢 <strong>Block ${b.name}</strong>: ${b.floors} floors × ${b.flatsPerFloor} flats = ${b.floors*b.flatsPerFloor} flats<br>`;
      for(let fl=1; fl<=Math.min(b.floors,3); fl++) {
        const ids=[];
        for(let f=1; f<=b.flatsPerFloor; f++) ids.push(`${b.name}-${fl}${String(f).padStart(2,'0')}`);
        html+=`&nbsp;&nbsp;&nbsp;Floor ${fl}: ${ids.join(', ')}<br>`;
      }
      if(b.floors>3) html += `&nbsp;&nbsp;&nbsp;… and ${b.floors-3} more floor${b.floors-3!==1?'s':''}<br>`;
    });
    const tot = WIZ_BLOCKS.reduce((s,b)=>s+b.floors*b.flatsPerFloor,0);
    html += `<br><strong>Total: ${tot} flats</strong> will be auto-created.`;
    document.getElementById('wConfirm').innerHTML = html;
    wizSetStep(2);
  }
};

window._wizLaunch = async function() {
  const btn = document.getElementById('wLaunchBtn');
  btn.disabled = true;
  document.getElementById('wLaunchLbl').textContent = ' Creating…';
  try {
    // Save apt config (merge so name is preserved if set)
    await setDoc(aptDocRef(), { name: APT_NAME, blocks: WIZ_BLOCKS }, { merge: true });
    // Create flats
    for(const b of WIZ_BLOCKS) {
      for(let fl=1; fl<=b.floors; fl++) {
        for(let f=1; f<=b.flatsPerFloor; f++) {
          const fid = `${b.name}-${fl}${String(f).padStart(2,'0')}`;
          await setDoc(flatRef(fid), { block:b.name, floor:fl, owner:'', resType:'owner', due:0, paid:0, month:AM });
        }
      }
    }
    document.getElementById('setupWiz').style.display = 'none';
    document.getElementById('lo').style.display = '';
    listenFlats(); listenExp(); listenIssues(); listenVehicles(); listenSocExp();
    toast(`${APT_NAME} launched ✓`);
  } catch(e) {
    console.error(e);
    toast('Launch failed. Check console.','error');
    btn.disabled = false;
    document.getElementById('wLaunchLbl').textContent = ' Launch App';
  }
};

/* --- switchView --- */
function switchView(v) { AV = v; refreshAPP();
  document.getElementById('pView').style.display    = v==='payments'  ? 'block' : 'none';
  document.getElementById('iView').style.display    = v==='issues'    ? 'block' : 'none';
  document.getElementById('resView').style.display  = v==='residents' ? 'block' : 'none';
  document.getElementById('presView').style.display = v==='president' ? 'block' : 'none';
  document.querySelectorAll('.vtab').forEach(p => p.classList.toggle('active', p.dataset.v===v));
  if(v==='residents') try{ rResidents(); } catch(e){ console.error(e); }
  if(v==='president') try{ rPresident(); } catch(e){ console.error(e); }
}

function rAll(){
  refreshAPP();
  rStats();
  try{ rBTabs(); } catch(e){ console.error('rBTabs',e); }
  try{ rBlock(); } catch(e){ console.error('rBlock',e); }
  try{ rIssues(); } catch(e){ console.error('rIssues',e); }
  const rv=document.getElementById('resView');
  if(rv && rv.style.display!=='none') try{ rResidents(); } catch(e){ console.error('rResidents',e); }
  const p=document.getElementById('presView');
  if(p && p.style.display!=='none') try{ rPresident(); } catch(e){ console.error('rPresident',e); }
}

/* --- LISTENERS for Vehicles + SocExp --- */
function listenVehicles(){ if(vu)vu(); vu=onSnapshot(vehColl(),snap=>{ vehicles.clear(); snap.forEach(d=>vehicles.set(d.id,{...d.data()})); rStats(); if(document.getElementById('vehView').style.display!=='none')rVehicles(); },e=>console.error('veh listener',e)); }

function listenSocExp(){
  if(pu)pu();
  const q=query(sexpColl(),orderBy('createdAt','desc'));
  pu=onSnapshot(q,snap=>{
    socExps.length=0;
    snap.forEach(d=>socExps.push({id:d.id,...d.data()}));
    if(document.getElementById('presView').style.display!=='none')rPresident();
  },()=>{
    pu=onSnapshot(sexpColl(),snap=>{socExps.length=0;snap.forEach(d=>socExps.push({id:d.id,...d.data()}));if(document.getElementById('presView').style.display!=='none')rPresident();});
  });
}

async function boot(){
  refreshAPP();
  // buildMonthSelect() — month dropdown removed from UI, AM defaults to current month
  try{
    // Load apartment config
    const aptDoc = await getDoc(aptDocRef());
    if(aptDoc.exists() && aptDoc.data().name) applyAptName(aptDoc.data().name);
    if(aptDoc.exists() && aptDoc.data().president) president=aptDoc.data().president;
    await loadCats();

    // Check if any flats exist
    const snap = await getDocs(flatsColl());
    if(snap.empty){
      // No flats yet — show in-app setup wizard
      document.getElementById('lo').style.display = 'none';
      const wiz = document.getElementById('setupWiz');
      wiz.style.display = 'flex';
      // Pre-fill name from config if available
      if(aptDoc.exists() && aptDoc.data().name){
        document.getElementById('wAptName').value = aptDoc.data().name;
      }
      wizSetStep(0);
    } else {
      listenFlats();
      listenExp();
      listenIssues();
      listenVehicles();
      listenSocExp();
    }
  }catch(err){
    console.error('Boot error:',err);
    document.getElementById('loSub').textContent='⚠ Firebase connection failed. Check console.';
  }
}

/* --- Window exposes --- */
window._doSignOut     = async () => { await signOut(auth); window.location.replace('index.html'); };
window._sB            = v => { setAB(v); rBTabs(); rBlock(); };
window._oFl           = oFl;   window._cD = cD;  window._cM = cD;
window._renderHistPage = _renderHistPage;
window._oA            = oA;    window._oAFor = oAFor; window._cA = cA;  window._sE = sE;
window._oAF           = oAF;   window._cAF = cAF;    window._sNF = sNF;
window._oRI           = oRI;   window._cRI = cRI;    window._sI  = sI;
window._oID           = oID;   window._cID = cID;    window._uIS = uIS;
window._oVehM         = oVehM; window._oVehFor = oVehFor; window._cVehM = cVehM;
window._sVeh          = sVeh;  window._delVeh  = delVeh;
window._oPresM        = oPresM;   window._cPresM   = cPresM;   window._sPres    = sPres;
window._oPresExp      = oPresExp; window._cPresExp = cPresExp; window._sPresExp = sPresExp;
window._updSEStatus   = updSEStatus; window._delSE = delSE;
window._oCatM         = oCatM; window._cCatM = cCatM;
window._addCat        = addCat; window._delCat = delCat;
window._catSelChange  = _catSelChange;
window._addInlineCat  = _addInlineCat;
window._hideInlineCat = _hideInlineCat;
window._showInlineCat = _showInlineCat;
window.switchView     = switchView;
window.fIss           = fIss;
window.fMem           = fMem;
window.rPresident     = rPresident;
window.rResidents     = rResidents;
window.renderCatOpts  = renderCatOpts;

window.rMembers       = rMembers;
window.saveCats       = saveCats;
window.loadCats       = loadCats;
