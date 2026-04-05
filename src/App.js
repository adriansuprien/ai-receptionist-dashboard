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
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  // Greens (primary accent)
  green50:   "#F2F7EC",
  green100:  "#DFF0C8",
  green600:  "#3B6D11",
  green700:  "#2E5509",
  // Status colors
  amber50:   "#FFFBF0",
  amber600:  "#92570A",
  red50:     "#FEF2F2",
  red600:    "#991B1B",
  teal50:    "#F0FBF6",
  teal600:   "#0D6647",
  // Neutrals
  bg:        "#F9FAFB",
  surface:   "#FFFFFF",
  border:    "#E5E7EB",
  borderFaint: "#F3F4F6",
  text:      "#111827",
  textSub:   "#6B7280",
  textMuted: "#9CA3AF",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  completed: { dot: "#059669", bg: T.teal50,  text: T.teal600  },
  pending:   { dot: "#D97706", bg: T.amber50, text: T.amber600 },
  missed:    { dot: "#DC2626", bg: T.red50,   text: T.red600   },
  failed:    { dot: "#DC2626", bg: T.red50,   text: T.red600   },
};

const OUTCOME_STYLE = {
  "order placed":       { bg: T.green50,  text: T.green600, dot: "#4D8A16" },
  "missed opportunity": { bg: T.red50,    text: T.red600,   dot: "#DC2626" },
  "inquiry":            { bg: T.amber50,  text: T.amber600, dot: "#D97706" },
  "spam":               { bg: "#F9FAFB",  text: "#6B7280",  dot: "#9CA3AF" },
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

const cleanText = (text) => text ? text.replace(/\*\*/g, '').replace(/\*/g, '') : '';

// ─── SHARED UI ───────────────────────────────────────────────────────────────
function Pill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.text }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </span>
  );
}

