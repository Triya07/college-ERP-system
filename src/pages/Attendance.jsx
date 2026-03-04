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
        window.location.reload();
      })
      .catch((err) => console.log(err));
  };

  // 6️⃣ Calculate attendance percentage per student
  const calculatePercentage = (studentName) => {
    const studentData = attendanceRecords.filter(
      (rec) => rec.student === studentName
    );

    const total = studentData.length;

    const presentCount = studentData.filter(
      (rec) => rec.status === "Present"
    ).length;

    if (total === 0) return 0;

    return ((presentCount / total) * 100).toFixed(2);
  };

  // 7️⃣ Get unique students
  const uniqueStudents = [
    ...new Set(attendanceRecords.map((rec) => rec.student))
  ];

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

      {/* Attendance Records */}
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
                <td>
                  <span
                    className={
                      record.status === "Present"
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attendance Summary */}
      <div className="card p-4 mt-4">
        <h5>Attendance Summary</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>Student</th>
              <th>Attendance %</th>
            </tr>
          </thead>

          <tbody>
            {uniqueStudents.map((student, index) => {
              const percentage = calculatePercentage(student);

              return (
                <tr key={index}>
                  <td>{student}</td>

                  <td>
                    <div className="progress">
                      <div
                        className={`progress-bar ${
                          percentage >= 75
                            ? "bg-success"
                            : percentage >= 40
                            ? "bg-warning"
                            : "bg-danger"
                        }`}
                        style={{ width: `${percentage}%` }}
                      >
                        {percentage}%
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default Attendance;