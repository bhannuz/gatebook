/* ════════════════════════════════
   MEMBERS TAB — js/members.js
   Depends on: window.APP (shared state injected from app.html)
════════════════════════════════ */

export let MF = 'all';

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
export function fMem(t) {
  MF = t;
  document.querySelectorAll('.mff').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  rMembers();
}

/* ── Main render ── */
export function rMembers() {
  const { flats, fex, inr } = window.APP;
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
