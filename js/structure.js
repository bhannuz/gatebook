/**
 * structure.js — Society Structure Tab
 * Handles: view, add/edit/delete blocks, floors, individual flats
 * Reads shared state from window._APP (set in app.html)
 */

/* ── helpers pulled from app context ── */
const APP    = () => window._APP;
const flats  = () => APP().flats;
const AM     = () => APP().AM;
const st     = (f) => APP().st(f);
const inr    = (n) => APP().inr(n);
const sync   = (s) => APP().sync(s);
const toast  = (m,t) => APP().toast(m,t);
const flatRef= (id) => APP().flatRef(id);

/* shorthand Firestore ops */
const fsSet  = (...a) => APP().setDoc(...a);
const fsUpd  = (...a) => APP().updateDoc(...a);
const fsDel  = (...a) => APP().deleteDoc(...a);

/* trigger full app refresh (re-renders all tabs via Firestore listener) */
const rAll   = () => { try { APP().rAll(); } catch(e) { console.error(e); } };

/* track which block edit panel is currently open — survives re-renders */
let _openEditBlock = null;

/* ── CSS helpers ── */
const inp = (extra='') =>
  `style="box-sizing:border-box;height:28px;padding:0 7px;border:1.5px solid var(--border2);
   border-radius:6px;font-family:var(--font);font-size:11px;font-weight:600;color:var(--text);
   background:#fff;outline:none;width:100%"
   onfocus="this.style.borderColor='var(--indigo)'"
   onblur="this.style.borderColor='var(--border2)'" ${extra}`;

/* ══════════════════════════════════════════
   TOGGLE EDIT PANEL
══════════════════════════════════════════ */
/* toggle block flat list collapsed/expanded */
let _collapsedBlocks = new Set();
window._toggleStrBlock = function(bl) {
  const body = document.getElementById('str-body-' + bl);
  const icon = document.getElementById('str-toggle-icon-' + bl);
  if (!body) return;
  const isCollapsed = _collapsedBlocks.has(bl);
  if (isCollapsed) {
    _collapsedBlocks.delete(bl);
    body.style.display = '';
    if (icon) { icon.className = 'ti ti-chevron-up'; }
  } else {
    _collapsedBlocks.add(bl);
    body.style.display = 'none';
    if (icon) { icon.className = 'ti ti-chevron-down'; }
  }
};

window._openStrEdit = function(bl) {
  document.querySelectorAll('[id^="str-edit-"]').forEach(el => {
    if (el.id !== 'str-edit-' + bl) el.style.display = 'none';
  });
  const el = document.getElementById('str-edit-' + bl);
  if (!el) return;
  const opening = el.style.display === 'none';
  el.style.display = opening ? 'block' : 'none';
  _openEditBlock = opening ? bl : null;
};

/* ══════════════════════════════════════════
   RENAME BLOCK
══════════════════════════════════════════ */
window._renameBlock = async function(oldName) {
  const inp     = document.getElementById('str-bname-' + oldName);
  const newName = (inp?.value || '').trim().toUpperCase();
  if (!newName)            { toast('Enter a block name.', 'error'); return; }
  if (newName === oldName) { toast('No change.'); return; }
  const affected = [...flats().values()].filter(f => f.block === oldName);
  if (!affected.length)    { toast('No flats in this block.', 'error'); return; }
  if (!confirm(`Rename Block ${oldName} → ${newName}?\nThis updates all ${affected.length} flat records.`)) return;
  sync('saving');
  try {
    await Promise.all(affected.map(f => fsUpd(flatRef(f.flatId), { block: newName })));
    /* track new name so panel stays open after re-render */
    _openEditBlock = newName;
    sync('live'); toast(`Block renamed to ${newName} ✓`);
    /* onSnapshot fires rAll() automatically */
  } catch(e) { console.error(e); sync('error'); toast('Rename failed.', 'error'); }
};

