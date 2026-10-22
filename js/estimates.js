// Vendor estimates: members or admin log quotes from different vendors for a piece of work,
// the app compares them, and the admin records the decision.
import { db, auth } from './firebase.js';
import { collection, doc, addDoc, updateDoc, onSnapshot, writeBatch }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const CATS = ['Maintenance','Repair','Water','Electricity','Security','Cleaning','Lift','Gardening','Painting','Construction','Other'];
let C = null, reqs = [], quotes = [], filter = 'open', openId = null;
let W = { price: 50, time: 25, warranty: 25 };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const num = v => { const n = Number(String(v ?? '').replace(/,/g, '')); return isFinite(n) && n > 0 ? n : 0; };
const fmtD = s => { try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return ''; } };
const UID = () => C.getUID();
const eColl = () => collection(db, 'apartments', UID(), 'estimates');
const qColl = () => collection(db, 'apartments', UID(), 'estimateQuotes');
const qsOf = id => quotes.filter(q => q.estId === id);
const lowest = qs => qs.reduce((m, q) => (m === null || q.amount < m ? q.amount : m), null);

/* ───────── analysis ───────── */
function analyze(qs) {
  const prices = qs.map(q => q.amount), avg = prices.reduce((a, b) => a + b, 0) / qs.length;
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const days = qs.filter(q => q.days > 0), minD = days.length ? Math.min(...days.map(q => q.days)) : 0;
  const maxW = Math.max(...qs.map(q => q.warranty || 0));
  const tw = (W.price + W.time + W.warranty) || 1;
  const rows = qs.map(q => {
    const sp = minP / q.amount;
    const sd = days.length ? (q.days > 0 ? minD / q.days : 0) : 1;
    const sw = maxW > 0 ? (q.warranty || 0) / maxW : 1;
    return { q, score: (sp * W.price + sd * W.time + sw * W.warranty) / tw * 100 };
  }).sort((a, b) => b.score - a.score);
  return { rows, avg, minP, maxP, minD, maxW };
}

function analysisHTML(r, qs) {
  if (qs.length < 2) return `<div style="font-size:12px;color:var(--muted);padding:10px;background:var(--surface2);border-radius:8px">Add at least 2 vendor quotes to compare them.</div>`;
  const a = analyze(qs), best = a.rows[0].q;
  const cheapest = qs.find(q => q.amount === a.minP), fastest = a.minD ? qs.find(q => q.days === a.minD) : null;
  const longW = a.maxW ? qs.find(q => (q.warranty || 0) === a.maxW) : null;
  const tips = [];
  tips.push(`💰 Lowest: <b>${esc(cheapest.vendor)}</b> ${inr(a.minP)} · highest ${inr(a.maxP)} (spread ${inr(a.maxP - a.minP)}, ${Math.round((a.maxP - a.minP) / a.minP * 100)}% over lowest) · average ${inr(a.avg)}`);
  if (fastest) tips.push(`⏱ Fastest: <b>${esc(fastest.vendor)}</b> (${fastest.days} days)`);
  if (longW) tips.push(`🛡 Longest warranty: <b>${esc(longW.vendor)}</b> (${longW.warranty} months)`);
  if (r.budget) { const within = qs.filter(q => q.amount <= r.budget).length; tips.push(`🎯 Budget ${inr(r.budget)}: <b>${within}</b> of ${qs.length} quotes are within budget`); }
  if (best.amount !== a.minP) tips.push(`⚖️ Best overall <b>${esc(best.vendor)}</b> costs ${inr(best.amount - a.minP)} more than the lowest, but scores higher on speed/warranty with your weights.`);
  qs.filter(q => q.amount < a.avg * 0.7).forEach(q => tips.push(`⚠️ <b>${esc(q.vendor)}</b> is far below average — confirm what is included before choosing.`));
  if (qs.length < 3) tips.push(`ℹ️ Only ${qs.length} quotes — getting at least 3 gives a fairer comparison.`);
  const wInp = (k, l) => `<label style="font-size:10px;font-weight:700;color:var(--text2)">${l}<input type="number" min="0" max="100" value="${W[k]}" oninput="window._est.setW('${k}',this.value)" style="width:100%;box-sizing:border-box;height:30px;padding:0 6px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-weight:700"/></label>`;
  return `
    <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--text);margin-bottom:12px">${tips.map(t => `<div>${t}</div>`).join('')}</div>
    <div style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Importance (changes the ranking)</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">${wInp('price', 'Price')}${wInp('time', 'Speed')}${wInp('warranty', 'Warranty')}</div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${a.rows.map((x, i) => `
        <div style="border:1px solid ${i === 0 ? 'var(--green)' : 'var(--border)'};border-radius:8px;padding:8px 10px;background:${i === 0 ? 'var(--green-bg,#f0fdf4)' : '#fff'}">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:700">
            <span>#${i + 1} ${esc(x.q.vendor)} ${i === 0 ? '<span style="color:var(--green);font-size:10px">★ BEST OVERALL</span>' : ''}${x.q.amount === a.minP ? ' <span style="color:var(--indigo);font-size:10px">LOWEST</span>' : ''}</span>
            <span>${inr(x.q.amount)}</span>
          </div>
          <div style="height:7px;background:var(--surface3,#eee);border-radius:99px;margin:6px 0 3px;overflow:hidden"><div style="height:100%;width:${Math.round(x.score)}%;background:${i === 0 ? 'var(--green)' : 'var(--indigo)'};border-radius:99px"></div></div>
          <div style="font-size:10px;color:var(--muted)">Score ${Math.round(x.score)}/100 · ${x.q.days ? x.q.days + ' days' : 'time n/a'} · ${x.q.warranty ? x.q.warranty + ' mo warranty' : 'no warranty'}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:8px">Score = price (lowest = best), speed (fewest days = best) and warranty (longest = best), weighted by the importance above. It is a guide — the decision stays with the committee.</div>`;
}

