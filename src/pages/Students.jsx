import { useState } from "react";

function Students() {
  const [students, setStudents] = useState([
    { id: 1, name: "Rahul", department: "CSE", year: 2 },
    { id: 2, name: "Anjali", department: "IT", year: 3 }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    year: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newStudent = {
      id: students.length + 1,
      ...formData
    };

    setStudents([...students, newStudent]);

    setFormData({
      name: "",
      department: "",
      year: ""
    });
  };

  return (
    <div>
      <h2 className="mb-4">Student Management</h2>

      {/* Add Student Form */}
      <div className="card p-4 mb-4">
        <h5>Add New Student</h5>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-4">
              <input
                type="text"
                name="name"
                placeholder="Student Name"
                className="form-control"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-4">
              <input
                type="text"
                name="department"
                placeholder="Department"
                className="form-control"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-4">
              <input
                type="number"
                name="year"
                placeholder="Year"
                className="form-control"
                value={formData.year}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button className="btn btn-primary mt-3">
            Add Student
          </button>
        </form>
      </div>

      {/* Student Table */}
      <div className="card p-4">
        <h5>Student List</h5>
        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Year</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.id}</td>
                <td>{student.name}</td>
                <td>{student.department}</td>
                <td>{student.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Students;
