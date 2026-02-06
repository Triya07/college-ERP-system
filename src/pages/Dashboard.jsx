function Dashboard() {
  return (
    <div>
      <h2 className="mb-4">Dashboard</h2>

      <div className="row">
        <div className="col-md-3">
          <div className="card shadow-sm p-3">
            <h5>Total Students</h5>
            <h3>120</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3">
            <h5>Total Courses</h5>
            <h3>15</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3">
            <h5>Faculty Members</h5>
            <h3>25</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm p-3">
            <h5>Exams Conducted</h5>
            <h3>8</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
