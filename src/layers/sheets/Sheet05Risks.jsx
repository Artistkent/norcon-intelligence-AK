import React, { useState } from "react";

const C = { surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66", risk:"#e05c5c", milestone:"#e0a23a", activity:"#3ae0a2" };
const inp = { background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.sage, fontSize:12, padding:"6px 9px", outline:"none", boxSizing:"border-box", fontFamily:"inherit", width:"100%" };
const Lbl = ({c}) => <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".4px", marginBottom:3 }}>{c}</div>;

const RISK_CATEGORIES = ["Planning & Coordination","Data & Analysis","Team Dynamics","Stakeholder Management","Financial","Technical","External"];
const RESPONSES       = ["Avoid","Reduce","Transfer","Accept","Exploit","Enhance","Share"];
const LEVELS          = ["1 - Low","2 - Medium","3 - High"];
const PRIORITIES      = ["High","Medium","Low"];
const ISSUE_STATUSES  = ["Open","In Progress","Resolved","Escalated"];

function ragColor(l, i) { const s = (parseInt(l)||1)*(parseInt(i)||1); return s>=9?C.risk:s>=4?C.milestone:C.activity; }

function EditableSelect({ value, onChange, options, disabled, placeholder }) {
  const [custom, setCustom] = React.useState(false);
  const [customVal, setCustomVal] = React.useState("");
  if (custom) {
    return <input autoFocus value={customVal} onChange={e=>setCustomVal(e.target.value)}
      onBlur={()=>{ if(customVal.trim()) onChange(customVal.trim()); setCustom(false); }}
      onKeyDown={e=>{ if(e.key==="Enter"){ onChange(customVal.trim()||value); setCustom(false); } if(e.key==="Escape") setCustom(false); }}
      style={{...inp, borderColor:"#3a9962"}}/>;
  }
  return (
    <select style={inp} value={value||""} disabled={disabled}
      onChange={e=>{ if(e.target.value==="Custom..."){setCustom(true);setCustomVal("");} else onChange(e.target.value); }}>
      <option value="">{placeholder||"Select..."}</option>
      {options.map(o=><option key={o} value={o} style={{background:C.surface2}}>{o}</option>)}
      <option value="Custom...">Custom...</option>
    </select>
  );
}

