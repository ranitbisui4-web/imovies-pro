const Review = require("../models/Review");

exports.getMovieReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ movie: req.params.movieId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { movieId, rating, comment } = req.body;
    const review = await Review.create({
      user: req.user._id,
      username: req.user.username,
      movie: movieId,
      rating: Number(rating),
      comment,
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }
    await Review.deleteOne({ _id: review._id });
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
