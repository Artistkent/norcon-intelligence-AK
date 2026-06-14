import { useState } from "react";

const C = { surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66", risk:"#e05c5c", milestone:"#e0a23a", activity:"#3ae0a2" };
const inp = { background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.sage, fontSize:12, padding:"6px 9px", outline:"none", boxSizing:"border-box", fontFamily:"inherit", width:"100%" };
const Lbl = ({c})=><div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{c}</div>;
const CHANGE_TYPES = ["Scope Change","Schedule Change","Budget Change","Quality Change","Resource Change","Process Change"];
const DECISIONS    = ["Pending","Approved","Rejected","Deferred"];
const decColor     = { Approved:C.activity, Rejected:C.risk, Pending:C.milestone, Deferred:C.muted };

export default function Sheet06Change({ data, locked, loginCodes, onUpdate }) {
  const [changes, setChanges] = useState(data.changes || []);

  const update = (idx, field, value) => {
    const next = changes.map((c,i)=> i===idx ? {...c,[field]:value} : c);
    setChanges(next);
    onUpdate({ changes:next }, 'in-progress');
  };

  const addChange = () => {
    const id = `CCR-${String(changes.length+1).padStart(3,"0")}`;
    const next = [...changes, { id, date:new Date().toISOString().split("T")[0], requestedBy:"", type:"", description:"", justification:"", impact:"", decision:"Pending", approvedBy:"" }];
    setChanges(next);
    onUpdate({ changes:next }, 'in-progress');
  };

  const removeChange = (idx) => {
    const next = changes.filter((_,i)=>i!==idx);
    setChanges(next);
    onUpdate({ changes:next }, 'in-progress');
  };

  const teamNames = loginCodes.map(lc=>lc.name).filter(Boolean);

  return (
    <div style={{maxWidth:900}}>
      {/* Process steps */}
      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto"}}>
        {[["1","Identify","Any team member spots a change"],["2","Log","PM assigns Change ID"],["3","Assess","Impact on scope, schedule, cost"],["4","Approve","Minor=PM, Baseline=Sponsor"],["5","Implement","Apply approved changes"],["6","Close","Confirm, archive, notify"]].map(([n,t,d])=>(
          <div key={n} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",minWidth:110,flexShrink:0}}>
            <div style={{fontSize:9,color:C.accentL,fontWeight:700,marginBottom:3}}>Step {n}</div>
            <div style={{fontSize:11,color:C.sage,fontWeight:600,marginBottom:2}}>{t}</div>
            <div style={{fontSize:10,color:C.muted,lineHeight:1.4}}>{d}</div>
          </div>
        ))}
      </div>

      {changes.length===0&&<div style={{color:C.muted,fontSize:12,marginBottom:12}}>No changes logged yet. This log will be populated during project delivery.</div>}

      {changes.map((c,i)=>(
        <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"12px 14px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontFamily:"monospace",fontSize:12,color:C.accentL,fontWeight:700}}>{c.id}</span>
            <span style={{fontSize:10,color:C.muted}}>{c.date}</span>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:(decColor[c.decision]||C.muted)+"22",color:decColor[c.decision]||C.muted,border:`1px solid ${decColor[c.decision]||C.muted}`}}>{c.decision}</span>
            {!locked&&<button onClick={()=>removeChange(i)} style={{marginLeft:"auto",background:"none",border:"none",color:C.risk,cursor:"pointer",fontSize:13}}>✕</button>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><Lbl c="Requested By"/>
              <select style={inp} value={c.requestedBy||""} disabled={locked} onChange={e=>update(i,"requestedBy",e.target.value)}>
                <option value="">Select...</option>
                {teamNames.map(n=><option key={n} value={n} style={{background:C.surface2}}>{n}</option>)}
              </select>
            </div>
            <div><Lbl c="Change Type"/>
              <select style={inp} value={c.type||""} disabled={locked} onChange={e=>update(i,"type",e.target.value)}>
                <option value="">Select...</option>
                {CHANGE_TYPES.map(t=><option key={t} value={t} style={{background:C.surface2}}>{t}</option>)}
              </select>
            </div>
            <div style={{gridColumn:"1/-1"}}><Lbl c="Description of Change"/><input style={inp} value={c.description||""} disabled={locked} onChange={e=>update(i,"description",e.target.value)} placeholder="What is being changed?"/></div>
            <div style={{gridColumn:"1/-1"}}><Lbl c="Justification"/><input style={inp} value={c.justification||""} disabled={locked} onChange={e=>update(i,"justification",e.target.value)} placeholder="Why is this change needed?"/></div>
            <div><Lbl c="Impact (Scope / Time / Cost / Quality)"/><input style={inp} value={c.impact||""} disabled={locked} onChange={e=>update(i,"impact",e.target.value)} placeholder="Describe impact"/></div>
            <div><Lbl c="Decision"/>
              <select style={inp} value={c.decision||"Pending"} disabled={locked} onChange={e=>update(i,"decision",e.target.value)}>
                {DECISIONS.map(d=><option key={d} value={d} style={{background:C.surface2}}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
      {!locked&&<button onClick={addChange} style={{padding:"7px 14px",background:"none",border:`1px dashed ${C.border}`,borderRadius:6,color:C.dim,fontSize:12,cursor:"pointer",width:"100%"}}>+ Log Change Request</button>}
    </div>
  );
}
