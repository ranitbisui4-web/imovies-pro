const mongoose = require("mongoose");

const canteenItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Snacks", trim: true },
    price: { type: Number, required: true, min: 1 },
    description: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    isPopcornBucketReward: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CanteenItem", canteenItemSchema);