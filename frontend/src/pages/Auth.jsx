import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";
import { AiOutlineMail, AiOutlineLock, AiOutlineUser, AiOutlineBook, AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function Auth() {
  const yearSemesterOptions = {
    1: ["1", "2"],
    2: ["3", "4"],
    3: ["5", "6"],
    4: ["7", "8"]
  };

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "student",
    department: "CSE",
    year: 1,
    semester: "1",
    phone: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [resetData, setResetData] = useState({
    email: "",
    token: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login, signup, requestPasswordReset, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "year") {
      const allowedSemesters = yearSemesterOptions[Number(value)] || ["1", "2"];
      const resolvedSemester = allowedSemesters.includes(String(formData.semester))
        ? String(formData.semester)
        : allowedSemesters[0];
      setFormData({ ...formData, year: Number(value), semester: resolvedSemester });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password, formData.role);
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

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetData((prev) => ({ ...prev, [name]: value }));
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!resetData.email) {
      setError("Email is required");
      return;
    }

    setForgotLoading(true);
    try {
      if (!resetData.token) {
        const requestResult = await requestPasswordReset(resetData.email);
        if (requestResult.success) {
          const tokenMessage = requestResult.reset_token
            ? ` Reset Token: ${requestResult.reset_token}`
            : "";
          setSuccess(`${requestResult.message}${tokenMessage}`);
        } else {
          setError(requestResult.message);
        }
        return;
      }

      if (!resetData.newPassword || !resetData.confirmPassword) {
        setError("New password and confirm password are required");
        return;
      }

      if (resetData.newPassword !== resetData.confirmPassword) {
        setError("New password and confirm password do not match");
        return;
      }

      const result = await forgotPassword(resetData.email, resetData.token, resetData.newPassword);
      if (result.success) {
        setSuccess(result.message);
        setShowForgotForm(false);
        setIsLogin(true);
        setFormData((prev) => ({ ...prev, email: resetData.email, password: "" }));
        setResetData({ email: "", token: "", newPassword: "", confirmPassword: "" });
      } else {
        setError(result.message);
      }
    } finally {
      setForgotLoading(false);
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
                <div className="form-row">
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

                  <div className="form-group">
                    <label htmlFor="semester">Semester</label>
                    <select
                      id="semester"
                      name="semester"
                      value={String(formData.semester || "")}
                      onChange={handleChange}
                      className="form-control form-select"
                      required
                    >
                      {(yearSemesterOptions[Number(formData.year)] || ["1", "2"]).map((sem) => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
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
            <label htmlFor="loginRole">Login Role</label>
            <select
              id="loginRole"
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
            <div className="password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="form-control"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="forgot-link-wrap">
              <button
                type="button"
                className="forgot-btn"
                onClick={() => {
                  setShowForgotForm((prev) => !prev);
                  setError("");
                  setSuccess("");
                }}
              >
                {showForgotForm ? "Cancel password reset" : "Forgot password?"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-auth animate-slide-up"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        {isLogin && showForgotForm && (
          <form onSubmit={handleForgotSubmit} className="forgot-form animate-fade-in">
            <h4 className="forgot-title">Reset Password</h4>

            <div className="form-group">
              <label htmlFor="resetEmail">Registered Email</label>
              <input
                type="email"
                id="resetEmail"
                name="email"
                value={resetData.email}
                onChange={handleResetChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={resetData.newPassword}
                onChange={handleResetChange}
                className="form-control"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="resetToken">Reset Token</label>
              <input
                type="text"
                id="resetToken"
                name="token"
                value={resetData.token}
                onChange={handleResetChange}
                className="form-control"
                placeholder="Request token first, then paste here"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={resetData.confirmPassword}
                onChange={handleResetChange}
                className="form-control"
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn-auth" disabled={forgotLoading}>
              {forgotLoading ? "Processing..." : resetData.token ? "Reset Password" : "Request Reset Token"}
            </button>
          </form>
        )}

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

      </div>
    </div>
  );
}

export default Auth;
