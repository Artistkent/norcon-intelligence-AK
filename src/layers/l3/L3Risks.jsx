import { useState } from "react";

const C = {
  surface:"#122E1E", surface2:"#183D28", border:"#1F4D34",
  accent:"#2E7D52", accentL:"#3a9962",
  sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66",
  risk:"#e05c5c", milestone:"#e0a23a", activity:"#3ae0a2",
};

function ragColor(l, i) { const s=(parseInt(l)||1)*(parseInt(i)||1); return s>=9?C.risk:s>=4?C.milestone:C.activity; }
function statusColor(s) { return ({Open:C.risk,"In Progress":C.milestone,Resolved:C.activity,Escalated:"#9c6ee0"}[s]||C.muted); }
function priorityColor(p) { return ({High:C.risk,Medium:C.milestone,Low:C.activity}[p]||C.muted); }
function Badge({ label, color }) {
  return <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:12, background:color+"22", color, border:`1px solid ${color}44` }}>{label}</span>;
}

export default function L3Risks({ state, risks, member, onStateChange }) {
  const [activeTab, setActiveTab] = useState("risks");
  const canEdit = member?.isPM;
  const sheets  = state?.l2?.sheets || {};
  const issues  = sheets["05"]?.data?.issues || [];

  // ── Update issue fields in state ──────────────────────────────────────────
  const updateIssue = (idx, field, val) => {
    onStateChange(prev => {
      const d05  = prev.l2.sheets["05"]?.data || {};
      const next = (d05.issues || []).map((iss, i) => i===idx ? { ...iss, [field]: val } : iss);
      return {
        ...prev,
        l2: { ...prev.l2, sheets: { ...prev.l2.sheets,
          "05": { ...prev.l2.sheets["05"], data: { ...d05, issues: next } }
        }},
      };
    });
  };

  const addIssue = () => {
    onStateChange(prev => {
      const d05   = prev.l2.sheets["05"]?.data || {};
      const curr  = d05.issues || [];
      const next  = [...curr, {
        _id: `I-${String(101+curr.length).padStart(3,"0")}`,
        name:"", description:"", cause:"", impact:"",
        priority:"Medium", owner:"", raisedDate:"",
        targetResolutionDate:"", status:"Open", resolution:"", escalationPath:"",
      }];
      return {
        ...prev,
        l2: { ...prev.l2, sheets: { ...prev.l2.sheets,
          "05": { ...prev.l2.sheets["05"], data: { ...d05, issues: next } }
        }},
      };
    });
  };

  // Summary counts
  const openRisks   = risks.filter(r => (parseInt(r.likelihood)||1)*(parseInt(r.impact)||1) >= 9).length;
  const ambRisks    = risks.filter(r => { const s=(parseInt(r.likelihood)||1)*(parseInt(r.impact)||1); return s>=4&&s<9; }).length;
  const openIssues  = issues.filter(i => i.status==="Open" || i.status==="In Progress" || i.status==="Escalated").length;
  const resolvedIss = issues.filter(i => i.status==="Resolved").length;

  const inp = { background:C.surface2, border:`1px solid ${C.border}`, borderRadius:4, color:C.sage, fontSize:11, padding:"4px 7px", outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0, overflow:"hidden" }}>

      {/* Sub-nav */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 20px", flexShrink:0 }}>
        {[
          ["risks",  `Risks (${risks.length})`,   "⚠️"],
          ["issues", `Issues (${issues.length})`,  "🚨"],
        ].map(([id, label, icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"0 14px", height:38,
              fontSize:11, fontWeight:600, background:"none", border:"none",
              borderBottom:`2px solid ${activeTab===id ? C.accentL : "transparent"}`,
              color: activeTab===id ? C.sage : C.muted,
              cursor:"pointer", whiteSpace:"nowrap" }}>
            <span>{icon}</span>{label}
          </button>
        ))}
        {/* Summary pills */}
        <div style={{ marginLeft:"auto", display:"flex", gap:10, fontSize:10 }}>
          {activeTab==="risks" ? (
            <>
              <span style={{ color:C.risk }}>⬤ {openRisks} Red</span>
              <span style={{ color:C.milestone }}>⬤ {ambRisks} Amber</span>
              <span style={{ color:C.activity }}>⬤ {risks.length-openRisks-ambRisks} Green</span>
            </>
          ) : (
            <>
              <span style={{ color:C.risk }}>⬤ {openIssues} Open</span>
              <span style={{ color:C.activity }}>⬤ {resolvedIss} Resolved</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>

        {/* ══ RISKS ══ */}
        {activeTab === "risks" && (
          <div>
            {risks.length === 0 && (
              <div style={{ padding:"48px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
                No risks logged yet. Go to L2 → Sheet 05 to add risks, or extract them from a document in Layer 1.
              </div>
            )}

            {/* Risk table */}
            {risks.length > 0 && (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 90px 100px 100px 80px 1fr 100px",
                  padding:"7px 14px", background:C.surface2, borderBottom:`1px solid ${C.border}` }}>
                  {["ID","Risk","Category","Likelihood","Impact","Score","Mitigation / Response","Owner"].map(h => (
                    <div key={h} style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".4px" }}>{h}</div>
                  ))}
                </div>
                {risks.map((r, i) => {
                  const score = (parseInt(r.likelihood)||1)*(parseInt(r.impact)||1);
                  const col   = ragColor(r.likelihood, r.impact);
                  return (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"80px 1fr 90px 100px 100px 80px 1fr 100px",
                      padding:"9px 14px", borderBottom:`1px solid ${C.border}22`,
                      background: i%2===0 ? C.surface : "transparent",
                      borderLeft:`3px solid ${col}`, alignItems:"center" }}>
                      <div style={{ fontFamily:"monospace", fontSize:10, color:C.muted }}>{r._id}</div>
                      <div>
                        <div style={{ fontSize:12, color:C.sage }}>{r.name||"—"}</div>
                        {r.cause && <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>Cause: {r.cause}</div>}
                      </div>
                      <div style={{ fontSize:10, color:C.muted }}>{r.category||"—"}</div>
                      <div style={{ fontSize:11, color:C.dim }}>{r.likelihood||"—"}</div>
                      <div style={{ fontSize:11, color:C.dim }}>{r.impact||"—"}</div>
                      <div><Badge label={String(score)} color={col}/></div>
                      <div>
                        <div style={{ fontSize:11, color:C.dim }}>{r.mitigation||"—"}</div>
                        {r.response && <Badge label={r.response} color={C.accentL}/>}
                      </div>
                      <div style={{ fontSize:10, color:C.muted }}>{r._suggestedOwner||"—"}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop:12, fontSize:11, color:C.muted }}>
              To edit risks go to L2 → Sheet 05. This view is read-only.
            </div>
          </div>
        )}

        {/* ══ ISSUES ══ */}
        {activeTab === "issues" && (
          <div>
            <div style={{ fontSize:12, color:C.dim, marginBottom:14, lineHeight:1.6 }}>
              Issues are problems actively affecting the project now — risks that have materialised.
              Assign an owner and target resolution date for each open issue.
            </div>

            {issues.length === 0 && (
              <div style={{ padding:"32px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
                No issues logged yet.
                {canEdit && <span style={{ color:C.accentL }}> Add one below.</span>}
              </div>
            )}

            {issues.map((iss, i) => {
              const sc = statusColor(iss.status);
              const pc = priorityColor(iss.priority);
              const overdue = iss.targetResolutionDate && new Date(iss.targetResolutionDate) < new Date() && iss.status !== "Resolved";
              return (
                <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`,
                  borderLeft:`3px solid ${sc}`, borderRadius:8, padding:"12px 16px", marginBottom:10 }}>

                  {/* Issue header */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"monospace", fontSize:11, color:C.muted, fontWeight:700 }}>{iss._id}</span>
                    <Badge label={iss.status||"Open"}    color={sc}/>
                    <Badge label={iss.priority||"Medium"} color={pc}/>
                    {overdue && <Badge label="Overdue" color={C.risk}/>}
                    {iss.targetResolutionDate && (
                      <span style={{ fontSize:10, color: overdue ? C.risk : C.muted, marginLeft:"auto" }}>
                        Target: {iss.targetResolutionDate}
                      </span>
                    )}
                  </div>

                  {/* Name + description */}
                  <div style={{ fontSize:13, fontWeight:600, color:C.sage, marginBottom:4 }}>{iss.name||"—"}</div>
                  {iss.description && <div style={{ fontSize:12, color:C.dim, marginBottom:8, lineHeight:1.5 }}>{iss.description}</div>}

                  {/* Key fields in grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8, fontSize:11 }}>
                    {iss.cause  && <div><span style={{ color:C.muted }}>Cause: </span><span style={{ color:C.dim }}>{iss.cause}</span></div>}
                    {iss.impact && <div><span style={{ color:C.muted }}>Impact: </span><span style={{ color:C.dim }}>{iss.impact}</span></div>}
                    {iss.owner  && <div><span style={{ color:C.muted }}>Owner: </span><span style={{ color:C.accentL }}>{iss.owner}</span></div>}
                    {iss.escalationPath && <div><span style={{ color:C.muted }}>Escalation: </span><span style={{ color:C.dim }}>{iss.escalationPath}</span></div>}
                  </div>

                  {/* Resolution — editable by PM */}
                  {canEdit ? (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <div>
                        <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".4px", marginBottom:3 }}>Status</div>
                        <select style={inp} value={iss.status||"Open"} onChange={e=>updateIssue(i,"status",e.target.value)}>
                          {["Open","In Progress","Resolved","Escalated"].map(s=><option key={s} value={s} style={{background:C.surface2}}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".4px", marginBottom:3 }}>Resolution / Actions</div>
                        <input style={inp} value={iss.resolution||""} onChange={e=>updateIssue(i,"resolution",e.target.value)} placeholder="What has been done?"/>
                      </div>
                    </div>
                  ) : (
                    iss.resolution && (
                      <div style={{ background:C.surface2, borderRadius:5, padding:"6px 10px", fontSize:11, color:C.dim }}>
                        <span style={{ color:C.muted }}>Resolution: </span>{iss.resolution}
                      </div>
                    )
                  )}
                </div>
              );
            })}

            {canEdit && (
              <button onClick={addIssue}
                style={{ padding:"8px 14px", background:"none", border:`1px dashed ${C.border}`,
                  borderRadius:6, color:C.dim, fontSize:12, cursor:"pointer", width:"100%", marginTop:4 }}>
                + Log Issue
              </button>
            )}

            <div style={{ marginTop:12, fontSize:11, color:C.muted }}>
              Full issue details (cause, impact, owner, dates) are configured in L2 → Sheet 05.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
