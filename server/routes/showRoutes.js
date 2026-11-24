const express = require("express");
const router = express.Router();
const {
  getAllShows,
  getShowsByMovie,
  getShowById,
  addShow,
  deleteShow,
  applyShowDelay,
} = require("../controllers/showController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/", getAllShows);
router.get("/movie/:movieId", getShowsByMovie);
router.get("/:id", getShowById);
router.post("/", protect, adminOnly, addShow);
router.post("/:id/delay", protect, adminOnly, applyShowDelay);
router.delete("/:id", protect, adminOnly, deleteShow);

module.exports = router;