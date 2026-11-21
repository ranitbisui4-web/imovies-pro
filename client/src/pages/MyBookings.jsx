import React, { useEffect, useState } from "react";
import { QrCode, XCircle, Calendar, Clock, MapPin } from "lucide-react";
import api from "../services/api";
import TicketQRModal from "../components/TicketQRModal";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBookings = () => {
    api
      .get("/bookings/my")
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this booking and release seats?")) return;
    await api.patch(`/bookings/${id}/cancel`);
    loadBookings();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-black text-white">
        Your <span className="text-red-500">Bookings</span>
      </h1>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#111827] p-12 text-center text-slate-400">
          You have no bookings yet. Browse movies or ask the AI Concierge to book seats!
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {bookings.map((b) => (
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
                </div>

                {b.status === "CONFIRMED" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setActiveTicket(b)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      <QrCode className="h-3.5 w-3.5" /> View QR Ticket
                    </button>
                    <button
                      onClick={() => handleCancel(b._id)}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-red-500 hover:text-red-400"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TicketQRModal booking={activeTicket} onClose={() => setActiveTicket(null)} />
    </div>
  );
};

export default MyBookings;
