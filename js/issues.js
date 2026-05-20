/* ════════════════════════════════
   ISSUES TAB — js/issues.js
   Depends on: window.APP (shared state injected from app.html)
════════════════════════════════ */

export function rIssues() {
  const { issues, IF, fdt } = window.APP;
  const fil = IF === 'all' ? [...issues] : issues.filter(i => i.status === IF);
  const icons = {
    Plumbing: 'ti-tool', Electrical: 'ti-bolt', Lift: 'ti-elevator',
    Security: 'ti-shield', Cleaning: 'ti-vacuum-cleaner', Parking: 'ti-car',
    Noise: 'ti-volume', Internet: 'ti-wifi', Other: 'ti-clipboard'
  };

  if (!fil.length) {
    document.getElementById('iList').innerHTML = `<div class="iss-empty">
      <i class="ti ti-mood-happy"></i>
      <h3>${IF === 'all' ? 'No issues raised yet' : 'No ' + IF + ' issues found'}</h3>
      <p>${IF === 'all' ? 'Everything is running smoothly!' : 'All clear in this category.'}</p>
    </div>`;
    return;
  }

  document.getElementById('iList').innerHTML = fil.map(iss => {
    const sLabel  = iss.status === 'in-progress' ? 'In Progress' : iss.status.charAt(0).toUpperCase() + iss.status.slice(1);
    const pLabel  = iss.priority.charAt(0).toUpperCase() + iss.priority.slice(1);
    return `<div class="icard" onclick="window._oID('${iss.id}')">
      <div class="ipbar ${iss.priority}"></div>
      <div>
        <div class="ic-title"><i class="ti ${icons[iss.cat] || 'ti-clipboard'}"></i>${iss.title}</div>
        <div class="ic-desc">${iss.desc.length > 130 ? iss.desc.slice(0, 130) + '…' : iss.desc}</div>
        <div class="ic-meta">
          <span class="itag flat"><i class="ti ti-home"></i>${iss.flat || iss.block}</span>
          <span class="itag cat">${iss.cat}</span>
          <span class="itag date"><i class="ti ti-calendar"></i>${fdt(iss.createdAt)}</span>
          <span style="font-size:11px;color:var(--text2);font-weight:600">By: ${iss.reporter}</span>
        </div>
      </div>
      <div class="iright">
        <span class="istatus ${iss.status}">${sLabel}</span>
        <span class="ipriority ${iss.priority}">${pLabel}</span>
      </div>
    </div>`;
  }).join('');
}

export function fIss(f) {
  window.APP.IF = f;
  document.querySelectorAll('.iff').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  rIssues();
}
