import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AIControlProvider } from "./context/AIControlContext";
import Navbar from "./components/Navbar";
import AIAssistant from "./components/AIAssistant";

import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import MovieShows from "./pages/MovieShows";
import SeatSelection from "./pages/SeatSelection";
import MyBookings from "./pages/MyBookings";
import Favorites from "./pages/Favorites";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => (
  <div className="min-h-screen bg-[#090d16] text-slate-100">
    <Navbar />
    <main className="pb-20">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/shows/:movieId" element={<MovieShows />} />
        <Route path="/seats/:showId" element={<SeatSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    <AIAssistant />
  </div>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AIControlProvider>
        <AppRoutes />
      </AIControlProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
