import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdDashboard, MdPeople, MdBook, MdSchool, MdInsertChart } from "react-icons/md";
import "./Dashboard.css";

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_students: 0,
    total_courses: 0,
    total_faculty: 0,
    total_users: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3001/admin/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      setStats(response.data);
      setError("");
    } catch (err) {
      console.log("Error fetching stats:", err);
      setError("Failed to load statistics");
      // Set default values if fetch fails
      setStats({
        total_students: 0,
        total_courses: 0,
        total_faculty: 0,
        total_users: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="animate-slide-up">Admin Dashboard</h1>
          <p className="subtitle">Welcome, {user?.profile?.name || user?.email}! 👋</p>
        </div>
        <button onClick={handleLogout} className="btn btn-danger">
          Logout
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-warning" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="stat-icon students">
            <MdPeople size={40} />
          </div>
          <div className="stat-content">
            <h3>Total Students</h3>
            <p className="stat-number">{stats.total_students}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="stat-icon courses">
            <MdBook size={40} />
          </div>
          <div className="stat-content">
            <h3>Total Courses</h3>
            <p className="stat-number">{stats.total_courses}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="stat-icon faculty">
            <MdSchool size={40} />
          </div>
          <div className="stat-content">
            <h3>Faculty Members</h3>
            <p className="stat-number">{stats.total_faculty}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="stat-icon attendance">
            <MdInsertChart size={40} />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.total_users}</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="features-section">
        <h2 className="section-title">Admin Controls</h2>
        <div className="features-grid">
          <div className="feature-card animate-slide-up">
            <MdPeople className="feature-icon" />
            <h3>Manage Students</h3>
            <p>Add, edit, and remove student records</p>
            <button 
              className="btn btn-primary"
              onClick={() => handleNavigate("/students")}
            >
              Go to Students
            </button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdBook className="feature-icon" />
            <h3>Manage Courses</h3>
            <p>Create and manage course offerings</p>
            <button 
              className="btn btn-primary"
              onClick={() => handleNavigate("/courses")}
            >
              Go to Courses
            </button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdSchool className="feature-icon" />
            <h3>Manage Faculty</h3>
            <p>Handle teacher/faculty assignments</p>
            <button 
              className="btn btn-primary"
              onClick={() => handleNavigate("/faculty")}
            >
              Go to Faculty
            </button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdInsertChart className="feature-icon" />
            <h3>View Reports</h3>
            <p>Analytics and attendance reports</p>
            <button 
              className="btn btn-primary"
              onClick={() => handleNavigate("/attendance")}
            >
              View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            className="btn btn-outline-primary"
            onClick={() => handleNavigate("/students")}
          >
            Add New Student
          </button>
          <button 
            className="btn btn-outline-primary"
            onClick={() => handleNavigate("/courses")}
          >
            Add New Course
          </button>
          <button 
            className="btn btn-outline-primary"
            onClick={() => handleNavigate("/faculty")}
          >
            Add Faculty Member
          </button>
          <button 
            className="btn btn-outline-primary"
            onClick={() => handleNavigate("/attendance")}
          >
            View Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
