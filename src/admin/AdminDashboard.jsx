import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Users, Flag, MessageSquare, Settings, LogOut, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [settings, setSettings] = useState({ sections: [], max_requests_per_user: 5 });
  const [newSectionInput, setNewSectionInput] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, trades: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("st_admin")) navigate("/admin");
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: u }, { data: r }, { data: f }, { data: s }, { data: reqs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*, reporter:profiles!reports_reporter_id_fkey(name, roll_number), reported:profiles!reports_reported_id_fkey(name, roll_number, is_blacklisted)").order("created_at", { ascending: false }),
      supabase.from("feedbacks").select("*, user:profiles!feedbacks_user_id_fkey(name, roll_number)").order("created_at", { ascending: false }),
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("trade_requests").select("status"),
    ]);
    setUsers(u || []);
    setReports(r || []);
    setFeedbacks(f || []);
    if (s) setSettings(s);
    const allReqs = reqs || [];
    setStats({
      total: (u || []).length,
      active: (u || []).filter(x => x.current_section).length,
      trades: allReqs.filter(x => x.status === "accepted").length,
      pending: allReqs.filter(x => x.status === "pending").length,
    });
    setLoading(false);
  }

  async function toggleBlacklist(user) {
    await supabase.from("profiles").update({ is_blacklisted: !user.is_blacklisted }).eq("id", user.id);
    fetchAll();
  }

  async function deleteUser(user) {
    if (!confirm(`Delete ${user.name}? This is irreversible.`)) return;
    await supabase.from("profiles").delete().eq("id", user.id);
    fetchAll();
  }

  async function resolveReport(report) {
    await supabase.from("blocks").upsert({
    blocker_id: report.reporter_id,
    blocked_id: report.reported_id,
    });

    await supabase.from("reports").update({ resolved: true }).eq("id", report.id);
    fetchAll();
    toast("Report resolved and user blocked.", "success");
  }

  async function deleteFeedback(fb) {
    await supabase.from("feedbacks").delete().eq("id", fb.id);
    fetchAll();
  }

  async function saveSettings() {
    setSaving(true);
    await supabase.from("settings").upsert({ id: 1, sections: settings.sections, max_requests_per_user: settings.max_requests_per_user });
    setSaving(false);
    alert("Settings saved!");
  }

  function addSection() {
    const s = newSectionInput.trim().toUpperCase();
    if (!s || settings.sections.includes(s)) return;
    setSettings({ ...settings, sections: [...settings.sections, s].sort() });
    setNewSectionInput("");
  }

  function removeSection(s) {
    setSettings({ ...settings, sections: settings.sections.filter(x => x !== s) });
  }

  function adminLogout() {
    sessionStorage.removeItem("st_admin");
    navigate("/admin");
  }

  const TABS = [
    { id: "overview", label: "Overview", icon: Users },
    { id: "users", label: "Users", icon: Users },
    { id: "reports", label: "Reports", icon: Flag },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 32px", height: 56, borderBottom: "1px solid var(--border)", background: "var(--surface)", gap: 16 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
          Secs<span style={{ color: "var(--accent)" }}>Trade</span>
          <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginLeft: 10 }}>ADMIN</span>
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={adminLogout} style={{ gap: 6 }}>
          <LogOut size={13} /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ background: "var(--surface)" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`admin-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
            <Icon size={13} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            {label}
            {id === "reports" && reports.filter(r => !r.resolved).length > 0 && (
              <span style={{ marginLeft: 6, background: "var(--accent)", color: "#fff", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>
                {reports.filter(r => !r.resolved).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", flex: 1 }}>
        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : tab === "overview" ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Total Users", value: stats.total },
                { label: "Active Listings", value: stats.active },
                { label: "Completed Trades", value: stats.trades },
                { label: "Pending Requests", value: stats.pending },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card">
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 14 }}>Recent Users</h3>
                {users.slice(0, 5).map(u => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{u.name?.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{u.roll_number}</div>
                    </div>
                    {u.is_blacklisted && <span className="badge badge-red">Banned</span>}
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 14 }}>Open Reports</h3>
                {reports.filter(r => !r.resolved).slice(0, 5).map(r => (
                  <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13 }}>
                      <strong>{r.reporter?.name}</strong> → <strong style={{ color: "var(--accent)" }}>{r.reported?.name}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{r.reason}</div>
                  </div>
                ))}
                {reports.filter(r => !r.resolved).length === 0 && <p style={{ color: "var(--text-dim)", fontSize: 13 }}>No open reports 🎉</p>}
              </div>
            </div>
          </div>
        ) : tab === "users" ? (
          <div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll</th>
                  <th>Email</th>
                  <th>Current → Wanted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{u.roll_number}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{u.email}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {u.current_section ? `${u.current_section} → ${u.wanted_section}` : <span style={{ color: "var(--text-dim)" }}>—</span>}
                    </td>
                    <td>
                      {u.is_blacklisted
                        ? <span className="badge badge-red">Banned</span>
                        : <span className="badge badge-green">Active</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleBlacklist(u)} style={{ gap: 4 }}>
                          {u.is_blacklisted ? <><ShieldCheck size={12} /> Unban</> : <><ShieldBan size={12} /> Ban</>}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteUser(u)} style={{ gap: 4, color: "var(--accent)" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "reports" ? (
          <div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Reported</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} style={{ opacity: r.resolved ? 0.5 : 1 }}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.reporter?.name} ({r.reporter?.roll_number})</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>{r.reported?.name} ({r.reported?.roll_number})</td>
                    <td style={{ maxWidth: 250 }}>{r.reason}</td>
                    <td>{r.resolved ? <span className="badge badge-muted">Resolved</span> : <span className="badge badge-red">Open</span>}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {!r.resolved && (
                          <button className="btn btn-ghost btn-sm" onClick={() => resolveReport(r)}>Resolve</button>
                        )}
                        {r.reported && (
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleBlacklist(r.reported)} style={{ color: "var(--accent)" }}>
                            {r.reported.is_blacklisted ? "Unban" : "Ban User"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-dim)", padding: 40 }}>No reports</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : tab === "feedback" ? (
          <div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{f.user?.name} ({f.user?.roll_number})</td>
                    <td style={{ maxWidth: 400 }}>{f.message}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteFeedback(f)} style={{ color: "var(--accent)" }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {feedbacks.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-dim)", padding: 40 }}>No feedback yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : tab === "settings" ? (
          <div style={{ maxWidth: 560 }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label className="label">Available Sections</label>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  These sections appear in the section picker for students.
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input className="input-field" placeholder="e.g. S1-G1" value={newSectionInput}
                    onChange={(e) => setNewSectionInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && addSection()}
                    style={{ maxWidth: 160 }} />
                  <button className="btn btn-ghost" onClick={addSection}>Add</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {settings.sections.map(s => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "5px 10px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{s}</span>
                      <button onClick={() => removeSection(s)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  {settings.sections.length === 0 && (
                    <span style={{ color: "var(--text-dim)", fontSize: 13 }}>No sections added yet</span>
                  )}
                </div>
              </div>

              <div className="divider" style={{ margin: "4px 0" }} />

              <div>
                <label className="label">Max Pending Requests Per User</label>
                <input className="input-field" type="number" min={1} max={20}
                  value={settings.max_requests_per_user}
                  onChange={(e) => setSettings({ ...settings, max_requests_per_user: parseInt(e.target.value) })}
                  style={{ maxWidth: 120 }} />
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Limits how many pending outgoing requests a student can have at once.
                </p>
              </div>

              <button className="btn btn-primary" onClick={saveSettings} disabled={saving} style={{ alignSelf: "flex-start" }}>
                {saving ? <span className="spinner" /> : "Save Settings"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
