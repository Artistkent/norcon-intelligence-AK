import { useState } from "react";
import * as XLSX from "xlsx";

const C = { surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", sageDim:"#b8d4c0", dim:"#8aac96", muted:"#5a7a66", risk:"#e05c5c", milestone:"#e0a23a", activity:"#3ae0a2" };

// ── Excel style helpers ────────────────────────────────────────────────────────
const HDR_STYLE    = { fill:{fgColor:{rgb:"0D2B1B"},patternType:"solid"}, font:{color:{rgb:"E5F0E8"},bold:true,sz:11}, alignment:{horizontal:"left",vertical:"center",wrapText:true}, border:{bottom:{style:"thin",color:{rgb:"2E7D52"}}} };
const SUB_HDR_STYLE= { fill:{fgColor:{rgb:"122E1E"},patternType:"solid"}, font:{color:{rgb:"3a9962"},bold:true,sz:10}, alignment:{horizontal:"left",vertical:"center"} };
const ALT_STYLE    = { fill:{fgColor:{rgb:"183D28"},patternType:"solid"}, font:{color:{rgb:"b8d4c0"},sz:10}, alignment:{wrapText:true,vertical:"top"} };
const NORMAL_STYLE = { fill:{fgColor:{rgb:"122E1E"},patternType:"solid"}, font:{color:{rgb:"E5F0E8"},sz:10}, alignment:{wrapText:true,vertical:"top"} };
const RAG_RED      = { fill:{fgColor:{rgb:"2a1515"},patternType:"solid"}, font:{color:{rgb:"e05c5c"},bold:true,sz:10} };
const RAG_AMBER    = { fill:{fgColor:{rgb:"2a2010"},patternType:"solid"}, font:{color:{rgb:"e0a23a"},bold:true,sz:10} };
const RAG_GREEN    = { fill:{fgColor:{rgb:"102a20"},patternType:"solid"}, font:{color:{rgb:"3ae0a2"},bold:true,sz:10} };
const DONE_STYLE   = { fill:{fgColor:{rgb:"102a20"},patternType:"solid"}, font:{color:{rgb:"3ae0a2"},sz:10} };

function ragStyle(l, i) { const s=(parseInt(l)||1)*(parseInt(i)||1); return s>=9?RAG_RED:s>=4?RAG_AMBER:RAG_GREEN; }

function buildSheet(headers, rows, colWidths, ragColFn) {
  const ws = {};
  headers.forEach((h,c) => { ws[XLSX.utils.encode_cell({r:0,c})] = {v:h,t:"s",s:HDR_STYLE}; });
  rows.forEach((row,ri) => {
    const style = ri%2===0 ? NORMAL_STYLE : ALT_STYLE;
    row.forEach((val,c) => {
      const addr = XLSX.utils.encode_cell({r:ri+1,c});
      const cellStyle = ragColFn ? ragColFn(ri,c,val,row)||style : style;
      ws[addr] = {v:val==null?"":String(val),t:"s",s:cellStyle};
    });
  });
  ws["!cols"]   = colWidths.map(w => ({wch:w}));
  ws["!ref"]    = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length,c:headers.length-1}});
  ws["!freeze"] = {xSplit:0,ySplit:1};
  return ws;
}

