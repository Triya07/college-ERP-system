import React, { useState, useEffect, useCallback } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ATTENDANCE_TARGET_PERCENTAGE,
  buildCourseAttendanceInsights,
  calculateRecoveryPlan
} from "../services/attendanceInsights";

function Attendance() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    student_id: "",
    course_id: "",
    date: "",
    status: "Present"
  });
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    student_id: "",
    course_id: "",
    status: "",
    date: "",
    from_date: "",
    to_date: ""
  });

  const fetchAttendance = useCallback(async () => {
    try {
      const endpoint = isStudent ? "/attendance/student/me" : "/attendance";
      const response = await API.get(endpoint, { params: isStudent ? {} : filters });
      setAttendanceRecords(response.data);
      setError("");
    } catch (err) {
      console.log("Error fetching attendance:", err);
      setError("Could not load attendance records");
    }
  }, [filters, isStudent]);

  // Fetch all data on mount
  useEffect(() => {
    fetchAttendance();
    if (!isStudent) {
      fetchStudents();
      fetchCourses();
    }
  }, [fetchAttendance, isStudent]);

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

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const applyFilters = async (e) => {
    e.preventDefault();
    await fetchAttendance();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (editingAttendanceId) {
        await API.put(`/attendance/${editingAttendanceId}`, formData);
      } else {
        await API.post("/attendance", formData);
      }

      // Reset form
      setFormData({
        student_id: "",
        course_id: "",
        date: "",
        status: "Present"
      });
      setEditingAttendanceId(null);

      // Refresh attendance records
      await fetchAttendance();
    } catch (err) {
      console.error("attendance error", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Could not save attendance";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAttendance = (record) => {
    setEditingAttendanceId(record.attendance_id);
    setFormData({
      student_id: String(record.student_id || ""),
      course_id: String(record.course_id || ""),
      date: String(record.date || record.attendance_date || "").slice(0, 10),
      status: record.status || "Present"
    });
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingAttendanceId(null);
    setFormData({
      student_id: "",
      course_id: "",
      date: "",
      status: "Present"
    });
    setError("");
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

  const calculateCoursePercentage = (studentId, courseId) => {
    const courseData = attendanceRecords.filter(
      (rec) =>
        rec.student_id === parseInt(studentId) &&
        rec.course_id === parseInt(courseId)
    );

    const total = courseData.length;
    const presentCount = courseData.filter((rec) => rec.status === "Present").length;

    if (total === 0) return "0.00";
    return ((presentCount / total) * 100).toFixed(2);
  };

  // Get unique students from attendance records
  const uniqueStudentIds = [
    ...new Set(attendanceRecords.map((rec) => rec.student_id))
  ];

  const studentCourseInsights = isStudent
    ? buildCourseAttendanceInsights(attendanceRecords, ATTENDANCE_TARGET_PERCENTAGE)
    : [];

  const studentOverallInsight = isStudent
    ? calculateRecoveryPlan({
        present: attendanceRecords.filter((rec) => rec.status === "Present").length,
        total: attendanceRecords.length,
        targetPercentage: ATTENDANCE_TARGET_PERCENTAGE
      })
    : null;

  return (
    <div>
      <h2 className="mb-4">Attendance Management</h2>

      {/* Mark Attendance Form */}
      {!isStudent && (
        <div className="bg-white shadow-sm rounded p-4 mb-4">
          <h5>Filters</h5>
          <form onSubmit={applyFilters}>
            <div className="row g-2">
              <div className="col-md-2">
                <select name="student_id" className="form-select" value={filters.student_id} onChange={handleFilterChange}>
                  <option value="">All Students</option>
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>{student.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select name="course_id" className="form-select" value={filters.course_id} onChange={handleFilterChange}>
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>{course.course_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select name="status" className="form-select" value={filters.status} onChange={handleFilterChange}>
                  <option value="">Any Status</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <div className="col-md-2">
                <input type="date" name="date" className="form-control" value={filters.date} onChange={handleFilterChange} />
              </div>
              <div className="col-md-2">
                <input type="date" name="from_date" className="form-control" value={filters.from_date} onChange={handleFilterChange} />
              </div>
              <div className="col-md-2">
                <input type="date" name="to_date" className="form-control" value={filters.to_date} onChange={handleFilterChange} />
              </div>
            </div>
            <button className="btn btn-outline-primary mt-3" type="submit">Apply Filters</button>
          </form>
        </div>
      )}

      {!isStudent && (
        <div className="bg-white shadow-sm rounded p-4 mb-4">
          <h5>{editingAttendanceId ? "Edit Attendance" : "Mark Attendance"}</h5>

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

            <button type="submit" className="btn btn-warning mt-3 me-2" disabled={loading}>
              {loading ? "Saving..." : editingAttendanceId ? "Update Attendance" : "Mark Attendance"}
            </button>

            {editingAttendanceId && (
              <button type="button" className="btn btn-outline-secondary mt-3" onClick={handleCancelEdit} disabled={loading}>
                Cancel Edit
              </button>
            )}
          </form>
        </div>
      )}

      {isStudent && (
        <div className="bg-white shadow-sm rounded p-4 mb-4">
          <h5>This Month Attendance Calendar</h5>
          <p className="text-muted mb-2">Green = present, Red = absent, Yellow = mixed.</p>

          <div className="attendance-calendar-grid">
            {(() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const leading = (firstDay + 6) % 7;
              const cells = [];

              for (let i = 0; i < leading; i += 1) {
                cells.push(<div key={`e-${i}`} className="attendance-calendar-cell empty" />);
              }

              for (let day = 1; day <= daysInMonth; day += 1) {
                const dateObj = new Date(year, month, day);
                const key = dateObj.toISOString().slice(0, 10);
                const records = attendanceRecords.filter((item) => String(item.attendance_date).slice(0, 10) === key);
                const presentCount = records.filter((item) => item.status === "Present").length;
                const statusClass =
                  records.length === 0
                    ? "none"
                    : presentCount === records.length
                    ? "present"
                    : presentCount === 0
                    ? "absent"
                    : "mixed";

                const today = new Date();
                const isToday =
                  day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                cells.push(
                  <div key={key} className={`attendance-calendar-cell ${isToday ? "today" : ""}`}>
                    <span className="attendance-day-number">{day}</span>
                    <span className={`attendance-dot ${statusClass}`} />
                  </div>
                );
              }

              return cells;
            })()}
          </div>
        </div>
      )}

      {isStudent && (
        <div className="bg-white shadow-sm rounded p-4 mb-4">
          <h5>Attendance Alerts & Prediction</h5>

          <div className={`alert ${studentOverallInsight?.belowTarget ? "alert-danger" : "alert-success"} mt-3`}>
            {studentOverallInsight?.hasData ? (
              <>
                Overall attendance is <strong>{studentOverallInsight.currentPercentage.toFixed(2)}%</strong>.
                {studentOverallInsight.belowTarget
                  ? ` Attend the next ${studentOverallInsight.classesNeededToReachTarget} classes without absence to recover above ${ATTENDANCE_TARGET_PERCENTAGE}%.`
                  : ` You are above ${ATTENDANCE_TARGET_PERCENTAGE}%. Keep consistency to stay safe.`}
              </>
            ) : (
              <>No attendance records are available yet for prediction.</>
            )}
          </div>

          {studentCourseInsights.length === 0 ? (
            <p className="text-muted mb-0">No course-wise attendance records found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0 mt-3">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Current %</th>
                    <th>Status</th>
                    <th>Prediction</th>
                  </tr>
                </thead>
                <tbody>
                  {studentCourseInsights.map((item) => (
                    <tr key={`insight-${item.course_id}`}>
                      <td>{item.course_name}</td>
                      <td>{item.percentage}%</td>
                      <td>
                        <span className={`badge ${item.analysis.belowTarget ? "bg-danger" : "bg-success"}`}>
                          {item.analysis.belowTarget ? "Below 75%" : "Safe"}
                        </span>
                      </td>
                      <td>{item.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Attendance Records */}
      <div className="bg-white shadow-sm rounded p-4">
        <h5>Attendance Records</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              {!isStudent && <th>Student</th>}
              <th>Course</th>
              <th>Date</th>
              <th>Status</th>
              <th>Percentage</th>
              {!isStudent && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {attendanceRecords.length === 0 ? (
              <tr>
                <td colSpan={isStudent ? "4" : "6"} className="text-center">
                  No attendance records found
                </td>
              </tr>
            ) : (
              attendanceRecords.map((record) => (
                <tr key={record.attendance_id || `${record.student_id}-${record.date || record.attendance_date}-${record.course_id}`}>
                  {!isStudent && <td>{record.student}</td>}
                  <td>{record.course || record.course_name}</td>
                  <td>{new Date(record.date || record.attendance_date).toLocaleDateString()}</td>
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
                  <td>{calculateCoursePercentage(record.student_id, record.course_id)}%</td>
                  {!isStudent && (
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEditAttendance(record)}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Attendance Summary */}
      {!isStudent && <div className="bg-white shadow-sm rounded p-4 mt-4">
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
      }

    </div>
  );
}

export default Attendance;
