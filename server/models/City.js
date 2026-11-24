const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    state: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("City", citySchema);