// ── Build the full project context for AI calls ───────────────────────────────
function buildProjectContext(state, project, charter, activities, milestones, risks, deliverables, stakeholders, teamMembers) {
  const sheets   = state?.l2?.sheets || {};
  const changes  = sheets["06"]?.data?.changes  || [];
  const issues   = sheets["05"]?.data?.issues   || [];
  const sustain  = state?.sustainData?.evidence || [];
  const baseline = state?.baseline;
  const benefits = charter?.benefits || [];

  const doneTasks   = [...activities,...milestones].filter(a=>a._complete).length;
  const totalTasks  = activities.length + milestones.length;
  const pct         = totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0;
  const redRisks    = risks.filter(r=>(parseInt(r.likelihood)||1)*(parseInt(r.impact)||1)>=9).length;
  const ambRisks    = risks.filter(r=>{const s=(parseInt(r.likelihood)||1)*(parseInt(r.impact)||1);return s>=4&&s<9;}).length;
  const openIssues  = issues.filter(i=>i.status!=="Resolved").length;
  const nextMs      = milestones.filter(m=>!m._complete&&m.targetDate).sort((a,b)=>new Date(a.targetDate)-new Date(b.targetDate))[0];
  const overdueActs = activities.filter(a=>!a._complete&&a.targetDate&&new Date(a.targetDate)<new Date()).length;

  // Benefits Realisation Index
  const delsFromState = sheets["07"]?.data?.deliverables || deliverables;
  const briData = benefits.map(b => {
    const objIds = (b.objectives||[]).map(o=>o._id);
    const linked = delsFromState.filter(d=>objIds.includes(d.linkedObjectiveId));
    const kpis   = linked.flatMap(d=>d.kpis||[]).filter(k=>k.target&&k.actual!==undefined&&k.actual!=="");
    const bri    = kpis.length > 0 ? Math.round(kpis.reduce((s,k)=>s+Math.min(100,(parseFloat(k.actual)/parseFloat(k.target))*100),0)/kpis.length) : null;
    return { name: b.name, bri, kpiCount: kpis.length };
  });

  // Sustainability score
  const sustainScore = sustain.length > 0
    ? Math.round((sustain.reduce((s,e)=>s+(e.score||0),0)/sustain.length)*100)
    : null;

  return {
    project: { name:charter?.projectName||project?.name, code:charter?.projectCode||project?.code, manager:charter?.projectManager, sponsor:charter?.projectSponsor, start:charter?.startDate, end:charter?.endDate, budget:charter?.budget, purpose:charter?.purpose, problem:charter?.problemStatement, strategic:charter?.strategicAlignment },
    progress: { pct, doneTasks, totalTasks, overdueActs },
    baseline: baseline ? { confirmedDate:baseline.confirmedDate, version:baseline.version } : null,
    risks: { total:risks.length, red:redRisks, amber:ambRisks, green:risks.length-redRisks-ambRisks, top:risks.slice(0,3).map(r=>({name:r.name,score:(parseInt(r.likelihood)||1)*(parseInt(r.impact)||1),response:r.response})) },
    issues: { total:issues.length, open:openIssues, escalated:issues.filter(i=>i.status==="Escalated").length },
    milestones: { total:milestones.length, complete:milestones.filter(m=>m._complete).length, next:nextMs?{name:nextMs.name,date:nextMs.targetDate}:null, overdue:milestones.filter(m=>!m._complete&&m.targetDate&&new Date(m.targetDate)<new Date()).length },
    changes: { total:changes.length, approved:changes.filter(c=>c.status==="approved").length, pending:changes.filter(c=>c.status==="pending"||c.status==="reviewed").length },
    benefits: briData,
    sustainability: { score:sustainScore, evidenceCount:sustain.length },
    stakeholders: stakeholders.length,
    team: teamMembers.length,
    lessonsLearned: benefits.filter(b=>b.lessonsLearned).map(b=>({benefit:b.name,lessons:b.lessonsLearned})),
  };
}

