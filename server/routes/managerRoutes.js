const express = require("express");
const router = express.Router();
const User = require("../models/User");
const City = require("../models/City");
const Notification = require("../models/Notification");
const { protect, managerOnly } = require("../middlewares/authMiddleware");

// Public or Admin: list official cities for dropdowns
router.get("/cities", async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager-only: add a city
router.post("/cities", protect, managerOnly, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const state = String(req.body.state || "").trim();
    if (!name) return res.status(400).json({ message: "City name is required." });

    const exists = await City.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (exists) return res.status(400).json({ message: "City already exists." });

    const city = await City.create({ name, state });
    res.status(201).json(city);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager-only: delete a city
router.delete("/cities/:id", protect, managerOnly, async (req, res) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.json({ message: "City deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager-only: list all users (Managers, Admins, and Customers)
router.get("/users", protect, managerOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager-only: pending admin requests
router.get("/requests", protect, managerOnly, async (req, res) => {
  try {
    const pending = await User.find({ role: "admin", isApproved: false })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager-only: approve pending admin
router.patch("/requests/:id/approve", protect, managerOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "admin", isApproved: true },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "Applicant not found." });

    await Notification.create({
      recipientRole: "admin",
      recipientUser: user._id,
      type: "admin_approved",
      title: "Admin Request Approved",
      message: "Your Theatre Admin access has been approved by the Head Manager.",
    });

    res.json({ message: `${user.username} approved as Theatre Admin.`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager-only: reject pending admin
router.patch("/requests/:id/reject", protect, managerOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "user", isApproved: true, theatreRequestName: "" },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({ message: "Request declined.", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager-only: change or remove a Manager or Admin role
router.patch("/users/:id/role", protect, managerOnly, async (req, res) => {
  try {
    const { role, theatreName } = req.body;
    if (!["user", "admin", "manager"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }
    if (String(req.user._id) === String(req.params.id) && role !== "manager") {
      return res.status(400).json({ message: "You cannot remove your own Head Manager role." });
    }

    const update = {
      role,
      isApproved: true,
    };
    if (role === "user") {
      update.theatreName = "";
      update.theatreRequestName = "";
    } else if (role === "admin" && theatreName) {
      update.theatreName = String(theatreName).trim();
    }

    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select(
      "-password"
    );
    if (!updated) return res.status(404).json({ message: "User not found." });

    res.json({
      message: `${updated.username}'s role is now ${role.toUpperCase()}.`,
      user: updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;