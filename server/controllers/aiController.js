const Movie = require("../models/Movie");
const Show = require("../models/Show");

// Helper: pick available seats for a show given desired tier & count
const pickAvailableSeats = (show, count = 2, tier = "B") => {
  const booked = new Set(show.bookedSeats || []);
  const now = new Date();
  const locked = new Set(
    (show.lockedSeats || [])
      .filter((l) => new Date(l.expiresAt) > now)
      .map((l) => l.seatId)
  );

  const counts = {
    B: show.theatre?.balconySeatCount || 20,
    M: show.theatre?.middleSeatCount || 30,
    L: show.theatre?.lowerSeatCount || 20,
  };

  const order = tier === "B" ? ["B", "M", "L"] : tier === "M" ? ["M", "B", "L"] : ["L", "M", "B"];
  const picked = [];

  for (const prefix of order) {
    for (let i = 1; i <= counts[prefix]; i++) {
      const seatId = `${prefix}${i}`;
      if (!booked.has(seatId) && !locked.has(seatId)) {
        picked.push(seatId);
        if (picked.length === count) return picked;
      }
    }
  }
  return picked;
};

// Local smart intent parser (always works even without GEMINI_API_KEY)
const runFallbackAssistant = (message, movies, shows) => {
  const text = message.toLowerCase().trim();

  if (/\b(go back|previous page|back)\b/.test(text)) {
    return {
      reply: "Going back to the previous screen.",
      action: { type: "GO_BACK" },
    };
  }
  if (/\b(go home|home page|main page|all movies|reset filter)\b/.test(text)) {
    return {
      reply: "Taking you to the Home catalog.",
      action: { type: "NAVIGATE", route: "/", payload: { clearFilters: true } },
    };
  }
  if (/\b(my booking|bookings|tickets|my ticket)\b/.test(text)) {
    return {
      reply: "Opening your Bookings & QR E-Tickets.",
      action: { type: "NAVIGATE", route: "/bookings" },
    };
  }
  if (/\b(favorite|favourites|watchlist|saved)\b/.test(text)) {
    return {
      reply: "Opening your Watchlist & Favorites.",
      action: { type: "NAVIGATE", route: "/favorites" },
    };
  }
  if (/\b(admin|dashboard)\b/.test(text)) {
    return {
      reply: "Navigating to the Admin Dashboard.",
      action: { type: "NAVIGATE", route: "/admin" },
    };
  }

  // Genre filter
  const knownGenres = ["action", "thriller", "drama", "comedy", "horror", "sci-fi", "fantasy", "historical", "romantic", "adventure"];
  const matchedGenre = knownGenres.find((g) => text.includes(g));
  const matchedMovie = movies.find((m) => text.includes(m.movieName.toLowerCase()));

  // Booking intent
  if (/\b(book|seat|ticket|reserve|select)\b/.test(text) && matchedMovie) {
    const movieShows = shows.filter((s) => s.movie && s.movie._id.toString() === matchedMovie._id.toString());
    if (movieShows.length === 0) {
      return {
        reply: `I found "${matchedMovie.movieName}", but there are no scheduled shows yet. Opening movie details instead.`,
        action: { type: "NAVIGATE", route: `/movie/${matchedMovie._id}` },
      };
    }

    const chosenShow = movieShows[0];
    const countMatch = text.match(/\b([1-6])\b/);
    const seatCount = countMatch ? Number(countMatch[1]) : 2;
    const tier = text.includes("balcony") ? "B" : text.includes("lower") ? "L" : "M";
    const seats = pickAvailableSeats(chosenShow, seatCount, tier);
    const tierLabel = tier === "B" ? "Balcony" : tier === "L" ? "Lower" : "Middle";

    return {
      reply: `Done! Opened ${matchedMovie.movieName} at ${chosenShow.theatre.theatreName} (${chosenShow.showdate} • ${chosenShow.showtime}) and pre-selected ${seats.length} ${tierLabel} seat(s): ${seats.join(", ")}. Review and click Pay to confirm!`,
      action: {
        type: "AUTO_SELECT_SEATS",
        route: `/seats/${chosenShow._id}`,
        payload: {
          showId: chosenShow._id.toString(),
          seats,
          openCheckout: /\b(pay|checkout|confirm now)\b/.test(text),
        },
      },
    };
  }

  // Movie open intent
  if (matchedMovie) {
    if (/\b(show|timing|showtime|theatre|theater)\b/.test(text)) {
      return {
        reply: `Showing live showtimes for ${matchedMovie.movieName}.`,
        action: { type: "NAVIGATE", route: `/shows/${matchedMovie._id}` },
      };
    }
    return {
      reply: `Opening ${matchedMovie.movieName} (${matchedMovie.genres.join(", ")}) — Rated ${matchedMovie.rating}/10.`,
      action: { type: "NAVIGATE", route: `/movie/${matchedMovie._id}` },
    };
  }

  // Filter by genre
  if (matchedGenre) {
    const label = matchedGenre.charAt(0).toUpperCase() + matchedGenre.slice(1);
    const count = movies.filter((m) =>
      m.genres.some((g) => g.toLowerCase().includes(matchedGenre))
    ).length;
    return {
      reply: `Filtered the Home screen to show ${label} movies (${count} found).`,
      action: { type: "FILTER_MOVIES", route: "/", payload: { genre: label, search: "" } },
    };
  }

  // Generic movie recommendations
  const topMovies = movies.slice(0, 3).map((m) => `${m.movieName} (${m.rating}★)`).join(", ");
  return {
    reply: `I can help you explore movies, control the screen, or book seats! Trending now: ${topMovies}. Try saying "Book 2 balcony seats for OG", "Show action movies", or "Go to my bookings".`,
    action: { type: "NONE" },
  };
};

