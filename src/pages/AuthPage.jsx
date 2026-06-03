import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../lib/toast";

export default function AuthPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email"); // email | otp
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (!email.endsWith("@kiit.ac.in")) {
      toast("Only @kiit.ac.in emails allowed", "error");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { toast(error.message, "error"); return; }
    toast("OTP sent to your KIIT email!", "success");
    setStep("otp");
  }

  async function verifyOtp() {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) { toast("Invalid or expired OTP", "error"); return; }
    toast("Logged in!", "success");
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-grid" />
      <div className="auth-card fade-up">
        <div className="auth-card-header">
          <h1><span>Secs</span>Trade</h1>
          <p>
            {step === "email"
              ? "Trade your KIIT section with someone who has what you want. Enter your KIIT email to continue."
              : `Enter the 6-digit OTP sent to ${email}`}
          </p>
        </div>

        {step === "email" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">KIIT Email</label>
              <input
                className="input-field"
                type="email"
                placeholder="21XXXXXXXX@kiit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 4 }}
              onClick={sendOtp}
              disabled={loading || !email}
            >
              {loading ? <span className="spinner" /> : "Send OTP →"}
            </button>
            <a
              href="/admin"
              style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}
            >
              Admin login
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">One-Time Password</label>
              <input
                className="input-field"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                style={{ letterSpacing: "0.3em", fontSize: 20, textAlign: "center" }}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
            >
              {loading ? <span className="spinner" /> : "Verify & Login →"}
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: "100%" }}
              onClick={() => { setStep("email"); setOtp(""); }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
