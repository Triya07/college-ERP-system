import React, { useEffect, useState } from "react";
import API from "../services/api";

function AcademicSettings() {
  const [departments, setDepartments] = useState("CSE,IT");
  const [semesters, setSemesters] = useState("1,2,3,4,5,6,7,8");
  const [sections, setSections] = useState("A,B,C");
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [eventForm, setEventForm] = useState({
    title: "",
    event_type: "holiday",
    start_date: "",
    end_date: "",
    department: "",
    semester: "",
    section: "",
    notes: ""
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const toCsv = (arr) => (Array.isArray(arr) ? arr.join(",") : "");

  const loadConfig = async () => {
    try {
      const res = await API.get("/academic-config");
      setDepartments(toCsv(res.data.departments));
      setSemesters(toCsv(res.data.semesters));
      setSections(toCsv(res.data.sections));
      setEvents(res.data.events || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load academic configuration");
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await API.put("/academic-config", {
        departments: departments.split(",").map((x) => x.trim()).filter(Boolean),
        semesters: semesters.split(",").map((x) => x.trim()).filter(Boolean),
        sections: sections.split(",").map((x) => x.trim()).filter(Boolean)
      });
      setSuccess("Academic configuration saved");
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save academic configuration");
    }
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await API.post("/academic-events", eventForm);
      setEventForm({
        title: "",
        event_type: "holiday",
        start_date: "",
        end_date: "",
        department: "",
        semester: "",
        section: "",
        notes: ""
      });
      setSuccess("Academic event added");
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add event");
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await API.delete(`/academic-events/${id}`);
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete event");
    }
  };

  return (
    <div>
      <h2 className="mb-4">Academic Settings</h2>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header">Global Academic Configuration</div>
        <div className="card-body">
          <form onSubmit={saveConfig}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Departments (comma separated)</label>
                <input className="form-control" value={departments} onChange={(e) => setDepartments(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Semesters</label>
                <input className="form-control" value={semesters} onChange={(e) => setSemesters(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Sections</label>
                <input className="form-control" value={sections} onChange={(e) => setSections(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary mt-3" type="submit">Save Configuration</button>
          </form>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header">Add Academic Event</div>
        <div className="card-body">
          <form onSubmit={saveEvent}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Title</label>
                <input className="form-control" value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">Type</label>
                <select className="form-select" value={eventForm.event_type} onChange={(e) => setEventForm((p) => ({ ...p, event_type: e.target.value }))}>
                  <option value="holiday">Holiday</option>
                  <option value="exam">Exam</option>
                  <option value="no_class">No Class</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Start</label>
                <input type="date" className="form-control" value={eventForm.start_date} onChange={(e) => setEventForm((p) => ({ ...p, start_date: e.target.value }))} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">End</label>
                <input type="date" className="form-control" value={eventForm.end_date} onChange={(e) => setEventForm((p) => ({ ...p, end_date: e.target.value }))} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">Department</label>
                <input className="form-control" value={eventForm.department} onChange={(e) => setEventForm((p) => ({ ...p, department: e.target.value }))} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Semester</label>
                <input className="form-control" value={eventForm.semester} onChange={(e) => setEventForm((p) => ({ ...p, semester: e.target.value }))} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Section</label>
                <input className="form-control" value={eventForm.section} onChange={(e) => setEventForm((p) => ({ ...p, section: e.target.value }))} />
              </div>
              <div className="col-md-8">
                <label className="form-label">Notes</label>
                <input className="form-control" value={eventForm.notes} onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-success mt-3" type="submit">Add Event</button>
          </form>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header">Academic Events</div>
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Date Range</th>
                <th>Scope</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">No events found.</td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.event_id}>
                    <td>{event.title}</td>
                    <td><span className="badge bg-secondary text-capitalize">{event.event_type}</span></td>
                    <td>{String(event.start_date).slice(0, 10)} to {String(event.end_date).slice(0, 10)}</td>
                    <td>{[event.department, event.semester, event.section].filter(Boolean).join(" / ") || "Global"}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteEvent(event.event_id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AcademicSettings;
