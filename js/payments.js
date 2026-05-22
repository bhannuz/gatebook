/* ════════════════════════════════
   PAYMENTS TAB — js/payments.js
   Click a flat row → expands inline payment history.
   Edit button at edge of each record.
════════════════════════════════ */

let _expandedFlat = null; // currently expanded flat ID

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

/* ── Toggle inline expansion ── */
window._togglePayRow = function(fid) {
  _expandedFlat = _expandedFlat === fid ? null : fid;
  rBlock();
};

/* ── Inline edit a payment record amount/cat ── */
window._editExpInline = function(expId, fid) {
  const row = document.getElementById(`exprow_${expId}`);
  if (!row) return;
  const { fex, inr } = window.APP;
  const exps = fex ? fex(fid) : [];
  const e    = exps.find(x => x.expId === expId);
  if (!e) return;

  // Replace the row with an inline edit form
  const cats = window.APP.categories?.length
    ? window.APP.categories
    : ['Maintenance','Water','Electricity','Parking','Lift','Security','Cleaning','Other'];

  row.outerHTML = `
    <div class="pay-exp-edit" id="exprow_${expId}">
      <select id="eecat_${expId}" style="flex:0 0 110px;background:var(--surface2);border:1.5px solid var(--indigo);
        border-radius:var(--r-sm);padding:4px 6px;font-size:11px;font-weight:700;font-family:var(--font);color:var(--text);outline:none">
        ${cats.map(c=>`<option value="${c}"${c===e.cat?' selected':''}>${c}</option>`).join('')}
      </select>
      <input id="eenote_${expId}" type="text" value="${e.note||''}" placeholder="Note"
        style="flex:1;background:var(--surface2);border:1.5px solid var(--border2);
          border-radius:var(--r-sm);padding:4px 7px;font-size:11px;font-family:var(--font);
          color:var(--text);outline:none;min-width:60px"/>
      <input id="eeamt_${expId}" type="number" value="${e.amt}" min="0"
        style="width:80px;text-align:right;background:var(--surface2);border:1.5px solid var(--indigo);
          border-radius:var(--r-sm);padding:4px 6px;font-size:12px;font-weight:800;
          font-family:var(--font);color:var(--text);outline:none"/>
      <button onclick="window._saveExpEdit('${expId}','${fid}')"
        style="padding:4px 10px;background:var(--indigo);color:#fff;border:none;border-radius:var(--r-sm);
          font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);white-space:nowrap">
        <i class="ti ti-check"></i> Save
      </button>
      <button onclick="window._cancelExpEdit('${expId}','${fid}')"
        style="padding:4px 8px;background:var(--surface2);color:var(--text2);border:1.5px solid var(--border2);
          border-radius:var(--r-sm);font-size:11px;cursor:pointer;font-family:var(--font)">
        <i class="ti ti-x"></i>
      </button>
    </div>`;
};

window._saveExpEdit = async function(expId, fid) {
  const cat  = document.getElementById(`eecat_${expId}`)?.value || 'Maintenance';
  const note = document.getElementById(`eenote_${expId}`)?.value.trim() || '';
  const amt  = parseInt(document.getElementById(`eeamt_${expId}`)?.value) || 0;
  const { db, UID, sync, toast } = window.APP;
  sync('saving');
  try {
    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await updateDoc(doc(db,'apartments',UID,'expenses',expId), { cat, note, amt });
    // Recalculate flat paid
    const { fex } = window.APP;
    const all = fex ? fex(fid) : [];
    const totalPaid = all.reduce((s,e) => e.expId===expId ? s+amt : s+e.amt, 0);
    await updateDoc(doc(db,'apartments',UID,'flats',fid), { paid: totalPaid });
    sync('live'); toast('Payment updated ✓');
  } catch(e) { console.error(e); sync('error'); toast('Update failed.','error'); }
};

window._cancelExpEdit = function(expId, fid) {
  rBlock(); // re-render to restore original row
};

