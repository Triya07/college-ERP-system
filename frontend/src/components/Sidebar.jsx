import React from "react";
import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div className="sidebar text-white p-3" style={{ width: "250px" }}>
      <h4>College ERP</h4>

      <ul className="nav flex-column mt-4">
        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/"
          >
            <i className="bi bi-speedometer2 me-2" /> Dashboard
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/students"
          >
            <i className="bi bi-people-fill me-2" /> Students
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/courses"
          >
            <i className="bi bi-book-fill me-2" /> Courses
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/attendance"
          >
            <i className="bi bi-calendar-check-fill me-2" /> Attendance
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/results"
          >
            <i className="bi bi-bar-chart-fill me-2" /> Results
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
