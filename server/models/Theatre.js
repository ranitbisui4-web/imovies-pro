const mongoose = require("mongoose");

const theatreSchema = new mongoose.Schema(
  {
    theatreName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    screens: { type: Number, default: 3 },
    balconySeatPrice: { type: Number, default: 280 },
    middleSeatPrice: { type: Number, default: 190 },
    lowerSeatPrice: { type: Number, default: 130 },
    balconySeatCount: { type: Number, default: 20 },
    middleSeatCount: { type: Number, default: 30 },
    lowerSeatCount: { type: Number, default: 20 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Theatre", theatreSchema);