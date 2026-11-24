import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Play,
  Radio,
  Search,
  Sparkles,
} from "lucide-react";
import api from "../services/api";
import MovieCard from "../components/MovieCard";
import { useAIControl } from "../context/AIControlContext";

const GENRES = ["All", "Action", "Thriller", "Drama", "Sci-Fi", "Comedy", "Horror", "Fantasy"];

const readCache = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const Home = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState(() => readCache("imovies_movies_cache", []));
  const [banners, setBanners] = useState(() => readCache("imovies_banners_cache", []));
  const [shows, setShows] = useState(() => readCache("imovies_shows_cache", []));
  const [loading, setLoading] = useState(() => readCache("imovies_movies_cache", []).length === 0);
  const [slideIdx, setSlideIdx] = useState(0);
  const { movieFilters, setMovieFilters, setIsOpen } = useAIControl();

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      if (movies.length === 0) setLoading(true);
      try {
        const params = {};
        if (movieFilters.search) params.search = movieFilters.search;
        if (movieFilters.genre && movieFilters.genre !== "All") params.genre = movieFilters.genre;

        const [moviesRes, bannersRes, showsRes] = await Promise.all([
          api.get("/movies", { params }),
          api.get("/banners").catch(() => ({ data: [] })),
          api.get("/shows").catch(() => ({ data: [] })),
        ]);

        if (!active) return;
        setMovies(moviesRes.data || []);
        setBanners(bannersRes.data || []);
        setShows(showsRes.data || []);

        if (!params.search && !params.genre) {
          sessionStorage.setItem("imovies_movies_cache", JSON.stringify(moviesRes.data || []));
          sessionStorage.setItem("imovies_banners_cache", JSON.stringify(bannersRes.data || []));
          sessionStorage.setItem("imovies_shows_cache", JSON.stringify(showsRes.data || []));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [movieFilters]);

  const slides = useMemo(() => {
    if (banners.length > 0) {
      return banners.map((b) => ({
        id: b._id,
        title: b.title,
        subtitle: b.subtitle,
        imageUrl: b.imageUrl,
        movieId: b.movie?._id || b.movie,
        intervalMs: (Number(b.slideIntervalSec) || 5) * 1000,
      }));
    }
    return movies.slice(0, 4).map((m) => ({
      id: m._id,
      title: m.movieName,
      subtitle: m.description,
      imageUrl: m.bannerUrl || m.posterUrl,
      movieId: m._id,
      intervalMs: 5000,
    }));
  }, [banners, movies]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const currentSlide = slides[slideIdx % slides.length];
    const timer = setTimeout(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, currentSlide?.intervalMs || 5000);
    return () => clearTimeout(timer);
  }, [slides, slideIdx]);

  const activeSlide = slides[slideIdx % Math.max(1, slides.length)];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Admin-Controlled Clickable Hero Banner Slideshow */}
      {activeSlide && (
        <div
          onClick={() => activeSlide.movieId && navigate(`/shows/${activeSlide.movieId}`)}
          className="group relative mb-8 cursor-pointer overflow-hidden rounded-[2rem] border border-slate-800/90 bg-gradient-to-br from-slate-950 via-[#121624] to-red-950/30 shadow-2xl"
        >
          <img
            src={activeSlide.imageUrl}
            alt={activeSlide.title}
            loading="eager"
            className="h-[350px] w-full object-cover opacity-45 transition duration-700 group-hover:scale-105 sm:h-[390px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070a12] via-[#070a12]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a12] via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 max-w-2xl p-6 sm:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-600/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300">
              <Sparkles className="h-3 w-3" /> Featured Spotlight • Click Banner to Book
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
              {activeSlide.title}
            </h1>
            <p className="mt-2.5 line-clamp-2 text-sm text-slate-300 sm:text-base">
              {activeSlide.subtitle}
            </p>
            <div
              className="mt-5 flex flex-wrap gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to={`/shows/${activeSlide.movieId}`}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700"
              >
                <Play className="h-4 w-4 fill-white" /> Book Tickets
              </Link>
              <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-5 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-600/30"
              >
                <Sparkles className="h-4 w-4" /> AI Seat Concierge
              </button>
            </div>
          </div>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideIdx((prev) => (prev - 1 + slides.length) % slides.length);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/50 p-2 text-white backdrop-blur hover:bg-red-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideIdx((prev) => (prev + 1) % slides.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/50 p-2 text-white backdrop-blur hover:bg-red-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-5 right-6 flex gap-1.5"
              >
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setSlideIdx(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === slideIdx % slides.length ? "w-6 bg-red-500" : "w-2 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search & Genre Bar */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-[#0f1523]/90 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={movieFilters.search}
            onChange={(e) => setMovieFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search movies, genres, languages..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/90 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-red-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setMovieFilters((prev) => ({ ...prev, genre: g }))}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                movieFilters.genre === g
                  ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                  : "border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Movie Grid */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-white">
          Now Showing on <span className="text-red-500">iMovies Pro</span>
        </h2>
        <span className="text-xs text-slate-400">{movies.length} titles available</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
            />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center text-slate-400">
          No movies found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {movies.map((m) => (
            <MovieCard key={m._id} movie={m} />
          ))}
        </div>
      )}

      {/* Live Show Schedule, Break/Interval & Delay Status Board */}
      {shows.length > 0 && (
        <div className="mt-12 rounded-3xl border border-slate-800 bg-[#0e1422] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
                <Radio className="h-4 w-4 text-emerald-400" />
                Live Screen Timeline, Interval & Delay Board
              </h2>
              <p className="text-xs text-slate-400">
                Real-time start time, intermission break window, resume time, and estimated end time across all screens.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shows.slice(0, 9).map((s) => (
              <div
                key={s._id}
                className={`rounded-2xl border p-4 text-xs ${
                  s.delayMinutes > 0
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-slate-800 bg-slate-950/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{s.movie?.movieName}</h3>
                    <p className="text-[11px] text-slate-400">
                      {s.theatre?.theatreName} • {s.screenName} • {s.showdate}
                    </p>
                  </div>
                  {s.delayMinutes > 0 ? (
                    <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> +{s.delayMinutes}m Shifted
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      On Time
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-800/80 bg-slate-900/70 p-2.5 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400">Starts</p>
                    <p className="font-bold text-white">{s.effectiveStartTime || s.showtime}</p>
                  </div>
                  <div>
                    <p className="flex items-center justify-center gap-1 text-[10px] text-amber-300">
                      <Coffee className="h-3 w-3" /> Break ({s.breakDurationMinutes ?? 20}m)
                    </p>
                    <p className="font-bold text-amber-200">
                      {s.breakStartTime}–{s.breakEndTime}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" /> Ends
                    </p>
                    <p className="font-bold text-emerald-300">{s.estimatedEndTime}</p>
                  </div>
                </div>

                {s.delayMinutes > 0 && s.delayReason && (
                  <p className="mt-2 text-[11px] text-amber-300/90">{s.delayReason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;