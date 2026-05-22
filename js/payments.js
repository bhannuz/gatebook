/* ════════════════════════════════
   PAYMENTS TAB — js/payments.js
   Line-by-line payment rows (not chips).
   Block/floor tabs on left, all flat payments listed inline.
════════════════════════════════ */

function hasBlocks() {
  return [...window.APP.flats.values()].some(f => (f.block || '').trim() !== '');
}

function getFloors(block) {
  const { flats, AM } = window.APP;
  const all = [...flats.values()].filter(f => f.month === AM);
  const scoped = block ? all.filter(f => f.block === block) : all;
  return [...new Set(scoped.map(f => f.floor).filter(x => x != null))].sort((a, b) => a - b);
}

function updateFloorFilter(block) {
  const sel = document.getElementById('flf');
  if (!sel) return;
  if (!hasBlocks()) { sel.style.display = 'none'; return; }
  const floors = getFloors(block);
  if (floors.length > 1) {
    sel.innerHTML = `<option value="all">All floors</option>`
      + floors.map(fl => `<option value="${fl}">Floor ${fl}</option>`).join('');
    sel.style.display = '';
  } else {
    sel.style.display = 'none';
  }
}

/* ── Block / Floor tab strip ── */
export function rBTabs() {
  const { bks, flats, AM, st } = window.APP;
  const useBlocks = hasBlocks();

  if (useBlocks) {
    const bs = bks();
    let AB = window.APP.AB;
    if (!bs.includes(AB)) { AB = bs[0] || ''; window.APP._setAB(AB); }
    document.getElementById('btabs').innerHTML = bs.map(b => {
      const bf = [...flats.values()].filter(f => f.block === b && f.month === AM);
      const pc = bf.filter(f => st(f) === 'paid').length;
      return `<button class="btab${b === window.APP.AB ? ' active' : ''}" onclick="window._sB('${b}')">
        <i class="ti ti-building"></i> Block ${b || 'All'}
        <span class="btab-badge">${pc}/${bf.length}</span>
      </button>`;
    }).join('');
    updateFloorFilter(window.APP.AB);
  } else {
    const all = [...flats.values()].filter(f => f.month === AM);
    const floors = [...new Set(all.map(f => f.floor).filter(x => x != null))].sort((a, b) => a - b);
    let AB = window.APP.AB;
    if (!floors.map(String).includes(String(AB))) { AB = String(floors[0] || 1); window.APP._setAB(AB); }
    document.getElementById('btabs').innerHTML = floors.map(fl => {
      const bf = all.filter(f => f.floor === fl);
      const pc = bf.filter(f => st(f) === 'paid').length;
      return `<button class="btab${String(fl) === String(window.APP.AB) ? ' active' : ''}" onclick="window._sB('${fl}')">
        <i class="ti ti-stairs"></i> Floor ${fl}
        <span class="btab-badge">${pc}/${bf.length}</span>
      </button>`;
    }).join('');
    const flf = document.getElementById('flf');
    if (flf) flf.style.display = 'none';
  }
}

