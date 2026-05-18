/**
 * Flat Payments Tracker — app.js
 * ══════════════════════════════════════════════════════════════
 * Firebase Firestore (v9 modular SDK via CDN ESM)
 *
 * Firestore structure:
 *   flats/{flatId}          — flat master record
 *     block        : string   "A" | "B" | "C"
 *     owner        : string
 *     due          : number   monthly due amount
 *     paid         : number   amount paid this month
 *     month        : string   "2026-05"   (active billing month)
 *
 *   expenses/{expenseId}    — individual payment / expense entry
 *     flatId       : string   ref to flats doc
 *     block        : string
 *     cat          : string   category
 *     amt          : number
 *     date         : string   "DD MMM"
 *     note         : string
 *     status       : string   "paid" | "partial" | "pending"
 *     month        : string   "2026-05"
 *     createdAt    : Timestamp
 * ══════════════════════════════════════════════════════════════
 */

import { initializeApp }    from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAnalytics }     from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

/* ── Firebase init ── */
const firebaseConfig = {
  apiKey:            "AIzaSyAnUvPo_G_efbacdDApbULQgY5OToghJYM",
  authDomain:        "gatebook-17065.firebaseapp.com",
  projectId:         "gatebook-17065",
  storageBucket:     "gatebook-17065.firebasestorage.app",
  messagingSenderId: "732765572762",
  appId:             "1:732765572762:web:55f1cb897bb5804a831923",
  measurementId:     "G-6YKLV11L0G",
};
const firebaseApp = initializeApp(firebaseConfig);
getAnalytics(firebaseApp);
const db = getFirestore(firebaseApp);

/* ══════════════════════════════════════════════════════════════
   BLOCK META — colors only; flat data comes from Firestore
   ══════════════════════════════════════════════════════════════ */
const BLOCK_COLORS = { A: '#185FA5', B: '#1D9E75', C: '#BA7517' };

/* ══════════════════════════════════════════════════════════════
   SEED DATA — written to Firestore only if the "flats"
   collection is empty.  Safe to remove after first run.
   ══════════════════════════════════════════════════════════════ */
const SEED_FLATS = [
  { id:'A-101', block:'A', owner:'Ramesh Kumar',  due:5000, paid:4500, month:'2026-05' },
  { id:'A-102', block:'A', owner:'Sunita Sharma', due:5000, paid:5000, month:'2026-05' },
  { id:'A-103', block:'A', owner:'Priya Nair',    due:5000, paid:0,    month:'2026-05' },
  { id:'A-104', block:'A', owner:'Anil Gupta',    due:5000, paid:5000, month:'2026-05' },
  { id:'A-201', block:'A', owner:'Kavita Reddy',  due:5000, paid:2000, month:'2026-05' },
  { id:'A-202', block:'A', owner:'Suresh Mehta',  due:5000, paid:5000, month:'2026-05' },
  { id:'B-101', block:'B', owner:'Deepa Iyer',    due:5000, paid:5000, month:'2026-05' },
  { id:'B-102', block:'B', owner:'Manoj Pillai',  due:5000, paid:3000, month:'2026-05' },
  { id:'B-103', block:'B', owner:'Rekha Joshi',   due:5000, paid:0,    month:'2026-05' },
  { id:'B-104', block:'B', owner:'Venkat Rao',    due:5000, paid:5000, month:'2026-05' },
  { id:'B-201', block:'B', owner:'Anita Singh',   due:5000, paid:5000, month:'2026-05' },
  { id:'C-101', block:'C', owner:'Rajan Verma',   due:5000, paid:4000, month:'2026-05' },
  { id:'C-102', block:'C', owner:'Meena Krishnan',due:5000, paid:5000, month:'2026-05' },
  { id:'C-103', block:'C', owner:'Harish Patel',  due:5000, paid:0,    month:'2026-05' },
  { id:'C-104', block:'C', owner:'Leela Nair',    due:5000, paid:5000, month:'2026-05' },
];

