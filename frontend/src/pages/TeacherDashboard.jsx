import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { MdClass, MdAssignment, MdDateRange, MdBarChart, MdHowToReg } from "react-icons/md";
import "./Dashboard.css";

function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    pendingAttendance: 0,
    pendingResults: 0,
    classesToday: 0,
    studentsToMark: 0,
    pendingActivities: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await API.get("/dashboard/teacher");
      setStats(response.data);
      setError("");
    } catch (err) {
      console.log("Error fetching stats:", err);
      setError("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="dashboard-container teacher-dashboard">
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container teacher-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="animate-slide-up">Teacher Dashboard</h1>
          <p className="subtitle">Welcome, {user?.profile?.name || user?.username || user?.email}!</p>
        </div>
        <button onClick={logout} className="btn btn-danger">
          Logout
        </button>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="stat-icon courses">
            <MdClass size={40} />
          </div>
          <div className="stat-content">
            <h3>Assigned Courses</h3>
            <p className="stat-number">{stats.courses}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="stat-icon students">
            <MdAssignment size={40} />
          </div>
          <div className="stat-content">
            <h3>Total Students</h3>
            <p className="stat-number">{stats.students}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="stat-icon attendance">
            <MdDateRange size={40} />
          </div>
          <div className="stat-content">
            <h3>Pending Attendance</h3>
            <p className="stat-number">{stats.pendingAttendance}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="stat-icon faculty">
            <MdBarChart size={40} />
          </div>
          <div className="stat-content">
            <h3>Pending Results</h3>
            <p className="stat-number">{stats.pendingResults}</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="features-section">
        <h2 className="section-title">Core Functions</h2>
        <div className="features-grid">
          <div className="feature-card animate-slide-up">
            <MdClass className="feature-icon" />
            <h3>View Courses</h3>
            <p>View all assigned courses and details</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/courses")}>View Courses</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdDateRange className="feature-icon" />
            <h3>Mark Attendance</h3>
            <p>Mark student attendance for classes</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/attendance")}>Mark Attendance</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdAssignment className="feature-icon" />
            <h3>Manage Results</h3>
            <p>Upload and manage student results</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/results")}>Manage Results</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdBarChart className="feature-icon" />
            <h3>View Reports</h3>
            <p>View attendance and performance reports</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/attendance")}>View Reports</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdHowToReg className="feature-icon" />
            <h3>Course Registration</h3>
            <p>Review student registration requests</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/course-registration")}>Open Registration</button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <h3>Today's Overview</h3>
        <div className="stats-boxes">
          <div className="stat-box">
            <strong>Classes Today:</strong>
            <p>{stats.classesToday}</p>
          </div>
          <div className="stat-box">
            <strong>Students to Mark:</strong>
            <p>{stats.studentsToMark}</p>
          </div>
          <div className="stat-box">
            <strong>Pending Activities:</strong>
            <p>{stats.pendingActivities}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
