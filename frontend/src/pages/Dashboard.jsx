import React from "react";

function Dashboard() {
  return (
    <div>
      <div className="bg-white p-4 rounded shadow-sm mb-4">
        <h1 className="mb-1">Welcome to College ERP</h1>
        <p className="lead">Centralized system for managing students, courses, attendance, and results.</p>
      </div>

      <h2 className="mb-4">Overview</h2>

      <div className="row gy-4">
        <div className="col-sm-6 col-md-3">
          <div className="card shadow-sm p-3 text-center">
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
