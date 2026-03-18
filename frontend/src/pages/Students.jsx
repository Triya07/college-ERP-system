import React, { useEffect, useState } from "react";
import API from "../services/api";
import { MdAdd, MdEdit, MdDelete, MdBook } from "react-icons/md";

const initialForm = {
  name: "",
  department: "",
  year: "",
  phone: "",
  email: "",
  password: ""
};

function Students() {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

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
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (editingId) {
        // Edit mode - don't allow email/password changes
        await API.put(`/students/${editingId}`, {
          name: formData.name,
          department: formData.department,
          year: formData.year,
          phone: formData.phone
        });
        setSuccess("Student updated successfully!");
      } else {
        // Add mode - require email and password
        if (!formData.email || !formData.password) {
          setError("Email and password are required for new students");
          return;
        }

        await API.post("/students", formData);
        setSuccess("Student added successfully!");
      }

      resetForm();
      setTimeout(() => setSuccess(""), 3000);
      fetchStudents();
    } catch (err) {
      console.error("student save error", err);
      const msg = err.response?.data?.message || err.message || "Could not save student.";
      setError(msg);
    }
  };

  const handleEdit = (student) => {
    setEditingId(student.student_id);
    setFormData({
      name: student.name || "",
      department: student.department || "",
      year: student.year || "",
      phone: student.phone || "",
      email: "",
      password: ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const shouldDelete = window.confirm("Delete this student record and account?");
    if (!shouldDelete) return;

    try {
      setError("");
      await API.delete(`/students/${id}`);
      setSuccess("Student deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
      fetchStudents();
    } catch (err) {
      console.error("student delete error", err);
      const msg = err.response?.data?.message || err.message || "Could not delete student.";
      setError(msg);
    }
  };

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 className="mb-1 fw-bold">
                👥 Student Management
              </h2>
              <p className="mb-0 opacity-75">Add, edit, and manage student records</p>
            </div>
            <button 
              className="btn btn-light btn-lg"
              onClick={() => setShowForm(!showForm)}
            >
              <MdAdd /> {showForm ? "Cancel" : "Add New Student"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>⚠️ Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>✅ Success:</strong> {success}
          <button type="button" className="btn-close" onClick={() => setSuccess("")}></button>
        </div>
      )}

      {showForm && (
        <div className="card shadow-sm mb-4 border-0">
          <div
            className="card-header"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none"
            }}
          >
            <h5 className="mb-0 d-flex align-items-center gap-2" style={{ color: "white" }}>
              <MdAdd fontSize="24" /> {editingId ? "Edit Student" : "Add New Student"}
            </h5>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
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

                <div className="col-md-6">
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

                <div className="col-md-6">
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

                {!editingId && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label">Email Address * (for login)</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="student@example.com"
                        className="form-control"
                        value={formData.email}
                        onChange={handleChange}
                        required={!editingId}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Password * (for login)</label>
                      <input
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        className="form-control"
                        value={formData.password}
                        onChange={handleChange}
                        required={!editingId}
                      />
                    </div>
                  </>
                )}
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
                    <th>Phone</th>
                    <th>Roll Number</th>
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
                      <td>{student.phone}</td>
                      <td>
                        <small className="text-muted">{student.roll_number || "N/A"}</small>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-warning me-2"
                          onClick={() => handleEdit(student)}
                          title="Edit"
                        >
                          <MdEdit size={16} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(student.student_id)}
                          title="Delete"
                        >
                          <MdDelete size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Students;
