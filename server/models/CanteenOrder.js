const mongoose = require("mongoose");

const canteenOrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    items: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "CanteenItem" },
        name: String,
        price: Number,
        qty: { type: Number, default: 1 },
      },
    ],
    itemsSubtotal: { type: Number, required: true },
    loyaltyDiscount36: { type: Number, default: 0 },
    popcornBucketIncluded: { type: String, default: "" },
    paymentMode: { type: String, enum: ["ONLINE", "CASH"], required: true },
    handlingFee: { type: Number, default: 0 }, // ₹13 for CASH, ₹0 for ONLINE
    finalAmount: { type: Number, required: true },
    status: { type: String, default: "PREPARING" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CanteenOrder", canteenOrderSchema);