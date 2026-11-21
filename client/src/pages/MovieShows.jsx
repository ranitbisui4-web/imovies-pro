import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Calendar, Clock } from "lucide-react";
import api from "../services/api";

const MovieShows = () => {
  const { movieId } = useParams();
  const [shows, setShows] = useState([]);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/movies/${movieId}`), api.get(`/shows/movie/${movieId}`)])
      .then(([mRes, sRes]) => {
        setMovie(mRes.data);
        setShows(sRes.data);
      })
      .finally(() => setLoading(false));
  }, [movieId]);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading showtimes...</div>;

  // Group shows by theatre
  const grouped = shows.reduce((acc, s) => {
    const key = s.theatre?._id || "unknown";
    if (!acc[key]) acc[key] = { theatre: s.theatre, items: [] };
    acc[key].items.push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-black text-white sm:text-3xl">
        Showtimes for <span className="text-red-500">{movie?.movieName}</span>
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Select a theatre and showtime to open the live interactive seat map.
      </p>

      {Object.keys(grouped).length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-[#111827] p-10 text-center text-slate-400">
          No shows scheduled for this movie yet. Admins can add shows from the Admin Panel.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {Object.values(grouped).map(({ theatre, items }) => (
            <div
              key={theatre._id}
              className="rounded-2xl border border-slate-800 bg-[#111827] p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{theatre.theatreName}</h2>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-red-400" /> {theatre.location}
                  </p>
                </div>
                <div className="flex gap-2 text-xs text-slate-300">
                  <span className="rounded bg-slate-800 px-2.5 py-1">Balcony ₹{theatre.balconySeatPrice}</span>
                  <span className="rounded bg-slate-800 px-2.5 py-1">Middle ₹{theatre.middleSeatPrice}</span>
                  <span className="rounded bg-slate-800 px-2.5 py-1">Lower ₹{theatre.lowerSeatPrice}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {items.map((show) => {
                  const totalSeats =
                    theatre.balconySeatCount + theatre.middleSeatCount + theatre.lowerSeatCount;
                  const available = Math.max(0, totalSeats - (show.bookedSeats?.length || 0));

                  return (
                    <Link
                      key={show._id}
                      to={`/seats/${show._id}`}
                      className="flex flex-col rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 transition hover:border-red-500 hover:bg-red-600/10"
                    >
                      <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                        <Clock className="h-3.5 w-3.5 text-red-400" /> {show.showtime}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="h-3 w-3" /> {show.showdate}
                      </span>
                      <span className="mt-1 text-[11px] font-medium text-emerald-400">
                        {available} seats left
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MovieShows;
