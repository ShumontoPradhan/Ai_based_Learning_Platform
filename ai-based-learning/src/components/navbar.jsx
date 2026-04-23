import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import "./navbar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { FaBell } from "react-icons/fa";
import { useAuth } from "../store/authContext.jsx";

function initialsForUser(user) {
  if (!user) return "?";
  const name = (user.username || user.email || "?").trim();
  if (!name || name === "?") return "?";
  if (name.includes("@")) {
    const local = name.split("@")[0] || name;
    return local.slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function nameForUser(user) {
  if (!user) return "Account";
  const u = user.username?.trim();
  if (u) return u;
  const em = user.email?.trim();
  if (em) return em.split("@")[0] || em;
  return "Account";
}

export default function Navbar({ title, mode, toggleMode, paletteMode, shrink, aboutTxt }) {
  const { user } = useAuth();
  const displayName = nameForUser(user);
  const initials = initialsForUser(user);

  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      setLastScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const leftOffset = shrink ? 80 : 240;
  const widthCalc = `calc(100% - ${leftOffset}px)`;

  return (
    <nav
      className={`app-navbar ${hidden ? "navbar-hidden" : ""}`}
      style={{
        position: "fixed",
        top: hidden ? "-80px" : "0",
        left: `${leftOffset}px`,
        width: widthCalc,
        transition: "all 0.28s ease",
        zIndex: 2000,
        height: "70px",
        display: "flex",
        alignItems: "center",
        paddingInline: "16px",
        background: mode === "light" ? "#ffffff" : "#0f172a",
        boxShadow: "0 1px 6px rgba(16,24,40,0.06)",
      }}
      aria-label="Top navigation"
    >
      <div className="navbar-inner">
        <Link
          className="navbar-brand"
          to="/home"
          style={{
            fontSize: "1.2rem",
            fontWeight: 800,
            paddingLeft: "40px",
            background: "linear-gradient(90deg, #1e1b4b, #4f46e5, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textDecoration: "none",
            marginRight: "18px",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </Link>

        {/* SEARCH */}
        <form className="search-div" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            className="search-bar-input"
            type="search"
            placeholder="Search"
            aria-label="Search"
            autoComplete="off"
          />
          <button className="search-btn" type="submit" aria-label="Search button">
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </form>

        {/* Right-side actions */}
        <div className="navbar-actions">
          <button className="icon-btn" title="Notifications">
            <FaBell />
            <span className="notification-badge">3</span>
          </button>

          <div className="user-profile" title={user?.email || displayName}>
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{displayName}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

Navbar.propTypes = {
  title: PropTypes.string,
  aboutTxt: PropTypes.string,
  shrink: PropTypes.bool,
  mode: PropTypes.string,
};

Navbar.defaultProps = {
  title: "LearnLab",
  aboutTxt: "About",
  shrink: false,
  mode: "light",
};
