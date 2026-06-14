import { useState } from "react";
import { generateLoginCode } from "../store/appStore.js";

const C = {
  bg: "#0D2B1B", surface: "#122E1E", surface2: "#183D28", border: "#1F4D34",
  accent: "#2E7D52", accentL: "#3a9962",
  sage: "#E5F0E8", sageDim: "#b8d4c0", dim: "#8aac96", muted: "#5a7a66",
  risk: "#e05c5c",
};

const PM_ROLES = [
  "Project Manager", "Assistant Project Manager", "Project Scheduler",
  "Project Controller", "Risk Owner", "Communications Lead",
  "Technical Lead", "Research Coordinator", "Marketing Lead",
  "Document Controller",
];

export default function ProjectSetup({ project, l1Charter, onComplete }) {
  const [name,     setName]     = useState(project?.name || l1Charter?.projectName || '');
  const [code,     setCode]     = useState(project?.code || '');
  const [teamSize, setTeamSize] = useState(project?.teamSize || '');
  const [step,     setStep]     = useState(1); // 1 = project details, 2 = team codes
  const [members,  setMembers]  = useState([]);
  const [errors,   setErrors]   = useState({});

  const inp = {
    width: "100%", background: C.surface2, border: `1px solid ${C.border}`,
    borderRadius: 6, color: C.sage, fontSize: 13, padding: "9px 12px",
    outline: "none", boxSizing: "border-box",
  };

  const validateStep1 = () => {
    const e = {};
    if (!name.trim())           e.name     = "Project name is required";
    if (!code.trim())           e.code     = "Project code is required";
    if (!teamSize || teamSize < 1 || teamSize > 20)
                                e.teamSize = "Enter a number between 1 and 20";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep1()) return;
    // Generate login codes
    const codes = [];
    const generated = [];
    for (let i = 0; i < Number(teamSize); i++) {
      const loginCode = generateLoginCode(code, generated);
      generated.push(loginCode);
      codes.push({
        loginCode,
        name: i === 0 ? (l1Charter?.projectManager || '') : '',
        role: i === 0 ? 'Project Manager' : '',
        rights: i === 0 ? ['full'] : [],
      });
    }
    setMembers(codes);
    setStep(2);
  };

  const updateMember = (idx, field, value) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleConfirm = () => {
    const e = {};
    members.forEach((m, i) => {
      if (!m.name.trim()) e[`name_${i}`] = "Required";
      if (!m.role)        e[`role_${i}`] = "Required";
    });
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onComplete({
      project: { name: name.trim(), code: code.trim().toUpperCase(), teamSize: Number(teamSize), status: 'draft' },
      loginCodes: members,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100%", padding: "32px 20px" }}>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 560, background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: C.surface2, borderBottom: `1px solid ${C.border}`,
          padding: "16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏗️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.sage }}>
              {step === 1 ? "Project Setup" : "Team Register"}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {step === 1 ? "Confirm project details before entering the Personalisation Layer"
                          : `${teamSize} login codes generated — assign names and roles`}
            </div>
          </div>
          {/* Step indicator */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ width: 24, height: 24, borderRadius: "50%",
                background: step === s ? C.accent : step > s ? C.accentL : C.surface,
                border: `1px solid ${step >= s ? C.accent : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: step >= s ? "#fff" : C.muted }}>{s}</div>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px" }}>

          {step === 1 ? (
            /* ── Step 1: Project details ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.dim,
                  display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  Project Name
                </label>
                <input style={{ ...inp, borderColor: errors.name ? C.risk : C.border }}
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Northumbria Waterfront Regeneration"/>
                {errors.name && <div style={{ fontSize: 11, color: C.risk, marginTop: 4 }}>{errors.name}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.dim,
                    display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>
                    Project Code
                  </label>
                  <input style={{ ...inp, borderColor: errors.code ? C.risk : C.border,
                    textTransform: "uppercase", fontFamily: "monospace", letterSpacing: ".1em" }}
                    value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="e.g. WF"/>
                  {errors.code
                    ? <div style={{ fontSize: 11, color: C.risk, marginTop: 4 }}>{errors.code}</div>
                    : <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Used as login code prefix: {code||"XX"}-XXXX</div>}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.dim,
                    display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".4px" }}>
                    Number of Team Members
                  </label>
                  <input style={{ ...inp, borderColor: errors.teamSize ? C.risk : C.border }}
                    type="number" min="1" max="20"
                    value={teamSize} onChange={e => setTeamSize(e.target.value)}
                    placeholder="e.g. 4"/>
                  {errors.teamSize && <div style={{ fontSize: 11, color: C.risk, marginTop: 4 }}>{errors.teamSize}</div>}
                </div>
              </div>

              {/* Pre-filled info from L1 */}
              {l1Charter?.documentSummary && (
                <div style={{ background: C.surface2, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted,
                    textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                    From Layer 1
                  </div>
                  <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
                    {l1Charter.documentSummary}
                  </div>
                </div>
              )}

              <button onClick={handleNext} style={{ padding: "11px", background: C.accent,
                color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700,
                cursor: "pointer", marginTop: 4 }}>
                Generate Login Codes →
              </button>
            </div>

          ) : (
            /* ── Step 2: Team register ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6,
                background: C.surface2, borderRadius: 6, padding: "10px 14px",
                border: `1px solid ${C.border}` }}>
                Each team member receives a unique login code. When they log in, the system
                applies their role permissions automatically based on the RACI matrix.
              </div>

              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr",
                gap: 8, padding: "6px 0" }}>
                {["Login Code", "Full Name", "PM / Governance Role"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted,
                    textTransform: "uppercase", letterSpacing: ".4px" }}>{h}</div>
                ))}
              </div>

              {/* Member rows */}
              {members.map((m, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr",
                  gap: 8, alignItems: "start",
                  background: i === 0 ? "rgba(46,125,82,0.08)" : "transparent",
                  borderRadius: 6, padding: i === 0 ? "8px" : "0" }}>

                  {/* Login code */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ background: C.surface2, border: `1px solid ${C.border}`,
                      borderRadius: 6, padding: "9px 10px", fontFamily: "monospace",
                      fontSize: 13, color: C.accentL, fontWeight: 700, letterSpacing: ".08em" }}>
                      {m.loginCode}
                    </div>
                    {i === 0 && <div style={{ fontSize: 9, color: C.accentL, textAlign: "center" }}>PM · Full Access</div>}
                  </div>

                  {/* Name */}
                  <div>
                    <input style={{ ...inp, borderColor: errors[`name_${i}`] ? C.risk : C.border }}
                      value={m.name} onChange={e => updateMember(i, 'name', e.target.value)}
                      placeholder="Full name"/>
                    {errors[`name_${i}`] && <div style={{ fontSize: 11, color: C.risk, marginTop: 3 }}>Required</div>}
                  </div>

                  {/* Role */}
                  <div>
                    <select style={{ ...inp, borderColor: errors[`role_${i}`] ? C.risk : C.border }}
                      value={m.role} onChange={e => updateMember(i, 'role', e.target.value)}
                      disabled={i === 0}>
                      <option value="">Select role...</option>
                      {PM_ROLES.map(r => <option key={r} value={r} style={{ background: C.surface2 }}>{r}</option>)}
                    </select>
                    {errors[`role_${i}`] && <div style={{ fontSize: 11, color: C.risk, marginTop: 3 }}>Required</div>}
                  </div>
                </div>
              ))}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: "10px",
                  background: "none", color: C.dim, border: `1px solid ${C.border}`,
                  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  ← Back
                </button>
                <button onClick={handleConfirm} style={{ flex: 2, padding: "10px",
                  background: C.accent, color: "#fff", border: "none",
                  borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Confirm & Enter Personalisation Layer →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
