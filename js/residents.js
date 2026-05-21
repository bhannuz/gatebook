/* ════════════════════════════════
   RESIDENTS TAB — js/residents.js
   Merged: Members + Vehicles in one table.
   Reads from: window.APP
════════════════════════════════ */

export let RF = 'all'; // resident filter

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
  return d
    ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    : '—';
}

/* ── Filter chip toggle ── */
export function fRes(t) {
  RF = t;
  document.querySelectorAll('.rff').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  rResidents();
}

/* ── Main render ── */
export function rResidents() {
  const { flats, vehicles, fex, inr, AM } = window.APP;
  const q = (document.getElementById('resQ')?.value || '').trim().toLowerCase();
  const vf = document.getElementById('resVF')?.value || 'all'; // vehicle filter

  // Stats row at top
  const allF    = [...flats.values()].filter(f => f.month === AM);
  const totTw   = [...vehicles.values()].reduce((s,v) => s + (parseInt(v.tw)||0), 0);
  const totFw   = [...vehicles.values()].reduce((s,v) => s + (parseInt(v.fw)||0), 0);
  const owners  = allF.filter(f => (f.owner||'').trim() && (f.resType||'owner')==='owner').length;
  const tenants = allF.filter(f => f.resType==='tenant').length;
  const vacant  = allF.filter(f => !(f.owner||'').trim()).length;

  const sumEl = document.getElementById('resSummary');
  if (sumEl) {
    sumEl.innerHTML = `
      <div class="res-sum-chip"><i class="ti ti-users"></i><span>${allF.length} Flats</span></div>
      <div class="res-sum-chip owner"><i class="ti ti-home"></i><span>${owners} Owners</span></div>
      <div class="res-sum-chip tenant"><i class="ti ti-key"></i><span>${tenants} Tenants</span></div>
      <div class="res-sum-chip vacant"><i class="ti ti-door"></i><span>${vacant} Vacant</span></div>
      <div class="res-sum-chip veh"><i class="ti ti-motorbike"></i><span>${totTw} 2W</span></div>
      <div class="res-sum-chip veh"><i class="ti ti-car"></i><span>${totFw} 4W</span></div>`;
  }

  let rows = allF.filter(f => {
    const isVacant = !(f.owner||'').trim();
    if (RF === 'owner'  && (isVacant || f.resType === 'tenant')) return false;
    if (RF === 'tenant' && f.resType !== 'tenant')               return false;
    if (RF === 'vacant' && !isVacant)                            return false;
    if (q && !f.flatId?.toLowerCase().includes(q)
          && !(f.owner||'').toLowerCase().includes(q)
          && !(f.ownerName||'').toLowerCase().includes(q)) return false;
    const v  = vehicles.get(f.flatId) || {};
    const tw = parseInt(v.tw)||0, fw = parseInt(v.fw)||0;
    if (vf === '2w'   && tw === 0)           return false;
    if (vf === '4w'   && fw === 0)           return false;
    if (vf === 'both' && (tw===0||fw===0))   return false;
    if (vf === 'none' && (tw+fw) > 0)        return false;
    return true;
  }).sort((a,b) => (a.flatId||'').localeCompare(b.flatId||''));

  if (!rows.length) {
    document.getElementById('resList').innerHTML =
      `<div class="mem-empty"><i class="ti ti-users-off"></i>No residents match your filter.</div>`;
    return;
  }

  const tRows = rows.map(f => {
    const isVacant  = !(f.owner||'').trim();
    const rType     = isVacant ? 'vacant' : (f.resType||'owner');
    const isTenant  = rType === 'tenant';
    const typeLabel = isVacant ? 'Vacant' : isTenant ? '🔑 Tenant' : '🏠 Owner';
    const tenureStr = isVacant ? '—' : tenure(f.moveIn, f.moveOut);
    const movedIn   = fmtDate(f.moveIn);
    const movedOut  = fmtDate(f.moveOut);
    const allEx     = fex(f.flatId);
    const totalPaid = allEx.reduce((s,e) => s + e.amt, 0);
    const balance   = (f.due||0) - (f.paid||0);
    const payMonths = [...new Set(allEx.map(e => e.month||e.date?.slice(0,7)))].filter(Boolean);
    const balColor  = balance > 0 ? 'var(--red)' : balance===0 && f.due>0 ? 'var(--green)' : 'var(--muted)';

    // Vehicle info
    const v  = vehicles.get(f.flatId) || {};
    const tw = parseInt(v.tw)||0, fw = parseInt(v.fw)||0;
    const vehCell = (tw||fw)
      ? `<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
           ${tw ? `<span class="vbadge tw" style="font-size:10px;padding:2px 6px"><i class="ti ti-motorbike"></i>${tw}</span>` : ''}
           ${fw ? `<span class="vbadge fw" style="font-size:10px;padding:2px 6px"><i class="ti ti-car"></i>${fw}</span>` : ''}
           ${v.nums ? `<div style="font-size:9px;color:var(--text2);margin-top:1px;width:100%">${v.nums}</div>` : ''}
           ${v.slot ? `<div style="font-size:9px;color:var(--muted)">Slot: ${v.slot}</div>` : ''}
         </div>`
      : `<span style="font-size:11px;color:var(--muted)">—</span>`;

    // Resident name + phone
    const phone = f.phone || '';
    const resCell = isVacant
      ? `<span style="color:var(--muted);font-style:italic;font-size:12px">Vacant</span>`
      : `<div class="mem-name" style="font-size:13px">${f.owner}</div>
         ${phone ? `<div style="font-size:10px;color:var(--text2)">📞 ${phone}</div>` : ''}`;

    // Owner info (for tenants)
    const ownerCell = isTenant
      ? (f.ownerName
          ? `<div style="font-size:12px;font-weight:700;color:var(--text)">${f.ownerName}</div>
             ${f.ownerPhone ? `<div style="font-size:10px;color:var(--text2)">📞 ${f.ownerPhone}</div>` : ''}`
          : `<span style="color:var(--muted);font-size:11px;font-style:italic">Not set</span>`)
      : `<span style="font-size:11px;color:var(--muted)">—</span>`;

    return `<tr onclick="window._oFl('${f.flatId}')" style="cursor:pointer" title="Click to open flat">
      <td>
        <span class="mem-flat">${f.flatId}</span>
        ${f.block ? `<br><span style="font-size:10px;color:var(--muted)">Block ${f.block}</span>` : ''}
      </td>
      <td><span class="mem-type ${rType}">${typeLabel}</span></td>
      <td>${resCell}</td>
      <td>${ownerCell}</td>
      <td>
        ${movedIn !== '—' ? `<div style="font-size:11px">In: <strong>${movedIn}</strong></div>` : ''}
        ${movedOut !== '—' ? `<div style="font-size:11px;color:var(--red)">Out: <strong>${movedOut}</strong></div>` : ''}
        ${movedIn === '—' ? '<span style="color:var(--muted);font-size:11px">—</span>' : ''}
      </td>
      <td><span class="mem-tenure"><strong>${tenureStr}</strong></span>
        ${f.moveOut ? `<div style="font-size:9px;color:var(--muted)">vacated</div>` : ''}</td>
      <td>${vehCell}</td>
      <td style="white-space:nowrap">
        <div style="font-weight:700;color:var(--green);font-size:12px">${totalPaid ? inr(totalPaid) : '—'}</div>
        <div style="font-size:11px;font-weight:700;color:${balColor}">${f.due ? 'Bal: '+inr(Math.abs(balance)) : ''}</div>
      </td>
      <td>
        <div style="display:flex;flex-wrap:wrap;gap:2px;max-width:110px">
          ${payMonths.slice(-3).map(m => `<span class="hist-chip">${m}</span>`).join('')}
          ${payMonths.length > 3 ? `<span class="hist-chip">+${payMonths.length-3}</span>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('resList').innerHTML = `
    <table class="mem-table">
      <thead><tr>
        <th>Flat</th>
        <th>Type</th>
        <th>Resident & Phone</th>
        <th>Owner (if tenant)</th>
        <th>Move In / Out</th>
        <th>Tenure</th>
        <th>Vehicles</th>
        <th>Paid / Balance</th>
        <th>Payments</th>
      </tr></thead>
      <tbody>${tRows}</tbody>
    </table>`;
}
