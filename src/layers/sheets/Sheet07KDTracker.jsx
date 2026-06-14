import { useState } from "react";

const C = { surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66", risk:"#e05c5c", milestone:"#e0a23a", activity:"#3ae0a2" };
const inp = { background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.sage, fontSize:12, padding:"6px 9px", outline:"none", boxSizing:"border-box", fontFamily:"inherit", width:"100%" };
const Lbl = ({c})=><div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{c}</div>;

function rag(target, actual) {
  if (!actual || !target) return C.muted;
  const pct = (parseFloat(actual) / parseFloat(target)) * 100;
  if (pct >= 100) return C.activity;
  if (pct >= 60)  return C.milestone;
  return C.risk;
}

export default function Sheet07KDTracker({ data, locked, allSheets, onUpdate }) {
  const [deliverables, setDeliverables] = useState(() => {
    if (data.deliverables && data.deliverables.length > 0) return data.deliverables;
    return [];
  });

  const update = (idx, field, value) => {
    const next = deliverables.map((d,i)=> i===idx ? {...d,[field]:value} : d);
    setDeliverables(next);
    onUpdate({ deliverables:next }, 'in-progress');
  };

  const addDeliverable = () => {
    const next = [...deliverables, { _id:`D-${String(deliverables.length+1).padStart(3,"0")}`, name:"", kpi:"", target:"", actual:"", deadlineV1:"", notes:"" }];
    setDeliverables(next);
    onUpdate({ deliverables:next }, 'in-progress');
  };

  const removeDeliverable = (idx) => {
    const next = deliverables.filter((_,i)=>i!==idx);
    setDeliverables(next);
    onUpdate({ deliverables:next }, 'in-progress');
  };

  return (
    <div style={{maxWidth:900}}>
      <div style={{fontSize:12,color:C.dim,marginBottom:16,lineHeight:1.6}}>
        Link each deliverable to a measurable KPI. Achievement % is calculated automatically from target vs actual.
      </div>

      {deliverables.length===0&&<div style={{color:C.muted,fontSize:12,marginBottom:12}}>No deliverables yet. Add one below or extract from a document in Layer 1.</div>}

      {deliverables.map((d,i)=>{
        const pct    = d.target && d.actual ? Math.round((parseFloat(d.actual)/parseFloat(d.target))*100) : null;
        const ragCol = rag(d.target, d.actual);
        return (
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${ragCol}`,borderRadius:7,padding:"12px 14px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontFamily:"monospace",fontSize:11,color:C.accentL}}>{d._id}</span>
              {pct!==null&&(
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:ragCol+"22",color:ragCol,border:`1px solid ${ragCol}`}}>{pct}%</span>
              )}
              {!locked&&<button onClick={()=>removeDeliverable(i)} style={{marginLeft:"auto",background:"none",border:"none",color:C.risk,cursor:"pointer",fontSize:13}}>✕</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr",gap:10}}>
              <div style={{gridColumn:"1/-1"}}><Lbl c="Deliverable Name"/><input style={inp} value={d.name||""} disabled={locked} onChange={e=>update(i,"name",e.target.value)} placeholder="Deliverable description"/></div>
              <div style={{gridColumn:"span 2"}}><Lbl c="KPI Metric"/><input style={inp} value={d.kpi||""} disabled={locked} onChange={e=>update(i,"kpi",e.target.value)} placeholder="e.g. Number of responses, % completion"/></div>
              <div><Lbl c="Target"/><input style={inp} value={d.target||""} disabled={locked} onChange={e=>update(i,"target",e.target.value)} placeholder="e.g. 100"/></div>
              <div><Lbl c="Actual"/><input style={inp} value={d.actual||""} disabled={locked} onChange={e=>update(i,"actual",e.target.value)} placeholder="e.g. 75"/></div>
              <div><Lbl c="Achievement"/>
                <div style={{padding:"6px 9px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:5,fontSize:12,fontWeight:700,color:pct!==null?ragCol:C.muted}}>
                  {pct!==null?pct+"%":"—"}
                </div>
              </div>
              <div style={{gridColumn:"span 2"}}><Lbl c="Deadline"/><input style={inp} type="date" value={d.deadlineV1||""} disabled={locked} onChange={e=>update(i,"deadlineV1",e.target.value)}/></div>
              <div style={{gridColumn:"span 3"}}><Lbl c="Notes"/><input style={inp} value={d.notes||""} disabled={locked} onChange={e=>update(i,"notes",e.target.value)} placeholder="Any notes"/></div>
            </div>
          </div>
        );
      })}
      {!locked&&<button onClick={addDeliverable} style={{padding:"7px 14px",background:"none",border:`1px dashed ${C.border}`,borderRadius:6,color:C.dim,fontSize:12,cursor:"pointer",width:"100%"}}>+ Add Deliverable</button>}
    </div>
  );
}
