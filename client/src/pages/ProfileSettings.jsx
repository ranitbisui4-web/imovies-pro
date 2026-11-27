import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  Film,
  KeyRound,
  Mail,
  Phone,
  Popcorn,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const CINEMA_AVATARS = [
  { id: "director", label: "Director", emoji: "🎬", bg: "from-red-600 to-rose-900" },
  { id: "popcorn", label: "VIP Snacker", emoji: "🍿", bg: "from-amber-500 to-orange-800" },
  { id: "scifi", label: "Sci-Fi Buff", emoji: "🚀", bg: "from-indigo-600 to-slate-900" },
  { id: "imax", label: "IMAX Pro", emoji: "📽️", bg: "from-emerald-600 to-teal-900" },
  { id: "hero", label: "Action Fan", emoji: "⚡", bg: "from-purple-600 to-violet-950" },
];

const GENRE_OPTIONS = ["Action", "Thriller", "Sci-Fi", "Drama", "Comedy", "Horror", "Fantasy", "Romantic"];
const LANGUAGE_OPTIONS = ["English", "Hindi", "Telugu", "Tamil", "Bengali", "Kannada"];

const evaluatePasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: "", color: "bg-slate-800", text: "text-slate-400" };
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500", text: "text-red-400" };
  if (score <= 2) return { score: 2, label: "Medium", color: "bg-amber-400", text: "text-amber-300" };
  return { score: 3, label: "Strong", color: "bg-emerald-400", text: "text-emerald-300" };
};

