import { useState, useEffect } from "react";

function Attendance() {

  // 1️⃣ Attendance data from database
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // 2️⃣ Form data
  const [formData, setFormData] = useState({
    student_id: "",
    course_id: "",
    date: "",
    status: "Present"
  });

  // 3️⃣ Fetch attendance from backend (MySQL)
  useEffect(() => {
    fetch("http://localhost:3001/attendance")
      .then((res) => res.json())
      .then((data) => setAttendanceRecords(data))
      .catch((err) => console.log(err));
  }, []);

  // 4️⃣ Handle input change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 5️⃣ Submit attendance to backend (MySQL)
  const handleSubmit = (e) => {
    e.preventDefault();

    fetch("http://localhost:3001/attendance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    })
      .then(() => {
        alert("Attendance added successfully");
        window.location.reload(); // reload to fetch updated data
      })
      .catch((err) => console.log(err));
  };

  return (
    <div>
      <h2 className="mb-4">Attendance Management</h2>

      {/* Mark Attendance Form */}
      <div className="card p-4 mb-4">
        <h5>Mark Attendance</h5>

        <form onSubmit={handleSubmit}>
          <div className="row">

            <div className="col-md-3">
              <input
                type="number"
                name="student_id"
                placeholder="Student ID"
                className="form-control"
                value={formData.student_id}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <input
                type="number"
                name="course_id"
                placeholder="Course ID"
                className="form-control"
                value={formData.course_id}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <input
                type="date"
                name="date"
                className="form-control"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <select
                name="status"
                className="form-control"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>

          <button className="btn btn-warning mt-3">
            Mark Attendance
          </button>
        </form>
      </div>

      {/* Attendance Table */}
      <div className="card p-4">
        <h5>Attendance Records</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {attendanceRecords.map((record, index) => (
              <tr key={index}>
                <td>{record.student}</td>
                <td>{record.course}</td>
                <td>{record.date}</td>
                <td>{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Attendance;
