import React, { useEffect, useState } from "react";
import API from "../services/api";
import { MdAdd, MdEdit, MdDelete, MdBook } from "react-icons/md";

const initialForm = {
  name: "",
  department: "",
  year: "",
  email: "",
  phone: ""
};

function Students() {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);
  const [selectedStudentForCourse, setSelectedStudentForCourse] = useState(null);
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await API.get("/students");
      setStudents(response.data);
      setError("");
    } catch (err) {
      console.log(err);
      setError("Could not load students.");
    } finally {
      setLoading(false);
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

  const fetchStudentCourses = async (studentId) => {
    try {
      setEnrollmentLoading(true);
      const response = await API.get(`/students/${studentId}/courses`);
      setStudentCourses(response.data);
    } catch (err) {
      console.log("Error fetching student courses:", err);
      setStudentCourses([]);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (editingId) {
        await API.put(`/students/${editingId}`, formData);
      } else {
        await API.post("/students", formData);
      }

      resetForm();
      fetchStudents();
    } catch (err) {
      console.error("student save error", err);
      const msg = err.response?.data || err.message || "Could not save student.";
      setError(msg);
    }
  };

  const handleEdit = (student) => {
    setEditingId(student.student_id);
    setFormData({
      name: student.name || "",
      department: student.department || "",
      year: student.year || "",
      email: student.email || "",
      phone: student.phone || ""
    });
  };

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm("Delete this student record?");
    if (!shouldDelete) return;

    try {
      setError("");
      await API.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      console.error("student delete error", err);
      const msg = err.response?.data || err.message || "Could not delete student.";
      setError(msg);
    }
  };

  const handleManageCourses = (student) => {
    setSelectedStudentForCourse(student);
    setSelectedCourse("");
    fetchStudentCourses(student.student_id);
  };

  const handleEnrollCourse = async () => {
    if (!selectedCourse) {
      alert("Please select a course");
      return;
    }

    try {
      setEnrollmentLoading(true);
      await API.post(`/students/${selectedStudentForCourse.student_id}/courses`, {
        course_id: selectedCourse
      });
      setSelectedCourse("");
      fetchStudentCourses(selectedStudentForCourse.student_id);
    } catch (err) {
      console.error("enrollment error", err);
      alert(err.response?.data || "Could not enroll in course");
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleUnenrollCourse = async (courseId) => {
    const shouldUnenroll = window.confirm("Remove this course enrollment?");
    if (!shouldUnenroll) return;

    try {
      setEnrollmentLoading(true);
      await API.delete(`/students/${selectedStudentForCourse.student_id}/courses/${courseId}`);
      fetchStudentCourses(selectedStudentForCourse.student_id);
    } catch (err) {
      console.error("unenrollment error", err);
      alert(err.response?.data || "Could not remove course enrollment");
    } finally {
      setEnrollmentLoading(false);
    }
  };

  // Get available courses (not already enrolled)
  const availableCourses = courses.filter(
    (course) => !studentCourses.some((sc) => sc.course_id === course.course_id)
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
          <h2 className="mb-1 fw-bold">
            👥 Student Management
          </h2>
          <p className="mb-0 opacity-75">Add, edit, and manage student records</p>
        </div>
      </div>

      <div className="card shadow-sm mb-4 border-0">
        <div
          className="card-header"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none"
          }}
        >
          <h5 className="mb-0 d-flex align-items-center gap-2" style={{ color: "white" }}>
            <MdAdd fontSize="24" />
            {editingId ? "Edit Student Record" : "Add New Student"}
          </h5>
        </div>

        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Student Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter student name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Department *</label>
                <input
                  type="text"
                  name="department"
                  placeholder="e.g., Computer Science"
                  className="form-control"
                  value={formData.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Year *</label>
                <input
                  type="number"
                  name="year"
                  placeholder="1-4"
                  className="form-control"
                  value={formData.year}
                  onChange={handleChange}
                  required
                  min="1"
                  max="4"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="student@example.com"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Phone Number *</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+1 (555) 000-0000"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                <MdAdd /> {editingId ? "Update Student" : "Add Student"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>⚠️ Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div
          className="card-header"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none"
          }}
        >
          <h5 className="mb-0" style={{ color: "white" }}>
            📋 Student Records {students.length > 0 && `(${students.length})`}
          </h5>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="alert alert-info m-4" role="alert">
              ℹ️ No students found. Add your first student above.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.student_id}>
                      <td>
                        <span
                          className="badge"
                          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                        >
                          {student.student_id}
                        </span>
                      </td>
                      <td className="fw-bold">{student.name}</td>
                      <td>{student.department}</td>
                      <td>
                        <span className="badge bg-info">{student.year}</span>
                      </td>
                      <td>{student.email}</td>
                      <td>{student.phone}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleEdit(student)}
                            title="Edit"
                          >
                            <MdEdit />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-info"
                            onClick={() => handleManageCourses(student)}
                            data-bs-toggle="modal"
                            data-bs-target="#courseModal"
                            title="Manage Courses"
                          >
                            <MdBook />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(student.student_id)}
                            title="Delete"
                          >
                            <MdDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Course Management Modal */}
      <div className="modal fade" id="courseModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", border: "none" }}>
              <h5 className="modal-title fw-bold">
                <MdBook className="me-2" />
                Manage Courses - {selectedStudentForCourse?.name}
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body p-4">
              {/* Enrolled Courses */}
              <h6 className="mb-3 fw-bold">✅ Enrolled Courses</h6>
              {enrollmentLoading ? (
                <p className="text-muted text-center py-3">Loading...</p>
              ) : studentCourses.length > 0 ? (
                <div className="list-group mb-4">
                  {studentCourses.map((course) => (
                    <div key={course.course_id} className="list-group-item d-flex justify-content-between align-items-center" style={{ borderRadius: "8px", marginBottom: "0.5rem" }}>
                      <div>
                        <h6 className="mb-1 fw-bold">{course.course_name}</h6>
                        <small className="text-muted">{course.department}</small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleUnenrollCourse(course.course_id)}
                        disabled={enrollmentLoading}
                      >
                        <MdDelete />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-4 text-center py-2">No courses enrolled yet</p>
              )}

              {/* Enroll in New Course */}
              <h6 className="mb-3 fw-bold">➕ Enroll in Course</h6>
              <div className="input-group mb-3">
                <select
                  className="form-select"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  disabled={enrollmentLoading}
                >
                  <option value="">Select a course...</option>
                  {availableCourses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_name} ({course.department})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleEnrollCourse}
                  disabled={enrollmentLoading || !selectedCourse}
                >
                  Enroll
                </button>
              </div>

              {availableCourses.length === 0 && studentCourses.length > 0 && (
                <p className="text-muted small text-center">✓ All available courses are already enrolled</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Students;
