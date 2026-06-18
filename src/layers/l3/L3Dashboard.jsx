import { useMemo, useState } from "react";

const C = {
  surface:"#122E1E", surface2:"#183D28", border:"#1F4D34",
  accent:"#2E7D52", accentL:"#3a9962",
  sage:"#E5F0E8", sageDim:"#b8d4c0", dim:"#8aac96", muted:"#5a7a66",
  risk:"#e05c5c", milestone:"#e0a23a", activity:"#3ae0a2",
};

function MetricCard({ label, value, sub, color }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0, overflow:"hidden" }}>

      {/* Sub-nav */}
      <div style={{ background:"#122E1E", borderBottom:"1px solid #1F4D34", display:"flex", alignItems:"center", padding:"0 20px", flexShrink:0 }}>
        {[["overview","Overview","📊"],["baseline","Baseline","📐"]].map(([id,label,icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"0 14px", height:38,
              fontSize:11, fontWeight:600, background:"none", border:"none",
              borderBottom:`2px solid ${activeTab===id?"#3a9962":"transparent"}`,
              color:activeTab===id?"#E5F0E8":"#5a7a66", cursor:"pointer" }}>
            <span>{icon}</span>{label}
          </button>
        ))}
        {currentPhase && (
          <div style={{ marginLeft:"auto", fontSize:10, color:"#5a7a66" }}>
            Current phase: <span style={{ color:"#3a9962", fontWeight:700 }}>{currentPhase}</span>
          </div>
        )}
      </div>

      {/* Baseline confirmation banner */}
      {!baselineActive && baselineReady && activeTab==="overview" && (
        <div style={{ background:"rgba(224,162,58,0.1)", border:"1px solid rgba(224,162,58,0.3)", padding:"10px 20px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <span style={{ fontSize:18 }}>📐</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#e0a23a" }}>Ready to confirm baseline</div>
            <div style={{ fontSize:11, color:"#8aac96" }}>All setup sheets approved. Confirm the baseline to launch the project.</div>
          </div>
          {member?.isPM && (
            <button onClick={() => onConfirmBaseline?.(member.loginCode)}
              style={{ padding:"7px 16px", background:"#e0a23a", border:"none", borderRadius:6, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              Confirm Baseline →
            </button>
          )}
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div style={{ padding: 20, overflowY: "auto", flex:1 }}>
      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        <MetricCard label="Overall Progress" value={`${pct}%`}          sub={`${doneTasks} of ${allTasks.length} tasks`} color={pct >= 70 ? C.activity : pct >= 40 ? C.milestone : C.risk} />
        <MetricCard label="Overdue Tasks"    value={overdue}             sub="need attention"                              color={overdue > 0 ? C.risk : C.activity} />
        <MetricCard label="Risks & Issues"   value={`${risks.length} / ${openIssues}`} sub={`${redRisks} red · ${ambRisks} amber · ${openIssues} open issues`} color={redRisks > 0 ? C.risk : openIssues > 0 ? C.milestone : C.activity} />
        <MetricCard label="Next Milestone"   value={nextMs?.name || "None"} sub={nextMs?.targetDate || "No date set"}      color={C.milestone} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* RAG */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>RAG by register</div>
          <RagBar label="Activities"   pct={actPct} color={actPct >= 70 ? C.activity : actPct >= 40 ? C.milestone : C.risk} />
          <RagBar label="Milestones"   pct={msPct}  color={msPct  >= 70 ? C.activity : msPct  >= 40 ? C.milestone : C.risk} />
          <RagBar label="Deliverables" pct={delPct} color={delPct >= 70 ? C.activity : delPct >= 40 ? C.milestone : C.risk} />
          <RagBar label="Risks closed" pct={risks.length > 0 ? Math.round((risks.filter(r => r._closed).length / risks.length) * 100) : 0} color={C.activity} />
        </div>

        {/* Milestones */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>Milestones</div>
          {milestones.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No milestones set.</div>}
          {milestones.slice(0, 6).map((m, i) => {
            const done = m._complete;
            const past = m.targetDate && new Date(m.targetDate) < new Date() && !done;
            const col  = done ? C.activity : past ? C.risk : C.milestone;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontSize: 12 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0 }} />
                <div style={{ color: C.dim, flex: 1 }}>{m.name || "—"}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{m.targetDate || "TBC"}</div>
                <div style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: col + "22", color: col }}>
                  {done ? "Done" : past ? "Overdue" : "Upcoming"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Change log */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>Change Log</div>
          {changes.length === 0 && <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>No changes recorded yet.</div>}
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              [majorChanges.length, "Major CCRs", C.accentL],
              [minorChanges.length, "Minor changes", C.dim],
              [pendingCCRs.length,  "Pending",       C.milestone],
              [approvedCCRs.length, "Approved",      C.activity],
              ...(rejectedCCRs.length ? [[rejectedCCRs.length, "Rejected", C.risk]] : []),
            ].map(([val, lbl, col]) => (
              <div key={lbl} style={{ background: C.surface2, borderRadius: 6, padding: "6px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: col }}>{val}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{lbl}</div>
              </div>
            ))}
          </div>
          {changes.slice(-3).reverse().map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: C.dim, marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${c.type === "major" ? C.milestone : C.border}` }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: C.muted }}>{c.id}</span> — {c.description || "Change recorded"}
            </div>
          ))}
        </div>

        {/* Cost chart */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Cost Performance</div>

          {(totalPlanned > 0 || totalActual > 0) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              {[
                [`£${totalPlanned.toLocaleString()}`, "Planned",      C.accentL],
                [`£${totalActual.toLocaleString()}`,  "Actual logged", C.milestone],
                [`${costVariance >= 0 ? "" : "-"}£${Math.abs(costVariance).toLocaleString()}`, "Variance", costVariance >= 0 ? C.activity : C.risk],
              ].map(([val, lbl, col]) => (
                <div key={lbl} style={{ background: C.surface2, borderRadius: 6, padding: "5px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: col }}>{val}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>{lbl}</div>
                </div>
              ))}
            </div>
          )}

          {!costChart
            ? <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", padding: 8 }}>
                {totalPlanned > 0 || totalActual > 0
                  ? "Set activity dates in Integrated Baseline to display the cost curve."
                  : "No cost data yet. Add planned costs in Integrated Baseline."}
              </div>
            : (
              <svg width="100%" height="155" viewBox="0 0 300 155" style={{ display: "block" }}>
                {/* Axes */}
                <line x1={40} y1={118} x2={282} y2={118} stroke={C.border} strokeWidth="1" />
                <line x1={40} y1={18}  x2={40}  y2={118} stroke={C.border} strokeWidth="1" />
                {/* Y labels */}
                <text x="2" y="24"  fill={C.muted} fontSize="7">£{Math.round(costChart.dataMax).toLocaleString()}</text>
                <text x="2" y="120" fill={C.muted} fontSize="7">£0</text>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map(f => (
                  <g key={f}>
                    <line x1={40} y1={costChart.yOf(costChart.dataMax * f).toFixed(0)} x2={282} y2={costChart.yOf(costChart.dataMax * f).toFixed(0)} stroke={C.border} strokeWidth="1" opacity="0.3" strokeDasharray="3 3" />
                    <text x="2" y={(costChart.yOf(costChart.dataMax * f) + 3).toFixed(0)} fill={C.muted} fontSize="6">£{Math.round(costChart.dataMax * f).toLocaleString()}</text>
                  </g>
                ))}
                {/* X labels */}
                <text x={40}  y="132" fill={C.muted} fontSize="7" textAnchor="middle">{costChart.fmt(costChart.minMs)}</text>
                <text x={282} y="132" fill={C.muted} fontSize="7" textAnchor="middle">{costChart.fmt(costChart.maxMs)}</text>
                {costChart.ticks.map((m, i) => {
                  const mx = costChart.xOf(m.getTime());
                  if (mx <= 50 || mx >= 272) return null;
                  return (
                    <g key={i}>
                      <line x1={mx.toFixed(1)} y1={118} x2={mx.toFixed(1)} y2={122} stroke={C.border} strokeWidth="1" />
                      <text x={mx.toFixed(1)} y="132" fill={C.muted} fontSize="6" textAnchor="middle">
                        {m.toLocaleDateString("en-GB", { month: "short" })}
                      </text>
                    </g>
                  );
                })}
                {/* Planned line */}
                <path d={costChart.planPath} stroke={C.accentL}   fill="none" strokeWidth="2"   strokeDasharray="6 3" />
                {/* Actual line */}
                <path d={costChart.actPath}  stroke={C.milestone} fill="none" strokeWidth="2.5" />
                {/* Actual dots */}
                {costChart.actLine.map((p, i) => (
                  <circle key={i} cx={costChart.xOf(p.d.getTime()).toFixed(1)} cy={costChart.yOf(p.v).toFixed(1)} r="3" fill={C.milestone} stroke={C.surface} strokeWidth="1" />
                ))}
                {/* Legend */}
                <line x1="150" y1="148" x2="166" y2="148" stroke={C.accentL}   strokeWidth="2"   strokeDasharray="6 3" />
                <text x="169" y="151" fill={C.accentL}   fontSize="8">Planned</text>
                <line x1="215" y1="148" x2="231" y2="148" stroke={C.milestone} strokeWidth="2.5" />
                <text x="234" y="151" fill={C.milestone} fontSize="8">Actual</text>
              </svg>
            )}
        </div>
      </div>

      {/* Risks */}
      {risks.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>Top risks</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
            {risks.slice(0, 6).map((r, i) => {
              const score = (parseInt(r.likelihood) || 1) * (parseInt(r.impact) || 1);
              const col   = score >= 9 ? C.risk : score >= 4 ? C.milestone : C.activity;
              return (
                <div key={i} style={{ background: C.surface2, borderLeft: `3px solid ${col}`, borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: C.muted, marginBottom: 2 }}>{r._id}</div>
                  <div style={{ fontSize: 12, color: C.sage, marginBottom: 4 }}>{r.name || r.description || "—"}</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: col + "22", color: col }}>Score: {score}</span>
                    <span style={{ fontSize: 9, color: C.muted }}>{r.response || "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

        </div>
      )}

      {/* BASELINE TAB */}
      {activeTab === "baseline" && (
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {!baseline ? (
            <div style={{ padding:"48px 20px", textAlign:"center", color:"#5a7a66", fontSize:13 }}>
              {baselineReady
                ? "Confirm the baseline from the Overview tab to begin tracking."
                : "Complete and approve all setup sheets in L2 to establish the baseline."}
            </div>
          ) : (
            <div style={{ maxWidth:760 }}>
              <div style={{ background:"#122E1E", border:"1px solid #1F4D34", borderLeft:"4px solid #3a9962", borderRadius:8, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:20 }}>📐</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#E5F0E8" }}>Project Baseline v{baseline.version}</div>
                    <div style={{ fontSize:11, color:"#5a7a66" }}>Confirmed {baseline.confirmedDate} · {baseline.confirmedBy}</div>
                  </div>
                  {currentPlan && currentPlan.version > 1 && (
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#e0a23a" }}>Current Plan v{currentPlan.version}</div>
                      <div style={{ fontSize:10, color:"#5a7a66" }}>{currentPlan.lastCCR} · {currentPlan.lastUpdated}</div>
                    </div>
                  )}
                </div>
                {currentPlan && currentPlan.version > 1 && (
                  <div style={{ marginTop:8, padding:"5px 10px", background:"rgba(224,162,58,0.08)", borderRadius:5, fontSize:11, color:"#8aac96" }}>
                    ⚠️ {currentPlan.version - baseline.version} approved change{currentPlan.version-baseline.version!==1?"s":""} applied since baseline
                  </div>
                )}
              </div>

              {baseline.snapshot?.charter && (() => {
                const bc = baseline.snapshot.charter;
                const lc = state?.l2?.sheets?.["01"]?.data?.charter || {};
                return (
                  <div style={{ background:"#122E1E", border:"1px solid #1F4D34", borderRadius:8, padding:"14px 16px", marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#5a7a66", textTransform:"uppercase", letterSpacing:".5px", marginBottom:10 }}>Charter Baseline</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:11 }}>
                      {[["Project","projectName"],["Budget","budget"],["Start","startDate"],["End","endDate"]].map(([lbl,key]) => {
                        const changed = bc[key] !== lc[key];
                        return (
                          <div key={key}>
                            <div style={{ fontSize:9, color:"#5a7a66", textTransform:"uppercase", marginBottom:2 }}>{lbl}</div>
                            <div style={{ color:changed?"#e0a23a":"#E5F0E8" }}>
                              {bc[key]||"—"}{changed && <span style={{ fontSize:9, marginLeft:6 }}>→ {lc[key]||"—"}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {(baseline.snapshot?.activities||[]).length > 0 && (
                <div style={{ background:"#122E1E", border:"1px solid #1F4D34", borderRadius:8, padding:"14px 16px", marginBottom:12, overflowX:"auto" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#5a7a66", textTransform:"uppercase", letterSpacing:".5px", marginBottom:10 }}>Schedule Baseline</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:"#183D28" }}>
                        {["ID","Activity","Phase","Baseline End","Current End","Status"].map(h => (
                          <th key={h} style={{ padding:"5px 10px", textAlign:"left", fontSize:9, fontWeight:700, color:"#5a7a66", textTransform:"uppercase", borderBottom:"1px solid #1F4D34" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {baseline.snapshot.activities.map((ba, i) => {
                        const curr = activities.find(a => a._id === ba._id);
                        const changed = curr && curr.targetDate !== ba.targetDate;
                        return (
                          <tr key={i} style={{ borderBottom:"1px solid rgba(31,77,52,0.3)", background:i%2===0?"#122E1E":"transparent" }}>
                            <td style={{ padding:"5px 10px", fontFamily:"monospace", fontSize:10, color:"#5a7a66" }}>{ba._id}</td>
                            <td style={{ padding:"5px 10px", color:"#E5F0E8" }}>{ba.name||"—"}</td>
                            <td style={{ padding:"5px 10px", color:"#5a7a66" }}>{ba.phase||"—"}</td>
                            <td style={{ padding:"5px 10px", fontFamily:"monospace", color:"#8aac96" }}>{ba.targetDate||"—"}</td>
                            <td style={{ padding:"5px 10px", fontFamily:"monospace", color:changed?"#e0a23a":"#8aac96" }}>{curr?.targetDate||"—"}</td>
                            <td style={{ padding:"5px 10px" }}>
                              {curr?._complete ? <span style={{ color:"#3ae0a2", fontSize:9 }}>✓ Done</span>
                                : changed ? <span style={{ color:"#e0a23a", fontSize:9 }}>Changed</span>
                                : <span style={{ color:"#5a7a66", fontSize:9 }}>On plan</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {currentPlan && (() => {
                const pending = (state?.l2?.sheets?.["06"]?.data?.changes||[]).filter(c => c.status==="approved" && c.id !== currentPlan.lastCCR);
                if (!pending.length) return null;
                return (
                  <div style={{ background:"rgba(58,224,162,0.06)", border:"1px solid rgba(58,224,162,0.2)", borderRadius:8, padding:"12px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#3ae0a2", marginBottom:8 }}>
                      {pending.length} approved CCR{pending.length>1?"s":""} not yet applied to current plan
                    </div>
                    {pending.map((ccr, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderTop:"1px solid rgba(31,77,52,0.3)" }}>
                        <span style={{ fontFamily:"monospace", fontSize:11, color:"#3a9962" }}>{ccr.id}</span>
                        <span style={{ fontSize:11, color:"#8aac96", flex:1 }}>{ccr.description}</span>
                        {member?.isPM && (
                          <button onClick={() => onApplyCCRToPlan?.(ccr.id, member.loginCode)}
                            style={{ padding:"4px 12px", background:"#2E7D52", border:"none", borderRadius:5, color:"#fff", fontSize:10, fontWeight:700, cursor:"pointer" }}>
                            Apply to Plan
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
