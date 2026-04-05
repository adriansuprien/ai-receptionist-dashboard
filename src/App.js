import { useEffect, useState } from "react";

// ─── API ──────────────────────────────────────────────────────────────────────
const API_BASE = "https://ai-receptionist-backend-ol57.onrender.com";

const fetchWithRetry = async (url, retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} responded with ${r.status}`);
      return await r.json();
    } catch (err) {
      console.warn(`[API] Attempt ${attempt}/${retries} failed for ${url}:`, err.message);
      if (attempt === retries) throw err;
      console.log(`[API] Retrying in ${delay / 1000}s...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// ─── THEME ───────────────────────────────────────────────────────────────────
const P = {
  purple50:  "#EEEDFE",
  purple100: "#CECBF6",
  purple400: "#7F77DD",
  purple600: "#534AB7",
  purple800: "#3C3489",
  teal50:    "#E1F5EE",
  teal800:   "#085041",
  amber50:   "#FAEEDA",
  amber800:  "#633806",
  red50:     "#FCEBEB",
  red800:    "#791F1F",
  green50:   "#EAF3DE",
  green800:  "#27500A",
  border:    "#e8e6f4",
  bg:        "#f7f6fc",
  text:      "#1a1a1a",
  muted:     "#888",
  faint:     "#f2f0fb",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  completed: { dot: "#1D9E75", bg: P.teal50,  text: P.teal800  },
  pending:   { dot: "#EF9F27", bg: P.amber50, text: P.amber800 },
  missed:    { dot: "#E24B4A", bg: P.red50,   text: P.red800   },
  failed:    { dot: "#E24B4A", bg: P.red50,   text: P.red800   },
};

const OUTCOME_STYLE = {
  "order placed":       { bg: P.green50, text: P.green800, dot: "#639922" },
  "missed opportunity": { bg: P.red50,   text: P.red800,   dot: "#E24B4A" },
  "inquiry":            { bg: P.amber50, text: P.amber800, dot: "#EF9F27" },
  "spam":               { bg: "#F1EFE8", text: "#5F5E5A",  dot: "#888780" },
};

function getStatus(call) {
  if (call.status) return call.status.toLowerCase();
  if (call.transcript && call.transcript.trim().length > 0) return "completed";
  return "pending";
}

function inferOutcome(call) {
  if (call.outcome) return call.outcome.toLowerCase();
  const t = (call.transcript || "").toLowerCase();
  if (t.includes("order") || t.includes("placed") || t.includes("confirm")) return "order placed";
  if (t.includes("missed") || t.includes("no answer") || t.includes("voicemail")) return "missed opportunity";
  if (t.includes("spam") || t.includes("robo")) return "spam";
  return "inquiry";
}

// ─── SHARED UI ───────────────────────────────────────────────────────────────
function Pill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.text }}>
        {status}
      </span>
    </span>
  );
}

function OutcomeBadge({ outcome }) {
  const s = OUTCOME_STYLE[outcome] || OUTCOME_STYLE["inquiry"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, padding: "5px 12px", borderRadius: 999, background: s.bg, color: s.text }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ flex: 1, background: "#fff", border: `0.5px solid ${P.border}`, borderLeft: `3px solid ${P.purple400}`, borderRadius: 10, padding: "18px 20px" }}>
      <p style={{ fontSize: 12, color: P.muted, margin: "0 0 6px", fontWeight: 500, letterSpacing: "0.03em" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 500, margin: 0, color: P.text }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: P.muted, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Avatar({ name, size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: P.purple50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 500, color: P.purple600, flexShrink: 0 }}>
      {(name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

function SectionCard({ children, style }) {
  return (
    <div style={{ background: "#fff", border: `0.5px solid ${P.border}`, borderRadius: 14, padding: "24px", ...style }}>
      {children}
    </div>
  );
}

function ActionBtn({ label, color = P.purple400, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "9px 0", borderRadius: 8, border: `0.5px solid ${color}`,
      background: "transparent", color, cursor: "pointer", fontSize: 13, fontWeight: 500,
    }}>
      {label}
    </button>
  );
}

function TInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `0.5px solid ${P.border}`, outline: "none", color: P.text, width: 220, background: "#fff" }}
    />
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ width: 40, height: 22, borderRadius: 999, background: checked ? P.purple400 : "#ddd", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </div>
  );
}

