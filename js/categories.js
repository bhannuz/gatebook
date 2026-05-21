/* ════════════════════════════════
   CATEGORIES — js/categories.js
   Custom expense categories stored in Firestore.
   Used by: Add Payment modal, Society Expense modal.
   Reads/writes: apartments/{uid}/categories/{id}
════════════════════════════════ */

const DEFAULT_CATEGORIES = [
  'Maintenance','Water','Electricity','Parking','Lift',
  'Security','Cleaning','Internet','Other'
];

/* ── Populate any <select> with current categories ── */
export function fillCatSelect(selectId, selectedVal) {
  const cats = window.APP?.categories?.length ? window.APP.categories
    : ['Maintenance','Water','Electricity','Parking','Lift','Security','Cleaning','Other'];
  const sel  = document.getElementById(selectId);
  if (!sel) return;
  const cur  = selectedVal || (sel.value !== '__manage__' ? sel.value : null) || cats[0];
  sel.innerHTML = cats
    .map(c => `<option value="${c}"${c === cur ? ' selected' : ''}>${c}</option>`)
    .join('');
  sel.innerHTML += `<option value="__manage__">⚙ Manage Categories…</option>`;
  // Use a named handler attached via dataset to avoid duplicates
  if (!sel._catListenerAdded) {
    sel._catListenerAdded = true;
    sel.addEventListener('change', function(e) {
      if (e.target.value === '__manage__') {
        const prev = e.target.dataset.prev || cats[0];
        e.target.value = prev;
        if (window._openCatManager) window._openCatManager();
      } else {
        e.target.dataset.prev = e.target.value;
      }
    });
  }
  sel.dataset.prev = cur;
}

/* ── Listen for categories in Firestore ── */
let _catUnsub = null;
export async function listenCategories() {
  const { db, UID } = window.APP;
  const { collection, onSnapshot, query, orderBy } =
    await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
  const catColl = collection(db, 'apartments', UID, 'categories');
  _catUnsub = onSnapshot(query(catColl, orderBy('order', 'asc')), snap => {
    if (snap.empty) {
      window.APP.categories = [...DEFAULT_CATEGORIES];
    } else {
      window.APP.categories = snap.docs.map(d => d.data().name).filter(Boolean);
    }
    // Refresh all open category dropdowns
    ['fC','peCat'].forEach(id => {
      const el = document.getElementById(id);
      if (el) fillCatSelect(id, el.value === '__manage__' ? null : el.value);
    });
  }, () => {
    window.APP.categories = [...DEFAULT_CATEGORIES];
  });
}

/* ── Category Manager Modal ── */
export function openCatManager() {
  renderCatManager();
  document.getElementById('catMgrModal').classList.add('open');
}

export function closeCatManager() {
  document.getElementById('catMgrModal').classList.remove('open');
}

function renderCatManager() {
  const cats = window.APP.categories || DEFAULT_CATEGORIES;
  document.getElementById('catMgrList').innerHTML = cats.map((c, i) => `
    <div class="cat-row" id="catRow${i}">
      <input class="cat-inp" id="catInp${i}" value="${c}" placeholder="Category name"
        style="flex:1;background:var(--surface2);border:1.5px solid var(--border2);color:var(--text);
          font-family:var(--font);font-size:13px;font-weight:600;border-radius:var(--r-md);
          padding:7px 10px;outline:none;transition:border-color .15s"
        onfocus="this.style.borderColor='var(--indigo)'"
        onblur="this.style.borderColor='var(--border2)'"/>
      <button onclick="window._delCat(${i})"
        style="width:32px;height:32px;border-radius:var(--r-sm);border:1.5px solid var(--border2);
          background:var(--surface2);color:var(--muted);cursor:pointer;font-size:14px;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s"
        onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
        onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--muted)'">
        <i class="ti ti-trash"></i>
      </button>
    </div>`).join('');
}

export async function saveCatManager() {
  const { db, UID, sync, toast } = window.APP;
  const { collection, doc, writeBatch } =
    await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');

  // Collect all current input values
  const cats = [];
  document.querySelectorAll('.cat-inp').forEach(inp => {
    const v = inp.value.trim();
    if (v) cats.push(v);
  });

  if (!cats.length) { toast('Add at least one category.', 'error'); return; }

  const btn = document.getElementById('catSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  sync('saving');
  try {
    const catColl = collection(db, 'apartments', UID, 'categories');
    const batch   = writeBatch(db);

    // Delete all existing
    const { getDocs } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    const snap = await getDocs(catColl);
    snap.docs.forEach(d => batch.delete(d.ref));

    // Add new ones
    cats.forEach((name, i) => {
      const ref = doc(catColl);
      batch.set(ref, { name, order: i });
    });

    await batch.commit();
    sync('live');
    toast('Categories saved ✓');
    closeCatManager();
  } catch(e) {
    console.error(e); sync('error'); toast('Save failed.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save';
  }
}

export function addCatRow() {
  const cats = window.APP.categories || DEFAULT_CATEGORIES;
  const i    = document.querySelectorAll('.cat-inp').length;
  const div  = document.createElement('div');
  div.className = 'cat-row';
  div.id = `catRow${i}`;
  div.innerHTML = `
    <input class="cat-inp" id="catInp${i}" value="" placeholder="New category"
      style="flex:1;background:var(--surface2);border:1.5px solid var(--indigo);color:var(--text);
        font-family:var(--font);font-size:13px;font-weight:600;border-radius:var(--r-md);
        padding:7px 10px;outline:none;transition:border-color .15s"
      onfocus="this.style.borderColor='var(--indigo)'"
      onblur="this.style.borderColor='var(--border2)'"/>
    <button onclick="this.parentElement.remove()"
      style="width:32px;height:32px;border-radius:var(--r-sm);border:1.5px solid var(--border2);
        background:var(--surface2);color:var(--muted);cursor:pointer;font-size:14px;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s"
      onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'"
      onmouseout="this.style.borderColor='var(--border2)';this.style.color='var(--muted)'">
      <i class="ti ti-trash"></i>
    </button>`;
  document.getElementById('catMgrList').appendChild(div);
  div.querySelector('input').focus();
}

export function delCatRow(i) {
  const row = document.getElementById(`catRow${i}`);
  if (row) row.remove();
}
