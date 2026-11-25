import React, { useEffect, useState } from "react";
import { Award, Crown, KeyRound, Mail, Phone, Save, ShieldCheck, User } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const ProfileSettings = () => {
  const { user, refreshProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loyalty, setLoyalty] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setUsername(user?.username || "");
    setPhone(user?.phone || "");
    api
      .get("/canteen/items")
      .then(({ data }) => setLoyalty(data.loyalty))
      .catch(() => {});
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await api.put("/auth/profile", { username, phone });
      await refreshProfile?.();
      setMsg("Profile details saved.");
    } catch (error) {
      setErr(error.response?.data?.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      const { data } = await api.put("/auth/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMsg(data.message);
    } catch (error) {
      setErr(error.response?.data?.message || "Failed to change password");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 text-red-400">
            {user?.role === "manager" ? (
              <Crown className="h-7 w-7 text-amber-400" />
            ) : user?.role === "admin" ? (
              <ShieldCheck className="h-7 w-7 text-red-400" />
            ) : (
              <User className="h-7 w-7" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{user?.username}</h1>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5" /> {user?.email}
            </p>
            <span className="mt-1.5 inline-block rounded-full bg-red-600/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
              Role: {user?.role}
            </span>
          </div>
        </div>

        {loyalty && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs">
            <p className="flex items-center gap-1.5 font-bold text-amber-300">
              <Award className="h-4 w-4" /> 57-Day Cinema Streak
            </p>
            <p className="mt-0.5 text-slate-200">
              {loyalty.moviesWatchedIn57Days} / {loyalty.requiredMovies} movies watched
            </p>
            {loyalty.eligible && (
              <p className="mt-1 font-bold text-emerald-300">
                Unlocked: 36% Off + {loyalty.popcornBucketReward}
              </p>
            )}
          </div>
        )}
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300">
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-300">
          {err}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={handleSaveProfile}
          className="space-y-4 rounded-3xl border border-slate-800 bg-[#111827] p-6"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <User className="h-4 w-4 text-red-400" /> Account & Recovery Details
          </h2>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Display Name</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs text-slate-400">
              <Phone className="h-3 w-3" /> Registered Phone (Used for Password/Email Recovery)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 9876543210"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700"
          >
            <Save className="h-3.5 w-3.5" /> Save Profile
          </button>
        </form>

        <form
          onSubmit={handleChangePassword}
          className="space-y-4 rounded-3xl border border-slate-800 bg-[#111827] p-6"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <KeyRound className="h-4 w-4 text-amber-400" /> Security & Password
          </h2>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">New Password (min 6 chars)</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;