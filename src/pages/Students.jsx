import { useState, useEffect } from "react";

function Students() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/students")
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div>
      <h2 className="mb-4">Student Management</h2>

      <div className="card p-4">
        <h5>Student Records</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Year</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student.student_id}>
                <td>{student.student_id}</td>
                <td>{student.name}</td>
                <td>{student.department}</td>
                <td>{student.year}</td>
                <td>{student.email}</td>
                <td>{student.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Students;
