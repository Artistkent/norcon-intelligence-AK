import { useState } from "react";

const C = { surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66", risk:"#e05c5c", stakeholder:"#9c6ee0" };
const inp = { background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.sage, fontSize:12, padding:"6px 9px", outline:"none", boxSizing:"border-box", fontFamily:"inherit", width:"100%" };
const Lbl = ({c})=><div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>{c}</div>;
const CATEGORIES = ["Sponsor","Professional Body","Education","Industry Partner","Community","Media","Regulator","Funder","End User","Other"];
const STATUSES   = ["Identified","Contacted","Engaged","Active","Lapsed"];

function priorityScore(p,i,inf){ return (((parseInt(p)||5)+(parseInt(inf)||5))/2*(parseInt(i)||5)/10).toFixed(1); }

export default function Sheet08Stakeholders({ data, locked, onUpdate }) {
  const [stakeholders, setStakeholders] = useState(data.stakeholders || []);

  const update = (idx, field, value) => {
    const next = stakeholders.map((s,i)=> i===idx ? {...s,[field]:value} : s);
    setStakeholders(next);
    onUpdate({ stakeholders:next }, 'in-progress');
  };

  const addStakeholder = () => {
    const next = [...stakeholders, { _id:`SH-${String(stakeholders.length+1).padStart(3,"0")}`, name:"", category:"", contact:"", power:5, interest:5, influence:5, ease:5, engagementStrategy:"", status:"Identified" }];
    setStakeholders(next);
    onUpdate({ stakeholders:next }, 'in-progress');
  };

  const removeStakeholder = (idx) => {
    const next = stakeholders.filter((_,i)=>i!==idx);
    setStakeholders(next);
    onUpdate({ stakeholders:next }, 'in-progress');
  };

  const Slider = ({label,value,onChange,disabled}) => (
    <div>
      <Lbl c={`${label} (${value}/10)`}/>
      <input type="range" min="1" max="10" value={value||5} disabled={disabled} onChange={e=>onChange(parseInt(e.target.value))}
        style={{width:"100%",accentColor:C.accent,cursor:disabled?"not-allowed":"pointer"}}/>
    </div>
  );

  return (
    <div style={{maxWidth:900}}>
      <div style={{fontSize:12,color:C.dim,marginBottom:16,lineHeight:1.6}}>
        Score each stakeholder across Power, Interest, Influence and Ease (1–10). Priority Score = ((Power + Influence) ÷ 2) × Interest ÷ 10.
        Note: stakeholders are external organisations and individuals — not team members.
      </div>

      {stakeholders.length===0&&<div style={{color:C.muted,fontSize:12,marginBottom:12}}>No stakeholders identified yet.</div>}

      {stakeholders.map((s,i)=>{
        const ps = priorityScore(s.power,s.interest,s.influence);
        return (
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.stakeholder}`,borderRadius:7,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontFamily:"monospace",fontSize:11,color:C.muted}}>{s._id}</span>
              <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:C.stakeholder+"22",color:C.stakeholder,border:`1px solid ${C.stakeholder}`}}>★ Priority: {ps}</span>
              <span style={{fontSize:10,color:C.muted}}>{s.status}</span>
              {!locked&&<button onClick={()=>removeStakeholder(i)} style={{marginLeft:"auto",background:"none",border:"none",color:C.risk,cursor:"pointer",fontSize:13}}>✕</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <div style={{gridColumn:"1/-1"}}><Lbl c="Organisation / Person"/><input style={inp} value={s.name||""} disabled={locked} onChange={e=>update(i,"name",e.target.value)} placeholder="Organisation or person name"/></div>
              <div><Lbl c="Category"/>
                <select style={inp} value={s.category||""} disabled={locked} onChange={e=>update(i,"category",e.target.value)}>
                  <option value="">Select...</option>
                  {CATEGORIES.map(c=><option key={c} value={c} style={{background:C.surface2}}>{c}</option>)}
                </select>
              </div>
              <div><Lbl c="Contact / Route"/><input style={inp} value={s.contact||""} disabled={locked} onChange={e=>update(i,"contact",e.target.value)} placeholder="Contact name or method"/></div>
              <div><Lbl c="Status"/>
                <select style={inp} value={s.status||"Identified"} disabled={locked} onChange={e=>update(i,"status",e.target.value)}>
                  {STATUSES.map(st=><option key={st} value={st} style={{background:C.surface2}}>{st}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
              {[["Power",s.power,"power"],["Interest",s.interest,"interest"],["Influence",s.influence,"influence"],["Ease",s.ease,"ease"]].map(([l,v,k])=>(
                <Slider key={k} label={l} value={v} disabled={locked} onChange={val=>update(i,k,val)}/>
              ))}
            </div>
            <div><Lbl c="Engagement Strategy"/><input style={inp} value={s.engagementStrategy||""} disabled={locked} onChange={e=>update(i,"engagementStrategy",e.target.value)} placeholder="How will this stakeholder be engaged?"/></div>
          </div>
        );
      })}
      {!locked&&<button onClick={addStakeholder} style={{padding:"7px 14px",background:"none",border:`1px dashed ${C.border}`,borderRadius:6,color:C.dim,fontSize:12,cursor:"pointer",width:"100%"}}>+ Add Stakeholder</button>}
    </div>
  );
}
