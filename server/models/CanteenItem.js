const mongoose = require("mongoose");

const canteenItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Snacks", trim: true },
    price: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, default: "" },
    isPopcornBucketReward: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CanteenItem", canteenItemSchema);