const crypto = require("crypto");
const https = require("https");
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

const normalizePaymentMethod = (method) => {
  const upper = String(method || "RAZORPAY").toUpperCase();
  if (upper === "RAZORPAY" || upper === "CARD" || upper === "WALLET" || upper === "UPI") {
    return upper;
  }
  if (upper === "NETBANKING") return "WALLET";
  return "RAZORPAY";
};

const calculateBreakdown = (seats, theatre, promoCode) => {
  const subtotal = seats.reduce((sum, seat) => sum + getSeatPrice(seat, theatre), 0);
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

  const totalAmount = Math.max(1, subtotal + convenienceFee + gst - discount);
  return {
    subtotal,
    convenienceFee,
    gst,
    discount,
    promoCode: discount > 0 ? normalizedCode : "",
    totalAmount,
  };
};

const createRazorpayOrderApi = ({ amountPaise, receipt, notes, keyId, keySecret }) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
    });

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const req = https.request(
      {
        hostname: "api.razorpay.com",
        path: "/v1/orders",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Authorization: `Basic ${auth}`,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed?.error?.description || "Razorpay order creation failed"));
            }
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });

const isValidRazorpaySignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  keySecret,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !keySecret) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(String(razorpaySignature), "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
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

    const pricing = calculateBreakdown(seats, show.theatre, promoCode);
    const localOrderId = `ORD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const movieTitle = show.movie?.movieName || show.movie?.title || "Movie";
    const theatreName = show.theatre?.theatreName || show.theatre?.name || "Cinema Hall";

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrder = null;
    if (keyId && keySecret) {
      razorpayOrder = await createRazorpayOrderApi({
        amountPaise: pricing.totalAmount * 100,
        receipt: localOrderId.slice(0, 40),
        notes: {
          showId: String(show._id),
          seats: seats.join(","),
          userId: String(req.user._id),
        },
        keyId,
        keySecret,
      });
    }

    const merchantVpa = process.env.MERCHANT_UPI_ID || "imoviespro@okaxis";
    const upiUri = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(
      "iMovies Pro"
    )}&am=${pricing.totalAmount}&cu=INR&tn=${encodeURIComponent(`${localOrderId} - ${movieTitle}`)}`;

    const order = {
      orderId: razorpayOrder?.id || localOrderId,
      localOrderId,
      razorpayOrderId: razorpayOrder?.id || null,
      razorpayKeyId: razorpayOrder ? keyId : process.env.VITE_RAZORPAY_KEY_ID || null,
      currency: "INR",
      amountPaise: pricing.totalAmount * 100,
      showId: show._id,
      movieTitle,
      theatreName,
      showDate: show.showdate || "",
      showTime: show.showtime || show.time || "",
      seats,
      ...pricing,
      merchantVpa,
      upiUri,
    };

    return res.status(201).json({ order, ...order });
  } catch (err) {
    console.error("createPaymentOrder error:", err);
    return res.status(500).json({ message: err.message || "Failed to initialize payment order." });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      orderId,
      showId,
      seats,
      totalAmount,
      promoCode,
      paymentMethod,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Missing show or seat details for payment verification." });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (razorpay_payment_id && keySecret) {
      const valid = isValidRazorpaySignature({
        razorpayOrderId: razorpay_order_id || orderId,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        keySecret,
      });
      if (!valid) {
        return res.status(400).json({ message: "Razorpay payment signature verification failed." });
      }
    }

    const show = await Show.findById(showId).populate("movie").populate("theatre");
    if (!show) {
      return res.status(404).json({ message: "Showtime not found." });
    }

    const existingBooked = new Set((show.bookedSeats || []).map((s) => String(s)));
    const alreadyTaken = seats.find((seat) => existingBooked.has(String(seat)));
    if (alreadyTaken) {
      return res.status(409).json({ message: `Seat ${alreadyTaken} was just booked by another user.` });
    }

    const pricing = calculateBreakdown(seats, show.theatre, promoCode);
    const finalTotalPrice =
      totalAmount !== undefined && totalAmount !== null
        ? Number(totalAmount)
        : pricing.totalAmount;

    show.bookedSeats = Array.from(new Set([...(show.bookedSeats || []), ...seats]));
    show.lockedSeats = (show.lockedSeats || []).filter((l) => !seats.includes(l.seatId));
    await show.save();

    const bookingId =
      orderId && String(orderId).startsWith("IMV-")
        ? String(orderId)
        : `IMV-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const booking = await Booking.create({
      bookingId,
      user: req.user._id,
      show: show._id,
      movieTitle: show.movie?.movieName || show.movie?.title || "Movie",
      moviePoster: show.movie?.posterUrl || "",
      theatreName: show.theatre?.theatreName || show.theatre?.name || "Cinema Hall",
      theatreLocation: show.theatre?.location || "",
      showdate: show.showdate || "",
      showtime: show.showtime || "",
      seats,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      totalPrice: finalTotalPrice,
      promoCode: pricing.promoCode,
      paymentMethod: normalizePaymentMethod(paymentMethod),
      paymentStatus: "PAID",
      status: "CONFIRMED",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`show:${show._id}`).emit("seats_updated", {
        showId: String(show._id),
        bookedSeats: show.bookedSeats,
        lockedSeats: show.lockedSeats || [],
      });
    }

    return res.status(201).json({
      message: "Payment verified and booking confirmed.",
      bookingId: booking.bookingId,
      razorpayPaymentId: razorpay_payment_id || null,
      booking,
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ message: "Payment verification failed." });
  }
};

module.exports = { createPaymentOrder, verifyPayment };