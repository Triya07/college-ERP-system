import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { MdDashboard, MdPeople, MdBook, MdSchool, MdInsertChart, MdHowToReg } from "react-icons/md";
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
      const response = await API.get("/admin/stats");
      
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
          <p className="subtitle">Welcome, {user?.profile?.name || user?.username || user?.email}! 👋</p>
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

      <div className="features-section">
        <h2 className="section-title">Admin Controls</h2>
        <div className="features-grid admin-controls-grid">
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
            <h3>View Attendance</h3>
            <p>Track and manage attendance records</p>
            <button 
              className="btn btn-primary"
              onClick={() => handleNavigate("/attendance")}
            >
              View Attendance
            </button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdHowToReg className="feature-icon" />
            <h3>Course Registration</h3>
            <p>Review and manage registration requests</p>
            <button
              className="btn btn-primary"
              onClick={() => handleNavigate("/course-registration")}
            >
              Open Registration
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 d-flex justify-content-center align-items-center gap-2 flex-nowrap">
        <button className="btn btn-outline-primary" style={{ minWidth: "120px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/results")}>Results</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "120px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/timetable")}>Timetable</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "120px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/fees")}>Fees</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "120px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/notifications")}>Notifications</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "120px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/classes")}>Classes</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "140px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/enterprise-workflows")}>Additional Features</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "120px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/profile")}>Profile</button>
      </div>

    </div>
  );
}

export default AdminDashboard;
