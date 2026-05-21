/* ════════════════════════════════
   VEHICLES TAB — js/vehicles.js
   Reads from: window.APP (shared closure vars)
════════════════════════════════ */

export function rVehicles() {
  const { flats, vehicles, bks, AM, inr } = window.APP;
  const q  = (document.getElementById('vehQ')?.value || '').toLowerCase().trim();
  const bf = document.getElementById('vehBF')?.value || 'all';
  const tf = document.getElementById('vehTF')?.value || 'all';
  const all = [...flats.values()].filter(f => f.month === AM);

  // Rebuild block filter dropdown
  const bs = bks();
  const bfSel = document.getElementById('vehBF');
  if (bfSel && bfSel.options.length <= 1) {
    bs.forEach(b => {
      const o = document.createElement('option');
      o.value = b; o.textContent = 'Block ' + b;
      bfSel.appendChild(o);
    });
  }

  const totTw   = [...vehicles.values()].reduce((s, v) => s + (parseInt(v.tw) || 0), 0);
  const totFw   = [...vehicles.values()].reduce((s, v) => s + (parseInt(v.fw) || 0), 0);
  const withVeh = [...flats.values()].filter(f => {
    const v = vehicles.get(f.flatId) || {};
    return (parseInt(v.tw) || 0) + (parseInt(v.fw) || 0) > 0;
  }).length;

  document.getElementById('vehSum').innerHTML = `
    <div class="vscard"><div class="vscard-icon tw"><i class="ti ti-motorbike"></i></div><div><div class="vscard-label">2-Wheelers</div><div class="vscard-val">${totTw}</div></div></div>
    <div class="vscard"><div class="vscard-icon fw"><i class="ti ti-car"></i></div><div><div class="vscard-label">4-Wheelers</div><div class="vscard-val">${totFw}</div></div></div>
    <div class="vscard"><div class="vscard-icon tot"><i class="ti ti-parking"></i></div><div><div class="vscard-label">Total Vehicles</div><div class="vscard-val">${totTw + totFw}</div></div></div>
    <div class="vscard"><div class="vscard-icon fl"><i class="ti ti-home-check"></i></div><div><div class="vscard-label">Flats w/ Vehicles</div><div class="vscard-val">${withVeh}/${all.length}</div></div></div>
  `;

  const rows = all.filter(f => {
    if (bf !== 'all' && f.block !== bf) return false;
    if (q && !f.flatId.toLowerCase().includes(q) && !(f.owner || '').toLowerCase().includes(q)) return false;
    const v = vehicles.get(f.flatId) || {};
    const tw = parseInt(v.tw) || 0, fw = parseInt(v.fw) || 0;
    if (tf === '2w'   && tw === 0) return false;
    if (tf === '4w'   && fw === 0) return false;
    if (tf === 'both' && (tw === 0 || fw === 0)) return false;
    if (tf === 'none' && (tw + fw) > 0) return false;
    return true;
  });

  if (!rows.length) {
    document.getElementById('vehBody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--muted)"><i class="ti ti-motorbike" style="font-size:32px;display:block;margin-bottom:8px;opacity:.3"></i>No records match your filter.</td></tr>`;
    return;
  }

  document.getElementById('vehBody').innerHTML = rows.map(f => {
    const v = vehicles.get(f.flatId) || { tw: 0, fw: 0, nums: '', slot: '' };
    const tw = parseInt(v.tw) || 0, fw = parseInt(v.fw) || 0;
    const twB = tw > 0 ? `<span class="vbadge tw"><i class="ti ti-motorbike"></i>${tw}</span>` : `<span class="vbadge none">–</span>`;
    const fwB = fw > 0 ? `<span class="vbadge fw"><i class="ti ti-car"></i>${fw}</span>` : `<span class="vbadge none">–</span>`;
    return `<tr>
      <td><strong style="color:var(--indigo)">${f.flatId}</strong></td>
      <td><div style="font-weight:600">${f.owner || '(No owner)'}</div><div style="font-size:10px;color:var(--muted)">${f.resType === 'tenant' ? '🔑 Tenant' : '🏠 Owner'}</div></td>
      <td>${twB}</td>
      <td>${fwB}</td>
      <td style="font-size:12px;color:var(--text2)">${v.nums || '—'}</td>
      <td style="font-size:12px;color:var(--text2)">${v.slot || '—'}</td>
      <td><button class="btn btn-white btn-sm" onclick="window._oVehFor('${f.flatId}')"><i class="ti ti-pencil"></i> Edit</button></td>
    </tr>`;
  }).join('');
}

export function oVehM() {
  const { flats, AM } = window.APP;
  const first = [...flats.values()].find(f => f.month === AM);
  if (first) oVehFor(first.flatId);
  else window.APP.toast('No flats found.', 'error');
}

export function oVehFor(fid) {
  const { flats, vehicles } = window.APP;
  const f = flats.get(fid);
  const v = vehicles.get(fid) || { tw: 0, fw: 0, nums: '', slot: '' };
  document.getElementById('vehFid').value         = fid;
  document.getElementById('vehMSub').textContent  = fid + (f && f.owner ? ' — ' + f.owner : '');
  document.getElementById('veh2w').value           = v.tw || 0;
  document.getElementById('veh4w').value           = v.fw || 0;
  document.getElementById('vehNums').value         = v.nums || '';
  document.getElementById('vehSlot').value         = v.slot || '';
  document.getElementById('vehDelBtn').style.display = vehicles.has(fid) ? '' : 'none';
  document.getElementById('vehSaveBtn').disabled   = false;
  document.getElementById('vehSaveLbl').textContent = 'Save Vehicles';
  document.getElementById('vehM').classList.add('open');
}

export function cVehM() { document.getElementById('vehM').classList.remove('open'); }

export async function sVeh() {
  const { vehRef, sync, toast } = window.APP;
  const fid  = document.getElementById('vehFid').value;
  const tw   = parseInt(document.getElementById('veh2w').value)   || 0;
  const fw   = parseInt(document.getElementById('veh4w').value)   || 0;
  const nums = document.getElementById('vehNums').value.trim();
  const slot = document.getElementById('vehSlot').value.trim();
  const btn  = document.getElementById('vehSaveBtn');
  btn.disabled = true;
  document.getElementById('vehSaveLbl').textContent = 'Saving…';
  sync('saving');
  try {
    const { setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await setDoc(vehRef(fid), { flatId: fid, tw, fw, nums, slot, updatedAt: serverTimestamp() });
    sync('live'); cVehM(); toast('Vehicles saved ✓');
  } catch(e) { console.error(e); sync('error'); toast('Save failed.', 'error'); }
  finally { btn.disabled = false; document.getElementById('vehSaveLbl').textContent = 'Save Vehicles'; }
}

export async function delVeh() {
  const { vehRef, sync, toast } = window.APP;
  const fid = document.getElementById('vehFid').value;
  if (!confirm('Clear vehicle data for this flat?')) return;
  sync('saving');
  try {
    const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    await deleteDoc(vehRef(fid));
    sync('live'); cVehM(); toast('Vehicle data cleared ✓');
  } catch(e) { console.error(e); sync('error'); toast('Delete failed.', 'error'); }
}
