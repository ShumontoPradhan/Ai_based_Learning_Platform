import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import "./css/navbar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { FaBell } from "react-icons/fa";

export default function Navbar({ title, mode, toggleMode, paletteMode, shrink, aboutTxt }) {
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
        <a
          className="navbar-brand"
          href="/"
          style={{
            fontSize: "1.28rem",
            fontWeight: 700,
            paddingLeft: "40px",
            color: "#111827",
            textDecoration: "none",
            marginRight: "18px",
          }}
        >
          {title}
        </a>

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

          <div className="user-profile">
            <div className="user-avatar">JS</div>
            <span className="user-name">John Student</span>
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
  title: "Set title here",
  aboutTxt: "About",
  shrink: false,
  mode: "light",
};
