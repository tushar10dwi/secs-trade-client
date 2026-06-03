import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { supabase } from "./lib/supabase";
import AuthPage from "./pages/AuthPage";
import SetupPage from "./pages/SetupPage";
import BrowsePage from "./pages/BrowsePage";
import InboxPage from "./pages/InboxPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import FeedbackPage from "./pages/FeedbackPage";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import { Search, Inbox, MessageSquare, User, MessageCircle, ShieldAlert } from "lucide-react";

function AppShell() {
  const { profile, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [inboxCount, setInboxCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    if (!loading && !session) navigate("/login");
    else if (!loading && session && !profile?.name) navigate("/setup");
  }, [session, profile, loading]);

  useEffect(() => {
    if (session) {
      fetchCounts();
      const sub = supabase
        .channel("inbox_count")
        .on("postgres_changes", { event: "*", schema: "public", table: "trade_requests" }, fetchCounts)
        .subscribe();
      return () => sub.unsubscribe();
    }
  }, [session]);

  async function fetchCounts() {
    const { count } = await supabase
      .from("trade_requests")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", session.user.id)
      .eq("status", "pending");
    setInboxCount(count || 0);

    const { count: chatCnt } = await supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .or(`user1.eq.${session.user.id},user2.eq.${session.user.id}`);
    setChatCount(chatCnt || 0);
  }

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" />
      </div>
    );
  }

  const NAV = [
    { path: "/browse", label: "Browse", icon: Search },
    { path: "/inbox", label: "Inbox", icon: Inbox, badge: inboxCount },
    { path: "/chat", label: "Messages", icon: MessageSquare, badge: chatCount },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/feedback", label: "Feedback", icon: MessageCircle },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <h1>Secs<span>Trade</span></h1>
          <p>KIIT Section Exchange</p>
        </div>

        {profile?.is_blacklisted ? (
          <div style={{ padding: 16, margin: 12, background: "var(--accent-dim)", border: "1px solid rgba(255,59,59,0.3)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--accent)" }}>
            <ShieldAlert size={14} style={{ marginBottom: 6 }} />
            <div>Your account has been suspended. Contact admin.</div>
          </div>
        ) : (
          <nav className="sidebar-nav">
            {NAV.map(({ path, label, icon: Icon, badge }) => (
              <button
                key={path}
                className={`nav-item ${isActive(path) ? "active" : ""}`}
                onClick={() => navigate(path)}
              >
                <Icon size={15} />
                {label}
                {badge > 0 && (
                  <span className="badge badge-red" style={{ padding: "1px 7px", fontSize: 10 }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}

        {profile && (
          <div className="sidebar-footer">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
              <div className="user-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                {profile.name?.charAt(0)}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                  {profile.current_section || "No section set"}
                </div>
              </div>
              {profile.current_section && (
                <span className="live-dot" style={{ marginLeft: "auto", flexShrink: 0 }} />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="main-content">
        <Routes>
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="*" element={<BrowsePage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}
