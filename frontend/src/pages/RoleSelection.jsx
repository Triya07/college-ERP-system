import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MdAdminPanelSettings, MdPerson, MdSchool } from "react-icons/md";
import "./RoleSelection.css";

function RoleSelection() {
  const navigate = useNavigate();
  const { user, confirmRole } = useAuth();

  // Get user's assigned role
  const userRole = user?.role;

  // Debugging
  React.useEffect(() => {
    console.log("Current user object:", user);
    console.log("Current user role:", userRole);
  }, [user, userRole]);

  const roleInfo = {
    admin: {
      title: "Administrator",
      description: "Manage system users, courses, and oversee all operations",
      icon: MdAdminPanelSettings,
      color: "#FF6B6B",
      bgColor: "#FFE5E5"
    },
    student: {
      title: "Student",
      description: "View courses, track attendance, check marks, and submit assignments",
      icon: MdSchool,
      color: "#4ECDC4",
      bgColor: "#E0F7F6"
    },
    teacher: {
      title: "Teacher/Faculty",
      description: "Manage classes, mark attendance, upload results, and communicate with students",
      icon: MdPerson,
      color: "#FFB93D",
      bgColor: "#FFF4E0"
    }
  };

  if (!userRole) {
    return (
      <div className="role-selection-container">
        <div className="role-selection-wrapper">
          <div className="role-selection-header" style={{ color: "white" }}>
            <h1>Loading...</h1>
            <p>Please wait while we confirm your role</p>
          </div>
        </div>
      </div>
    );
  }

  const handleRoleConfirm = () => {
    confirmRole(userRole);
    navigate("/dashboard");
  };

  const role = roleInfo[userRole];

  return (
    <div className="role-selection-container">
      <div className="role-selection-wrapper">
        <div className="role-selection-header">
          <h1>Welcome, {user?.profile?.name || user?.email}!</h1>
          <p>Confirming your role to proceed</p>
        </div>

        <div className="role-selection-grid-single">
          {role && (
            <div
              className="role-card"
              style={{
                backgroundColor: role.bgColor,
                borderLeft: `5px solid ${role.color}`
              }}
            >
              <div className="role-icon-wrapper" style={{ color: role.color }}>
                <role.icon size={80} />
              </div>
              <h2 className="role-title">{role.title}</h2>
              <p className="role-description">{role.description}</p>
              <button
                className="role-btn"
                style={{ backgroundColor: role.color }}
                onClick={handleRoleConfirm}
              >
                Continue as {role.title}
              </button>
            </div>
          )}
        </div>

        <div className="role-selection-footer">
          <p>Wrong role? <a href="/login">Login with different account</a></p>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
