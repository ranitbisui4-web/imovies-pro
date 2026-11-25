require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const Show = require("./models/Show");

const authRoutes = require("./routes/authRoutes");
const managerRoutes = require("./routes/managerRoutes");
const movieRoutes = require("./routes/movieRoutes");
const theatreRoutes = require("./routes/theatreRoutes");
const showRoutes = require("./routes/showRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const aiRoutes = require("./routes/aiRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const canteenRoutes = require("./routes/canteenRoutes");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

app.set("io", io);

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Routes
app.get("/api/health", (req, res) => res.json({ status: "ok", app: "iMovies Pro API" }));
app.use("/api/auth", authRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/canteen", canteenRoutes);

// Real-Time Socket.io Seat Locking
io.on("connection", (socket) => {
  socket.on("join_show", (showId) => {
    socket.join(`show:${showId}`);
  });

  socket.on("leave_show", (showId) => {
    socket.leave(`show:${showId}`);
  });

  socket.on("lock_seats", async ({ showId, seats, userId }) => {
    try {
      const show = await Show.findById(showId);
      if (!show) return;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

      let activeLocks = (show.lockedSeats || []).filter(
        (l) => new Date(l.expiresAt) > now && l.userId !== userId
      );

      for (const seatId of seats || []) {
        const takenByOther =
          activeLocks.some((l) => l.seatId === seatId) || show.bookedSeats.includes(seatId);
        if (!takenByOther) {
          activeLocks.push({ seatId, userId, expiresAt });
        }
      }

      show.lockedSeats = activeLocks;
      await show.save();

      io.to(`show:${showId}`).emit("seats_updated", {
        showId,
        bookedSeats: show.bookedSeats,
        lockedSeats: show.lockedSeats,
      });
    } catch (err) {
      console.error("Socket lock_seats error:", err.message);
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`iMovies Pro Server running on http://localhost:${PORT}`);
  });
});