window._delExpInline = async function(expId, fid) {
  if (!confirm('Delete this payment record?')) return;
  const { db, UID, sync, toast, fex } = window.APP;
  sync('saving');
  try {
    const { doc, deleteDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await deleteDoc(doc(db,'apartments',UID,'expenses',expId));
    const remaining = (fex ? fex(fid) : []).filter(e => e.expId !== expId);
    const totalPaid = remaining.reduce((s,e) => s+e.amt, 0);
    await updateDoc(doc(db,'apartments',UID,'flats',fid), { paid: totalPaid });
    sync('live'); toast('Record deleted ✓');
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.','error'); }
};

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

/* ── Main payment list — line by line with inline history ── */
export function rBlock() {
  const { flats, fex, AM, FS, SQ, RTF, FLF, st, inr } = window.APP;
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

  const totalDue  = bf.reduce((s, f) => s + (f.due  || 0), 0);
  const totalPaid = bf.reduce((s, f) => s + (f.paid || 0), 0);
  const paid      = bf.filter(f => st(f) === 'paid').length;
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
    const byFloor = {};
    vis.forEach(f => { const fl = f.floor ?? '—'; (byFloor[fl] = byFloor[fl] || []).push(f); });
    const sortedFloors = Object.keys(byFloor).sort((a, b) => Number(a) - Number(b));
    const multiFloor   = useBlocks && sortedFloors.length > 1;

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
        const s        = st(f);
        const pct      = f.due ? Math.round(Math.min(f.paid / f.due * 100, 100)) : 0;
        const bal      = (f.due || 0) - (f.paid || 0);
        const isVacant = !(f.owner || '').trim();
        const rType    = isVacant ? 'vacant' : (f.resType || 'owner');
        const expanded = _expandedFlat === f.flatId;

        const sc = {
          paid:    { bg:'var(--green-bg)', clr:'var(--green)',  lbl:'✅ Paid' },
          partial: { bg:'var(--amber-bg)', clr:'var(--amber)',  lbl:'⚠ Partial' },
          pending: { bg:'var(--red-bg)',   clr:'var(--red)',    lbl:'❌ Pending' },
        }[s] || { bg:'var(--red-bg)', clr:'var(--red)', lbl:'❌ Pending' };

        const resTypeBadge = isVacant
          ? `<span class="prow-type vacant">🚪 Vacant</span>`
          : rType === 'tenant'
          ? `<span class="prow-type tenant">🔑 Tenant</span>`
          : `<span class="prow-type owner">🏠 Owner</span>`;

        // ── Flat row (clickable to expand) ──
        h += `
        <div class="pay-row ${s}${expanded?' expanded':''}" onclick="window._togglePayRow('${f.flatId}')">
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
          </div>
          <div class="pay-row-right">
            <div class="pay-amount">${inr(f.paid)}</div>
            <div class="pay-due">of ${inr(f.due)}</div>
            <span class="pay-status-chip" style="background:${sc.bg};color:${sc.clr}">${sc.lbl}</span>
            ${bal > 0 ? `<div class="pay-bal">Bal: ${inr(bal)}</div>` : ''}
          </div>
          <div class="pay-row-chevron">
            <i class="ti ${expanded?'ti-chevron-up':'ti-chevron-down'}" style="font-size:14px;color:var(--muted)"></i>
          </div>
        </div>`;

        // ── Inline payment history (shown when expanded) ──
        if (expanded) {
          const flatExps = fex ? fex(f.flatId) : [];
          const expTotal = flatExps.reduce((s,e) => s+e.amt, 0);

          const expHistRows = flatExps.length
            ? flatExps.map(e => `
              <div class="pay-exp-row" id="exprow_${e.expId}">
                <span class="pay-exp-dot" style="background:var(--indigo)"></span>
                <span class="pay-exp-cat">${e.cat || 'Payment'}</span>
                <span class="pay-exp-date">${e.date || e.month || ''}</span>
                <span class="pay-exp-note">${e.note || ''}</span>
                <span class="pay-exp-amt">${inr(e.amt)}</span>
                <div class="pay-exp-actions">
                  <button class="exp-act-btn edit" onclick="event.stopPropagation();window._editExpInline('${e.expId}','${f.flatId}')" title="Edit">
                    <i class="ti ti-pencil"></i>
                  </button>
                  <button class="exp-act-btn del" onclick="event.stopPropagation();window._delExpInline('${e.expId}','${f.flatId}')" title="Delete">
                    <i class="ti ti-trash"></i>
                  </button>
                </div>
              </div>`).join('')
            : `<div class="pay-exp-empty"><i class="ti ti-inbox"></i> No payments recorded yet.</div>`;

          h += `
          <div class="pay-history-panel" onclick="event.stopPropagation()">
            <div class="pay-history-head">
              <span><i class="ti ti-history"></i> Payment History</span>
              <div style="display:flex;align-items:center;gap:8px">
                ${flatExps.length ? `<span style="font-size:11px;font-weight:700;color:var(--text2)">Total: <strong style="color:var(--indigo)">${inr(expTotal)}</strong></span>` : ''}
                <button class="btn btn-indigo btn-sm" style="padding:4px 10px;font-size:11px"
                  onclick="event.stopPropagation();window._cD&&window._cD();window._oAFor('${f.block||''}','${f.flatId}')">
                  <i class="ti ti-plus"></i> Add Payment
                </button>
                <button class="btn btn-white btn-sm" style="padding:4px 10px;font-size:11px"
                  onclick="event.stopPropagation();window._oFl('${f.flatId}')">
                  <i class="ti ti-edit"></i> Edit Flat
                </button>
              </div>
            </div>
            <div class="pay-exp-rows">
              ${expHistRows}
            </div>
          </div>`;
        }
      });
    });
  }

  h += `</div>`;
  document.getElementById('bcon').innerHTML = h;
}
