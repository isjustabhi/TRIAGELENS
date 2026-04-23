import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, ClipboardPlus, HeartPulse, Loader2,
  Plus, Sparkles, Thermometer, User, Waves, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

const ESI_META = {
  1: { label: "Resuscitation", color: "#EF4444" },
  2: { label: "Emergent", color: "#F97316" },
  3: { label: "Urgent", color: "#EAB308" },
  4: { label: "Less Urgent", color: "#22C55E" },
  5: { label: "Non-Urgent", color: "#3B82F6" },
};

const TRIAGE_SYSTEM_PROMPT = `You are an expert emergency medicine triage AI. You assess patients using the Emergency Severity Index (ESI) 5-level system.

ESI Levels:
1 - Resuscitation: Immediate life-saving intervention needed
2 - Emergent: High risk, confused/lethargic/disoriented, or severe pain/distress
3 - Urgent: Two or more resources needed (labs, imaging, IV fluids, etc.)
4 - Less Urgent: One resource needed
5 - Non-Urgent: No resources needed

Given patient data, respond ONLY with this JSON (no markdown, no backticks):
{
  "esi_level": <1-5>,
  "confidence": <0.0-1.0>,
  "reasoning": [
    "Step 1: <assessment of immediate life threats>",
    "Step 2: <assessment of high-risk situation>",
    "Step 3: <assessment of resource needs>",
    "Step 4: <final ESI determination with rationale>"
  ],
  "factors": [
    {"name": "Heart Rate", "impact": <-1.0 to 1.0>, "note": "<brief note>"},
    {"name": "Blood Pressure", "impact": <-1.0 to 1.0>, "note": "<brief note>"},
    {"name": "SpO2", "impact": <-1.0 to 1.0>, "note": "<brief note>"},
    {"name": "Temperature", "impact": <-1.0 to 1.0>, "note": "<brief note>"},
    {"name": "Pain Level", "impact": <-1.0 to 1.0>, "note": "<brief note>"},
    {"name": "Complaint Severity", "impact": <-1.0 to 1.0>, "note": "<brief note>"}
  ]
}
Positive impact = increases acuity (worse). Negative impact = decreases acuity (better).`;

const SIMULATION_PROMPT = `Generate a realistic emergency department patient. Respond ONLY with JSON (no markdown):
{
  "name": "<realistic full name>",
  "age": <18-95>,
  "sex": "<Male or Female>",
  "chiefComplaint": "<realistic 1-2 sentence chief complaint with clinical details>",
  "vitals": {
    "hr": <realistic HR>,
    "sbp": <realistic SBP>,
    "dbp": <realistic DBP>,
    "spo2": <realistic SpO2>,
    "temp": <realistic temp in °F>,
    "painScale": <0-10>
  }
}
Vary severity. Include a mix of ESI 1-5 cases. Make complaints clinically realistic.`;

const INITIAL_FORM = { name: "", age: "", sex: "Male", chiefComplaint: "", hr: "", sbp: "", dbp: "", spo2: "", temp: "", painScale: 5 };

const parseClaudeJson = (text) => {
  const t = text.trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) throw new Error("Non-JSON response from AI.");
  return JSON.parse(t.slice(s, e + 1));
};

const buildUserMessage = (p) =>
  `Patient: ${p.name}, ${p.age}yo ${p.sex}\nChief Complaint: ${p.chiefComplaint}\nVitals: HR ${p.vitals.hr} bpm, BP ${p.vitals.sbp}/${p.vitals.dbp} mmHg, SpO2 ${p.vitals.spo2}%, Temp ${p.vitals.temp}°F, Pain ${p.vitals.painScale}/10`;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const normalizeFactors = (factors = []) => {
  const names = ["Heart Rate", "Blood Pressure", "SpO2", "Temperature", "Pain Level", "Complaint Severity"];
  return names.map((name) => {
    const m = factors.find((f) => f.name === name);
    const impact = typeof m?.impact === "number" ? clamp(m.impact, -1, 1) : 0;
    return { name, impact, note: m?.note || "", fill: impact >= 0 ? "#F97316" : "#22C55E" };
  });
};

const Field = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <span style={{ fontSize: 14, fontWeight: 500, color: "#9CA3AF" }}>{label}</span>
    {children}
  </label>
);

