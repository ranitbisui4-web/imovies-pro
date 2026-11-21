const mongoose = require("mongoose");

const seatLockSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true },
    userId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: true },
    screenName: { type: String, default: "Screen 1 (Dolby Atmos)" },
    showdate: { type: String, required: true }, // YYYY-MM-DD
    showtime: { type: String, required: true }, // HH:mm (24h) or "19:30"
    bookedSeats: { type: [String], default: [] },
    lockedSeats: { type: [seatLockSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Show", showSchema);