/* ───────── list view ───────── */
function renderList() {
  const v = document.getElementById('issSubPanelEstimates'); if (!v) return;
  const adminish = C.isAdmin();
  const list = reqs.filter(r => filter === 'all' || (r.status || 'open') === filter)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const cnt = s => reqs.filter(r => (r.status || 'open') === s).length;
  const chip = (k, l, n) => `<button onclick="window._est.setFilter('${k}')" style="height:30px;padding:0 12px;border-radius:99px;border:1px solid ${filter === k ? 'var(--indigo)' : 'var(--border2)'};background:${filter === k ? 'var(--indigo)' : '#fff'};color:${filter === k ? '#fff' : 'var(--text2)'};font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">${l} (${n})</button>`;
  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:6px 0 10px">
      <div><div style="font-size:15px;font-weight:800;color:var(--text)">Estimates &amp; Vendor Quotes</div>
      <div style="font-size:11px;color:var(--muted)">Collect quotes, compare, then decide</div></div>
      <button class="btn btn-indigo btn-sm" onclick="window._est.newReq()"><i class="ti ti-plus"></i> New request</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">${chip('open', 'Open', cnt('open'))}${chip('decided', 'Decided', cnt('decided'))}${chip('all', 'All', reqs.length)}</div>
    ${list.length ? list.map(r => {
      const qs = qsOf(r.id), low = lowest(qs), sel = qs.find(q => q.id === r.selectedQuoteId), dec = (r.status || 'open') === 'decided';
      return `<div onclick="window._est.open('${esc(r.id)}')" style="background:#fff;border:1px solid var(--border2);border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <div style="font-size:14px;font-weight:800;color:var(--text);min-width:0;overflow-wrap:anywhere">${esc(r.title)}</div>
          <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;white-space:nowrap;background:${dec ? '#dcfce7' : '#fef3c7'};color:${dec ? '#15803d' : '#b45309'}">${dec ? 'DECIDED' : 'OPEN'}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">${esc(r.category || 'Other')} · ${qs.length} quote${qs.length !== 1 ? 's' : ''}${low !== null ? ' · lowest ' + inr(low) : ''}${r.budget ? ' · budget ' + inr(r.budget) : ''}</div>
        ${dec && sel ? `<div style="font-size:12px;font-weight:700;color:#15803d;margin-top:6px">✔ ${esc(sel.vendor)} — ${inr(sel.amount)}</div>` : ''}
        <div style="font-size:10px;color:var(--muted);margin-top:4px">By ${esc(r.createdBy || '—')} · ${fmtD(r.createdAt)}</div>
      </div>`;
    }).join('') : `<div style="text-align:center;color:var(--muted);font-size:13px;padding:36px 10px">${reqs.length ? 'Nothing here.' : 'No estimate requests yet. Tap “New request” to start collecting vendor quotes.'}</div>`}`;
}

/* ───────── modal ───────── */
function modal() {
  let m = document.getElementById('estModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'estModal';
    m.style.cssText = 'display:none;position:fixed;inset:0;z-index:3000;background:rgba(15,23,42,.45);align-items:center;justify-content:center;padding:max(.75rem,env(safe-area-inset-top)) .75rem max(.75rem,env(safe-area-inset-bottom))';
    m.onclick = e => { if (e.target === m) close(); };
    document.body.appendChild(m);
  }
  return m;
}
function show(icon, title, sub, body, footer) {
  const m = modal();
  m.innerHTML = `<div class="modal" style="width:min(560px,96vw);max-height:88vh;max-height:min(88vh,calc(100dvh - 1.5rem));display:flex;flex-direction:column;padding-bottom:0;overflow:hidden">
    <div class="mhead" style="flex-shrink:0"><div style="display:flex;align-items:center;gap:12px;min-width:0">
      <div class="micon pay"><i class="ti ${icon}"></i></div>
      <div style="min-width:0"><div class="mtitle" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(title)}</div><div class="msub">${esc(sub || '')}</div></div></div>
      <button class="mclose" onclick="window._est.close()"><i class="ti ti-x"></i></button></div>
    <div id="estBody" style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;padding:4px 2px 12px">${body}</div>
    ${footer ? `<div style="display:flex;gap:8px;flex-shrink:0;padding:10px 0 calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--border);flex-wrap:wrap">${footer}</div>` : ''}
  </div>`;
  m.style.display = 'flex';
}
function close() { openId = null; const m = document.getElementById('estModal'); if (m) m.style.display = 'none'; }

const inp = 'width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:var(--font);font-size:14px;background:#fff';
const lab = 'font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px';
const btn = (cls, js, t) => `<button class="btn ${cls}" style="flex:1;min-width:110px" onclick="${js}">${t}</button>`;

/* ───────── detail ───────── */
function openDetail(id) {
  const r = reqs.find(x => x.id === id); if (!r) return;
  openId = id;
  const qs = qsOf(id).sort((a, b) => a.amount - b.amount), dec = (r.status || 'open') === 'decided', admin = C.isAdmin();
  const quoteCard = q => `
    <div style="border:1.5px solid ${q.id === r.selectedQuoteId ? 'var(--green)' : 'var(--border)'};border-radius:10px;padding:10px;margin-bottom:8px;background:#fff">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <div style="min-width:0"><div style="font-size:13px;font-weight:800;overflow-wrap:anywhere">${esc(q.vendor)} ${q.id === r.selectedQuoteId ? '<span style="color:var(--green);font-size:10px">✔ SELECTED</span>' : ''}</div>
        ${q.phone ? `<a href="tel:${esc(q.phone)}" style="font-size:11px;color:var(--indigo);text-decoration:none">📞 ${esc(q.phone)}</a>` : ''}</div>
        <div style="font-size:16px;font-weight:800;white-space:nowrap">${inr(q.amount)}</div>
      </div>
      <div style="font-size:11px;color:var(--text2);margin-top:5px">⏱ ${q.days ? q.days + ' days' : 'time not given'} · 🛡 ${q.warranty ? q.warranty + ' months' : 'no warranty'}</div>
      ${q.details ? `<div style="font-size:12px;color:var(--text);margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere">${esc(q.details)}</div>` : ''}
      <div style="font-size:10px;color:var(--muted);margin-top:5px">Added by ${esc(q.addedBy || '—')} · ${fmtD(q.createdAt)}</div>
      ${admin ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        ${!dec ? `<button class="btn btn-indigo btn-sm" onclick="window._est.decide('${esc(q.id)}')">✔ Select vendor</button>` : ''}
        <button class="btn btn-white btn-sm" onclick="window._est.quoteForm('${esc(id)}','${esc(q.id)}')">Edit</button>
        <button class="btn btn-red btn-sm" onclick="window._est.delQuote('${esc(q.id)}')">Delete</button></div>` : ''}
    </div>`;
  const body = `
    ${dec ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px;margin-bottom:12px;font-size:12px"><b>Decision:</b> ${esc((qsOf(id).find(q => q.id === r.selectedQuoteId) || {}).vendor || '—')}${r.decisionNote ? ' — ' + esc(r.decisionNote) : ''}<div style="font-size:10px;color:var(--muted);margin-top:3px">${esc(r.decidedBy || '')} · ${fmtD(r.decidedAt)}</div></div>` : ''}
    ${r.description ? `<div style="font-size:12px;color:var(--text);white-space:pre-wrap;overflow-wrap:anywhere;margin-bottom:8px">${esc(r.description)}</div>` : ''}
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">${r.budget ? 'Budget ' + inr(r.budget) + ' · ' : ''}${r.neededBy ? 'Needed by ' + esc(fmtD(r.neededBy)) + ' · ' : ''}Requested by ${esc(r.createdBy || '—')}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:11px;font-weight:800;color:var(--text);text-transform:uppercase">Vendor quotes (${qs.length})</div>
      ${!dec ? `<button class="btn btn-indigo btn-sm" onclick="window._est.quoteForm('${esc(id)}')"><i class="ti ti-plus"></i> Add quote</button>` : ''}
    </div>
    ${qs.length ? qs.map(quoteCard).join('') : '<div style="font-size:12px;color:var(--muted);margin-bottom:12px">No quotes yet.</div>'}
    <div style="font-size:11px;font-weight:800;color:var(--text);text-transform:uppercase;margin:14px 0 8px">Analysis</div>
    <div id="estAnalysis">${analysisHTML(r, qs)}</div>`;
  const footer = admin ? [
    btn('btn-white', `window._est.reqForm('${esc(id)}')`, 'Edit request'),
    dec ? btn('btn-white', `window._est.reopen('${esc(id)}')`, 'Reopen') : '',
    btn('btn-red', `window._est.delReq('${esc(id)}')`, 'Delete'),
  ].join('') : '';
  show('ti-file-invoice', r.title, `${r.category || 'Other'} · ${dec ? 'Decided' : 'Open'}`, body, footer);
}

/* ───────── forms ───────── */
function reqForm(id) {
  const r = id ? reqs.find(x => x.id === id) : null;
  const body = `<div style="display:flex;flex-direction:column;gap:12px">
    <div><label style="${lab}">What work needs an estimate? *</label><input id="erTitle" style="${inp}" maxlength="80" placeholder="e.g. Terrace waterproofing" value="${esc(r?.title)}"/></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><label style="${lab}">Category</label><select id="erCat" style="${inp}">${CATS.map(c => `<option${(r?.category || 'Maintenance') === c ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
      <div><label style="${lab}">Budget (₹, optional)</label><input id="erBudget" type="number" inputmode="numeric" min="0" style="${inp}" value="${esc(r?.budget || '')}"/></div>
    </div>
    <div><label style="${lab}">Needed by (optional)</label><input id="erBy" type="date" style="${inp}" value="${esc(r?.neededBy || '')}"/></div>
    <div><label style="${lab}">Details / scope</label><textarea id="erDesc" rows="3" style="${inp};resize:vertical" placeholder="Area, size, materials, any special condition">${esc(r?.description)}</textarea></div></div>`;
  show('ti-file-invoice', r ? 'Edit request' : 'New estimate request', '', body,
    btn('btn-white', r ? `window._est.open('${esc(id)}')` : 'window._est.close()', 'Cancel') + btn('btn-indigo', `window._est.saveReq('${esc(id || '')}')`, '💾 Save'));
}

function quoteForm(estId, qid) {
  const q = qid ? quotes.find(x => x.id === qid) : null, r = reqs.find(x => x.id === estId);
  const body = `<div style="display:flex;flex-direction:column;gap:12px">
    <div><label style="${lab}">Vendor name *</label><input id="eqVendor" style="${inp}" maxlength="60" value="${esc(q?.vendor)}"/></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><label style="${lab}">Quote amount (₹) *</label><input id="eqAmt" type="number" inputmode="numeric" min="0" style="${inp}" value="${esc(q?.amount || '')}"/></div>
      <div><label style="${lab}">Mobile</label><input id="eqPhone" type="tel" inputmode="tel" maxlength="15" style="${inp}" value="${esc(q?.phone)}"/></div>
      <div><label style="${lab}">Time to finish (days)</label><input id="eqDays" type="number" inputmode="numeric" min="0" style="${inp}" value="${esc(q?.days || '')}"/></div>
      <div><label style="${lab}">Warranty (months)</label><input id="eqWar" type="number" inputmode="numeric" min="0" style="${inp}" value="${esc(q?.warranty || '')}"/></div>
    </div>
    <div><label style="${lab}">Brief details (what's included, materials, terms)</label><textarea id="eqDet" rows="3" style="${inp};resize:vertical">${esc(q?.details)}</textarea></div></div>`;
  show('ti-file-invoice', q ? 'Edit quote' : 'Add vendor quote', r?.title || '', body,
    btn('btn-white', `window._est.open('${esc(estId)}')`, 'Cancel') + btn('btn-indigo', `window._est.saveQuote('${esc(estId)}','${esc(qid || '')}')`, '💾 Save quote'));
}

/* ───────── actions ───────── */
const who = () => {
  const w = C.getWho();
  return { name: w.name + (!C.isAdmin() && w.flats?.length ? ` (${w.flats.join(', ')})` : ''), uid: auth.currentUser?.uid || '' };
};
const val = id => (document.getElementById(id)?.value ?? '').trim();
const fail = e => { console.error(e); C.toast('Could not save. Check your connection / permissions.', 'error'); };

const api = {
  close, open: openDetail, reqForm, quoteForm,
  newReq: () => reqForm(''),
  setFilter: f => { filter = f; renderList(); },
  setW: (k, v) => { W[k] = Math.max(0, Math.min(100, Number(v) || 0)); const r = reqs.find(x => x.id === openId); const el = document.getElementById('estAnalysis'); if (r && el) el.innerHTML = analysisHTML(r, qsOf(openId)); },
  async saveReq(id) {
    const title = val('erTitle'); if (!title) { C.toast('Enter what the work is.', 'error'); return; }
    const data = { title, category: val('erCat') || 'Other', budget: num(val('erBudget')), neededBy: val('erBy'), description: val('erDesc') };
    try {
      if (id) { if (!C.isAdmin()) return; await updateDoc(doc(db, 'apartments', UID(), 'estimates', id), data); C.toast('Request updated ✓'); openDetail(id); }
      else {
        const w = who();
        const ref = await addDoc(eColl(), { ...data, status: 'open', createdBy: w.name, createdByUid: w.uid, createdAt: new Date().toISOString() });
        C.toast('Request created ✓'); openId = ref.id; renderList(); quoteForm(ref.id);
      }
    } catch (e) { fail(e); }
  },
  async saveQuote(estId, qid) {
    const vendor = val('eqVendor'), amount = num(val('eqAmt'));
    if (!vendor) { C.toast('Enter vendor name.', 'error'); return; }
    if (!amount) { C.toast('Enter the quote amount.', 'error'); return; }
    const data = { vendor, amount, phone: val('eqPhone'), days: num(val('eqDays')), warranty: num(val('eqWar')), details: val('eqDet') };
    try {
      if (qid) { if (!C.isAdmin()) return; await updateDoc(doc(db, 'apartments', UID(), 'estimateQuotes', qid), data); }
      else { const w = who(); await addDoc(qColl(), { ...data, estId, addedBy: w.name, addedByUid: w.uid, createdAt: new Date().toISOString() }); }
      C.toast('Quote saved ✓'); openDetail(estId);
    } catch (e) { fail(e); }
  },
  async delQuote(qid) {
    if (!C.isAdmin() || !confirm('Delete this quote?')) return;
    const q = quotes.find(x => x.id === qid);
    try { const b = writeBatch(db); b.delete(doc(db, 'apartments', UID(), 'estimateQuotes', qid)); await b.commit(); C.toast('Quote deleted'); if (q) openDetail(q.estId); } catch (e) { fail(e); }
  },
  async decide(qid) {
    if (!C.isAdmin()) return;
    const q = quotes.find(x => x.id === qid); if (!q) return;
    const note = prompt(`Select ${q.vendor} (${inr(q.amount)}).\nReason / decision note (optional):`, '');
    if (note === null) return;
    try {
      await updateDoc(doc(db, 'apartments', UID(), 'estimates', q.estId), { status: 'decided', selectedQuoteId: qid, decisionNote: note.trim(), decidedAt: new Date().toISOString(), decidedBy: C.getWho().name });
      C.toast('Decision recorded ✓');
    } catch (e) { fail(e); }
  },
  async reopen(id) {
    if (!C.isAdmin() || !confirm('Reopen this request? The decision will be cleared.')) return;
    try { await updateDoc(doc(db, 'apartments', UID(), 'estimates', id), { status: 'open', selectedQuoteId: '', decisionNote: '', decidedAt: '', decidedBy: '' }); C.toast('Reopened'); } catch (e) { fail(e); }
  },
  async delReq(id) {
    if (!C.isAdmin() || !confirm('Delete this request and all its quotes?')) return;
    try {
      const b = writeBatch(db);
      qsOf(id).forEach(q => b.delete(doc(db, 'apartments', UID(), 'estimateQuotes', q.id)));
      b.delete(doc(db, 'apartments', UID(), 'estimates', id));
      await b.commit(); close(); C.toast('Request deleted');
    } catch (e) { fail(e); }
  },
};

function refresh() {
  renderList();
  if (openId) { if (reqs.find(r => r.id === openId) && document.getElementById('estBody') && document.getElementById('erTitle') == null && document.getElementById('eqVendor') == null) openDetail(openId); }
}

export function initEstimates(deps) {
  C = deps;
  window._est = api;
  if (document.getElementById('issSubPanelEstimates')) return;

  // Services › Estimates sub-tab (next to Issues / Contacts / Reports)
  const reportsBtn = document.getElementById('issSubTabReports');
  const reportsPanel = document.getElementById('issSubPanelReports');
  if (!reportsBtn || !reportsPanel) return;
  const panel = document.createElement('div');
  panel.id = 'issSubPanelEstimates'; panel.style.cssText = 'display:none;padding:0 12px 12px';
  reportsPanel.insertAdjacentElement('afterend', panel);
  const tab = reportsBtn.cloneNode(false);
  tab.id = 'issSubTabEstimates'; tab.setAttribute('onclick', "window._issSubTab('estimates')");
  tab.innerHTML = '<i class="ti ti-file-invoice" style="font-size:14px;flex-shrink:0"></i><span style="overflow:hidden;text-overflow:ellipsis">Estimates</span>';
  reportsBtn.insertAdjacentElement('afterend', tab);

  const origSub = window._issSubTab;
  const paint = on => Object.assign(tab.style, on
    ? { borderColor: 'var(--indigo)', background: 'var(--indigo)', color: '#fff' }
    : { borderColor: 'var(--border2)', background: '#fff', color: 'var(--text2)' });
  window._issSubTab = function (which) {
    if (which === 'estimates') {
      origSub('issues');                       // resets the other tabs/buttons
      document.getElementById('issSubPanelIssues').style.display = 'none';
      const ib = document.getElementById('issSubTabIssues');
      if (ib) Object.assign(ib.style, { borderColor: 'var(--border2)', background: '#fff', color: 'var(--text2)' });
      panel.style.display = ''; paint(true); renderList();
    } else {
      origSub(which); panel.style.display = 'none'; paint(false);
    }
  };

  onSnapshot(eColl(), s => { reqs = s.docs.map(d => ({ id: d.id, ...d.data() })); refresh(); }, e => console.error('estimates', e));
  onSnapshot(qColl(), s => { quotes = s.docs.map(d => ({ id: d.id, ...d.data() })); refresh(); }, e => console.error('estimateQuotes', e));
  renderList();
}
