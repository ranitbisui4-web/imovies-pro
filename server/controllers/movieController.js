const Movie = require("../models/Movie");
const Notification = require("../models/Notification");

exports.getMovies = async (req, res) => {
  try {
    const { search, genre, language } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { movieName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { genres: { $regex: search, $options: "i" } },
      ];
    }
    if (genre && genre !== "All") {
      filter.genres = { $regex: genre, $options: "i" };
    }
    if (language && language !== "All") {
      filter.language = { $regex: language, $options: "i" };
    }
    const movies = await Movie.find(filter).sort({ createdAt: -1 });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addMovie = async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.genres === "string") {
      body.genres = body.genres.split(",").map((g) => g.trim()).filter(Boolean);
    }
    if (typeof body.cast === "string") {
      body.cast = body.cast.split(",").map((c) => c.trim()).filter(Boolean);
    }
    const movie = await Movie.create(body);

    await Notification.create({
      recipientRole: "user",
      recipientUser: null,
      type: "new_movie",
      title: "New Movie Arrived",
      message: `${movie.movieName} is now available to browse and book shows.`,
    });

    res.status(201).json(movie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateMovie = async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.genres === "string") {
      body.genres = body.genres.split(",").map((g) => g.trim()).filter(Boolean);
    }
    if (typeof body.cast === "string") {
      body.cast = body.cast.split(",").map((c) => c.trim()).filter(Boolean);
    }
    const movie = await Movie.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    res.json(movie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteMovie = async (req, res) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: "Movie deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};