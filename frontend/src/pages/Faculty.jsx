import React, { useEffect, useState } from "react";
import API from "../services/api";
import { MdAdd, MdEdit, MdDelete, MdSchool } from "react-icons/md";
import axios from "axios";

const initialForm = {
  name: "",
  email: "",
  password: "",
  department: "",
  phone: "",
  qualification: "",
  experience: 0
};

function Faculty() {
  const [faculty, setFaculty] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3001/admin/faculty", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      setFaculty(response.data);
      setError("");
    } catch (err) {
      console.log(err);
      setError("Could not load faculty members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
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
        // Edit existing faculty - not yet implemented on backend
        setError("Edit functionality coming soon");
      } else {
        // Add new faculty
        if (!formData.email || !formData.password || !formData.name) {
          setError("Email, password, and name are required");
          return;
        }

        await axios.post(
          "http://localhost:3001/admin/faculty",
          {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            department: formData.department,
            phone: formData.phone,
            qualification: formData.qualification,
            experience: parseInt(formData.experience) || 0
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        setSuccess("Faculty member added successfully!");
        resetForm();
        setTimeout(() => setSuccess(""), 3000);
        fetchFaculty();
      }
    } catch (err) {
      console.error("Faculty save error", err);
      const msg = err.response?.data?.message || err.message || "Could not save faculty.";
      setError(msg);
    }
  };

  const handleEdit = (member) => {
    setEditingId(member.faculty_id);
    setFormData({
      name: member.name,
      email: member.email,
      password: "",
      department: member.department || "",
      phone: member.phone || "",
      qualification: member.qualification || "",
      experience: member.experience || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this faculty member?")) {
      try {
        await axios.delete(`http://localhost:3001/admin/faculty/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        });
        setSuccess("Faculty member deleted successfully!");
        setTimeout(() => setSuccess(""), 3000);
        fetchFaculty();
      } catch (err) {
        console.error("Delete error", err);
        setError("Could not delete faculty member.");
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Faculty Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <MdAdd size={20} /> {showForm ? "Cancel" : "Add Faculty Member"}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Form */}
      {showForm && (
        <div className="form-section">
          <h2>{editingId ? "Edit Faculty Member" : "Add New Faculty Member"}</h2>
          <form onSubmit={handleSubmit} className="data-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Dr. John Doe"
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@college.edu"
                  required
                  disabled={editingId}
                  className="form-control"
                />
              </div>

              {!editingId && (
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="form-control"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Computer Science"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Qualification</label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="PhD in Computer Science"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Years of Experience</label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="5"
                  min="0"
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingId ? "Update Faculty" : "Add Faculty"}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Faculty List */}
      <div className="data-section">
        <h2>Faculty Members</h2>
        {loading ? (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : faculty.length === 0 ? (
          <div className="empty-state">
            <MdSchool size={50} />
            <p>No faculty members found. Add one to get started!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Qualification</th>
                  <th>Experience</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((member) => (
                  <tr key={member.faculty_id}>
                    <td><strong>{member.name}</strong></td>
                    <td>{member.email || "N/A"}</td>
                    <td>{member.department || "N/A"}</td>
                    <td>{member.phone || "N/A"}</td>
                    <td>{member.qualification || "N/A"}</td>
                    <td>{member.experience || 0} years</td>
                    <td>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handleEdit(member)}
                        title="Edit"
                      >
                        <MdEdit size={16} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(member.faculty_id)}
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
  );
}

export default Faculty;
