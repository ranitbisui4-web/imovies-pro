import React, { useEffect, useRef, useState } from "react";
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
  Bell,
  Popcorn,
  UserCog,
  ChevronDown,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAIControl } from "../context/AIControlContext";
import api from "../services/api";

const getScreenLabel = (pathname) => {
  if (pathname === "/") return "Home Catalog";
  if (pathname.startsWith("/movie/")) return "Movie Details";
  if (pathname.startsWith("/shows/")) return "Showtimes";
  if (pathname.startsWith("/seats/")) return "Seat Selection";
  if (pathname === "/bookings") return "My Bookings";
  if (pathname === "/canteen") return "Cinema Canteen";
  if (pathname === "/profile") return "Profile & Settings";
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

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const isHome = location.pathname === "/";

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const { data } = await api.get("/notifications");
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    fetchNotifications();
    setNotifOpen(false);
    setProfileMenuOpen(false);
  }, [user, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

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

  const initials = (user?.username || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
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

          <div className="flex items-center gap-2">
            {user && (
              <Link
                to="/canteen"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                  location.pathname === "/canteen"
                    ? "bg-amber-500/20 text-amber-200"
                    : "text-amber-300 hover:bg-slate-800 hover:text-amber-200"
                }`}
              >
                <Popcorn className="h-4 w-4 text-amber-400" />
                <span className="hidden md:inline">Canteen</span>
              </Link>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                isOpen
                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                  : "border border-violet-500/40 bg-violet-600/15 text-violet-300 hover:bg-violet-600/30"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Concierge</span>
            </button>

            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((o) => !o);
                    fetchNotifications();
                  }}
                  title="Notifications"
                  className="relative flex items-center rounded-lg border border-slate-700 bg-slate-800/70 p-2 text-slate-200 hover:border-red-500 hover:text-white"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-[#111827] p-3 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-red-400 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-400">No notifications yet.</p>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {notifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleMarkRead(n._id)}
                            className={`cursor-pointer rounded-xl border p-2.5 text-xs transition ${
                              n.read
                                ? "border-slate-800/70 bg-slate-900/40 text-slate-400"
                                : "border-amber-500/30 bg-amber-500/10 text-slate-100"
                            }`}
                          >
                            <p className="font-bold">{n.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-300">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-xl border border-slate-700/90 bg-slate-900/90 px-2.5 py-1.5 text-sm text-slate-200 transition hover:border-red-500/70 hover:text-white"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-amber-500 text-[11px] font-black text-white">
                    {initials}
                  </span>
                  <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:inline">
                    {user.username}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                      profileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-[#111827] p-1.5 shadow-2xl">
                    <div className="border-b border-slate-800 px-3 py-2">
                      <p className="truncate text-xs font-bold text-white">{user.username}</p>
                      <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                      >
                        <User className="h-3.5 w-3.5 text-sky-400" />
                        Profile & Settings
                      </Link>
                      <Link
                        to="/bookings"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                      >
                        <Ticket className="h-3.5 w-3.5 text-emerald-400" />
                        My Bookings
                      </Link>
                      <Link
                        to="/favorites"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                      >
                        <Heart className="h-3.5 w-3.5 text-pink-400" />
                        Watchlist
                      </Link>
                      {(user.role === "admin" || user.role === "manager") && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/10"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {user.role === "manager" ? "Manager Console" : "Admin Panel"}
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-800 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          navigate("/login");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
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

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-800/90 bg-[#090d16]/95 py-2 text-[11px] font-bold backdrop-blur-md md:hidden">
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 ${
            location.pathname === "/" ? "text-red-500" : "text-slate-400"
          }`}
        >
          <Home className="h-4 w-4" /> Home
        </Link>
        <Link
          to="/canteen"
          className={`flex flex-col items-center gap-0.5 ${
            location.pathname === "/canteen" ? "text-amber-400" : "text-slate-400"
          }`}
        >
          <Popcorn className="h-4 w-4" /> Canteen
        </Link>
        <Link
          to="/bookings"
          className={`flex flex-col items-center gap-0.5 ${
            location.pathname === "/bookings" ? "text-emerald-400" : "text-slate-400"
          }`}
        >
          <Ticket className="h-4 w-4" /> Tickets
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center gap-0.5 ${
            location.pathname === "/profile" ? "text-sky-400" : "text-slate-400"
          }`}
        >
          <UserCog className="h-4 w-4" /> Profile
        </Link>
      </nav>
    </>
  );
};

export default Navbar;