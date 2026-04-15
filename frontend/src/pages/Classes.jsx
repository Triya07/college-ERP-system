import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  class_name: "",
  course_id: "",
  professor_id: "",
  semester: "",
  section: "",
  term_start_date: "",
  term_end_date: "",
  weekdays: "Monday,Wednesday,Friday",
  start_time: "",
  end_time: "",
  room: ""
};

function Classes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManage = user?.role === "admin" || user?.role === "teacher";

  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassStudents, setSelectedClassStudents] = useState([]);

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [assignClassId, setAssignClassId] = useState(null);
  const [assignStudentIds, setAssignStudentIds] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [classRes, courseRes] = await Promise.all([API.get("/classes"), API.get("/courses")]);
      setClasses(classRes.data || []);
      setCourses(courseRes.data || []);

      if (isAdmin) {
        const [facultyRes, studentRes] = await Promise.all([API.get("/admin/faculty"), API.get("/students")]);
        setFaculty(facultyRes.data || []);
        setStudents(studentRes.data || []);
      } else {
        const studentRes = await API.get("/students");
        setStudents(studentRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load classes");
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.class_id);
    setFormData({
      class_name: item.class_name || "",
      course_id: item.course_id || "",
      professor_id: item.professor_id || "",
      semester: item.semester || "",
      section: item.section || "",
      term_start_date: String(item.term_start_date || "").slice(0, 10),
      term_end_date: String(item.term_end_date || "").slice(0, 10),
      weekdays: item.weekdays || "",
      start_time: String(item.start_time || "").slice(0, 5),
      end_time: String(item.end_time || "").slice(0, 5),
      room: item.room || ""
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAssignClassId(null);
    setAssignStudentIds([]);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        weekdays: formData.weekdays
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      };

      if (editingId) {
        await API.put(`/classes/${editingId}`, payload);
      } else {
        await API.post("/classes", payload);
      }

      await fetchAll();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save class");
    } finally {
      setLoading(false);
    }
  };

  const removeClass = async (id) => {
    if (!window.confirm("Delete this class?")) return;
    try {
      await API.delete(`/classes/${id}`);
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete class");
    }
  };

  const loadClassStudents = async (classId) => {
    try {
      const res = await API.get(`/classes/${classId}/students`);
      setSelectedClassStudents(res.data || []);
      setAssignClassId(classId);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load class students");
    }
  };

  const assignStudents = async () => {
    if (!assignClassId || !assignStudentIds.length) return;
    try {
      await API.post(`/classes/${assignClassId}/students`, { student_ids: assignStudentIds });
      await loadClassStudents(assignClassId);
      await fetchAll();
      setAssignStudentIds([]);
    } catch (err) {
      setError(err.response?.data?.message || "Could not assign students");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Class Management</h2>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreate}>
            Create Class
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm border-0 mb-4">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Course</th>
                <th>Professor</th>
                <th>Schedule</th>
                <th>Room</th>
                <th>Students</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">No classes found.</td>
                </tr>
              ) : (
                classes.map((item) => (
                  <tr key={item.class_id}>
                    <td>
                      <strong>{item.class_name}</strong>
                      <div className="text-muted small">{item.semester || "-"}/{item.section || "-"}</div>
                    </td>
                    <td>{item.course_name}</td>
                    <td>{item.professor_name || "Unassigned"}</td>
                    <td>
                      <div>{item.weekdays || "-"}</div>
                      <div className="text-muted small">
                        {String(item.start_time || "").slice(0, 5)} - {String(item.end_time || "").slice(0, 5)}
                      </div>
                    </td>
                    <td>{item.room || "-"}</td>
                    <td>{item.total_students || 0}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => loadClassStudents(item.class_id)}>
                        Students
                      </button>
                      {canManage && (
                        <>
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(item)}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeClass(item.class_id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {assignClassId && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span>Class Students</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setAssignClassId(null)}>Close</button>
          </div>
          <div className="card-body">
            {isAdmin && (
              <>
                <label className="form-label">Assign Students</label>
                <select
                  className="form-select"
                  multiple
                  value={assignStudentIds.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                    setAssignStudentIds(values);
                  }}
                  style={{ minHeight: "120px" }}
                >
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.name} ({student.academic_id || student.rollNumber || student.student_id})
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary mt-2" onClick={assignStudents}>Assign Selected</button>
                <hr />
              </>
            )}

            <ul className="list-group">
              {selectedClassStudents.map((student) => (
                <li key={student.student_id} className="list-group-item d-flex justify-content-between">
                  <span>{student.name}</span>
                  <span className="text-muted">{student.academic_id || "-"}</span>
                </li>
              ))}
              {selectedClassStudents.length === 0 && <li className="list-group-item text-muted">No students assigned yet.</li>}
            </ul>
          </div>
        </div>
      )}

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{ background: "rgba(0,0,0,0.4)", zIndex: 1050 }}>
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="card shadow" style={{ width: "min(760px, 95vw)" }}>
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>{editingId ? "Edit Class" : "Create Class"}</strong>
                <button className="btn-close" onClick={closeModal} />
              </div>
              <div className="card-body">
                <form onSubmit={handleSave}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Class Name</label>
                      <input className="form-control" name="class_name" value={formData.class_name} onChange={handleChange} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Course</label>
                      <select className="form-select" name="course_id" value={formData.course_id} onChange={handleChange} required>
                        <option value="">Select course</option>
                        {courses.map((course) => (
                          <option key={course.course_id} value={course.course_id}>{course.course_name}</option>
                        ))}
                      </select>
                    </div>

                    {isAdmin && (
                      <div className="col-md-6">
                        <label className="form-label">Professor</label>
                        <select className="form-select" name="professor_id" value={formData.professor_id} onChange={handleChange}>
                          <option value="">Unassigned</option>
                          {faculty.map((item) => (
                            <option key={item.faculty_id} value={item.faculty_id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="col-md-3">
                      <label className="form-label">Semester</label>
                      <input className="form-control" name="semester" value={formData.semester} onChange={handleChange} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Section</label>
                      <input className="form-control" name="section" value={formData.section} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Weekdays (comma separated)</label>
                      <input className="form-control" name="weekdays" value={formData.weekdays} onChange={handleChange} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Start Time</label>
                      <input type="time" className="form-control" name="start_time" value={formData.start_time} onChange={handleChange} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">End Time</label>
                      <input type="time" className="form-control" name="end_time" value={formData.end_time} onChange={handleChange} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Term Start</label>
                      <input type="date" className="form-control" name="term_start_date" value={formData.term_start_date} onChange={handleChange} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Term End</label>
                      <input type="date" className="form-control" name="term_end_date" value={formData.term_end_date} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Room</label>
                      <input className="form-control" name="room" value={formData.room} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="mt-3 d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Classes;
