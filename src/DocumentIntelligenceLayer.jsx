import { useState, useRef } from "react";
import mammoth from "mammoth";

// ── Brand tokens ────────────────────────────────────────────────────────────
const C = {
  bg:"#0D2B1B", surface:"#122E1E", surface2:"#183D28", border:"#1F4D34",
  accent:"#2E7D52", accentL:"#3a9962",
  sage:"#E5F0E8", sageDim:"#b8d4c0", dim:"#8aac96", muted:"#5a7a66",
  risk:"#e05c5c", milestone:"#e0a23a", deliverable:"#3a9ce0",
  stakeholder:"#9c6ee0", activity:"#3ae0a2", issue:"#e06e3a",
};

// ── Element type config ─────────────────────────────────────────────────────
const TYPES = {
  risk:        { label:"Risk",        icon:"⚠️",  color:"#e05c5c", prefix:"R",   start:101 },
  stakeholder: { label:"Stakeholder", icon:"👤",  color:"#9c6ee0", prefix:"SH",  start:1   },
  deliverable: { label:"Deliverable", icon:"📦",  color:"#3a9ce0", prefix:"D",   start:1   },
  activity:    { label:"Activity",    icon:"⚙️",  color:"#3ae0a2", prefix:"ACT", start:1   },
  milestone:   { label:"Milestone",   icon:"🏁",  color:"#e0a23a", prefix:"MS",  start:1   },
  issue:       { label:"Issue",       icon:"🚨",  color:"#e06e3a", prefix:"I",   start:101 },
  constraint:  { label:"Constraint",  icon:"🔒",  color:"#c0a0ff", prefix:"CON", start:1   },
};