const ProfileSettings = () => {
  const { user, refreshProfile, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [username, setUsername] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [phoneVerified, setPhoneVerified] = useState(() => Boolean(user?.phone));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const [loyalty, setLoyalty] = useState(null);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarData, setAvatarData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("imovies_avatar") || "null");
    } catch {
      return null;
    }
  });

  const [prefs, setPrefs] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("imovies_user_prefs") || "null") || {
          genres: ["Action", "Sci-Fi"],
          language: "Hindi",
          preferredCity: localStorage.getItem("imovies_city") || "All",
        }
      );
    } catch {
      return { genres: ["Action", "Sci-Fi"], language: "Hindi", preferredCity: "All" };
    }
  });

  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("imovies_notif_prefs") || "null") || {
          bookingConfirmations: true,
          ticketDropAlerts: true,
          canteenPromos: true,
        }
      );
    } catch {
      return { bookingConfirmations: true, ticketDropAlerts: true, canteenPromos: true };
    }
  });

  const [dangerModal, setDangerModal] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setUsername(user?.username || "");
    setPhone(user?.phone || "");
    if (user?.phone) setPhoneVerified(true);
    api
      .get("/canteen/items")
      .then(({ data }) => setLoyalty(data.loyalty))
      .catch(() => {});
  }, [user]);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await api.put("/auth/profile", { username, phone });
      await refreshProfile?.();
      if (phone.trim().length >= 10) setPhoneVerified(true);
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

  const handleSelectPresetAvatar = (preset) => {
    const next = { type: "preset", ...preset };
    setAvatarData(next);
    localStorage.setItem("imovies_avatar", JSON.stringify(next));
    setAvatarPickerOpen(false);
    setMsg(`Avatar updated to ${preset.label}.`);
  };

  const handleUploadAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = { type: "image", src: reader.result };
      setAvatarData(next);
      localStorage.setItem("imovies_avatar", JSON.stringify(next));
      setAvatarPickerOpen(false);
      setMsg("Custom profile photo updated.");
    };
    reader.readAsDataURL(file);
  };

  const toggleGenre = (genre) => {
    setPrefs((prev) => {
      const exists = prev.genres.includes(genre);
      const nextGenres = exists ? prev.genres.filter((g) => g !== genre) : [...prev.genres, genre];
      const next = { ...prev, genres: nextGenres };
      localStorage.setItem("imovies_user_prefs", JSON.stringify(next));
      return next;
    });
  };

  const updatePrefField = (key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("imovies_user_prefs", JSON.stringify(next));
      return next;
    });
  };

  const toggleNotifPref = (key) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("imovies_notif_prefs", JSON.stringify(next));
      return next;
    });
  };

  const handleVerifyPhone = () => {
    if (phone.trim().length < 10) {
      setErr("Enter a valid 10-digit phone number to verify.");
      return;
    }
    setErr("");
    setPhoneVerified(true);
    setMsg("Phone number verified for ticket alerts and account recovery.");
  };

  const watchedCount = loyalty?.moviesWatchedIn57Days ?? 0;
  const requiredCount = loyalty?.requiredMovies ?? 5;
  const streakProgress = Math.min(100, Math.round((watchedCount / Math.max(1, requiredCount)) * 100));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setAvatarPickerOpen((o) => !o)}
              title="Change Avatar"
              className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-red-600/20 text-red-400 transition hover:border-amber-400"
            >
              {avatarData?.type === "image" ? (
                <img src={avatarData.src} alt={user?.username} className="h-full w-full object-cover" />
              ) : avatarData?.type === "preset" ? (
                <div
                  className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${avatarData.bg} text-2xl`}
                >
                  {avatarData.emoji}
                </div>
              ) : user?.role === "manager" ? (
                <Crown className="h-7 w-7 text-amber-400" />
              ) : user?.role === "admin" ? (
                <ShieldCheck className="h-7 w-7 text-red-400" />
              ) : (
                <User className="h-7 w-7" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
                <Camera className="h-4 w-4 text-white" />
              </span>
            </button>

            {avatarPickerOpen && (
              <div className="absolute left-0 z-30 mt-2 w-64 rounded-2xl border border-slate-700 bg-[#0d1320] p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Choose Cinema Avatar
                  </span>
                  <button
                    type="button"
                    onClick={() => setAvatarPickerOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {CINEMA_AVATARS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(item)}
                      title={item.label}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.bg} text-lg transition hover:scale-105`}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAvatar}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:text-white"
                >
                  <Camera className="h-3.5 w-3.5 text-amber-400" /> Upload Custom Photo
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-white">{user?.username}</h1>
              {(user?.role === "admin" || user?.role === "manager") && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  {user.role === "manager" ? "Head Manager" : "Cinema Admin"}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5" /> {user?.email}
            </p>
            <button
              type="button"
              onClick={() => setAvatarPickerOpen((o) => !o)}
              className="mt-1.5 text-[11px] font-semibold text-amber-400 hover:underline"
            >
              Change avatar or photo
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStreakModalOpen(true)}
          className="group flex items-center gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-left text-xs transition hover:border-amber-400 hover:bg-amber-500/15"
        >
          <div>
            <p className="flex items-center gap-1.5 font-bold text-amber-300">
              <Award className="h-4 w-4" /> 57-Day Cinema Streak
            </p>
            <p className="mt-0.5 text-slate-200">
              {watchedCount} / {requiredCount} movies watched
            </p>
            <p className="mt-1 font-semibold text-emerald-300">
              {loyalty?.eligible
                ? `Unlocked: 36% Off + ${loyalty.popcornBucketReward}`
                : "View milestones & canteen rewards"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-300 transition-transform group-hover:translate-x-0.5" />
        </button>
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
          className="flex flex-col justify-between space-y-4 rounded-3xl border border-slate-800 bg-[#111827] p-6"
        >
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <User className="h-4 w-4 text-red-400" /> Account & Recovery Details
            </h2>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Display Name</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  <Phone className="h-3 w-3" /> Registered Phone
                </label>
                {phoneVerified && phone.trim().length >= 10 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerifyPhone}
                    className="text-[11px] font-bold text-amber-400 hover:underline"
                  >
                    Verify number
                  </button>
                )}
              </div>
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneVerified(false);
                }}
                placeholder="e.g., 9876543210"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 transition hover:bg-amber-300"
            >
              <Save className="h-3.5 w-3.5" /> Save Profile
            </button>
          </div>
        </form>

        <form
          onSubmit={handleChangePassword}
          className="flex flex-col justify-between space-y-4 rounded-3xl border border-slate-800 bg-[#111827] p-6"
        >
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <KeyRound className="h-4 w-4 text-amber-400" /> Security & Password
            </h2>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-3 pr-9 text-xs text-white outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showCurrentPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-slate-400">New Password</label>
                {passwordStrength.label && (
                  <span className={`text-[11px] font-bold ${passwordStrength.text}`}>
                    {passwordStrength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-3 pr-9 text-xs text-white outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      passwordStrength.score >= level ? passwordStrength.color : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 transition hover:bg-amber-300"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-[#111827] p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Sliders className="h-4 w-4 text-sky-400" /> Cinema Preferences
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] text-violet-300">
              <Sparkles className="h-3 w-3" /> Synced with AI Concierge
            </span>
          </div>

          <div>
            <label className="mb-2 block text-xs text-slate-400">Favorite Genres</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((g) => {
                const active = prefs.genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                        : "border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Preferred Language</label>
              <select
                value={prefs.language}
                onChange={(e) => updatePrefField("language", e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Default Home City</label>
              <input
                value={prefs.preferredCity}
                onChange={(e) => updatePrefField("preferredCity", e.target.value)}
                placeholder="e.g., Hyderabad"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-800 bg-[#111827] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <Bell className="h-4 w-4 text-emerald-400" /> Notification Controls
          </h2>

          <div className="space-y-3">
            {[
              {
                key: "bookingConfirmations",
                title: "Booking & Ticket Confirmations",
                desc: "Instant QR ticket receipts and screen delay updates.",
              },
              {
                key: "ticketDropAlerts",
                title: "First-Day Ticket Drop Alerts",
                desc: "Notify me when bookings open for favorite genres.",
              },
              {
                key: "canteenPromos",
                title: "Cinema Canteen & Streak Offers",
                desc: "Intermission snack combos and 57-day streak reward drops.",
              },
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => toggleNotifPref(item.key)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 transition hover:border-slate-700"
              >
                <div>
                  <p className="text-xs font-bold text-white">{item.title}</p>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifPrefs[item.key]}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                    notifPrefs[item.key] ? "bg-amber-400" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`block h-3.5 w-3.5 rounded-full bg-slate-950 transition-transform ${
                      notifPrefs[item.key] ? "translate-x-4.5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-red-900/50 bg-red-950/15 p-5">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-red-300">
            <ShieldAlert className="h-4 w-4" /> Account Danger Zone
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Temporarily pause your cinema profile or permanently erase your account and booking history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDangerModal("deactivate")}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:text-white"
          >
            Deactivate Account
          </button>
          <button
            type="button"
            onClick={() => setDangerModal("delete")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-600/20 px-3.5 py-2 text-xs font-bold text-red-300 hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Account
          </button>
        </div>
      </div>

      {streakModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                  <Award className="h-3.5 w-3.5" /> Loyalty Milestones
                </span>
                <h3 className="mt-2 text-lg font-black text-white">57-Day Cinema Streak</h3>
              </div>
              <button
                type="button"
                onClick={() => setStreakModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Current Window Progress</span>
                <span className="font-bold text-amber-300">
                  {watchedCount} / {requiredCount} Movies
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500 transition-all"
                  style={{ width: `${streakProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                <Film className="h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <p className="font-bold text-white">2 Movies — Early Bird Badge</p>
                  <p className="text-slate-400">Priority seat recommendations in AI Concierge.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                <Popcorn className="h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="font-bold text-amber-200">
                    {requiredCount} Movies — 36% Off + {loyalty?.popcornBucketReward || "Free Popcorn Bucket"}
                  </p>
                  <p className="text-slate-300">Automatically applied at Cinema Canteen checkout.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setStreakModalOpen(false)}
                className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {dangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-black text-white">
                {dangerModal === "delete" ? "Delete Account Permanently?" : "Deactivate Account?"}
              </h3>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              {dangerModal === "delete"
                ? "This will remove your saved preferences, watchlist, and active session immediately."
                : "Your profile will be paused and hidden until you sign back in."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDangerModal(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDangerModal(null);
                  logout();
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                {dangerModal === "delete" ? "Confirm Delete" : "Confirm Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;