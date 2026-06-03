import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { MessageSquare } from "lucide-react";

export default function FeedbackPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("feedbacks").insert({
      user_id: session.user.id,
      message: message.trim(),
    });
    setLoading(false);
    if (error) { toast(error.message, "error"); return; }
    setSubmitted(true);
    toast("Feedback sent! Thank you.", "success");
  }

  return (
    <>
      <div className="page-header">
        <h2>Feedback</h2>
        <p>Help us improve SecsTrade.</p>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 480 }}>
          {submitted ? (
            <div className="empty-state">
              <MessageSquare size={32} style={{ color: "var(--green)", opacity: 1 }} />
              <p style={{ color: "var(--text)" }}>Thanks for your feedback!</p>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSubmitted(false); setMessage(""); }}>
                Send another
              </button>
            </div>
          ) : (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Your Message</label>
                <textarea
                  className="input-field"
                  rows={6}
                  placeholder="Bugs, suggestions, complaints — all welcome."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
              <button className="btn btn-primary" onClick={submit} disabled={loading || !message.trim()}>
                {loading ? <span className="spinner" /> : "Submit Feedback"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
