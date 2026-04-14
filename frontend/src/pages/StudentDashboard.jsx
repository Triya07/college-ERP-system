import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { MdBook, MdDateRange, MdAssignment, MdCheckCircle, MdHowToReg } from "react-icons/md";
import "./Dashboard.css";

function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    resultsPublished: 0,
    attendancePercentage: 0,
    academicStatus: "Needs Attention",
    averageScore: 0
  });
  const [courses, setCourses] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [attendanceTimeline, setAttendanceTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const response = await API.get("/dashboard/student");
      const data = response.data;

      setStats({
        enrolledCourses: data.enrolledCourses || 0,
        resultsPublished: data.resultsPublished || 0,
        attendancePercentage: data.attendancePercentage || 0,
        academicStatus: data.academicStatus || "Needs Attention",
        averageScore: data.averageScore || 0
      });
      setCourses((data.courses || []).slice(0, 4));
      setTodayClasses(data.todayClasses || []);

      const attendanceResponse = await API.get("/attendance/student/me");
      setAttendanceTimeline(attendanceResponse.data || []);
      setError("");
    } catch (err) {
      console.log("Error fetching student data:", err);
      setError("Could not load student dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const getMonthDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmpty = (firstDay + 6) % 7;

    const cells = [];
    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push({ type: "empty", key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(year, month, day);
      const dateKey = dateObj.toISOString().slice(0, 10);
      const records = attendanceTimeline.filter(
        (item) => String(item.attendance_date).slice(0, 10) === dateKey
      );

      let state = "none";
      if (records.length > 0) {
        const presentCount = records.filter((item) => item.status === "Present").length;
        if (presentCount === records.length) {
          state = "present";
        } else if (presentCount === 0) {
          state = "absent";
        } else {
          state = "mixed";
        }
      }

      const today = new Date();
      const isToday =
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      cells.push({
        type: "day",
        day,
        dateKey,
        state,
        isToday,
        classesCount: records.length,
        key: dateKey
      });
    }

    return {
      monthLabel: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      cells
    };
  };

  const calendarData = getMonthDays();

  if (loading) {
    return (
      <div className="dashboard-container student-dashboard">
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container student-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="animate-slide-up">Student Dashboard</h1>
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
            <p className="stat-number">{Number(stats.attendancePercentage).toFixed(2)}%</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="stat-icon results">
            <MdAssignment size={40} />
          </div>
          <div className="stat-content">
            <h3>Results Published</h3>
            <p className="stat-number">{stats.resultsPublished}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="stat-icon status">
            <MdCheckCircle size={40} />
          </div>
          <div className="stat-content">
            <h3>Academic Status</h3>
            <p className="stat-number">{stats.academicStatus}</p>
          </div>
        </div>
      </div>

      {/* Enrolled Courses Section */}
      <div className="features-section">
        <h2 className="section-title">My Courses</h2>
        <div className="courses-list">
          {courses.length === 0 ? (
            <div className="alert alert-info">No enrolled courses found.</div>
          ) : courses.map((course, index) => (
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
                <button className="btn btn-sm btn-primary" onClick={() => handleNavigate("/attendance")}>View Details</button>
                <button className="btn btn-sm btn-outline-primary" onClick={() => handleNavigate("/results")}>View Results</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-stats">
        <h3>Today's Classes (Only Your Enrolled Courses)</h3>
        {todayClasses.length === 0 ? (
          <p className="mb-0 text-muted">No classes scheduled for you today.</p>
        ) : (
          <div className="today-classes-list">
            {todayClasses.map((item) => (
              <div key={item.timetable_id} className="today-class-card">
                <h6 className="mb-1">{item.course_name}</h6>
                <small className="d-block text-muted mb-1">
                  {String(item.start_time || "").slice(0, 5)} - {String(item.end_time || "").slice(0, 5)}
                </small>
                <small className="d-block text-muted">
                  {item.room_number ? `Room ${item.room_number}` : "Room TBD"} | {item.session_type}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="quick-stats">
        <h3>Attendance Calendar - {calendarData.monthLabel}</h3>
        <p className="text-muted mb-2">
          Green = present, Red = absent, Yellow = mixed status in a day.
        </p>
        <div className="attendance-calendar-grid">
          {calendarData.cells.map((cell) => {
            if (cell.type === "empty") {
              return <div key={cell.key} className="attendance-calendar-cell empty" />;
            }

            return (
              <div
                key={cell.key}
                className={`attendance-calendar-cell ${cell.isToday ? "today" : ""}`}
                title={`${cell.dateKey} | ${cell.classesCount} classes`}
              >
                <span className="attendance-day-number">{cell.day}</span>
                <span className={`attendance-dot ${cell.state}`} />
              </div>
            );
          })}
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
            <button className="btn btn-primary" onClick={() => handleNavigate("/attendance")}>View</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdAssignment className="feature-icon" />
            <h3>View Results</h3>
            <p>Check your academic results</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/results")}>View</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdDateRange className="feature-icon" />
            <h3>Class Schedule</h3>
            <p>See today's classes and timetable</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/timetable")}>View</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdHowToReg className="feature-icon" />
            <h3>Course Registration</h3>
            <p>Register and track your course requests</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/course-registration")}>Open</button>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="performance-card">
        <h3>Academic Performance</h3>
        <div className="performance-metrics">
          <div className="metric">
            <span>Average Score</span>
            <strong>{Number(stats.averageScore).toFixed(2)}%</strong>
          </div>
          <div className="metric">
            <span>Total Credits</span>
            <strong>{stats.enrolledCourses * 4}/120</strong>
          </div>
          <div className="metric">
            <span>Performance</span>
            <strong>{stats.academicStatus}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
