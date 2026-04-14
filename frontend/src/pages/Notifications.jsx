import React, { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  title: "",
  message: "",
  category: "General",
  target_role: "all"
};

function Notifications() {
  const { user } = useAuth();
  const canSend = user?.role === "admin" || user?.role === "teacher";

  const [notifications, setNotifications] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load notifications.");
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {
      // Ignore single action failures quietly.
    }
  };

  const sendNotification = async (e) => {
    e.preventDefault();
    try {
      await API.post("/notifications", formData);
      setFormData(initialForm);
      fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Could not send notification.");
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Notifications</h2>
        <span className="badge bg-danger fs-6">Unread: {unreadCount}</span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {canSend && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-info-subtle">Send Notification</div>
          <div className="card-body">
            <form onSubmit={sendNotification}>
              <div className="row g-3">
                <div className="col-md-5">
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
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="General">General</option>
                    <option value="Academic">Academic</option>
                    <option value="Fees">Fees</option>
                    <option value="Exam">Exam</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Target Group</label>
                  <select
                    className="form-select"
                    name="target_role"
                    value={formData.target_role}
                    onChange={handleChange}
                  >
                    <option value="all">All Users</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
                <div className="col-md-12">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    name="message"
                    rows="3"
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary mt-3">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-light">
          <strong>Inbox</strong>
        </div>
        <ul className="list-group list-group-flush">
          {notifications.length === 0 && (
            <li className="list-group-item text-center py-4">No notifications yet.</li>
          )}

          {notifications.map((item) => (
            <li key={item.notification_id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="mb-1">{item.title}</h6>
                    <span className="badge bg-secondary">{item.category}</span>
                    {!item.is_read && <span className="badge bg-danger">New</span>}
                  </div>
                  <p className="mb-1 text-muted">{item.message}</p>
                  <small className="text-muted">{new Date(item.created_at).toLocaleString()}</small>
                </div>
                {!item.is_read && (
                  <button className="btn btn-sm btn-outline-primary" onClick={() => markAsRead(item.notification_id)}>
                    Mark Read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Notifications;
