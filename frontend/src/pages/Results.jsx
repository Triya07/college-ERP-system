import React, { useState, useEffect } from "react";
import API from "../services/api";

function Results() {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    student_id: "",
    course_id: "",
    marks_obtained: "",
    total_marks: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResults();
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await API.get("/results");
      setResults(response.data);
      setError("");
    } catch (err) {
      console.log("Error fetching results:", err);
      setError("Could not load results");
    } finally {
      setLoading(false);
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

  const resetForm = () => {
    setFormData({
      student_id: "",
      course_id: "",
      marks_obtained: "",
      total_marks: ""
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (editingId) {
        await API.put(`/results/${editingId}`, formData);
      } else {
        await API.post("/results", formData);
      }

      resetForm();
      fetchResults();
    } catch (err) {
      console.error("result save error", err);
      const msg = err.response?.data || err.message || "Could not save result";
      setError(msg);
    }
  };

  const handleEdit = (result) => {
    setEditingId(result.result_id);
    setFormData({
      student_id: result.student_id,
      course_id: result.course_id,
      marks_obtained: result.marks_obtained,
      total_marks: result.total_marks
    });
  };

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm("Delete this result record?");
    if (!shouldDelete) return;

    try {
      setError("");
      await API.delete(`/results/${id}`);
      fetchResults();
    } catch (err) {
      console.error("result delete error", err);
      const msg = err.response?.data || err.message || "Could not delete result";
      setError(msg);
    }
  };

  return (
    <div>
      <h2 className="mb-4">Examination & Results</h2>

      {/* Add Result Form */}
      <div className="bg-white shadow-sm rounded p-4 mb-4">
        <h5>{editingId ? "Edit Result" : "Add Exam Result"}</h5>

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
                    {student.name}
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
                type="number"
                name="marks_obtained"
                placeholder="Marks Obtained"
                className="form-control"
                value={formData.marks_obtained}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <input
                type="number"
                name="total_marks"
                placeholder="Total Marks"
                className="form-control"
                value={formData.total_marks}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="d-flex gap-2 mt-3">
            <button type="submit" className="btn btn-danger">
              {editingId ? "Update Result" : "Add Result"}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow-sm rounded p-4">
        <h5>Results List</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Course</th>
              <th>Marks</th>
              <th>Total</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center">
                  Loading...
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">
                  No results found
                </td>
              </tr>
            ) : (
              results.map((result) => {
                const percentage = (
                  (result.marks_obtained / result.total_marks) *
                  100
                ).toFixed(2);

                let grade = "";
                if (percentage >= 90) grade = "A";
                else if (percentage >= 80) grade = "B";
                else if (percentage >= 70) grade = "C";
                else if (percentage >= 60) grade = "D";
                else grade = "F";

                return (
                  <tr key={result.result_id}>
                    <td>{result.result_id}</td>
                    <td>{result.student_name}</td>
                    <td>{result.course_name}</td>
                    <td>{result.marks_obtained}</td>
                    <td>{result.total_marks}</td>
                    <td>{percentage}%</td>
                    <td>
                      <span
                        className={`badge ${
                          grade === "A"
                            ? "bg-success"
                            : grade === "B"
                            ? "bg-info"
                            : grade === "C"
                            ? "bg-warning"
                            : grade === "D"
                            ? "bg-warning"
                            : "bg-danger"
                        }`}
                      >
                        {grade}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(result)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(result.result_id)}
                        >
                          Delete
                        </button>
                      </div>
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

export default Results;