/* ══════════════════════════════════════════
   SAVE SINGLE FLAT ROW (flatId, floor, due)
══════════════════════════════════════════ */
window._saveStrFlat = async function(origFid) {
  const newFid   = (document.getElementById('str-fid-'  + origFid)?.value || '').trim().toUpperCase();
  const newFloor = parseInt(document.getElementById('str-fl-'  + origFid)?.value) || 1;
  const newDue   = parseInt(document.getElementById('str-due-' + origFid)?.value) || 0;
  const f        = flats().get(origFid);
  if (!f)      { toast('Flat not found.', 'error'); return; }
  if (!newFid) { toast('Flat ID cannot be empty.', 'error'); return; }
  sync('saving');
  try {
    if (newFid !== origFid) {
      if (flats().has(newFid)) { toast(`${newFid} already exists.`, 'error'); sync('live'); return; }
      await fsSet(flatRef(newFid), { ...f, flatId: newFid, floor: newFloor, due: newDue });
      await fsDel(flatRef(origFid));
    } else {
      await fsUpd(flatRef(origFid), { floor: newFloor, due: newDue });
    }
    sync('live'); toast(`${newFid} saved ✓`);
  } catch(e) { console.error(e); sync('error'); toast('Save failed.', 'error'); }
};

/* ══════════════════════════════════════════
   BULK UPDATE DUE FOR ENTIRE FLOOR
══════════════════════════════════════════ */
window._bulkDueFloor = async function(bl, fl) {
  const dueEl = document.getElementById(`str-bulk-due-${bl}-${fl}`);
  const due   = parseInt(dueEl?.value);
  if (isNaN(due) || due < 0) { toast('Enter a valid amount.', 'error'); return; }
  const targets = [...flats().values()].filter(f => f.block === bl && String(f.floor) === String(fl));
  if (!targets.length) { toast('No flats on this floor.', 'error'); return; }
  if (!confirm(`Set monthly due to ${inr(due)} for all ${targets.length} flat${targets.length !== 1 ? 's' : ''} on Floor ${fl}, Block ${bl}?`)) return;
  sync('saving');
  try {
    await Promise.all(targets.map(f => fsUpd(flatRef(f.flatId), { due })));
    // Update individual due inputs too
    targets.forEach(f => {
      const el = document.getElementById('str-due-' + f.flatId);
      if (el) el.value = due;
    });
    sync('live'); toast(`Due updated for ${targets.length} flats ✓`);
  } catch(e) { console.error(e); sync('error'); toast('Bulk update failed.', 'error'); }
};

/* ══════════════════════════════════════════
   ADD FLOOR TO BLOCK
══════════════════════════════════════════ */
window._addFloor = async function(bl) {
  const all    = [...flats().values()].filter(f => f.block === bl);
  const floors = [...new Set(all.map(f => parseInt(f.floor)).filter(n => !isNaN(n)))];
  const nextFloor = floors.length ? Math.max(...floors) + 1 : 1;
  const cnt = parseInt(document.getElementById('str-newfloor-cnt-' + bl)?.value) || 4;
  const due = parseInt(document.getElementById('str-newfloor-due-' + bl)?.value) || 0;
  if (cnt < 1 || cnt > 20) { toast('Flats per floor: 1–20.', 'error'); return; }
  if (!confirm(`Add Floor ${nextFloor} to Block ${bl} with ${cnt} flat${cnt !== 1 ? 's' : ''}?`)) return;
  sync('saving');
  try {
    const batch = [];
    for (let i = 1; i <= cnt; i++) {
      const fid = `${bl}-${nextFloor}${String(i).padStart(2, '0')}`;
      if (!flats().has(fid))
        batch.push(fsSet(flatRef(fid), { block: bl, floor: nextFloor, owner: '', resType: 'owner', due, paid: 0, month: AM() }));
    }
    await Promise.all(batch);
    sync('live'); toast(`Floor ${nextFloor} added to Block ${bl} ✓`);
  } catch(e) { console.error(e); sync('error'); toast('Add floor failed.', 'error'); }
};

