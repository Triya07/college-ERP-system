import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [roleConfirmed, setRoleConfirmed] = useState(localStorage.getItem("roleConfirmed") === "true");

  // Set default axios header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Verify token on mount
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get("http://localhost:3001/auth/verify");
      setUser(response.data.user);
    } catch (err) {
      console.log("Token verification failed:", err.message);
      localStorage.removeItem("token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post("http://localhost:3001/auth/login", {
        email,
        password
      });
      const { token, user, profile } = response.data;
      
      // Store token
      localStorage.setItem("token", token);
      localStorage.removeItem("roleConfirmed"); // Reset role confirmation on new login
      localStorage.setItem("userRole", user.role); // Store the role
      
      // Update state
      setToken(token);
      setRoleConfirmed(false);
      setUser({ ...user, profile });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed"
      };
    }
  };

  const confirmRole = (selectedRole) => {
    setRoleConfirmed(true);
    localStorage.setItem("roleConfirmed", "true");
    // Update user with confirmed role
    setUser((prevUser) => ({
      ...prevUser,
      role: selectedRole
    }));
  };

  const signup = async (formData) => {
    try {
      const response = await axios.post("http://localhost:3001/auth/signup", formData);
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Signup failed"
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("roleConfirmed");
    localStorage.removeItem("userRole");
    setToken(null);
    setUser(null);
    setRoleConfirmed(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, signup, logout, roleConfirmed, confirmRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default AuthContext;