export default function Sheet05Risks({ data, locked, loginCodes, onUpdate }) {
  const [activeTab, setActiveTab] = useState("risks");
  const [risks,  setRisks]  = useState(data.risks  || []);
  const [issues, setIssues] = useState(data.issues || []);

  const PM_ROLES = ["Project Manager","Project Sponsor","Project Director","Programme Manager","Portfolio Manager","Risk Manager","Change Manager","Quality Manager","Project Support","PMO Analyst"];
  const DELIVERY_ROLES = ["Lead Engineer","Site Manager","Quantity Surveyor","Design Manager","Commercial Manager","Health & Safety Manager","Environmental Manager","Procurement Manager","Logistics Coordinator","Contracts Manager"];
  const teamRoles = [...new Set([...loginCodes.map(lc=>lc.role).filter(Boolean), ...PM_ROLES, ...DELIVERY_ROLES])];

  // ── Risk helpers ──────────────────────────────────────────────────────────
  const updateRisk = (idx, field, value) => {
    const next = risks.map((r,i) => i===idx ? {...r,[field]:value} : r);
    setRisks(next); onUpdate({ risks:next, issues }, "in-progress");
  };
  const addRisk = () => {
    const next = [...risks, { _id:`R-${String(101+risks.length).padStart(3,"0")}`, name:"", category:"", cause:"", potentialImpact:"", likelihood:"1 - Low", impact:"1 - Low", mitigation:"", response:"Avoid", _suggestedOwner:"", _suggestedApprover:"Project Manager" }];
    setRisks(next); onUpdate({ risks:next, issues }, "in-progress");
  };
  const removeRisk = (idx) => {
    const next = risks.filter((_,i) => i!==idx);
    setRisks(next); onUpdate({ risks:next, issues }, "in-progress");
  };

  // ── Issue helpers ─────────────────────────────────────────────────────────
  const updateIssue = (idx, field, value) => {
    const next = issues.map((r,i) => i===idx ? {...r,[field]:value} : r);
    setIssues(next); onUpdate({ risks, issues:next }, "in-progress");
  };
  const addIssue = () => {
    const next = [...issues, { _id:`I-${String(101+issues.length).padStart(3,"0")}`, name:"", description:"", cause:"", impact:"", priority:"Medium", owner:"", raisedDate:"", targetResolutionDate:"", status:"Open", resolution:"", escalationPath:"" }];
    setIssues(next); onUpdate({ risks, issues:next }, "in-progress");
  };
  const removeIssue = (idx) => {
    const next = issues.filter((_,i) => i!==idx);
    setIssues(next); onUpdate({ risks, issues:next }, "in-progress");
  };

  const statusColor = (s) => ({ Open:C.risk, "In Progress":C.milestone, Resolved:C.activity, Escalated:"#9c6ee0" }[s] || C.muted);
  const priorityColor = (p) => ({ High:C.risk, Medium:C.milestone, Low:C.activity }[p] || C.muted);

  return (
    <div style={{ maxWidth:900 }}>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:16, borderBottom:`1px solid ${C.border}`, paddingBottom:8 }}>
        {[["risks", `Risk Register (${risks.length})`], ["issues", `Issues Register (${issues.length})`]].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding:"5px 16px", borderRadius:5, border:"none", fontSize:12, fontWeight:600,
              background: activeTab===t ? C.accent : "none",
              color: activeTab===t ? "#fff" : C.muted, cursor:"pointer" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ══ RISKS ══ */}
      {activeTab === "risks" && (
        <>
          <div style={{ display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" }}>
            {[[C.activity,"1–3 · Low"],[C.milestone,"4–8 · Amber"],[C.risk,"9 · Red — escalate"]].map(([col,label]) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:C.dim }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:col }}/>{label}
              </div>
            ))}
          </div>
          {risks.length===0 && <div style={{ color:C.muted, fontSize:12, marginBottom:12 }}>No risks yet. Add one below or extract from a document in Layer 1.</div>}
          {risks.map((r, i) => {
            const score = (parseInt(r.likelihood)||1)*(parseInt(r.impact)||1);
            const rag   = ragColor(r.likelihood, r.impact);
            return (
              <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${rag}`, borderRadius:7, padding:"12px 14px", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontFamily:"monospace", fontSize:11, color:C.muted }}>{r._id}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, background:rag+"22", color:rag, border:`1px solid ${rag}` }}>Score: {score}</span>
                  {r.category && <span style={{ fontSize:10, color:C.muted }}>{r.category}</span>}
                  {!locked && <button onClick={()=>removeRisk(i)} style={{ marginLeft:"auto", background:"none", border:"none", color:C.risk, cursor:"pointer", fontSize:13 }}>✕</button>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="Risk Name"/><input style={inp} value={r.name||""} disabled={locked} onChange={e=>updateRisk(i,"name",e.target.value)} placeholder="Short risk name"/></div>
                  <div><Lbl c="Category"/><EditableSelect value={r.category||""} disabled={locked} onChange={v=>updateRisk(i,"category",v)} options={RISK_CATEGORIES} placeholder="Select..."/></div>
                  <div><Lbl c="Response"/><EditableSelect value={r.response||"Avoid"} disabled={locked} onChange={v=>updateRisk(i,"response",v)} options={RESPONSES} placeholder="Select..."/></div>
                  <div><Lbl c="Cause / Trigger"/><input style={inp} value={r.cause||""} disabled={locked} onChange={e=>updateRisk(i,"cause",e.target.value)} placeholder="What would trigger this?"/></div>
                  <div><Lbl c="Potential Impact"/><input style={inp} value={r.potentialImpact||""} disabled={locked} onChange={e=>updateRisk(i,"potentialImpact",e.target.value)} placeholder="Consequence if it occurs"/></div>
                  <div><Lbl c="Likelihood"/>
                    <select style={inp} value={r.likelihood||"1 - Low"} disabled={locked} onChange={e=>updateRisk(i,"likelihood",e.target.value)}>
                      {LEVELS.map(l=><option key={l} value={l} style={{background:C.surface2}}>{l}</option>)}
                    </select>
                  </div>
                  <div><Lbl c="Impact"/>
                    <select style={inp} value={r.impact||"1 - Low"} disabled={locked} onChange={e=>updateRisk(i,"impact",e.target.value)}>
                      {LEVELS.map(l=><option key={l} value={l} style={{background:C.surface2}}>{l}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="Mitigation / Response Strategy"/><input style={inp} value={r.mitigation||""} disabled={locked} onChange={e=>updateRisk(i,"mitigation",e.target.value)} placeholder="How will this risk be managed?"/></div>
                  <div><Lbl c="Risk Owner"/>
                    <select style={inp} value={r._suggestedOwner||""} disabled={locked} onChange={e=>updateRisk(i,"_suggestedOwner",e.target.value)}>
                      <option value="">Select owner...</option>
                      {teamRoles.map(role=><option key={role} value={role} style={{background:C.surface2}}>{role}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {!locked && <button onClick={addRisk} style={{ padding:"7px 14px", background:"none", border:`1px dashed ${C.border}`, borderRadius:6, color:C.dim, fontSize:12, cursor:"pointer", width:"100%" }}>+ Add Risk</button>}
        </>
      )}

      {/* ══ ISSUES ══ */}
      {activeTab === "issues" && (
        <>
          <div style={{ fontSize:12, color:C.dim, marginBottom:14, lineHeight:1.6 }}>
            Issues are risks that have materialised — problems actively affecting the project now. Assign an owner and target resolution date for each.
          </div>
          {issues.length===0 && <div style={{ color:C.muted, fontSize:12, marginBottom:12 }}>No issues logged yet. Add one below or extract from a document in Layer 1.</div>}
          {issues.map((iss, i) => {
            const col = statusColor(iss.status);
            const pc  = priorityColor(iss.priority);
            return (
              <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${col}`, borderRadius:7, padding:"12px 14px", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontFamily:"monospace", fontSize:11, color:C.muted }}>{iss._id}</span>
                  <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20, background:col+"22", color:col, border:`1px solid ${col}` }}>{iss.status||"Open"}</span>
                  <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20, background:pc+"22", color:pc, border:`1px solid ${pc}` }}>{iss.priority||"Medium"}</span>
                  {!locked && <button onClick={()=>removeIssue(i)} style={{ marginLeft:"auto", background:"none", border:"none", color:C.risk, cursor:"pointer", fontSize:13 }}>✕</button>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="Issue Name"/><input style={inp} value={iss.name||""} disabled={locked} onChange={e=>updateIssue(i,"name",e.target.value)} placeholder="Short issue name"/></div>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="Description"/><input style={inp} value={iss.description||""} disabled={locked} onChange={e=>updateIssue(i,"description",e.target.value)} placeholder="What is happening?"/></div>
                  <div><Lbl c="Cause"/><input style={inp} value={iss.cause||""} disabled={locked} onChange={e=>updateIssue(i,"cause",e.target.value)} placeholder="What triggered this issue?"/></div>
                  <div><Lbl c="Current Impact"/><input style={inp} value={iss.impact||""} disabled={locked} onChange={e=>updateIssue(i,"impact",e.target.value)} placeholder="How is this affecting the project?"/></div>
                  <div><Lbl c="Priority"/>
                    <select style={inp} value={iss.priority||"Medium"} disabled={locked} onChange={e=>updateIssue(i,"priority",e.target.value)}>
                      {PRIORITIES.map(p=><option key={p} value={p} style={{background:C.surface2}}>{p}</option>)}
                    </select>
                  </div>
                  <div><Lbl c="Status"/>
                    <select style={inp} value={iss.status||"Open"} disabled={locked} onChange={e=>updateIssue(i,"status",e.target.value)}>
                      {ISSUE_STATUSES.map(s=><option key={s} value={s} style={{background:C.surface2}}>{s}</option>)}
                    </select>
                  </div>
                  <div><Lbl c="Issue Owner"/>
                    <select style={inp} value={iss.owner||""} disabled={locked} onChange={e=>updateIssue(i,"owner",e.target.value)}>
                      <option value="">Select owner...</option>
                      {teamRoles.map(role=><option key={role} value={role} style={{background:C.surface2}}>{role}</option>)}
                    </select>
                  </div>
                  <div><Lbl c="Escalation Path"/><input style={inp} value={iss.escalationPath||""} disabled={locked} onChange={e=>updateIssue(i,"escalationPath",e.target.value)} placeholder="Who to escalate to if unresolved?"/></div>
                  <div><Lbl c="Date Raised"/><input style={inp} type="date" value={iss.raisedDate||""} disabled={locked} onChange={e=>updateIssue(i,"raisedDate",e.target.value)}/></div>
                  <div><Lbl c="Target Resolution"/><input style={inp} type="date" value={iss.targetResolutionDate||""} disabled={locked} onChange={e=>updateIssue(i,"targetResolutionDate",e.target.value)}/></div>
                  <div style={{ gridColumn:"1/-1" }}><Lbl c="Resolution / Actions Taken"/><input style={inp} value={iss.resolution||""} disabled={locked} onChange={e=>updateIssue(i,"resolution",e.target.value)} placeholder="What has been or will be done?"/></div>
                </div>
              </div>
            );
          })}
          {!locked && <button onClick={addIssue} style={{ padding:"7px 14px", background:"none", border:`1px dashed ${C.border}`, borderRadius:6, color:C.dim, fontSize:12, cursor:"pointer", width:"100%" }}>+ Log Issue</button>}
        </>
      )}
    </div>
  );
}
