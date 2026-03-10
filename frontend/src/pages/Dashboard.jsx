import React, { useState, useEffect } from "react";
import API from "../services/api";

function Dashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await API.get("/students");
      setStudents(response.data);
      setTotalStudents(response.data.length);
      setError(null);
    } catch (err) {
      console.log("Error fetching students:", err);
      setError("Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-white p-4 rounded shadow-sm mb-4">
        <h1 className="mb-1">Welcome to College ERP</h1>
        <p className="lead">Centralized system for managing students, courses, attendance, and results.</p>
      </div>

      <h2 className="mb-4">Overview</h2>

      {error && (
        <div className="alert alert-warning" role="alert">
          {error}
        </div>
      )}

      <div className="row gy-4">
        <div className="col-sm-6 col-md-3">
          <div className="card shadow-sm p-3 text-center">
            <h5>Total Students</h5>
            <h3>{loading ? "..." : totalStudents}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3">
            <h5>Total Courses</h5>
            <h3>15</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3">
            <h5>Faculty Members</h5>
            <h3>25</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3">
            <h5>Exams Conducted</h5>
            <h3>8</h3>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h2 className="mb-4">Recent Students</h2>
        {loading ? (
          <div className="text-center p-4">
            <p>Loading student data...</p>
          </div>
        ) : students.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
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
                  <tr key={student.student_id}>
                    <td>{student.student_id}</td>
                    <td>{student.name}</td>
                    <td>{student.email || "N/A"}</td>
                    <td>{student.phone || "N/A"}</td>
                    <td>{student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alert alert-info">No students found in the database.</div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
