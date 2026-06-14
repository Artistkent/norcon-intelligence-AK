const C = { surface:"#122E1E", surface2:"#183D28", border:"#1F4D34", accent:"#2E7D52", accentL:"#3a9962", sage:"#E5F0E8", dim:"#8aac96", muted:"#5a7a66" };
export default function Sheet04RACI({ data, locked, l1, loginCodes, allSheets, onUpdate }) {
  const label = "Sheet04RACI".replace("Sheet0","Sheet 0").replace(/([A-Z])/g,' ').trim();
  return (
    <div style={{ color:C.dim, textAlign:"center", padding:60, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
      <div style={{ fontSize:32, opacity:.3 }}>🚧</div>
      <div style={{ fontSize:15, fontWeight:700, color:C.sage }}>{label}</div>
      <div style={{ fontSize:12, maxWidth:320, lineHeight:1.6 }}>
        This sheet is scaffolded and ready. Full implementation coming in the next iteration —
        data from Layer 1 is loaded and waiting.
        {data && Object.keys(data).some(k => Array.isArray(data[k]) && data[k].length>0) &&
          <div style={{ marginTop:8, color:C.accentL }}>
            ✓ {Object.values(data).filter(v=>Array.isArray(v)).reduce((a,v)=>a+v.length,0)} elements pre-loaded from Layer 1
          </div>
        }
      </div>
    </div>
  );
}
