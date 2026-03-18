import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { MdBook, MdDateRange, MdAssignment, MdCheckCircle } from "react-icons/md";
import "./Dashboard.css";

function StudentDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    attendance: 0,
    results: 0,
    attendancePercentage: 0
  });
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      const [coursesData, attendanceData] = await Promise.all([
        axios.get("http://localhost:3001/courses"),
        axios.get("http://localhost:3001/attendance")
      ]);
      
      setStats({
        enrolledCourses: coursesData.data.length,
        attendance: attendanceData.data.length,
        results: 6, // Mock
        attendancePercentage: 92 // Mock
      });
      setCourses(coursesData.data.slice(0, 4));
    } catch (err) {
      console.log("Error fetching student data:", err);
    }
  };

  return (
    <div className="dashboard-container student-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="animate-slide-up">Student Dashboard</h1>
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
            <MdBook size={40} />
          </div>
          <div className="stat-content">
            <h3>Enrolled Courses</h3>
            <p className="stat-number">{stats.enrolledCourses}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="stat-icon attendance">
            <MdDateRange size={40} />
          </div>
          <div className="stat-content">
            <h3>Attendance %</h3>
            <p className="stat-number">{stats.attendancePercentage}%</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="stat-icon results">
            <MdAssignment size={40} />
          </div>
          <div className="stat-content">
            <h3>Results Published</h3>
            <p className="stat-number">{stats.results}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="stat-icon status">
            <MdCheckCircle size={40} />
          </div>
          <div className="stat-content">
            <h3>Academic Status</h3>
            <p className="stat-number">Good</p>
          </div>
        </div>
      </div>

      {/* Enrolled Courses Section */}
      <div className="features-section">
        <h2 className="section-title">My Courses</h2>
        <div className="courses-list">
          {courses.map((course, index) => (
            <div
              key={course.course_id}
              className="course-card animate-slide-up"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <div className="course-header">
                <h3>{course.course_name}</h3>
                <span className="course-code">{course.course_code || "N/A"}</span>
              </div>
              <p className="course-info">
                <strong>Department:</strong> {course.department}
              </p>
              <div className="course-actions">
                <button className="btn btn-sm btn-primary">View Details</button>
                <button className="btn btn-sm btn-outline-primary">View Results</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="features-section">
        <h2 className="section-title">Quick Links</h2>
        <div className="features-grid">
          <div className="feature-card animate-slide-up">
            <MdBook className="feature-icon" />
            <h3>View Attendance</h3>
            <p>Check your attendance record</p>
            <button className="btn btn-primary">View</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdAssignment className="feature-icon" />
            <h3>View Results</h3>
            <p>Check your academic results</p>
            <button className="btn btn-primary">View</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdDateRange className="feature-icon" />
            <h3>Class Schedule</h3>
            <p>View your class schedule</p>
            <button className="btn btn-primary">View</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdCheckCircle className="feature-icon" />
            <h3>Notice Board</h3>
            <p>Important college notices</p>
            <button className="btn btn-primary">View</button>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="performance-card">
        <h3>Academic Performance</h3>
        <div className="performance-metrics">
          <div className="metric">
            <span>GPA</span>
            <strong>3.8/4.0</strong>
          </div>
          <div className="metric">
            <span>Total Credits</span>
            <strong>45/120</strong>
          </div>
          <div className="metric">
            <span>Performance</span>
            <strong>Excellent</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
