import { useCallback, useEffect, useState } from "react";

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
  // Orange accent
  orange:       "#E8671A",
  orangeHover:  "#D05A14",
  orange10:     "#FDF3EC",
  orange20:     "#FAE3D0",
  // Backgrounds
  bg:           "#F5F0E8",
  surface:      "#FFFFFF",
  surfaceWarm:  "#FAF7F2",
  // Borders
  border:       "#E8E0D4",
  borderFaint:  "#F0EBE3",
  // Text
  text:         "#2C1810",
  textSub:      "#7A6458",
  textMuted:    "#A89080",
  // Status
  red50:        "#FEF2F2",
  red700:       "#B91C1C",
  amber50:      "#FFFBF0",
  amber700:     "#B45309",
  teal50:       "#F0FBF7",
  teal700:      "#0F6648",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  completed: { dot: "#0F9E6A", bg: T.teal50,  text: T.teal700  },
  pending:   { dot: "#D97706", bg: T.amber50, text: T.amber700 },
};

const OUTCOME_STYLE = {
  "order placed":       { bg: T.orange10, text: T.orange,  dot: T.orange  },
  "missed opportunity": { bg: T.red50,    text: T.red700,  dot: "#DC2626" },
  "inquiry":            { bg: T.amber50,  text: T.amber700,dot: "#D97706" },
  "spam":               { bg: T.surfaceWarm, text: T.textMuted, dot: T.textMuted },
};

function getStatus(call) {
  if (call.status) return call.status.toLowerCase();
  if (call.transcript && call.transcript.trim().length > 0) return "completed";
  return "pending";
}

function isOrderCall(call) {
  return call.order_status === "new";
}

function cleanName(name) {
  if (!name) return "—";
  const cleaned = name.replace(/\*\*/g, "").replace(/\*/g, "").trim();
  if (!cleaned || ["not provided", "unknown", "n/a"].includes(cleaned.toLowerCase())) return "—";
  return cleaned;
}

function inferOutcome(call) {
  if (call.outcome) return call.outcome.toLowerCase();
  if (isOrderCall(call)) return "order placed";
  const t = (call.transcript || "").toLowerCase();
  if (t.includes("missed") || t.includes("no answer") || t.includes("voicemail")) return "missed opportunity";
  if (t.includes("spam") || t.includes("robo")) return "spam";
  return "inquiry";
}

// ─── SHARED UI ───────────────────────────────────────────────────────────────
function Pill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.text, letterSpacing: "0.02em" }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </span>
  );
}

