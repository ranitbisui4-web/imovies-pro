# iMovies Pro — Full-Stack MERN Cinema Booking + AI Screen-Control Assistant

A complete, production-ready MERN (MongoDB, Express, React, Node.js) movie ticket booking platform featuring real-time Socket.io seat locking, UPI/Card checkout with promo codes, QR e-tickets, Admin Management Dashboard, Home & Back in-app navigation, and a Gemini-powered AI Movie Concierge that controls the screen and books tickets autonomously.

## Folder Structure

```text
imovies-pro/
├── client/          # React + Vite + Tailwind CSS frontend
└── server/          # Node.js + Express + MongoDB + Socket.io + Gemini AI backend
```

## Quick Start in VS Code

### 1. Prerequisites
- Install **Node.js (v18+)**
- Have a **MongoDB Atlas** URI (free tier) or local MongoDB running

### 2. Setup Backend (`server/`)
Open a terminal in VS Code and run:
```bash
cd server
npm install
```

Create a `.env` file inside `server/` (copy `.env.example` and update values):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/imovies_pro
JWT_SECRET=imovies_super_secret_key_change_me
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
```
> Note: Even if you leave `GEMINI_API_KEY` empty at first, the built-in smart fallback AI engine will still search movies, control screens, navigate Home/Back, and select seats automatically. Add your Gemini API key anytime to unlock full natural-language Gemini 2.5 Flash reasoning.

Seed sample movies, theatres, shows, and demo accounts:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
```
The API will run at `http://localhost:5000`.

### 3. Setup Frontend (`client/`)
Open a **second terminal** in VS Code and run:
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## Demo Accounts (after `npm run seed`)
- **Customer:** `demo@imovies.com` / `password123`
- **Admin:** `admin@imovies.com` / `admin123`

## Promo Codes
- `IMOVIES20` — 20% off
- `FIRST50` — ₹50 flat off

## Try AI Assistant Commands
- `"Show action movies"`
- `"Book 2 balcony seats for OG"`
- `"Open RRR details"`
- `"Go to my bookings"`
- `"Go back"` / `"Go home"`
