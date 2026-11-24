const crypto = require("crypto");
const Show = require("../models/Show");
const Booking = require("../models/Booking");

const CONVENIENCE_FEE_PER_SEAT = 25;
const GST_RATE = 0.18;

const getSeatPrice = (seatId, theatre) => {
  if (!theatre) return 200;
  const code = String(seatId || "").toUpperCase();
  if (code.startsWith("B")) return Number(theatre.balconySeatPrice ?? theatre.price ?? 250);
  if (code.startsWith("M")) return Number(theatre.middleSeatPrice ?? theatre.price ?? 180);
  return Number(theatre.lowerSeatPrice ?? theatre.price ?? 120);
};

const createPaymentOrder = async (req, res) => {
  try {
    const { showId, seats, promoCode } = req.body;

    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Show ID and at least one seat are required." });
    }

    const show = await Show.findById(showId).populate("movie").populate("theatre");
    if (!show) {
      return res.status(404).json({ message: "Showtime not found." });
    }

    const bookedSet = new Set((show.bookedSeats || []).map((s) => String(s)));
    const conflict = seats.find((seat) => bookedSet.has(String(seat)));
    if (conflict) {
      return res.status(409).json({ message: `Seat ${conflict} is already booked.` });
    }

    const subtotal = seats.reduce((sum, seat) => sum + getSeatPrice(seat, show.theatre), 0);
    const convenienceFee = seats.length * CONVENIENCE_FEE_PER_SEAT;
    const gst = Math.round(convenienceFee * GST_RATE);

    const normalizedCode = String(promoCode || "").trim().toUpperCase();
    let discount = 0;
    if (normalizedCode === "IMOVIES20") {
      discount = Math.round(subtotal * 0.2);
    } else if (normalizedCode === "FIRST50") {
      discount = Math.min(50, subtotal);
    } else if (normalizedCode === "IMOVIES10") {
      discount = Math.round(subtotal * 0.1);
    }

    const totalAmount = Math.max(0, subtotal + convenienceFee + gst - discount);

    const orderId = `ORD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const merchantVpa = process.env.MERCHANT_UPI_ID || "imoviespro@okaxis";
    const movieTitle = show.movie?.movieName || show.movie?.title || "Movie";
    const theatreName = show.theatre?.theatreName || show.theatre?.name || "Cinema Hall";
    const upiUri = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(
      "iMovies Pro"
    )}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`${orderId} - ${movieTitle}`)}`;

    const order = {
      orderId,
      showId: show._id,
      movieTitle,
      theatreName,
      showDate: show.showdate || "",
      showTime: show.showtime || show.time || "",
      seats,
      subtotal,
      convenienceFee,
      gst,
      discount,
      promoCode: discount > 0 ? normalizedCode : null,
      totalAmount,
      merchantVpa,
      upiUri,
    };

    return res.status(201).json({ order, ...order });
  } catch (err) {
    console.error("createPaymentOrder error:", err);
    return res.status(500).json({ message: "Failed to initialize payment order." });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId, showId, seats, totalAmount, paymentMethod, paymentDetails } = req.body;

    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Missing show or seat details for payment verification." });
    }

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ message: "Showtime not found." });
    }

    const existingBooked = new Set((show.bookedSeats || []).map((s) => String(s)));
    const alreadyTaken = seats.find((seat) => existingBooked.has(String(seat)));
    if (alreadyTaken) {
      return res.status(409).json({ message: `Seat ${alreadyTaken} was just booked by another user.` });
    }

    show.bookedSeats = [...(show.bookedSeats || []), ...seats];
    await show.save();

    const transactionId = `TXN-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

    const booking = await Booking.create({
      user: req.user?._id || req.user?.id,
      show: show._id,
      seats,
      totalAmount: Number(totalAmount || 0),
      paymentMethod: paymentMethod || "UPI",
      paymentDetails: paymentDetails || "",
      orderId: orderId || `ORD-${Date.now()}`,
      transactionId,
      status: "CONFIRMED",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`show:${show._id}`).emit("seats_updated", {
        showId: show._id,
        bookedSeats: show.bookedSeats,
        lockedSeats: show.lockedSeats || [],
      });
    }

    return res.status(201).json({
      message: "Payment verified and booking confirmed.",
      transactionId,
      booking,
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ message: "Payment verification failed." });
  }
};

module.exports = { createPaymentOrder, verifyPayment };