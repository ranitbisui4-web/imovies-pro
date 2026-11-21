import React, { useEffect, useState } from "react";
import { Trash2, PlusCircle, Film, Building2, CalendarClock, Ticket } from "lucide-react";
import api from "../services/api";

const AdminDashboard = () => {
  const [tab, setTab] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [movieForm, setMovieForm] = useState({
    movieName: "",
    description: "",
    genres: "Action, Thriller",
    language: "Hindi / English",
    releaseDate: "2026-12-01",
    runtime: 150,
    certification: "U/A",
    rating: 8.5,
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
    trailerUrl: "",
  });

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
    const [m, t, s, b] = await Promise.all([
      api.get("/movies"),
      api.get("/theatres"),
      api.get("/shows"),
      api.get("/bookings/all"),
    ]);
    setMovies(m.data);
    setTheatres(t.data);
    setShows(s.data);
    setBookings(b.data);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const totalRevenue = bookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const handleAddMovie = async (e) => {
    e.preventDefault();
    await api.post("/movies", movieForm);
    setMovieForm({ ...movieForm, movieName: "", description: "" });
    refreshAll();
  };

  const handleAddTheatre = async (e) => {
    e.preventDefault();
    await api.post("/theatres", theatreForm);
    setTheatreForm({ ...theatreForm, theatreName: "", location: "" });
    refreshAll();
  };

  const handleAddShow = async (e) => {
    e.preventDefault();
    await api.post("/shows", showForm);
    refreshAll();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-white">
          Admin <span className="text-red-500">Dashboard</span>
        </h1>
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

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: "movies", label: "Movies", icon: Film },
          { id: "theatres", label: "Theatres", icon: Building2 },
          { id: "shows", label: "Shows", icon: CalendarClock },
          { id: "bookings", label: "All Bookings", icon: Ticket },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                tab === item.id
                  ? "bg-red-600 text-white"
                  : "border border-slate-800 bg-[#111827] text-slate-300"
              }`}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
      </div>

      {/* MOVIES TAB */}
      {tab === "movies" && (
        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <form onSubmit={handleAddMovie} className="space-y-3 rounded-2xl border border-slate-800 bg-[#111827] p-5">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <PlusCircle className="h-4 w-4 text-red-500" /> Add Movie
            </h2>
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
              Add Movie
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
                <button
                  onClick={async () => {
                    await api.delete(`/movies/${m._id}`);
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
                <option key={m._id} value={m._id}>{m.movieName}</option>
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
                <option key={t._id} value={t._id}>{t.theatreName}</option>
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
                  {b.movieTitle} <span className="font-mono text-xs text-slate-400">({b.bookingId})</span>
                </p>
                <p className="text-xs text-slate-400">
                  User: {b.user?.email || "N/A"} • {b.theatreName} • {b.showdate} {b.showtime}
                </p>
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
