import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { ArrowRight, Check, X, Send } from "lucide-react";

export default function InboxPage() {
  const { session, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState({});
  const [tab, setTab] = useState("incoming");

  useEffect(() => { if (session) fetchRequests(); }, [session]);

  async function fetchRequests() {
    setLoading(true);

    const { data: inc } = await supabase
      .from("trade_requests")
      .select(`
        id, status, created_at,
        sender:profiles!trade_requests_sender_id_fkey(id, name, roll_number, current_section, wanted_section)
      `)
      .eq("receiver_id", session.user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const { data: out } = await supabase
      .from("trade_requests")
      .select(`
        id, status, created_at,
        receiver:profiles!trade_requests_receiver_id_fkey(id, name, roll_number, current_section, wanted_section)
      `)
      .eq("sender_id", session.user.id)
      .order("created_at", { ascending: false });

    setIncoming(inc || []);
    setOutgoing(out || []);
    setLoading(false);
  }

  async function accept(req) {
    setActing((a) => ({ ...a, [req.id]: "accepting" }));

    // 1. Mark this request accepted
    await supabase.from("trade_requests").update({ status: "accepted" }).eq("id", req.id);

    // 2. Delete all OTHER pending requests for both users
    await supabase.from("trade_requests")
      .delete()
      .neq("id", req.id)
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id},sender_id.eq.${req.sender.id},receiver_id.eq.${req.sender.id}`)
      .eq("status", "pending");

    // 3. Create a chat room between the two
    const roomId = [session.user.id, req.sender.id].sort().join("_");
    await supabase.from("chat_rooms").upsert({ id: roomId, user1: session.user.id, user2: req.sender.id });

    // 4. Clear section intent for both users
    await supabase.from("profiles").update({ current_section: null, wanted_section: null }).eq("id", session.user.id);
    await supabase.from("profiles").update({ current_section: null, wanted_section: null }).eq("id", req.sender.id);

    setActing((a) => ({ ...a, [req.id]: null }));
    toast(`Trade accepted with ${req.sender.name}! 🎉`, "success");
    await refreshProfile();
    fetchRequests();
  }

  async function decline(req) {
    setActing((a) => ({ ...a, [req.id]: "declining" }));
    await supabase.from("trade_requests").update({ status: "declined" }).eq("id", req.id);
    setActing((a) => ({ ...a, [req.id]: null }));
    toast("Request declined.", "info");
    fetchRequests();
  }

  async function withdraw(req) {
    setActing((a) => ({ ...a, [req.id]: "withdrawing" }));
    await supabase.from("trade_requests").delete().eq("id", req.id);
    setActing((a) => ({ ...a, [req.id]: null }));
    toast("Request withdrawn.", "info");
    fetchRequests();
  }

  const statusColor = {
    pending: "var(--yellow)",
    accepted: "var(--green)",
    declined: "var(--accent)",
  };

  return (
    <>
      <div className="page-header">
        <h2>Inbox</h2>
        <p>Trade requests from other students.</p>
      </div>
      <div className="page-body">
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {["incoming", "outgoing"].map((t) => (
            <button
              key={t}
              className={`admin-tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
              style={{ textTransform: "capitalize" }}
            >
              {t}
              {t === "incoming" && incoming.length > 0 && (
                <span className="badge badge-red" style={{ marginLeft: 8, padding: "1px 7px", fontSize: 10 }}>
                  {incoming.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : tab === "incoming" ? (
          incoming.length === 0 ? (
            <div className="empty-state">
              <Send size={32} />
              <p>No incoming requests yet.</p>
            </div>
          ) : (
            <div className="inbox-list">
              {incoming.map((req) => (
                <div key={req.id} className="inbox-item">
                  <div className="user-avatar">{req.sender.name.charAt(0)}</div>
                  <div className="inbox-info">
                    <div className="inbox-name">{req.sender.name}</div>
                    <div className="inbox-detail">
                      {req.sender.roll_number} &nbsp;·&nbsp;
                      <span style={{ fontFamily: "var(--font-mono)" }}>{req.sender.current_section}</span>
                      <ArrowRight size={10} style={{ display: "inline", margin: "0 4px", verticalAlign: "middle" }} />
                      <span style={{ fontFamily: "var(--font-mono)" }}>{req.sender.wanted_section}</span>
                    </div>
                  </div>
                  <div className="inbox-actions">
                    <button
                      className="btn btn-green btn-sm"
                      onClick={() => accept(req)}
                      disabled={acting[req.id]}
                    >
                      {acting[req.id] === "accepting" ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><Check size={13} /> Accept</>}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => decline(req)}
                      disabled={acting[req.id]}
                    >
                      {acting[req.id] === "declining" ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <><X size={13} /> Decline</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          outgoing.length === 0 ? (
            <div className="empty-state">
              <Send size={32} />
              <p>You haven't sent any requests yet.</p>
            </div>
          ) : (
            <div className="inbox-list">
              {outgoing.map((req) => (
                <div key={req.id} className="inbox-item">
                  <div className="user-avatar">{req.receiver.name.charAt(0)}</div>
                  <div className="inbox-info">
                    <div className="inbox-name">{req.receiver.name}</div>
                    <div className="inbox-detail">
                      {req.receiver.roll_number} &nbsp;·&nbsp;
                      <span style={{ fontFamily: "var(--font-mono)" }}>{req.receiver.current_section}</span>
                      <ArrowRight size={10} style={{ display: "inline", margin: "0 4px", verticalAlign: "middle" }} />
                      <span style={{ fontFamily: "var(--font-mono)" }}>{req.receiver.wanted_section}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: statusColor[req.status], fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {req.status.toUpperCase()}
                    </span>
                    {req.status === "pending" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => withdraw(req)} disabled={acting[req.id]}>
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}
