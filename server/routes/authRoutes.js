const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");
const {
  register,
  login,
  getProfile,
  updateProfile,
  getAdminRequests,
  approveAdmin,
  rejectAdmin,
} = require("../controllers/authController");
const { protect, managerOnly } = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// Change password while logged in (User, Admin, or Manager)
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }
    const user = await User.findById(req.user._id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot Password (verify Email + Phone or Username)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, verificationKey, newPassword } = req.body;
    if (!email || !verificationKey || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: "Provide your email, registered phone or username, and a 6+ char new password.",
      });
    }
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "No account found with that email." });
    }

    const key = String(verificationKey).trim().toLowerCase();
    const matchesPhone = user.phone && String(user.phone).trim().toLowerCase() === key;
    const matchesUsername = user.username && String(user.username).trim().toLowerCase() === key;

    if (!matchesPhone && !matchesUsername) {
      return res.status(400).json({
        message: "Verification failed. Enter the exact phone number or username on your account.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password reset successful! You can now log in with your new password." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Recover Forgotten Email ID using Phone or Username
router.post("/recover-email", async (req, res) => {
  try {
    const { query } = req.body;
    const val = String(query || "").trim();
    if (!val) {
      return res.status(400).json({ message: "Enter your registered phone number or username." });
    }
    const user = await User.findOne({
      $or: [
        { phone: val },
        { username: { $regex: `^${val.replace(/[.*+?^${}()\vert{}[\]\\]/g, "\\$&")}$`, $options: "i" } },
      ],
    });
    if (!user) {
      return res.status(404).json({ message: "No matching account found." });
    }
    res.json({
      email: user.email,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Super Manager routes
router.get("/admin-requests", protect, managerOnly, getAdminRequests);
router.patch("/admin-requests/:id/approve", protect, managerOnly, approveAdmin);
router.patch("/admin-requests/:id/reject", protect, managerOnly, rejectAdmin);

module.exports = router;