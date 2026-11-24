const mongoose = require("mongoose");

const lockedSeatSchema = new mongoose.Schema(
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
    screenName: { type: String, required: true, trim: true },
    showdate: { type: String, required: true },
    showtime: { type: String, required: true }, // "HH:MM"
    delayMinutes: { type: Number, default: 0 },
    breakDurationMinutes: { type: Number, default: 20 },
    delayReason: { type: String, default: "" },
    bookedSeats: [{ type: String }],
    lockedSeats: [lockedSeatSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Show", showSchema);