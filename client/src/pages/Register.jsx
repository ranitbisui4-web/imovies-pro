import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Film, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("No credential received from Google.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await googleLogin({ credential: credentialResponse.credential });
      navigate(
        user.role === "manager" || (user.role === "admin" && user.isApproved) ? "/admin" : "/"
      );
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        username,
        email,
        phone,
        password,
      });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#111827] p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/20 text-red-500">
            <Film className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-white">Create Account</h1>
          <p className="mt-1 text-xs text-slate-400">
            Join iMovies Pro for instant tickets, canteen & AI concierge
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mb-5 flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-up popup was closed or failed.")}
              theme="filled_black"
              shape="pill"
              size="large"
              text="signup_with"
            />
          ) : (
            <p className="text-center text-[11px] text-amber-300">
              Google Sign-Up is unavailable. Create your account with email below.
            </p>
          )}

          {loading && (
            <p className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" /> Creating your account...
            </p>
          )}
        </div>

        <div className="relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-slate-800" />
          <span className="bg-[#111827] px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Or with email
          </span>
          <div className="w-full border-t border-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your Name"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
            />
          </div>

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
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Phone Number <span className="text-slate-500">(optional, for account recovery)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-red-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;