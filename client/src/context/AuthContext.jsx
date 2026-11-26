import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("imovies_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const persistSession = (token, nextUser) => {
    if (token) {
      localStorage.setItem("imovies_token", token);
    }
    if (nextUser) {
      localStorage.setItem("imovies_user", JSON.stringify(nextUser));
    }
    setUser(nextUser || null);
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem("imovies_token");
    if (!token) return null;
    try {
      const { data } = await api.get("/auth/profile");
      if (data?.user) {
        localStorage.setItem("imovies_user", JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      }
    } catch {
      // ignore transient error
    }
    return null;
  };

  useEffect(() => {
    const token = localStorage.getItem("imovies_token");
    if (token && !user) {
      api
        .get("/auth/profile")
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem("imovies_user", JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem("imovies_token");
          localStorage.removeItem("imovies_user");
        });
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      persistSession(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (payload) => {
    setLoading(true);
    try {
      const body = typeof payload === "string" ? { credential: payload } : payload;
      const { data } = await api.post("/auth/google", body);
      persistSession(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", payload);
      persistSession(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("imovies_token");
    localStorage.removeItem("imovies_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, googleLogin, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);