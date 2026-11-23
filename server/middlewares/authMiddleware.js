const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) {
      return res.status(401).json({ message: "Not authorized, please log in" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "imovies_fallback_secret");
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }
  if (req.user.role === "manager") {
    return next();
  }
  if (req.user.role === "admin") {
    if (!req.user.isApproved) {
      return res.status(403).json({
        message: "Your Admin account is awaiting Manager approval.",
      });
    }
    return next();
  }
  return res.status(403).json({ message: "Approved Admin or Manager access required" });
};

const managerOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ message: "Super Manager access required" });
  }
  next();
};

module.exports = { protect, adminOnly, managerOnly };