import React, { useState } from "react";
import Navbar from "../components/navbar.jsx";
import Sidebar from "../components/sidebar.jsx";

const AppLayout = ({ children }) => {
  const [shrink, setShrink] = useState(false);

  const toggleSidebar = () => {
    setShrink((prev) => !prev);
  };

  return (
    <>
      <Navbar shrink={shrink} title="LearnLab" />
      <Sidebar shrink={shrink} onToggle={toggleSidebar} />

      <div
        className="app-main min-h-screen bg-slate-50/90 bg-mesh transition-[margin] duration-300 ease-out"
        style={{
          marginLeft: shrink ? "80px" : "240px",
          paddingTop: "70px",
        }}
      >
        {children}
      </div>
    </>
  );
};

export default AppLayout;