const { v4: uuidv4 } = require("uuid");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const { sendBookingEmail } = require("../utils/mailer");

const getSeatPrice = (seatId, theatre) => {
  if (seatId.startsWith("B")) return theatre.balconySeatPrice;
  if (seatId.startsWith("M")) return theatre.middleSeatPrice;
  return theatre.lowerSeatPrice;
};

exports.createBooking = async (req, res) => {
  try {
    const { showId, seats, promoCode = "", paymentMethod = "UPI" } = req.body;
    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Show and at least one seat are required" });
    }

    const show = await Show.findById(showId).populate("movie").populate("theatre");
    if (!show) return res.status(404).json({ message: "Show not found" });

    // Check if any requested seat is already booked
    const alreadyBooked = seats.filter((s) => show.bookedSeats.includes(s));
    if (alreadyBooked.length > 0) {
      return res.status(409).json({
        message: `Seats already booked: ${alreadyBooked.join(", ")}`,
      });
    }

    const subtotal = seats.reduce((sum, s) => sum + getSeatPrice(s, show.theatre), 0);
    let discount = 0;
    const code = promoCode.trim().toUpperCase();
    if (code === "IMOVIES20") {
      discount = Math.round(subtotal * 0.2);
    } else if (code === "FIRST50") {
      discount = Math.min(50, subtotal);
    }
    const totalPrice = Math.max(0, subtotal - discount);

    // Mark seats booked and clear locks for those seats
    show.bookedSeats = Array.from(new Set([...show.bookedSeats, ...seats]));
    show.lockedSeats = (show.lockedSeats || []).filter((l) => !seats.includes(l.seatId));
    await show.save();

    const booking = await Booking.create({
      bookingId: `IMV-${uuidv4().slice(0, 8).toUpperCase()}`,
      user: req.user._id,
      show: show._id,
      movieTitle: show.movie.movieName,
      moviePoster: show.movie.posterUrl,
      theatreName: show.theatre.theatreName,
      theatreLocation: show.theatre.location,
      showdate: show.showdate,
      showtime: show.showtime,
      seats,
      subtotal,
      discount,
      totalPrice,
      promoCode: code,
      paymentMethod,
      paymentStatus: "PAID",
      status: "CONFIRMED",
    });

    // Notify connected clients on this show room via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`show:${show._id}`).emit("seats_updated", {
        showId: show._id.toString(),
        bookedSeats: show.bookedSeats,
        lockedSeats: show.lockedSeats,
      });
    }

    // Best-effort email confirmation
    sendBookingEmail(req.user.email, booking).catch(() => {});

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }
    if (booking.status === "CANCELLED") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    booking.status = "CANCELLED";
    booking.paymentStatus = "REFUNDED";
    await booking.save();

    const show = await Show.findById(booking.show);
    if (show) {
      show.bookedSeats = show.bookedSeats.filter((s) => !booking.seats.includes(s));
      await show.save();
      const io = req.app.get("io");
      if (io) {
        io.to(`show:${show._id}`).emit("seats_updated", {
          showId: show._id.toString(),
          bookedSeats: show.bookedSeats,
          lockedSeats: show.lockedSeats,
        });
      }
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
