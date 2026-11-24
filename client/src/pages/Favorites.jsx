import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import MovieCard from "../components/MovieCard";

const Favorites = () => {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    api
      .get("/favorites")
      .then((res) => setMovies(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.message || "Failed to load watchlist."))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-black text-white">
        My <span className="text-red-500">Watchlist</span>
      </h1>
      {loading ? (
        <div className="text-slate-400">Loading favorites...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">
          {error}
        </div>
      ) : movies.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center text-slate-400">
          No movies in your watchlist yet. Open any movie to save it!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {movies.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;