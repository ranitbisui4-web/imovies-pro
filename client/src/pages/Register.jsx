import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    theatreRequestName: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const u = await register(form);
      navigate(u.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#111827] p-8 shadow-2xl">
        <h1 className="text-center text-2xl font-black text-white">
          Create <span className="text-red-500">iMovies</span> Account
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">Full Name</label>
            <input
              required
              placeholder="Ranit Bisui"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">Account Type</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
            >
              <option value="user">Customer (Book Movie Tickets)</option>
              <option value="admin">Theatre Admin (Requires Manager Approval)</option>
            </select>
          </div>

          {form.role === "admin" && (
            <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-amber-200">
                  Theatre / Cinema Chain Name
                </label>
                <input
                  required
                  placeholder="e.g., PVR City Centre"
                  value={form.theatreRequestName}
                  onChange={(e) => setForm({ ...form, theatreRequestName: e.target.value })}
                  className="w-full rounded-xl border border-amber-500/40 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                />
              </div>
              <p className="flex items-start gap-2 text-[11px] text-amber-300">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Admin privileges remain locked until a Super Manager verifies and approves your
                  account.
                </span>
              </p>
            </div>
          )}

          {error && <p className="text-xs font-medium text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link to="/login" className="font-bold text-red-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;