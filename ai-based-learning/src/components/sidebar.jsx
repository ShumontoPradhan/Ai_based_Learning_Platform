import "./sidebar.css";
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  LayoutDashboard,
  Compass,
  LineChart,
  Brain,
  FileText,
  BookOpen,
  Scan,
  Bot,
  ClipboardList,
  Trophy,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Home", icon: Home, path: "/home" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Explore", icon: Compass, path: "/explore" },
  { label: "Performance", icon: LineChart, path: "/performance" },
  { label: "Skill gap", icon: Brain, path: "/skill-gap" },
  { label: "Documents", icon: FileText, path: "/documents" },
  { label: "Flashcards", icon: BookOpen, path: "/flashcards" },
  { label: "Focus mode", icon: Scan, path: "/focus-mode" },
  { label: "AI assistant", icon: Bot, path: "/ai-assistant" },
  { label: "Assignments", icon: ClipboardList, path: "/assignment" },
  { label: "Achievements", icon: Trophy, path: "/achievements" },
];

const Sidebar = ({ onToggle, shrink }) => {
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        className="menu-btn"
        style={{ left: shrink ? 85 : 245 }}
        onClick={onToggle}
        aria-label={shrink ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Menu size={20} strokeWidth={2.25} />
      </button>

      <aside
        className={`app-sidebar${shrink ? " app-sidebar--shrink" : ""}`}
        aria-label="Main navigation"
      >
        <div className="app-sidebar__inner">
          <button
            type="button"
            className="app-sidebar__brand"
            onClick={() => navigate("/home")}
          >
            <div className="app-sidebar__logo">LL</div>
            {!shrink && <span className="app-sidebar__title">LearnLab</span>}
          </button>

          <nav className="app-sidebar__nav" role="navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
                  }
                  end={item.path === "/home"}
                >
                  <Icon
                    className="app-sidebar__icon"
                    size={20}
                    strokeWidth={2}
                    aria-hidden
                  />
                  {!shrink && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          <div className="app-sidebar__footer">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `app-sidebar__link app-sidebar__link--footer${
                  isActive ? " app-sidebar__link--active" : ""
                }`
              }
            >
              <Settings
                className="app-sidebar__icon"
                size={20}
                strokeWidth={2}
                aria-hidden
              />
              {!shrink && <span>Settings</span>}
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