export default function L3Report({ state, project, charter, activities, milestones, risks, deliverables, stakeholders, teamMembers, raciData, member, baseline, currentPlan }) {
  const [tab,          setTab]          = useState("workbook");
  const [generating,   setGenerating]   = useState(false);
  const [genStep,      setGenStep]      = useState("");
  const [aiSummary,    setAiSummary]    = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportReady,  setReportReady]  = useState(false);

  const sheets  = state?.l2?.sheets || {};
  const changes = sheets["06"]?.data?.changes || [];
  const issues  = sheets["05"]?.data?.issues  || [];
  const sustain = state?.sustainData?.evidence || [];

  const doneTasks   = [...activities,...milestones].filter(a=>a._complete).length;
  const totalTasks  = activities.length + milestones.length;
  const pct         = totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0;
  const redRisks    = risks.filter(r=>(parseInt(r.likelihood)||1)*(parseInt(r.impact)||1)>=9).length;
  const ambRisks    = risks.filter(r=>{const s=(parseInt(r.likelihood)||1)*(parseInt(r.impact)||1);return s>=4&&s<9;}).length;
  const nextMs      = milestones.filter(m=>!m._complete&&m.targetDate).sort((a,b)=>new Date(a.targetDate)-new Date(b.targetDate))[0];

  // ── Generate Excel Workbook ───────────────────────────────────────────────
  const generateWorkbook = async () => {
    setGenerating(true);
    setGenStep("Generating AI executive summary...");
    setAiSummary("");

    const ctx = buildProjectContext(state, project, charter, activities, milestones, risks, deliverables, stakeholders, teamMembers);

    const summaryPrompt = `You are generating an Executive Summary for a project workbook. Write a professional, concise narrative (300-400 words) for the following project. Use plain English suitable for a Project Sponsor. Structure it with these sections: Project Overview, Progress Update, Key Risks & Issues, Benefits Realisation, Upcoming Milestones, Recommendations.

PROJECT: ${ctx.project.name||"Unknown"}
PURPOSE: ${ctx.project.purpose||"Not specified"}
PM: ${ctx.project.manager||"—"} | SPONSOR: ${ctx.project.sponsor||"—"}
DATES: ${ctx.project.start||"TBC"} to ${ctx.project.end||"TBC"} | BUDGET: ${ctx.project.budget||"Not specified"}

PROGRESS: ${ctx.progress.pct}% complete (${ctx.progress.doneTasks} of ${ctx.progress.totalTasks} tasks). ${ctx.progress.overdueActs} tasks overdue.
${ctx.baseline ? `BASELINE: Confirmed ${ctx.baseline.confirmedDate} (v${ctx.baseline.version})` : "BASELINE: Not yet confirmed"}

RISKS: ${ctx.risks.total} total — ${ctx.risks.red} RED, ${ctx.risks.amber} AMBER, ${ctx.risks.green} GREEN
ISSUES: ${ctx.issues.open} open issues (${ctx.issues.escalated} escalated)
Top risks: ${ctx.risks.top.map(r=>`${r.name} (score ${r.score})`).join("; ")||"None"}

BENEFITS: ${ctx.benefits.map(b=>b.bri!==null?`${b.name}: BRI ${b.bri}%`:`${b.name}: no data yet`).join("; ")||"None defined"}

MILESTONES: ${ctx.milestones.complete}/${ctx.milestones.total} complete. Next: ${ctx.milestones.next?`${ctx.milestones.next.name} (${ctx.milestones.next.date})`:"None scheduled"}

CHANGE CONTROL: ${ctx.changes.total} changes — ${ctx.changes.approved} approved, ${ctx.changes.pending} pending

Write the summary now. Be direct and factual. Flag red items clearly.`;

    let summary = "Executive summary could not be generated automatically.";
    try {
      const res  = await fetch("/api/extract", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, messages:[{role:"user",content:summaryPrompt}] }) });
      const data = await res.json();
      summary    = (data.content||[]).map(b=>b.text||"").join("").trim();
      setAiSummary(summary);
    } catch(e) {
      setGenStep("AI summary failed — generating workbook without summary.");
    }

    setGenStep("Building workbook...");
    await buildWorkbook(summary);
    setGenerating(false);
    setGenStep("");
  };

  const buildWorkbook = async (summary) => {
    const wb = XLSX.utils.book_new();
    const c  = charter || {};
    const delsFromState = sheets["07"]?.data?.deliverables || deliverables;
    const benefits = c.benefits || [];

    // ── 00 Executive Summary ──────────────────────────────────────────
    const s00 = {};
    [[`${c.projectName||project?.name||"Project"} — Executive Summary`],[`Generated: ${new Date().toLocaleString()}`],[`PM: ${c.projectManager||"—"}  |  Sponsor: ${c.projectSponsor||"—"}  |  Progress: ${pct}% Complete`],[""],
     [summary]].forEach((row,ri)=>{
      row.forEach((val,ci)=>{
        const addr = XLSX.utils.encode_cell({r:ri,c:ci});
        s00[addr]  = {v:val,t:"s",s:ri===0?HDR_STYLE:ri===2?SUB_HDR_STYLE:NORMAL_STYLE};
      });
    });
    s00["!cols"]   = [{wch:120}];
    s00["!merges"] = [{s:{r:0,c:0},e:{r:0,c:3}},{s:{r:4,c:0},e:{r:4,c:3}}];
    s00["!ref"]    = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:5,c:3}});
    XLSX.utils.book_append_sheet(wb, s00, "00 Executive Summary");

    // ── 01 Charter (with Benefits & Objectives) ───────────────────────
    const charterRows = [
      ["Project Name",       c.projectName||""],
      ["Project Code",       c.projectCode||""],
      ["Project Manager",    c.projectManager||""],
      ["Project Sponsor",    c.projectSponsor||""],
      ["Organisation",       c.organisation||""],
      ["Start Date",         c.startDate||""],
      ["End Date",           c.endDate||""],
      ["Budget",             c.budget||""],
      ["Purpose",            c.purpose||""],
      ["Problem Statement",  c.problemStatement||""],
      ["Strategic Alignment",c.strategicAlignment||""],
      ["Within Scope",       (c.withinScope||[]).join("; ")],
      ["Out of Scope",       (c.outOfScope||[]).join("; ")],
    ];
    // Add benefits + objectives
    benefits.forEach((b,bi) => {
      charterRows.push(["", ""]);
      charterRows.push([`BENEFIT ${b._id}`, b.name||""]);
      charterRows.push(["  Category", b.category||""]);
      charterRows.push(["  Owner", b.owner||""]);
      charterRows.push(["  Description", b.description||""]);
      charterRows.push(["  Target Date", b.targetDate||""]);
      (b.objectives||[]).forEach((o,oi) => {
        charterRows.push([`  Objective ${o._id}`, o.objective||""]);
        charterRows.push(["    Success Criterion", o.successCriterion||""]);
        charterRows.push(["    Target Date", o.targetDate||""]);
      });
    });
    const s01 = buildSheet(["Field","Value"], charterRows, [32,80], null);
    XLSX.utils.book_append_sheet(wb, s01, "01 Charter");

    // ── 02 Team ───────────────────────────────────────────────────────
    const s02 = buildSheet(
      ["Login Code","Name","PM / Governance Role","Delivery Role","Availability","Location","Responsibilities"],
      teamMembers.map(m=>[m.loginCode,m.name,m.role,m.deliveryRole||"",m.availability||"",m.location||"",m.responsibilities||""]),
      [14,22,28,24,14,16,40], null
    );
    XLSX.utils.book_append_sheet(wb, s02, "02 Team");

    // ── 03 Schedule ───────────────────────────────────────────────────
    const baselineActs = baseline?.snapshot?.activities || [];
    const s03 = buildSheet(
      ["ID","Activity / Milestone","Phase","Responsible","Start Date","Target Date","Baseline End","Status"],
      [...activities.map(a=>{
        const ba = baselineActs.find(x=>x._id===a._id);
        return [a._id,a.name||"",a.phase||"",a.responsible||"",a.startDate||"",a.targetDate||"",ba?.targetDate||"—",a._complete?"Complete":"In Progress"];
      }), ...milestones.map(m=>{
        const bm = baseline?.snapshot?.milestones?.find(x=>x._id===m._id);
        return [m._id,m.name||"",m.phase||"","—","",m.targetDate||"",bm?.targetDate||"—",m._complete?"Complete":"Pending"];
      })],
      [12,40,22,24,14,14,14,14],
      (ri,ci,val) => { if(ci===7&&val==="Complete") return DONE_STYLE; return null; }
    );
    XLSX.utils.book_append_sheet(wb, s03, "03 Schedule");

    // ── 04 RACI ───────────────────────────────────────────────────────
    const members   = teamMembers.filter(m=>m.name&&m.role);
    const raciRows2 = [...(raciData?.raciRows||[]),...(raciData?.customRows||[])];
    const s04 = buildSheet(
      ["Task ID","Task","Phase",...members.map(m=>`${m.name}\n(${m.loginCode})`)],
      raciRows2.map(row=>[row.taskId,row.label||"",row.phase||"",...members.map(m=>row.assignments?.[m.loginCode]||"")]),
      [12,40,20,...members.map(()=>16)],
      (ri,ci,val) => {
        if(ci>=3){
          if(val==="R") return RAG_RED;
          if(val==="A") return RAG_AMBER;
          if(val==="C") return {fill:{fgColor:{rgb:"102030"},patternType:"solid"},font:{color:{rgb:"3a9ce0"},bold:false,sz:10}};
          if(val==="I") return {fill:{fgColor:{rgb:"1e1030"},patternType:"solid"},font:{color:{rgb:"9c6ee0"},bold:false,sz:10}};
        }
        return null;
      }
    );
    XLSX.utils.book_append_sheet(wb, s04, "04 RACI");

    // ── 05 Risk Register ──────────────────────────────────────────────
    const s05 = buildSheet(
      ["Risk ID","Name","Category","Cause","Potential Impact","Likelihood","Impact","Score","Mitigation","Response","Owner","Status"],
      risks.map(r=>{
        const score=(parseInt(r.likelihood)||1)*(parseInt(r.impact)||1);
        return [r._id,r.name||"",r.category||"",r.cause||"",r.potentialImpact||"",r.likelihood||"",r.impact||"",score,r.mitigation||"",r.response||"",r._suggestedOwner||"",r.status||"Open"];
      }),
      [12,30,20,28,28,14,14,10,36,12,20,12],
      (ri,ci,val,row) => { if(ci===7) return ragStyle(row[5],row[6]); return null; }
    );
    XLSX.utils.book_append_sheet(wb, s05, "05 Risk Register");

    // ── 05b Issues Register ───────────────────────────────────────────
    const s05b = buildSheet(
      ["Issue ID","Name","Description","Cause","Impact","Priority","Owner","Raised","Target Resolution","Status","Resolution"],
      issues.map(i=>[i._id,i.name||"",i.description||"",i.cause||"",i.impact||"",i.priority||"",i.owner||"",i.raisedDate||"",i.targetResolutionDate||"",i.status||"Open",i.resolution||""]),
      [12,28,36,28,28,12,20,14,18,14,36],
      (ri,ci,val) => {
        if(ci===9){
          if(val==="Resolved") return DONE_STYLE;
          if(val==="Escalated") return RAG_RED;
          if(val==="Open")     return RAG_AMBER;
        }
        return null;
      }
    );
    XLSX.utils.book_append_sheet(wb, s05b, "05b Issues Register");

    // ── 06 Change Control ─────────────────────────────────────────────
    const s06 = buildSheet(
      ["CCR ID","Date","Requested By","Type","Description","Priority","Status","Linked Risk/Issue"],
      changes.map(c=>[c.id,c.date,c.requestedBy,c.type,c.description,c.priority||"",c.status||"pending",c.linkedId||""]),
      [12,14,20,12,44,12,14,16],
      (ri,ci,val) => {
        if(ci===6){
          if(val==="approved") return DONE_STYLE;
          if(val==="rejected") return RAG_RED;
          if(val==="pending"||val==="reviewed") return RAG_AMBER;
        }
        return null;
      }
    );
    XLSX.utils.book_append_sheet(wb, s06, "06 Change Control");

    // ── 07 Benefits & KD Tracker ──────────────────────────────────────
    const kpiRows = [];
    benefits.forEach(b => {
      kpiRows.push([`BENEFIT: ${b.name}`,b.category||"",b.owner||"",b.targetDate||"","","","","",""]);
      const objIds = (b.objectives||[]).map(o=>o._id);
      const linked = delsFromState.filter(d=>objIds.includes(d.linkedObjectiveId));
      linked.forEach(d => {
        (d.kpis||[]).forEach(k => {
          const pct2 = k.target&&k.actual!==undefined&&k.actual!==""
            ? Math.round((parseFloat(k.actual)/parseFloat(k.target))*100)+"%"
            : "—";
          kpiRows.push(["",d._id,d.name||"",k._id,k.name||"",k.baseline||"",k.target||"",k.actual||"",pct2]);
        });
      });
    });
    const s07 = buildSheet(
      ["Benefit","Del ID","Deliverable","KPI ID","KPI Metric","Baseline","Target","Actual","Achievement %"],
      kpiRows, [28,12,32,16,36,12,12,12,16],
      (ri,ci,val) => {
        if(ci===8&&val!=="—"){
          const n=parseInt(val);
          return n>=85?DONE_STYLE:n>=50?RAG_AMBER:RAG_RED;
        }
        return null;
      }
    );
    XLSX.utils.book_append_sheet(wb, s07, "07 Benefits & KD Tracker");

    // ── 08 Stakeholders ───────────────────────────────────────────────
    const s08 = buildSheet(
      ["SH ID","Name","Category","Contact","Power","Interest","Influence","Ease","Priority Score","Engagement Strategy"],
      stakeholders.map(s=>{
        const ps=(((parseInt(s.power)||5)+(parseInt(s.influence)||5))/2*(parseInt(s.interest)||5)/10).toFixed(1);
        return [s._id||"",s.name||"",s.category||"",s.contact||"",s.power||5,s.interest||5,s.influence||5,s.ease||5,ps,s.engagementStrategy||""];
      }),
      [12,28,20,24,10,10,12,10,16,40], null
    );
    XLSX.utils.book_append_sheet(wb, s08, "08 Stakeholders");

    // ── 09 Comms Plan ─────────────────────────────────────────────────
    const comms = sheets["09"]?.data?.comms || [];
    const s09 = buildSheet(
      ["Stakeholder","Category","Contact","Format","Frequency","Key Content","Next Date","Escalation Path","Status"],
      comms.map(c=>[c.stakeholderName||"",c.category||"",c.contact||"",c.format||"",c.frequency||"",c.keyContent||"",c.nextDate||"",c.escalationPath||"",c.status||""]),
      [28,20,24,16,16,40,14,30,14], null
    );
    XLSX.utils.book_append_sheet(wb, s09, "09 Comms Plan");

    // ── 10 Sustainability Evidence ────────────────────────────────────
    const sustainEvidence = sustain;
    const s10 = buildSheet(
      ["Activity","Dimension","Focus Area","Question","Answer","Score","Date"],
      sustainEvidence.map(e=>[e.activityName||"",e.area||"",e.areas?.[0]||"",e.question||"",e.answer||"",e.score!=null?e.score:"",e.date||""]),
      [36,20,20,50,14,10,14],
      (ri,ci,val) => {
        if(ci===4){
          if(val==="yes")       return DONE_STYLE;
          if(val==="partially") return RAG_AMBER;
          if(val==="no")        return RAG_RED;
        }
        return null;
      }
    );
    XLSX.utils.book_append_sheet(wb, s10, "10 Sustainability Evidence");

    const filename = `NorCon_${(project?.code||charter?.projectCode||"PROJECT")}_Workbook_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, filename, {bookType:"xlsx",type:"binary",cellStyles:true});
  };

  // ── Generate Word Report via AI ───────────────────────────────────────────
  const generateWordReport = async () => {
    setGenerating(true);
    setReportStatus("Preparing project data...");
    setReportReady(false);

    const ctx = buildProjectContext(state, project, charter, activities, milestones, risks, deliverables, stakeholders, teamMembers);
    const c   = charter || {};

    const reportPrompt = `You are generating a formal Project Report for ${ctx.project.name||"the project"}. Write a comprehensive, professional narrative report with the following sections. Use formal project management language appropriate for a Project Sponsor and steering committee. Be specific and data-driven. Format with clear section headings using ## for main sections.

