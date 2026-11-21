const mongoose = require("mongoose");

const theatreSchema = new mongoose.Schema(
  {
    theatreName: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    screens: { type: Number, default: 3 },
    balconySeatPrice: { type: Number, required: true, default: 250 },
    middleSeatPrice: { type: Number, required: true, default: 180 },
    lowerSeatPrice: { type: Number, required: true, default: 120 },
    balconySeatCount: { type: Number, required: true, default: 20 }, // e.g. B1..B20
    middleSeatCount: { type: Number, required: true, default: 30 },  // e.g. M1..M30
    lowerSeatCount: { type: Number, required: true, default: 20 },   // e.g. L1..L20
  },
  { timestamps: true }
);

module.exports = mongoose.model("Theatre", theatreSchema);
