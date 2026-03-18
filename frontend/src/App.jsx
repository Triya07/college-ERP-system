import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Courses from "./pages/Courses";
import Faculty from "./pages/Faculty";
import Attendance from "./pages/Attendance";
import Results from "./pages/Results";
import Home from "./pages/Home";
import RoleSelection from "./pages/RoleSelection";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

import "./App.css";

function AppRoutes() {
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

  // Redirect to appropriate dashboard based on role
  const getDashboardForRole = () => {
    if (!user) return <Navigate to="/login" replace />;
    
    switch (user.role) {
      case "admin":
        return <AdminDashboard />;
      case "teacher":
        return <TeacherDashboard />;
      case "student":
        return <StudentDashboard />;
      default:
        return <Navigate to="/login" replace />;
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Auth />} />
      
      {/* Home Route - Redirect based on authentication status */}
      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : !roleConfirmed ? (
            <Navigate to="/role-selection" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Role Selection - Only accessible after login, before role confirmation */}
      <Route
        path="/role-selection"
        element={
          user && !roleConfirmed ? (
            <RoleSelection />
          ) : !user ? (
            <Navigate to="/login" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Protected Dashboard Route - Role Based */}
      <Route
        path="/dashboard"
        element={
          user && roleConfirmed ? (
            <ProtectedRoute
              element={getDashboardForRole()}
              allowedRoles={["admin", "teacher", "student"]}
            />
          ) : !user ? (
            <Navigate to="/login" replace />
          ) : (
            <Navigate to="/role-selection" replace />
          )
        }
      />

      {/* Admin Only Routes */}
      <Route
        path="/students/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Students />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin"]}
          />
        }
      />

      <Route
        path="/courses/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Courses />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher"]}
          />
        }
      />

      <Route
        path="/faculty/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Faculty />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin"]}
          />
        }
      />

      <Route
        path="/attendance/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Attendance />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher", "student"]}
          />
        }
      />

      <Route
        path="/results/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Results />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher", "student"]}
          />
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="d-flex flex-column min-vh-100">
          <div className="d-flex flex-grow-1">
            <AppRoutes />
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
