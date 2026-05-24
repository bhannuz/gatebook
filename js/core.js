import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { rBTabs, rBlock, oFl, _renderHistPage, cD,
         fBS, fFS, oA, oAFor, cA, sE, oAF, cAF, sNF,
         setAB, hasBlocks, getFloors, updateFloorFilter }
  from './payments.js';
import { rIssues, fIss, oRI, cRI, sI, oID, cID, uIS }
  from './issues.js';
import { rResidents, rMembers, rVehicles, fMem,
         oVehM, oVehFor, cVehM, sVeh, delVeh }
  from './residents.js';
import { rPresident, oPresM, cPresM, sPres,
         oPresExp, cPresExp, sPresExp, updSEStatus, delSE }
  from './president.js';
import { loadCats, renderCatOpts, renderCatChips, getCats,
         oCatM, cCatM, addCat, delCat, saveCats,
         _catSelChange, _addInlineCat, _hideInlineCat, _showInlineCat }
  from './categories.js';


/* ---
   AUTH GUARD

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

/* ---
   HELPERS for scoped Firestore paths
   All data lives under apartments/{uid}/...

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

/* ---
   STATE

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

/* ---
   HELPERS

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

/* ── Shared APP context for tab modules ── */
function refreshAPP() { /* no-op — all functions use closure vars directly */ }

/* ── Month selector ── */
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

/* ---
   APT NAME

function applyAptName(name) {
  APT_NAME = name||'Gatebook';
  document.getElementById('aptNameDisplay').innerHTML =
    `${APT_NAME.replace(/(\w+)$/,'<em>$1</em>')}`;
  document.title = `${APT_NAME} — Powered by AK Group`;
}


/* ---
   SYNC & TOAST

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

/* ---
   RENDER

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

/* ---
   FLAT DETAIL MODAL

/* ── Flat drawer state ── */
let _dFid = null, _dPage = 0, _dQ = '', _dCat = 'all';
const PAGE_SIZE = 20;

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

/* ---
   DOM EVENTS

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

/* ---
   WINDOW EXPOSE

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

/* ---
   IN-APP SETUP WIZARD
   Shown when the account has no flats yet

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

/* ---
   INLINED: payments.js

/* ── switchView (was missing) ── */
function switchView(v) {
  AV = v;
  refreshAPP();
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

/* ---
   LISTENERS for Vehicles + SocExp

function listenVehicles(){
  if(vu)vu();
  vu=onSnapshot(vehColl(),snap=>{
    vehicles.clear();
    snap.forEach(d=>vehicles.set(d.id,{...d.data()}));
    rStats();
    if(document.getElementById('vehView').style.display!=='none')rVehicles();
  },e=>console.error('veh listener',e));
}
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

/* ── Window exposes ── */
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
