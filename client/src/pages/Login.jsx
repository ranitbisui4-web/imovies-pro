import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Film, KeyRound, MailSearch } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [recoveryMode, setRecoveryMode] = useState(null); // "password" | "email" | null
  const [recEmail, setRecEmail] = useState("");
  const [recKey, setRecKey] = useState("");
  const [recNewPass, setRecNewPass] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" || user.role === "manager" ? "/admin" : "/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: recEmail,
        verificationKey: recKey,
        newPassword: recNewPass,
      });
      setInfoMsg(data.message);
      setEmail(recEmail);
      setRecoveryMode(null);
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
    }
  };

  const handleRecoverEmail = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    try {
      const { data } = await api.post("/auth/recover-email", { query: recKey });
      setInfoMsg(`Account found for ${data.username} (${data.role}): ${data.email}`);
      setEmail(data.email);
      setRecoveryMode(null);
    } catch (err) {
      setError(err.response?.data?.message || "Account lookup failed");
    }
  };

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#111827] p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/20 text-red-500">
            <Film className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-white">Welcome Back</h1>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to iMovies Pro for tickets, canteen & AI concierge
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {infoMsg}
          </div>
        )}

        {!recoveryMode ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setRecoveryMode("password")}
                className="flex items-center gap-1 text-amber-400 hover:underline"
              >
                <KeyRound className="h-3.5 w-3.5" /> Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => setRecoveryMode("email")}
                className="flex items-center gap-1 text-sky-400 hover:underline"
              >
                <MailSearch className="h-3.5 w-3.5" /> Forgot Email ID?
              </button>
            </div>
          </>
        ) : recoveryMode === "password" ? (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <h2 className="text-sm font-bold text-white">Reset Forgotten Password</h2>
            <input
              type="email"
              required
              value={recEmail}
              onChange={(e) => setRecEmail(e.target.value)}
              placeholder="Your Account Email"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
            <input
              required
              value={recKey}
              onChange={(e) => setRecKey(e.target.value)}
              placeholder="Registered Phone Number OR Username"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
            <input
              type="password"
              required
              minLength={6}
              value={recNewPass}
              onChange={(e) => setRecNewPass(e.target.value)}
              placeholder="New Password (min 6 chars)"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={() => setRecoveryMode(null)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRecoverEmail} className="space-y-3">
            <h2 className="text-sm font-bold text-white">Recover Forgotten Email ID</h2>
            <input
              required
              value={recKey}
              onChange={(e) => setRecKey(e.target.value)}
              placeholder="Enter Registered Phone Number or Username"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-sky-500 py-2 text-xs font-bold text-slate-950"
              >
                Find Email ID
              </button>
              <button
                type="button"
                onClick={() => setRecoveryMode(null)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300"
              >
                Back
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-slate-400">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-red-400 hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;