const SEED_EXPENSES = [
  { flatId:'A-101', block:'A', cat:'Maintenance', date:'01 May', amt:3000, note:'', status:'partial', month:'2026-05' },
  { flatId:'A-101', block:'A', cat:'Water',        date:'05 May', amt:1500, note:'', status:'partial', month:'2026-05' },
  { flatId:'A-102', block:'A', cat:'Maintenance', date:'02 May', amt:3000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'A-102', block:'A', cat:'Electricity', date:'04 May', amt:2000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'A-104', block:'A', cat:'Maintenance', date:'01 May', amt:3000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'A-104', block:'A', cat:'Parking',     date:'03 May', amt:2000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'A-201', block:'A', cat:'Maintenance', date:'06 May', amt:2000, note:'partial advance', status:'partial', month:'2026-05' },
  { flatId:'A-202', block:'A', cat:'Maintenance', date:'01 May', amt:5000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'B-101', block:'B', cat:'Maintenance', date:'02 May', amt:3500, note:'', status:'paid',    month:'2026-05' },
  { flatId:'B-101', block:'B', cat:'Lift',        date:'05 May', amt:1500, note:'', status:'paid',    month:'2026-05' },
  { flatId:'B-102', block:'B', cat:'Maintenance', date:'03 May', amt:3000, note:'', status:'partial', month:'2026-05' },
  { flatId:'B-104', block:'B', cat:'Security',    date:'01 May', amt:2000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'B-104', block:'B', cat:'Cleaning',    date:'04 May', amt:3000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'B-201', block:'B', cat:'Maintenance', date:'01 May', amt:5000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'C-101', block:'C', cat:'Maintenance', date:'02 May', amt:4000, note:'', status:'partial', month:'2026-05' },
  { flatId:'C-102', block:'C', cat:'Maintenance', date:'01 May', amt:3000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'C-102', block:'C', cat:'Water',       date:'04 May', amt:2000, note:'', status:'paid',    month:'2026-05' },
  { flatId:'C-104', block:'C', cat:'Parking',     date:'03 May', amt:5000, note:'', status:'paid',    month:'2026-05' },
];

async function seedIfEmpty() {
  const snap = await getDocs(collection(db, 'flats'));
  if (!snap.empty) return; // already seeded
  console.log('Seeding Firestore with initial data…');
  for (const f of SEED_FLATS) {
    const { id, ...data } = f;
    await setDoc(doc(db, 'flats', id), data);
  }
  for (const e of SEED_EXPENSES) {
    await addDoc(collection(db, 'expenses'), { ...e, createdAt: serverTimestamp() });
  }
  console.log('Seed complete.');
}

/* ══════════════════════════════════════════════════════════════
   IN-MEMORY CACHE  (kept in sync by Firestore listeners)
   ══════════════════════════════════════════════════════════════ */
/** @type {Map<string, object>}  flatId → flat doc */
const flatsCache    = new Map();
/** @type {Map<string, object[]>} flatId → expense docs[] */
const expensesCache = new Map();

/* ══════════════════════════════════════════════════════════════
   UI STATE
   ══════════════════════════════════════════════════════════════ */
let activeBlock    = 'A';
let filterStatus   = 'all';
let searchTerm     = '';
let activeMonth    = '2026-05';

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function getStatus(flat) {
  if (flat.paid >= flat.due) return 'paid';
  if (flat.paid > 0)         return 'partial';
  return 'pending';
}
function statusLabel(st) {
  return { paid:'Paid in full', partial:'Partial payment', pending:'Not paid' }[st];
}
function statusIcon(st) {
  return { paid:'ti-circle-check', partial:'ti-clock', pending:'ti-alert-circle' }[st];
}
function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}
function fmtDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
}

/* derive block list from cached flats */
function blockKeys() {
  const keys = new Set();
  flatsCache.forEach(f => keys.add(f.block));
  return [...keys].sort();
}
function flatsForBlock(block) {
  return [...flatsCache.values()].filter(f => f.block === block && f.month === activeMonth);
}
function expensesForFlat(flatId) {
  return expensesCache.get(flatId) || [];
}

