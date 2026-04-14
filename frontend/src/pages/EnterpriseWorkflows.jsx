import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const initialGuardian = {
  student_id: "",
  guardian_name: "",
  relation: "Parent",
  phone: "",
  email: "",
  address: "",
  is_primary: true
};

const initialExam = {
  course_id: "",
  exam_title: "",
  exam_date: "",
  start_time: "",
  end_time: "",
  venue: ""
};

const initialAssignment = {
  course_id: "",
  title: "",
  instructions: "",
  due_date: "",
  max_marks: "100"
};

const initialService = {
  service_type: "library",
  title: "",
  description: ""
};

const initialLeave = {
  leave_type: "Casual",
  from_date: "",
  to_date: "",
  reason: ""
};

const initialPayroll = {
  employee_user_id: "",
  payroll_month: "",
  basic_pay: "",
  allowances: "0",
  deductions: "0"
};

const initialInvoice = {
  student_id: "",
  category: "Tuition",
  grade_context: "",
  amount: "",
  due_date: "",
  notes: ""
};

const initialDoc = {
  student_id: "",
  document_type: "Bonafide Certificate",
  purpose: ""
};

function EnterpriseWorkflows() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManageAcademics = user?.role === "admin" || user?.role === "teacher";

  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [guardians, setGuardians] = useState([]);
  const [guardianForm, setGuardianForm] = useState(initialGuardian);

  const [exams, setExams] = useState([]);
  const [hallTickets, setHallTickets] = useState([]);
  const [examForm, setExamForm] = useState(initialExam);

  const [assignments, setAssignments] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState(initialAssignment);
  const [submissionByAssignment, setSubmissionByAssignment] = useState({});

  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceForm, setServiceForm] = useState(initialService);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveForm, setLeaveForm] = useState(initialLeave);

  const [payrollRows, setPayrollRows] = useState([]);
  const [payrollForm, setPayrollForm] = useState(initialPayroll);

  const [invoices, setInvoices] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState(initialInvoice);
  const [receipts, setReceipts] = useState([]);
  const [payInputByInvoice, setPayInputByInvoice] = useState({});

  const [docRequests, setDocRequests] = useState([]);
  const [docForm, setDocForm] = useState(initialDoc);

  const handleError = (err, fallback) => {
    setError(err?.response?.data?.message || fallback);
  };

  const loadLookups = async () => {
    try {
      const [studentRes, courseRes] = await Promise.all([
        API.get("/students"),
        API.get("/courses")
      ]);
      setStudents(studentRes.data || []);
      setCourses(courseRes.data || []);
    } catch {
      // Keep page functional even with partial lookup failures.
    }

    if (isAdmin) {
      try {
        const users = await API.get("/admin/users");
        setEmployees((users.data || []).filter((u) => u.role === "teacher" || u.role === "admin"));
      } catch {
        setEmployees([]);
      }
    }
  };

  const loadAll = async () => {
    try {
      setError("");
      const requests = [
        API.get("/guardians"),
        API.get("/exams/workflow"),
        API.get("/assignments"),
        API.get("/campus-services"),
        API.get("/leave-requests"),
        API.get("/document-requests")
      ];

      if (isAdmin || user?.role === "teacher") {
        requests.push(API.get("/payroll"));
      }
      requests.push(API.get("/finance/invoices"));

      if (user?.role === "student") {
        requests.push(API.get("/exams/hall-ticket/me"));
        requests.push(API.get("/finance/receipts/me"));
      }

      const responses = await Promise.all(requests);
      let i = 0;
      setGuardians(responses[i++].data || []);
      setExams(responses[i++].data || []);
      setAssignments(responses[i++].data || []);
      setServiceRequests(responses[i++].data || []);
      setLeaveRequests(responses[i++].data || []);
      setDocRequests(responses[i++].data || []);

      if (isAdmin || user?.role === "teacher") {
        setPayrollRows(responses[i++].data || []);
      } else {
        setPayrollRows([]);
      }

      setInvoices(responses[i++].data || []);

      if (user?.role === "student") {
        setHallTickets(responses[i++].data || []);
        setReceipts(responses[i++].data || []);
      } else {
        setHallTickets([]);
        setReceipts([]);
      }
    } catch (err) {
      handleError(err, "Could not load enterprise workflows.");
    }
  };

  useEffect(() => {
    loadLookups();
    loadAll();
  }, []);

  const createGuardian = async (e) => {
    e.preventDefault();
    try {
      await API.post("/guardians", guardianForm);
      setGuardianForm(initialGuardian);
      loadAll();
    } catch (err) {
      handleError(err, "Could not create guardian profile.");
    }
  };

  const createExam = async (e) => {
    e.preventDefault();
    try {
      await API.post("/exams/workflow", examForm);
      setExamForm(initialExam);
      loadAll();
    } catch (err) {
      handleError(err, "Could not create exam schedule.");
    }
  };

  const publishExam = async (examId) => {
    try {
      await API.put(`/exams/workflow/${examId}/publish`);
      loadAll();
    } catch (err) {
      handleError(err, "Could not publish exam.");
    }
  };

  const generateHallTickets = async (examId) => {
    try {
      await API.post(`/exams/workflow/${examId}/hall-ticket/generate`);
      loadAll();
    } catch (err) {
      handleError(err, "Could not generate hall tickets.");
    }
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    try {
      await API.post("/assignments", assignmentForm);
      setAssignmentForm(initialAssignment);
      loadAll();
    } catch (err) {
      handleError(err, "Could not create assignment.");
    }
  };

  const submitAssignment = async (assignmentId) => {
    try {
      await API.post(`/assignments/${assignmentId}/submit`, {
        submission_text: submissionByAssignment[assignmentId] || ""
      });
      setSubmissionByAssignment((prev) => ({ ...prev, [assignmentId]: "" }));
      loadAll();
    } catch (err) {
      handleError(err, "Could not submit assignment.");
    }
  };

  const createServiceRequest = async (e) => {
    e.preventDefault();
    try {
      await API.post("/campus-services", serviceForm);
      setServiceForm(initialService);
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

  const savePayroll = async (e) => {
    e.preventDefault();
    try {
      await API.post("/payroll", payrollForm);
      setPayrollForm(initialPayroll);
      loadAll();
    } catch (err) {
      handleError(err, "Could not save payroll record.");
    }
  };

  const updatePayrollStatus = async (id, status) => {
    try {
      await API.put(`/payroll/${id}/status`, { status });
      loadAll();
    } catch (err) {
      handleError(err, "Could not update payroll status.");
    }
  };

  const createInvoice = async (e) => {
    e.preventDefault();
    try {
      await API.post("/finance/invoices", invoiceForm);
      setInvoiceForm(initialInvoice);
      loadAll();
    } catch (err) {
      handleError(err, "Could not create invoice.");
    }
  };

  const publishInvoice = async (id) => {
    try {
      await API.put(`/finance/invoices/${id}/publish`);
      loadAll();
    } catch (err) {
      handleError(err, "Could not publish invoice.");
    }
  };

  const payInvoice = async (id) => {
    try {
      const amount = Number(payInputByInvoice[id]);
      if (!amount || amount <= 0) {
        setError("Enter a valid payment amount.");
        return;
      }
      await API.post(`/finance/invoices/${id}/pay`, {
        amount,
        gateway_name: "demo-gateway",
        gateway_reference: `SIM-${Date.now()}`
      });
      setPayInputByInvoice((prev) => ({ ...prev, [id]: "" }));
      loadAll();
    } catch (err) {
      handleError(err, "Could not process invoice payment.");
    }
  };

  const createDocRequest = async (e) => {
    e.preventDefault();
    try {
      await API.post("/document-requests", docForm);
      setDocForm(initialDoc);
      loadAll();
    } catch (err) {
      handleError(err, "Could not create document request.");
    }
  };

  const reviewDoc = async (id, status) => {
    try {
      await API.put(`/document-requests/${id}/review`, { status });
      loadAll();
    } catch (err) {
      handleError(err, "Could not review document request.");
    }
  };

  const issueDoc = async (id) => {
    try {
      await API.put(`/document-requests/${id}/issue`, {
        issued_url: "https://example.com/document.pdf"
      });
      loadAll();
    } catch (err) {
      handleError(err, "Could not issue document.");
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Enterprise ERP Workflows</h2>
        <button className="btn btn-outline-secondary" onClick={loadAll}>Refresh</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <ul className="nav nav-pills mb-3" role="tablist">
        {[
          ["guardians", "Parent/Guardian"],
          ["exam", "Exam + Hall Ticket"],
          ["lms", "Assignment/LMS"],
          ["services", "Library/Hostel/Transport"],
          ["leave", "Leave/Approvals"],
          ["payroll", "Payroll/HR"],
          ["finance", "Finance Workflow"],
          ["docs", "Certificates/Documents"]
        ].map(([id, label], idx) => (
          <li className="nav-item" key={id}>
            <button className={`nav-link ${idx === 0 ? "active" : ""}`} data-bs-toggle="pill" data-bs-target={`#tab-${id}`} type="button">{label}</button>
          </li>
        ))}
      </ul>

      <div className="tab-content">
        <div className="tab-pane fade show active" id="tab-guardians">
          {isAdmin && (
            <form className="row g-2 mb-3" onSubmit={createGuardian}>
              <div className="col-md-2">
                <select className="form-select" value={guardianForm.student_id} onChange={(e) => setGuardianForm((p) => ({ ...p, student_id: e.target.value }))} required>
                  <option value="">Student</option>
                  {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-md-2"><input className="form-control" placeholder="Guardian name" value={guardianForm.guardian_name} onChange={(e) => setGuardianForm((p) => ({ ...p, guardian_name: e.target.value }))} required /></div>
              <div className="col-md-2"><input className="form-control" placeholder="Relation" value={guardianForm.relation} onChange={(e) => setGuardianForm((p) => ({ ...p, relation: e.target.value }))} /></div>
              <div className="col-md-2"><input className="form-control" placeholder="Phone" value={guardianForm.phone} onChange={(e) => setGuardianForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="col-md-2"><input className="form-control" placeholder="Email" value={guardianForm.email} onChange={(e) => setGuardianForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Add Guardian</button></div>
            </form>
          )}
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Student</th><th>Guardian</th><th>Relation</th><th>Phone</th><th>Email</th><th>Primary</th></tr></thead><tbody>{guardians.map((g) => <tr key={g.guardian_id}><td>{g.student_name || g.student_id}</td><td>{g.guardian_name}</td><td>{g.relation}</td><td>{g.phone || "-"}</td><td>{g.email || "-"}</td><td>{g.is_primary ? "Yes" : "No"}</td></tr>)}</tbody></table></div>
        </div>

        <div className="tab-pane fade" id="tab-exam">
          {canManageAcademics && (
            <form className="row g-2 mb-3" onSubmit={createExam}>
              <div className="col-md-2"><select className="form-select" value={examForm.course_id} onChange={(e) => setExamForm((p) => ({ ...p, course_id: e.target.value }))} required><option value="">Course</option>{courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}</select></div>
              <div className="col-md-2"><input className="form-control" placeholder="Exam title" value={examForm.exam_title} onChange={(e) => setExamForm((p) => ({ ...p, exam_title: e.target.value }))} required /></div>
              <div className="col-md-2"><input type="date" className="form-control" value={examForm.exam_date} onChange={(e) => setExamForm((p) => ({ ...p, exam_date: e.target.value }))} required /></div>
              <div className="col-md-2"><input type="time" className="form-control" value={examForm.start_time} onChange={(e) => setExamForm((p) => ({ ...p, start_time: e.target.value }))} /></div>
              <div className="col-md-2"><input type="time" className="form-control" value={examForm.end_time} onChange={(e) => setExamForm((p) => ({ ...p, end_time: e.target.value }))} /></div>
              <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Create Exam</button></div>
            </form>
          )}
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Course</th><th>Exam</th><th>Date</th><th>Venue</th><th>Status</th>{canManageAcademics && <th>Actions</th>}</tr></thead><tbody>{exams.map((e) => <tr key={e.exam_id}><td>{e.course_name}</td><td>{e.exam_title}</td><td>{new Date(e.exam_date).toLocaleDateString()}</td><td>{e.venue || "-"}</td><td>{e.publish_status}</td>{canManageAcademics && <td className="d-flex gap-1"><button className="btn btn-sm btn-outline-success" onClick={() => publishExam(e.exam_id)}>Publish</button><button className="btn btn-sm btn-outline-primary" onClick={() => generateHallTickets(e.exam_id)}>Generate HT</button></td>}</tr>)}</tbody></table></div>
          {user?.role === "student" && (
            <div className="mt-3"><h6>My Hall Tickets</h6><ul className="list-group">{hallTickets.map((h) => <li className="list-group-item" key={h.hall_ticket_id}>{h.course_name} | {h.exam_title} | Ticket: {h.ticket_number} | Seat: {h.seat_number}</li>)}</ul></div>
          )}
        </div>

        <div className="tab-pane fade" id="tab-lms">
          {canManageAcademics && (
            <form className="row g-2 mb-3" onSubmit={createAssignment}>
              <div className="col-md-2"><select className="form-select" value={assignmentForm.course_id} onChange={(e) => setAssignmentForm((p) => ({ ...p, course_id: e.target.value }))} required><option value="">Course</option>{courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}</select></div>
              <div className="col-md-3"><input className="form-control" placeholder="Title" value={assignmentForm.title} onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))} required /></div>
              <div className="col-md-3"><input className="form-control" placeholder="Instructions" value={assignmentForm.instructions} onChange={(e) => setAssignmentForm((p) => ({ ...p, instructions: e.target.value }))} /></div>
              <div className="col-md-2"><input type="datetime-local" className="form-control" value={assignmentForm.due_date} onChange={(e) => setAssignmentForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
              <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Create</button></div>
            </form>
          )}
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Course</th><th>Title</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>{assignments.map((a) => <tr key={a.assignment_id}><td>{a.course_name}</td><td>{a.title}</td><td>{a.due_date ? new Date(a.due_date).toLocaleString() : "-"}</td><td>{a.status}</td><td>{user?.role === "student" ? <div className="d-flex gap-1"><input className="form-control form-control-sm" value={submissionByAssignment[a.assignment_id] || ""} onChange={(e) => setSubmissionByAssignment((p) => ({ ...p, [a.assignment_id]: e.target.value }))} placeholder="Submission" /><button className="btn btn-sm btn-outline-primary" onClick={() => submitAssignment(a.assignment_id)}>Submit</button></div> : "-"}</td></tr>)}</tbody></table></div>
        </div>

        <div className="tab-pane fade" id="tab-services">
          <form className="row g-2 mb-3" onSubmit={createServiceRequest}>
            <div className="col-md-2"><select className="form-select" value={serviceForm.service_type} onChange={(e) => setServiceForm((p) => ({ ...p, service_type: e.target.value }))}><option value="library">Library</option><option value="hostel">Hostel</option><option value="transport">Transport</option></select></div>
            <div className="col-md-4"><input className="form-control" placeholder="Request title" value={serviceForm.title} onChange={(e) => setServiceForm((p) => ({ ...p, title: e.target.value }))} required /></div>
            <div className="col-md-4"><input className="form-control" placeholder="Description" value={serviceForm.description} onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Submit</button></div>
          </form>
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Type</th><th>Title</th><th>Status</th><th>Requester</th>{isAdmin && <th>Review</th>}</tr></thead><tbody>{serviceRequests.map((r) => <tr key={r.request_id}><td>{r.service_type}</td><td>{r.title}</td><td>{r.status}</td><td>{r.requester_email}</td>{isAdmin && <td className="d-flex gap-1"><button className="btn btn-sm btn-outline-success" onClick={() => reviewService(r.request_id, "approved")}>Approve</button><button className="btn btn-sm btn-outline-danger" onClick={() => reviewService(r.request_id, "rejected")}>Reject</button></td>}</tr>)}</tbody></table></div>
        </div>

        <div className="tab-pane fade" id="tab-leave">
          <form className="row g-2 mb-3" onSubmit={createLeave}>
            <div className="col-md-2"><input className="form-control" placeholder="Leave type" value={leaveForm.leave_type} onChange={(e) => setLeaveForm((p) => ({ ...p, leave_type: e.target.value }))} required /></div>
            <div className="col-md-2"><input type="date" className="form-control" value={leaveForm.from_date} onChange={(e) => setLeaveForm((p) => ({ ...p, from_date: e.target.value }))} required /></div>
            <div className="col-md-2"><input type="date" className="form-control" value={leaveForm.to_date} onChange={(e) => setLeaveForm((p) => ({ ...p, to_date: e.target.value }))} required /></div>
            <div className="col-md-4"><input className="form-control" placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} /></div>
            <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Apply</button></div>
          </form>
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Type</th><th>From</th><th>To</th><th>Status</th><th>Requester</th>{isAdmin && <th>Review</th>}</tr></thead><tbody>{leaveRequests.map((r) => <tr key={r.leave_id}><td>{r.leave_type}</td><td>{new Date(r.from_date).toLocaleDateString()}</td><td>{new Date(r.to_date).toLocaleDateString()}</td><td>{r.status}</td><td>{r.requester_email}</td>{isAdmin && <td className="d-flex gap-1"><button className="btn btn-sm btn-outline-success" onClick={() => reviewLeave(r.leave_id, "approved")}>Approve</button><button className="btn btn-sm btn-outline-danger" onClick={() => reviewLeave(r.leave_id, "rejected")}>Reject</button></td>}</tr>)}</tbody></table></div>
        </div>

        <div className="tab-pane fade" id="tab-payroll">
          {isAdmin && (
            <form className="row g-2 mb-3" onSubmit={savePayroll}>
              <div className="col-md-2"><select className="form-select" value={payrollForm.employee_user_id} onChange={(e) => setPayrollForm((p) => ({ ...p, employee_user_id: e.target.value }))} required><option value="">Employee</option>{employees.map((e) => <option key={e.user_id} value={e.user_id}>{e.email}</option>)}</select></div>
              <div className="col-md-2"><input className="form-control" placeholder="Month (2026-04)" value={payrollForm.payroll_month} onChange={(e) => setPayrollForm((p) => ({ ...p, payroll_month: e.target.value }))} required /></div>
              <div className="col-md-2"><input type="number" className="form-control" placeholder="Basic" value={payrollForm.basic_pay} onChange={(e) => setPayrollForm((p) => ({ ...p, basic_pay: e.target.value }))} required /></div>
              <div className="col-md-2"><input type="number" className="form-control" placeholder="Allowances" value={payrollForm.allowances} onChange={(e) => setPayrollForm((p) => ({ ...p, allowances: e.target.value }))} /></div>
              <div className="col-md-2"><input type="number" className="form-control" placeholder="Deductions" value={payrollForm.deductions} onChange={(e) => setPayrollForm((p) => ({ ...p, deductions: e.target.value }))} /></div>
              <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Save</button></div>
            </form>
          )}
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Employee</th><th>Month</th><th>Net Pay</th><th>Status</th>{isAdmin && <th>Action</th>}</tr></thead><tbody>{payrollRows.map((r) => <tr key={r.payroll_id}><td>{r.employee_email}</td><td>{r.payroll_month}</td><td>{Number(r.net_pay).toFixed(2)}</td><td>{r.status}</td>{isAdmin && <td className="d-flex gap-1"><button className="btn btn-sm btn-outline-secondary" onClick={() => updatePayrollStatus(r.payroll_id, "processed")}>Process</button><button className="btn btn-sm btn-outline-success" onClick={() => updatePayrollStatus(r.payroll_id, "paid")}>Mark Paid</button></td>}</tr>)}</tbody></table></div>
        </div>

        <div className="tab-pane fade" id="tab-finance">
          {isAdmin && (
            <form className="row g-2 mb-3" onSubmit={createInvoice}>
              <div className="col-md-2"><select className="form-select" value={invoiceForm.student_id} onChange={(e) => setInvoiceForm((p) => ({ ...p, student_id: e.target.value }))} required><option value="">Student</option>{students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}</select></div>
              <div className="col-md-2"><input className="form-control" placeholder="Category" value={invoiceForm.category} onChange={(e) => setInvoiceForm((p) => ({ ...p, category: e.target.value }))} /></div>
              <div className="col-md-2"><input className="form-control" placeholder="Grade context" value={invoiceForm.grade_context} onChange={(e) => setInvoiceForm((p) => ({ ...p, grade_context: e.target.value }))} /></div>
              <div className="col-md-2"><input type="number" className="form-control" placeholder="Amount" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))} required /></div>
              <div className="col-md-2"><input type="date" className="form-control" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm((p) => ({ ...p, due_date: e.target.value }))} /></div>
              <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Create Invoice</button></div>
            </form>
          )}
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Invoice</th><th>Student</th><th>Category</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{invoices.map((inv) => <tr key={inv.invoice_id}><td>{inv.invoice_number}</td><td>{inv.student_name || inv.student_id}</td><td>{inv.category}</td><td>{Number(inv.amount).toFixed(2)}</td><td>{inv.status}</td><td className="d-flex gap-1">{isAdmin && inv.status === "draft" && <button className="btn btn-sm btn-outline-success" onClick={() => publishInvoice(inv.invoice_id)}>Publish</button>}{(user?.role === "student" || isAdmin) && inv.status !== "paid" && <><input type="number" className="form-control form-control-sm" style={{ width: 110 }} placeholder="Amount" value={payInputByInvoice[inv.invoice_id] || ""} onChange={(e) => setPayInputByInvoice((p) => ({ ...p, [inv.invoice_id]: e.target.value }))} /><button className="btn btn-sm btn-outline-primary" onClick={() => payInvoice(inv.invoice_id)}>Pay</button></>}</td></tr>)}</tbody></table></div>
          {user?.role === "student" && (
            <div className="mt-3"><h6>Receipts</h6><ul className="list-group">{receipts.map((r) => <li className="list-group-item" key={r.receipt_number}>{r.receipt_number} | {r.invoice_number} | {Number(r.amount).toFixed(2)} | {r.gateway_reference}</li>)}</ul></div>
          )}
        </div>

        <div className="tab-pane fade" id="tab-docs">
          <form className="row g-2 mb-3" onSubmit={createDocRequest}>
            {isAdmin && <div className="col-md-2"><select className="form-select" value={docForm.student_id} onChange={(e) => setDocForm((p) => ({ ...p, student_id: e.target.value }))} required><option value="">Student</option>{students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}</select></div>}
            <div className="col-md-3"><input className="form-control" placeholder="Document type" value={docForm.document_type} onChange={(e) => setDocForm((p) => ({ ...p, document_type: e.target.value }))} required /></div>
            <div className="col-md-5"><input className="form-control" placeholder="Purpose" value={docForm.purpose} onChange={(e) => setDocForm((p) => ({ ...p, purpose: e.target.value }))} /></div>
            <div className="col-md-2"><button className="btn btn-primary w-100" type="submit">Request</button></div>
          </form>
          <div className="table-responsive"><table className="table table-sm table-striped"><thead><tr><th>Student</th><th>Type</th><th>Purpose</th><th>Status</th><th>Issue URL</th>{(isAdmin || user?.role === "teacher") && <th>Action</th>}</tr></thead><tbody>{docRequests.map((d) => <tr key={d.document_request_id}><td>{d.student_name || d.student_id}</td><td>{d.document_type}</td><td>{d.purpose || "-"}</td><td>{d.status}</td><td>{d.issued_url || "-"}</td>{(isAdmin || user?.role === "teacher") && <td className="d-flex gap-1"><button className="btn btn-sm btn-outline-success" onClick={() => reviewDoc(d.document_request_id, "approved")}>Approve</button><button className="btn btn-sm btn-outline-danger" onClick={() => reviewDoc(d.document_request_id, "rejected")}>Reject</button><button className="btn btn-sm btn-outline-primary" onClick={() => issueDoc(d.document_request_id)}>Issue</button></td>}</tr>)}</tbody></table></div>
        </div>
      </div>
    </div>
  );
}

export default EnterpriseWorkflows;
