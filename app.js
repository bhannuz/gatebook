/**
 * Flat Payments Tracker — app.js
 * -------------------------------------------------------
 * Data lives in the BLOCKS object below.
 * To add a new block: add a new key to BLOCKS with color + flats array.
 * To add a new flat: push an entry into the flats array of the relevant block.
 * -------------------------------------------------------
 */

/* =============================================
   DATA — edit this section to match your society
   ============================================= */
const BLOCKS = {
  A: {
    color: '#185FA5',
    flats: [
      { id: 'A-101', owner: 'Ramesh Kumar',  paid: 4500, due: 5000, expenses: [{ cat: 'Maintenance', date: '01 May', amt: 3000, note: '' }, { cat: 'Water', date: '05 May', amt: 1500, note: '' }] },
      { id: 'A-102', owner: 'Sunita Sharma', paid: 5000, due: 5000, expenses: [{ cat: 'Maintenance', date: '02 May', amt: 3000, note: '' }, { cat: 'Electricity', date: '04 May', amt: 2000, note: '' }] },
      { id: 'A-103', owner: 'Priya Nair',    paid: 0,    due: 5000, expenses: [] },
      { id: 'A-104', owner: 'Anil Gupta',    paid: 5000, due: 5000, expenses: [{ cat: 'Maintenance', date: '01 May', amt: 3000, note: '' }, { cat: 'Parking', date: '03 May', amt: 2000, note: '' }] },
      { id: 'A-201', owner: 'Kavita Reddy',  paid: 2000, due: 5000, expenses: [{ cat: 'Maintenance', date: '06 May', amt: 2000, note: 'partial advance' }] },
      { id: 'A-202', owner: 'Suresh Mehta',  paid: 5000, due: 5000, expenses: [{ cat: 'Maintenance', date: '01 May', amt: 5000, note: '' }] },
    ],
  },
  B: {
    color: '#1D9E75',
    flats: [
      { id: 'B-101', owner: 'Deepa Iyer',   paid: 5000, due: 5000, expenses: [{ cat: 'Maintenance', date: '02 May', amt: 3500, note: '' }, { cat: 'Lift', date: '05 May', amt: 1500, note: '' }] },
      { id: 'B-102', owner: 'Manoj Pillai',  paid: 3000, due: 5000, expenses: [{ cat: 'Maintenance', date: '03 May', amt: 3000, note: '' }] },
      { id: 'B-103', owner: 'Rekha Joshi',   paid: 0,    due: 5000, expenses: [] },
      { id: 'B-104', owner: 'Venkat Rao',    paid: 5000, due: 5000, expenses: [{ cat: 'Security', date: '01 May', amt: 2000, note: '' }, { cat: 'Cleaning', date: '04 May', amt: 3000, note: '' }] },
      { id: 'B-201', owner: 'Anita Singh',   paid: 5000, due: 5000, expenses: [{ cat: 'Maintenance', date: '01 May', amt: 5000, note: '' }] },
    ],
  },
  C: {
    color: '#BA7517',
    flats: [
      { id: 'C-101', owner: 'Rajan Verma',    paid: 4000, due: 5000, expenses: [{ cat: 'Maintenance', date: '02 May', amt: 4000, note: '' }] },
      { id: 'C-102', owner: 'Meena Krishnan', paid: 5000, due: 5000, expenses: [{ cat: 'Maintenance', date: '01 May', amt: 3000, note: '' }, { cat: 'Water', date: '04 May', amt: 2000, note: '' }] },
      { id: 'C-103', owner: 'Harish Patel',   paid: 0,    due: 5000, expenses: [] },
      { id: 'C-104', owner: 'Leela Nair',     paid: 5000, due: 5000, expenses: [{ cat: 'Parking', date: '03 May', amt: 5000, note: '' }] },
    ],
  },
};

/* =============================================
   STATE
   ============================================= */
let activeBlock  = Object.keys(BLOCKS)[0];
let filterStatus = 'all';
let searchTerm   = '';

/* =============================================
   HELPERS
   ============================================= */
function getStatus(flat) {
  if (flat.paid >= flat.due) return 'paid';
  if (flat.paid > 0)         return 'partial';
  return 'pending';
}

function statusLabel(st) {
  return { paid: 'Paid in full', partial: 'Partial payment', pending: 'Not paid' }[st];
}

function statusIcon(st) {
  return { paid: 'ti-circle-check', partial: 'ti-clock', pending: 'ti-alert-circle' }[st];
}

function fmtINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function fmtDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/* =============================================
   RENDER — SUMMARY BAR
   ============================================= */