/* ══════════════════════════════════════════════════════════════
   SYNC INDICATOR
   ══════════════════════════════════════════════════════════════ */
function setSyncStatus(status) {
  // status: 'live' | 'saving' | 'error'
  const dot   = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  if (!dot) return;
  dot.className   = 'sync-dot ' + status;
  label.textContent = { live:'Live', saving:'Saving…', error:'Error' }[status];
}

/* ══════════════════════════════════════════════════════════════
   RENDER — SUMMARY BAR
   ══════════════════════════════════════════════════════════════ */
function renderSummary() {
  const all         = [...flatsCache.values()].filter(f => f.month === activeMonth);
  const totalDue    = all.reduce((s, f) => s + f.due,  0);
  const totalPaid   = all.reduce((s, f) => s + f.paid, 0);
  const paidCount   = all.filter(f => getStatus(f) === 'paid').length;
  const pendingCnt  = all.filter(f => getStatus(f) === 'pending').length;
  const partialCnt  = all.filter(f => getStatus(f) === 'partial').length;
  const outstanding = totalDue - totalPaid;

  document.getElementById('summaryBar').innerHTML = `
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-receipt"></i>Total Due</div>
      <div class="metric-value blue">${fmtINR(totalDue)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-circle-check"></i>Collected</div>
      <div class="metric-value green">${fmtINR(totalPaid)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-building"></i>Flats Paid</div>
      <div class="metric-value green">${paidCount} / ${all.length}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-alert-circle"></i>Outstanding</div>
      <div class="metric-value red">${fmtINR(outstanding)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-clock"></i>Partial / Pending</div>
      <div class="metric-value amber">${partialCnt} / ${pendingCnt}</div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════
   RENDER — TABS
   ══════════════════════════════════════════════════════════════ */
function renderTabs() {
  const blocks = blockKeys();
  if (!blocks.includes(activeBlock)) activeBlock = blocks[0] || 'A';

  document.getElementById('tabBar').innerHTML = blocks.map(b => {
    const flats     = flatsForBlock(b);
    const paidCount = flats.filter(f => getStatus(f) === 'paid').length;
    return `
      <button
        class="tab${b === activeBlock ? ' active' : ''}"
        onclick="window.__setBlock('${b}')"
        role="tab"
        aria-selected="${b === activeBlock}"
        aria-label="Block ${b}"
      >
        <i class="ti ti-building"></i>
        Block ${b}
        <span class="tab-count">${paidCount}/${flats.length}</span>
      </button>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   RENDER — FLAT CARDS
   ══════════════════════════════════════════════════════════════ */
function filteredFlats(flats) {
  return flats.filter(f => {
    const st = getStatus(f);
    if (filterStatus !== 'all' && st !== filterStatus) return false;
    const q = searchTerm;
    if (q && !f.flatId.toLowerCase().includes(q) && !f.owner.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderBlock() {
  const color = BLOCK_COLORS[activeBlock] || '#888';
  const flats     = flatsForBlock(activeBlock);
  const visible   = filteredFlats(flats);
  const paidCount = flats.filter(f => getStatus(f) === 'paid').length;
  const collected = flats.reduce((s, f) => s + f.paid, 0);

  let html = `
    <div class="block-header">
      <div class="block-title">
        <i class="ti ti-building" style="color:${color}"></i>
        Block ${activeBlock}
        <span class="block-badge">${paidCount} / ${flats.length} paid</span>
      </div>
      <div class="block-stats">Collected this month: <strong>${fmtINR(collected)}</strong></div>
    </div>
    <div class="flats-grid">`;

  if (visible.length === 0) {
    html += `<div class="no-results"><i class="ti ti-search-off"></i>No flats match your filter.</div>`;
  } else {
    visible.forEach(f => {
      const st     = getStatus(f);
      const pct    = Math.round(Math.min((f.paid / f.due) * 100, 100));
      const barClr = st === 'paid' ? '#1D9E75' : st === 'partial' ? '#BA7517' : '#A32D2D';
      html += `
        <div
          class="flat-card ${st}"
          onclick="window.__openFlat('${f.flatId}')"
          role="button" tabindex="0"
          aria-label="${f.flatId}, ${f.owner}, ${statusLabel(st)}"
          onkeydown="if(event.key==='Enter'||event.key===' ')window.__openFlat('${f.flatId}')"
        >
          <div class="flat-num">${f.flatId}</div>
          <div class="flat-owner">${f.owner}</div>
          <div class="flat-amount ${st}">${fmtINR(f.paid)}</div>
          <div class="flat-due">of ${fmtINR(f.due)} due</div>
          <div class="flat-progress">
            <div class="flat-progress-bar" style="width:${pct}%;background:${barClr}"></div>
          </div>
          <div class="status-pill ${st}">
            <i class="ti ${statusIcon(st)}"></i> ${statusLabel(st)}
          </div>
        </div>`;
    });
  }

  html += '</div>';
  document.getElementById('blockContent').innerHTML = html;
}

function renderAll() {
  renderSummary();
  renderTabs();
  renderBlock();
}

/* ══════════════════════════════════════════════════════════════
   FIRESTORE REAL-TIME LISTENERS
   ══════════════════════════════════════════════════════════════ */
function attachListeners() {
  /* ── Flats listener ── */
  onSnapshot(collection(db, 'flats'), snap => {
    snap.docChanges().forEach(change => {
      const data = { flatId: change.doc.id, ...change.doc.data() };
      if (change.type === 'removed') {
        flatsCache.delete(change.doc.id);
      } else {
        flatsCache.set(change.doc.id, data);
      }
    });
    renderAll();
    setSyncStatus('live');
  }, err => {
    console.error('Flats listener error:', err);
    setSyncStatus('error');
  });

  /* ── Expenses listener (current month) ── */
  const expQ = query(
    collection(db, 'expenses'),
    where('month', '==', activeMonth),
    orderBy('createdAt', 'asc')
  );

  onSnapshot(expQ, snap => {
    // Rebuild expensesCache for this month
    expensesCache.clear();
    snap.forEach(d => {
      const exp = { expId: d.id, ...d.data() };
      const arr = expensesCache.get(exp.flatId) || [];
      arr.push(exp);
      expensesCache.set(exp.flatId, arr);
    });
    renderAll();
  }, err => {
    console.error('Expenses listener error:', err);
  });
}

/* ══════════════════════════════════════════════════════════════
   FLAT DETAIL MODAL
   ══════════════════════════════════════════════════════════════ */
function openFlat(flatId) {
  const flat     = flatsCache.get(flatId);
  if (!flat) return;
  const st       = getStatus(flat);
  const balance  = flat.due - flat.paid;
  const expenses = expensesForFlat(flatId);
  const total    = expenses.reduce((s, e) => s + e.amt, 0);

  document.getElementById('modalTitle').textContent = flat.flatId + ' — ' + flat.owner;
  document.getElementById('modalSub').textContent   = 'Block ' + flat.block + ' · ' +
    new Date(activeMonth + '-01').toLocaleDateString('en-IN', { month:'long', year:'numeric' });

  const expRows = expenses.length === 0
    ? `<div class="expense-empty"><i class="ti ti-inbox" style="font-size:24px;display:block;margin-bottom:6px"></i>No expenses recorded yet.</div>`
    : expenses.map(e => `
        <div class="expense-row">
          <div>
            <div class="expense-cat">${e.cat}</div>
            <div class="expense-date">${e.date}</div>
            ${e.note ? `<div class="expense-note">${e.note}</div>` : ''}
          </div>
          <div class="expense-amt">${fmtINR(e.amt)}</div>
        </div>`).join('');

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-metrics">
      <div class="modal-metric">
        <div class="modal-metric-label">Paid</div>
        <div class="modal-metric-value" style="color:var(--color-paid)">${fmtINR(flat.paid)}</div>
      </div>
      <div class="modal-metric">
        <div class="modal-metric-label">Balance Due</div>
        <div class="modal-metric-value" style="color:${balance > 0 ? 'var(--color-pending)' : 'var(--color-paid)'}">${fmtINR(balance)}</div>
      </div>
      <div class="modal-metric">
        <div class="modal-metric-label">Status</div>
        <div class="modal-metric-value" style="font-size:13px;text-transform:capitalize;color:${
          st==='paid'?'var(--color-paid)':st==='partial'?'var(--color-partial)':'var(--color-pending)'
        }">${statusLabel(st)}</div>
      </div>
    </div>

    <div class="expense-section-title">Expense History</div>
    <div class="expense-list">${expRows}</div>

    ${expenses.length > 0 ? `
      <div class="total-row">
        <span class="total-label">Total Recorded Expenses</span>
        <span class="total-val">${fmtINR(total)}</span>
      </div>` : ''}

    <div class="modal-actions">
      <button class="btn-add-payment"
        onclick="window.__closeModal(); window.__openAddExpenseFor('${flat.block}','${flatId}')">
        <i class="ti ti-plus"></i> Add Payment / Expense
      </button>
    </div>`;

  document.getElementById('flatModal').classList.add('open');
}

function closeModal() {
  document.getElementById('flatModal').classList.remove('open');
}

/* ══════════════════════════════════════════════════════════════
   ADD EXPENSE MODAL
   ══════════════════════════════════════════════════════════════ */
function populateBlockSelect() {
  const sel   = document.getElementById('fBlock');
  const blocks = blockKeys();
  sel.innerHTML = blocks.map(b => `<option value="${b}">Block ${b}</option>`).join('');
  sel.value = activeBlock;
}

function updateFlatOptions() {
  const block = document.getElementById('fBlock').value;
  document.getElementById('fFlat').innerHTML = flatsForBlock(block)
    .map(f => `<option value="${f.flatId}">${f.flatId} — ${f.owner}</option>`)
    .join('');
}

function openAddExpense() {
  populateBlockSelect();
  updateFlatOptions();
  document.getElementById('fDate').value  = new Date().toISOString().split('T')[0];
  document.getElementById('fAmt').value   = '';
  document.getElementById('fNote').value  = '';
  document.getElementById('fStatus').value = 'paid';
  document.getElementById('addModal').classList.add('open');
}

function openAddExpenseFor(block, flatId) {
  populateBlockSelect();
  document.getElementById('fBlock').value = block;
  updateFlatOptions();
  setTimeout(() => { document.getElementById('fFlat').value = flatId; }, 10);
  document.getElementById('fDate').value  = new Date().toISOString().split('T')[0];
  document.getElementById('fAmt').value   = '';
  document.getElementById('fNote').value  = '';
  document.getElementById('fStatus').value = 'paid';
  document.getElementById('addModal').classList.add('open');
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
}

async function saveExpense() {
  const blockKey = document.getElementById('fBlock').value;
  const flatId   = document.getElementById('fFlat').value;
  const cat      = document.getElementById('fCat').value;
  const amt      = parseInt(document.getElementById('fAmt').value) || 0;
  const dateVal  = document.getElementById('fDate').value;
  const status   = document.getElementById('fStatus').value;
  const note     = document.getElementById('fNote').value.trim();

  if (!amt || amt <= 0) { alert('Please enter a valid amount.'); return; }
  if (!flatId)          { alert('Please select a flat.'); return; }

  const flat      = flatsCache.get(flatId);
  if (!flat)            { alert('Flat not found.'); return; }
  const formatted = dateVal ? fmtDate(dateVal) : fmtDate(new Date().toISOString());

  // UI feedback
  setSyncStatus('saving');
  const btn   = document.getElementById('saveBtn');
  const label = document.getElementById('saveBtnLabel');
  btn.disabled  = true;
  label.textContent = 'Saving…';

  try {
    // 1️⃣  Write the expense document
    await addDoc(collection(db, 'expenses'), {
      flatId, block: blockKey, cat, amt,
      date: formatted, note, status,
      month: activeMonth,
      createdAt: serverTimestamp(),
    });

    // 2️⃣  Update paid amount on the flat document
    let newPaid = flat.paid;
    if (status === 'paid')    newPaid = flat.due;
    else if (status === 'partial') newPaid = Math.min(flat.paid + amt, flat.due - 1);

    await updateDoc(doc(db, 'flats', flatId), { paid: newPaid });

    setSyncStatus('live');
    closeAddModal();
  } catch (err) {
    console.error('Save expense error:', err);
    setSyncStatus('error');
    alert('Failed to save. Check console for details.');
  } finally {
    btn.disabled      = false;
    label.textContent = 'Save';
  }
}

/* ══════════════════════════════════════════════════════════════
   ADD NEW FLAT MODAL
   ══════════════════════════════════════════════════════════════ */
function openAddFlatModal() {
  document.getElementById('nfId').value    = '';
  document.getElementById('nfOwner').value = '';
  document.getElementById('nfDue').value   = '5000';
  document.getElementById('addFlatModal').classList.add('open');
}

function closeAddFlatModal() {
  document.getElementById('addFlatModal').classList.remove('open');
}

async function saveNewFlat() {
  const block = document.getElementById('nfBlock').value;
  const id    = document.getElementById('nfId').value.trim().toUpperCase();
  const owner = document.getElementById('nfOwner').value.trim();
  const due   = parseInt(document.getElementById('nfDue').value) || 5000;

  if (!id)    { alert('Please enter a flat number.'); return; }
  if (!owner) { alert('Please enter the owner name.'); return; }
  if (flatsCache.has(id)) { alert(`Flat ${id} already exists.`); return; }

  setSyncStatus('saving');
  try {
    await setDoc(doc(db, 'flats', id), {
      block, owner, due, paid: 0, month: activeMonth,
    });
    setSyncStatus('live');
    closeAddFlatModal();
    activeBlock = block;
  } catch (err) {
    console.error('Save flat error:', err);
    setSyncStatus('error');
    alert('Failed to save flat. Check console.');
  }
}

/* ══════════════════════════════════════════════════════════════
   DOM EVENTS
   ══════════════════════════════════════════════════════════════ */
document.getElementById('statusFilter').addEventListener('change', e => {
  filterStatus = e.target.value;
  renderBlock();
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchTerm = e.target.value.toLowerCase().trim();
  renderBlock();
});

document.getElementById('monthFilter').addEventListener('change', e => {
  activeMonth = e.target.value;
  // Re-attach expense listener for new month
  attachListeners();
});

document.getElementById('fBlock').addEventListener('change', updateFlatOptions);

// Close modals on backdrop click
['flatModal','addModal','addFlatModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target.id === id) {
      closeModal(); closeAddModal(); closeAddFlatModal();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeAddModal(); closeAddFlatModal(); }
});

/* ══════════════════════════════════════════════════════════════
   EXPOSE FUNCTIONS TO GLOBAL SCOPE
   (needed because onclick attributes can't see ES module scope)
   ══════════════════════════════════════════════════════════════ */
function setBlock(b) {
  activeBlock = b;
  renderTabs();
  renderBlock();
}

window.__setBlock          = setBlock;
window.__openFlat          = openFlat;
window.__closeModal        = closeModal;
window.__openAddExpenseFor = openAddExpenseFor;
window.__closeAddModal     = closeAddModal;
window.__saveExpense       = saveExpense;
window.__closeAddFlatModal = closeAddFlatModal;
window.__saveNewFlat       = saveNewFlat;

// Also expose for nav buttons (inline onclick)
window.openAddExpense      = openAddExpense;
window.openAddFlatModal    = openAddFlatModal;

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */
async function init() {
  // Set navbar month label
  document.getElementById('navMonth').textContent =
    new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' });

  try {
    await seedIfEmpty();      // populate Firestore on first run
    attachListeners();        // live listeners update cache → re-render

    // Show app after first data load (listeners will call renderAll)
    setTimeout(() => {
      document.getElementById('loadingOverlay').style.display = 'none';
      document.getElementById('appWrapper').style.display     = '';
    }, 1200);
  } catch (err) {
    console.error('Init error:', err);
    document.querySelector('.loading-text').textContent = '⚠ Failed to connect to Firebase. Check console.';
  }
}

init();