const VIEW_TABS = ["all","charter","risk","stakeholder","deliverable","activity","milestone","issue","constraint"];
const STAGES    = ["ingest","analyse","classify","map","review"];
const GOV_TIERS = ["Tier 1 — Sponsor","Tier 2 — Mentor / Assessor","Tier 3 — Project Manager","Tier 4 — Project Team"];

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function fmtBytes(b){ if(b<1024)return b+"B"; if(b<1048576)return(b/1024).toFixed(1)+"KB"; return(b/1048576).toFixed(1)+"MB"; }
function csvLine(arr){ return arr.map(v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`).join(","); }

// ── Sub-components ──────────────────────────────────────────────────────────
function Pill({ children, color, bg }){
  return <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:20, border:`1px solid ${color||C.border}`, color:color||C.dim, background:bg||"transparent" }}>{children}</span>;
}

function Field({ label, value }){
  return (
    <div style={{ display:"flex", gap:6, marginBottom:3, fontSize:11 }}>
      <span style={{ color:C.muted, fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:".3px", whiteSpace:"nowrap", minWidth:90, flexShrink:0 }}>{label}</span>
      <span style={{ color:C.dim, lineHeight:1.4 }}>{value||"—"}</span>
    </div>
  );
}

function GovBadge({ tier }){
  const colors = ["#e05c5c","#e0a23a","#3a9ce0","#3ae0a2"];
  const idx = GOV_TIERS.indexOf(tier);
  const col = colors[idx] || C.muted;
  return <Pill color={col}>{tier||"Unassigned"}</Pill>;
}

function StatusBadge({ status }){
  const map = { Draft:C.muted, "Pending Review":C.milestone, Accepted:C.activity, Rejected:C.risk };
  return <Pill color={map[status]||C.muted}>{status||"Draft"}</Pill>;
}

function ElementCard({ el, onStateChange }){
  const t = TYPES[el.type] || {};
  const stateColor = el._state==="accepted" ? C.activity : el._state==="rejected" ? C.risk : C.border;
  const stateBg    = el._state==="accepted" ? "rgba(58,224,162,0.04)" : "transparent";

  return (
    <div style={{ background:C.surface, border:`1px solid ${el._state!=="pending" ? stateColor : C.border}`, borderRadius:8, padding:"12px 14px", marginBottom:8, display:"flex", gap:10, alignItems:"flex-start", opacity:el._state==="rejected"?.3:1, background:stateBg, transition:"all .2s" }}>
      
      {/* Left colour strip */}
      <div style={{ width:3, borderRadius:2, background:t.color||C.accent, alignSelf:"stretch", flexShrink:0 }}/>

      <div style={{ flex:1, minWidth:0 }}>
        {/* ID + type row */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5, flexWrap:"wrap" }}>
          <span style={{ fontFamily:"monospace", fontSize:10, color:C.muted }}>{el._id}</span>
          <Pill color={t.color}>{t.icon} {t.label}</Pill>
          <StatusBadge status={el._state==="accepted"?"Accepted":el._state==="rejected"?"Rejected":"Draft"}/>
          <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:9, color:C.muted }}>V{el._version||1}</span>
        </div>

        {/* Name */}
        <div style={{ fontSize:13, fontWeight:700, color:C.sage, marginBottom:6 }}>{el.name||el.description||"—"}</div>

        {/* Core fields */}
        {el.description && el.name && <Field label="Description" value={el.description}/>}
        {el.cause        && <Field label="Cause"        value={el.cause}/>}
        {el.potentialImpact && <Field label="Impact"    value={el.potentialImpact}/>}
        {el.mitigation   && <Field label="Mitigation"   value={el.mitigation}/>}
        {el.engagementStrategy && <Field label="Strategy" value={el.engagementStrategy}/>}
        {el.successCriterion   && <Field label="KPI"    value={el.successCriterion}/>}
        {el.targetDate   && <Field label="Target Date"  value={el.targetDate}/>}
        {el.riskIfBreached && <Field label="Risk if Breached" value={el.riskIfBreached}/>}
        {el.phase        && <Field label="Phase"        value={el.phase}/>}
        {el.source       && <Field label="Source"       value={el.source}/>}

        {/* Governance metadata row */}
        <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}`, display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".4px" }}>Governance</span>
          <Pill color={C.accentL}>Owner: {el._suggestedOwner||"TBC"}</Pill>
          <Pill color="#b8d4c0">Approver: {el._suggestedApprover||"TBC"}</Pill>
          <GovBadge tier={el._governanceTier}/>
          {el.priority && <Pill color={el.priority==="high"||el.priority==="High"?C.risk:el.priority==="low"||el.priority==="Low"?C.activity:C.milestone}>{el.priority}</Pill>}
          {el.likelihood && <Pill>L:{el.likelihood}</Pill>}
          {el.impact && <Pill>I:{el.impact}</Pill>}
          {el.likelihood && el.impact && <Pill color={(parseInt(el.likelihood)||1)*(parseInt(el.impact)||1)>=9?C.risk:(parseInt(el.likelihood)||1)*(parseInt(el.impact)||1)>=4?C.milestone:C.activity}>Score:{(parseInt(el.likelihood)||1)*(parseInt(el.impact)||1)}</Pill>}
          {el.power && <Pill>Power:{el.power}</Pill>}
          {el.interest && <Pill>Interest:{el.interest}</Pill>}
          {el.influence && <Pill>Influence:{el.influence}</Pill>}
          {el.power && el.interest && el.influence && <Pill color={C.stakeholder}>★ {(((parseInt(el.power)||5)+(parseInt(el.influence)||5))/2*(parseInt(el.interest)||5)/10).toFixed(1)}</Pill>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
        <button title="Accept" onClick={()=>onStateChange(el._id, el._state==="accepted"?"pending":"accepted")}
          style={{ width:28, height:28, borderRadius:5, border:`1px solid ${el._state==="accepted"?C.activity:C.border}`, background:el._state==="accepted"?"rgba(58,224,162,0.15)":"none", cursor:"pointer", fontSize:13, color:el._state==="accepted"?C.activity:C.muted }}>✓</button>
        <button title="Reject" onClick={()=>onStateChange(el._id, el._state==="rejected"?"pending":"rejected")}
          style={{ width:28, height:28, borderRadius:5, border:`1px solid ${el._state==="rejected"?C.risk:C.border}`, background:el._state==="rejected"?"rgba(224,92,92,0.15)":"none", cursor:"pointer", fontSize:13, color:el._state==="rejected"?C.risk:C.muted }}>✕</button>
      </div>
    </div>
  );
}

