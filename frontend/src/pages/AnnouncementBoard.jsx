import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  title: "",
  content: "",
  priority: "Normal",
  expires_at: "",
  is_active: true
};

function AnnouncementBoard() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "teacher";

  const [announcements, setAnnouncements] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const fetchAnnouncements = async () => {
    try {
      const res = await API.get("/announcements");
      setAnnouncements(res.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load announcements.");
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/announcements/${editingId}`, formData);
      } else {
        await API.post("/announcements", formData);
      }
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save announcement.");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.announcement_id);
    setFormData({
      title: item.title || "",
      content: item.content || "",
      priority: item.priority || "Normal",
      expires_at: item.expires_at ? new Date(item.expires_at).toISOString().slice(0, 10) : "",
      is_active: !!item.is_active
    });
  };

  const removeItem = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await API.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete announcement.");
    }
  };

  return (
    <div>
      <h2 className="mb-4">Notice / Announcement Board</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {canManage && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-success-subtle">
            {editingId ? "Edit Announcement" : "Post Announcement"}
          </div>
          <div className="card-body">
            <form onSubmit={submitForm}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Expires On</label>
                  <input
                    type="date"
                    className="form-control"
                    name="expires_at"
                    value={formData.expires_at}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-12 form-check ms-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  <label className="form-check-label" htmlFor="is_active">
                    Active announcement
                  </label>
                </div>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-success" type="submit">
                  {editingId ? "Update" : "Post"}
                </button>
                {editingId && (
                  <button className="btn btn-secondary" type="button" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row g-3">
        {announcements.length === 0 && (
          <div className="col-12">
            <div className="alert alert-info mb-0">No announcements available.</div>
          </div>
        )}

        {announcements.map((item) => (
          <div className="col-md-6" key={item.announcement_id}>
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <h5 className="card-title mb-0">{item.title}</h5>
                  <span
                    className={`badge ${
                      item.priority === "Critical"
                        ? "bg-danger"
                        : item.priority === "High"
                        ? "bg-warning text-dark"
                        : item.priority === "Low"
                        ? "bg-secondary"
                        : "bg-primary"
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
                <p className="card-text text-muted">{item.content}</p>
                <small className="text-muted d-block">
                  Posted: {new Date(item.created_at).toLocaleString()}
                </small>
                <small className="text-muted d-block">
                  Expires: {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "No expiry"}
                </small>
                {!item.is_active && <span className="badge bg-dark mt-2">Inactive</span>}
              </div>
              {canManage && (
                <div className="card-footer bg-white border-0 pt-0">
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(item.announcement_id)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnnouncementBoard;
