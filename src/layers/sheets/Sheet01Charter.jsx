import { useState, useEffect } from "react";

const C = { bg:"#0D2B1B", surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66", risk:"#e05c5c" };
const inp = { width:"100%", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:6, color:C.sage, fontSize:13, padding:"9px 12px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
const Lbl = ({children}) => <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".4px", marginBottom:5 }}>{children}</div>;

export default function Sheet01Charter({ data, locked, l1, onUpdate }) {
  const c = data.charter || {};
  const [form, setForm] = useState({
    projectName: c.projectName||'', projectCode: c.projectCode||'',
    projectManager: c.projectManager||'', projectSponsor: c.projectSponsor||'',
    organisation: c.organisation||'', startDate: c.startDate||'',
    endDate: c.endDate||'', budget: c.budget||'',
    purpose: c.purpose||'', problemStatement: c.problemStatement||'',
    strategicAlignment: c.strategicAlignment||'',
    withinScope: (c.withinScope||[]).join('\n'),
    outOfScope: (c.outOfScope||[]).join('\n'),
  });

  const [objectives, setObjectives] = useState(c.objectives || [{ objective:'', successCriterion:'', targetDate:'' }]);

  const set = (k,v) => {
    const next = {...form, [k]:v};
    setForm(next);
    onUpdate({ charter:{ ...next, withinScope: next.withinScope.split('\n').filter(Boolean), outOfScope: next.outOfScope.split('\n').filter(Boolean), objectives } }, 'in-progress');
  };

  const setObj = (i,k,v) => {
    const next = objectives.map((o,idx) => idx===i ? {...o,[k]:v} : o);
    setObjectives(next);
    onUpdate({ charter:{ ...form, withinScope: form.withinScope.split('\n').filter(Boolean), outOfScope: form.outOfScope.split('\n').filter(Boolean), objectives:next } }, 'in-progress');
  };

  const addObj = () => setObjectives(prev => [...prev, { objective:'', successCriterion:'', targetDate:'' }]);
  const removeObj = (i) => setObjectives(prev => prev.filter((_,idx)=>idx!==i));

  const Section = ({title}) => <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".5px", borderBottom:`1px solid ${C.border}`, paddingBottom:6, marginBottom:14, marginTop:20 }}>{title}</div>;

  return (
    <div style={{ maxWidth:700 }}>
      <Section title="General Information"/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        {[["projectName","Project Name"],["projectCode","Project Code"],["projectManager","Project Manager"],["projectSponsor","Project Sponsor"],["organisation","Organisation"],["budget","Total Budget"]].map(([k,l])=>(
          <div key={k}>
            <Lbl>{l}</Lbl>
            <input style={{...inp}} value={form[k]} disabled={locked} onChange={e=>set(k,e.target.value)} placeholder={`Enter ${l.toLowerCase()}`}/>
          </div>
        ))}
        <div>
          <Lbl>Start Date</Lbl>
          <input style={{...inp}} type="date" value={form.startDate} disabled={locked} onChange={e=>set('startDate',e.target.value)}/>
        </div>
        <div>
          <Lbl>End Date</Lbl>
          <input style={{...inp}} type="date" value={form.endDate} disabled={locked} onChange={e=>set('endDate',e.target.value)}/>
        </div>
      </div>

      <Section title="Purpose & Problem"/>
      {[["purpose","Purpose — What will this project produce or achieve?"],["problemStatement","Problem Statement — What issue does this project address?"],["strategicAlignment","Strategic Alignment — Which organisational goals does this support?"]].map(([k,l])=>(
        <div key={k} style={{ marginBottom:12 }}>
          <Lbl>{l}</Lbl>
          <textarea style={{...inp, resize:"vertical", minHeight:60, lineHeight:1.5}} value={form[k]} disabled={locked} onChange={e=>set(k,e.target.value)} placeholder="Enter details..."/>
        </div>
      ))}

      <Section title="Scope"/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div>
          <Lbl>Within Scope (one per line)</Lbl>
          <textarea style={{...inp, resize:"vertical", minHeight:80, lineHeight:1.6}} value={form.withinScope} disabled={locked} onChange={e=>set('withinScope',e.target.value)} placeholder="1. Item one&#10;2. Item two"/>
        </div>
        <div>
          <Lbl>Out of Scope (one per line)</Lbl>
          <textarea style={{...inp, resize:"vertical", minHeight:80, lineHeight:1.6}} value={form.outOfScope} disabled={locked} onChange={e=>set('outOfScope',e.target.value)} placeholder="1. Item one&#10;2. Item two"/>
        </div>
      </div>

      <Section title="Objectives & Success Criteria"/>
      {objectives.map((o,i)=>(
        <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:"12px 14px", marginBottom:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontFamily:"monospace", fontSize:10, color:C.muted }}>OBJ-{String(i+1).padStart(3,"0")}</div>
            {!locked && objectives.length>1 && <button onClick={()=>removeObj(i)} style={{ background:"none", border:"none", color:C.risk, cursor:"pointer", fontSize:12 }}>✕</button>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <Lbl>Objective</Lbl>
              <input style={{...inp}} value={o.objective} disabled={locked} onChange={e=>setObj(i,'objective',e.target.value)} placeholder="State the objective clearly"/>
            </div>
            <div>
              <Lbl>Success Criterion / KPI</Lbl>
              <input style={{...inp}} value={o.successCriterion} disabled={locked} onChange={e=>setObj(i,'successCriterion',e.target.value)} placeholder="How will success be measured?"/>
            </div>
            <div>
              <Lbl>Target Date</Lbl>
              <input style={{...inp}} type="date" value={o.targetDate||''} disabled={locked} onChange={e=>setObj(i,'targetDate',e.target.value)}/>
            </div>
          </div>
        </div>
      ))}
      {!locked && <button onClick={addObj} style={{ padding:"7px 14px", background:"none", border:`1px dashed ${C.border}`, borderRadius:6, color:C.dim, fontSize:12, cursor:"pointer", width:"100%", marginTop:4 }}>+ Add Objective</button>}
    </div>
  );
}
