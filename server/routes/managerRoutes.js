const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Theatre = require("../models/Theatre");
const City = require("../models/City");
const Notification = require("../models/Notification");
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
        .map((t) => `${t.theatreName} (${t.city || t.location})`);
      return {
        ...obj,
        theatreName:
          matchedTheatres.length > 0
            ? matchedTheatres.join(", ")
            : obj.theatreRequestName || "-",
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
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) return res.status(404).json({ message: "User not found" });

    const updatePayload =
      role === "user"
        ? { role: "user", isApproved: true, theatreRequestName: "" }
        : { role: "admin", isApproved: true };

    const updated = await User.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
    }).select("-password");

    if (existingUser.role === "admin" && role === "user") {
      await Notification.create({
        recipientRole: "admin",
        recipientUser: updated._id,
        type: "admin_removed",
        title: "Admin Access Removed",
        message:
          "Your Admin privileges were removed by the Manager. Re-approval by the Manager is required for Admin access.",
      });
    } else if (role === "admin") {
      await Notification.create({
        recipientRole: "admin",
        recipientUser: updated._id,
        type: "admin_approved",
        title: "Granted Admin Access",
        message: "The Manager has approved you as a Theatre Admin.",
      });
    }

    res.json({
      message:
        role === "user"
          ? `Removed ${updated.username} from Admins completely.`
          : `Promoted ${updated.username} to Approved Admin.`,
      user: updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager-managed City List
router.get("/cities", async (req, res) => {
  try {
    const cities = await City.find({ isActive: true }).sort({ name: 1 });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/cities", protect, managerOnly, async (req, res) => {
  try {
    const { name, state } = req.body;
    if (!String(name || "").trim()) {
      return res.status(400).json({ message: "City name is required." });
    }
    const city = await City.create({
      name: name.trim(),
      state: String(state || "").trim(),
    });
    res.status(201).json(city);
  } catch (err) {
    res.status(400).json({ message: err.code === 11000 ? "City already exists" : err.message });
  }
});

router.delete("/cities/:id", protect, managerOnly, async (req, res) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.json({ message: "City removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;