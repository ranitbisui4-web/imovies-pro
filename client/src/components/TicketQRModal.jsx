import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, MapPin, Calendar, Clock, Ticket } from "lucide-react";

const TicketQRModal = ({ booking, onClose }) => {
  if (!booking) return null;

  const qrPayload = JSON.stringify({
    bookingId: booking.bookingId,
    movie: booking.movieTitle,
    theatre: booking.theatreName,
    date: booking.showdate,
    time: booking.showtime,
    seats: booking.seats,
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-[#111827] shadow-2xl"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-rose-700 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            <span className="font-bold">Digital E-Ticket</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          <h3 className="text-xl font-extrabold text-white">{booking.movieTitle}</h3>
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-slate-400">
            <MapPin className="h-4 w-4 text-red-400" /> {booking.theatreName}
          </p>

          <div className="mt-4 flex justify-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-red-400" /> {booking.showdate}
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-red-400" /> {booking.showtime}
            </span>
          </div>

          <div className="my-6 inline-block rounded-2xl bg-white p-4">
            <QRCodeCanvas value={qrPayload} size={170} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Booking ID</span>
              <span className="font-mono font-bold text-white">{booking.bookingId}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-slate-400">Seats</span>
              <span className="font-bold text-emerald-400">{booking.seats.join(", ")}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-slate-400">Amount Paid</span>
              <span className="font-bold text-white">₹{booking.totalPrice} ({booking.paymentMethod})</span>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Print / Save Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketQRModal;
