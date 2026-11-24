const crypto = require("crypto");
const Show = require("../models/Show");
const Booking = require("../models/Booking");

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

    const basePrice = Number(show.price || show.ticketPrice || 200);
    const subtotal = basePrice * seats.length;
    const convenienceFee = Math.round(subtotal * 0.1);
    const gst = Math.round((subtotal + convenienceFee) * 0.18);
    const discount =
      promoCode && String(promoCode).toUpperCase() === "IMOVIES10"
        ? Math.round(subtotal * 0.1)
        : 0;
    const totalAmount = Math.max(1, subtotal + convenienceFee + gst - discount);

    const orderId = `ORD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const merchantVpa = process.env.MERCHANT_UPI_ID || "imoviespro@okaxis";
    const movieTitle = show.movie?.title || "Movie";
    const theatreName = show.theatre?.name || "Cinema Hall";
    const upiUri = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(
      "iMovies Pro"
    )}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`${orderId} - ${movieTitle}`)}`;

    return res.status(201).json({
      order: {
        orderId,
        showId: show._id,
        movieTitle,
        theatreName,
        showTime: show.showTime || show.time || "",
        seats,
        subtotal,
        convenienceFee,
        gst,
        discount,
        promoCode: discount > 0 ? String(promoCode).toUpperCase() : null,
        totalAmount,
        merchantVpa,
        upiUri,
      },
    });
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