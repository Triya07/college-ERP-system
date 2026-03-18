import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { MdClass, MdAssignment, MdDateRange, MdBarChart } from "react-icons/md";
import "./Dashboard.css";

function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    pendingAttendance: 0,
    pendingResults: 0
  });

  const fetchStats = async () => {
    try {
      const courses = await axios.get("http://localhost:3001/courses");
      
      setStats({
        courses: courses.data.length,
        students: 150, // Mock
        pendingAttendance: 5, // Mock
        pendingResults: 3 // Mock
      });
    } catch (err) {
      console.log("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="dashboard-container teacher-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="animate-slide-up">Teacher Dashboard</h1>
          <p className="subtitle">Welcome, {user?.profile?.name || user?.email}!</p>
        </div>
        <button onClick={logout} className="btn btn-danger">
          Logout
        </button>
      </div>

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
            <button className="btn btn-primary">View Courses</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdDateRange className="feature-icon" />
            <h3>Mark Attendance</h3>
            <p>Mark student attendance for classes</p>
            <button className="btn btn-primary">Mark Attendance</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdAssignment className="feature-icon" />
            <h3>Manage Results</h3>
            <p>Upload and manage student results</p>
            <button className="btn btn-primary">Manage Results</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdBarChart className="feature-icon" />
            <h3>View Reports</h3>
            <p>View attendance and performance reports</p>
            <button className="btn btn-primary">View Reports</button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <h3>Today's Overview</h3>
        <div className="stats-boxes">
          <div className="stat-box">
            <strong>Classes Today:</strong>
            <p>3</p>
          </div>
          <div className="stat-box">
            <strong>Students to Mark:</strong>
            <p>125</p>
          </div>
          <div className="stat-box">
            <strong>Pending Activities:</strong>
            <p>8</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
