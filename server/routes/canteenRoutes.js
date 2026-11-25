const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const CanteenItem = require("../models/CanteenItem");
const CanteenOrder = require("../models/CanteenOrder");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

const CASH_HANDLING_FEE = 13;
const LOYALTY_WINDOW_DAYS = 57;
const LOYALTY_REQUIRED_MOVIES = 7;
const LOYALTY_DISCOUNT_PCT = 0.36;

const getLoyaltyStatus = async (userId) => {
  const cutoff = new Date(Date.now() - LOYALTY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const recentBookings = await Booking.find({
    user: userId,
    status: "CONFIRMED",
    createdAt: { $gte: cutoff },
  }).lean();

  const distinctMovies = new Set(
    recentBookings.map((b) => String(b.movieTitle || "").trim().toLowerCase()).filter(Boolean)
  );
  const movieCount = distinctMovies.size;
  const eligible = movieCount >= LOYALTY_REQUIRED_MOVIES;

  const rewardBucket = await CanteenItem.findOne({ isPopcornBucketReward: true, available: true }).lean();

  return {
    moviesWatchedIn57Days: movieCount,
    requiredMovies: LOYALTY_REQUIRED_MOVIES,
    windowDays: LOYALTY_WINDOW_DAYS,
    eligible,
    discountPercent: eligible ? 36 : 0,
    popcornBucketReward: eligible
      ? rewardBucket?.name || "Signature Tub Popcorn Bucket"
      : null,
  };
};

router.get("/items", protect, async (req, res) => {
  try {
    const [items, loyalty, confirmedBookings] = await Promise.all([
      CanteenItem.find({ available: true }).sort({ createdAt: -1 }),
      getLoyaltyStatus(req.user._id),
      Booking.find({ user: req.user._id, status: "CONFIRMED" }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({
      items,
      loyalty,
      canOrderFood: confirmedBookings.length > 0,
      bookings: confirmedBookings,
      cashHandlingFee: CASH_HANDLING_FEE,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/items", protect, adminOnly, async (req, res) => {
  try {
    if (req.body.isPopcornBucketReward) {
      await CanteenItem.updateMany({}, { $set: { isPopcornBucketReward: false } });
    }
    const item = await CanteenItem.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/items/:id", protect, adminOnly, async (req, res) => {
  try {
    await CanteenItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Canteen item removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/orders", protect, async (req, res) => {
  try {
    const { bookingId, items, paymentMode } = req.body;
    const mode = String(paymentMode || "ONLINE").toUpperCase() === "CASH" ? "CASH" : "ONLINE";

    const validBooking = await Booking.findOne({
      _id: bookingId,
      user: req.user._id,
      status: "CONFIRMED",
    });

    if (!validBooking) {
      return res.status(403).json({
        message: "Only users with a confirmed ticket booking can order food from the canteen.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Select at least one canteen item." });
    }

    const dbItems = await CanteenItem.find({ _id: { $in: items.map((i) => i.itemId) } }).lean();
    const itemMap = new Map(dbItems.map((d) => [String(d._id), d]));

    let itemsSubtotal = 0;
    const normalizedItems = items
      .map((entry) => {
        const found = itemMap.get(String(entry.itemId));
        if (!found) return null;
        const qty = Math.max(1, Number(entry.qty) || 1);
        itemsSubtotal += found.price * qty;
        return {
          itemId: found._id,
          name: found.name,
          price: found.price,
          qty,
        };
      })
      .filter(Boolean);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: "No valid canteen items selected." });
    }

    const loyalty = await getLoyaltyStatus(req.user._id);
    const loyaltyDiscount36 = loyalty.eligible
      ? Math.round(itemsSubtotal * LOYALTY_DISCOUNT_PCT)
      : 0;
    const handlingFee = mode === "CASH" ? CASH_HANDLING_FEE : 0;
    const finalAmount = Math.max(0, itemsSubtotal - loyaltyDiscount36 + handlingFee);

    const order = await CanteenOrder.create({
      user: req.user._id,
      booking: validBooking._id,
      items: normalizedItems,
      itemsSubtotal,
      loyaltyDiscount36,
      popcornBucketIncluded: loyalty.popcornBucketReward || "",
      paymentMode: mode,
      handlingFee,
      finalAmount,
    });

    res.status(201).json({ order, loyalty });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;