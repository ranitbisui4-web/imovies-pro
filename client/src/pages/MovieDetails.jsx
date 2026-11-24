import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Star, Clock, Calendar, Heart, Ticket, ExternalLink, MessageSquare } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const MovieDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [favorited, setFavorited] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [rating, setRating] = useState(9);
  const [comment, setComment] = useState("");

  useEffect(() => {
    api.get(`/movies/${id}`).then((res) => setMovie(res.data));
    api.get(`/reviews/${id}`).then((res) => setReviews(res.data));
  }, [id]);

  useEffect(() => {
    if (!user) {
      setFavorited(false);
      return;
    }
    api
      .get("/favorites")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setFavorited(list.some((m) => String(m._id) === String(id)));
      })
      .catch((err) => console.error("Failed to load watchlist status:", err));
  }, [id, user]);

  const handleToggleFavorite = async () => {
    if (!user) return alert("Please sign in to save favorites.");
    if (togglingFavorite) return;
    setTogglingFavorite(true);
    try {
      const targetMovieId = movie?._id || id;
      const { data } = await api.post("/favorites/toggle", { movieId: targetMovieId });
      setFavorited(Boolean(data.favorited));
    } catch (err) {
      alert(err.response?.data?.message || "Could not update watchlist. Please try again.");
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please sign in to post a review.");
    if (!comment.trim()) return;
    const { data } = await api.post("/reviews", { movieId: id, rating, comment });
    setReviews((prev) => [data, ...prev]);
    setComment("");
  };

  if (!movie) return <div className="p-12 text-center text-slate-400">Loading movie...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-[280px,1fr]">
        <img
          src={movie.posterUrl}
          alt={movie.movieName}
          className="w-full rounded-2xl border border-slate-800 object-cover shadow-2xl"
        />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {movie.certification}
            </span>
            <span className="rounded bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
              {movie.language}
            </span>
            <span className="flex items-center gap-1 rounded bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400" /> {movie.rating} / 10
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{movie.movieName}</h1>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-red-400" /> {movie.runtime} mins
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-red-400" />{" "}
              {new Date(movie.releaseDate).toDateString()}
            </span>
          </div>

          <p className="mt-5 leading-relaxed text-slate-300">{movie.description}</p>

          {movie.cast?.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cast</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {movie.cast.map((actor) => (
                  <span
                    key={actor}
                    className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs text-slate-200"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to={`/shows/${movie._id}`}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
            >
              <Ticket className="h-4 w-4" /> Select Showtime & Seats
            </Link>
            <button
              onClick={handleToggleFavorite}
              disabled={togglingFavorite}
              className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                favorited
                  ? "border-pink-500 bg-pink-500/20 text-pink-300"
                  : "border-slate-700 bg-slate-800/80 text-slate-200 hover:border-pink-500"
              }`}
            >
              <Heart className={`h-4 w-4 ${favorited ? "fill-pink-400 text-pink-400" : ""}`} />
              {togglingFavorite
                ? "Updating..."
                : favorited
                ? "Saved in Watchlist"
                : "Add to Watchlist"}
            </button>
            {movie.trailerUrl && (
              <a
                href={movie.trailerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500"
              >
                <ExternalLink className="h-4 w-4" /> Watch Trailer
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-12 border-t border-slate-800 pt-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <MessageSquare className="h-5 w-5 text-red-500" /> Audience Reviews ({reviews.length})
        </h2>

        <form onSubmit={handleReviewSubmit} className="mt-4 rounded-2xl border border-slate-800 bg-[#111827] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-300">Your Rating (1-10):</label>
            <input
              type="number"
              min="1"
              max="10"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-sm text-white"
            />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Share your thoughts on this movie..."
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white outline-none focus:border-red-500"
          />
          <button
            type="submit"
            className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            Post Review
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {reviews.map((r) => (
            <div key={r._id} className="rounded-xl border border-slate-800 bg-[#111827] p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{r.username}</span>
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                  ★ {r.rating}/10
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{r.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;