function CharterPanel({ charter }){
  const c = charter||{};
  const F = ({label,value,full})=>(
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"10px 12px", gridColumn:full?"1/-1":undefined }}>
      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px", color:C.muted, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:12, color:(value&&value!=="null")?C.sage:C.muted, fontStyle:(!value||value==="null")?"italic":"normal", lineHeight:1.5, whiteSpace:"pre-line" }}>
        {(value&&value!=="null")?value:"Not found in document"}
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <F label="Project Name"    value={c.projectName}/>
        <F label="Project Code"    value={c.projectCode}/>
        <F label="Project Manager" value={c.projectManager}/>
        <F label="Project Sponsor" value={c.projectSponsor}/>
        <F label="Organisation"    value={c.organisation}/>
        <F label="Start Date"      value={c.startDate}/>
        <F label="End Date"        value={c.endDate}/>
        <F label="Budget"          value={c.budget}/>
        <F label="Purpose"         value={c.purpose}         full/>
        <F label="Problem Statement"   value={c.problemStatement}   full/>
        <F label="Strategic Alignment" value={c.strategicAlignment} full/>
        {(c.withinScope||[]).length>0 && <F label="Within Scope"  value={(c.withinScope||[]).map((s,i)=>`${i+1}. ${s}`).join("\n")} full/>}
        {(c.outOfScope||[]).length>0  && <F label="Out of Scope"  value={(c.outOfScope||[]).map((s,i)=>`${i+1}. ${s}`).join("\n")} full/>}
      </div>
      {(c.objectives||[]).length>0 && <>
        <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:".8px", color:C.muted, padding:"6px 0", borderBottom:`1px solid ${C.border}`, marginBottom:8 }}>Objectives & Success Criteria</div>
        {c.objectives.map((o,i)=>(
          <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:"11px 13px", marginBottom:8 }}>
            <div style={{ fontFamily:"monospace", fontSize:9, color:C.muted, marginBottom:3 }}>OBJ-{String(i+1).padStart(3,"0")}</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.sage, marginBottom:4 }}>{o.objective||"—"}</div>
            <Field label="Success KPI" value={o.successCriterion}/>
            {o.targetDate && <Field label="Target Date" value={o.targetDate}/>}
          </div>
        ))}
      </>}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function DocumentIntelligenceLayer(){
  const [inputTab,  setInputTab]  = useState("upload");
  const [viewTab,   setViewTab]   = useState("all");
  const [file,      setFile]      = useState(null);
  const [pasteText, setPasteText] = useState("");
  const [projName,  setProjName]  = useState("");
  const [docType,   setDocType]   = useState("auto");
  const [loading,   setLoading]   = useState(false);
  const [stage,     setStage]     = useState(null);
  const [loadMsg,   setLoadMsg]   = useState("");
  const [charter,   setCharter]   = useState(null);
  const [elements,  setElements]  = useState([]);   // flat Project Element list
  const [toast,     setToast]     = useState(null);
  const [dragover,  setDragover]  = useState(false);
  const fileRef = useRef();

  const isReady = (inputTab==="upload"&&file)||(inputTab==="paste"&&pasteText.trim().length>20);

  const showToast = msg=>{ setToast(msg); setTimeout(()=>setToast(null),5000); };

  // Update a single element's state
  const handleStateChange = (id, newState)=>{
    setElements(prev=>prev.map(el=>el._id===id ? {...el, _state:newState} : el));
  };

  // Filtered elements for current view tab
  const visibleElements = viewTab==="all"||viewTab==="charter"
    ? elements
    : elements.filter(el=>el.type===viewTab);

  const stats = {
    total:    elements.length,
    accepted: elements.filter(e=>e._state==="accepted").length,
    rejected: elements.filter(e=>e._state==="rejected").length,
    pending:  elements.filter(e=>e._state==="pending").length,
  };

  const tabCount = tab=>{
    if(tab==="all")     return elements.length;
    if(tab==="charter") return charter ? "✓" : "—";
    return elements.filter(e=>e.type===tab).length;
  };

  // ── Stage animation ─────────────────────────────────────────────────────
  const setS = (s,msg)=>{ setStage(s); setLoadMsg(msg||""); };

  // ── Main extraction ─────────────────────────────────────────────────────
  const runAnalysis = async()=>{
    setLoading(true); setS("ingest","Reading document...");

    // Extract text
    let docText = "";
    if(inputTab==="upload"){
      const ext = file.name.split(".").pop().toLowerCase();
      try{
        if(ext==="docx"||ext==="doc"){
          const ab = await file.arrayBuffer();
          const r  = await mammoth.extractRawText({arrayBuffer:ab});
          docText  = r.value;
        } else {
          docText = await file.text();
        }
      } catch(e){
        setLoading(false); setStage(null);
        showToast("Could not read file: "+e.message);
        return;
      }
      if(!docText||docText.trim().length<10){
        setLoading(false); setStage(null);
        showToast("No readable text found. Try pasting the text directly.");
        return;
      }
    } else {
      docText = pasteText.trim();
    }

    await sleep(500); setS("analyse","Analysing project context...");
    await sleep(600); setS("classify","Classifying project elements...");
    await sleep(400); setS("map","Mapping elements to registers...");

    const maxDoc  = docText.length>15000 ? docText.slice(0,15000)+"\n[... truncated ...]" : docText;
    const hint    = docType!=="auto" ? `Document type: ${docType}. ` : "";
    const pn      = projName ? `Project name: "${projName}". ` : "";

    const prompt = `You are the Document Intelligence Engine for NorCon Projects — a governance-driven project operating system.

${pn}${hint}

ARCHITECTURE: Extract data in two parts:
1. CHARTER — project-level information
2. PROJECT ELEMENTS — every identifiable element, each created as a governed object

Every Project Element must include governance metadata:
- _suggestedOwner: the role most logically responsible (e.g. "Project Manager", "Risk Owner", "Procurement Lead", "Design Lead")
- _suggestedApprover: the role who should approve this element (e.g. "Project Sponsor", "Project Manager", "Mentor")
- _governanceTier: one of ["Tier 1 — Sponsor", "Tier 2 — Mentor / Assessor", "Tier 3 — Project Manager", "Tier 4 — Project Team"]
- _version: always 1 for newly extracted elements
- _status: always "Draft"

Return ONLY valid JSON, no markdown, no backticks, no explanation:

{
  "charter": {
    "projectName": null,
    "projectCode": null,
    "purpose": null,
    "problemStatement": null,
    "strategicAlignment": null,
    "withinScope": [],
    "outOfScope": [],
    "objectives": [{"objective":"","successCriterion":"","targetDate":null}],
    "startDate": null,
    "endDate": null,
    "budget": null,
    "projectManager": null,
    "projectSponsor": null,
    "organisation": null,
    "documentSummary": ""
  },
  "elements": [
    {
      "_id": "R-101",
      "_version": 1,
      "_status": "Draft",
      "_suggestedOwner": "Risk Owner",
      "_suggestedApprover": "Project Manager",
      "_governanceTier": "Tier 3 — Project Manager",
      "type": "risk",
      "name": "Risk name",
      "cause": "What triggers this risk",
      "potentialImpact": "Consequence if it occurs",
      "likelihood": "1 - Low",
      "impact": "1 - Low",
      "mitigation": "Response strategy",
      "response": "Avoid",
      "category": "one of: Planning & Coordination | Financial | Technical | Stakeholder Management | External | Team Dynamics | Data & Analysis",
      "source": "Where found in document"
    },
    {
      "_id": "SH-001",
      "_version": 1,
      "_status": "Draft",
      "_suggestedOwner": "Communications Lead",
      "_suggestedApprover": "Project Manager",
      "_governanceTier": "Tier 3 — Project Manager",
      "type": "stakeholder",
      "name": "Organisation or person name",
      "category": "Sponsor | Internal Team | Professional Body | Education | Industry Partner | Community | Media | Regulator | Funder | End User",
      "contact": "Contact name or method",
      "power": 5,
      "interest": 5,
      "influence": 5,
      "ease": 5,
      "engagementStrategy": "How to engage",
      "source": "Where found"
    },
    {
      "_id": "D-001",
      "_version": 1,
      "_status": "Draft",
      "_suggestedOwner": "Project Manager",
      "_suggestedApprover": "Project Sponsor",
      "_governanceTier": "Tier 1 — Sponsor",
      "type": "deliverable",
      "name": "Deliverable name",
      "description": "What this deliverable is",
      "phase": "Phase name",
      "priority": "high | medium | low",
      "source": "Where found"
    },
    {
      "_id": "ACT-001",
      "_version": 1,
      "_status": "Draft",
      "_suggestedOwner": "Team Member",
      "_suggestedApprover": "Project Manager",
      "_governanceTier": "Tier 4 — Project Team",
      "type": "activity",
      "name": "Activity name",
      "description": "What this involves",
      "phase": "Phase name",
      "responsible": "Role",
      "source": "Where found"
    },
    {
      "_id": "MS-001",
      "_version": 1,
      "_status": "Draft",
      "_suggestedOwner": "Project Manager",
      "_suggestedApprover": "Project Sponsor",
      "_governanceTier": "Tier 1 — Sponsor",
      "type": "milestone",
      "name": "Milestone name",
      "description": "What this marks",
      "targetDate": null,
      "phase": "Phase name",
      "source": "Where found"
    },
    {
      "_id": "I-101",
      "_version": 1,
      "_status": "Draft",
      "_suggestedOwner": "Project Manager",
      "_suggestedApprover": "Project Manager",
      "_governanceTier": "Tier 3 — Project Manager",
      "type": "issue",
      "description": "Issue description",
      "impact": "Impact on project",
      "priority": "High | Medium | Low",
      "source": "Where found"
    },
    {
      "_id": "CON-001",
      "_version": 1,
      "_status": "Draft",
      "_suggestedOwner": "Project Manager",
      "_suggestedApprover": "Project Sponsor",
      "_governanceTier": "Tier 3 — Project Manager",
      "type": "constraint",
      "constraintType": "Constraint | Assumption | Dependency",
      "description": "Detail",
      "riskIfBreached": "What happens if breached",
      "owner": "Role",
      "source": "Where found"
    }
  ]
}

ID numbering: R-101,R-102... | I-101,I-102... | SH-001,SH-002... | D-001,D-002... | ACT-001,ACT-002... | MS-001,MS-002... | CON-001,CON-002...
likelihood/impact must be exactly: "1 - Low" | "2 - Medium" | "3 - High"
Extract only what is genuinely present. Use empty arrays for registers with nothing found.
Assign governance metadata thoughtfully — the suggested owner and approver should reflect the real governance hierarchy.

DOCUMENT:
${maxDoc}`;

    try{
      const res = await fetch("/api/extract",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6", max_tokens:16000, messages:[{role:"user",content:prompt}]})
      });

      if(!res.ok){ const t=await res.text(); throw new Error(`API ${res.status}: ${t.slice(0,200)}`); }

      const data = await res.json();
      const raw  = (data.content||[]).map(b=>b.text||"").join("");
      const clean = raw.replace(/^```[a-z]*\n?/,"").replace(/```$/,"").trim();
      const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
      if(s===-1||e===-1) throw new Error("No JSON in response: "+raw.slice(0,300));
      const parsed = JSON.parse(clean.slice(s,e+1));

      // Add _state to every element
      const els = (parsed.elements||[]).map(el=>({...el, _state:"pending"}));

      setCharter(parsed.charter||null);
      setElements(els);
      setStage("review");
      setLoading(false);

    } catch(err){
      setLoading(false); setStage(null);
      showToast("Error: "+err.message);
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const exportRegister = ()=>{
    const lines = [];
    const accepted = elements.filter(e=>e._state!=="rejected");

    // Charter
    const c = charter||{};
    lines.push("PROJECT ELEMENT REGISTER — LAYER 1 OUTPUT");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("CHARTER");
    lines.push(csvLine(["Field","Value"]));
    [["Project Name",c.projectName],["Project Code",c.projectCode],["Purpose",c.purpose],
     ["Problem Statement",c.problemStatement],["Strategic Alignment",c.strategicAlignment],
     ["Start Date",c.startDate],["End Date",c.endDate],["Budget",c.budget],
     ["Project Manager",c.projectManager],["Project Sponsor",c.projectSponsor],["Organisation",c.organisation]]
      .forEach(([k,v])=>lines.push(csvLine([k,v||""])));
    lines.push("");

    if((c.objectives||[]).length){
      lines.push("OBJECTIVES");
      lines.push(csvLine(["#","Objective","Success Criterion","Target Date"]));
      c.objectives.forEach((o,i)=>lines.push(csvLine([i+1,o.objective,o.successCriterion,o.targetDate||""])));
      lines.push("");
    }

    // Project Elements — unified register
    lines.push("PROJECT ELEMENTS");
    lines.push(csvLine(["Element ID","Type","Name / Description","Version","Status","Suggested Owner","Suggested Approver","Governance Tier","Phase","Priority","Source","Additional Fields"]));
    accepted.forEach(el=>{
      const extra = [];
      if(el.cause)            extra.push(`Cause: ${el.cause}`);
      if(el.potentialImpact)  extra.push(`Impact: ${el.potentialImpact}`);
      if(el.mitigation)       extra.push(`Mitigation: ${el.mitigation}`);
      if(el.likelihood)       extra.push(`Likelihood: ${el.likelihood}`);
      if(el.impact)           extra.push(`Risk Impact: ${el.impact}`);
      if(el.response)         extra.push(`Response: ${el.response}`);
      if(el.category)         extra.push(`Category: ${el.category}`);
      if(el.power)            extra.push(`Power: ${el.power}`);
      if(el.interest)         extra.push(`Interest: ${el.interest}`);
      if(el.influence)        extra.push(`Influence: ${el.influence}`);
      if(el.ease)             extra.push(`Ease: ${el.ease}`);
      if(el.engagementStrategy) extra.push(`Strategy: ${el.engagementStrategy}`);
      if(el.targetDate)       extra.push(`Target Date: ${el.targetDate}`);
      if(el.responsible)      extra.push(`Responsible: ${el.responsible}`);
      if(el.riskIfBreached)   extra.push(`Risk if Breached: ${el.riskIfBreached}`);
      if(el.constraintType)   extra.push(`Type: ${el.constraintType}`);
      lines.push(csvLine([
        el._id, el.type, el.name||el.description||"",
        el._version||1, el._status||"Draft",
        el._suggestedOwner||"", el._suggestedApprover||"",
        el._governanceTier||"", el.phase||"", el.priority||"",
        el.source||"", extra.join(" | ")
      ]));
    });

    const blob = new Blob([lines.join("\n")],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`NorCon_ProjectElements_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const stageIdx = STAGES.indexOf(stage);

  return (
    <div style={{ background:C.bg, color:C.sage, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize:13, minHeight:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <div style={{ width:28, height:28, background:C.accent, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🧠</div>
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>Document Intelligence Engine</div>
          <div style={{ fontSize:11, color:C.muted }}>Layer 1 — Extracts governed Project Elements for the Personalisation Layer</div>
        </div>
        <span style={{ marginLeft:"auto", background:C.accent, color:"#fff", fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20, textTransform:"uppercase", letterSpacing:".5px" }}>Layer 1</span>
      </div>

      {/* Pipeline */}
      <div style={{ background:C.surface2, borderBottom:`1px solid ${C.border}`, padding:"7px 20px", display:"flex", alignItems:"center", gap:4, flexShrink:0, overflowX:"auto" }}>
        {STAGES.map((s,i)=>{
          const active = stage===s;
          const done   = stageIdx>i && stage!==null;
          return (
            <div key={s} style={{ display:"flex", alignItems:"center" }}>
              {i>0 && <span style={{ color:C.border, fontSize:14, padding:"0 2px" }}>›</span>}
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, fontWeight:700, color:done?C.sageDim:active?C.accentL:C.muted, background:active?"rgba(46,125,82,0.15)":"transparent", padding:"3px 8px", borderRadius:4, whiteSpace:"nowrap", transition:"all .3s", textTransform:"uppercase", letterSpacing:".5px" }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"currentColor" }}/>
                {s==="map"?"Map to Elements":s==="review"?"Review & Approve":s.charAt(0).toUpperCase()+s.slice(1)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", position:"relative" }}>

        {/* Loading overlay */}
        {loading && (
          <div style={{ position:"absolute", inset:0, background:"rgba(13,43,27,0.93)", zIndex:20, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
            <div style={{ width:26, height:26, border:`2px solid ${C.border}`, borderTopColor:C.accentL, borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {["ingest","analyse","classify","map"].map((s,i)=>(
                <div key={s} style={{ display:"flex", alignItems:"center" }}>
                  {i>0 && <span style={{ color:C.border, fontSize:14 }}>›</span>}
                  <div style={{ padding:"5px 12px", borderRadius:4, border:`1px solid ${stage===s?C.accentL:C.border}`, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px", color:stage===s?C.accentL:C.muted, background:stage===s?"rgba(46,125,82,0.2)":"transparent", boxShadow:stage===s?"0 0 10px rgba(46,125,82,0.3)":"none", transition:"all .4s" }}>{s}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:C.dim }}>{loadMsg}</div>
          </div>
        )}

        {/* LEFT — Input */}
        <div style={{ width:290, minWidth:260, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:"10px 14px 8px", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:".8px", borderBottom:`1px solid ${C.border}` }}>Document Input</div>

          {/* Input tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
            {["upload","paste"].map(t=>(
              <button key={t} onClick={()=>setInputTab(t)} style={{ flex:1, padding:"7px 4px", fontSize:10, fontWeight:700, color:inputTab===t?C.accentL:C.muted, background:"none", border:"none", cursor:"pointer", borderBottom:inputTab===t?`2px solid ${C.accentL}`:"2px solid transparent", textTransform:"uppercase", letterSpacing:".4px" }}>
                {t==="upload"?"📎 Upload":"📋 Paste"}
              </button>
            ))}
          </div>

          {inputTab==="upload" ? (
            <div style={{ display:"flex", flex:1, flexDirection:"column", padding:14, overflowY:"auto", gap:10 }}>
              {file ? (
                <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:6, padding:10, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18 }}>{file.name.endsWith(".pdf")?"📕":file.name.endsWith(".docx")||file.name.endsWith(".doc")?"📘":"📄"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, color:C.sage, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontSize:12 }}>{file.name}</div>
                    <div style={{ color:C.muted, fontSize:10 }}>{fmtBytes(file.size)}</div>
                  </div>
                  <button onClick={()=>setFile(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14 }}>✕</button>
                </div>
              ) : (
                <div style={{ border:`2px dashed ${dragover?C.accent:C.border}`, borderRadius:7, padding:"24px 12px", textAlign:"center", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, background:dragover?"rgba(46,125,82,0.07)":"transparent" }}
                  onClick={()=>fileRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDragover(true)}}
                  onDragLeave={()=>setDragover(false)}
                  onDrop={e=>{e.preventDefault();setDragover(false);const f=e.dataTransfer.files[0];if(f)setFile(f)}}>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display:"none" }} onChange={e=>{ if(e.target.files[0]) setFile(e.target.files[0]); }}/>
                  <div style={{ fontSize:28, opacity:.6 }}>📂</div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.sageDim }}>Drop project document</div>
                  <div style={{ fontSize:10, color:C.muted }}>or click to browse</div>
                  <div style={{ display:"flex", gap:4 }}>{[".PDF",".DOCX",".TXT"].map(t=><span key={t} style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:3, border:`1px solid ${C.border}`, color:C.muted, fontFamily:"monospace" }}>{t}</span>)}</div>
                </div>
              )}
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:C.dim, display:"block", marginBottom:4 }}>Project Name (optional)</label>
                <input style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.sage, fontSize:11, padding:"7px 9px", outline:"none", boxSizing:"border-box" }} value={projName} onChange={e=>setProjName(e.target.value)} placeholder="e.g. Waterfront Phase 2"/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:C.dim, display:"block", marginBottom:4 }}>Document Type</label>
                <select style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.sage, fontSize:11, padding:"7px 9px", outline:"none", boxSizing:"border-box" }} value={docType} onChange={e=>setDocType(e.target.value)}>
                  {["auto","brief","contract","scope","specification","schedule","minutes","report"].map(v=><option key={v} value={v} style={{ background:C.surface2 }}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flex:1, flexDirection:"column", padding:14, overflowY:"auto", gap:10 }}>
              <textarea style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:6, color:C.sage, fontSize:11, fontFamily:"monospace", lineHeight:1.6, padding:10, outline:"none", resize:"none", minHeight:180, flex:1, boxSizing:"border-box" }} value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={"Paste project document text here...\n\n• Project brief\n• Contract clauses\n• Scope of works\n• Meeting minutes"}/>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:C.dim, display:"block", marginBottom:4 }}>Project Name (optional)</label>
                <input style={{ width:"100%", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:5, color:C.sage, fontSize:11, padding:"7px 9px", outline:"none", boxSizing:"border-box" }} value={projName} onChange={e=>setProjName(e.target.value)} placeholder="e.g. Waterfront Phase 2"/>
              </div>
            </div>
          )}

          <button onClick={runAnalysis} disabled={!isReady||loading}
            style={{ margin:"12px 14px", padding:10, background:isReady?C.accent:"#1F4D34", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:700, cursor:isReady?"pointer":"not-allowed", opacity:isReady?1:.5, display:"flex", alignItems:"center", justifyContent:"center", gap:7, flexShrink:0 }}>
            ⚡ Extract Project Elements
          </button>
        </div>

        {/* RIGHT — Element Register */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* View tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.surface2, overflowX:"auto", flexShrink:0 }}>
            {VIEW_TABS.map(tab=>{
              const active = viewTab===tab;
              const t = TYPES[tab];
              const count = tabCount(tab);
              return (
                <button key={tab} onClick={()=>setViewTab(tab)} style={{ padding:"8px 12px", fontSize:10, fontWeight:700, color:active?C.sage:C.muted, background:"none", border:"none", cursor:"pointer", borderBottom:active?`2px solid ${C.sage}`:"2px solid transparent", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5, textTransform:"uppercase", letterSpacing:".4px" }}>
                  {tab==="all"?"🗂️ All Elements":tab==="charter"?"📋 Charter":`${t?.icon||""} ${t?.label||tab}`}
                  <span style={{ background:active?C.accent:C.border, color:active?"#fff":C.dim, fontSize:9, padding:"1px 5px", borderRadius:10, fontWeight:700 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div style={{ padding:"8px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8, flexShrink:0, flexWrap:"wrap" }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.sage, flex:1 }}>
              {elements.length>0
                ? viewTab==="charter" ? "Project Charter — Extracted Data"
                : viewTab==="all" ? `Project Element Register — ${elements.length} elements`
                : `${TYPES[viewTab]?.label||viewTab} Register — ${visibleElements.length} element${visibleElements.length!==1?"s":""}`
                : "Project Element Register"}
            </div>
            {elements.length>0 && (
              <div style={{ display:"flex", gap:6, fontSize:10, color:C.muted }}>
                <span>✓ <strong style={{ color:C.activity }}>{stats.accepted}</strong></span>
                <span>⏳ <strong style={{ color:C.sageDim }}>{stats.pending}</strong></span>
                <span>✕ <strong style={{ color:C.risk }}>{stats.rejected}</strong></span>
              </div>
            )}
            <button onClick={exportRegister} disabled={elements.length===0}
              style={{ padding:"5px 12px", background:"none", border:`1px solid ${C.accent}`, borderRadius:4, color:C.accentL, fontSize:10, fontWeight:700, cursor:elements.length>0?"pointer":"not-allowed", opacity:elements.length>0?1:.3, textTransform:"uppercase", letterSpacing:".4px" }}>
              ⬇ Export Register
            </button>
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:"auto", padding:14 }}>
            {elements.length===0 && !charter ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:10, color:C.muted, textAlign:"center", padding:32 }}>
                <div style={{ fontSize:48, opacity:.2 }}>🗂️</div>
                <div style={{ fontSize:15, fontWeight:600, color:C.dim }}>No elements extracted yet</div>
                <div style={{ fontSize:12, maxWidth:320, lineHeight:1.7 }}>Upload or paste a project document. The engine will extract governed Project Elements — each with a unique ID, suggested owner, approver and governance tier — ready for the Personalisation Layer.</div>
              </div>
            ) : viewTab==="charter" ? (
              <CharterPanel charter={charter}/>
            ) : (
              visibleElements.length===0 ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:260, gap:8, color:C.muted, textAlign:"center" }}>
                  <div style={{ fontSize:32, opacity:.25 }}>📭</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.dim }}>No {TYPES[viewTab]?.label||viewTab}s found</div>
                  <div style={{ fontSize:11 }}>None were identified in this document.</div>
                </div>
              ) : (
                visibleElements.map((el,i)=><ElementCard key={el._id||i} el={el} onStateChange={handleStateChange}/>)
              )
            )}
          </div>
        </div>
      </div>

      {toast && <div style={{ position:"fixed", bottom:16, right:16, background:"#2a1515", border:`1px solid ${C.risk}`, borderRadius:6, padding:"10px 14px", fontSize:11, color:"#ff9e9e", maxWidth:340, zIndex:100, lineHeight:1.5 }}>{toast}</div>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
