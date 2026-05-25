import { useState, useEffect, useRef, useCallback } from "react";

// ── Colour palette (matches Gatebook's CSS vars) ──────────────────
const C = {
  indigo: "#6366F1", indigo2: "#4F46E5",
  green: "#22c55e",  amber: "#f59e0b",
  red: "#ef4444",    gray: "#d1d5db",
  purple: "#8b5cf6", cyan: "#06b6d4",
  orange: "#f97316", pink: "#ec4899",
  teal: "#10b981",   blue: "#3b82f6",
};
const EXP_PALETTE = [C.indigo, C.amber, C.green, C.red, C.purple, C.cyan, C.orange, C.pink, C.teal, C.blue];

// ── Seed data ──────────────────────────────────────────────────────
function makeData() {
  const owners = ["Raj Kumar","Priya S","Amit V","Sunita R","Deepak M","Kavya P",
    "Ramesh B","Anita N","Suresh C","Meena L","Arun J","Pooja T","Vijay K","Shalini G",
    "Naveen R","Divya H","Manoj S","Rekha P","Kartik A","Bhavana M"];
  const months = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"];
  const statuses = ["paid","paid","paid","partial","pending","paid","paid","paid","partial","pending"];
  const flats = [];
  months.forEach(m => {
    for (let i = 1; i <= 20; i++) {
      const owner = i <= 18 ? owners[i-1] : null;
      const due   = 2500;
      const s     = owner ? statuses[i % statuses.length] : "vacant";
      const paid  = s === "paid" ? due : s === "partial" ? Math.floor(due * (0.3 + Math.random()*0.5)) : 0;
      flats.push({ flatId: `A${String(i).padStart(2,"0")}`, owner: owner||"", month: m,
        due, paid, resType: i % 5 === 0 ? "tenant" : "owner" });
    }
  });

  const expCats = ["Maintenance","Electricity","Water","Security","Cleaning","Lift","Gardening","Internet","Parking"];
  const expenses = [];
  let id = 1;
  months.forEach(m => {
    const n = 3 + Math.floor(Math.random()*4);
    for (let k = 0; k < n; k++) {
      const cat = expCats[Math.floor(Math.random()*expCats.length)];
      expenses.push({ id: String(id++), month: m, cat,
        amt: (1 + Math.floor(Math.random()*9)) * 500 });
    }
  });
  return { flats, expenses };
}

const SEED = makeData();
const inr = v => "₹" + (v||0).toLocaleString("en-IN");

function st(f) {
  if (!(f.owner||"").trim()) return "vacant";
  if ((f.paid||0) >= (f.due||0)) return "paid";
  if ((f.paid||0) > 0) return "partial";
  return "pending";
}

