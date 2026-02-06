import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Courses from "./pages/Courses";
import Attendance from "./pages/Attendance";
import Results from "./pages/Results";

function App() {
  return (
    <BrowserRouter>
      <div className="d-flex">
        <Sidebar />
        <div className="p-4 w-100">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
