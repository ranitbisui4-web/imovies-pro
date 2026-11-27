import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Crown,
  Film,
  Image,
  Lock,
  MailPlus,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const EMPTY_MOVIE = {
  movieName: "",
  description: "",
  genres: "Action, Thriller",
  language: "Hindi / English",
  runtime: 150,
  certification: "U/A",
  rating: 8.5,
  posterUrl: "",
  bannerUrl: "",
  trailerUrl: "",
  cast: "",
};

const EMPTY_THEATRE = {
  theatreName: "",
  city: "",
  location: "",
  screens: 3,
  balconySeatPrice: 280,
  middleSeatPrice: 190,
  lowerSeatPrice: 130,
  balconySeatCount: 20,
  middleSeatCount: 30,
  lowerSeatCount: 20,
};

const AdminDashboard = () => {
  const { user, refreshProfile } = useAuth();
  const isManager = user?.role === "manager";
  const isApprovedAdmin = isManager || (user?.role === "admin" && Boolean(user?.isApproved));

  const [tab, setTab] = useState(isManager ? "approvals" : "movies");
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [banners, setBanners] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Staff profile + Gmail Role Assignment state
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPhoto, setStaffPhoto] = useState("");
  const [staffGovtId, setStaffGovtId] = useState("");
  const [staffRole, setStaffRole] = useState("admin");
  const [staffTheatre, setStaffTheatre] = useState("");
  const [assigningRole, setAssigningRole] = useState(false);

  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("ALL");

  const [movieForm, setMovieForm] = useState(EMPTY_MOVIE);
  const [editingMovieId, setEditingMovieId] = useState(null);

  const [theatreForm, setTheatreForm] = useState(EMPTY_THEATRE);
  const [editingTheatreId, setEditingTheatreId] = useState(null);

  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("");

  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    movie: "",
    slideIntervalSec: 5,
  });

  const [delayInputs, setDelayInputs] = useState({});

  const [showForm, setShowForm] = useState({
    movie: "",
    theatre: "",
    screenName: "Screen 1 • Dolby Atmos",
    showdate: new Date().toISOString().split("T")[0],
    showtime: "19:30",
  });

  const fetchBookingsList = async () => {
    try {
      const res = await api.get("/bookings");
      return res.data;
    } catch {
      const fallbackRes = await api.get("/bookings/all").catch(() => ({ data: [] }));
      return fallbackRes.data;
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const citiesRes = await api.get("/manager/cities").catch(() => ({ data: [] }));
      const cityList = Array.isArray(citiesRes.data) ? citiesRes.data : [];
      setCities(cityList);

      if (!isApprovedAdmin) {
        await refreshProfile?.();
        setLoading(false);
        return;
      }

      const [m, t, s, bData, ban] = await Promise.all([
        api.get("/movies").catch(() => ({ data: [] })),
        api.get("/theatres").catch(() => ({ data: [] })),
        api.get("/shows").catch(() => ({ data: [] })),
        fetchBookingsList(),
        api.get("/banners").catch(() => ({ data: [] })),
      ]);

      const movieList = Array.isArray(m.data) ? m.data : m.data?.movies || [];
      const theatreList = Array.isArray(t.data) ? t.data : t.data?.theatres || [];
      const showList = Array.isArray(s.data) ? s.data : s.data?.shows || [];
      const bookingList = Array.isArray(bData) ? bData : bData?.bookings || [];
      const bannerList = Array.isArray(ban.data) ? ban.data : ban.data?.banners || [];

      setMovies(movieList);
      setTheatres(theatreList);
      setShows(showList);
      setBookings(bookingList);
      setBanners(bannerList);

      setShowForm((prev) => ({
        ...prev,
        movie: prev.movie || movieList[0]?._id || "",
        theatre: prev.theatre || theatreList[0]?._id || "",
      }));

      setBannerForm((prev) => ({
        ...prev,
        movie: prev.movie || movieList[0]?._id || "",
      }));

      setTheatreForm((prev) => ({
        ...prev,
        city: prev.city || cityList[0]?.name || "",
      }));

      if (isManager) {
        const [reqRes, usersRes] = await Promise.all([
          api.get("/manager/requests").catch(() => ({ data: [] })),
          api.get("/manager/users").catch(() => ({ data: [] })),
        ]);
        setRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
        setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [isApprovedAdmin, isManager]);

  useEffect(() => {
    setShowForm((prev) => ({
      ...prev,
      movie: prev.movie || movies[0]?._id || "",
      theatre: prev.theatre || theatres[0]?._id || "",
    }));
  }, [movies, theatres]);

  useEffect(() => {
    setBannerForm((prev) => ({
      ...prev,
      movie: prev.movie || movies[0]?._id || "",
    }));
  }, [movies]);

  const notify = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 4500);
  };

  const handleAssignRoleByGmail = async (e) => {
    e.preventDefault();
    if (!staffEmail.trim()) return;
    setAssigningRole(true);
    try {
      const { data } = await api.post("/auth/assign-role", {
        username: staffName.trim(),
        email: staffEmail.trim(),
        phone: staffPhone.trim(),
        photoUrl: staffPhoto.trim(),
        govtId: staffGovtId.trim(),
        role: staffRole,
        theatreName: staffRole === "admin" ? staffTheatre.trim() : "",
      });
      notify(data.message);
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
      setStaffPhoto("");
      setStaffGovtId("");
      setStaffTheatre("");
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to assign role by Gmail.");
    } finally {
      setAssigningRole(false);
    }
  };

  const handleSaveMovie = async (e) => {
    e.preventDefault();
    try {
      if (editingMovieId) {
        await api.put(`/movies/${editingMovieId}`, movieForm);
        notify(`Updated "${movieForm.movieName}" successfully.`);
        setEditingMovieId(null);
      } else {
        await api.post("/movies", movieForm);
        notify(`Added "${movieForm.movieName}" and notified customers.`);
      }
      setMovieForm(EMPTY_MOVIE);
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save movie.");
    }
  };

  const startEditMovie = (m) => {
    setEditingMovieId(m._id);
    setMovieForm({
      movieName: m.movieName || "",
      description: m.description || "",
      genres: Array.isArray(m.genres) ? m.genres.join(", ") : m.genres || "",
      language: m.language || "",
      runtime: m.runtime || 150,
      certification: m.certification || "U/A",
      rating: m.rating || 8.5,
      posterUrl: m.posterUrl || "",
      bannerUrl: m.bannerUrl || "",
      trailerUrl: m.trailerUrl || "",
      cast: Array.isArray(m.cast) ? m.cast.join(", ") : m.cast || "",
    });
  };

  const handleSaveTheatre = async (e) => {
    e.preventDefault();
    if (!theatreForm.city) {
      notify("Select a city from the Manager City List first.");
      return;
    }
    try {
      if (editingTheatreId) {
        await api.put(`/theatres/${editingTheatreId}`, theatreForm);
        notify(`Updated theatre "${theatreForm.theatreName}".`);
        setEditingTheatreId(null);
      } else {
        await api.post("/theatres", theatreForm);
        notify(`Added theatre "${theatreForm.theatreName}".`);
      }
      setTheatreForm({ ...EMPTY_THEATRE, city: cities[0]?.name || "" });
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save theatre.");
    }
  };

  const startEditTheatre = (t) => {
    setEditingTheatreId(t._id);
    setTheatreForm({
      theatreName: t.theatreName || "",
      city: t.city || cities[0]?.name || "",
      location: t.location || "",
      screens: t.screens || 3,
      balconySeatPrice: t.balconySeatPrice ?? 280,
      middleSeatPrice: t.middleSeatPrice ?? 190,
      lowerSeatPrice: t.lowerSeatPrice ?? 130,
      balconySeatCount: t.balconySeatCount ?? 20,
      middleSeatCount: t.middleSeatCount ?? 30,
      lowerSeatCount: t.lowerSeatCount ?? 20,
    });
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    try {
      await api.post("/manager/cities", { name: newCityName, state: newCityState });
      setNewCityName("");
      setNewCityState("");
      notify("City added to official list.");
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to add city");
    }
  };

  const handleDeleteCity = async (cityId) => {
    try {
      await api.delete(`/manager/cities/${cityId}`);
      notify("City removed.");
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to remove city.");
    }
  };

  const handleAddShow = async (e) => {
    e.preventDefault();
    if (!showForm.movie || !showForm.theatre) {
      notify("Please add and select both a movie and a theatre first.");
      return;
    }
    try {
      await api.post("/shows", showForm);
      notify("Showtime scheduled.");
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to schedule showtime.");
    }
  };

  const handleApplyDelay = async (showId) => {
    try {
      const entry = delayInputs[showId] || {};
      const delayMinutes = Number(entry.minutes) || 15;
      const reason = entry.reason || "Technical/cleaning delay";
      const { data } = await api.post(`/shows/${showId}/delay`, { delayMinutes, reason });
      notify(data.message);
      sessionStorage.removeItem("imovies_shows_cache");
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to apply show delay.");
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...bannerForm,
        movie: bannerForm.movie || undefined,
      };
      await api.post("/banners", payload);
      notify("Hero banner published to Home slideshow.");
      sessionStorage.removeItem("imovies_banners_cache");
      setBannerForm({
        title: "",
        subtitle: "",
        imageUrl: "",
        movie: movies[0]?._id || "",
        slideIntervalSec: 5,
      });
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to publish banner.");
    }
  };

  const handleApproveAdmin = async (id) => {
    try {
      const { data } = await api.patch(`/manager/requests/${id}/approve`);
      notify(data.message);
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to approve request.");
    }
  };

  const handleRejectAdmin = async (id) => {
    try {
      const { data } = await api.patch(`/manager/requests/${id}/reject`);
      notify(data.message);
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to reject request.");
    }
  };

  const handleChangeUserRole = async (id, newRole) => {
    try {
      const { data } = await api.patch(`/manager/users/${id}/role`, { role: newRole });
      notify(data.message);
      loadAll();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update user role.");
    }
  };

  const filteredBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    return bookings.filter((b) => {
      if (bookingStatusFilter !== "ALL" && b.status !== bookingStatusFilter) return false;
      if (!q) return true;
      return (
        String(b.movieTitle || "").toLowerCase().includes(q) ||
        String(b.bookingId || "").toLowerCase().includes(q) ||
        String(b.theatreName || "").toLowerCase().includes(q) ||
        String(b.user?.username || "").toLowerCase().includes(q)
      );
    });
  }, [bookings, bookingSearch, bookingStatusFilter]);

  if (!isApprovedAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-amber-500/30 bg-[#111827] p-8 shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-white">Admin Access Pending Approval</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your Theatre Admin registration is awaiting verification from the Head Manager.
          </p>
          <button
            onClick={loadAll}
            className="mt-6 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            Check Approval Status
          </button>
        </div>
      </div>
    );
  }

  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED");
  const cancelledBookings = bookings.filter((b) => b.status === "CANCELLED");
  const upgraded90Count = cancelledBookings.filter(
    (b) => b.refundUpgradedTo90 || b.refundRate === 90
  ).length;
  const delayedShowsCount = shows.filter((s) => Number(s.delayMinutes) > 0).length;

  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const activeManagers = allUsers.filter((u) => u.role === "manager");
  const activeAdmins = allUsers.filter((u) => u.role === "admin" && u.isApproved);
  const regularCustomers = allUsers.filter((u) => u.role === "user");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            {isManager ? (
              <>
                <Crown className="h-6 w-6 text-amber-400" />
                Manager <span className="text-red-500">Governance & Control</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-6 w-6 text-red-500" />
                Cinema <span className="text-red-500">Admin Studio</span>
              </>
            )}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-300">
            Movies: <strong className="text-white">{movies.length}</strong>
          </span>
          <span className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-300">
            Theatres: <strong className="text-white">{theatres.length}</strong>
          </span>
          <span className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-300">
            Revenue: <strong className="text-emerald-400">₹{totalRevenue}</strong>
          </span>
        </div>
      </div>

      {/* Executive KPI Strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Confirmed Tickets
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-400">{confirmedBookings.length}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Across {shows.length} scheduled show(s)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Gross Ticket Revenue
          </p>
          <p className="mt-1 text-2xl font-black text-white">₹{totalRevenue}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {theatres.length} active cinema(s)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Refunds & 90% Upgrades
          </p>
          <p className="mt-1 text-2xl font-black text-amber-400">
            {cancelledBookings.length}{" "}
            <span className="text-xs font-bold text-emerald-400">
              ({upgraded90Count} @ 90%)
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            75% base • 90% on seat rebook
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Schedule Adjustments
          </p>
          <p className="mt-1 text-2xl font-black text-red-400">{delayedShowsCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Break-buffer auto-recovery active
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300">
          {statusMsg}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {isManager && (
          <button
            onClick={() => setTab("approvals")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === "approvals"
                ? "bg-red-600 text-white"
                : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
            }`}
          >
            <Crown className="h-3.5 w-3.5" /> Approvals, Team & Cities ({requests.length})
          </button>
        )}
        {[
          { id: "movies", label: "Movies & Trailers", icon: Film },
          { id: "theatres", label: "Theatres", icon: Building2 },
          { id: "shows", label: "Shows & Delay Control", icon: CalendarClock },
          { id: "banners", label: "Hero Banners", icon: Image },
          { id: "bookings", label: "All Bookings", icon: Ticket },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                tab === item.id
                  ? "bg-red-600 text-white"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Loading workspace...</div>
      ) : (
        <>
          {tab === "approvals" && isManager && (
            <div className="space-y-8">
              <div className="rounded-3xl border border-amber-500/30 bg-[#111827] p-6">
                <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-amber-300">
                  <MailPlus className="h-4 w-4 text-amber-400" />
                  Add Head Manager / Theatre Admin by Gmail
                </h2>
                <p className="mb-4 text-xs text-slate-400">
                  Enter staff details and Gmail address. When they sign in with Google, they
                  automatically enter with their assigned role.
                </p>

                <form
                  onSubmit={handleAssignRoleByGmail}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Full Name *"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />

                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="Gmail Address (user@gmail.com) *"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />

                  <input
                    type="tel"
                    required
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="Mobile Number *"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />

                  <input
                    type="url"
                    value={staffPhoto}
                    onChange={(e) => setStaffPhoto(e.target.value)}
                    placeholder="Profile Photo URL (optional)"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />

                  <input
                    type="text"
                    value={staffGovtId}
                    onChange={(e) => setStaffGovtId(e.target.value)}
                    placeholder="Govt ID Number (optional)"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />

                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-amber-400"
                  >
                    <option value="admin">Theatre Admin</option>
                    <option value="manager">Head Manager</option>
                  </select>

                  {staffRole === "admin" && (
                    <input
                      type="text"
                      value={staffTheatre}
                      onChange={(e) => setStaffTheatre(e.target.value)}
                      placeholder="Assigned Theatre Name"
                      className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400 sm:col-span-2"
                    />
                  )}

                  <button
                    type="submit"
                    disabled={assigningRole}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {assigningRole ? "Saving Staff..." : "Save & Assign Role"}
                  </button>
                </form>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-amber-500/30 bg-[#111827] p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-amber-400">
                    <Crown className="h-4 w-4" /> Head Managers ({activeManagers.length})
                  </h3>
                  <div className="space-y-3">
                    {activeManagers.map((mgr) => (
                      <div
                        key={mgr._id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              mgr.photoUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                mgr.username || "Manager"
                              )}&background=f59e0b&color=0f172a`
                            }
                            alt={mgr.username}
                            className="h-11 w-11 rounded-full border border-amber-400/50 object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">
                              {mgr.username}
                              {mgr._id === user?.id && (
                                <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">{mgr.email}</p>
                            <p className="text-[11px] text-slate-300">
                              {mgr.phone ? `Mobile: ${mgr.phone}` : "No mobile"}
                              {mgr.govtId ? ` • ID: ${mgr.govtId}` : ""}
                            </p>
                          </div>
                        </div>

                        {mgr._id !== user?.id && (
                          <button
                            onClick={() => handleChangeUserRole(mgr._id, "user")}
                            className="flex items-center gap-1 rounded-lg border border-red-500/40 px-2.5 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-500/15"
                          >
                            <UserMinus className="h-3.5 w-3.5" /> Remove Manager
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-red-400">
                    <ShieldCheck className="h-4 w-4" /> Theatre Admins ({activeAdmins.length})
                  </h3>
                  <div className="space-y-3">
                    {activeAdmins.map((adm) => (
                      <div
                        key={adm._id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              adm.photoUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                adm.username || "Admin"
                              )}&background=dc2626&color=ffffff`
                            }
                            alt={adm.username}
                            className="h-11 w-11 rounded-full border border-red-500/40 object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{adm.username}</p>
                            <p className="text-[11px] text-slate-400">{adm.email}</p>
                            <p className="text-[11px] text-slate-300">
                              {adm.phone ? `Mobile: ${adm.phone}` : "No mobile"}
                              {adm.govtId ? ` • ID: ${adm.govtId}` : ""}
                            </p>
                            <p className="text-[11px] text-amber-300">
                              Theatre: {adm.theatreName || "Assigned Cinema"}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleChangeUserRole(adm._id, "user")}
                          className="flex items-center gap-1 rounded-lg border border-red-500/40 px-2.5 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-500/15"
                        >
                          <UserMinus className="h-3.5 w-3.5" /> Remove Admin
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {requests.length > 0 && (
                <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
                    <Crown className="h-4 w-4 text-amber-400" />
                    Pending Admin Requests ({requests.length})
                  </h2>

                  <div className="grid gap-4 md:grid-cols-2">
                    {requests.map((reqUser) => (
                      <div
                        key={reqUser._id}
                        className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-4"
                      >
                        <h3 className="text-sm font-bold text-white">{reqUser.username}</h3>
                        <p className="text-xs text-slate-400">{reqUser.email}</p>
                        <p className="mt-1 text-xs text-amber-300">
                          Theatre: <strong>{reqUser.theatreRequestName || "Not specified"}</strong>
                        </p>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleApproveAdmin(reqUser._id)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve Admin
                          </button>
                          <button
                            onClick={() => handleRejectAdmin(reqUser._id)}
                            className="flex items-center justify-center gap-1 rounded-xl border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6">
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-white">
                  <MapPin className="h-4 w-4 text-red-400" />
                  Official City List (For Theatre Selection)
                </h2>
                <form onSubmit={handleAddCity} className="mb-4 flex flex-wrap gap-2">
                  <input
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    placeholder="City name (e.g., Durgapur, Kolkata)"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                  <input
                    value={newCityState}
                    onChange={(e) => setNewCityState(e.target.value)}
                    placeholder="State (optional)"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add City
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {cities.map((c) => (
                    <span
                      key={c._id}
                      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200"
                    >
                      {c.name}
                      {c.state ? ` (${c.state})` : ""}
                      <button
                        onClick={() => handleDeleteCity(c._id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-sky-300">
                  <Users className="h-4 w-4" /> Registered Customers ({regularCustomers.length})
                </h3>
                <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                  {regularCustomers.map((cust) => (
                    <div
                      key={cust._id}
                      className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{cust.username}</p>
                        <p className="text-[11px] text-slate-400">{cust.email}</p>
                      </div>
                      <button
                        onClick={() => handleChangeUserRole(cust._id, "admin")}
                        className="flex items-center gap-1 rounded-lg border border-amber-500/40 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/15"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Make Admin
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "movies" && (
            <div className="grid gap-8 lg:grid-cols-[380px,1fr]">
              <form
                onSubmit={handleSaveMovie}
                className="h-fit space-y-3 rounded-3xl border border-slate-800 bg-[#111827] p-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">
                    {editingMovieId ? "Edit Movie & Trailer" : "Add New Movie"}
                  </h2>
                  {editingMovieId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMovieId(null);
                        setMovieForm(EMPTY_MOVIE);
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <input
                  required
                  value={movieForm.movieName}
                  onChange={(e) => setMovieForm({ ...movieForm, movieName: e.target.value })}
                  placeholder="Movie Title"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <textarea
                  rows={2}
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  placeholder="Synopsis / Description"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={movieForm.genres}
                    onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
                    placeholder="Genres"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                  <input
                    value={movieForm.language}
                    onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
                    placeholder="Language"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={movieForm.runtime}
                    onChange={(e) => setMovieForm({ ...movieForm, runtime: Number(e.target.value) })}
                    placeholder="Mins"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                  <input
                    value={movieForm.certification}
                    onChange={(e) => setMovieForm({ ...movieForm, certification: e.target.value })}
                    placeholder="U/A"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={movieForm.rating}
                    onChange={(e) => setMovieForm({ ...movieForm, rating: Number(e.target.value) })}
                    placeholder="Rating"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
                <input
                  value={movieForm.posterUrl}
                  onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
                  placeholder="Poster Image URL"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <input
                  value={movieForm.bannerUrl}
                  onChange={(e) => setMovieForm({ ...movieForm, bannerUrl: e.target.value })}
                  placeholder="Banner Image URL"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <input
                  value={movieForm.trailerUrl}
                  onChange={(e) => setMovieForm({ ...movieForm, trailerUrl: e.target.value })}
                  placeholder="YouTube Trailer URL (https://youtube.com/watch?v=...)"
                  className="w-full rounded-xl border border-red-500/40 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <input
                  value={movieForm.cast}
                  onChange={(e) => setMovieForm({ ...movieForm, cast: e.target.value })}
                  placeholder="Cast (comma separated)"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />

                <button
                  type="submit"
                  className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700"
                >
                  {editingMovieId ? "Save Movie Changes" : "Publish Movie"}
                </button>
              </form>

              <div className="grid gap-4 sm:grid-cols-2">
                {movies.map((m) => (
                  <div
                    key={m._id}
                    className="flex gap-3 rounded-2xl border border-slate-800 bg-[#111827] p-3"
                  >
                    <img
                      src={m.posterUrl || "https://via.placeholder.com/90x130"}
                      alt={m.movieName}
                      className="h-28 w-20 rounded-xl object-cover"
                    />
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">{m.movieName}</h3>
                        <p className="text-[11px] text-slate-400">
                          {m.language} • {m.runtime}m • ⭐ {m.rating}
                        </p>
                        {m.trailerUrl && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-red-400">
                            <Video className="h-3 w-3" /> Trailer Linked
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditMovie(m)}
                          className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-amber-400 hover:text-amber-300"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await api.delete(`/movies/${m._id}`);
                              notify("Movie deleted.");
                              loadAll();
                            } catch (err) {
                              notify(err.response?.data?.message || "Failed to delete movie.");
                            }
                          }}
                          className="flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "theatres" && (
            <div className="grid gap-8 lg:grid-cols-[380px,1fr]">
              <form
                onSubmit={handleSaveTheatre}
                className="h-fit space-y-3 rounded-3xl border border-slate-800 bg-[#111827] p-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">
                    {editingTheatreId ? "Edit Theatre" : "Add New Theatre"}
                  </h2>
                  {editingTheatreId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTheatreId(null);
                        setTheatreForm({ ...EMPTY_THEATRE, city: cities[0]?.name || "" });
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <input
                  required
                  value={theatreForm.theatreName}
                  onChange={(e) => setTheatreForm({ ...theatreForm, theatreName: e.target.value })}
                  placeholder="Theatre Name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                    Select City (Managed by Head Manager)
                  </label>
                  <select
                    required
                    value={theatreForm.city}
                    onChange={(e) => setTheatreForm({ ...theatreForm, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Choose Approved City --</option>
                    {cities.map((c) => (
                      <option key={c._id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  required
                  value={theatreForm.location}
                  onChange={(e) => setTheatreForm({ ...theatreForm, location: e.target.value })}
                  placeholder="Street / Mall Address"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Balcony ₹</label>
                    <input
                      type="number"
                      value={theatreForm.balconySeatPrice}
                      onChange={(e) =>
                        setTheatreForm({ ...theatreForm, balconySeatPrice: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Middle ₹</label>
                    <input
                      type="number"
                      value={theatreForm.middleSeatPrice}
                      onChange={(e) =>
                        setTheatreForm({ ...theatreForm, middleSeatPrice: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Lower ₹</label>
                    <input
                      type="number"
                      value={theatreForm.lowerSeatPrice}
                      onChange={(e) =>
                        setTheatreForm({ ...theatreForm, lowerSeatPrice: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700"
                >
                  {editingTheatreId ? "Save Theatre Changes" : "Add Theatre"}
                </button>
              </form>

              <div className="grid gap-4 sm:grid-cols-2">
                {theatres.map((t) => (
                  <div
                    key={t._id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#111827] p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">{t.theatreName}</h3>
                        <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          {t.city || "General"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{t.location}</p>
                      <p className="mt-2 text-[11px] text-slate-300">
                        Balcony ₹{t.balconySeatPrice} • Middle ₹{t.middleSeatPrice} • Lower ₹
                        {t.lowerSeatPrice}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => startEditTheatre(t)}
                        className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-amber-400 hover:text-amber-300"
                      >
                        <Pencil className="h-3 w-3" /> Edit Theatre
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await api.delete(`/theatres/${t._id}`);
                            notify("Theatre deleted.");
                            loadAll();
                          } catch (err) {
                            notify(err.response?.data?.message || "Failed to delete theatre.");
                          }
                        }}
                        className="flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "shows" && (
            <div className="grid gap-8 lg:grid-cols-[360px,1fr]">
              <form
                onSubmit={handleAddShow}
                className="h-fit space-y-3 rounded-3xl border border-slate-800 bg-[#111827] p-6"
              >
                <h2 className="text-base font-bold text-white">Schedule Showtime</h2>
                <select
                  required
                  value={showForm.movie}
                  onChange={(e) => setShowForm({ ...showForm, movie: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  <option value="">
                    {movies.length > 0
                      ? "-- Select Movie --"
                      : "No movies available — add one in Movies & Trailers"}
                  </option>
                  {movies.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.movieName}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={showForm.theatre}
                  onChange={(e) => setShowForm({ ...showForm, theatre: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  <option value="">
                    {theatres.length > 0
                      ? "-- Select Theatre --"
                      : "No theatres available — add one in Theatres"}
                  </option>
                  {theatres.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.theatreName} ({t.city || t.location})
                    </option>
                  ))}
                </select>
                <input
                  required
                  value={showForm.screenName}
                  onChange={(e) => setShowForm({ ...showForm, screenName: e.target.value })}
                  placeholder="Screen Name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    type="date"
                    value={showForm.showdate}
                    onChange={(e) => setShowForm({ ...showForm, showdate: e.target.value })}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                  <input
                    required
                    type="time"
                    value={showForm.showtime}
                    onChange={(e) => setShowForm({ ...showForm, showtime: e.target.value })}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700"
                >
                  Add Showtime
                </button>
              </form>

              <div className="space-y-3">
                {shows.map((s) => (
                  <div
                    key={s._id}
                    className="rounded-2xl border border-slate-800 bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {s.movie?.movieName} — {s.theatre?.theatreName}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {s.screenName} • {s.showdate} • Start: {s.effectiveStartTime || s.showtime}{" "}
                          • Break: {s.breakStartTime}–{s.breakEndTime} ({s.breakDurationMinutes ?? 20}m) • Ends:{" "}
                          {s.estimatedEndTime}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await api.delete(`/shows/${s._id}`);
                            notify("Showtime removed.");
                            loadAll();
                          } catch (err) {
                            notify(err.response?.data?.message || "Failed to delete showtime.");
                          }
                        }}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <input
                        type="number"
                        min="5"
                        max="180"
                        placeholder="Delay mins (e.g. 20)"
                        value={delayInputs[s._id]?.minutes || ""}
                        onChange={(e) =>
                          setDelayInputs({
                            ...delayInputs,
                            [s._id]: { ...delayInputs[s._id], minutes: e.target.value },
                          })
                        }
                        className="w-36 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                      />
                      <input
                        placeholder="Reason (e.g. Projector check)"
                        value={delayInputs[s._id]?.reason || ""}
                        onChange={(e) =>
                          setDelayInputs({
                            ...delayInputs,
                            [s._id]: { ...delayInputs[s._id], reason: e.target.value },
                          })
                        }
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyDelay(s._id)}
                        className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400"
                      >
                        Apply Delay & Auto-Adjust Breaks
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "banners" && (
            <div className="grid gap-8 lg:grid-cols-[360px,1fr]">
              <form
                onSubmit={handleAddBanner}
                className="h-fit space-y-3 rounded-3xl border border-slate-800 bg-[#111827] p-6"
              >
                <h2 className="text-base font-bold text-white">Add Hero Slideshow Banner</h2>
                <input
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="Banner Headline"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <input
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  placeholder="Subtitle / Offer Tagline"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                  placeholder="Banner Image URL"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    Redirect Movie When Clicked
                  </label>
                  <select
                    value={bannerForm.movie}
                    onChange={(e) => setBannerForm({ ...bannerForm, movie: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="">
                      {movies.length > 0
                        ? "-- No Movie Redirect (Banner Only) --"
                        : "No movies available — add one in Movies & Trailers"}
                    </option>
                    {movies.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.movieName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">
                    Slide Movement Interval (Seconds)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={bannerForm.slideIntervalSec}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, slideIntervalSec: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700"
                >
                  Publish Banner Slide
                </button>
              </form>

              <div className="grid gap-4 sm:grid-cols-2">
                {banners.map((b) => (
                  <div
                    key={b._id}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]"
                  >
                    <img src={b.imageUrl} alt={b.title} className="h-36 w-full object-cover" />
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-white">{b.title}</h3>
                      <p className="text-xs text-slate-400">
                        Links to: {b.movie?.movieName || "None"} • Slide time: {b.slideIntervalSec}s
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            await api.delete(`/banners/${b._id}`);
                            sessionStorage.removeItem("imovies_banners_cache");
                            notify("Banner removed.");
                            loadAll();
                          } catch (err) {
                            notify(err.response?.data?.message || "Failed to remove banner.");
                          }
                        }}
                        className="mt-3 rounded-lg border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                      >
                        Remove Banner
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "bookings" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#111827] p-4">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search ID, movie, theatre, or user..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
                <div className="flex gap-2">
                  {["ALL", "CONFIRMED", "CANCELLED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setBookingStatusFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                        bookingStatusFilter === st
                          ? "bg-red-600 text-white"
                          : "border border-slate-700 bg-slate-900 text-slate-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredBookings.map((b) => (
                  <div
                    key={b._id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#111827] p-4 text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">
                        {b.movieTitle} ({b.bookingId})
                      </p>
                      <p className="text-slate-400">
                        {b.theatreName} • {b.showdate} {b.showtime} • Seats:{" "}
                        {(b.seats || []).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">₹{b.totalPrice}</p>
                      <p className="text-[11px] text-slate-400">
                        {b.status}
                        {b.status === "CANCELLED"
                          ? ` • ${b.refundRate || (b.refundUpgradedTo90 ? 90 : 75)}% Refund (₹${
                              b.refundAmount || 0
                            })`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;