// ── Donut Pie ─────────────────────────────────────────────────────
function DonutPie({ segments, size = 180 }) {
  const canvasRef = useRef(null);
  const [tip, setTip] = useState(null);
  const segsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const cx = size/2, cy = size/2, r = size/2 - 10;
    ctx.clearRect(0, 0, size, size);

    const total = segments.reduce((s,sg)=>s+sg.value,0);
    if (!total) {
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      segsRef.current = [];
      return;
    }

    let angle = -Math.PI/2;
    const drawn = [];
    segments.forEach(sg => {
      const slice = (sg.value/total)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,angle,angle+slice);
      ctx.closePath();
      ctx.fillStyle = sg.color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      drawn.push({ ...sg, startAngle:angle, endAngle:angle+slice, cx,cy,r,total });
      angle += slice;
    });
    segsRef.current = drawn;

    // donut hole
    ctx.beginPath();
    ctx.arc(cx,cy,r*0.44,0,Math.PI*2);
    ctx.fillStyle = "#F7F9FF";
    ctx.fill();

    // center text
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.round(size*0.09)}px 'Plus Jakarta Sans',sans-serif`;
    ctx.fillStyle = "#1E1B4B";
    ctx.fillText(segments[0]?.centerLabel || total, cx, cy+4);
    ctx.font = `${Math.round(size*0.055)}px 'Plus Jakarta Sans',sans-serif`;
    ctx.fillStyle = "#A5A8D0";
    ctx.fillText("total", cx, cy+16);
  }, [segments, size]);

  const onMouseMove = useCallback((ev) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cr = canvas.getBoundingClientRect();
    const mx = (ev.clientX - cr.left) * (size / cr.width);
    const my = (ev.clientY - cr.top)  * (size / cr.height);
    const drawn = segsRef.current;
    const cx = size/2, cy = size/2, r = size/2 - 10;
    const dx = mx-cx, dy = my-cy, dist = Math.sqrt(dx*dx+dy*dy);
    if (dist < r*0.44 || dist > r) { setTip(null); return; }
    let a = Math.atan2(dy,dx);
    if (a < -Math.PI/2) a += Math.PI*2;
    const total = drawn[0]?.total || 1;
    const hit = drawn.find(sg => {
      let s = sg.startAngle, e = sg.endAngle;
      if (s < -Math.PI/2) { s += Math.PI*2; e += Math.PI*2; }
      return a >= s && a < e;
    });
    if (hit) {
      const pct = Math.round(hit.value/total*100);
      setTip({ text: `${hit.label}: ${hit.displayValue||hit.value} (${pct}%)`, x: ev.clientX, y: ev.clientY });
    } else setTip(null);
  }, [size]);

  return (
    <div style={{ position:"relative", display:"inline-block", width:"100%", maxWidth:size }}>
      <canvas ref={canvasRef} style={{ display:"block", width:"100%", cursor:"crosshair" }}
        onMouseMove={onMouseMove} onMouseLeave={()=>setTip(null)} />
      {tip && (
        <div style={{ position:"fixed", left:tip.x+12, top:tip.y-28, zIndex:9999,
          background:"rgba(15,15,35,0.88)", color:"#fff", fontSize:11, fontWeight:700,
          padding:"5px 10px", borderRadius:8, pointerEvents:"none", whiteSpace:"nowrap",
          boxShadow:"0 2px 12px rgba(0,0,0,0.3)" }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────
function Legend({ segments, total }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:12 }}>
      {segments.map(sg => {
        const pct = total ? Math.round((sg.count !== undefined ? sg.count : sg.value) / total * 100) : 0;
        return (
          <div key={sg.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
              <span style={{ width:9, height:9, borderRadius:"50%", background:sg.color, flexShrink:0, display:"inline-block" }} />
              <span style={{ fontSize:11, fontWeight:600, color:"#1E1B4B", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sg.label}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:800, color:"#1E1B4B" }}>{sg.count !== undefined ? sg.count : sg.value}</span>
              <span style={{ fontSize:10, color:"#A5A8D0" }}>{pct}%</span>
              {sg.amt !== undefined && <span style={{ fontSize:10, fontWeight:700, color:C.indigo }}>{inr(sg.amt)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function GatebookAnalytics() {
  const { flats, expenses } = SEED;

  // Gather all months
  const allMonths = [...new Set([
    ...flats.map(f=>f.month),
    ...expenses.map(e=>e.month)
  ])].sort().reverse();

  const allYears = [...new Set(allMonths.map(m=>m.slice(0,4)))].sort().reverse();

  const [filterType, setFilterType] = useState("month");
  const [selMonth, setSelMonth]     = useState(allMonths[0]);
  const [selYear,  setSelYear]      = useState(allYears[0]);
  const [statusFilter, setStatusFilter] = useState("all");

  const matchM = useCallback(m =>
    filterType === "month" ? m === selMonth : (m||"").startsWith(selYear),
    [filterType, selMonth, selYear]);

  // ── Derived payment data ───────────────────────────────────────
  const all     = flats.filter(f => matchM(f.month));
  const paid    = all.filter(f => st(f)==="paid");
  const partial = all.filter(f => st(f)==="partial");
  const pending = all.filter(f => st(f)==="pending");
  const vacant  = all.filter(f => st(f)==="vacant");

  const paySegs = [
    { label:"Paid",    value:paid.length,    color:C.green,  amt:paid.reduce((s,f)=>s+(f.paid||0),0),    displayValue:paid.length+" flats",    count:paid.length    },
    { label:"Partial", value:partial.length, color:C.amber,  amt:partial.reduce((s,f)=>s+(f.paid||0),0), displayValue:partial.length+" flats",  count:partial.length },
    { label:"Pending", value:pending.length, color:C.red,    amt:0,                                       displayValue:pending.length+" flats",  count:pending.length },
    { label:"Vacant",  value:vacant.length,  color:C.gray,   amt:0,                                       displayValue:vacant.length+" flats",   count:vacant.length  },
  ].filter(s=>s.value>0);

  // ── Derived expense data ───────────────────────────────────────
  const filteredExp = expenses.filter(e => matchM(e.month));
  const catMap = new Map();
  filteredExp.forEach(e => {
    const c = e.cat||"Other";
    catMap.set(c, (catMap.get(c)||0)+(e.amt||0));
  });
  const expTotal = filteredExp.reduce((s,e)=>s+(e.amt||0),0);
  const expSegs = [...catMap.entries()]
    .sort((a,b)=>b[1]-a[1])
    .map(([cat,amt],i)=>({
      label:cat, value:amt, color:EXP_PALETTE[i%EXP_PALETTE.length],
      amt, displayValue:inr(amt), centerLabel:inr(expTotal), count:amt,
    }));

  // ── Payment table rows ─────────────────────────────────────────
  let tableRows = all.filter(f => statusFilter === "all" || st(f) === statusFilter)
    .sort((a,b) => (a.flatId||"").localeCompare(b.flatId||""));

  const totalCollected   = all.reduce((s,f)=>s+(f.paid||0),0);
  const totalDue         = all.reduce((s,f)=>s+(f.due||0),0);
  const totalOutstanding = Math.max(0, totalDue - totalCollected);

  const labelText = filterType === "month"
    ? new Date(selMonth+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"})
    : selYear;

  const badgeStyle = (s) => {
    const map = { paid:C.green, partial:C.amber, pending:C.red, vacant:"#9ca3af" };
    const c = map[s] || "#9ca3af";
    return { fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99,
      background:c+"1a", color:c, border:`1px solid ${c}40` };
  };
  const badgeLabel = { paid:"Paid", partial:"Partial", pending:"Pending", vacant:"Vacant" };

  // ── Styles ─────────────────────────────────────────────────────
  const card = {
    background:"#F7F9FF", border:"1.5px solid rgba(99,102,241,0.12)",
    borderRadius:14, padding:14, position:"relative",
  };
  const ctrl = {
    height:32, padding:"0 10px", background:"#fff",
    border:"1.5px solid rgba(99,102,241,0.18)", color:"#1E1B4B",
    fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600,
    borderRadius:10, outline:"none", cursor:"pointer",
  };
  const sfBtn = (active) => ({
    fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:99,
    border:`1.5px solid ${active ? C.indigo : "rgba(99,102,241,0.18)"}`,
    background: active ? C.indigo : "#fff",
    color: active ? "#fff" : "#6366A8",
    cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif",
  });

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", background:"#F0F4FF",
      minHeight:"100vh", padding:"16px", color:"#1E1B4B" }}>

      {/* Google font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── Header + Filters ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:10, marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:34, height:34, borderRadius:10,
            background:"linear-gradient(135deg,#6366F1,#8B5CF6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, color:"#fff", boxShadow:"0 4px 12px rgba(99,102,241,0.30)" }}>
            📊
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, lineHeight:1 }}>Analytics</div>
            <div style={{ fontSize:11, color:"#A5A8D0", marginTop:2 }}>Showing: {labelText}</div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <select style={ctrl} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="month">By Month</option>
            <option value="year">By Year</option>
          </select>
          {filterType === "month" ? (
            <select style={{...ctrl, minWidth:130}} value={selMonth} onChange={e=>setSelMonth(e.target.value)}>
              {allMonths.map(m=>(
                <option key={m} value={m}>
                  {new Date(m+"-01").toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
                </option>
              ))}
            </select>
          ) : (
            <select style={ctrl} value={selYear} onChange={e=>setSelYear(e.target.value)}>
              {allYears.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Two-column: table (left) + pies (right) ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, alignItems:"start" }}>

        {/* LEFT — Payment Records Table */}
        <div style={{ background:"#fff", border:"1.5px solid rgba(99,102,241,0.12)",
          borderRadius:14, overflow:"hidden", boxShadow:"0 4px 16px rgba(99,102,241,0.08)" }}>
          {/* Table header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"11px 14px", borderBottom:"1.5px solid rgba(99,102,241,0.10)",
            flexWrap:"wrap", gap:8, background:"#F7F9FF" }}>
            <div style={{ fontSize:12, fontWeight:800, color:"#1E1B4B" }}>
              💳 Payment Records&nbsp;
              <span style={{ fontSize:10, color:"#A5A8D0", fontWeight:600 }}>({tableRows.length} flats)</span>
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {["all","paid","partial","pending"].map(s => (
                <button key={s} style={sfBtn(statusFilter===s)}
                  onClick={()=>setStatusFilter(s)}>
                  {s==="all"?"All":s==="paid"?"✅ Paid":s==="partial"?"⚠️ Partial":"❌ Pending"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX:"auto", maxHeight:480, overflowY:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead style={{ position:"sticky", top:0, zIndex:2 }}>
                <tr style={{ background:"#F0F4FF" }}>
                  {["Flat","Owner","Status","Paid","Due","Balance"].map((h,i) => (
                    <th key={h} style={{ padding:"7px 12px", textAlign: i>=3?"right":"left",
                      fontSize:9, fontWeight:800, color:"#A5A8D0", textTransform:"uppercase",
                      letterSpacing:.6, borderBottom:"1.5px solid rgba(99,102,241,0.12)",
                      whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:"28px", textAlign:"center", color:"#A5A8D0", fontSize:12 }}>
                    No records found
                  </td></tr>
                ) : tableRows.map((f,i) => {
                  const s = st(f);
                  const bal = (f.due||0) - (f.paid||0);
                  return (
                    <tr key={f.flatId+f.month} style={{
                      background: i%2===0?"#fff":"#F7F9FF",
                      borderBottom:"1px solid rgba(99,102,241,0.07)",
                      transition:"background .12s" }}>
                      <td style={{ padding:"8px 12px", fontWeight:800, color:C.indigo, fontSize:12 }}>{f.flatId}</td>
                      <td style={{ padding:"8px 12px", color:"#1E1B4B", fontSize:11, fontWeight:600,
                        maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {f.owner || <em style={{ color:"#A5A8D0", fontWeight:400 }}>Vacant</em>}
                      </td>
                      <td style={{ padding:"8px 12px", textAlign:"center" }}>
                        <span style={badgeStyle(s)}>{badgeLabel[s]||s}</span>
                      </td>
                      <td style={{ padding:"8px 12px", textAlign:"right", fontWeight:700, color:C.green, fontSize:11 }}>{inr(f.paid||0)}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", fontWeight:700, color:"#6366A8", fontSize:11 }}>{inr(f.due||0)}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", fontWeight:800,
                        color: bal>0 ? C.red : C.green, fontSize:11 }}>{inr(Math.abs(bal))}</td>
                    </tr>
                  );
                })}
              </tbody>
              {tableRows.length > 0 && (() => {
                const tp = tableRows.reduce((s,f)=>s+(f.paid||0),0);
                const td = tableRows.reduce((s,f)=>s+(f.due||0),0);
                const tb = td - tp;
                return (
                  <tfoot>
                    <tr style={{ background:"#EDF0FB", borderTop:"2px solid rgba(99,102,241,0.18)" }}>
                      <td colSpan={2} style={{ padding:"8px 12px", fontSize:10, fontWeight:800, color:"#6366A8" }}>
                        Total ({tableRows.length} flats)
                      </td>
                      <td />
                      <td style={{ padding:"8px 12px", textAlign:"right", fontWeight:800, color:C.green, fontSize:12 }}>{inr(tp)}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", fontWeight:800, color:"#6366A8", fontSize:12 }}>{inr(td)}</td>
                      <td style={{ padding:"8px 12px", textAlign:"right", fontWeight:800, color: tb>0?C.red:C.green, fontSize:12 }}>{inr(Math.abs(tb))}</td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>

        {/* RIGHT — Pies stacked */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Payment Status Pie */}
          <div style={card}>
            <div style={{ fontSize:10, fontWeight:800, color:"#1E1B4B", textTransform:"uppercase",
              letterSpacing:.6, marginBottom:12, display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ color:C.indigo }}>💳</span> Payment Status
            </div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
              <div style={{ flex:"0 0 auto", width:"45%" }}>
                <DonutPie segments={paySegs} size={160} />
              </div>
              <div style={{ flex:1 }}>
                <Legend segments={paySegs.map(s=>({...s,count:s.value}))} total={all.length} />
              </div>
            </div>
          </div>

          {/* Expenses by Category Pie */}
          <div style={card}>
            <div style={{ fontSize:10, fontWeight:800, color:"#1E1B4B", textTransform:"uppercase",
              letterSpacing:.6, marginBottom:12, display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ color:C.indigo }}>🧾</span> Expenses by Category
            </div>
            {expSegs.length === 0 ? (
              <div style={{ textAlign:"center", padding:"24px 0", color:"#A5A8D0", fontSize:12 }}>
                No expenses for this period
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                <div style={{ flex:"0 0 auto", width:"45%" }}>
                  <DonutPie segments={expSegs} size={160} />
                </div>
                <div style={{ flex:1 }}>
                  <Legend segments={expSegs.map(s=>({...s,count:s.amt}))} total={expTotal} />
                </div>
              </div>
            )}
          </div>

          {/* Summary Totals */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[
              { label:"Collected", value:inr(totalCollected), sub:`${paid.length+partial.length} flats paid`, color:C.green },
              { label:"Outstanding", value:inr(totalOutstanding), sub:`${pending.length} flats pending`, color:C.red },
              { label:"Expenses", value:inr(expTotal), sub:`${filteredExp.length} records`, color:C.indigo },
            ].map(c => (
              <div key={c.label} style={{ background:"#fff", border:"1.5px solid rgba(99,102,241,0.10)",
                borderRadius:12, padding:"10px 10px", textAlign:"center",
                boxShadow:"0 2px 8px rgba(99,102,241,0.06)" }}>
                <div style={{ fontSize:9, fontWeight:700, color:"#A5A8D0", textTransform:"uppercase",
                  letterSpacing:.5, marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:c.color, letterSpacing:"-.5px" }}>{c.value}</div>
                <div style={{ fontSize:9, color:"#A5A8D0", marginTop:2 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
