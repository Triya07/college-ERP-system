import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";
import { AiOutlineMail, AiOutlineLock, AiOutlineUser, AiOutlineBook } from "react-icons/ai";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "student",
    department: "CSE",
    year: 1,
    phone: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          setSuccess("Login successful! Redirecting...");
          setTimeout(() => navigate("/role-selection"), 1500);
        } else {
          setError(result.message);
        }
      } else {
        const result = await signup(formData);
        if (result.success) {
          setSuccess("Account created successfully! Redirecting to login...");
          setTimeout(() => {
            setIsLogin(true);
            setFormData({ ...formData, email: "", password: "" });
          }, 1500);
        } else {
          setError(result.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card animate-slide-up">
        <div className="auth-header">
          <div className="logo-icon">
            <AiOutlineBook size={40} />
          </div>
          <h1>College ERP</h1>
          <p className="subtitle">
            {isLogin ? "Welcome Back!" : "Create Your Account"}
          </p>
        </div>

        {error && <div className="alert alert-danger animate-shake">{error}</div>}
        {success && <div className="alert alert-success animate-pulse">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group animate-fade-in">
                <label htmlFor="name">
                  <AiOutlineUser className="input-icon" /> Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="form-control"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="form-control form-select"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher/Faculty</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="department">Department</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder={formData.role === "admin" ? "Administration" : "CSE"}
                    className="form-control"
                  />
                </div>
              </div>

              {formData.role === "student" && (
                <div className="form-group">
                  <label htmlFor="year">Year</label>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="form-control form-select"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 XXXXXXXXXX"
                  className="form-control"
                />
              </div>
            </>
          )}

          <div className="form-group animate-fade-in">
            <label htmlFor="email">
              <AiOutlineMail className="input-icon" /> Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="form-control"
            />
          </div>

          <div className="form-group animate-fade-in">
            <label htmlFor="password">
              <AiOutlineLock className="input-icon" /> Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-auth animate-slide-up"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
              className="toggle-btn"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>

        <div className="demo-credentials">
          <small>
            <strong>Demo Accounts:</strong>
            <br />
            Admin: admin@college.com / admin123
            <br />
            Teacher: teacher@college.com / teacher123
            <br />
            Student: student@college.com / student123
          </small>
        </div>
      </div>
    </div>
  );
}

export default Auth;