function SettingsRow({ label, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `0.5px solid ${P.faint}` }}>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: P.text }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: P.muted }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── CALL DETAIL MODAL ───────────────────────────────────────────────────────
function CallDetailModal({ call, onClose }) {
  const [note,        setNote]        = useState("");
  const [noteAdded,   setNoteAdded]   = useState(false);
  const [markedOrder, setMarkedOrder] = useState(false);

  const status  = getStatus(call);
  const outcome = markedOrder ? "order placed" : inferOutcome(call);

  const fmt = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    setNoteAdded(true);
    setNote("");
    setTimeout(() => setNoteAdded(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,10,40,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", border: `0.5px solid ${P.border}` }}
      >
        {/* Section 1 – Basic info */}
        <div style={{ padding: "24px 24px 20px", borderBottom: `0.5px solid ${P.faint}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={call.customer_name} size={48} />
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 500, color: P.text }}>{call.customer_name || "Unknown"}</p>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: P.muted }}>{call.phone_number || "No phone"}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 22, color: P.muted, lineHeight: 1, padding: "0 4px" }}>×</button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Pill status={status} />
            <OutcomeBadge outcome={outcome} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              ["Date & time", fmt(call.created_at)],
              ["Duration",    call.duration ? `${call.duration} min` : "—"],
              ["Call ID",     call.id ? `#${call.id}` : "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ background: P.bg, borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ margin: "0 0 3px", fontSize: 11, color: P.muted, fontWeight: 500, letterSpacing: "0.03em" }}>{k.toUpperCase()}</p>
                <p style={{ margin: 0, fontSize: 13, color: P.text, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 – Transcript */}
        <div style={{ padding: "20px 24px", borderBottom: `0.5px solid ${P.faint}` }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 500, color: P.muted, letterSpacing: "0.04em" }}>TRANSCRIPT</p>
          <div style={{ background: P.bg, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#444", lineHeight: 1.7, maxHeight: 180, overflowY: "auto", border: `0.5px solid ${P.faint}` }}>
            {call.transcript || "No transcript available for this call."}
          </div>
        </div>

        {/* Section 3 – Outcome */}
        <div style={{ padding: "20px 24px", borderBottom: `0.5px solid ${P.faint}` }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 500, color: P.muted, letterSpacing: "0.04em" }}>OUTCOME</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["order placed", "missed opportunity", "inquiry", "spam"].map(o => {
              const s = OUTCOME_STYLE[o];
              const active = outcome === o;
              return (
                <button
                  key={o}
                  onClick={() => o === "order placed" ? setMarkedOrder(true) : setMarkedOrder(false)}
                  style={{
                    padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer",
                    border:     active ? `1.5px solid ${s.dot}` : `0.5px solid ${P.border}`,
                    background: active ? s.bg : "transparent",
                    color:      active ? s.text : P.muted,
                  }}
                >
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4 – AI Insights */}
        <div style={{ padding: "20px 24px", borderBottom: `0.5px solid ${P.faint}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: P.muted, letterSpacing: "0.04em" }}>AI INSIGHTS</p>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: P.purple50, color: P.purple600, fontWeight: 500 }}>Coming soon</span>
          </div>
          <div style={{ background: P.bg, borderRadius: 10, padding: "14px 16px", border: `0.5px dashed ${P.border}` }}>
            <p style={{ margin: 0, fontSize: 13, color: "#bbb", fontStyle: "italic" }}>
              Auto-generated insights will appear here once full transcripts are available — e.g. "Customer wanted chicken over rice", "Call ended without order → possible lost sale"
            </p>
          </div>
        </div>

        {/* Section 5 – Actions */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 500, color: P.muted, letterSpacing: "0.04em" }}>ACTIONS</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <ActionBtn label="Call back"                                 color={P.purple400} onClick={() => call.phone_number && (window.location.href = `tel:${call.phone_number}`)} />
            <ActionBtn label={markedOrder ? "Marked!" : "Mark as order"} color="#1D9E75"     onClick={() => setMarkedOrder(true)} />
            <ActionBtn label="Forward to staff"                          color="#EF9F27"     onClick={() => alert("Hook up to your backend")} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Add a note..."
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddNote()}
              style={{ flex: 1, fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `0.5px solid ${P.border}`, outline: "none", color: P.text, background: "#fff" }}
            />
            <button
              onClick={handleAddNote}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: noteAdded ? "#1D9E75" : P.purple400, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              {noteAdded ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function DashboardPage({ calls, analytics }) {
  const total     = analytics.total_calls   ?? calls.length;
  const minutes   = analytics.total_minutes ?? 0;
  const today     = calls.filter(c => c.created_at && new Date(c.created_at).toDateString() === new Date().toDateString()).length;
  const completed = calls.filter(c => getStatus(c) === "completed").length;
  const missed    = calls.filter(c => ["missed","failed"].includes(getStatus(c))).length;
  const convRate  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const avgDur    = total > 0 ? Math.round(minutes / total) : 0;
  const recent    = [...calls].slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: P.text }}>Dashboard</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: P.muted }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <StatCard label="Total calls"     value={total}           />
        <StatCard label="Total minutes"   value={minutes}         />
        <StatCard label="Calls today"     value={today}           />
        <StatCard label="Missed calls"    value={missed}          />
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard label="Conversion rate" value={`${convRate}%`}  sub="calls to orders" />
        <StatCard label="Avg duration"    value={`${avgDur} min`} />
        <div style={{ flex: 1 }} /><div style={{ flex: 1 }} />
      </div>

      <SectionCard>
        <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 500, color: P.text }}>Recent calls</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "25%" }} /><col style={{ width: "22%" }} />
            <col style={{ width: "38%" }} /><col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `0.5px solid ${P.faint}` }}>
              {["Name","Phone","Transcript","Status"].map(h => (
                <th key={h} style={{ padding: "0 0 12px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#aaa", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "#bbb" }}>No calls yet</td></tr>
            ) : recent.map((call, i) => (
              <tr key={i} style={{ borderBottom: i < recent.length - 1 ? `0.5px solid ${P.faint}` : "none" }}>
                <td style={{ padding: "13px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={call.customer_name} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: P.text }}>{call.customer_name || "Unknown"}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 0", fontSize: 13, color: "#666" }}>{call.phone_number || "—"}</td>
                <td style={{ padding: "13px 12px 13px 0", fontSize: 13, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{call.transcript || "—"}</td>
                <td style={{ padding: "13px 0" }}><Pill status={getStatus(call)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── CALLS ───────────────────────────────────────────────────────────────────
function CallsPage({ calls }) {
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = calls.filter(c => {
    const matchSearch =
      (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone_number  || "").includes(search);
    const s = getStatus(c);
    return matchSearch && (filter === "all" || s === filter);
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: P.text }}>Calls</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: P.muted }}>Full call history — click any row for details</p>
      </div>

      <SectionCard>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text" placeholder="Search by name or phone..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `0.5px solid ${P.border}`, outline: "none", color: P.text, flex: 1, minWidth: 180, background: "#fff" }}
          />
          {["all","completed","pending","missed"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 12, padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 500,
              background: filter === f ? P.purple400 : P.purple50,
              color:      filter === f ? "#fff"       : P.purple600,
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "20%" }} /><col style={{ width: "18%" }} />
            <col style={{ width: "10%" }} /><col style={{ width: "37%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `0.5px solid ${P.faint}` }}>
              {["Name","Phone","Duration","Transcript","Status"].map(h => (
                <th key={h} style={{ padding: "0 0 12px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#aaa", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "#bbb" }}>No calls found</td></tr>
            ) : filtered.map((call, i) => (
              <tr key={i} onClick={() => setSelected(call)}
                style={{ borderBottom: i < filtered.length - 1 ? `0.5px solid ${P.faint}` : "none", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = P.faint}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "13px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={call.customer_name} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: P.text }}>{call.customer_name || "Unknown"}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 0", fontSize: 13, color: "#666" }}>{call.phone_number || "—"}</td>
                <td style={{ padding: "13px 0", fontSize: 13, color: P.muted }}>{call.duration ? `${call.duration}m` : "—"}</td>
                <td style={{ padding: "13px 12px 13px 0", fontSize: 13, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{call.transcript || "—"}</td>
                <td style={{ padding: "13px 0" }}><Pill status={getStatus(call)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {selected && <CallDetailModal call={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
function AnalyticsPage({ calls, analytics }) {
  const total     = analytics.total_calls   ?? calls.length;
  const minutes   = analytics.total_minutes ?? 0;
  const completed = calls.filter(c => getStatus(c) === "completed").length;
  const missed    = calls.filter(c => ["missed","failed"].includes(getStatus(c))).length;
  const pending   = calls.filter(c => getStatus(c) === "pending").length;
  const answered  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const avgDur    = total > 0 ? Math.round(minutes / total) : 0;

  const hourCounts = Array(24).fill(0);
  calls.forEach(c => { if (c.created_at) hourCounts[new Date(c.created_at).getHours()]++; });
  const peakHour  = hourCounts.indexOf(Math.max(...hourCounts));
  const peakLabel = peakHour === 0 ? "12 AM" : peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? "12 PM" : `${peakHour - 12} PM`;

  const intentMap = calls.reduce((acc, c) => {
    const t = (c.transcript || "").toLowerCase();
    const key = t.includes("order") ? "order" : (t.includes("book") || t.includes("appoint")) ? "booking" : (t.includes("?") || t.includes("question")) ? "inquiry" : "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const intents   = Object.entries(intentMap).sort((a, b) => b[1] - a[1]);
  const maxIntent = intents[0]?.[1] || 1;

  const Bar = ({ value, max, color }) => (
    <div style={{ height: 6, borderRadius: 999, background: P.faint, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 999, background: color, width: max > 0 ? `${Math.round((value / max) * 100)}%` : "0%" }} />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: P.text }}>Analytics</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: P.muted }}>Insights to show your value</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Answered rate"  value={`${answered}%`}          sub={`${completed} of ${total} calls`} />
        <StatCard label="Avg duration"   value={`${avgDur} min`}         sub="per call" />
        <StatCard label="Peak call time" value={total > 0 ? peakLabel : "—"} sub="busiest hour" />
        <StatCard label="Missed calls"   value={missed}                  sub={`${pending} pending`} />
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <SectionCard style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 500, color: P.text }}>Call outcomes</h2>
          {[
            { label: "Completed", value: completed, color: "#1D9E75" },
            { label: "Pending",   value: pending,   color: "#EF9F27" },
            { label: "Missed",    value: missed,    color: "#E24B4A" },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: P.text }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: P.text }}>{item.value}</span>
              </div>
              <Bar value={item.value} max={total} color={item.color} />
            </div>
          ))}
        </SectionCard>

        <SectionCard style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 500, color: P.text }}>Top customer intents</h2>
          {intents.length === 0 ? (
            <p style={{ fontSize: 13, color: P.muted }}>Not enough data yet</p>
          ) : intents.map(([intent, count]) => (
            <div key={intent} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: P.text, textTransform: "capitalize" }}>{intent}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: P.text }}>{count}</span>
              </div>
              <Bar value={count} max={maxIntent} color={P.purple400} />
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function SettingsPage() {
  const [form, setForm] = useState({
    businessName: "", greeting: "", forwardNumber: "",
    openTime: "09:00", closeTime: "17:00",
    takeOrders: true, bookAppointments: false,
  });
  const [saved, setSaved] = useState(false);

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const save = () => {
    console.log("Settings saved:", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: P.text }}>Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: P.muted }}>Customize how your AI receptionist behaves</p>
      </div>

      <SectionCard style={{ marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 500, color: P.text }}>Business info</h2>
        <SettingsRow label="Business name" sub="Shown in AI greetings">
          <TInput value={form.businessName} onChange={v => set("businessName", v)} placeholder="e.g. RimReaper Detailing" />
        </SettingsRow>
        <SettingsRow label="Greeting message" sub="What the AI says on pickup">
          <TInput value={form.greeting} onChange={v => set("greeting", v)} placeholder="e.g. Thanks for calling..." />
        </SettingsRow>
        <SettingsRow label="Forwarding number" sub="Handoff number for human agents">
          <TInput value={form.forwardNumber} onChange={v => set("forwardNumber", v)} placeholder="+1 (555) 000-0000" />
        </SettingsRow>
      </SectionCard>

      <SectionCard style={{ marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 500, color: P.text }}>Hours</h2>
        <SettingsRow label="AI active hours" sub="AI only answers calls during this window">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TInput value={form.openTime}  onChange={v => set("openTime", v)}  type="time" />
            <span style={{ fontSize: 13, color: P.muted }}>to</span>
            <TInput value={form.closeTime} onChange={v => set("closeTime", v)} type="time" />
          </div>
        </SettingsRow>
      </SectionCard>

      <SectionCard style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 500, color: P.text }}>Call behavior</h2>
        <SettingsRow label="Take orders" sub="AI can accept and log orders from callers">
          <Toggle checked={form.takeOrders} onChange={v => set("takeOrders", v)} />
        </SettingsRow>
        <SettingsRow label="Book appointments" sub="AI can schedule appointments">
          <Toggle checked={form.bookAppointments} onChange={v => set("bookAppointments", v)} />
        </SettingsRow>
      </SectionCard>

      <button onClick={save} style={{
        padding: "11px 28px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
        background: saved ? "#1D9E75" : P.purple400, color: "#fff", transition: "background 0.3s",
      }}>
        {saved ? "Saved!" : "Save settings"}
      </button>
    </div>
  );
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────
function OrdersPage({ calls }) {
  const [orderStatuses, setOrderStatuses] = useState({});

  const orders = calls.filter(c => c.order_summary && c.order_summary.trim());

  const getOrderStatus = (call) => {
    if (orderStatuses[call.id] !== undefined) return orderStatuses[call.id];
    return getStatus(call) === "completed" ? "completed" : "new";
  };

  const toggleStatus = async (call) => {
    const current = getOrderStatus(call);
    const next = current === "new" ? "completed" : "new";
    setOrderStatuses(prev => ({ ...prev, [call.id]: next }));
    try {
      await fetch(`${API_BASE}/calls/${call.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    } catch (err) {
      console.error("[API] Failed to update order status:", err);
      setOrderStatuses(prev => ({ ...prev, [call.id]: current }));
    }
  };

  const fmtTime = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    if (d.toDateString() === new Date().toDateString()) {
      return "Today, " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: P.text }}>Orders</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: P.muted }}>
          {orders.length} order{orders.length !== 1 ? "s" : ""} received
        </p>
      </div>

      {orders.length === 0 ? (
        <SectionCard>
          <p style={{ textAlign: "center", color: P.muted, fontSize: 13, padding: "24px 0" }}>No orders yet</p>
        </SectionCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {orders.map(call => {
            const status = getOrderStatus(call);
            const isNew = status === "new";
            const badge = isNew
              ? { bg: P.amber50,  text: P.amber800, dot: "#EF9F27" }
              : { bg: P.teal50,   text: P.teal800,  dot: "#1D9E75" };

            return (
              <div key={call.id} style={{
                background: "#fff", border: `0.5px solid ${P.border}`,
                borderRadius: 14, padding: "20px",
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: P.text }}>Order #{call.id}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: P.muted }}>{fmtTime(call.created_at)}</p>
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 500, padding: "4px 10px",
                    borderRadius: 999, background: badge.bg, color: badge.text,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot, display: "inline-block" }} />
                    {isNew ? "New" : "Completed"}
                  </span>
                </div>

                {/* Order summary */}
                <div style={{ background: P.bg, borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 500, color: P.muted, letterSpacing: "0.04em" }}>ORDER SUMMARY</p>
                  <p style={{ margin: 0, fontSize: 13, color: P.text, lineHeight: 1.6 }}>{call.order_summary}</p>
                </div>

                {/* Phone */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M3.5 2h2.25l1 3-1.5 1a8 8 0 0 0 4.75 4.75l1-1.5 3 1V12.5a1.5 1.5 0 0 1-1.5 1.5C5.2 14 2 10.8 2 3.5A1.5 1.5 0 0 1 3.5 2z" fill="#aaa"/>
                  </svg>
                  <span style={{ fontSize: 13, color: "#666" }}>{call.phone_number || "—"}</span>
                </div>

                {/* Toggle button */}
                <button
                  onClick={() => toggleStatus(call)}
                  style={{
                    padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500,
                    background: isNew ? P.purple400 : P.faint,
                    color: isNew ? "#fff" : P.muted,
                  }}
                >
                  {isNew ? "Mark as completed" : "Mark as new"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "Dashboard", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4"/></svg> },
  { id: "Calls",     icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 2h2.25l1 3-1.5 1a8 8 0 0 0 4.75 4.75l1-1.5 3 1V12.5a1.5 1.5 0 0 1-1.5 1.5C5.2 14 2 10.8 2 3.5A1.5 1.5 0 0 1 3.5 2z" fill="currentColor" opacity="0.7"/></svg> },
  { id: "Analytics", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor" opacity="0.5"/><rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor" opacity="0.7"/><rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor" opacity="0.9"/></svg> },
  { id: "Orders",    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.8"/><path d="M5 4V3a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/></svg> },
  { id: "Settings",  icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
];

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [calls,     setCalls]     = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [page,      setPage]      = useState("Dashboard");

  useEffect(() => {
    fetchWithRetry(`${API_BASE}/calls`)
      .then(data => setCalls(data))
      .catch(err => console.error("[API] All retries failed for /calls:", err));

    fetchWithRetry(`${API_BASE}/analytics`)
      .then(data => setAnalytics(data))
      .catch(err => console.error("[API] All retries failed for /analytics:", err));
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: P.bg, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 220, background: "#fff", borderRight: `0.5px solid ${P.border}`, padding: "28px 16px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, paddingLeft: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: P.purple400, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a5.5 5.5 0 0 0-5.5 5.5c0 1.8.87 3.4 2.2 4.4L4 14l3-1.5a5.5 5.5 0 1 0 1-11.5z" fill="white" opacity="0.9"/></svg>
          </div>
          <span style={{ fontWeight: 500, fontSize: 15, color: P.text }}>AI Receptionist</span>
        </div>

        {NAV.map(({ id, icon }) => (
          <button key={id} onClick={() => setPage(id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8,
            border: "none", cursor: "pointer", fontSize: 14, textAlign: "left",
            fontWeight:  page === id ? 500 : 400,
            background:  page === id ? P.purple50 : "transparent",
            color:       page === id ? P.purple600 : "#666",
          }}>
            <span style={{ color: page === id ? P.purple400 : "#aaa", display: "flex" }}>{icon}</span>
            {id}
          </button>
        ))}

        <div style={{ marginTop: "auto", paddingTop: 24, borderTop: `0.5px solid ${P.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: P.purple100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: P.purple800 }}>AD</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: P.text }}>Admin</p>
              <p style={{ margin: 0, fontSize: 11, color: P.muted }}>Owner</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        {page === "Dashboard" && <DashboardPage calls={calls} analytics={analytics} />}
        {page === "Calls"     && <CallsPage     calls={calls} />}
        {page === "Analytics" && <AnalyticsPage calls={calls} analytics={analytics} />}
        {page === "Orders"    && <OrdersPage    calls={calls} />}
        {page === "Settings"  && <SettingsPage />}
      </div>
    </div>
  );
}