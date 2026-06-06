import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Admin credentials stored here — change before deploying!
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  function login() {
    if (creds.email === ADMIN_EMAIL && creds.password === ADMIN_PASS) {
      sessionStorage.setItem("st_admin", "true");
      navigate("/admin/dashboard");
    } else {
      setError("Invalid credentials.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-grid" />
      <div className="auth-card fade-up" style={{ width: 380 }}>
        <div className="auth-card-header">
          <h1>Admin <span>Panel</span></h1>
          <p>SecsTrade administration. Restricted access.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Email</label>
            <input className="input-field" type="email" value={creds.email}
              onChange={(e) => setCreds({ ...creds, email: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && login()} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input-field" type="password" value={creds.password}
              onChange={(e) => setCreds({ ...creds, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && login()} />
          </div>
          {error && <p style={{ color: "var(--accent)", fontSize: 12 }}>{error}</p>}
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={login}>
            Login →
          </button>
          <a href="/" style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)" }}>
            ← Back to app
          </a>
        </div>
      </div>
    </div>
  );
}
