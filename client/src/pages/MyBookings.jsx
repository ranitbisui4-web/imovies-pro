import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  QrCode,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Popcorn,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import api from "../services/api";
import TicketQRModal from "../components/TicketQRModal";

const canCancelBeforeOneHour = (showdate, showtime) => {
  if (!showdate || !showtime) return true;
  const start = new Date(`${showdate}T${showtime}:00`);
  if (Number.isNaN(start.getTime())) return true;
  return (start.getTime() - Date.now()) / (1000 * 60) >= 60;
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState(null);

  const loadBookings = () => {
    api
      .get("/bookings/my")
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (b) => {
    const confirmed = window.confirm(
      `Cancel seats (${b.seats.join(", ")}) for ${b.movieTitle}?\n\n` +
        `• You get a 75% refund (₹${Math.round(b.totalPrice * 0.75)}) immediately.\n` +
        `• If another viewer books your seat(s), your refund automatically upgrades to 90% (₹${Math.round(
          b.totalPrice * 0.9
        )})!`
    );
    if (!confirmed) return;

    setBannerMsg(null);
    try {
      const { data } = await api.patch(`/bookings/${b._id}/cancel`);
      setBannerMsg({
        type: "success",
        text:
          data.message ||
          "Booking cancelled! 75% refunded now — automatically upgrades to 90% if rebooked.",
      });
      loadBookings();
    } catch (err) {
      setBannerMsg({
        type: "error",
        text:
          err.response?.data?.message ||
          "Cancellation failed (cancellations close 1 hour before showtime).",
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">
            Your <span className="text-red-500">Bookings</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Cancel up to 1 hour before showtime for a <strong className="text-slate-200">75% refund</strong> — automatically upgraded to{" "}
            <strong className="text-emerald-400">90%</strong> if another viewer books your seat.
          </p>
        </div>

        <Link
          to="/canteen"
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
        >
          <Popcorn className="h-4 w-4" /> Order Canteen Snacks
        </Link>
      </div>

      {bannerMsg && (
        <div
          className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
            bannerMsg.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center text-slate-400">
          You have no bookings yet. Browse movies or ask the AI Concierge to book seats!
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {bookings.map((b) => {
            const withinCancelWindow = canCancelBeforeOneHour(b.showdate, b.showtime);
            const refundPct = b.refundRate || (b.refundUpgradedTo90 ? 90 : 75);
            const refundAmt =
              b.refundAmount || Math.round((b.totalPrice || 0) * (refundPct / 100));

            return (
              <div
                key={b._id}
                className="flex gap-4 rounded-2xl border border-slate-800 bg-[#111827] p-4"
              >
                {b.moviePoster && (
                  <img
                    src={b.moviePoster}
                    alt={b.movieTitle}
                    className="h-36 w-24 rounded-xl object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white">{b.movieTitle}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          b.status === "CONFIRMED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-red-400" /> {b.theatreName}
                    </p>
                    <p className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {b.showdate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {b.showtime}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-slate-300">
                      Seats: <strong className="text-emerald-400">{b.seats.join(", ")}</strong> •{" "}
                      <strong>₹{b.totalPrice}</strong>
                    </p>

                    {b.status === "CANCELLED" && (
                      <div
                        className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                          b.refundUpgradedTo90 || refundPct === 90
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        <span className="flex items-center gap-1 font-bold">
                          <Sparkles className="h-3 w-3" />
                          {refundPct}% Refunded: ₹{refundAmt}
                        </span>
                        <span className="block text-[10px] opacity-85">
                          {b.refundUpgradedTo90 || refundPct === 90
                            ? "Upgraded from 75% to 90% after seat was rebooked!"
                            : "75% issued • Auto-upgrades to 90% if another viewer books your seat."}
                        </span>
                      </div>
                    )}
                  </div>

                  {b.status === "CONFIRMED" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveTicket(b)}
                        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                      >
                        <QrCode className="h-3.5 w-3.5" /> View QR Ticket
                      </button>
                      <button
                        onClick={() => handleCancel(b)}
                        disabled={!withinCancelWindow}
                        title={
                          withinCancelWindow
                            ? "Cancel up to 1 hour before showtime (75% refund, 90% if rebooked)"
                            : "Cancellation closed within 1 hour of showtime"
                        }
                        className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {withinCancelWindow ? "Cancel Seat" : "Cutoff Passed"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TicketQRModal booking={activeTicket} onClose={() => setActiveTicket(null)} />
    </div>
  );
};

export default MyBookings;