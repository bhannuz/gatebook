// Excel backup / restore for the apartment admin.
// Exports every collection to its own sheet (+ society info), imports it back by document id.
import { db } from './firebase.js';
import { collection, doc, getDocs, getDoc, writeBatch, Timestamp }
  from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const SHEETS = [
  ['Flats', 'flats'], ['Expenses', 'expenses'], ['Issues', 'issues'], ['Vehicles', 'vehicles'],
  ['SocietyExpenses', 'soc_expenses'], ['Contacts', 'contacts'], ['PresidentHistory', 'presidentHistory'],
];
const SOCIETY_SHEET = 'Society';
const SOCIETY_KEYS = ['name', 'blocks', 'corpusFund'];   // plan / expiry / status are never imported
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

let _getUID = () => null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = XLSX_URL; s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error('Could not load the Excel library (check internet).'));
    document.head.appendChild(s);
  });
}

/* ── cell encoding ── */
const jsonReplacer = function (k, v) {
  const raw = this[k];
  if (raw && typeof raw.toDate === 'function') return { __ts: raw.toDate().toISOString() };
  return v;
};
const jsonReviver = (k, v) => (v && typeof v === 'object' && v.__ts ? Timestamp.fromDate(new Date(v.__ts)) : v);

function encode(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v.toDate === 'function') return 'ts:' + v.toDate().toISOString();
  if (typeof v === 'object') return 'json:' + JSON.stringify(v, jsonReplacer);
  if (typeof v === 'string' && /^(json:|ts:|str:)/.test(v)) return 'str:' + v;
  return v;
}
function decode(v) {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'string') {
    if (v.startsWith('json:')) { try { return JSON.parse(v.slice(5), jsonReviver); } catch { return v; } }
    if (v.startsWith('ts:')) { const d = new Date(v.slice(3)); return isNaN(d) ? v : Timestamp.fromDate(d); }
    if (v.startsWith('str:')) return v.slice(4);
  }
  return v;
}

function toSheet(X, rows) {
  const cols = ['_id'];
  rows.forEach(r => Object.keys(r).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
  return X.utils.json_to_sheet(rows, { header: cols });
}

/* ── export ── */
async function doExport(setMsg) {
  const UID = _getUID(); if (!UID) return;
  const X = await loadXLSX();
  const wb = X.utils.book_new();
  setMsg('Reading data…');

  const apt = await getDoc(doc(db, 'apartments', UID));
  const a = apt.exists() ? apt.data() : {};
  const socRows = SOCIETY_KEYS.filter(k => a[k] !== undefined).map(k => ({ key: k, value: encode(a[k]) }));
  X.utils.book_append_sheet(wb, X.utils.json_to_sheet(socRows.length ? socRows : [{ key: '', value: '' }], { header: ['key', 'value'] }), SOCIETY_SHEET);

  const counts = [];
  for (const [sheet, coll] of SHEETS) {
    const snap = await getDocs(collection(db, 'apartments', UID, coll));
    const rows = snap.docs.map(d => {
      const o = { _id: d.id };
      Object.entries(d.data()).forEach(([k, v]) => { const e = encode(v); if (e !== undefined) o[k] = e; });
      return o;
    });
    counts.push(`${sheet}: ${rows.length}`);
    X.utils.book_append_sheet(wb, toSheet(X, rows.length ? rows : [{ _id: '' }]), sheet);
  }

  const name = (document.getElementById('aptNameDisplay')?.textContent || 'society').replace(/[^\w\-]+/g, '_').slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);
  X.writeFile(wb, `Gatebook_${name}_backup_${stamp}.xlsx`);
  setMsg(`✅ Exported — ${counts.join(' · ')}`);
}

/* ── import ── */
async function readWorkbook(file) {
  const X = await loadXLSX();
  const wb = X.read(await file.arrayBuffer(), { type: 'array' });
  const plan = { society: null, colls: [] };
  const soc = wb.Sheets[SOCIETY_SHEET];
  if (soc) {
    const data = {};
    X.utils.sheet_to_json(soc, { defval: undefined }).forEach(r => {
      if (SOCIETY_KEYS.includes(r.key)) { const v = decode(r.value); if (v !== undefined) data[r.key] = v; }
    });
    if (Object.keys(data).length) plan.society = data;
  }
  for (const [sheet, coll] of SHEETS) {
    const ws = wb.Sheets[sheet]; if (!ws) continue;
    const rows = [], skipped = [];
    X.utils.sheet_to_json(ws, { defval: undefined }).forEach((r, i) => {
      const id = String(r._id ?? '').trim();
      if (!id) return;
      if (id.includes('/') || id === '.' || id === '..') { skipped.push(id); return; }
      const data = {};
      Object.entries(r).forEach(([k, v]) => { if (k === '_id' || k.startsWith('__EMPTY')) return; const d = decode(v); if (d !== undefined) data[k] = d; });
      rows.push({ id, data });
    });
    plan.colls.push({ sheet, coll, rows, skipped });
  }
  return plan;
}

