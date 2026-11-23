require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");
const Movie = require("./models/Movie");
const Theatre = require("./models/Theatre");
const Show = require("./models/Show");

const seedData = async () => {
  await connectDB();

  console.log("Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    Movie.deleteMany({}),
    Theatre.deleteMany({}),
    Show.deleteMany({}),
  ]);

  const [userPassword, adminPassword, managerPassword] = await Promise.all([
    bcrypt.hash("password123", 10),
    bcrypt.hash("admin123", 10),
    bcrypt.hash(process.env.MANAGER_PASSWORD || "Manager@2026", 10),
  ]);

  // 1. Create the Head Manager account (can approve new Admins & new Managers)
  const manager = await User.create({
    username: "Head Manager",
    email: (process.env.MANAGER_EMAIL || "manager@imovies.com").toLowerCase(),
    password: managerPassword,
    role: "manager",
    requestedRole: "none",
    approvalStatus: "approved",
  });

  // 2. Create Cinema Admin account (approved by Manager)
  const admin = await User.create({
    username: "Cinema Admin",
    email: "admin@imovies.com",
    password: adminPassword,
    role: "admin",
    requestedRole: "none",
    approvalStatus: "approved",
    approvedBy: manager._id,
  });

  // 3. Create Demo Customer account
  await User.create({
    username: "Demo Customer",
    email: "demo@imovies.com",
    password: userPassword,
    role: "user",
    requestedRole: "none",
    approvalStatus: "approved",
  });

  const movies = await Movie.insertMany([
    {
      movieName: "OG",
      description:
        "After vanishing from Mumbai's underworld for a decade, ruthless gangster Ojas Gambheera returns to settle old scores and reclaim his empire.",
      genres: ["Action", "Thriller"],
      language: "Telugu / Hindi",
      releaseDate: new Date("2025-09-25"),
      runtime: 158,
      certification: "U/A",
      rating: 9.1,
      posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      cast: ["Pawan Kalyan", "Emraan Hashmi", "Priyanka Mohan"],
      isFeatured: true,
    },
    {
      movieName: "RRR",
      description:
        "A fearless revolutionary and an officer in the British force forge an unforgettable friendship while fighting against colonial tyranny in 1920s India.",
      genres: ["Action", "Drama", "Historical"],
      language: "Telugu / Hindi / English",
      releaseDate: new Date("2022-03-25"),
      runtime: 187,
      certification: "U/A",
      rating: 9.3,
      posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1400&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=f_vbAtFSEc0",
      cast: ["N. T. Rama Rao Jr.", "Ram Charan", "Alia Bhatt"],
      isFeatured: true,
    },
    {
      movieName: "The RajaSaab",
      description:
        "A charming heir returns to his ancestral palace only to uncover centuries-old supernatural secrets blending chills with laughter.",
      genres: ["Comedy", "Horror", "Romantic"],
      language: "Telugu / Hindi",
      releaseDate: new Date("2025-12-05"),
      runtime: 152,
      certification: "U/A",
      rating: 8.6,
      posterUrl: "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1400&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      cast: ["Prabhas", "Malavika Mohanan", "Sanjay Dutt"],
    },
    {
      movieName: "Toxic",
      description:
        "Set against a gritty neon coastal syndicate, a lone strategist wages an explosive war against an international cartel.",
      genres: ["Action", "Thriller"],
      language: "Kannada / Hindi / English",
      releaseDate: new Date("2025-10-01"),
      runtime: 162,
      certification: "A",
      rating: 8.8,
      posterUrl: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=600&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      cast: ["Yash", "Kiara Advani", "Nayanthara"],
    },
    {
      movieName: "Avatar: Fire and Ash",
      description:
        "Jake Sully and Neytiri journey to Pandora's volcanic frontier, encountering the fierce Ash People in a battle for survival.",
      genres: ["Sci-Fi", "Adventure", "Fantasy"],
      language: "English / Hindi",
      releaseDate: new Date("2025-12-19"),
      runtime: 192,
      certification: "U/A",
      rating: 9.0,
      posterUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=600&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      cast: ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver"],
    },
    {
      movieName: "Baahubali 2: The Conclusion",
      description:
        "When Shiva learns of his royal heritage in Mahishmati, he uncovers the betrayal behind Amarendra Baahubali's fate.",
      genres: ["Action", "Drama", "Fantasy"],
      language: "Telugu / Hindi",
      releaseDate: new Date("2017-04-28"),
      runtime: 167,
      certification: "U/A",
      rating: 9.2,
      posterUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80",
      trailerUrl: "https://www.youtube.com/watch?v=G62HrubdD6o",
      cast: ["Prabhas", "Rana Daggubati", "Anushka Shetty"],
    },
  ]);

  const theatres = await Theatre.insertMany([
    {
      theatreName: "Srinivasa Multiplex",
      location: "City Centre, Main Road",
      screens: 4,
      balconySeatPrice: 280,
      middleSeatPrice: 190,
      lowerSeatPrice: 130,
      balconySeatCount: 20,
      middleSeatCount: 30,
      lowerSeatCount: 20,
    },
    {
      theatreName: "Gokul IMAX 4K",
      location: "Junction Mall, Downtown",
      screens: 5,
      balconySeatPrice: 350,
      middleSeatPrice: 240,
      lowerSeatPrice: 160,
      balconySeatCount: 20,
      middleSeatCount: 30,
      lowerSeatCount: 20,
    },
  ]);

  const today = new Date();
  const formatDate = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };

  const showDocs = [];
  for (const movie of movies) {
    showDocs.push(
      {
        movie: movie._id,
        theatre: theatres[0]._id,
        screenName: "Screen 1 • Dolby Atmos",
        showdate: formatDate(0),
        showtime: "18:30",
        bookedSeats: ["B3", "B4", "M12", "M13"],
        createdBy: admin._id,
      },
      {
        movie: movie._id,
        theatre: theatres[0]._id,
        screenName: "Screen 2 • 4K Laser",
        showdate: formatDate(1),
        showtime: "21:00",
        bookedSeats: ["M5", "M6"],
        createdBy: admin._id,
      },
      {
        movie: movie._id,
        theatre: theatres[1]._id,
        screenName: "IMAX Screen 1",
        showdate: formatDate(0),
        showtime: "20:15",
        bookedSeats: ["B10", "L2"],
        createdBy: admin._id,
      }
    );
  }

  await Show.insertMany(showDocs);

  console.log("Seed completed successfully!");
  console.log("Manager Login  -> manager@imovies.com / Manager@2026");
  console.log("Admin Login    -> admin@imovies.com / admin123");
  console.log("Customer Login -> demo@imovies.com / password123");
  process.exit(0);
};

seedData().catch((err) => {
  console.error(err);
  process.exit(1);
});