PROJECT CONTEXT:
Name: ${ctx.project.name||"Not specified"}
Code: ${ctx.project.code||"—"}
Project Manager: ${ctx.project.manager||"—"}
Project Sponsor: ${ctx.project.sponsor||"—"}
Period: ${ctx.project.start||"TBC"} to ${ctx.project.end||"TBC"}
Budget: ${ctx.project.budget||"Not specified"}
Purpose: ${ctx.project.purpose||"Not specified"}
Strategic Alignment: ${ctx.project.strategic||"Not specified"}
Baseline Status: ${ctx.baseline ? `Confirmed ${ctx.baseline.confirmedDate} (Version ${ctx.baseline.version})` : "Not yet confirmed"}

PROGRESS DATA:
Overall completion: ${ctx.progress.pct}% (${ctx.progress.doneTasks} of ${ctx.progress.totalTasks} tasks complete)
Overdue tasks: ${ctx.progress.overdueActs}
Milestones: ${ctx.milestones.complete} of ${ctx.milestones.total} complete. ${ctx.milestones.overdue||0} overdue.
Next milestone: ${ctx.milestones.next ? `${ctx.milestones.next.name} (${ctx.milestones.next.date})` : "None scheduled"}

BENEFITS REALISATION:
${ctx.benefits.length > 0 ? ctx.benefits.map(b=>b.bri!==null?`- ${b.name}: BRI ${b.bri}% (${b.kpiCount} KPIs tracked)`:`- ${b.name}: No KPI data yet`).join("\n") : "No benefits defined yet"}

