/* --- payments.js — flat grid, drawer, add payment/flat ==== */
import { db } from './firebase.js';
import { doc, addDoc, setDoc, updateDoc, collection, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// State injected by core
export let _dFid=null, _dPage=0, _dQ='', _dCat='all';
export const PAGE_SIZE = 20;

function setAB(v) { AB = v; }

/* --- payments.js == */
/* --- */
   PAYMENTS TAB — js/payments.js
   Handles: block tabs OR floor tabs (no-block buildings)
   Custom filters: status, resident type, floor, search

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
/* --- */
   ISSUES TAB — js/issues.js
   Depends on: window.APP (shared state injected from app.html)

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

  /* Build cat filter options from this flat's history */
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

/* --- */
   ADD EXPENSE MODAL

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

/* --- */
   ADD FLAT MODAL

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

/* --- */
   RAISE ISSUE MODAL

export { setAB, hasBlocks, getFloors, updateFloorFilter, rBTabs, rBlock, oFl, _renderHistPage, cD, cM, autoSaveFlat, toggleOwnerFields, saveExpAmt, fBS, fFS, oA, oAFor, cA, sE, oAF, cAF, sNF };
