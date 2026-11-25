const { v4: uuidv4 } = require("uuid");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const Notification = require("../models/Notification");
const { sendBookingEmail } = require("../utils/mailer");

const getSeatPrice = (seatId, theatre) => {
  if (seatId.startsWith("B")) return theatre.balconySeatPrice;
  if (seatId.startsWith("M")) return theatre.middleSeatPrice;
  return theatre.lowerSeatPrice;
};

const getShowStartDateTime = (show) => {
  const dateStr = show?.showdate || new Date().toISOString().split("T")[0];
  const timeStr = show?.showtime || "00:00";
  const delayMins = Number(show?.delayMinutes) || 0;
  const base = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(base.getTime())) return new Date(Date.now() + 2 * 3600 * 1000);
  return new Date(base.getTime() + delayMins * 60 * 1000);
};

// Automatically upgrades previous cancelled booking refund from 75% to 90% if someone books that seat
const upgradeRefundIfRebooked = async (show, claimedSeats, io) => {
  if (!show?.releasedSeats?.length) return;
  const matchedEntries = show.releasedSeats.filter((r) => claimedSeats.includes(r.seatId));
  if (matchedEntries.length === 0) return;

  show.releasedSeats = show.releasedSeats.filter((r) => !claimedSeats.includes(r.seatId));
  await show.save();

  const bookingIds = Array.from(
    new Set(matchedEntries.map((m) => String(m.previousBookingId || "")).filter(Boolean))
  );

  for (const bId of bookingIds) {
    const prevBooking = await Booking.findById(bId);
    if (prevBooking && prevBooking.status === "CANCELLED" && !prevBooking.refundUpgradedTo90) {
      const upgradedRefund = Math.round((prevBooking.totalPrice || 0) * 0.9);
      const extraCredit = Math.max(0, upgradedRefund - (prevBooking.refundAmount || 0));

      prevBooking.refundRate = 90;
      prevBooking.refundAmount = upgradedRefund;
      prevBooking.refundUpgradedTo90 = true;
      await prevBooking.save();

      await Notification.create({
        recipientRole: "user",
        recipientUser: prevBooking.user,
        type: "admin_approved",
        title: "Refund Upgraded to 90%!",
        message: `Another viewer booked your cancelled seat(s) for ${prevBooking.movieTitle}. Your refund increased from 75% to 90% (+₹${extraCredit} added).`,
      });

      if (io) {
        io.emit("refund_upgraded", {
          bookingId: prevBooking.bookingId,
          refundRate: 90,
          refundAmount: upgradedRefund,
        });
      }
    }
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { showId, seats, promoCode = "", paymentMethod = "UPI" } = req.body;
    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Show and at least one seat are required" });
    }

    const show = await Show.findById(showId).populate("movie").populate("theatre");
    if (!show) return res.status(404).json({ message: "Show not found" });

    // Atomic seat lock to prevent double booking
    const updatedShow = await Show.findOneAndUpdate(
      { _id: showId, bookedSeats: { $nin: seats } },
      {
        $addToSet: { bookedSeats: { $each: seats } },
        $pull: { lockedSeats: { seatId: { $in: seats } } },
      },
      { new: true }
    );

    if (!updatedShow) {
      return res.status(409).json({
        message: "One or more selected seats were just booked by another user.",
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

    const io = req.app.get("io");
    await upgradeRefundIfRebooked(updatedShow, seats, io);

    if (io) {
      io.to(`show:${show._id}`).emit("seats_updated", {
        showId: show._id.toString(),
        bookedSeats: updatedShow.bookedSeats,
        lockedSeats: updatedShow.lockedSeats,
      });
    }

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

    const isElevated = req.user.role === "admin" || req.user.role === "manager";
    if (booking.user.toString() !== req.user._id.toString() && !isElevated) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    if (booking.status === "CANCELLED") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    const show = await Show.findById(booking.show);
    if (show && !isElevated) {
      const showStart = getShowStartDateTime(show);
      const minsUntilShow = (showStart.getTime() - Date.now()) / (1000 * 60);
      if (minsUntilShow < 60) {
        return res.status(400).json({
          message: "Seat cancellation is only allowed up to 1 hour before showtime.",
        });
      }
    }

    const initialRefund = Math.round((booking.totalPrice || 0) * 0.75);
    booking.status = "CANCELLED";
    booking.paymentStatus = "REFUNDED";
    booking.refundRate = 75;
    booking.refundAmount = initialRefund;
    booking.cancelledAt = new Date();
    await booking.save();

    if (show) {
      const releasedEntries = (booking.seats || []).map((seatId) => ({
        seatId,
        previousBookingId: booking._id,
        releasedAt: new Date(),
      }));

      show.bookedSeats = (show.bookedSeats || []).filter((s) => !booking.seats.includes(s));
      show.releasedSeats = [...(show.releasedSeats || []), ...releasedEntries];
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

    res.json({
      ...booking.toObject(),
      message: `Cancelled! 75% (₹${initialRefund}) refunded now — automatically upgrades to 90% if another user books your seat(s).`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.upgradeRefundIfRebooked = upgradeRefundIfRebooked;