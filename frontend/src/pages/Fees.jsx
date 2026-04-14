import React, { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  student_id: "",
  semester: "",
  fee_type: "Tuition",
  amount_due: "",
  amount_paid: "0",
  due_date: "",
  remarks: ""
};

function Fees() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [error, setError] = useState("");

  const totalDue = useMemo(() => records.reduce((sum, item) => sum + Number(item.amount_due || 0), 0), [records]);
  const totalPaid = useMemo(() => records.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0), [records]);

  const fetchFees = async () => {
    try {
      const res = await API.get("/fees");
      setRecords(res.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load fee records.");
    }
  };

  const fetchStudents = async () => {
    if (!isAdmin) return;
    try {
      const res = await API.get("/students");
      setStudents(res.data || []);
    } catch {
      setStudents([]);
    }
  };

  useEffect(() => {
    fetchFees();
    fetchStudents();
  }, []);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const due = Number(formData.amount_due || 0);
        const paid = Number(formData.amount_paid || 0);
        const status = paid <= 0 ? "Pending" : paid >= due ? "Paid" : "Partially Paid";
        await API.put(`/fees/${editingId}`, { ...formData, status });
      } else {
        await API.post("/fees", formData);
      }
      resetForm();
      fetchFees();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save fee record.");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.fee_id);
    setFormData({
      student_id: String(item.student_id || ""),
      semester: item.semester || "",
      fee_type: item.fee_type || "Tuition",
      amount_due: String(item.amount_due || 0),
      amount_paid: String(item.amount_paid || 0),
      due_date: item.due_date ? new Date(item.due_date).toISOString().slice(0, 10) : "",
      remarks: item.remarks || ""
    });
  };

  const payNow = async (feeId) => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    try {
      await API.post(`/fees/${feeId}/pay`, { amount });
      setPayingId(null);
      setPaymentAmount("");
      fetchFees();
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed.");
    }
  };

  return (
    <div>
      <h2 className="mb-4">Fees</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted">Total Fee Assigned</small>
              <h4 className="mb-0">Rs. {totalDue.toFixed(2)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted">Total Paid</small>
              <h4 className="mb-0 text-success">Rs. {totalPaid.toFixed(2)}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted">Outstanding</small>
              <h4 className="mb-0 text-danger">Rs. {(totalDue - totalPaid).toFixed(2)}</h4>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-warning-subtle">
            {editingId ? "Edit Fee Record" : "Create Fee Record"}
          </div>
          <div className="card-body">
            <form onSubmit={submitForm}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Student</label>
                  <select
                    className="form-select"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.student_id} value={student.student_id}>
                        {student.name} ({student.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label">Semester</label>
                  <input
                    type="text"
                    className="form-control"
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    placeholder="Semester 4"
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Fee Type</label>
                  <input
                    type="text"
                    className="form-control"
                    name="fee_type"
                    value={formData.fee_type}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Amount Due</label>
                  <input
                    type="number"
                    className="form-control"
                    name="amount_due"
                    value={formData.amount_due}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Amount Paid</label>
                  <input
                    type="number"
                    className="form-control"
                    name="amount_paid"
                    value={formData.amount_paid}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary" type="submit">
                  {editingId ? "Update Record" : "Create Record"}
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
          <strong>Fee Records</strong>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  {isAdmin && <th>Student</th>}
                  <th>Semester</th>
                  <th>Type</th>
                  <th>Due</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="text-center py-4">
                      No fee records found.
                    </td>
                  </tr>
                )}

                {records.map((item) => {
                  const balance = Number(item.amount_due || 0) - Number(item.amount_paid || 0);
                  return (
                    <tr key={item.fee_id}>
                      {isAdmin && <td>{item.student_name}</td>}
                      <td>{item.semester}</td>
                      <td>{item.fee_type}</td>
                      <td>Rs. {Number(item.amount_due || 0).toFixed(2)}</td>
                      <td>Rs. {Number(item.amount_paid || 0).toFixed(2)}</td>
                      <td className={balance > 0 ? "text-danger" : "text-success"}>Rs. {balance.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${item.status === "Paid" ? "bg-success" : item.status === "Partially Paid" ? "bg-warning text-dark" : "bg-danger"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.due_date ? new Date(item.due_date).toLocaleDateString() : "-"}</td>
                      <td>
                        {payingId === item.fee_id ? (
                          <div className="d-flex gap-2">
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              style={{ width: 100 }}
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              min="0"
                              step="0.01"
                            />
                            <button className="btn btn-sm btn-success" onClick={() => payNow(item.fee_id)}>
                              Pay
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => setPayingId(null)}>
                              X
                            </button>
                          </div>
                        ) : (
                          <>
                            {isAdmin && (
                              <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(item)}>
                                Edit
                              </button>
                            )}
                            {item.status !== "Paid" && (
                              <button className="btn btn-sm btn-outline-success" onClick={() => setPayingId(item.fee_id)}>
                                Pay
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Fees;
