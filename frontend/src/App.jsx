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
import Timetable from "./pages/Timetable";
import Fees from "./pages/Fees";
import Notifications from "./pages/Notifications";
import AnnouncementBoard from "./pages/AnnouncementBoard";
import CourseRegistration from "./pages/CourseRegistration";
import Classes from "./pages/Classes";
import EnterpriseWorkflows from "./pages/EnterpriseWorkflows";
import Profile from "./pages/Profile";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import ThemeToggle from "./components/ThemeToggle";
import { ThemeProvider } from "./context/ThemeContext";

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

      <Route
        path="/timetable/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Timetable />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher", "student"]}
          />
        }
      />

      <Route
        path="/fees/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Fees />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "student"]}
          />
        }
      />

      <Route
        path="/notifications/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Notifications />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher", "student"]}
          />
        }
      />

      <Route
        path="/announcements/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<AnnouncementBoard />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher", "student"]}
          />
        }
      />

      <Route
        path="/classes/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Classes />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher", "student"]}
          />
        }
      />

      <Route
        path="/course-registration/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<CourseRegistration />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher", "student"]}
          />
        }
      />

      <Route
        path="/profile/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<Profile />} />
                  </Routes>
                </main>
              </>
            }
            allowedRoles={["admin", "teacher", "student"]}
          />
        }
      />

      <Route
        path="/enterprise-workflows/*"
        element={
          <ProtectedRoute
            element={
              <>
                <Sidebar />
                <main className="main-content bg-light">
                  <Routes>
                    <Route path="/" element={<EnterpriseWorkflows />} />
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
      <ThemeProvider>
        <AuthProvider>
          <div className="d-flex flex-column min-vh-100">
            <div className="d-flex flex-grow-1">
              <AppRoutes />
            </div>
            <Footer />
            <ThemeToggle />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
