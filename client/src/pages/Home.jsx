import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, Play } from "lucide-react";
import api from "../services/api";
import MovieCard from "../components/MovieCard";
import { useAIControl } from "../context/AIControlContext";

const GENRES = ["All", "Action", "Thriller", "Drama", "Sci-Fi", "Comedy", "Horror", "Fantasy"];

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { movieFilters, setMovieFilters, setIsOpen } = useAIControl();

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const params = {};
        if (movieFilters.search) params.search = movieFilters.search;
        if (movieFilters.genre && movieFilters.genre !== "All") params.genre = movieFilters.genre;
        const { data } = await api.get("/movies", { params });
        setMovies(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [movieFilters]);

  const featured = movies[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero Banner */}
      {featured && (
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <img
            src={featured.bannerUrl || featured.posterUrl}
            alt={featured.movieName}
            className="h-[340px] w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/70 to-transparent" />
          <div className="absolute bottom-0 left-0 max-w-2xl p-6 sm:p-10">
            <span className="inline-block rounded-full bg-red-600/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400">
              Now Trending in Cinemas
            </span>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">
              {featured.movieName}
            </h1>
            <p className="mt-3 line-clamp-2 text-sm text-slate-300 sm:text-base">
              {featured.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={`/shows/${featured._id}`}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700"
              >
                <Play className="h-4 w-4 fill-white" /> Book Tickets
              </Link>
              <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-5 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-600/30"
              >
                <Sparkles className="h-4 w-4" /> Ask AI to Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Genre Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={movieFilters.search}
            onChange={(e) => setMovieFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search movies, genres..."
            className="w-full rounded-xl border border-slate-800 bg-[#111827] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-red-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setMovieFilters((prev) => ({ ...prev, genre: g }))}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                movieFilters.genre === g
                  ? "bg-red-600 text-white"
                  : "border border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-600"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Movie Grid */}
      <h2 className="mb-4 text-xl font-extrabold text-white">
        Available <span className="text-red-500">Movies</span>
      </h2>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading movies...</div>
      ) : movies.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center text-slate-400">
          No movies found matching your filters. Try clearing filters or running{" "}
          <code className="text-red-400">npm run seed</code> inside the server folder.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {movies.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
