const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    movieName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    genres: { type: [String], required: true },
    language: { type: String, default: "Telugu / Hindi / English" },
    releaseDate: { type: Date, required: true },
    runtime: { type: Number, required: true }, // minutes
    certification: { type: String, default: "U/A" },
    rating: { type: Number, default: 8.5, min: 0, max: 10 },
    posterUrl: { type: String, required: true },
    bannerUrl: { type: String, default: "" },
    trailerUrl: { type: String, default: "" },
    cast: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);