function renderSummary() {
  const all        = Object.values(BLOCKS).flatMap(b => b.flats);
  const totalDue   = all.reduce((s, f) => s + f.due, 0);
  const totalPaid  = all.reduce((s, f) => s + f.paid, 0);
  const paidCount  = all.filter(f => getStatus(f) === 'paid').length;
  const pending    = all.filter(f => getStatus(f) === 'pending').length;
  const partial    = all.filter(f => getStatus(f) === 'partial').length;
  const outstanding = totalDue - totalPaid;

  document.getElementById('summaryBar').innerHTML = `
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-receipt" aria-hidden="true"></i>Total due</div>
      <div class="metric-value blue">${fmtINR(totalDue)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-circle-check" aria-hidden="true"></i>Collected</div>
      <div class="metric-value green">${fmtINR(totalPaid)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-building" aria-hidden="true"></i>Flats paid</div>
      <div class="metric-value green">${paidCount} / ${all.length}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-alert-circle" aria-hidden="true"></i>Outstanding</div>
      <div class="metric-value red">${fmtINR(outstanding)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label"><i class="ti ti-clock" aria-hidden="true"></i>Partial / Pending</div>
      <div class="metric-value amber">${partial} / ${pending}</div>
    </div>
  `;
}

/* =============================================
   RENDER — TABS
   ============================================= */
function renderTabs() {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = Object.keys(BLOCKS).map(b => {
    const paidCount = BLOCKS[b].flats.filter(f => getStatus(f) === 'paid').length;
    const total     = BLOCKS[b].flats.length;
    return `
      <button
        class="tab${b === activeBlock ? ' active' : ''}"
        onclick="setBlock('${b}')"
        role="tab"
        aria-selected="${b === activeBlock}"
        aria-label="Block ${b}"
      >
        <i class="ti ti-building" aria-hidden="true"></i>
        Block ${b}
        <span class="tab-count">${paidCount}/${total}</span>
      </button>
    `;
  }).join('');
}

function setBlock(b) {
  activeBlock = b;
  renderTabs();
  renderBlock();
}

/* =============================================
   RENDER — BLOCK / FLAT CARDS
   ============================================= */
function filteredFlats(flats) {
  return flats.filter(f => {
    const st = getStatus(f);
    if (filterStatus !== 'all' && st !== filterStatus) return false;
    if (searchTerm && !f.id.toLowerCase().includes(searchTerm) && !f.owner.toLowerCase().includes(searchTerm)) return false;
    return true;
  });
}

function renderBlock() {
  const block     = BLOCKS[activeBlock];
  const flats     = filteredFlats(block.flats);
  const paidCount = block.flats.filter(f => getStatus(f) === 'paid').length;
  const collected = block.flats.reduce((s, f) => s + f.paid, 0);

  let html = `
    <div class="block-header">
      <div class="block-title">
        <i class="ti ti-building" aria-hidden="true" style="color:${block.color}"></i>
        Block ${activeBlock}
        <span class="block-badge">${paidCount} / ${block.flats.length} paid</span>
      </div>
      <div class="block-stats">Collected this month: <strong>${fmtINR(collected)}</strong></div>
    </div>
    <div class="flats-grid">
  `;

  if (flats.length === 0) {
    html += `
      <div class="no-results">
        <i class="ti ti-search-off" aria-hidden="true"></i>
        No flats match your current filter.
      </div>
    `;
  } else {
    flats.forEach(f => {
      const st    = getStatus(f);
      const pct   = Math.round((f.paid / f.due) * 100);
      const barClr = st === 'paid' ? '#1D9E75' : st === 'partial' ? '#BA7517' : '#A32D2D';

      html += `
        <div
          class="flat-card ${st}"
          onclick="openFlat('${activeBlock}', '${f.id}')"
          role="button"
          tabindex="0"
          aria-label="${f.id}, ${f.owner}, ${statusLabel(st)}"
          onkeydown="if(event.key==='Enter'||event.key===' ')openFlat('${activeBlock}','${f.id}')"
        >
          <div class="flat-num">${f.id}</div>
          <div class="flat-owner">${f.owner}</div>
          <div class="flat-amount ${st}">${fmtINR(f.paid)}</div>
          <div class="flat-due">of ${fmtINR(f.due)} due</div>
          <div class="flat-progress">
            <div class="flat-progress-bar" style="width:${pct}%; background:${barClr}"></div>
          </div>
          <div class="status-pill ${st}">
            <i class="ti ${statusIcon(st)}" aria-hidden="true"></i>
            ${statusLabel(st)}
          </div>
        </div>
      `;
    });
  }

  html += '</div>';
  document.getElementById('blockContent').innerHTML = html;
}

/* =============================================
   FLAT DETAIL MODAL
   ============================================= */