async function doImport(plan, replaceAll, setMsg) {
  const UID = _getUID(); if (!UID) return;
  const ops = [];   // { fn(batch) }
  if (plan.society) ops.push(b => b.set(doc(db, 'apartments', UID), plan.society, { merge: true }));
  let deleted = 0;
  for (const c of plan.colls) {
    const keep = new Set(c.rows.map(r => r.id));
    c.rows.forEach(r => ops.push(b => b.set(doc(db, 'apartments', UID, c.coll, r.id), r.data)));
    if (replaceAll) {
      const snap = await getDocs(collection(db, 'apartments', UID, c.coll));
      snap.docs.forEach(d => { if (!keep.has(d.id)) { ops.push(b => b.delete(d.ref)); deleted++; } });
    }
  }
  for (let i = 0; i < ops.length; i += 400) {
    setMsg(`Writing ${Math.min(i + 400, ops.length)} / ${ops.length}…`);
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach(fn => fn(b));
    await b.commit();
  }
  setMsg(`✅ Restored ${ops.length - deleted} records${deleted ? `, removed ${deleted} not in file` : ''}.`);
}

/* ── UI ── */
function openModal() {
  document.getElementById('gbBackupModal')?.remove();
  const m = document.createElement('div');
  m.id = 'gbBackupModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:440px;width:100%;padding:18px;font-family:var(--font,inherit);box-shadow:0 20px 50px rgba(0,0,0,.25)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:15px;font-weight:800">Backup &amp; Restore (Excel)</div>
        <button id="gbbClose" style="border:none;background:none;font-size:20px;cursor:pointer;color:#64748b">×</button>
      </div>
      <div style="font-size:12px;color:#475569;margin-bottom:8px">Flats, payments, expenses, services, vehicles, contacts, society expenses and president history. Member logins are not included.</div>
      <button id="gbbExport" style="width:100%;height:38px;border:none;border-radius:8px;background:#4f46e5;color:#fff;font-weight:700;font-size:13px;cursor:pointer;margin-bottom:14px">⬇️ Export to Excel</button>
      <div style="border-top:1px solid #e2e8f0;padding-top:12px">
        <div style="font-size:12px;font-weight:700;margin-bottom:6px">Restore from Excel backup</div>
        <input type="file" id="gbbFile" accept=".xlsx,.xls" style="font-size:12px;width:100%;margin-bottom:8px"/>
        <label style="display:flex;gap:6px;align-items:flex-start;font-size:11px;color:#b91c1c;margin-bottom:8px">
          <input type="checkbox" id="gbbReplace" style="margin-top:2px"/> Exact restore — also delete current records that are not in the file</label>
        <div id="gbbPreview" style="font-size:12px;color:#334155;margin-bottom:8px"></div>
        <button id="gbbImport" disabled style="width:100%;height:38px;border:none;border-radius:8px;background:#d97706;color:#fff;font-weight:700;font-size:13px;cursor:pointer;opacity:.5">⬆️ Restore</button>
      </div>
      <div id="gbbMsg" style="font-size:12px;margin-top:10px;color:#334155"></div>
    </div>`;
  document.body.appendChild(m);
  const $ = id => m.querySelector('#' + id);
  const setMsg = t => { $('gbbMsg').textContent = t; };
  let plan = null;
  $('gbbClose').onclick = () => m.remove();
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });

  $('gbbExport').onclick = async e => {
    e.target.disabled = true;
    try { await doExport(setMsg); } catch (err) { console.error(err); setMsg('❌ ' + err.message); }
    e.target.disabled = false;
  };

  $('gbbFile').onchange = async e => {
    plan = null; $('gbbImport').disabled = true; $('gbbImport').style.opacity = .5; $('gbbPreview').textContent = '';
    const f = e.target.files[0]; if (!f) return;
    try {
      setMsg('Reading file…');
      plan = await readWorkbook(f);
      const lines = plan.colls.map(c => `${esc(c.sheet)}: <b>${c.rows.length}</b>${c.skipped.length ? ` <span style="color:#b91c1c">(${c.skipped.length} skipped: bad id)</span>` : ''}`);
      if (plan.society) lines.unshift('Society info: <b>yes</b>');
      if (!lines.length) { setMsg('❌ No Gatebook sheets found in this file.'); plan = null; return; }
      $('gbbPreview').innerHTML = lines.join(' · ');
      $('gbbImport').disabled = false; $('gbbImport').style.opacity = 1; setMsg('');
    } catch (err) { console.error(err); setMsg('❌ ' + err.message); }
  };

  $('gbbImport').onclick = async e => {
    if (!plan) return;
    const replaceAll = $('gbbReplace').checked;
    if (!confirm(replaceAll
      ? 'EXACT RESTORE: records in the file overwrite current ones, and current records not in the file will be DELETED. Continue?'
      : 'Records in the file will overwrite current records with the same ID and missing ones will be added. Continue?')) return;
    e.target.disabled = true;
    try { await doImport(plan, replaceAll, setMsg); } catch (err) { console.error(err); setMsg('❌ ' + err.message); }
    e.target.disabled = false;
  };
}

export function initBackup(getUID) {
  _getUID = getUID;
  if (document.getElementById('gbBackupBtn')) return;
  const right = document.querySelector('.nav-right'); if (!right) return;
  const b = document.createElement('button');
  b.id = 'gbBackupBtn'; b.title = 'Backup / Restore (Excel)';
  b.style.cssText = 'background:none;border:1px solid var(--border2);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--text2);display:inline-flex;align-items:center;justify-content:center';
  b.innerHTML = '<i class="ti ti-database-export" style="font-size:15px"></i>';
  b.onclick = openModal;
  right.insertBefore(b, right.querySelector('.user-chip'));
}
