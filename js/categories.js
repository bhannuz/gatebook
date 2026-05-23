/* ════ categories.js — custom expense categories + inline add ════ */
import { db } from './firebase.js';
import { doc, setDoc, getDoc }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

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
window._catSelChange = function(selId, type) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  if (sel.value === '__new__') {
    // Revert to first valid option while input shows
    sel.value = getCats(type)[0] || 'Maintenance';
    window._showInlineCat(selId);
  }
};

window._showInlineCat = function(selId) {
  const wrap = document.getElementById(selId + '_new');
  const inp  = document.getElementById(selId + '_input');
  if (!wrap) return;
  wrap.style.display = 'block';
  if (inp) { inp.value = ''; inp.focus(); }
};

window._hideInlineCat = function(selId) {
  const wrap = document.getElementById(selId + '_new');
  if (wrap) wrap.style.display = 'none';
};

window._addInlineCat = async function(selId, type) {
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

export { getCats, renderCatOpts, renderCatChips, oCatM, cCatM, addCat, delCat, saveCats, loadCats, _catSelChange, _addInlineCat, _hideInlineCat, _showInlineCat };
