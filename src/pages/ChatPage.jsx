import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Phone, Mail, Send, MessageSquare, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ChatPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [partner, setPartner] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const subRef = useRef(null);

  useEffect(() => { if (session) fetchRooms(); }, [session]);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom);
      subscribeMessages(activeRoom);
    }
    return () => { if (subRef.current) subRef.current.unsubscribe(); };
  }, [activeRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchRooms() {
    setLoading(true);
    const { data } = await supabase
      .from("chat_rooms")
      .select("id, user1, user2")
      .or(`user1.eq.${session.user.id},user2.eq.${session.user.id}`);

    if (!data || data.length === 0) { setLoading(false); return; }

    // Fetch partner profiles
    const roomsWithPartner = await Promise.all(
      data.map(async (room) => {
        const partnerId = room.user1 === session.user.id ? room.user2 : room.user1;
        const { data: p } = await supabase
          .from("profiles")
          .select("id, name, roll_number, phone, email")
          .eq("id", partnerId)
          .single();
        return { ...room, partner: p };
      })
    );

    setRooms(roomsWithPartner);
    if (roomsWithPartner.length > 0) {
      setActiveRoom(roomsWithPartner[0].id);
      setPartner(roomsWithPartner[0].partner);
    }
    setLoading(false);
  }

  async function fetchMessages(roomId) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  function subscribeMessages(roomId) {
    if (subRef.current) subRef.current.unsubscribe();
    subRef.current = supabase
      .channel(`room_${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages((m) => [...m, payload.new]);
      })
      .subscribe();
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeRoom) return;
    setSending(true);
    const text = newMsg.trim();
    setNewMsg("");
    const { error } = await supabase.from("messages").insert({
      room_id: activeRoom,
      sender_id: session.user.id,
      content: text,
    });
    setSending(false);
    if (error) toast(error.message, "error");
  }

  async function reportUser() {
    if (!partner) return;
    const reason = prompt("Briefly describe the issue:");
    if (!reason) return;
    await supabase.from("reports").insert({
      reporter_id: session.user.id,
      reported_id: partner.id,
      reason,
    });
    toast("Report submitted. Admin will review.", "info");
  }

  function selectRoom(room) {
    setActiveRoom(room.id);
    setPartner(room.partner);
    setMessages([]);
  }

  if (loading) {
    return <div className="empty-state" style={{ flex: 1 }}><span className="spinner" /></div>;
  }

  if (rooms.length === 0) {
    return (
      <>
        <div className="page-header">
          <h2>Messages</h2>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <MessageSquare size={32} />
            <p>No chats yet. Accept a trade request to start chatting.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Room list */}
      {rooms.length > 1 && (
        <div style={{
          width: 200, borderRight: "1px solid var(--border)",
          background: "var(--surface)", padding: 12, display: "flex", flexDirection: "column", gap: 4
        }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 8px", marginBottom: 4 }}>
            Chats
          </div>
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => selectRoom(room)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                borderRadius: "var(--radius)", background: activeRoom === room.id ? "var(--accent-dim)" : "transparent",
                border: "none", color: activeRoom === room.id ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer", textAlign: "left", width: "100%"
              }}
            >
              <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                {room.partner?.name?.charAt(0)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {room.partner?.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Contact banner */}
        {partner && (
          <div className="chat-contact-banner">
            <div className="user-avatar">{partner.name?.charAt(0)}</div>
            <div className="contact-info-block">
              <div className="contact-name">{partner.name}</div>
              <div style={{ marginTop: 5 }}>
                <span className="contact-detail-pill">
                  <Phone size={10} /> {partner.phone || "No phone"}
                </span>
                <span className="contact-detail-pill">
                  <Mail size={10} /> {partner.email}
                </span>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={reportUser}
              style={{ gap: 5, color: "var(--text-dim)" }}
            >
              <Flag size={12} /> Report
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="messages-area">
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 13, margin: "auto" }}>
              Say hi to kick off the trade coordination!
            </div>
          )}
          {messages.map((msg) => {
            const mine = msg.sender_id === session.user.id;
            return (
              <div key={msg.id} className={`message-bubble ${mine ? "mine" : "theirs"}`}>
                {msg.content}
                <div className="message-meta">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-row">
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={sendMessage}
            disabled={!newMsg.trim() || sending}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
