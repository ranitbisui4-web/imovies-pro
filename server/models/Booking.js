const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },
    movieTitle: { type: String, required: true },
    moviePoster: { type: String, default: "" },
    theatreName: { type: String, required: true },
    theatreLocation: { type: String, default: "" },
    showdate: { type: String, required: true },
    showtime: { type: String, required: true },
    seats: { type: [String], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    promoCode: { type: String, default: "" },
    paymentMethod: { type: String, enum: ["UPI", "CARD", "WALLET"], default: "UPI" },
    paymentStatus: { type: String, enum: ["PAID", "REFUNDED", "FAILED"], default: "PAID" },
    status: { type: String, enum: ["CONFIRMED", "CANCELLED"], default: "CONFIRMED" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
