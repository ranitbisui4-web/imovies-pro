import React, { useEffect, useState } from "react";
import {
  Trash2,
  PlusCircle,
  Pencil,
  Film,
  Building2,
  CalendarClock,
  Ticket,
  Crown,
  CheckCircle2,
  XCircle,
  Users,
  UserMinus,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyMovieForm = {
  movieName: "",
  description: "",
  genres: "Action, Thriller",
  language: "Hindi / English",
  releaseDate: "2026-12-01",
  runtime: 150,
  certification: "U/A",
  rating: 8.5,
  posterUrl:
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
  trailerUrl: "",
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const isPendingAdmin = user?.role === "admin" && !user?.isApproved;

  const [tab, setTab] = useState(isManager ? "approvals" : "movies");
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [feedback, setFeedback] = useState("");

  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movieForm, setMovieForm] = useState(emptyMovieForm);

  const [theatreForm, setTheatreForm] = useState({
    theatreName: "",
    location: "",
    balconySeatPrice: 280,
    middleSeatPrice: 190,
    lowerSeatPrice: 130,
    balconySeatCount: 20,
    middleSeatCount: 30,
    lowerSeatCount: 20,
  });

  const [showForm, setShowForm] = useState({
    movie: "",
    theatre: "",
    screenName: "Screen 1 • Dolby Atmos",
    showdate: new Date().toISOString().split("T")[0],
    showtime: "19:30",
  });

  const refreshAll = async () => {
    const coreCalls = [
      api.get("/movies"),
      api.get("/theatres"),
      api.get("/shows"),
      api.get("/bookings/all"),
    ];
    if (isManager) {
      coreCalls.push(api.get("/manager/requests"), api.get("/manager/users"));
    }

    const results = await Promise.all(coreCalls);
    setMovies(results[0].data);
    setTheatres(results[1].data);
    setShows(results[2].data);
    setBookings(results[3].data);
    if (isManager) {
      setPendingRequests(results[4].data);
      setAllUsers(results[5].data);
    }
  };

  useEffect(() => {
    if (!user || isPendingAdmin) return;
    refreshAll();
  }, [user, isManager, isPendingAdmin]);

  if (isPendingAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-amber-500/30 bg-[#111827] p-8 text-center shadow-2xl">
          <Crown className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-2xl font-black text-white">
            Admin Access <span className="text-amber-400">Pending Approval</span>
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Your Theatre Admin account is registered, but admin tools remain locked until the Head
            Manager approves your request.
          </p>
          {user?.theatreRequestName && (
            <p className="mt-3 text-xs text-slate-400">
              Requested Theatre: <strong className="text-white">{user.theatreRequestName}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  const showToast = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  };

  const totalRevenue = bookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const handleStartEditMovie = (m) => {
    setEditingMovieId(m._id);
    setMovieForm({
      movieName: m.movieName || "",
      description: m.description || "",
      genres: Array.isArray(m.genres) ? m.genres.join(", ") : m.genres || "",
      language: m.language || "Hindi / English",
      releaseDate: m.releaseDate ? new Date(m.releaseDate).toISOString().split("T")[0] : "2026-12-01",
      runtime: m.runtime || 150,
      certification: m.certification || "U/A",
      rating: m.rating ?? 8.5,
      posterUrl: m.posterUrl || emptyMovieForm.posterUrl,
      trailerUrl: m.trailerUrl || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingMovieId(null);
    setMovieForm(emptyMovieForm);
  };

  const handleSaveMovie = async (e) => {
    e.preventDefault();
    if (editingMovieId) {
      await api.put(`/movies/${editingMovieId}`, movieForm);
      setEditingMovieId(null);
      setMovieForm(emptyMovieForm);
      showToast("Movie updated successfully.");
    } else {
      await api.post("/movies", movieForm);
      setMovieForm(emptyMovieForm);
      showToast("Movie added successfully.");
    }
    refreshAll();
  };

  const handleAddTheatre = async (e) => {
    e.preventDefault();
    await api.post("/theatres", theatreForm);
    setTheatreForm({ ...theatreForm, theatreName: "", location: "" });
    showToast("Theatre added successfully.");
    refreshAll();
  };

  const handleAddShow = async (e) => {
    e.preventDefault();
    await api.post("/shows", showForm);
    showToast("Show scheduled successfully.");
    refreshAll();
  };

  const handleApprove = async (userId) => {
    const { data } = await api.patch(`/manager/requests/${userId}/approve`);
    showToast(data.message);
    refreshAll();
  };

  const handleReject = async (userId) => {
    const { data } = await api.patch(`/manager/requests/${userId}/reject`, {});
    showToast(data.message);
    refreshAll();
  };

  const handleDirectRoleChange = async (userId, newRole) => {
    try {
      const { data } = await api.patch(`/manager/users/${userId}/role`, { role: newRole });
      showToast(data.message);
      refreshAll();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update role");
    }
  };

  const tabs = [
    ...(isManager
      ? [{ id: "approvals", label: `Approvals & Team (${pendingRequests.length})`, icon: Crown }]
      : []),
    { id: "movies", label: "Movies", icon: Film },
    { id: "theatres", label: "Theatres", icon: Building2 },
    { id: "shows", label: "Shows", icon: CalendarClock },
    { id: "bookings", label: "All Bookings", icon: Ticket },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            {isManager ? (
              <>
                <Crown className="h-6 w-6 text-amber-400" />
                Manager <span className="text-red-500">Governance & Dashboard</span>
              </>
            ) : (
              <>
                Admin <span className="text-red-500">Dashboard</span>
              </>
            )}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {isManager
              ? "Approve or remove Admins, view their theatres, add/edit movies, and oversee bookings."
              : "Add or edit movies, manage theatres and shows, and view bookings."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-[#111827] px-4 py-2">
            Movies: <strong className="text-white">{movies.length}</strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] px-4 py-2">
            Shows: <strong className="text-white">{shows.length}</strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] px-4 py-2">
            Revenue: <strong className="text-emerald-400">₹{totalRevenue}</strong>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300">
          {feedback}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                tab === item.id
                  ? "bg-red-600 text-white"
                  : "border border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-600"
              }`}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
      </div>

      {/* MANAGER-ONLY APPROVALS & TEAM TAB */}
      {tab === "approvals" && isManager && (
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
              <Crown className="h-5 w-5 text-amber-400" />
              Pending Admin Requests ({pendingRequests.length})
            </h2>

            {pendingRequests.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center text-sm text-slate-400">
                No pending Admin approval requests right now.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRequests.map((reqUser) => (
                  <div
                    key={reqUser._id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/30 bg-[#111827] p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-white">{reqUser.username}</h3>
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-300">
                          Requesting: Admin
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{reqUser.email}</p>
                      <p className="mt-1 text-xs text-amber-200">
                        Theatre: <strong>{reqUser.theatreRequestName || "Not specified"}</strong>
                      </p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Applied on {new Date(reqUser.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(reqUser._id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Admin
                      </button>
                      <button
                        onClick={() => handleReject(reqUser._id)}
                        className="flex items-center justify-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
              <Users className="h-5 w-5 text-red-500" />
              All Accounts, Admin Theatres & Role Control ({allUsers.length})
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111827]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Theatre</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {allUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-900/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{u.username}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            u.role === "manager"
                              ? "bg-purple-500/20 text-purple-300"
                              : u.role === "admin"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {u.theatreName || u.theatreRequestName || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          {u.role !== "admin" && u.role !== "manager" && (
                            <button
                              onClick={() => handleDirectRoleChange(u._id, "admin")}
                              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                            >
                              Make Admin
                            </button>
                          )}
                          {u.role === "admin" && (
                            <button
                              onClick={() => handleDirectRoleChange(u._id, "user")}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                            >
                              <UserMinus className="h-3.5 w-3.5" /> Remove Admin
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MOVIES TAB (Add + Edit for both Admin and Manager) */}
      {tab === "movies" && (
        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <form onSubmit={handleSaveMovie} className="space-y-3 rounded-2xl border border-slate-800 bg-[#111827] p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-white">
                {editingMovieId ? (
                  <>
                    <Pencil className="h-4 w-4 text-amber-400" /> Edit Movie
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 text-red-500" /> Add Movie
                  </>
                )}
              </h2>
              {editingMovieId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
            <input
              required
              placeholder="Movie Name"
              value={movieForm.movieName}
              onChange={(e) => setMovieForm({ ...movieForm, movieName: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <textarea
              required
              rows={2}
              placeholder="Description"
              value={movieForm.description}
              onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Genres (comma separated)"
              value={movieForm.genres}
              onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={movieForm.releaseDate}
                onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <input
                type="number"
                placeholder="Runtime (min)"
                value={movieForm.runtime}
                onChange={(e) => setMovieForm({ ...movieForm, runtime: Number(e.target.value) })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <input
              placeholder="Poster URL"
              value={movieForm.posterUrl}
              onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <button className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">
              {editingMovieId ? "Save Movie Changes" : "Add Movie"}
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2">
            {movies.map((m) => (
              <div
                key={m._id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#111827] p-3"
              >
                <div className="flex items-center gap-3">
                  <img src={m.posterUrl} alt={m.movieName} className="h-14 w-10 rounded object-cover" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{m.movieName}</h3>
                    <p className="text-xs text-slate-400">{m.genres.join(", ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEditMovie(m)}
                    title="Edit Movie"
                    className="rounded-lg p-2 text-slate-400 hover:bg-amber-500/20 hover:text-amber-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.delete(`/movies/${m._id}`);
                      refreshAll();
                    }}
                    title="Delete Movie"
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THEATRES TAB */}
      {tab === "theatres" && (
        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <form onSubmit={handleAddTheatre} className="space-y-3 rounded-2xl border border-slate-800 bg-[#111827] p-5">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <PlusCircle className="h-4 w-4 text-red-500" /> Add Theatre
            </h2>
            <input
              required
              placeholder="Theatre Name"
              value={theatreForm.theatreName}
              onChange={(e) => setTheatreForm({ ...theatreForm, theatreName: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <input
              required
              placeholder="Location"
              value={theatreForm.location}
              onChange={(e) => setTheatreForm({ ...theatreForm, location: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <input
                type="number"
                placeholder="Balcony ₹"
                value={theatreForm.balconySeatPrice}
                onChange={(e) => setTheatreForm({ ...theatreForm, balconySeatPrice: Number(e.target.value) })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-white"
              />
              <input
                type="number"
                placeholder="Middle ₹"
                value={theatreForm.middleSeatPrice}
                onChange={(e) => setTheatreForm({ ...theatreForm, middleSeatPrice: Number(e.target.value) })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-white"
              />
              <input
                type="number"
                placeholder="Lower ₹"
                value={theatreForm.lowerSeatPrice}
                onChange={(e) => setTheatreForm({ ...theatreForm, lowerSeatPrice: Number(e.target.value) })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-white"
              />
            </div>
            <button className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">
              Add Theatre
            </button>
          </form>

          <div className="space-y-3">
            {theatres.map((t) => (
              <div
                key={t._id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#111827] p-4"
              >
                <div>
                  <h3 className="font-bold text-white">{t.theatreName}</h3>
                  <p className="text-xs text-slate-400">
                    {t.location} • Balcony ₹{t.balconySeatPrice} | Middle ₹{t.middleSeatPrice} | Lower ₹
                    {t.lowerSeatPrice}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await api.delete(`/theatres/${t._id}`);
                    refreshAll();
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHOWS TAB */}
      {tab === "shows" && (
        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <form onSubmit={handleAddShow} className="space-y-3 rounded-2xl border border-slate-800 bg-[#111827] p-5">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <PlusCircle className="h-4 w-4 text-red-500" /> Schedule Show
            </h2>
            <select
              required
              value={showForm.movie}
              onChange={(e) => setShowForm({ ...showForm, movie: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Select Movie</option>
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
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Select Theatre</option>
              {theatres.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.theatreName}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={showForm.showdate}
                onChange={(e) => setShowForm({ ...showForm, showdate: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <input
                type="time"
                required
                value={showForm.showtime}
                onChange={(e) => setShowForm({ ...showForm, showtime: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <button className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">
              Add Show
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2">
            {shows.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#111827] p-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-white">{s.movie?.movieName}</h3>
                  <p className="text-xs text-slate-400">
                    {s.theatre?.theatreName} • {s.showdate} at {s.showtime}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-400">
                    Booked: {s.bookedSeats?.length || 0} seats
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await api.delete(`/shows/${s._id}`);
                    refreshAll();
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOOKINGS TAB */}
      {tab === "bookings" && (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#111827] p-4 text-sm"
            >
              <div>
                <p className="font-bold text-white">
                  {b.movieTitle}{" "}
                  <span className="font-mono text-xs text-slate-400">({b.bookingId})</span>
                </p>
                <p className="text-xs text-slate-400">
                  User: {b.user?.email || "N/A"} • {b.theatreName} • {b.showdate} {b.showtime}
                </p>
                {b.transactionId && (
                  <p className="font-mono text-[11px] text-slate-500">
                    TXN: {b.transactionId} • {b.paymentDetails || b.paymentMethod}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-400">
                  Seats: {b.seats.join(", ")} — ₹{b.totalPrice}
                </p>
                <span className="text-xs text-slate-400">{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;