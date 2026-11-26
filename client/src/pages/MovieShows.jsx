import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Calendar, Clock, Popcorn, ShieldCheck } from "lucide-react";
import api from "../services/api";

const MovieShows = () => {
  const { movieId } = useParams();
  const [shows, setShows] = useState([]);
  const [movie, setMovie] = useState(null);
  const [selectedDate, setSelectedDate] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/movies/${movieId}`), api.get(`/shows/movie/${movieId}`)])
      .then(([mRes, sRes]) => {
        setMovie(mRes.data);
        setShows(sRes.data || []);
      })
      .finally(() => setLoading(false));
  }, [movieId]);

  const dates = useMemo(() => {
    const unique = Array.from(new Set((shows || []).map((s) => s.showdate).filter(Boolean)));
    return ["All", ...unique];
  }, [shows]);

  const visibleShows = useMemo(() => {
    if (selectedDate === "All") return shows;
    return shows.filter((s) => s.showdate === selectedDate);
  }, [shows, selectedDate]);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading showtimes...</div>;

  const grouped = visibleShows.reduce((acc, s) => {
    const key = s.theatre?._id || "unknown";
    if (!acc[key]) acc[key] = { theatre: s.theatre, items: [] };
    acc[key].items.push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            Showtimes for <span className="text-red-500">{movie?.movieName}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Select a cinema and showtime to open the live seat map.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
            <Popcorn className="h-3.5 w-3.5" /> Seat Canteen Available
          </span>
          <span className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-300">
            <ShieldCheck className="h-3.5 w-3.5" /> 75%–90% Refund Eligible
          </span>
        </div>
      </div>

      {dates.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedDate === d
                  ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                  : "border border-slate-800 bg-[#111827] text-slate-300 hover:border-red-500"
              }`}
            >
              {d === "All" ? "All Dates" : d}
            </button>
          ))}
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-[#111827] p-10 text-center text-slate-400">
          No shows scheduled for this movie yet. Admins can add shows from the Admin Panel.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {Object.values(grouped).map(({ theatre, items }) => (
            <div
              key={theatre?._id || Math.random()}
              className="rounded-2xl border border-slate-800 bg-[#111827] p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{theatre?.theatreName}</h2>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-red-400" /> {theatre?.location}
                    {theatre?.city ? ` • ${theatre.city}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded bg-slate-800 px-2.5 py-1">
                    Balcony ₹{theatre?.balconySeatPrice}
                  </span>
                  <span className="rounded bg-slate-800 px-2.5 py-1">
                    Middle ₹{theatre?.middleSeatPrice}
                  </span>
                  <span className="rounded bg-slate-800 px-2.5 py-1">
                    Lower ₹{theatre?.lowerSeatPrice}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {items.map((show) => {
                  const totalSeats =
                    (theatre?.balconySeatCount || 20) +
                    (theatre?.middleSeatCount || 30) +
                    (theatre?.lowerSeatCount || 20);
                  const available = Math.max(0, totalSeats - (show.bookedSeats?.length || 0));

                  return (
                    <Link
                      key={show._id}
                      to={`/seats/${show._id}`}
                      className="flex flex-col rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 transition hover:border-red-500 hover:bg-red-600/10"
                    >
                      <span className="flex items-center gap-1.5 text-sm font-bold text-white">
                        <Clock className="h-3.5 w-3.5 text-red-400" />
                        {show.effectiveStartTime || show.showtime}
                        {show.delayMinutes > 0 && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                            +{show.delayMinutes}m
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="h-3 w-3" /> {show.showdate} • {show.screenName}
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