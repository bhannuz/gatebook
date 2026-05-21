/* ═══════════════════════════════
   PAYMENTS TAB — js/payments.js
   Handles: block tabs OR floor tabs (no-block buildings)
   Custom filters: status, resident type, floor, search
════════════════════════════════ */

function hasBlocks() {
  return [...window.APP.flats.values()].some(f => (f.block || '').trim() !== '');
}

function getFloors(blockOrAll) {
  const { flats, AM } = window.APP;
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
        <i class="ti ti-building"></i> Block ${b}
        <span class="btab-badge">${pc}/${bf.length}</span>
      </button>`;
    }).join('');
    updateFloorFilter(window.APP.AB);
  } else {
    // No blocks — show floor tabs
    const all = [...flats.values()].filter(f => f.month === AM);
    const floors = [...new Set(all.map(f => f.floor).filter(x => x != null))].sort((a,b) => a - b);
    let AB = window.APP.AB;
    const flNums = floors.map(String);
    if (!flNums.includes(String(AB))) { AB = String(floors[0] || 1); window.APP._setAB(AB); }
    document.getElementById('btabs').innerHTML = floors.map(fl => {
      const bf = all.filter(f => f.floor === fl);
      const pc = bf.filter(f => st(f) === 'paid').length;
      return `<button class="btab${String(fl) === String(window.APP.AB) ? ' active' : ''}" onclick="window._sB('${fl}')">
        <i class="ti ti-stairs"></i> Floor ${fl}
        <span class="btab-badge">${pc}/${bf.length}</span>
      </button>`;
    }).join('');
    document.getElementById('flf').style.display = 'none'; // no dropdown when using floor tabs
  }
}

export function rBlock() {
  const { flats, AM, FS, SQ, RTF, FLF, st, sl, si, inr } = window.APP;
  const AB = window.APP.AB;
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
