import React from "react";
import { Link } from "react-router-dom";
import { Star, Clock, Calendar } from "lucide-react";

const MovieCard = ({ movie }) => {
  return (
    <Link
      to={`/movie/${movie._id}`}
      className="group overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] transition hover:-translate-y-1 hover:border-red-500/60 hover:shadow-xl hover:shadow-red-950/30"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-900">
        <img
          src={movie.posterUrl}
          alt={movie.movieName}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-amber-400 backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-amber-400" />
          {movie.rating}
        </div>
        <div className="absolute bottom-2.5 left-2.5 rounded bg-red-600/90 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
          {movie.certification}
        </div>
      </div>

      <div className="p-4">
        <h3 className="truncate text-base font-bold text-white group-hover:text-red-400">
          {movie.movieName}
        </h3>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {movie.runtime}m
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(movie.releaseDate).getFullYear()}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(movie.genres || []).slice(0, 3).map((g) => (
            <span
              key={g}
              className="rounded-md border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default MovieCard;