/* ══════════════════════════════════════════
   DELETE ENTIRE FLOOR
══════════════════════════════════════════ */
window._deleteFloor = async function(bl, fl) {
  const victims = [...flats().values()].filter(f => f.block === bl && String(f.floor) === String(fl));
  if (!victims.length) { toast('No flats on this floor.', 'error'); return; }
  const hasPaid = victims.some(f => (f.paid || 0) > 0);
  if (!confirm(`Delete all ${victims.length} flat${victims.length !== 1 ? 's' : ''} on Floor ${fl}, Block ${bl}?` +
    (hasPaid ? '\n⚠️ Some flats have payment records.' : '') + '\nThis cannot be undone.')) return;
  sync('saving');
  try {
    await Promise.all(victims.map(f => fsDel(flatRef(f.flatId))));
    sync('live'); toast(`Floor ${fl} deleted ✓`);
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.', 'error'); }
};

/* ══════════════════════════════════════════
   ADD SINGLE FLAT TO A FLOOR
══════════════════════════════════════════ */
window._addSingleFlat = async function(bl, fl) {
  const numEl = document.getElementById(`str-newflatnum-${bl}-${fl}`);
  const dueEl = document.getElementById(`str-newflatdue-${bl}-${fl}`);
  const rawId = (numEl?.value || '').trim().toUpperCase();
  const due   = parseInt(dueEl?.value) || 0;
  if (!rawId) { toast('Enter a flat number.', 'error'); return; }
  const fid = rawId.includes('-') ? rawId : `${bl}-${rawId}`;
  if (flats().has(fid)) { toast(`${fid} already exists.`, 'error'); return; }
  sync('saving');
  try {
    await fsSet(flatRef(fid), { block: bl, floor: parseInt(fl) || 1, owner: '', resType: 'owner', due, paid: 0, month: AM() });
    if (numEl) numEl.value = '';
    if (dueEl) dueEl.value = '';
    sync('live'); toast(`${fid} added ✓`);
  } catch(e) { console.error(e); sync('error'); toast('Failed.', 'error'); }
};

/* ══════════════════════════════════════════
   DELETE SINGLE FLAT
══════════════════════════════════════════ */
window._deleteSingleFlat = async function(fid) {
  const f = flats().get(fid);
  if (!f) return;
  if (!confirm(`Delete flat ${fid} (${f.owner || 'Vacant'})?` +
    ((f.paid || 0) > 0 ? '\n⚠️ Has payment records.' : ''))) return;
  sync('saving');
  try {
    await fsDel(flatRef(fid));
    sync('live'); toast(`${fid} deleted ✓`);
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.', 'error'); }
};

/* ══════════════════════════════════════════
   DELETE ENTIRE BLOCK
══════════════════════════════════════════ */
window._deleteBlock = async function(bl) {
  const victims = [...flats().values()].filter(f => f.block === bl);
  if (!victims.length) { toast('No flats in this block.', 'error'); return; }
  const hasPaid = victims.some(f => (f.paid || 0) > 0);
  if (!confirm(`⚠️ DELETE entire Block ${bl} (${victims.length} flats)?` +
    (hasPaid ? '\n⚠️ Some flats have payment records!' : '') +
    '\nThis CANNOT be undone.')) return;
  const conf = prompt(`Type "${bl}" to permanently delete Block ${bl}:`);
  if ((conf || '').trim().toUpperCase() !== bl) { toast('Cancelled — name did not match.'); return; }
  sync('saving');
  try {
    await Promise.all(victims.map(f => fsDel(flatRef(f.flatId))));
    _openEditBlock = null; /* panel gone after delete */
    sync('live'); toast(`Block ${bl} deleted ✓`);
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.', 'error'); }
};

/* ══════════════════════════════════════════
   ADD NEW BLOCK
══════════════════════════════════════════ */
window._addNewBlock = async function() {
  const bl     = (document.getElementById('str-newblock-name')?.value || '').trim().toUpperCase();
  const floors = parseInt(document.getElementById('str-newblock-floors')?.value) || 1;
  const fpf    = parseInt(document.getElementById('str-newblock-fpf')?.value) || 4;
  const due    = parseInt(document.getElementById('str-newblock-due')?.value) || 0;
  if (!bl)                       { toast('Enter block name.', 'error'); return; }
  if (floors < 1 || floors > 50) { toast('Floors: 1–50.', 'error'); return; }
  if (fpf < 1 || fpf > 20)       { toast('Flats/floor: 1–20.', 'error'); return; }
  if ([...flats().values()].some(f => f.block === bl)) { toast(`Block ${bl} already exists.`, 'error'); return; }
  if (!confirm(`Create Block ${bl}: ${floors} floors × ${fpf} flats = ${floors * fpf} flats?`)) return;
  sync('saving');
  try {
    const batch = [];
    for (let fl = 1; fl <= floors; fl++)
      for (let i = 1; i <= fpf; i++) {
        const fid = `${bl}-${fl}${String(i).padStart(2, '0')}`;
        batch.push(fsSet(flatRef(fid), { block: bl, floor: fl, owner: '', resType: 'owner', due, paid: 0, month: AM() }));
      }
    await Promise.all(batch);
    ['str-newblock-name','str-newblock-floors','str-newblock-fpf','str-newblock-due']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    sync('live'); toast(`Block ${bl} created ✓`);
  } catch(e) { console.error(e); sync('error'); toast('Failed.', 'error'); }
};

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function rStructure() {
  /* Structure shows ALL flats — it's a physical view, not month-scoped */
  const all    = [...flats().values()];
  const blocks = [...new Set(all.map(f => f.block).filter(Boolean))].sort();
  const q      = (document.getElementById('strSearch')?.value || '').toLowerCase().trim();
  const bf     = document.getElementById('strBlockFilter')?.value || 'all';

  /* block filter dropdown */
  const bSel = document.getElementById('strBlockFilter');
  if (bSel) {
    const cur = bSel.value;
    bSel.innerHTML = `<option value="all">All Blocks</option>` +
      blocks.map(b => `<option value="${b}"${b === cur ? ' selected' : ''}>Block ${b}</option>`).join('');
  }

  /* summary cards */
  const total    = all.length;
  const occupied = all.filter(f => (f.owner || '').trim()).length;
  const owners   = all.filter(f => f.resType !== 'tenant' && (f.owner || '').trim()).length;
  const tenants  = all.filter(f => f.resType === 'tenant').length;
  document.getElementById('strStats').innerHTML = `
    <div class="vscard"><div class="vscard-icon tot"><i class="ti ti-building"></i></div>
      <div><div class="vscard-label">Total Flats</div><div class="vscard-val">${total}</div></div></div>
    <div class="vscard"><div class="vscard-icon fw"><i class="ti ti-users"></i></div>
      <div><div class="vscard-label">Occupied</div><div class="vscard-val" style="color:var(--green)">${occupied}</div></div></div>
    <div class="vscard"><div class="vscard-icon fl"><i class="ti ti-door"></i></div>
      <div><div class="vscard-label">Vacant</div><div class="vscard-val" style="color:var(--amber)">${total - occupied}</div></div></div>
    <div class="vscard"><div class="vscard-icon tw"><i class="ti ti-home"></i></div>
      <div><div class="vscard-label">Owners / Tenants</div><div class="vscard-val" style="font-size:14px">${owners} / ${tenants}</div></div></div>`;

  /* filter + group */
  const vis = all.filter(f => {
    if (bf !== 'all' && f.block !== bf) return false;
    if (q && !f.flatId?.toLowerCase().includes(q) && !(f.owner || '').toLowerCase().includes(q)) return false;
    return true;
  });
  const blockMap = new Map();
  vis.forEach(f => {
    const bl = f.block || '–';
    if (!blockMap.has(bl)) blockMap.set(bl, new Map());
    const fl = f.floor ?? '–';
    if (!blockMap.get(bl).has(fl)) blockMap.get(bl).set(fl, []);
    blockMap.get(bl).get(fl).push(f);
  });

  /* ── flat list view (structure — master data, no payment status) ── */
  const flatCards = (fls) => {
    const sorted = fls.sort((a, b) => (a.flatId || '').localeCompare(b.flatId || ''));
    return sorted.map(f => {
      const isVacant  = !(f.owner || '').trim();
      const isTenant  = f.resType === 'tenant';
      const typeColor = isVacant ? 'var(--muted)'   : isTenant ? 'var(--amber)'   : 'var(--indigo)';
      const typeBg    = isVacant ? 'var(--surface3)' : isTenant ? 'var(--amber-bg)': 'var(--indigo-bg)';
      const typeLabel = isVacant ? 'Vacant'          : isTenant ? '🔑 Tenant'      : '🏠 Owner';
      return `<div onclick="window._oFlEdit('${f.flatId}')"
        style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:7px;
          cursor:pointer;transition:background .12s;border:1px solid transparent"
        onmouseover="this.style.background='var(--surface2)';this.style.borderColor='var(--border)'"
        onmouseout="this.style.background='';this.style.borderColor='transparent'">
        <span style="width:7px;height:7px;border-radius:50%;background:${typeColor};flex-shrink:0"></span>
        <span style="font-size:11px;font-weight:800;color:var(--indigo);flex-shrink:0;min-width:52px">${f.flatId}</span>
        <span style="font-size:11px;color:${isVacant ? 'var(--muted)' : 'var(--text)'};
          font-style:${isVacant ? 'italic' : 'normal'};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${isVacant ? 'Vacant' : f.owner}
        </span>
        <span style="font-size:9px;font-weight:700;padding:1px 7px;border-radius:99px;
          background:${typeBg};color:${typeColor};flex-shrink:0;white-space:nowrap">
          ${typeLabel}
        </span>
        <i class="ti ti-chevron-right" style="font-size:11px;color:var(--muted);flex-shrink:0"></i>
      </div>`;
    }).join('');
  };

  /* ── editable flat table row ── */
  const flatEditRow = (f, fl) => {
    const isVacant = !(f.owner || '').trim();
    const isTenant = f.resType === 'tenant';
    const typeLabel = isVacant ? 'Vacant' : isTenant ? '🔑 Tenant' : '🏠 Owner';
    const typeColor = isVacant ? 'var(--muted)' : isTenant ? 'var(--amber)' : 'var(--indigo)';
    const typeBg    = isVacant ? 'var(--surface3)' : isTenant ? 'var(--amber-bg)' : 'var(--indigo-bg)';
    return `
    <tr style="border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
      <td style="padding:6px 8px">
        <input id="str-fid-${f.flatId}" type="text" value="${f.flatId}"
          style="box-sizing:border-box;width:82px;height:28px;padding:0 6px;border:1.5px solid var(--border2);
            border-radius:6px;font-family:var(--font);font-size:11px;font-weight:800;color:var(--indigo);
            background:#fff;outline:none;text-transform:uppercase"
          onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"
          oninput="this.value=this.value.toUpperCase()"/>
      </td>
      <td style="padding:6px 8px">
        <div style="font-size:12px;font-weight:600;color:${isVacant ? 'var(--muted)' : 'var(--text)'};
          font-style:${isVacant ? 'italic' : 'normal'}">${isVacant ? 'Vacant' : f.owner}</div>
      </td>
      <td style="padding:6px 8px;text-align:center">
        <input id="str-fl-${f.flatId}" type="number" value="${f.floor ?? fl}" min="1" max="99"
          style="box-sizing:border-box;width:50px;height:28px;padding:0 5px;border:1.5px solid var(--border2);
            border-radius:6px;font-family:var(--font);font-size:11px;font-weight:600;color:var(--text);
            background:#fff;outline:none;text-align:center"
          onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"/>
      </td>
      <td style="padding:6px 8px;text-align:right">
        <input id="str-due-${f.flatId}" type="number" value="${f.due || 0}" min="0"
          style="box-sizing:border-box;width:82px;height:28px;padding:0 6px;border:1.5px solid var(--border2);
            border-radius:6px;font-family:var(--font);font-size:11px;font-weight:600;color:var(--text);
            background:#fff;outline:none;text-align:right"
          onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"/>
      </td>
      <td style="padding:6px 8px;text-align:center">
        <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;
          background:${typeBg};color:${typeColor}">${typeLabel}</span>
      </td>
      <td style="padding:6px 6px;text-align:center">
        <div style="display:flex;gap:3px;justify-content:center">
          <button onclick="window._saveStrFlat('${f.flatId}')" title="Save"
            style="display:inline-flex;align-items:center;gap:3px;padding:3px 7px;
              border:1.5px solid var(--indigo);border-radius:5px;background:var(--indigo-bg);
              color:var(--indigo);font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font)">
            <i class="ti ti-check" style="font-size:10px"></i> Save
          </button>
          <button onclick="window._deleteSingleFlat('${f.flatId}')" title="Delete"
            style="display:inline-flex;align-items:center;padding:3px 6px;
              border:1.5px solid var(--red-border);border-radius:5px;
              background:var(--red-bg);color:var(--red);font-size:10px;cursor:pointer">
            <i class="ti ti-trash" style="font-size:10px"></i>
          </button>
        </div>
      </td>
    </tr>`;
  };

  /* ── build html ── */
  let html = '';
  [...blockMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([bl, floorMap]) => {
    const blFlats  = [...floorMap.values()].flat();
    const floors   = [...floorMap.keys()].sort((a, b) => Number(a) - Number(b));
    const maxFloor = Math.max(...floors.map(Number).filter(n => !isNaN(n)), 0);

    const isCollapsed = _collapsedBlocks.has(bl);
    const occupied = blFlats.filter(f => (f.owner||'').trim()).length;
    const vacant   = blFlats.length - occupied;

    html += `
    <div style="background:#fff;border:1px solid var(--border2);border-radius:var(--r-lg);
      margin-bottom:14px;overflow:hidden;box-shadow:var(--shadow-sm)">

      <!-- ═ BLOCK HEADER ═ -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
        background:linear-gradient(135deg,rgba(99,102,241,.07),rgba(139,92,246,.04));
        flex-wrap:wrap;gap:8px;cursor:pointer" onclick="window._toggleStrBlock('${bl}')">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:38px;height:38px;border-radius:10px;background:var(--indigo);color:#fff;
            display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex-shrink:0">${bl}</div>
          <div>
            <div style="font-size:14px;font-weight:800;color:var(--text)">Block ${bl}</div>
            <div style="font-size:11px;color:var(--muted)">
              ${blFlats.length} flats · ${floorMap.size} floor${floorMap.size !== 1 ? 's' : ''}
              · <span style="color:var(--green)">${occupied} occupied</span>
              ${vacant > 0 ? ` · <span style="color:var(--amber)">${vacant} vacant</span>` : ''}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap" onclick="event.stopPropagation()">
          <button onclick="window._openStrEdit('${bl}')"
            id="str-editbtn-${bl}"
            style="display:inline-flex;align-items:center;gap:5px;padding:6px 13px;
              border:1.5px solid var(--indigo);border-radius:8px;background:var(--indigo-bg);
              color:var(--indigo);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)">
            <i class="ti ti-settings" style="font-size:12px"></i> Edit
          </button>
          <button onclick="window._toggleStrBlock('${bl}')"
            style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;
              border:1.5px solid var(--border2);border-radius:8px;background:#fff;
              color:var(--text2);cursor:pointer;transition:all .15s"
            onmouseover="this.style.borderColor='var(--indigo)';this.style.color='var(--indigo)'"
            onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--text2)'">
            <i id="str-toggle-icon-${bl}" class="ti ${isCollapsed ? 'ti-chevron-down' : 'ti-chevron-up'}" style="font-size:14px"></i>
          </button>
        </div>
      </div>

      <!-- ═ COLLAPSIBLE BODY ═ -->
      <div id="str-body-${bl}" style="${isCollapsed ? 'display:none' : ''}">

      <!-- ═ EDIT PANEL ═ -->
      <div id="str-edit-${bl}" style="display:none;border-bottom:2px solid var(--indigo)">
        <div style="padding:16px;background:var(--surface2)">

          <div style="font-size:10px;font-weight:800;color:var(--indigo);text-transform:uppercase;
            letter-spacing:.8px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
            <span><i class="ti ti-settings"></i>&nbsp; Block ${bl} — Structure Editor</span>
            <button onclick="window._openStrEdit('${bl}')"
              style="background:none;border:1px solid var(--border2);border-radius:6px;padding:3px 10px;
                cursor:pointer;color:var(--text2);font-size:11px;font-weight:600;font-family:var(--font)">
              ✕ Close
            </button>
          </div>

          <!-- Rename block + delete block -->
          <div style="padding:12px 14px;background:#fff;border:1px solid var(--border2);border-radius:var(--r-md);margin-bottom:12px">
            <div style="font-size:11px;font-weight:800;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:6px">
              <i class="ti ti-pencil" style="color:var(--indigo)"></i> Block Settings
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <div style="font-size:11px;font-weight:600;color:var(--text2)">Rename:</div>
                <input id="str-bname-${bl}" type="text" value="${bl}" maxlength="4"
                  style="width:72px;height:32px;padding:0 10px;border:1.5px solid var(--border2);border-radius:var(--r-md);
                    font-family:var(--font);font-size:14px;font-weight:800;color:var(--indigo);background:#fff;outline:none"
                  onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"
                  oninput="this.value=this.value.toUpperCase()"
                  onkeydown="if(event.key==='Enter')window._renameBlock('${bl}')"/>
                <button onclick="window._renameBlock('${bl}')" class="btn btn-indigo btn-sm">
                  <i class="ti ti-check"></i> Rename
                </button>
                <span style="font-size:11px;color:var(--muted)">Updates all ${blFlats.length} records</span>
              </div>
              <button onclick="window._deleteBlock('${bl}')"
                style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;
                  border:1.5px solid var(--red-border);border-radius:var(--r-md);background:var(--red-bg);
                  color:var(--red);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)">
                <i class="ti ti-trash" style="font-size:12px"></i> Delete Block
              </button>
            </div>
          </div>

          <!-- Per-floor editable tables -->
          ${[...floorMap.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([fl, fls]) => `
          <div style="padding:12px 14px;background:#fff;border:1px solid var(--border2);border-radius:var(--r-md);margin-bottom:10px">

            <!-- Floor header -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
              <div style="font-size:12px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:7px">
                <i class="ti ti-stairs" style="color:var(--indigo);font-size:13px"></i>
                Floor ${fl}
                <span style="font-size:10px;font-weight:600;color:var(--muted)">${fls.length} flat${fls.length !== 1 ? 's' : ''}</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <!-- Bulk due update -->
                <div style="display:flex;align-items:center;gap:4px">
                  <span style="font-size:10px;color:var(--muted);white-space:nowrap">Set all due:</span>
                  <input id="str-bulk-due-${bl}-${fl}" type="number" min="0" placeholder="₹"
                    style="width:72px;height:26px;padding:0 6px;border:1.5px solid var(--border2);border-radius:6px;
                      font-family:var(--font);font-size:11px;font-weight:600;color:var(--text);background:#fff;outline:none"
                    onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"
                    onkeydown="if(event.key==='Enter')window._bulkDueFloor('${bl}','${fl}')"/>
                  <button onclick="window._bulkDueFloor('${bl}','${fl}')"
                    style="display:inline-flex;align-items:center;gap:3px;padding:3px 8px;
                      border:1.5px solid var(--indigo);border-radius:6px;background:var(--indigo-bg);
                      color:var(--indigo);font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font)">
                    <i class="ti ti-check" style="font-size:10px"></i> Apply
                  </button>
                </div>
                <button onclick="window._deleteFloor('${bl}','${fl}')"
                  style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
                    border:1.5px solid var(--red-border);border-radius:6px;background:var(--red-bg);
                    color:var(--red);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)">
                  <i class="ti ti-trash" style="font-size:11px"></i> Delete Floor
                </button>
              </div>
            </div>

            <!-- Flat edit table -->
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;min-width:460px">
                <thead>
                  <tr style="background:var(--surface3)">
                    <th style="padding:6px 8px;text-align:left;font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border2)">Flat ID</th>
                    <th style="padding:6px 8px;text-align:left;font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border2)">Resident</th>
                    <th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border2)">Floor</th>
                    <th style="padding:6px 8px;text-align:right;font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border2)">Monthly Due</th>
                    <th style="padding:6px 8px;text-align:center;font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border2)">Type</th>
                    <th style="padding:6px 6px;border-bottom:1px solid var(--border2);width:90px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${fls.sort((a, b) => (a.flatId || '').localeCompare(b.flatId || '')).map(f => flatEditRow(f, fl)).join('')}
                </tbody>
              </table>
            </div>

            <!-- Add flat to this floor -->
            <div style="display:flex;align-items:center;gap:6px;margin-top:8px;padding:8px 10px;
              border:1.5px dashed var(--border3);border-radius:var(--r-md);flex-wrap:wrap;background:var(--surface2)">
              <span style="font-size:11px;font-weight:700;color:var(--text2);white-space:nowrap">+ Add flat:</span>
              <input id="str-newflatnum-${bl}-${fl}" type="text" placeholder="e.g. ${fl}05"
                style="flex:1;min-width:80px;height:28px;padding:0 7px;border:1.5px solid var(--border2);border-radius:6px;
                  font-family:var(--font);font-size:11px;font-weight:600;color:var(--text);background:#fff;outline:none;text-transform:uppercase"
                onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"
                oninput="this.value=this.value.toUpperCase()"
                onkeydown="if(event.key==='Enter')window._addSingleFlat('${bl}','${fl}')"/>
              <input id="str-newflatdue-${bl}-${fl}" type="number" placeholder="Due ₹" min="0"
                style="width:80px;height:28px;padding:0 7px;border:1.5px solid var(--border2);border-radius:6px;
                  font-family:var(--font);font-size:11px;font-weight:600;color:var(--text);background:#fff;outline:none"
                onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"/>
              <button onclick="window._addSingleFlat('${bl}','${fl}')"
                style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
                  border:1.5px solid var(--green);border-radius:6px;background:var(--green-bg);
                  color:var(--green);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)">
                <i class="ti ti-plus" style="font-size:11px"></i> Add
              </button>
            </div>
          </div>`).join('')}

          <!-- Add new floor -->
          <div style="padding:12px 14px;background:#fff;border:1.5px dashed var(--border3);border-radius:var(--r-md);margin-bottom:4px">
            <div style="font-size:11px;font-weight:800;color:var(--text2);margin-bottom:8px">
              <i class="ti ti-plus" style="color:var(--indigo)"></i> Add Floor ${maxFloor + 1}
            </div>
            <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap">
              <div>
                <div style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Flats / Floor</div>
                <input id="str-newfloor-cnt-${bl}" type="number" value="4" min="1" max="20"
                  style="width:72px;height:30px;padding:0 8px;border:1.5px solid var(--border2);border-radius:6px;
                    font-family:var(--font);font-size:12px;font-weight:700;color:var(--text);background:#fff;outline:none"
                  onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"/>
              </div>
              <div>
                <div style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Monthly Due (₹)</div>
                <input id="str-newfloor-due-${bl}" type="number" value="0" min="0"
                  style="width:100px;height:30px;padding:0 8px;border:1.5px solid var(--border2);border-radius:6px;
                    font-family:var(--font);font-size:12px;font-weight:700;color:var(--text);background:#fff;outline:none"
                  onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"/>
              </div>
              <button onclick="window._addFloor('${bl}')" class="btn btn-green btn-sm">
                <i class="ti ti-plus"></i> Add Floor ${maxFloor + 1}
              </button>
            </div>
          </div>

        </div>
      </div><!-- /edit panel -->

      <!-- ═ FLAT LIST VIEW ═ -->
      <div style="padding:10px 12px;display:flex;flex-direction:column;gap:10px">
        ${[...floorMap.entries()].sort((a, b) => Number(b[0]) - Number(a[0])).map(([fl, fls]) => {
          const occ = fls.filter(f => (f.owner||'').trim()).length;
          const vac = fls.length - occ;
          return `
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;
              padding:4px 10px 6px;margin-bottom:2px">
              <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.8px">
                Floor ${fl}
              </span>
              <span style="font-size:10px;color:var(--muted)">
                ${fls.length} flat${fls.length !== 1 ? 's' : ''}
                · <span style="color:var(--green);font-weight:700">${occ} occupied</span>
                ${vac > 0 ? ` · <span style="color:var(--amber);font-weight:700">${vac} vacant</span>` : ''}
              </span>
            </div>
            <div style="background:var(--surface2);border-radius:var(--r-md);overflow:hidden;border:1px solid var(--border)">
              ${flatCards(fls)}
            </div>
          </div>`;
        }).join('')}
      </div>

      </div><!-- /str-body collapsible -->

    </div>`;
  });

  /* ═ ADD NEW BLOCK ═ */
  html += `
  <div style="background:#fff;border:1.5px dashed var(--border3);border-radius:var(--r-lg);padding:16px 18px;margin-top:4px">
    <div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:7px">
      <i class="ti ti-plus" style="color:var(--indigo)"></i> Add New Block
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:12px">
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Block Name</div>
        <input id="str-newblock-name" type="text" placeholder="e.g. C" maxlength="4"
          style="width:100%;box-sizing:border-box;height:32px;padding:0 10px;border:1.5px solid var(--border2);
            border-radius:var(--r-md);font-family:var(--font);font-size:13px;font-weight:800;color:var(--indigo);background:#fff;outline:none"
          onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"
          oninput="this.value=this.value.toUpperCase()"/>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">No. of Floors</div>
        <input id="str-newblock-floors" type="number" placeholder="4" min="1" max="50"
          style="width:100%;box-sizing:border-box;height:32px;padding:0 10px;border:1.5px solid var(--border2);
            border-radius:var(--r-md);font-family:var(--font);font-size:13px;font-weight:600;color:var(--text);background:#fff;outline:none"
          onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"/>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Flats / Floor</div>
        <input id="str-newblock-fpf" type="number" placeholder="4" min="1" max="20"
          style="width:100%;box-sizing:border-box;height:32px;padding:0 10px;border:1.5px solid var(--border2);
            border-radius:var(--r-md);font-family:var(--font);font-size:13px;font-weight:600;color:var(--text);background:#fff;outline:none"
          onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"/>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Monthly Due (₹)</div>
        <input id="str-newblock-due" type="number" placeholder="0" min="0"
          style="width:100%;box-sizing:border-box;height:32px;padding:0 10px;border:1.5px solid var(--border2);
            border-radius:var(--r-md);font-family:var(--font);font-size:13px;font-weight:600;color:var(--text);background:#fff;outline:none"
          onfocus="this.style.borderColor='var(--indigo)'" onblur="this.style.borderColor='var(--border2)'"/>
      </div>
    </div>
    <button onclick="window._addNewBlock()" class="btn btn-indigo btn-sm">
      <i class="ti ti-plus"></i> Create Block
    </button>
  </div>`;

  document.getElementById('strBlocks').innerHTML = html;

  /* restore open edit panel after re-render */
  if (_openEditBlock) {
    const el = document.getElementById('str-edit-' + _openEditBlock);
    if (el) {
      el.style.display = 'block';
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } else {
      _openEditBlock = null; /* block was deleted */
    }
  }
}

window.rStructure = rStructure;
