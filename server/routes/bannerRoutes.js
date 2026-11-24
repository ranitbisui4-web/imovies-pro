const express = require("express");
const router = express.Router();
const Banner = require("../models/Banner");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/", async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .populate("movie", "movieName posterUrl rating language certification")
      .sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const banner = await Banner.create(req.body);
    const populated = await Banner.findById(banner._id).populate("movie");
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;