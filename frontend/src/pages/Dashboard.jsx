import React, { useState, useEffect } from "react";
import API from "../services/api";
import { MdPeople, MdBook, MdGroup, MdAssignment } from "react-icons/md";

function Dashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalFaculty, setTotalFaculty] = useState(0);
  const [totalExams, setTotalExams] = useState(0);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchRecentStudents();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await API.get("/stats");
      setTotalStudents(response.data.total_students || 0);
      setTotalCourses(response.data.total_courses || 0);
      setTotalFaculty(response.data.total_faculty || 0);
      setTotalExams(response.data.total_exams || 0);
      setError(null);
    } catch (err) {
      console.log("Error fetching statistics:", err);
      setError("Failed to load statistics");
    }
  };

  const fetchRecentStudents = async () => {
    try {
      setLoading(true);
      const response = await API.get("/students");
      setStudents(response.data);
      setError(null);
    } catch (err) {
      console.log("Error fetching students:", err);
      setError("Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, bgColor }) => (
    <div className="col-sm-6 col-md-3">
      <div
        className="card stat-card h-100"
        style={{
          background: `linear-gradient(135deg, ${bgColor} 0%, #fff 100%)`,
          border: "none",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div className="card-body text-center p-4">
          <div
            style={{
              fontSize: "48px",
              marginBottom: "1rem",
              color,
              opacity: 0.8
            }}
          >
            <Icon />
          </div>
          <h6 className="card-subtitle text-muted fw-bold">{title}</h6>
          <h2
            className="card-title mt-3"
            style={{
              color: "#2c3e50",
              fontWeight: "700",
              fontSize: "2.5rem"
            }}
          >
            {loading ? "..." : value}
          </h2>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div
        className="card mb-4"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          border: "none"
        }}
      >
        <div className="card-body p-4">
          <h1 className="mb-2 fw-bold">Welcome to College ERP</h1>
          <p className="lead mb-0">Centralized system for managing students, courses, attendance, and results.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
          <strong>⚠️ Notice:</strong> {error}
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

      <h2 className="mb-4 fw-bold" style={{ color: "#2c3e50" }}>
        📊 System Overview
      </h2>

      <div className="row gy-4 mb-5">
        <StatCard
          icon={MdPeople}
          title="Total Students"
          value={totalStudents}
          color="#667eea"
          bgColor="#E3F2FD"
        />
        <StatCard
          icon={MdBook}
          title="Total Courses"
          value={totalCourses}
          color="#4CAF50"
          bgColor="#E8F5E9"
        />
        <StatCard
          icon={MdGroup}
          title="Faculty Members"
          value={totalFaculty}
          color="#2196F3"
          bgColor="#E0F2F1"
        />
        <StatCard
          icon={MdAssignment}
          title="Exams Conducted"
          value={totalExams}
          color="#ff9800"
          bgColor="#FFF9C4"
        />
      </div>

      <h2 className="mb-4 fw-bold" style={{ color: "#2c3e50" }}>
        👥 Recent Students
      </h2>
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading student data...</p>
        </div>
      ) : students.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Enrollment Date</th>
              </tr>
            </thead>
            <tbody>
              {students.slice(0, 10).map((student) => (
                <tr key={student.student_id} style={{ transition: "all 0.3s ease" }}>
                  <td>
                    <span
                      className="badge"
                      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                    >
                      {student.student_id}
                    </span>
                  </td>
                  <td className="fw-bold">{student.name}</td>
                  <td>{student.email || "—"}</td>
                  <td>{student.phone || "—"}</td>
                  <td>
                    {student.enrollment_date && student.enrollment_date !== "0000-00-00"
                      ? new Date(student.enrollment_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="alert alert-info d-flex align-items-center" role="alert">
          <div>ℹ️ No students found in the database.</div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
