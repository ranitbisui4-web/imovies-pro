const nodemailer = require("nodemailer");

const sendBookingEmail = async (toEmail, booking) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { skipped: true, reason: "SMTP credentials not configured in .env" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; background:#0f172a; color:#f8fafc; padding:24px; border-radius:12px;">
      <h2 style="color:#ef4444;">iMovies Pro — Booking Confirmed</h2>
      <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
      <p><strong>Movie:</strong> ${booking.movieTitle}</p>
      <p><strong>Theatre:</strong> ${booking.theatreName} (${booking.theatreLocation})</p>
      <p><strong>Date & Time:</strong> ${booking.showdate} at ${booking.showtime}</p>
      <p><strong>Seats:</strong> ${booking.seats.join(", ")}</p>
      <p><strong>Total Paid:</strong> ₹${booking.totalPrice} (${booking.paymentMethod})</p>
      <p style="color:#94a3b8; font-size:12px;">Show your QR e-ticket from My Bookings at the cinema entrance.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"iMovies Pro" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Ticket Confirmed: ${booking.movieTitle} (${booking.bookingId})`,
    html,
  });

  return { sent: true };
};

module.exports = { sendBookingEmail };
