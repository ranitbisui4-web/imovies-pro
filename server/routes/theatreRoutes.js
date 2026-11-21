const express = require("express");
const router = express.Router();
const { getTheatres, addTheatre, deleteTheatre } = require("../controllers/theatreController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/", getTheatres);
router.post("/", protect, adminOnly, addTheatre);
router.delete("/:id", protect, adminOnly, deleteTheatre);

module.exports = router;
