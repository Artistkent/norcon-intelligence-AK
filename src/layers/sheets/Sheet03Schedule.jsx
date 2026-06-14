import { useState } from "react";

const C = { surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", sageDim:"#b8d4c0", dim:"#8aac96", muted:"#5a7a66", risk:"#e05c5c", milestone:"#e0a23a" };
const inp = { background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.sage, fontSize:12, padding:"6px 9px", outline:"none", boxSizing:"border-box", fontFamily:"inherit", width:"100%" };
const Lbl = ({c})=><div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{c}</div>;

const PHASES = ["Initiation","Planning","Research","Design","Development","Testing","Deployment","Delivery","Closure","Transition"];

export default function Sheet03Schedule({ data, locked, loginCodes, onUpdate }) {
  const [activities, setActivities] = useState(data.activities || []);
  const [milestones, setMilestones] = useState(data.milestones || []);

  const updateActivity = (idx, field, value) => {
    const next = activities.map((a,i) => i===idx ? {...a,[field]:value} : a);
    setActivities(next);
    onUpdate({ activities:next, milestones }, 'in-progress');
  };

  const updateMilestone = (idx, field, value) => {
    const next = milestones.map((m,i) => i===idx ? {...m,[field]:value} : m);
    setMilestones(next);
    onUpdate({ activities, milestones:next }, 'in-progress');
  };

  const addActivity = () => {
    const next = [...activities, { _id:`ACT-${String(activities.length+1).padStart(3,"0")}`, name:"", phase:"", responsible:"", description:"", _state:"pending" }];
    setActivities(next);
    onUpdate({ activities:next, milestones }, 'in-progress');
  };

  const addMilestone = () => {
    const next = [...milestones, { _id:`MS-${String(milestones.length+1).padStart(3,"0")}`, name:"", phase:"", targetDate:"", description:"", _state:"pending" }];
    setMilestones(next);
    onUpdate({ activities, milestones:next }, 'in-progress');
  };

  const removeActivity = (idx) => {
    const next = activities.filter((_,i)=>i!==idx);
    setActivities(next);
    onUpdate({ activities:next, milestones }, 'in-progress');
  };

  const removeMilestone = (idx) => {
    const next = milestones.filter((_,i)=>i!==idx);
    setMilestones(next);
    onUpdate({ activities, milestones:next }, 'in-progress');
  };

  const teamOptions = loginCodes.map(lc => lc.role).filter(Boolean);
  const Section = ({title,count})=>(
    <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",borderBottom:`1px solid ${C.border}`,paddingBottom:6,marginBottom:12,marginTop:20,display:"flex",justifyContent:"space-between"}}>
      <span>{title}</span>
      {count>0&&<span style={{color:C.accentL}}>{count} from Layer 1</span>}
    </div>
  );

  return (
    <div style={{maxWidth:900}}>
      <Section title="Activities" count={data.activities?.length||0}/>
      {activities.length===0 && <div style={{color:C.muted,fontSize:12,marginBottom:12}}>No activities yet. Add one below or upload a document in Layer 1.</div>}
      {activities.map((a,i)=>(
        <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"10px 12px",marginBottom:8,display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 28px",gap:8,alignItems:"end"}}>
          <div><Lbl c="ID"/><div style={{fontFamily:"monospace",fontSize:11,color:C.accentL,padding:"7px 0"}}>{a._id}</div></div>
          <div><Lbl c="Activity Name"/><input style={inp} value={a.name||""} disabled={locked} onChange={e=>updateActivity(i,"name",e.target.value)} placeholder="Activity description"/></div>
          <div><Lbl c="Phase"/>
            <select style={inp} value={a.phase||""} disabled={locked} onChange={e=>updateActivity(i,"phase",e.target.value)}>
              <option value="">Select phase...</option>
              {PHASES.map(p=><option key={p} value={p} style={{background:C.surface2}}>{p}</option>)}
            </select>
          </div>
          <div><Lbl c="Responsible"/>
            <select style={inp} value={a.responsible||""} disabled={locked} onChange={e=>updateActivity(i,"responsible",e.target.value)}>
              <option value="">Select...</option>
              {teamOptions.map(r=><option key={r} value={r} style={{background:C.surface2}}>{r}</option>)}
            </select>
          </div>
          {!locked&&<button onClick={()=>removeActivity(i)} style={{background:"none",border:"none",color:C.risk,cursor:"pointer",fontSize:14,paddingBottom:4}}>✕</button>}
        </div>
      ))}
      {!locked&&<button onClick={addActivity} style={{padding:"7px 14px",background:"none",border:`1px dashed ${C.border}`,borderRadius:6,color:C.dim,fontSize:12,cursor:"pointer",width:"100%",marginBottom:20}}>+ Add Activity</button>}

      <Section title="Milestones" count={data.milestones?.length||0}/>
      {milestones.length===0&&<div style={{color:C.muted,fontSize:12,marginBottom:12}}>No milestones yet.</div>}
      {milestones.map((m,i)=>(
        <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.milestone}`,borderRadius:7,padding:"10px 12px",marginBottom:8,display:"grid",gridTemplateColumns:"90px 1fr 1fr 140px 28px",gap:8,alignItems:"end"}}>
          <div><Lbl c="ID"/><div style={{fontFamily:"monospace",fontSize:11,color:C.milestone,padding:"7px 0"}}>{m._id}</div></div>
          <div><Lbl c="Milestone Name"/><input style={inp} value={m.name||""} disabled={locked} onChange={e=>updateMilestone(i,"name",e.target.value)} placeholder="Milestone name"/></div>
          <div><Lbl c="Phase"/>
            <select style={inp} value={m.phase||""} disabled={locked} onChange={e=>updateMilestone(i,"phase",e.target.value)}>
              <option value="">Select phase...</option>
              {PHASES.map(p=><option key={p} value={p} style={{background:C.surface2}}>{p}</option>)}
            </select>
          </div>
          <div><Lbl c="Target Date"/><input style={inp} type="date" value={m.targetDate||""} disabled={locked} onChange={e=>updateMilestone(i,"targetDate",e.target.value)}/></div>
          {!locked&&<button onClick={()=>removeMilestone(i)} style={{background:"none",border:"none",color:C.risk,cursor:"pointer",fontSize:14,paddingBottom:4}}>✕</button>}
        </div>
      ))}
      {!locked&&<button onClick={addMilestone} style={{padding:"7px 14px",background:"none",border:`1px dashed ${C.border}`,borderRadius:6,color:C.dim,fontSize:12,cursor:"pointer",width:"100%"}}>+ Add Milestone</button>}
    </div>
  );
}
