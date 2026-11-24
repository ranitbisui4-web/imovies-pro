const Show = require("../models/Show");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");

const parseMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

const formatMinutes = (totalMins) => {
  const wrapped = ((Math.round(totalMins) % 1440) + 1440) % 1440;
  const h = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const m = String(wrapped % 60).padStart(2, "0");
  return `${h}:${m}`;
};

const enrichShowTimeline = (showDoc) => {
  const obj = typeof showDoc.toObject === "function" ? showDoc.toObject() : { ...showDoc };
  const runtime = Number(obj.movie?.runtime) || 150;
  const delay = Number(obj.delayMinutes) || 0;
  const breakMins = Number(obj.breakDurationMinutes) ?? 20;

  const baseStart = parseMinutes(obj.showtime);
  const actualStart = baseStart + delay;
  const firstHalfEnd = actualStart + Math.floor(runtime / 2);
  const breakEnd = firstHalfEnd + breakMins;
  const estimatedEnd = actualStart + runtime + breakMins;

  return {
    ...obj,
    effectiveStartTime: formatMinutes(actualStart),
    breakStartTime: formatMinutes(firstHalfEnd),
    breakEndTime: formatMinutes(breakEnd),
    estimatedEndTime: formatMinutes(estimatedEnd),
  };
};

exports.getAllShows = async (req, res) => {
  try {
    const shows = await Show.find()
      .populate("movie")
      .populate("theatre")
      .sort({ showdate: 1, showtime: 1 });
    res.json(shows.map(enrichShowTimeline));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getShowsByMovie = async (req, res) => {
  try {
    const shows = await Show.find({ movie: req.params.movieId })
      .populate("movie")
      .populate("theatre")
      .sort({ showdate: 1, showtime: 1 });
    res.json(shows.map(enrichShowTimeline));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getShowById = async (req, res) => {
  try {
    const show = await Show.findById(req.params.id).populate("movie").populate("theatre");
    if (!show) return res.status(404).json({ message: "Show not found" });
    res.json(enrichShowTimeline(show));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addShow = async (req, res) => {
  try {
    const show = await Show.create({
      ...req.body,
      createdBy: req.user?._id || null,
    });
    const populated = await Show.findById(show._id).populate("movie").populate("theatre");
    res.status(201).json(enrichShowTimeline(populated));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteShow = async (req, res) => {
  try {
    await Show.findByIdAndDelete(req.params.id);
    res.json({ message: "Show deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Smart Delay & Break-Time Auto-Recovery for a screen/date
exports.applyShowDelay = async (req, res) => {
  try {
    const delayMins = Math.max(0, Number(req.body.delayMinutes) || 0);
    const reason = String(req.body.reason || "Operational/technical adjustment").trim();

    const targetShow = await Show.findById(req.params.id).populate("movie").populate("theatre");
    if (!targetShow) return res.status(404).json({ message: "Show not found" });

    targetShow.delayMinutes = delayMins;
    targetShow.delayReason = reason;
    // Trim break time on the delayed show up to half (min 5 mins) to recover schedule
    const originalBreak = targetShow.breakDurationMinutes ?? 20;
    const recoveredBreak = Math.max(5, originalBreak - Math.ceil(delayMins / 2));
    targetShow.breakDurationMinutes = recoveredBreak;
    await targetShow.save();

    const affectedShowIds = [targetShow._id];
    let remainingSlip = Math.max(0, delayMins - (originalBreak - recoveredBreak));

    // Find later shows on the same theatre, screen, and date
    const allSameScreenShows = await Show.find({
      theatre: targetShow.theatre._id,
      screenName: targetShow.screenName,
      showdate: targetShow.showdate,
    }).populate("movie");

    const targetStartMins = parseMinutes(targetShow.showtime);
    const laterShows = allSameScreenShows
      .filter((s) => String(s._id) !== String(targetShow._id) && parseMinutes(s.showtime) > targetStartMins)
      .sort((a, b) => parseMinutes(a.showtime) - parseMinutes(b.showtime));

    for (const nextShow of laterShows) {
      if (remainingSlip <= 0) break;
      const nextBreak = nextShow.breakDurationMinutes ?? 20;
      const breakTrim = Math.min(remainingSlip, Math.max(0, nextBreak - 5));
      const adjustedBreak = nextBreak - breakTrim;
      const netShift = Math.max(0, remainingSlip - breakTrim);

      nextShow.breakDurationMinutes = adjustedBreak;
      nextShow.delayMinutes = netShift;
      nextShow.delayReason = `Adjusted after ${targetShow.movie?.movieName || "earlier show"} delay (${reason})`;
      await nextShow.save();

      affectedShowIds.push(nextShow._id);
      remainingSlip = netShift;
    }

    // Notify ONLY customers who booked seats on affected shows
    const affectedBookings = await Booking.find({
      show: { $in: affectedShowIds },
      status: "CONFIRMED",
    }).lean();

    const uniqueUserIds = Array.from(
      new Set(affectedBookings.map((b) => String(b.user)).filter(Boolean))
    );

    if (uniqueUserIds.length > 0) {
      const notifDocs = uniqueUserIds.map((userId) => ({
        recipientRole: "user",
        recipientUser: userId,
        type: "new_movie",
        title: `Show Time Adjusted: ${targetShow.movie?.movieName || "Movie"}`,
        message: `${targetShow.theatre?.theatreName || "Theatre"} (${targetShow.screenName}) adjusted by +${delayMins}m (${reason}). Break buffers were tightened to minimize delay.`,
      }));
      await Notification.insertMany(notifDocs);
    }

    const updatedShows = await Show.find({ _id: { $in: affectedShowIds } })
      .populate("movie")
      .populate("theatre");

    res.json({
      message: `Delay applied (+${delayMins}m). Break buffers auto-adjusted; ${uniqueUserIds.length} affected ticket holder(s) notified.`,
      affectedShows: updatedShows.map(enrichShowTimeline),
      notifiedUsersCount: uniqueUserIds.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};