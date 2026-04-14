import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { MdArrowBack, MdSchool, MdAssignment, MdDateRange, MdBadge } from "react-icons/md";
import "./Profile.css";

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [metrics, setMetrics] = useState({
    courses: 0,
    results: 0,
    attendanceLogs: 0
  });
  const [formData, setFormData] = useState({
    username: "",
    academic_id: "",
    name: "",
    department: "",
    phone: "",
    year: "",
    semester: "",
    section: ""
  });

  const yearSemesterOptions = {
    1: ["1", "2"],
    2: ["3", "4"],
    3: ["5", "6"],
    4: ["7", "8"]
  };

  const isStudent = user?.role === "student";

  const toTitleCase = (value) => {
    return String(value || "")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const initials = ((formData.name || formData.username || user?.email || "U").trim().match(/\b\w/g) || ["U"])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const loadMetrics = async () => {
    try {
      const requests = [API.get("/courses"), API.get("/results")];
      if (isStudent) {
        requests.push(API.get("/attendance/student/me"));
      } else {
        requests.push(API.get("/attendance"));
      }

      const [coursesRes, resultsRes, attendanceRes] = await Promise.all(requests);
      setMetrics({
        courses: (coursesRes.data || []).length,
        results: (resultsRes.data || []).length,
        attendanceLogs: (attendanceRes.data || []).length
      });
    } catch {
      setMetrics({ courses: 0, results: 0, attendanceLogs: 0 });
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get("/auth/profile");
      const data = response.data || {};
      const profile = data.profile || {};
      setFormData({
        username: data.username || "",
        academic_id: profile.academic_id || data.academic_id || "",
        name: profile.name || "",
        department: profile.department || "",
        phone: profile.phone || "",
        year: profile.year ? String(profile.year) : "",
        semester: profile.semester || "",
        section: profile.section || ""
      });
      setError("");
      await loadMetrics();
    } catch (err) {
      setError(err.response?.data?.message || "Could not load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e) => {
    if (e.target.name === "year") {
      const nextYear = Number(e.target.value);
      const allowedSemesters = yearSemesterOptions[nextYear] || [];
      const resolvedSemester = allowedSemesters.includes(String(formData.semester))
        ? String(formData.semester)
        : (allowedSemesters[0] || "");

      setFormData((prev) => ({
        ...prev,
        year: String(nextYear),
        semester: resolvedSemester
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await API.put("/auth/profile", formData);
      setSuccess("Profile updated successfully");
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-head">
        <div>
          <h2 className="mb-1">My Profile</h2>
          <p className="text-muted mb-0">Profile details for the currently logged-in account.</p>
        </div>
        <button type="button" className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => navigate("/dashboard")}>
          <MdArrowBack /> Back to Dashboard
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="profile-summary-card card shadow-sm border-0 mb-4">
            <div className="card-body p-4">
              <div className="profile-summary-top">
                <div className="profile-avatar">{initials}</div>
                <div>
                  <h3 className="mb-1">{formData.name || formData.username || "User"}</h3>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <span className="badge text-bg-info">{toTitleCase(user?.role)}</span>
                    <span className="badge text-bg-secondary">{formData.department || "No department"}</span>
                  </div>
                  <p className="mb-1 text-muted">{user?.email}</p>
                  <p className="mb-0 text-muted">{formData.academic_id || "No academic id"}</p>
                </div>
              </div>

              <div className="profile-metric-grid mt-4">
                <div className="metric-box">
                  <p className="metric-number">{metrics.courses}</p>
                  <p className="metric-label">Courses</p>
                </div>
                <div className="metric-box">
                  <p className="metric-number">{metrics.results}</p>
                  <p className="metric-label">Results</p>
                </div>
                <div className="metric-box">
                  <p className="metric-number">{metrics.attendanceLogs}</p>
                  <p className="metric-label">Attendance Logs</p>
                </div>
                <div className="metric-box">
                  <p className="metric-number">{isStudent ? (formData.semester || "-") : "-"}</p>
                  <p className="metric-label">Semester</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h4 className="mb-3">Edit Profile</h4>
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Username</label>
                    <input className="form-control" name="username" value={formData.username} onChange={handleChange} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Academic ID</label>
                    <input className="form-control" name="academic_id" value={formData.academic_id} onChange={handleChange} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input className="form-control" name="name" value={formData.name} onChange={handleChange} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Department</label>
                    <input className="form-control" name="department" value={formData.department} onChange={handleChange} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input className="form-control" name="phone" value={formData.phone} onChange={handleChange} />
                  </div>

                  {isStudent && (
                    <>
                      <div className="col-md-4">
                        <label className="form-label">Year</label>
                        <select className="form-control" name="year" value={formData.year} onChange={handleChange}>
                          <option value="">Select year</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Semester</label>
                        <select className="form-control" name="semester" value={formData.semester} onChange={handleChange}>
                          <option value="">Select semester</option>
                          {(yearSemesterOptions[Number(formData.year)] || []).map((sem) => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Section</label>
                        <input className="form-control" name="section" value={formData.section} onChange={handleChange} />
                      </div>
                    </>
                  )}
                </div>

                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-4">
              <h4 className="mb-3">Account Highlights</h4>
              <ul className="profile-highlight-list">
                <li><MdBadge /> Role: <strong>{toTitleCase(user?.role)}</strong></li>
                <li><MdSchool /> Department: <strong>{formData.department || "-"}</strong></li>
                <li><MdAssignment /> Academic ID: <strong>{formData.academic_id || "-"}</strong></li>
                <li><MdDateRange /> Phone: <strong>{formData.phone || "-"}</strong></li>
              </ul>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h4 className="mb-3">Quick Insight</h4>
              <p className="text-muted mb-2">This block summarizes your current ERP activity scope.</p>
              <div className="small">
                <div className="mb-2">Courses available: <strong>{metrics.courses}</strong></div>
                <div className="mb-2">Results visible: <strong>{metrics.results}</strong></div>
                <div className="mb-0">Attendance entries: <strong>{metrics.attendanceLogs}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
