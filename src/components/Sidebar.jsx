import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div
      className="bg-dark text-white p-3"
      style={{ width: "250px", minHeight: "100vh" }}
    >
      <h4>College ERP</h4>

      <ul className="nav flex-column mt-4">
        <li className="nav-item">
          <Link className="nav-link text-white" to="/">
            Dashboard
          </Link>
        </li>

        <li className="nav-item">
          <Link className="nav-link text-white" to="/students">
            Students
          </Link>
        </li>

        <li className="nav-item">
          <Link className="nav-link text-white" to="/courses">
            Courses
          </Link>
        </li>

        <li className="nav-item">
          <Link className="nav-link text-white" to="/attendance">
            Attendance
          </Link>
        </li>

        <li className="nav-item">
          <Link className="nav-link text-white" to="/results">
            Results
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
