import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const initialGuardian = {
  guardian_name: "",
  relation: "Parent",
  phone: "",
  email: "",
  address: "",
  is_primary: true
};

const initialService = {
  title: "",
  description: ""
};

const initialLeave = {
  leave_type: "Casual",
  from_date: "",
  to_date: "",
  reason: ""
};

const SERVICE_TYPES = [
  { key: "library", label: "Library" },
  { key: "hostel", label: "Hostel" },
  { key: "transport", label: "Transport" }
];

function EnterpriseWorkflows() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student";

  const [error, setError] = useState("");

  const [guardians, setGuardians] = useState([]);
  const [guardianForm, setGuardianForm] = useState(initialGuardian);

  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceForms, setServiceForms] = useState({
    library: { ...initialService },
    hostel: { ...initialService },
    transport: { ...initialService }
  });

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveForm, setLeaveForm] = useState(initialLeave);

  const handleError = (err, fallback) => {
    setError(err?.response?.data?.message || fallback);
  };

  const loadAll = async () => {
    try {
      setError("");
      const requests = [
        API.get("/guardians"),
        API.get("/campus-services"),
        API.get("/leave-requests")
      ];

      const responses = await Promise.all(requests);
      let i = 0;
      setGuardians(responses[i++].data || []);
      setServiceRequests(responses[i++].data || []);
      setLeaveRequests(responses[i++].data || []);
    } catch (err) {
      handleError(err, "Could not load additional features data.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createGuardian = async (e) => {
    e.preventDefault();
    try {
      await API.post("/guardians", guardianForm);
      setGuardianForm(initialGuardian);
      loadAll();
    } catch (err) {
      handleError(err, "Could not save guardian profile.");
    }
  };

  const createServiceRequest = async (serviceType, e) => {
    e.preventDefault();
    try {
      const payload = serviceForms[serviceType] || initialService;
      await API.post("/campus-services", {
        service_type: serviceType,
        title: payload.title,
        description: payload.description
      });
      setServiceForms((prev) => ({
        ...prev,
        [serviceType]: { ...initialService }
      }));
      loadAll();
    } catch (err) {
      handleError(err, "Could not create service request.");
    }
  };

  const reviewService = async (id, status) => {
    try {
      await API.put(`/campus-services/${id}/review`, { status });
      loadAll();
    } catch (err) {
      handleError(err, "Could not update service request.");
    }
  };

  const createLeave = async (e) => {
    e.preventDefault();
    try {
      await API.post("/leave-requests", leaveForm);
      setLeaveForm(initialLeave);
      loadAll();
    } catch (err) {
      handleError(err, "Could not submit leave request.");
    }
  };

  const reviewLeave = async (id, status) => {
    try {
      await API.put(`/leave-requests/${id}/review`, { status });
      loadAll();
    } catch (err) {
      handleError(err, "Could not review leave request.");
    }
  };

  const getStatusLabel = (status) => {
    const value = String(status || "").toLowerCase();
    if (!value || value === "pending") return "Requested";
    if (value === "approved") return "Approved";
    if (value === "rejected") return "Rejected";
    return status;
  };

  const renderReviewActions = (status, onApprove, onReject) => {
    if (String(status || "").toLowerCase() === "approved") {
      return <button className="btn btn-sm btn-success" disabled>Approved</button>;
    }
    if (String(status || "").toLowerCase() === "rejected") {
      return <button className="btn btn-sm btn-danger" disabled>Rejected</button>;
    }

    return (
      <div className="d-flex gap-1">
        <button className="btn btn-sm btn-outline-success" onClick={onApprove}>Approve</button>
        <button className="btn btn-sm btn-outline-danger" onClick={onReject}>Reject</button>
      </div>
    );
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Additional Features</h2>
        <button className="btn btn-outline-secondary" onClick={loadAll}>Refresh</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <ul className="nav nav-pills mb-3" role="tablist">
        {[
          ["guardians", "Parent/Guardian"],
          ["library", "Library"],
          ["hostel", "Hostel"],
          ["transport", "Transport"],
          ["leave", "Leave Approval"]
        ].map(([id, label], idx) => (
          <li className="nav-item" key={id}>
            <button className={`nav-link ${idx === 0 ? "active" : ""}`} data-bs-toggle="pill" data-bs-target={`#tab-${id}`} type="button">{label}</button>
          </li>
        ))}
      </ul>

      <div className="tab-content">
        <div className="tab-pane fade show active" id="tab-guardians">
          {isStudent && (
            <form className="row g-2 mb-3" onSubmit={createGuardian}>
              <div className="col-md-3"><input className="form-control" placeholder="Guardian name" value={guardianForm.guardian_name} onChange={(e) => setGuardianForm((p) => ({ ...p, guardian_name: e.target.value }))} required /></div>
              <div className="col-md-2"><input className="form-control" placeholder="Relation" value={guardianForm.relation} onChange={(e) => setGuardianForm((p) => ({ ...p, relation: e.target.value }))} /></div>
              <div className="col-md-3"><input className="form-control" placeholder="Phone" value={guardianForm.phone} onChange={(e) => setGuardianForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="col-md-2"><input className="form-control" placeholder="Email" value={guardianForm.email} onChange={(e) => setGuardianForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Add Guardian</button></div>
            </form>
          )}
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Student</th><th>Guardian</th><th>Relation</th><th>Phone</th><th>Email</th><th>Primary</th></tr></thead><tbody>{guardians.map((g) => <tr key={g.guardian_id}><td>{g.student_name || g.student_id}</td><td>{g.guardian_name}</td><td>{g.relation}</td><td>{g.phone || "-"}</td><td>{g.email || "-"}</td><td>{g.is_primary ? "Yes" : "No"}</td></tr>)}</tbody></table></div>
        </div>

        {SERVICE_TYPES.map((serviceType) => {
          const rows = serviceRequests.filter((r) => String(r.service_type || "").toLowerCase() === serviceType.key);
          const formData = serviceForms[serviceType.key] || initialService;

          return (
            <div className="tab-pane fade" id={`tab-${serviceType.key}`} key={serviceType.key}>
              {isStudent && (
                <form className="row g-2 mb-3" onSubmit={(e) => createServiceRequest(serviceType.key, e)}>
                  <div className="col-md-5"><input className="form-control" placeholder={`${serviceType.label} request title`} value={formData.title} onChange={(e) => setServiceForms((prev) => ({ ...prev, [serviceType.key]: { ...prev[serviceType.key], title: e.target.value } }))} required /></div>
                  <div className="col-md-5"><input className="form-control" placeholder="Description" value={formData.description} onChange={(e) => setServiceForms((prev) => ({ ...prev, [serviceType.key]: { ...prev[serviceType.key], description: e.target.value } }))} /></div>
                  <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Request</button></div>
                </form>
              )}

              <div className="table-responsive">
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Requester</th>
                      {isAdmin && <th>Review</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.request_id}>
                        <td>{r.title}</td>
                        <td>{getStatusLabel(r.status)}</td>
                        <td>{r.requester_email}</td>
                        {isAdmin && (
                          <td>
                            {renderReviewActions(
                              r.status,
                              () => reviewService(r.request_id, "approved"),
                              () => reviewService(r.request_id, "rejected")
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div className="tab-pane fade" id="tab-leave">
          {!isAdmin && (
            <form className="row g-2 mb-3" onSubmit={createLeave}>
              <div className="col-md-2"><input className="form-control" placeholder="Leave type" value={leaveForm.leave_type} onChange={(e) => setLeaveForm((p) => ({ ...p, leave_type: e.target.value }))} required /></div>
              <div className="col-md-2"><input type="date" className="form-control" value={leaveForm.from_date} onChange={(e) => setLeaveForm((p) => ({ ...p, from_date: e.target.value }))} required /></div>
              <div className="col-md-2"><input type="date" className="form-control" value={leaveForm.to_date} onChange={(e) => setLeaveForm((p) => ({ ...p, to_date: e.target.value }))} required /></div>
              <div className="col-md-4"><input className="form-control" placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} /></div>
              <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Apply</button></div>
            </form>
          )}
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Type</th><th>From</th><th>To</th><th>Status</th><th>Requester</th>{isAdmin && <th>Review</th>}</tr></thead><tbody>{leaveRequests.map((r) => <tr key={r.leave_id}><td>{r.leave_type}</td><td>{new Date(r.from_date).toLocaleDateString()}</td><td>{new Date(r.to_date).toLocaleDateString()}</td><td>{getStatusLabel(r.status)}</td><td>{r.requester_email}</td>{isAdmin && <td>{renderReviewActions(r.status, () => reviewLeave(r.leave_id, "approved"), () => reviewLeave(r.leave_id, "rejected"))}</td>}</tr>)}</tbody></table></div>
        </div>

      </div>
    </div>
  );
}

export default EnterpriseWorkflows;
