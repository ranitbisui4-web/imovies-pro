const express = require("express");
const router = express.Router();
const {
  getMovies,
  getMovieById,
  addMovie,
  updateMovie,
  deleteMovie,
} = require("../controllers/movieController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/", getMovies);
router.get("/:id", getMovieById);
router.post("/", protect, adminOnly, addMovie);
router.put("/:id", protect, adminOnly, updateMovie);
router.delete("/:id", protect, adminOnly, deleteMovie);

module.exports = router;