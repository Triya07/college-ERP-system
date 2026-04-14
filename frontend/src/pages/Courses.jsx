import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

function Courses() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [courses, setCourses] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [formData, setFormData] = useState({
    course_name: "",
    department: "",
    credits: "4",
    faculty_id: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await API.get("/courses");
      setCourses(response.data);
      setError("");
    } catch (err) {
      console.log(err);
      setError("Could not load courses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const response = await API.get("/admin/faculty");
      setFacultyList(response.data || []);
    } catch (err) {
      console.log(err);
      setError("Could not load faculty list.");
    }
  };

  useEffect(() => {
    fetchCourses();
    if (isAdmin) {
      fetchFaculty();
    }
  }, [isAdmin]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData({
      course_name: "",
      department: "",
      credits: "4",
      faculty_id: ""
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (editingId) {
        await API.put(`/courses/${editingId}`, formData);
      } else {
        await API.post("/courses", formData);
      }

      resetForm();
      fetchCourses();
    } catch (err) {
      console.error("course save error", err);
      const msg = err.response?.data || err.message || "Could not save course.";
      setError(msg);
    }
  };

  const handleEdit = (course) => {
    setEditingId(course.course_id);
    setFormData({
      course_name: course.course_name || "",
      department: course.department || "",
      credits: course.credits !== undefined && course.credits !== null ? String(course.credits) : "4",
      faculty_id: course.faculty_id ? String(course.faculty_id) : ""
    });
  };

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm("Delete this course record?");
    if (!shouldDelete) return;

    try {
      setError("");
      await API.delete(`/courses/${id}`);
      fetchCourses();
    } catch (err) {
      console.error("course delete error", err);
      const msg = err.response?.data || err.message || "Could not delete course.";
      setError(msg);
    }
  };

  return (
    <div>
      <h2 className="mb-4">{isAdmin ? "Course & Faculty Management" : "My Assigned Courses"}</h2>

      {/* Add Course Form */}
      {isAdmin && (
        <div className="bg-white shadow-sm rounded p-4 mb-4">
          <h5>{editingId ? "Edit Course" : "Add New Course"}</h5>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <input
                  type="text"
                  name="course_name"
                  placeholder="Course Name"
                  className="form-control"
                  value={formData.course_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <input
                  type="text"
                  name="department"
                  placeholder="Department"
                  className="form-control"
                  value={formData.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <input
                  type="number"
                  name="credits"
                  min="1"
                  max="20"
                  placeholder="Credits"
                  className="form-control"
                  value={formData.credits}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <select
                  name="faculty_id"
                  className="form-select"
                  value={formData.faculty_id}
                  onChange={handleChange}
                >
                  <option value="">Unassigned Faculty</option>
                  {facultyList.map((faculty) => (
                    <option key={faculty.faculty_id} value={faculty.faculty_id}>
                      {faculty.name} {faculty.department ? `(${faculty.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button type="submit" className="btn btn-success">
                {editingId ? "Update Course" : "Add Course"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Course Table */}
      <div className="bg-white shadow-sm rounded p-4">
        <h5>Course List</h5>

        {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Course Name</th>
              <th>Department</th>
              <th>Credits</th>
              <th>Assigned Faculty</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && courses.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? "6" : "5"} className="text-center">
                  {isAdmin ? "No courses found." : "No courses assigned to you yet."}
                </td>
              </tr>
            )}

            {courses.map((course) => (
              <tr key={course.course_id}>
                <td>{course.course_id}</td>
                <td>{course.course_name}</td>
                <td>{course.department}</td>
                <td>{course.credits ?? "-"}</td>
                <td>{course.faculty_name || "Unassigned"}</td>
                {isAdmin && (
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleEdit(course)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(course.course_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Courses;
