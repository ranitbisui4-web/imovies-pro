const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const roleFilter =
      req.user.role === "manager"
        ? [{ recipientRole: "manager" }]
        : req.user.role === "admin"
        ? [
            { recipientRole: "admin", recipientUser: req.user._id },
            { recipientRole: "admin", recipientUser: null },
          ]
        : [
            { recipientRole: "user", recipientUser: null },
            { recipientRole: "user", recipientUser: req.user._id },
          ];

    const items = await Notification.find({ $or: roleFilter })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const formatted = items.map((n) => {
      const read =
        Boolean(n.isRead) ||
        (Array.isArray(n.readBy) && n.readBy.some((id) => String(id) === String(req.user._id)));
      return { ...n, read };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/read", protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: req.user._id },
      $set: { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/read-all", protect, async (req, res) => {
  try {
    const roleFilter =
      req.user.role === "manager"
        ? [{ recipientRole: "manager" }]
        : req.user.role === "admin"
        ? [
            { recipientRole: "admin", recipientUser: req.user._id },
            { recipientRole: "admin", recipientUser: null },
          ]
        : [
            { recipientRole: "user", recipientUser: null },
            { recipientRole: "user", recipientUser: req.user._id },
          ];

    await Notification.updateMany(
      { $or: roleFilter },
      { $addToSet: { readBy: req.user._id }, $set: { isRead: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;