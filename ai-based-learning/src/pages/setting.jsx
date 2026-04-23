import React, { useState, useEffect } from "react";
import { useAuth } from "../store/authContext.jsx";
import authService from "../services/auth_service";
import toast from "react-hot-toast";
import AppPage from "../components/shell/AppPage.jsx";
import PageHeader from "../components/shell/PageHeader.jsx";
import { User, Shield, Save } from "lucide-react";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
];

const SettingsProfile = () => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: user?.username || "",
  });

  useEffect(() => {
    if (user?.username != null) {
      setForm((prev) => ({ ...prev, username: user.username }));
    }
  }, [user?.username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.username?.trim()) {
      toast.error("Username is required");
      return;
    }
    setSaving(true);
    try {
      await authService.updateProfile({ username: form.username.trim() });
      updateUser({ username: form.username.trim() });
      toast.success("Profile updated");
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.message || err?.response?.data?.message || "Could not update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPage>
      <PageHeader
        title="Settings"
        description="Manage your account and preferences for LearnLab."
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex gap-2 lg:w-56 lg:flex-col lg:gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                tab === id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-600 hover:bg-white/80"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="card-elevated min-w-0 flex-1 p-6 sm:p-8">
          {tab === "profile" && (
            <form onSubmit={handleSaveProfile} className="max-w-lg space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
              <p className="text-sm text-slate-500">
                Your username appears in the navigation and greetings.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Username
                </label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="input-brand"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  value={user?.email || "—"}
                  disabled
                  className="input-brand cursor-not-allowed bg-slate-50 text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">Email is managed by your login.</p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-brand w-full sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}

          {tab === "security" && (
            <div className="max-w-lg space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Security</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                To change your password, use your account recovery flow on the
                server or contact your administrator. Keeping a strong, unique
                password protects your documents and study data.
              </p>
              <ul className="list-inside list-disc space-y-2 text-sm text-slate-500">
                <li>Never share your password or API keys.</li>
                <li>Sign out on shared devices when you are done.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
};

export default SettingsProfile;
