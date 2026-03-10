import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Courses from "./pages/Courses";
import Attendance from "./pages/Attendance";
import Results from "./pages/Results";
import "./App.css";
import Footer from "./components/Footer";

function App() {
  return (
    <BrowserRouter>
      <div className="d-flex flex-column min-vh-100">
        <div className="d-flex flex-grow-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/*"
              element={
                <>
                  <Sidebar />
                  <main className="main-content bg-light">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/students" element={<Students />} />
                      <Route path="/courses" element={<Courses />} />
                      <Route path="/attendance" element={<Attendance />} />
                      <Route path="/results" element={<Results />} />
                    </Routes>
                  </main>
                </>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
