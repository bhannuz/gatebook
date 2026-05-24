/* --- issues.js — issues list, raise, detail, update ==== */
import { db } from './firebase.js';
import { doc, addDoc, updateDoc, collection, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

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
/* --- */
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

/* --- */
   ISSUE DETAIL MODAL

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

/* --- */
   FIRESTORE LISTENERS
   (scoped under apartments/{uid}/...)

export { rIssues, fIss, oRI, cRI, sI, oID, cID, uIS };
