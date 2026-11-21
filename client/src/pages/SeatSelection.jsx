import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { CheckCircle2, Tag, CreditCard, Smartphone } from "lucide-react";
import api, { API_BASE_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useAIControl } from "../context/AIControlContext";

const SeatSelection = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { aiSeatCommand, clearAiSeatCommand } = useAIControl();

  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [promoCode, setPromoCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);

  const clientUserId = useMemo(
    () => user?.id || user?._id || `guest-${Math.random().toString(36).slice(2, 8)}`,
    [user]
  );

  useEffect(() => {
    api.get(`/shows/${showId}`).then((res) => setShow(res.data));

    const socket = io(API_BASE_URL);
    socketRef.current = socket;
    socket.emit("join_show", showId);
    socket.on("seats_updated", (payload) => {
      if (payload.showId === showId) {
        setShow((prev) =>
          prev
            ? { ...prev, bookedSeats: payload.bookedSeats, lockedSeats: payload.lockedSeats }
            : prev
        );
      }
    });

    return () => {
      socket.emit("leave_show", showId);
      socket.disconnect();
    };
  }, [showId]);

  // Apply AI auto-selected seats if directed here by AI Concierge
  useEffect(() => {
    if (aiSeatCommand && aiSeatCommand.showId === showId && show) {
      const validSeats = aiSeatCommand.seats.filter((s) => !show.bookedSeats.includes(s));
      setSelectedSeats(validSeats);
      socketRef.current?.emit("lock_seats", {
        showId,
        seats: validSeats,
        userId: clientUserId,
      });
      clearAiSeatCommand();
    }
  }, [aiSeatCommand, showId, show, clientUserId, clearAiSeatCommand]);

  const toggleSeat = (seatId) => {
    const next = selectedSeats.includes(seatId)
      ? selectedSeats.filter((s) => s !== seatId)
      : [...selectedSeats, seatId];
    setSelectedSeats(next);
    socketRef.current?.emit("lock_seats", {
      showId,
      seats: next,
      userId: clientUserId,
    });
  };

  if (!show) return <div className="p-12 text-center text-slate-400">Loading seat layout...</div>;

  const { theatre, movie } = show;
  const bookedSet = new Set(show.bookedSeats || []);
  const lockedByOthers = new Set(
    (show.lockedSeats || [])
      .filter((l) => l.userId !== clientUserId && new Date(l.expiresAt) > new Date())
      .map((l) => l.seatId)
  );

  const sections = [
    { label: "Balcony", prefix: "B", count: theatre.balconySeatCount, price: theatre.balconySeatPrice },
    { label: "Middle", prefix: "M", count: theatre.middleSeatCount, price: theatre.middleSeatPrice },
    { label: "Lower", prefix: "L", count: theatre.lowerSeatCount, price: theatre.lowerSeatPrice },
  ];

  const subtotal = selectedSeats.reduce((sum, s) => {
    if (s.startsWith("B")) return sum + theatre.balconySeatPrice;
    if (s.startsWith("M")) return sum + theatre.middleSeatPrice;
    return sum + theatre.lowerSeatPrice;
  }, 0);

  const code = promoCode.trim().toUpperCase();
  const discount =
    code === "IMOVIES20" ? Math.round(subtotal * 0.2) : code === "FIRST50" ? Math.min(50, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (selectedSeats.length === 0) return;
    setError("");
    setBookingLoading(true);
    try {
      await api.post("/bookings", {
        showId,
        seats: selectedSeats,
        promoCode: code,
        paymentMethod,
      });
      navigate("/bookings");
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{movie.movieName}</h1>
          <p className="text-sm text-slate-400">
            {theatre.theatreName} • {show.screenName} • {show.showdate} at {show.showtime}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded border border-slate-600 bg-slate-800" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded bg-emerald-500" /> Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded bg-amber-500/60" /> Held Live
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded bg-slate-700 opacity-40" /> Booked
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        {/* Seat Layout */}
        <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6">
          <div className="mx-auto mb-8 max-w-md">
            <div className="h-2 rounded-full bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_25px_rgba(239,68,68,0.8)]" />
            <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Cinema Screen This Way
            </p>
          </div>

          <div className="space-y-7">
            {sections.map((sec) => (
              <div key={sec.prefix}>
                <div className="mb-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-300">
                    {sec.label} Class
                  </span>
                  <span className="font-semibold text-red-400">₹{sec.price} / seat</span>
                </div>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {Array.from({ length: sec.count }, (_, idx) => {
                    const seatId = `${sec.prefix}${idx + 1}`;
                    const isBooked = bookedSet.has(seatId);
                    const isLocked = lockedByOthers.has(seatId);
                    const isSelected = selectedSeats.includes(seatId);

                    return (
                      <button
                        key={seatId}
                        disabled={isBooked || isLocked}
                        onClick={() => toggleSeat(seatId)}
                        className={`rounded-lg py-2 text-xs font-bold transition ${
                          isBooked
                            ? "cursor-not-allowed bg-slate-800/40 text-slate-600 line-through"
                            : isLocked
                            ? "cursor-not-allowed bg-amber-500/30 text-amber-300"
                            : isSelected
                            ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                            : "border border-slate-700 bg-slate-800/80 text-slate-200 hover:border-red-500"
                        }`}
                      >
                        {seatId}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Sidebar */}
        <div className="h-fit rounded-3xl border border-slate-800 bg-[#111827] p-6">
          <h2 className="text-lg font-bold text-white">Booking Summary</h2>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Selected Seats</span>
              <span className="font-bold text-emerald-400">
                {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-white">₹{subtotal}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Promo Discount ({code})</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-800 pt-3 text-base font-extrabold text-white">
              <span>Total Payable</span>
              <span>₹{total}</span>
            </div>
          </div>

          {/* Promo Code */}
          <div className="mt-5">
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-400">
              <Tag className="h-3.5 w-3.5" /> Promo Code (IMOVIES20 / FIRST50)
            </label>
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm uppercase text-white outline-none focus:border-red-500"
            />
          </div>

          {/* Payment Method */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-slate-400">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("UPI")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold ${
                  paymentMethod === "UPI"
                    ? "border-red-500 bg-red-600/20 text-white"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                <Smartphone className="h-4 w-4" /> UPI QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold ${
                  paymentMethod === "CARD"
                    ? "border-red-500 bg-red-600/20 text-white"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                <CreditCard className="h-4 w-4" /> Card
              </button>
            </div>
          </div>

          {error && <p className="mt-3 text-xs font-medium text-red-400">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={selectedSeats.length === 0 || bookingLoading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {bookingLoading
              ? "Confirming..."
              : user
              ? `Pay ₹${total} & Confirm`
              : "Sign In to Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;
