const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Theatre = require("../models/Theatre");
const { protect, managerOnly } = require("../middlewares/authMiddleware");
const { getAdminRequests, approveAdmin, rejectAdmin } = require("../controllers/authController");

router.get("/requests", protect, managerOnly, getAdminRequests);

router.get("/users", protect, managerOnly, async (req, res) => {
  try {
    const [users, theatres] = await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }),
      Theatre.find().lean(),
    ]);

    const enriched = users.map((u) => {
      const obj = u.toObject();
      const matchedTheatres = theatres
        .filter((t) => String(t.createdBy || "") === String(u._id))
        .map((t) => t.theatreName);
      return {
        ...obj,
        theatreName: obj.theatreRequestName || matchedTheatres.join(", ") || "—",
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/requests/:id/approve", protect, managerOnly, approveAdmin);
router.patch("/requests/:id/reject", protect, managerOnly, rejectAdmin);

router.patch("/users/:id/role", protect, managerOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin", "manager"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        role,
        isApproved: role === "admin" ? true : role === "manager" ? true : false,
      },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({
      message:
        role === "user"
          ? `Removed Admin access for ${updated.username}`
          : `Updated ${updated.username} to ${role}`,
      user: updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;