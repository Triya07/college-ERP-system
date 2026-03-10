import React, { useState, useEffect } from "react";
import API from "../services/api";

function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    student_id: "",
    course_id: "",
    date: "",
    status: "Present"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all data on mount
  useEffect(() => {
    fetchAttendance();
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await API.get("/attendance");
      setAttendanceRecords(response.data);
      setError("");
    } catch (err) {
      console.log("Error fetching attendance:", err);
      setError("Could not load attendance records");
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await API.get("/students");
      setStudents(response.data);
    } catch (err) {
      console.log("Error fetching students:", err);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await API.get("/courses");
      setCourses(response.data);
    } catch (err) {
      console.log("Error fetching courses:", err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await API.post("/attendance", formData);

      // Reset form
      setFormData({
        student_id: "",
        course_id: "",
        date: "",
        status: "Present"
      });

      // Refresh attendance records
      await fetchAttendance();
    } catch (err) {
      console.error("attendance error", err);
      const msg = err.response?.data || err.message || "Could not mark attendance";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (studentId) => {
    const studentData = attendanceRecords.filter(
      (rec) => rec.student_id === parseInt(studentId)
    );

    const total = studentData.length;
    const presentCount = studentData.filter(
      (rec) => rec.status === "Present"
    ).length;

    if (total === 0) return 0;
    return ((presentCount / total) * 100).toFixed(2);
  };

  // Get unique students from attendance records
  const uniqueStudentIds = [
    ...new Set(attendanceRecords.map((rec) => rec.student_id))
  ];

  return (
    <div>
      <h2 className="mb-4">Attendance Management</h2>

      {/* Mark Attendance Form */}
      <div className="bg-white shadow-sm rounded p-4 mb-4">
        <h5>Mark Attendance</h5>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-3">
              <select
                name="student_id"
                className="form-select"
                value={formData.student_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.name} (ID: {student.student_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                name="course_id"
                className="form-select"
                value={formData.course_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.course_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <input
                type="date"
                name="date"
                className="form-control"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <select
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-warning mt-3" disabled={loading}>
            {loading ? "Marking..." : "Mark Attendance"}
          </button>
        </form>
      </div>

      {/* Attendance Records */}
      <div className="bg-white shadow-sm rounded p-4">
        <h5>Attendance Records</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Date</th>
              <th>Status</th>
              <th>Percentage</th>
            </tr>
          </thead>

          <tbody>
            {attendanceRecords.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center">
                  No attendance records found
                </td>
              </tr>
            ) : (
              attendanceRecords.map((record) => (
                <tr key={`${record.student_id}-${record.date}-${record.course_id}`}>
                  <td>{record.student}</td>
                  <td>{record.course}</td>
                  <td>{new Date(record.date).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={
                        record.status === "Present"
                          ? "badge bg-success"
                          : "badge bg-danger"
                      }
                    >
                      {record.status}
                    </span>
                  </td>
                  <td>{calculatePercentage(record.student_id)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Attendance Summary */}
      <div className="bg-white shadow-sm rounded p-4 mt-4">
        <h5>Attendance Summary by Student</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Attendance %</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {uniqueStudentIds.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center">
                  No attendance data
                </td>
              </tr>
            ) : (
              uniqueStudentIds.map((studentId) => {
                const percentage = parseFloat(calculatePercentage(studentId));
                const student = students.find((s) => s.student_id === studentId);

                return (
                  <tr key={studentId}>
                    <td>
                      {student?.name} (ID: {studentId})
                    </td>

                    <td>
                      <div className="progress" style={{ height: "30px" }}>
                        <div
                          className={`progress-bar d-flex align-items-center justify-content-center ${
                            percentage >= 75
                              ? "bg-success"
                              : percentage >= 40
                              ? "bg-warning"
                              : "bg-danger"
                          }`}
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage}%
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          percentage >= 75
                            ? "bg-success"
                            : percentage >= 40
                            ? "bg-warning"
                            : "bg-danger"
                        }`}
                      >
                        {percentage >= 75
                          ? "Good"
                          : percentage >= 40
                          ? "Fair"
                          : "Poor"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default Attendance;