const inp = { width: "100%", boxSizing: "border-box", borderRadius: 16, border: "1px solid #2D3348", backgroundColor: "#11141D", padding: "12px 16px", color: "#E5E7EB", outline: "none", fontSize: 14, fontFamily: "inherit" };

const Spin = ({ label = "Loading" }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 14, color: "#9CA3AF" }}>
    <Loader2 size={20} className="anim-spin" /> <span>{label}</span>
  </div>
);

const Chart = ({ factors }) => (
  <div style={{ height: 280, width: "100%" }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={factors} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="#273044" />
        <XAxis type="number" domain={[-1, 1]} tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={{ stroke: "#2D3348" }} tickLine={{ stroke: "#2D3348" }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#E5E7EB", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ backgroundColor: "#11141D", border: "1px solid #2D3348", borderRadius: 16, color: "#E5E7EB" }}
          formatter={(v, _, item) => [`${Number(v).toFixed(2)}${item?.payload?.note ? ` — ${item.payload.note}` : ""}`, item?.payload?.name || "Factor"]} />
        <Bar dataKey="impact" radius={[0, 10, 10, 0]} animationDuration={650}>
          {factors.map((e) => <Cell key={e.name} fill={e.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const Badge = ({ level, size = 64 }) => {
  const m = ESI_META[level] || ESI_META[3];
  return <div style={{ width: size, height: size, fontSize: size > 48 ? 24 : 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: "#fff", backgroundColor: `${m.color}20`, boxShadow: `0 0 20px ${m.color}`, border: "1px solid rgba(255,255,255,0.1)" }}>{level}</div>;
};

export default function App() {
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [simMode, setSimMode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [draft, setDraft] = useState(null);
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const twRef = useRef(null);

  const grouped = useMemo(() => [1, 2, 3, 4, 5].map((l) => ({ level: l, patients: patients.filter((p) => p.esiResult?.level === l) })), [patients]);

  useEffect(() => {
    if (view !== "result" || !draft?.esiResult?.reasoning?.length) {
      setReasoning(""); setStreaming(false); if (twRef.current) clearTimeout(twRef.current); return;
    }
    const full = draft.esiResult.reasoning.map((s) => `→ ${s}`).join("\n");
    let i = 0; setReasoning(""); setStreaming(true);
    const tick = () => { i++; setReasoning(full.slice(0, i)); if (i < full.length) twRef.current = setTimeout(tick, 20); else setStreaming(false); };
    twRef.current = setTimeout(tick, 20);
    return () => clearTimeout(twRef.current);
  }, [view, draft]);

  const callClaude = async (system, userPrompt) => {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system, messages: [{ role: "user", content: userPrompt }] }),
    });
    if (!res.ok) { const d = await res.text(); throw new Error(`API error (${res.status}): ${d}`); }
    const data = await res.json();
    const text = data?.content?.find((c) => c.type === "text")?.text;
    if (!text) throw new Error("No text in AI response.");
    return parseClaudeJson(text);
  };

  const reset = () => { setForm(INITIAL_FORM); setDraft(null); setReasoning(""); setError(""); setSimMode(false); };

  const toPatient = (s) => ({
    id: crypto.randomUUID(), name: s.name.trim(), age: Number(s.age), sex: s.sex,
    chiefComplaint: s.chiefComplaint.trim(),
    vitals: { hr: Number(s.hr), sbp: Number(s.sbp), dbp: Number(s.dbp), spo2: Number(s.spo2), temp: Number(s.temp), painScale: Number(s.painScale) },
    esiResult: null, timestamp: new Date().toISOString(),
  });

  const validate = (s) => {
    if (!s.name.trim() || !s.age || !s.chiefComplaint.trim()) return "Complete patient identity and complaint.";
    if ([s.hr, s.sbp, s.dbp, s.spo2, s.temp].some((v) => v === "")) return "Complete all vital signs.";
    return "";
  };

  const runTriage = async (patient, { autoQueue = false } = {}) => {
    setError(""); setView("intake"); setAnalyzing(true);
    try {
      const t = await callClaude(TRIAGE_SYSTEM_PROMPT, buildUserMessage(patient));
      const tp = { ...patient, esiResult: { level: clamp(Number(t.esi_level) || 3, 1, 5), confidence: clamp(Number(t.confidence) || 0, 0, 1), reasoning: Array.isArray(t.reasoning) ? t.reasoning : [], factors: normalizeFactors(t.factors) } };
      if (autoQueue) { setPatients((p) => [tp, ...p]); setSelected(tp); setView("dashboard"); reset(); return; }
      setDraft(tp); setView("result");
    } catch (err) { setError(err.message); setView("intake"); }
    finally { setAnalyzing(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); const v = validate(form); if (v) { setError(v); return; }
    const p = toPatient(form); setDraft(p); await runTriage(p);
  };

  const handleSimulate = async () => {
    setSimMode(true); setError(""); setView("dashboard");
    try {
      const sim = await callClaude("You generate realistic emergency department patients.", SIMULATION_PROMPT);
      const p = { id: crypto.randomUUID(), name: sim.name || "Simulated Patient", age: Number(sim.age) || 40, sex: sim.sex || "Male", chiefComplaint: sim.chiefComplaint || "Undifferentiated complaint.", vitals: { hr: Number(sim?.vitals?.hr) || 88, sbp: Number(sim?.vitals?.sbp) || 122, dbp: Number(sim?.vitals?.dbp) || 78, spo2: Number(sim?.vitals?.spo2) || 98, temp: Number(sim?.vitals?.temp) || 98.6, painScale: Number(sim?.vitals?.painScale) || 4 }, esiResult: null, timestamp: new Date().toISOString() };
      setForm({ name: p.name, age: p.age, sex: p.sex, chiefComplaint: p.chiefComplaint, hr: p.vitals.hr, sbp: p.vitals.sbp, dbp: p.vitals.dbp, spo2: p.vitals.spo2, temp: p.vitals.temp, painScale: p.vitals.painScale });
      await runTriage(p, { autoQueue: true });
    } catch (err) { setError(err.message); } finally { setSimMode(false); }
  };

  const addToQueue = () => { if (!draft?.esiResult) return; setPatients((p) => [draft, ...p]); setSelected(draft); setView("dashboard"); reset(); };

  const card = { borderRadius: 28, border: "1px solid #2D3348", backgroundColor: "#151925", padding: 20 };
  const btn2 = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: "12px 16px", fontSize: 14, fontWeight: 500, color: "#E5E7EB", cursor: "pointer", fontFamily: "inherit" };
  const btn1 = { ...btn2, backgroundColor: "#fff", color: "#0F1117", border: "none" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F1117", color: "#E5E7EB", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .anim-spin { animation: spin 1s linear infinite; }
        @keyframes pg { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.14); } 50% { box-shadow: 0 0 0 12px rgba(239,68,68,.02); } }
        .triage-pulse { animation: pg 2.2s infinite; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{ ...card, marginBottom: 24, padding: "16px 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, border: "1px solid #2D3348", backgroundColor: "#1A1D27", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <HeartPulse size={24} color="#F97316" />
              </div>
              <div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36, color: "#fff", lineHeight: 1 }}>TriageLens</div>
                <div style={{ marginTop: 4, fontSize: 14, color: "#9CA3AF" }}>{patients.length} patients in queue</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={handleSimulate} disabled={simMode} style={{ ...btn2, opacity: simMode ? 0.6 : 1 }}>
                {simMode ? <Loader2 size={16} className="anim-spin" /> : <Sparkles size={16} />} Simulate Patient
              </button>
              <button onClick={() => { reset(); setView("intake"); }} style={btn1}><Plus size={16} /> Add Patient</button>
            </div>
          </div>
        </header>

        {error && <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12, borderRadius: 16, border: "1px solid rgba(239,68,68,.3)", backgroundColor: "rgba(239,68,68,.1)", padding: "12px 16px", fontSize: 14, color: "#FCA5A5" }}><AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} /><span>{error}</span></div>}

        {(simMode || analyzing) && <div style={{ ...card, marginBottom: 20, padding: 16 }}><Spin label={simMode ? "Generating simulated patient and running triage..." : "Running triage analysis..."} /></div>}

        <main style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, flex: 1 }}>
          {grouped.map((col) => {
            const m = ESI_META[col.level];
            return (
              <section key={col.level} style={{ ...card, minHeight: 240 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#9CA3AF" }}>ESI {col.level}</div>
                    <div style={{ marginTop: 4, fontSize: 16, fontWeight: 600, color: "#fff" }}>{m.label}</div>
                  </div>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: m.color }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {col.patients.length === 0 ? (
                    <div style={{ borderRadius: 16, border: "1px dashed #2D3348", padding: "24px 16px", textAlign: "center", fontSize: 14, color: "#6B7280" }}>No patients</div>
                  ) : col.patients.map((pt) => (
                    <button key={pt.id} onClick={() => setSelected(pt)} className={pt.esiResult.level <= 2 ? "triage-pulse" : ""}
                      style={{ position: "relative", width: "100%", overflow: "hidden", borderRadius: 16, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: 16, textAlign: "left", cursor: "pointer", color: "#E5E7EB", fontFamily: "inherit" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: ESI_META[pt.esiResult.level].color }} />
                      <div style={{ paddingLeft: 12 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                          <div><div style={{ fontWeight: 600, color: "#fff" }}>{pt.name}</div><div style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF" }}>{pt.age} / {pt.sex}</div></div>
                          <Badge level={pt.esiResult.level} size={40} />
                        </div>
                        <p style={{ marginTop: 12, fontSize: 14, color: "#D1D5DB" }}>{pt.chiefComplaint.length > 50 ? pt.chiefComplaint.slice(0, 50) + "..." : pt.chiefComplaint}</p>
                        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <span style={{ borderRadius: 999, border: "1px solid #2D3348", backgroundColor: "#11141D", padding: "4px 12px", fontSize: 12 }}>HR {pt.vitals.hr}</span>
                          <span style={{ borderRadius: 999, border: "1px solid #2D3348", backgroundColor: "#11141D", padding: "4px 12px", fontSize: 12 }}>SpO2 {pt.vitals.spo2}%</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </main>
      </div>

      {/* Intake Modal */}
      {view === "intake" && !simMode && (
        <div style={{ position: "fixed", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.7)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 1024, borderRadius: 32, border: "1px solid #2D3348", backgroundColor: "#151925", padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 30, color: "#fff" }}>Patient Intake</h2>
                <p style={{ marginTop: 8, fontSize: 14, color: "#9CA3AF" }}>Capture presentation details before AI-guided ESI analysis.</p>
              </div>
              <button onClick={() => { setView("dashboard"); reset(); }} style={{ ...btn2, padding: 12 }}><X size={20} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ borderRadius: 28, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "#fff" }}><Activity size={16} color="#F97316" /> Vitals</div>
                <Field label="Heart Rate"><input type="number" min="40" max="200" value={form.hr} onChange={(e) => setForm((p) => ({ ...p, hr: e.target.value }))} style={inp} placeholder="40-200" /></Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Systolic BP"><input type="number" value={form.sbp} onChange={(e) => setForm((p) => ({ ...p, sbp: e.target.value }))} style={inp} placeholder="SBP" /></Field>
                  <Field label="Diastolic BP"><input type="number" value={form.dbp} onChange={(e) => setForm((p) => ({ ...p, dbp: e.target.value }))} style={inp} placeholder="DBP" /></Field>
                </div>
                <Field label="SpO2"><input type="number" min="70" max="100" value={form.spo2} onChange={(e) => setForm((p) => ({ ...p, spo2: e.target.value }))} style={inp} placeholder="70-100%" /></Field>
                <Field label="Temperature"><input type="number" min="95" max="108" step="0.1" value={form.temp} onChange={(e) => setForm((p) => ({ ...p, temp: e.target.value }))} style={inp} placeholder="95-108°F" /></Field>
                <Field label={`Pain Scale: ${form.painScale}/10`}><input type="range" min="0" max="10" value={form.painScale} onChange={(e) => setForm((p) => ({ ...p, painScale: Number(e.target.value) }))} style={{ accentColor: "#F97316", width: "100%" }} /></Field>
              </div>
              <div style={{ borderRadius: 28, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "#fff" }}><User size={16} color="#EAB308" /> Patient Profile</div>
                <Field label="Patient Name"><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={inp} placeholder="Full name" /></Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Age"><input type="number" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} style={inp} placeholder="Age" /></Field>
                  <Field label="Sex"><select value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value }))} style={inp}><option>Male</option><option>Female</option><option>Other</option></select></Field>
                </div>
                <Field label="Chief Complaint"><textarea rows={6} value={form.chiefComplaint} onChange={(e) => setForm((p) => ({ ...p, chiefComplaint: e.target.value }))} style={{ ...inp, resize: "vertical" }} placeholder="72yo male, chest pain radiating to left arm, diaphoretic, onset 20 minutes ago" /></Field>
                <button onClick={handleSubmit} disabled={analyzing} style={{ ...btn1, width: "100%", padding: "12px 20px" }}>
                  {analyzing ? <Loader2 size={16} className="anim-spin" /> : <ClipboardPlus size={16} />} Run Triage Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {view === "result" && draft?.esiResult && (
        <div style={{ position: "fixed", inset: 0, zIndex: 30, overflowY: "auto", backgroundColor: "rgba(0,0,0,.7)", padding: 16 }}>
          <div style={{ maxWidth: 1152, margin: "0 auto", borderRadius: 32, border: "1px solid #2D3348", backgroundColor: "#151925", padding: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <Badge level={draft.esiResult.level} />
                <div>
                  <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 30, color: "#fff" }}>ESI {draft.esiResult.level}</h2>
                  <div style={{ marginTop: 4, fontSize: 16, color: "#D1D5DB" }}>{ESI_META[draft.esiResult.level].label}</div>
                  <div style={{ marginTop: 12, fontSize: 14, color: "#9CA3AF" }}>Confidence {(draft.esiResult.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={addToQueue} style={btn1}><Plus size={16} /> Add to Queue</button>
                <button onClick={() => { reset(); setView("intake"); }} style={btn2}>New Patient</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
              <div style={{ borderRadius: 28, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#fff" }}>Clinical Reasoning</h3>
                  {streaming && <Spin label="Streaming" />}
                </div>
                <pre style={{ minHeight: 280, whiteSpace: "pre-wrap", wordBreak: "break-word", borderRadius: 16, border: "1px solid #2D3348", backgroundColor: "#11141D", padding: 16, fontFamily: "monospace", fontSize: 14, lineHeight: 1.8, color: "#D1D5DB", margin: 0 }}>{reasoning}</pre>
              </div>
              <div style={{ borderRadius: 28, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Factor Analysis</h3>
                <Chart factors={draft.esiResult.factors} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Sidebar */}
      {selected?.esiResult && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, backgroundColor: "rgba(0,0,0,.5)" }}>
          <button onClick={() => setSelected(null)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "default", background: "transparent", border: "none" }} />
          <aside style={{ position: "absolute", right: 0, top: 0, height: "100%", width: "100%", maxWidth: 400, overflowY: "auto", borderLeft: "1px solid #2D3348", backgroundColor: "#151925", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#fff" }}>{selected.name}</h3>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9CA3AF" }}>{selected.age}yo — {selected.sex}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge level={selected.esiResult.level} size={48} />
                <button onClick={() => setSelected(null)} style={{ ...btn2, padding: 12 }}><X size={16} /></button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { Icon: HeartPulse, l: "HR", v: `${selected.vitals.hr} bpm` },
                { Icon: Activity, l: "BP", v: `${selected.vitals.sbp}/${selected.vitals.dbp}` },
                { Icon: Waves, l: "SpO2", v: `${selected.vitals.spo2}%` },
                { Icon: Thermometer, l: "Temp", v: `${selected.vitals.temp}°F` },
                { Icon: AlertTriangle, l: "Pain", v: `${selected.vitals.painScale}/10` },
                { Icon: ClipboardPlus, l: "ESI", v: `Level ${selected.esiResult.level}` },
              ].map((x) => (
                <div key={x.l} style={{ borderRadius: 16, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: 16 }}>
                  <x.Icon size={16} color="#9CA3AF" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#6B7280" }}>{x.l}</div>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: "#fff" }}>{x.v}</div>
                </div>
              ))}
            </div>
            <div style={{ borderRadius: 28, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: 16, marginBottom: 24 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#fff" }}>Reasoning Trace</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, lineHeight: 1.6, color: "#D1D5DB" }}>
                {selected.esiResult.reasoning.map((s, i) => <p key={i} style={{ margin: 0 }}>→ {s}</p>)}
              </div>
            </div>
            <div style={{ borderRadius: 28, border: "1px solid #2D3348", backgroundColor: "#1A1D27", padding: 16 }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#fff" }}>Factor Analysis</h4>
              <Chart factors={selected.esiResult.factors} />
            </div>
            <button onClick={() => setSelected(null)} style={{ ...btn2, width: "100%", marginTop: 24 }}>Close</button>
          </aside>
        </div>
      )}
    </div>
  );
}
