const Theatre = require("../models/Theatre");

exports.getTheatres = async (req, res) => {
  try {
    const theatres = await Theatre.find().sort({ createdAt: -1 });
    res.json(theatres);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.create(req.body);
    res.status(201).json(theatre);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteTheatre = async (req, res) => {
  try {
    await Theatre.findByIdAndDelete(req.params.id);
    res.json({ message: "Theatre deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
