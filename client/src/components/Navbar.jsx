import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  Film,
  Heart,
  Ticket,
  ShieldCheck,
  Sparkles,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAIControl } from "../context/AIControlContext";

const getScreenLabel = (pathname) => {
  if (pathname === "/") return "Home Catalog";
  if (pathname.startsWith("/movie/")) return "Movie Details";
  if (pathname.startsWith("/shows/")) return "Showtimes";
  if (pathname.startsWith("/seats/")) return "Seat Selection";
  if (pathname === "/bookings") return "My Bookings";
  if (pathname === "/favorites") return "Watchlist";
  if (pathname === "/admin") return "Admin Panel";
  if (pathname === "/login") return "Sign In";
  if (pathname === "/register") return "Create Account";
  return "iMovies Pro";
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOpen, setIsOpen, setMovieFilters } = useAIControl();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";

  const handleGoHome = () => {
    setMovieFilters({ search: "", genre: "All" });
    navigate("/");
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        {/* Left: Back Button, Home Button, Brand & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isHome && (
            <button
              onClick={handleGoBack}
              title="Go Back"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-sm font-medium text-slate-200 transition hover:border-red-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <button
            onClick={handleGoHome}
            title="Home"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              isHome
                ? "bg-red-600 text-white shadow-lg shadow-red-600/25"
                : "border border-slate-700 bg-slate-800/70 text-slate-200 hover:border-red-500 hover:text-white"
            }`}
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </button>

          <Link to="/" className="ml-1 flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <Film className="h-6 w-6 text-red-500" />
            <span>
              <span className="text-red-500">i</span>Movies
              <span className="ml-1 rounded bg-red-600/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                Pro
              </span>
            </span>
          </Link>

          <span className="hidden rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400 md:inline-block">
            {getScreenLabel(location.pathname)}
          </span>
        </div>

        {/* Right: Navigation Links & AI Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              isOpen
                ? "bg-violet-600 text-white"
                : "border border-violet-500/40 bg-violet-600/15 text-violet-300 hover:bg-violet-600/30"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Concierge</span>
          </button>

          {user && (
            <>
              <Link
                to="/favorites"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Heart className="h-4 w-4 text-pink-400" />
                <span className="hidden md:inline">Favorites</span>
              </Link>
              <Link
                to="/bookings"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Ticket className="h-4 w-4 text-emerald-400" />
                <span className="hidden md:inline">Bookings</span>
              </Link>
            </>
          )}

          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden md:inline">Admin</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <span className="hidden text-xs text-slate-400 lg:inline">{user.username}</span>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 hover:border-red-500 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
