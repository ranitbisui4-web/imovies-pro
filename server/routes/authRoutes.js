const express = require("express");
const router = express.Router();
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

// Super Manager routes
router.get("/admin-requests", protect, managerOnly, getAdminRequests);
router.patch("/admin-requests/:id/approve", protect, managerOnly, approveAdmin);
router.patch("/admin-requests/:id/reject", protect, managerOnly, rejectAdmin);

module.exports = router;