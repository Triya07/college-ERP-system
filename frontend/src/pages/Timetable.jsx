import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  day_of_week: "Monday",
  start_time: "09:00",
  end_time: "10:00",
  course_id: "",
  faculty_id: "",
  room_number: "",
  session_type: "Lecture"
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Timetable() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "teacher";
  const canDelete = user?.role === "admin";

  const [entries, setEntries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const fetchEntries = async () => {
    try {
      const res = await API.get("/timetable");
      setEntries(res.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load timetable.");
    }
  };

  const fetchMeta = async () => {
    try {
      const [courseRes, facultyRes] = await Promise.all([
        API.get("/courses"),
        API.get("/admin/faculty")
      ]);
      setCourses(courseRes.data || []);
      setFaculty(facultyRes.data || []);
    } catch {
      // Non-blocking for read-only timetable view.
    }
  };

  useEffect(() => {
    fetchEntries();
    if (canManage) {
      fetchMeta();
    }
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/timetable/${editingId}`, formData);
      } else {
        await API.post("/timetable", formData);
      }
      resetForm();
      fetchEntries();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save timetable entry.");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.timetable_id);
    setFormData({
      day_of_week: item.day_of_week,
      start_time: String(item.start_time || "").slice(0, 5),
      end_time: String(item.end_time || "").slice(0, 5),
      course_id: String(item.course_id || ""),
      faculty_id: item.faculty_id ? String(item.faculty_id) : "",
      room_number: item.room_number || "",
      session_type: item.session_type || "Lecture"
    });
  };

  const removeEntry = async (id) => {
    if (!window.confirm("Delete this timetable entry?")) return;
    try {
      await API.delete(`/timetable/${id}`);
      fetchEntries();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete entry.");
    }
  };

  return (
    <div>
      <h2 className="mb-4">Timetable</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {canManage && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-primary text-white">
            {editingId ? "Edit Timetable Slot" : "Add Timetable Slot"}
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Day</label>
                  <select
                    className="form-select"
                    name="day_of_week"
                    value={formData.day_of_week}
                    onChange={handleChange}
                  >
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2">
                  <label className="form-label">Start</label>
                  <input
                    type="time"
                    className="form-control"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label">End</label>
                  <input
                    type="time"
                    className="form-control"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-5">
                  <label className="form-label">Course</label>
                  <select
                    className="form-select"
                    name="course_id"
                    value={formData.course_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.course_id} value={course.course_id}>
                        {course.course_name} {course.course_code ? `(${course.course_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Faculty</label>
                  <select
                    className="form-select"
                    name="faculty_id"
                    value={formData.faculty_id}
                    onChange={handleChange}
                  >
                    <option value="">Unassigned</option>
                    {faculty.map((item) => (
                      <option key={item.faculty_id} value={item.faculty_id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label">Room</label>
                  <input
                    type="text"
                    className="form-control"
                    name="room_number"
                    value={formData.room_number}
                    onChange={handleChange}
                    placeholder="A-204"
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Session Type</label>
                  <select
                    className="form-select"
                    name="session_type"
                    value={formData.session_type}
                    onChange={handleChange}
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Lab</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Seminar">Seminar</option>
                  </select>
                </div>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary" type="submit">
                  {editingId ? "Update Slot" : "Add Slot"}
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

      <div className="card shadow-sm border-0">
        <div className="card-header bg-light">
          <strong>Weekly Timetable</strong>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped mb-0">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Course</th>
                  <th>Faculty</th>
                  <th>Room</th>
                  <th>Type</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} className="text-center py-4">
                      No timetable entries available.
                    </td>
                  </tr>
                )}
                {entries.map((item) => (
                  <tr key={item.timetable_id}>
                    <td>{item.day_of_week}</td>
                    <td>
                      {String(item.start_time || "").slice(0, 5)} - {String(item.end_time || "").slice(0, 5)}
                    </td>
                    <td>{item.course_name}</td>
                    <td>{item.faculty_name || "Unassigned"}</td>
                    <td>{item.room_number || "-"}</td>
                    <td>{item.session_type}</td>
                    {canManage && (
                      <td>
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(item)}>
                          Edit
                        </button>
                        {canDelete && (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeEntry(item.timetable_id)}>
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timetable;
