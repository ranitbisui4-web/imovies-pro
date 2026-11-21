import React, { createContext, useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const AIControlContext = createContext(null);

export const AIControlProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [movieFilters, setMovieFilters] = useState({ search: "", genre: "All" });
  const [aiSeatCommand, setAiSeatCommand] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: 'Hi! I am your iMovies AI Concierge. I can find movies, control screens, and book seats for you. Try "Show action movies", "Book 2 balcony seats for OG", or "Go back".',
    },
  ]);

  const sendCommand = async (text) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setThinking(true);

    try {
      const { data } = await api.post("/ai/command", {
        message: text,
        currentPath: location.pathname,
      });

      const action = data.action || { type: "NONE" };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply,
          actionType: action.type !== "NONE" ? action.type : null,
        },
      ]);

      // Execute autonomous screen control
      if (action.type === "GO_BACK") {
        navigate(-1);
      } else if (action.type === "NAVIGATE" && action.route) {
        if (action.payload?.clearFilters) {
          setMovieFilters({ search: "", genre: "All" });
        }
        navigate(action.route);
      } else if (action.type === "FILTER_MOVIES") {
        setMovieFilters({
          search: action.payload?.search || "",
          genre: action.payload?.genre || "All",
        });
        if (location.pathname !== "/") navigate("/");
      } else if (action.type === "AUTO_SELECT_SEATS" && action.route) {
        setAiSeatCommand({
          showId: action.payload?.showId,
          seats: action.payload?.seats || [],
          openCheckout: Boolean(action.payload?.openCheckout),
          timestamp: Date.now(),
        });
        navigate(action.route);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I couldn't reach the backend server. Make sure `server` is running on port 5000.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <AIControlContext.Provider
      value={{
        isOpen,
        setIsOpen,
        thinking,
        messages,
        sendCommand,
        movieFilters,
        setMovieFilters,
        aiSeatCommand,
        clearAiSeatCommand: () => setAiSeatCommand(null),
      }}
    >
      {children}
    </AIControlContext.Provider>
  );
};

export const useAIControl = () => useContext(AIControlContext);
