import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Clock, Info, ShieldCheck, Sparkles, Tag } from "lucide-react";
import api, { API_BASE_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useAIControl } from "../context/AIControlContext";
import PaymentGatewayModal from "../components/PaymentGatewayModal";

const CONVENIENCE_FEE_PER_SEAT = 25;
const GST_RATE = 0.18;
const HOLD_SECONDS = 300; // 5-minute TTL lock

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const SeatSelection = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { aiSeatCommand, clearAiSeatCommand } = useAIControl();

  const [show, setShow] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [promoCode, setPromoCode] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [error, setError] = useState("");
  const [holdRemaining, setHoldRemaining] = useState(0);
  const socketRef = useRef(null);

  const clientUserId = useMemo(
    () => user?.id || user?._id || `guest-${Math.random().toString(36).slice(2, 8)}`, [user] );  useEffect(() => { api.get(`/shows/${showId}`).then((res) => setShow(res.data));

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

  // 5-Minute Live Seat Hold Countdown
  useEffect(() => {
    if (selectedSeats.length === 0) {
      setHoldRemaining(0);
      return;
    }
    setHoldRemaining(HOLD_SECONDS);
    const interval = setInterval(() => {
      setHoldRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSelectedSeats([]);
          socketRef.current?.emit("lock_seats", { showId, seats: [], userId: clientUserId });
          setError("Your 5-minute seat hold expired. Please re-select your seats.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedSeats.length, showId, clientUserId]);

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
    setError("");
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

  const convenienceFee = selectedSeats.length * CONVENIENCE_FEE_PER_SEAT;
  const gst = Math.round(convenienceFee * GST_RATE);
  const code = promoCode.trim().toUpperCase();
  const discount =
    code === "IMOVIES20"
      ? Math.round(subtotal * 0.2)
      : code === "FIRST50"
      ? Math.min(50, subtotal)
      : 0;
  const total = Math.max(0, subtotal + convenienceFee + gst - discount);

  const formatTimer = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const openRazorpayCheckout = async (orderData) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      setPaymentOrder(orderData);
      return;
    }

    const rzpOptions = {
      key: orderData.razorpayKeyId,
      amount: orderData.amountPaise || orderData.totalAmount * 100,
      currency: orderData.currency || "INR",
      name: "iMovies Pro",
      description: `${orderData.movieTitle} •${orderData.seats.join(", ")}`,
      order_id: orderData.razorpayOrderId,
      prefill: {
        name: user?.username || "",
        email: user?.email || "",
        contact: user?.phone || "",
      },
      theme: {
        color: "#dc2626",
      },
      handler: async (response) => {
        try {
          const { data: verified } = await api.post("/payments/verify", {
            orderId: orderData.localOrderId || orderData.orderId,
            showId,
            seats: orderData.seats,
            totalAmount: orderData.totalAmount,
            promoCode: orderData.promoCode,
            paymentMethod: "RAZORPAY",
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          navigate("/bookings", { state: { newBooking: verified.booking } });
        } catch (verifyErr) {
          setError(verifyErr.response?.data?.message || "Payment verification failed");
        }
      },
      modal: {
        ondismiss: () => {
          setError("Razorpay payment cancelled.");
        },
      },
    };

    const rzp = new window.Razorpay(rzpOptions);
    rzp.open();
  };

  const handleProceedToPayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (selectedSeats.length === 0) return;

    setError("");
    setCreatingOrder(true);
    try {
      const { data } = await api.post("/payments/create-order", {
        showId,
        seats: selectedSeats,
        promoCode: code,
      });
      const orderData = data.order || data;
      if (orderData.razorpayOrderId && orderData.razorpayKeyId) {
        await openRazorpayCheckout(orderData);
      } else {
        setPaymentOrder(orderData);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not initialize payment order");
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 lg:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{movie.movieName}</h1>
          <p className="text-sm text-slate-400">
            {theatre.theatreName} • {show.screenName} • {show.showdate} at{" "}
            {show.effectiveStartTime || show.showtime}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
          {holdRemaining > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 font-bold text-amber-300">
              <Clock className="h-3.5 w-3.5" /> Seat Hold: {formatTimer(holdRemaining)}
            </span>
          )}
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

      <div className="grid gap-8 lg:grid-cols-[1fr,360px]">
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

        <div className="h-fit rounded-3xl border border-slate-800 bg-[#111827] p-6">
          <h2 className="text-lg font-bold text-white">Booking Summary</h2>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Selected Seats</span>
              <span className="font-bold text-emerald-400">
                {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ticket Subtotal</span>
              <span className="text-white">₹{subtotal}</span>
            </div>
            {selectedSeats.length > 0 && (
              <>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Convenience Fee (₹25 × {selectedSeats.length})</span>
                  <span>₹{convenienceFee}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>GST (18% on fee)</span>
                  <span>₹{gst}</span>
                </div>
              </>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Promo Discount ({code})</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-800 pt-3 text-base font-extrabold text-white">
              <span>Amount Payable</span>
              <span>₹{total}</span>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-400">
              <Tag className="h-3.5 w-3.5" /> Promo Code (IMOVIES20 / FIRST50)
            </label>
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter promo code"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm uppercase text-white outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setPromoCode("IMOVIES20")}
                className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-2.5 text-[11px] font-bold text-red-300 hover:bg-red-500/20"
              >
                20% Off
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-[11px] text-slate-300">
            <p className="flex items-center gap-1.5 font-bold text-emerald-400">
              <Info className="h-3.5 w-3.5" /> Smart Refund & Loyalty Perks
            </p>
            <p className="mt-1 text-slate-400">
              Cancel up to 1h before show for <strong className="text-slate-200">75% refund</strong> — auto-upgrades to{" "}
              <strong className="text-emerald-300">90%</strong> if rebooked. Counts toward your{" "}
              <strong className="text-amber-300">7-in-57</strong> Canteen reward!
            </p>
          </div>

          {error && <p className="mt-3 text-xs font-medium text-red-400">{error}</p>}

          <button
            onClick={handleProceedToPayment}
            disabled={selectedSeats.length === 0 || creatingOrder}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {creatingOrder
              ? "Opening Razorpay Checkout..."
              : user
              ? `Pay with Razorpay ₹${total}` : "Sign In to Book"} </button>  <p className="mt-2.5 text-center text-[11px] text-slate-500"> Powered by Razorpay Checkout (UPI, Cards, Net Banking, Wallets) </p> </div> </div>  {/* Mobile Sticky Bottom Checkout Bar */} {selectedSeats.length > 0 && ( <div className="fixed bottom-14 left-0 right-0 z-30 flex items-center justify-between border-t border-slate-800 bg-[#0b101d]/95 px-4 py-3 backdrop-blur-md lg:hidden"> <div> <p className="text-xs text-slate-400"> {selectedSeats.length} Seat(s):{" "} <strong className="text-emerald-400">{selectedSeats.join(", ")}</strong> </p> <p className="text-base font-black text-white">₹{total}</p> </div> <button onClick={handleProceedToPayment} disabled={creatingOrder} className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30" > <Sparkles className="h-3.5 w-3.5" /> {creatingOrder ? "Opening..." : `Pay ₹${total}`}
          </button>
        </div>
      )}

      <PaymentGatewayModal
        order={paymentOrder}
        onClose={() => setPaymentOrder(null)}
        onSuccess={(confirmedBooking) => {
          setPaymentOrder(null);
          navigate("/bookings", { state: { newBooking: confirmedBooking } });
        }}
      />
    </div>
  );
};

export default SeatSelection;