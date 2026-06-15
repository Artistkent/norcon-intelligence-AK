import { useState, useRef } from "react";

const C = {
  surface:"#122E1E", surface2:"#183D28", border:"#1F4D34",
  accent:"#2E7D52", accentL:"#3a9962",
  sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66",
  risk:"#e05c5c", milestone:"#e0a23a", activity:"#3ae0a2",
};

const PHASE_ORDER  = ["Initiation","Planning","Execution","Monitoring & Control","Closure"];
const PHASE_COLORS = {
  Initiation:"#5d8aff", Planning:"#3ae0a2", Execution:"#2E7D52",
  "Monitoring & Control":"#e0a23a", Closure:"#8aac96",
};

const ROW_H  = 36;
const DAY_W  = 18;
const LEFT_W = 340; // frozen columns total px

function dBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function fmt(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
}

function autoDate(items) {
  const sorted = [...items].sort((a, b) => {
    const oi = PHASE_ORDER.indexOf(a.phase), oj = PHASE_ORDER.indexOf(b.phase);
    return oi !== oj ? oi - oj : 0;
  });
  let cur = addDays(new Date(), 1);
  return sorted.map(item => {
    if (item._autoDate === false && item.startDate) return item;
    const s = new Date(cur), e = addDays(s, item.itemType === "milestone" ? 0 : 13);
    cur = addDays(e, 2);
    return { ...item, startDate: s.toISOString().slice(0,10), targetDate: e.toISOString().slice(0,10), _autoDate: true };
  });
}