function OutcomeBadge({ outcome }) {
  const s = OUTCOME_STYLE[outcome] || OUTCOME_STYLE["inquiry"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.text }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 24px" }}>
      <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 8px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 600, margin: 0, color: T.text, letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: T.textMuted, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Avatar({ name, size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: T.green50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 600, color: T.green600, flexShrink: 0 }}>
      {(name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px", ...style }}>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ width: 38, height: 22, borderRadius: 999, background: checked ? T.green600 : T.border, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 3, left: checked ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </div>
  );
}

function SettingsRow({ label, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${T.borderFaint}` }}>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.text }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textMuted }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function TInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, outline: "none", color: T.text, width: 220, background: T.surface }}
    />
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.surface, borderRadius: 16, width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", border: `1px solid ${T.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${T.borderFaint}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={call.customer_name} size={44} />
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: T.text }}>{call.customer_name || "Unknown"}</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: T.textSub }}>{call.phone_number || "No phone"}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: T.textMuted, lineHeight: 1, padding: "0 4px" }}>×</button>
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
              <div key={k} style={{ background: T.bg, borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 11, color: T.textMuted, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{k}</p>
                <p style={{ margin: 0, fontSize: 13, color: T.text, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderFaint}` }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Transcript</p>
          <div style={{ background: T.bg, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#374151", lineHeight: 1.7, maxHeight: 180, overflowY: "auto", border: `1px solid ${T.borderFaint}` }}>
            {call.transcript || "No transcript available for this call."}
          </div>
        </div>

        {/* Outcome */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderFaint}` }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Outcome</p>
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
                    border:     active ? `1.5px solid ${s.dot}` : `1px solid ${T.border}`,
                    background: active ? s.bg : "transparent",
                    color:      active ? s.text : T.textSub,
                  }}
                >
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Insights */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderFaint}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>AI Insights</p>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: T.green50, color: T.green600, fontWeight: 500 }}>Coming soon</span>
          </div>
          <div style={{ background: T.bg, borderRadius: 10, padding: "14px 16px", border: `1px dashed ${T.border}` }}>
            <p style={{ margin: 0, fontSize: 13, color: T.textMuted, fontStyle: "italic" }}>
              Auto-generated insights will appear here once full transcripts are available.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Actions</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Call back",         color: T.text,     onClick: () => call.phone_number && (window.location.href = `tel:${call.phone_number}`) },
              { label: markedOrder ? "Marked!" : "Mark as order", color: T.green600, onClick: () => setMarkedOrder(true) },
              { label: "Forward to staff",  color: "#D97706",  onClick: () => alert("Hook up to your backend") },
            ].map(({ label, color, onClick }) => (
              <button key={label} onClick={onClick} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${T.border}`,
                background: "transparent", color, cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text" placeholder="Add a note..."
              value={note} onChange={e => setNote(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddNote()}
              style={{ flex: 1, fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, outline: "none", color: T.text, background: T.surface }}
            />
            <button
              onClick={handleAddNote}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: noteAdded ? "#059669" : T.green600, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
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
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: "-0.01em" }}>Dashboard</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <StatCard label="Total calls"   value={total}          />
        <StatCard label="Total minutes" value={minutes}        />
        <StatCard label="Calls today"   value={today}          />
        <StatCard label="Missed calls"  value={missed}         />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard label="Conversion rate" value={`${convRate}%`}  sub="calls to orders" />
        <StatCard label="Avg duration"    value={`${avgDur} min`} />
        <div style={{ flex: 1 }} /><div style={{ flex: 1 }} />
      </div>

      <Card>
        <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: T.text }}>Recent calls</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "25%" }} /><col style={{ width: "22%" }} />
            <col style={{ width: "38%" }} /><col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.borderFaint}` }}>
              {["Name","Phone","Transcript","Status"].map(h => (
                <th key={h} style={{ padding: "0 0 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: T.textMuted }}>No calls yet</td></tr>
            ) : recent.map((call, i) => (
              <tr key={i} style={{ borderBottom: i < recent.length - 1 ? `1px solid ${T.borderFaint}` : "none" }}>
                <td style={{ padding: "13px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={call.customer_name} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{call.customer_name || "Unknown"}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 0", fontSize: 13, color: T.textSub }}>{call.phone_number || "—"}</td>
                <td style={{ padding: "13px 12px 13px 0", fontSize: 13, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{call.transcript || "—"}</td>
                <td style={{ padding: "13px 0" }}><Pill status={getStatus(call)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: "-0.01em" }}>Calls</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Full call history — click any row for details</p>
      </div>

      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text" placeholder="Search by name or phone..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, outline: "none", color: T.text, flex: 1, minWidth: 180, background: T.surface }}
          />
          {["all","completed","pending","missed"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 12, padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 500,
              background: filter === f ? T.green600 : T.bg,
              color:      filter === f ? "#fff"      : T.textSub,
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
            <tr style={{ borderBottom: `1px solid ${T.borderFaint}` }}>
              {["Name","Phone","Duration","Transcript","Status"].map(h => (
                <th key={h} style={{ padding: "0 0 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: T.textMuted }}>No calls found</td></tr>
            ) : filtered.map((call, i) => (
              <tr key={i} onClick={() => setSelected(call)}
                style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderFaint}` : "none", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "13px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={call.customer_name} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{call.customer_name || "Unknown"}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 0", fontSize: 13, color: T.textSub }}>{call.phone_number || "—"}</td>
                <td style={{ padding: "13px 0", fontSize: 13, color: T.textMuted }}>{call.duration ? `${call.duration}m` : "—"}</td>
                <td style={{ padding: "13px 12px 13px 0", fontSize: 13, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{call.transcript || "—"}</td>
                <td style={{ padding: "13px 0" }}><Pill status={getStatus(call)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

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
    <div style={{ height: 6, borderRadius: 999, background: T.borderFaint, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 999, background: color, width: max > 0 ? `${Math.round((value / max) * 100)}%` : "0%" }} />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: "-0.01em" }}>Analytics</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Insights to show your value</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Answered rate"  value={`${answered}%`}              sub={`${completed} of ${total} calls`} />
        <StatCard label="Avg duration"   value={`${avgDur} min`}             sub="per call" />
        <StatCard label="Peak call time" value={total > 0 ? peakLabel : "—"} sub="busiest hour" />
        <StatCard label="Missed calls"   value={missed}                      sub={`${pending} pending`} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: T.text }}>Call outcomes</h2>
          {[
            { label: "Completed", value: completed, color: "#059669" },
            { label: "Pending",   value: pending,   color: "#D97706" },
            { label: "Missed",    value: missed,    color: "#DC2626" },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: T.text }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.value}</span>
              </div>
              <Bar value={item.value} max={total} color={item.color} />
            </div>
          ))}
        </Card>

        <Card style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: T.text }}>Top customer intents</h2>
          {intents.length === 0 ? (
            <p style={{ fontSize: 13, color: T.textMuted }}>Not enough data yet</p>
          ) : intents.map(([intent, count]) => (
            <div key={intent} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: T.text, textTransform: "capitalize" }}>{intent}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{count}</span>
              </div>
              <Bar value={count} max={maxIntent} color={T.green600} />
            </div>
          ))}
        </Card>
      </div>
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
      return "Today · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: "-0.01em" }}>Orders</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
          {orders.length} order{orders.length !== 1 ? "s" : ""} received
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <p style={{ textAlign: "center", color: T.textMuted, fontSize: 13, padding: "32px 0" }}>No orders yet</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {orders.map(call => {
            const status = getOrderStatus(call);
            const isNew  = status === "new";

            return (
              <div key={call.id} style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "20px",
                display: "flex", flexDirection: "column", gap: 16,
              }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>Order #{call.id}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textMuted }}>{fmtTime(call.created_at)}</p>
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 600, padding: "3px 10px",
                    borderRadius: 999,
                    background: isNew ? T.amber50  : T.green50,
                    color:      isNew ? T.amber600 : T.green600,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: isNew ? "#D97706" : "#059669",
                    }} />
                    {isNew ? "New" : "Completed"}
                  </span>
                </div>

                {/* Items */}
                <div style={{ background: T.bg, borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Items</p>
                  <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.65 }}>
                    {cleanText(call.order_summary)}
                  </p>
                </div>

                {/* Phone */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M3.5 2h2.25l1 3-1.5 1a8 8 0 0 0 4.75 4.75l1-1.5 3 1V12.5a1.5 1.5 0 0 1-1.5 1.5C5.2 14 2 10.8 2 3.5A1.5 1.5 0 0 1 3.5 2z" fill={T.textMuted}/>
                  </svg>
                  <span style={{ fontSize: 13, color: T.textSub }}>{call.phone_number || "—"}</span>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleStatus(call)}
                  style={{
                    marginTop: "auto",
                    padding: "9px 0", borderRadius: 8,
                    border: `1px solid ${isNew ? T.green600 : T.border}`,
                    cursor: "pointer", fontSize: 13, fontWeight: 500,
                    background: isNew ? T.green600 : "transparent",
                    color:      isNew ? "#fff"     : T.textSub,
                    transition: "all 0.15s",
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: "-0.01em" }}>Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Customize how your AI receptionist behaves</p>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: T.text }}>Business info</h2>
        <SettingsRow label="Business name" sub="Shown in AI greetings">
          <TInput value={form.businessName} onChange={v => set("businessName", v)} placeholder="e.g. RimReaper Detailing" />
        </SettingsRow>
        <SettingsRow label="Greeting message" sub="What the AI says on pickup">
          <TInput value={form.greeting} onChange={v => set("greeting", v)} placeholder="e.g. Thanks for calling..." />
        </SettingsRow>
        <SettingsRow label="Forwarding number" sub="Handoff number for human agents">
          <TInput value={form.forwardNumber} onChange={v => set("forwardNumber", v)} placeholder="+1 (555) 000-0000" />
        </SettingsRow>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: T.text }}>Hours</h2>
        <SettingsRow label="AI active hours" sub="AI only answers calls during this window">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TInput value={form.openTime}  onChange={v => set("openTime", v)}  type="time" />
            <span style={{ fontSize: 13, color: T.textMuted }}>to</span>
            <TInput value={form.closeTime} onChange={v => set("closeTime", v)} type="time" />
          </div>
        </SettingsRow>
      </Card>

      <Card style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: T.text }}>Call behavior</h2>
        <SettingsRow label="Take orders" sub="AI can accept and log orders from callers">
          <Toggle checked={form.takeOrders} onChange={v => set("takeOrders", v)} />
        </SettingsRow>
        <SettingsRow label="Book appointments" sub="AI can schedule appointments">
          <Toggle checked={form.bookAppointments} onChange={v => set("bookAppointments", v)} />
        </SettingsRow>
      </Card>

      <button onClick={save} style={{
        padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
        background: saved ? "#059669" : T.green600, color: "#fff", transition: "background 0.2s",
      }}>
        {saved ? "Saved!" : "Save settings"}
      </button>
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
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 216, background: T.surface, borderRight: `1px solid ${T.border}`, padding: "24px 12px", display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 28, paddingLeft: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.green600, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a5.5 5.5 0 0 0-5.5 5.5c0 1.8.87 3.4 2.2 4.4L4 14l3-1.5a5.5 5.5 0 1 0 1-11.5z" fill="white" opacity="0.95"/></svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: T.text, letterSpacing: "-0.01em" }}>AI Receptionist</span>
        </div>

        {NAV.map(({ id, icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7,
              border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", width: "100%",
              fontWeight:  active ? 500 : 400,
              background:  active ? T.green50  : "transparent",
              color:       active ? T.green700  : T.textSub,
            }}>
              <span style={{ color: active ? T.green600 : T.textMuted, display: "flex", flexShrink: 0 }}>{icon}</span>
              {id}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, paddingLeft: 2 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.green50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: T.green600 }}>AD</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: T.text }}>Admin</p>
              <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>Owner</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
        {page === "Dashboard" && <DashboardPage calls={calls} analytics={analytics} />}
        {page === "Calls"     && <CallsPage     calls={calls} />}
        {page === "Analytics" && <AnalyticsPage calls={calls} analytics={analytics} />}
        {page === "Orders"    && <OrdersPage    calls={calls} />}
        {page === "Settings"  && <SettingsPage />}
      </div>
    </div>
  );
}
