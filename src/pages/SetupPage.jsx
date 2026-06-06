import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

export default function SetupPage() {
  const { session, refreshProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({
    name: "",
    roll_number: "",
    phone: "",
    current_section: "",
    wanted_section: "",
  });

  useEffect(() => {
    // Pre-fill roll from email
    const email = session?.user?.email || "";
    const roll = email.split("@")[0].toUpperCase();
    setForm((f) => ({ ...f, roll_number: roll }));
    fetchSections();
  }, [session]);

  async function fetchSections() {
    const { data } = await supabase.from("settings").select("sections").eq("id", 1).single();
    if (data?.sections) setSections(data.sections);
  }

  async function save() {
    if (!form.name || !form.roll_number || !form.current_section || !form.wanted_section || !form.phone) {
      toast("Fill in all fields", "error");
      return;
    }
    if (form.current_section === form.wanted_section) {
      toast("Current and wanted section can't be the same", "error");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      email: session.user.email,
      name: form.name,
      roll_number: form.roll_number,
      phone: form.phone,
      current_section: form.current_section,
      wanted_section: form.wanted_section,
      is_blacklisted: false,
    });
    setLoading(false);
    if (error) { toast(error.message, "error"); return; }
    toast("Profile saved!", "success");
    await refreshProfile();

    // navigate("/browse");
  }

  return (
    <div className="setup-page">
      <div style={{ width: 460, position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Set up your <span style={{ color: "var(--accent)" }}>profile</span>
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: 13 }}>
            Tell us your current section and the one you want. We'll find your match.
          </p>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label className="label">Full Name</label>
            <input className="input-field" placeholder="Tushar Dwivedi" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Roll Number</label>
            <input className="input-field" placeholder="21XXXXXXXXX" value={form.roll_number}
              onChange={(e) => setForm({ ...form, roll_number: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="label">Phone / WhatsApp</label>
            <input className="input-field" placeholder="+91 XXXXXXXXXX" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div>
            <label className="label">Your Current Section</label>
            {sections.length > 0 ? (
              <div className="section-grid">
                {sections.map((s) => (
                  <button
                    key={s}
                    className={`section-btn ${form.current_section === s ? "selected" : ""}`}
                    onClick={() => setForm({ ...form, current_section: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <input className="input-field" placeholder="e.g. CSE-1" value={form.current_section}
                onChange={(e) => setForm({ ...form, current_section: e.target.value.toUpperCase() })} />
            )}
          </div>

          <div>
            <label className="label">Section You Want</label>
            {sections.length > 0 ? (
              <div className="section-grid">
                {sections.map((s) => (
                  <button
                    key={s}
                    className={`section-btn ${form.wanted_section === s ? "selected" : ""}`}
                    onClick={() => setForm({ ...form, wanted_section: s })}
                    disabled={form.current_section === s}
                    style={form.current_section === s ? { opacity: 0.3 } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <input className="input-field" placeholder="e.g. CSE-2" value={form.wanted_section}
                onChange={(e) => setForm({ ...form, wanted_section: e.target.value.toUpperCase() })} />
            )}
          </div>

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 4 }} onClick={save} disabled={loading}>
            {loading ? <span className="spinner" /> : "Save Profile →"}
          </button>
        </div>
      </div>
    </div>
  );
}