export default function L3IntegratedBaseline({ state, activities, milestones, member, onStateChange, onBaselineBlur }) {
  const canEdit = member?.isPM;
  const sheets  = state?.l2?.sheets || {};

  /* ── Cost data ── */
  const saved = sheets["03"]?.data?.costData || {};
  const [costData, setCostData] = useState(() => {
    const init = {};
    [...activities, ...milestones].forEach(a => {
      init[a._id] = saved[a._id] || { plannedAmount:"", actualAmount:"" };
    });
    return init;
  });

  /* ── Expenditure log ── */
  const [expLog, setExpLog]   = useState(sheets["03"]?.data?.expenditureLog || []);
  const [newExp, setNewExp]   = useState({ activityId:"", date:"", amount:"", description:"", invoiceRef:"" });

  /* ── Date editing ── */
  const [editing,    setEditing]    = useState(null);
  const [editStart,  setEditStart]  = useState("");
  const [editEnd,    setEditEnd]    = useState("");

  const ganttRef = useRef(null);

  /* ── Derived items ── */
  const raw = [
    ...activities.map(a => ({ ...a, itemType:"activity",  color: PHASE_COLORS[a.phase] || C.accentL })),
    ...milestones.map(m => ({ ...m, itemType:"milestone", color: C.milestone })),
  ].filter(i => i.name || i.description);

  const items = autoDate(raw);

  /* ── Gantt range ── */
  const dates = items.flatMap(i => [i.startDate, i.targetDate].filter(Boolean)).map(d => new Date(d));
  const gStart = dates.length ? addDays(new Date(Math.min(...dates)), -7) : addDays(new Date(), -7);
  const gEnd   = dates.length ? addDays(new Date(Math.max(...dates)), 21) : addDays(new Date(), 90);
  const nDays  = Math.max(dBetween(gStart, gEnd), 60);
  const gW     = nDays * DAY_W;
  const todayX = Math.max(0, dBetween(gStart, new Date())) * DAY_W;

  /* ── Week ticks ── */
  const weeks = [];
  let wc = new Date(gStart);
  while (wc < gEnd) { weeks.push(new Date(wc)); wc = addDays(wc, 7); }

  /* ── Month ticks ── */
  const months = [];
  let mc = new Date(gStart.getFullYear(), gStart.getMonth(), 1);
  while (mc < gEnd) {
    months.push(new Date(mc));
    mc = new Date(mc.getFullYear(), mc.getMonth() + 1, 1);
  }

  /* ── Phase groups ── */
  const phases = [...new Set(items.map(i => i.phase || "Unassigned"))];
  phases.sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b));

  /* ── Persist helpers ── */
  const saveState03 = patch => {
    onStateChange(prev => ({
      ...prev, l2: { ...prev.l2, sheets: { ...prev.l2.sheets,
        "03": { ...prev.l2.sheets["03"], data: { ...prev.l2.sheets["03"]?.data, ...patch } }
      }},
    }));
  };

  const updateCost = (id, field, val) => {
    const next = { ...costData, [id]: { ...(costData[id]||{}), [field]: val } };
    setCostData(next);
    saveState03({ costData: next });
  };

  const saveEdit = (taskId, itemType) => {
    if (!editStart) return;
    const key = itemType === "milestone" ? "milestones" : "activities";
    const old = (itemType === "milestone" ? milestones : activities).find(i => i._id === taskId);
    onBaselineBlur && onBaselineBlur(itemType, taskId, "startDate", old?.startDate||"", editStart, old?.name||taskId);
    onStateChange(prev => {
      const prev03 = prev.l2.sheets["03"]?.data || {};
      return { ...prev, l2: { ...prev.l2, sheets: { ...prev.l2.sheets, "03": {
        ...prev.l2.sheets["03"],
        data: { ...prev03, [key]: (prev03[key]||[]).map(i =>
          i._id === taskId ? { ...i, startDate: editStart, targetDate: editEnd||editStart, _autoDate: false } : i
        )},
      }}}};
    });
    setEditing(null);
  };

  const addExp = () => {
    if (!newExp.activityId || !newExp.amount) return;
    const entry = { ...newExp, id:`EXP-${String(expLog.length+1).padStart(3,"0")}`, date: newExp.date || new Date().toISOString().slice(0,10) };
    const next  = [...expLog, entry];
    setExpLog(next); saveState03({ expenditureLog: next });
    setNewExp({ activityId:"", date:"", amount:"", description:"", invoiceRef:"" });
  };
  const delExp = i => {
    const next = expLog.filter((_,j) => j !== i);
    setExpLog(next); saveState03({ expenditureLog: next });
  };

  /* ── Cost chart data ── */
  const phaseSpend = phases.map(ph => {
    const its = items.filter(i => (i.phase||"Unassigned") === ph);
    return {
      phase: ph,
      planned: its.reduce((s,i) => s + (parseFloat(costData[i._id]?.plannedAmount)||0), 0),
      actual:  its.reduce((s,i) => s + (parseFloat(costData[i._id]?.actualAmount )||0), 0),
    };
  }).filter(d => d.planned > 0 || d.actual > 0);
  const maxBar = Math.max(...phaseSpend.map(d => Math.max(d.planned, d.actual)), 1);

  const inp = { background:C.surface2, border:`1px solid ${C.border}`, borderRadius:4, color:C.sage, fontSize:11, padding:"3px 6px", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
  const TH  = { padding:"0 8px", fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".4px", background:C.surface2, whiteSpace:"nowrap", height:44, verticalAlign:"middle" };

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0, overflow:"hidden" }}>

      {/* ══════════ GANTT TABLE — single scroll container ══════════ */}
      <div ref={ganttRef} style={{ flex:"1 1 0", minHeight:0, overflowX:"auto", overflowY:"auto" }}>
        <table style={{ borderCollapse:"collapse", tableLayout:"fixed", minWidth: LEFT_W + gW }}>

          {/* Col widths */}
          <colgroup>
            <col style={{ width:180 }}/>   {/* Name */}
            <col style={{ width:80 }}/>    {/* Dates */}
            <col style={{ width:40 }}/>    {/* Plan £ */}
            <col style={{ width:40 }}/>    {/* Act £ */}
            <col style={{ width: gW }}/>   {/* Gantt */}
          </colgroup>

          <thead>
            {/* Row 1: frozen labels + month bar */}
            <tr style={{ height:22 }}>
              <th style={{ ...TH, position:"sticky", left:0, top:0, zIndex:5, textAlign:"left", borderBottom:"none", height:22 }}>Activity</th>
              <th style={{ ...TH, position:"sticky", left:180, top:0, zIndex:5, textAlign:"center", borderBottom:"none", height:22 }}>Dates</th>
              <th style={{ ...TH, position:"sticky", left:260, top:0, zIndex:5, textAlign:"right", borderBottom:"none", height:22 }}>Plan £</th>
              <th style={{ ...TH, position:"sticky", left:300, top:0, zIndex:5, textAlign:"right", borderBottom:"none", height:22, paddingRight:8 }}>Act £</th>
              {/* Month labels */}
              <th style={{ ...TH, position:"sticky", top:0, zIndex:4, padding:0, height:22, verticalAlign:"bottom" }}>
                <div style={{ position:"relative", height:22, width:gW }}>
                  {months.map((m, i) => {
                    const x = Math.max(0, dBetween(gStart, m)) * DAY_W;
                    const label = m.toLocaleDateString("en-GB", { month:"short", year:"2-digit" });
                    return (
                      <div key={i} style={{ position:"absolute", left:x, top:0, height:"100%", borderLeft:`1px solid ${C.border}`, paddingLeft:3, fontSize:9, color:C.muted, display:"flex", alignItems:"center", whiteSpace:"nowrap" }}>
                        {label}
                      </div>
                    );
                  })}
                </div>
              </th>
            </tr>
            {/* Row 2: week ticks */}
            <tr style={{ height:22 }}>
              <th colSpan={4} style={{ ...TH, position:"sticky", left:0, top:22, zIndex:5, height:22, borderBottom:`2px solid ${C.border}` }}/>
              <th style={{ ...TH, position:"sticky", top:22, zIndex:4, padding:0, height:22, borderBottom:`2px solid ${C.border}` }}>
                <div style={{ position:"relative", height:22, width:gW }}>
                  {weeks.map((w, i) => {
                    const x = Math.max(0, dBetween(gStart, w)) * DAY_W;
                    return (
                      <div key={i} style={{ position:"absolute", left:x, top:0, height:"100%", borderLeft:`1px solid ${C.border}44`, paddingLeft:2, fontSize:8, color:C.muted+"99", display:"flex", alignItems:"center", whiteSpace:"nowrap" }}>
                        {w.toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}
                      </div>
                    );
                  })}
                  {/* Today marker */}
                  <div style={{ position:"absolute", left:todayX, top:0, bottom:0, width:2, background:C.accentL, borderRadius:1 }}/>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {phases.map(phase => {
              const phItems = items.filter(i => (i.phase||"Unassigned") === phase);
              if (!phItems.length) return null;

              return [
                /* Phase header row */
                <tr key={`ph-${phase}`} style={{ height:26 }}>
                  <td colSpan={4} style={{ padding:"0 8px", fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".5px", background:C.surface, position:"sticky", left:0, zIndex:3, borderBottom:`1px solid ${C.border}` }}>
                    {phase}
                  </td>
                  <td style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:0 }}>
                    <div style={{ position:"relative", height:26, width:gW }}>
                      <div style={{ position:"absolute", left:todayX, top:0, bottom:0, width:1, background:C.accentL, opacity:.2 }}/>
                    </div>
                  </td>
                </tr>,

                /* Item rows */
                ...phItems.map((item, idx) => {
                  const isMile  = item.itemType === "milestone";
                  const cd      = costData[item._id] || {};
                  const rowBg   = idx % 2 === 0 ? C.surface : C.surface2;
                  const isEdit  = editing === item._id;

                  /* Bar geometry */
                  const barLeft  = Math.max(0, dBetween(gStart, item.startDate)) * DAY_W;
                  const barRight = Math.max(0, dBetween(gStart, item.targetDate || item.startDate)) * DAY_W + DAY_W;
                  const barW     = Math.max(isMile ? 10 : DAY_W, barRight - barLeft);

                  return (
                    <tr key={item._id} style={{ height:ROW_H, background:rowBg }}>

                      {/* ── Name (frozen) ── */}
                      <td style={{ padding:"0 8px", position:"sticky", left:0, zIndex:2, background:rowBg, borderBottom:`1px solid ${C.border}22`, maxWidth:180, overflow:"hidden" }}>
                        <div style={{ fontSize:11, color: isMile ? C.milestone : C.sage, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {isMile ? "◆ " : ""}{item.name || item.description || "—"}
                        </div>
                      </td>

                      {/* ── Dates (frozen, always visible) ── */}
                      <td style={{ padding:"0 6px", position:"sticky", left:180, zIndex:2, background:rowBg, borderBottom:`1px solid ${C.border}22`, whiteSpace:"nowrap" }}>
                        <div style={{ fontSize:9, color:C.muted, lineHeight:1.4 }}>
                          <div>{fmt(item.startDate)}</div>
                          {!isMile && item.targetDate !== item.startDate && <div>{fmt(item.targetDate)}</div>}
                        </div>
                      </td>

                      {/* ── Planned £ (frozen) ── */}
                      <td style={{ padding:"0 4px", position:"sticky", left:260, zIndex:2, background:rowBg, borderBottom:`1px solid ${C.border}22`, width:40 }}>
                        {canEdit
                          ? <input style={{ ...inp, width:36, textAlign:"right" }} value={cd.plannedAmount||""} onChange={e=>updateCost(item._id,"plannedAmount",e.target.value)} placeholder="0"/>
                          : <span style={{ fontSize:10, color:C.dim, display:"block", textAlign:"right" }}>{cd.plannedAmount?`£${cd.plannedAmount}`:"—"}</span>}
                      </td>

                      {/* ── Actual £ (frozen) ── */}
                      <td style={{ padding:"0 4px", position:"sticky", left:300, zIndex:2, background:rowBg, borderBottom:`1px solid ${C.border}22`, width:40, borderRight:`2px solid ${C.border}` }}>
                        {canEdit
                          ? <input style={{ ...inp, width:36, textAlign:"right" }} value={cd.actualAmount||""} onChange={e=>updateCost(item._id,"actualAmount",e.target.value)} placeholder="0"/>
                          : <span style={{ fontSize:10, color:C.dim, display:"block", textAlign:"right" }}>{cd.actualAmount?`£${cd.actualAmount}`:"—"}</span>}
                      </td>

                      {/* ── Gantt bar (scrolling) ── */}
                      <td style={{ padding:0, position:"relative", borderBottom:`1px solid ${C.border}22` }}
                          onClick={() => canEdit && (setEditing(item._id), setEditStart(item.startDate||""), setEditEnd(item.targetDate||""))}>
                        <div style={{ position:"relative", height:ROW_H, width:gW }}>
                          {/* Grid lines */}
                          {weeks.map((_, wi) => (
                            <div key={wi} style={{ position:"absolute", left: wi*7*DAY_W, top:0, bottom:0, width:1, background:C.border, opacity:.2 }}/>
                          ))}
                          {/* Today line */}
                          <div style={{ position:"absolute", left:todayX, top:0, bottom:0, width:1, background:C.accentL, opacity:.5 }}/>

                          {/* Bar */}
                          {isMile ? (
                            <div style={{ position:"absolute", left:barLeft+barW/2-6, top:"50%", transform:"translateY(-50%) rotate(45deg)", width:11, height:11, background:item.color, zIndex:1, cursor:canEdit?"pointer":"default" }}/>
                          ) : (
                            <div style={{ position:"absolute", left:barLeft, top:"50%", transform:"translateY(-50%)", height:18, width:barW, background:item.color+"dd", borderRadius:3, zIndex:1, cursor:canEdit?"pointer":"default", display:"flex", alignItems:"center", overflow:"hidden" }}>
                              <span style={{ fontSize:8, color:"#fff", paddingLeft:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</span>
                            </div>
                          )}

                          {/* Progress bar (if _complete) */}
                          {item._complete && !isMile && (
                            <div style={{ position:"absolute", left:barLeft, top:"50%", transform:"translateY(-50%)", height:18, width:barW, background:"transparent", border:`2px solid ${C.activity}`, borderRadius:3, zIndex:2, pointerEvents:"none" }}/>
                          )}
                        </div>

                        {/* Date edit popover */}
                        {isEdit && (
                          <div style={{ position:"absolute", top:ROW_H+2, left:Math.min(barLeft, gW-360), zIndex:40, background:C.surface, border:`1px solid ${C.accentL}`, borderRadius:8, padding:"10px 12px", display:"flex", gap:8, alignItems:"center", whiteSpace:"nowrap", boxShadow:"0 8px 24px #0008" }}
                            onClick={e=>e.stopPropagation()}>
                            <span style={{fontSize:10,color:C.muted}}>Start</span>
                            <input type="date" value={editStart} onChange={e=>setEditStart(e.target.value)} style={{...inp,width:130}}/>
                            <span style={{fontSize:10,color:C.muted}}>End</span>
                            <input type="date" value={editEnd} onChange={e=>setEditEnd(e.target.value)} style={{...inp,width:130}}/>
                            <button onClick={()=>saveEdit(item._id,item.itemType)} style={{padding:"4px 10px",background:C.accent,border:"none",borderRadius:4,color:"#fff",fontSize:11,cursor:"pointer",fontWeight:700}}>Save</button>
                            <button onClick={()=>setEditing(null)} style={{padding:"4px 8px",background:"none",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,fontSize:11,cursor:"pointer"}}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* ══════════ COST OVERVIEW ══════════ */}
      <div style={{ flexShrink:0, borderTop:`2px solid ${C.border}`, background:C.surface, overflowY:"auto", maxHeight:"45%" }}>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".5px", marginBottom:12 }}>Cost Overview</div>

          {(phaseSpend.length > 0) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              {/* Phase bar chart */}
              <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:".4px" }}>Spend by Phase</div>
                {phaseSpend.map(({ phase, planned, actual }, i) => (
                  <div key={i} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, color:C.dim, marginBottom:3 }}>{phase}</div>
                    <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:2 }}>
                      <div style={{ width:60, fontSize:9, color:C.muted, textAlign:"right" }}>Planned</div>
                      <div style={{ flex:1, height:8, background:C.border, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ width:`${(planned/maxBar)*100}%`, height:"100%", background:C.accentL }}/>
                      </div>
                      <span style={{ fontSize:9, color:C.accentL, minWidth:52, textAlign:"right" }}>£{planned.toLocaleString()}</span>
                    </div>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <div style={{ width:60, fontSize:9, color:C.muted, textAlign:"right" }}>Actual</div>
                      <div style={{ flex:1, height:8, background:C.border, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ width:`${(actual/maxBar)*100}%`, height:"100%", background:C.milestone }}/>
                      </div>
                      <span style={{ fontSize:9, color:C.milestone, minWidth:52, textAlign:"right" }}>£{actual.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals summary */}
              <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.muted, marginBottom:10, textTransform:"uppercase", letterSpacing:".4px" }}>Cost Summary</div>
                {[
                  ["Total Planned", Object.values(costData).reduce((s,c)=>s+(parseFloat(c.plannedAmount)||0),0), C.accentL],
                  ["Total Actual (logged)", expLog.reduce((s,e)=>s+(parseFloat(e.amount)||0),0), C.milestone],
                ].map(([label, val, col]) => (
                  <div key={label} style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>{label}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:col }}>£{val.toLocaleString()}</div>
                  </div>
                ))}
                {(() => {
                  const plan = Object.values(costData).reduce((s,c)=>s+(parseFloat(c.plannedAmount)||0),0);
                  const act  = expLog.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
                  const var_ = plan - act;
                  return (
                    <div style={{ paddingTop:8, borderTop:`1px solid ${C.border}` }}>
                      <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>Variance</div>
                      <div style={{ fontSize:16, fontWeight:700, color: var_>=0?C.activity:C.risk }}>
                        {var_>=0?"":"-"}£{Math.abs(var_).toLocaleString()}
                        <span style={{ fontSize:10, fontWeight:400, color:C.muted, marginLeft:6 }}>{var_>=0?"under budget":"over budget"}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Expenditure Log ── */}
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".5px", marginBottom:10 }}>Expenditure Log</div>

            {canEdit && (
              <div style={{ display:"grid", gridTemplateColumns:"1.2fr 100px 90px 1.5fr 90px auto", gap:6, marginBottom:10, alignItems:"end" }}>
                {[
                  ["ACTIVITY", <select style={{...inp,width:"100%"}} value={newExp.activityId} onChange={e=>setNewExp(p=>({...p,activityId:e.target.value}))}>
                    <option value="">Select…</option>{items.map(i=><option key={i._id} value={i._id}>{i.name||i.description}</option>)}</select>],
                  ["DATE", <input type="date" style={{...inp,width:"100%"}} value={newExp.date} onChange={e=>setNewExp(p=>({...p,date:e.target.value}))}/>],
                  ["AMOUNT £", <input style={{...inp,width:"100%"}} value={newExp.amount} onChange={e=>setNewExp(p=>({...p,amount:e.target.value}))} placeholder="0.00"/>],
                  ["DESCRIPTION", <input style={{...inp,width:"100%"}} value={newExp.description} onChange={e=>setNewExp(p=>({...p,description:e.target.value}))} placeholder="e.g. Invoice"/>],
                  ["REF", <input style={{...inp,width:"100%"}} value={newExp.invoiceRef} onChange={e=>setNewExp(p=>({...p,invoiceRef:e.target.value}))} placeholder="INV-001"/>],
                ].map(([lbl, el]) => (
                  <div key={lbl}>
                    <div style={{fontSize:8,color:C.muted,marginBottom:2,textTransform:"uppercase",letterSpacing:".4px"}}>{lbl}</div>
                    {el}
                  </div>
                ))}
                <button onClick={addExp} style={{padding:"5px 12px",background:C.accent,border:"none",borderRadius:5,color:"#fff",fontSize:11,cursor:"pointer",alignSelf:"end"}}>+ Log</button>
              </div>
            )}

            {expLog.length === 0
              ? <div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>No expenditure logged yet.</div>
              : (
                <div style={{overflowX:"auto"}}>
                  <table style={{borderCollapse:"collapse",width:"100%",fontSize:11}}>
                    <thead>
                      <tr>{["ID","Activity","Date","Amount £","Description","Ref",""].map(h=>(
                        <th key={h} style={{padding:"4px 8px",fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {expLog.map((e,i)=>{
                        const act=items.find(a=>a._id===e.activityId);
                        return (
                          <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                            <td style={{padding:"4px 8px",fontFamily:"monospace",fontSize:10,color:C.muted}}>{e.id}</td>
                            <td style={{padding:"4px 8px",color:C.dim}}>{act?.name||act?.description||e.activityId}</td>
                            <td style={{padding:"4px 8px",color:C.muted}}>{e.date}</td>
                            <td style={{padding:"4px 8px",color:C.accentL,fontWeight:700}}>£{parseFloat(e.amount||0).toLocaleString()}</td>
                            <td style={{padding:"4px 8px",color:C.dim}}>{e.description}</td>
                            <td style={{padding:"4px 8px",fontFamily:"monospace",fontSize:10,color:C.muted}}>{e.invoiceRef}</td>
                            <td style={{padding:"4px 8px"}}>{canEdit&&<button onClick={()=>delExp(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:11}}>✕</button>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{padding:"5px 8px",fontSize:10,fontWeight:700,color:C.muted}}>TOTAL</td>
                        <td style={{padding:"5px 8px",fontSize:12,fontWeight:700,color:C.accentL}}>£{expLog.reduce((s,e)=>s+(parseFloat(e.amount)||0),0).toLocaleString()}</td>
                        <td colSpan={3}/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
