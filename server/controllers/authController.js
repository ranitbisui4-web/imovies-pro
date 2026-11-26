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
  theatreName: user.theatreName || user.theatreRequestName || "",
  theatreRequestName: user.theatreRequestName || "",
});

exports.register = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || "",
      role: "user",
      isApproved: true,
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: formatUser(user),
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
    const { credential } = req.body;
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
      const randomHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

      user = await User.create({
        username: displayName,
        email: cleanEmail,
        password: randomHash,
        googleId,
        authProvider: "google",
        phone: "",
        role: "user",
        isApproved: true,
      });
    } else {
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        updated = true;
      }
      if (user.username === cleanEmail.split("@")[0] && displayName) {
        user.username = displayName;
        updated = true;
      }
      if (updated) await user.save();
    }

    const token = signToken(user);
    res.json({
      token,
      user: formatUser(user),
    });
  } catch (err) {
    res.status(401).json({ message: err.message || "Google sign-in failed" });
  }
};

// Head Manager assigns a role ("admin", "manager", or "user") to any Gmail address
exports.assignRoleByEmail = async (req, res) => {
  try {
    const { email, role, theatreName = "" } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    const validRoles = ["user", "admin", "manager"];

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ message: "Please enter a valid Gmail / email address." });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Role must be user, admin, or manager." });
    }
    if (req.user.email === cleanEmail && role !== "manager") {
      return res.status(400).json({ message: "You cannot downgrade your own Head Manager account." });
    }

    const cleanTheatre = String(theatreName || "").trim();
    let user = await User.findOne({ email: cleanEmail });

    if (user) {
      user.role = role;
      user.isApproved = true;
      if (role === "admin") {
        user.theatreName = cleanTheatre || user.theatreName || "Partner Cinema";
        user.theatreRequestName = user.theatreName;
      } else {
        user.theatreName = "";
        user.theatreRequestName = "";
      }
      await user.save();
    } else {
      const randomHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
      user = await User.create({
        username: cleanEmail.split("@")[0],
        email: cleanEmail,
        password: randomHash,
        authProvider: "google",
        role,
        isApproved: true,
        theatreName: role === "admin" ? cleanTheatre || "Partner Cinema" : "",
        theatreRequestName: role === "admin" ? cleanTheatre || "Partner Cinema" : "",
      });
    }

    if (role === "admin" || role === "manager") {
      await Notification.create({
        recipientRole: role,
        recipientUser: user._id,
        type: "admin_approved",
        title: `Assigned as ${role === "manager" ? "Head Manager" : "Theatre Admin"}`,
        message: `You have been granted ${role.toUpperCase()} access${
          user.theatreName ? ` for ${user.theatreName}` : ""
        }.`,
      });
    }

    res.json({
      message: `${cleanEmail} is now set as ${role.toUpperCase()}${
        user.theatreName ? ` (${user.theatreName})` : ""
      }.`,
      user: formatUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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