RISKS AND ISSUES:
Risk profile: ${ctx.risks.total} risks — ${ctx.risks.red} RED (immediate action required), ${ctx.risks.amber} AMBER (active mitigation), ${ctx.risks.green} GREEN
Top risks: ${ctx.risks.top.map(r=>`${r.name} (score ${r.score}, response: ${r.response})`).join("; ")||"None recorded"}
Issues: ${ctx.issues.total} total — ${ctx.issues.open} open, ${ctx.issues.escalated} escalated

CHANGE CONTROL:
${ctx.changes.total} changes recorded — ${ctx.changes.approved} approved, ${ctx.changes.pending} pending approval

SUSTAINABILITY:
${ctx.sustainability.evidenceCount > 0 ? `${ctx.sustainability.evidenceCount} evidence entries recorded. Average score: ${ctx.sustainability.score}%` : "No sustainability evidence recorded yet"}

LESSONS LEARNED:
${ctx.lessonsLearned.length > 0 ? ctx.lessonsLearned.map(l=>`${l.benefit}: ${l.lessons}`).join("\n") : "No lessons recorded yet"}

Write the following sections in full:

## 1. Executive Summary
A concise summary of project status, key achievements, and critical items requiring attention. 3-4 paragraphs.

## 2. Project Overview
Purpose, strategic context, scope summary, team and governance structure.

