import React from "react";
import { NavLink } from "react-router-dom";
import { MdDashboard, MdPeople, MdBook, MdDateRange, MdAssignment, MdHome, MdSchool } from "react-icons/md";

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
            <MdHome className="me-2" style={{ display: "inline" }} /> Home
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/dashboard"
          >
            <MdDashboard className="me-2" style={{ display: "inline" }} /> Dashboard
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/students"
          >
            <MdPeople className="me-2" style={{ display: "inline" }} /> Students
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/courses"
          >
            <MdBook className="me-2" style={{ display: "inline" }} /> Courses
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/faculty"
          >
            <MdSchool className="me-2" style={{ display: "inline" }} /> Faculty
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/attendance"
          >
            <MdDateRange className="me-2" style={{ display: "inline" }} /> Attendance
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/results"
          >
            <MdAssignment className="me-2" style={{ display: "inline" }} /> Results
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
