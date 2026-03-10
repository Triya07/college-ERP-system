import React, { useEffect, useState } from "react";
import API from "../services/api";

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

  useEffect(() => {
    fetchStudents();
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
      if (editingId) {
        await API.put(`/students/${editingId}`, formData);
      } else {
        await API.post("/students", formData);
      }

      resetForm();
      fetchStudents();
    } catch (err) {
      console.log(err);
      setError("Could not save student.");
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
      await API.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      console.log(err);
      setError("Could not delete student.");
    }
  };

  return (
    <div>
      <h2 className="mb-4">Student Management</h2>

      <div className="bg-white shadow-sm rounded p-4 mb-4">
        <h5>{editingId ? "Edit Student" : "Add Student"}</h5>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <input
                type="text"
                name="name"
                placeholder="Student Name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-4">
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

            <div className="col-md-4">
              <input
                type="number"
                name="year"
                placeholder="Year"
                className="form-control"
                value={formData.year}
                onChange={handleChange}
                required
                min="1"
              />
            </div>

            <div className="col-md-6">
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-6">
              <input
                type="text"
                name="phone"
                placeholder="Phone Number"
                className="form-control"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="d-flex gap-2 mt-3">
            <button type="submit" className="btn btn-success">
              {editingId ? "Update Student" : "Add Student"}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white shadow-sm rounded p-4">
        <h5>Student List</h5>

        {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}

        <table className="table table-bordered mt-3">
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
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center">
                  No students found.
                </td>
              </tr>
            )}

            {students.map((student) => (
              <tr key={student.student_id}>
                <td>{student.student_id}</td>
                <td>{student.name}</td>
                <td>{student.department}</td>
                <td>{student.year}</td>
                <td>{student.email}</td>
                <td>{student.phone}</td>
                <td>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(student)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(student.student_id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Students;
