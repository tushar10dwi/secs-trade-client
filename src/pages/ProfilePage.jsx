import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { LogOut } from "lucide-react";

export default function ProfilePage() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", roll_number: "", phone: "", current_section: "", wanted_section: "" });
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) setForm({ name: profile.name || "", roll_number: profile.roll_number || "", phone: profile.phone || "", current_section: profile.current_section || "", wanted_section: profile.wanted_section || "" });
    fetchSections();
  }, [profile]);

  async function fetchSections() {
    const { data } = await supabase.from("settings").select("sections").eq("id", 1).single();
    if (data?.sections) setSections(data.sections);
  }

  async function save() {
    if (form.current_section && form.wanted_section && form.current_section === form.wanted_section) {
      toast("Current and wanted section can't be the same", "error"); return;
    }
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      name: form.name,
      roll_number: form.roll_number,
      phone: form.phone,
      current_section: form.current_section || null,
      wanted_section: form.wanted_section || null,
    }).eq("id", session.user.id);
    setLoading(false);
    if (error) { toast(error.message, "error"); return; }
    toast("Profile updated!", "success");
    await refreshProfile();
    navigate("/browse");
  }

  return (
    <>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Your details and section preferences.</p>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 520 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="label">Email</label>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", padding: "10px 0" }}>
                {session?.user?.email}
              </div>
            </div>
            <div>
              <label className="label">Full Name</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Roll Number</label>
              <input className="input-field" value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="label">Phone / WhatsApp</label>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div className="divider" style={{ margin: "4px 0" }} />

            <div>
              <label className="label">Current Section</label>
              {sections.length > 0 ? (
                <div className="section-grid">
                  {sections.map((s) => (
                    <button key={s} className={`section-btn ${form.current_section === s ? "selected" : ""}`}
                      onClick={() => setForm({ ...form, current_section: s })}>
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <input className="input-field" value={form.current_section}
                  onChange={(e) => setForm({ ...form, current_section: e.target.value.toUpperCase() })} />
              )}
            </div>

            <div>
              <label className="label">Wanted Section</label>
              {sections.length > 0 ? (
                <div className="section-grid">
                  {sections.map((s) => (
                    <button key={s} className={`section-btn ${form.wanted_section === s ? "selected" : ""}`}
                      onClick={() => setForm({ ...form, wanted_section: s })}
                      disabled={form.current_section === s} style={form.current_section === s ? { opacity: 0.3 } : {}}>
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <input className="input-field" value={form.wanted_section}
                  onChange={(e) => setForm({ ...form, wanted_section: e.target.value.toUpperCase() })} />
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-primary" onClick={save} disabled={loading} style={{ flex: 1 }}>
                {loading ? <span className="spinner" /> : "Save Changes"}
              </button>
              <button className="btn btn-ghost" onClick={signOut} style={{ gap: 6 }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
