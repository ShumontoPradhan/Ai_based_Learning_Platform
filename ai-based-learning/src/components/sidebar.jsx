import "./sidebar.css";
import React from "react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { FaHome, FaCompass, FaChartLine, FaBrain, FaTree, FaTrophy, FaRobot, FaBeer, FaClipboardList, FaBookOpen } from "react-icons/fa";

const navItems = [
  { label: "Home", icon: <FaHome style={{ color: "", fontSize: "24px",}} />, path: "/home" },
  { label: "Explore", icon: <FaCompass style={{ color: "", fontSize: "24px",}}/>, path: "/explore" },
  { label: "Performance", icon: <FaChartLine style={{ color: "", fontSize: "24px",}}/>, path: "/performance" },
  { label: "Skill Gap", icon: <FaBrain style={{ color: "", fontSize: "24px",}}/>, path: "/skill-gap" },
  { label: "Documents", icon: <FaBookOpen style={{ color: "", fontSize: "24px",}}/>, path: "/documents" },
  { label: "Knowledge Tree", icon: <FaTree style={{ color: "", fontSize: "24px",}}/>, path: "/knowledge-tree" },
  { label: "Achievements", icon: <FaTrophy style={{ color: "", fontSize: "24px",}}/>, path: "/achievements" },
  { label: "AI Assistant", icon: <FaRobot style={{ color: "", fontSize: "24px",}}/>, path: "/ai-assistant" },
  { label: "Assignments", icon: <FaClipboardList style={{ color: "", fontSize: "24px",}}/>, path: "/assignment" },
];

const Sidebar = ({ onToggle, shrink }) => {
  const navigate = useNavigate();
  return (
    <>
      {/* Toggle Button */}
      <button
        className="menu-btn"
        onClick={onToggle}
        style={{
          position: "fixed",
          top: "12px",
          left: shrink ? "85px" : "245px",
          zIndex: 2000,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          border: "none",
          borderRadius: "12px",
          width: "42px",
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          color: "#fff",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.boxShadow = "0 6px 18px rgba(139, 92, 246, 0.5)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)")
        }
      >
        <Menu size={22} />
      </button>


      {/* Sidebar */}
      <div
        className={`sidebar ${shrink ? "shrink" : ""}`}
        style={{
          position: "fixed",
          paddingTop: "56px",
          top: 0,
          left: 0,
          margin: "0 0 0",
          width: shrink ? "80px" : "240px",
          height: "100vh",
          transition: "width 0.3s ease",
          overflowX: "hidden",
          boxShadow: "0 0 12px rgba(0, 0, 0, 0.3)",
          zIndex: 1050,
          display: "flex",
          flexDirection: "column",
          background: "#121212",
        }}
      >
        {/* Logo */}
        <button
          className="sidebar-logo d-flex align-items-center mb-3 px-3 pt-2"
          onClick={() => navigate("/dashboard")}
          style={{
            height: "56px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            background: "#121212",
            border: "none",
          }}
        >
          <div
            className="logo-icon d-flex align-items-center justify-content-center"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              color: "#fff",
              borderRadius: "10px",
              width: "40px",
              height: "30px",
              fontWeight: "700",
              fontSize: "1.1rem",
            }}
          >
            AI
          </div>

          {!shrink && (
            <span
              className="logo-text ms-2 fw-bold"
              style={{
                background: "linear-gradient(90deg, #0b69f5, #b9108c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: "1.2rem",
              }}
            >
              AI Learning
            </span>
          )}
        </button>

        {/* Nav Links */}
        <ul className="nav flex-column px-2">
          {navItems.map((item) => (
            <li key={item.label} className="nav-item mb-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center text-light rounded px-3 py-2 ${
                    isActive ? "active" : ""
                  }`
                }
                end
              >
                <span className="fs-5 me-2">{item.icon}</span>
                {!shrink && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Bottom Section */}
        <hr className="text-secondary mx-3" />
        <div className="px-3">
          <NavLink
            to="/settings"
            className="nav-link d-flex align-items-center text-light px-3 py-2 rounded"
          >
            <span className="fs-5 me-2">⚙️</span>
            {!shrink && <span>Settings</span>}
          </NavLink>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
