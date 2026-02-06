import { useState } from "react";

function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([
    { id: 1, student: "Rahul", course: "Database Systems", date: "2024-02-01", status: "Present" }
  ]);

  const [formData, setFormData] = useState({
    student: "",
    course: "",
    date: "",
    status: "Present"
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newRecord = {
      id: attendanceRecords.length + 1,
      ...formData
    };

    setAttendanceRecords([...attendanceRecords, newRecord]);

    setFormData({
      student: "",
      course: "",
      date: "",
      status: "Present"
    });
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
                type="text"
                name="student"
                placeholder="Student Name"
                className="form-control"
                value={formData.student}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <input
                type="text"
                name="course"
                placeholder="Course Name"
                className="form-control"
                value={formData.course}
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
              <th>ID</th>
              <th>Student</th>
              <th>Course</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {attendanceRecords.map((record) => (
              <tr key={record.id}>
                <td>{record.id}</td>
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
