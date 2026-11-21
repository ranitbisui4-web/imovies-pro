const Favorite = require("../models/Favorite");

exports.getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id }).populate("movie");
    res.json(favorites.map((f) => f.movie).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const existing = await Favorite.findOne({ user: req.user._id, movie: movieId });
    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      return res.json({ favorited: false });
    }
    await Favorite.create({ user: req.user._id, movie: movieId });
    res.json({ favorited: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
