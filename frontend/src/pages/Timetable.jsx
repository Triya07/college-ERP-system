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

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const splitWeekdays = (value) =>
  String(value || "")
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean);

const formatTime = (value) => String(value || "").slice(0, 5);

function Timetable() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "teacher";
  const canDelete = user?.role === "admin";
  const isStudent = user?.role === "student";

  const [entries, setEntries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const fetchEntries = async () => {
    try {
      const endpoint = isStudent ? "/classes" : "/timetable";
      const res = await API.get(endpoint);
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
  }, [canManage, isStudent]);

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

  const scheduleSlots = isStudent
    ? entries.flatMap((item) =>
        splitWeekdays(item.weekdays).map((day) => ({
          id: `${item.class_id}-${day}-${item.start_time}-${item.end_time}`,
          day_of_week: day,
          start_time: item.start_time,
          end_time: item.end_time,
          course_name: item.course_name,
          course_code: item.course_code,
          faculty_name: item.professor_name,
          room_number: item.room,
          session_type: item.class_name || "Class"
        }))
      )
    : entries.map((item) => ({
        id: item.timetable_id,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        course_name: item.course_name,
        course_code: item.course_code,
        faculty_name: item.faculty_name,
        room_number: item.room_number,
        session_type: item.session_type,
        raw: item
      }));

  const timeSlots = [...new Set(
    scheduleSlots.map((item) => `${formatTime(item.start_time)}-${formatTime(item.end_time)}`)
  )].sort((a, b) => a.localeCompare(b));

  const scheduleMatrix = days.map((day) => ({
    day,
    cells: timeSlots.map((timeSlot) => {
      const [start, end] = timeSlot.split("-");
      return scheduleSlots.filter(
        (item) =>
          item.day_of_week === day &&
          formatTime(item.start_time) === start &&
          formatTime(item.end_time) === end
      );
    })
  }));

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
          <strong>{isStudent ? "My Class Timetable" : "Weekly Timetable"}</strong>
        </div>
        <div className="card-body">
          {scheduleSlots.length === 0 ? (
            <div className="text-center text-muted py-4">
              No timetable entries available.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ minWidth: "140px" }}>Day</th>
                    {timeSlots.map((timeSlot) => (
                      <th key={timeSlot} style={{ minWidth: "220px" }}>
                        {timeSlot.replace("-", " - ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scheduleMatrix.map((row) => (
                    <tr key={row.day}>
                      <td className="fw-semibold">{row.day}</td>
                      {row.cells.map((cellItems, index) => (
                        <td key={`${row.day}-${timeSlots[index]}`} className="p-2">
                          {cellItems.length === 0 ? (
                            <div className="text-muted small">-</div>
                          ) : (
                            <div className="d-flex flex-column gap-2">
                              {cellItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="border rounded-3 p-2"
                                  style={{ backgroundColor: "var(--surface-2-bg)" }}
                                >
                                  <div className="fw-semibold">{item.course_name}</div>
                                  <div className="small text-muted">
                                    {item.course_code || item.session_type || "Class"}
                                  </div>
                                  <div className="small">
                                    Room: {item.room_number || "TBD"}
                                  </div>
                                  <div className="small">
                                    Faculty: {item.faculty_name || "Unassigned"}
                                  </div>
                                  {!isStudent && canManage && item.raw && (
                                    <div className="d-flex gap-2 mt-2">
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => startEdit(item.raw)}
                                      >
                                        Edit
                                      </button>
                                      {canDelete && (
                                        <button
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() => removeEntry(item.raw.timetable_id)}
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      ))}
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

export default Timetable;
