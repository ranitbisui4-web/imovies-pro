const Theatre = require("../models/Theatre");

const getTheatres = async (req, res) => {
  try {
    const { city } = req.query;
    const filter =
      city && city !== "All" ? { city: { $regex: `^${String(city).trim()}$`, $options: "i" } } : {};
    const theatres = await Theatre.find(filter).sort({ createdAt: -1 });
    res.json(theatres);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addTheatre = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user?._id || null,
    };
    if (!String(payload.city || "").trim()) {
      return res.status(400).json({ message: "Please select a city from the Manager city list." });
    }
    const theatre = await Theatre.create(payload);
    res.status(201).json(theatre);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!theatre) return res.status(404).json({ message: "Theatre not found" });
    res.json(theatre);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteTheatre = async (req, res) => {
  try {
    await Theatre.findByIdAndDelete(req.params.id);
    res.json({ message: "Theatre deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTheatres,
  addTheatre,
  updateTheatre,
  deleteTheatre,
};