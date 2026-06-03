import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { ArrowRight, Flame, Search } from "lucide-react";

export default function BrowsePage() {
  const { profile, session } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [search, setSearch] = useState("");
  const [sentRequests, setSentRequests] = useState(new Set());

  useEffect(() => { if (profile) fetchUsers(); }, [profile]);

  async function fetchUsers() {
    setLoading(true);
    // Fetch users who have the section profile wants AND haven't already matched
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("id, name, roll_number, current_section, wanted_section, email")
      .neq("id", session.user.id)
      .not("current_section", "is", null)
      .not("wanted_section", "is", null)
      .eq("is_blacklisted", false);

    // Get already sent requests
    const { data: sent } = await supabase
      .from("trade_requests")
      .select("receiver_id, status")
      .eq("sender_id", session.user.id);

    const sentSet = new Set((sent || []).map((r) => r.receiver_id));
    setSentRequests(sentSet);

    // Filter: show only people who have my wanted section (they have what I want)
    const filtered = (allUsers || []).filter(
      (u) => u.current_section === profile.wanted_section
    );

    setUsers(filtered);
    setLoading(false);
  }

  function isMutual(user) {
    // Mutual: they have what I want AND they want what I have
    return (
      user.current_section === profile.wanted_section &&
      user.wanted_section === profile.current_section
    );
  }

  async function sendRequest(user) {
    setSending((s) => ({ ...s, [user.id]: true }));
    const { error } = await supabase.from("trade_requests").insert({
      sender_id: session.user.id,
      receiver_id: user.id,
      status: "pending",
    });
    setSending((s) => ({ ...s, [user.id]: false }));
    if (error) {
      toast(error.message, "error");
      return;
    }
    setSentRequests((s) => new Set([...s, user.id]));
    toast(`Request sent to ${user.name}!`, "success");
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.roll_number.toLowerCase().includes(search.toLowerCase())
  );

  // Sort mutual first
  const sorted = [...filtered].sort((a, b) => (isMutual(b) ? 1 : 0) - (isMutual(a) ? 1 : 0));

  if (!profile?.current_section) {
    return (
      <div className="page-body">
        <div className="empty-state">
          <p>Complete your profile setup first to browse matches.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h2>Browse</h2>
        <p>
          People with <strong style={{ color: "var(--text)" }}>{profile.wanted_section}</strong> looking to trade.{" "}
          <span style={{ color: "var(--accent)" }}>Red = mutual match</span>
        </p>
      </div>
      <div className="page-body">
        {/* Search + my trade */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              className="input-field"
              style={{ paddingLeft: 34 }}
              placeholder="Search by name or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13 }}>
            <span className="section-tag">{profile.current_section}</span>
            <ArrowRight size={14} style={{ color: "var(--text-dim)" }} />
            <span className="section-tag" style={{ borderColor: "rgba(255,59,59,0.4)", color: "var(--accent)", background: "var(--accent-dim)" }}>
              {profile.wanted_section}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <Search size={32} />
            <p>No one has <strong>{profile.wanted_section}</strong> right now.<br />Check back later!</p>
          </div>
        ) : (
          <div className="browse-grid">
            {sorted.map((user, i) => {
              const mutual = isMutual(user);
              const alreadySent = sentRequests.has(user.id);
              return (
                <div
                  key={user.id}
                  className={`user-card ${mutual ? "mutual" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="user-card-top">
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="user-card-name">{user.name}</div>
                        <div className="user-card-roll">{user.roll_number}</div>
                      </div>
                    </div>
                    {mutual && (
                      <span className="badge badge-red" style={{ gap: 4 }}>
                        <Flame size={10} /> Mutual
                      </span>
                    )}
                  </div>

                  <div className="section-trade">
                    <span className="section-tag">{user.current_section}</span>
                    <span className="arrow-icon"><ArrowRight size={14} /></span>
                    <span className="section-tag">{user.wanted_section}</span>
                    <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: 4 }}>
                      {user.wanted_section === profile.current_section ? "← wants yours" : ""}
                    </span>
                  </div>

                  <button
                    className={`btn ${alreadySent ? "btn-ghost" : "btn-primary"} btn-sm`}
                    style={{ width: "100%", marginTop: 4 }}
                    onClick={() => sendRequest(user)}
                    disabled={alreadySent || sending[user.id]}
                  >
                    {sending[user.id] ? <span className="spinner" style={{ width: 14, height: 14 }} /> :
                     alreadySent ? "Request Sent ✓" : "Send Trade Request"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
