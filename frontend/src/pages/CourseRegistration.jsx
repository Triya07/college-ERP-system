import React, { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

function CourseRegistration() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const canReview = user?.role === "admin" || user?.role === "teacher";

  const [availableCourses, setAvailableCourses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [studentNote, setStudentNote] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});
  const [error, setError] = useState("");
  const [showBacklogOnly, setShowBacklogOnly] = useState(false);

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "Pending").length,
    [requests]
  );

  const requestableCourses = useMemo(() => {
    const base = availableCourses.filter(
      (course) => !course.is_enrolled && !course.pending_request_id && course.can_request
    );

    if (!showBacklogOnly) return base;
    return base.filter((course) => course.registration_type === "Backlog");
  }, [availableCourses, showBacklogOnly]);

  const fetchRequests = async () => {
    try {
      const res = await API.get("/course-registration");
      setRequests(res.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load course registration requests.");
    }
  };

  const fetchAvailable = async () => {
    if (!isStudent) return;
    try {
      const res = await API.get("/course-registration/available");
      setAvailableCourses(res.data || []);
    } catch {
      setAvailableCourses([]);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchAvailable();
  }, []);

  const requestCourse = async (e) => {
    e.preventDefault();
    try {
      await API.post("/course-registration", {
        course_id: selectedCourse,
        student_note: studentNote
      });
      setSelectedCourse("");
      setStudentNote("");
      fetchRequests();
      fetchAvailable();
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit request.");
    }
  };

  const reviewRequest = async (requestId, status) => {
    try {
      await API.put(`/course-registration/${requestId}/review`, {
        status,
        reviewer_note: reviewNotes[requestId] || ""
      });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Could not review request.");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Course Registration</h2>
        <span className="badge bg-warning text-dark fs-6">Pending: {pendingCount}</span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {isStudent && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-primary text-white">Request New Course</div>
          <div className="card-body">
            <form onSubmit={requestCourse}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Available Course</label>
                  <div className="form-check mb-2">
                    <input
                      id="showBacklogOnly"
                      className="form-check-input"
                      type="checkbox"
                      checked={showBacklogOnly}
                      onChange={(e) => setShowBacklogOnly(e.target.checked)}
                    />
                    <label htmlFor="showBacklogOnly" className="form-check-label">
                      Show backlog courses only
                    </label>
                  </div>
                  <select
                    className="form-select"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                  >
                    <option value="">Select course</option>
                    {requestableCourses.map((course) => (
                        <option key={course.course_id} value={course.course_id}>
                          [{course.registration_type}] {course.course_name} {course.course_code ? `(${course.course_code})` : ""}
                        </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Note (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={studentNote}
                    onChange={(e) => setStudentNote(e.target.value)}
                    placeholder="Reason for requesting this course"
                  />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-light">
          <strong>{isStudent ? "My Request History" : "All Registration Requests"}</strong>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped mb-0">
              <thead>
                <tr>
                  {!isStudent && <th>Student</th>}
                  <th>Course</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Student Note</th>
                  <th>Reviewer Note</th>
                  <th>Requested</th>
                  {canReview && <th>Review</th>}
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={canReview ? (isStudent ? 7 : 8) : isStudent ? 6 : 7} className="text-center py-4">
                      No requests found.
                    </td>
                  </tr>
                )}

                {requests.map((item) => (
                  <tr key={item.request_id}>
                    {!isStudent && <td>{item.student_name}</td>}
                    <td>
                      {item.course_name} {item.course_code ? `(${item.course_code})` : ""}
                    </td>
                    <td>
                      <span className={`badge ${item.registration_type === "Backlog" ? "bg-danger" : "bg-info"}`}>
                        {item.registration_type || "Regular"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          item.status === "Approved"
                            ? "bg-success"
                            : item.status === "Rejected"
                            ? "bg-danger"
                            : "bg-warning text-dark"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{item.student_note || "-"}</td>
                    <td>{item.reviewer_note || "-"}</td>
                    <td>{new Date(item.requested_at).toLocaleString()}</td>
                    {canReview && (
                      <td>
                        {item.status === "Pending" ? (
                          <div>
                            <input
                              className="form-control form-control-sm mb-2"
                              placeholder="Reviewer note"
                              value={reviewNotes[item.request_id] || ""}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({
                                  ...prev,
                                  [item.request_id]: e.target.value
                                }))
                              }
                            />
                            <button
                              className="btn btn-sm btn-success me-2"
                              onClick={() => reviewRequest(item.request_id, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => reviewRequest(item.request_id, "Rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted">Reviewed</span>
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

      {isStudent && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-light">
            <strong>Enrollment Snapshot</strong>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Semester</th>
                    <th>Registration Type</th>
                    <th>Department</th>
                    <th>Credits</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {availableCourses.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        No course data found.
                      </td>
                    </tr>
                  )}

                  {availableCourses.map((course) => (
                    <tr key={course.course_id}>
                      <td>
                        {course.course_name} {course.course_code ? `(${course.course_code})` : ""}
                      </td>
                      <td>{course.course_semester || "-"}</td>
                      <td>
                        <span className={`badge ${course.registration_type === "Backlog" ? "bg-danger" : "bg-info"}`}>
                          {course.registration_type || "Regular"}
                        </span>
                      </td>
                      <td>{course.department || "-"}</td>
                      <td>{course.credits || "-"}</td>
                      <td>
                        {course.is_enrolled ? (
                          <span className="badge bg-success">Enrolled</span>
                        ) : course.pending_request_id ? (
                          <span className="badge bg-warning text-dark">Pending Request</span>
                        ) : !course.can_request ? (
                          <span className="badge bg-secondary" title={course.registration_locked_reason || "Not eligible yet"}>
                            Not Eligible Yet
                          </span>
                        ) : (
                          <span className="badge bg-secondary">Not Enrolled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseRegistration;