function OutcomeBadge({ outcome }) {
  const s = OUTCOME_STYLE[outcome] || OUTCOME_STYLE["inquiry"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.text, letterSpacing: "0.02em" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      flex: 1, background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "20px 24px",
      boxShadow: "0 1px 4px rgba(44,24,16,0.06)",
    }}>
      <p style={{ fontSize: 11, color: T.textMuted, margin: "0 0 10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: T.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: T.textMuted, margin: "6px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Avatar({ name, size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: T.orange10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: T.orange, flexShrink: 0 }}>
      {(name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px", boxShadow: "0 1px 4px rgba(44,24,16,0.05)", ...style }}>
      {children}
    </div>
  );
}

function OrangeBtn({ label, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 0", borderRadius: 8, border: "none",
      background: T.orange, color: "#fff",
      cursor: "pointer", fontSize: 13, fontWeight: 600,
      width: "100%", transition: "background 0.15s",
      ...style,
    }}
      onMouseEnter={e => e.currentTarget.style.background = T.orangeHover}
      onMouseLeave={e => e.currentTarget.style.background = T.orange}
    >
      {label}
    </button>
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
      style={{ position: "fixed", inset: 0, background: "rgba(44,24,16,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.surface, borderRadius: 16, width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", border: `1px solid ${T.border}`, boxShadow: "0 24px 64px rgba(44,24,16,0.16)" }}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${T.borderFaint}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={call.customer_name} size={44} />
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.text }}>{cleanName(call.customer_name)}</p>
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
              <div key={k} style={{ background: T.surfaceWarm, borderRadius: 8, padding: "10px 12px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 11, color: T.textMuted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{k}</p>
                <p style={{ margin: 0, fontSize: 13, color: T.text, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderFaint}` }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Transcript</p>
          <div style={{ background: T.surfaceWarm, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: T.textSub, lineHeight: 1.7, maxHeight: 180, overflowY: "auto", border: `1px solid ${T.borderFaint}` }}>
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

        {/* Actions */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Actions</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Call back",         onClick: () => call.phone_number && (window.location.href = `tel:${call.phone_number}`) },
              { label: markedOrder ? "Marked!" : "Mark as order", onClick: () => setMarkedOrder(true) },
              { label: "Forward to staff",  onClick: () => alert("Hook up to your backend") },
            ].map(({ label, onClick }) => (
              <button key={label} onClick={onClick} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${T.border}`,
                background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 13, fontWeight: 500,
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
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: noteAdded ? "#0F9E6A" : T.orange, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
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
  const minutes   = analytics.total_minutes ?? 0;
  const today     = calls.filter(c => c.created_at && new Date(c.created_at).toDateString() === new Date().toDateString()).length;
  const ordersToday = calls.filter(c => c.order_status === "new" && c.created_at && new Date(c.created_at).toDateString() === new Date().toDateString()).length;
  const recent    = [...calls].slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Dashboard</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <StatCard label="Total minutes" value={minutes}        />
        <StatCard label="Calls today"   value={today}          />
        <StatCard label="Orders today"  value={ordersToday}    />
      </div>

      <Card>
        <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: T.text }}>Recent calls</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "25%" }} /><col style={{ width: "22%" }} />
            <col style={{ width: "53%" }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.borderFaint}` }}>
              {["Name","Phone","Transcript"].map(h => (
                <th key={h} style={{ padding: "0 0 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: T.textMuted }}>No calls yet</td></tr>
            ) : recent.map((call, i) => (
              <tr key={i} style={{ borderBottom: i < recent.length - 1 ? `1px solid ${T.borderFaint}` : "none" }}>
                <td style={{ padding: "13px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={call.customer_name} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{cleanName(call.customer_name)}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 0", fontSize: 13, color: T.textSub }}>{call.phone_number || "—"}</td>
                <td style={{ padding: "13px 12px 13px 0", fontSize: 13, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{call.transcript || "—"}</td>
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
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Calls</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Full call history — click any row for details</p>
      </div>

      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text" placeholder="Search by name or phone..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, outline: "none", color: T.text, flex: 1, minWidth: 180, background: T.surface }}
          />
          {["all","completed","pending"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: 12, padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 600,
              background: filter === f ? T.orange   : T.surfaceWarm,
              color:      filter === f ? "#fff"     : T.textSub,
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
                <th key={h} style={{ padding: "0 0 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: T.textMuted }}>No calls found</td></tr>
            ) : filtered.map((call, i) => (
              <tr key={i} onClick={() => setSelected(call)}
                style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.borderFaint}` : "none", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = T.surfaceWarm}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "13px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={call.customer_name} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{cleanName(call.customer_name)}</span>
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
  const pending   = calls.filter(c => getStatus(c) === "pending").length;
  const avgDur    = total > 0 ? Math.round(minutes / total) : 0;

  const hourCounts = Array(24).fill(0);
  calls.forEach(c => { if (c.created_at) hourCounts[new Date(c.created_at).getHours()]++; });
  const peakHour  = hourCounts.indexOf(Math.max(...hourCounts));
  const peakLabel = peakHour === 0 ? "12 AM" : peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? "12 PM" : `${peakHour - 12} PM`;

  const Bar = ({ value, max, color }) => (
    <div style={{ height: 6, borderRadius: 999, background: T.borderFaint, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 999, background: color, width: max > 0 ? `${Math.round((value / max) * 100)}%` : "0%" }} />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Analytics</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Insights to show your value</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Avg duration"   value={`${avgDur} min`}             sub="per call" />
        <StatCard label="Peak call time" value={total > 0 ? peakLabel : "—"} sub="busiest hour" />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: T.text }}>Call outcomes</h2>
          {[
            { label: "Completed", value: completed, color: "#0F9E6A" },
            { label: "Pending",   value: pending,   color: "#D97706" },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: T.text }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{item.value}</span>
              </div>
              <Bar value={item.value} max={total} color={item.color} />
            </div>
          ))}
        </Card>

      </div>
    </div>
  );
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────
function OrdersPage({ calls, refreshCalls }) {
  const [orderStatuses, setOrderStatuses] = useState({});
  const [showCompleted, setShowCompleted] = useState(false);

  const activeOrders    = calls.filter(c => c.order_status === "new");
  const completedOrders = calls.filter(c => c.order_status === "completed");

  const getOrderStatus = (call) => {
    if (orderStatuses[call.id] !== undefined) return orderStatuses[call.id];
    return call.order_status === "completed" ? "completed" : "new";
  };

  const toggleStatus = async (call) => {
    const next = "completed";
    console.log("Patching call id:", call.id);
    try {
      const res = await fetch(`${API_BASE}/calls/${call.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      console.log("PATCH response:", res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOrderStatuses(prev => ({ ...prev, [call.id]: next }));
      refreshCalls();
    } catch (err) {
      console.error("[API] Failed to update order status:", err);
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

  const renderCard = (call, showButton) => {
    const status = getOrderStatus(call);
    const isNew  = status === "new";
    const raw    = call.order_summary || "";

    const extractField = (patterns) => {
      for (const re of patterns) {
        const m = raw.match(re);
        if (m && m[1] && m[1].trim()) return m[1].trim();
      }
      return null;
    };

    const EMPTY_VALUES = ["not provided", "none mentioned", "not specified"];
    const normalize = (val) => {
      const cleaned = val ? val.replace(/\*\*/g, "").replace(/^[*\-\s]+|[*\-\s]+$/g, "").trim() : "";
      return (!cleaned || EMPTY_VALUES.includes(cleaned.toLowerCase())) ? "—" : cleaned;
    };

    const rawItem   = extractField([/Items Ordered:\*\*\s*(.+?)(?:\n|$)/i, /Items?:\*\*\s*(.+?)(?:\n|$)/i, /Items?:\s*(.+?)(?:\n|$)/i]);
    const rawPickup = extractField([/Pickup Time:\*\*\s*(.+?)(?:\n|$)/i, /Pickup Time:\s*(.+?)(?:\n|$)/i]);
    const rawName   = extractField([/Customer Name:\*\*\s*(.+?)(?:\n|$)/i, /Customer Name:\s*(.+?)(?:\n|$)/i]);
    const rawPhone  = extractField([/Phone Number:\*\*\s*(.+?)(?:\n|$)/i, /Phone Number:\s*(.+?)(?:\n|$)/i]);

    const itemVal   = normalize(rawItem);
    const pickupVal = normalize(rawPickup);
    const nameVal   = normalize(rawName)   !== "—" ? normalize(rawName)   : cleanName(call.customer_name);
    const phoneVal  = normalize(rawPhone)  !== "—" ? normalize(rawPhone)  : (call.phone_number  || "—");

    return (
      <div key={call.id} style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: "20px",
        display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "0 1px 4px rgba(44,24,16,0.05)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>Order #{call.id}</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textMuted }}>{fmtTime(call.created_at)}</p>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
            background: isNew ? T.orange10 : T.surfaceWarm,
            color:      isNew ? T.orange   : T.textMuted,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isNew ? T.orange : T.textMuted }} />
            {isNew ? "New" : "Completed"}
          </span>
        </div>

        {/* Parsed fields */}
        <div style={{ background: T.surfaceWarm, borderRadius: 8, padding: "12px 14px", border: `1px solid ${T.borderFaint}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Name",   value: nameVal   },
            { label: "Phone",  value: phoneVal  },
            { label: "Item",   value: itemVal   },
            { label: "Pickup", value: pickupVal },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.05em", textTransform: "uppercase", width: 48, flexShrink: 0, paddingTop: 1 }}>{label}</span>
              <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Toggle button */}
        {showButton && <OrangeBtn label="Mark as completed" onClick={() => toggleStatus(call)} />}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Orders</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
          {activeOrders.length} active order{activeOrders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {activeOrders.length === 0 ? (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ textAlign: "center", color: T.textMuted, fontSize: 13, padding: "32px 0" }}>No active orders</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 32 }}>
          {activeOrders.map(call => renderCard(call, true))}
        </div>
      )}

      {completedOrders.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(p => !p)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "0 0 16px", fontSize: 13, fontWeight: 600, color: T.textSub }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{showCompleted ? "▾" : "▸"}</span>
            Completed orders ({completedOrders.length})
          </button>
          {showCompleted && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {completedOrders.map(call => renderCard(call, false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
const SETTINGS_DEFAULTS = {
  restaurantName: "", phoneNumber: "",
};

function SettingsPage() {
  const [form,      setForm]      = useState(SETTINGS_DEFAULTS);
  const [savedForm, setSavedForm] = useState(SETTINGS_DEFAULTS);
  const [dirty,     setDirty]     = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`);
        const data = await res.json();
        console.log("Settings loaded:", data);
        const merged = { ...SETTINGS_DEFAULTS, ...data };
        setForm(merged);
        setSavedForm(merged);
        setDirty(false);
      } catch (err) {
        console.error("[API] Failed to load settings:", err);
      }
    })();
  }, []);

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const cancel = () => {
    setForm(savedForm);
    setDirty(false);
  };

  const save = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedForm(form);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("[API] Failed to save settings:", err);
    }
  };

  return (
    <div style={{ paddingBottom: dirty ? 80 : 0 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>Customize how your AI receptionist behaves</p>
      </div>

      <Card style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: T.text }}>Business info</h2>
        <SettingsRow label="Restaurant name" sub="Shown in AI greetings">
          <TInput value={form.restaurantName} onChange={v => set("restaurantName", v)} placeholder="e.g. RimReaper Detailing" />
        </SettingsRow>
        <SettingsRow label="Forwarding number" sub="Handoff number for human agents">
          <TInput value={form.phoneNumber} onChange={v => set("phoneNumber", v)} placeholder="+1 (555) 000-0000" />
        </SettingsRow>
      </Card>

      {dirty && (
        <div style={{
          position: "fixed", bottom: 0, left: 216, right: 0,
          background: T.surface, borderTop: `1px solid ${T.border}`,
          padding: "14px 40px", display: "flex", gap: 10, alignItems: "center",
          boxShadow: "0 -4px 16px rgba(44,24,16,0.08)", zIndex: 100,
        }}>
          <button onClick={cancel} style={{
            padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`,
            background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 13, fontWeight: 500,
          }}>
            Cancel
          </button>
          <button onClick={save} style={{
            padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600,
            background: saved ? "#0F9E6A" : T.orange,
            color: "#fff", transition: "background 0.2s",
          }}>
            {saved ? "Saved!" : "Save changes"}
          </button>
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
  const [settings,  setSettings]  = useState({ restaurantName: "AI Receptionist", phoneNumber: "" });

  const refreshCalls = () => {
    fetchWithRetry(`${API_BASE}/calls`)
      .then(data => setCalls(data))
      .catch(err => console.error("[API] All retries failed for /calls:", err));
  };

  const refreshData = useCallback(() => {
    refreshCalls();
    fetchWithRetry(`${API_BASE}/analytics`)
      .then(data => setAnalytics(data))
      .catch(err => console.error("[API] All retries failed for /analytics:", err));
  }, []);

  useEffect(() => {
    refreshData();

    fetchWithRetry(`${API_BASE}/settings`)
      .then(data => setSettings(prev => ({ ...prev, ...data })))
      .catch(err => console.error("[API] All retries failed for /settings:", err));

    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 216, background: T.bg, borderRight: `1px solid ${T.border}`, padding: "24px 12px", display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 28, paddingLeft: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a5.5 5.5 0 0 0-5.5 5.5c0 1.8.87 3.4 2.2 4.4L4 14l3-1.5a5.5 5.5 0 1 0 1-11.5z" fill="white" opacity="0.95"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: T.text, letterSpacing: "-0.01em" }}>{settings.restaurantName}</span>
        </div>

        {NAV.map(({ id, icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7,
              border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", width: "100%",
              fontWeight:  active ? 600 : 400,
              background:  active ? T.orange20   : "transparent",
              color:       active ? T.orangeHover : T.textSub,
            }}>
              <span style={{ color: active ? T.orange : T.textMuted, display: "flex", flexShrink: 0 }}>{icon}</span>
              {id}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, paddingLeft: 2 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.orange10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.orange }}>AD</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.text }}>Admin</p>
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
        {page === "Orders"    && <OrdersPage    calls={calls} refreshCalls={refreshCalls} />}
        {page === "Settings"  && <SettingsPage />}
      </div>
    </div>
  );
}
