/* ════════════════════════════════
   PAYMENTS TAB — js/payments.js
   Depends on: window.APP (shared state injected from app.html)
════════════════════════════════ */

export function rBTabs() {
  const { bks, bfl, AB, AM, inr, st } = window.APP;
  const bs = bks();
  document.getElementById('btabs').innerHTML = bs.map(b => {
    const bf  = bfl(b);
    const pc  = bf.filter(f => st(f) === 'paid').length;
    const col = bf.reduce((s, f) => s + f.paid, 0);
    return `<button class="btab${b === AB ? ' active' : ''}" onclick="window._sB('${b}')">
      <i class="ti ti-building"></i>
      ${b ? `Block ${b}` : 'Building'}
      <span class="btab-badge">${pc}/${bf.length}</span>
    </button>`;
  }).join('');
}

export function rBlock() {
  const { bfl, AB, FS, SQ, st, sl, si, inr } = window.APP;
  const bf  = bfl(AB);
  const vis = bf.filter(f => {
    if (FS !== 'all' && st(f) !== FS) return false;
    if (SQ && !f.flatId.toLowerCase().includes(SQ) && !(f.owner || '').toLowerCase().includes(SQ)) return false;
    return true;
  });
  const pc  = bf.filter(f => st(f) === 'paid').length;
  const col = bf.reduce((s, f) => s + f.paid, 0);
  let h = `<div class="bhead">
    <div class="bhead-left">
      <div class="bstripe"></div>
      <div class="btitle">${AB ? `Block ${AB}` : 'Building'}</div>
      <span class="bbadge">✅ ${pc}/${bf.length} paid</span>
    </div>
    <div class="bcollected">Collected: <strong>${inr(col)}</strong></div>
  </div><div class="fgrid">`;
  if (!vis.length) {
    h += `<div class="empty-grid"><i class="ti ti-search-off"></i>No flats match your filter.</div>`;
  } else {
    vis.forEach(f => {
      const s   = st(f);
      const pct = f.due ? Math.round(Math.min(f.paid / f.due * 100, 100)) : 0;
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
  }
  document.getElementById('bcon').innerHTML = h + '</div>';
}