## 3. Progress Against Baseline
Detailed assessment of schedule performance, milestone achievement, and any variances from the confirmed baseline. Highlight any activities significantly ahead or behind plan.

## 4. Benefits Realisation
Assessment of each defined benefit, KPI performance, confidence in realisation, and recommendations for benefits at risk.

## 5. Risks and Issues
Risk profile analysis, top risks requiring attention, issue resolution status, and any escalations required.

## 6. Change History
Summary of change control activity, approved changes and their impact on project scope/cost/time.

## 7. Sustainability Performance
Assessment of sustainability evidence collected, performance by dimension, and areas for improvement.

## 8. Lessons Learned
Key lessons captured, recommendations for future projects, and knowledge transfer actions.

## 9. Recommendations and Next Steps
Specific, actionable recommendations for the sponsor and project team. List no more than 5 priority actions.

Write the full report now. Be comprehensive but concise. Use professional language throughout.`;

    try {
      setReportStatus("Claude is writing the report...");
      const res  = await fetch("/api/extract", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:4000, messages:[{role:"user",content:reportPrompt}] })
      });
      const data = await res.json();
      const reportText = (data.content||[]).map(b=>b.text||"").join("").trim();

      setReportStatus("Generating Word document...");
      await buildDocx(reportText, ctx);
      setReportReady(true);
      setReportStatus("Report generated successfully.");
    } catch(err) {
      setReportStatus("Report generation failed. Please try again.");
    }
    setGenerating(false);
  };

  const buildDocx = async (reportText, ctx) => {
    // Build a styled HTML document and trigger download as .html
    // (DOCX library not available client-side; HTML renders correctly in Word when opened)
    const c = charter || {};
    const date = new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"long",year:"numeric"});

    // Convert markdown ## headings and paragraphs to HTML
    const htmlBody = reportText
      .split("\n")
      .map(line => {
        if (line.startsWith("## "))   return `<h2>${line.replace("## ","")}</h2>`;
        if (line.startsWith("# "))    return `<h1>${line.replace("# ","")}</h1>`;
        if (line.startsWith("- "))    return `<li>${line.replace("- ","")}</li>`;
        if (line.trim() === "")       return "<br/>";
        return `<p>${line}</p>`;
      })
      .join("\n");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; margin: 2cm; line-height: 1.5; }
  h1   { font-size: 18pt; color: #0D2B1B; border-bottom: 2px solid #2E7D52; padding-bottom: 6px; margin-top: 0; }
  h2   { font-size: 14pt; color: #2E7D52; margin-top: 24px; margin-bottom: 8px; }
  p    { margin: 6px 0; }
  li   { margin: 4px 0 4px 20px; }
  .cover { background: #0D2B1B; color: #E5F0E8; padding: 40px; margin: -2cm -2cm 2cm -2cm; }
  .cover h1 { color: #E5F0E8; border-bottom: 2px solid #3a9962; font-size: 22pt; }
  .cover .meta { color: #8aac96; font-size: 10pt; margin-top: 8px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:12px; font-size:9pt; font-weight:bold; }
  .red   { background:#2a1515; color:#e05c5c; }
  .amber { background:#2a2010; color:#e0a23a; }
  .green { background:#102a20; color:#3ae0a2; }
  table { border-collapse: collapse; width:100%; margin: 12px 0; font-size:10pt; }
  th    { background:#0D2B1B; color:#E5F0E8; padding:6px 10px; text-align:left; }
  td    { border:1px solid #ddd; padding:5px 10px; }
  tr:nth-child(even) td { background:#f5f5f5; }
</style>
</head>
<body>
<div class="cover">
  <h1>${c.projectName||ctx.project.name||"Project Report"}</h1>
  <div class="meta">Project Code: ${c.projectCode||"—"} &nbsp;|&nbsp; Date: ${date}</div>
  <div class="meta">Project Manager: ${c.projectManager||"—"} &nbsp;|&nbsp; Sponsor: ${c.projectSponsor||"—"}</div>
  <div class="meta" style="margin-top:16px; font-size:11pt; color:#E5F0E8;">
    Progress: ${ctx.progress.pct}% &nbsp;|&nbsp; 
    Risks: <span class="red">${ctx.risks.red} RED</span> &nbsp;
    <span class="amber">${ctx.risks.amber} AMBER</span> &nbsp;
    <span class="green">${ctx.risks.green} GREEN</span>
  </div>
</div>
${htmlBody}
</body>
</html>`;

    const blob     = new Blob([html], {type:"application/vnd.ms-word;charset=utf-8"});
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href         = url;
    a.download     = `NorCon_${(project?.code||c.projectCode||"PROJECT")}_Report_${new Date().toISOString().split("T")[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  const TABS = [["workbook","📊 Project Workbook"],["report","📄 Project Report"]];

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0,overflow:"hidden"}}>

      {/* Sub-nav */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 20px",flexShrink:0}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:"0 16px",height:38,fontSize:11,fontWeight:600,background:"none",border:"none",
              borderBottom:`2px solid ${tab===id?C.accentL:"transparent"}`,
              color:tab===id?C.sage:C.muted,cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:20}}>

        {/* ══ WORKBOOK ══ */}
        {tab === "workbook" && (
          <div style={{maxWidth:720}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"24px 28px",marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:700,color:C.sage,marginBottom:4}}>Project Workbook</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:20,lineHeight:1.6}}>
                A fully styled Excel workbook with AI-generated executive summary and all 10 project registers. Includes new structures: benefits, objectives, KPIs, issues, baseline comparison, and sustainability evidence.
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
                {[[`${pct}%`,"Progress",`${doneTasks}/${totalTasks} tasks`],
                  [redRisks>0?redRisks:"✓","Red Risks",redRisks>0?"need action":"all clear"],
                  [nextMs?.name||"None","Next Milestone",nextMs?.targetDate||"—"],
                  [stakeholders.length,"Stakeholders","identified"]
                ].map(([v,l,s])=>(
                  <div key={l} style={{background:C.surface2,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:redRisks>0&&l==="Red Risks"?C.risk:C.sage}}>{v}</div>
                    <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{l}</div>
                    <div style={{fontSize:10,color:C.muted}}>{s}</div>
                  </div>
                ))}
              </div>

              {/* Sheet list */}
              <div style={{marginBottom:20}}>
                {[["00","Executive Summary","AI-generated narrative — project health in plain English","✨ AI"],
                  ["01","Charter","Project details, purpose, scope, benefits and objectives","✓"],
                  ["02","Team Register","Login codes, roles, availability","✓"],
                  ["03","Schedule","Activities and milestones with baseline comparison","✓"],
                  ["04","RACI Matrix","R/A/C/I assignments with colour coding","✓"],
                  ["05","Risk Register","All risks with RAG scores","✓"],
                  ["05b","Issues Register","All issues with status and resolution","✓"],
                  ["06","Change Control","Change log with linked risks/issues","✓"],
                  ["07","Benefits & KD Tracker","Benefits → objectives → deliverables → KPIs with actuals","✓"],
                  ["08","Stakeholder Matrix","PIIE scores and engagement strategies","✓"],
                  ["09","Comms Plan","Communication schedule per stakeholder","✓"],
                  ["10","Sustainability Evidence","Dimension scores and activity evidence","✓"],
                ].map(([n,l,d,badge])=>(
                  <div key={n} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                    <span style={{fontSize:10,color:C.accentL,fontFamily:"monospace",width:32,flexShrink:0}}>{n}</span>
                    <span style={{color:C.sage,fontWeight:600,minWidth:140,flexShrink:0}}>{l}</span>
                    <span style={{color:C.muted,fontSize:11}}>{d}</span>
                    <span style={{marginLeft:"auto",fontSize:10,color:n==="00"?C.accentL:C.activity,flexShrink:0}}>{badge}</span>
                  </div>
                ))}
              </div>

              {/* AI summary preview */}
              {aiSummary && (
                <div style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:7,padding:"14px 16px",marginBottom:16}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.accentL,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>✨ AI Executive Summary Preview</div>
                  <div style={{fontSize:12,color:C.dim,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aiSummary}</div>
                </div>
              )}

              <button onClick={generateWorkbook} disabled={generating}
                style={{width:"100%",padding:"13px",background:generating?C.surface2:C.accent,color:"#fff",border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:generating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                {generating && tab==="workbook" ? (
                  <><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>{genStep}</>
                ) : "📊 Download Project Workbook"}
              </button>
            </div>
          </div>
        )}

        {/* ══ PROJECT REPORT ══ */}
        {tab === "report" && (
          <div style={{maxWidth:720}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"24px 28px"}}>
              <div style={{fontSize:16,fontWeight:700,color:C.sage,marginBottom:4}}>Project Report</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:20,lineHeight:1.6}}>
                A comprehensive narrative report generated by Claude, covering all aspects of the project. Suitable for steering committee presentations, milestone reviews, and project closure. Downloads as a Word-compatible document.
              </div>

              {/* Report sections */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>Report sections</div>
                {["1. Executive Summary","2. Project Overview","3. Progress Against Baseline","4. Benefits Realisation","5. Risks and Issues","6. Change History","7. Sustainability Performance","8. Lessons Learned","9. Recommendations and Next Steps"].map(s=>(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.border}22`,fontSize:12}}>
                    <span style={{color:C.activity,fontSize:11}}>✓</span>
                    <span style={{color:C.dim}}>{s}</span>
                  </div>
                ))}
              </div>

              {/* Status message */}
              {reportStatus && (
                <div style={{padding:"8px 12px",background:C.surface2,borderRadius:6,fontSize:11,color:reportReady?C.activity:C.dim,marginBottom:16}}>
                  {reportReady ? "✓ " : ""}{reportStatus}
                </div>
              )}

              <button onClick={generateWordReport} disabled={generating}
                style={{width:"100%",padding:"13px",background:generating?C.surface2:C.accent,color:"#fff",border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:generating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                {generating && tab==="report" ? (
                  <><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>{reportStatus}</>
                ) : "📄 Generate Project Report"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
