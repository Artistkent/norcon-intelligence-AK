import { useState } from "react";

const C = { surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66", risk:"#e05c5c" };
const RACI_COLORS = { R:"#e05c5c", A:"#e0a23a", C:"#3a9ce0", I:"#9c6ee0", "":"" };
const RACI_OPTS = ["","R","A","C","I"];

export default function Sheet04RACI({ data, locked, loginCodes, allSheets, onUpdate }) {
  // Build rows from schedule activities
  const scheduleData = allSheets?.["03"]?.data || {};
  const activities = scheduleData.activities || [];
  const milestones = scheduleData.milestones || [];
  const allTasks = [
    ...activities.map(a=>({id:a._id, label:a.name||a._id, phase:a.phase, type:"activity"})),
    ...milestones.map(m=>({id:m._id, label:m.name||m._id, phase:m.phase, type:"milestone"})),
  ];

  const [matrix, setMatrix] = useState(() => {
    if (data.raciRows && data.raciRows.length > 0) return data.raciRows;
    return allTasks.map(t => ({ taskId:t.id, label:t.label, phase:t.phase, type:t.type, assignments:{} }));
  });

  const [customRows, setCustomRows] = useState(data.customRows || []);

  const allRows = [...matrix, ...customRows];

  const setCell = (rowIdx, code, value) => {
    const isCustom = rowIdx >= matrix.length;
    if (isCustom) {
      const next = customRows.map((r,i)=> i===(rowIdx-matrix.length) ? {...r, assignments:{...r.assignments,[code]:value}} : r);
      setCustomRows(next);
      onUpdate({ raciRows:matrix, customRows:next }, 'in-progress');
    } else {
      const next = matrix.map((r,i)=> i===rowIdx ? {...r, assignments:{...r.assignments,[code]:value}} : r);
      setMatrix(next);
      onUpdate({ raciRows:next, customRows }, 'in-progress');
    }
  };

  const addRow = () => {
    const next = [...customRows, { taskId:`TASK-${Date.now()}`, label:"", phase:"", type:"activity", assignments:{} }];
    setCustomRows(next);
    onUpdate({ raciRows:matrix, customRows:next }, 'in-progress');
  };

  const updateRowLabel = (rowIdx, value) => {
    const isCustom = rowIdx >= matrix.length;
    if (isCustom) {
      const next = customRows.map((r,i)=> i===(rowIdx-matrix.length) ? {...r,label:value} : r);
      setCustomRows(next);
      onUpdate({ raciRows:matrix, customRows:next }, 'in-progress');
    }
  };

  const members = loginCodes.filter(lc=>lc.name&&lc.role);

  return (
    <div style={{maxWidth:"100%"}}>
      {/* Legend */}
      <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
        {[["R","Responsible — does the work"],["A","Accountable — owns the outcome"],["C","Consulted — provides input"],["I","Informed — notified of outcome"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.dim}}>
            <div style={{width:20,height:20,borderRadius:4,background:RACI_COLORS[k]+"33",border:`1px solid ${RACI_COLORS[k]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:RACI_COLORS[k]}}>{k}</div>
            {v}
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"12px 16px",marginBottom:16,fontSize:12,color:C.muted}}>
          ⚠️ Complete Sheet 02 (Team) first to populate team member columns.
        </div>
      )}

      {allTasks.length === 0 && matrix.length === 0 && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"12px 16px",marginBottom:16,fontSize:12,color:C.muted}}>
          ⚠️ Complete Sheet 03 (Schedule) first to populate activity rows, or add rows manually below.
        </div>
      )}

      {/* RACI table */}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:C.surface2}}>
              <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",borderBottom:`1px solid ${C.border}`,minWidth:60}}>ID</th>
              <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",borderBottom:`1px solid ${C.border}`,minWidth:200}}>Task / Activity</th>
              <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",borderBottom:`1px solid ${C.border}`,minWidth:80}}>Phase</th>
              {members.map(m=>(
                <th key={m.loginCode} style={{padding:"8px 8px",textAlign:"center",fontWeight:700,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".4px",borderBottom:`1px solid ${C.border}`,minWidth:70}}>
                  <div style={{color:C.accentL,fontFamily:"monospace",fontSize:9}}>{m.loginCode}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2,fontWeight:400}}>{m.name?.split(" ")[0]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((row,rowIdx)=>(
              <tr key={row.taskId||rowIdx} style={{borderBottom:`1px solid ${C.border}`,background:rowIdx%2===0?C.surface:"transparent"}}>
                <td style={{padding:"6px 10px",fontFamily:"monospace",fontSize:10,color:C.muted}}>{row.taskId}</td>
                <td style={{padding:"6px 10px"}}>
                  {rowIdx >= matrix.length ? (
                    <input value={row.label||""} disabled={locked} onChange={e=>updateRowLabel(rowIdx,e.target.value)}
                      style={{background:"transparent",border:"none",color:C.sage,fontSize:12,outline:"none",width:"100%",fontFamily:"inherit"}} placeholder="Enter task..."/>
                  ) : (
                    <span style={{color:C.sage}}>{row.label}</span>
                  )}
                </td>
                <td style={{padding:"6px 10px",color:C.dim,fontSize:11}}>{row.phase||"—"}</td>
                {members.map(m=>{
                  const val = row.assignments?.[m.loginCode]||"";
                  return (
                    <td key={m.loginCode} style={{padding:"4px 8px",textAlign:"center"}}>
                      <select value={val} disabled={locked} onChange={e=>setCell(rowIdx,m.loginCode,e.target.value)}
                        style={{background:val?RACI_COLORS[val]+"22":"transparent",border:`1px solid ${val?RACI_COLORS[val]:C.border}`,borderRadius:4,color:val?RACI_COLORS[val]:C.muted,fontSize:11,fontWeight:700,padding:"3px 4px",outline:"none",cursor:locked?"not-allowed":"pointer",width:50,textAlign:"center"}}>
                        {RACI_OPTS.map(o=><option key={o} value={o} style={{background:C.surface2,color:C.sage}}>{o||"—"}</option>)}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!locked&&<button onClick={addRow} style={{padding:"7px 14px",background:"none",border:`1px dashed ${C.border}`,borderRadius:6,color:C.dim,fontSize:12,cursor:"pointer",width:"100%",marginTop:8}}>+ Add Row</button>}
    </div>
  );
}