function openFlat(blockKey, flatId) {
  const flat    = BLOCKS[blockKey].flats.find(f => f.id === flatId);
  const st      = getStatus(flat);
  const balance = flat.due - flat.paid;
  const total   = flat.expenses.reduce((s, e) => s + e.amt, 0);

  document.getElementById('modalTitle').textContent = flat.id + ' — ' + flat.owner;
  document.getElementById('modalSub').textContent   = 'Block ' + blockKey + ' · May 2026';

  const expRows = flat.expenses.length === 0
    ? `<div class="expense-empty"><i class="ti ti-inbox" aria-hidden="true" style="font-size:24px;display:block;margin-bottom:6px"></i>No expenses recorded yet.</div>`
    : flat.expenses.map(e => `
        <div class="expense-row">
          <div>
            <div class="expense-cat">${e.cat}</div>
            <div class="expense-date">${e.date}</div>
            ${e.note ? `<div class="expense-note">${e.note}</div>` : ''}
          </div>
          <div class="expense-amt">${fmtINR(e.amt)}</div>
        </div>
      `).join('');

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-metrics">
      <div class="modal-metric">
        <div class="modal-metric-label">Paid</div>
        <div class="modal-metric-value" style="color:var(--color-paid)">${fmtINR(flat.paid)}</div>
      </div>
      <div class="modal-metric">
        <div class="modal-metric-label">Balance due</div>
        <div class="modal-metric-value" style="color:${balance > 0 ? 'var(--color-pending)' : 'var(--color-paid)'}">${fmtINR(balance)}</div>
      </div>
      <div class="modal-metric">
        <div class="modal-metric-label">Status</div>
        <div class="modal-metric-value" style="font-size:13px;text-transform:capitalize;color:${st==='paid'?'var(--color-paid)':st==='partial'?'var(--color-partial)':'var(--color-pending)'}">${statusLabel(st)}</div>
      </div>
    </div>

    <div class="expense-section-title">Expense history</div>
    <div class="expense-list">${expRows}</div>

    ${flat.expenses.length > 0 ? `
      <div class="total-row">
        <span class="total-label">Total recorded expenses</span>
        <span class="total-val">${fmtINR(total)}</span>
      </div>
    ` : ''}

    <div class="modal-actions">
      <button class="btn-add-payment" onclick="closeModal(); openAddExpenseFor('${blockKey}', '${flatId}')">
        <i class="ti ti-plus" aria-hidden="true"></i> Add payment / expense
      </button>
    </div>
  `;

  document.getElementById('flatModal').classList.add('open');
  document.getElementById('modalTitle').focus();
}

function closeModal() {
  document.getElementById('flatModal').classList.remove('open');
}

/* =============================================
   ADD EXPENSE MODAL
   ============================================= */
function openAddExpense() {
  document.getElementById('fBlock').value = activeBlock;
  updateFlatOptions();
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('fAmt').value  = '';
  document.getElementById('fNote').value = '';
  document.getElementById('addModal').classList.add('open');
}

function openAddExpenseFor(blockKey, flatId) {
  document.getElementById('fBlock').value = blockKey;
  updateFlatOptions();
  setTimeout(() => { document.getElementById('fFlat').value = flatId; }, 10);
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('fAmt').value  = '';
  document.getElementById('fNote').value = '';
  document.getElementById('addModal').classList.add('open');
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
}

function updateFlatOptions() {
  const block = document.getElementById('fBlock').value;
  document.getElementById('fFlat').innerHTML = BLOCKS[block].flats
    .map(f => `<option value="${f.id}">${f.id} — ${f.owner}</option>`)
    .join('');
}

function saveExpense() {
  const blockKey = document.getElementById('fBlock').value;
  const flatId   = document.getElementById('fFlat').value;
  const cat      = document.getElementById('fCat').value;
  const amt      = parseInt(document.getElementById('fAmt').value) || 0;
  const dateVal  = document.getElementById('fDate').value;
  const status   = document.getElementById('fStatus').value;
  const note     = document.getElementById('fNote').value.trim();

  if (!amt || amt <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  const flat      = BLOCKS[blockKey].flats.find(f => f.id === flatId);
  const formatted = dateVal ? fmtDate(dateVal) : fmtDate(new Date().toISOString());

  flat.expenses.push({ cat, date: formatted, amt, note });

  if (status === 'paid') {
    flat.paid = flat.due;
  } else if (status === 'partial') {
    flat.paid = Math.min(flat.paid + amt, flat.due - 1);
  }

  closeAddModal();
  renderSummary();
  renderTabs();
  if (blockKey === activeBlock) renderBlock();
  else setBlock(blockKey);
}

/* =============================================
   EVENTS
   ============================================= */
document.getElementById('statusFilter').addEventListener('change', e => {
  filterStatus = e.target.value;
  renderBlock();
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchTerm = e.target.value.toLowerCase().trim();
  renderBlock();
});

document.getElementById('fBlock').addEventListener('change', updateFlatOptions);

document.getElementById('flatModal').addEventListener('click', e => {
  if (e.target === document.getElementById('flatModal')) closeModal();
});

document.getElementById('addModal').addEventListener('click', e => {
  if (e.target === document.getElementById('addModal')) closeAddModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeAddModal(); }
});

/* =============================================
   INIT
   ============================================= */
function init() {
  // Set current month in navbar
  const now = new Date();
  document.getElementById('navMonth').textContent =
    now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  updateFlatOptions();
  renderSummary();
  renderTabs();
  renderBlock();
}

init();
