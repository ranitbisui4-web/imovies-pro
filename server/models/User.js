const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: "" },
    googleId: { type: String, default: "", index: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    phone: { type: String, default: "", trim: true },
    photoUrl: { type: String, default: "", trim: true },
    govtId: { type: String, default: "", trim: true },
    role: { type: String, enum: ["user", "admin", "manager"], default: "user" },
    isApproved: { type: Boolean, default: true },
    theatreName: { type: String, default: "" },
    theatreRequestName: { type: String, default: "" },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);