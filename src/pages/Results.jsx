import { useState } from "react";

function Results() {
  const [results, setResults] = useState([
    { id: 1, student: "Rahul", course: "Database Systems", marks: 85, total: 100 }
  ]);

  const [formData, setFormData] = useState({
    student: "",
    course: "",
    marks: "",
    total: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newResult = {
      id: results.length + 1,
      ...formData
    };

    setResults([...results, newResult]);

    setFormData({
      student: "",
      course: "",
      marks: "",
      total: ""
    });
  };

  return (
    <div>
      <h2 className="mb-4">Examination & Results</h2>

      {/* Add Result Form */}
      <div className="card p-4 mb-4">
        <h5>Add Exam Result</h5>

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
                type="number"
                name="marks"
                placeholder="Marks Obtained"
                className="form-control"
                value={formData.marks}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-md-3">
              <input
                type="number"
                name="total"
                placeholder="Total Marks"
                className="form-control"
                value={formData.total}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button className="btn btn-danger mt-3">
            Add Result
          </button>
        </form>
      </div>

      {/* Results Table */}
      <div className="card p-4">
        <h5>Results List</h5>

        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Course</th>
              <th>Marks</th>
              <th>Total</th>
              <th>Percentage</th>
            </tr>
          </thead>

          <tbody>
            {results.map((result) => {
              const percentage = (
                (result.marks / result.total) *
                100
              ).toFixed(2);

              return (
                <tr key={result.id}>
                  <td>{result.id}</td>
                  <td>{result.student}</td>
                  <td>{result.course}</td>
                  <td>{result.marks}</td>
                  <td>{result.total}</td>
                  <td>{percentage}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Results;
