const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Notification = require("../models/Notification");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, isApproved: user.isApproved, email: user.email },
    process.env.JWT_SECRET || "imovies_fallback_secret",
    { expiresIn: "7d" }
  );

const formatUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isApproved: user.isApproved,
  theatreRequestName: user.theatreRequestName,
});

exports.register = async (req, res) => {
  try {
    const { username, email, password, phone, role, theatreRequestName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const requestedRole = role === "admin" ? "admin" : "user";
    if (requestedRole === "admin" && !String(theatreRequestName || "").trim()) {
      return res.status(400).json({ message: "Theatre name is required when applying as Admin." });
    }

    const isApproved = requestedRole === "user";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || "",
      role: requestedRole,
      isApproved,
      theatreRequestName: requestedRole === "admin" ? theatreRequestName.trim() : "",
    });

    if (requestedRole === "admin") {
      await Notification.create({
        recipientRole: "manager",
        recipientUser: null,
        type: "pending_admin",
        title: "New Admin Request",
        message: `${username} (${email.toLowerCase()}) applied for Admin (${theatreRequestName.trim()}).`,
      });
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      user: formatUser(user),
      pendingApproval: !isApproved,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password || "", user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = signToken(user);
    res.json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential, requestAdmin, theatreRequestName } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential token is required" });
    }

    const audience = process.env.GOOGLE_CLIENT_ID;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      ...(audience ? { audience } : {}),
    });
    const payload = ticket.getPayload();

    if (!payload?.email || payload.email_verified === false) {
      return res.status(401).json({ message: "Google email is not verified" });
    }

    const cleanEmail = String(payload.email).trim().toLowerCase();
    const googleId = String(payload.sub || "");
    const displayName = String(payload.name || cleanEmail.split("@")[0] || "Cinema User").trim();

    let user = await User.findOne({ $or: [{ googleId }, { email: cleanEmail }] });

    if (!user) {
      const wantsAdmin = Boolean(requestAdmin);
      const cleanTheatre = String(theatreRequestName || "").trim();
      if (wantsAdmin && !cleanTheatre) {
        return res.status(400).json({ message: "Theatre name is required when applying as Admin." });
      }

      const randomHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
      const isApproved = !wantsAdmin;

      user = await User.create({
        username: displayName,
        email: cleanEmail,
        password: randomHash,
        googleId,
        authProvider: "google",
        phone: "",
        role: wantsAdmin ? "admin" : "user",
        isApproved,
        theatreRequestName: wantsAdmin ? cleanTheatre : "",
      });

      if (wantsAdmin) {
        await Notification.create({
          recipientRole: "manager",
          recipientUser: null,
          type: "pending_admin",
          title: "New Admin Request",
          message: `${displayName} (${cleanEmail}) applied for Admin (${cleanTheatre}).`,
        });
      }
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = "google";
      await user.save();
    }

    const token = signToken(user);
    res.json({
      token,
      user: formatUser(user),
      pendingApproval: !user.isApproved,
    });
  } catch (err) {
    res.status(401).json({ message: err.message || "Google sign-in failed" });
  }
};

exports.getProfile = async (req, res) => {
  res.json({ user: formatUser(req.user) });
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { ...(username && { username }), ...(phone !== undefined && { phone }) },
      { new: true }
    ).select("-password");
    res.json({ user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ONLY unapproved admin applicants appear in Pending Admin Requests
exports.getAdminRequests = async (req, res) => {
  try {
    const pendingAdmins = await User.find({ role: "admin", isApproved: false })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(pendingAdmins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveAdmin = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "admin", isApproved: true },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "Admin applicant not found" });

    await Notification.create({
      recipientRole: "admin",
      recipientUser: user._id,
      type: "admin_approved",
      title: "Admin Request Approved",
      message: `Your Admin account${
        user.theatreRequestName ? ` for ${user.theatreRequestName}` : ""
      } has been approved by the Manager.`,
    });

    res.json({ message: `${user.username} approved and moved to Active Admins.`, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rejectAdmin = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "user", isApproved: true, theatreRequestName: "" },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    await Notification.create({
      recipientRole: "admin",
      recipientUser: user._id,
      type: "admin_removed",
      title: "Admin Request Declined",
      message: "Your Admin request was declined by the Manager.",
    });

    res.json({ message: `Request rejected and cleared.`, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};