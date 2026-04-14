import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { MdBook, MdDateRange, MdAssignment, MdCheckCircle, MdHowToReg } from "react-icons/md";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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
  const [attendanceTimeline, setAttendanceTimeline] = useState([]);
  const [selectedAttendanceType, setSelectedAttendanceType] = useState("present");
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
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

      const response_att = await API.get("/attendance/student/me");
      setAttendanceTimeline(response_att.data || []);
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

  const attendanceSummary = attendanceTimeline.reduce(
    (acc, item) => {
      if (item.status === "Present") {
        acc.present += 1;
      } else {
        acc.absent += 1;
      }
      return acc;
    },
    { present: 0, absent: 0 }
  );

  const totalAttendanceRecords = attendanceSummary.present + attendanceSummary.absent;
  const presentPercentage = totalAttendanceRecords
    ? ((attendanceSummary.present / totalAttendanceRecords) * 100).toFixed(1)
    : "0.0";
  const absentPercentage = totalAttendanceRecords
    ? ((attendanceSummary.absent / totalAttendanceRecords) * 100).toFixed(1)
    : "0.0";

  const groupedAttendanceDetails = attendanceTimeline
    .filter((item) => (selectedAttendanceType === "present" ? item.status === "Present" : item.status !== "Present"))
    .reduce((acc, item) => {
      const dateKey = String(item.attendance_date).slice(0, 10);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {});

  const attendanceDetailRows = Object.entries(groupedAttendanceDetails)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items
    }));

  const courseAttendanceRows = Object.values(
    attendanceTimeline.reduce((acc, item) => {
      const key = `${item.course_id || item.course_name || "course"}`;
      if (!acc[key]) {
        acc[key] = {
          course_id: item.course_id || key,
          course_name: item.course || item.course_name || "Course",
          present: 0,
          absent: 0,
          total: 0
        };
      }

      if (item.status === "Present") {
        acc[key].present += 1;
      } else {
        acc[key].absent += 1;
      }

      acc[key].total += 1;
      return acc;
    }, {})
  )
    .map((row) => ({
      ...row,
      percentage: row.total ? ((row.present / row.total) * 100).toFixed(2) : "0.00"
    }))
    .sort((a, b) => a.course_name.localeCompare(b.course_name));

  const ATTENDANCE_COLORS = {
    present: "#22c55e",
    absent: "#ef4444"
  };

  const openAttendanceModal = (type) => {
    setSelectedAttendanceType(type);
    setAttendanceModalOpen(true);
  };

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
      <div className="stats-grid" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
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
          <div className="stat-icon results">
            <MdAssignment size={40} />
          </div>
          <div className="stat-content">
            <h3>Results Published</h3>
            <p className="stat-number">{stats.resultsPublished}</p>
          </div>
        </div>

        <div className="stat-card animate-slide-up" style={{ animationDelay: "0.3s" }}>
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
          ) : (
            courses.map((course, index) => (
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
            ))
          )}
        </div>
      </div>

      <div className="quick-stats">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h3 className="mb-0">Course-wise Attendance</h3>
          <button className="btn btn-sm btn-outline-primary" onClick={() => handleNavigate("/attendance")}>
            Detailed Logs
          </button>
        </div>

        <div className="attendance-grid">
          {courseAttendanceRows.length === 0 ? (
            <div className="alert alert-info w-100">No enrollment or attendance data found.</div>
          ) : (
            courseAttendanceRows.map((course) => {
              const data = [
                { name: "Present", value: course.present, color: ATTENDANCE_COLORS.present },
                { name: "Absent", value: course.absent, color: ATTENDANCE_COLORS.absent }
              ];

              return (
                <div key={course.course_id} className="attendance-course-card animate-slide-up">
                  <h4>{course.course_name}</h4>
                  <div className="course-pie-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="course-attendance-stats">
                    <div>
                      <span>Present</span>
                      <strong style={{ color: ATTENDANCE_COLORS.present }}>{course.present}</strong>
                    </div>
                    <div>
                      <span>Absent</span>
                      <strong style={{ color: ATTENDANCE_COLORS.absent }}>{course.absent}</strong>
                    </div>
                    <div>
                      <span>Rate</span>
                      <strong style={{ color: Number(course.percentage) >= 75 ? "#22c55e" : "#ef4444" }}>
                        {course.percentage}%
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
            <h3>Class Registration</h3>
            <p>Register for new courses</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/course-registration")}>Open</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdHowToReg className="feature-icon" />
            <h3>My Profile</h3>
            <p>View and edit your profile</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/profile")}>View</button>
          </div>

          <div className="feature-card animate-slide-up">
            <MdAssignment className="feature-icon" />
            <h3>My Profile</h3>
            <p>View and update your profile details</p>
            <button className="btn btn-primary" onClick={() => handleNavigate("/profile")}>Open</button>
          </div>
        </div>
      </div>

      {/* Admin-style Navigation Buttons */}
      <div className="mb-4 d-flex justify-content-center align-items-center gap-2 flex-wrap">
        <button className="btn btn-outline-primary" style={{ minWidth: "130px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/timetable")}>Timetable</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "130px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/fees")}>Fees</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "130px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/notifications")}>Notifications</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "130px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/announcements")}>Notice Board</button>
        <button className="btn btn-outline-primary" style={{ minWidth: "160px", fontSize: "0.95rem" }} onClick={() => handleNavigate("/enterprise-workflows")}>Additional Features</button>
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

      {attendanceModalOpen && (
        <div className="attendance-modal-backdrop" onClick={() => setAttendanceModalOpen(false)}>
          <div className="attendance-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-modal-header">
              <div>
                <h3 className="mb-1">{selectedAttendanceType === "present" ? "Present Dates" : "Absent Dates"}</h3>
                <p className="mb-0 text-muted">
                  {selectedAttendanceType === "present"
                    ? `${attendanceSummary.present} present records • ${presentPercentage}%`
                    : `${attendanceSummary.absent} absent records • ${absentPercentage}%`}
                </p>
              </div>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setAttendanceModalOpen(false)}>
                Close
              </button>
            </div>

            {attendanceDetailRows.length === 0 ? (
              <div className="alert alert-light m-3 mb-0">
                No {selectedAttendanceType} attendance records found.
              </div>
            ) : (
              <div className="attendance-detail-list modal-list">
                {attendanceDetailRows.map((group) => (
                  <div key={group.date} className="attendance-detail-card">
                    <div className="attendance-detail-date">
                      {new Date(group.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </div>
                    <div className="attendance-detail-items">
                      {group.items.map((item, index) => (
                        <div key={`${group.date}-${index}`} className="attendance-detail-item">
                          <span className="attendance-detail-course">{item.course || item.course_name || "Course"}</span>
                          <span className={`attendance-detail-badge ${selectedAttendanceType}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
