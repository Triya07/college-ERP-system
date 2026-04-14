import React from "react";
import { NavLink } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdBook,
  MdDateRange,
  MdAssignment,
  MdHome,
  MdSchool,
  MdSchedule,
  MdPayments,
  MdNotifications,
  MdCampaign,
  MdHowToReg,
  MdClass,
  MdSettings,
  MdBusinessCenter
} from "react-icons/md";
import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

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

        {role === "admin" && (
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
        )}

        {role === "admin" && (
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
        )}

        {role === "admin" && (
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
        )}

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

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/timetable"
          >
            <MdSchedule className="me-2" style={{ display: "inline" }} /> Timetable
          </NavLink>
        </li>

        {role !== "teacher" && (
          <li className="nav-item">
            <NavLink
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " active" : "")
              }
              to="/fees"
            >
              <MdPayments className="me-2" style={{ display: "inline" }} /> Fees
            </NavLink>
          </li>
        )}

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/notifications"
          >
            <MdNotifications className="me-2" style={{ display: "inline" }} /> Notifications
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/announcements"
          >
            <MdCampaign className="me-2" style={{ display: "inline" }} /> Notice Board
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/classes"
          >
            <MdClass className="me-2" style={{ display: "inline" }} /> Classes
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/course-registration"
          >
            <MdHowToReg className="me-2" style={{ display: "inline" }} /> Course Registration
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            className={({ isActive }) =>
              "nav-link text-white" + (isActive ? " active" : "")
            }
            to="/enterprise-workflows"
          >
            <MdBusinessCenter className="me-2" style={{ display: "inline" }} /> Enterprise Workflows
          </NavLink>
        </li>

        {role === "admin" && (
          <li className="nav-item">
            <NavLink
              className={({ isActive }) =>
                "nav-link text-white" + (isActive ? " active" : "")
              }
              to="/settings"
            >
              <MdSettings className="me-2" style={{ display: "inline" }} /> Settings
            </NavLink>
          </li>
        )}
      </ul>
    </div>
  );
}

export default Sidebar;
