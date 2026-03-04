import { useState } from "react";

function Courses() {
  const [courses, setCourses] = useState([
    { id: 1, courseName: "Database Systems", department: "CSE", faculty: "Dr. Rao" },
    { id: 2, courseName: "Operating Systems", department: "IT", faculty: "Dr. Sharma" }
  ]);

  const [formData, setFormData] = useState({
    courseName: "",
    department: "",
    faculty: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newCourse = {
      id: courses.length + 1,
      ...formData
    };

    setCourses([...courses, newCourse]);

    setFormData({
      courseName: "",
      department: "",
      faculty: ""
    });
  };

  return (
    <div>
      <h2 className="mb-4">Course & Faculty Management</h2>

      {/* Add Course Form */}
      <div className="card p-4 mb-4">
        <h5>Add New Course</h5>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-4">
              <input
                type="text"
                name="courseName"
                placeholder="Course Name"
                className="form-control"
                value={formData.courseName}
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
                type="text"
                name="faculty"
                placeholder="Faculty Name"
                className="form-control"
                value={formData.faculty}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button className="btn btn-success mt-3">
            Add Course
          </button>
        </form>
      </div>

      {/* Course Table */}
      <div className="card p-4">
        <h5>Course List</h5>
        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Course Name</th>
              <th>Department</th>
              <th>Faculty</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>{course.id}</td>
                <td>{course.courseName}</td>
                <td>{course.department}</td>
                <td>{course.faculty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Courses;