/* ── Main payment list — line by line ── */
export function rBlock() {
  const { flats, fex, AM, FS, SQ, RTF, FLF, st, inr } = window.APP;
  const AB = window.APP.AB;
  const useBlocks = hasBlocks();

  // Get flats for this block/floor
  let bf = [...flats.values()].filter(f => f.month === AM);
  if (useBlocks) {
    bf = bf.filter(f => f.block === AB);
  } else {
    bf = bf.filter(f => String(f.floor) === String(AB));
  }

  // Apply filters
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

  // Summary bar
  const totalDue  = bf.reduce((s, f) => s + (f.due  || 0), 0);
  const totalPaid = bf.reduce((s, f) => s + (f.paid || 0), 0);
  const paid      = bf.filter(f => st(f) === 'paid').length;
  const partial   = bf.filter(f => st(f) === 'partial').length;
  const pending   = bf.filter(f => st(f) === 'pending').length;
  const headLabel = useBlocks ? `Block ${AB || 'All'}` : `Floor ${AB}`;

  let h = `
  <div class="bhead">
    <div class="bhead-left">
      <div class="bstripe"></div>
      <div class="btitle">${headLabel}</div>
      <span class="bbadge">✅ ${paid}/${bf.length}</span>
    </div>
    <div class="bcollected">Collected: <strong>${inr(totalPaid)}</strong> of ${inr(totalDue)}</div>
  </div>
  <div class="pay-list">`;

  if (!vis.length) {
    h += `<div class="pay-empty"><i class="ti ti-search-off"></i> No flats match your filter.</div>`;
  } else {
    // Group by floor when block view
    const byFloor = {};
    vis.forEach(f => { const fl = f.floor ?? '—'; (byFloor[fl] = byFloor[fl] || []).push(f); });
    const sortedFloors = Object.keys(byFloor).sort((a, b) => Number(a) - Number(b));
    const multiFloor = useBlocks && sortedFloors.length > 1;

    sortedFloors.forEach(fl => {
      if (multiFloor) {
        const flFlats = byFloor[fl];
        const flPaid  = flFlats.filter(f => st(f) === 'paid').length;
        const flCol   = flFlats.reduce((s, f) => s + f.paid, 0);
        h += `<div class="pay-floor-head">
          <i class="ti ti-stairs"></i> Floor ${fl}
          <span class="pay-floor-badge">${flPaid}/${flFlats.length} paid · ${inr(flCol)}</span>
        </div>`;
      }

      byFloor[fl].forEach(f => {
        const s    = st(f);
        const pct  = f.due ? Math.round(Math.min(f.paid / f.due * 100, 100)) : 0;
        const bal  = (f.due || 0) - (f.paid || 0);
        const isVacant = !(f.owner || '').trim();
        const rType = isVacant ? 'vacant' : (f.resType || 'owner');

        // Get payment history for this flat
        const flatExps = fex ? fex(f.flatId) : [];
        const expRows = flatExps.map(e => `
          <div class="pay-exp-row">
            <span class="pay-exp-dot"></span>
            <span class="pay-exp-cat">${e.cat || 'Payment'}</span>
            <span class="pay-exp-date">${e.date || e.month || ''}</span>
            <span class="pay-exp-note">${e.note || ''}</span>
            <span class="pay-exp-amt">${inr(e.amt)}</span>
          </div>`).join('');

        const statusColors = {
          paid: { bg:'var(--green-bg)', clr:'var(--green)', lbl:'✅ Paid' },
          partial: { bg:'var(--amber-bg)', clr:'var(--amber)', lbl:'⚠ Partial' },
          pending: { bg:'var(--red-bg)', clr:'var(--red)', lbl:'❌ Pending' },
        };
        const sc = statusColors[s] || statusColors.pending;

        const resTypeBadge = isVacant
          ? `<span class="prow-type vacant">🚪 Vacant</span>`
          : rType === 'tenant'
          ? `<span class="prow-type tenant">🔑 Tenant</span>`
          : `<span class="prow-type owner">🏠 Owner</span>`;

        h += `
        <div class="pay-row ${s}" onclick="window._oFl('${f.flatId}')">
          <div class="pay-row-left">
            <div class="pay-flat-id">${f.flatId}</div>
            <div class="pay-owner">${f.owner || '(Vacant)'}</div>
            ${resTypeBadge}
          </div>
          <div class="pay-row-mid">
            <div class="pay-prog-wrap">
              <div class="pay-prog-bar">
                <div class="pay-prog-fill ${s}" style="width:${pct}%"></div>
              </div>
              <span class="pay-pct">${pct}%</span>
            </div>
            ${expRows ? `<div class="pay-exp-list">${expRows}</div>` : ''}
          </div>
          <div class="pay-row-right">
            <div class="pay-amount">${inr(f.paid)}</div>
            <div class="pay-due">of ${inr(f.due)}</div>
            <span class="pay-status-chip" style="background:${sc.bg};color:${sc.clr}">${sc.lbl}</span>
            ${bal > 0 ? `<div class="pay-bal">Bal: ${inr(bal)}</div>` : ''}
          </div>
        </div>`;
      });
    });
  }

  h += `</div>`;
  document.getElementById('bcon').innerHTML = h;
}
