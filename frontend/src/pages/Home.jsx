import React from "react";
import { useNavigate } from "react-router-dom";
import { MdPeople, MdBook, MdDateRange, MdAssignment, MdDashboard } from "react-icons/md";

function Home() {
  const navigate = useNavigate();

  const modules = [
    {
      icon: MdDashboard,
      title: "Dashboard",
      description: "View system overview and statistics",
      color: "primary",
      path: "/dashboard",
      bgColor: "#E3F2FD"
    },
    {
      icon: MdPeople,
      title: "Students",
      description: "Manage student records and enrollments",
      color: "success",
      path: "/students",
      bgColor: "#E8F5E9"
    },
    {
      icon: MdBook,
      title: "Courses",
      description: "Manage courses and departments",
      color: "info",
      path: "/courses",
      bgColor: "#E0F2F1"
    },
    {
      icon: MdDateRange,
      title: "Attendance",
      description: "Track student attendance records",
      color: "warning",
      path: "/attendance",
      bgColor: "#FFF9C4"
    },
    {
      icon: MdAssignment,
      title: "Results",
      description: "Manage examination results",
      color: "danger",
      path: "/results",
      bgColor: "#FCE4EC"
    }
  ];

  return (
    <div className="home-container">
      <div className="home-hero">
        <h1 className="home-title">College ERP System</h1>
        <p className="home-subtitle">Centralized Management Platform</p>
      </div>

      <div className="container-fluid py-5 px-4">
        <div className="row g-4">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <div key={index} className="col-md-6 col-lg-4 col-xl-3">
                <div
                  className="module-card"
                  onClick={() => navigate(module.path)}
                  style={{ backgroundColor: module.bgColor }}
                >
                  <div className="module-icon-wrapper">
                    <Icon className="module-icon" />
                  </div>
                  <h3 className="module-title">{module.title}</h3>
                  <p className="module-description">{module.description}</p>
                  <div className="module-arrow">→</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding-bottom: 3rem;
        }

        body[data-theme="dark"] .home-container {
          background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);
        }

        .home-hero {
          text-align: center;
          padding: 4rem 2rem 3rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 0 0 20px 20px;
          animation: slideDown 0.6s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .home-title {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .home-subtitle {
          font-size: 1.2rem;
          opacity: 0.9;
          font-weight: 300;
        }

        .module-card {
          border-radius: 16px;
          padding: 2rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .module-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }

        .module-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .module-card:hover::before {
          transform: translateX(0);
        }

        .module-icon-wrapper {
          font-size: 3rem;
          margin-bottom: 1rem;
          animation: fadeIn 0.5s ease-out;
        }

        .module-icon {
          color: #667eea;
          transition: transform 0.3s ease;
        }

        .module-card:hover .module-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .module-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #2c3e50;
        }

        .module-description {
          font-size: 0.95rem;
          color: #7f8c8d;
          margin-bottom: 0;
          flex-grow: 1;
        }

        body[data-theme="dark"] .module-card {
          background-color: #1f2937 !important;
          border-color: #374151;
        }

        body[data-theme="dark"] .module-title {
          color: #f3f4f6;
        }

        body[data-theme="dark"] .module-description {
          color: #cbd5e1;
        }

        body[data-theme="dark"] .module-icon {
          color: #93c5fd;
        }

        .module-arrow {
          font-size: 1.5rem;
          color: #667eea;
          margin-top: 1rem;
          transition: transform 0.3s ease;
          opacity: 0;
        }

        .module-card:hover .module-arrow {
          opacity: 1;
          transform: translateX(5px);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .home-title {
            font-size: 2rem;
          }

          .module-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Home;
