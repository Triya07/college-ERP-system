import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ element, allowedRoles }) => {
  const { user, loading, roleConfirmed } = useAuth();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roleConfirmed) {
    return <Navigate to="/role-selection" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="alert alert-danger">
          <h4>Access Denied</h4>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return element;
};

export default ProtectedRoute;
