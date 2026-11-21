const Show = require("../models/Show");

const pruneExpiredLocks = async (show) => {
  const now = new Date();
  const activeLocks = (show.lockedSeats || []).filter((l) => new Date(l.expiresAt) > now);
  if (activeLocks.length !== (show.lockedSeats || []).length) {
    show.lockedSeats = activeLocks;
    await show.save();
  }
  return show;
};

exports.getAllShows = async (req, res) => {
  try {
    const shows = await Show.find()
      .populate("movie")
      .populate("theatre")
      .sort({ showdate: 1, showtime: 1 });
    res.json(shows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getShowsByMovie = async (req, res) => {
  try {
    const shows = await Show.find({ movie: req.params.movieId })
      .populate("movie")
      .populate("theatre")
      .sort({ showdate: 1, showtime: 1 });
    res.json(shows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getShowById = async (req, res) => {
  try {
    let show = await Show.findById(req.params.id).populate("movie").populate("theatre");
    if (!show) return res.status(404).json({ message: "Show not found" });
    show = await pruneExpiredLocks(show);
    res.json(show);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addShow = async (req, res) => {
  try {
    const show = await Show.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    const populated = await Show.findById(show._id).populate("movie").populate("theatre");
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteShow = async (req, res) => {
  try {
    await Show.findByIdAndDelete(req.params.id);
    res.json({ message: "Show deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