exports.handleAICommand = async (req, res) => {
  try {
    const { message, currentPath = "/" } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const [movies, shows] = await Promise.all([
      Movie.find().lean(),
      Show.find().populate("movie").populate("theatre").lean(),
    ]);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      const result = runFallbackAssistant(message, movies, shows);
      return res.json({ ...result, engine: "local-smart-controller" });
    }

    // Use Gemini API with structured JSON output
    try {
      const { GoogleGenAI } = require("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const catalogContext = movies.map((m) => ({
        id: m._id.toString(),
        title: m.movieName,
        genres: m.genres,
        language: m.language,
        rating: m.rating,
      }));

      const showContext = shows.map((s) => ({
        showId: s._id.toString(),
        movieId: s.movie?._id?.toString(),
        movieTitle: s.movie?.movieName,
        theatre: s.theatre?.theatreName,
        date: s.showdate,
        time: s.showtime,
        prices: {
          B: s.theatre?.balconySeatPrice,
          M: s.theatre?.middleSeatPrice,
          L: s.theatre?.lowerSeatPrice,
        },
        availableSampleSeats: {
          balcony: pickAvailableSeats(s, 4, "B"),
          middle: pickAvailableSeats(s, 4, "M"),
          lower: pickAvailableSeats(s, 4, "L"),
        },
      }));

      const systemPrompt = `You are the iMovies Pro AI Concierge with live screen control.
Current user route: ${currentPath}
Available Movies: ${JSON.stringify(catalogContext)}
Available Shows: ${JSON.stringify(showContext)}

Respond ONLY with valid JSON matching this schema:
{
  "reply": "Short, friendly response to the user",
  "action": {
    "type": "NONE" | "NAVIGATE" | "GO_BACK" | "FILTER_MOVIES" | "AUTO_SELECT_SEATS",
    "route": "/ or /movie/<id> or /shows/<movieId> or /seats/<showId> or /bookings or /favorites or /admin",
    "payload": {
      "search": "",
      "genre": "",
      "showId": "",
      "seats": ["B1", "B2"],
      "openCheckout": false
    }
  }
}

Rules:
- If user asks to go back -> type: "GO_BACK".
- If user asks to go home -> type: "NAVIGATE", route: "/".
- If user asks for a genre (e.g. Action, Horror, Thriller) -> type: "FILTER_MOVIES", route: "/", payload: { "genre": "<Genre>" }.
- If user wants to book seats for a movie -> pick a matching showId and available seats from availableSampleSeats, use type: "AUTO_SELECT_SEATS", route: "/seats/<showId>", payload: { "showId": "<showId>", "seats": [...], "openCheckout": false }.
- Never invent movie IDs or show IDs; only use IDs from the provided JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt}\n\nUser message: ${message}`,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text);
      return res.json({ ...parsed, engine: "gemini-2.5-flash" });
    } catch (geminiErr) {
      console.warn("Gemini call failed, falling back to local controller:", geminiErr.message);
      const fallback = runFallbackAssistant(message, movies, shows);
      return res.json({ ...fallback, engine: "local-smart-controller" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
