import React, { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Notifications.css";

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

  const categoryClass = (category) => {
    const value = String(category || "General").toLowerCase();
    if (value === "urgent") return "notif-tag urgent";
    if (value === "fees") return "notif-tag fees";
    if (value === "exam") return "notif-tag exam";
    if (value === "academic") return "notif-tag academic";
    return "notif-tag general";
  };

  return (
    <div className="notifications-page">
      <div className="notifications-hero">
        <div>
          <h2 className="mb-1">Notifications</h2>
          <p className="notifications-subtitle mb-0">Updates, reminders, and alerts in one place.</p>
        </div>
        <span className="notifications-unread-pill">Unread: {unreadCount}</span>
      </div>

      {error && <div className="alert alert-danger notifications-error">{error}</div>}

      {canSend && (
        <div className="card shadow-sm border-0 mb-4 notifications-compose-card">
          <div className="card-header notifications-compose-header">Send Notification</div>
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
              <button type="submit" className="btn btn-primary mt-3 notifications-send-btn">
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0 notifications-inbox-card">
        <div className="card-header notifications-inbox-header">
          <strong>Inbox</strong>
        </div>
        <ul className="list-group list-group-flush notifications-list">
          {notifications.length === 0 && (
            <li className="list-group-item text-center py-4 notifications-empty">No notifications yet.</li>
          )}

          {notifications.map((item) => (
            <li key={item.notification_id} className={`list-group-item notifications-item ${item.is_read ? "is-read" : "is-unread"}`}>
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <h6 className="mb-0 notifications-title">{item.title}</h6>
                    <span className={categoryClass(item.category)}>{item.category}</span>
                    {!item.is_read && <span className="notif-tag new">New</span>}
                  </div>
                  <p className="mb-1 notifications-message">{item.message}</p>
                  <small className="notifications-time">{new Date(item.created_at).toLocaleString()}</small>
                </div>
                {!item.is_read && (
                  <button className="btn btn-sm btn-outline-primary notifications-read-btn" onClick={() => markAsRead(item.notification_id)}>
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
